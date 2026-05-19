package com.portal.market.repository;

import com.portal.market.repository.entity.PropertyDataEntity;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;

/**
 * JPA Specifications for dynamic filtering of property data.
 * Supports range filters for price, bedrooms, bathrooms, year built,
 * square footage, lot size, school rating, and distance to city center.
 */
public final class PropertyDataSpecification {

    private PropertyDataSpecification() {
        // Utility class
    }

    public static Specification<PropertyDataEntity> priceGreaterThanOrEqual(BigDecimal priceMin) {
        if (priceMin == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.greaterThanOrEqualTo(root.get("price"), priceMin);
    }

    public static Specification<PropertyDataEntity> priceLessThanOrEqual(BigDecimal priceMax) {
        if (priceMax == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.lessThanOrEqualTo(root.get("price"), priceMax);
    }

    public static Specification<PropertyDataEntity> bedroomsGreaterThanOrEqual(Integer bedroomsMin) {
        if (bedroomsMin == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.greaterThanOrEqualTo(root.get("bedrooms"), bedroomsMin);
    }

    public static Specification<PropertyDataEntity> bedroomsLessThanOrEqual(Integer bedroomsMax) {
        if (bedroomsMax == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.lessThanOrEqualTo(root.get("bedrooms"), bedroomsMax);
    }

    public static Specification<PropertyDataEntity> bathroomsGreaterThanOrEqual(BigDecimal bathroomsMin) {
        if (bathroomsMin == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.greaterThanOrEqualTo(root.get("bathrooms"), bathroomsMin);
    }

    public static Specification<PropertyDataEntity> bathroomsLessThanOrEqual(BigDecimal bathroomsMax) {
        if (bathroomsMax == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.lessThanOrEqualTo(root.get("bathrooms"), bathroomsMax);
    }

    public static Specification<PropertyDataEntity> yearBuiltGreaterThanOrEqual(Integer yearBuiltMin) {
        if (yearBuiltMin == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.greaterThanOrEqualTo(root.get("yearBuilt"), yearBuiltMin);
    }

    public static Specification<PropertyDataEntity> yearBuiltLessThanOrEqual(Integer yearBuiltMax) {
        if (yearBuiltMax == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.lessThanOrEqualTo(root.get("yearBuilt"), yearBuiltMax);
    }

    public static Specification<PropertyDataEntity> squareFootageGreaterThanOrEqual(BigDecimal squareFootageMin) {
        if (squareFootageMin == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.greaterThanOrEqualTo(root.get("squareFootage"), squareFootageMin);
    }

    public static Specification<PropertyDataEntity> squareFootageLessThanOrEqual(BigDecimal squareFootageMax) {
        if (squareFootageMax == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.lessThanOrEqualTo(root.get("squareFootage"), squareFootageMax);
    }

    public static Specification<PropertyDataEntity> lotSizeGreaterThanOrEqual(BigDecimal lotSizeMin) {
        if (lotSizeMin == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.greaterThanOrEqualTo(root.get("lotSize"), lotSizeMin);
    }

    public static Specification<PropertyDataEntity> lotSizeLessThanOrEqual(BigDecimal lotSizeMax) {
        if (lotSizeMax == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.lessThanOrEqualTo(root.get("lotSize"), lotSizeMax);
    }

    public static Specification<PropertyDataEntity> schoolRatingGreaterThanOrEqual(BigDecimal schoolRatingMin) {
        if (schoolRatingMin == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.greaterThanOrEqualTo(root.get("schoolRating"), schoolRatingMin);
    }

    public static Specification<PropertyDataEntity> distanceToCityCenterLessThanOrEqual(BigDecimal distanceMax) {
        if (distanceMax == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.lessThanOrEqualTo(root.get("distanceToCityCenter"), distanceMax);
    }
}
