package br.mackenzie.ruralmed.exame;

import br.mackenzie.ruralmed.auth.AuthService;
import br.mackenzie.ruralmed.comum.AcessoNegadoException;
import br.mackenzie.ruralmed.comum.RegraNegocioException;
import br.mackenzie.ruralmed.paciente.AcessoMedico;
import br.mackenzie.ruralmed.triagem.Dossie;
import br.mackenzie.ruralmed.triagem.DossieRepository;
import br.mackenzie.ruralmed.usuario.Perfil;

import java.io.IOException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AnexoExameService {

    private static final long TAMANHO_MAXIMO = 10L * 1024 * 1024;
    private static final List<String> TIPOS_PERMITIDOS =
            List.of("application/pdf", "image/jpeg", "image/png");

    public record AnexoResumo(Long id, String nomeArquivo, String tipoConteudo, Long tamanho, String criadoEm) {
    }

    private final AnexoExameRepository anexoRepository;
    private final DossieRepository dossieRepository;
    private final AcessoMedico acessoMedico;

    public AnexoExameService(AnexoExameRepository anexoRepository, DossieRepository dossieRepository,
                             AcessoMedico acessoMedico) {
        this.anexoRepository = anexoRepository;
        this.dossieRepository = dossieRepository;
        this.acessoMedico = acessoMedico;
    }

    @Transactional(readOnly = true)
    public List<AnexoResumo> listar(Long dossieId, AuthService.Sessao sessao) {
        Dossie dossie = buscarDossie(dossieId, sessao);
        return anexoRepository.findByDossieIdOrderByCriadoEmDesc(dossie.getId()).stream()
                .map(a -> new AnexoResumo(a.getId(), a.getNomeArquivo(), a.getTipoConteudo(),
                        a.getTamanho(), a.getCriadoEm().toString()))
                .toList();
    }

    @Transactional
    public AnexoExame salvar(Long dossieId, MultipartFile arquivo, AuthService.Sessao sessao) {
        Dossie dossie = buscarDossie(dossieId, sessao);
        if (arquivo == null || arquivo.isEmpty()) {
            throw new RegraNegocioException("Selecione um arquivo de exame");
        }
        if (arquivo.getSize() > TAMANHO_MAXIMO) {
            throw new RegraNegocioException("O arquivo deve ter no máximo 10 MB");
        }
        String tipo = arquivo.getContentType();
        if (tipo == null || !TIPOS_PERMITIDOS.contains(tipo.toLowerCase())) {
            throw new RegraNegocioException("Formato não permitido. Envie PDF, JPG ou PNG");
        }
        try {
            byte[] conteudo = arquivo.getBytes();
            if (!conteudoConfereComTipo(conteudo, tipo.toLowerCase())) {
                throw new RegraNegocioException("O conteúdo do arquivo não corresponde a um PDF, JPG ou PNG válido");
            }
            AnexoExame anexo = new AnexoExame();
            anexo.setDossie(dossie);
            anexo.setNomeArquivo(nomeSeguro(arquivo.getOriginalFilename()));
            anexo.setTipoConteudo(tipo.toLowerCase());
            anexo.setTamanho(arquivo.getSize());
            anexo.setConteudo(conteudo);
            return anexoRepository.save(anexo);
        } catch (IOException e) {
            throw new RegraNegocioException("Não foi possível ler o arquivo enviado");
        }
    }

    @Transactional(readOnly = true)
    public AnexoExame baixar(Long anexoId, AuthService.Sessao sessao) {
        AnexoExame anexo = anexoRepository.findById(anexoId)
                .orElseThrow(() -> new RegraNegocioException("Anexo não encontrado"));
        buscarDossie(anexo.getDossie().getId(), sessao);
        return anexo;
    }

    private Dossie buscarDossie(Long dossieId, AuthService.Sessao sessao) {
        Dossie dossie = dossieRepository.findById(dossieId)
                .orElseThrow(() -> new RegraNegocioException("Dossiê não encontrado"));
        Perfil perfil = sessao.usuario().getPerfil();
        if (perfil == Perfil.ACS
                && !dossie.getPaciente().getMicroarea().getId().equals(sessao.microareaId())) {
            throw new AcessoNegadoException("O ACS só pode acessar exames da própria microárea");
        }
        if (sessao.usuario().getPerfil() == Perfil.MEDICO) {
            acessoMedico.verificar(sessao, dossie.getPaciente().getId());
        }
        return dossie;
    }

    /**
     * O tipo informado pelo navegador pode ser falsificado; por isso conferimos a "assinatura"
     * (primeiros bytes) do arquivo antes de guardar.
     */
    static boolean conteudoConfereComTipo(byte[] conteudo, String tipo) {
        return switch (tipo) {
            case "application/pdf" -> comecaCom(conteudo, '%', 'P', 'D', 'F');
            case "image/jpeg" -> comecaCom(conteudo, 0xFF, 0xD8, 0xFF);
            case "image/png" -> comecaCom(conteudo, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A);
            default -> false;
        };
    }

    private static boolean comecaCom(byte[] conteudo, int... assinatura) {
        if (conteudo == null || conteudo.length < assinatura.length) return false;
        for (int i = 0; i < assinatura.length; i++) {
            if ((conteudo[i] & 0xFF) != assinatura[i]) return false;
        }
        return true;
    }

    private String nomeSeguro(String nome) {
        if (nome == null || nome.isBlank()) return "exame";
        String seguro = nome.replaceAll("[\\\\/\\r\\n\\t]", "_").trim();
        return seguro.length() > 180 ? seguro.substring(seguro.length() - 180) : seguro;
    }
}
