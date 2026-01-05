"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { ChevronRight, ChevronDown, Plane, Calendar, Package, Users, Clock, FileText, Phone, User, Filter, X, Plus, Search, SlidersHorizontal, Settings2, ArrowUpDown, Activity, Target, Zap, TrendingUp, BarChart3, Radar as RadarIcon, Eye } from "lucide-react"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail, AWBRow, ULDSection } from "./load-plan-types"
import type { ULDEntry } from "./uld-number-modal"
import { useLoadPlans, type LoadPlan, type SentBCR, type ShiftType, type PeriodType, type WaveType } from "@/lib/load-plan-context"
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase } from "@/lib/load-plans-supabase"
import { parseULDSection } from "@/lib/uld-parser"
import { getULDEntriesFromStorage } from "@/lib/uld-storage"
import type { WorkArea, PilPerSubFilter } from "@/lib/work-area-filter-utils"
import { shouldIncludeULDSection } from "@/lib/work-area-filter-utils"
import { useWorkAreaFilter, WorkAreaFilterControls, WorkAreaFilterProvider } from "./work-area-filter-controls"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie } from "recharts"
import BCRModal from "./bcr-modal"
import { BUP_ALLOCATION_DATA } from "@/lib/bup-allocation-data"
import { CompletionRing, ChartCard, StatCard, RadarChartComponent } from "@/components/ui/dashboard-charts"
import { CHART_COLORS, TOOLTIP_STYLE, CHART_ANIMATION, getCompletionColor } from "@/lib/chart-theme"

// Types for completion tracking
type CompletionStatus = "green" | "amber" | "red"
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

// Determine period and wave based on STD time (for new shift structure)
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

// Hardcoded staff data for demo
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

const SHIFT_DATA: Record<string, string> = {
  "EK0544": "02:50",
  "EK0720": "03:15",
  "EK0205": "06:30",
  "EK1024": "22:30",
  "EK0301": "09:45",
  "EK0402": "10:35",
  "EK0112": "11:20",
  "EK0618": "14:45",
  "EK0832": "16:30",
  "EK0915": "19:00",
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
  let total = 0
  const pmcMatch = ttlPlnUld.match(/(\d+)PMC/i)
  const akeMatch = ttlPlnUld.match(/(\d+)AKE/i)
  
  if (pmcMatch) total += parseInt(pmcMatch[1], 10)
  if (akeMatch) total += parseInt(akeMatch[1], 10)
  
  if (total === 0) {
    const anyNumber = ttlPlnUld.match(/(\d+)/)
    if (anyNumber) total = parseInt(anyNumber[1], 10)
  }
  
  return total || 1
}

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

function calculateTotalMarkedULDs(flightNumber: string, loadPlanDetail: LoadPlanDetail, workAreaFilter?: WorkArea, pilPerSubFilter?: PilPerSubFilter): number {
  if (typeof window === 'undefined') return 0
  
  try {
    const entriesMap = getULDEntriesFromStorage(flightNumber, loadPlanDetail.sectors)
    
    let markedCount = 0
    
    entriesMap.forEach((entries, key) => {
      const [sectorIndexStr, uldSectionIndexStr] = key.split('-')
      const sectorIndex = parseInt(sectorIndexStr, 10)
      const uldSectionIndex = parseInt(uldSectionIndexStr, 10)
      
      const sector = loadPlanDetail.sectors[sectorIndex]
      if (sector && sector.uldSections[uldSectionIndex]) {
        const uldSection = sector.uldSections[uldSectionIndex]
        
        // Apply filter logic using centralized utility
        const shouldInclude = shouldIncludeULDSection(uldSection, workAreaFilter || "All", pilPerSubFilter)
        
        if (shouldInclude) {
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
    return 0
  }
}

function calculateFlightCompletion(loadPlan: LoadPlan, loadedAWBCount?: number): FlightCompletion {
  const totalPlannedULDs = parseTTLPlnUld(loadPlan.ttlPlnUld)
  
  const completionInfo = COMPLETION_DATA[loadPlan.flight]
  const completedULDs = loadedAWBCount !== undefined 
    ? Math.min(loadedAWBCount, totalPlannedULDs)
    : (completionInfo?.completedULDs || 0)
  
  const completionPercentage = Math.round((completedULDs / totalPlannedULDs) * 100)
  const status = getCompletionStatus(completionPercentage)
  
  const staffInfo = STAFF_DATA[loadPlan.flight] || { name: "Unassigned", contact: "-" }
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

// Work area data for workload section
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
}

// Parse ULD count for incoming workload
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

function extractDestination(pax: string): string {
  if (!pax) return "DXB-JFK"
  const parts = pax.split("/")
  const origin = parts[0] || "DXB"
  const destination = parts[1] || "JFK"
  return `${origin}-${destination}`
}

// Wrapper component that provides the WorkAreaFilter context
export default function SituationalAwarenessScreen() {
  return (
    <WorkAreaFilterProvider>
      <SituationalAwarenessScreenContent />
    </WorkAreaFilterProvider>
  )
}

// Inner component that uses the shared WorkAreaFilter context
function SituationalAwarenessScreenContent() {
  const { loadPlans, setLoadPlans, sentBCRs } = useLoadPlans()
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [flightCompletions, setFlightCompletions] = useState<Map<string, FlightCompletion>>(new Map())
  const [loadPlanDetailsCache, setLoadPlanDetailsCache] = useState<Map<string, LoadPlanDetail>>(new Map())
  // Work area filter hook
  const { selectedWorkArea, pilPerSubFilter } = useWorkAreaFilter()
  const [selectedShift, setSelectedShift] = useState<Shift>("All" as Shift)
  const [customTimeRange, setCustomTimeRange] = useState<{ start: string; end: string } | null>(null)
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false)
  const timeRangePickerRef = useRef<HTMLDivElement>(null)
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [workAreaFilter, setWorkAreaFilter] = useState<"overall" | "sortByWorkArea">("overall")
  const [selectedWorkAreaForWorkload, setSelectedWorkAreaForWorkload] = useState<string>("E75")
  const [selectedBCR, setSelectedBCR] = useState<SentBCR | null>(null)
  const [showBCRModal, setShowBCRModal] = useState(false)
  const [uldUpdateTrigger, setUldUpdateTrigger] = useState(0) // Trigger for progress bar recalculation
  const [showAddFilterDropdown, setShowAddFilterDropdown] = useState(false)
  const [showViewOptions, setShowViewOptions] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const addFilterRef = useRef<HTMLDivElement>(null)
  const viewOptionsRef = useRef<HTMLDivElement>(null)

  // Fetch load plans from Supabase on mount
  useEffect(() => {
    const fetchLoadPlans = async () => {
      setIsLoading(true)
      try {
        const supabaseLoadPlans = await getLoadPlansFromSupabase()
        if (supabaseLoadPlans.length > 0) {
          setLoadPlans(supabaseLoadPlans)
          
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
                console.error(`[SituationalAwarenessScreen] Error fetching detail for ${plan.flight}:`, err)
              }
            })
          )
          
          setLoadPlanDetailsCache(detailsCache)
          
          supabaseLoadPlans.forEach(plan => {
            completions.set(plan.flight, calculateFlightCompletion(plan))
          })
          setFlightCompletions(completions)
        } else {
          setLoadPlans([])
        }
      } catch (err) {
        console.error("[SituationalAwarenessScreen] Error fetching load plans:", err)
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
      
      if (cachedDetail && selectedWorkArea !== "All") {
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
        recalculatedCompletions.set(plan.flight, calculateFlightCompletion(plan))
      }
    })
    
    setFlightCompletions(recalculatedCompletions)
  }, [loadPlans, loadPlanDetailsCache, selectedWorkArea, pilPerSubFilter, uldUpdateTrigger])

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

  const filteredLoadPlans = useMemo(() => {
    let filtered = loadPlans.filter(plan => {
      const completion = flightCompletions.get(plan.flight) || calculateFlightCompletion(plan)
      
      const matchesShift = selectedShift === "All" || completion.shift === selectedShift
      
      let matchesTimeRange = true
      if (customTimeRange) {
        const stdTime = plan.std || "00:00"
        const stdHours = parseStdToHours(stdTime)
        const startHours = parseStdToHours(customTimeRange.start)
        const endHours = parseStdToHours(customTimeRange.end)
        
        if (endHours < startHours) {
          matchesTimeRange = stdHours >= startHours || stdHours <= endHours
        } else {
          matchesTimeRange = stdHours >= startHours && stdHours <= endHours
        }
      }
      
      return matchesShift && matchesTimeRange
    })

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((plan) => 
        plan.flight.toLowerCase().includes(query) ||
        plan.date?.toLowerCase().includes(query) ||
        plan.acftType?.toLowerCase().includes(query) ||
        plan.acftReg?.toLowerCase().includes(query) ||
        plan.std?.toLowerCase().includes(query)
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
  }, [loadPlans, flightCompletions, selectedShift, customTimeRange, searchQuery])

  const filterCounts = useMemo(() => {
    const counts = {
      shifts: {} as Record<Shift, number>,
    }
    
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

  const handleRowClick = async (loadPlan: LoadPlan) => {
    setSelectedFlight(loadPlan.flight)
    setIsLoadingDetail(true)
    try {
      const cachedDetail = loadPlanDetailsCache.get(loadPlan.flight)
      if (cachedDetail) {
        setSelectedLoadPlan(cachedDetail)
        setIsLoadingDetail(false)
        return
      }
      
      const supabaseDetail = await getLoadPlanDetailFromSupabase(loadPlan.flight)
      if (supabaseDetail) {
        setLoadPlanDetailsCache(prev => {
          const updated = new Map(prev)
          updated.set(loadPlan.flight, supabaseDetail)
          return updated
        })
        setSelectedLoadPlan(supabaseDetail)
      } else {
        setSelectedLoadPlan(null)
      }
    } catch (err) {
      console.error("[SituationalAwarenessScreen] Error fetching load plan detail:", err)
      setSelectedLoadPlan(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // Incoming workload data
  const allFlights = useMemo(() => {
    return loadPlans
      .map((plan) => ({
        flight: plan.flight,
        std: plan.std,
        date: plan.date,
        destination: extractDestination(plan.pax),
        uldBreakdown: parseULDCount(plan.ttlPlnUld),
        ttlPlnUld: plan.ttlPlnUld,
      }))
      .sort((a, b) => {
        // Sort by STD descending (most recent first)
        // Combines date and STD time for proper chronological sorting
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
  }, [loadPlans])

  const incomingFlightsLogic = useMemo(() => {
    const bupFlightNumbers = new Set(
      BUP_ALLOCATION_DATA.map((a) => {
        return a.flightNo.startsWith("EK") ? a.flightNo : `EK${a.flightNo}`
      })
    )

    return allFlights.filter((flight) => {
      const normalizedFlight = flight.flight.startsWith("EK") ? flight.flight : `EK${flight.flight}`
      return !bupFlightNumbers.has(normalizedFlight)
    })
  }, [allFlights])

  const displayFlights = allFlights

  const uldBreakdownData = useMemo(() => {
    let totalPMC = 0
    let totalAKE = 0
    let totalBulk = 0

    displayFlights.forEach((flight) => {
      const parsed = parseULDCount(flight.ttlPlnUld)
      totalPMC += parsed.pmc
      totalAKE += parsed.ake
      totalBulk += parsed.bulk
      if (parsed.pmc === 0 && parsed.ake === 0 && parsed.bulk === 0) {
        const totalMatch = flight.ttlPlnUld.match(/(\d+)/)
        if (totalMatch) {
          totalBulk += parseInt(totalMatch[1])
        }
      }
    })

    return {
      PMC: totalPMC,
      AKE: totalAKE,
      BULK: totalBulk,
      total: totalPMC + totalAKE + totalBulk,
    }
  }, [displayFlights])

  const uldTypeChartData = useMemo(() => [
    {
      type: "PMC",
      value: uldBreakdownData.PMC,
      color: "#DC2626",
    },
    {
      type: "AKE",
      value: uldBreakdownData.AKE,
      color: "#EF4444",
    },
    {
      type: "Total",
      pmcAke: uldBreakdownData.PMC + uldBreakdownData.AKE,
      bulk: uldBreakdownData.BULK,
      total: uldBreakdownData.total,
      color: "#DC2626",
    },
  ], [uldBreakdownData])

  const currentWorkAreaData = workAreaData[workAreaFilter === "overall" ? "overall" : (selectedWorkAreaForWorkload as keyof typeof workAreaData)] || workAreaData.overall
  const maxBarValue = 100

  // Calculate overall completion percentage for hero ring
  const overallCompletion = useMemo(() => {
    if (flightCompletions.size === 0) return { percentage: 0, completed: 0, total: 0 }
    
    let totalPlanned = 0
    let totalCompleted = 0
    
    flightCompletions.forEach((completion) => {
      totalPlanned += completion.totalPlannedULDs
      totalCompleted += completion.completedULDs
    })
    
    return {
      percentage: totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0,
      completed: totalCompleted,
      total: totalPlanned,
    }
  }, [flightCompletions])

  // Flight completion data for bar chart (sorted by completion %)
  const flightCompletionChartData = useMemo(() => {
    const data = filteredLoadPlans.map((plan) => {
      const completion = flightCompletions.get(plan.flight) || calculateFlightCompletion(plan)
      return {
        flight: plan.flight,
        completion: completion.completionPercentage,
        completed: completion.completedULDs,
        total: completion.totalPlannedULDs,
        status: completion.status,
      }
    })
    // Sort by completion percentage descending
    return data.sort((a, b) => b.completion - a.completion).slice(0, 10) // Top 10 flights
  }, [filteredLoadPlans, flightCompletions])

  // Work area radar data
  const workAreaRadarData = useMemo(() => {
    const gcr = currentWorkAreaData.GCR
    const per = currentWorkAreaData.PER
    const pil = currentWorkAreaData.PIL
    
    const gcrCompletion = gcr.total > 0 ? Math.round(((gcr.total - gcr.remaining) / gcr.total) * 100) : 0
    const perCompletion = per.total > 0 ? Math.round(((per.total - per.remaining) / per.total) * 100) : 0
    const pilCompletion = pil.total > 0 ? Math.round(((pil.total - pil.remaining) / pil.total) * 100) : 0
    
    return [
      { subject: "GCR", completion: gcrCompletion, capacity: Math.round((gcr.total / maxBarValue) * 100), fullMark: 100 },
      { subject: "PER", completion: perCompletion, capacity: Math.round((per.total / maxBarValue) * 100), fullMark: 100 },
      { subject: "PIL", completion: pilCompletion, capacity: Math.round((pil.total / maxBarValue) * 100), fullMark: 100 },
    ]
  }, [currentWorkAreaData, maxBarValue])

  // Summary stats
  const summaryStats = useMemo(() => {
    const greenCount = Array.from(flightCompletions.values()).filter(c => c.status === "green").length
    const amberCount = Array.from(flightCompletions.values()).filter(c => c.status === "amber").length
    const redCount = Array.from(flightCompletions.values()).filter(c => c.status === "red").length
    
    return { greenCount, amberCount, redCount }
  }, [flightCompletions])

  // Read-only view with progress bar
  if (selectedFlight) {
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
          />
        </div>
      )
    } else {
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
              Back to Situational Awareness
            </button>
          </div>
        </div>
      )
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-red-50/30 p-4">
        <div className="max-w-full">
          {/* Mission Control Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/20">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mission Control</h1>
                <p className="text-sm text-gray-500">Real-time situational awareness dashboard</p>
              </div>
            </div>
          </div>

          {/* Dashboard Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Overall Completion Ring - Hero */}
            <div className="lg:col-span-4">
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border border-slate-700/50 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-red-400" />
                  <h3 className="text-sm font-semibold text-white">Overall Shift Progress</h3>
                </div>
                <div className="flex flex-col items-center">
                  <CompletionRing
                    percentage={overallCompletion.percentage}
                    size="xl"
                    showPercentage={true}
                    className="mb-4"
                  />
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">
                      {overallCompletion.completed} / {overallCompletion.total} ULDs
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Marked Complete</div>
                  </div>
                </div>
                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-700/50">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">{summaryStats.greenCount}</div>
                    <div className="text-[10px] text-slate-400">On Track</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-400">{summaryStats.amberCount}</div>
                    <div className="text-[10px] text-slate-400">At Risk</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-400">{summaryStats.redCount}</div>
                    <div className="text-[10px] text-slate-400">Behind</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Flight Completion Bar Chart */}
            <div className="lg:col-span-5">
              <ChartCard
                title="Flight Completion Status"
                subtitle="Top 10 flights by completion rate"
                className="h-full"
              >
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={flightCompletionChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "#6B7280" }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="flight"
                        tick={{ fontSize: 11, fill: "#374151" }}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE.contentStyle}
                        labelStyle={TOOLTIP_STYLE.labelStyle}
                        formatter={(value: number, name: string, props: { payload: { completed: number; total: number } }) => [
                          `${value}% (${props.payload.completed}/${props.payload.total})`,
                          "Completion",
                        ]}
                      />
                      <ReferenceLine
                        x={80}
                        stroke="#22C55E"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                        strokeOpacity={0.7}
                      />
                      <Bar
                        dataKey="completion"
                        radius={[0, 4, 4, 0]}
                        isAnimationActive={true}
                        animationDuration={CHART_ANIMATION.duration}
                      >
                        {flightCompletionChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.status === "green"
                                ? CHART_COLORS.completion.complete
                                : entry.status === "amber"
                                ? CHART_COLORS.completion.inProgress
                                : CHART_COLORS.completion.notStarted
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-100 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-green-500" />
                    <span className="text-xs text-gray-600">≥80%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-amber-500" />
                    <span className="text-xs text-gray-600">50-79%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-red-500" />
                    <span className="text-xs text-gray-600">&lt;50%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 border-t-2 border-dashed border-green-500 opacity-70" />
                    <span className="text-xs text-gray-600">Target</span>
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* Work Area Radar */}
            <div className="lg:col-span-3">
              <ChartCard
                title="Work Area Balance"
                subtitle="Completion vs Capacity"
                className="h-full"
              >
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={workAreaRadarData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <PolarGrid stroke="#E5E7EB" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 12, fill: "#374151", fontWeight: 600 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: "#9CA3AF" }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Radar
                        name="Completion"
                        dataKey="completion"
                        stroke={CHART_COLORS.completion.complete}
                        fill={CHART_COLORS.completion.complete}
                        fillOpacity={0.4}
                        isAnimationActive={true}
                        animationDuration={CHART_ANIMATION.duration}
                      />
                      <Radar
                        name="Capacity"
                        dataKey="capacity"
                        stroke={CHART_COLORS.workArea.gcr}
                        fill={CHART_COLORS.workArea.gcr}
                        fillOpacity={0.2}
                        isAnimationActive={true}
                        animationDuration={CHART_ANIMATION.duration}
                        animationBegin={CHART_ANIMATION.staggerDelay}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE.contentStyle}
                        labelStyle={TOOLTIP_STYLE.labelStyle}
                        formatter={(value: number) => [`${value}%`, ""]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }}
                        iconType="circle"
                        iconSize={8}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          </div>

          {/* Tabbed Content Area */}
          <Tabs defaultValue="flights" className="mb-6">
            <TabsList className="bg-white border border-gray-200 shadow-sm mb-4">
              <TabsTrigger value="flights" className="gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                <Plane className="w-4 h-4" />
                Flights View
              </TabsTrigger>
              <TabsTrigger value="workload" className="gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                <BarChart3 className="w-4 h-4" />
                Workload
              </TabsTrigger>
              <TabsTrigger value="incoming" className="gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                <TrendingUp className="w-4 h-4" />
                Incoming
              </TabsTrigger>
              <TabsTrigger value="bcr" className="gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                <FileText className="w-4 h-4" />
                BCR Reports
              </TabsTrigger>
            </TabsList>

            {/* Flights Tab */}
            <TabsContent value="flights" className="mt-0">
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
                      {["Flight Number", "Departure Date", "Destination", "Origin", "Departure", "Arrival", "Weight (kg)", "Volume (m³)"].map((col) => (
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

            {/* Work Area Filter */}
            <WorkAreaFilterControls />

            {/* Shift Filter - Compact */}
            <select
              id="shift-filter"
              value={selectedShift}
              onChange={(e) => {
                setSelectedShift(e.target.value as Shift)
                if (e.target.value !== "All") {
                  setCustomTimeRange(null)
                }
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
          
          {/* Flights Table */}
          <div className="mx-2 rounded-lg border border-gray-200 overflow-x-auto mb-6">
            <div className="bg-white">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#D71A21] text-white">
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
                        <span className="whitespace-nowrap">Route</span>
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

          {/* Section 1: Current Workload by Category/Work Areas */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="w-full mb-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900">Current Workload by Category/Work Areas</h3>
                <ChevronDown className="w-5 h-5 text-gray-600" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-white rounded-lg border border-gray-200 border-t-0 p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-gray-900">Workload</h4>
                  <div className="flex gap-2">
                    <Select
                      value={workAreaFilter}
                      onValueChange={(value) => {
                        setWorkAreaFilter(value as "overall" | "sortByWorkArea")
                        if (value === "overall") {
                          setSelectedWorkAreaForWorkload("E75")
                        }
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue>
                          {workAreaFilter === "overall" ? "Overall" : "Sort by work area"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="overall">Overall</SelectItem>
                        <SelectItem value="sortByWorkArea">Sort by work area</SelectItem>
                      </SelectContent>
                    </Select>
                    {workAreaFilter === "sortByWorkArea" && (
                      <Select value={selectedWorkAreaForWorkload} onValueChange={setSelectedWorkAreaForWorkload}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue>{selectedWorkAreaForWorkload}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="E75">E75</SelectItem>
                          <SelectItem value="L22">L22</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  {(["GCR", "PER", "PIL"] as const).map((area) => {
                    const data = currentWorkAreaData[area]
                    const completed = data.total - data.remaining
                    const totalPercentage = (data.total / maxBarValue) * 100
                    const completedPercentage = (completed / data.total) * 100
                    const remainingPercentage = (data.remaining / data.total) * 100

                    return (
                      <div key={area} className="flex items-center gap-4">
                        <div className="w-16 text-sm font-medium text-gray-700">{area}</div>
                        <div className="flex-1 relative">
                          <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-8 flex transition-all"
                              style={{ width: `${totalPercentage}%` }}
                            >
                              <div
                                className="bg-[#DC2626] h-8 flex items-center justify-start px-3"
                                style={{ width: `${completedPercentage}%` }}
                              >
                                <span className="text-white text-sm font-semibold">{completed}</span>
                              </div>
                              <div
                                className="h-8 flex items-center justify-end px-3"
                                style={{ width: `${remainingPercentage}%`, backgroundColor: "rgba(220, 38, 38, 0.4)" }}
                              >
                                <span className="text-white text-sm font-semibold">{data.remaining}</span>
                              </div>
                            </div>
                          </div>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-700">
                            {data.total} Total
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 2: Anticipated Incoming Workload */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="w-full mb-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900">Anticipated Incoming Workload</h3>
                <ChevronDown className="w-5 h-5 text-gray-600" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-white rounded-lg border border-gray-200 border-t-0 p-6 mb-4">
                <p className="text-sm text-gray-500 mb-4">Based on upcoming flights, load plans released D-12</p>
                
                {/* Graph - ULD Type Breakdown */}
                <div className="mb-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">ULD Type Breakdown</h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={uldTypeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="type"
                          tick={{ fontSize: 12, fill: "#6B7280" }}
                          stroke="#9CA3AF"
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#6B7280" }}
                          stroke="#9CA3AF"
                        />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#DC2626" name="ULD Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Flights Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left border border-gray-300">Flight</th>
                        <th className="px-3 py-2 text-left border border-gray-300">STD</th>
                        <th className="px-3 py-2 text-left border border-gray-300">Destination</th>
                        <th className="px-3 py-2 text-left border border-gray-300">TTL PLN ULD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayFlights.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-center text-gray-500">
                            No flights available
                          </td>
                        </tr>
                      ) : (
                        displayFlights.map((flight, idx) => (
                          <tr key={idx} className="border-b border-gray-200">
                            <td className="px-3 py-2 border border-gray-300 font-semibold">{flight.flight}</td>
                            <td className="px-3 py-2 border border-gray-300">{flight.std}</td>
                            <td className="px-3 py-2 border border-gray-300">{flight.destination}</td>
                            <td className="px-3 py-2 border border-gray-300">{flight.ttlPlnUld}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 3: Digital Buildup Completion Report */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="w-full mb-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900">Digital Buildup Completion Report</h3>
                <ChevronDown className="w-5 h-5 text-gray-600" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-white rounded-lg border border-gray-200 border-t-0 p-6 mb-4">
                <p className="text-sm text-gray-500 mb-4">At shipment level (pending)</p>
                
                <div className="overflow-x-auto">
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
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">Sent By</span>
                          </div>
                        </th>
                        <th className="px-2 py-1 text-left font-semibold text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">Sent At</span>
                          </div>
                        </th>
                        <th className="px-2 py-1 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentBCRs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-2 text-center text-gray-500 text-sm">
                            No sent BCRs available
                          </td>
                        </tr>
                      ) : (
                        sentBCRs.map((bcr, index) => (
                          <BCRRow 
                            key={index} 
                            bcr={bcr} 
                            onClick={() => {
                              setSelectedBCR(bcr)
                              setShowBCRModal(true)
                            }} 
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              </CollapsibleContent>
            </Collapsible>
            </TabsContent>

            {/* Workload Tab */}
            <TabsContent value="workload" className="mt-0">
              <div className="text-center text-gray-500 py-12">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Workload analysis coming soon</p>
              </div>
            </TabsContent>

            {/* Incoming Tab */}
            <TabsContent value="incoming" className="mt-0">
              <div className="text-center text-gray-500 py-12">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Incoming workload view coming soon</p>
              </div>
            </TabsContent>

            {/* BCR Tab */}
            <TabsContent value="bcr" className="mt-0">
              <div className="text-center text-gray-500 py-12">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">BCR Reports view coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* BCR Modal */}
      {selectedBCR && (
        <BCRModal
          isOpen={showBCRModal}
          onClose={() => {
            setShowBCRModal(false)
            setSelectedBCR(null)
          }}
          loadPlan={selectedBCR.loadPlan}
          bcrData={selectedBCR.bcrData}
        />
      )}
    </>
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

interface BCRRowProps {
  bcr: SentBCR
  onClick: () => void
}

function BCRRow({ bcr, onClick }: BCRRowProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      // Display in Dubai/GST timezone (UTC+4)
      return date.toLocaleString('en-US', {
        timeZone: 'Asia/Dubai',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  return (
    <tr
      onClick={onClick}
      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
        {bcr.flight}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{bcr.date}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">
        {bcr.loadPlan?.acftType || '-'}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">
        {bcr.sentBy || '-'}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">
        {formatDate(bcr.sentAt)}
      </td>
      <td className="px-2 py-1 w-10">
        <ChevronRight className="h-4 w-4 text-gray-600 hover:text-[#D71A21]" />
      </td>
    </tr>
  )
}
