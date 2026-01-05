---
name: Enhance Reports Dashboard
overview: Add visually stunning, insightful charts to four reporting pages (Staff Performance, Shift Summary Report, Workload Visibility, Situational Awareness) to create a WOW factor for the Emirates POC demo on January 12th. Each page will receive 2-3 premium data visualizations using recharts.
todos:
  - id: chart-theme
    content: Create shared chart theme with Emirates branding and animations
    status: completed
  - id: staff-performance-bars
    content: "M1: Add efficiency horizontal bar chart with avg line"
    status: completed
  - id: staff-performance-scatter
    content: "M1: Add productivity scatter plot (hours vs units)"
    status: completed
  - id: staff-performance-uld
    content: "M1: Add ULD type breakdown stacked bars (PIL/PER)"
    status: completed
  - id: staff-performance-layout
    content: "M1: Reorganize with dashboard header and chart cards"
    status: completed
  - id: staff-performance-contact
    content: "M1 REQ: Display staff contact numbers in table"
    status: completed
  - id: shift-summary-gauges
    content: "M2: Add efficiency gauge dashboard (3 radial charts)"
    status: completed
  - id: shift-summary-timeline
    content: "M2: Add ULD production stacked area chart"
    status: completed
  - id: shift-summary-resources
    content: "M2: Add resource utilization comparison bars"
    status: completed
  - id: shift-summary-layout
    content: "M2: Reorganize layout with dashboard header"
    status: completed
  - id: shift-summary-pending
    content: "M2 REQ: Add Pending for Next Shift summary section"
    status: completed
  - id: shift-summary-halfbuild
    content: "M2 REQ: Add half-build/incomplete ULD indicators"
    status: completed
  - id: workload-treemap
    content: "M3: Add Work Area Treemap with completion-based coloring"
    status: completed
  - id: workload-treemap-data
    content: "M3: Add mock data for warehouse zones (Ground/1st floor)"
    status: completed
  - id: workload-layout
    content: "M3: Integrate treemap into dashboard layout"
    status: completed
  - id: situational-ring
    content: "M4: Add overall completion ring"
    status: completed
  - id: situational-bars
    content: "M4: Add flight completion bar chart"
    status: completed
  - id: situational-radar
    content: "M4: Add workload category radar"
    status: completed
  - id: situational-layout
    content: "M4: Add mission control header and tabs"
    status: completed
  - id: situational-uld-pending
    content: "M4 REQ: Add prominent ULD Completed vs Pending card"
    status: completed
  - id: situational-drilldown
    content: "M4 REQ: Enhance flight status drill-down interaction"
    status: completed
  - id: situational-advance-planned
    content: "M4: Add Advance Planned vs Built stacked bar chart"
    status: completed
  - id: situational-incoming
    content: "M4: Add Incoming Workload timeline/area chart"
    status: completed
  - id: situational-shift-filter
    content: "M4: Add shift toggle filter (9am-9pm / 9pm-9am)"
    status: completed
  - id: situational-all-shifts
    content: "M4: Add all-shifts workload view with flight rows"
    status: completed
---

# Reports Dashboard Enhancement Plan

## Context

This is a POC demo for Emirates on Monday, January 12th. The priority is visual impact and flashiness over perfect functionality.**Source**: [Notion Task - Spruce Up Interface](https://www.notion.so/belli-ai/8-spruce-up-interface-2df9e07d412b80f9a729ef7cba5f51ad)---

## Requirements Gap Analysis Summary

### Requirements Already Covered

| Requirement | Location || ------------------------------------------ | --------------------- || Total Workload by category (GCR, PIL, PER) | Workload Visibility || Total ULDs processed vs remaining | Situational Awareness || Staff Name and ID tracking | Performance Screen || Staff performance tracking (ULD/shift) | Performance Screen || Count and type of ULD loaded | All screens || GCR, PIL, PER displayed separately | WorkAreaFilter || Green/amber/red status for flights | Situational Awareness || Filters (time/shift range) | All screens || Staff efficiency metrics (ULDs/hour) | Performance Screen || Module-level filtering | All screens |

### Missing Data Properties (Need Mock for POC)

| Property | Description | Mock Strategy || ------------------- | ---------------------------------- | ---------------------------------------- || `screeningRequired` | Screening vs non-screening flights | Derive from module name ("US Screening") || `halfBuildStatus` | Incomplete/half-built ULDs | Derive from completion < 100% || `remarks` | Incomplete build-up reasons | Add text input field || `revisionNumber` | Load plan version | Default "v1.0" || `bayNumber` | Ramp bay assignment | Hardcode in STAFF_DATA |---

## Milestone 1: Staff Performance Enhancement - COMPLETED

**File**: [`components/performance-screen.tsx`](components/performance-screen.tsx)

### Charts Implemented

| Chart | Type | Status || ---------------------- | ------------------------- | ------- || Efficiency Leaderboard | Horizontal Bar + Avg Line | Done || Productivity Scatter | Scatter Plot | Done || ULD Type Contribution | Stacked Bar (PIL/PER) | Done |

### Requirements Gap for This Page

| Requirement | Gap | Action | Status || ------------------------------------- | ------------------------------------- | --------------------------------- | ------------ || Staff contact numbers against flights | Data exists in type but not displayed | Add `contact` column to table | Pending || Historical staff efficiency view | No historical toggle | Add date filter or "vs Yesterday" | Low Priority || Post-allocation workload by staff | Needs chart | Already covered by scatter plot | Done |

### Layout Changes - Done

- Dashboard header with KPI cards (Total Staff, Avg Efficiency, Total Units, Best Performer)
- Charts in 2-column grid
- Collapsible detailed table

---

## Milestone 2: Shift Summary Report Enhancement - COMPLETED

**File**: [`components/shift-summary-report-screen.tsx`](components/shift-summary-report-screen.tsx)

### Charts Implemented

| Chart | Type | Status || ------------------------------ | ------------------------- | ------ || Efficiency Gauge Dashboard | 3x Radial Gauges | Done || ULD Production Timeline | Stacked Area Chart | Done || Resource Utilization | Horizontal Bar + Variance | Done |

### Requirements Gap - Done

| Requirement | Status || ----------------------------------- | ------ || Pending for next shift | Done || Half-build/incomplete ULD info | Done |---

## Milestone 3: Workload Visibility Enhancement - COMPLETED

**File**: [`components/bdn-dashboard-screen.tsx`](components/bdn-dashboard-screen.tsx)

### Charts Implemented

| Chart | Type | Status |

| --------------------------- | ----------------------------------------- | ------ |

| Work Area Treemap | Flexbox floor-based layout with categories | Done |

| Workload by Cargo Type | Horizontal Bar Chart (Recharts) | Done |

| Advance Planned vs Built | Stacked Bar Chart | Done |

| Screening Summary | Bar Chart + Collapsible Tables | Done |

### Features Implemented

| Feature | Description | Status |

| ------------------------------ | ---------------------------------------------------- | ------ |

| Floor-based treemap layout | 1st Floor and Ground Floor rows with colored cells | Done |

| Category-based coloring | 8 work area categories with distinct colors | Done |

| Completion status indicators | Green/amber/red dots showing completion % | Done |

| Opacity-based completion | Cell opacity reflects completion percentage | Done |

| Synced page-level filters | GCR, PER, PIL as separate toggle buttons | Done |

| Work area filter dropdown | Overall / By Work Area with E75, L22 options | Done |

| Cargo type chart filters | Card-level filters synced with page-level | Done |

| Equal height chart cards | Flexbox layout with items-stretch | Done |

| Integrated detailed breakdown | Collapsible sections inside chart cards | Done |

### Work Area Categories & Colors

| Category | Color | Hex |

| ---------- | ------ | ------- |

| Buildup | Red | #DC2626 |

| Breakdown | Blue | #3B82F6 |

| Acceptance | Pink | #EC4899 |

| Delivery | Cyan | #06B6D4 |

| PER | Green | #22C55E |

| PIL | Lime | #84CC16 |

| Screening | Purple | #A855F7 |

| Inspection | Amber | #F59E0B |

### Completion Status Colors

| Status | Threshold | Color |

| ----------- | --------- | ------- |

| On Track | 80%+ | #22C55E |

| In Progress | 40-80% | #F59E0B |

| Behind | <40% | #EF4444 |

### Final Layout

```
+-----------------------------------------------+
| Header + KPI Cards                            |
+-----------------------------------------------+
| Filters (GCR | PER | PIL, Shift, Time)        |
+-----------------------------------------------+
| Workload by Work Area (Treemap)               |
| - 1ST FLOOR row with colored cells            |
| - GROUND FLOOR row with colored cells         |
| - Category legend + Completion status legend  |
+-----------------------------------------------+
| Workload by Cargo Type (Bar Chart)            |
| - GCR/PER/PIL filters + Work Area dropdown    |
| - Horizontal bars with completion/remaining   |
+-----------------------------------------------+
| Advance Planned    |   Screening Summary      |
| vs Built Chart     |   Chart + Filter         |
| + Detailed         |   + Detailed             |
|   Breakdown        |     Breakdown            |
+-----------------------------------------------+
```

---

## Milestone 4: Situational Awareness Enhancement - PENDING

**File**: [`components/situational-awareness-screen.tsx`](components/situational-awareness-screen.tsx)

### Notion Requirements ([source](https://www.notion.so/belli-ai/6-decide-what-graphs-tables-to-show-to-management-Reports-section-2b89e07d412b8030a0b6ca118503142d))

**Layout Structure:**

- Top: Filters (Category GCR/PIL/PER, Work Areas, Time, Shift 9am-9pm/9pm-9am)
- Total workload for ALL shifts (flight level by row, ULD level by completion bar)
- Bottom: Two columns (Advance Planned vs Built | Incoming Workload)

**4 Key Visualizations Required:**
1. Current workload by category/work areas, date-time range and shift
2. Flights in progress and completion rates against planned ULDs
3. Anticipated incoming workload (based on upcoming flights)
4. Digital buildup completion report at shipment level

### Charts to Implement

| Chart | Type | Data Source | Priority | Status |
| ------------------------------- | --------------------- | -------------------------------- | -------- | ------- |
| 4.1 Overall Completion Ring | Large Radial Progress | Total ULD completion % | High | Pending |
| 4.2 Flight Completion Bars | Horizontal Bar | Per-flight with ULD completion | High | Pending |
| 4.3 Workload Category Radar | Radar Chart | GCR/PER/PIL balance | Medium | Pending |
| 4.4 Advance Planned vs Built | Stacked Bar | Planned vs actual by time window | High | Pending |
| 4.5 Incoming Workload Timeline | Area/Bar Chart | Upcoming flights workload | High | Pending |

### Features to Implement

| Feature | Description | Status |
| ------------------------------ | ---------------------------------------------------- | ------- |
| Shift filter (9am-9pm/9pm-9am) | Toggle between day/night shift views | Pending |
| All-shifts workload view | Show total workload across all shifts, not just current | Pending |
| Flight-level rows | Each flight as a row with ULD completion bars | Pending |
| Synced GCR/PER/PIL filters | Same separate button style as Workload Visibility | Pending |
| Work area module filter | Filter by specific warehouse modules | Pending |
| Time range filter | Filter by date-time range | Pending |

### Requirements Gap for This Page

| Requirement | Gap | Action | Status |
| --------------------------------- | ------------------------ | ----------------------------------------- | ---------- |
| ULD Completed vs Pending view | Exists but not prominent | Add hero "Completed vs Pending" stat card | Pending |
| Drill-down from flight status | Basic click interaction | Add modal/panel with flight details | Pending |
| Green/amber/red status | Already implemented | - | Done |
| Anticipated incoming workload | Not implemented | Add Incoming Workload timeline chart | Pending |
| Advance Planned vs Built | Not in current screen | Add similar chart to Workload Visibility | Pending |

### Layout Changes

- Add "Mission Control" hero section with Completion Ring + ULD Status card
- Add shift toggle (Day 9am-9pm / Night 9pm-9am)
- Flight table with per-flight ULD completion bars
- Bottom two-column layout:
  - Left: Advance Planned vs Built (stacked bars)
  - Right: Incoming Workload (timeline/area chart)

---

## Implementation Approach

### Shared Chart Styling

Located in [`lib/chart-theme.ts`](lib/chart-theme.ts):

- Emirates brand colors (#D71A21 primary red)
- Consistent animation timing (300ms ease-out)
- Tailwind-based tooltip styling

### Reusable Components

Located in [`components/reports/charts/`](components/reports/charts/):

- `StatCard` - KPI display cards
- `ChartCard` - Chart wrapper with title
- `GaugeChart` - Radial efficiency gauges
- `DonutChart` - Pie/donut with center stats
- `StackedAreaChart` - Time-series areas
- `HorizontalBarChart` - Comparison bars
- `RadarChartComponent` - Multi-axis radar
- `CompletionRing` - Animated completion ring
- `HeatmapGrid` - Hour-by-hour intensity
- `TreemapChart` - Hierarchical treemap

---

## File Changes Summary

| File | Changes | Status |

| --------------------------------------------- | --------------------------------- | ----------- |

| `lib/chart-theme.ts` | Shared chart styling | Done |

| `components/reports/charts/*` | Reusable chart components | Done |

| `app/globals.css` | Chart animation keyframes | Done |

| `components/performance-screen.tsx` | M1 charts + layout | Done |

| `components/shift-summary-report-screen.tsx` | M2 charts + layout | Done |

| `components/bdn-dashboard-screen.tsx` | M3 treemap + charts + layout | Done |

| `components/reports/charts/treemap-chart.tsx` | WorkAreaTreemap component | Done |

| `components/work-area-filter-controls.tsx` | Separate GCR/PER/PIL filters | Done |

| `components/situational-awareness-screen.tsx` | M4 charts + layout + filters + incoming workload | Pending |

---

## Emirates Color Palette

```css
--chart-emirates-1: #d71a21; /* Primary red */
--chart-emirates-2: #b91c1c; /* Darker red */
--chart-emirates-3: #ef4444; /* Lighter red */
--chart-success: #22c55e; /* Green - complete */
--chart-warning: #f59e0b; /* Amber - in progress */
--chart-danger: #ef4444; /* Red - behind */




```