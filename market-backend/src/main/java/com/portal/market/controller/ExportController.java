package com.portal.market.controller;

import com.portal.market.dto.ApiErrorDTO;
import com.portal.market.dto.ExportJobDTO;
import com.portal.market.dto.ExportRequestDTO;
import com.portal.market.service.ExportService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for export operations.
 * POST /export - triggers an async export job (CSV or PDF)
 * GET /export/{jobId}/status - polls job status
 * GET /export/{jobId}/download - downloads completed export content
 */
@RestController
@RequestMapping("/export")
public class ExportController {

    private static final Logger log = LoggerFactory.getLogger(ExportController.class);

    private final ExportService exportService;

    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    /**
     * Trigger an async export job.
     * Returns 202 Accepted with job ID for polling.
     * Returns 400 if no records match the filters or dataset exceeds limit.
     */
    @PostMapping
    public ResponseEntity<?> triggerExport(@Valid @RequestBody ExportRequestDTO request) {
        log.info("Export requested: type={}, priceMin={}, priceMax={}, bedroomsMin={}, bedroomsMax={}, yearMin={}, yearMax={}",
                request.exportType(), request.priceMin(), request.priceMax(),
                request.bedroomsMin(), request.bedroomsMax(), request.yearBuiltMin(), request.yearBuiltMax());

        try {
            ExportJobDTO job = exportService.triggerExport(request);
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(job);
        } catch (IllegalArgumentException e) {
            log.warn("Export request rejected: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiErrorDTO.of("NO_DATA", e.getMessage()));
        } catch (IllegalStateException e) {
            log.warn("Export request rejected - dataset too large: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiErrorDTO.of("DATASET_TOO_LARGE", e.getMessage()));
        }
    }

    /**
     * Get the status of an export job.
     * Returns 200 with job status, or 404 if job not found.
     */
    @GetMapping("/{jobId}/status")
    public ResponseEntity<?> getJobStatus(@PathVariable String jobId) {
        ExportJobDTO job = exportService.getJobStatus(jobId);
        if (job == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorDTO.of("NOT_FOUND", "Export job not found: " + jobId));
        }
        return ResponseEntity.ok(job);
    }

    /**
     * Download the completed export content.
     * Returns the file content with appropriate Content-Type and Content-Disposition headers.
     */
    @GetMapping("/{jobId}/download")
    public ResponseEntity<?> downloadExport(@PathVariable String jobId) {
        ExportJobDTO jobStatus = exportService.getJobStatus(jobId);
        if (jobStatus == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorDTO.of("NOT_FOUND", "Export job not found: " + jobId));
        }

        if (jobStatus.status() != ExportJobDTO.ExportStatus.COMPLETED) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorDTO.of("NOT_READY", "Export job is not yet completed. Current status: " + jobStatus.status()));
        }

        byte[] content = exportService.getExportContent(jobId);
        if (content == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiErrorDTO.of("INTERNAL_ERROR", "Export content not available"));
        }

        String contentType;
        String filename;
        if (jobStatus.exportType() == ExportRequestDTO.ExportType.CSV) {
            contentType = "text/csv; charset=UTF-8";
            filename = "market-export-" + jobId + ".csv";
        } else {
            contentType = "application/json; charset=UTF-8";
            filename = "market-report-" + jobId + ".json";
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(content);
    }
}
