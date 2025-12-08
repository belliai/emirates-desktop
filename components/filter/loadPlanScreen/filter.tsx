"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Search, SlidersHorizontal, Plane, ArrowUpDown, Settings2 } from "lucide-react"
import { WorkAreaFilterControls } from "@/components/work-area-filter-controls"
import type { ShiftType, PeriodType, WaveType } from "@/lib/load-plan-context"

interface LoadPlanFilterProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  shiftFilter: ShiftType
  onShiftFilterChange: (value: ShiftType) => void
  periodFilter: PeriodType
  onPeriodFilterChange: (value: PeriodType) => void
  waveFilter: WaveType
  onWaveFilterChange: (value: WaveType) => void
  showWaveFilter: boolean
  sortColumn: "std" | "flight" | "date"
  onSortColumnChange: (value: "std" | "flight" | "date") => void
  sortDirection: "asc" | "desc"
  onSortDirectionChange: (value: "asc" | "desc") => void
  filteredCount: number
  totalCount: number
}

export function LoadPlanFilter({
  searchQuery,
  onSearchChange,
  shiftFilter,
  onShiftFilterChange,
  periodFilter,
  onPeriodFilterChange,
  waveFilter,
  onWaveFilterChange,
  showWaveFilter,
  sortColumn,
  onSortColumnChange,
  sortDirection,
  onSortDirectionChange,
  filteredCount,
  totalCount,
}: LoadPlanFilterProps) {
  const [showAddFilterDropdown, setShowAddFilterDropdown] = useState(false)
  const [showViewOptions, setShowViewOptions] = useState(false)
  const addFilterRef = useRef<HTMLDivElement>(null)
  const viewOptionsRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addFilterRef.current && !addFilterRef.current.contains(event.target as Node)) {
        setShowAddFilterDropdown(false)
      }
      if (viewOptionsRef.current && !viewOptionsRef.current.contains(event.target as Node)) {
        setShowViewOptions(false)
      }
    }

    if (showAddFilterDropdown || showViewOptions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showAddFilterDropdown, showViewOptions])

  return (
    <div className="flex items-center gap-2 mb-4 px-2 flex-wrap">
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
                {["Flight", "Date", "ACFT TYPE", "ACFT REG", "PAX", "STD", "TTL PLN ULD"].map((col) => (
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

      {/* Search Load Plans */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search load plans..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent w-36"
        />
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Work Area Filter */}
      <WorkAreaFilterControls />

      {/* Shift Type Filter - Compact */}
      <select
        id="shift-filter"
        value={shiftFilter}
        onChange={(e) => {
          const newShift = e.target.value as ShiftType
          onShiftFilterChange(newShift)
          onPeriodFilterChange("all")
          onWaveFilterChange("all")
        }}
        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
      >
        <option value="current">Current (All)</option>
        <option value="night">Night Shift</option>
        <option value="day">Day Shift</option>
      </select>

      {/* Period Filter - Compact (conditional based on shift) */}
      <select
        id="period-filter"
        value={periodFilter}
        onChange={(e) => {
          onPeriodFilterChange(e.target.value as PeriodType)
          if (e.target.value === "early-morning") {
            onWaveFilterChange("all")
          }
        }}
        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
      >
        {shiftFilter === "current" && (
          <>
            <option value="all">All Periods</option>
            <option value="early-morning">Early Morning (00:01-05:59)</option>
            <option value="late-morning">Late Morning (06:00-12:59)</option>
            <option value="afternoon">Afternoon (13:00-23:59)</option>
          </>
        )}
        {shiftFilter === "night" && (
          <>
            <option value="all">All Periods</option>
            <option value="early-morning">Early Morning (00:01-05:59)</option>
            <option value="late-morning">Late Morning (06:00-12:59)</option>
          </>
        )}
        {shiftFilter === "day" && (
          <>
            <option value="all">All Periods</option>
            <option value="afternoon">Afternoon (13:00-23:59)</option>
          </>
        )}
      </select>

      {/* Wave Filter - Compact (conditional) */}
      {showWaveFilter && (
        <select
          id="wave-filter"
          value={waveFilter}
          onChange={(e) => onWaveFilterChange(e.target.value as WaveType)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
        >
          <option value="all">All Waves</option>
          <option value="first-wave">
            {periodFilter === "late-morning" ? "First Wave (06:00-09:00)" : "First Wave (13:00-15:59)"}
          </option>
          <option value="second-wave">
            {periodFilter === "late-morning" ? "Second Wave (09:01-12:59)" : "Second Wave (16:00-23:59)"}
          </option>
        </select>
      )}

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
              
              {/* Show Load Plans */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                  <Plane className="w-3 h-3 text-[#D71A21]" />
                  <span>Show Load Plans</span>
                </div>
                <select className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded">
                  <option>All Load Plans</option>
                  <option>With ULDs Only</option>
                  <option>Without ULDs</option>
                </select>
              </div>
              
              {/* Ordering */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Ordering</span>
                </div>
                <div className="flex items-center gap-1">
                  <select 
                    value={sortColumn}
                    onChange={(e) => onSortColumnChange(e.target.value as "std" | "flight" | "date")}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
                  >
                    <option value="std">STD Time</option>
                    <option value="flight">Flight Number</option>
                    <option value="date">Date</option>
                  </select>
                  <button 
                    onClick={() => onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")}
                    className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    title={sortDirection === "asc" ? "Ascending" : "Descending"}
                  >
                    <ArrowUpDown className={`w-3 h-3 text-gray-500 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
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
                  {["Flight", "Date", "ACFT TYPE", "ACFT REG", "PAX", "STD", "TTL PLN ULD", "ULD Version"].map((field) => (
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

      {/* Load plan count */}
      <div className="text-xs text-gray-500 whitespace-nowrap">
        {filteredCount} of {totalCount} load plans
      </div>
    </div>
  )
}
