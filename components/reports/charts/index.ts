// ============================================
// Reports Charts - Barrel Export
// ============================================

// Tooltip utilities (Tailwind classes)
export {
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
} from "./chart-tooltip";

// Card components
export { StatCard } from "./stat-card";
export { ChartCard } from "./chart-card";

// Gauge & Progress
export { GaugeChart } from "./gauge-chart";
export { CompletionRing } from "./completion-ring";
export { ProgressBar } from "./progress-bar";

// Pie & Donut
export { DonutChart, AnimatedDonutChart } from "./donut-chart";

// Bar Charts
export { HorizontalBarChart } from "./horizontal-bar-chart";
export { ULDStackedBar } from "./uld-stacked-bar";
export { EfficiencyLeaderboard } from "./efficiency-leaderboard";

// Area & Line
export { StackedAreaChart } from "./stacked-area-chart";

// Scatter
export { ProductivityScatter } from "./productivity-scatter";

// Radar
export { RadarChartComponent } from "./radar-chart";

// Treemap
export { TreemapChart, WorkAreaTreemap, WORK_AREA_COLORS } from "./treemap-chart";
export type { WorkAreaData, WorkAreaCategory } from "./treemap-chart";

// Heatmap
export { HeatmapGrid, EnhancedHeatmapGrid } from "./heatmap-grid";
