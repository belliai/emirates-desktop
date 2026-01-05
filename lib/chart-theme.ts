/**
 * Emirates Brand Chart Theme
 * Shared styling configuration for all dashboard charts
 */

import type { ChartConfig } from "@/components/ui/chart"

// Emirates Brand Colors
export const EMIRATES_COLORS = {
  // Primary red scale
  red: {
    DEFAULT: "#D71A21",
    dark: "#B91C1C",
    light: "#EF4444",
    lighter: "#F87171",
    lightest: "#FCA5A5",
    pale: "#FEE2E2",
  },
  // Status colors
  status: {
    success: "#22C55E",
    successLight: "#86EFAC",
    warning: "#F59E0B",
    warningLight: "#FCD34D",
    danger: "#EF4444",
    dangerLight: "#FCA5A5",
  },
  // Neutral
  neutral: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
} as const

// Chart color schemes for different chart types
export const CHART_COLORS = {
  // ULD Type breakdown colors (PMC, AKE, ALF etc.)
  uld: {
    pmc: "#D71A21",      // Emirates red
    ake: "#EF4444",      // Light red
    alf: "#F87171",      // Lighter red
    bulk: "#FCA5A5",     // Pale red
    total: "#B91C1C",    // Dark red
  },
  // Completion status colors
  completion: {
    complete: "#22C55E",    // Green
    inProgress: "#F59E0B",  // Amber
    notStarted: "#EF4444",  // Red
    overdue: "#DC2626",     // Dark red
  },
  // Work area colors
  workArea: {
    gcr: "#D71A21",      // Emirates red
    per: "#7C3AED",      // Purple
    pil: "#2563EB",      // Blue
  },
  // Team colors for efficiency charts
  team: {
    ek: "#D71A21",       // Emirates red
    tg: "#F59E0B",       // Amber/Gold
    dl: "#3B82F6",       // Blue
    dpWorld: "#8B5CF6",  // Purple
  },
  // Shift period colors
  shift: {
    earlyMorning: "#F87171",
    lateMorning: "#D71A21",
    afternoon: "#B91C1C",
    night: "#7F1D1D",
  },
} as const

// Common chart configurations
export const createULDChartConfig = (): ChartConfig => ({
  pmc: {
    label: "PMC/AMF",
    color: CHART_COLORS.uld.pmc,
  },
  ake: {
    label: "AKE/AKL",
    color: CHART_COLORS.uld.ake,
  },
  alf: {
    label: "ALF/PLA",
    color: CHART_COLORS.uld.alf,
  },
  bulk: {
    label: "Bulk",
    color: CHART_COLORS.uld.bulk,
  },
  total: {
    label: "Total",
    color: CHART_COLORS.uld.total,
  },
})

export const createCompletionChartConfig = (): ChartConfig => ({
  complete: {
    label: "Complete",
    color: CHART_COLORS.completion.complete,
  },
  inProgress: {
    label: "In Progress",
    color: CHART_COLORS.completion.inProgress,
  },
  notStarted: {
    label: "Not Started",
    color: CHART_COLORS.completion.notStarted,
  },
})

export const createTeamChartConfig = (): ChartConfig => ({
  ek: {
    label: "EK Team",
    color: CHART_COLORS.team.ek,
  },
  tg: {
    label: "TG Team",
    color: CHART_COLORS.team.tg,
  },
  dl: {
    label: "DL Team",
    color: CHART_COLORS.team.dl,
  },
  dpWorld: {
    label: "DP World",
    color: CHART_COLORS.team.dpWorld,
  },
})

export const createWorkAreaChartConfig = (): ChartConfig => ({
  gcr: {
    label: "GCR",
    color: CHART_COLORS.workArea.gcr,
  },
  per: {
    label: "PER",
    color: CHART_COLORS.workArea.per,
  },
  pil: {
    label: "PIL",
    color: CHART_COLORS.workArea.pil,
  },
})

// Animation settings
export const CHART_ANIMATION = {
  duration: 800,
  delay: 0,
  easing: "ease-out",
  // Stagger delay for multiple charts
  staggerDelay: 200,
} as const

// Tooltip styling (clean white style like shadcn)
export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#ffffff",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
    padding: "8px 12px",
  },
  labelStyle: {
    color: "#111827",
    fontWeight: "600",
    marginBottom: "4px",
    fontSize: "13px",
  },
  itemStyle: {
    color: "#6B7280",
    fontSize: "12px",
  },
} as const

// Common chart margins
export const CHART_MARGINS = {
  compact: { top: 10, right: 10, left: 0, bottom: 10 },
  default: { top: 20, right: 20, left: 20, bottom: 20 },
  withLegend: { top: 20, right: 20, left: 20, bottom: 60 },
  dashboard: { top: 5, right: 5, left: 5, bottom: 5 },
} as const

// Gradient definitions for SVG charts
export const createGradientDef = (id: string, color: string, opacity = { start: 0.8, end: 0.1 }) => ({
  id,
  x1: "0",
  y1: "0",
  x2: "0",
  y2: "1",
  stops: [
    { offset: "5%", stopColor: color, stopOpacity: opacity.start },
    { offset: "95%", stopColor: color, stopOpacity: opacity.end },
  ],
})

// Helper to get completion status color
export function getCompletionColor(percentage: number): string {
  if (percentage >= 80) return CHART_COLORS.completion.complete
  if (percentage >= 50) return CHART_COLORS.completion.inProgress
  return CHART_COLORS.completion.notStarted
}

// Helper to get completion status
export function getCompletionStatus(percentage: number): "green" | "amber" | "red" {
  if (percentage >= 80) return "green"
  if (percentage >= 50) return "amber"
  return "red"
}

// Format number for display
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// Format percentage
export function formatPercent(value: number, decimals = 0): string {
  return `${formatNumber(value, decimals)}%`
}

// Generate chart data point with animation delay
export function withAnimationDelay<T extends object>(data: T[], baseDelay = 0): (T & { animationDelay: number })[] {
  return data.map((item, index) => ({
    ...item,
    animationDelay: baseDelay + index * CHART_ANIMATION.staggerDelay,
  }))
}

