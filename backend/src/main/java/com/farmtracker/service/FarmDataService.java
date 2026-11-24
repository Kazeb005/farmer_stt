package com.farmtracker.service;

import com.farmtracker.dto.FarmDtos.CropRequest;
import com.farmtracker.dto.FarmDtos.CropSummary;
import com.farmtracker.dto.FarmDtos.Dashboard;
import com.farmtracker.dto.FarmDtos.ExpenseList;
import com.farmtracker.dto.FarmDtos.ExpenseRequest;
import com.farmtracker.dto.FarmDtos.FieldRequest;
import com.farmtracker.dto.FarmDtos.HarvestRequest;
import com.farmtracker.dto.FarmDtos.LivestockRequest;
import com.farmtracker.model.Crop;
import com.farmtracker.model.CropStatus;
import com.farmtracker.model.Expense;
import com.farmtracker.model.FarmField;
import com.farmtracker.model.Harvest;
import com.farmtracker.model.Livestock;
import com.farmtracker.model.User;
import com.farmtracker.repository.CropRepository;
import com.farmtracker.repository.ExpenseRepository;
import com.farmtracker.repository.FarmFieldRepository;
import com.farmtracker.repository.HarvestRepository;
import com.farmtracker.repository.LivestockRepository;
import com.farmtracker.repository.UserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class FarmDataService {
    private final FarmFieldRepository fields;
    private final CropRepository crops;
    private final HarvestRepository harvests;
    private final ExpenseRepository expenses;
    private final LivestockRepository livestock;
    private final UserRepository users;

    public FarmDataService(FarmFieldRepository fields, CropRepository crops,
                           HarvestRepository harvests, ExpenseRepository expenses,
                           LivestockRepository livestock, UserRepository users) {
        this.fields = fields;
        this.crops = crops;
        this.harvests = harvests;
        this.expenses = expenses;
        this.livestock = livestock;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<FarmField> listFields(String username) {
        return fields.findAllByOwnerUsernameOrderByIdDesc(username);
    }

    public FarmField createField(FieldRequest request, String username) {
        var field = new FarmField();
        applyField(request, field);
        field.setOwner(currentUser(username));
        return fields.save(field);
    }

    public FarmField updateField(Long id, FieldRequest request, String username) {
        var field = ownedField(id, username);
        applyField(request, field);
        return fields.save(field);
    }

    public void deleteField(Long id, String username) {
        var field = ownedField(id, username);
        if (crops.countByField_IdAndField_Owner_Username(id, username) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This field still has crops. Remove its crops before deleting the field.");
        }
        livestock.findAllByField_IdAndField_Owner_UsernameOrderByIdDesc(id, username)
                .forEach(livestock::delete);
        fields.delete(field);
    }

    @Transactional(readOnly = true)
    public List<Crop> listCrops(String username) {
        return crops.findAllByFieldOwnerUsernameOrderByIdDesc(username);
    }

    @Transactional(readOnly = true)
    public List<Crop> listFieldCrops(Long fieldId, String username) {
        ownedField(fieldId, username);
        return crops.findAllByField_IdAndField_Owner_UsernameOrderByIdDesc(fieldId, username);
    }

    public Crop createCrop(Long fieldId, CropRequest request, String username) {
        var crop = new Crop();
        applyCrop(request, crop);
        crop.setField(ownedField(fieldId, username));
        return crops.save(crop);
    }

    public Crop updateCrop(Long id, CropRequest request, String username) {
        var crop = ownedCrop(id, username);
        applyCrop(request, crop);
        return crops.save(crop);
    }

    public void deleteCrop(Long id, String username) {
        Crop crop = ownedCrop(id, username);
        harvests.deleteByCropId(id);
        expenses.deleteAllByCropId(id);
        crops.delete(crop);
    }

    @Transactional(readOnly = true)
    public Harvest getHarvest(Long cropId, String username) {
        ownedCrop(cropId, username);
        return harvests.findByCropIdAndCropFieldOwnerUsername(cropId, username).orElse(null);
    }

    public Harvest recordHarvest(Long cropId, HarvestRequest request, String username) {
        var crop = ownedCrop(cropId, username);
        if (harvests.findByCropIdAndCropFieldOwnerUsername(cropId, username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A harvest is already recorded for this crop");
        }
        if (crop.getPlantingDate() != null && request.harvestDate().isBefore(crop.getPlantingDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Harvest date cannot be earlier than the planting date");
        }
        var harvest = new Harvest();
        harvest.setHarvestDate(request.harvestDate());
        harvest.setYieldQuantity(request.yieldQuantity());
        harvest.setUnit(request.unit());
        harvest.setCrop(crop);
        crop.setStatus(CropStatus.HARVESTED);
        return harvests.save(harvest);
    }

    @Transactional(readOnly = true)
    public ExpenseList listExpenses(Long cropId, String username) {
        ownedCrop(cropId, username);
        return new ExpenseList(
                expenses.findAllByCropIdAndCropFieldOwnerUsernameOrderByExpenseDateDesc(cropId, username),
                expenses.totalForCrop(cropId, username));
    }

    public Expense addExpense(Long cropId, ExpenseRequest request, String username) {
        var expense = new Expense();
        expense.setCategory(request.category());
        expense.setAmount(request.amount());
        expense.setExpenseDate(request.expenseDate());
        expense.setCrop(ownedCrop(cropId, username));
        return expenses.save(expense);
    }

    @Transactional(readOnly = true)
    public List<Livestock> listLivestock(String username) {
        return livestock.findAllByFieldOwnerUsernameOrderByIdDesc(username);
    }

    public Livestock createLivestock(LivestockRequest request, String username) {
        var animal = new Livestock();
        applyLivestock(request, animal, username);
        return livestock.save(animal);
    }

    public Livestock updateLivestock(Long id, LivestockRequest request, String username) {
        var animal = ownedLivestock(id, username);
        applyLivestock(request, animal, username);
        return livestock.save(animal);
    }

    public void deleteLivestock(Long id, String username) {
        livestock.delete(ownedLivestock(id, username));
    }

    @Transactional(readOnly = true)
    public Dashboard dashboard(String username) {
        List<CropSummary> summaries = crops.findAllByFieldOwnerUsernameOrderByIdDesc(username).stream()
                .map(crop -> {
                    var harvest = harvests.findByCropIdAndCropFieldOwnerUsername(crop.getId(), username)
                            .orElse(null);
                    return new CropSummary(crop.getId(), crop.getName(), crop.getField().getName(),
                            crop.getStatus(), expenses.totalForCrop(crop.getId(), username),
                            harvest == null ? null : harvest.getYieldQuantity(),
                            harvest == null ? null : harvest.getUnit());
                }).toList();
        long fieldCount = fields.countByOwnerUsername(username);
        return new Dashboard(fieldCount,
                crops.countByFieldOwnerUsernameAndStatus(username, CropStatus.PLANTED)
                        + crops.countByFieldOwnerUsernameAndStatus(username, CropStatus.GROWING),
                crops.countByFieldOwnerUsernameAndStatus(username, CropStatus.HARVESTED),
                expenses.totalForUser(username), summaries,
                summaries.isEmpty() && fieldCount == 0);
    }

    private User currentUser(String username) {
        return users.findByUsername(username).orElseThrow();
    }

    private FarmField ownedField(Long id, String username) {
        return fields.findByIdAndOwnerUsername(id, username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Field not found"));
    }

    private Crop ownedCrop(Long id, String username) {
        return crops.findByIdAndFieldOwnerUsername(id, username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Crop not found"));
    }

    private Livestock ownedLivestock(Long id, String username) {
        return livestock.findByIdAndFieldOwnerUsername(id, username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Livestock record not found"));
    }

    private void applyField(FieldRequest request, FarmField field) {
        field.setName(request.name().trim());
        field.setLocation(request.location());
        field.setSizeHectares(request.sizeHectares());
        field.setSoilType(request.soilType());
    }

    private void applyCrop(CropRequest request, Crop crop) {
        if (request.expectedHarvestDate() != null && request.plantingDate() != null
                && request.expectedHarvestDate().isBefore(request.plantingDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Expected harvest date cannot be earlier than the planting date");
        }
        crop.setName(request.name().trim());
        crop.setType(request.type());
        crop.setPlantingDate(request.plantingDate());
        crop.setExpectedHarvestDate(request.expectedHarvestDate());
        crop.setStatus(request.status() == null ? CropStatus.PLANTED : request.status());
    }

    private void applyLivestock(LivestockRequest request, Livestock animal, String username) {
        animal.setType(request.type().trim());
        animal.setCount(request.count());
        animal.setHealthStatus(request.healthStatus());
        animal.setAcquisitionDate(request.acquisitionDate());
        animal.setField(ownedField(request.fieldId(), username));
    }
}