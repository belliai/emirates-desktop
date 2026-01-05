"use client"

import * as React from "react"
import {
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
} from "recharts"
import { cn } from "@/lib/utils"
import {
  CHART_COLORS,
  CHART_ANIMATION,
  TOOLTIP_STYLE,
  CHART_MARGINS,
  getCompletionColor,
  formatPercent,
  formatNumber,
} from "@/lib/chart-theme"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

// ============================================
// Stat Card Component
// ============================================

type StatCardProps = {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    label: string
  }
  icon?: React.ReactNode
  className?: string
  variant?: "default" | "hero"
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  className,
  variant = "default",
}: StatCardProps) {
  const isPositive = trend && trend.value > 0
  const isNegative = trend && trend.value < 0

  if (variant === "hero") {
    return (
      <div className={cn("hero-stat chart-animate-in", className)}>
        <div className="flex items-center justify-between">
          <div>
            <div className="hero-stat-value">{value}</div>
            <div className="hero-stat-label">{title}</div>
          </div>
          {icon && <div className="text-white/80">{icon}</div>}
        </div>
        {subtitle && <div className="text-red-100 text-xs mt-3">{subtitle}</div>}
      </div>
    )
  }

  return (
    <div className={cn("stat-card chart-animate-in", className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="stat-card-label">{title}</div>
          <div className="stat-card-value">{value}</div>
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      {trend && (
        <div
          className={cn(
            "stat-card-trend",
            isPositive && "positive",
            isNegative && "negative",
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
      {subtitle && <div className="text-xs text-gray-500 mt-2">{subtitle}</div>}
    </div>
  )
}

// ============================================
// Efficiency Gauge Component
// ============================================

type GaugeChartProps = {
  value: number
  maxValue?: number
  label: string
  subtitle?: string
  color?: string
  size?: "sm" | "md" | "lg"
  className?: string
  animationDelay?: number
}

export function GaugeChart({
  value,
  maxValue = 100,
  label,
  subtitle,
  color = CHART_COLORS.team.ek,
  size = "md",
  className,
  animationDelay = 0,
}: GaugeChartProps) {
  const percentage = Math.min((value / maxValue) * 100, 100)
  
  const sizeConfig = {
    sm: { width: 120, height: 120, innerRadius: 35, outerRadius: 50, fontSize: "text-lg" },
    md: { width: 160, height: 160, innerRadius: 50, outerRadius: 70, fontSize: "text-2xl" },
    lg: { width: 200, height: 200, innerRadius: 65, outerRadius: 90, fontSize: "text-3xl" },
  }

  const config = sizeConfig[size]

  const data = [
    { name: "value", value: percentage, fill: color },
    { name: "remainder", value: 100 - percentage, fill: "#E5E7EB" },
  ]

  return (
    <div
      className={cn("gauge-container chart-animate-scale", className)}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <ResponsiveContainer width={config.width} height={config.height}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius={config.innerRadius}
          outerRadius={config.outerRadius}
          barSize={10}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={5}
            background={{ fill: "#E5E7EB" }}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
            animationBegin={animationDelay}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="gauge-center-text">
        <div className={cn("gauge-value", config.fontSize)}>{formatNumber(value, 1)}</div>
        <div className="gauge-label">{label}</div>
        {subtitle && <div className="text-[10px] text-gray-400 mt-0.5">{subtitle}</div>}
      </div>
    </div>
  )
}

// ============================================
// Donut Chart Component
// ============================================

type DonutChartProps = {
  data: Array<{ name: string; value: number; color?: string }>
  centerLabel?: string
  centerValue?: string | number
  showLegend?: boolean
  className?: string
  height?: number
}

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
  ]

  const total = data.reduce((sum, item) => sum + item.value, 0)

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
              `${formatNumber(value)} (${formatPercent((value / total) * 100, 1)})`,
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
          <div className="text-center" style={{ marginTop: showLegend ? "-18px" : 0 }}>
            {centerValue && (
              <div className="text-2xl font-bold text-gray-900">{centerValue}</div>
            )}
            {centerLabel && (
              <div className="text-xs text-gray-500">{centerLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Stacked Area Chart Component
// ============================================

type StackedAreaChartProps = {
  data: Array<Record<string, string | number>>
  dataKeys: Array<{ key: string; name: string; color: string }>
  xAxisKey: string
  className?: string
  height?: number
  showGrid?: boolean
}

export function StackedAreaChart({
  data,
  dataKeys,
  xAxisKey,
  className,
  height = 300,
  showGrid = true,
}: StackedAreaChartProps) {
  return (
    <div className={cn("chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={CHART_MARGINS.default}>
          <defs>
            {dataKeys.map((dk, index) => (
              <linearGradient
                key={dk.key}
                id={`gradient-${dk.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={dk.color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={dk.color} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            stroke="#9CA3AF"
          />
          <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} stroke="#9CA3AF" />
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
            iconType="circle"
            iconSize={8}
          />
          {dataKeys.map((dk, index) => (
            <Area
              key={dk.key}
              type="monotone"
              dataKey={dk.key}
              name={dk.name}
              stackId="1"
              stroke={dk.color}
              fill={`url(#gradient-${dk.key})`}
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION.duration}
              animationBegin={index * CHART_ANIMATION.staggerDelay}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================
// Horizontal Bar Chart Component
// ============================================

type HorizontalBarChartProps = {
  data: Array<{
    name: string
    planned?: number
    actual?: number
    value?: number
    color?: string
  }>
  showComparison?: boolean
  className?: string
  height?: number
}

export function HorizontalBarChart({
  data,
  showComparison = false,
  className,
  height = 300,
}: HorizontalBarChartProps) {
  return (
    <div className={cn("chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ ...CHART_MARGINS.default, left: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            width={70}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
          />
          {showComparison ? (
            <>
              <Bar
                dataKey="planned"
                name="Planned"
                fill={CHART_COLORS.uld.alf}
                radius={[0, 4, 4, 0]}
                isAnimationActive={true}
                animationDuration={CHART_ANIMATION.duration}
              />
              <Bar
                dataKey="actual"
                name="Actual"
                fill={CHART_COLORS.uld.pmc}
                radius={[0, 4, 4, 0]}
                isAnimationActive={true}
                animationDuration={CHART_ANIMATION.duration}
                animationBegin={CHART_ANIMATION.staggerDelay}
              />
            </>
          ) : (
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION.duration}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || CHART_COLORS.uld.pmc}
                />
              ))}
            </Bar>
          )}
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================
// Radar Chart Component
// ============================================

type RadarChartProps = {
  data: Array<{ subject: string; [key: string]: string | number }>
  dataKeys: Array<{ key: string; name: string; color: string }>
  className?: string
  height?: number
}

export function RadarChartComponent({
  data,
  dataKeys,
  className,
  height = 300,
}: RadarChartProps) {
  return (
    <div className={cn("chart-animate-in", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} margin={CHART_MARGINS.compact}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 11, fill: "#6B7280" }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
          />
          {dataKeys.map((dk, index) => (
            <Radar
              key={dk.key}
              name={dk.name}
              dataKey={dk.key}
              stroke={dk.color}
              fill={dk.color}
              fillOpacity={0.3}
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION.duration}
              animationBegin={index * CHART_ANIMATION.staggerDelay}
            />
          ))}
          <Tooltip
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================
// Completion Ring Component
// ============================================

type CompletionRingProps = {
  percentage: number
  label?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  showPercentage?: boolean
}

export function CompletionRing({
  percentage,
  label,
  size = "md",
  className,
  showPercentage = true,
}: CompletionRingProps) {
  const color = getCompletionColor(percentage)
  
  const sizeConfig = {
    sm: { width: 80, height: 80, innerRadius: 25, outerRadius: 35, fontSize: "text-sm" },
    md: { width: 120, height: 120, innerRadius: 40, outerRadius: 55, fontSize: "text-xl" },
    lg: { width: 180, height: 180, innerRadius: 60, outerRadius: 80, fontSize: "text-3xl" },
    xl: { width: 240, height: 240, innerRadius: 80, outerRadius: 110, fontSize: "text-4xl" },
  }

  const config = sizeConfig[size]

  const data = [
    { name: "complete", value: percentage, fill: color },
    { name: "remaining", value: 100 - percentage, fill: "#E5E7EB" },
  ]

  return (
    <div className={cn("gauge-container chart-animate-scale", className)}>
      <ResponsiveContainer width={config.width} height={config.height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={config.innerRadius}
            outerRadius={config.outerRadius}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="gauge-center-text">
        {showPercentage && (
          <div className={cn("font-bold", config.fontSize)} style={{ color }}>
            {formatPercent(percentage)}
          </div>
        )}
        {label && <div className="text-xs text-gray-500 mt-1">{label}</div>}
      </div>
    </div>
  )
}

// ============================================
// Heatmap Grid Component
// ============================================

type HeatmapProps = {
  data: Array<{ hour: string; value: number }>
  maxValue?: number
  className?: string
}

export function HeatmapGrid({ data, maxValue, className }: HeatmapProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value))

  const getIntensity = (value: number) => {
    const ratio = value / max
    if (ratio >= 0.8) return "bg-red-600"
    if (ratio >= 0.6) return "bg-red-500"
    if (ratio >= 0.4) return "bg-red-400"
    if (ratio >= 0.2) return "bg-red-300"
    if (ratio > 0) return "bg-red-200"
    return "bg-gray-100"
  }

  return (
    <div className={cn("chart-animate-in", className)}>
      <div className="grid grid-cols-12 gap-1">
        {data.map((item, index) => (
          <div
            key={index}
            className={cn(
              "aspect-square rounded flex items-center justify-center text-[10px] font-medium transition-all hover:scale-110",
              getIntensity(item.value),
              item.value > 0 ? "text-white" : "text-gray-400"
            )}
            title={`${item.hour}: ${item.value} ULDs`}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            {item.value > 0 ? item.value : ""}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  )
}

// ============================================
// Progress Bar Component
// ============================================

type ProgressBarProps = {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  size?: "sm" | "md" | "lg"
  variant?: "default" | "success" | "warning" | "danger"
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  size = "md",
  variant = "default",
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)
  
  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  }

  const variantClasses = {
    default: "progress-emirates-fill",
    success: "progress-success",
    warning: "progress-warning",
    danger: "progress-danger",
  }

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
  )
}

// ============================================
// Chart Card Wrapper
// ============================================

type ChartCardProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
  loading?: boolean
}

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
        {loading ? (
          <div className="chart-loading h-[200px]" />
        ) : (
          children
        )}
      </div>
    </div>
  )
}

