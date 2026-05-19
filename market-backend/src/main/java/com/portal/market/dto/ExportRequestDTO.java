package com.portal.market.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request DTO for triggering an export job.
 * Accepts filter parameters and the desired export type (CSV or PDF).
 */
public record ExportRequestDTO(
    @NotNull ExportType exportType,
    BigDecimal priceMin,
    BigDecimal priceMax,
    Integer bedroomsMin,
    Integer bedroomsMax,
    Integer yearBuiltMin,
    Integer yearBuiltMax,
    BigDecimal squareFootageMin,
    BigDecimal squareFootageMax,
    BigDecimal lotSizeMin,
    BigDecimal lotSizeMax,
    BigDecimal schoolRatingMin,
    BigDecimal distanceMax
) {

    public enum ExportType {
        CSV, PDF
    }
}
