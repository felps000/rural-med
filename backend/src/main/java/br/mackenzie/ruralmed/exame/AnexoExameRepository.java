package br.mackenzie.ruralmed.exame;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnexoExameRepository extends JpaRepository<AnexoExame, Long> {
    List<AnexoExame> findByDossieIdOrderByCriadoEmDesc(Long dossieId);
}
