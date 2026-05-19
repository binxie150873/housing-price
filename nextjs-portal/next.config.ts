import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/v1/estimator/:path*",
        destination: `${process.env.ESTIMATOR_BACKEND_URL || "http://localhost:8001"}/api/v1/estimator/:path*`,
      },
      {
        source: "/api/v1/market/:path*",
        destination: `${process.env.MARKET_BACKEND_URL || "http://localhost:8002"}/api/v1/market/:path*`,
      },
    ];
  },
};

export default nextConfig;
