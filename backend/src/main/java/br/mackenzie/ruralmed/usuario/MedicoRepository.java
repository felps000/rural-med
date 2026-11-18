package br.mackenzie.ruralmed.usuario;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicoRepository extends JpaRepository<Medico, Long> {

    List<Medico> findByEspecialidadeIdAndCrmAtivoTrue(Long especialidadeId);
}
