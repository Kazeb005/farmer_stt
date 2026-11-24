package com.farmtracker.repository;

import com.farmtracker.model.Expense;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findAllByCropIdAndCropFieldOwnerUsernameOrderByExpenseDateDesc(Long cropId, String username);
    void deleteAllByCropId(Long cropId);

    @Query("select coalesce(sum(e.amount), 0) from Expense e where e.crop.id = :cropId and e.crop.field.owner.username = :username")
    BigDecimal totalForCrop(@Param("cropId") Long cropId, @Param("username") String username);

    @Query("select coalesce(sum(e.amount), 0) from Expense e where e.crop.field.owner.username = :username")
    BigDecimal totalForUser(@Param("username") String username);
}