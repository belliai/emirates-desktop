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
import { CHART_ANIMATION, CHART_MARGINS, TOOLTIP_STYLE } from "@/lib/chart-theme";

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
};

export function StackedAreaChart({
  data,
  dataKeys,
  xAxisKey,
  className,
  height = 300,
  showGrid = true,
}: StackedAreaChartProps) {
  return (
    <div className={cn("chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={CHART_MARGINS.default}>
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
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            stroke="#9CA3AF"
          />
          <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} stroke="#9CA3AF" />
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
            iconType="circle"
            iconSize={8}
          />
          {dataKeys.map((dk, index) => (
            <Area
              key={dk.key}
              type="monotone"
              dataKey={dk.key}
              name={dk.name}
              stackId="1"
              stroke={dk.color}
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

