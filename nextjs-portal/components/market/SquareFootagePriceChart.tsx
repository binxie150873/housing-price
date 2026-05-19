"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  squareFootage: number;
  price: number;
}

interface SquareFootagePriceChartProps {
  data: DataPoint[];
}

function formatSquareFootage(value: number): string {
  return value.toLocaleString();
}

function formatPrice(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}k`;
  }
  return `$${value}`;
}

/**
 * Line chart showing square footage vs price.
 * X-axis: square footage, Y-axis: price.
 * Data points are connected by a line, sorted by square footage ascending.
 */
export function SquareFootagePriceChart({ data }: SquareFootagePriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="squareFootage"
          tickFormatter={formatSquareFootage}
          label={{ value: "Square Footage", position: "insideBottom", offset: -5 }}
          fontSize={12}
        />
        <YAxis
          tickFormatter={formatPrice}
          label={{ value: "Price", angle: -90, position: "insideLeft" }}
          fontSize={12}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Price"]}
          labelFormatter={(label) => `${Number(label).toLocaleString()} sq ft`}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#2563eb"
          strokeWidth={2}
          dot={data.length <= 50}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
