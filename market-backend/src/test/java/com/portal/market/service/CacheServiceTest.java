package com.portal.market.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class CacheServiceTest {

    private CacheService cacheService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws Exception {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        // Create CacheService without Redis (L1 only mode)
        cacheService = new CacheService(Optional.empty(), objectMapper);

        // Use reflection to set ttlSeconds and call init
        var ttlField = CacheService.class.getDeclaredField("ttlSeconds");
        ttlField.setAccessible(true);
        ttlField.set(cacheService, 300L);

        // Call @PostConstruct init manually
        var initMethod = CacheService.class.getDeclaredMethod("init");
        initMethod.setAccessible(true);
        initMethod.invoke(cacheService);
    }

    @Test
    void get_cacheMiss_returnsEmptyResult() {
        CacheService.CacheResult<String> result = cacheService.get("nonexistent", String.class);

        assertFalse(result.hit());
        assertNull(result.value());
    }

    @Test
    void put_thenGet_returnsCachedValue() {
        // Given
        TestData data = new TestData("hello", 42);
        cacheService.put("test-key", data);

        // When
        CacheService.CacheResult<TestData> result = cacheService.get("test-key", TestData.class);

        // Then
        assertTrue(result.hit());
        assertNotNull(result.value());
        assertEquals("hello", result.value().name());
        assertEquals(42, result.value().value());
    }

    @Test
    void evict_removesFromCache() {
        // Given
        cacheService.put("key-to-evict", new TestData("data", 1));
        assertTrue(cacheService.get("key-to-evict", TestData.class).hit());

        // When
        cacheService.evict("key-to-evict");

        // Then
        assertFalse(cacheService.get("key-to-evict", TestData.class).hit());
    }

    @Test
    void evictByPrefix_removesMatchingEntries() {
        // Given
        cacheService.put("market:stats:abc", new TestData("a", 1));
        cacheService.put("market:stats:def", new TestData("b", 2));
        cacheService.put("market:other:xyz", new TestData("c", 3));

        // When
        cacheService.evictByPrefix("market:stats:");

        // Then
        assertFalse(cacheService.get("market:stats:abc", TestData.class).hit());
        assertFalse(cacheService.get("market:stats:def", TestData.class).hit());
        assertTrue(cacheService.get("market:other:xyz", TestData.class).hit());
    }

    @Test
    void invalidateStatistics_removesAllStatsEntries() {
        // Given
        cacheService.put("market:stats:key1", new TestData("a", 1));
        cacheService.put("market:stats:key2", new TestData("b", 2));

        // When
        cacheService.invalidateStatistics();

        // Then
        assertFalse(cacheService.get("market:stats:key1", TestData.class).hit());
        assertFalse(cacheService.get("market:stats:key2", TestData.class).hit());
    }

    @Test
    void generateStatsKey_sameParams_sameKey() {
        String key1 = cacheService.generateStatsKey(100.0, 500.0, 2, 5, 2000, 2023);
        String key2 = cacheService.generateStatsKey(100.0, 500.0, 2, 5, 2000, 2023);

        assertEquals(key1, key2);
        assertTrue(key1.startsWith("market:stats:"));
    }

    @Test
    void generateStatsKey_differentParams_differentKey() {
        String key1 = cacheService.generateStatsKey(100.0, 500.0, 2, 5, 2000, 2023);
        String key2 = cacheService.generateStatsKey(200.0, 500.0, 2, 5, 2000, 2023);

        assertNotEquals(key1, key2);
    }

    @Test
    void generateStatsKey_nullParams_handledGracefully() {
        String key = cacheService.generateStatsKey(null, null, null, null, null, null);

        assertNotNull(key);
        assertTrue(key.startsWith("market:stats:"));
    }

    @Test
    void getTtlSeconds_returnsConfiguredValue() {
        assertEquals(300L, cacheService.getTtlSeconds());
    }

    @Test
    void cacheResult_hit_containsValue() {
        CacheService.CacheResult<String> result = CacheService.CacheResult.hit("value");

        assertTrue(result.hit());
        assertEquals("value", result.value());
    }

    @Test
    void cacheResult_miss_containsNull() {
        CacheService.CacheResult<String> result = CacheService.CacheResult.miss();

        assertFalse(result.hit());
        assertNull(result.value());
    }

    // Simple test record for serialization
    record TestData(String name, int value) {}
}
