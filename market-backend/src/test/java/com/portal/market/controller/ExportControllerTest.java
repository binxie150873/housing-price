package com.portal.market.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portal.market.dto.ExportJobDTO;
import com.portal.market.dto.ExportJobDTO.ExportStatus;
import com.portal.market.dto.ExportRequestDTO;
import com.portal.market.dto.ExportRequestDTO.ExportType;
import com.portal.market.service.ExportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ExportController.class)
class ExportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ExportService exportService;

    @Test
    void triggerExport_validCsvRequest_returns202() throws Exception {
        ExportJobDTO pendingJob = ExportJobDTO.pending("job-123", ExportType.CSV);
        when(exportService.triggerExport(any(ExportRequestDTO.class))).thenReturn(pendingJob);

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, null, null, null, null, null, null, null, null, null, null, null, null);

        mockMvc.perform(post("/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").value("job-123"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.exportType").value("CSV"));
    }

    @Test
    void triggerExport_validPdfRequest_returns202() throws Exception {
        ExportJobDTO pendingJob = ExportJobDTO.pending("job-456", ExportType.PDF);
        when(exportService.triggerExport(any(ExportRequestDTO.class))).thenReturn(pendingJob);

        ExportRequestDTO request = new ExportRequestDTO(ExportType.PDF, null, null, 3, null, null, null, null, null, null, null, null, null);

        mockMvc.perform(post("/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").value("job-456"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.exportType").value("PDF"));
    }

    @Test
    void triggerExport_noMatchingRecords_returns400() throws Exception {
        when(exportService.triggerExport(any(ExportRequestDTO.class)))
                .thenThrow(new IllegalArgumentException("No records match the specified filters."));

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, null, null, 99, null, null, null, null, null, null, null, null, null);

        mockMvc.perform(post("/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("NO_DATA"))
                .andExpect(jsonPath("$.error.message").value("No records match the specified filters."));
    }

    @Test
    void triggerExport_datasetExceedsLimit_returns400() throws Exception {
        when(exportService.triggerExport(any(ExportRequestDTO.class)))
                .thenThrow(new IllegalStateException("Dataset exceeds maximum of 10000 records per export request."));

        ExportRequestDTO request = new ExportRequestDTO(ExportType.CSV, null, null, null, null, null, null, null, null, null, null, null, null);

        mockMvc.perform(post("/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("DATASET_TOO_LARGE"))
                .andExpect(jsonPath("$.error.message").value("Dataset exceeds maximum of 10000 records per export request."));
    }

    @Test
    void triggerExport_missingExportType_returns400() throws Exception {
        String invalidRequest = "{\"bedroomsMin\": 3}";

        mockMvc.perform(post("/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getJobStatus_existingJob_returns200() throws Exception {
        ExportJobDTO completedJob = new ExportJobDTO(
                "job-123", ExportStatus.COMPLETED, ExportType.CSV,
                "/export/job-123/download", 500, false, null,
                Instant.now(), Instant.now()
        );
        when(exportService.getJobStatus("job-123")).thenReturn(completedJob);

        mockMvc.perform(get("/export/job-123/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value("job-123"))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.totalRows").value(500))
                .andExpect(jsonPath("$.truncated").value(false))
                .andExpect(jsonPath("$.downloadUrl").value("/export/job-123/download"));
    }

    @Test
    void getJobStatus_nonExistentJob_returns404() throws Exception {
        when(exportService.getJobStatus("non-existent")).thenReturn(null);

        mockMvc.perform(get("/export/non-existent/status"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void getJobStatus_processingJob_returns200WithStatus() throws Exception {
        ExportJobDTO processingJob = new ExportJobDTO(
                "job-789", ExportStatus.PROCESSING, ExportType.PDF,
                null, null, false, null,
                Instant.now(), null
        );
        when(exportService.getJobStatus("job-789")).thenReturn(processingJob);

        mockMvc.perform(get("/export/job-789/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value("job-789"))
                .andExpect(jsonPath("$.status").value("PROCESSING"))
                .andExpect(jsonPath("$.downloadUrl").doesNotExist());
    }

    @Test
    void getJobStatus_failedJob_returns200WithError() throws Exception {
        ExportJobDTO failedJob = new ExportJobDTO(
                "job-fail", ExportStatus.FAILED, ExportType.CSV,
                null, null, false, "Export generation failed: timeout",
                Instant.now(), Instant.now()
        );
        when(exportService.getJobStatus("job-fail")).thenReturn(failedJob);

        mockMvc.perform(get("/export/job-fail/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value("job-fail"))
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.errorMessage").value("Export generation failed: timeout"));
    }

    @Test
    void downloadExport_completedCsvJob_returnsFile() throws Exception {
        ExportJobDTO completedJob = new ExportJobDTO(
                "job-dl", ExportStatus.COMPLETED, ExportType.CSV,
                "/export/job-dl/download", 10, false, null,
                Instant.now(), Instant.now()
        );
        when(exportService.getJobStatus("job-dl")).thenReturn(completedJob);

        byte[] csvContent = "id,square_footage,bedrooms\n1,1500,3\n".getBytes(StandardCharsets.UTF_8);
        when(exportService.getExportContent("job-dl")).thenReturn(csvContent);

        mockMvc.perform(get("/export/job-dl/download"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/csv; charset=UTF-8"))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"market-export-job-dl.csv\""));
    }

    @Test
    void downloadExport_nonExistentJob_returns404() throws Exception {
        when(exportService.getJobStatus("no-job")).thenReturn(null);

        mockMvc.perform(get("/export/no-job/download"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void downloadExport_pendingJob_returns409() throws Exception {
        ExportJobDTO pendingJob = new ExportJobDTO(
                "job-pending", ExportStatus.PENDING, ExportType.CSV,
                null, null, false, null,
                Instant.now(), null
        );
        when(exportService.getJobStatus("job-pending")).thenReturn(pendingJob);

        mockMvc.perform(get("/export/job-pending/download"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("NOT_READY"));
    }
}
