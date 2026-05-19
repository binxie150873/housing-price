package com.portal.market.controller;

import com.portal.market.dto.PaginatedResponseDTO;
import com.portal.market.repository.entity.PropertyDataEntity;
import com.portal.market.service.DataService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DataController.class)
class DataControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DataService dataService;

    @Test
    void getData_defaultPagination_returnsOk() throws Exception {
        PropertyDataEntity entity = createTestEntity();
        PaginatedResponseDTO<PropertyDataEntity> response =
                PaginatedResponseDTO.of(List.of(entity), 1L, 1, 20);

        when(dataService.getData(any())).thenReturn(response);

        mockMvc.perform(get("/data"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.pageSize").value(20))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items[0].bedrooms").value(3));
    }

    @Test
    void getData_withFilters_returnsOk() throws Exception {
        PaginatedResponseDTO<PropertyDataEntity> response =
                PaginatedResponseDTO.of(List.of(), 0L, 1, 20);

        when(dataService.getData(any())).thenReturn(response);

        mockMvc.perform(get("/data")
                        .param("priceMin", "100000")
                        .param("priceMax", "300000")
                        .param("bedroomsMin", "2")
                        .param("bedroomsMax", "4")
                        .param("yearBuiltMin", "1990")
                        .param("yearBuiltMax", "2020")
                        .param("squareFootageMin", "1000")
                        .param("squareFootageMax", "3000")
                        .param("schoolRatingMin", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray());
    }

    @Test
    void getData_withSorting_returnsOk() throws Exception {
        PaginatedResponseDTO<PropertyDataEntity> response =
                PaginatedResponseDTO.of(List.of(), 0L, 1, 20);

        when(dataService.getData(any())).thenReturn(response);

        mockMvc.perform(get("/data")
                        .param("sortBy", "yearBuilt")
                        .param("sortOrder", "asc"))
                .andExpect(status().isOk());
    }

    @Test
    void getData_pageSizeExceeds100_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/data").param("pageSize", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PAGE_SIZE"))
                .andExpect(jsonPath("$.error.message").value("page_size must not exceed 100"));
    }

    @Test
    void getData_pageSizeZero_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/data").param("pageSize", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PAGE_SIZE"));
    }

    @Test
    void getData_pageZero_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/data").param("page", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PAGE"));
    }

    @Test
    void getData_pageBeyondTotal_returnsBadRequest() throws Exception {
        when(dataService.getData(any()))
                .thenThrow(new IllegalArgumentException("Page 100 is beyond available data. Total records: 50"));

        mockMvc.perform(get("/data").param("page", "100"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PAGINATION"))
                .andExpect(jsonPath("$.error.message").exists());
    }

    @Test
    void getData_customPageSize_returnsOk() throws Exception {
        PaginatedResponseDTO<PropertyDataEntity> response =
                PaginatedResponseDTO.of(List.of(), 0L, 1, 50);

        when(dataService.getData(any())).thenReturn(response);

        mockMvc.perform(get("/data").param("pageSize", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pageSize").value(50));
    }

    @Test
    void getData_pageSize100_returnsOk() throws Exception {
        PaginatedResponseDTO<PropertyDataEntity> response =
                PaginatedResponseDTO.of(List.of(), 0L, 1, 100);

        when(dataService.getData(any())).thenReturn(response);

        mockMvc.perform(get("/data").param("pageSize", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pageSize").value(100));
    }

    private PropertyDataEntity createTestEntity() {
        PropertyDataEntity entity = new PropertyDataEntity();
        entity.setId(1L);
        entity.setBedrooms(3);
        entity.setBathrooms(BigDecimal.valueOf(2));
        entity.setSquareFootage(BigDecimal.valueOf(1500));
        entity.setYearBuilt(2000);
        entity.setPrice(BigDecimal.valueOf(200000));
        entity.setLotSize(BigDecimal.valueOf(5000));
        entity.setSchoolRating(BigDecimal.valueOf(7));
        entity.setDistanceToCityCenter(BigDecimal.valueOf(5.2));
        return entity;
    }
}
