package com.farmtracker.repository;

import com.farmtracker.model.Livestock;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LivestockRepository extends JpaRepository<Livestock, Long> {
    List<Livestock> findAllByFieldOwnerUsernameOrderByIdDesc(String username);
    List<Livestock> findAllByField_IdAndField_Owner_UsernameOrderByIdDesc(Long fieldId, String username);
    Optional<Livestock> findByIdAndFieldOwnerUsername(Long id, String username);
}