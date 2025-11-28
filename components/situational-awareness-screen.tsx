"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { ChevronRight, ChevronDown, Plane, Calendar, Package, Users, Clock, FileText, Phone, User, Filter, X } from "lucide-react"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail, AWBRow, ULDSection } from "./load-plan-types"
import { useLoadPlans, type LoadPlan, type SentBCR } from "@/lib/load-plan-context"
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase } from "@/lib/load-plans-supabase"
import { parseULDSection } from "@/lib/uld-parser"
import { getULDEntriesFromStorage } from "@/lib/uld-storage"
import { uldSectionHasPilPerShc, type WorkArea } from "./flights-view-screen"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import BCRModal from "./bcr-modal"
import { BUP_ALLOCATION_DATA } from "@/lib/bup-allocation-data"

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

function calculateTotalPlannedULDs(loadPlanDetail: LoadPlanDetail, workAreaFilter?: WorkArea): number {
  if (typeof window !== 'undefined') {
    try {
      const entriesMap = getULDEntriesFromStorage(loadPlanDetail.flight, loadPlanDetail.sectors)
      
      if (entriesMap.size > 0) {
        let totalSlots = 0
        
        entriesMap.forEach((entries, key) => {
          const [sectorIndexStr, uldSectionIndexStr] = key.split('-')
          const sectorIndex = parseInt(sectorIndexStr, 10)
          const uldSectionIndex = parseInt(uldSectionIndexStr, 10)
          
          const sector = loadPlanDetail.sectors[sectorIndex]
          if (sector && sector.uldSections[uldSectionIndex]) {
            const uldSection = sector.uldSections[uldSectionIndex]
            
            let shouldInclude = true
            if (workAreaFilter === "PIL and PER") {
              shouldInclude = uldSectionHasPilPerShc(uldSection)
            } else if (workAreaFilter === "GCR") {
              shouldInclude = !uldSectionHasPilPerShc(uldSection)
            }
            
            if (shouldInclude) {
              totalSlots += entries.length
            }
          }
        })
        
        if (totalSlots > 0) {
          return totalSlots
        }
      }
    } catch (e) {
      // Fall through
    }
  }
  
  let total = 0
  loadPlanDetail.sectors.forEach((sector) => {
    sector.uldSections.forEach((uldSection) => {
      let shouldInclude = true
      if (workAreaFilter === "PIL and PER") {
        shouldInclude = uldSectionHasPilPerShc(uldSection)
      } else if (workAreaFilter === "GCR") {
        shouldInclude = !uldSectionHasPilPerShc(uldSection)
      }
      
      if (shouldInclude && uldSection.uld) {
        const { count } = parseULDSection(uldSection.uld)
        total += count
      }
    })
  })
  
  if (total === 0 && (!workAreaFilter || workAreaFilter === "All")) {
    const fromTtlPlnUld = parseTTLPlnUld(loadPlanDetail.ttlPlnUld || "")
    if (fromTtlPlnUld > 0) {
      return fromTtlPlnUld
    }
  }
  
  return total || 1
}

function calculateTotalMarkedULDs(flightNumber: string, loadPlanDetail: LoadPlanDetail, workAreaFilter?: WorkArea): number {
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
        
        let shouldInclude = true
        if (workAreaFilter === "PIL and PER") {
          shouldInclude = uldSectionHasPilPerShc(uldSection)
        } else if (workAreaFilter === "GCR") {
          shouldInclude = !uldSectionHasPilPerShc(uldSection)
        }
        
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

export default function SituationalAwarenessScreen() {
  const { loadPlans, setLoadPlans, sentBCRs } = useLoadPlans()
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [flightCompletions, setFlightCompletions] = useState<Map<string, FlightCompletion>>(new Map())
  const [loadPlanDetailsCache, setLoadPlanDetailsCache] = useState<Map<string, LoadPlanDetail>>(new Map())
  const [selectedWorkArea, setSelectedWorkArea] = useState<WorkArea>("All")
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

  // Recalculate completions when work area filter changes
  useEffect(() => {
    if (loadPlans.length === 0) return
    
    const recalculatedCompletions = new Map<string, FlightCompletion>()
    
    loadPlans.forEach(plan => {
      const cachedDetail = loadPlanDetailsCache.get(plan.flight)
      
      if (cachedDetail && selectedWorkArea !== "All") {
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
        recalculatedCompletions.set(plan.flight, calculateFlightCompletion(plan))
      }
    })
    
    setFlightCompletions(recalculatedCompletions)
  }, [loadPlans, loadPlanDetailsCache, selectedWorkArea])

  const timeOptions = useMemo(() => {
    const options: string[] = []
    for (let hour = 0; hour < 24; hour++) {
      options.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return options
  }, [])

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

  const filteredLoadPlans = useMemo(() => {
    return loadPlans.filter(plan => {
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
  }, [loadPlans, flightCompletions, selectedShift, customTimeRange])

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
        destination: extractDestination(plan.pax),
        uldBreakdown: parseULDCount(plan.ttlPlnUld),
        ttlPlnUld: plan.ttlPlnUld,
      }))
      .sort((a, b) => {
        const [aHours, aMinutes] = a.std.split(":").map(Number)
        const [bHours, bMinutes] = b.std.split(":").map(Number)
        const aTime = aHours * 60 + (aMinutes || 0)
        const bTime = bHours * 60 + (bMinutes || 0)
        return aTime - bTime
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
      const totalPlannedULDs = calculateTotalPlannedULDs(selectedLoadPlan, selectedWorkArea)
      const totalMarkedULDs = calculateTotalMarkedULDs(selectedLoadPlan.flight, selectedLoadPlan, selectedWorkArea)
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

            <div className="text-sm text-gray-500">
              Showing {filteredLoadPlans.length} of {loadPlans.length} flights
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
      return date.toLocaleString('en-US', {
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
