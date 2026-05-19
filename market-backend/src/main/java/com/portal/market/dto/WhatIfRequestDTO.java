package com.portal.market.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record WhatIfRequestDTO(
    @NotNull @Valid HouseFeaturesDTO baseProperty,
    @NotNull Map<String, Object> modifications
) {}
