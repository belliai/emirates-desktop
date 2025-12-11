"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Download, Plus, Search, Clock, X, Settings2, ArrowUpDown, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkAreaFilter, WorkAreaFilterControls } from "./work-area-filter-controls"

// Filter types
type Shift = "All" | "9am to 9pm" | "9pm to 9am"
type Module = "All" | "PAX & PF build-up EUR (1st floor, E)" | "PAX & PF build-up AFR (1st floor, F)" | "PAX & PF build-up ME, SubCon, Asia (1st floor, G)" | "Build-up AUS (1st floor, H)" | "US Screening Flights (1st floor, I)" | "Freighter & PAX Breakdown & build-up (Ground floor, F)" | "IND/PAK Build-up (Ground floor, G)" | "PER (Ground floor, H)" | "PIL (Ground floor, I)"

const SHIFTS: Shift[] = ["All", "9am to 9pm", "9pm to 9am"]
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
]

// Unified Staff Performance Type
type StaffPerformance = {
  id: number
  staffName: string
  avatar: string
  staffNo: string
  ekOutsource: string
  totalHrs: number
  totalUnits: number
  efficiency: number | string // Can be number or "#DIV/0!" for division by zero
  // GCR-specific fields
  flightCount?: number
  deployment?: string
  contact?: string
  // PIL/PER-specific fields
  akeDpe?: number
  alfDqf?: number
  ldPmcAmf?: number
  mdQ6Q7?: number
  bulkKg?: number
  actualThruUnit?: number
  actualTopUpUnit?: string
}

// Helper function to calculate efficiency
function calculateEfficiency(totalUnits: number, totalHrs: number): number | string {
  if (totalHrs === 0) return "#DIV/0!"
  return Number((totalUnits / totalHrs).toFixed(1))
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
  },
  {
    id: 6,
    staffName: "RYAN",
    avatar: "RY",
    staffNo: "",
    ekOutsource: "EK",
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
  },
]

export default function PerformanceScreen() {
  // Work area filter hook
  const { selectedWorkArea, pilPerSubFilter } = useWorkAreaFilter()
  const [selectedShift, setSelectedShift] = useState<Shift>("All" as Shift)
  const [selectedModule, setSelectedModule] = useState<Module>("All")
  const [customTimeRange, setCustomTimeRange] = useState<{ start: string; end: string } | null>(null)
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false)
  const timeRangePickerRef = useRef<HTMLDivElement>(null)
  const [showAddFilterDropdown, setShowAddFilterDropdown] = useState(false)
  const [showViewOptions, setShowViewOptions] = useState(false)
  const addFilterRef = useRef<HTMLDivElement>(null)
  const viewOptionsRef = useRef<HTMLDivElement>(null)

  // Generate hourly time options (00:00 to 23:00)
  const timeOptions = useMemo(() => {
    const options: string[] = []
    for (let hour = 0; hour < 24; hour++) {
      options.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return options
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (timeRangePickerRef.current && !timeRangePickerRef.current.contains(event.target as Node)) {
        setShowTimeRangePicker(false)
      }
      if (addFilterRef.current && !addFilterRef.current.contains(event.target as Node)) {
        setShowAddFilterDropdown(false)
      }
      if (viewOptionsRef.current && !viewOptionsRef.current.contains(event.target as Node)) {
        setShowViewOptions(false)
      }
    }

    if (showTimeRangePicker || showAddFilterDropdown || showViewOptions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showTimeRangePicker, showAddFilterDropdown, showViewOptions])

  // Filter staff based on work area
  const filteredStaff = useMemo(() => {
    if (selectedWorkArea === "All") return HARDCODED_STAFF
    if (selectedWorkArea === "GCR") {
      return HARDCODED_STAFF.filter(s => s.flightCount !== undefined)
    }
    if (selectedWorkArea === "PIL and PER") {
      return HARDCODED_STAFF.filter(s => s.akeDpe !== undefined)
    }
    return HARDCODED_STAFF
  }, [selectedWorkArea])

  // Calculate averages
  const avgTotalUnits = Math.round(
    filteredStaff.reduce((sum, s) => sum + s.totalUnits, 0) / (filteredStaff.length || 1)
  )
  const avgTotalHrs = (
    filteredStaff.reduce((sum, s) => sum + s.totalHrs, 0) / (filteredStaff.length || 1)
  ).toFixed(1)
  
  // Calculate average efficiency (weighted by hours)
  const totalHours = filteredStaff.reduce((sum, s) => sum + s.totalHrs, 0)
  const totalUnits = filteredStaff.reduce((sum, s) => sum + s.totalUnits, 0)
  const avgEfficiency = totalHours > 0 ? (totalUnits / totalHours).toFixed(1) : "#DIV/0!"

  // Top performers
  const topPerformers = useMemo(() => {
    const sorted = [...filteredStaff].sort((a, b) => {
      const aEff = typeof a.efficiency === "number" ? a.efficiency : 0
      const bEff = typeof b.efficiency === "number" ? b.efficiency : 0
      return bEff - aEff
    })
    return sorted.slice(0, 3)
  }, [filteredStaff])

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Staff Performance</h1>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Download Data
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 px-2 flex-wrap">
          {/* Default View Dropdown */}
          <div className="flex items-center">
            <select
              className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
            >
              <option value="default">≡ Default</option>
              <option value="custom">Custom View</option>
            </select>
          </div>

          {/* Add Filter Dropdown */}
          <div className="relative" ref={addFilterRef}>
            <button
              type="button"
              onClick={() => setShowAddFilterDropdown(!showAddFilterDropdown)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Filter</span>
            </button>
            
            {showAddFilterDropdown && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-48">
                <div className="p-2">
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search column..."
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
                    />
                  </div>
                  <div className="space-y-0.5">
                    {["Staff Name", "Staff Number", "EK/Outsource", "Total Hours", "Efficiency"].map((col) => (
                      <button
                        key={col}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded transition-colors text-left"
                        onClick={() => setShowAddFilterDropdown(false)}
                      >
                        <span className="text-gray-400">≡</span>
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Staff */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
              className="pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent w-32"
            />
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {/* Work Area Filter */}
          <WorkAreaFilterControls />

          {/* Shift Filter - Compact */}
          <select
            id="shift-filter"
            value={selectedShift}
            onChange={(e) => {
              setSelectedShift(e.target.value as Shift)
              if (e.target.value !== "All") setCustomTimeRange(null)
            }}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
          >
            {SHIFTS.map(shift => (
              <option key={shift} value={shift}>
                Shift: {shift}
              </option>
            ))}
          </select>

          {/* Time Range - Compact */}
          <div className="relative" ref={timeRangePickerRef}>
            <button
              type="button"
              onClick={() => setShowTimeRangePicker(!showTimeRangePicker)}
              className={`flex items-center gap-1 px-2 py-1.5 text-xs border rounded-md bg-white transition-colors ${
                customTimeRange ? "border-[#D71A21] text-[#D71A21]" : "border-gray-300 text-gray-700 hover:border-gray-400"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{customTimeRange ? `${customTimeRange.start}-${customTimeRange.end}` : "Time"}</span>
              {customTimeRange && (
                <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); setCustomTimeRange(null) }} />
              )}
            </button>
            
            {showTimeRangePicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-56">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-900">Time Range</h3>
                  <button onClick={() => setShowTimeRangePicker(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={customTimeRange?.start || "00:00"}
                    onChange={(e) => setCustomTimeRange(prev => ({ start: e.target.value, end: prev?.end || e.target.value }))}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                  >
                    {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                  <span className="text-xs text-gray-400">to</span>
                  <select
                    value={customTimeRange?.end || "23:00"}
                    onChange={(e) => setCustomTimeRange(prev => ({ start: prev?.start || "00:00", end: e.target.value }))}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                  >
                    {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setCustomTimeRange(null); setShowTimeRangePicker(false) }} className="flex-1 px-2 py-1 text-xs border rounded">Clear</button>
                  <button onClick={() => setShowTimeRangePicker(false)} className="flex-1 px-2 py-1 text-xs bg-[#D71A21] text-white rounded">Apply</button>
                </div>
              </div>
            )}
          </div>

          {/* Module Filter - Compact */}
          <select
            id="module-filter"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value as Module)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent max-w-40 truncate"
          >
            {MODULES.map(module => (
              <option key={module} value={module}>
                {module === "All" ? "Module: All" : module.length > 30 ? module.slice(0, 30) + "..." : module}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          {/* View Options Panel */}
          <div className="relative" ref={viewOptionsRef}>
            <button
              type="button"
              onClick={() => setShowViewOptions(!showViewOptions)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 transition-colors"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
            
            {showViewOptions && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-64">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">View Options</h3>
                  
                  {/* Ordering */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Ordering</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <select className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded">
                        <option>Staff Name</option>
                        <option>Total Hours</option>
                        <option>Efficiency</option>
                        <option>Total Units</option>
                      </select>
                      <button className="p-1.5 border border-gray-200 rounded hover:bg-gray-50">
                        <ArrowUpDown className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Display Fields */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <Settings2 className="w-3 h-3" />
                      <span>Display Fields</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {["Staff Name", "Total Hours", "Total Units", "Efficiency"].map((field) => (
                        <span
                          key={field}
                          className="px-1.5 py-0.5 text-[10px] bg-[#D71A21]/10 text-[#D71A21] border border-[#D71A21]/20 rounded cursor-pointer hover:bg-[#D71A21]/20 transition-colors"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Staff count */}
          <div className="text-xs text-gray-500 whitespace-nowrap">
            Showing {filteredStaff.length} of {HARDCODED_STAFF.length} staff
          </div>
        </div>

        {/* Top Performers */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPerformers.map((staff, index) => (
              <div key={staff.id} className="border rounded-lg p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#D71A21] flex items-center justify-center text-white font-semibold">
                  {staff.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{staff.staffName}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {index === 0 && `Efficiency: ${staff.efficiency}`}
                    {index === 1 && `Total Units: ${staff.totalUnits}`}
                    {index === 2 && `Total Hours: ${staff.totalHrs}h`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Performance Table */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Staff Performance</h3>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Staff</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Total Hours</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Total Units</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Efficiency<br/>(Units/HR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Average Row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-3 text-sm">Average</td>
                    <td className="px-4 py-3 text-sm text-center">{avgTotalHrs}</td>
                    <td className="px-4 py-3 text-sm text-center">{avgTotalUnits}</td>
                    <td className="px-4 py-3 text-sm text-center">{avgEfficiency}</td>
                  </tr>
                  {/* Staff Rows */}
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#D71A21] flex items-center justify-center text-white text-xs font-semibold">
                            {staff.avatar}
                          </div>
                          <span className="text-sm font-medium text-[#D71A21]">{staff.staffName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{staff.totalHrs}</td>
                      <td className="px-4 py-3 text-sm text-center text-[#D71A21]">{staff.totalUnits}</td>
                      <td className="px-4 py-3 text-sm text-center text-[#D71A21]">{staff.efficiency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

