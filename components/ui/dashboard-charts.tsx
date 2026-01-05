"use client";

// ============================================
// Dashboard Charts - Re-export from reports/charts
// ============================================
// This file re-exports all chart components from the new
// modular location at components/reports/charts for
// backward compatibility.
// ============================================

export {
  // Tooltip utilities (Tailwind classes)
  tooltipContainerClass,
  tooltipTitleClass,
  tooltipLabelClass,
  tooltipValueClass,
  PERFORMANCE_COLORS,
  getPerformanceColor,
  getPerformanceColorClass,
  SourceBadge,
  EfficiencyTooltipContent,
  ProductivityTooltipContent,
  // Legacy style exports for recharts compatibility
  tooltipContainerStyle,
  tooltipTitleStyle,
  tooltipLabelStyle,
  tooltipValueStyle,

  // Card components
  StatCard,
  ChartCard,

  // Gauge & Progress
  GaugeChart,
  CompletionRing,
  ProgressBar,

  // Pie & Donut
  DonutChart,
  AnimatedDonutChart,

  // Bar Charts
  HorizontalBarChart,
  ULDStackedBar,
  EfficiencyLeaderboard,

  // Area & Line
  StackedAreaChart,

  // Scatter
  ProductivityScatter,

  // Radar
  RadarChartComponent,

  // Treemap
  TreemapChart,

  // Heatmap
  HeatmapGrid,
  EnhancedHeatmapGrid,
} from "@/components/reports/charts";
