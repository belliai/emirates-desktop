"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { CHART_COLORS, CHART_ANIMATION, TOOLTIP_STYLE } from "@/lib/chart-theme";

// ============================================
// ULD Type Stacked Bar Chart
// ============================================

type ULDStackedBarProps = {
  data: Array<{
    name: string;
    akeDpe: number;
    alfDqf: number;
    ldPmcAmf: number;
    mdQ6Q7: number;
  }>;
  className?: string;
  height?: number;
};

export function ULDStackedBar({
  data,
  className,
  height = 280,
}: ULDStackedBarProps) {
  // Sort by total descending
  const sortedData = [...data].sort((a, b) => {
    const totalA = a.akeDpe + a.alfDqf + a.ldPmcAmf + a.mdQ6Q7;
    const totalB = b.akeDpe + b.alfDqf + b.ldPmcAmf + b.mdQ6Q7;
    return totalB - totalA;
  });

  const dataKeys = [
    { key: "akeDpe", name: "AKE/DPE", color: CHART_COLORS.uld.pmc },
    { key: "alfDqf", name: "ALF/DQF", color: CHART_COLORS.uld.ake },
    { key: "ldPmcAmf", name: "LD-PMC/AMF", color: CHART_COLORS.uld.alf },
    { key: "mdQ6Q7", name: "MD/Q6/Q7", color: CHART_COLORS.uld.bulk },
  ];

  return (
    <div className={cn("chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E5E7EB"
            horizontal={false}
          />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#374151" }}
            width={90}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
            iconType="circle"
            iconSize={8}
          />
          {dataKeys.map((dk, index) => (
            <Bar
              key={dk.key}
              dataKey={dk.key}
              name={dk.name}
              stackId="stack"
              fill={dk.color}
              radius={
                index === dataKeys.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]
              }
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION.duration}
              animationBegin={index * 100}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

