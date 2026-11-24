package com.farmtracker.controller;

import com.farmtracker.dto.FarmDtos.CropRequest;
import com.farmtracker.dto.FarmDtos.Dashboard;
import com.farmtracker.dto.FarmDtos.ExpenseList;
import com.farmtracker.dto.FarmDtos.ExpenseRequest;
import com.farmtracker.dto.FarmDtos.FieldRequest;
import com.farmtracker.dto.FarmDtos.HarvestRequest;
import com.farmtracker.dto.FarmDtos.LivestockRequest;
import com.farmtracker.model.Crop;
import com.farmtracker.model.Expense;
import com.farmtracker.model.FarmField;
import com.farmtracker.model.Harvest;
import com.farmtracker.model.Livestock;
import com.farmtracker.service.FarmDataService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class FarmDataController {
    private final FarmDataService farmDataService;

    public FarmDataController(FarmDataService farmDataService) {
        this.farmDataService = farmDataService;
    }

    @GetMapping("/fields")
    public List<FarmField> listFields(Authentication auth) {
        return farmDataService.listFields(auth.getName());
    }

    @PostMapping("/fields")
    public FarmField createField(@Valid @RequestBody FieldRequest request, Authentication auth) {
        return farmDataService.createField(request, auth.getName());
    }

    @PutMapping("/fields/{id}")
    public FarmField updateField(@PathVariable Long id, @Valid @RequestBody FieldRequest request,
                                 Authentication auth) {
        return farmDataService.updateField(id, request, auth.getName());
    }

    @DeleteMapping("/fields/{id}")
    public void deleteField(@PathVariable Long id, Authentication auth) {
        farmDataService.deleteField(id, auth.getName());
    }

    @GetMapping("/crops")
    public List<Crop> listCrops(Authentication auth) {
        return farmDataService.listCrops(auth.getName());
    }

    @GetMapping("/fields/{fieldId}/crops")
    public List<Crop> listFieldCrops(@PathVariable Long fieldId, Authentication auth) {
        return farmDataService.listFieldCrops(fieldId, auth.getName());
    }

    @PostMapping("/fields/{fieldId}/crops")
    public Crop createCrop(@PathVariable Long fieldId, @Valid @RequestBody CropRequest request,
                           Authentication auth) {
        return farmDataService.createCrop(fieldId, request, auth.getName());
    }

    @PutMapping("/crops/{id}")
    public Crop updateCrop(@PathVariable Long id, @Valid @RequestBody CropRequest request,
                           Authentication auth) {
        return farmDataService.updateCrop(id, request, auth.getName());
    }

    @DeleteMapping("/crops/{id}")
    public void deleteCrop(@PathVariable Long id, Authentication auth) {
        farmDataService.deleteCrop(id, auth.getName());
    }

    @GetMapping("/crops/{cropId}/harvest")
    public Harvest getHarvest(@PathVariable Long cropId, Authentication auth) {
        return farmDataService.getHarvest(cropId, auth.getName());
    }

    @PostMapping("/crops/{cropId}/harvest")
    public Harvest recordHarvest(@PathVariable Long cropId, @Valid @RequestBody HarvestRequest request,
                                 Authentication auth) {
        return farmDataService.recordHarvest(cropId, request, auth.getName());
    }

    @GetMapping("/crops/{cropId}/expenses")
    public ExpenseList listExpenses(@PathVariable Long cropId, Authentication auth) {
        return farmDataService.listExpenses(cropId, auth.getName());
    }

    @PostMapping("/crops/{cropId}/expenses")
    public Expense addExpense(@PathVariable Long cropId, @Valid @RequestBody ExpenseRequest request,
                              Authentication auth) {
        return farmDataService.addExpense(cropId, request, auth.getName());
    }

    @GetMapping("/livestock")
    public List<Livestock> listLivestock(Authentication auth) {
        return farmDataService.listLivestock(auth.getName());
    }

    @PostMapping("/livestock")
    public Livestock createLivestock(@Valid @RequestBody LivestockRequest request, Authentication auth) {
        return farmDataService.createLivestock(request, auth.getName());
    }

    @PutMapping("/livestock/{id}")
    public Livestock updateLivestock(@PathVariable Long id, @Valid @RequestBody LivestockRequest request,
                                     Authentication auth) {
        return farmDataService.updateLivestock(id, request, auth.getName());
    }

    @DeleteMapping("/livestock/{id}")
    public void deleteLivestock(@PathVariable Long id, Authentication auth) {
        farmDataService.deleteLivestock(id, auth.getName());
    }

    @GetMapping("/dashboard")
    public Dashboard dashboard(Authentication auth) {
        return farmDataService.dashboard(auth.getName());
    }
}