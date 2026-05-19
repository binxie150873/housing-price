import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { ToastContainer } from "./Toast";
import { useToastStore } from "@/lib/toast-store";

describe("Toast", () => {
  beforeEach(() => {
    // Reset toast store before each test
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders toast container with aria-live=assertive", () => {
    const { container } = render(<ToastContainer />);
    const liveRegion = container.querySelector('[aria-live="assertive"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it("displays a success toast", () => {
    render(<ToastContainer />);
    act(() => {
      useToastStore.getState().addToast({
        type: "success",
        message: "Operation completed successfully",
      });
    });
    expect(screen.getByText("Operation completed successfully")).toBeInTheDocument();
  });

  it("displays an error toast with recovery action", () => {
    const onRecover = vi.fn();
    render(<ToastContainer />);
    act(() => {
      useToastStore.getState().addToast({
        type: "error",
        message: "Something went wrong",
        recoveryAction: "Retry",
        onRecover,
      });
    });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Retry"));
    expect(onRecover).toHaveBeenCalledOnce();
  });

  it("auto-dismisses success toast after 5 seconds", () => {
    vi.useFakeTimers();
    render(<ToastContainer />);
    act(() => {
      useToastStore.getState().addToast({
        type: "success",
        message: "Auto dismiss me",
      });
    });
    expect(screen.getByText("Auto dismiss me")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Auto dismiss me")).not.toBeInTheDocument();
  });

  it("does NOT auto-dismiss error toast", () => {
    vi.useFakeTimers();
    render(<ToastContainer />);
    act(() => {
      useToastStore.getState().addToast({
        type: "error",
        message: "Persistent error",
      });
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText("Persistent error")).toBeInTheDocument();
  });

  it("truncates messages longer than 120 characters", () => {
    render(<ToastContainer />);
    const longMessage = "A".repeat(150);
    act(() => {
      useToastStore.getState().addToast({
        type: "error",
        message: longMessage,
      });
    });
    const alerts = screen.getAllByRole("alert");
    const messageEl = alerts[0].querySelector("p");
    expect(messageEl?.textContent?.length).toBeLessThanOrEqual(120);
  });

  it("dismisses toast when X button is clicked", () => {
    render(<ToastContainer />);
    act(() => {
      useToastStore.getState().addToast({
        type: "error",
        message: "Dismiss me",
      });
    });
    expect(screen.getByText("Dismiss me")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Dismiss notification"));
    expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument();
  });
});
