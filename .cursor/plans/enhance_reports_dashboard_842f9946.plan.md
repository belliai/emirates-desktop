---
name: Enhance Reports Dashboard
overview: Add visually stunning, insightful charts to four reporting pages (Staff Performance, Shift Summary Report, Workload Visibility, Situational Awareness) to create a WOW factor for the Emirates POC demo on January 12th. Each page will receive 2-3 premium data visualizations using recharts.
todos:
  - id: chart-theme
    content: Create shared chart theme with Emirates branding and animations
    status: pending
  - id: staff-performance-bars
    content: "M1: Add efficiency horizontal bar chart with avg line"
    status: pending
  - id: staff-performance-scatter
    content: "M1: Add productivity scatter plot (hours vs units)"
    status: pending
  - id: staff-performance-uld
    content: "M1: Add ULD type breakdown stacked bars (PIL/PER)"
    status: pending
  - id: staff-performance-layout
    content: "M1: Reorganize with dashboard header and chart cards"
    status: pending
  - id: staff-performance-contact
    content: "M1 REQ: Display staff contact numbers in table"
    status: pending
  - id: shift-summary-gauges
    content: "M2: Add efficiency gauge dashboard (3 radial charts)"
    status: pending
  - id: shift-summary-timeline
    content: "M2: Add ULD production stacked area chart"
    status: pending
  - id: shift-summary-resources
    content: "M2: Add resource utilization comparison bars"
    status: pending
  - id: shift-summary-layout
    content: "M2: Reorganize layout with dashboard header"
    status: pending
  - id: shift-summary-pending
    content: "M2 REQ: Add Pending for Next Shift summary section"
    status: pending
  - id: shift-summary-halfbuild
    content: "M2 REQ: Add half-build/incomplete ULD indicators"
    status: pending
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
    status: pending
  - id: situational-bars
    content: "M4: Add flight completion bar chart"
    status: pending
  - id: situational-radar
    content: "M4: Add workload category radar"
    status: pending
  - id: situational-layout
    content: "M4: Add mission control header and tabs"
    status: pending
  - id: situational-uld-pending
    content: "M4 REQ: Add prominent ULD Completed vs Pending card"
    status: pending
  - id: situational-drilldown
    content: "M4 REQ: Enhance flight status drill-down interaction"
    status: pending
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

## Milestone 3: Workload Visibility Enhancement - IN PROGRESS

**File**: [`components/bdn-dashboard-screen.tsx`](components/bdn-dashboard-screen.tsx)

### Notion Requirements ([source](https://www.notion.so/belli-ai/6-decide-what-graphs-tables-to-show-to-management-Reports-section-2b89e07d412b8030a0b6ca118503142d))

**Layout Structure:**

- Top: Filters (Category GCR/PIL/PER, Work Areas/modules)
- Workload for current shift
- Bottom: Two columns (Processed vs Remaining | Screening Summary)

**Key Action Item:** "just replace this inaccurate workload section"

### Charts to Implement

| Chart | Type | Data Source | Priority | Status || --------------------------- | -------------- | ----------------------------------- | -------- | ------- || 3.1 Work Area Treemap | Treemap | Physical warehouse zones by ULD count | High | Pending || 3.2 (Keep existing) | Progress Bars | GCR/PER/PIL workload | - | Exists || 3.3 (Keep existing) | Stacked Bar | Advance Planned vs Built | - | Exists || 3.4 (Keep existing) | Bar Chart | Screening Summary | - | Exists |

### Work Area Treemap Specification

Based on the floor layout image provided, create a treemap showing workload by physical work area:**Ground Floor Areas:**

- MTD Area
- Freighter and PAX Breakdown/Build-up
- PAX Breakdown
- Agency
- IND/PAK Build-up
- PER
- DM Inspection
- PIL
- WCD Area

**1st Floor Areas:**

- PAX and PF Build-up EUR
- PAX and Build-up AFR
- PAX and PF Build-up ME/SubCon/Asia
- Build-up AUS
- Pax Breakdown
- US Screening Flights

**Treemap Properties:**

- Size = Total ULD workload for that area
- Color = Completion status:
- Green (#22c55e): 80%+ complete
- Amber (#f59e0b): 40-80% complete
- Red (#ef4444): Under 40% complete
- Tooltip shows: Area name, X completed / Y total, percentage

### Implementation Steps

1. **Add work area mock data** in [`bdn-dashboard-screen.tsx`](components/bdn-dashboard-screen.tsx):
```typescript
const workAreaTreemapData = [
  { name: "MTD Area", total: 25, completed: 18, floor: "Ground" },
  { name: "Freighter & PAX", total: 45, completed: 28, floor: "Ground" },
  { name: "PAX Breakdown", total: 32, completed: 24, floor: "Ground" },
  { name: "Agency", total: 15, completed: 12, floor: "Ground" },
  { name: "IND/PAK Build-up", total: 22, completed: 14, floor: "Ground" },
  { name: "PER", total: 62, completed: 34, floor: "Ground" },
  { name: "DM Inspection", total: 8, completed: 8, floor: "Ground" },
  { name: "PIL", total: 48, completed: 26, floor: "Ground" },
  { name: "WCD Area", total: 18, completed: 15, floor: "Ground" },
  { name: "PAX Build-up EUR", total: 38, completed: 22, floor: "1st" },
  { name: "PAX Build-up AFR", total: 28, completed: 18, floor: "1st" },
  { name: "PAX Build-up ME/Asia", total: 42, completed: 30, floor: "1st" },
  { name: "Build-up AUS", total: 20, completed: 16, floor: "1st" },
  { name: "US Screening", total: 35, completed: 25, floor: "1st" },
];
```




2. **Enhance TreemapChart** in [`components/reports/charts/treemap-chart.tsx`](components/reports/charts/treemap-chart.tsx) to support completion-based coloring
3. **Add treemap section** to the dashboard layout (new section, keep existing charts)

### Updated Layout

```javascript
+-----------------------------------------------+
| Header + KPI Cards                            |
+-----------------------------------------------+
| Filters (GCR/PIL/PER, Work Areas, Shift)      |
+-----------------------------------------------+
| NEW: Work Area Treemap (full width)           |
| "Workload by Work Area"                       |
+-----------------------------------------------+
| Workload Bars (GCR/PER/PIL) - existing        |
+-----------------------------------------------+
| Advance Planned   |   Screening Summary       |
| vs Built Chart    |   Chart + Tables          |
+-----------------------------------------------+
```

---

## Milestone 4: Situational Awareness Enhancement - PENDING

**File**: [`components/situational-awareness-screen.tsx`](components/situational-awareness-screen.tsx)

### Charts to Implement

| Chart | Type | Data Source | Priority || --------------------------- | --------------------- | ---------------------- | -------- || 4.1 Overall Completion Ring | Large Radial Progress | Total ULD completion % | High || 4.2 Flight Completion Bars | Horizontal Bar | Per-flight completion | High || 4.3 Workload Category Radar | Radar Chart | GCR/PER/PIL balance | Medium |

### Requirements Gap for This Page

| Requirement | Gap | Action | Status || --------------------------------- | ------------------------ | ----------------------------------------- | ---------- || ULD Completed vs Pending view | Exists but not prominent | Add hero "Completed vs Pending" stat card | Pending || Drill-down from flight status | Basic click interaction | Add modal/panel with flight details | Pending || Green/amber/red status | Already implemented | - | Done || Staff names and contact numbers | Already in STAFF_DATA | - | Done || Anticipated incoming workload | Basic exists | Enhance with timeline chart | Medium |

### Layout Changes

- Add "Mission Control" hero section with Completion Ring
- Add prominent "ULD Status" summary card (X Completed / Y Pending)
- Convert collapsible sections to tabs
- Add subtle background gradients

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

| File | Changes | Status || --------------------------------------------- | ------------------------- | ---------- || `lib/chart-theme.ts` | Shared chart styling | Done || `components/reports/charts/*` | Reusable chart components | Done || `app/globals.css` | Chart animation keyframes | Done || `components/performance-screen.tsx` | M1 charts + layout | Done || `components/shift-summary-report-screen.tsx` | M2 charts + layout | Done || `components/bdn-dashboard-screen.tsx` | M3 treemap + layout | In Progress || `components/situational-awareness-screen.tsx` | M4 charts + layout | Pending |---

## Emirates Color Palette

```css
--chart-emirates-1: #d71a21; /* Primary red */
--chart-emirates-2: #b91c1c; /* Darker red */
--chart-emirates-3: #ef4444; /* Lighter red */
--chart-success: #22c55e; /* Green - complete */
--chart-warning: #f59e0b; /* Amber - in progress */
--chart-danger: #ef4444; /* Red - behind */



```