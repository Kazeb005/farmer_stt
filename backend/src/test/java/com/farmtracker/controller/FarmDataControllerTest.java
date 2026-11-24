package com.farmtracker.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.farmtracker.dto.FarmDtos.CropRequest;
import com.farmtracker.dto.FarmDtos.HarvestRequest;
import com.farmtracker.model.Crop;
import com.farmtracker.model.CropStatus;
import com.farmtracker.model.FarmField;
import com.farmtracker.model.Harvest;
import com.farmtracker.model.Livestock;
import com.farmtracker.model.YieldUnit;
import com.farmtracker.repository.CropRepository;
import com.farmtracker.repository.ExpenseRepository;
import com.farmtracker.repository.FarmFieldRepository;
import com.farmtracker.repository.HarvestRepository;
import com.farmtracker.repository.LivestockRepository;
import com.farmtracker.repository.UserRepository;
import com.farmtracker.service.FarmDataService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

class FarmDataControllerTest {
    private final FarmFieldRepository fields = mock(FarmFieldRepository.class);
    private final CropRepository crops = mock(CropRepository.class);
    private final HarvestRepository harvests = mock(HarvestRepository.class);
    private final ExpenseRepository expenses = mock(ExpenseRepository.class);
    private final LivestockRepository livestock = mock(LivestockRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final Authentication authentication = mock(Authentication.class);
        private FarmDataService farmDataService;
        private FarmDataController controller;

    @BeforeEach
    void setUp() {
        farmDataService = new FarmDataService(fields, crops, harvests, expenses, livestock, users);
        controller = new FarmDataController(farmDataService);
        when(authentication.getName()).thenReturn("farmer");
    }

    @Test
    void rejectsExpectedHarvestBeforePlanting() {
        var request = new CropRequest("Maize", "Hybrid",
                LocalDate.of(2026, 5, 10), LocalDate.of(2026, 5, 9), null);

        assertThatThrownBy(() -> controller.createCrop(1L, request, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("earlier than the planting date");
        verify(fields, never()).findByIdAndOwnerUsername(1L, "farmer");
        verify(crops, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void recordsOneHarvestAndMovesCropToHarvested() {
        var crop = new Crop();
        crop.setId(7L);
        crop.setName("Maize");
        when(crops.findByIdAndFieldOwnerUsername(7L, "farmer")).thenReturn(Optional.of(crop));
        when(harvests.findByCropIdAndCropFieldOwnerUsername(7L, "farmer"))
                .thenReturn(Optional.empty());
        when(harvests.save(org.mockito.ArgumentMatchers.any(Harvest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        var request = new HarvestRequest(LocalDate.of(2026, 10, 1),
                new BigDecimal("125.50"), YieldUnit.KG);

        Harvest result = controller.recordHarvest(7L, request, authentication);

        assertThat(result.getYieldQuantity()).isEqualByComparingTo("125.50");
        assertThat(result.getUnit()).isEqualTo(YieldUnit.KG);
        assertThat(crop.getStatus()).isEqualTo(CropStatus.HARVESTED);
        verify(harvests).save(result);
    }

    @Test
    void rejectsASecondHarvestForTheSameCrop() {
        var crop = new Crop();
        when(crops.findByIdAndFieldOwnerUsername(7L, "farmer")).thenReturn(Optional.of(crop));
        when(harvests.findByCropIdAndCropFieldOwnerUsername(7L, "farmer"))
                .thenReturn(Optional.of(new Harvest()));
        var request = new HarvestRequest(LocalDate.of(2026, 10, 1),
                new BigDecimal("10"), YieldUnit.BAGS);

        assertThatThrownBy(() -> controller.recordHarvest(7L, request, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already recorded");
        verify(harvests, never()).save(org.mockito.ArgumentMatchers.any());
    }

        @Test
        void serializesFieldIdsWithoutExposingJpaRelationships() throws Exception {
                var field = new FarmField();
                field.setId(12L);
                var crop = new Crop();
                crop.setField(field);
                var animal = new Livestock();
                animal.setField(field);
                var mapper = new ObjectMapper();

                JsonNode cropJson = mapper.readTree(mapper.writeValueAsString(crop));
                JsonNode livestockJson = mapper.readTree(mapper.writeValueAsString(animal));

                assertThat(cropJson.get("fieldId").asLong()).isEqualTo(12L);
                assertThat(cropJson.has("field")).isFalse();
                assertThat(livestockJson.get("fieldId").asLong()).isEqualTo(12L);
                assertThat(livestockJson.has("field")).isFalse();
        }
}