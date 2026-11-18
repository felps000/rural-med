package br.mackenzie.ruralmed.laudo;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReceitaRepository extends JpaRepository<Receita, Long> {
    List<Receita> findByDossieIdOrderByAssinadaEmDesc(Long dossieId);
}
