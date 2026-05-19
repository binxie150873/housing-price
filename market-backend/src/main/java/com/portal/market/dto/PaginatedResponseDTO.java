package com.portal.market.dto;

import java.util.List;

public record PaginatedResponseDTO<T>(
    List<T> items,
    long total,
    int page,
    int pageSize,
    int totalPages
) {
    public static <T> PaginatedResponseDTO<T> of(List<T> items, long total, int page, int pageSize) {
        int totalPages = (int) Math.ceil((double) total / pageSize);
        return new PaginatedResponseDTO<>(items, total, page, pageSize, totalPages);
    }
}
