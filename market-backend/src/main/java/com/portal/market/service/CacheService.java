package com.portal.market.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Two-layer cache service: Caffeine (L1 in-memory) + Redis (L2 distributed).
 * On cache miss, checks L1 first, then L2, then returns empty for caller to compute.
 * On store, writes to both L1 and L2.
 * TTL is configurable (default 300s from application.yml).
 */
@Service
public class CacheService {

    private static final Logger log = LoggerFactory.getLogger(CacheService.class);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${market.cache.ttl-seconds:300}")
    private long ttlSeconds;

    private Cache<String, String> caffeineCache;

    public CacheService(Optional<StringRedisTemplate> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate.orElse(null);
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void init() {
        this.caffeineCache = Caffeine.newBuilder()
                .maximumSize(1000)
                .expireAfterWrite(ttlSeconds, TimeUnit.SECONDS)
                .recordStats()
                .build();
    }

    /**
     * Attempt to retrieve a cached value. Checks L1 (Caffeine) first, then L2 (Redis).
     * If found in L2 but not L1, promotes to L1.
     *
     * @param key   the cache key
     * @param clazz the expected type
     * @return CacheResult containing the value and whether it was a cache hit
     */
    public <T> CacheResult<T> get(String key, Class<T> clazz) {
        // L1: Caffeine
        String json = caffeineCache.getIfPresent(key);
        if (json != null) {
            log.debug("L1 cache hit for key: {}", key);
            T value = deserialize(json, clazz);
            if (value != null) {
                return CacheResult.hit(value);
            }
        }

        // L2: Redis
        if (redisTemplate != null) {
            try {
                json = redisTemplate.opsForValue().get(key);
                if (json != null) {
                    log.debug("L2 cache hit for key: {}", key);
                    // Promote to L1
                    caffeineCache.put(key, json);
                    T value = deserialize(json, clazz);
                    if (value != null) {
                        return CacheResult.hit(value);
                    }
                }
            } catch (Exception e) {
                log.warn("Redis read failed for key: {}, falling back to compute", key, e);
            }
        }

        log.debug("Cache miss for key: {}", key);
        return CacheResult.miss();
    }

    /**
     * Store a value in both L1 and L2 caches.
     *
     * @param key   the cache key
     * @param value the value to cache
     */
    public <T> void put(String key, T value) {
        String json = serialize(value);
        if (json == null) {
            return;
        }

        // L1: Caffeine
        caffeineCache.put(key, json);

        // L2: Redis
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(key, json, Duration.ofSeconds(ttlSeconds));
                log.debug("Stored in L1+L2 cache for key: {}", key);
            } catch (Exception e) {
                log.warn("Redis write failed for key: {}, stored in L1 only", key, e);
            }
        }
    }

    /**
     * Invalidate a specific cache entry from both layers.
     */
    public void evict(String key) {
        caffeineCache.invalidate(key);
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(key);
            } catch (Exception e) {
                log.warn("Redis evict failed for key: {}", key, e);
            }
        }
    }

    /**
     * Invalidate all cache entries matching a prefix from both layers.
     */
    public void evictByPrefix(String prefix) {
        // L1: Caffeine - invalidate all entries with matching prefix
        caffeineCache.asMap().keySet().removeIf(k -> k.startsWith(prefix));

        // L2: Redis - scan and delete matching keys
        if (redisTemplate != null) {
            try {
                var keys = redisTemplate.keys(prefix + "*");
                if (keys != null && !keys.isEmpty()) {
                    redisTemplate.delete(keys);
                    log.debug("Evicted {} Redis keys with prefix: {}", keys.size(), prefix);
                }
            } catch (Exception e) {
                log.warn("Redis prefix eviction failed for prefix: {}", prefix, e);
            }
        }
    }

    /**
     * Invalidate all market statistics cache entries from both layers.
     * Called when property data changes.
     */
    public void invalidateStatistics() {
        evictByPrefix("market:stats:");
        log.info("Invalidated all market statistics cache entries");
    }

    /**
     * Generate a cache key from filter parameters by hashing them.
     */
    public String generateStatsKey(Double priceMin, Double priceMax,
                                   Integer bedroomsMin, Integer bedroomsMax,
                                   Integer yearMin, Integer yearMax) {
        String raw = String.format("pmin=%s|pmax=%s|bmin=%s|bmax=%s|ymin=%s|ymax=%s",
                nullSafe(priceMin), nullSafe(priceMax),
                nullSafe(bedroomsMin), nullSafe(bedroomsMax),
                nullSafe(yearMin), nullSafe(yearMax));
        return "market:stats:" + sha256(raw);
    }

    public long getTtlSeconds() {
        return ttlSeconds;
    }

    private String nullSafe(Object value) {
        return value == null ? "" : value.toString();
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 16); // Use first 16 hex chars
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is always available in Java
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private <T> String serialize(T value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize cache value", e);
            return null;
        }
    }

    private <T> T deserialize(String json, Class<T> clazz) {
        try {
            return objectMapper.readValue(json, clazz);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize cache value", e);
            return null;
        }
    }

    /**
     * Result wrapper that indicates whether the value came from cache.
     */
    public record CacheResult<T>(T value, boolean hit) {
        public static <T> CacheResult<T> hit(T value) {
            return new CacheResult<>(value, true);
        }

        public static <T> CacheResult<T> miss() {
            return new CacheResult<>(null, false);
        }
    }
}
