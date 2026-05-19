package com.portal.market.dto;

import java.time.Instant;

public record HealthResponseDTO(
    String status,
    String cacheStatus,
    String mlServiceStatus,
    Instant timestamp
) {}
