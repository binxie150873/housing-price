import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EstimatorPage from "./page";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PropertyForm (EstimatorPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 7 ML model input fields", () => {
    render(<EstimatorPage />);

    expect(screen.getByLabelText("Square Footage")).toBeInTheDocument();
    expect(screen.getByLabelText("Bedrooms")).toBeInTheDocument();
    expect(screen.getByLabelText("Bathrooms")).toBeInTheDocument();
    expect(screen.getByLabelText("Year Built")).toBeInTheDocument();
    expect(screen.getByLabelText("Lot Size (sq ft)")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Distance to City Center (miles)")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("School Rating (0-10)")).toBeInTheDocument();
  });

  it("renders a submit button with 'Get Estimate' text", () => {
    render(<EstimatorPage />);
    expect(
      screen.getByRole("button", { name: "Get Estimate" })
    ).toBeInTheDocument();
  });

  it("shows inline error on blur when field is empty", async () => {
    render(<EstimatorPage />);

    const sqftInput = screen.getByLabelText("Square Footage");
    fireEvent.blur(sqftInput);

    await waitFor(() => {
      expect(screen.getByText("Square footage is required")).toBeInTheDocument();
    });
  });

  it("shows inline error for out-of-range value on blur", async () => {
    render(<EstimatorPage />);

    const bedroomsInput = screen.getByLabelText("Bedrooms");
    fireEvent.change(bedroomsInput, { target: { value: "15" } });
    fireEvent.blur(bedroomsInput);

    await waitFor(() => {
      expect(
        screen.getByText("Bedrooms must be at most 10")
      ).toBeInTheDocument();
    });
  });

  it("submits valid form data and navigates to result page", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ estimate_id: "abc-123" }),
    });

    render(<EstimatorPage />);

    // Fill in all fields with valid data
    fireEvent.change(screen.getByLabelText("Square Footage"), {
      target: { value: "1500" },
    });
    fireEvent.change(screen.getByLabelText("Bedrooms"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Bathrooms"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Year Built"), {
      target: { value: "1990" },
    });
    fireEvent.change(screen.getByLabelText("Lot Size (sq ft)"), {
      target: { value: "5000" },
    });
    fireEvent.change(
      screen.getByLabelText("Distance to City Center (miles)"),
      { target: { value: "10" } }
    );
    fireEvent.change(screen.getByLabelText("School Rating (0-10)"), {
      target: { value: "7" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Get Estimate" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/estimator/predict",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/estimator/result/abc-123");
    });
  });

  it("shows loading state on submit button during API call", async () => {
    // Make fetch hang
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10000))
    );

    render(<EstimatorPage />);

    // Fill in all fields
    fireEvent.change(screen.getByLabelText("Square Footage"), {
      target: { value: "1500" },
    });
    fireEvent.change(screen.getByLabelText("Bedrooms"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Bathrooms"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Year Built"), {
      target: { value: "1990" },
    });
    fireEvent.change(screen.getByLabelText("Lot Size (sq ft)"), {
      target: { value: "5000" },
    });
    fireEvent.change(
      screen.getByLabelText("Distance to City Center (miles)"),
      { target: { value: "10" } }
    );
    fireEvent.change(screen.getByLabelText("School Rating (0-10)"), {
      target: { value: "7" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Get Estimate" }));

    await waitFor(() => {
      expect(screen.getByText("Estimating...")).toBeInTheDocument();
    });
  });

  it("does not submit when form has validation errors", async () => {
    render(<EstimatorPage />);

    // Submit without filling any fields
    fireEvent.click(screen.getByRole("button", { name: "Get Estimate" }));

    await waitFor(() => {
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  it("shows error toast on API error response and preserves form input", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: { message: "Internal server error" },
      }),
    });

    render(<EstimatorPage />);

    // Fill in all fields
    fireEvent.change(screen.getByLabelText("Square Footage"), {
      target: { value: "1500" },
    });
    fireEvent.change(screen.getByLabelText("Bedrooms"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Bathrooms"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Year Built"), {
      target: { value: "1990" },
    });
    fireEvent.change(screen.getByLabelText("Lot Size (sq ft)"), {
      target: { value: "5000" },
    });
    fireEvent.change(
      screen.getByLabelText("Distance to City Center (miles)"),
      { target: { value: "10" } }
    );
    fireEvent.change(screen.getByLabelText("School Rating (0-10)"), {
      target: { value: "7" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Get Estimate" }));

    await waitFor(() => {
      // Form input should be preserved
      expect(screen.getByLabelText("Square Footage")).toHaveValue(1500);
    });
  });

  it("shows error toast on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<EstimatorPage />);

    // Fill in all fields
    fireEvent.change(screen.getByLabelText("Square Footage"), {
      target: { value: "1500" },
    });
    fireEvent.change(screen.getByLabelText("Bedrooms"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Bathrooms"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Year Built"), {
      target: { value: "1990" },
    });
    fireEvent.change(screen.getByLabelText("Lot Size (sq ft)"), {
      target: { value: "5000" },
    });
    fireEvent.change(
      screen.getByLabelText("Distance to City Center (miles)"),
      { target: { value: "10" } }
    );
    fireEvent.change(screen.getByLabelText("School Rating (0-10)"), {
      target: { value: "7" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Get Estimate" }));

    await waitFor(() => {
      // Form input should be preserved after network error
      expect(screen.getByLabelText("Square Footage")).toHaveValue(1500);
    });
  });
});
