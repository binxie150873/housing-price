"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Segment {
  decade: string;
  avgPrice: number;
  count: number;
}

interface YearBuiltPieChartProps {
  data: Segment[];
}

const COLORS = [
  "hsl(220, 70%, 50%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(45, 80%, 50%)",
  "hsl(190, 70%, 45%)",
  "hsl(330, 60%, 50%)",
];

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
 * Pie chart showing average price by decade of year_built.
 * Each segment represents a decade with size proportional to count.
 */
export function YearBuiltPieChart({ data }: YearBuiltPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="decade"
          cx="50%"
          cy="50%"
          outerRadius="70%"
          label={({ name, payload }) => `${name}: ${formatPrice((payload as Segment).avgPrice)}`}
          labelLine={true}
          fontSize={11}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name, props) => {
            const segment = props.payload as Segment;
            return [`Avg: ${formatPrice(segment.avgPrice)} (${segment.count} properties)`, segment.decade];
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
