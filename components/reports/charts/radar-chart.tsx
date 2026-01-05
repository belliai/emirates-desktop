"use client";

import * as React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { CHART_ANIMATION, CHART_MARGINS, TOOLTIP_STYLE } from "@/lib/chart-theme";

// ============================================
// Radar Chart Component
// ============================================

type RadarChartProps = {
  data: Array<{ subject: string; [key: string]: string | number }>;
  dataKeys: Array<{ key: string; name: string; color: string }>;
  className?: string;
  height?: number;
};

export function RadarChartComponent({
  data,
  dataKeys,
  className,
  height = 300,
}: RadarChartProps) {
  return (
    <div className={cn("chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} margin={CHART_MARGINS.compact}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 11, fill: "#6B7280" }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
          />
          {dataKeys.map((dk, index) => (
            <Radar
              key={dk.key}
              name={dk.name}
              dataKey={dk.key}
              stroke={dk.color}
              fill={dk.color}
              fillOpacity={0.3}
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION.duration}
              animationBegin={index * CHART_ANIMATION.staggerDelay}
            />
          ))}
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

