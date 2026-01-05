"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Download,
  Plus,
  Search,
  Clock,
  X,
  Settings2,
  ArrowUpDown,
  SlidersHorizontal,
  Users,
  TrendingUp,
  Zap,
  Trophy,
  ChevronDown,
  ChevronUp,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useWorkAreaFilter,
  WorkAreaFilterControls,
  WorkAreaFilterProvider,
} from "./work-area-filter-controls";
import {
  StatCard,
  ChartCard,
  EfficiencyLeaderboard,
  ProductivityScatter,
  ULDStackedBar,
} from "@/components/ui/dashboard-charts";

// Filter types
type Shift = "All" | "9am to 9pm" | "9pm to 9am";
type Module =
  | "All"
  | "PAX & PF build-up EUR (1st floor, E)"
  | "PAX & PF build-up AFR (1st floor, F)"
  | "PAX & PF build-up ME, SubCon, Asia (1st floor, G)"
  | "Build-up AUS (1st floor, H)"
  | "US Screening Flights (1st floor, I)"
  | "Freighter & PAX Breakdown & build-up (Ground floor, F)"
  | "IND/PAK Build-up (Ground floor, G)"
  | "PER (Ground floor, H)"
  | "PIL (Ground floor, I)";

const SHIFTS: Shift[] = ["All", "9am to 9pm", "9pm to 9am"];
const MODULES: Module[] = [
  "All",
  "PAX & PF build-up EUR (1st floor, E)",
  "PAX & PF build-up AFR (1st floor, F)",
  "PAX & PF build-up ME, SubCon, Asia (1st floor, G)",
  "Build-up AUS (1st floor, H)",
  "US Screening Flights (1st floor, I)",
  "Freighter & PAX Breakdown & build-up (Ground floor, F)",
  "IND/PAK Build-up (Ground floor, G)",
  "PER (Ground floor, H)",
  "PIL (Ground floor, I)",
];

// Unified Staff Performance Type
type StaffPerformance = {
  id: number;
  staffName: string;
  avatar: string;
  staffNo: string;
  ekOutsource: string;
  totalHrs: number;
  totalUnits: number;
  efficiency: number | string; // Can be number or "#DIV/0!" for division by zero
  // GCR-specific fields
  flightCount?: number;
  deployment?: string;
  contact?: string;
  // PIL/PER-specific fields
  akeDpe?: number;
  alfDqf?: number;
  ldPmcAmf?: number;
  mdQ6Q7?: number;
  bulkKg?: number;
  actualThruUnit?: number;
  actualTopUpUnit?: string;
};

// Helper function to calculate efficiency
function calculateEfficiency(
  totalUnits: number,
  totalHrs: number
): number | string {
  if (totalHrs === 0) return "#DIV/0!";
  return Number((totalUnits / totalHrs).toFixed(1));
}

const HARDCODED_STAFF: StaffPerformance[] = [
  // GCR staff samples
  {
    id: 1,
    staffName: "Hassan Ibrahim",
    avatar: "HI",
    staffNo: "EK001",
    ekOutsource: "EK",
    totalHrs: 12,
    totalUnits: 59,
    efficiency: calculateEfficiency(59, 12),
    flightCount: 8,
    deployment: "Module E",
    contact: "+971 50 123 4567",
  },
  {
    id: 2,
    staffName: "Sophie Anderson",
    avatar: "SA",
    staffNo: "EK002",
    ekOutsource: "EK",
    totalHrs: 12,
    totalUnits: 33,
    efficiency: calculateEfficiency(33, 12),
    flightCount: 5,
    deployment: "Module F",
    contact: "+971 50 234 5678",
  },
  {
    id: 3,
    staffName: "Emily Chen",
    avatar: "EC",
    staffNo: "EK003",
    ekOutsource: "EK",
    totalHrs: 12,
    totalUnits: 30,
    efficiency: calculateEfficiency(30, 12),
    flightCount: 4,
    deployment: "Module G",
    contact: "+971 50 345 6789",
  },
  // PIL/PER staff samples
  {
    id: 4,
    staffName: "Ahmed Hassan",
    avatar: "AH",
    staffNo: "EK004",
    ekOutsource: "EK",
    totalHrs: 12,
    totalUnits: 45,
    efficiency: calculateEfficiency(45, 12),
    akeDpe: 20,
    alfDqf: 10,
    ldPmcAmf: 8,
    mdQ6Q7: 7,
    bulkKg: 0,
    actualThruUnit: 0,
    actualTopUpUnit: "EKP BUILD UP",
    contact: "+971 50 567 8901",
  },
  {
    id: 5,
    staffName: "Mohammed Ali",
    avatar: "MA",
    staffNo: "EK005",
    ekOutsource: "EK",
    totalHrs: 12,
    totalUnits: 38,
    efficiency: calculateEfficiency(38, 12),
    akeDpe: 15,
    alfDqf: 12,
    ldPmcAmf: 6,
    mdQ6Q7: 5,
    bulkKg: 0,
    actualThruUnit: 0,
    actualTopUpUnit: "EKP BUILD UP",
    contact: "+971 50 678 9012",
  },
  {
    id: 6,
    staffName: "Ryan Martinez",
    avatar: "RM",
    staffNo: "OS001",
    ekOutsource: "DPWorld",
    totalHrs: 12,
    totalUnits: 32,
    efficiency: calculateEfficiency(32, 12),
    akeDpe: 29,
    alfDqf: 3,
    ldPmcAmf: 0,
    mdQ6Q7: 0,
    bulkKg: 0,
    actualThruUnit: 0,
    actualTopUpUnit: "CTO SCREENING",
    contact: "+971 50 789 0123",
  },
  {
    id: 7,
    staffName: "James Wilson",
    avatar: "JW",
    staffNo: "EK006",
    ekOutsource: "EK",
    totalHrs: 10,
    totalUnits: 28,
    efficiency: calculateEfficiency(28, 10),
    flightCount: 4,
    deployment: "Module E",
    contact: "+971 50 456 7890",
  },
  {
    id: 8,
    staffName: "Sarah Khan",
    avatar: "SK",
    staffNo: "OS002",
    ekOutsource: "TG",
    totalHrs: 11,
    totalUnits: 25,
    efficiency: calculateEfficiency(25, 11),
    akeDpe: 12,
    alfDqf: 8,
    ldPmcAmf: 3,
    mdQ6Q7: 2,
    bulkKg: 0,
    actualThruUnit: 0,
    actualTopUpUnit: "EKP BUILD UP",
    contact: "+971 50 890 1234",
  },
];

// Wrapper component that provides the WorkAreaFilter context
export default function PerformanceScreen() {
  return (
    <WorkAreaFilterProvider>
      <PerformanceScreenContent />
    </WorkAreaFilterProvider>
  );
}

// Inner component that uses the shared WorkAreaFilter context
function PerformanceScreenContent() {
  // Work area filter hook
  const { selectedWorkArea, pilPerSubFilter } = useWorkAreaFilter();
  const [selectedShift, setSelectedShift] = useState<Shift>("All" as Shift);
  const [selectedModule, setSelectedModule] = useState<Module>("All");
  const [customTimeRange, setCustomTimeRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false);
  const timeRangePickerRef = useRef<HTMLDivElement>(null);
  const [showAddFilterDropdown, setShowAddFilterDropdown] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);
  const addFilterRef = useRef<HTMLDivElement>(null);
  const viewOptionsRef = useRef<HTMLDivElement>(null);
  const [showDetailedTable, setShowDetailedTable] = useState(true);

  // Generate hourly time options (00:00 to 23:00)
  const timeOptions = useMemo(() => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      options.push(`${hour.toString().padStart(2, "0")}:00`);
    }
    return options;
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        timeRangePickerRef.current &&
        !timeRangePickerRef.current.contains(event.target as Node)
      ) {
        setShowTimeRangePicker(false);
      }
      if (
        addFilterRef.current &&
        !addFilterRef.current.contains(event.target as Node)
      ) {
        setShowAddFilterDropdown(false);
      }
      if (
        viewOptionsRef.current &&
        !viewOptionsRef.current.contains(event.target as Node)
      ) {
        setShowViewOptions(false);
      }
    }

    if (showTimeRangePicker || showAddFilterDropdown || showViewOptions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showTimeRangePicker, showAddFilterDropdown, showViewOptions]);

  // Filter staff based on work area
  const filteredStaff = useMemo(() => {
    if (selectedWorkArea === "All") return HARDCODED_STAFF;
    if (selectedWorkArea === "GCR") {
      return HARDCODED_STAFF.filter((s) => s.flightCount !== undefined);
    }
    if (selectedWorkArea === "PIL and PER") {
      return HARDCODED_STAFF.filter((s) => s.akeDpe !== undefined);
    }
    return HARDCODED_STAFF;
  }, [selectedWorkArea]);

  // PIL/PER staff for ULD breakdown chart
  const pilPerStaff = useMemo(() => {
    return HARDCODED_STAFF.filter((s) => s.akeDpe !== undefined);
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const totalStaff = filteredStaff.length;
    const totalUnits = filteredStaff.reduce((sum, s) => sum + s.totalUnits, 0);
    const totalHours = filteredStaff.reduce((sum, s) => sum + s.totalHrs, 0);
    const avgEfficiency = totalHours > 0 ? totalUnits / totalHours : 0;

    // Get top performer
    const sortedByEfficiency = [...filteredStaff].sort((a, b) => {
      const aEff = typeof a.efficiency === "number" ? a.efficiency : 0;
      const bEff = typeof b.efficiency === "number" ? b.efficiency : 0;
      return bEff - aEff;
    });
    const topPerformer = sortedByEfficiency[0];

    return {
      totalStaff,
      totalUnits,
      avgEfficiency,
      topPerformer,
      avgTotalHrs: totalHours / (totalStaff || 1),
      avgTotalUnits: totalUnits / (totalStaff || 1),
    };
  }, [filteredStaff]);

  // Efficiency leaderboard data
  const efficiencyData = useMemo(() => {
    return filteredStaff.map((s) => ({
      name: s.staffName,
      avatar: s.avatar,
      efficiency: typeof s.efficiency === "number" ? s.efficiency : 0,
      isAboveAverage:
        typeof s.efficiency === "number"
          ? s.efficiency >= stats.avgEfficiency
          : false,
    }));
  }, [filteredStaff, stats.avgEfficiency]);

  // Productivity scatter data
  const scatterData = useMemo(() => {
    return filteredStaff.map((s) => ({
      name: s.staffName,
      hours: s.totalHrs,
      units: s.totalUnits,
      efficiency: typeof s.efficiency === "number" ? s.efficiency : 0,
      isEK: s.ekOutsource === "EK",
    }));
  }, [filteredStaff]);

  // ULD breakdown data (for PIL/PER)
  const uldBreakdownData = useMemo(() => {
    return pilPerStaff.map((s) => ({
      name: s.staffName,
      akeDpe: s.akeDpe || 0,
      alfDqf: s.alfDqf || 0,
      ldPmcAmf: s.ldPmcAmf || 0,
      mdQ6Q7: s.mdQ6Q7 || 0,
    }));
  }, [pilPerStaff]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Staff Performance
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time performance tracking and analytics
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 bg-white">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="ACTIVE STAFF"
            value={stats.totalStaff}
            icon={<Users className="w-5 h-5" />}
            trend={{ value: 12, label: "vs yesterday" }}
            className="chart-delay-1"
          />
          <StatCard
            title="TOTAL UNITS"
            value={stats.totalUnits}
            icon={<Zap className="w-5 h-5" />}
            trend={{ value: 8, label: "vs yesterday" }}
            className="chart-delay-2"
          />
          <StatCard
            title="AVG EFFICIENCY"
            value={`${stats.avgEfficiency.toFixed(1)}`}
            subtitle="units per hour"
            icon={<TrendingUp className="w-5 h-5" />}
            trend={{ value: 5, label: "vs yesterday" }}
            className="chart-delay-3"
          />
          <StatCard
            title="TOP PERFORMER"
            value={stats.topPerformer?.staffName || "—"}
            subtitle={
              stats.topPerformer
                ? `${stats.topPerformer.efficiency} units/hr`
                : ""
            }
            icon={<Trophy className="w-5 h-5" />}
            className="chart-delay-4"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap bg-white rounded-xl border border-gray-200 px-4 py-3">
          {/* Work Area Filter */}
          <WorkAreaFilterControls />

          {/* Shift Filter */}
          <select
            id="shift-filter"
            value={selectedShift}
            onChange={(e) => {
              setSelectedShift(e.target.value as Shift);
              if (e.target.value !== "All") setCustomTimeRange(null);
            }}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent shadow-sm"
          >
            {SHIFTS.map((shift) => (
              <option key={shift} value={shift}>
                Shift: {shift}
              </option>
            ))}
          </select>

          {/* Time Range */}
          <div className="relative" ref={timeRangePickerRef}>
            <button
              type="button"
              onClick={() => setShowTimeRangePicker(!showTimeRangePicker)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg bg-white transition-colors shadow-sm ${
                customTimeRange
                  ? "border-[#D71A21] text-[#D71A21]"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>
                {customTimeRange
                  ? `${customTimeRange.start}-${customTimeRange.end}`
                  : "Time Range"}
              </span>
              {customTimeRange && (
                <X
                  className="w-3 h-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomTimeRange(null);
                  }}
                />
              )}
            </button>

            {showTimeRangePicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-56">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-900">
                    Time Range
                  </h3>
                  <button
                    onClick={() => setShowTimeRangePicker(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={customTimeRange?.start || "00:00"}
                    onChange={(e) =>
                      setCustomTimeRange((prev) => ({
                        start: e.target.value,
                        end: prev?.end || e.target.value,
                      }))
                    }
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400">to</span>
                  <select
                    value={customTimeRange?.end || "23:00"}
                    onChange={(e) =>
                      setCustomTimeRange((prev) => ({
                        start: prev?.start || "00:00",
                        end: e.target.value,
                      }))
                    }
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCustomTimeRange(null);
                      setShowTimeRangePicker(false);
                    }}
                    className="flex-1 px-2 py-1 text-xs border rounded"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowTimeRangePicker(false)}
                    className="flex-1 px-2 py-1 text-xs bg-[#D71A21] text-white rounded"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Module Filter */}
          <select
            id="module-filter"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value as Module)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent max-w-48 truncate shadow-sm"
          >
            {MODULES.map((module) => (
              <option key={module} value={module}>
                {module === "All"
                  ? "Module: All"
                  : module.length > 30
                  ? module.slice(0, 30) + "..."
                  : module}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          {/* Staff count */}
          <div className="text-xs text-gray-500 whitespace-nowrap bg-white px-3 py-1.5 rounded-lg shadow-sm">
            {filteredStaff.length} staff members
          </div>
        </div>

        {/* Charts Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Efficiency Leaderboard */}
          <ChartCard
            title="Efficiency Leaderboard"
            subtitle="Staff ranked by units processed per hour"
            className="chart-delay-1"
          >
            <EfficiencyLeaderboard
              data={efficiencyData}
              averageValue={stats.avgEfficiency}
              height={320}
            />
          </ChartCard>

          {/* Productivity Scatter */}
          <ChartCard
            title="Productivity Analysis"
            subtitle="Hours worked vs. units processed"
            className="chart-delay-2"
          >
            <ProductivityScatter data={scatterData} height={320} />
          </ChartCard>
        </div>

        {/* ULD Type Breakdown - commented out for now */}
        {/* {pilPerStaff.length > 0 && (selectedWorkArea === "All" || selectedWorkArea === "PIL and PER") && (
          <ChartCard
            title="ULD Type Breakdown"
            subtitle="Container type distribution by staff (PIL/PER)"
            className="mb-6 chart-delay-3"
          >
            <ULDStackedBar
              data={uldBreakdownData}
              height={Math.max(200, uldBreakdownData.length * 50)}
            />
          </ChartCard>
        )} */}

        {/* Detailed Performance Table (Collapsible) */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowDetailedTable(!showDetailedTable)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Detailed Performance Data
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {filteredStaff.length} records
              </span>
            </div>
            {showDetailedTable ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showDetailedTable && (
            <div className="border-t border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Staff
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Units
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Efficiency
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Average Row */}
                    <tr className="bg-gray-50/50">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-sm text-gray-900">
                          Team Average
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">—</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">
                        —
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                        {stats.avgTotalHrs.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                        {Math.round(stats.avgTotalUnits)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-[#D71A21]">
                          {stats.avgEfficiency.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">
                        —
                      </td>
                    </tr>
                    {/* Staff Rows */}
                    {filteredStaff.map((staff) => {
                      const efficiency =
                        typeof staff.efficiency === "number"
                          ? staff.efficiency
                          : 0;
                      const isAboveAvg = efficiency >= stats.avgEfficiency;
                      const isNearAvg =
                        efficiency >= stats.avgEfficiency * 0.8 &&
                        efficiency < stats.avgEfficiency;

                      return (
                        <tr
                          key={staff.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D71A21] to-[#B91C1C] flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                                {staff.avatar}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {staff.staffName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {staff.staffNo || "No ID"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>{staff.contact || "—"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                staff.ekOutsource === "EK"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {staff.ekOutsource}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">
                            {staff.totalHrs}h
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                            {staff.totalUnits}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`text-sm font-bold ${
                                isAboveAvg
                                  ? "text-green-600"
                                  : isNearAvg
                                  ? "text-amber-600"
                                  : "text-red-600"
                              }`}
                            >
                              {staff.efficiency}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${
                                isAboveAvg
                                  ? "bg-green-50 text-green-700"
                                  : isNearAvg
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isAboveAvg
                                    ? "bg-green-500"
                                    : isNearAvg
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                              />
                              {isAboveAvg
                                ? "Above Avg"
                                : isNearAvg
                                ? "Near Avg"
                                : "Below Avg"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
