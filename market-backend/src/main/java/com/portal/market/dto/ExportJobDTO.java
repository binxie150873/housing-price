package com.portal.market.dto;

import java.time.Instant;

/**
 * Response DTO representing the status of an export job.
 */
public record ExportJobDTO(
    String jobId,
    ExportStatus status,
    ExportRequestDTO.ExportType exportType,
    String downloadUrl,
    Integer totalRows,
    boolean truncated,
    String errorMessage,
    Instant createdAt,
    Instant completedAt
) {

    public enum ExportStatus {
        PENDING, PROCESSING, COMPLETED, FAILED
    }

    /**
     * Create a new pending job response (returned immediately on POST).
     */
    public static ExportJobDTO pending(String jobId, ExportRequestDTO.ExportType exportType) {
        return new ExportJobDTO(jobId, ExportStatus.PENDING, exportType, null, null, false, null, Instant.now(), null);
    }
}
