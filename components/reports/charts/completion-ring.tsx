"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import {
  CHART_ANIMATION,
  getCompletionColor,
  formatPercent,
} from "@/lib/chart-theme";

// ============================================
// Completion Ring Component
// ============================================

type CompletionRingProps = {
  percentage: number;
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showPercentage?: boolean;
};

export function CompletionRing({
  percentage,
  label,
  size = "md",
  className,
  showPercentage = true,
}: CompletionRingProps) {
  const color = getCompletionColor(percentage);

  const sizeConfig = {
    sm: {
      width: 80,
      height: 80,
      innerRadius: 25,
      outerRadius: 35,
      fontSize: "text-sm",
    },
    md: {
      width: 120,
      height: 120,
      innerRadius: 40,
      outerRadius: 55,
      fontSize: "text-xl",
    },
    lg: {
      width: 180,
      height: 180,
      innerRadius: 60,
      outerRadius: 80,
      fontSize: "text-3xl",
    },
    xl: {
      width: 240,
      height: 240,
      innerRadius: 80,
      outerRadius: 110,
      fontSize: "text-4xl",
    },
  };

  const config = sizeConfig[size];

  const data = [
    { name: "complete", value: percentage, fill: color },
    { name: "remaining", value: 100 - percentage, fill: "#E5E7EB" },
  ];

  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: config.width, height: config.height }}
    >
      <ResponsiveContainer width={config.width} height={config.height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={config.innerRadius}
            outerRadius={config.outerRadius}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        {showPercentage && (
          <div className={cn("font-bold", config.fontSize)} style={{ color }}>
            {formatPercent(percentage)}
          </div>
        )}
        {label && <div className="text-xs text-gray-500 mt-1">{label}</div>}
      </div>
    </div>
  );
}

