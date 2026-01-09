"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ============================================
// Stat Card Component
// ============================================

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: React.ReactNode;
  className?: string;
  variant?: "default" | "hero";
};

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  className,
  variant = "default",
}: StatCardProps) {
  const isPositive = trend && trend.value > 0;
  const isNegative = trend && trend.value < 0;

  if (variant === "hero") {
    return (
      <div className={cn("bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-4 text-white", className)}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm text-white/80 mt-1">{title}</div>
          </div>
          {icon && <div className="text-white/80">{icon}</div>}
        </div>
        {subtitle && (
          <div className="text-red-100 text-xs mt-3">{subtitle}</div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 p-4", className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      {(trend || subtitle) && (
        <div className="flex items-center justify-between mt-2">
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                isPositive && "text-green-600",
                isNegative && "text-red-600",
                !isPositive && !isNegative && "text-gray-500"
              )}
            >
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
              <span>
                {isPositive ? "+" : ""}
                {trend.value}% {trend.label}
              </span>
            </div>
          )}
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>
      )}
    </div>
  );
}

