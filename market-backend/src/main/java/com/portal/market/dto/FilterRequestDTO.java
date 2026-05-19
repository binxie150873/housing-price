package com.portal.market.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

public record FilterRequestDTO(
    @Min(1) int page,
    @Min(1) @Max(100) int pageSize,
    BigDecimal priceMin,
    BigDecimal priceMax,
    Integer bedroomsMin,
    Integer bedroomsMax,
    BigDecimal bathroomsMin,
    BigDecimal bathroomsMax,
    Integer yearBuiltMin,
    Integer yearBuiltMax,
    BigDecimal squareFootageMin,
    BigDecimal squareFootageMax,
    BigDecimal lotSizeMin,
    BigDecimal lotSizeMax,
    BigDecimal schoolRatingMin,
    BigDecimal distanceMax,
    String sortBy,
    String sortOrder
) {
    public FilterRequestDTO {
        if (page == 0) page = 1;
        if (pageSize == 0) pageSize = 20;
        if (sortOrder == null) sortOrder = "desc";
        if (sortBy == null) sortBy = "price";
    }
}
