package com.portal.market.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "ml-service")
public class MlServiceConfig {

    private String baseUrl = "http://localhost:8000";
    private int timeout = 5000;
    private RetryConfig retry = new RetryConfig();

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public int getTimeout() { return timeout; }
    public void setTimeout(int timeout) { this.timeout = timeout; }

    public RetryConfig getRetry() { return retry; }
    public void setRetry(RetryConfig retry) { this.retry = retry; }

    public static class RetryConfig {
        private int maxAttempts = 3;
        private long initialDelay = 1000;
        private int multiplier = 2;

        public int getMaxAttempts() { return maxAttempts; }
        public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }

        public long getInitialDelay() { return initialDelay; }
        public void setInitialDelay(long initialDelay) { this.initialDelay = initialDelay; }

        public int getMultiplier() { return multiplier; }
        public void setMultiplier(int multiplier) { this.multiplier = multiplier; }
    }
}
