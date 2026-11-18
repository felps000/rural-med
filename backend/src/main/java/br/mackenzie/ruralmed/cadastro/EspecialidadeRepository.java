package br.mackenzie.ruralmed.cadastro;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EspecialidadeRepository extends JpaRepository<Especialidade, Long> {

    List<Especialidade> findAllByOrderByNome();
}
