"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Plane, Clock, MapPin, Package, Plus, Search, SlidersHorizontal, Settings2, ArrowUpDown } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, TooltipProps } from "recharts"
import { useLoadPlans, type LoadPlan, type ShiftType, type PeriodType, type WaveType } from "@/lib/load-plan-context"
import { BUP_ALLOCATION_DATA } from "@/lib/bup-allocation-data"

// Parse ULD count from ttlPlnUld string (e.g., "06PMC/07AKE" -> {pmc: 6, ake: 7, bulk: 0, total: 13})
function parseULDCount(ttlPlnUld: string): { pmc: number; ake: number; bulk: number; total: number } {
  if (!ttlPlnUld) return { pmc: 0, ake: 0, bulk: 0, total: 0 }
  const pmcMatch = ttlPlnUld.match(/(\d+)PMC/i)
  const akeMatch = ttlPlnUld.match(/(\d+)AKE/i)
  const bulkMatch = ttlPlnUld.match(/(\d+)BULK/i)
  const pmc = pmcMatch ? parseInt(pmcMatch[1]) : 0
  const ake = akeMatch ? parseInt(akeMatch[1]) : 0
  const bulk = bulkMatch ? parseInt(bulkMatch[1]) : 0
  return { pmc, ake, bulk, total: pmc + ake + bulk }
}

// Custom tooltip to prevent duplicates and only show relevant data
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0]?.payload
  if (!data) return null

  // For Total bar, show breakdown
  if (label === "Total" && data.pmc !== undefined) {
    const items: Array<{ name: string; value: number; color: string }> = []
    
    if (data.pmc > 0) {
      items.push({ name: "PMC", value: data.pmc, color: "#DC2626" })
    }
    if (data.ake > 0) {
      items.push({ name: "AKE", value: data.ake, color: "#EF4444" })
    }
    if (data.bulk > 0) {
      items.push({ name: "Bulk", value: data.bulk, color: "#F59E0B" })
    }
    
    return (
      <div className="bg-white border border-gray-300 rounded px-3 py-2 shadow-lg">
        <p className="font-semibold text-sm mb-1">Total: {data.total || 0} ULDs</p>
        {items.length > 0 && (
          <div className="space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    backgroundColor: item.color,
                    borderRadius: "2px"
                  }}
                />
                <span>{item.name}: {item.value} ULDs</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // For individual bars (PMC or AKE), show single value
  const value = typeof payload[0]?.value === 'number' ? payload[0].value : 0
  if (value <= 0) return null

  const color = label === "AKE" ? "#EF4444" : "#DC2626"
  
  return (
    <div className="bg-white border border-gray-300 rounded px-3 py-2 shadow-lg">
      <p className="font-semibold text-sm mb-1">ULD Type: {label}</p>
      <div className="flex items-center gap-2 text-xs">
        <span
          style={{
            display: "inline-block",
            width: "10px",
            height: "10px",
            backgroundColor: color,
            borderRadius: "2px"
          }}
        />
        <span>{label}: {value} ULDs</span>
      </div>
    </div>
  )
}

// Parse STD time (e.g., "02:50", "09:35") to hours
function parseStdToHours(std: string): number {
  const [hours, minutes] = std.split(":").map(Number)
  return hours + (minutes || 0) / 60
}

// Determine period and wave based on STD time
function determinePeriodAndWave(std: string): { period: PeriodType; wave: WaveType | null; shiftType: ShiftType } {
  const [hours, minutes] = std.split(":").map(Number)
  const timeInMinutes = hours * 60 + (minutes || 0)
  
  // Night Shift Early Morning: 00:01-05:59
  if (timeInMinutes >= 1 && timeInMinutes < 360) {
    return { period: "early-morning", wave: null, shiftType: "night" }
  }
  // Night Shift Late Morning First Wave: 06:00-09:00
  if (timeInMinutes >= 360 && timeInMinutes <= 540) {
    return { period: "late-morning", wave: "first-wave", shiftType: "night" }
  }
  // Night Shift Late Morning Second Wave: 09:01-12:59
  if (timeInMinutes > 540 && timeInMinutes < 780) {
    return { period: "late-morning", wave: "second-wave", shiftType: "night" }
  }
  // Day Shift Afternoon First Wave: 13:00-15:59
  if (timeInMinutes >= 780 && timeInMinutes < 960) {
    return { period: "afternoon", wave: "first-wave", shiftType: "day" }
  }
  // Day Shift Afternoon Second Wave: 16:00-23:59
  if (timeInMinutes >= 960 && timeInMinutes <= 1439) {
    return { period: "afternoon", wave: "second-wave", shiftType: "day" }
  }
  // Default to early morning for edge cases
  return { period: "early-morning", wave: null, shiftType: "night" }
}

// Extract destination from pax field (e.g., "DXB/MAA/0/23/251" -> "DXB-MAA")
function extractDestination(pax: string): string {
  if (!pax) return "DXB-JFK"
  const parts = pax.split("/")
  const origin = parts[0] || "DXB"
  const destination = parts[1] || "JFK"
  return `${origin}-${destination}`
}

// Calculate ULD breakdown from actual flight data
function calculateULDBreakdown(flights: Array<{ uldBreakdown: { pmc: number; ake: number; bulk: number; total: number } }>) {
  let pmcCount = 0
  let akeCount = 0
  let bulkCount = 0

  flights.forEach((flight) => {
    pmcCount += flight.uldBreakdown.pmc
    akeCount += flight.uldBreakdown.ake
    bulkCount += flight.uldBreakdown.bulk
  })

  return {
    PMC: pmcCount,
    AKE: akeCount,
    BULK: bulkCount,
    total: pmcCount + akeCount + bulkCount,
  }
}

export default function IncomingWorkloadScreen() {
  const { loadPlans } = useLoadPlans()
  const [showAddFilterDropdown, setShowAddFilterDropdown] = useState(false)
  const [showViewOptions, setShowViewOptions] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [shiftFilter, setShiftFilter] = useState<ShiftType>("current")
  const [periodFilter, setPeriodFilter] = useState<PeriodType>("all")
  const [waveFilter, setWaveFilter] = useState<WaveType>("all")
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

  // Get all load plans first (show all available load plans)
  const allFlights = useMemo(() => {
    return loadPlans.map((plan) => ({
      flight: plan.flight,
      std: plan.std,
      date: plan.date,
      destination: extractDestination(plan.pax),
      uldBreakdown: parseULDCount(plan.ttlPlnUld),
      ttlPlnUld: plan.ttlPlnUld,
    }))
  }, [loadPlans])

  // Filter and sort flights
  const filteredFlights = useMemo(() => {
    let filtered = [...allFlights]

    // Filter by shift type
    if (shiftFilter === "current") {
      // Show all flights (no shift filter)
    } else if (shiftFilter === "night") {
      filtered = filtered.filter((flight) => {
        const { shiftType } = determinePeriodAndWave(flight.std)
        return shiftType === "night"
      })
    } else if (shiftFilter === "day") {
      filtered = filtered.filter((flight) => {
        const { shiftType } = determinePeriodAndWave(flight.std)
        return shiftType === "day"
      })
    }

    // Filter by period
    if (periodFilter !== "all") {
      filtered = filtered.filter((flight) => {
        const { period } = determinePeriodAndWave(flight.std)
        return period === periodFilter
      })
    }

    // Filter by wave (only applies to late-morning and afternoon periods)
    if (periodFilter === "early-morning" && waveFilter !== "all") {
      // Early morning doesn't have waves, so don't filter by wave
    } else if (waveFilter !== "all") {
      filtered = filtered.filter((flight) => {
        const { period, wave } = determinePeriodAndWave(flight.std)
        if (period === "late-morning" || period === "afternoon") {
          return wave === waveFilter
        }
        return true // Early morning doesn't have waves
      })
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((flight) => 
        flight.flight.toLowerCase().includes(query) ||
        flight.destination.toLowerCase().includes(query) ||
        flight.std.toLowerCase().includes(query)
      )
    }

    // Sort by STD descending (most recent first)
    // Combines date and STD time for proper chronological sorting
    return filtered.sort((a, b) => {
      // Parse date and STD for comparison
      const dateA = a.date || ""
      const dateB = b.date || ""
      const stdA = a.std || "00:00"
      const stdB = b.std || "00:00"
      
      // Compare dates first (descending - latest date first)
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA)
      }
      
      // If same date, compare STD times (descending - latest time first)
      const hoursA = parseStdToHours(stdA)
      const hoursB = parseStdToHours(stdB)
      return hoursB - hoursA
    })
  }, [allFlights, shiftFilter, periodFilter, waveFilter, searchQuery])

  // Determine if wave filter should be shown
  const showWaveFilter = periodFilter === "late-morning" || periodFilter === "afternoon"

  // Get flights that are NOT in BUP allocation list (logic kept for future filtering)
  // Currently showing all load plans first as requested
  const incomingFlightsLogic = useMemo(() => {
    // Get all flight numbers from BUP allocation (normalize to match load plan format)
    const bupFlightNumbers = new Set(
      BUP_ALLOCATION_DATA.map((a) => {
        return a.flightNo.startsWith("EK") ? a.flightNo : `EK${a.flightNo}`
      })
    )

    // Filter load plans to only include flights NOT in BUP allocation
    // Logic kept but showing all flights first as requested
    return allFlights.filter((flight) => {
      const normalizedFlight = flight.flight.startsWith("EK") ? flight.flight : `EK${flight.flight}`
      return !bupFlightNumbers.has(normalizedFlight)
    })
  }, [allFlights])

  // Use filtered flights for display
  const displayFlights = filteredFlights

  // Calculate ULD breakdown for graph based on ACTUAL flights in the table
  const uldBreakdownData = useMemo(() => {
    return calculateULDBreakdown(displayFlights)
  }, [displayFlights])

  // Prepare bar chart data for ULD types - based on actual load plan ttlPlnUld data
  const uldTypeChartData = useMemo(() => {
    return [
      {
        type: "PMC",
        value: uldBreakdownData.PMC,
        total: uldBreakdownData.PMC,
      },
      {
        type: "AKE",
        value: uldBreakdownData.AKE,
        total: uldBreakdownData.AKE,
      },
      {
        type: "Total",
        value: uldBreakdownData.PMC + uldBreakdownData.AKE + uldBreakdownData.BULK,
        pmc: uldBreakdownData.PMC,
        ake: uldBreakdownData.AKE,
        bulk: uldBreakdownData.BULK,
        total: uldBreakdownData.PMC + uldBreakdownData.AKE + uldBreakdownData.BULK,
      },
    ]
  }, [uldBreakdownData])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">Anticipated Incoming Workload</h2>
          <p className="text-sm text-gray-500 mt-1">Based on upcoming flights</p>
        </div>

        {/* Filters */}
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
                    {["Flight", "STD", "Destination", "Planned ULDs"].map((col) => (
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

          {/* Search Flights */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search flights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent w-32"
            />
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {/* Shift Type Filter - Compact */}
          <select
            id="shift-filter"
            value={shiftFilter}
            onChange={(e) => {
              const newShift = e.target.value as ShiftType
              setShiftFilter(newShift)
              setPeriodFilter("all")
              setWaveFilter("all")
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
              setPeriodFilter(e.target.value as PeriodType)
              if (e.target.value === "early-morning") {
                setWaveFilter("all")
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
              onChange={(e) => setWaveFilter(e.target.value as WaveType)}
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
                  
                  {/* Show Flights */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <Plane className="w-3 h-3 text-[#D71A21]" />
                      <span>Show Flights</span>
                    </div>
                    <select className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded">
                      <option>All Flights</option>
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
                      <select className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded">
                        <option>STD Time</option>
                        <option>Flight Number</option>
                        <option>Destination</option>
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
                      {["Flight", "STD", "Destination", "Planned ULDs"].map((field) => (
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

          {/* Flight count */}
          <div className="text-xs text-gray-500 whitespace-nowrap">
            {filteredFlights.length} of {allFlights.length} flights
          </div>
        </div>

        {/* Graph - ULD Type Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ULD Type Breakdown</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uldTypeChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} barCategoryGap="35%" barGap={0}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="type"
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  stroke="#9CA3AF"
                  type="category"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  stroke="#9CA3AF"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: "12px", paddingTop: "20px", pointerEvents: "none" }} 
                  iconSize={12}
                  content={() => {
                    return (
                      <ul className="flex justify-center gap-4 text-xs">
                        <li className="flex items-center gap-1">
                          <span 
                            style={{ 
                              display: "inline-block",
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#DC2626",
                              borderRadius: "2px"
                            }}
                          />
                          <span>PMC</span>
                        </li>
                        <li className="flex items-center gap-1">
                          <span 
                            style={{ 
                              display: "inline-block",
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#EF4444",
                              borderRadius: "2px"
                            }}
                          />
                          <span>AKE</span>
                        </li>
                        <li className="flex items-center gap-1">
                          <span 
                            style={{ 
                              display: "inline-block",
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#F59E0B",
                              borderRadius: "2px"
                            }}
                          />
                          <span>Bulk</span>
                        </li>
                      </ul>
                    )
                  }}
                />
                <Bar dataKey="value" barSize={60} radius={[4, 4, 0, 0]} name="value">
                  {uldTypeChartData.map((entry, index) => {
                    let fillColor = "#DC2626"
                    
                    if (entry.type === "AKE") {
                      fillColor = "#EF4444"
                    } else if (entry.type === "Total") {
                      fillColor = "#DC2626"
                    }
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={fillColor}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Flight List Table */}
        <div className="mx-2 rounded-lg border border-gray-200 overflow-x-auto">
          <div className="bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-[#D71A21] text-white">
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Flight</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">STD</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Destination</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Planned ULDs</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayFlights.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-center text-gray-500 text-sm">
                      {allFlights.length === 0 ? "No load plans available" : "No flights match the selected filters"}
                    </td>
                  </tr>
                ) : (
                  displayFlights.map((flight) => (
                    <tr key={flight.flight} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-2 py-1 font-semibold text-[#D71A21] text-xs whitespace-nowrap truncate">
                        {flight.flight}
                      </td>
                      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{flight.std}</td>
                      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{flight.destination}</td>
                      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate font-semibold">
                        {flight.uldBreakdown.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

