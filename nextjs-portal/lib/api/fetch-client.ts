import { ApiError } from "@/lib/types";

const API_TIMEOUT_MS = 10_000;

/**
 * Custom error class for API errors with structured error data.
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: { field: string; message: string }[];
  public readonly timestamp: string;

  constructor(status: number, apiError: ApiError["error"]) {
    super(apiError.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = apiError.code;
    this.details = apiError.details;
    this.timestamp = apiError.timestamp;
  }
}

/**
 * Performs a fetch request with a 10-second timeout using AbortController.
 * Throws ApiClientError for non-2xx responses with structured error bodies.
 * Throws generic Error for network failures or timeouts.
 */
export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      let apiError: ApiError["error"];
      try {
        const body = await response.json();
        apiError = body.error ?? {
          code: `HTTP_${response.status}`,
          message: response.statusText,
          timestamp: new Date().toISOString(),
        };
      } catch {
        apiError = {
          code: `HTTP_${response.status}`,
          message: response.statusText || "Request failed",
          timestamp: new Date().toISOString(),
        };
      }
      throw new ApiClientError(response.status, apiError);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out after 10 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Returns the base URL for API requests.
 * In the browser, uses relative paths (proxied by Nginx).
 * On the server, uses the full internal service URL.
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.INTERNAL_API_URL ?? "";
}
