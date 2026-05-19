import { cn } from "@/lib/utils";

type ServiceStatus = "healthy" | "degraded" | "unavailable";

interface BackendHealth {
  name: string;
  status: ServiceStatus;
}

/**
 * Fetches health status from a backend service.
 * Returns "unavailable" if the request fails or times out.
 */
async function fetchServiceHealth(
  url: string,
  name: string
): Promise<BackendHealth> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      // Determine status based on response
      if (data.status === "healthy" || data.status === "UP") {
        return { name, status: "healthy" };
      }
      return { name, status: "degraded" };
    }
    return { name, status: "degraded" };
  } catch {
    return { name, status: "unavailable" };
  }
}

function StatusIndicator({ status }: { status: ServiceStatus }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        status === "healthy" && "bg-green-500",
        status === "degraded" && "bg-yellow-500",
        status === "unavailable" && "bg-red-500"
      )}
      aria-hidden="true"
    />
  );
}

function statusLabel(status: ServiceStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "unavailable":
      return "Unavailable";
  }
}

/**
 * Footer - Server Component displaying backend health status and app version.
 * Fetches health from Estimator Backend and Market Backend on each render.
 */
export async function Footer() {
  const estimatorUrl =
    process.env.ESTIMATOR_BACKEND_URL || "http://localhost:8001";
  const marketUrl = process.env.MARKET_BACKEND_URL || "http://localhost:8002";
  const appVersion = process.env.APP_VERSION || "0.1.0";

  const [estimatorHealth, marketHealth] = await Promise.all([
    fetchServiceHealth(
      `${estimatorUrl}/api/v1/estimator/health`,
      "Estimator"
    ),
    fetchServiceHealth(`${marketUrl}/api/v1/market/health`, "Market"),
  ]);

  const services = [estimatorHealth, marketHealth];

  return (
    <footer
      className="border-t bg-muted/30"
      role="contentinfo"
      aria-label="Application footer"
    >
      <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        {/* Service health indicators */}
        <div className="flex items-center gap-4" aria-label="Backend service status">
          {services.map((service) => (
            <div key={service.name} className="flex items-center gap-1.5">
              <StatusIndicator status={service.status} />
              <span>
                {service.name}:{" "}
                <span
                  className={cn(
                    "font-medium",
                    service.status === "healthy" && "text-green-600 dark:text-green-400",
                    service.status === "degraded" && "text-yellow-600 dark:text-yellow-400",
                    service.status === "unavailable" && "text-red-600 dark:text-red-400"
                  )}
                >
                  {statusLabel(service.status)}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* App version */}
        <div className="flex items-center gap-1">
          <span>Version</span>
          <span className="font-mono font-medium">{appVersion}</span>
        </div>
      </div>
    </footer>
  );
}
