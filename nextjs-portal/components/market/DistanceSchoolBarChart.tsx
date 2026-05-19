"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface NumericAvgPrice {
  value: number;
  avgPrice: number;
  count: number;
}

interface ClusteredBarData {
  byDistance: NumericAvgPrice[];
  bySchoolRating: NumericAvgPrice[];
}

interface DistanceSchoolBarChartProps {
  data: ClusteredBarData;
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
 * Dual-line chart with a shared numeric X-axis.
 * X=5 means: distance_to_city_center=5 (blue line) AND school_rating=5 (green line).
 * Y-axis: average price at that value.
 * Shows how both attributes correlate with price on the same scale.
 */
export function DistanceSchoolBarChart({ data }: DistanceSchoolBarChartProps) {
  if (!data || (data.byDistance.length === 0 && data.bySchoolRating.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  // Merge both datasets onto a shared X-axis (integer values)
  // Collect all unique X values from both datasets
  const xValues = new Set<number>();
  data.byDistance.forEach((d) => xValues.add(d.value));
  data.bySchoolRating.forEach((d) => xValues.add(d.value));

  const sortedX = Array.from(xValues).sort((a, b) => a - b);

  // Build lookup maps
  const distanceMap = new Map(data.byDistance.map((d) => [d.value, d.avgPrice]));
  const schoolMap = new Map(data.bySchoolRating.map((d) => [d.value, d.avgPrice]));

  // Create unified chart data
  const chartData = sortedX.map((x) => ({
    x,
    distanceAvgPrice: distanceMap.get(x) ?? null,
    schoolRatingAvgPrice: schoolMap.get(x) ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="x"
          type="number"
          domain={["dataMin", "dataMax"]}
          fontSize={11}
          tickCount={10}
        />
        <YAxis tickFormatter={formatPrice} fontSize={12} />
        <Tooltip
          formatter={(value, name) => [
            formatPrice(Number(value)),
            name === "distanceAvgPrice"
              ? "Avg Price (Distance)"
              : "Avg Price (School Rating)",
          ]}
          labelFormatter={(label) => `X = ${label}`}
        />
        <Legend
          formatter={(value: string) =>
            value === "distanceAvgPrice"
              ? "Distance to City Center"
              : "School Rating"
          }
        />
        <Line
          type="monotone"
          dataKey="distanceAvgPrice"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls
          name="distanceAvgPrice"
        />
        <Line
          type="monotone"
          dataKey="schoolRatingAvgPrice"
          stroke="#16a34a"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls
          name="schoolRatingAvgPrice"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
