package com.portal.market.service;

import com.portal.market.config.MlServiceConfig;
import com.portal.market.dto.HealthResponseDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HealthServiceTest {

    @Mock
    private RedisConnectionFactory redisConnectionFactory;

    @Mock
    private RedisConnection redisConnection;

    private MlServiceConfig mlServiceConfig;
    private HealthService healthService;

    @BeforeEach
    void setUp() {
        mlServiceConfig = new MlServiceConfig();
        // Use a non-routable address to ensure ML check fails quickly in tests
        mlServiceConfig.setBaseUrl("http://192.0.2.1:9999");
        healthService = new HealthService(redisConnectionFactory, mlServiceConfig);
    }

    @Test
    void checkHealth_whenRedisConnected_andMlUnreachable_returnsUnhealthy() {
        when(redisConnectionFactory.getConnection()).thenReturn(redisConnection);
        when(redisConnection.ping()).thenReturn("PONG");

        HealthResponseDTO result = healthService.checkHealth();

        assertThat(result.status()).isEqualTo("unhealthy");
        assertThat(result.cacheStatus()).isEqualTo("connected");
        assertThat(result.mlServiceStatus()).isEqualTo("unreachable");
        assertThat(result.timestamp()).isNotNull();
    }

    @Test
    void checkHealth_whenRedisThrowsException_returnsDisconnected() {
        when(redisConnectionFactory.getConnection()).thenThrow(new RuntimeException("Connection refused"));

        HealthResponseDTO result = healthService.checkHealth();

        assertThat(result.status()).isEqualTo("unhealthy");
        assertThat(result.cacheStatus()).isEqualTo("disconnected");
        assertThat(result.mlServiceStatus()).isEqualTo("unreachable");
        assertThat(result.timestamp()).isNotNull();
    }

    @Test
    void checkHealth_whenRedisPingReturnsNull_returnsDisconnected() {
        when(redisConnectionFactory.getConnection()).thenReturn(redisConnection);
        when(redisConnection.ping()).thenReturn(null);

        HealthResponseDTO result = healthService.checkHealth();

        assertThat(result.status()).isEqualTo("unhealthy");
        assertThat(result.cacheStatus()).isEqualTo("disconnected");
        assertThat(result.mlServiceStatus()).isEqualTo("unreachable");
        assertThat(result.timestamp()).isNotNull();
    }
}
