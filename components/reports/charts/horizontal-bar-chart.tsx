"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { CHART_COLORS, CHART_ANIMATION, CHART_MARGINS, TOOLTIP_STYLE } from "@/lib/chart-theme";

// ============================================
// Horizontal Bar Chart Component
// ============================================

type HorizontalBarChartProps = {
  data: Array<{
    name: string;
    planned?: number;
    actual?: number;
    value?: number;
    color?: string;
  }>;
  showComparison?: boolean;
  className?: string;
  height?: number;
};

export function HorizontalBarChart({
  data,
  showComparison = false,
  className,
  height = 300,
}: HorizontalBarChartProps) {
  return (
    <div className={cn("chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ ...CHART_MARGINS.default, left: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E5E7EB"
            horizontal={false}
          />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            width={70}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
          />
          {showComparison ? (
            <>
              <Bar
                dataKey="planned"
                name="Planned"
                fill={CHART_COLORS.uld.alf}
                radius={[0, 4, 4, 0]}
                isAnimationActive={true}
                animationDuration={CHART_ANIMATION.duration}
              />
              <Bar
                dataKey="actual"
                name="Actual"
                fill={CHART_COLORS.uld.pmc}
                radius={[0, 4, 4, 0]}
                isAnimationActive={true}
                animationDuration={CHART_ANIMATION.duration}
                animationBegin={CHART_ANIMATION.staggerDelay}
              />
            </>
          ) : (
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION.duration}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || CHART_COLORS.uld.pmc}
                />
              ))}
            </Bar>
          )}
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

