package com.portal.market.controller;

import com.portal.market.dto.MarketStatsDTO;
import com.portal.market.service.StatisticsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MarketController.class)
class MarketControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StatisticsService statisticsService;

    @Test
    void getStatistics_noFilters_returnsOk() throws Exception {
        // Given
        MarketStatsDTO stats = createTestStats(false);
        when(statisticsService.getStatistics(isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(stats);

        // When/Then
        mockMvc.perform(get("/statistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cached").value(false))
                .andExpect(jsonPath("$.generatedAt").exists())
                .andExpect(jsonPath("$.squareFootageVsPrice").isArray())
                .andExpect(jsonPath("$.yearBuiltVsPrice").isArray())
                .andExpect(jsonPath("$.distanceSchoolVsPrice.byDistance").isArray())
                .andExpect(jsonPath("$.distanceSchoolVsPrice.bySchoolRating").isArray());
    }

    @Test
    void getStatistics_withFilters_returnsFilteredResults() throws Exception {
        // Given
        MarketStatsDTO stats = createTestStats(true);
        when(statisticsService.getStatistics(eq(100000.0), eq(500000.0), eq(2), eq(5), eq(2000), eq(2023)))
                .thenReturn(stats);

        // When/Then
        mockMvc.perform(get("/statistics")
                        .param("priceMin", "100000.0")
                        .param("priceMax", "500000.0")
                        .param("bedroomsMin", "2")
                        .param("bedroomsMax", "5")
                        .param("yearMin", "2000")
                        .param("yearMax", "2023"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cached").value(true))
                .andExpect(jsonPath("$.squareFootageVsPrice").isArray());
    }

    @Test
    void getStatistics_cachedResult_returnsCachedTrue() throws Exception {
        // Given
        MarketStatsDTO cachedStats = createTestStats(true);
        when(statisticsService.getStatistics(isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(cachedStats);

        // When/Then
        mockMvc.perform(get("/statistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cached").value(true));
    }

    @Test
    void getStatistics_emptyResult_returnsEmptyArrays() throws Exception {
        // Given
        MarketStatsDTO emptyStats = new MarketStatsDTO(
                List.of(),
                List.of(),
                new MarketStatsDTO.ClusteredBarData(List.of(), List.of()),
                false,
                Instant.now()
        );
        when(statisticsService.getStatistics(isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(emptyStats);

        // When/Then
        mockMvc.perform(get("/statistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.squareFootageVsPrice").isEmpty())
                .andExpect(jsonPath("$.yearBuiltVsPrice").isEmpty())
                .andExpect(jsonPath("$.distanceSchoolVsPrice.byDistance").isEmpty())
                .andExpect(jsonPath("$.distanceSchoolVsPrice.bySchoolRating").isEmpty());
    }

    private MarketStatsDTO createTestStats(boolean cached) {
        return new MarketStatsDTO(
                List.of(
                        new MarketStatsDTO.SquareFootagePricePoint(1200, 180000.0),
                        new MarketStatsDTO.SquareFootagePricePoint(1800, 250000.0),
                        new MarketStatsDTO.SquareFootagePricePoint(2500, 350000.0)
                ),
                List.of(
                        new MarketStatsDTO.YearBuiltPriceSegment("1990s", 200000.0, 20),
                        new MarketStatsDTO.YearBuiltPriceSegment("2000s", 280000.0, 40),
                        new MarketStatsDTO.YearBuiltPriceSegment("2010s", 350000.0, 30)
                ),
                new MarketStatsDTO.ClusteredBarData(
                        List.of(
                                new MarketStatsDTO.RangeAvgPrice("0-2mi", 350000.0, 15),
                                new MarketStatsDTO.RangeAvgPrice("2-4mi", 280000.0, 25),
                                new MarketStatsDTO.RangeAvgPrice("4-6mi", 220000.0, 20),
                                new MarketStatsDTO.RangeAvgPrice("6-8mi", 180000.0, 15),
                                new MarketStatsDTO.RangeAvgPrice("8+mi", 150000.0, 10)
                        ),
                        List.of(
                                new MarketStatsDTO.RangeAvgPrice("6-7", 180000.0, 10),
                                new MarketStatsDTO.RangeAvgPrice("7-8", 240000.0, 25),
                                new MarketStatsDTO.RangeAvgPrice("8-9", 300000.0, 30),
                                new MarketStatsDTO.RangeAvgPrice("9-10", 380000.0, 20)
                        )
                ),
                cached,
                Instant.now()
        );
    }
}
