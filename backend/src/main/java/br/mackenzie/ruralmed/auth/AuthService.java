package br.mackenzie.ruralmed.auth;

import br.mackenzie.ruralmed.comum.AcessoNegadoException;
import br.mackenzie.ruralmed.comum.RegraNegocioException;
import br.mackenzie.ruralmed.comum.RegrasDeNegocio;
import br.mackenzie.ruralmed.usuario.AcsRepository;
import br.mackenzie.ruralmed.usuario.Medico;
import br.mackenzie.ruralmed.usuario.MedicoRepository;
import br.mackenzie.ruralmed.usuario.Perfil;
import br.mackenzie.ruralmed.usuario.Usuario;
import br.mackenzie.ruralmed.usuario.UsuarioRepository;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Login com token JWT assinado: o servidor não guarda sessões, então reiniciar não desloga ninguém.
 * <ul>
 *   <li>O token vale {@link #VALIDADE_SESSAO};</li>
 *   <li>a cada requisição o usuário é conferido no banco: inativado ou com perfil trocado, perde o acesso na hora;</li>
 *   <li>"Sair" invalida o token (lista em memória até ele expirar);</li>
 *   <li>depois de {@link #MAXIMO_FALHAS} senhas erradas seguidas, o login fica bloqueado por {@link #BLOQUEIO}.</li>
 * </ul>
 */
@Service
public class AuthService {

    public record Sessao(String token, Usuario usuario, Long microareaId, Long especialidadeId) {
    }

    private record Tentativas(int falhas, Instant bloqueadoAte) {
    }

    static final Duration VALIDADE_SESSAO = Duration.ofHours(8);
    static final int MAXIMO_FALHAS = 5;
    static final Duration BLOQUEIO = Duration.ofMinutes(15);
    private static final String FACA_LOGIN = "Faça login para continuar";

    /** Tokens encerrados com "Sair", guardados só até a data em que expirariam. */
    private final Map<String, Instant> encerrados = new ConcurrentHashMap<>();
    private final Map<String, Tentativas> tentativas = new ConcurrentHashMap<>();
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    private final UsuarioRepository usuarioRepository;
    private final AcsRepository acsRepository;
    private final MedicoRepository medicoRepository;
    private final TokenJwt tokenJwt;
    private final Clock relogio;

    @Autowired
    public AuthService(UsuarioRepository usuarioRepository, AcsRepository acsRepository,
                       MedicoRepository medicoRepository, TokenJwt tokenJwt) {
        this(usuarioRepository, acsRepository, medicoRepository, tokenJwt, Clock.systemUTC());
    }

    AuthService(UsuarioRepository usuarioRepository, AcsRepository acsRepository,
                MedicoRepository medicoRepository, TokenJwt tokenJwt, Clock relogio) {
        this.usuarioRepository = usuarioRepository;
        this.acsRepository = acsRepository;
        this.medicoRepository = medicoRepository;
        this.tokenJwt = tokenJwt;
        this.relogio = relogio;
    }

    public Sessao login(String login, String senha) {
        if (login == null || login.isBlank() || senha == null || senha.isBlank()) {
            throw new RegraNegocioException("E-mail/CPF ou senha inválidos");
        }
        String chave = login.contains("@") ? login.trim().toLowerCase() : login.replaceAll("\\D", "");
        verificarBloqueio(chave);
        Usuario usuario = (login.contains("@")
                ? usuarioRepository.findByEmail(chave)
                : usuarioRepository.findByCpf(chave))
                .orElse(null);

        if (usuario == null || !bcrypt.matches(senha, usuario.getSenhaHash())) {
            registrarFalha(chave);
            throw new RegraNegocioException("E-mail/CPF ou senha inválidos");
        }
        tentativas.remove(chave);
        if (!usuario.getAtivo()) {
            throw new RegraNegocioException("Usuário inativo");
        }

        Long microareaId = null;
        Long especialidadeId = null;
        if (usuario.getPerfil() == Perfil.ACS) {
            microareaId = acsRepository.findById(usuario.getId()).orElseThrow().getMicroarea().getId();
        }
        if (usuario.getPerfil() == Perfil.MEDICO) {
            Medico medico = medicoRepository.findById(usuario.getId()).orElseThrow();
            RegrasDeNegocio.verificarCrmAtivo(medico); // RN04: sem CRM ativo, não entra
            especialidadeId = medico.getEspecialidade().getId();
        }

        Instant agora = relogio.instant();
        String token = tokenJwt.emitir(usuario.getId(), microareaId, especialidadeId, agora, agora.plus(VALIDADE_SESSAO));
        return new Sessao(token, usuario, microareaId, especialidadeId);
    }

    public void sair(String token) {
        TokenJwt.Conteudo conteudo = tokenJwt.ler(semPrefixo(token));
        if (conteudo == null) return;
        Instant agora = relogio.instant();
        encerrados.values().removeIf(expira -> !agora.isBefore(expira));
        encerrados.put(conteudo.id(), conteudo.expiraEm());
    }

    /** Sem perfis informados, exige apenas um login válido. */
    public Sessao exigir(String token, Perfil... perfisPermitidos) {
        String limpo = semPrefixo(token);
        TokenJwt.Conteudo conteudo = tokenJwt.ler(limpo);
        if (conteudo == null || !relogio.instant().isBefore(conteudo.expiraEm())
                || encerrados.containsKey(conteudo.id())) {
            throw new AcessoNegadoException(FACA_LOGIN);
        }
        Usuario usuario = usuarioRepository.findById(conteudo.usuarioId())
                .filter(Usuario::getAtivo)
                .orElseThrow(() -> new AcessoNegadoException(FACA_LOGIN));
        if (perfisPermitidos.length > 0 && !Arrays.asList(perfisPermitidos).contains(usuario.getPerfil())) {
            throw new AcessoNegadoException("Seu perfil não tem acesso a esta funcionalidade");
        }
        return new Sessao(limpo, usuario, conteudo.microareaId(), conteudo.especialidadeId());
    }

    public String gerarHash(String senha) {
        return bcrypt.encode(senha);
    }

    /** Aceita o token puro ou no formato "Bearer <token>". */
    private static String semPrefixo(String token) {
        if (token == null) return null;
        String limpo = token.trim();
        return limpo.regionMatches(true, 0, "Bearer ", 0, 7) ? limpo.substring(7).trim() : limpo;
    }

    private void verificarBloqueio(String chave) {
        Tentativas registro = tentativas.get(chave);
        if (registro != null && registro.bloqueadoAte() != null) {
            if (relogio.instant().isBefore(registro.bloqueadoAte())) {
                throw new MuitasTentativasException(
                        "Muitas tentativas de login. Aguarde 15 minutos e tente novamente");
            }
            tentativas.remove(chave);
        }
    }

    private void registrarFalha(String chave) {
        tentativas.compute(chave, (k, atual) -> {
            int falhas = (atual == null ? 0 : atual.falhas()) + 1;
            return new Tentativas(falhas, falhas >= MAXIMO_FALHAS ? relogio.instant().plus(BLOQUEIO) : null);
        });
    }
}
