package br.mackenzie.ruralmed.laudo;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LaudoRepository extends JpaRepository<Laudo, Long> {

    List<Laudo> findByMedicoUsuarioIdOrderByIdDesc(Long medicoId);

    List<Laudo> findByStatusAndEmitidoEmBetween(StatusLaudo status, OffsetDateTime inicio, OffsetDateTime fim);
}
