package com.portal.market.controller;

import com.portal.market.dto.HealthResponseDTO;
import com.portal.market.service.HealthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HealthController.class)
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private HealthService healthService;

    @Test
    void health_whenAllServicesHealthy_returnsHealthyStatus() throws Exception {
        Instant now = Instant.now();
        when(healthService.checkHealth()).thenReturn(
                new HealthResponseDTO("healthy", "connected", "reachable", now)
        );

        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("healthy"))
                .andExpect(jsonPath("$.cacheStatus").value("connected"))
                .andExpect(jsonPath("$.mlServiceStatus").value("reachable"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void health_whenRedisDisconnected_returnsUnhealthyStatus() throws Exception {
        Instant now = Instant.now();
        when(healthService.checkHealth()).thenReturn(
                new HealthResponseDTO("unhealthy", "disconnected", "reachable", now)
        );

        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("unhealthy"))
                .andExpect(jsonPath("$.cacheStatus").value("disconnected"))
                .andExpect(jsonPath("$.mlServiceStatus").value("reachable"));
    }

    @Test
    void health_whenMlServiceUnreachable_returnsUnhealthyStatus() throws Exception {
        Instant now = Instant.now();
        when(healthService.checkHealth()).thenReturn(
                new HealthResponseDTO("unhealthy", "connected", "unreachable", now)
        );

        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("unhealthy"))
                .andExpect(jsonPath("$.cacheStatus").value("connected"))
                .andExpect(jsonPath("$.mlServiceStatus").value("unreachable"));
    }

    @Test
    void health_whenBothServicesDown_returnsUnhealthyStatus() throws Exception {
        Instant now = Instant.now();
        when(healthService.checkHealth()).thenReturn(
                new HealthResponseDTO("unhealthy", "disconnected", "unreachable", now)
        );

        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("unhealthy"))
                .andExpect(jsonPath("$.cacheStatus").value("disconnected"))
                .andExpect(jsonPath("$.mlServiceStatus").value("unreachable"));
    }
}
