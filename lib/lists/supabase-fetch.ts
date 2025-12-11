import { createClient } from "@/lib/supabase/client"
import type { LoadPlanHeader, Shipment } from "./types"

export type FetchLoadPlansResult = {
  shipments: Shipment[]
  header: LoadPlanHeader
  loadPlanCount: number
}

type LoadPlanRow = {
  id: string
  flight_number: string
  flight_date: string
  aircraft_type: string | null
  aircraft_registration: string | null
  route_origin: string | null
  route_destination: string | null
  route_full: string | null
  std_time: string | null
  prepared_by: string | null
  prepared_on: string | null
  total_planned_uld: string | null
  uld_version: string | null
  sector: string | null
  header_warning: string | null
  is_critical: boolean | null
  revision: number | null
}

type LoadPlanItemRow = {
  id: string
  load_plan_id: string
  serial_number: number | null
  awb_number: string | null
  origin_destination: string | null
  pieces: number | null
  weight: number | null
  volume: number | null
  load_volume: number | null
  special_handling_code: string | null
  manual_description: string | null
  product_code_pc: string | null
  total_handling_charge: number | null
  booking_status: string | null
  priority_indicator: string | null
  flight_in: string | null
  arrival_date_time: string | null
  quantity_aqnn: string | null
  warehouse_code: string | null
  special_instructions: string | null
  uld_allocation: string | null
  special_notes: string | null
  sector: string | null
  is_ramp_transfer: boolean | null
  revision: number | null
}

/**
 * Parse origin and destination from combined origin_destination field
 */
function parseOriginDestination(originDestination: string | null): { origin: string; destination: string } {
  if (!originDestination || originDestination.length < 6) {
    return { origin: "", destination: "" }
  }
  return {
    origin: originDestination.substring(0, 3).toUpperCase(),
    destination: originDestination.substring(3, 6).toUpperCase(),
  }
}

/**
 * Format date from YYYY-MM-DD to display format
 */
function formatDateForDisplay(dateStr: string | null): string {
  if (!dateStr) return ""
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    
    const day = date.getDate()
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = months[date.getMonth()]
    return `${day} ${month}`
  } catch {
    return dateStr
  }
}

/**
 * Transform database row to Shipment type
 */
function transformToShipment(item: LoadPlanItemRow, loadPlan: LoadPlanRow): Shipment {
  const { origin, destination } = parseOriginDestination(item.origin_destination)
  
  return {
    serialNo: item.serial_number?.toString() || "",
    awbNo: item.awb_number || "",
    origin,
    destination,
    pieces: item.pieces || 0,
    weight: item.weight || 0,
    volume: item.volume || 0,
    lvol: item.load_volume || 0,
    shc: item.special_handling_code || "",
    manDesc: item.manual_description || "",
    pcode: item.product_code_pc || "",
    pc: item.product_code_pc || "",
    thc: item.total_handling_charge?.toString() || "",
    bs: item.booking_status || "",
    pi: item.priority_indicator || "",
    fltIn: item.flight_in || "",
    arrDtTime: item.arrival_date_time || "",
    qnnAqnn: item.quantity_aqnn || "",
    whs: item.warehouse_code || "",
    si: item.special_instructions || "",
    uld: item.uld_allocation || "",
    specialNotes: item.special_notes ? item.special_notes.split("\n") : [],
    isRampTransfer: item.is_ramp_transfer || false,
    sector: item.sector || loadPlan.sector || "",
  }
}

/**
 * Create aggregated header from multiple load plans
 */
function createAggregatedHeader(loadPlans: LoadPlanRow[]): LoadPlanHeader {
  if (loadPlans.length === 0) {
    return {
      flightNumber: "",
      date: "",
      aircraftType: "",
      aircraftReg: "",
      sector: "",
      std: "",
      preparedBy: "",
      preparedOn: "",
    }
  }

  if (loadPlans.length === 1) {
    const lp = loadPlans[0]
    return {
      flightNumber: lp.flight_number || "",
      date: formatDateForDisplay(lp.flight_date),
      aircraftType: lp.aircraft_type || "",
      aircraftReg: lp.aircraft_registration || "",
      sector: lp.sector || lp.route_full || "",
      std: lp.std_time || "",
      preparedBy: lp.prepared_by || "",
      preparedOn: lp.prepared_on || "",
      ttlPlnUld: lp.total_planned_uld || undefined,
      uldVersion: lp.uld_version || undefined,
      headerWarning: lp.header_warning || undefined,
      isCritical: lp.is_critical || undefined,
    }
  }

  // Multiple load plans - create aggregated header
  const uniqueFlights = [...new Set(loadPlans.map(lp => lp.flight_number))]
  const dates = loadPlans.map(lp => lp.flight_date).filter(Boolean).sort()
  const earliestDate = dates[0]
  const latestDate = dates[dates.length - 1]

  const dateDisplay = earliestDate === latestDate 
    ? formatDateForDisplay(earliestDate)
    : `${formatDateForDisplay(earliestDate)} - ${formatDateForDisplay(latestDate)}`

  return {
    flightNumber: uniqueFlights.length === 1 ? uniqueFlights[0] : `${uniqueFlights.length} Flights`,
    date: dateDisplay,
    aircraftType: "Multiple",
    aircraftReg: "",
    sector: "Multiple",
    std: "",
    preparedBy: "Database",
    preparedOn: new Date().toISOString(),
  }
}

/**
 * Fetch all load plans from Supabase
 * Transforms database records back to Shipment[] and LoadPlanHeader types
 */
export async function fetchAllLoadPlansFromSupabase(): Promise<FetchLoadPlansResult> {
  const supabase = createClient()

  console.log("[v0] Fetching all load plans from database...")

  // Fetch all load plans
  const { data: loadPlans, error: loadPlansError } = await supabase
    .from("load_plans")
    .select("*")
    .order("flight_date", { ascending: false })

  if (loadPlansError) {
    console.error("[v0] Error fetching load_plans:", loadPlansError)
    throw new Error(`Failed to fetch load plans: ${loadPlansError.message}`)
  }

  if (!loadPlans || loadPlans.length === 0) {
    console.log("[v0] No load plans found in database")
    return {
      shipments: [],
      header: createAggregatedHeader([]),
      loadPlanCount: 0,
    }
  }

  console.log(`[v0] Found ${loadPlans.length} load plans`)

  // Fetch all load plan items
  const loadPlanIds = loadPlans.map(lp => lp.id)
  const { data: items, error: itemsError } = await supabase
    .from("load_plan_items")
    .select("*")
    .in("load_plan_id", loadPlanIds)

  if (itemsError) {
    console.error("[v0] Error fetching load_plan_items:", itemsError)
    throw new Error(`Failed to fetch load plan items: ${itemsError.message}`)
  }

  console.log(`[v0] Found ${items?.length || 0} load plan items`)

  // Create lookup map for load plans
  const loadPlanMap = new Map<string, LoadPlanRow>()
  for (const lp of loadPlans as LoadPlanRow[]) {
    loadPlanMap.set(lp.id, lp)
  }

  // Transform items to shipments
  const shipments: Shipment[] = []
  for (const item of (items || []) as LoadPlanItemRow[]) {
    const loadPlan = loadPlanMap.get(item.load_plan_id)
    if (loadPlan) {
      shipments.push(transformToShipment(item, loadPlan))
    }
  }

  console.log(`[v0] Transformed ${shipments.length} shipments from database`)

  // Log some sample data for debugging
  if (shipments.length > 0) {
    const vunShipments = shipments.filter(s => s.shc?.includes("VUN"))
    const qrtShipments = shipments.filter(s => s.thc === "QWT")
    console.log(`[v0] Database shipments - VUN: ${vunShipments.length}, QRT (QWT): ${qrtShipments.length}`)
  }

  return {
    shipments,
    header: createAggregatedHeader(loadPlans as LoadPlanRow[]),
    loadPlanCount: loadPlans.length,
  }
}

