"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// Tooltip CSS Classes
// ============================================

export const tooltipContainerClass =
  "bg-white border border-gray-200 rounded-lg shadow-sm";

export const tooltipTitleClass =
  "text-xs font-semibold text-gray-900 mb-1";

export const tooltipLabelClass =
  "text-[9px] text-gray-400 uppercase tracking-wide";

export const tooltipValueClass =
  "text-sm font-semibold text-gray-700";

// ============================================
// Performance Colors
// ============================================

export const PERFORMANCE_COLORS = {
  above: "text-green-500",
  near: "text-amber-500",
  below: "text-red-500",
} as const;

export function getPerformanceColorClass(
  value: number,
  average: number
): string {
  if (value >= average) return PERFORMANCE_COLORS.above;
  if (value >= average * 0.8) return PERFORMANCE_COLORS.near;
  return PERFORMANCE_COLORS.below;
}

// Legacy: keep hex colors for recharts that require them
export function getPerformanceColor(
  value: number,
  average: number
): string {
  if (value >= average) return "#22C55E";
  if (value >= average * 0.8) return "#F59E0B";
  return "#EF4444";
}

// ============================================
// Staff Source Badge Component
// ============================================

type SourceBadgeProps = {
  isEK: boolean;
  className?: string;
};

export function SourceBadge({ isEK, className }: SourceBadgeProps) {
  return (
    <span
      className={cn(
        "text-[9px] font-semibold px-1.5 py-0.5 rounded",
        isEK ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500",
        className
      )}
    >
      {isEK ? "EK" : "Outsource"}
    </span>
  );
}

// ============================================
// Efficiency Tooltip Content
// ============================================

type EfficiencyTooltipProps = {
  name: string;
  efficiency: number;
  averageValue: number;
};

export function EfficiencyTooltipContent({
  name,
  efficiency,
  averageValue,
}: EfficiencyTooltipProps) {
  const colorClass = getPerformanceColorClass(efficiency, averageValue);

  return (
    <div className={cn(tooltipContainerClass, "px-3 py-2")}>
      <p className={tooltipTitleClass}>{name}</p>
      <div className="flex items-center gap-1.5">
        <span className={cn("text-base font-bold", colorClass)}>
          {efficiency.toFixed(1)}
        </span>
        <span className="text-[10px] text-gray-400">units/hr</span>
      </div>
    </div>
  );
}

// ============================================
// Productivity Tooltip Content
// ============================================

type ProductivityTooltipProps = {
  name: string;
  hours: number;
  units: number;
  efficiency: number;
  isEK: boolean;
  averageEfficiency: number;
};

export function ProductivityTooltipContent({
  name,
  hours,
  units,
  efficiency,
  isEK,
  averageEfficiency,
}: ProductivityTooltipProps) {
  const colorClass = getPerformanceColorClass(efficiency, averageEfficiency);

  return (
    <div className={cn(tooltipContainerClass, "px-3.5 py-2.5 min-w-[140px]")}>
      {/* Header: Name + Badge */}
      <div className="flex items-center justify-between gap-2.5 mb-2">
        <span className="text-[13px] font-semibold text-gray-900">{name}</span>
        <SourceBadge isEK={isEK} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div>
          <div className={tooltipLabelClass}>Hours</div>
          <div className={tooltipValueClass}>{hours}h</div>
        </div>
        <div>
          <div className={tooltipLabelClass}>Units</div>
          <div className={tooltipValueClass}>{units}</div>
        </div>
      </div>

      {/* Efficiency */}
      <div className="border-t border-gray-100 pt-1.5">
        <div className="flex items-center justify-between">
          <span className={tooltipLabelClass}>Efficiency</span>
          <div className="flex items-baseline gap-0.5">
            <span className={cn("text-[15px] font-bold", colorClass)}>
              {efficiency.toFixed(1)}
            </span>
            <span className="text-[9px] text-gray-400">u/hr</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Legacy style exports for backward compatibility
// (Some recharts components require CSSProperties)
// ============================================

export const tooltipContainerStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

export const tooltipTitleStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#111827",
  marginBottom: "4px",
};

export const tooltipLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  color: "#9CA3AF",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

export const tooltipValueStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#374151",
};
