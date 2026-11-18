package br.mackenzie.ruralmed.paciente;

import br.mackenzie.ruralmed.auth.AuthService;
import br.mackenzie.ruralmed.comum.AcessoNegadoException;
import br.mackenzie.ruralmed.triagem.DossieRepository;
import br.mackenzie.ruralmed.usuario.Perfil;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Quais pacientes um médico pode consultar (histórico, exames, receitas).
 * <ul>
 *   <li>Pacientes que já tiveram atendimento na especialidade dele (chegaram à fila dele);</li>
 *   <li>Pacientes que ele localizou pelo CPF ou ID RuralMed completo, por 8 horas.</li>
 * </ul>
 * Assim o médico não consegue percorrer o cadastro trocando o número do paciente na URL.
 */
@Component
public class AcessoMedico {

    static final Duration VALIDADE = Duration.ofHours(8);

    private record Chave(Long medicoId, Long pacienteId) {
    }

    private final Map<Chave, Instant> liberados = new ConcurrentHashMap<>();
    private final DossieRepository dossieRepository;
    private final Clock relogio;

    @Autowired
    public AcessoMedico(DossieRepository dossieRepository) {
        this(dossieRepository, Clock.systemUTC());
    }

    AcessoMedico(DossieRepository dossieRepository, Clock relogio) {
        this.dossieRepository = dossieRepository;
        this.relogio = relogio;
    }

    /** Chamado quando o médico localiza o paciente por um identificador exato. */
    public void liberar(Long medicoId, Long pacienteId) {
        Instant agora = relogio.instant();
        liberados.values().removeIf(ate -> !agora.isBefore(ate));
        liberados.put(new Chave(medicoId, pacienteId), agora.plus(VALIDADE));
    }

    /** Não faz nada para outros perfis: as regras deles ficam nos próprios serviços. */
    public void verificar(AuthService.Sessao sessao, Long pacienteId) {
        if (sessao.usuario().getPerfil() != Perfil.MEDICO) return;
        if (sessao.especialidadeId() != null
                && dossieRepository.existsByPacienteIdAndEspecialidadeId(pacienteId, sessao.especialidadeId())) {
            return;
        }
        Instant ate = liberados.get(new Chave(sessao.usuario().getId(), pacienteId));
        if (ate != null && relogio.instant().isBefore(ate)) return;
        throw new AcessoNegadoException("Localize o paciente pelo CPF ou ID RuralMed para ver o histórico");
    }
}
