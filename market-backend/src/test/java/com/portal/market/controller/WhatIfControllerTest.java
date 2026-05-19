package com.portal.market.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portal.market.dto.HouseFeaturesDTO;
import com.portal.market.dto.WhatIfRequestDTO;
import com.portal.market.dto.WhatIfResponseDTO;
import com.portal.market.service.WhatIfService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WhatIfController.class)
class WhatIfControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private WhatIfService whatIfService;

    @Test
    void predict_validRequest_returnsOkWithPredictions() throws Exception {
        WhatIfResponseDTO response = new WhatIfResponseDTO(
                new WhatIfResponseDTO.PredictionValue(300000.0),
                new WhatIfResponseDTO.PredictionValue(350000.0),
                50000.0,
                16.67
        );

        when(whatIfService.predict(any(WhatIfRequestDTO.class))).thenReturn(response);

        String requestBody = createRequestJson();

        mockMvc.perform(post("/what-if")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.basePrediction.predictedValue").value(300000.0))
                .andExpect(jsonPath("$.modifiedPrediction.predictedValue").value(350000.0))
                .andExpect(jsonPath("$.valueDifference").value(50000.0))
                .andExpect(jsonPath("$.percentageChange").value(16.67));
    }

    @Test
    void predict_mlTimeout_returns504() throws Exception {
        when(whatIfService.predict(any(WhatIfRequestDTO.class)))
                .thenThrow(new WhatIfService.MlServiceTimeoutException("Timeout"));

        mockMvc.perform(post("/what-if")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson()))
                .andExpect(status().isGatewayTimeout())
                .andExpect(jsonPath("$.error.code").value("ML_SERVICE_TIMEOUT"))
                .andExpect(jsonPath("$.error.message").exists());
    }

    @Test
    void predict_mlUnavailable_returns502WithRetryAfterHeader() throws Exception {
        when(whatIfService.predict(any(WhatIfRequestDTO.class)))
                .thenThrow(new WhatIfService.MlServiceUnavailableException("Unavailable"));

        mockMvc.perform(post("/what-if")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson()))
                .andExpect(status().isBadGateway())
                .andExpect(header().string("Retry-After", "30"))
                .andExpect(jsonPath("$.error.code").value("ML_SERVICE_UNAVAILABLE"))
                .andExpect(jsonPath("$.error.message").exists());
    }

    @Test
    void predict_invalidRequest_missingBaseProperty_returns400() throws Exception {
        String invalidRequest = """
                {
                    "modifications": {"square_footage": 2000}
                }
                """;

        mockMvc.perform(post("/what-if")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest))
                .andExpect(status().isBadRequest());
    }

    @Test
    void predict_invalidRequest_missingModifications_returns400() throws Exception {
        String invalidRequest = """
                {
                    "baseProperty": {
                        "squareFootage": 1500,
                        "bedrooms": 3,
                        "bathrooms": 2.0,
                        "yearBuilt": 2000,
                        "lotSize": 5000,
                        "distanceToCityCenter": 5.0,
                        "schoolRating": 7.0
                    }
                }
                """;

        mockMvc.perform(post("/what-if")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest))
                .andExpect(status().isBadRequest());
    }

    private String createRequestJson() throws Exception {
        HouseFeaturesDTO features = new HouseFeaturesDTO(
                new BigDecimal("1500"), 3, new BigDecimal("2.0"), 2000,
                new BigDecimal("5000"), new BigDecimal("5.0"), new BigDecimal("7.0")
        );
        WhatIfRequestDTO request = new WhatIfRequestDTO(features, Map.of("square_footage", 2000.0));
        return objectMapper.writeValueAsString(request);
    }
}
