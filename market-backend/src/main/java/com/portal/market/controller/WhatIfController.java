package com.portal.market.controller;

import com.portal.market.dto.ApiErrorDTO;
import com.portal.market.dto.WhatIfRequestDTO;
import com.portal.market.dto.WhatIfResponseDTO;
import com.portal.market.service.WhatIfService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/what-if")
public class WhatIfController {

    private static final Logger logger = LoggerFactory.getLogger(WhatIfController.class);

    private final WhatIfService whatIfService;

    public WhatIfController(WhatIfService whatIfService) {
        this.whatIfService = whatIfService;
    }

    @PostMapping
    public ResponseEntity<?> predict(@Valid @RequestBody WhatIfRequestDTO request) {
        try {
            WhatIfResponseDTO response = whatIfService.predict(request);
            return ResponseEntity.ok(response);
        } catch (WhatIfService.MlServiceTimeoutException e) {
            logger.error("ML service timeout during what-if prediction: {}", e.getMessage());
            ApiErrorDTO error = ApiErrorDTO.of("ML_SERVICE_TIMEOUT",
                    "ML service did not respond within the configured timeout");
            return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(error);
        } catch (WhatIfService.MlServiceUnavailableException e) {
            logger.error("ML service unavailable during what-if prediction: {}", e.getMessage());
            ApiErrorDTO error = ApiErrorDTO.of("ML_SERVICE_UNAVAILABLE",
                    "ML service is temporarily unavailable. Please retry later.");
            HttpHeaders headers = new HttpHeaders();
            headers.set("Retry-After", "30");
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .headers(headers)
                    .body(error);
        }
    }
}
