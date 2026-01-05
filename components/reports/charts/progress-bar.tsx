"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/chart-theme";

// ============================================
// Progress Bar Component
// ============================================

type ProgressBarProps = {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  size = "md",
  variant = "default",
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  const variantClasses = {
    default: "progress-emirates-fill",
    success: "progress-success",
    warning: "progress-warning",
    danger: "progress-danger",
  };

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-gray-600">{label}</span>}
          {showValue && (
            <span className="text-xs font-medium text-gray-900">
              {formatNumber(value)} / {formatNumber(max)}
            </span>
          )}
        </div>
      )}
      <div className={cn("progress-emirates", sizeClasses[size])}>
        <div
          className={cn(variantClasses[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

