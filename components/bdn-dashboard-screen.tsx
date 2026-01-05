"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Package,
  Clock,
  TrendingUp,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useWorkAreaFilter,
  useWorkAreaFilterContext,
  WorkAreaFilterControls,
  WorkAreaFilterProvider,
} from "./work-area-filter-controls";
import {
  StatCard,
  ChartCard,
  DonutChart,
  HeatmapGrid,
  WorkAreaTreemap,
} from "@/components/reports/charts";
import type { WorkAreaData } from "@/components/reports/charts/treemap-chart";
import { CHART_COLORS } from "@/lib/chart-theme";
import { tooltipContainerClass } from "@/components/reports/charts/chart-tooltip";
import { cn } from "@/lib/utils";

// Data from CSV
const bdnData = {
  shift1: {
    timeRange: "0600-0900",
    planned: {
      pmcAmf: 210,
      alfPla: 10,
      akeRke: 116,
      sclrPcs: 0,
      total: 336,
    },
    built: {
      built: { pmcAmf: 105, alfPla: 5, akeRke: 68, sclrPcs: 0, total: 178 },
      thru: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0, total: 0 },
      total: { pmcAmf: 105, alfPla: 5, akeRke: 68, sclrPcs: 0, total: 178 },
    },
    pending: {
      pmcAmf: 105,
      alfPla: 5,
      akeRke: 48,
      sclrPcs: 0,
      total: 158,
    },
  },
  shift2: {
    timeRange: "0901-1259",
    planned: {
      pmcAmf: 159,
      alfPla: 17,
      akeRke: 79,
      sclrPcs: 0,
      total: 255,
    },
    built: {
      built: { pmcAmf: 63, alfPla: 10, akeRke: 31, sclrPcs: 0, total: 104 },
      thru: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0, total: 0 },
      total: { pmcAmf: 63, alfPla: 10, akeRke: 31, sclrPcs: 0, total: 104 },
    },
    pending: {
      pmcAmf: 96,
      alfPla: 7,
      akeRke: 48,
      sclrPcs: 0,
      total: 151,
    },
  },
};

const chartData = [
  {
    shift: "0600-0900",
    planned: bdnData.shift1.planned.total,
    advance: bdnData.shift1.built.total.total,
    pending: bdnData.shift1.pending.total,
    // Breakdown for tooltip
    advancePMC: bdnData.shift1.built.total.pmcAmf,
    advanceALF: bdnData.shift1.built.total.alfPla,
    advanceAKE: bdnData.shift1.built.total.akeRke,
    advanceSCLR: bdnData.shift1.built.total.sclrPcs,
    pendingPMC: bdnData.shift1.pending.pmcAmf,
    pendingALF: bdnData.shift1.pending.alfPla,
    pendingAKE: bdnData.shift1.pending.akeRke,
    pendingSCLR: bdnData.shift1.pending.sclrPcs,
  },
  {
    shift: "0901-1259",
    planned: bdnData.shift2.planned.total,
    advance: bdnData.shift2.built.total.total,
    pending: bdnData.shift2.pending.total,
    // Breakdown for tooltip
    advancePMC: bdnData.shift2.built.total.pmcAmf,
    advanceALF: bdnData.shift2.built.total.alfPla,
    advanceAKE: bdnData.shift2.built.total.akeRke,
    advanceSCLR: bdnData.shift2.built.total.sclrPcs,
    pendingPMC: bdnData.shift2.pending.pmcAmf,
    pendingALF: bdnData.shift2.pending.alfPla,
    pendingAKE: bdnData.shift2.pending.akeRke,
    pendingSCLR: bdnData.shift2.pending.sclrPcs,
  },
];

// Shadcn-styled tooltip for workload chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={cn(tooltipContainerClass, "p-3 min-w-[160px]")}>
        <div className="text-sm font-semibold text-gray-900 mb-2">
          {data.shift}
        </div>
        <div className="space-y-2 text-xs">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#DC2626]" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                Advance Built
              </span>
            </div>
            <div className="pl-3.5 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-500">PMC-AMF</span>
                <span className="font-medium">{data.advancePMC}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ALF-PLA</span>
                <span className="font-medium">{data.advanceALF}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">AKE-RKE</span>
                <span className="font-medium">{data.advanceAKE}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-0.5 mt-0.5">
                <span className="font-medium text-gray-700">Total</span>
                <span className="font-semibold text-[#DC2626]">
                  {data.advance}
                </span>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "rgba(220, 38, 38, 0.4)" }}
              />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                Pending
              </span>
            </div>
            <div className="pl-3.5 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-500">PMC-AMF</span>
                <span className="font-medium">{data.pendingPMC}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ALF-PLA</span>
                <span className="font-medium">{data.pendingALF}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">AKE-RKE</span>
                <span className="font-medium">{data.pendingAKE}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-0.5 mt-0.5">
                <span className="font-medium text-gray-700">Total</span>
                <span className="font-semibold text-amber-500">
                  {data.pending}
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="font-semibold text-gray-900">Planned</span>
            <span className="font-bold text-gray-900">{data.planned}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Screening data based on image
const screeningData = {
  overall: {
    totalBooked: { pcs: 6711, grWt: 136169, mABase: 74, lBase: 21, kBase: 41 },
    totalPending: { pcs: 0, grWt: 0, mABase: 6, lBase: 0, kBase: 2 },
  },
  usaCaScreening: {
    totalBooked: { pcs: 6711, grWt: 136169, mABase: 56, lBase: 20, kBase: 36 },
    totalPending: { pcs: 0, grWt: 0, mABase: 0, lBase: 0, kBase: 0 },
  },
  usaCaNoScreening: {
    totalBooked: { pcs: 0, grWt: 0, mABase: 0, lBase: 0, kBase: 0 },
    totalPending: { pcs: 0, grWt: 0, mABase: 0, lBase: 0, kBase: 0 },
  },
  otherSectorScreening: {
    totalBooked: { pcs: 0, grWt: 0, mABase: 18, lBase: 1, kBase: 5 },
    totalPending: { pcs: 0, grWt: 0, mABase: 6, lBase: 0, kBase: 2 },
  },
};

const flightDetails = [
  {
    flight: "EK0213",
    dest: "MIA-BOG",
    etd: "02:15",
    screenedShipments: 0,
    screenedPcs: 0,
    screenedGrWt: 0,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 1,
    buildLBase: 0,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0231",
    dest: "IAD",
    etd: "02:20",
    screenedShipments: 0,
    screenedPcs: 5,
    screenedGrWt: 1285,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 1,
    buildLBase: 1,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0243",
    dest: "YUL",
    etd: "02:30",
    screenedShipments: 0,
    screenedPcs: 0,
    screenedGrWt: 0,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 0,
    buildLBase: 0,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0221",
    dest: "DFW",
    etd: "02:40",
    screenedShipments: 0,
    screenedPcs: 0,
    screenedGrWt: 0,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 0,
    buildLBase: 0,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0203",
    dest: "JFK",
    etd: "02:50",
    screenedShipments: 0,
    screenedPcs: 0,
    screenedGrWt: 0,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 0,
    buildLBase: 0,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0241",
    dest: "YYZ",
    etd: "03:30",
    screenedShipments: 0,
    screenedPcs: 0,
    screenedGrWt: 0,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 0,
    buildLBase: 0,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0237",
    dest: "BOS",
    etd: "08:20",
    screenedShipments: 2,
    screenedPcs: 822,
    screenedGrWt: 9242,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 4,
    buildLBase: 0,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0201",
    dest: "JFK",
    etd: "08:30",
    screenedShipments: 5,
    screenedPcs: 120,
    screenedGrWt: 1230,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 4,
    buildLBase: 1,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0215",
    dest: "LAX",
    etd: "08:55",
    screenedShipments: 0,
    screenedPcs: 0,
    screenedGrWt: 0,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 0,
    buildLBase: 4,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0225",
    dest: "SFO",
    etd: "09:10",
    screenedShipments: 2,
    screenedPcs: 11,
    screenedGrWt: 289,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 0,
    buildLBase: 0,
    buildKBase: 1,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0205",
    dest: "JFK",
    etd: "09:30",
    screenedShipments: 1,
    screenedPcs: 45,
    screenedGrWt: 1300,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 0,
    buildLBase: 0,
    buildKBase: 2,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0211",
    dest: "IAH",
    etd: "09:30",
    screenedShipments: 3,
    screenedPcs: 4,
    screenedGrWt: 22,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 1,
    buildLBase: 0,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0235",
    dest: "ORD",
    etd: "09:55",
    screenedShipments: 2,
    screenedPcs: 360,
    screenedGrWt: 4205,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 1,
    buildLBase: 0,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0229",
    dest: "SEA",
    etd: "09:55",
    screenedShipments: 0,
    screenedPcs: 0,
    screenedGrWt: 0,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 0,
    buildLBase: 0,
    buildKBase: 1,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0209",
    dest: "EWR",
    etd: "10:50",
    screenedShipments: 1,
    screenedPcs: 4,
    screenedGrWt: 160,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 0,
    buildLBase: 1,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0957",
    dest: "BEY",
    etd: "07:35",
    screenedShipments: 0,
    screenedPcs: 0,
    screenedGrWt: 0,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 8,
    buildLBase: 0,
    buildKBase: 2,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0943",
    dest: "BGW",
    etd: "12:40",
    screenedShipments: 0,
    screenedPcs: 0,
    screenedGrWt: 0,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 3,
    buildLBase: 0,
    buildKBase: 0,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
  {
    flight: "EK0953",
    dest: "BEY",
    etd: "15:10",
    screenedShipments: 0,
    screenedPcs: 0,
    screenedGrWt: 0,
    toBeScreenedShipments: 0,
    toBeScreenedPcs: 0,
    toBeScreenedGrWt: 0,
    buildMABase: 2,
    buildLBase: 1,
    buildKBase: 1,
    toBuildMABase: 0,
    toBuildLBase: 0,
    toBuildKBase: 0,
  },
];

// Shadcn-styled tooltip for screening chart
const ScreeningTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={cn(tooltipContainerClass, "p-2.5 min-w-[120px]")}>
        <div className="text-sm font-semibold text-gray-900 mb-1.5">
          {data.name}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-[10px] text-gray-500">No of Pcs</span>
            <span className="text-xs font-semibold text-gray-900">
              {data.pcs.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[10px] text-gray-500">Gr. Wt</span>
            <span className="text-xs font-semibold text-gray-900">
              {data.grWt.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Work area data - GCR > PER > PIL
const workAreaData = {
  overall: {
    GCR: { total: 85, remaining: 45 },
    PER: { total: 62, remaining: 28 },
    PIL: { total: 48, remaining: 22 },
  },
  E75: {
    GCR: { total: 35, remaining: 18 },
    PER: { total: 25, remaining: 12 },
    PIL: { total: 20, remaining: 9 },
  },
  L22: {
    GCR: { total: 28, remaining: 15 },
    PER: { total: 20, remaining: 8 },
    PIL: { total: 15, remaining: 7 },
  },
  // Add more work areas as needed
};

// Work Area Treemap Data - Based on CMT floor layout
// Categories: buildup, breakdown, acceptance, delivery, per, pil, screening, inspection
// Floor: "Ground" or "1st" - arranged as rows matching physical warehouse layout
const workAreaTreemapData: WorkAreaData[] = [
  // Ground Floor Areas (left to right as per warehouse layout)
  {
    name: "MTD Area",
    shortName: "MTD",
    total: 25,
    completed: 18,
    floor: "Ground",
    category: "delivery",
  },
  {
    name: "Freighter & PAX Breakdown",
    shortName: "FRT/PAX",
    total: 45,
    completed: 28,
    floor: "Ground",
    category: "breakdown",
  },
  {
    name: "PAX Breakdown",
    shortName: "PAX BKD",
    total: 32,
    completed: 24,
    floor: "Ground",
    category: "breakdown",
  },
  {
    name: "Agency",
    shortName: "Agency",
    total: 15,
    completed: 12,
    floor: "Ground",
    category: "acceptance",
  },
  {
    name: "IND/PAK Build-up",
    shortName: "IND/PAK",
    total: 22,
    completed: 14,
    floor: "Ground",
    category: "buildup",
  },
  {
    name: "PER",
    shortName: "PER",
    total: 62,
    completed: 34,
    floor: "Ground",
    category: "per",
  },
  {
    name: "DM Inspection",
    shortName: "DM Insp",
    total: 8,
    completed: 8,
    floor: "Ground",
    category: "inspection",
  },
  {
    name: "PIL",
    shortName: "PIL",
    total: 48,
    completed: 26,
    floor: "Ground",
    category: "pil",
  },
  {
    name: "WCD Area",
    shortName: "WCD",
    total: 18,
    completed: 15,
    floor: "Ground",
    category: "delivery",
  },

  // 1st Floor Areas (left to right as per warehouse layout)
  {
    name: "PAX & PF Build-up EUR",
    shortName: "EUR",
    total: 38,
    completed: 22,
    floor: "1st",
    category: "buildup",
  },
  {
    name: "PAX & Build-up AFR",
    shortName: "AFR",
    total: 28,
    completed: 18,
    floor: "1st",
    category: "buildup",
  },
  {
    name: "PAX & PF Build-up ME/Asia",
    shortName: "ME/Asia",
    total: 42,
    completed: 30,
    floor: "1st",
    category: "buildup",
  },
  {
    name: "Build-up AUS",
    shortName: "AUS",
    total: 20,
    completed: 16,
    floor: "1st",
    category: "buildup",
  },
  {
    name: "Pax Breakdown",
    shortName: "PAX BKD",
    total: 25,
    completed: 19,
    floor: "1st",
    category: "breakdown",
  },
  {
    name: "US Screening Flights",
    shortName: "US Screen",
    total: 35,
    completed: 25,
    floor: "1st",
    category: "screening",
  },
];

// Wrapper component that provides the WorkAreaFilter context
export default function BDNDashboardScreen() {
  return (
    <WorkAreaFilterProvider>
      <BDNDashboardScreenContent />
    </WorkAreaFilterProvider>
  );
}

// Cargo Type Chart Component - uses filter context
type WorkAreaDataType = {
  GCR: { total: number; remaining: number };
  PER: { total: number; remaining: number };
  PIL: { total: number; remaining: number };
};

function CargoTypeChart({
  currentWorkAreaData,
}: {
  currentWorkAreaData: WorkAreaDataType;
}) {
  const { isGcrActive, isPilPerActive, pilPerSubFilter } =
    useWorkAreaFilterContext();

  // Prepare chart data based on active filters from page-level WorkAreaFilterControls
  const cargoTypeChartData = (["GCR", "PER", "PIL"] as const)
    .filter((area) => {
      // Check which areas are active based on filter state
      if (area === "GCR") return isGcrActive;
      if (area === "PER")
        return (
          isPilPerActive &&
          (pilPerSubFilter === "Both" || pilPerSubFilter === "PER only")
        );
      if (area === "PIL")
        return (
          isPilPerActive &&
          (pilPerSubFilter === "Both" || pilPerSubFilter === "PIL only")
        );
      return false;
    })
    .map((area) => {
      const data = currentWorkAreaData[area];
      const completed = data.total - data.remaining;
      return {
        name: area,
        completed,
        remaining: data.remaining,
        total: data.total,
      };
    });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={cargoTypeChartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E5E7EB"
            horizontal={true}
            vertical={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            stroke="#9CA3AF"
            axisLine={{ stroke: "#E5E7EB" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#374151", fontWeight: 500 }}
            stroke="#9CA3AF"
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const completionRate =
                  data.total > 0
                    ? Math.round((data.completed / data.total) * 100)
                    : 0;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                    <div className="font-semibold text-gray-900 mb-2">
                      {label}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[#DC2626]" />
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-medium text-gray-900">
                          {data.completed} ULDs
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[#FCA5A5]" />
                        <span className="text-gray-600">Remaining:</span>
                        <span className="font-medium text-gray-900">
                          {data.remaining} ULDs
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-gray-100 flex justify-between">
                        <span className="text-gray-500">Total:</span>
                        <span className="font-semibold text-gray-900">
                          {data.total} ULDs ({completionRate}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ paddingTop: "16px" }}
            iconType="square"
            iconSize={12}
            formatter={(value) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
          <Bar
            dataKey="completed"
            stackId="a"
            fill="#DC2626"
            name="Completed"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="remaining"
            stackId="a"
            fill="#FCA5A5"
            name="Remaining"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Inner component that uses the shared WorkAreaFilter context
function BDNDashboardScreenContent() {
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [isScreeningTableOpen, setIsScreeningTableOpen] = useState(false);
  const [screeningFilter, setScreeningFilter] = useState<
    "overall" | "usaCaScreening" | "usaCaNoScreening" | "otherSectorScreening"
  >("overall");
  const [workAreaFilter, setWorkAreaFilter] = useState<
    "overall" | "sortByWorkArea"
  >("overall");
  const [selectedWorkArea, setSelectedWorkArea] = useState<string>("E75");
  // Work area filter (GCR/PIL/PER toggle)
  const { selectedWorkArea: gcrPilPerFilter, pilPerSubFilter } =
    useWorkAreaFilter();

  const filterLabels: Record<typeof screeningFilter, string> = {
    overall: "Overall",
    usaCaScreening: "USA & CA Screening",
    usaCaNoScreening: "USA & CA No Screening",
    otherSectorScreening: "Other Sector Screening",
  };

  const currentWorkAreaData =
    workAreaData[
      workAreaFilter === "overall"
        ? "overall"
        : (selectedWorkArea as keyof typeof workAreaData)
    ] || workAreaData.overall;
  const maxBarValue = 100; // Fixed maximum value for bar width

  // Calculate totals for KPI cards
  const totalPlanned =
    bdnData.shift1.planned.total + bdnData.shift2.planned.total;
  const totalBuilt =
    bdnData.shift1.built.total.total + bdnData.shift2.built.total.total;
  const totalPending =
    bdnData.shift1.pending.total + bdnData.shift2.pending.total;
  const completionRate = Math.round((totalBuilt / totalPlanned) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Workload Visibility
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time workload tracking and screening summary
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="TOTAL PLANNED"
            value={totalPlanned.toLocaleString()}
            subtitle="ULDs this shift"
            icon={<Package className="w-6 h-6" />}
            className="chart-delay-1"
          />
          <StatCard
            title="TOTAL BUILT"
            value={totalBuilt.toLocaleString()}
            subtitle="ULDs completed"
            icon={<TrendingUp className="w-6 h-6" />}
            trend={{
              value: completionRate,
              label: "completion",
            }}
            className="chart-delay-2"
          />
          <StatCard
            title="PENDING"
            value={totalPending.toLocaleString()}
            subtitle="ULDs remaining"
            icon={<AlertCircle className="w-6 h-6" />}
            className="chart-delay-3"
          />
          <StatCard
            title="COMPLETION RATE"
            value={`${completionRate}%`}
            subtitle="of planned workload"
            icon={<Clock className="w-6 h-6" />}
            className="chart-delay-4"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap bg-white rounded-xl border border-gray-200 px-4 py-3">
          {/* Default View Dropdown */}
          <select className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent">
            <option value="default">≡ Default View</option>
            <option value="custom">Custom View</option>
          </select>

          <button className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm hover:border-gray-300 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Add Filter</span>
          </button>

          <div className="w-px h-6 bg-gray-200" />

          {/* Work Area Filter - Separate GCR/PER/PIL buttons */}
          <WorkAreaFilterControls variant="separate" />

          {/* Shift Filter */}
          <select className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent">
            <option value="all">Shift: All</option>
            <option value="morning">Morning Shift</option>
            <option value="afternoon">Afternoon Shift</option>
          </select>

          {/* Time Range */}
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm hover:border-gray-300 transition-colors">
            <Clock className="w-4 h-4" />
            Time
          </button>

          <div className="flex-1" />

          {/* View Options */}
          <button className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm hover:border-gray-300 transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Work Area Treemap - Floor Layout */}
        <ChartCard
          title="Workload by Work Area"
          subtitle="Physical warehouse zones - size shows total ULDs, color shows category, opacity shows completion"
          className="mb-6 chart-delay-1"
        >
          <WorkAreaTreemap data={workAreaTreemapData} height={340} />
        </ChartCard>

        {/* Workload by Cargo Type */}
        <ChartCard
          title="Workload by Cargo Type"
          subtitle="ULD completion status by cargo area"
          className="mb-6 chart-delay-2"
          action={
            <div className="flex gap-2 items-center">
              {/* GCR/PER/PIL Filter - Synced with page level */}
              <WorkAreaFilterControls variant="separate" />

              <div className="w-px h-6 bg-gray-200" />

              {/* Work Area Filter */}
              <Select
                value={workAreaFilter}
                onValueChange={(value) => {
                  setWorkAreaFilter(value as "overall" | "sortByWorkArea");
                  if (value === "overall") {
                    setSelectedWorkArea("E75");
                  }
                }}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue>
                    {workAreaFilter === "overall" ? "Overall" : "By Work Area"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall</SelectItem>
                  <SelectItem value="sortByWorkArea">By Work Area</SelectItem>
                </SelectContent>
              </Select>
              {workAreaFilter === "sortByWorkArea" && (
                <Select
                  value={selectedWorkArea}
                  onValueChange={setSelectedWorkArea}
                >
                  <SelectTrigger className="w-[90px] h-8 text-xs">
                    <SelectValue>{selectedWorkArea}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E75">E75</SelectItem>
                    <SelectItem value="L22">L22</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          }
        >
          <CargoTypeChart currentWorkAreaData={currentWorkAreaData} />
        </ChartCard>

        {/* Lower Half - Split into Left and Right */}
        <div className="grid gap-6 grid-cols-2">
          {/* Left Half - Graph and Table */}
          <div className="">
            {/* Single Bar Chart with integrated Detailed Breakdown */}
            <ChartCard
              title="Advance Planned v/s Built"
              subtitle="ULD build progress by shift window"
              className="chart-delay-1 flex-1"
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="shift"
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      stroke="#9CA3AF"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      stroke="#9CA3AF"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                      iconSize={12}
                    />
                    <Bar
                      dataKey="advance"
                      stackId="stack"
                      fill="#DC2626"
                      name="Advance Built"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="pending"
                      stackId="stack"
                      fill="rgba(220, 38, 38, 0.4)"
                      name="Pending"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Collapsible Detailed Breakdown - Inside Card */}
              <Collapsible open={isTableOpen} onOpenChange={setIsTableOpen}>
                <CollapsibleTrigger className="w-full mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between hover:text-gray-700 transition-colors">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Detailed Breakdown
                    </h3>
                    {isTableOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-4 space-y-6">
                    {/* Shift 1: 0600-0900 */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Advance planned v/s Built ({bdnData.shift1.timeRange})
                      </h4>

                      {/* Planned Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Planned
                        </div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">
                                Details
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                PMC-AMF
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                ALF-PLA
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                AKE-RKE
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                SCLR Pcs
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">
                                Planned
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.planned.pmcAmf}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.planned.alfPla}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.planned.akeRke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">
                                {bdnData.shift1.planned.sclrPcs}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center font-semibold">
                                {bdnData.shift1.planned.total}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Advance Built Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Advance built
                        </div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">
                                Details
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                PMC-AMF
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                ALF-PLA
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                AKE-RKE
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                SCLR Pcs
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">
                                Built
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.built.pmcAmf}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.built.alfPla}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.built.akeRke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">
                                {bdnData.shift1.built.built.sclrPcs}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.built.total}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">
                                Thru
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.thru.pmcAmf}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.thru.alfPla}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.thru.akeRke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">
                                {bdnData.shift1.built.thru.sclrPcs}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.thru.total}
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 border border-gray-300">
                                TOTAL
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.total.pmcAmf}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.total.alfPla}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.total.akeRke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.total.sclrPcs}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.built.total.total}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Pending Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Pending
                        </div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">
                                ULD Details
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                PMC-AMF
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                ALF-PLA
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                AKE-RKE
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                SCLR Pcs
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">
                                To action
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.pending.pmcAmf}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.pending.alfPla}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.pending.akeRke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.pending.sclrPcs}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift1.pending.total}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Shift 2: 0901-1259 */}
                    <div className="space-y-4 border-t border-gray-300 pt-6">
                      <h4 className="text-base font-semibold text-gray-900">
                        Advance planned v/s Built ({bdnData.shift2.timeRange})
                      </h4>

                      {/* Planned Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Planned
                        </div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">
                                Details
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                PMC-AMF
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                ALF-PLA
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                AKE-RKE
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                SCLR Pcs
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">
                                Planned
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.planned.pmcAmf}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.planned.alfPla}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.planned.akeRke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">
                                {bdnData.shift2.planned.sclrPcs}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center font-semibold">
                                {bdnData.shift2.planned.total}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Advance Built Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Advance built
                        </div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">
                                Details
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                PMC-AMF
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                ALF-PLA
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                AKE-RKE
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                SCLR Pcs
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">
                                Built
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.built.pmcAmf}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.built.alfPla}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.built.akeRke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">
                                {bdnData.shift2.built.built.sclrPcs}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.built.total}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">
                                Thru
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.thru.pmcAmf}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.thru.alfPla}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.thru.akeRke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">
                                {bdnData.shift2.built.thru.sclrPcs}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.thru.total}
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 border border-gray-300">
                                TOTAL
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.total.pmcAmf}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.total.alfPla}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.total.akeRke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.total.sclrPcs}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.built.total.total}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Pending Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Pending
                        </div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">
                                ULD Details
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                PMC-AMF
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                ALF-PLA
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                AKE-RKE
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                SCLR Pcs
                              </th>
                              <th className="px-3 py-2 text-center border border-gray-300">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">
                                To action
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.pending.pmcAmf}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.pending.alfPla}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.pending.akeRke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.pending.sclrPcs}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                {bdnData.shift2.pending.total}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Total Advance */}
                    <div className="space-y-4 border-t border-gray-300 pt-6">
                      <h4 className="text-base font-semibold text-gray-900">
                        Total Advance
                      </h4>
                      <table className="w-full text-xs border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left border border-gray-300">
                              Details
                            </th>
                            <th className="px-3 py-2 text-center border border-gray-300">
                              PMC-AMF
                            </th>
                            <th className="px-3 py-2 text-center border border-gray-300">
                              ALF-PLA
                            </th>
                            <th className="px-3 py-2 text-center border border-gray-300">
                              AKE-RKE
                            </th>
                            <th className="px-3 py-2 text-center border border-gray-300">
                              SCLR Pcs
                            </th>
                            <th className="px-3 py-2 text-center border border-gray-300">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300 font-medium">
                              {bdnData.shift1.timeRange}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.pmcAmf}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.alfPla}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.akeRke}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.sclrPcs}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.total}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300 font-medium">
                              {bdnData.shift2.timeRange}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift2.built.total.pmcAmf}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift2.built.total.alfPla}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift2.built.total.akeRke}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift2.built.total.sclrPcs}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift2.built.total.total}
                            </td>
                          </tr>
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-3 py-2 border border-gray-300">
                              TOTAL
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.pmcAmf +
                                bdnData.shift2.built.total.pmcAmf}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.alfPla +
                                bdnData.shift2.built.total.alfPla}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.akeRke +
                                bdnData.shift2.built.total.akeRke}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.sclrPcs +
                                bdnData.shift2.built.total.sclrPcs}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.total +
                                bdnData.shift2.built.total.total}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Total Pending */}
                    <div className="space-y-4 border-t border-gray-300 pt-6">
                      <h4 className="text-base font-semibold text-gray-900">
                        Total Pending
                      </h4>
                      <table className="w-full text-xs border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left border border-gray-300">
                              Details
                            </th>
                            <th className="px-3 py-2 text-center border border-gray-300">
                              PMC-AMF
                            </th>
                            <th className="px-3 py-2 text-center border border-gray-300">
                              ALF-PLA
                            </th>
                            <th className="px-3 py-2 text-center border border-gray-300">
                              AKE-RKE
                            </th>
                            <th className="px-3 py-2 text-center border border-gray-300">
                              SCLR Pcs
                            </th>
                            <th className="px-3 py-2 text-center border border-gray-300">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300 font-medium">
                              {bdnData.shift1.timeRange}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.pending.pmcAmf}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.pending.alfPla}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.pending.akeRke}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.pending.sclrPcs}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.pending.total}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300 font-medium">
                              {bdnData.shift2.timeRange}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift2.pending.pmcAmf}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift2.pending.alfPla}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift2.pending.akeRke}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift2.pending.sclrPcs}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift2.pending.total}
                            </td>
                          </tr>
                          <tr className="bg-red-50 font-semibold">
                            <td className="px-3 py-2 border border-gray-300">
                              TOTAL
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                              {bdnData.shift1.pending.pmcAmf +
                                bdnData.shift2.pending.pmcAmf}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                              {bdnData.shift1.pending.alfPla +
                                bdnData.shift2.pending.alfPla}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                              {bdnData.shift1.pending.akeRke +
                                bdnData.shift2.pending.akeRke}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                              {bdnData.shift1.pending.sclrPcs +
                                bdnData.shift2.pending.sclrPcs}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                              {bdnData.shift1.pending.total +
                                bdnData.shift2.pending.total}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </ChartCard>
          </div>

          {/* Right Half - Screening Graph and Tables */}
          <div className=" ">
            {/* Bar Chart for M/A Base, L Base, K Base with integrated Detailed Breakdown */}
            <ChartCard
              title="Screening Summary"
              subtitle="Workload by screening base"
              className="chart-delay-2 flex-1"
              action={
                <Select
                  value={screeningFilter}
                  onValueChange={(value) =>
                    setScreeningFilter(value as typeof screeningFilter)
                  }
                >
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue>{filterLabels[screeningFilter]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overall">Overall</SelectItem>
                    <SelectItem value="usaCaScreening">
                      USA & CA Screening
                    </SelectItem>
                    <SelectItem value="usaCaNoScreening">
                      USA & CA No Screening
                    </SelectItem>
                    <SelectItem value="otherSectorScreening">
                      Other Sector Screening
                    </SelectItem>
                  </SelectContent>
                </Select>
              }
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "M/A Base",
                        value:
                          screeningData[screeningFilter].totalBooked.mABase,
                        pcs: screeningData[screeningFilter].totalBooked.mABase,
                        grWt: screeningData[screeningFilter].totalBooked.grWt,
                        color: "#DC2626", // Red
                      },
                      {
                        name: "L Base",
                        value: screeningData[screeningFilter].totalBooked.lBase,
                        pcs: screeningData[screeningFilter].totalBooked.lBase,
                        grWt: screeningData[screeningFilter].totalBooked.grWt,
                        color: "#EF4444", // Lighter red
                      },
                      {
                        name: "K Base",
                        value: screeningData[screeningFilter].totalBooked.kBase,
                        pcs: screeningData[screeningFilter].totalBooked.kBase,
                        grWt: screeningData[screeningFilter].totalBooked.grWt,
                        color: "#B91C1C", // Darker red
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      stroke="#9CA3AF"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      stroke="#9CA3AF"
                    />
                    <Tooltip content={<ScreeningTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {[
                        { name: "M/A Base", color: "#DC2626" },
                        { name: "L Base", color: "#EF4444" },
                        { name: "K Base", color: "#B91C1C" },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Collapsible Detailed Breakdown - Inside Card */}
              <Collapsible
                open={isScreeningTableOpen}
                onOpenChange={setIsScreeningTableOpen}
              >
                <CollapsibleTrigger className="w-full mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between hover:text-gray-700 transition-colors">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Detailed Breakdown
                    </h3>
                    {isScreeningTableOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-4 space-y-6">
                    {/* SCREENING SUMMARY Table */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900">
                        SCREENING SUMMARY
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th
                                rowSpan={2}
                                className="px-3 py-2 text-left border border-gray-300"
                              >
                                Screening summary
                              </th>
                              <th
                                colSpan={5}
                                className="px-3 py-2 text-center border border-gray-300"
                              >
                                Total Booked Load
                              </th>
                              <th
                                colSpan={5}
                                className="px-3 py-2 text-center border border-gray-300"
                              >
                                Total Pending Booked Load
                              </th>
                            </tr>
                            <tr className="bg-gray-50">
                              <th className="px-2 py-2 text-center border border-gray-300">
                                No of Pcs
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                Gr.Wt
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                M & A Base
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                L Base
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                K Base
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                No of Pcs
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                Gr.Wt
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                M & A Base
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                L Base
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                K Base
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">
                                USA & CA Screening
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.usaCaScreening.totalBooked.pcs.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.usaCaScreening.totalBooked.grWt.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.usaCaScreening.totalBooked
                                    .mABase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.usaCaScreening.totalBooked.lBase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.usaCaScreening.totalBooked.kBase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.usaCaScreening.totalPending.pcs.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.usaCaScreening.totalPending.grWt.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.usaCaScreening.totalPending
                                    .mABase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.usaCaScreening.totalPending
                                    .lBase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.usaCaScreening.totalPending
                                    .kBase
                                }
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">
                                USA & CA No Screening
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.usaCaNoScreening.totalBooked.pcs.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.usaCaNoScreening.totalBooked.grWt.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.usaCaNoScreening.totalBooked
                                    .mABase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.usaCaNoScreening.totalBooked
                                    .lBase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.usaCaNoScreening.totalBooked
                                    .kBase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.usaCaNoScreening.totalPending.pcs.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.usaCaNoScreening.totalPending.grWt.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.usaCaNoScreening.totalPending
                                    .mABase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.usaCaNoScreening.totalPending
                                    .lBase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.usaCaNoScreening.totalPending
                                    .kBase
                                }
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">
                                Other Sector Screening
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.otherSectorScreening.totalBooked.pcs.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.otherSectorScreening.totalBooked.grWt.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.otherSectorScreening.totalBooked
                                    .mABase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.otherSectorScreening.totalBooked
                                    .lBase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.otherSectorScreening.totalBooked
                                    .kBase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.otherSectorScreening.totalPending.pcs.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.otherSectorScreening.totalPending.grWt.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.otherSectorScreening
                                    .totalPending.mABase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.otherSectorScreening
                                    .totalPending.lBase
                                }
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {
                                  screeningData.otherSectorScreening
                                    .totalPending.kBase
                                }
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 border border-gray-300">
                                Total Load
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalBooked.pcs.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalBooked.grWt.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalBooked.mABase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalBooked.lBase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalBooked.kBase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.pcs.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.grWt.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.mABase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.lBase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.kBase}
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 border border-gray-300">
                                Total Screening Load
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalBooked.pcs.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalBooked.grWt.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalBooked.mABase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalBooked.lBase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalBooked.kBase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.pcs.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.grWt.toLocaleString()}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.mABase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.lBase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.kBase}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* US SCREENING & LOADING DETAILS Table */}
                    <div className="space-y-4 border-t border-gray-300 pt-6">
                      <h4 className="text-base font-semibold text-gray-900">
                        US SCREENING & LOADING DETAILS
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th
                                rowSpan={2}
                                className="px-2 py-2 text-left border border-gray-300"
                              >
                                Flight No
                              </th>
                              <th
                                rowSpan={2}
                                className="px-2 py-2 text-center border border-gray-300"
                              >
                                DEST
                              </th>
                              <th
                                rowSpan={2}
                                className="px-2 py-2 text-center border border-gray-300"
                              >
                                ETD
                              </th>
                              <th
                                colSpan={3}
                                className="px-2 py-2 text-center border border-gray-300"
                              >
                                Screened
                              </th>
                              <th
                                colSpan={3}
                                className="px-2 py-2 text-center border border-gray-300"
                              >
                                To be screened
                              </th>
                              <th
                                colSpan={3}
                                className="px-2 py-2 text-center border border-gray-300"
                              >
                                Units Build
                              </th>
                              <th
                                colSpan={3}
                                className="px-2 py-2 text-center border border-gray-300"
                              >
                                Units to be Build
                              </th>
                            </tr>
                            <tr className="bg-gray-50">
                              <th className="px-2 py-2 text-center border border-gray-300">
                                No of shipments
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                No of Pcs
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                Gr. Wt.
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                No of shipments
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                No of Pcs
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                Gr. Wt.
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                M/A Base
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                L Base
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                K Base
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                M/A Base
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                L Base
                              </th>
                              <th className="px-2 py-2 text-center border border-gray-300">
                                K Base
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {flightDetails.map((flight, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-2 py-2 border border-gray-300 font-medium">
                                  {flight.flight}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  {flight.dest}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  {flight.etd}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  {flight.screenedShipments}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  {flight.screenedPcs}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  {flight.screenedGrWt}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                                  {flight.toBeScreenedShipments === 0
                                    ? "LOADING OVER"
                                    : flight.toBeScreenedShipments}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                                  {flight.toBeScreenedPcs === 0
                                    ? "LOADING OVER"
                                    : flight.toBeScreenedPcs}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                                  {flight.toBeScreenedGrWt === 0
                                    ? "LOADING OVER"
                                    : flight.toBeScreenedGrWt}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  {flight.buildMABase}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  {flight.buildLBase}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  {flight.buildKBase}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                                  {flight.toBuildMABase === 0
                                    ? "LOADING OVER"
                                    : flight.toBuildMABase}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                                  {flight.toBuildLBase === 0
                                    ? "LOADING OVER"
                                    : flight.toBuildLBase}
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                                  {flight.toBuildKBase === 0
                                    ? "LOADING OVER"
                                    : flight.toBuildKBase}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-gray-50 font-semibold">
                              <td
                                colSpan={3}
                                className="px-2 py-2 border border-gray-300 text-right"
                              >
                                TOTAL
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {flightDetails.reduce(
                                  (sum, f) => sum + f.screenedShipments,
                                  0
                                )}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {flightDetails.reduce(
                                  (sum, f) => sum + f.screenedPcs,
                                  0
                                )}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {flightDetails.reduce(
                                  (sum, f) => sum + f.screenedGrWt,
                                  0
                                )}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                                LOADING OVER
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                                LOADING OVER
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                                LOADING OVER
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {flightDetails.reduce(
                                  (sum, f) => sum + f.buildMABase,
                                  0
                                )}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {flightDetails.reduce(
                                  (sum, f) => sum + f.buildLBase,
                                  0
                                )}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {flightDetails.reduce(
                                  (sum, f) => sum + f.buildKBase,
                                  0
                                )}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.mABase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.lBase}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                {screeningData.overall.totalPending.kBase}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
}
