"use client";

import * as React from "react";
import { Treemap, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { CHART_COLORS, CHART_ANIMATION, TOOLTIP_STYLE } from "@/lib/chart-theme";

// ============================================
// Treemap Chart Component
// ============================================

type TreemapDataItem = {
  name: string;
  size: number;
  color?: string;
  children?: TreemapDataItem[];
};

type TreemapChartProps = {
  data: TreemapDataItem[];
  className?: string;
  height?: number;
  colorScale?: string[];
};

const CustomTreemapContent = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  size?: number;
  color?: string;
  index?: number;
}) => {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name,
    size,
    color,
    index = 0,
  } = props;

  if (width < 4 || height < 4) return null;

  const showName = width > 40 && height > 25;
  const showSize = width > 50 && height > 40;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color || CHART_COLORS.uld.pmc}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
        className="transition-all duration-200 hover:opacity-80"
        style={{
          animation: `treemapFadeIn 0.5s ease-out ${index * 50}ms both`,
        }}
      />
      {showName && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showSize ? 6 : 0)}
          textAnchor="middle"
          fill="#fff"
          fontSize={Math.min(12, width / 6)}
          fontWeight="600"
          className="pointer-events-none"
        >
          {name}
        </text>
      )}
      {showSize && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill="rgba(255,255,255,0.8)"
          fontSize={Math.min(10, width / 8)}
          className="pointer-events-none"
        >
          {size} ULDs
        </text>
      )}
    </g>
  );
};

export function TreemapChart({
  data,
  className,
  height = 300,
  colorScale = [
    CHART_COLORS.shift.earlyMorning,
    CHART_COLORS.shift.lateMorning,
    CHART_COLORS.shift.afternoon,
    CHART_COLORS.shift.night,
  ],
}: TreemapChartProps) {
  // Flatten the data and assign colors
  const flatData = data.map((item, index) => ({
    ...item,
    color: item.color || colorScale[index % colorScale.length],
  }));

  return (
    <div className={cn("chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={flatData}
          dataKey="size"
          stroke="#fff"
          fill={CHART_COLORS.uld.pmc}
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION.duration}
          content={<CustomTreemapContent />}
        >
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
            formatter={(value: number) => [`${value} ULDs`, "Workload"]}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

