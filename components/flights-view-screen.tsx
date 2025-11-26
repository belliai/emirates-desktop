"use client"

import { useState, useEffect, useMemo } from "react"
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Phone, User, Filter } from "lucide-react"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail } from "./load-plan-types"
import { useLoadPlans, type LoadPlan } from "@/lib/load-plan-context"
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase } from "@/lib/load-plans-supabase"
import { parseULDSection } from "@/lib/uld-parser"

// Types for completion tracking
type CompletionStatus = "green" | "amber" | "red"
type WorkArea = "All" | "GCR" | "PER" | "PIL"
type Shift = "All" | "9am to 9pm" | "9pm to 9am"

// Two 9-9 shifts
const SHIFTS: Shift[] = ["All", "9am to 9pm", "9pm to 9am"]

const SHIFT_MAP: Record<string, { start: number; end: number; overnight?: boolean }> = {
  "9am to 9pm": { start: 9, end: 21 },
  "9pm to 9am": { start: 21, end: 9, overnight: true },
}

// Parse STD time (e.g., "02:50", "09:35") to hours
function parseStdToHours(std: string): number {
  const [hours, minutes] = std.split(":").map(Number)
  return hours + (minutes || 0) / 60
}

// Determine which shift a flight belongs to based on STD
function getShiftFromStd(std: string): Shift {
  const hours = parseStdToHours(std)
  
  // 9am to 9pm: 9:00 - 20:59
  if (hours >= 9 && hours < 21) {
    return "9am to 9pm"
  }
  // 9pm to 9am: 21:00 - 8:59 (overnight)
  return "9pm to 9am"
}

type FlightCompletion = {
  flight: string
  totalPlannedULDs: number
  completedULDs: number
  completionPercentage: number
  status: CompletionStatus
  staffName: string
  staffContact: string
  workArea: WorkArea
  shift: Shift
}

// Hardcoded staff data for demo - in production this would come from a database
const STAFF_DATA: Record<string, { name: string; contact: string }> = {
  "EK0544": { name: "David Belisario", contact: "+971 50 123 4567" },
  "EK0205": { name: "Harley Quinn", contact: "+971 50 987 6543" },
  "EK0301": { name: "John Smith", contact: "+971 50 456 7890" },
  "EK0402": { name: "Sarah Connor", contact: "+971 50 321 0987" },
  "EK0112": { name: "Mike Ross", contact: "+971 50 654 3210" },
  "EK0618": { name: "Rachel Green", contact: "+971 50 111 2222" },
  "EK0720": { name: "Joey Tribbiani", contact: "+971 50 333 4444" },
  "EK0832": { name: "Monica Geller", contact: "+971 50 555 6666" },
  "EK0915": { name: "Ross Geller", contact: "+971 50 777 8888" },
  "EK1024": { name: "Chandler Bing", contact: "+971 50 999 0000" },
}

// Hardcoded completion data for demo - in production this would be calculated
const COMPLETION_DATA: Record<string, { completedULDs: number }> = {
  "EK0544": { completedULDs: 8 },
  "EK0205": { completedULDs: 3 },
  "EK0301": { completedULDs: 0 },
  "EK0402": { completedULDs: 12 },
  "EK0112": { completedULDs: 5 },
  "EK0618": { completedULDs: 7 },
  "EK0720": { completedULDs: 2 },
  "EK0832": { completedULDs: 9 },
  "EK0915": { completedULDs: 4 },
  "EK1024": { completedULDs: 6 },
}

// Work area assignments - GCR has most, then PER, then PIL
const WORK_AREA_DATA: Record<string, WorkArea> = {
  // GCR - 5 flights (most)
  "EK0544": "GCR",
  "EK0205": "GCR",
  "EK0301": "GCR",
  "EK0618": "GCR",
  "EK0720": "GCR",
  // PER - 3 flights
  "EK0402": "PER",
  "EK0112": "PER",
  "EK0832": "PER",
  // PIL - 2 flights (least)
  "EK0915": "PIL",
  "EK1024": "PIL",
}

// Shift assignments - based on STD times for demo
// 9am-9pm (Day shift) and 9pm-9am (Night shift)
const SHIFT_DATA: Record<string, string> = {
  // 9pm to 9am (Night shift - overnight)
  "EK0544": "02:50",  // 2:50 AM - Night
  "EK0720": "03:15",  // 3:15 AM - Night
  "EK0205": "06:30",  // 6:30 AM - Night
  "EK1024": "22:30",  // 10:30 PM - Night
  // 9am to 9pm (Day shift)
  "EK0301": "09:45",  // 9:45 AM - Day
  "EK0402": "10:35",  // 10:35 AM - Day
  "EK0112": "11:20",  // 11:20 AM - Day
  "EK0618": "14:45",  // 2:45 PM - Day
  "EK0832": "16:30",  // 4:30 PM - Day
  "EK0915": "19:00",  // 7:00 PM - Day
}

function getCompletionStatus(percentage: number): CompletionStatus {
  if (percentage >= 80) return "green"
  if (percentage >= 50) return "amber"
  return "red"
}

function getStatusColor(status: CompletionStatus): string {
  switch (status) {
    case "green": return "bg-green-500"
    case "amber": return "bg-amber-500"
    case "red": return "bg-red-500"
  }
}

function parseTTLPlnUld(ttlPlnUld: string): number {
  // Parse strings like "06PMC/07AKE" or "05PMC/10AKE" to get total ULD count
  let total = 0
  const pmcMatch = ttlPlnUld.match(/(\d+)PMC/i)
  const akeMatch = ttlPlnUld.match(/(\d+)AKE/i)
  
  if (pmcMatch) total += parseInt(pmcMatch[1], 10)
  if (akeMatch) total += parseInt(akeMatch[1], 10)
  
  // If we couldn't parse anything, try to extract any number
  if (total === 0) {
    const anyNumber = ttlPlnUld.match(/(\d+)/)
    if (anyNumber) total = parseInt(anyNumber[1], 10)
  }
  
  return total || 1 // Return at least 1 to avoid division by zero
}

function calculateFlightCompletion(loadPlan: LoadPlan, loadedAWBCount?: number): FlightCompletion {
  const totalPlannedULDs = parseTTLPlnUld(loadPlan.ttlPlnUld)
  
  // Use hardcoded data for demo, or calculate from loaded AWBs
  const completionInfo = COMPLETION_DATA[loadPlan.flight]
  const completedULDs = loadedAWBCount !== undefined 
    ? Math.min(loadedAWBCount, totalPlannedULDs)
    : (completionInfo?.completedULDs || 0)
  
  const completionPercentage = Math.round((completedULDs / totalPlannedULDs) * 100)
  const status = getCompletionStatus(completionPercentage)
  
  const staffInfo = STAFF_DATA[loadPlan.flight] || { name: "Unassigned", contact: "-" }
  const workArea = WORK_AREA_DATA[loadPlan.flight] || "GCR"
  
  // Calculate shift from STD - use demo data or actual STD from load plan
  const stdTime = SHIFT_DATA[loadPlan.flight] || loadPlan.std || "00:00"
  const shift = getShiftFromStd(stdTime)
  
  return {
    flight: loadPlan.flight,
    totalPlannedULDs,
    completedULDs,
    completionPercentage,
    status,
    staffName: staffInfo.name,
    staffContact: staffInfo.contact,
    workArea,
    shift,
  }
}

export default function FlightsViewScreen() {
  const { loadPlans, setLoadPlans } = useLoadPlans()
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [flightCompletions, setFlightCompletions] = useState<Map<string, FlightCompletion>>(new Map())
  const [selectedWorkArea, setSelectedWorkArea] = useState<WorkArea>("All")
  const [selectedShift, setSelectedShift] = useState<Shift>("All" as Shift)

  // Fetch load plans from Supabase on mount
  useEffect(() => {
    const fetchLoadPlans = async () => {
      setIsLoading(true)
      try {
        const supabaseLoadPlans = await getLoadPlansFromSupabase()
        if (supabaseLoadPlans.length > 0) {
          setLoadPlans(supabaseLoadPlans)
          
          // Calculate completions for each flight
          const completions = new Map<string, FlightCompletion>()
          supabaseLoadPlans.forEach(plan => {
            completions.set(plan.flight, calculateFlightCompletion(plan))
          })
          setFlightCompletions(completions)
        } else {
          setLoadPlans([])
        }
      } catch (err) {
        console.error("[FlightsViewScreen] Error fetching load plans:", err)
        setLoadPlans([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchLoadPlans()
  }, [setLoadPlans])

  // Filter load plans based on selected work area and shift
  const filteredLoadPlans = useMemo(() => {
    return loadPlans.filter(plan => {
      const completion = flightCompletions.get(plan.flight) || calculateFlightCompletion(plan)
      
      const matchesWorkArea = selectedWorkArea === "All" || completion.workArea === selectedWorkArea
      const matchesShift = selectedShift === "All" || completion.shift === selectedShift
      
      return matchesWorkArea && matchesShift
    })
  }, [loadPlans, flightCompletions, selectedWorkArea, selectedShift])

  // Count flights by work area and shift for filter badges
  const filterCounts = useMemo(() => {
    const counts = {
      workAreas: { All: 0, GCR: 0, PER: 0, PIL: 0 } as Record<WorkArea, number>,
      shifts: {} as Record<Shift, number>,
    }
    
    // Initialize shift counts
    SHIFTS.forEach(shift => {
      counts.shifts[shift] = 0
    })
    
    loadPlans.forEach(plan => {
      const completion = flightCompletions.get(plan.flight) || calculateFlightCompletion(plan)
      counts.workAreas.All++
      counts.workAreas[completion.workArea]++
      counts.shifts.All++
      counts.shifts[completion.shift]++
    })
    
    return counts
  }, [loadPlans, flightCompletions])

  const handleRowDoubleClick = async (loadPlan: LoadPlan) => {
    try {
      const supabaseDetail = await getLoadPlanDetailFromSupabase(loadPlan.flight)
      if (supabaseDetail) {
        setSelectedLoadPlan(supabaseDetail)
      }
    } catch (err) {
      console.error("[FlightsViewScreen] Error fetching load plan detail:", err)
    }
  }

  if (selectedLoadPlan) {
    return (
      <LoadPlanDetailScreen
        loadPlan={selectedLoadPlan}
        onBack={() => setSelectedLoadPlan(null)}
        // No onSave - makes it read-only
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 px-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Flights View</h2>
            <p className="text-sm text-gray-500">Shift-level at-a-glance view with completion tracking</p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-gray-600">≥80% Complete</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500"></div>
              <span className="text-gray-600">50-79% Complete</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span className="text-gray-600">&lt;50% Complete</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 px-2">
          <div className="flex items-center gap-2">
            <label htmlFor="work-area-filter" className="text-sm font-medium text-gray-700">
              Work Area:
            </label>
            <select
              id="work-area-filter"
              value={selectedWorkArea}
              onChange={(e) => setSelectedWorkArea(e.target.value as WorkArea)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
            >
              <option value="All">All ({filterCounts.workAreas.All})</option>
              <option value="GCR">GCR ({filterCounts.workAreas.GCR})</option>
              <option value="PER">PER ({filterCounts.workAreas.PER})</option>
              <option value="PIL">PIL ({filterCounts.workAreas.PIL})</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="shift-filter" className="text-sm font-medium text-gray-700">
              Shift:
            </label>
            <select
              id="shift-filter"
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value as Shift)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
            >
              {SHIFTS.map(shift => (
                <option key={shift} value={shift}>
                  {shift} ({filterCounts.shifts[shift] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Show filtered count */}
          <div className="text-sm text-gray-500">
            Showing {filteredLoadPlans.length} of {loadPlans.length} flights
          </div>
        </div>
        
        <div className="mx-2 rounded-lg border border-gray-200 overflow-x-auto">
          <div className="bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-[#D71A21] text-white">
                  {/* Status column - narrow */}
                  <th className="w-1 px-0"></th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Flight</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Date</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ACFT TYPE</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ACFT REG</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">PAX</span>
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
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">TTL PLN ULD</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Completion</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Staff</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Contact</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-2 text-center text-gray-500 text-sm">
                      Loading flights...
                    </td>
                  </tr>
                ) : filteredLoadPlans.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-2 text-center text-gray-500 text-sm">
                      {loadPlans.length === 0 ? "No flights available" : "No flights match the selected filters"}
                    </td>
                  </tr>
                ) : (
                  filteredLoadPlans.map((loadPlan, index) => {
                    const completion = flightCompletions.get(loadPlan.flight) || calculateFlightCompletion(loadPlan)
                    return (
                      <FlightRow 
                        key={index} 
                        loadPlan={loadPlan} 
                        completion={completion}
                        onDoubleClick={handleRowDoubleClick} 
                      />
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

type FlightRowProps = {
  loadPlan: LoadPlan
  completion: FlightCompletion
  onDoubleClick: (loadPlan: LoadPlan) => void
}

function FlightRow({ loadPlan, completion, onDoubleClick }: FlightRowProps) {
  return (
    <tr
      onDoubleClick={() => onDoubleClick(loadPlan)}
      className="border-b border-gray-100 last:border-b-0 cursor-pointer group relative"
      style={{ 
        background: `linear-gradient(to right, ${
          completion.status === "green" ? "rgba(34, 197, 94, 0.12)" :
          completion.status === "amber" ? "rgba(245, 158, 11, 0.12)" :
          "rgba(239, 68, 68, 0.12)"
        } ${completion.completionPercentage}%, transparent ${completion.completionPercentage}%)`
      }}
    >
      {/* Status indicator bar */}
      <td className="w-1 px-0 relative">
        <div 
          className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusColor(completion.status)} opacity-80 group-hover:opacity-100 transition-opacity`}
        />
      </td>
      <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
        {loadPlan.flight}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.date}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.acftType}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.acftReg}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.pax}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.std}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.ttlPlnUld}</td>
      {/* Completion percentage with visual bar */}
      <td className="px-2 py-1 text-xs whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getStatusColor(completion.status)} transition-all duration-300`}
              style={{ width: `${Math.min(completion.completionPercentage, 100)}%` }}
            />
          </div>
          <span className={`font-semibold ${
            completion.status === "green" ? "text-green-600" :
            completion.status === "amber" ? "text-amber-600" :
            "text-red-600"
          }`}>
            {completion.completionPercentage}%
          </span>
          <span className="text-gray-500 text-[10px]">
            ({completion.completedULDs}/{completion.totalPlannedULDs})
          </span>
        </div>
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{completion.staffName}</td>
      <td className="px-2 py-1 text-gray-600 text-xs whitespace-nowrap truncate">{completion.staffContact}</td>
      <td className="px-2 py-1 w-10">
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#D71A21] transition-colors" />
      </td>
    </tr>
  )
}

