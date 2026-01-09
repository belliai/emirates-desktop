"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Calendar, Clock, User, Phone, Plus, Search, SlidersHorizontal, Settings2, ArrowUpDown, Plane, ChevronsUpDown, Check, MapPin, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useLoadPlans, type ShiftType, type PeriodType, type WaveType } from "@/lib/load-plan-context"
import { getOperators, getSupervisors, cacheStaffMobiles, getMobileForStaff, parseStaffName, findStaffByStaffNo, type BuildupStaff } from "@/lib/buildup-staff"
import { determinePeriodAndWave, parseTimeToMinutes, normalizeRoutingToOriginDestination, getOriginDestinationColor, getFlightRegion } from "@/lib/flight-allocation-helpers"
import { getLoadPlanDetailFromSupabase } from "@/lib/load-plans-supabase"
import type { LoadPlanDetail } from "./load-plan-types"
import { parseULDSection } from "@/lib/uld-parser"
import { getULDEntriesFromStorage } from "@/lib/uld-storage"
import { useUser } from "@/lib/user-context"

type CompletionStatus = "green" | "amber" | "red"

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

function calculateTotalPlannedULDs(loadPlanDetail: LoadPlanDetail): number {
  let entriesMap: Map<string, { checked: boolean; type?: string }[]> = new Map()
  if (typeof window !== "undefined") {
    try {
      entriesMap = getULDEntriesFromStorage(loadPlanDetail.flight, loadPlanDetail.sectors)
    } catch {
      // Fall through
    }
  }
  let total = 0
  loadPlanDetail.sectors.forEach((sector, sectorIndex) => {
    sector.uldSections.forEach((uldSection, uldSectionIndex) => {
      if (uldSection.uld) {
        const key = `${sectorIndex}-${uldSectionIndex}`
        const entries = entriesMap.get(key)
        if (entries && entries.length > 0) {
          // Exclude BULK entries from count
          const nonBulkEntries = entries.filter(e => (e as { type?: string }).type?.toUpperCase() !== "BULK")
          total += nonBulkEntries.length
        } else {
          // Exclude BULK from parseULDSection count
          const { expandedTypes } = parseULDSection(uldSection.uld)
          const nonBulkCount = expandedTypes.filter(t => t.toUpperCase() !== "BULK").length
          total += nonBulkCount
        }
      }
    })
  })
  return total || 1
}

function calculateTotalMarkedULDs(flightNumber: string, loadPlanDetail: LoadPlanDetail): number {
  if (typeof window === "undefined") return 0
  try {
    const entriesMap = getULDEntriesFromStorage(flightNumber, loadPlanDetail.sectors)
    let markedCount = 0
    entriesMap.forEach((entries) => {
      entries.forEach((entry) => {
        // Exclude BULK entries from marked count
        const entryType = (entry as { type?: string }).type?.toUpperCase()
        if (entry.checked && entryType !== "BULK") markedCount++
      })
    })
    return markedCount
  } catch {
    return 0
  }
}

type OperatorOption = {
  staff_no: number
  displayName: string
  fullName: string
  searchName: string
}

type CombinedRow = {
  carrier: string
  flightNo: string
  flightKey: string
  date: string
  etd: string
  routing: string
  staff: string
  mobile: string
  acType: string
  regnNo: string
  shiftType: ShiftType
  period: PeriodType
  wave: WaveType | null
  originDestination: string
  sector: string
  std: string
  completionPercentage: number
  completionStatus: CompletionStatus
  completedULDs: number
  totalPlannedULDs: number
}

function getDefaultSector(flightNo: string): string {
  const options = ["E70", "E71", "E72", "E73", "E74", "E75"]
  const seed = flightNo.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return options[seed % options.length]
}

function normalizeFlightNo(flightNo: string): string {
  const parsed = parseInt(flightNo, 10)
  return Number.isNaN(parsed) ? flightNo : String(parsed)
}

function normalizeFlightKey(flight: string): string {
  const match = flight.match(/EK0?(\d+)/i)
  if (!match) return flight.toUpperCase()
  return `EK${normalizeFlightNo(match[1])}`
}

export default function AllocationAssignmentScreen() {
  const { loadPlans, flightAssignments, bupAllocations, updateFlightAssignment, updateFlightAssignmentSector, updateBupAllocationStaff } = useLoadPlans()
  const { currentUser } = useUser()
  const [shiftFilter, setShiftFilter] = useState<ShiftType>(() => {
    if (typeof window === "undefined") return "current"
    const saved = localStorage.getItem("allocations-shift-filter") as ShiftType | null
    if (saved === "night" || saved === "day" || saved === "current") return saved
    return "current"
  })
  const [periodFilter, setPeriodFilter] = useState<PeriodType>("all")
  const [waveFilter, setWaveFilter] = useState<WaveType>("all")
  const [operators, setOperators] = useState<BuildupStaff[]>([])
  const [supervisors, setSupervisors] = useState<BuildupStaff[]>([])
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("")
  const [showAddFilterDropdown, setShowAddFilterDropdown] = useState(false)
  const [showViewOptions, setShowViewOptions] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const addFilterRef = useRef<HTMLDivElement>(null)
  const viewOptionsRef = useRef<HTMLDivElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const savedScrollPositionRef = useRef<number | null>(null)
  const [loadPlanDetailsCache, setLoadPlanDetailsCache] = useState<Map<string, LoadPlanDetail>>(new Map())

  // Restore scroll position after assignments change (to prevent view from following assigned flight)
  useEffect(() => {
    if (savedScrollPositionRef.current !== null && tableContainerRef.current) {
      tableContainerRef.current.scrollTop = savedScrollPositionRef.current
      savedScrollPositionRef.current = null
    }
  }, [flightAssignments])

  // Fetch load plan details for completion calculation
  useEffect(() => {
    async function fetchLoadPlanDetails() {
      const detailsCache = new Map<string, LoadPlanDetail>()
      await Promise.all(
        loadPlans.map(async (plan) => {
          try {
            const detail = await getLoadPlanDetailFromSupabase(plan.flight)
            if (detail) {
              detailsCache.set(plan.flight, detail)
              // Also store by normalized key
              const normalizedKey = normalizeFlightKey(plan.flight)
              detailsCache.set(normalizedKey, detail)
            }
          } catch (err) {
            console.error(`[AllocationAssignment] Error fetching detail for ${plan.flight}:`, err)
          }
        })
      )
      setLoadPlanDetailsCache(detailsCache)
    }
    if (loadPlans.length > 0) {
      fetchLoadPlanDetails()
    }
  }, [loadPlans])

  // Persist shift filter across sessions
  useEffect(() => {
    const saved = localStorage.getItem("allocations-shift-filter") as ShiftType | null
    if (saved === "night" || saved === "day" || saved === "current") {
      setShiftFilter(saved)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("allocations-shift-filter", shiftFilter)
  }, [shiftFilter])

  useEffect(() => {
    async function loadStaff() {
      const [ops, sups] = await Promise.all([getOperators(), getSupervisors()])
      setOperators(ops)
      setSupervisors(sups)
      cacheStaffMobiles(ops)
      // Set first supervisor as default
      if (sups.length > 0) {
        setSelectedSupervisorId(sups[0].staff_no.toString())
    }
    }
    loadStaff()
  }, [])

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
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [showAddFilterDropdown, showViewOptions])

  const operatorOptions = useMemo<OperatorOption[]>(() => {
    return operators.map((op) => {
      const parsed = parseStaffName(op.name)
      return {
        staff_no: op.staff_no,
        displayName: parsed.displayName,
        fullName: parsed.fullName,
        searchName: parsed.searchName,
      }
    })
  }, [operators])

  const assignmentMap = useMemo(() => {
    const map = new Map<string, { name: string; sector: string; std: string; originDestination: string }>()
    flightAssignments.forEach((fa) => {
      const normalizedKey = normalizeFlightKey(fa.flight)
      map.set(fa.flight, {
        name: fa.name,
        sector: fa.sector,
        std: fa.std,
        originDestination: fa.originDestination,
      })
      map.set(normalizedKey, {
        name: fa.name,
        sector: fa.sector,
        std: fa.std,
        originDestination: fa.originDestination,
      })
    })
    return map
  }, [flightAssignments])

  const loadPlanMap = useMemo(() => {
    const map = new Map<string, { std: string; pax: string; acftType: string; date: string }>()
    loadPlans.forEach((plan) => {
      const normalizedKey = normalizeFlightKey(plan.flight)
      map.set(plan.flight, {
        std: plan.std,
        pax: plan.pax,
        acftType: plan.acftType,
        date: plan.date || "",
      })
      map.set(normalizedKey, {
        std: plan.std,
        pax: plan.pax,
        acftType: plan.acftType,
        date: plan.date || "",
      })
    })
    return map
  }, [loadPlans])

  const combinedRows = useMemo<CombinedRow[]>(() => {
    const rows: CombinedRow[] = []
    const addRow = ({
      flightNo,
      carrier,
      etd,
      routing,
      acType,
      regnNo,
      shiftType,
      period,
      wave,
      date: inputDate,
    }: {
      flightNo: string
      carrier: string
      etd: string
      routing: string
      acType: string
      regnNo: string
      shiftType: ShiftType
      period: PeriodType
      wave: WaveType | null
      date?: string
    }) => {
      const normalizedNo = normalizeFlightNo(flightNo)
      const flightKey = `${carrier}${normalizedNo}`
      const assignment = assignmentMap.get(flightKey)
      const loadPlan = loadPlanMap.get(flightKey)

      const originDestination =
        assignment?.originDestination ||
        normalizeRoutingToOriginDestination(routing || (loadPlan ? loadPlan.pax : undefined))
      const sector = assignment?.sector || getDefaultSector(flightNo)
      const std = assignment?.std || loadPlan?.std || etd
      const staff = assignment?.name || ""
      const mobile = staff ? getMobileForStaff(staff) : ""
      const date = inputDate || assignment?.date || loadPlan?.date || ""

      // Calculate completion from load plan detail cache
      let completionPercentage = 0
      let completedULDs = 0
      let totalPlannedULDs = 0
      const cachedDetail = loadPlanDetailsCache.get(flightKey) || loadPlanDetailsCache.get(`EK${flightNo.padStart(4, "0")}`)
      if (cachedDetail) {
        totalPlannedULDs = calculateTotalPlannedULDs(cachedDetail)
        completedULDs = calculateTotalMarkedULDs(cachedDetail.flight, cachedDetail)
        completionPercentage = totalPlannedULDs > 0 ? Math.round((completedULDs / totalPlannedULDs) * 100) : 0
      }
      const completionStatus = getCompletionStatus(completionPercentage)

      rows.push({
        carrier,
        flightNo,
        flightKey,
        date,
        etd,
        routing,
        staff,
        mobile,
        acType,
        regnNo,
        shiftType,
        period,
        wave,
        originDestination,
        sector,
        std,
        completionPercentage,
        completionStatus,
        completedULDs,
        totalPlannedULDs,
      })
    }

    // Primary: existing BUP allocations
    bupAllocations.forEach((alloc) => {
      addRow({
        flightNo: alloc.flightNo,
        carrier: alloc.carrier || "EK",
        etd: alloc.etd,
        routing: alloc.routing,
        acType: alloc.acType,
        regnNo: alloc.regnNo,
        shiftType: alloc.shiftType,
        period: alloc.period,
        wave: alloc.wave,
      })
    })

    // Fallback: synthesize from load plans if not already present
    loadPlans.forEach((plan) => {
      const match = plan.flight.match(/EK0?(\d+)/)
      if (!match) return
      const flightNo = match[1]
      const flightKey = `EK${flightNo}`
      const exists = rows.some((row) => row.flightKey === flightKey)
      if (exists) return
      const routing = normalizeRoutingToOriginDestination(plan.pax)
      const { period, wave, shiftType } = determinePeriodAndWave(plan.std)
      addRow({
        flightNo,
        carrier: "EK",
        etd: plan.std,
        routing,
        acType: plan.acftType,
        regnNo: plan.acftReg,
        shiftType,
        period,
        wave,
        date: plan.date || "",
      })
    })

    return rows
  }, [assignmentMap, bupAllocations, loadPlanDetailsCache, loadPlanMap, loadPlans])

  const filteredRows = useMemo<CombinedRow[]>(() => {
    let rows = [...combinedRows]

    // "current" shows all flights (no shift filtering)
    // "night" and "day" filter by shift type
    if (shiftFilter === "night") {
      rows = rows.filter((row) => row.shiftType === "night")
    } else if (shiftFilter === "day") {
      rows = rows.filter((row) => row.shiftType === "day")
    }
    // shiftFilter === "current" shows all rows

    if (periodFilter !== "all") {
      rows = rows.filter((row) => row.period === periodFilter)
    }

    if (!(periodFilter === "early-morning" && waveFilter !== "all") && waveFilter !== "all") {
      rows = rows.filter((row) => {
        if (row.period === "late-morning" || row.period === "afternoon") {
          return row.wave === waveFilter
        }
        return true
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter(
        (row) =>
          row.flightNo.toLowerCase().includes(q) ||
          row.flightKey.toLowerCase().includes(q) ||
          row.routing.toLowerCase().includes(q) ||
          row.originDestination.toLowerCase().includes(q) ||
          row.staff.toLowerCase().includes(q) ||
          row.sector.toLowerCase().includes(q) ||
          row.acType.toLowerCase().includes(q) ||
          row.regnNo.toLowerCase().includes(q),
      )
    }

    return rows.sort((a, b) => {
      const aAssigned = a.staff.trim() !== ""
      const bAssigned = b.staff.trim() !== ""
      if (aAssigned !== bAssigned) return aAssigned ? 1 : -1
      return parseTimeToMinutes(a.etd) - parseTimeToMinutes(b.etd)
    })
  }, [combinedRows, shiftFilter, periodFilter, waveFilter, searchQuery])

  const showWaveFilter = periodFilter === "late-morning" || periodFilter === "afternoon"

  const pendingByCategory: Record<string, { count: number; color: string }> = {}
  filteredRows.forEach((row) => {
    if (!row.staff || !row.sector) {
      const { category, color } = getFlightRegion(row.flightKey)
      if (!pendingByCategory[category]) pendingByCategory[category] = { count: 0, color }
      pendingByCategory[category].count += 1
    }
  })

  const handleAssignStaff = async (flightNo: string, staffName: string, operatorStaffNo: number) => {
    // Save scroll position before the update so user view doesn't follow assigned flight
    if (tableContainerRef.current) {
      savedScrollPositionRef.current = tableContainerRef.current.scrollTop
    }

    const normalizedName = staffName.toLowerCase()
    const mobile = getMobileForStaff(normalizedName) || ""

    // Find the actual load plan flight key (with leading zeros) if it exists
    const matchingLoadPlan = loadPlans.find((lp) => {
      const match = lp.flight.match(/EK0?(\d+)/)
      if (!match) return false
      return parseInt(match[1], 10) === parseInt(flightNo, 10)
    })

    const flightKey = matchingLoadPlan?.flight || `EK${flightNo.padStart(4, "0")}`

    // Get assigned_by from logged-in user (if logged in), otherwise leave as undefined (null in DB)
    const assignedByStaffNo = currentUser?.staff_no

    // Fetch operator and supervisor names for logging
    let operatorName = staffName
    let assignedByName = currentUser?.name || "No login"

    try {
      const operatorStaff = await findStaffByStaffNo(operatorStaffNo)
      if (operatorStaff) {
        operatorName = operatorStaff.name
      }
    } catch (error) {
      console.error("[AllocationAssignment] Error fetching operator name:", error)
    }

    console.log(`[AllocationAssignment] ${flightKey} is assigned to ${operatorName} (Staff No: ${operatorStaffNo}), assigned by ${assignedByName}${assignedByStaffNo ? ` (Staff No: ${assignedByStaffNo})` : ""}`)

    // Pass staff_no values to update load_plans table
    updateFlightAssignment(flightKey, normalizedName, operatorStaffNo, assignedByStaffNo)
    updateBupAllocationStaff(flightNo, normalizedName, mobile)
  }

  const handleSectorChange = (flightNo: string, sector: string) => {
    // Save scroll position before the update so user view doesn't follow assigned flight
    if (tableContainerRef.current) {
      savedScrollPositionRef.current = tableContainerRef.current.scrollTop
    }

    // Find the actual load plan flight key (with leading zeros) if it exists
    const matchingLoadPlan = loadPlans.find((lp) => {
      const match = lp.flight.match(/EK0?(\d+)/)
      if (!match) return false
      return parseInt(match[1], 10) === parseInt(flightNo, 10)
    })
    const flightKey = matchingLoadPlan?.flight || `EK${flightNo.padStart(4, "0")}`
    updateFlightAssignmentSector(flightKey, sector)
  }

  const getPeriodLabel = (period: PeriodType) => {
    switch (period) {
      case "early-morning":
        return "Early Morning"
      case "late-morning":
        return "Late Morning"
      case "afternoon":
        return "Afternoon"
      default:
        return "All Periods"
    }
  }

  const getWaveLabel = (wave: WaveType) => {
    switch (wave) {
      case "first-wave":
        return "First Wave"
      case "second-wave":
        return "Second Wave"
      default:
        return "All Waves"
    }
  }

  // Upload removed: allocations assumed to be loaded via existing data flows

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        <div className="flex justify-between items-center mb-4 px-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Flight Assignment</h2>
            <p className="text-sm text-gray-500">Review allocations and assign staff</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 px-2 flex-wrap">
          <div className="flex items-center">
            <select className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent">
              <option value="default">≡ Default</option>
              <option value="custom">Custom View</option>
            </select>
          </div>

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
                    {["Flight", "ETD", "Routing", "Staff", "Sector", "A/C Type", "Regn No"].map((col) => (
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

          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search allocations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent w-36"
            />
          </div>

          <div className="w-px h-6 bg-gray-200" />

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

          <select
            id="period-filter"
            value={periodFilter}
            onChange={(e) => {
              setPeriodFilter(e.target.value as PeriodType)
              if (e.target.value === "early-morning") setWaveFilter("all")
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

                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <Plane className="w-3 h-3 text-[#D71A21]" />
                      <span>Show Rows</span>
                    </div>
                    <select className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded">
                      <option>All Allocations</option>
                      <option>Assigned Only</option>
                      <option>Unassigned Only</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Ordering</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <select className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded">
                        <option>ETD Time</option>
                        <option>Flight Number</option>
                        <option>Routing</option>
                      </select>
                      <button className="p-1.5 border border-gray-200 rounded hover:bg-gray-50">
                        <ArrowUpDown className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <Settings2 className="w-3 h-3" />
                      <span>Display Fields</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {["Flight", "ETD", "Routing", "Completion", "Staff", "Mobile", "Sector", "A/C Type", "Regn No"].map((field) => (
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

        </div>

        <div className="mb-4 px-2">
          <div className="flex flex-wrap gap-2 items-center">
            {Object.keys(pendingByCategory).length > 0 ? (
              Object.entries(pendingByCategory).map(([category, { count, color }]) => (
                <span key={category} className={`${color} px-3 py-1.5 rounded-md text-xs font-medium text-gray-900 inline-block`}>
                  {category}: {count}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500">No pending flights</span>
            )}
          </div>
        </div>

        <div className="mx-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Allocations</h3>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="text-center py-12">
              {bupAllocations.length === 0 ? (
                <>
                  <Plane className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 text-sm font-medium">No allocations available</p>
                  <p className="text-gray-500 text-xs mt-1">Waiting for allocation data to load.</p>
                </>
              ) : (
                <p className="text-gray-600 text-sm">No allocations match the selected filters.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-1 px-0"></th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5"><Plane className="w-4 h-4" />Flight</div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />Date</div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />ETD</div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />Routing</div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5"><FileText className="w-4 h-4" />Completion</div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5"><User className="w-4 h-4" />Staff</div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5"><Phone className="w-4 h-4" />Mobile</div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5"><FileText className="w-4 h-4" />Sector</div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">A/C Type</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Regn No</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRows.map((row) => {
                    const originColor = getOriginDestinationColor(row.flightKey, row.staff, row.sector)
                    return (
                      <tr
                        key={`${row.flightNo}-${row.etd}`}
                        className="hover:bg-gray-50 relative"
                        style={{
                          background: row.totalPlannedULDs > 0
                            ? `linear-gradient(to right, ${
                                row.completionStatus === "green" ? "rgba(34, 197, 94, 0.12)" :
                                row.completionStatus === "amber" ? "rgba(245, 158, 11, 0.12)" :
                                "rgba(239, 68, 68, 0.12)"
                              } ${row.completionPercentage}%, transparent ${row.completionPercentage}%)`
                            : undefined
                        }}
                      >
                        <td className="w-1 px-0 relative">
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusColor(row.completionStatus)} opacity-80`}
                          />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{row.carrier}{row.flightNo}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">{row.date || "-"}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">{row.etd}</td>
                        <td className={`px-3 py-3 whitespace-nowrap text-sm text-gray-700 ${originColor}`}>{row.routing || "-"}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                          {row.totalPlannedULDs > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getStatusColor(row.completionStatus)} transition-all duration-300`}
                                  style={{ width: `${Math.min(row.completionPercentage, 100)}%` }}
                                />
                              </div>
                              <span className={`font-semibold ${
                                row.completionStatus === "green" ? "text-green-600" :
                                row.completionStatus === "amber" ? "text-amber-600" :
                                "text-red-600"
                              }`}>
                                {row.completionPercentage}%
                              </span>
                              <span className="text-gray-500 text-[10px]">
                                ({row.completedULDs}/{row.totalPlannedULDs})
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">
                          <StaffSelector
                            currentStaff={row.staff}
                            operatorOptions={operatorOptions}
                            onSelect={(name, staffNo) => handleAssignStaff(row.flightNo, name, staffNo)}
                          />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">
                          {row.mobile ? (
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {row.mobile}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">
                          <Input
                            type="text"
                            value={row.sector}
                            onChange={(e) => handleSectorChange(row.flightNo, e.target.value)}
                            placeholder="E75"
                            className="w-full h-8 text-xs border-gray-300 placeholder:text-gray-400"
                          />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">{row.acType || "-"}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">{row.regnNo || "-"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

type StaffSelectorProps = {
  currentStaff: string
  operatorOptions: OperatorOption[]
  onSelect: (name: string, staffNo: number) => void
}

function StaffSelector({ currentStaff, operatorOptions, onSelect }: StaffSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filteredOperators = useMemo(() => {
    if (!search.trim()) return operatorOptions
    const q = search.toLowerCase()
    return operatorOptions.filter((op) => op.searchName.includes(q) || op.displayName.toLowerCase().includes(q))
  }, [operatorOptions, search])

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearch("")
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full h-8 justify-between text-xs px-2 py-1">
          {currentStaff ? currentStaff.charAt(0).toUpperCase() + currentStaff.slice(1) : "Select staff..."}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search name..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No operator found.</CommandEmpty>
            <CommandGroup>
              {filteredOperators.map((op) => (
                <CommandItem
                  key={op.staff_no}
                  value={op.displayName}
                  onSelect={() => {
                    onSelect(op.displayName, op.staff_no)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", currentStaff.toLowerCase() === op.displayName.toLowerCase() ? "opacity-100" : "opacity-0")} />
                  {op.fullName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

