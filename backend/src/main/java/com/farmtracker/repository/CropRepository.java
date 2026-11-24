package com.farmtracker.repository;

import com.farmtracker.model.Crop;
import com.farmtracker.model.CropStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CropRepository extends JpaRepository<Crop, Long> {
    List<Crop> findAllByFieldOwnerUsernameOrderByIdDesc(String username);
    List<Crop> findAllByField_IdAndField_Owner_UsernameOrderByIdDesc(Long fieldId, String username);
    Optional<Crop> findByIdAndFieldOwnerUsername(Long id, String username);
    long countByField_IdAndField_Owner_Username(Long fieldId, String username);
    long countByFieldOwnerUsernameAndStatus(String username, CropStatus status);
}