package com.portal.market.dto;

import java.time.Instant;
import java.util.List;

public record MarketStatsDTO(
    List<SquareFootagePricePoint> squareFootageVsPrice,
    List<YearBuiltPriceSegment> yearBuiltVsPrice,
    ClusteredBarData distanceSchoolVsPrice,
    boolean cached,
    Instant generatedAt
) {

    public record SquareFootagePricePoint(double squareFootage, double price) {}

    public record YearBuiltPriceSegment(String decade, double avgPrice, int count) {}

    public record ClusteredBarData(
        List<NumericAvgPrice> byDistance,
        List<NumericAvgPrice> bySchoolRating
    ) {}

    public record NumericAvgPrice(double value, double avgPrice, int count) {}
}
