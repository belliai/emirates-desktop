---
name: Enhance Reports Dashboard
overview: Add visually stunning, insightful charts to four reporting pages (Staff Performance, Shift Summary Report, Workload Visibility, Situational Awareness) to create a WOW factor for the Emirates POC demo on January 12th. Each page will receive 2-3 premium data visualizations using recharts.
todos:
  - id: chart-theme
    content: Create shared chart theme with Emirates branding and animations
    status: completed
  - id: staff-performance-bars
    content: "Staff Performance: Add efficiency horizontal bar chart with avg line"
    status: completed
    dependencies:
      - chart-theme
  - id: staff-performance-scatter
    content: "Staff Performance: Add productivity scatter plot (hours vs units)"
    status: completed
    dependencies:
      - chart-theme
  - id: staff-performance-uld
    content: "Staff Performance: Add ULD type breakdown stacked bars (PIL/PER)"
    status: completed
    dependencies:
      - chart-theme
  - id: staff-performance-layout
    content: "Staff Performance: Reorganize with dashboard header and chart cards"
    status: completed
  - id: shift-summary-gauges
    content: "Shift Summary: Add efficiency gauge dashboard (3 radial charts)"
    status: pending
    dependencies:
      - chart-theme
  - id: shift-summary-timeline
    content: "Shift Summary: Add ULD production stacked area chart"
    status: pending
    dependencies:
      - chart-theme
  - id: shift-summary-resources
    content: "Shift Summary: Add resource utilization comparison bars"
    status: pending
    dependencies:
      - chart-theme
  - id: shift-summary-layout
    content: "Shift Summary: Reorganize layout with dashboard header"
    status: pending
  - id: workload-treemap
    content: "Workload Visibility: Add flight workload treemap"
    status: pending
    dependencies:
      - chart-theme
  - id: workload-donut
    content: "Workload Visibility: Replace bar chart with animated donut"
    status: pending
    dependencies:
      - chart-theme
  - id: workload-heatmap
    content: "Workload Visibility: Add shift timeline heatmap"
    status: pending
    dependencies:
      - chart-theme
  - id: workload-layout
    content: "Workload Visibility: Reorganize into dashboard layout"
    status: pending
  - id: situational-ring
    content: "Situational Awareness: Add overall completion ring"
    status: pending
    dependencies:
      - chart-theme
  - id: situational-waterfall
    content: "Situational Awareness: Add flight completion bar chart"
    status: pending
    dependencies:
      - chart-theme
  - id: situational-radar
    content: "Situational Awareness: Add workload category radar"
    status: pending
    dependencies:
      - chart-theme
  - id: situational-layout
    content: "Situational Awareness: Add mission control header and tabs"
    status: pending
---

# Reports Dashboard Enhancement Plan

## Context

This is a POC demo for Emirates on Monday, January 12th. The priority is visual impact and flashiness over perfect functionality. We will enhance four reporting pages (milestones 1-4) with premium data visualizations.**Source**: [Notion Task - Spruce Up Interface](https://www.notion.so/belli-ai/8-spruce-up-interface-2df9e07d412b80f9a729ef7cba5f51ad)---

## Available Data Structures Summary

| Page | Key Data Available ||------|-------------------|| **Staff Performance** | Staff name, avatar, hours worked, units processed, efficiency (units/hr), EK/Outsource, flight count, ULD breakdown (AKE, ALF, PMC, etc.) || **Shift Summary** | Staff performance, ULD breakdowns (PMC/ALF/AKE), efficiency metrics, resources (planned vs actual), flight allocations || **Workload Visibility** | Load plans, ULD counts by type, flight times/routes, shift/period/wave data || **Situational Awareness** | Flight completion %, workload by category (GCR/PER/PIL), incoming workload, BCR completion |

## Charting Library

Using `recharts` (already integrated) with the existing Shadcn chart primitives from [`components/ui/chart.tsx`](components/ui/chart.tsx)---

## Milestone 1: Staff Performance Enhancement

**File**: [`components/performance-screen.tsx`](components/performance-screen.tsx)

### Data Analysis

**Available Data Structures:**

```typescript
type StaffPerformance = {
  id: number;
  staffName: string;
  avatar: string;
  staffNo: string;
  ekOutsource: string; // "EK" or outsource company
  totalHrs: number; // Hours worked
  totalUnits: number; // ULDs processed
  efficiency: number | string; // Units per hour
  // GCR-specific:
  flightCount?: number;
  deployment?: string;
  // PIL/PER-specific:
  akeDpe?: number; // AKE/DPE count
  alfDqf?: number; // ALF/DQF count
  ldPmcAmf?: number; // LD-PMC/AMF count
  mdQ6Q7?: number; // MD/Q6/Q7 count
  bulkKg?: number;
};
```

**Key Insights to Visualize:**

1. **Efficiency Ranking** - Who is performing above/below average
2. **Productivity Correlation** - Relationship between hours worked and output
3. **ULD Specialization** - What types of ULDs each staff handles (PIL/PER)

### Chart 1.1: Efficiency Leaderboard

**Type**: Horizontal Bar Chart with average reference line**Data Source**: `filteredStaff` sorted by efficiency**Visual Design**:

- Bars colored by performance tier (green = above avg, amber = avg, red = below avg)
- Dashed horizontal line showing team average
- Staff avatars on Y-axis labels
- Animated bars growing from left to right

**Insight**: Instantly see who's the most efficient and how individuals compare to team average

### Chart 1.2: Productivity Scatter Plot

**Type**: Scatter Chart with trend line**Data Source**: Each staff member as a data point**Axes**:

- X-axis: Total Hours worked
- Y-axis: Total Units processed

**Visual Design**:

- Point size by efficiency score
- Points colored by EK (red) vs Outsource (gray)
- Diagonal trend line showing expected output per hour
- Quadrant labels: "High Performers", "Overworked", "Underutilized"

**Insight**: Identify if staff are proportionally productive for their hours, spot burnout risks

### Chart 1.3: ULD Type Contribution (PIL/PER only)

**Type**: Stacked Horizontal Bar Chart**Data Source**: PIL/PER staff with `akeDpe`, `alfDqf`, `ldPmcAmf`, `mdQ6Q7` fields**Visual Design**:

- Each bar shows one staff member
- Stacked segments for each ULD type (color-coded)
- Total value at end of bar
- Legend with ULD type colors

**Insight**: Shows workload distribution and specialization across ULD types

### Layout Changes

- Add new "Performance Dashboard" section at top with KPI cards:
- Total Staff Active
- Average Efficiency
- Total Units Today
- Best Performer
- Charts displayed in 2-column grid below KPIs
- Existing table becomes secondary/expandable

---

## Milestone 2: Shift Summary Report Enhancement

**File**: [`components/shift-summary-report-screen.tsx`](components/shift-summary-report-screen.tsx)

### Data Analysis

**Available Data Structures:**

- `ULDBreakdown`: PMC/AMF, AKE/AKL, ALF/PLA counts by time window (EM/LM/AF)
- `EfficiencyData`: Efficiency percentage with targets
- `PlasticUsage`: Wrap/tray counts and usage
- `Resources`: Planned vs actual staff/operators/drivers
- `FlightData`: Flights handled with ETD, destination, ULD breakdown

**Key Insights:**

1. **Shift efficiency** - How well did the team perform vs targets
2. **Production flow** - When were ULDs built throughout the shift
3. **Resource utilization** - Was staffing aligned with workload

### Chart 2.1: Efficiency Gauge Dashboard

**Type**: Radial Bar Chart (Gauge style)**Data**: Shift efficiency metrics (actual vs target)**Visual**: Three circular gauges showing EK, TG, DL team efficiency with animated fills**Insight**: At-a-glance team performance comparison

### Chart 2.2: ULD Production Timeline

**Type**: Stacked Area Chart**Data**: ULD built counts by time window (EM/LM/AF) and type (PMC/ALF/AKE)**Visual**: Flowing gradient areas showing production over shift periods**Insight**: Identifies peak production periods and bottlenecks

### Chart 2.3: Resource Utilization Comparison

**Type**: Horizontal Bar Chart with variance indicators**Data**: Planned vs Actual resources (staff hours, operators, drivers)**Visual**: Side-by-side bars with red/green variance badges**Insight**: Quick identification of over/under-staffing

### Layout Changes

- Add a new "Dashboard Overview" section at the top with the three charts in a responsive grid
- Keep existing tabular data below in collapsible sections

---

## Milestone 3: Workload Visibility Enhancement

**File**: [`components/incoming-workload-screen.tsx`](components/incoming-workload-screen.tsx)

### Data Analysis

**Available Data Structures:**

- `LoadPlan`: Flight info with ULD counts, STD, routing
- `parseULDCount()`: Extracts PMC, AKE, ALF totals
- Shift/Period/Wave classification from flight times
- Work area filtering (GCR, PIL, PER)

**Key Insights:**

1. **Workload distribution** - Which flights have heaviest loads
2. **ULD composition** - Mix of container types
3. **Time-based patterns** - When workload peaks occur

### Chart 3.1: Flight Workload Treemap

**Type**: Treemap**Data**: Flights sized by ULD count, colored by shift period**Visual**: Nested rectangles with flight numbers and ULD counts**Insight**: Visual representation of workload distribution across flights

### Chart 3.2: ULD Type Donut with Center Stats

**Type**: Pie/Donut Chart with animated segments**Data**: PMC, AKE, ALF distribution with center showing total**Visual**: Animated segments on hover, glowing Emirates red accent**Insight**: Quick ULD type proportion overview

### Chart 3.3: Shift Timeline Heatmap

**Type**: Calendar Heatmap / Time Grid**Data**: ULD counts by hour across the day**Visual**: Color intensity grid (white to Emirates red) showing workload hotspots**Insight**: Identifies peak workload hours for staffing decisions

### Layout Changes

- Reorganize into a dashboard-style layout with charts prominently at top
- Replace the existing basic bar chart with the new Donut chart
- Flight table moves to bottom as supporting detail

---

## Milestone 4: Situational Awareness Enhancement

**File**: [`components/situational-awareness-screen.tsx`](components/situational-awareness-screen.tsx)

### Data Analysis

**Available Data Structures:**

- `FlightCompletion`: Planned vs marked ULDs per flight
- `workAreaData`: GCR, PER, PIL capacity and workload
- Incoming workload forecast
- BCR completion tracking

**Key Insights:**

1. **Overall progress** - Are we on track for the shift
2. **Flight-level status** - Which flights need attention
3. **Work area balance** - Is load distributed evenly

### Chart 4.1: Overall Completion Ring

**Type**: Radial Progress with animation**Data**: Overall ULD completion percentage across all flights**Visual**: Large animated ring with percentage in center, color transitions from red to green**Insight**: Instant shift health indicator

### Chart 4.2: Flight Completion Waterfall

**Type**: Horizontal Bar Chart with target lines**Data**: Each flight's completion % with planned vs actual ULDs**Visual**: Bars colored by status (green/amber/red), target line overlay**Insight**: Flight-level progress tracking at a glance

### Chart 4.3: Workload Category Radar

**Type**: Radar/Spider Chart**Data**: GCR, PER, PIL completion rates and capacity utilization**Visual**: Multi-axis chart comparing categories on common scale**Insight**: Balance check across work areas

### Layout Changes

- Add prominent "Mission Control" header section with Chart 4.1 as hero visual
- Convert collapsible sections to a tabbed interface for smoother navigation
- Add subtle background gradients for modern aesthetic

---

## Implementation Approach

### Shared Chart Styling

Created in [`lib/chart-theme.ts`](lib/chart-theme.ts):

- Emirates brand colors: `#D71A21` (primary red), with gradients
- Dark tooltip styling with glassmorphism effect
- Consistent animation timing (300ms ease-out)
- Responsive breakpoints

### Reusable Chart Components

Created in [`components/ui/dashboard-charts.tsx`](components/ui/dashboard-charts.tsx):

- `StatCard` - KPI display cards
- `GaugeChart` - Radial efficiency gauges
- `DonutChart` - Pie/donut with center stats
- `StackedAreaChart` - Time-series area charts
- `HorizontalBarChart` - Comparison bars
- `RadarChartComponent` - Multi-axis radar
- `CompletionRing` - Animated completion ring
- `HeatmapGrid` - Hour-by-hour intensity grid
- `ChartCard` - Wrapper with title/subtitle

### Animation Strategy

- Charts animate on mount with staggered delays
- Hover states reveal detailed tooltips
- Number counters animate on scroll into view

---

## File Changes Summary

| File | Changes ||------|---------|| `components/performance-screen.tsx` | Add 3 charts, new dashboard header, KPI cards || `components/shift-summary-report-screen.tsx` | Add 3 charts, new dashboard header || `components/incoming-workload-screen.tsx` | Add 3 charts, reorganize layout || `components/situational-awareness-screen.tsx` | Add 3 charts, new hero section || `lib/chart-theme.ts` | ✅ Created - Shared chart styling || `components/ui/dashboard-charts.tsx` | ✅ Created - Reusable chart components || `app/globals.css` | ✅ Updated - Chart animation keyframes |---

## Chart Style Reference (Shadcn UI)

Use the official [Shadcn Charts documentation](https://ui.shadcn.com/docs/components/chart) as the primary style reference. Key patterns to follow:

### Recommended Chart Types from Shadcn

| Chart Type | Shadcn Reference | Use Case in This Project ||------------|------------------|-------------------------|| **Bar Chart - Horizontal** | [Bar Charts](https://ui.shadcn.com/charts/bar) | Efficiency leaderboard (M1), Resource comparison (M2), Flight completion (M4) || **Scatter Chart** | Custom with recharts | Productivity scatter (M1) || **Stacked Bar** | [Bar Charts](https://ui.shadcn.com/charts/bar) | ULD type contribution (M1) || **Area Chart - Gradient** | [Area Charts](https://ui.shadcn.com/charts/area) | ULD Production Timeline (M2) || **Pie Chart - Donut** | [Pie Charts](https://ui.shadcn.com/charts/pie) | ULD Type distribution (M3) || **Radial Chart** | [Radial Charts](https://ui.shadcn.com/charts/radial) | Efficiency gauges (M2), Completion rings (M4) || **Radar Chart** | [Radar Charts](https://ui.shadcn.com/charts/radar) | Work area balance (M4) |

### Shadcn Chart Styling Patterns

1. **Card Wrapper**: All charts should be wrapped in a card with subtle border
```tsx
<Card>
  <CardHeader>
    <CardTitle>Chart Title</CardTitle>
    <CardDescription>Supporting text</CardDescription>
  </CardHeader>
  <CardContent>
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      {/* Chart here */}
    </ChartContainer>
  </CardContent>
  <CardFooter className="flex-col items-start gap-2 text-sm">
    <div className="flex gap-2 font-medium leading-none">
      Trending up by 5.2% <TrendingUp className="h-4 w-4" />
    </div>
  </CardFooter>
</Card>
```




2. **Chart Config Pattern**: Define colors using CSS variables for theme support
```tsx
const chartConfig = {
  pmc: { label: "PMC", color: "var(--chart-1)" },
  ake: { label: "AKE", color: "var(--chart-2)" },
  alf: { label: "ALF", color: "var(--chart-3)" },
} satisfies ChartConfig;
```




3. **Gradient Fills**: Use SVG linearGradient for premium look
```tsx
<defs>
  <linearGradient id="fillPmc" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="var(--color-pmc)" stopOpacity={0.8} />
    <stop offset="95%" stopColor="var(--color-pmc)" stopOpacity={0.1} />
  </linearGradient>
</defs>
```




4. **Custom Tooltips**: Use `ChartTooltipContent` from Shadcn for consistent styling
```tsx
<ChartTooltip content={<ChartTooltipContent />} />
```




### Emirates Brand Color Palette for Charts

```css
/* Primary Emirates Red gradient scale */
--chart-emirates-1: #d71a21; /* Primary red */
--chart-emirates-2: #b91c1c; /* Darker red */
--chart-emirates-3: #ef4444; /* Lighter red */
--chart-emirates-4: #f87171; /* Light red */
--chart-emirates-5: #fca5a5; /* Pale red */

/* Status colors */
--chart-success: #22c55e; /* Green - complete */
--chart-warning: #f59e0b; /* Amber - in progress */
--chart-danger: #ef4444; /* Red - behind */
```



### Animation Best Practices