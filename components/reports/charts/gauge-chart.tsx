"use client";

import * as React from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { CHART_COLORS, CHART_ANIMATION, formatNumber } from "@/lib/chart-theme";

// ============================================
// Efficiency Gauge Component
// ============================================

type GaugeChartProps = {
  value: number;
  maxValue?: number;
  label: string;
  subtitle?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  animationDelay?: number;
};

export function GaugeChart({
  value,
  maxValue = 100,
  label,
  subtitle,
  color = CHART_COLORS.team.ek,
  size = "md",
  className,
  animationDelay = 0,
}: GaugeChartProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);

  const sizeConfig = {
    sm: {
      width: 120,
      height: 120,
      innerRadius: 35,
      outerRadius: 50,
      fontSize: "text-lg",
    },
    md: {
      width: 160,
      height: 160,
      innerRadius: 50,
      outerRadius: 70,
      fontSize: "text-2xl",
    },
    lg: {
      width: 200,
      height: 200,
      innerRadius: 65,
      outerRadius: 90,
      fontSize: "text-3xl",
    },
  };

  const config = sizeConfig[size];

  const data = [
    { name: "value", value: percentage, fill: color },
    { name: "remainder", value: 100 - percentage, fill: "#E5E7EB" },
  ];

  return (
    <div
      className={cn("gauge-container chart-animate-scale", className)}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <ResponsiveContainer width={config.width} height={config.height}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius={config.innerRadius}
          outerRadius={config.outerRadius}
          barSize={10}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={5}
            background={{ fill: "#E5E7EB" }}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
            animationBegin={animationDelay}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="gauge-center-text">
        <div className={cn("gauge-value", config.fontSize)}>
          {formatNumber(value, 1)}
        </div>
        <div className="gauge-label">{label}</div>
        {subtitle && (
          <div className="text-[10px] text-gray-400 mt-0.5">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

