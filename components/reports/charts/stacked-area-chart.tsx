"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { CHART_ANIMATION } from "@/lib/chart-theme";
import { tooltipContainerClass } from "./chart-tooltip";

// ============================================
// Stacked Area Chart Component
// ============================================

type StackedAreaChartProps = {
  data: Array<Record<string, string | number>>;
  dataKeys: Array<{ key: string; name: string; color: string }>;
  xAxisKey: string;
  className?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
};

// Custom tooltip component with shadcn styling
function CustomAreaTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Get shift time from the data
  const shiftTime = payload[0]?.payload?.shiftTime;

  return (
    <div className={cn(tooltipContainerClass, "px-3 py-2.5 min-w-[120px]")}>
      <div className="text-sm font-semibold text-gray-900 mb-1">{label}</div>
      {shiftTime && (
        <div className="text-[10px] text-gray-400 mb-2">{shiftTime}</div>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-gray-600">{entry.name}</span>
            </div>
            <span className="text-xs font-semibold text-gray-900">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StackedAreaChart({
  data,
  dataKeys,
  xAxisKey,
  className,
  height = 300,
  showGrid = true,
  showLegend = true,
}: StackedAreaChartProps) {
  return (
    <div className={cn("chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 5, bottom: 0 }}
        >
          <defs>
            {dataKeys.map((dk) => (
              <linearGradient
                key={dk.key}
                id={`gradient-${dk.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={dk.color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={dk.color} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            stroke="#E5E7EB"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6B7280" }}
            stroke="#E5E7EB"
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip
            content={<CustomAreaTooltip />}
            cursor={{ stroke: "#D1D5DB", strokeWidth: 1 }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              iconType="circle"
              iconSize={8}
            />
          )}
          {dataKeys.map((dk, index) => (
            <Area
              key={dk.key}
              type="monotone"
              dataKey={dk.key}
              name={dk.name}
              stackId="1"
              stroke={dk.color}
              strokeWidth={2}
              fill={`url(#gradient-${dk.key})`}
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION.duration}
              animationBegin={index * CHART_ANIMATION.staggerDelay}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
