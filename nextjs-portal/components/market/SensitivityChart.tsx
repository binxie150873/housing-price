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

export interface SensitivityDataPoint {
  parameterValue: number;
  predictedPrice: number;
}

interface SensitivityChartProps {
  data: SensitivityDataPoint[];
  parameterName: string;
  parameterLabel: string;
  isLoading?: boolean;
}

function formatPrice(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatParamValue(value: number, parameterName: string): string {
  if (parameterName === "year_built") {
    return String(Math.round(value));
  }
  if (parameterName === "square_footage" || parameterName === "lot_size") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(Math.round(value));
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(1);
}

export function SensitivityChart({
  data,
  parameterName,
  parameterLabel,
  isLoading = false,
}: SensitivityChartProps) {
  if (isLoading) {
    return (
      <div
        className="w-full h-[300px] flex items-center justify-center bg-muted/30 rounded-lg border"
        role="status"
        aria-label="Loading sensitivity chart"
      >
        <div className="flex flex-col items-center gap-2">
          <svg
            className="h-6 w-6 animate-spin text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm text-muted-foreground">
            Computing sensitivity...
          </span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center bg-muted/30 rounded-lg border">
        <p className="text-sm text-muted-foreground">
          Select a parameter to view sensitivity analysis
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full h-[300px]"
      role="img"
      aria-label={`Line chart showing predicted price sensitivity to ${parameterLabel}. X-axis: ${parameterLabel}, Y-axis: Predicted Price. ${data.length} data points plotted.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="parameterValue"
            tickFormatter={(val) => formatParamValue(val, parameterName)}
            label={{
              value: parameterLabel,
              position: "insideBottom",
              offset: -5,
              className: "text-xs fill-muted-foreground",
            }}
            className="text-xs"
          />
          <YAxis
            tickFormatter={formatPrice}
            label={{
              value: "Predicted Price",
              angle: -90,
              position: "insideLeft",
              offset: -5,
              className: "text-xs fill-muted-foreground",
            }}
            className="text-xs"
          />
          <Tooltip
            formatter={(value) => [
              `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              "Predicted Price",
            ]}
            labelFormatter={(label) =>
              `${parameterLabel}: ${formatParamValue(Number(label), parameterName)}`
            }
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--background))",
            }}
          />
          <Line
            type="monotone"
            dataKey="predictedPrice"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
