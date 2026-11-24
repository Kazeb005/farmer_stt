package com.farmtracker.dto;

import com.farmtracker.model.CropStatus;
import com.farmtracker.model.Expense;
import com.farmtracker.model.ExpenseCategory;
import com.farmtracker.model.YieldUnit;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class FarmDtos {
    private FarmDtos() {}

    public record FieldRequest(@NotBlank String name, String location,
                               @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal sizeHectares,
                               String soilType) {}
    public record CropRequest(@NotBlank String name, String type, LocalDate plantingDate,
                              LocalDate expectedHarvestDate, CropStatus status) {}
    public record HarvestRequest(@NotNull LocalDate harvestDate,
                                 @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal yieldQuantity,
                                 @NotNull YieldUnit unit) {}
    public record ExpenseRequest(@NotNull ExpenseCategory category,
                                 @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal amount,
                                 @NotNull LocalDate expenseDate) {}
    public record LivestockRequest(@NotBlank String type, @Min(0) int count, String healthStatus,
                                   LocalDate acquisitionDate, @NotNull Long fieldId) {}
    public record ExpenseList(List<Expense> items, BigDecimal total) {}
    public record CropSummary(Long cropId, String cropName, String fieldName, CropStatus status,
                              BigDecimal totalExpenses, BigDecimal totalYield, YieldUnit yieldUnit) {}
    public record Dashboard(long fieldCount, long activeCropCount, long harvestedCropCount,
                            BigDecimal totalExpenses, List<CropSummary> crops, boolean noData) {}
}