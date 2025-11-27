"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Phone, User, Filter, X } from "lucide-react"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail, AWBRow, ULDSection } from "./load-plan-types"
import { useLoadPlans, type LoadPlan } from "@/lib/load-plan-context"
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase } from "@/lib/load-plans-supabase"
import { parseULDSection } from "@/lib/uld-parser"
import { getULDEntriesFromStorage } from "@/lib/uld-storage"

// Types for completion tracking
type CompletionStatus = "green" | "amber" | "red"
type WorkArea = "All" | "GCR" | "PIL and PER"
type Shift = "All" | "9am to 9pm" | "9pm to 9am"

// PIL/PER SHC codes that identify PIL and PER work areas
const PIL_PER_SHC_CODES = ["FRO", "FRI", "ACT", "CRT", "COL", "ERT", "PIL-ACT", "PIL-COL", "PEF-COL", "PER-COL"]

/**
 * Check if an AWB has any PIL/PER SHC code
 * Case-insensitive matching, exact match required
 */
export function hasPilPerShcCode(awb: AWBRow): boolean {
  if (!awb.shc || awb.shc.trim() === "") {
    return false
  }
  
  const shcUpper = awb.shc.trim().toUpperCase()
  return PIL_PER_SHC_CODES.some(code => shcUpper === code.toUpperCase())
}

/**
 * Check if a ULD section contains any AWB with PIL/PER SHC codes
 */
export function uldSectionHasPilPerShc(uldSection: ULDSection): boolean {
  return uldSection.awbs.some(awb => hasPilPerShcCode(awb))
}

// Export WorkArea type for use in other components
export type { WorkArea }

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

// Work area assignments removed - work areas are now determined by SHC codes within flights

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

/**
 * Calculate total planned ULDs from load plan detail, filtered by work area
 * Uses ttlPlnUld field as default, but if ULD numbers have been modified via modal,
 * uses the total count of ULD number slots (including empty ones)
 * @param loadPlanDetail - The load plan detail
 * @param workAreaFilter - Optional work area filter ("All", "GCR", or "PIL and PER")
 */
function calculateTotalPlannedULDs(loadPlanDetail: LoadPlanDetail, workAreaFilter?: WorkArea): number {
  // Check if ULD numbers have been saved (modified via modal)
  if (typeof window !== 'undefined') {
    try {
      // Use utility function to get entries with checked state
      const entriesMap = getULDEntriesFromStorage(loadPlanDetail.flight, loadPlanDetail.sectors)
      
      if (entriesMap.size > 0) {
        // Filter ULD sections based on workAreaFilter
        let totalSlots = 0
        
        entriesMap.forEach((entries, key) => {
          // Parse sectorIndex and uldSectionIndex from key format: "sectorIndex-uldSectionIndex"
          const [sectorIndexStr, uldSectionIndexStr] = key.split('-')
          const sectorIndex = parseInt(sectorIndexStr, 10)
          const uldSectionIndex = parseInt(uldSectionIndexStr, 10)
          
          // Check if this ULD section matches the filter
          const sector = loadPlanDetail.sectors[sectorIndex]
          if (sector && sector.uldSections[uldSectionIndex]) {
            const uldSection = sector.uldSections[uldSectionIndex]
            
            // Apply filter logic
            let shouldInclude = true
            if (workAreaFilter === "PIL and PER") {
              shouldInclude = uldSectionHasPilPerShc(uldSection)
            } else if (workAreaFilter === "GCR") {
              // GCR = everything that's NOT PIL/PER
              shouldInclude = !uldSectionHasPilPerShc(uldSection)
            }
            // "All" or undefined = include everything
            
            if (shouldInclude) {
              // Count all entries (checked or not) - this is the total planned slots
              totalSlots += entries.length
            }
          }
        })
        
        // If we have saved ULD numbers, use the total slots as denominator
        // This reflects additions/subtractions made via the ULD numbers modal
        if (totalSlots > 0) {
          return totalSlots
        }
      }
    } catch (e) {
      // Fall through to default calculation
    }
  }
  
  // Default: count from ULD sections, filtered by work area
  let total = 0
  loadPlanDetail.sectors.forEach((sector) => {
    sector.uldSections.forEach((uldSection) => {
      // Apply filter logic
      let shouldInclude = true
      if (workAreaFilter === "PIL and PER") {
        shouldInclude = uldSectionHasPilPerShc(uldSection)
      } else if (workAreaFilter === "GCR") {
        // GCR = everything that's NOT PIL/PER
        shouldInclude = !uldSectionHasPilPerShc(uldSection)
      }
      // "All" or undefined = include everything
      
      if (shouldInclude && uldSection.uld) {
        const { count } = parseULDSection(uldSection.uld)
        total += count
      }
    })
  })
  
  // If filtered result is 0, fall back to parsing from ttlPlnUld (for "All" case)
  if (total === 0 && (!workAreaFilter || workAreaFilter === "All")) {
    const fromTtlPlnUld = parseTTLPlnUld(loadPlanDetail.ttlPlnUld || "")
    if (fromTtlPlnUld > 0) {
      return fromTtlPlnUld
    }
  }
  
  return total || 1 // Return at least 1 to avoid division by zero
}

/**
 * Calculate total marked ULDs from saved ULD numbers in localStorage, filtered by work area
 * A marked ULD is one that has a non-empty ULD number assigned
 * @param flightNumber - The flight number
 * @param loadPlanDetail - The load plan detail (needed to check ULD section SHC codes)
 * @param workAreaFilter - Optional work area filter ("All", "GCR", or "PIL and PER")
 */
function calculateTotalMarkedULDs(flightNumber: string, loadPlanDetail: LoadPlanDetail, workAreaFilter?: WorkArea): number {
  if (typeof window === 'undefined') return 0
  
  try {
    // Use utility function to get entries with checked state
    const entriesMap = getULDEntriesFromStorage(flightNumber, loadPlanDetail.sectors)
    
    let markedCount = 0
    
    // Count checked ULD entries, filtered by work area
    entriesMap.forEach((entries, key) => {
      // Parse sectorIndex and uldSectionIndex from key format: "sectorIndex-uldSectionIndex"
      const [sectorIndexStr, uldSectionIndexStr] = key.split('-')
      const sectorIndex = parseInt(sectorIndexStr, 10)
      const uldSectionIndex = parseInt(uldSectionIndexStr, 10)
      
      // Check if this ULD section matches the filter
      const sector = loadPlanDetail.sectors[sectorIndex]
      if (sector && sector.uldSections[uldSectionIndex]) {
        const uldSection = sector.uldSections[uldSectionIndex]
        
        // Apply filter logic
        let shouldInclude = true
        if (workAreaFilter === "PIL and PER") {
          shouldInclude = uldSectionHasPilPerShc(uldSection)
        } else if (workAreaFilter === "GCR") {
          // GCR = everything that's NOT PIL/PER
          shouldInclude = !uldSectionHasPilPerShc(uldSection)
        }
        // "All" or undefined = include everything
        
        if (shouldInclude) {
          // Count only checked entries
          entries.forEach((entry) => {
            if (entry.checked) {
              markedCount++
            }
          })
        }
      }
    })
    
    return markedCount
  } catch (e) {
    console.error(`[FlightsViewScreen] Error reading ULD numbers for ${flightNumber}:`, e)
    return 0
  }
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
    shift,
  }
}

export default function FlightsViewScreen() {
  const { loadPlans, setLoadPlans } = useLoadPlans()
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [flightCompletions, setFlightCompletions] = useState<Map<string, FlightCompletion>>(new Map())
  const [loadPlanDetailsCache, setLoadPlanDetailsCache] = useState<Map<string, LoadPlanDetail>>(new Map())
  const [selectedWorkArea, setSelectedWorkArea] = useState<WorkArea>("All")
  const [selectedShift, setSelectedShift] = useState<Shift>("All" as Shift)
  const [customTimeRange, setCustomTimeRange] = useState<{ start: string; end: string } | null>(null)
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false)
  const timeRangePickerRef = useRef<HTMLDivElement>(null)

  // Fetch load plans from Supabase on mount
  useEffect(() => {
    const fetchLoadPlans = async () => {
      setIsLoading(true)
      try {
        const supabaseLoadPlans = await getLoadPlansFromSupabase()
        if (supabaseLoadPlans.length > 0) {
          setLoadPlans(supabaseLoadPlans)
          
          // Fetch load plan details for all flights to enable filtered completion calculations
          const detailsCache = new Map<string, LoadPlanDetail>()
          const completions = new Map<string, FlightCompletion>()
          
          await Promise.all(
            supabaseLoadPlans.map(async (plan) => {
              try {
                const detail = await getLoadPlanDetailFromSupabase(plan.flight)
                if (detail) {
                  detailsCache.set(plan.flight, detail)
                }
              } catch (err) {
                console.error(`[FlightsViewScreen] Error fetching detail for ${plan.flight}:`, err)
              }
            })
          )
          
          setLoadPlanDetailsCache(detailsCache)
          
          // Calculate initial completions (will be recalculated when filter changes)
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

  // Recalculate completions when work area filter changes
  useEffect(() => {
    if (loadPlans.length === 0) return
    
    const recalculatedCompletions = new Map<string, FlightCompletion>()
    
    loadPlans.forEach(plan => {
      const cachedDetail = loadPlanDetailsCache.get(plan.flight)
      
      if (cachedDetail && selectedWorkArea !== "All") {
        // Calculate filtered completion if we have load plan detail
        const totalPlannedULDs = calculateTotalPlannedULDs(cachedDetail, selectedWorkArea)
        const totalMarkedULDs = calculateTotalMarkedULDs(plan.flight, cachedDetail, selectedWorkArea)
        const completionPercentage = totalPlannedULDs > 0 
          ? Math.round((totalMarkedULDs / totalPlannedULDs) * 100) 
          : 0
        const status = getCompletionStatus(completionPercentage)
        
        const staffInfo = STAFF_DATA[plan.flight] || { name: "Unassigned", contact: "-" }
        const stdTime = SHIFT_DATA[plan.flight] || plan.std || "00:00"
        const shift = getShiftFromStd(stdTime)
        
        recalculatedCompletions.set(plan.flight, {
          flight: plan.flight,
          totalPlannedULDs,
          completedULDs: totalMarkedULDs,
          completionPercentage,
          status,
          staffName: staffInfo.name,
          staffContact: staffInfo.contact,
          shift,
        })
      } else {
        // Fall back to default calculation
        recalculatedCompletions.set(plan.flight, calculateFlightCompletion(plan))
      }
    })
    
    setFlightCompletions(recalculatedCompletions)
  }, [loadPlans, loadPlanDetailsCache, selectedWorkArea])

  // Generate hourly time options (00:00 to 23:00)
  const timeOptions = useMemo(() => {
    const options: string[] = []
    for (let hour = 0; hour < 24; hour++) {
      options.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return options
  }, [])

  // Close time range picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (timeRangePickerRef.current && !timeRangePickerRef.current.contains(event.target as Node)) {
        setShowTimeRangePicker(false)
      }
    }

    if (showTimeRangePicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showTimeRangePicker])

  // Filter load plans based on selected shift and custom time range
  const filteredLoadPlans = useMemo(() => {
    return loadPlans.filter(plan => {
      const completion = flightCompletions.get(plan.flight) || calculateFlightCompletion(plan)
      
      // Check shift filter
      const matchesShift = selectedShift === "All" || completion.shift === selectedShift
      
      // Check custom time range filter
      let matchesTimeRange = true
      if (customTimeRange) {
        const stdTime = plan.std || "00:00"
        const stdHours = parseStdToHours(stdTime)
        const startHours = parseStdToHours(customTimeRange.start)
        const endHours = parseStdToHours(customTimeRange.end)
        
        // Handle overnight ranges (e.g., 22:00 to 06:00)
        if (endHours < startHours) {
          // Overnight range: flight time must be >= start OR <= end
          matchesTimeRange = stdHours >= startHours || stdHours <= endHours
        } else {
          // Normal range: flight time must be >= start AND <= end
          matchesTimeRange = stdHours >= startHours && stdHours <= endHours
        }
      }
      
      return matchesShift && matchesTimeRange
    })
  }, [loadPlans, flightCompletions, selectedShift, customTimeRange])

  // Count flights by shift for filter badges (work area filtering is at ULD section level, not flight level)
  const filterCounts = useMemo(() => {
    const counts = {
      shifts: {} as Record<Shift, number>,
    }
    
    // Initialize shift counts
    SHIFTS.forEach(shift => {
      counts.shifts[shift] = 0
    })
    
    loadPlans.forEach(plan => {
      const completion = flightCompletions.get(plan.flight) || calculateFlightCompletion(plan)
      counts.shifts.All++
      counts.shifts[completion.shift]++
    })
    
    return counts
  }, [loadPlans, flightCompletions])

  // Track selected flight for blank view
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const handleRowClick = async (loadPlan: LoadPlan) => {
    setSelectedFlight(loadPlan.flight)
    setIsLoadingDetail(true)
    try {
      // Check cache first
      const cachedDetail = loadPlanDetailsCache.get(loadPlan.flight)
      if (cachedDetail) {
        setSelectedLoadPlan(cachedDetail)
        setIsLoadingDetail(false)
        return
      }
      
      // Fetch if not in cache
      const supabaseDetail = await getLoadPlanDetailFromSupabase(loadPlan.flight)
      if (supabaseDetail) {
        // Update cache
        setLoadPlanDetailsCache(prev => {
          const updated = new Map(prev)
          updated.set(loadPlan.flight, supabaseDetail)
          return updated
        })
        setSelectedLoadPlan(supabaseDetail)
      } else {
        // If no load plan detail found, show blank view
        setSelectedLoadPlan(null)
      }
    } catch (err) {
      console.error("[FlightsViewScreen] Error fetching load plan detail:", err)
      setSelectedLoadPlan(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // Read-only view with progress bar
  if (selectedFlight) {
    // Show loading state while fetching
    if (isLoadingDetail) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D71A21] mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Loading flight details...</p>
          </div>
        </div>
      )
    }
    
    // If we have a load plan detail, show it with progress bar
    if (selectedLoadPlan) {
      const totalPlannedULDs = calculateTotalPlannedULDs(selectedLoadPlan, selectedWorkArea)
      const totalMarkedULDs = calculateTotalMarkedULDs(selectedLoadPlan.flight, selectedLoadPlan, selectedWorkArea)
      const completionPercentage = totalPlannedULDs > 0 
        ? Math.round((totalMarkedULDs / totalPlannedULDs) * 100) 
        : 0
      const status = getCompletionStatus(completionPercentage)
      
      return (
        <div className="min-h-screen bg-gray-50">
          {/* Progress Bar */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="max-w-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    ULD Progress: {selectedLoadPlan.flight}
                  </h3>
                  <span className={`text-sm font-medium ${
                    status === "green" ? "text-green-600" :
                    status === "amber" ? "text-amber-600" :
                    "text-red-600"
                  }`}>
                    {completionPercentage}% ({totalMarkedULDs}/{totalPlannedULDs})
                  </span>
                </div>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    status === "green" ? "bg-green-500" :
                    status === "amber" ? "bg-amber-500" :
                    "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Read-only Load Plan Detail Screen */}
          <LoadPlanDetailScreen
            loadPlan={selectedLoadPlan}
            onBack={() => {
              setSelectedLoadPlan(null)
              setSelectedFlight(null)
            }}
            enableBulkCheckboxes={true}
            workAreaFilter={selectedWorkArea}
            // No onSave - makes it read-only (like BuildupStaffScreen)
          />
        </div>
      )
    } else {
      // Blank view when no load plan detail is found
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Flight {selectedFlight}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              No load plan detail available
            </p>
            <button
              onClick={() => {
                setSelectedFlight(null)
                setSelectedLoadPlan(null)
              }}
              className="px-4 py-2 bg-[#D71A21] text-white rounded-md hover:bg-[#B0151A] transition-colors"
            >
              Back to Flights View
            </button>
          </div>
        </div>
      )
    }
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
              <option value="All">All</option>
              <option value="GCR">GCR</option>
              <option value="PIL and PER">PIL and PER</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="shift-filter" className="text-sm font-medium text-gray-700">
              Shift:
            </label>
            <select
              id="shift-filter"
              value={selectedShift}
              onChange={(e) => {
                setSelectedShift(e.target.value as Shift)
                // Clear custom time range when shift changes
                if (e.target.value !== "All") {
                  setCustomTimeRange(null)
                }
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
            >
              {SHIFTS.map(shift => (
                <option key={shift} value={shift}>
                  {shift} ({filterCounts.shifts[shift] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Time Range Filter */}
          <div className="flex items-center gap-2 relative" ref={timeRangePickerRef}>
            <label className="text-sm font-medium text-gray-700">
              Time Range:
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTimeRangePicker(!showTimeRangePicker)}
                className={`px-3 py-1.5 text-sm border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent transition-colors ${
                  customTimeRange 
                    ? "border-[#D71A21] text-[#D71A21]" 
                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {customTimeRange 
                      ? `${customTimeRange.start} - ${customTimeRange.end}`
                      : "Custom"}
                  </span>
                  {customTimeRange && (
                    <X 
                      className="w-3 h-3 ml-1" 
                      onClick={(e) => {
                        e.stopPropagation()
                        setCustomTimeRange(null)
                        setShowTimeRangePicker(false)
                      }}
                    />
                  )}
                </div>
              </button>
              
              {showTimeRangePicker && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[280px]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Select Time Range</h3>
                    <button
                      onClick={() => setShowTimeRangePicker(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <select
                        value={customTimeRange?.start || "00:00"}
                        onChange={(e) => {
                          setCustomTimeRange(prev => ({
                            start: e.target.value,
                            end: prev?.end || e.target.value
                          }))
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
                      >
                        {timeOptions.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <select
                        value={customTimeRange?.end || "23:00"}
                        onChange={(e) => {
                          setCustomTimeRange(prev => ({
                            start: prev?.start || "00:00",
                            end: e.target.value
                          }))
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
                      >
                        {timeOptions.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCustomTimeRange(null)
                        setShowTimeRangePicker(false)
                      }}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowTimeRangePicker(false)}
                      className="flex-1 px-3 py-1.5 text-sm bg-[#D71A21] text-white rounded-md hover:bg-[#B0151A] transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  
                  {customTimeRange && customTimeRange.start === customTimeRange.end && (
                    <p className="mt-2 text-xs text-amber-600">
                      Start and end times are the same
                    </p>
                  )}
                </div>
              )}
            </div>
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
                        onClick={handleRowClick} 
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
  onClick: (loadPlan: LoadPlan) => void
}

function FlightRow({ loadPlan, completion, onClick }: FlightRowProps) {
  return (
    <tr
      onClick={() => onClick(loadPlan)}
      className="border-b border-gray-100 last:border-b-0 cursor-pointer group relative hover:bg-gray-50 transition-colors"
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


