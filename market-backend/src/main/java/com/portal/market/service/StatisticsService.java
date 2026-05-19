package com.portal.market.service;

import com.portal.market.dto.MarketStatsDTO;
import com.portal.market.repository.PropertyDataRepository;
import com.portal.market.repository.entity.PropertyDataEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for computing aggregate market statistics from property data.
 * Supports filtering by price range, bedrooms, and year range.
 * Produces data for: line chart (sq ft vs price), pie chart (year built decades),
 * and clustered bar chart (distance and school rating ranges vs avg price).
 */
@Service
public class StatisticsService {

    private static final Logger log = LoggerFactory.getLogger(StatisticsService.class);

    private final PropertyDataRepository propertyDataRepository;
    private final CacheService cacheService;

    public StatisticsService(PropertyDataRepository propertyDataRepository, CacheService cacheService) {
        this.propertyDataRepository = propertyDataRepository;
        this.cacheService = cacheService;
    }

    /**
     * Get aggregate market statistics with optional filters.
     * Uses two-layer cache (Caffeine L1 + Redis L2) with configurable TTL.
     *
     * @return MarketStatsDTO with chart data and cache indicator
     */
    public MarketStatsDTO getStatistics(Integer bedroomsMin, Integer bedroomsMax,
                                        Integer yearMin, Integer yearMax,
                                        BigDecimal squareFootageMin, BigDecimal squareFootageMax,
                                        BigDecimal bathroomsMin, BigDecimal bathroomsMax,
                                        BigDecimal lotSizeMin, BigDecimal lotSizeMax,
                                        BigDecimal distanceMax, BigDecimal schoolRatingMin) {
        // Generate cache key from filter parameters
        String cacheKey = cacheService.generateStatsKey(
                null, null, bedroomsMin, bedroomsMax, yearMin, yearMax);

        // Check cache
        CacheService.CacheResult<MarketStatsDTO> cacheResult = cacheService.get(cacheKey, MarketStatsDTO.class);
        if (cacheResult.hit()) {
            log.debug("Returning cached statistics for key: {}", cacheKey);
            return cacheResult.value();
        }

        // Cache miss - compute statistics
        List<PropertyDataEntity> data = queryFilteredData(
                bedroomsMin, bedroomsMax, yearMin, yearMax,
                squareFootageMin, squareFootageMax,
                bathroomsMin, bathroomsMax,
                lotSizeMin, lotSizeMax,
                distanceMax, schoolRatingMin);

        MarketStatsDTO stats = computeStatistics(data);

        // Store in cache
        cacheService.put(cacheKey, stats);

        return stats;
    }

    /**
     * Query property data with optional filters using JPA Specifications.
     */
    private List<PropertyDataEntity> queryFilteredData(
            Integer bedroomsMin, Integer bedroomsMax,
            Integer yearMin, Integer yearMax,
            BigDecimal squareFootageMin, BigDecimal squareFootageMax,
            BigDecimal bathroomsMin, BigDecimal bathroomsMax,
            BigDecimal lotSizeMin, BigDecimal lotSizeMax,
            BigDecimal distanceMax, BigDecimal schoolRatingMin) {
        Specification<PropertyDataEntity> spec = Specification.where(null);

        if (bedroomsMin != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("bedrooms"), bedroomsMin));
        }
        if (bedroomsMax != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("bedrooms"), bedroomsMax));
        }
        if (yearMin != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("yearBuilt"), yearMin));
        }
        if (yearMax != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("yearBuilt"), yearMax));
        }
        if (squareFootageMin != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("squareFootage"), squareFootageMin));
        }
        if (squareFootageMax != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("squareFootage"), squareFootageMax));
        }
        if (bathroomsMin != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("bathrooms"), bathroomsMin));
        }
        if (bathroomsMax != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("bathrooms"), bathroomsMax));
        }
        if (lotSizeMin != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("lotSize"), lotSizeMin));
        }
        if (lotSizeMax != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("lotSize"), lotSizeMax));
        }
        if (distanceMax != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("distanceToCityCenter"), distanceMax));
        }
        if (schoolRatingMin != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("schoolRating"), schoolRatingMin));
        }

        return propertyDataRepository.findAll(spec);
    }

    /**
     * Compute aggregate statistics from a list of property data entities.
     */
    private MarketStatsDTO computeStatistics(List<PropertyDataEntity> data) {
        if (data.isEmpty()) {
            return new MarketStatsDTO(
                    Collections.emptyList(),
                    Collections.emptyList(),
                    new MarketStatsDTO.ClusteredBarData(Collections.emptyList(), Collections.emptyList()),
                    false,
                    Instant.now()
            );
        }

        // 1. Square footage vs price (line chart data)
        List<MarketStatsDTO.SquareFootagePricePoint> squareFootageVsPrice = computeSquareFootageVsPrice(data);

        // 2. Year built vs price (pie chart data - grouped by decade)
        List<MarketStatsDTO.YearBuiltPriceSegment> yearBuiltVsPrice = computeYearBuiltVsPrice(data);

        // 3. Distance and school rating vs price (clustered bar chart data)
        MarketStatsDTO.ClusteredBarData distanceSchoolVsPrice = computeDistanceSchoolVsPrice(data);

        return new MarketStatsDTO(squareFootageVsPrice, yearBuiltVsPrice, distanceSchoolVsPrice, false, Instant.now());
    }

    /**
     * Map each property to a (squareFootage, price) point, sorted by squareFootage ascending.
     */
    private List<MarketStatsDTO.SquareFootagePricePoint> computeSquareFootageVsPrice(List<PropertyDataEntity> data) {
        return data.stream()
                .filter(e -> e.getSquareFootage() != null && e.getPrice() != null)
                .map(e -> new MarketStatsDTO.SquareFootagePricePoint(
                        e.getSquareFootage().doubleValue(),
                        e.getPrice().doubleValue()
                ))
                .sorted(Comparator.comparingDouble(MarketStatsDTO.SquareFootagePricePoint::squareFootage))
                .toList();
    }

    /**
     * Group properties by decade of year_built and compute average price per decade.
     */
    private List<MarketStatsDTO.YearBuiltPriceSegment> computeYearBuiltVsPrice(List<PropertyDataEntity> data) {
        Map<String, List<PropertyDataEntity>> grouped = data.stream()
                .filter(e -> e.getYearBuilt() != null && e.getPrice() != null)
                .collect(Collectors.groupingBy(e -> {
                    int decade = (e.getYearBuilt() / 10) * 10;
                    return decade + "s";
                }));

        return grouped.entrySet().stream()
                .map(entry -> {
                    String decade = entry.getKey();
                    List<PropertyDataEntity> entities = entry.getValue();
                    double avgPrice = entities.stream()
                            .mapToDouble(e -> e.getPrice().doubleValue())
                            .average()
                            .orElse(0.0);
                    return new MarketStatsDTO.YearBuiltPriceSegment(
                            decade,
                            roundToTwoDecimals(avgPrice),
                            entities.size()
                    );
                })
                .sorted(Comparator.comparing(MarketStatsDTO.YearBuiltPriceSegment::decade))
                .toList();
    }

    /**
     * Compute dual-line chart data with shared numeric X-axis.
     * X-axis value N means: distance_to_city_center=N for the distance line,
     * and school_rating=N for the school rating line.
     * Groups by integer values to align both lines on the same X points.
     */
    private MarketStatsDTO.ClusteredBarData computeDistanceSchoolVsPrice(List<PropertyDataEntity> data) {
        List<MarketStatsDTO.NumericAvgPrice> byDistance = computeByIntegerValue(data, "distance");
        List<MarketStatsDTO.NumericAvgPrice> bySchoolRating = computeByIntegerValue(data, "schoolRating");
        return new MarketStatsDTO.ClusteredBarData(byDistance, bySchoolRating);
    }

    private List<MarketStatsDTO.NumericAvgPrice> computeByIntegerValue(List<PropertyDataEntity> data, String type) {
        // Group by integer part of the value, compute avg price per group
        Map<Integer, List<PropertyDataEntity>> grouped = data.stream()
                .filter(e -> e.getPrice() != null)
                .filter(e -> {
                    if ("distance".equals(type)) {
                        return e.getDistanceToCityCenter() != null;
                    } else {
                        return e.getSchoolRating() != null;
                    }
                })
                .collect(Collectors.groupingBy(e -> {
                    if ("distance".equals(type)) {
                        return (int) Math.round(e.getDistanceToCityCenter().doubleValue());
                    } else {
                        return (int) Math.round(e.getSchoolRating().doubleValue());
                    }
                }));

        return grouped.entrySet().stream()
                .map(entry -> {
                    int key = entry.getKey();
                    List<PropertyDataEntity> entities = entry.getValue();
                    double avgPrice = entities.stream()
                            .mapToDouble(e -> e.getPrice().doubleValue())
                            .average()
                            .orElse(0.0);
                    return new MarketStatsDTO.NumericAvgPrice(key, roundToTwoDecimals(avgPrice), entities.size());
                })
                .sorted(Comparator.comparingDouble(MarketStatsDTO.NumericAvgPrice::value))
                .toList();
    }

    private double roundToTwoDecimals(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
