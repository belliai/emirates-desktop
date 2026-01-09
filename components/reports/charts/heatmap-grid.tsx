"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// Heatmap Grid Component
// ============================================

type HeatmapProps = {
  data: Array<{ hour: string; value: number }>;
  maxValue?: number;
  className?: string;
};

export function HeatmapGrid({ data, maxValue, className }: HeatmapProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value));

  const getIntensity = (value: number) => {
    const ratio = value / max;
    if (ratio >= 0.8) return "bg-red-600";
    if (ratio >= 0.6) return "bg-red-500";
    if (ratio >= 0.4) return "bg-red-400";
    if (ratio >= 0.2) return "bg-red-300";
    if (ratio > 0) return "bg-red-200";
    return "bg-gray-100";
  };

  return (
    <div className={cn("chart-animate-in", className)}>
      <div className="grid grid-cols-12 gap-1">
        {data.map((item, index) => (
          <div
            key={index}
            className={cn(
              "aspect-square rounded flex items-center justify-center text-[10px] font-medium transition-all hover:scale-110",
              getIntensity(item.value),
              item.value > 0 ? "text-white" : "text-gray-400"
            )}
            title={`${item.hour}: ${item.value} ULDs`}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            {item.value > 0 ? item.value : ""}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

// ============================================
// Enhanced Heatmap with Hour Labels
// ============================================

type EnhancedHeatmapProps = {
  data: Array<{ hour: string; label?: string; value: number }>;
  maxValue?: number;
  className?: string;
  showLabels?: boolean;
  title?: string;
};

export function EnhancedHeatmapGrid({
  data,
  maxValue,
  className,
  showLabels = true,
  title,
}: EnhancedHeatmapProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  const getIntensity = (value: number) => {
    const ratio = value / max;
    if (ratio >= 0.8) return "bg-red-700 text-white";
    if (ratio >= 0.6) return "bg-red-600 text-white";
    if (ratio >= 0.4) return "bg-red-500 text-white";
    if (ratio >= 0.2) return "bg-red-400 text-white";
    if (ratio > 0) return "bg-red-200 text-red-900";
    return "bg-gray-100 text-gray-400";
  };

  return (
    <div className={cn("chart-animate-in", className)}>
      {title && (
        <div className="text-xs font-medium text-gray-500 mb-2">{title}</div>
      )}
      <div className="grid grid-cols-12 gap-1.5">
        {data.slice(0, 24).map((item, index) => (
          <div
            key={index}
            className={cn(
              "aspect-square rounded-md flex flex-col items-center justify-center transition-all hover:scale-110 hover:shadow-lg cursor-pointer",
              getIntensity(item.value)
            )}
            title={`${item.hour}: ${item.value} ULDs`}
            style={{
              animationDelay: `${index * 30}ms`,
              animation: `heatmapPulse 0.4s ease-out ${index * 30}ms both`,
            }}
          >
            <span className="text-[11px] font-semibold">
              {item.value > 0 ? item.value : "-"}
            </span>
            {showLabels && (
              <span className="text-[8px] opacity-70">{item.hour}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4 px-1">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>Low</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded bg-gray-100" />
            <div className="w-3 h-3 rounded bg-red-200" />
            <div className="w-3 h-3 rounded bg-red-400" />
            <div className="w-3 h-3 rounded bg-red-600" />
            <div className="w-3 h-3 rounded bg-red-700" />
          </div>
          <span>High</span>
        </div>
        <span className="text-xs text-gray-400">ULDs per hour</span>
      </div>
    </div>
  );
}

