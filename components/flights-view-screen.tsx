"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Phone, User, Filter, X, Plus, Settings2, ChevronDown, Search, ArrowUpDown, SlidersHorizontal } from "lucide-react"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail, AWBRow, ULDSection } from "./load-plan-types"
import type { ULDEntry } from "./uld-number-modal"
import { useLoadPlans, type LoadPlan } from "@/lib/load-plan-context"
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase } from "@/lib/load-plans-supabase"
import { parseULDSection } from "@/lib/uld-parser"
import { getULDEntriesFromStorage } from "@/lib/uld-storage"
import { useWorkAreaFilter, WorkAreaFilterControls } from "./work-area-filter-controls"
import type { WorkArea, PilPerSubFilter } from "@/lib/work-area-filter-utils"
import { shouldIncludeULDSection } from "@/lib/work-area-filter-utils"

// Types for completion tracking
type CompletionStatus = "green" | "amber" | "red"
type Shift = "All" | "9am to 9pm" | "9pm to 9am"
type Module = "All" | "PAX & PF build-up EUR (1st floor, E)" | "PAX & PF build-up AFR (1st floor, F)" | "PAX & PF build-up ME, SubCon, Asia (1st floor, G)" | "Build-up AUS (1st floor, H)" | "US Screening Flights (1st floor, I)" | "Freighter & PAX Breakdown & build-up (Ground floor, F)" | "IND/PAK Build-up (Ground floor, G)" | "PER (Ground floor, H)" | "PIL (Ground floor, I)"

// Filter types
type FilterColumn = "Flight" | "Date" | "ACFT TYPE" | "ACFT REG" | "PAX" | "STD" | "TTL PLN ULD" | "Completion"
type FilterOperator = "equals" | "contains" | "greaterThan" | "lessThan" | "greaterThanOrEqual" | "lessThanOrEqual" | "is" | "timeRange"
type ActiveFilter = {
  id: string
  column: FilterColumn
  operator: FilterOperator
  value: string | string[] // string[] for multi-select toggle buttons
}

// Sort types
type SortColumn = "Flight" | "Date" | "STD" | "Completion" | null
type SortDirection = "asc" | "desc"


// Two 9-9 shifts
const SHIFTS: Shift[] = ["All", "9am to 9pm", "9pm to 9am"]

// Modules
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
 * @param pilPerSubFilter - Optional PIL/PER sub-filter ("Both", "PIL only", or "PER only")
 */
function calculateTotalPlannedULDs(loadPlanDetail: LoadPlanDetail, workAreaFilter?: WorkArea, pilPerSubFilter?: PilPerSubFilter): number {
  // Get entries from localStorage if they exist
  let entriesMap: Map<string, ULDEntry[]> = new Map()
  if (typeof window !== 'undefined') {
    try {
      entriesMap = getULDEntriesFromStorage(loadPlanDetail.flight, loadPlanDetail.sectors)
    } catch (e) {
      // Fall through to default calculation
    }
  }
  
  // Count from ULD sections, using entries.length if entries exist for that section
  // Otherwise use parseULDSection count
  let total = 0
  loadPlanDetail.sectors.forEach((sector, sectorIndex) => {
    sector.uldSections.forEach((uldSection, uldSectionIndex) => {
      // Apply filter logic using centralized utility
      const shouldInclude = shouldIncludeULDSection(uldSection, workAreaFilter || "All", pilPerSubFilter)
      
      if (shouldInclude && uldSection.uld) {
        const key = `${sectorIndex}-${uldSectionIndex}`
        const entries = entriesMap.get(key)
        
        if (entries && entries.length > 0) {
          // Use entries.length if entries exist (reflects additions/subtractions via modal)
          total += entries.length
        } else {
          // Use parseULDSection count if no entries exist for this section
          const { count } = parseULDSection(uldSection.uld)
          total += count
        }
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
 * @param pilPerSubFilter - Optional PIL/PER sub-filter ("Both", "PIL only", or "PER only")
 */
function calculateTotalMarkedULDs(flightNumber: string, loadPlanDetail: LoadPlanDetail, workAreaFilter?: WorkArea, pilPerSubFilter?: PilPerSubFilter): number {
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
        
        // Apply filter logic using centralized utility
        const shouldInclude = shouldIncludeULDSection(uldSection, workAreaFilter || "All", pilPerSubFilter)
        
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
  // Work area filter hook
  const { selectedWorkArea, pilPerSubFilter } = useWorkAreaFilter()
  const [selectedShift, setSelectedShift] = useState<Shift>("All" as Shift)
  const [selectedModule, setSelectedModule] = useState<Module>("All")
  const [customTimeRange, setCustomTimeRange] = useState<{ start: string; end: string } | null>(null)
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false)
  const timeRangePickerRef = useRef<HTMLDivElement>(null)
  const [uldUpdateTrigger, setUldUpdateTrigger] = useState(0) // Trigger for progress bar recalculation
  const [showAddFilterDropdown, setShowAddFilterDropdown] = useState(false)
  const [showViewOptions, setShowViewOptions] = useState(false)
  const addFilterRef = useRef<HTMLDivElement>(null)
  const viewOptionsRef = useRef<HTMLDivElement>(null)
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

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

  // Recalculate completions when work area filter changes or ULD entries are updated
  useEffect(() => {
    if (loadPlans.length === 0) return
    
    const recalculatedCompletions = new Map<string, FlightCompletion>()
    
    loadPlans.forEach(plan => {
      const cachedDetail = loadPlanDetailsCache.get(plan.flight)
      
      // Always use detail-based calculation if available (same as load plan detail screen)
      if (cachedDetail) {
        const totalPlannedULDs = calculateTotalPlannedULDs(cachedDetail, selectedWorkArea, pilPerSubFilter)
        const totalMarkedULDs = calculateTotalMarkedULDs(plan.flight, cachedDetail, selectedWorkArea, pilPerSubFilter)
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
        // Fall back to default calculation only if no detail available
        recalculatedCompletions.set(plan.flight, calculateFlightCompletion(plan))
      }
    })
    
    setFlightCompletions(recalculatedCompletions)
  }, [loadPlans, loadPlanDetailsCache, selectedWorkArea, pilPerSubFilter, uldUpdateTrigger])

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

  // Apply active filters to load plans
  function applyActiveFilters(plan: LoadPlan, completion: FlightCompletion): boolean {
    return activeFilters.every(filter => {
      switch (filter.column) {
        case "Completion": {
          const completionPercent = completion.completionPercentage
          const status = completion.status
          
          // Handle "is" operator with multi-select status toggles
          if (filter.operator === "is") {
            if (Array.isArray(filter.value)) {
              // If no statuses selected, show all
              if (filter.value.length === 0) return true
              // Check if flight status matches any selected status
              return filter.value.includes(status)
            }
            return true
          }
          
          // Handle > and < operators with percentage values
          if (filter.operator === "greaterThan" || filter.operator === "lessThan") {
            const value = typeof filter.value === "string" ? filter.value.trim() : ""
            if (!value) return true
            
            const filterValue = parseFloat(value)
            if (isNaN(filterValue)) return true
            
            switch (filter.operator) {
              case "greaterThan":
                return completionPercent > filterValue
              case "lessThan":
                return completionPercent < filterValue
              default:
                return true
            }
          }
          
          return true
        }
        case "STD": {
          // Handle time range filter
          if (filter.operator === "timeRange") {
            const value = typeof filter.value === "string" ? filter.value : ""
            const [startTime, endTime] = value.split("-")
            if (!startTime || !endTime) return true
            
            const stdTime = plan.std || "00:00"
            const stdHours = parseStdToHours(stdTime)
            const startHours = parseStdToHours(startTime)
            const endHours = parseStdToHours(endTime)
            
            // Handle overnight ranges (e.g., 22:00 to 06:00)
            if (endHours < startHours) {
              return stdHours >= startHours || stdHours <= endHours
            } else {
              return stdHours >= startHours && stdHours <= endHours
            }
          }
          
          // Handle equals operator
          if (filter.operator === "equals") {
            const value = typeof filter.value === "string" ? filter.value.trim() : ""
            if (!value) return true
            const stdTime = plan.std || "00:00"
            return stdTime === value
          }
          
          return true
        }
        // Placeholder for other columns - will be implemented later
        case "Flight":
        case "Date":
        case "ACFT TYPE":
        case "ACFT REG":
        case "PAX":
        case "TTL PLN ULD":
          return true // Not implemented yet
        default:
          return true
      }
    })
  }

  // Filter and sort load plans based on selected shift and custom time range
  // Default sort: by STD descending (latest/most recent flights at the top)
  const filteredLoadPlans = useMemo(() => {
    const filtered = loadPlans.filter(plan => {
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
      
      // Check active filters
      const matchesActiveFilters = applyActiveFilters(plan, completion)
      
      return matchesShift && matchesTimeRange && matchesActiveFilters
    })
    
    // Apply sorting
    return filtered.sort((a, b) => {
      // If a sort column is selected, sort by that column
      if (sortColumn) {
        const completionA = flightCompletions.get(a.flight) || calculateFlightCompletion(a)
        const completionB = flightCompletions.get(b.flight) || calculateFlightCompletion(b)
        
        let comparison = 0
        switch (sortColumn) {
          case "Flight":
            comparison = (a.flight || "").localeCompare(b.flight || "")
            break
          case "Date":
            comparison = (a.date || "").localeCompare(b.date || "")
            break
          case "STD":
            const hoursA = parseStdToHours(a.std || "00:00")
            const hoursB = parseStdToHours(b.std || "00:00")
            comparison = hoursA - hoursB
            break
          case "Completion":
            comparison = completionA.completionPercentage - completionB.completionPercentage
            break
        }
        
        return sortDirection === "asc" ? comparison : -comparison
      }
      
      // Default sort: by Date and STD descending (latest flights first)
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
  }, [loadPlans, flightCompletions, selectedShift, customTimeRange, activeFilters, sortColumn, sortDirection])

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

  // Sort handlers
  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      // New column - default to desc for Completion (highest first), asc for STD (earliest first)
      setSortColumn(column)
      setSortDirection(column === "Completion" ? "desc" : "asc")
    }
  }

  // Add filter handlers
  function handleAddFilter(column: FilterColumn) {
    let defaultOperator: FilterOperator = "contains"
    let defaultValue: string | string[] = ""
    
    if (column === "Completion") {
      defaultOperator = "is"
      defaultValue = [] // Empty array for toggle buttons
    } else if (column === "STD") {
      defaultOperator = "timeRange"
      defaultValue = "09:00-21:00"
    }
    
    const newFilter: ActiveFilter = {
      id: `${Date.now()}-${Math.random()}`,
      column,
      operator: defaultOperator,
      value: defaultValue
    }
    setActiveFilters(prev => [...prev, newFilter])
    setEditingFilterId(newFilter.id)
    setShowAddFilterDropdown(false)
  }

  function handleRemoveFilter(filterId: string) {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId))
    if (editingFilterId === filterId) {
      setEditingFilterId(null)
    }
  }

  function handleUpdateFilter(filterId: string, updates: Partial<ActiveFilter>) {
    setActiveFilters(prev => prev.map(f => 
      f.id === filterId ? { ...f, ...updates } : f
    ))
  }

  function toggleCompletionStatus(filterId: string, statusKey: string) {
    setActiveFilters(prev => prev.map(filter => {
      if (filter.id !== filterId) return filter
      
      const currentValue = Array.isArray(filter.value) ? filter.value : []
      const newValue = currentValue.includes(statusKey)
        ? currentValue.filter(s => s !== statusKey)
        : [...currentValue, statusKey]
      
      return { ...filter, value: newValue }
    }))
  }

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
      // Recalculate progress when ULD entries are updated (uldUpdateTrigger changes)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = uldUpdateTrigger // Force recalculation when this changes
      const totalPlannedULDs = calculateTotalPlannedULDs(selectedLoadPlan, selectedWorkArea, pilPerSubFilter)
      const totalMarkedULDs = calculateTotalMarkedULDs(selectedLoadPlan.flight, selectedLoadPlan, selectedWorkArea, pilPerSubFilter)
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
            pilPerSubFilter={pilPerSubFilter}
            onULDUpdate={() => {
              // Trigger re-render to recalculate progress bar
              setUldUpdateTrigger(prev => prev + 1)
            }}
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

          {/* Search Flights */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search flights..."
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
                Shift: {shift} ({filterCounts.shifts[shift] || 0})
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
                  
                  {/* Show Flights */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <Plane className="w-3 h-3 text-[#D71A21]" />
                      <span>Show Flights</span>
                    </div>
                    <select className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded">
                      <option>Show Upcoming Flights Only</option>
                      <option>Show All Flights</option>
                      <option>Show Past Flights</option>
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
                        <option>Departure Time</option>
                        <option>Flight Number</option>
                        <option>Completion %</option>
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
                      {["Flight Number", "Departure Date", "Destination", "Origin", "Departure", "Arrival", "Weight (kg)", "Volume (m³)", "Status", "Tail Number", "Aircraft Type"].map((field) => (
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
            {filteredLoadPlans.length} of {loadPlans.length} flights
          </div>
        </div>
        {/* Active Filters Row */}
        <div className="flex items-center gap-2 mb-4 px-2 flex-wrap">
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
                    {(["Flight", "Date", "ACFT TYPE", "ACFT REG", "PAX", "STD", "TTL PLN ULD", "Completion"] as FilterColumn[]).map((col) => (
                      <button
                        key={col}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded transition-colors text-left"
                        onClick={() => handleAddFilter(col)}
                      >
                        <Filter className="w-3 h-3 text-gray-400" />
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active filters */}
          {activeFilters.map(filter => {
            const activeStatuses = Array.isArray(filter.value) ? filter.value : []
            
            return (
              <div key={filter.id} className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded-md bg-white">
                <span className="font-medium text-gray-700">{filter.column}</span>
                <select
                  value={filter.operator}
                  onChange={(e) => {
                    const newOperator = e.target.value as FilterOperator
                    const updates: Partial<ActiveFilter> = { operator: newOperator }
                    
                    // Set default values when switching operator types
                    if (filter.column === "Completion") {
                      if (newOperator === "is") {
                        updates.value = []
                      } else if (newOperator === "greaterThan" || newOperator === "lessThan") {
                        updates.value = "50"
                      }
                    } else if (filter.column === "STD") {
                      if (newOperator === "timeRange" && filter.operator !== "timeRange") {
                        updates.value = "09:00-21:00"
                      }
                    }
                    
                    handleUpdateFilter(filter.id, updates)
                  }}
                  className="px-1 py-0.5 text-xs border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-[#D71A21] rounded"
                >
                  {filter.column === "Completion" ? (
                    <>
                      <option value="is">is</option>
                      <option value="greaterThan">&gt;</option>
                      <option value="lessThan">&lt;</option>
                    </>
                  ) : filter.column === "STD" ? (
                    <>
                      <option value="timeRange">between</option>
                      <option value="equals">equals</option>
                    </>
                  ) : (
                    <>
                      <option value="contains">contains</option>
                      <option value="equals">equals</option>
                    </>
                  )}
                </select>
                
                {/* Render appropriate input based on column and operator */}
                {filter.column === "Completion" && filter.operator === "is" ? (
                  <div className="flex items-center gap-1">
                    {[
                      { key: "green", label: "Green", bgColor: "bg-green-500", textColor: "text-white", hoverBg: "hover:bg-green-600", inactiveBg: "bg-green-50", inactiveText: "text-green-700", inactiveBorder: "border-green-200" },
                      { key: "amber", label: "Amber", bgColor: "bg-amber-500", textColor: "text-white", hoverBg: "hover:bg-amber-600", inactiveBg: "bg-amber-50", inactiveText: "text-amber-700", inactiveBorder: "border-amber-200" },
                      { key: "red", label: "Red", bgColor: "bg-red-500", textColor: "text-white", hoverBg: "hover:bg-red-600", inactiveBg: "bg-red-50", inactiveText: "text-red-700", inactiveBorder: "border-red-200" }
                    ].map(status => {
                      const isActive = activeStatuses.includes(status.key)
                      return (
                        <button
                          key={status.key}
                          onClick={() => toggleCompletionStatus(filter.id, status.key)}
                          className={`px-2 py-0.5 text-xs rounded transition-colors border ${
                            isActive 
                              ? `${status.bgColor} ${status.textColor} border-transparent ${status.hoverBg}` 
                              : `${status.inactiveBg} ${status.inactiveText} ${status.inactiveBorder} hover:opacity-80`
                          }`}
                        >
                          {status.label}
                        </button>
                      )
                    })}
                  </div>
                ) : filter.column === "Completion" && (filter.operator === "greaterThan" || filter.operator === "lessThan") ? (
                  <select
                    value={typeof filter.value === "string" ? filter.value : "50"}
                    onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                    className="px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
                    autoFocus={editingFilterId === filter.id}
                  >
                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(percent => (
                      <option key={percent} value={percent}>{percent}%</option>
                    ))}
                  </select>
                ) : filter.column === "STD" && filter.operator === "timeRange" ? (
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={typeof filter.value === "string" ? filter.value.split("-")[0] : "09:00"}
                    onChange={(e) => {
                      const currentValue = typeof filter.value === "string" ? filter.value : "09:00-21:00"
                      const [, end] = currentValue.split("-")
                      handleUpdateFilter(filter.id, { value: `${e.target.value}-${end || "21:00"}` })
                    }}
                    className="w-20 px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="time"
                    value={typeof filter.value === "string" ? filter.value.split("-")[1] : "21:00"}
                    onChange={(e) => {
                      const currentValue = typeof filter.value === "string" ? filter.value : "09:00-21:00"
                      const [start] = currentValue.split("-")
                      handleUpdateFilter(filter.id, { value: `${start || "09:00"}-${e.target.value}` })
                    }}
                    className="w-20 px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={typeof filter.value === "string" ? filter.value : ""}
                  onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                  placeholder="value..."
                  className="w-20 px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
                  autoFocus={editingFilterId === filter.id}
                />
              )}
                
                <button
                  onClick={() => handleRemoveFilter(filter.id)}
                  className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
          
          {/* Clear all button - only show when there are active filters */}
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          )}
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
                  <th 
                    className="px-2 py-1 text-left font-semibold text-xs cursor-pointer hover:bg-[#B0151A] transition-colors"
                    onClick={() => handleSort("STD")}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">STD</span>
                      {sortColumn === "STD" && (
                        <span className="text-[10px]">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">TTL PLN ULD</span>
                    </div>
                  </th>
                  <th 
                    className="px-2 py-1 text-left font-semibold text-xs cursor-pointer hover:bg-[#B0151A] transition-colors"
                    onClick={() => handleSort("Completion")}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Completion</span>
                      {sortColumn === "Completion" && (
                        <span className="text-[10px]">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
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


