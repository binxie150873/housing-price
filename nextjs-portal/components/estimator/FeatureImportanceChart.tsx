"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { FeatureImportance } from "@/lib/types";

interface FeatureImportanceChartProps {
  data: FeatureImportance[];
}

/**
 * Recharts horizontal bar chart showing feature importance as dollar contributions.
 * Features on vertical axis, dollar contribution on horizontal axis.
 * Sorted in descending order of importance.
 * Validates: Requirements 3.2
 */
export function FeatureImportanceChart({ data }: FeatureImportanceChartProps) {
  // Sort features by importance descending
  const sortedData = [...data].sort((a, b) => b.importance - a.importance);

  // Format feature names for display (replace underscores with spaces, title case)
  const chartData = sortedData.map((item) => ({
    ...item,
    displayName: formatFeatureName(item.feature),
  }));

  const featureSummary = chartData
    .slice(0, 3)
    .map((f) => `${f.displayName}: $${Number(f.importance).toLocaleString()}`)
    .join(", ");

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground mb-4">
        Feature Contribution to Price
      </h2>

      <div
        role="img"
        aria-label={`Horizontal bar chart showing feature importance as dollar contributions. Features on vertical axis, dollar amount on horizontal axis. Top features: ${featureSummary}.`}
        className="w-full"
      >
        <ResponsiveContainer width="100%" height={chartData.length * 50 + 40}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, "dataMax"]}
              tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
              label={{
                value: "Contribution ($)",
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis
              type="category"
              dataKey="displayName"
              width={110}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => [`$${Number(value).toLocaleString()}`, "Contribution"]}
              labelFormatter={(label: string) => `Feature: ${label}`}
            />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(index, chartData.length)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Formats feature names: replaces underscores with spaces and applies title case.
 */
function formatFeatureName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Returns a color for the bar based on its position (gradient from primary to muted).
 */
function getBarColor(index: number, total: number): string {
  const colors = [
    "hsl(221, 83%, 53%)", // primary blue
    "hsl(221, 73%, 60%)",
    "hsl(221, 63%, 67%)",
    "hsl(221, 53%, 74%)",
    "hsl(221, 43%, 81%)",
    "hsl(221, 33%, 85%)",
    "hsl(221, 23%, 89%)",
  ];
  return colors[Math.min(index, colors.length - 1)] || colors[colors.length - 1];
}
