package com.portal.market.service;

import com.portal.market.config.MlServiceConfig;
import com.portal.market.dto.HouseFeaturesDTO;
import com.portal.market.dto.WhatIfRequestDTO;
import com.portal.market.dto.WhatIfResponseDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
public class WhatIfService {

    private static final Logger logger = LoggerFactory.getLogger(WhatIfService.class);

    private final MlServiceConfig mlServiceConfig;
    private final RestTemplate restTemplate;

    public WhatIfService(MlServiceConfig mlServiceConfig) {
        this.mlServiceConfig = mlServiceConfig;
        this.restTemplate = createRestTemplate();
    }

    /**
     * Performs a what-if prediction by calling the ML service twice:
     * 1. With base features to get the base prediction
     * 2. With modified features to get the modified prediction
     * Then calculates the difference and percentage change.
     *
     * @throws MlServiceTimeoutException if the ML service does not respond within 5 seconds
     * @throws MlServiceUnavailableException if all retry attempts are exhausted
     */
    public WhatIfResponseDTO predict(WhatIfRequestDTO request) {
        Map<String, Object> baseFeatures = toFeatureMap(request.baseProperty());
        Map<String, Object> modifiedFeatures = applyModifications(baseFeatures, request.modifications());

        double basePrediction = callMlPredict(baseFeatures);
        double modifiedPrediction = callMlPredict(modifiedFeatures);

        double valueDifference = modifiedPrediction - basePrediction;
        double percentageChange = (basePrediction != 0)
                ? ((modifiedPrediction - basePrediction) / basePrediction) * 100.0
                : 0.0;

        return new WhatIfResponseDTO(
                new WhatIfResponseDTO.PredictionValue(basePrediction),
                new WhatIfResponseDTO.PredictionValue(modifiedPrediction),
                valueDifference,
                percentageChange
        );
    }

    /**
     * Calls the ML service /predict endpoint with exponential backoff retry
     * for 429 and 5xx responses.
     */
    private double callMlPredict(Map<String, Object> features) {
        String url = mlServiceConfig.getBaseUrl() + "/predict";
        int maxAttempts = mlServiceConfig.getRetry().getMaxAttempts();
        long delay = mlServiceConfig.getRetry().getInitialDelay();
        int multiplier = mlServiceConfig.getRetry().getMultiplier();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(features, headers);

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
                if (response.getBody() != null && response.getBody().containsKey("predicted_price")) {
                    Object price = response.getBody().get("predicted_price");
                    return ((Number) price).doubleValue();
                }
                throw new MlServiceUnavailableException("ML service returned unexpected response format");
            } catch (ResourceAccessException e) {
                // Timeout - do not retry, return 504 immediately
                logger.error("ML service timeout on attempt {}: {}", attempt, e.getMessage());
                throw new MlServiceTimeoutException("ML service did not respond within the configured timeout");
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode().value() == 429) {
                    logger.warn("ML service rate limited (429) on attempt {}/{}", attempt, maxAttempts);
                    if (attempt == maxAttempts) {
                        throw new MlServiceUnavailableException(
                                "ML service unavailable after " + maxAttempts + " retry attempts (rate limited)");
                    }
                    sleep(delay);
                    delay *= multiplier;
                } else {
                    // Other 4xx errors - do not retry
                    logger.error("ML service client error: {} - {}", e.getStatusCode(), e.getMessage());
                    throw new MlServiceUnavailableException(
                            "ML service returned error: " + e.getStatusCode());
                }
            } catch (HttpServerErrorException e) {
                logger.warn("ML service server error ({}) on attempt {}/{}",
                        e.getStatusCode().value(), attempt, maxAttempts);
                if (attempt == maxAttempts) {
                    throw new MlServiceUnavailableException(
                            "ML service unavailable after " + maxAttempts + " retry attempts (server error)");
                }
                sleep(delay);
                delay *= multiplier;
            }
        }

        throw new MlServiceUnavailableException("ML service unavailable after all retry attempts");
    }

    private Map<String, Object> toFeatureMap(HouseFeaturesDTO dto) {
        Map<String, Object> map = new HashMap<>();
        map.put("square_footage", dto.squareFootage().doubleValue());
        map.put("bedrooms", dto.bedrooms());
        map.put("bathrooms", dto.bathrooms().doubleValue());
        map.put("year_built", dto.yearBuilt());
        map.put("lot_size", dto.lotSize().doubleValue());
        map.put("distance_to_city_center", dto.distanceToCityCenter().doubleValue());
        map.put("school_rating", dto.schoolRating().doubleValue());
        return map;
    }

    private Map<String, Object> applyModifications(Map<String, Object> baseFeatures, Map<String, Object> modifications) {
        Map<String, Object> modified = new HashMap<>(baseFeatures);
        for (Map.Entry<String, Object> entry : modifications.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            if (modified.containsKey(key)) {
                // Convert to appropriate numeric type
                if (value instanceof Number) {
                    modified.put(key, ((Number) value).doubleValue());
                } else {
                    modified.put(key, value);
                }
            }
        }
        return modified;
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new MlServiceUnavailableException("Retry interrupted");
        }
    }

    private RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(mlServiceConfig.getTimeout());
        factory.setReadTimeout(mlServiceConfig.getTimeout());
        return new RestTemplate(factory);
    }

    // Custom exceptions for ML service errors

    public static class MlServiceTimeoutException extends RuntimeException {
        public MlServiceTimeoutException(String message) {
            super(message);
        }
    }

    public static class MlServiceUnavailableException extends RuntimeException {
        public MlServiceUnavailableException(String message) {
            super(message);
        }
    }
}
