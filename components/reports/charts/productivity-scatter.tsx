"use client";

import * as React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { CHART_COLORS, CHART_ANIMATION } from "@/lib/chart-theme";
import {
  tooltipContainerClass,
  tooltipLabelClass,
  tooltipValueClass,
  SourceBadge,
  getPerformanceColorClass,
} from "./chart-tooltip";

// ============================================
// Productivity Scatter Chart
// ============================================

type ProductivityScatterProps = {
  data: Array<{
    name: string;
    hours: number;
    units: number;
    efficiency: number;
    isEK?: boolean;
  }>;
  className?: string;
  height?: number;
};

export function ProductivityScatter({
  data,
  className,
  height = 280,
}: ProductivityScatterProps) {
  // Calculate trend line (expected units per hour)
  const avgEfficiency =
    data.length > 0
      ? data.reduce((sum, d) => sum + d.efficiency, 0) / data.length
      : 3;

  return (
    <div className={cn("chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            type="number"
            dataKey="hours"
            name="Hours"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            domain={[0, "dataMax + 2"]}
            label={{
              value: "Hours Worked",
              position: "bottom",
              offset: 0,
              fontSize: 11,
              fill: "#6B7280",
            }}
          />
          <YAxis
            type="number"
            dataKey="units"
            name="Units"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            domain={[0, "dataMax + 10"]}
            label={{
              value: "Units Processed",
              angle: -90,
              position: "insideLeft",
              fontSize: 11,
              fill: "#6B7280",
            }}
          />
          <ZAxis type="number" dataKey="efficiency" range={[60, 200]} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                const d = payload[0].payload;
                const colorClass = getPerformanceColorClass(
                  d.efficiency,
                  avgEfficiency
                );
                return (
                  <div
                    className={cn(
                      tooltipContainerClass,
                      "px-3.5 py-2.5 min-w-[140px]"
                    )}
                  >
                    {/* Header: Name + Badge */}
                    <div className="flex items-center justify-between gap-2.5 mb-2">
                      <span className="text-[13px] font-semibold text-gray-900">
                        {d.name}
                      </span>
                      <SourceBadge isEK={d.isEK ?? false} />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <div>
                        <div className={tooltipLabelClass}>Hours</div>
                        <div className={tooltipValueClass}>{d.hours}h</div>
                      </div>
                      <div>
                        <div className={tooltipLabelClass}>Units</div>
                        <div className={tooltipValueClass}>{d.units}</div>
                      </div>
                    </div>

                    {/* Efficiency */}
                    <div className="border-t border-gray-100 pt-1.5">
                      <div className="flex items-center justify-between">
                        <span className={tooltipLabelClass}>Efficiency</span>
                        <div className="flex items-baseline gap-0.5">
                          <span
                            className={cn("text-[15px] font-bold", colorClass)}
                          >
                            {d.efficiency.toFixed(1)}
                          </span>
                          <span className="text-[9px] text-gray-400">u/hr</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {/* Trend line - expected performance */}
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 14, y: 14 * avgEfficiency },
            ]}
            stroke="#D71A21"
            strokeDasharray="5 5"
            strokeWidth={1}
            strokeOpacity={0.5}
          />
          <Scatter
            name="Staff"
            data={data}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isEK ? CHART_COLORS.team.ek : "#9CA3AF"}
                fillOpacity={0.8}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#D71A21]" />
          <span className="text-xs text-gray-600">EK Staff</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-xs text-gray-600">Outsource</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 border-t-2 border-dashed border-[#D71A21] opacity-50" />
          <span className="text-xs text-gray-600">Expected</span>
        </div>
      </div>
    </div>
  );
}
