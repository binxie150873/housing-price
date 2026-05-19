package com.portal.market.service;

import com.portal.market.dto.FilterRequestDTO;
import com.portal.market.dto.PaginatedResponseDTO;
import com.portal.market.repository.PropertyDataRepository;
import com.portal.market.repository.PropertyDataSpecification;
import com.portal.market.repository.entity.PropertyDataEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Service for paginated property data retrieval with filtering and sorting.
 * Uses JPA Specifications for dynamic query construction and Spring Data Pageable for pagination.
 */
@Service
public class DataService {

    private static final Logger log = LoggerFactory.getLogger(DataService.class);

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "id", "squareFootage", "bedrooms", "bathrooms", "yearBuilt",
            "lotSize", "distanceToCityCenter", "schoolRating", "price", "createdAt"
    );

    private final PropertyDataRepository propertyDataRepository;

    public DataService(PropertyDataRepository propertyDataRepository) {
        this.propertyDataRepository = propertyDataRepository;
    }

    /**
     * Retrieve paginated property data with filtering and sorting.
     *
     * @param filter the filter/pagination/sort parameters
     * @return paginated response with property data entities
     * @throws IllegalArgumentException if pageSize > 100 or page beyond total
     */
    public PaginatedResponseDTO<PropertyDataEntity> getData(FilterRequestDTO filter) {
        // Validate page size
        if (filter.pageSize() > 100) {
            throw new IllegalArgumentException("page_size must not exceed 100");
        }

        // Build specification from filters
        Specification<PropertyDataEntity> spec = buildSpecification(filter);

        // Determine sort
        Sort sort = buildSort(filter.sortBy(), filter.sortOrder());

        // First, get total count to validate page offset
        long total = propertyDataRepository.count(spec);

        // Validate offset is not beyond total (only if there is data)
        if (total > 0) {
            long offset = (long) (filter.page() - 1) * filter.pageSize();
            if (offset >= total) {
                throw new IllegalArgumentException(
                        "Page " + filter.page() + " is beyond available data. Total records: " + total);
            }
        }

        // Build pageable (Spring Data uses 0-based page index)
        Pageable pageable = PageRequest.of(filter.page() - 1, filter.pageSize(), sort);

        // Execute query
        Page<PropertyDataEntity> page = propertyDataRepository.findAll(spec, pageable);

        log.debug("Data query returned {} items (total: {}, page: {}/{})",
                page.getNumberOfElements(), page.getTotalElements(), filter.page(), page.getTotalPages());

        return PaginatedResponseDTO.of(
                page.getContent(),
                page.getTotalElements(),
                filter.page(),
                filter.pageSize()
        );
    }

    private Specification<PropertyDataEntity> buildSpecification(FilterRequestDTO filter) {
        return Specification.where(PropertyDataSpecification.priceGreaterThanOrEqual(filter.priceMin()))
                .and(PropertyDataSpecification.priceLessThanOrEqual(filter.priceMax()))
                .and(PropertyDataSpecification.bedroomsGreaterThanOrEqual(filter.bedroomsMin()))
                .and(PropertyDataSpecification.bedroomsLessThanOrEqual(filter.bedroomsMax()))
                .and(PropertyDataSpecification.bathroomsGreaterThanOrEqual(filter.bathroomsMin()))
                .and(PropertyDataSpecification.bathroomsLessThanOrEqual(filter.bathroomsMax()))
                .and(PropertyDataSpecification.yearBuiltGreaterThanOrEqual(filter.yearBuiltMin()))
                .and(PropertyDataSpecification.yearBuiltLessThanOrEqual(filter.yearBuiltMax()))
                .and(PropertyDataSpecification.squareFootageGreaterThanOrEqual(filter.squareFootageMin()))
                .and(PropertyDataSpecification.squareFootageLessThanOrEqual(filter.squareFootageMax()))
                .and(PropertyDataSpecification.lotSizeGreaterThanOrEqual(filter.lotSizeMin()))
                .and(PropertyDataSpecification.lotSizeLessThanOrEqual(filter.lotSizeMax()))
                .and(PropertyDataSpecification.schoolRatingGreaterThanOrEqual(filter.schoolRatingMin()))
                .and(PropertyDataSpecification.distanceToCityCenterLessThanOrEqual(filter.distanceMax()));
    }

    private Sort buildSort(String sortBy, String sortOrder) {
        String field = (sortBy != null && SORTABLE_FIELDS.contains(sortBy)) ? sortBy : "price";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortOrder) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, field);
    }
}
