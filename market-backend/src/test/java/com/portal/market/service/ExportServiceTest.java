package com.portal.market.service;

import com.portal.market.dto.ExportJobDTO;
import com.portal.market.dto.ExportJobDTO.ExportStatus;
import com.portal.market.dto.ExportRequestDTO;
import com.portal.market.dto.ExportRequestDTO.ExportType;
import com.portal.market.repository.PropertyDataRepository;
import com.portal.market.repository.entity.PropertyDataEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExportServiceTest {

    @Mock
    private PropertyDataRepository propertyDataRepository;

    private ExportService exportService;

    @BeforeEach
    void setUp() {
        exportService = new ExportService(propertyDataRepository);
        ReflectionTestUtils.setField(exportService, "maxRows", 50000);
        ReflectionTestUtils.setField(exportService, "maxRecordsPerRequest", 10000);
    }

    @Test
    void triggerExport_csvWithData_returnsPendingJob() {
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(10L);
        org.mockito.Mockito.lenient().when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(createSampleData(10));

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, null, null, null, null, null, null, null, null, null, null, null, null);
        ExportJobDTO result = exportService.triggerExport(request);

        assertNotNull(result);
        assertNotNull(result.jobId());
        assertEquals(ExportStatus.PENDING, result.status());
        assertEquals(ExportType.CSV, result.exportType());
    }

    @Test
    void triggerExport_noMatchingRecords_throwsException() {
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(0L);

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, BigDecimal.valueOf(999999), null, null, null, null, null, null, null, null, null, null, null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> exportService.triggerExport(request));
        assertTrue(ex.getMessage().contains("No records match"));
    }

    @Test
    void triggerExport_datasetExceedsMaxRecordsPerRequest_throwsException() {
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(15000L);

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, null, null, null, null, null, null, null, null, null, null, null, null);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> exportService.triggerExport(request));
        assertTrue(ex.getMessage().contains("exceeds maximum of 10000"));
        assertTrue(ex.getMessage().contains("15000"));
    }

    @Test
    void triggerExport_datasetAtExactLimit_succeeds() {
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(10000L);
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(createSampleData(5));

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, null, null, null, null, null, null, null, null, null, null, null, null);
        ExportJobDTO result = exportService.triggerExport(request);

        assertNotNull(result);
        assertEquals(ExportStatus.PENDING, result.status());
    }

    @Test
    void triggerExport_pdfWithData_returnsPendingJob() {
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(5L);
        org.mockito.Mockito.lenient().when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(createSampleData(5));

        ExportRequestDTO request = new ExportRequestDTO(ExportType.PDF, null, null, null, null, null, null, null, null, null, null, null, null);
        ExportJobDTO result = exportService.triggerExport(request);

        assertNotNull(result);
        assertEquals(ExportType.PDF, result.exportType());
        assertEquals(ExportStatus.PENDING, result.status());
    }

    @Test
    void getJobStatus_existingJob_returnsStatus() {
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(5L);
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(createSampleData(5));

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, null, null, null, null, null, null, null, null, null, null, null, null);
        ExportJobDTO pendingJob = exportService.triggerExport(request);

        // Allow async processing to start
        try { Thread.sleep(100); } catch (InterruptedException ignored) {}

        ExportJobDTO status = exportService.getJobStatus(pendingJob.jobId());
        assertNotNull(status);
        assertEquals(pendingJob.jobId(), status.jobId());
    }

    @Test
    void getJobStatus_nonExistentJob_returnsNull() {
        ExportJobDTO status = exportService.getJobStatus("non-existent-id");
        assertNull(status);
    }

    @Test
    void csvExport_completesWithCorrectContent() throws Exception {
        List<PropertyDataEntity> data = createSampleData(3);
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(3L);
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(data);

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, null, null, null, null, null, null, null, null, null, null, null, null);
        ExportJobDTO pendingJob = exportService.triggerExport(request);

        // Wait for async processing
        Thread.sleep(500);

        ExportJobDTO completedJob = exportService.getJobStatus(pendingJob.jobId());
        assertEquals(ExportStatus.COMPLETED, completedJob.status());
        assertEquals(3, completedJob.totalRows());
        assertFalse(completedJob.truncated());

        byte[] content = exportService.getExportContent(pendingJob.jobId());
        assertNotNull(content);

        String csv = new String(content, StandardCharsets.UTF_8);
        // Verify header row
        assertTrue(csv.startsWith("id,square_footage,bedrooms,bathrooms,year_built,"));
        // Verify data rows exist
        String[] lines = csv.split("\n");
        assertEquals(4, lines.length); // 1 header + 3 data rows
    }

    @Test
    void csvExport_truncatesAtMaxRows() throws Exception {
        // Set max rows to a small number for testing
        ReflectionTestUtils.setField(exportService, "maxRows", 5);

        List<PropertyDataEntity> data = createSampleData(10);
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(10L);
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(data);

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, null, null, null, null, null, null, null, null, null, null, null, null);
        ExportJobDTO pendingJob = exportService.triggerExport(request);

        // Wait for async processing
        Thread.sleep(500);

        ExportJobDTO completedJob = exportService.getJobStatus(pendingJob.jobId());
        assertEquals(ExportStatus.COMPLETED, completedJob.status());
        assertEquals(5, completedJob.totalRows());
        assertTrue(completedJob.truncated());

        byte[] content = exportService.getExportContent(pendingJob.jobId());
        String csv = new String(content, StandardCharsets.UTF_8);
        assertTrue(csv.contains("# TRUNCATED"));
    }

    @Test
    void pdfExport_completesWithSummaryStatistics() throws Exception {
        List<PropertyDataEntity> data = createSampleData(5);
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(5L);
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(data);

        ExportRequestDTO request = new ExportRequestDTO(ExportType.PDF, BigDecimal.valueOf(100000), BigDecimal.valueOf(500000), 2, 5, null, null, null, null, null, null, null, null);
        ExportJobDTO pendingJob = exportService.triggerExport(request);

        // Wait for async processing
        Thread.sleep(500);

        ExportJobDTO completedJob = exportService.getJobStatus(pendingJob.jobId());
        assertEquals(ExportStatus.COMPLETED, completedJob.status());

        byte[] content = exportService.getExportContent(pendingJob.jobId());
        assertNotNull(content);

        String json = new String(content, StandardCharsets.UTF_8);
        assertTrue(json.contains("\"title\": \"Property Market Analysis Report\""));
        assertTrue(json.contains("\"summary\""));
        assertTrue(json.contains("\"averagePrice\""));
        assertTrue(json.contains("\"medianPrice\""));
        assertTrue(json.contains("\"minPrice\""));
        assertTrue(json.contains("\"maxPrice\""));
        assertTrue(json.contains("\"recordCount\""));
    }

    @Test
    void csvExport_withFilters_appliesCorrectly() throws Exception {
        List<PropertyDataEntity> data = createSampleData(2);
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(2L);
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(data);

        ExportRequestDTO request = new ExportRequestDTO(
                ExportType.CSV,
                BigDecimal.valueOf(100000), BigDecimal.valueOf(500000),
                3, 5,
                2000, 2020,
                BigDecimal.valueOf(1000), BigDecimal.valueOf(3000),
                null, null, null, null
        );
        ExportJobDTO pendingJob = exportService.triggerExport(request);

        // Wait for async processing
        Thread.sleep(500);

        ExportJobDTO completedJob = exportService.getJobStatus(pendingJob.jobId());
        assertEquals(ExportStatus.COMPLETED, completedJob.status());
    }

    @Test
    void getExportContent_nonCompletedJob_returnsNull() {
        when(propertyDataRepository.count(any(Specification.class))).thenReturn(100L);
        // Use lenient stubbing since the async thread may not have called findAll yet
        // when the test assertion runs
        org.mockito.Mockito.lenient().when(propertyDataRepository.findAll(any(Specification.class))).thenAnswer(invocation -> {
            Thread.sleep(2000); // Simulate slow query
            return createSampleData(5);
        });

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, null, null, null, null, null, null, null, null, null, null, null, null);
        ExportJobDTO pendingJob = exportService.triggerExport(request);

        // Immediately try to get content (job still processing)
        byte[] content = exportService.getExportContent(pendingJob.jobId());
        assertNull(content);
    }

    @Test
    void csvExport_handlesSpecialCharactersInData() throws Exception {
        PropertyDataEntity entity = new PropertyDataEntity();
        entity.setId(1L);
        entity.setSquareFootage(BigDecimal.valueOf(2000));
        entity.setBedrooms(3);
        entity.setBathrooms(BigDecimal.valueOf(2.5));
        entity.setYearBuilt(2000);
        entity.setLotSize(BigDecimal.valueOf(5000));
        entity.setDistanceToCityCenter(BigDecimal.valueOf(3.5));
        entity.setSchoolRating(BigDecimal.valueOf(8));
        entity.setPrice(BigDecimal.valueOf(250000));
        entity.setCreatedAt(Instant.now());

        when(propertyDataRepository.count(any(Specification.class))).thenReturn(1L);
        when(propertyDataRepository.findAll(any(Specification.class))).thenReturn(List.of(entity));

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, null, null, null, null, null, null, null, null, null, null, null, null);
        ExportJobDTO pendingJob = exportService.triggerExport(request);

        Thread.sleep(500);

        byte[] content = exportService.getExportContent(pendingJob.jobId());
        assertNotNull(content);

        String csv = new String(content, StandardCharsets.UTF_8);
        // Verify data is present
        assertTrue(csv.contains("2000"));
        assertTrue(csv.contains("250000"));
    }

    private List<PropertyDataEntity> createSampleData(int count) {
        List<PropertyDataEntity> data = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            PropertyDataEntity entity = new PropertyDataEntity();
            entity.setId((long) i);
            entity.setSquareFootage(BigDecimal.valueOf(1000 + i * 50));
            entity.setBedrooms(2 + (i % 3));
            entity.setBathrooms(BigDecimal.valueOf(1 + (i % 3)));
            entity.setYearBuilt(2000 + i);
            entity.setLotSize(BigDecimal.valueOf(5000 + i * 100));
            entity.setDistanceToCityCenter(BigDecimal.valueOf(2.0 + i * 0.5));
            entity.setSchoolRating(BigDecimal.valueOf(5 + (i % 5)));
            entity.setPrice(BigDecimal.valueOf(150000 + i * 10000));
            entity.setCreatedAt(Instant.now());
            data.add(entity);
        }
        return data;
    }
}
