package com.portal.market.service;

import com.portal.market.config.MlServiceConfig;
import com.portal.market.dto.HealthResponseDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;

@Service
public class HealthService {

    private static final Logger log = LoggerFactory.getLogger(HealthService.class);

    private final RedisConnectionFactory redisConnectionFactory;
    private final MlServiceConfig mlServiceConfig;
    private final RestTemplate healthCheckRestTemplate;

    public HealthService(RedisConnectionFactory redisConnectionFactory, MlServiceConfig mlServiceConfig) {
        this.redisConnectionFactory = redisConnectionFactory;
        this.mlServiceConfig = mlServiceConfig;
        this.healthCheckRestTemplate = createHealthCheckRestTemplate();
    }

    public HealthResponseDTO checkHealth() {
        String cacheStatus = checkRedisConnectivity();
        String mlServiceStatus = checkMlServiceConnectivity();

        String overallStatus = "connected".equals(cacheStatus) && "reachable".equals(mlServiceStatus)
                ? "healthy"
                : "unhealthy";

        return new HealthResponseDTO(overallStatus, cacheStatus, mlServiceStatus, Instant.now());
    }

    private String checkRedisConnectivity() {
        try {
            var connection = redisConnectionFactory.getConnection();
            String pong = connection.ping();
            connection.close();
            return pong != null ? "connected" : "disconnected";
        } catch (Exception e) {
            log.warn("Redis health check failed: {}", e.getMessage());
            return "disconnected";
        }
    }

    private String checkMlServiceConnectivity() {
        try {
            String healthUrl = mlServiceConfig.getBaseUrl() + "/health";
            healthCheckRestTemplate.getForEntity(healthUrl, String.class);
            return "reachable";
        } catch (Exception e) {
            log.warn("ML service health check failed: {}", e.getMessage());
            return "unreachable";
        }
    }

    private RestTemplate createHealthCheckRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(2000);
        return new RestTemplate(factory);
    }
}
