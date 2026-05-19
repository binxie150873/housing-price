import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  predictSingle,
  predictBatch,
  getHistory,
  getHistoryById,
  getHealth,
} from "./estimator-client";
import * as fetchClient from "./fetch-client";

vi.mock("./fetch-client", () => ({
  fetchWithTimeout: vi.fn(),
  getBaseUrl: vi.fn(() => ""),
}));

const mockFetch = vi.mocked(fetchClient.fetchWithTimeout);

describe("estimator-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("predictSingle", () => {
    it("calls POST /api/v1/estimator/predict with features", async () => {
      const features = {
        square_footage: 2000,
        bedrooms: 3,
        bathrooms: 2,
        year_built: 2000,
        lot_size: 5000,
        distance_to_city_center: 10,
        school_rating: 7,
      };
      const mockResult = { estimate_id: "abc", predicted_price: 350000 };
      mockFetch.mockResolvedValue(mockResult);

      const result = await predictSingle(features);

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/estimator/predict", {
        method: "POST",
        body: JSON.stringify(features),
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("predictBatch", () => {
    it("calls POST /api/v1/estimator/predict/batch with records array", async () => {
      const records = [
        {
          square_footage: 2000,
          bedrooms: 3,
          bathrooms: 2,
          year_built: 2000,
          lot_size: 5000,
          distance_to_city_center: 10,
          school_rating: 7,
        },
        {
          square_footage: 3000,
          bedrooms: 4,
          bathrooms: 3,
          year_built: 2010,
          lot_size: 8000,
          distance_to_city_center: 5,
          school_rating: 9,
        },
      ];
      const mockResult = { results: [], comparison_summary: {} };
      mockFetch.mockResolvedValue(mockResult);

      const result = await predictBatch(records);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/estimator/predict/batch",
        {
          method: "POST",
          body: JSON.stringify({ records }),
        }
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("getHistory", () => {
    it("calls GET /api/v1/estimator/history with no params by default", async () => {
      const mockResult = { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
      mockFetch.mockResolvedValue(mockResult);

      await getHistory();

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/estimator/history", {
        method: "GET",
      });
    });

    it("appends query parameters when provided", async () => {
      const mockResult = { items: [], total: 0, page: 2, page_size: 10, total_pages: 0 };
      mockFetch.mockResolvedValue(mockResult);

      await getHistory({
        page: 2,
        page_size: 10,
        search: "downtown",
        price_min: 100000,
        price_max: 500000,
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/estimator/history?");
      expect(calledUrl).toContain("page=2");
      expect(calledUrl).toContain("page_size=10");
      expect(calledUrl).toContain("search=downtown");
      expect(calledUrl).toContain("price_min=100000");
      expect(calledUrl).toContain("price_max=500000");
    });
  });

  describe("getHistoryById", () => {
    it("calls GET /api/v1/estimator/history/:id", async () => {
      const mockResult = { estimate_id: "abc-123", predicted_price: 250000 };
      mockFetch.mockResolvedValue(mockResult);

      const result = await getHistoryById("abc-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/estimator/history/abc-123",
        { method: "GET" }
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("getHealth", () => {
    it("calls GET /api/v1/estimator/health", async () => {
      const mockResult = { status: "healthy", model_loaded: true, timestamp: "2025-01-01T00:00:00Z" };
      mockFetch.mockResolvedValue(mockResult);

      const result = await getHealth();

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/estimator/health", {
        method: "GET",
      });
      expect(result).toEqual(mockResult);
    });
  });
});
