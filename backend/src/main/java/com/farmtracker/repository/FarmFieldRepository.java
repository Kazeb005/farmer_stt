package com.farmtracker.repository;

import com.farmtracker.model.FarmField;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FarmFieldRepository extends JpaRepository<FarmField, Long> {
    List<FarmField> findAllByOwnerUsernameOrderByIdDesc(String username);
    Optional<FarmField> findByIdAndOwnerUsername(Long id, String username);
    long countByOwnerUsername(String username);
}