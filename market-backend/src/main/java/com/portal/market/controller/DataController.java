package com.portal.market.controller;

import com.portal.market.dto.ApiErrorDTO;
import com.portal.market.dto.FilterRequestDTO;
import com.portal.market.dto.PaginatedResponseDTO;
import com.portal.market.repository.entity.PropertyDataEntity;
import com.portal.market.service.DataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

/**
 * REST controller for paginated property data with filtering and sorting.
 * Endpoint: GET /api/v1/market/data
 *
 * Supports:
 * - Pagination: page (default 1), pageSize (default 20, max 100)
 * - Filtering: priceMin/Max, bedroomsMin/Max, bathroomsMin/Max, yearBuiltMin/Max,
 *              squareFootageMin/Max, lotSizeMin/Max, schoolRatingMin, distanceMax
 * - Sorting: sortBy (any entity field), sortOrder (asc/desc, default desc)
 */
@RestController
@RequestMapping("/data")
public class DataController {

    private final DataService dataService;

    public DataController(DataService dataService) {
        this.dataService = dataService;
    }

    /**
     * Get paginated property data with optional filtering and sorting.
     *
     * @param page              page number (1-based, default 1)
     * @param pageSize          items per page (default 20, max 100)
     * @param priceMin          filter by minimum price
     * @param priceMax          filter by maximum price
     * @param bedroomsMin       filter by minimum bedrooms
     * @param bedroomsMax       filter by maximum bedrooms
     * @param bathroomsMin      filter by minimum bathrooms
     * @param bathroomsMax      filter by maximum bathrooms
     * @param yearBuiltMin      filter by minimum year built
     * @param yearBuiltMax      filter by maximum year built
     * @param squareFootageMin  filter by minimum square footage
     * @param squareFootageMax  filter by maximum square footage
     * @param lotSizeMin        filter by minimum lot size
     * @param lotSizeMax        filter by maximum lot size
     * @param schoolRatingMin   filter by minimum school rating
     * @param distanceMax       filter by maximum distance to city center
     * @param sortBy            field to sort by (default: price)
     * @param sortOrder         sort direction: asc or desc (default: desc)
     * @return paginated response with property data
     */
    @GetMapping
    public ResponseEntity<?> getData(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) BigDecimal priceMin,
            @RequestParam(required = false) BigDecimal priceMax,
            @RequestParam(required = false) Integer bedroomsMin,
            @RequestParam(required = false) Integer bedroomsMax,
            @RequestParam(required = false) BigDecimal bathroomsMin,
            @RequestParam(required = false) BigDecimal bathroomsMax,
            @RequestParam(required = false) Integer yearBuiltMin,
            @RequestParam(required = false) Integer yearBuiltMax,
            @RequestParam(required = false) BigDecimal squareFootageMin,
            @RequestParam(required = false) BigDecimal squareFootageMax,
            @RequestParam(required = false) BigDecimal lotSizeMin,
            @RequestParam(required = false) BigDecimal lotSizeMax,
            @RequestParam(required = false) BigDecimal schoolRatingMin,
            @RequestParam(required = false) BigDecimal distanceMax,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortOrder) {

        // Validate pageSize early for clear error message
        if (pageSize > 100) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorDTO.of("INVALID_PAGE_SIZE", "page_size must not exceed 100"));
        }

        if (pageSize < 1) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorDTO.of("INVALID_PAGE_SIZE", "page_size must be at least 1"));
        }

        if (page < 1) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorDTO.of("INVALID_PAGE", "page must be at least 1"));
        }

        FilterRequestDTO filter = new FilterRequestDTO(
                page, pageSize, priceMin, priceMax,
                bedroomsMin, bedroomsMax, bathroomsMin, bathroomsMax,
                yearBuiltMin, yearBuiltMax,
                squareFootageMin, squareFootageMax,
                lotSizeMin, lotSizeMax,
                schoolRatingMin, distanceMax,
                sortBy, sortOrder
        );

        try {
            PaginatedResponseDTO<PropertyDataEntity> result = dataService.getData(filter);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorDTO.of("INVALID_PAGINATION", e.getMessage()));
        }
    }
}
