package br.mackenzie.ruralmed.cadastro;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CidRepository extends JpaRepository<Cid, String> {

    List<Cid> findTop20ByCodigoContainingIgnoreCaseOrDescricaoContainingIgnoreCase(String codigo, String descricao);
}
