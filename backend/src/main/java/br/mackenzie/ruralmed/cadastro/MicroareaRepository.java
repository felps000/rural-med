package br.mackenzie.ruralmed.cadastro;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MicroareaRepository extends JpaRepository<Microarea, Long> {

    List<Microarea> findAllByOrderByNome();
}
