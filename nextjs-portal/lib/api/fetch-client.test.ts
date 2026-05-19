import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithTimeout, ApiClientError } from "./fetch-client";

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns parsed JSON on successful response", async () => {
    const mockData = { id: "123", name: "test" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchWithTimeout<typeof mockData>("http://api/test");
    expect(result).toEqual(mockData);
  });

  it("sets Content-Type header to application/json by default", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await fetchWithTimeout("http://api/test");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("throws ApiClientError on non-2xx response with structured error body", async () => {
    const errorBody = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: [{ field: "bedrooms", message: "Must be >= 1" }],
        timestamp: "2025-01-15T10:00:00Z",
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: () => Promise.resolve(errorBody),
    });

    await expect(fetchWithTimeout("http://api/test")).rejects.toThrow(
      ApiClientError
    );

    try {
      await fetchWithTimeout("http://api/test");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      const apiError = error as ApiClientError;
      expect(apiError.status).toBe(422);
      expect(apiError.code).toBe("VALIDATION_ERROR");
      expect(apiError.message).toBe("Invalid input");
      expect(apiError.details).toHaveLength(1);
    }
  });

  it("throws ApiClientError with fallback when response body is not JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("not json")),
    });

    try {
      await fetchWithTimeout("http://api/test");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      const apiError = error as ApiClientError;
      expect(apiError.status).toBe(500);
      expect(apiError.code).toBe("HTTP_500");
      expect(apiError.message).toBe("Internal Server Error");
    }
  });

  it("throws timeout error when request exceeds 10 seconds", async () => {
    global.fetch = vi.fn().mockImplementation(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );

    const promise = fetchWithTimeout("http://api/test");
    vi.advanceTimersByTime(10_000);

    await expect(promise).rejects.toThrow("Request timed out after 10 seconds");
  });

  it("passes through custom headers", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await fetchWithTimeout("http://api/test", {
      headers: { Authorization: "Bearer token123" },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
        }),
      })
    );
  });

  it("re-throws network errors as-is", async () => {
    const networkError = new TypeError("Failed to fetch");
    global.fetch = vi.fn().mockRejectedValue(networkError);

    await expect(fetchWithTimeout("http://api/test")).rejects.toThrow(
      "Failed to fetch"
    );
  });
});
