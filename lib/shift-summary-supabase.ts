import { createClient } from "@/lib/supabase/client"
import { getAllBuildupStaff, getOperators, getSupervisors, parseStaffName, type BuildupStaff } from "@/lib/buildup-staff"

/**
 * Staff detail type for shift summary report
 */
export type StaffDetail = {
  srNo: number
  name: string
  staffNo: string
  flightCount: number
  uldCount: number
  deployment: string
  contact: string
  dutyHours: number
  actualHours: number
}

/**
 * BUP Allocation type from database
 */
export type BUPAllocation = {
  id: string
  carrier: string
  flight_no: string
  etd: string | null
  routing: string | null
  staff: string | null
  mobile: string | null
  ac_type: string | null
  regn_no: string | null
  shift_type: string | null
  period: string | null
  wave: string | null
  date: string | null
}

/**
 * Flight allocation data for the report
 */
export type FlightAllocation = {
  no: number
  flight: string
  etd: string
  dst: string
  staff: string
  builtPmc: number
  builtAlf: number
  builtAke: number
  builtTotal: number
  thruPmc: number
  thruAlf: number
  thruAke: number
  thruTotal: number
}

/**
 * Check if Supabase is configured
 */
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key"
  )
}

/**
 * Fetch BUP allocations from Supabase
 */
export async function getBUPAllocations(): Promise<BUPAllocation[]> {
  try {
    if (!isSupabaseConfigured()) {
      console.log("[ShiftSummary] Supabase not configured, returning empty array")
      return []
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from("bup_allocations")
      .select("*")
      .order("etd", { ascending: true })

    if (error) {
      console.error("[ShiftSummary] Error fetching BUP allocations:", error)
      return []
    }

    console.log(`[ShiftSummary] Fetched ${data?.length || 0} BUP allocations from Supabase`)
    return (data || []) as BUPAllocation[]
  } catch (error) {
    console.error("[ShiftSummary] Error fetching BUP allocations:", error)
    return []
  }
}

/**
 * Fetch load plans from Supabase for a specific date range
 */
export async function getLoadPlansForShift(shiftDate: string): Promise<any[]> {
  try {
    if (!isSupabaseConfigured()) {
      return []
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from("load_plans")
      .select(`
        *,
        load_plan_items(*)
      `)
      .order("std_time", { ascending: true })

    if (error) {
      console.error("[ShiftSummary] Error fetching load plans:", error)
      return []
    }

    console.log(`[ShiftSummary] Fetched ${data?.length || 0} load plans from Supabase`)
    return data || []
  } catch (error) {
    console.error("[ShiftSummary] Error fetching load plans:", error)
    return []
  }
}

/**
 * Convert BuildupStaff to StaffDetail format
 */
function buildupStaffToStaffDetail(staff: BuildupStaff, index: number): StaffDetail {
  const parsed = parseStaffName(staff.name)
  return {
    srNo: index + 1,
    name: parsed.displayName || parsed.fullName || "Unknown",
    staffNo: staff.staff_no?.toString() || "",
    flightCount: 0, // Will be calculated from allocations
    uldCount: 0, // Will be calculated from allocations
    deployment: staff.job_code === "CHS" ? "Supervisor" : "SHIFT",
    contact: "",
    dutyHours: 12,
    actualHours: 12,
  }
}

/**
 * Fetch staff data for shift summary (EK On Floor team)
 * Uses buildup_staff_list table
 */
export async function getStaffForShiftSummary(): Promise<{
  positionals: StaffDetail[]
  ekOnFloor: StaffDetail[]
  supervisors: StaffDetail[]
}> {
  try {
    // Fetch all staff from Supabase
    const allStaff = await getAllBuildupStaff()
    const operators = await getOperators()
    const supervisors = await getSupervisors()

    console.log(`[ShiftSummary] Processing ${allStaff.length} staff members`)

    // Convert to StaffDetail format
    const ekOnFloor: StaffDetail[] = operators.slice(0, 20).map((s, i) => buildupStaffToStaffDetail(s, i))
    const supervisorList: StaffDetail[] = supervisors.slice(0, 6).map((s, i) => ({
      ...buildupStaffToStaffDetail(s, i),
      deployment: "Supervisor"
    }))

    // Positionals (hardcoded positions for now - these would come from a separate table)
    const positionals: StaffDetail[] = [
      { srNo: 1, name: "Unassigned", staffNo: "", flightCount: 0, uldCount: 0, deployment: "Chaser", contact: "", dutyHours: 12, actualHours: 12 },
      { srNo: 2, name: "Unassigned", staffNo: "", flightCount: 0, uldCount: 0, deployment: "RXS", contact: "", dutyHours: 12, actualHours: 12 },
      { srNo: 3, name: "Unassigned", staffNo: "", flightCount: 0, uldCount: 0, deployment: "CTO", contact: "", dutyHours: 12, actualHours: 12 },
      { srNo: 4, name: "Unassigned", staffNo: "", flightCount: 0, uldCount: 0, deployment: "Screening", contact: "", dutyHours: 12, actualHours: 12 },
      { srNo: 5, name: "Unassigned", staffNo: "", flightCount: 0, uldCount: 0, deployment: "Screening", contact: "", dutyHours: 12, actualHours: 12 },
      { srNo: 6, name: "Unassigned", staffNo: "", flightCount: 0, uldCount: 0, deployment: "CTO Support", contact: "", dutyHours: 12, actualHours: 12 },
    ]

    return {
      positionals,
      ekOnFloor,
      supervisors: supervisorList,
    }
  } catch (error) {
    console.error("[ShiftSummary] Error fetching staff data:", error)
    return {
      positionals: [],
      ekOnFloor: [],
      supervisors: [],
    }
  }
}

/**
 * Fetch flight allocations for shift summary
 * Combines bup_allocations with load_plans data
 */
export async function getFlightAllocationsForShift(): Promise<FlightAllocation[]> {
  try {
    const allocations = await getBUPAllocations()
    const loadPlans = await getLoadPlansForShift("")

    // Create a map of flight numbers to load plan data
    const loadPlanMap = new Map<string, any>()
    loadPlans.forEach(lp => {
      const flightNo = lp.flight_number?.replace("EK", "").replace(/^0+/, "") || ""
      loadPlanMap.set(flightNo, lp)
    })

    // Convert BUP allocations to FlightAllocation format
    const flightAllocations: FlightAllocation[] = allocations.map((alloc, index) => {
      const flightNo = alloc.flight_no?.replace(/^0+/, "") || ""
      const loadPlan = loadPlanMap.get(flightNo)
      
      // Parse ULD counts from load plan if available
      let builtPmc = 0, builtAlf = 0, builtAke = 0
      if (loadPlan?.total_planned_uld) {
        const uldStr = loadPlan.total_planned_uld.toUpperCase()
        const pmcMatch = uldStr.match(/(\d+)\s*PMC/i)
        const alfMatch = uldStr.match(/(\d+)\s*(?:ALF|PLA)/i)
        const akeMatch = uldStr.match(/(\d+)\s*AKE/i)
        builtPmc = pmcMatch ? parseInt(pmcMatch[1]) : 0
        builtAlf = alfMatch ? parseInt(alfMatch[1]) : 0
        builtAke = akeMatch ? parseInt(akeMatch[1]) : 0
      }

      // Extract destination from routing
      const routing = alloc.routing || ""
      const dst = routing.split("-").slice(1).join("-") || routing

      return {
        no: index + 1,
        flight: alloc.flight_no?.padStart(4, "0") || "",
        etd: alloc.etd || "",
        dst: dst,
        staff: alloc.staff || "L/OVER",
        builtPmc,
        builtAlf,
        builtAke,
        builtTotal: builtPmc + builtAlf + builtAke,
        thruPmc: 0,
        thruAlf: 0,
        thruAke: 0,
        thruTotal: 0,
      }
    })

    console.log(`[ShiftSummary] Created ${flightAllocations.length} flight allocations`)
    return flightAllocations
  } catch (error) {
    console.error("[ShiftSummary] Error fetching flight allocations:", error)
    return []
  }
}

/**
 * Calculate ULD totals from flight allocations
 */
export function calculateULDTotals(allocations: FlightAllocation[]): {
  builtPmc: number
  builtAlf: number
  builtAke: number
  builtTotal: number
  thruPmc: number
  thruAlf: number
  thruAke: number
  thruTotal: number
} {
  return allocations.reduce((acc, alloc) => ({
    builtPmc: acc.builtPmc + alloc.builtPmc,
    builtAlf: acc.builtAlf + alloc.builtAlf,
    builtAke: acc.builtAke + alloc.builtAke,
    builtTotal: acc.builtTotal + alloc.builtTotal,
    thruPmc: acc.thruPmc + alloc.thruPmc,
    thruAlf: acc.thruAlf + alloc.thruAlf,
    thruAke: acc.thruAke + alloc.thruAke,
    thruTotal: acc.thruTotal + alloc.thruTotal,
  }), {
    builtPmc: 0, builtAlf: 0, builtAke: 0, builtTotal: 0,
    thruPmc: 0, thruAlf: 0, thruAke: 0, thruTotal: 0,
  })
}

/**
 * Fetch all shift summary data from Supabase
 */
export async function fetchShiftSummaryData() {
  console.log("[ShiftSummary] Fetching all shift summary data from Supabase...")
  
  const [staffData, flightAllocations] = await Promise.all([
    getStaffForShiftSummary(),
    getFlightAllocationsForShift(),
  ])

  const uldTotals = calculateULDTotals(flightAllocations)

  return {
    ...staffData,
    flightAllocations,
    uldTotals,
  }
}

