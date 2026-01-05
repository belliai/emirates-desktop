"use client";

import * as React from "react";
import { useState } from "react";
import { Treemap, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import {
  CHART_COLORS,
  CHART_ANIMATION,
  TOOLTIP_STYLE,
} from "@/lib/chart-theme";
import { tooltipContainerClass } from "./chart-tooltip";

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

// ============================================
// Work Area Categories and Colors
// ============================================

// Work area category types
export type WorkAreaCategory =
  | "buildup"
  | "breakdown"
  | "acceptance"
  | "delivery"
  | "per"
  | "pil"
  | "screening"
  | "inspection";

// Category colors matching the floor layout legend
export const WORK_AREA_COLORS: Record<WorkAreaCategory, string> = {
  buildup: "#DC2626", // Red - Build up
  breakdown: "#3B82F6", // Blue - Breakdown
  acceptance: "#EC4899", // Pink - Acceptance
  delivery: "#06B6D4", // Cyan - Delivery
  per: "#22C55E", // Green - PER
  pil: "#84CC16", // Lime - PIL
  screening: "#8B5CF6", // Purple - Screening
  inspection: "#F59E0B", // Amber - Inspection
};

// Work area data type
export type WorkAreaData = {
  name: string;
  shortName?: string;
  total: number;
  completed: number;
  floor: "Ground" | "1st";
  category: WorkAreaCategory;
};

type WorkAreaTreemapProps = {
  data: WorkAreaData[];
  className?: string;
  height?: number;
};

// Completion status colors (green/amber/red)
const COMPLETION_STATUS_COLORS = {
  onTrack: "#22C55E", // Green - 80%+
  inProgress: "#F59E0B", // Amber - 40-80%
  behind: "#EF4444", // Red - <40%
};

// Get completion status color based on percentage
function getCompletionStatusColor(percentage: number): string {
  if (percentage >= 80) return COMPLETION_STATUS_COLORS.onTrack;
  if (percentage >= 40) return COMPLETION_STATUS_COLORS.inProgress;
  return COMPLETION_STATUS_COLORS.behind;
}

// Work area cell component
function WorkAreaCell({
  area,
  index,
  isHovered,
  onHover,
  onLeave,
}: {
  area: WorkAreaData;
  index: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const completionRate = area.total > 0 ? area.completed / area.total : 0;
  const completionPercentage = Math.round(completionRate * 100);
  const baseColor = WORK_AREA_COLORS[area.category];
  const statusColor = getCompletionStatusColor(completionPercentage);
  // Opacity based on completion: 0.3 (not started) to 1.0 (complete)
  const opacity = 0.3 + completionRate * 0.7;

  // Flex grow based on total ULDs - larger areas get more space
  // Min width ensures readability, flex-grow allows filling available space
  const minWidth = 80; // Minimum width in pixels
  const flexGrow = area.total; // Proportional to total ULDs

  return (
    <div
      className={cn(
        "relative rounded-lg p-2 sm:p-3 flex flex-col justify-between cursor-pointer",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.02] hover:shadow-lg hover:z-10",
        isHovered && "ring-2 ring-white ring-offset-2"
      )}
      style={{
        backgroundColor: baseColor,
        opacity: isHovered ? 1 : opacity,
        minHeight: "70px",
        minWidth: `${minWidth}px`,
        flexGrow: flexGrow,
        flexShrink: 1,
        flexBasis: `${minWidth}px`,
        animation: `fadeSlideIn 0.4s ease-out ${index * 50}ms both`,
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="flex flex-col h-full justify-between">
        <div
          className="text-white font-semibold text-xs sm:text-sm leading-tight truncate"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
        >
          {area.shortName || area.name}
        </div>
        <div className="mt-auto">
          <div className="text-white/90 text-[10px] sm:text-xs font-medium">
            {area.completed}/{area.total} ULDs
          </div>
          <div className="flex items-center gap-1 text-white/90 text-[9px] sm:text-[10px]">
            <span
              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusColor }}
            />
            <span>{completionPercentage}%</span>
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-lg overflow-hidden">
        <div
          className="h-full bg-white/50 transition-all duration-500"
          style={{ width: `${completionRate * 100}%` }}
        />
      </div>
    </div>
  );
}

// Tooltip component for work area
function WorkAreaTooltipContent({ area }: { area: WorkAreaData | null }) {
  if (!area) return null;

  const completionRate =
    area.total > 0 ? Math.round((area.completed / area.total) * 100) : 0;
  const categoryColor = WORK_AREA_COLORS[area.category];
  const statusColor = getCompletionStatusColor(completionRate);
  const statusLabel =
    completionRate >= 80
      ? "On Track"
      : completionRate >= 40
      ? "In Progress"
      : "Behind";
  const categoryLabel =
    area.category.charAt(0).toUpperCase() + area.category.slice(1);

  return (
    <div
      className={cn(
        tooltipContainerClass,
        "p-3 min-w-[180px] pointer-events-none"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: categoryColor }}
        />
        <span className="text-sm font-semibold text-gray-900">{area.name}</span>
      </div>
      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">
        {area.floor} Floor • {categoryLabel}
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Completed</span>
          <span className="font-semibold text-gray-900">
            {area.completed} ULDs
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Total</span>
          <span className="font-semibold text-gray-900">{area.total} ULDs</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Pending</span>
          <span className="font-semibold text-orange-600">
            {area.total - area.completed} ULDs
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-100 pt-1.5 mt-1.5">
          <span className="text-gray-500">Progress</span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <span className="font-bold" style={{ color: statusColor }}>
              {completionRate}%
            </span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Status</span>
          <span className="font-medium" style={{ color: statusColor }}>
            {statusLabel}
          </span>
        </div>
      </div>
      {/* Mini progress bar */}
      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${completionRate}%`,
            backgroundColor: categoryColor,
          }}
        />
      </div>
    </div>
  );
}

export function WorkAreaTreemap({ data, className }: WorkAreaTreemapProps) {
  const [hoveredArea, setHoveredArea] = useState<WorkAreaData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Group data by floor
  const groundFloorAreas = data.filter((area) => area.floor === "Ground");
  const firstFloorAreas = data.filter((area) => area.floor === "1st");

  // Calculate floor totals
  const groundTotal = groundFloorAreas.reduce((sum, a) => sum + a.total, 0);
  const groundCompleted = groundFloorAreas.reduce(
    (sum, a) => sum + a.completed,
    0
  );
  const firstTotal = firstFloorAreas.reduce((sum, a) => sum + a.total, 0);
  const firstCompleted = firstFloorAreas.reduce(
    (sum, a) => sum + a.completed,
    0
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Position relative to container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltipPosition({ x, y });
  };

  return (
    <div
      ref={containerRef}
      className={cn("chart-animate-in relative", className)}
      onMouseMove={handleMouseMove}
    >
      {/* Floor Layout Container - Scrollable on small screens */}
      <div className="space-y-4 overflow-x-auto pb-2">
        {/* 1st Floor Row */}
        <div style={{ minWidth: "fit-content" }}>
          {/* Floor Label - Small text on top */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide">
              1st Floor
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400">
              {firstCompleted}/{firstTotal} ULDs
            </span>
          </div>
          {/* Work Areas - full width */}
          <div className="flex gap-1.5 sm:gap-2 min-h-[80px] sm:min-h-[100px]">
            {firstFloorAreas.map((area, index) => (
              <WorkAreaCell
                key={area.name}
                area={area}
                index={index}
                isHovered={hoveredArea?.name === area.name}
                onHover={() => setHoveredArea(area)}
                onLeave={() => setHoveredArea(null)}
              />
            ))}
          </div>
        </div>

        {/* Ground Floor Row */}
        <div style={{ minWidth: "fit-content" }}>
          {/* Floor Label - Small text on top */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Ground Floor
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400">
              {groundCompleted}/{groundTotal} ULDs
            </span>
          </div>
          {/* Work Areas - full width */}
          <div className="flex gap-1.5 sm:gap-2 min-h-[80px] sm:min-h-[100px]">
            {groundFloorAreas.map((area, index) => (
              <WorkAreaCell
                key={area.name}
                area={area}
                index={index + firstFloorAreas.length}
                isHovered={hoveredArea?.name === area.name}
                onHover={() => setHoveredArea(area)}
                onLeave={() => setHoveredArea(null)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Tooltip - positioned relative to container */}
      {hoveredArea && (
        <div
          className="absolute z-50 pointer-events-none transition-opacity duration-150"
          style={{
            left: Math.min(
              tooltipPosition.x + 15,
              (containerRef.current?.offsetWidth ?? 400) - 200
            ),
            top: Math.max(tooltipPosition.y - 80, 0),
          }}
        >
          <WorkAreaTooltipContent area={hoveredArea} />
        </div>
      )}

      {/* Category Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-100 text-[10px] sm:text-xs">
        {Object.entries(WORK_AREA_COLORS).map(([category, color]) => (
          <div key={category} className="flex items-center gap-1 sm:gap-1.5">
            <div
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-600 capitalize">{category}</span>
          </div>
        ))}
      </div>

      {/* Completion Status Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-6 gap-y-1 mt-2 sm:mt-3 text-[9px] sm:text-[10px] text-gray-500">
        <span className="text-gray-400 hidden sm:inline">
          Completion status:
        </span>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: COMPLETION_STATUS_COLORS.onTrack }}
          />
          <span>On Track (80%+)</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: COMPLETION_STATUS_COLORS.inProgress }}
          />
          <span>In Progress (40-80%)</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: COMPLETION_STATUS_COLORS.behind }}
          />
          <span>Behind (&lt;40%)</span>
        </div>
      </div>
    </div>
  );
}
