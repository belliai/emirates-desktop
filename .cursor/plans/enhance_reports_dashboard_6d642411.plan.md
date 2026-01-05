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
    dependencies:
      - chart-theme
  - id: staff-performance-scatter
    content: "M1: Add productivity scatter plot (hours vs units)"
    status: completed
    dependencies:
      - chart-theme
  - id: staff-performance-uld
    content: "M1: Add ULD type breakdown stacked bars (PIL/PER)"
    status: completed
    dependencies:
      - chart-theme
  - id: staff-performance-layout
    content: "M1: Reorganize with dashboard header and chart cards"
    status: completed
  - id: staff-performance-contact
    content: "M1 REQ: Display staff contact numbers in table"
    status: pending
    dependencies:
      - staff-performance-layout
  - id: shift-summary-gauges
    content: "M2: Add efficiency gauge dashboard (3 radial charts)"
    status: pending
    dependencies:
      - chart-theme
  - id: shift-summary-timeline
    content: "M2: Add ULD production stacked area chart"
    status: pending
    dependencies:
      - chart-theme
  - id: shift-summary-resources
    content: "M2: Add resource utilization comparison bars"
    status: pending
    dependencies:
      - chart-theme
  - id: shift-summary-layout
    content: "M2: Reorganize layout with dashboard header"
    status: pending
  - id: shift-summary-pending
    content: "M2 REQ: Add 'Pending for Next Shift' summary section"
    status: pending
    dependencies:
      - shift-summary-layout
  - id: shift-summary-halfbuild
    content: "M2 REQ: Add half-build/incomplete ULD indicators"
    status: pending
    dependencies:
      - shift-summary-layout
  - id: workload-treemap
    content: "M3: Add flight workload treemap"
    status: pending
    dependencies:
      - chart-theme
  - id: workload-donut
    content: "M3: Replace bar chart with animated donut"
    status: pending
    dependencies:
      - chart-theme
  - id: workload-heatmap
    content: "M3: Add shift timeline heatmap"
    status: pending
    dependencies:
      - chart-theme
  - id: workload-layout
    content: "M3: Reorganize into dashboard layout"
    status: pending
  - id: workload-screening
    content: "M3 REQ: Add screening vs non-screening segmentation"
    status: pending
    dependencies:
      - workload-layout
  - id: situational-ring
    content: "M4: Add overall completion ring"
    status: pending
    dependencies:
      - chart-theme
  - id: situational-bars
    content: "M4: Add flight completion bar chart"
    status: pending
    dependencies:
      - chart-theme
  - id: situational-radar
    content: "M4: Add workload category radar"
    status: pending
    dependencies:
      - chart-theme
  - id: situational-layout
    content: "M4: Add mission control header and tabs"
    status: pending
  - id: situational-uld-pending
    content: "M4 REQ: Add prominent ULD Completed vs Pending card"
    status: pending
    dependencies:
      - situational-layout
  - id: situational-drilldown
    content: "M4 REQ: Enhance flight status drill-down interaction"
    status: pending
    dependencies:
      - situational-layout
---

# Reports Dashboard Enhancement Plan

## Context

This is a POC demo for Emirates on Monday, January 12th. The priority is visual impact and flashiness over perfect functionality.

**Source**: [Notion Task - Spruce Up Interface](https://www.notion.so/belli-ai/8-spruce-up-interface-2df9e07d412b80f9a729ef7cba5f51ad)

---

## Requirements Gap Analysis Summary

### ✅ Requirements Already Covered

| Requirement | Location |

| ------------------------------------------ | --------------------- |

| Total Workload by category (GCR, PIL, PER) | Workload Visibility |

| Total ULDs processed vs remaining | Situational Awareness |

| Staff Name and ID tracking | Performance Screen |

| Staff performance tracking (ULD/shift) | Performance Screen |

| Count & type of ULD loaded | All screens |

| GCR, PIL, PER displayed separately | WorkAreaFilter |

| Green/amber/red status for flights | Situational Awareness |

| Filters (time/shift range) | All screens |

| Staff efficiency metrics (ULDs/hour) | Performance Screen |

| Module-level filtering | All screens |

### ❌ Missing Data Properties (Need Mock for POC)

| Property | Description | Mock Strategy |

| ------------------- | ---------------------------------- | ---------------------------------------- |

| `screeningRequired` | Screening vs non-screening flights | Derive from module name ("US Screening") |

| `halfBuildStatus` | Incomplete/half-built ULDs | Derive from completion < 100% |

| `remarks` | Incomplete build-up reasons | Add text input field |

| `revisionNumber` | Load plan version | Default "v1.0" |

| `bayNumber` | Ramp bay assignment | Hardcode in STAFF_DATA |

---

## Milestone 1: Staff Performance Enhancement ✅ COMPLETED

**File**: `components/performance-screen.tsx`

### Charts Implemented

| Chart | Type | Status |

| ---------------------- | ------------------------- | ------- |

| Efficiency Leaderboard | Horizontal Bar + Avg Line | ✅ Done |

| Productivity Scatter | Scatter Plot | ✅ Done |

| ULD Type Contribution | Stacked Bar (PIL/PER) | ✅ Done |

### Requirements Gap for This Page

| Requirement | Gap | Action | Status |

| ------------------------------------- | ------------------------------------- | --------------------------------- | ------------ |

| Staff contact numbers against flights | Data exists in type but not displayed | Add `contact` column to table | ⏳ Pending |

| Historical staff efficiency view | No historical toggle | Add date filter or "vs Yesterday" | Low Priority |

| Post-allocation workload by staff | Needs chart | Already covered by scatter plot | ✅ Done |

### Layout Changes ✅

- ✅ Dashboard header with KPI cards (Total Staff, Avg Efficiency, Total Units, Best Performer)
- ✅ Charts in 2-column grid
- ✅ Collapsible detailed table

---

## Milestone 2: Shift Summary Report Enhancement

**File**: `components/shift-summary-report-screen.tsx`

### Charts to Implement

| Chart | Type | Data Source | Priority |

| ------------------------------ | ------------------------- | ------------------------------ | -------- |

| 2.1 Efficiency Gauge Dashboard | 3x Radial Gauges | Shift efficiency metrics | High |

| 2.2 ULD Production Timeline | Stacked Area Chart | ULD counts by EM/LM/AF windows | High |

| 2.3 Resource Utilization | Horizontal Bar + Variance | Planned vs Actual resources | Medium |

### Requirements Gap for This Page

| Requirement | Gap | Action | Status |

| ----------------------------------- | ------------------------- | --------------------------------------------- | ------------ |

| **Pending for next shift** | Not prominently displayed | Add "Handover Summary" card with pending ULDs | ⏳ Pending |

| **Half-build/incomplete ULD info** | No visual indicator | Add amber badge for half-built ULDs | ⏳ Pending |

| **Remarks for incomplete build-up** | No input field | Add remarks column/tooltip | Low Priority |

| End-of-shift handover report | Basic exists | Enhance with summary stats | Medium |

### Layout Changes

- Add "Dashboard Overview" section at top with 3 charts
- Add "Handover Summary" card showing pending work
- Keep existing tables in collapsible sections

---

## Milestone 3: Workload Visibility Enhancement

**File**: `components/incoming-workload-screen.tsx`

### Charts to Implement

| Chart | Type | Data Source | Priority |

| --------------------------- | -------------- | ------------------------ | -------- |

| 3.1 Flight Workload Treemap | Treemap | Flights by ULD count | High |

| 3.2 ULD Type Donut | Animated Donut | PMC/AKE/ALF distribution | High |

| 3.3 Shift Timeline Heatmap | Time Grid | ULD counts by hour | Medium |

### Requirements Gap for This Page

| Requirement | Gap | Action | Status |

| ------------------------------------------- | -------------------------------- | ----------------------------------------- | ---------- |

| **Screening vs non-screening segmentation** | Missing `screeningRequired` flag | Mock from module ("US Screening Flights") | ⏳ Pending |

| Workload at AWB level | Currently ULD-level only | Out of scope per requirements | N/A |

| Module-level breakdown | Exists but not charted | Add module filter to charts | Medium |

### Mock Data Strategy

```typescript
// Derive screeningRequired from module name
const isScreeningFlight = (module: string) =>
  module.toLowerCase().includes("screening");

// Add to LoadPlan type for display
type EnhancedLoadPlan = LoadPlan & {
  screeningRequired: boolean;
};
```

### Layout Changes

- Reorganize into dashboard-style with charts at top
- Replace basic bar chart with animated Donut
- Add screening/non-screening toggle filter
- Flight table as supporting detail below

---

## Milestone 4: Situational Awareness Enhancement

**File**: `components/situational-awareness-screen.tsx`

### Charts to Implement

| Chart | Type | Data Source | Priority |

| --------------------------- | --------------------- | ---------------------- | -------- |

| 4.1 Overall Completion Ring | Large Radial Progress | Total ULD completion % | High |

| 4.2 Flight Completion Bars | Horizontal Bar | Per-flight completion | High |

| 4.3 Workload Category Radar | Radar Chart | GCR/PER/PIL balance | Medium |

### Requirements Gap for This Page

| Requirement | Gap | Action | Status |

| --------------------------------- | ------------------------ | ----------------------------------------- | ---------- |

| **ULD Completed vs Pending view** | Exists but not prominent | Add hero "Completed vs Pending" stat card | ⏳ Pending |

| **Drill-down from flight status** | Basic click interaction | Add modal/panel with flight details | ⏳ Pending |

| Green/amber/red status | ✅ Already implemented | - | ✅ Done |

| Staff names and contact numbers | ✅ Already in STAFF_DATA | - | ✅ Done |

| Anticipated incoming workload | Basic exists | Enhance with timeline chart | Medium |

### Layout Changes

- Add "Mission Control" hero section with Completion Ring
- Add prominent "ULD Status" summary card (X Completed / Y Pending)
- Convert collapsible sections to tabs
- Add subtle background gradients

---

## Implementation Approach

### Shared Chart Styling

Located in `lib/chart-theme.ts`:

- Emirates brand colors (`#D71A21` primary red)
- Consistent animation timing (300ms ease-out)
- Tailwind-based tooltip styling

### Reusable Components

Located in `components/reports/charts/`:

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

| --------------------------------------------- | ------------------------- | ---------- |

| `lib/chart-theme.ts` | Shared chart styling | ✅ Done |

| `components/reports/charts/*` | Reusable chart components | ✅ Done |

| `app/globals.css` | Chart animation keyframes | ✅ Done |

| `components/performance-screen.tsx` | M1 charts + layout | ✅ Done |

| `components/shift-summary-report-screen.tsx` | M2 charts + layout | ⏳ Pending |

| `components/incoming-workload-screen.tsx` | M3 charts + layout | ⏳ Pending |

| `components/situational-awareness-screen.tsx` | M4 charts + layout | ⏳ Pending |

---

## Chart Style Reference (Shadcn UI)

Use [Shadcn Charts](https://ui.shadcn.com/docs/components/chart) as the primary style reference.

### Recommended Chart Types

| Chart Type | Use Case |

| ---------------------- | -------------------------------------------------------------- |

| Bar Chart - Horizontal | Efficiency leaderboard, Resource comparison, Flight completion |

| Area Chart - Gradient | ULD Production Timeline |

| Pie Chart - Donut | ULD Type distribution |

| Radial Chart | Efficiency gauges, Completion rings |

| Radar Chart | Work area balance |

### Emirates Color Palette

```css
--chart-emirates-1: #d71a21; /* Primary red */
--chart-emirates-2: #b91c1c; /* Darker red */
--chart-emirates-3: #ef4444; /* Lighter red */
--chart-success: #22c55e; /* Green - complete */
--chart-warning: #f59e0b; /* Amber - in progress */
--chart-danger: #ef4444; /* Red - behind */
```