package com.portal.market.service;

import com.portal.market.dto.FilterRequestDTO;
import com.portal.market.dto.PaginatedResponseDTO;
import com.portal.market.repository.PropertyDataRepository;
import com.portal.market.repository.entity.PropertyDataEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataServiceTest {

    @Mock
    private PropertyDataRepository propertyDataRepository;

    private DataService dataService;

    @BeforeEach
    void setUp() {
        dataService = new DataService(propertyDataRepository);
    }

    @Test
    void getData_defaultPagination_returnsCorrectPage() {
        PropertyDataEntity entity = createEntity(1L, 3, 200000);
        Page<PropertyDataEntity> page = new PageImpl<>(List.of(entity), Pageable.ofSize(20), 1);

        when(propertyDataRepository.count(any(Specification.class))).thenReturn(1L);
        when(propertyDataRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        FilterRequestDTO filter = new FilterRequestDTO(1, 20, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
        PaginatedResponseDTO<PropertyDataEntity> result = dataService.getData(filter);

        assertEquals(1, result.page());
        assertEquals(20, result.pageSize());
        assertEquals(1, result.total());
        assertEquals(1, result.totalPages());
        assertEquals(1, result.items().size());
    }

    @Test
    void getData_pageSizeExceeds100_throwsException() {
        FilterRequestDTO filter = new FilterRequestDTO(1, 101, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> dataService.getData(filter));
        assertTrue(ex.getMessage().contains("page_size must not exceed 100"));
    }

    @Test
    void getData_pageBeyondTotal_throwsException() {
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(10L);

        FilterRequestDTO filter = new FilterRequestDTO(5, 20, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> dataService.getData(filter));
        assertTrue(ex.getMessage().contains("beyond available data"));
    }

    @Test
    void getData_emptyResult_returnsEmptyPage() {
        Page<PropertyDataEntity> emptyPage = new PageImpl<>(List.of(), Pageable.ofSize(20), 0);

        when(propertyDataRepository.count(any(Specification.class))).thenReturn(0L);
        when(propertyDataRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(emptyPage);

        FilterRequestDTO filter = new FilterRequestDTO(1, 20, null, null, 5, null, null, null, null, null, null, null, null, null, null, null, null, null);
        PaginatedResponseDTO<PropertyDataEntity> result = dataService.getData(filter);

        assertEquals(0, result.total());
        assertTrue(result.items().isEmpty());
    }

    @Test
    void getData_withAllFilters_returnsFilteredData() {
        PropertyDataEntity entity = createEntity(1L, 3, 250000);
        Page<PropertyDataEntity> page = new PageImpl<>(List.of(entity), Pageable.ofSize(20), 1);

        when(propertyDataRepository.count(any(Specification.class))).thenReturn(1L);
        when(propertyDataRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        FilterRequestDTO filter = new FilterRequestDTO(
                1, 20,
                BigDecimal.valueOf(100000), BigDecimal.valueOf(300000),
                3, 5,
                BigDecimal.valueOf(1), BigDecimal.valueOf(3),
                1990, 2020,
                BigDecimal.valueOf(1000), BigDecimal.valueOf(3000),
                BigDecimal.valueOf(5000), BigDecimal.valueOf(20000),
                BigDecimal.valueOf(5), BigDecimal.valueOf(10),
                "price", "asc"
        );

        PaginatedResponseDTO<PropertyDataEntity> result = dataService.getData(filter);

        assertEquals(1, result.items().size());
        assertEquals(3, result.items().get(0).getBedrooms());
    }

    @Test
    void getData_sortByAsc_returnsResults() {
        PropertyDataEntity entity = createEntity(1L, 3, 200000);
        Page<PropertyDataEntity> page = new PageImpl<>(List.of(entity), Pageable.ofSize(20), 1);

        when(propertyDataRepository.count(any(Specification.class))).thenReturn(1L);
        when(propertyDataRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        FilterRequestDTO filter = new FilterRequestDTO(1, 20, null, null, null, null, null, null, null, null, null, null, null, null, null, null, "yearBuilt", "asc");
        PaginatedResponseDTO<PropertyDataEntity> result = dataService.getData(filter);

        assertNotNull(result);
        assertEquals(1, result.items().size());
    }

    @Test
    void getData_lastValidPage_returnsResults() {
        // 50 total records, page size 20 -> pages 1, 2, 3 (last page has 10 items)
        PropertyDataEntity entity = createEntity(1L, 3, 200000);
        Page<PropertyDataEntity> page = new PageImpl<>(List.of(entity), Pageable.ofSize(20), 50);

        when(propertyDataRepository.count(any(Specification.class))).thenReturn(50L);
        when(propertyDataRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        FilterRequestDTO filter = new FilterRequestDTO(3, 20, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
        PaginatedResponseDTO<PropertyDataEntity> result = dataService.getData(filter);

        assertNotNull(result);
    }

    @Test
    void getData_pageJustBeyondTotal_throwsException() {
        // 50 total records, page size 20 -> page 4 offset = 60 >= 50
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(50L);

        FilterRequestDTO filter = new FilterRequestDTO(4, 20, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        assertThrows(IllegalArgumentException.class, () -> dataService.getData(filter));
    }

    private PropertyDataEntity createEntity(Long id, int bedrooms, double price) {
        PropertyDataEntity entity = new PropertyDataEntity();
        entity.setId(id);
        entity.setBedrooms(bedrooms);
        entity.setBathrooms(BigDecimal.valueOf(2));
        entity.setSquareFootage(BigDecimal.valueOf(1500));
        entity.setPrice(BigDecimal.valueOf(price));
        entity.setYearBuilt(2000);
        entity.setLotSize(BigDecimal.valueOf(5000));
        return entity;
    }
}
