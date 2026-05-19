package com.portal.market.dto;

public record WhatIfResponseDTO(
    PredictionValue basePrediction,
    PredictionValue modifiedPrediction,
    double valueDifference,
    double percentageChange
) {

    public record PredictionValue(
        double predictedValue
    ) {}
}
