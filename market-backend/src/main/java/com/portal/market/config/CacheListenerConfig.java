package com.portal.market.config;

import com.portal.market.service.CacheService;
import com.portal.market.service.PropertyDataChangeListener;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration that wires the CacheService into the JPA entity listener.
 * JPA entity listeners cannot use constructor injection, so we use a static setter
 * that is called during application startup.
 */
@Configuration
public class CacheListenerConfig {

    private final CacheService cacheService;

    public CacheListenerConfig(CacheService cacheService) {
        this.cacheService = cacheService;
    }

    @PostConstruct
    void init() {
        PropertyDataChangeListener.setCacheService(cacheService);
    }
}
