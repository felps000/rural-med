package br.mackenzie.ruralmed.cadastro;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClinicaParceiraRepository extends JpaRepository<ClinicaParceira, Long> {

    List<ClinicaParceira> findAllByOrderByNome();
}
