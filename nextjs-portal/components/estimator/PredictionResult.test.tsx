import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PredictionResult } from "./PredictionResult";
import type { PredictionResult as PredictionResultType } from "@/lib/types";

const mockResult: PredictionResultType = {
  estimate_id: "abc-123",
  predicted_price: 350000.5,
  currency: "USD",
  input_features: {
    square_footage: 2000,
    bedrooms: 3,
    bathrooms: 2,
    year_built: 2010,
    lot_size: 5000,
    distance_to_city_center: 10,
    school_rating: 8,
  },
  model_version: "v1.2.3",
  timestamp: "2025-01-15T10:30:00Z",
  feature_importance: [
    { feature: "square_footage", importance: 40 },
    { feature: "bedrooms", importance: 20 },
    { feature: "bathrooms", importance: 15 },
    { feature: "year_built", importance: 10 },
    { feature: "lot_size", importance: 8 },
    { feature: "distance_to_city_center", importance: 5 },
    { feature: "school_rating", importance: 2 },
  ],
};

describe("PredictionResult", () => {
  it("displays predicted price formatted with currency symbol and 2 decimal places", () => {
    render(<PredictionResult result={mockResult} />);
    expect(screen.getByText("$350,000.50")).toBeInTheDocument();
  });

  it("displays currency code", () => {
    render(<PredictionResult result={mockResult} />);
    expect(screen.getByText("Currency: USD")).toBeInTheDocument();
  });

  it("displays model version", () => {
    render(<PredictionResult result={mockResult} />);
    expect(screen.getByText("v1.2.3")).toBeInTheDocument();
  });

  it("displays ISO 8601 timestamp", () => {
    render(<PredictionResult result={mockResult} />);
    expect(screen.getByText("2025-01-15T10:30:00Z")).toBeInTheDocument();
  });

  it("renders the timestamp in a time element with dateTime attribute", () => {
    render(<PredictionResult result={mockResult} />);
    const timeEl = screen.getByText("2025-01-15T10:30:00Z");
    expect(timeEl.tagName).toBe("TIME");
    expect(timeEl).toHaveAttribute("dateTime", "2025-01-15T10:30:00Z");
  });

  it("provides aria-label for the predicted price", () => {
    render(<PredictionResult result={mockResult} />);
    expect(
      screen.getByLabelText("Predicted price: $350,000.50 USD")
    ).toBeInTheDocument();
  });

  it("formats large prices correctly", () => {
    const largeResult = { ...mockResult, predicted_price: 1234567.89 };
    render(<PredictionResult result={largeResult} />);
    expect(screen.getByText("$1,234,567.89")).toBeInTheDocument();
  });
});
