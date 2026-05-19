package com.portal.market.dto;

import java.time.Instant;
import java.util.List;

public record ApiErrorDTO(
    ErrorBody error
) {

    public record ErrorBody(
        String code,
        String message,
        List<FieldError> details,
        Instant timestamp,
        String requestId
    ) {}

    public record FieldError(
        String field,
        String message
    ) {}

    public static ApiErrorDTO of(String code, String message) {
        return new ApiErrorDTO(new ErrorBody(code, message, null, Instant.now(), null));
    }

    public static ApiErrorDTO of(String code, String message, List<FieldError> details) {
        return new ApiErrorDTO(new ErrorBody(code, message, details, Instant.now(), null));
    }
}
