package com.portal.market.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record HouseFeaturesDTO(
    @NotNull @DecimalMin("1") @DecimalMax("100000")
    BigDecimal squareFootage,

    @NotNull @Min(1) @Max(10)
    Integer bedrooms,

    @NotNull @DecimalMin("0.5") @DecimalMax("10")
    BigDecimal bathrooms,

    @NotNull @Min(1800) @Max(2030)
    Integer yearBuilt,

    @NotNull @DecimalMin("1") @DecimalMax("1000000")
    BigDecimal lotSize,

    @NotNull @DecimalMin("0") @DecimalMax("500")
    BigDecimal distanceToCityCenter,

    @NotNull @DecimalMin("0") @DecimalMax("10")
    BigDecimal schoolRating
) {}
