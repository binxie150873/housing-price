package com.portal.market.service;

import com.portal.market.config.MlServiceConfig;
import com.portal.market.dto.HouseFeaturesDTO;
import com.portal.market.dto.WhatIfRequestDTO;
import com.portal.market.dto.WhatIfResponseDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WhatIfServiceTest {

    private MlServiceConfig mlServiceConfig;
    private RestTemplate mockRestTemplate;
    private WhatIfService whatIfService;

    @BeforeEach
    void setUp() {
        mlServiceConfig = new MlServiceConfig();
        mlServiceConfig.setBaseUrl("http://localhost:8000");
        mlServiceConfig.setTimeout(5000);
        MlServiceConfig.RetryConfig retryConfig = new MlServiceConfig.RetryConfig();
        retryConfig.setMaxAttempts(3);
        retryConfig.setInitialDelay(10); // Short delay for tests
        retryConfig.setMultiplier(2);
        mlServiceConfig.setRetry(retryConfig);

        whatIfService = new WhatIfService(mlServiceConfig);

        // Replace the internal RestTemplate with a mock
        mockRestTemplate = mock(RestTemplate.class);
        setRestTemplate(whatIfService, mockRestTemplate);
    }

    @Test
    void predict_successfulPrediction_returnsCorrectDifference() {
        // Base prediction returns 300000, modified returns 350000
        Map<String, Object> baseResponse = Map.of("predicted_price", 300000.0);
        Map<String, Object> modifiedResponse = Map.of("predicted_price", 350000.0);

        when(mockRestTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(new ResponseEntity<>(baseResponse, HttpStatus.OK))
                .thenReturn(new ResponseEntity<>(modifiedResponse, HttpStatus.OK));

        WhatIfRequestDTO request = createRequest(
                new BigDecimal("1500"), 3, new BigDecimal("2"), 2000,
                new BigDecimal("5000"), new BigDecimal("5"), new BigDecimal("7"),
                Map.of("square_footage", 2000.0)
        );

        WhatIfResponseDTO result = whatIfService.predict(request);

        assertEquals(300000.0, result.basePrediction().predictedValue());
        assertEquals(350000.0, result.modifiedPrediction().predictedValue());
        assertEquals(50000.0, result.valueDifference(), 0.01);
        assertEquals(((350000.0 - 300000.0) / 300000.0) * 100.0, result.percentageChange(), 0.01);
    }

    @Test
    void predict_modifiedLowerThanBase_returnsNegativeDifference() {
        Map<String, Object> baseResponse = Map.of("predicted_price", 400000.0);
        Map<String, Object> modifiedResponse = Map.of("predicted_price", 350000.0);

        when(mockRestTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(new ResponseEntity<>(baseResponse, HttpStatus.OK))
                .thenReturn(new ResponseEntity<>(modifiedResponse, HttpStatus.OK));

        WhatIfRequestDTO request = createRequest(
                new BigDecimal("2000"), 4, new BigDecimal("3"), 2010,
                new BigDecimal("8000"), new BigDecimal("3"), new BigDecimal("8"),
                Map.of("bedrooms", 2)
        );

        WhatIfResponseDTO result = whatIfService.predict(request);

        assertEquals(400000.0, result.basePrediction().predictedValue());
        assertEquals(350000.0, result.modifiedPrediction().predictedValue());
        assertEquals(-50000.0, result.valueDifference(), 0.01);
        assertTrue(result.percentageChange() < 0);
    }

    @Test
    void predict_timeout_throwsMlServiceTimeoutException() {
        when(mockRestTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(new ResourceAccessException("Read timed out"));

        WhatIfRequestDTO request = createRequest(
                new BigDecimal("1500"), 3, new BigDecimal("2"), 2000,
                new BigDecimal("5000"), new BigDecimal("5"), new BigDecimal("7"),
                Map.of("square_footage", 2000.0)
        );

        assertThrows(WhatIfService.MlServiceTimeoutException.class, () -> whatIfService.predict(request));
    }

    @Test
    void predict_serverError_retriesAndThrowsUnavailable() {
        when(mockRestTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR))
                .thenThrow(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR))
                .thenThrow(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR));

        WhatIfRequestDTO request = createRequest(
                new BigDecimal("1500"), 3, new BigDecimal("2"), 2000,
                new BigDecimal("5000"), new BigDecimal("5"), new BigDecimal("7"),
                Map.of("square_footage", 2000.0)
        );

        assertThrows(WhatIfService.MlServiceUnavailableException.class, () -> whatIfService.predict(request));
        // Verify it was called 3 times (max attempts)
        verify(mockRestTemplate, times(3)).postForEntity(anyString(), any(HttpEntity.class), eq(Map.class));
    }

    @Test
    void predict_rateLimited429_retriesAndThrowsUnavailable() {
        when(mockRestTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.TOO_MANY_REQUESTS))
                .thenThrow(new HttpClientErrorException(HttpStatus.TOO_MANY_REQUESTS))
                .thenThrow(new HttpClientErrorException(HttpStatus.TOO_MANY_REQUESTS));

        WhatIfRequestDTO request = createRequest(
                new BigDecimal("1500"), 3, new BigDecimal("2"), 2000,
                new BigDecimal("5000"), new BigDecimal("5"), new BigDecimal("7"),
                Map.of("square_footage", 2000.0)
        );

        assertThrows(WhatIfService.MlServiceUnavailableException.class, () -> whatIfService.predict(request));
        verify(mockRestTemplate, times(3)).postForEntity(anyString(), any(HttpEntity.class), eq(Map.class));
    }

    @Test
    void predict_serverErrorThenSuccess_returnsResult() {
        Map<String, Object> successResponse = Map.of("predicted_price", 250000.0);

        when(mockRestTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR))
                .thenReturn(new ResponseEntity<>(successResponse, HttpStatus.OK))
                // Second call for modified prediction
                .thenReturn(new ResponseEntity<>(Map.of("predicted_price", 280000.0), HttpStatus.OK));

        WhatIfRequestDTO request = createRequest(
                new BigDecimal("1500"), 3, new BigDecimal("2"), 2000,
                new BigDecimal("5000"), new BigDecimal("5"), new BigDecimal("7"),
                Map.of("square_footage", 2000.0)
        );

        WhatIfResponseDTO result = whatIfService.predict(request);

        assertEquals(250000.0, result.basePrediction().predictedValue());
        assertEquals(280000.0, result.modifiedPrediction().predictedValue());
    }

    @Test
    void predict_modificationsAppliedCorrectly() {
        Map<String, Object> baseResponse = Map.of("predicted_price", 300000.0);
        Map<String, Object> modifiedResponse = Map.of("predicted_price", 320000.0);

        ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);

        when(mockRestTemplate.postForEntity(anyString(), captor.capture(), eq(Map.class)))
                .thenReturn(new ResponseEntity<>(baseResponse, HttpStatus.OK))
                .thenReturn(new ResponseEntity<>(modifiedResponse, HttpStatus.OK));

        Map<String, Object> modifications = new HashMap<>();
        modifications.put("square_footage", 2500.0);
        modifications.put("bedrooms", 5);

        WhatIfRequestDTO request = createRequest(
                new BigDecimal("1500"), 3, new BigDecimal("2"), 2000,
                new BigDecimal("5000"), new BigDecimal("5"), new BigDecimal("7"),
                modifications
        );

        whatIfService.predict(request);

        // Verify the second call (modified) has the modifications applied
        var calls = captor.getAllValues();
        assertEquals(2, calls.size());

        @SuppressWarnings("unchecked")
        Map<String, Object> modifiedBody = (Map<String, Object>) calls.get(1).getBody();
        assertEquals(2500.0, ((Number) modifiedBody.get("square_footage")).doubleValue(), 0.01);
        assertEquals(5.0, ((Number) modifiedBody.get("bedrooms")).doubleValue(), 0.01);
    }

    // Helper to set the private restTemplate field via reflection
    private void setRestTemplate(WhatIfService service, RestTemplate restTemplate) {
        try {
            var field = WhatIfService.class.getDeclaredField("restTemplate");
            field.setAccessible(true);
            field.set(service, restTemplate);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set restTemplate", e);
        }
    }

    private WhatIfRequestDTO createRequest(BigDecimal sqft, int bedrooms, BigDecimal bathrooms,
                                           int yearBuilt, BigDecimal lotSize, BigDecimal distance,
                                           BigDecimal schoolRating, Map<String, Object> modifications) {
        HouseFeaturesDTO features = new HouseFeaturesDTO(
                sqft, bedrooms, bathrooms, yearBuilt, lotSize, distance, schoolRating
        );
        return new WhatIfRequestDTO(features, modifications);
    }
}
