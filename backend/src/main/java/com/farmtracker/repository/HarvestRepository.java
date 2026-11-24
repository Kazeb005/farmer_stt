package com.farmtracker.repository;

import com.farmtracker.model.Harvest;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HarvestRepository extends JpaRepository<Harvest, Long> {
    Optional<Harvest> findByCropIdAndCropFieldOwnerUsername(Long cropId, String username);
    void deleteByCropId(Long cropId);
}