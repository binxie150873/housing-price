package com.portal.market.controller;

import com.portal.market.dto.MarketStatsDTO;
import com.portal.market.service.StatisticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

/**
 * REST controller for aggregate market statistics.
 * Endpoint: GET /api/v1/market/statistics
 * Supports filtering by bedrooms, year range, square footage, bathrooms,
 * lot size, distance to city center, and school rating.
 * Returns cached indicator in response.
 */
@RestController
@RequestMapping("/statistics")
public class MarketController {

    private final StatisticsService statisticsService;

    public MarketController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping
    public ResponseEntity<MarketStatsDTO> getStatistics(
            @RequestParam(required = false) Integer bedroomsMin,
            @RequestParam(required = false) Integer bedroomsMax,
            @RequestParam(required = false) Integer yearMin,
            @RequestParam(required = false) Integer yearMax,
            @RequestParam(required = false) BigDecimal squareFootageMin,
            @RequestParam(required = false) BigDecimal squareFootageMax,
            @RequestParam(required = false) BigDecimal bathroomsMin,
            @RequestParam(required = false) BigDecimal bathroomsMax,
            @RequestParam(required = false) BigDecimal lotSizeMin,
            @RequestParam(required = false) BigDecimal lotSizeMax,
            @RequestParam(required = false) BigDecimal distanceMax,
            @RequestParam(required = false) BigDecimal schoolRatingMin) {

        MarketStatsDTO stats = statisticsService.getStatistics(
                bedroomsMin, bedroomsMax, yearMin, yearMax,
                squareFootageMin, squareFootageMax,
                bathroomsMin, bathroomsMax,
                lotSizeMin, lotSizeMax,
                distanceMax, schoolRatingMin);

        return ResponseEntity.ok(stats);
    }
}
