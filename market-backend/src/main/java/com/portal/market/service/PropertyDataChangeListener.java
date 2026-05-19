package com.portal.market.service;

import com.portal.market.repository.entity.PropertyDataEntity;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostRemove;
import jakarta.persistence.PostUpdate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * JPA entity listener that triggers cache invalidation when property data changes.
 * Ensures cache entries are invalidated within 5 seconds of data changes.
 */
@Component
public class PropertyDataChangeListener {

    private static final Logger log = LoggerFactory.getLogger(PropertyDataChangeListener.class);

    private static CacheService cacheService;

    /**
     * Static setter for injecting CacheService (JPA entity listeners cannot use constructor injection).
     */
    public static void setCacheService(CacheService service) {
        cacheService = service;
    }

    @PostPersist
    public void onInsert(PropertyDataEntity entity) {
        invalidateCache("insert", entity);
    }

    @PostUpdate
    public void onUpdate(PropertyDataEntity entity) {
        invalidateCache("update", entity);
    }

    @PostRemove
    public void onDelete(PropertyDataEntity entity) {
        invalidateCache("delete", entity);
    }

    private void invalidateCache(String operation, PropertyDataEntity entity) {
        if (cacheService != null) {
            log.info("Property data {} detected (id={}), invalidating statistics cache", operation, entity.getId());
            cacheService.invalidateStatistics();
        } else {
            log.warn("CacheService not available for cache invalidation on {} operation", operation);
        }
    }
}
