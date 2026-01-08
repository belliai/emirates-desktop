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
    <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm", className)}>
      <div className="px-6 pt-5 pb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-6 pb-5">
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
