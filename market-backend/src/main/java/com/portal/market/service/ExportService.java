package com.portal.market.service;

import com.portal.market.dto.ExportJobDTO;
import com.portal.market.dto.ExportJobDTO.ExportStatus;
import com.portal.market.dto.ExportRequestDTO;
import com.portal.market.dto.ExportRequestDTO.ExportType;
import com.portal.market.repository.PropertyDataRepository;
import com.portal.market.repository.entity.PropertyDataEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Service for generating CSV and PDF exports of property market data.
 * Uses in-memory job tracking via ConcurrentHashMap.
 * CSV exports are UTF-8 encoded with a maximum of 50,000 rows.
 * PDF exports produce a structured JSON representation with summary statistics.
 */
@Service
public class ExportService {

    private static final Logger log = LoggerFactory.getLogger(ExportService.class);

    private static final String[] CSV_HEADERS = {
        "id", "square_footage", "bedrooms", "bathrooms", "year_built",
        "lot_size", "distance_to_city_center", "school_rating", "price", "created_at"
    };

    private final PropertyDataRepository propertyDataRepository;
    private final ConcurrentHashMap<String, ExportJob> jobStore = new ConcurrentHashMap<>();

    @Value("${market.export.max-rows:50000}")
    private int maxRows;

    @Value("${market.export.max-records-per-request:10000}")
    private int maxRecordsPerRequest;

    public ExportService(PropertyDataRepository propertyDataRepository) {
        this.propertyDataRepository = propertyDataRepository;
    }

    /**
     * Trigger an async export job. Returns immediately with a job ID.
     *
     * @param request the export request with filters and type
     * @return ExportJobDTO with PENDING status and job ID
     * @throws IllegalArgumentException if zero records match the filters
     * @throws IllegalStateException if dataset exceeds 10,000 records per export request
     */
    public ExportJobDTO triggerExport(ExportRequestDTO request) {
        // First, count matching records to validate
        Specification<PropertyDataEntity> spec = buildSpecification(request);
        long count = propertyDataRepository.count(spec);

        if (count == 0) {
            throw new IllegalArgumentException("No records match the specified filters. Cannot generate export.");
        }

        if (count > maxRecordsPerRequest) {
            throw new IllegalStateException(
                    "Dataset exceeds maximum of " + maxRecordsPerRequest + " records per export request. " +
                    "Found " + count + " records. Please apply additional filters to reduce the dataset size.");
        }

        String jobId = UUID.randomUUID().toString();
        ExportJob job = new ExportJob(jobId, request.exportType(), ExportStatus.PENDING, Instant.now());
        jobStore.put(jobId, job);

        // Run export asynchronously
        CompletableFuture.runAsync(() -> processExport(jobId, request, count));

        return ExportJobDTO.pending(jobId, request.exportType());
    }

    /**
     * Get the current status of an export job.
     *
     * @param jobId the job identifier
     * @return ExportJobDTO with current status, or null if not found
     */
    public ExportJobDTO getJobStatus(String jobId) {
        ExportJob job = jobStore.get(jobId);
        if (job == null) {
            return null;
        }
        return job.toDTO();
    }

    /**
     * Get the generated CSV content for a completed job.
     *
     * @param jobId the job identifier
     * @return CSV content as byte array, or null if not available
     */
    public byte[] getExportContent(String jobId) {
        ExportJob job = jobStore.get(jobId);
        if (job == null || job.status != ExportStatus.COMPLETED) {
            return null;
        }
        return job.content;
    }

    /**
     * Process the export job asynchronously.
     */
    private void processExport(String jobId, ExportRequestDTO request, long totalCount) {
        ExportJob job = jobStore.get(jobId);
        if (job == null) return;

        job.status = ExportStatus.PROCESSING;

        try {
            if (request.exportType() == ExportType.CSV) {
                generateCsv(job, request, totalCount);
            } else {
                generatePdf(job, request, totalCount);
            }
        } catch (Exception e) {
            log.error("Export job {} failed: {}", jobId, e.getMessage(), e);
            job.status = ExportStatus.FAILED;
            job.errorMessage = "Export generation failed: " + e.getMessage();
            job.completedAt = Instant.now();
        }
    }

    /**
     * Generate UTF-8 CSV export. Truncates at maxRows (50,000).
     */
    private void generateCsv(ExportJob job, ExportRequestDTO request, long totalCount) {
        Specification<PropertyDataEntity> spec = buildSpecification(request);
        List<PropertyDataEntity> data = propertyDataRepository.findAll(spec);

        boolean truncated = data.size() > maxRows;
        List<PropertyDataEntity> exportData = truncated ? data.subList(0, maxRows) : data;

        StringBuilder csv = new StringBuilder();

        // Header row
        csv.append(String.join(",", CSV_HEADERS)).append("\n");

        // Data rows
        for (PropertyDataEntity entity : exportData) {
            csv.append(escapeCsvField(entity.getId()))
               .append(",").append(escapeCsvField(entity.getSquareFootage()))
               .append(",").append(escapeCsvField(entity.getBedrooms()))
               .append(",").append(escapeCsvField(entity.getBathrooms()))
               .append(",").append(escapeCsvField(entity.getYearBuilt()))
               .append(",").append(escapeCsvField(entity.getLotSize()))
               .append(",").append(escapeCsvField(entity.getDistanceToCityCenter()))
               .append(",").append(escapeCsvField(entity.getSchoolRating()))
               .append(",").append(escapeCsvField(entity.getPrice()))
               .append(",").append(escapeCsvField(entity.getCreatedAt()))
               .append("\n");
        }

        // Add truncation indicator if needed
        if (truncated) {
            csv.append("# TRUNCATED: Dataset contained ").append(totalCount)
               .append(" rows. Export limited to ").append(maxRows).append(" rows.\n");
        }

        job.content = csv.toString().getBytes(StandardCharsets.UTF_8);
        job.totalRows = exportData.size();
        job.truncated = truncated;
        job.status = ExportStatus.COMPLETED;
        job.completedAt = Instant.now();
        job.downloadUrl = "/export/" + job.jobId + "/download";

        log.info("CSV export job {} completed: {} rows, truncated={}", job.jobId, job.totalRows, truncated);
    }

    /**
     * Generate PDF export as a structured JSON representation.
     * Contains summary statistics, applied filters, and chart data descriptions.
     */
    private void generatePdf(ExportJob job, ExportRequestDTO request, long totalCount) {
        Specification<PropertyDataEntity> spec = buildSpecification(request);
        List<PropertyDataEntity> data = propertyDataRepository.findAll(spec);

        // Compute summary statistics
        List<Double> prices = data.stream()
                .map(PropertyDataEntity::getPrice)
                .filter(p -> p != null)
                .map(BigDecimal::doubleValue)
                .sorted()
                .toList();

        double avgPrice = prices.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double medianPrice = computeMedian(prices);
        double minPrice = prices.isEmpty() ? 0.0 : prices.getFirst();
        double maxPrice = prices.isEmpty() ? 0.0 : prices.getLast();
        long recordCount = prices.size();

        // Group by bedrooms for chart data
        Map<Integer, Double> bedroomAvg = data.stream()
                .filter(e -> e.getBedrooms() != null && e.getPrice() != null)
                .collect(Collectors.groupingBy(
                        PropertyDataEntity::getBedrooms,
                        Collectors.averagingDouble(e -> e.getPrice().doubleValue())
                ));

        // Build PDF content as structured JSON
        StringBuilder pdfContent = new StringBuilder();
        pdfContent.append("{\n");
        pdfContent.append("  \"title\": \"Property Market Analysis Report\",\n");
        pdfContent.append("  \"generatedAt\": \"").append(Instant.now()).append("\",\n");
        pdfContent.append("  \"appliedFilters\": {\n");
        pdfContent.append("    \"priceMin\": ").append(request.priceMin()).append(",\n");
        pdfContent.append("    \"priceMax\": ").append(request.priceMax()).append(",\n");
        pdfContent.append("    \"bedroomsMin\": ").append(request.bedroomsMin()).append(",\n");
        pdfContent.append("    \"bedroomsMax\": ").append(request.bedroomsMax()).append(",\n");
        pdfContent.append("    \"yearBuiltMin\": ").append(request.yearBuiltMin()).append(",\n");
        pdfContent.append("    \"yearBuiltMax\": ").append(request.yearBuiltMax()).append("\n");
        pdfContent.append("  },\n");
        pdfContent.append("  \"summary\": {\n");
        pdfContent.append("    \"recordCount\": ").append(recordCount).append(",\n");
        pdfContent.append("    \"averagePrice\": ").append(roundToTwoDecimals(avgPrice)).append(",\n");
        pdfContent.append("    \"medianPrice\": ").append(roundToTwoDecimals(medianPrice)).append(",\n");
        pdfContent.append("    \"minPrice\": ").append(roundToTwoDecimals(minPrice)).append(",\n");
        pdfContent.append("    \"maxPrice\": ").append(roundToTwoDecimals(maxPrice)).append("\n");
        pdfContent.append("  },\n");
        pdfContent.append("  \"charts\": {\n");
        pdfContent.append("    \"bedroomAverages\": {\n");

        List<Map.Entry<Integer, Double>> sortedBedrooms = bedroomAvg.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .toList();

        pdfContent.append("      \"type\": \"bar\",\n");
        pdfContent.append("      \"data\": [\n");
        for (int i = 0; i < sortedBedrooms.size(); i++) {
            Map.Entry<Integer, Double> entry = sortedBedrooms.get(i);
            pdfContent.append("        {\"bedrooms\": ").append(entry.getKey())
                      .append(", \"avgPrice\": ").append(roundToTwoDecimals(entry.getValue())).append("}");
            if (i < sortedBedrooms.size() - 1) pdfContent.append(",");
            pdfContent.append("\n");
        }
        pdfContent.append("      ]\n");
        pdfContent.append("    }\n");
        pdfContent.append("  }\n");
        pdfContent.append("}\n");

        job.content = pdfContent.toString().getBytes(StandardCharsets.UTF_8);
        job.totalRows = (int) recordCount;
        job.truncated = false;
        job.status = ExportStatus.COMPLETED;
        job.completedAt = Instant.now();
        job.downloadUrl = "/export/" + job.jobId + "/download";

        log.info("PDF export job {} completed: {} records in summary", job.jobId, recordCount);
    }

    /**
     * Build JPA Specification from export request filters.
     */
    private Specification<PropertyDataEntity> buildSpecification(ExportRequestDTO request) {
        Specification<PropertyDataEntity> spec = Specification.where(null);

        if (request.priceMin() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("price"), request.priceMin()));
        }

        if (request.priceMax() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("price"), request.priceMax()));
        }

        if (request.bedroomsMin() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("bedrooms"), request.bedroomsMin()));
        }

        if (request.bedroomsMax() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("bedrooms"), request.bedroomsMax()));
        }

        if (request.yearBuiltMin() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("yearBuilt"), request.yearBuiltMin()));
        }

        if (request.yearBuiltMax() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("yearBuilt"), request.yearBuiltMax()));
        }

        if (request.squareFootageMin() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("squareFootage"), request.squareFootageMin()));
        }

        if (request.squareFootageMax() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("squareFootage"), request.squareFootageMax()));
        }

        if (request.lotSizeMin() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("lotSize"), request.lotSizeMin()));
        }

        if (request.lotSizeMax() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("lotSize"), request.lotSizeMax()));
        }

        if (request.schoolRatingMin() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("schoolRating"), request.schoolRatingMin()));
        }

        if (request.distanceMax() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("distanceToCityCenter"), request.distanceMax()));
        }

        return spec;
    }

    private String escapeCsvField(Object value) {
        if (value == null) return "";
        String str = value.toString();
        if (str.contains(",") || str.contains("\"") || str.contains("\n")) {
            return "\"" + str.replace("\"", "\"\"") + "\"";
        }
        return str;
    }

    private double computeMedian(List<Double> sortedPrices) {
        if (sortedPrices.isEmpty()) return 0.0;
        int size = sortedPrices.size();
        if (size % 2 == 0) {
            return roundToTwoDecimals((sortedPrices.get(size / 2 - 1) + sortedPrices.get(size / 2)) / 2.0);
        }
        return sortedPrices.get(size / 2);
    }

    private double roundToTwoDecimals(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    /**
     * Internal mutable job state stored in ConcurrentHashMap.
     */
    static class ExportJob {
        final String jobId;
        final ExportType exportType;
        final Instant createdAt;
        volatile ExportStatus status;
        volatile String downloadUrl;
        volatile Integer totalRows;
        volatile boolean truncated;
        volatile String errorMessage;
        volatile Instant completedAt;
        volatile byte[] content;

        ExportJob(String jobId, ExportType exportType, ExportStatus status, Instant createdAt) {
            this.jobId = jobId;
            this.exportType = exportType;
            this.status = status;
            this.createdAt = createdAt;
        }

        ExportJobDTO toDTO() {
            return new ExportJobDTO(
                jobId, status, exportType, downloadUrl,
                totalRows, truncated, errorMessage, createdAt, completedAt
            );
        }
    }
}
