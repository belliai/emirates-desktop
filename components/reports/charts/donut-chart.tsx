"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  CHART_COLORS,
  CHART_ANIMATION,
  TOOLTIP_STYLE,
  formatNumber,
  formatPercent,
} from "@/lib/chart-theme";

// ============================================
// Donut Chart Component
// ============================================

type DonutChartProps = {
  data: Array<{ name: string; value: number; color?: string }>;
  centerLabel?: string;
  centerValue?: string | number;
  showLegend?: boolean;
  className?: string;
  height?: number;
};

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  showLegend = true,
  className,
  height = 250,
}: DonutChartProps) {
  const colors = [
    CHART_COLORS.uld.pmc,
    CHART_COLORS.uld.ake,
    CHART_COLORS.uld.alf,
    CHART_COLORS.uld.bulk,
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn("relative chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || colors[index % colors.length]}
                stroke="none"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
            formatter={(value: number, name: string) => [
              `${formatNumber(value)} (${formatPercent(
                (value / total) * 100,
                1
              )})`,
              name,
            ]}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-gray-600">{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="text-center"
            style={{ marginTop: showLegend ? "-18px" : 0 }}
          >
            {centerValue && (
              <div className="text-2xl font-bold text-gray-900">
                {centerValue}
              </div>
            )}
            {centerLabel && (
              <div className="text-xs text-gray-500">{centerLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Animated Donut Chart (with glow effect)
// ============================================

type AnimatedDonutProps = {
  data: Array<{ name: string; value: number; color?: string }>;
  centerLabel?: string;
  centerValue?: string | number;
  showLegend?: boolean;
  className?: string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  glowEffect?: boolean;
};

export function AnimatedDonutChart({
  data,
  centerLabel,
  centerValue,
  showLegend = true,
  className,
  height = 280,
  innerRadius = 70,
  outerRadius = 100,
  glowEffect = true,
}: AnimatedDonutProps) {
  const colors = [
    CHART_COLORS.uld.pmc,
    CHART_COLORS.uld.ake,
    CHART_COLORS.uld.alf,
    CHART_COLORS.uld.bulk,
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn("relative chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <defs>
            {data.map((entry, index) => {
              const color = entry.color || colors[index % colors.length];
              return (
                <filter key={`glow-${index}`} id={`glow-${index}`}>
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="3"
                    floodColor={color}
                    floodOpacity="0.5"
                  />
                </filter>
              );
            })}
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="value"
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
            animationBegin={0}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || colors[index % colors.length]}
                stroke="none"
                style={{
                  filter: glowEffect ? `url(#glow-${index})` : undefined,
                  transition: "all 0.3s ease",
                }}
                className="hover:opacity-80 cursor-pointer"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
            formatter={(value: number, name: string) => [
              `${formatNumber(value)} (${formatPercent(
                (value / total) * 100,
                1
              )})`,
              name,
            ]}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={10}
              formatter={(value) => (
                <span className="text-xs text-gray-600">{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="text-center"
            style={{ marginTop: showLegend ? "-36px" : 0 }}
          >
            {centerValue && (
              <div className="text-3xl font-bold text-gray-900 animate-pulse-slow">
                {centerValue}
              </div>
            )}
            {centerLabel && (
              <div className="text-sm text-gray-500">{centerLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

