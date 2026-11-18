package br.mackenzie.ruralmed.relatorio;

import br.mackenzie.ruralmed.comum.RegraNegocioException;
import br.mackenzie.ruralmed.laudo.Laudo;
import br.mackenzie.ruralmed.laudo.LaudoRepository;
import br.mackenzie.ruralmed.laudo.StatusLaudo;
import br.mackenzie.ruralmed.triagem.Dossie;
import br.mackenzie.ruralmed.triagem.DossieRepository;
import br.mackenzie.ruralmed.usuario.Medico;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class RelatorioService {

    public record Relatorio(int triagens, int prioritarias, int laudosEmitidos,
                            int viagensTfdEvitadas, BigDecimal economiaEstimada) {
    }

    public record LinhaExtrato(String medico, String especialidade, int laudos,
                               BigDecimal valorPorLaudo, BigDecimal total) {
    }

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private final DossieRepository dossieRepository;
    private final LaudoRepository laudoRepository;

    public RelatorioService(DossieRepository dossieRepository, LaudoRepository laudoRepository) {
        this.dossieRepository = dossieRepository;
        this.laudoRepository = laudoRepository;
    }

    /**
     * RF05: cada laudo emitido é um caso resolvido a distância, ou seja, uma viagem de TFD evitada.
     * A economia usa o custo médio de viagem do município do paciente.
     */
    public Relatorio atendimentos(LocalDate inicio, LocalDate fim) {
        if (inicio == null || fim == null) throw new RegraNegocioException("Informe o período do relatório");
        if (inicio.isAfter(fim)) throw new RegraNegocioException("A data inicial deve ser anterior à final");
        if (inicio.plusYears(1).isBefore(fim)) {
            throw new RegraNegocioException("Escolha um período de até 1 ano");
        }
        OffsetDateTime de = inicio.atStartOfDay(FUSO).toOffsetDateTime();
        OffsetDateTime ate = fim.plusDays(1).atStartOfDay(FUSO).toOffsetDateTime();

        List<Dossie> triagens = dossieRepository.findByColetadoEmBetween(de, ate);
        int prioritarias = 0;
        for (Dossie d : triagens) {
            if (d.getPrioritario()) prioritarias++;
        }

        List<Laudo> laudos = laudoRepository.findByStatusAndEmitidoEmBetween(StatusLaudo.EMITIDO, de, ate);
        BigDecimal economia = BigDecimal.ZERO;
        for (Laudo laudo : laudos) {
            BigDecimal custoViagem = laudo.getDossie().getPaciente().getMicroarea().getUbs().getMunicipio()
                    .getCustoMedioViagemTfd();
            economia = economia.add(custoViagem);
        }
        return new Relatorio(triagens.size(), prioritarias, laudos.size(), laudos.size(), economia);
    }

    public List<LinhaExtrato> repasses(int ano, int mes) {
        if (mes < 1 || mes > 12) throw new RegraNegocioException("Informe um mês entre 1 e 12");
        if (ano < 2000 || ano > 2100) throw new RegraNegocioException("Informe um ano válido");
        OffsetDateTime de = LocalDate.of(ano, mes, 1).atStartOfDay(FUSO).toOffsetDateTime();
        OffsetDateTime ate = de.plusMonths(1);

        Map<Long, List<Laudo>> laudosPorMedico = new LinkedHashMap<>();
        for (Laudo laudo : laudoRepository.findByStatusAndEmitidoEmBetween(StatusLaudo.EMITIDO, de, ate)) {
            laudosPorMedico.computeIfAbsent(laudo.getMedico().getUsuarioId(), k -> new ArrayList<>()).add(laudo);
        }

        List<LinhaExtrato> extrato = new ArrayList<>();
        for (List<Laudo> laudos : laudosPorMedico.values()) {
            Medico medico = laudos.get(0).getMedico();
            BigDecimal total = medico.getValorPorLaudo().multiply(BigDecimal.valueOf(laudos.size()));
            extrato.add(new LinhaExtrato(medico.getUsuario().getNome(), medico.getEspecialidade().getNome(),
                    laudos.size(), medico.getValorPorLaudo(), total));
        }
        return extrato;
    }
}
