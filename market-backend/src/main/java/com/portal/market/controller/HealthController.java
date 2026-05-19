package com.portal.market.controller;

import com.portal.market.dto.HealthResponseDTO;
import com.portal.market.service.HealthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/health")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping
    public ResponseEntity<HealthResponseDTO> health() {
        HealthResponseDTO response = healthService.checkHealth();
        return ResponseEntity.ok(response);
    }
}
