import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStatistics,
  getData,
  predictWhatIf,
  triggerExport,
  getExportStatus,
  getHealth,
} from "./market-client";
import * as fetchClient from "./fetch-client";

vi.mock("./fetch-client", () => ({
  fetchWithTimeout: vi.fn(),
  getBaseUrl: vi.fn(() => ""),
}));

const mockFetch = vi.mocked(fetchClient.fetchWithTimeout);

describe("market-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStatistics", () => {
    it("calls GET /api/v1/market/statistics with no params by default", async () => {
      const mockResult = { squareFootageVsPrice: [], yearBuiltVsPrice: [], distanceSchoolVsPrice: { byDistance: [], bySchoolRating: [] } };
      mockFetch.mockResolvedValue(mockResult);

      await getStatistics();

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/market/statistics", {
        method: "GET",
      });
    });

    it("appends filter parameters when provided", async () => {
      mockFetch.mockResolvedValue({});

      await getStatistics({
        price_min: 100000,
        price_max: 500000,
        bedrooms_min: 2,
        bedrooms_max: 4,
        year_min: 2000,
        year_max: 2024,
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("priceMin=100000");
      expect(calledUrl).toContain("priceMax=500000");
      expect(calledUrl).toContain("bedroomsMin=2");
      expect(calledUrl).toContain("bedroomsMax=4");
      expect(calledUrl).toContain("yearMin=2000");
      expect(calledUrl).toContain("yearMax=2024");
    });
  });

  describe("getData", () => {
    it("calls GET /api/v1/market/data with no params by default", async () => {
      mockFetch.mockResolvedValue({ items: [], total: 0 });

      await getData();

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/market/data", {
        method: "GET",
      });
    });

    it("appends pagination and filter parameters", async () => {
      mockFetch.mockResolvedValue({ items: [], total: 0 });

      await getData({
        page: 3,
        page_size: 50,
        bedrooms_min: 2,
        bedrooms_max: 4,
        price_min: 100000,
        sort_by: "price",
        sort_order: "desc",
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("page=3");
      expect(calledUrl).toContain("page_size=50");
      expect(calledUrl).toContain("bedroomsMin=2");
      expect(calledUrl).toContain("bedroomsMax=4");
      expect(calledUrl).toContain("priceMin=100000");
      expect(calledUrl).toContain("sortBy=price");
      expect(calledUrl).toContain("sortOrder=desc");
    });

    it("appends all available filter parameters", async () => {
      mockFetch.mockResolvedValue({ items: [], total: 0 });

      await getData({
        bathrooms_min: 1,
        bathrooms_max: 3,
        year_built_min: 1990,
        year_built_max: 2020,
        square_footage_min: 1000,
        square_footage_max: 3000,
        lot_size_min: 5000,
        lot_size_max: 20000,
        school_rating_min: 7,
        distance_max: 10,
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("bathroomsMin=1");
      expect(calledUrl).toContain("bathroomsMax=3");
      expect(calledUrl).toContain("yearBuiltMin=1990");
      expect(calledUrl).toContain("yearBuiltMax=2020");
      expect(calledUrl).toContain("squareFootageMin=1000");
      expect(calledUrl).toContain("squareFootageMax=3000");
      expect(calledUrl).toContain("lotSizeMin=5000");
      expect(calledUrl).toContain("lotSizeMax=20000");
      expect(calledUrl).toContain("schoolRatingMin=7");
      expect(calledUrl).toContain("distanceMax=10");
    });
  });

  describe("predictWhatIf", () => {
    it("calls POST /api/v1/market/what-if with request body", async () => {
      const request = {
        base_property: {
          square_footage: 2000,
          bedrooms: 3,
          bathrooms: 2,
          year_built: 2000,
          lot_size: 5000,
          distance_to_city_center: 10,
          school_rating: 7,
        },
        modifications: { square_footage: 2500 },
      };
      const mockResult = {
        base_prediction: { predicted_value: 300000 },
        modified_prediction: { predicted_value: 350000 },
        value_difference: 50000,
        percentage_change: 16.67,
      };
      mockFetch.mockResolvedValue(mockResult);

      const result = await predictWhatIf(request);

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/market/what-if", {
        method: "POST",
        body: JSON.stringify(request),
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("triggerExport", () => {
    it("calls POST /api/v1/market/export with format and filters", async () => {
      const request = { format: "csv" as const, filters: { price_min: 100000 } };
      const mockResult = { job_id: "job-1", status: "pending" };
      mockFetch.mockResolvedValue(mockResult);

      const result = await triggerExport(request);

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/market/export", {
        method: "POST",
        body: JSON.stringify(request),
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("getExportStatus", () => {
    it("calls GET /api/v1/market/export/:jobId/status", async () => {
      const mockResult = { job_id: "job-1", status: "completed", download_url: "/download/job-1" };
      mockFetch.mockResolvedValue(mockResult);

      const result = await getExportStatus("job-1");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/market/export/job-1/status",
        { method: "GET" }
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("getHealth", () => {
    it("calls GET /api/v1/market/health", async () => {
      const mockResult = {
        status: "healthy",
        cache_status: "connected",
        ml_service_status: "reachable",
        timestamp: "2025-01-01T00:00:00Z",
      };
      mockFetch.mockResolvedValue(mockResult);

      const result = await getHealth();

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/market/health", {
        method: "GET",
      });
      expect(result).toEqual(mockResult);
    });
  });
});
