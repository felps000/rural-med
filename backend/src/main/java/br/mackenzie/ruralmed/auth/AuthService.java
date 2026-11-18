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
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Sessoes em memoria: reiniciar o servidor invalida os tokens.
 * Cada sessao expira em {@link #VALIDADE_SESSAO} e e encerrada quando o usuario e inativado.
 */
@Service
public class AuthService {

    public record Sessao(String token, Usuario usuario, Long microareaId, Long especialidadeId) {
    }

    private record SessaoAtiva(Sessao sessao, Instant expiraEm) {
    }

    private record Tentativas(int falhas, Instant bloqueadoAte) {
    }

    static final Duration VALIDADE_SESSAO = Duration.ofHours(8);
    static final int MAXIMO_FALHAS = 5;
    static final Duration BLOQUEIO = Duration.ofMinutes(15);

    private final Map<String, SessaoAtiva> sessoes = new ConcurrentHashMap<>();
    private final Map<String, Tentativas> tentativas = new ConcurrentHashMap<>();
    private final Clock relogio;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    private final UsuarioRepository usuarioRepository;
    private final AcsRepository acsRepository;
    private final MedicoRepository medicoRepository;

    @Autowired
    public AuthService(UsuarioRepository usuarioRepository, AcsRepository acsRepository,
                       MedicoRepository medicoRepository) {
        this(usuarioRepository, acsRepository, medicoRepository, Clock.systemUTC());
    }

    AuthService(UsuarioRepository usuarioRepository, AcsRepository acsRepository,
                MedicoRepository medicoRepository, Clock relogio) {
        this.relogio = relogio;
        this.usuarioRepository = usuarioRepository;
        this.acsRepository = acsRepository;
        this.medicoRepository = medicoRepository;
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

        String token = UUID.randomUUID().toString();
        Sessao sessao = new Sessao(token, usuario, microareaId, especialidadeId);
        removerExpiradas();
        sessoes.put(token, new SessaoAtiva(sessao, relogio.instant().plus(VALIDADE_SESSAO)));
        return sessao;
    }

    public void sair(String token) {
        if (token != null) sessoes.remove(token);
    }

    /** Chamado ao inativar um usuario: os tokens que ele ja tinha deixam de valer na hora. */
    public void encerrarSessoesDoUsuario(Long usuarioId) {
        sessoes.values().removeIf(ativa -> usuarioId.equals(ativa.sessao().usuario().getId()));
    }

    /** Sem perfis informados, exige apenas uma sessao valida. */
    public Sessao exigir(String token, Perfil... perfisPermitidos) {
        SessaoAtiva ativa = token == null ? null : sessoes.get(token);
        if (ativa != null && !relogio.instant().isBefore(ativa.expiraEm())) {
            sessoes.remove(token);
            ativa = null;
        }
        if (ativa == null) {
            throw new AcessoNegadoException("Faça login para continuar");
        }
        Sessao sessao = ativa.sessao();
        if (perfisPermitidos.length > 0 && !Arrays.asList(perfisPermitidos).contains(sessao.usuario().getPerfil())) {
            throw new AcessoNegadoException("Seu perfil não tem acesso a esta funcionalidade");
        }
        return sessao;
    }

    public String gerarHash(String senha) {
        return bcrypt.encode(senha);
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

    private void removerExpiradas() {
        Instant agora = relogio.instant();
        sessoes.values().removeIf(ativa -> !agora.isBefore(ativa.expiraEm()));
    }
}
