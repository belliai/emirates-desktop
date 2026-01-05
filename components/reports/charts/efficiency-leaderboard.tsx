"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { CHART_COLORS, CHART_ANIMATION } from "@/lib/chart-theme";
import {
  tooltipContainerClass,
  tooltipTitleClass,
  getPerformanceColorClass,
} from "./chart-tooltip";

// ============================================
// Efficiency Leaderboard Chart
// ============================================

type EfficiencyLeaderboardProps = {
  data: Array<{
    name: string;
    avatar?: string;
    efficiency: number;
    isAboveAverage?: boolean;
  }>;
  averageValue: number;
  className?: string;
  height?: number;
};

export function EfficiencyLeaderboard({
  data,
  averageValue,
  className,
  height = 280,
}: EfficiencyLeaderboardProps) {
  // Sort by efficiency descending
  const sortedData = [...data].sort((a, b) => b.efficiency - a.efficiency);

  return (
    <div className={cn("chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E5E7EB"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            domain={[0, "dataMax + 1"]}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#374151" }}
            width={90}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                const d = payload[0].payload;
                const colorClass = getPerformanceColorClass(
                  d.efficiency,
                  averageValue
                );
                return (
                  <div className={cn(tooltipContainerClass, "px-3 py-2")}>
                    <p className={tooltipTitleClass}>{d.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-base font-bold", colorClass)}>
                        {d.efficiency.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-gray-400">units/hr</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine
            x={averageValue}
            stroke="#9CA3AF"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `Avg: ${averageValue.toFixed(1)}`,
              position: "top",
              fill: "#6B7280",
              fontSize: 10,
            }}
          />
          <Bar
            dataKey="efficiency"
            radius={[0, 4, 4, 0]}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
          >
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.efficiency >= averageValue
                    ? CHART_COLORS.completion.complete
                    : entry.efficiency >= averageValue * 0.8
                    ? CHART_COLORS.completion.inProgress
                    : CHART_COLORS.completion.notStarted
                }
              />
            ))}
            <LabelList
              dataKey="efficiency"
              position="right"
              fill="#374151"
              fontSize={11}
              formatter={(v: unknown) =>
                typeof v === "number" ? v.toFixed(1) : String(v)
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
