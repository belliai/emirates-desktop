"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// Chart Card Wrapper
// ============================================

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  loading?: boolean;
};

export function ChartCard({
  title,
  subtitle,
  children,
  action,
  className,
  loading = false,
}: ChartCardProps) {
  return (
    <div className={cn("chart-card chart-animate-in", className)}>
      <div className="chart-card-header flex items-center justify-between">
        <div>
          <h3 className="chart-card-title">{title}</h3>
          {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="chart-card-content">
        {loading ? <div className="chart-loading h-[200px]" /> : children}
      </div>
    </div>
  );
}

