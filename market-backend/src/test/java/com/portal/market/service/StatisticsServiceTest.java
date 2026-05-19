package com.portal.market.service;

import com.portal.market.dto.MarketStatsDTO;
import com.portal.market.repository.PropertyDataRepository;
import com.portal.market.repository.entity.PropertyDataEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StatisticsServiceTest {

    @Mock
    private PropertyDataRepository propertyDataRepository;

    @Mock
    private CacheService cacheService;

    private StatisticsService statisticsService;

    @BeforeEach
    void setUp() {
        statisticsService = new StatisticsService(propertyDataRepository, cacheService);
    }

    @Test
    void getStatistics_cacheHit_returnsCachedResult() {
        // Given
        MarketStatsDTO cachedStats = new MarketStatsDTO(
                List.of(new MarketStatsDTO.SquareFootagePricePoint(1500, 200000.0)),
                List.of(new MarketStatsDTO.YearBuiltPriceSegment("2000s", 250000.0, 5)),
                new MarketStatsDTO.ClusteredBarData(
                        List.of(new MarketStatsDTO.RangeAvgPrice("0-2mi", 300000.0, 3)),
                        List.of(new MarketStatsDTO.RangeAvgPrice("8-9", 280000.0, 4))
                ),
                true,
                java.time.Instant.now()
        );
        when(cacheService.generateStatsKey(any(), any(), any(), any(), any(), any()))
                .thenReturn("market:stats:abc123");
        when(cacheService.get("market:stats:abc123", MarketStatsDTO.class))
                .thenReturn(CacheService.CacheResult.hit(cachedStats));

        // When
        MarketStatsDTO result = statisticsService.getStatistics(null, null, null, null, null, null);

        // Then
        assertNotNull(result);
        assertTrue(result.cached());
        assertEquals(1, result.squareFootageVsPrice().size());
        verify(propertyDataRepository, never()).findAll(any(Specification.class));
    }

    @Test
    void getStatistics_cacheMiss_computesAndCaches() {
        // Given
        when(cacheService.generateStatsKey(any(), any(), any(), any(), any(), any()))
                .thenReturn("market:stats:abc123");
        when(cacheService.get("market:stats:abc123", MarketStatsDTO.class))
                .thenReturn(CacheService.CacheResult.miss());

        List<PropertyDataEntity> entities = createTestEntities();
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(entities);

        // When
        MarketStatsDTO result = statisticsService.getStatistics(null, null, null, null, null, null);

        // Then
        assertNotNull(result);
        assertFalse(result.cached());
        assertEquals(3, result.squareFootageVsPrice().size());
        verify(cacheService).put(eq("market:stats:abc123"), any(MarketStatsDTO.class));
    }

    @Test
    void getStatistics_emptyData_returnsEmptyLists() {
        // Given
        when(cacheService.generateStatsKey(any(), any(), any(), any(), any(), any()))
                .thenReturn("market:stats:abc123");
        when(cacheService.get("market:stats:abc123", MarketStatsDTO.class))
                .thenReturn(CacheService.CacheResult.miss());
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());

        // When
        MarketStatsDTO result = statisticsService.getStatistics(null, null, null, null, null, null);

        // Then
        assertNotNull(result);
        assertTrue(result.squareFootageVsPrice().isEmpty());
        assertTrue(result.yearBuiltVsPrice().isEmpty());
        assertTrue(result.distanceSchoolVsPrice().byDistance().isEmpty());
        assertTrue(result.distanceSchoolVsPrice().bySchoolRating().isEmpty());
    }

    @Test
    void getStatistics_computesSquareFootageVsPrice_sortedBySquareFootage() {
        // Given
        when(cacheService.generateStatsKey(any(), any(), any(), any(), any(), any()))
                .thenReturn("market:stats:abc123");
        when(cacheService.get("market:stats:abc123", MarketStatsDTO.class))
                .thenReturn(CacheService.CacheResult.miss());

        List<PropertyDataEntity> entities = createTestEntities();
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(entities);

        // When
        MarketStatsDTO result = statisticsService.getStatistics(null, null, null, null, null, null);

        // Then
        List<MarketStatsDTO.SquareFootagePricePoint> points = result.squareFootageVsPrice();
        assertEquals(3, points.size());
        // Should be sorted by squareFootage ascending
        for (int i = 1; i < points.size(); i++) {
            assertTrue(points.get(i).squareFootage() >= points.get(i - 1).squareFootage());
        }
    }

    @Test
    void getStatistics_computesYearBuiltVsPrice_groupedByDecade() {
        // Given
        when(cacheService.generateStatsKey(any(), any(), any(), any(), any(), any()))
                .thenReturn("market:stats:abc123");
        when(cacheService.get("market:stats:abc123", MarketStatsDTO.class))
                .thenReturn(CacheService.CacheResult.miss());

        List<PropertyDataEntity> entities = List.of(
                createEntity(3, BigDecimal.valueOf(100000), 1990, BigDecimal.valueOf(1500), BigDecimal.valueOf(3.0), BigDecimal.valueOf(8.0)),
                createEntity(3, BigDecimal.valueOf(200000), 1995, BigDecimal.valueOf(1800), BigDecimal.valueOf(5.0), BigDecimal.valueOf(7.5)),
                createEntity(4, BigDecimal.valueOf(300000), 2005, BigDecimal.valueOf(2200), BigDecimal.valueOf(1.0), BigDecimal.valueOf(9.0))
        );
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(entities);

        // When
        MarketStatsDTO result = statisticsService.getStatistics(null, null, null, null, null, null);

        // Then
        List<MarketStatsDTO.YearBuiltPriceSegment> segments = result.yearBuiltVsPrice();
        assertEquals(2, segments.size()); // 1990s and 2000s
        // Check 1990s segment
        MarketStatsDTO.YearBuiltPriceSegment nineties = segments.stream()
                .filter(s -> s.decade().equals("1990s")).findFirst().orElseThrow();
        assertEquals(150000.0, nineties.avgPrice());
        assertEquals(2, nineties.count());
    }

    @Test
    void getStatistics_computesDistanceRanges() {
        // Given
        when(cacheService.generateStatsKey(any(), any(), any(), any(), any(), any()))
                .thenReturn("market:stats:abc123");
        when(cacheService.get("market:stats:abc123", MarketStatsDTO.class))
                .thenReturn(CacheService.CacheResult.miss());

        List<PropertyDataEntity> entities = List.of(
                createEntity(3, BigDecimal.valueOf(400000), 2000, BigDecimal.valueOf(1500), BigDecimal.valueOf(1.0), BigDecimal.valueOf(8.0)),
                createEntity(3, BigDecimal.valueOf(300000), 2000, BigDecimal.valueOf(1800), BigDecimal.valueOf(3.0), BigDecimal.valueOf(7.5)),
                createEntity(4, BigDecimal.valueOf(200000), 2000, BigDecimal.valueOf(2200), BigDecimal.valueOf(7.0), BigDecimal.valueOf(9.0))
        );
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(entities);

        // When
        MarketStatsDTO result = statisticsService.getStatistics(null, null, null, null, null, null);

        // Then
        List<MarketStatsDTO.RangeAvgPrice> byDistance = result.distanceSchoolVsPrice().byDistance();
        assertEquals(5, byDistance.size()); // 5 distance ranges always present
        // 0-2mi should have entity with distance 1.0
        MarketStatsDTO.RangeAvgPrice range02 = byDistance.stream()
                .filter(r -> r.range().equals("0-2mi")).findFirst().orElseThrow();
        assertEquals(400000.0, range02.avgPrice());
        assertEquals(1, range02.count());
    }

    @Test
    void getStatistics_computesSchoolRatingRanges() {
        // Given
        when(cacheService.generateStatsKey(any(), any(), any(), any(), any(), any()))
                .thenReturn("market:stats:abc123");
        when(cacheService.get("market:stats:abc123", MarketStatsDTO.class))
                .thenReturn(CacheService.CacheResult.miss());

        List<PropertyDataEntity> entities = List.of(
                createEntity(3, BigDecimal.valueOf(400000), 2000, BigDecimal.valueOf(1500), BigDecimal.valueOf(1.0), BigDecimal.valueOf(9.5)),
                createEntity(3, BigDecimal.valueOf(300000), 2000, BigDecimal.valueOf(1800), BigDecimal.valueOf(3.0), BigDecimal.valueOf(7.5)),
                createEntity(4, BigDecimal.valueOf(200000), 2000, BigDecimal.valueOf(2200), BigDecimal.valueOf(7.0), BigDecimal.valueOf(6.5))
        );
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(entities);

        // When
        MarketStatsDTO result = statisticsService.getStatistics(null, null, null, null, null, null);

        // Then
        List<MarketStatsDTO.RangeAvgPrice> bySchoolRating = result.distanceSchoolVsPrice().bySchoolRating();
        assertEquals(4, bySchoolRating.size()); // 4 school rating ranges always present
        // 9-10 should have entity with rating 9.5
        MarketStatsDTO.RangeAvgPrice range910 = bySchoolRating.stream()
                .filter(r -> r.range().equals("9-10")).findFirst().orElseThrow();
        assertEquals(400000.0, range910.avgPrice());
        assertEquals(1, range910.count());
    }

    @Test
    void getStatistics_withFilters_passesFiltersToRepository() {
        // Given
        when(cacheService.generateStatsKey(any(), any(), any(), any(), any(), any()))
                .thenReturn("market:stats:filtered");
        when(cacheService.get("market:stats:filtered", MarketStatsDTO.class))
                .thenReturn(CacheService.CacheResult.miss());
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());

        // When
        statisticsService.getStatistics(100000.0, 500000.0, 2, 5, 2000, 2023);

        // Then
        verify(propertyDataRepository).findAll(any(Specification.class));
        verify(cacheService).put(eq("market:stats:filtered"), any(MarketStatsDTO.class));
    }

    private List<PropertyDataEntity> createTestEntities() {
        return List.of(
                createEntity(3, BigDecimal.valueOf(100000), 2000, BigDecimal.valueOf(1500), BigDecimal.valueOf(3.0), BigDecimal.valueOf(8.0)),
                createEntity(3, BigDecimal.valueOf(200000), 2000, BigDecimal.valueOf(1800), BigDecimal.valueOf(5.0), BigDecimal.valueOf(7.5)),
                createEntity(4, BigDecimal.valueOf(300000), 2000, BigDecimal.valueOf(2200), BigDecimal.valueOf(1.0), BigDecimal.valueOf(9.0))
        );
    }

    private PropertyDataEntity createEntity(int bedrooms, BigDecimal price, int yearBuilt,
                                            BigDecimal squareFootage, BigDecimal distance, BigDecimal schoolRating) {
        PropertyDataEntity entity = new PropertyDataEntity();
        entity.setBedrooms(bedrooms);
        entity.setBathrooms(BigDecimal.valueOf(2));
        entity.setSquareFootage(squareFootage);
        entity.setPrice(price);
        entity.setYearBuilt(yearBuilt);
        entity.setDistanceToCityCenter(distance);
        entity.setSchoolRating(schoolRating);
        return entity;
    }
}
