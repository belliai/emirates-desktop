import { createClient } from "@/lib/supabase/client"
import type { ListsResults, LoadPlanHeader, Shipment } from "./types"

export interface SaveListsDataParams {
  results: ListsResults
  shipments?: Shipment[]
  fileName: string
  fileSize: number
}

export interface SaveListsDataResult {
  success: boolean
  loadPlanId?: string
  error?: string
}

/**
 * Parse date string to Date object
 * Handles formats like "1 Oct", "1-Oct", "1 Oct 2024", etc.
 * Returns current date as fallback if parsing fails
 */
function parseDateString(dateStr: string): Date {
  if (!dateStr) {
    console.warn("[v0] Empty date string, using current date as fallback")
    return new Date()
  }

  try {
    // Try to parse common date formats
    const cleanDate = dateStr.trim()
    
    // Match patterns like "1 Oct", "1-Oct", "1 Oct 2024", "1-Oct-2024"
    const match = cleanDate.match(/(\d{1,2})\s*[-]?\s*([A-Za-z]{3})(?:\s*[-]?\s*(\d{4}))?/i)
    if (match) {
      const day = parseInt(match[1], 10)
      const monthName = match[2]
      const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear()
      
      const monthMap: { [key: string]: number } = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, september: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11
      }
      
      const month = monthMap[monthName.toLowerCase()]
      if (month !== undefined && day >= 1 && day <= 31) {
        const date = new Date(year, month, day)
        // Validate the date is valid
        if (!isNaN(date.getTime()) && date.getDate() === day) {
          return date
        }
      }
    }
    
    // Try other common formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/,   // DD-MM-YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
    ]
    
    for (const format of formats) {
      const match = cleanDate.match(format)
      if (match) {
        let year: number, month: number, day: number
        if (format === formats[2]) {
          // YYYY-MM-DD
          year = parseInt(match[1], 10)
          month = parseInt(match[2], 10) - 1
          day = parseInt(match[3], 10)
        } else {
          // DD/MM/YYYY or DD-MM-YYYY
          day = parseInt(match[1], 10)
          month = parseInt(match[2], 10) - 1
          year = parseInt(match[3], 10)
        }
        const date = new Date(year, month, day)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }
    
    // Fallback: try direct Date parsing
    const parsed = new Date(cleanDate)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  } catch (error) {
    console.error("[v0] Error parsing date:", dateStr, error)
  }
  
  // Final fallback: return current date
  console.warn("[v0] Could not parse date:", dateStr, "using current date as fallback")
  return new Date()
}

/**
 * Parse time string to time format (HH:MM)
 */
function parseTimeString(timeStr: string): string | null {
  if (!timeStr) return null
  
  // Match HH:MM format
  const match = timeStr.match(/(\d{2}):(\d{2})/)
  if (match) {
    return timeStr
  }
  
  return null
}

/**
 * Parse datetime string to timestamp
 */
function parseDateTimeString(dateTimeStr: string): string | null {
  if (!dateTimeStr) return null
  
  try {
    // Try to parse common datetime formats
    const parsed = new Date(dateTimeStr)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  } catch (error) {
    console.error("[v0] Error parsing datetime:", dateTimeStr, error)
  }
  
  return null
}

/**
 * Extract origin and destination from sector (e.g., "DXBDXB" -> "DXB", "DXB")
 */
function parseSector(sector: string): { origin: string | null; destination: string | null; full: string | null } {
  if (!sector || sector.length < 6) {
    return { origin: null, destination: null, full: sector || null }
  }
  
  const origin = sector.substring(0, 3).toUpperCase()
  const destination = sector.substring(3, 6).toUpperCase()
  return { origin, destination, full: sector }
}

/**
 * Save parsed lists data to Supabase
 */
export async function saveListsDataToSupabase({
  results,
  shipments = [],
  fileName,
  fileSize,
}: SaveListsDataParams): Promise<SaveListsDataResult> {
  try {
    const supabase = createClient()

    // Parse date and sector
    const flightDate = parseDateString(results.header.date)
    const sectorInfo = parseSector(results.header.sector)
    const stdTime = parseTimeString(results.header.std)
    const preparedOn = parseDateTimeString(results.header.preparedOn)

    // Format date to YYYY-MM-DD
    const flightDateStr = flightDate.toISOString().split('T')[0]
    
    // Ensure required fields are not null
    const flightNumber = results.header.flightNumber?.trim() || "UNKNOWN"
    
    console.log("[v0] Parsed data for load_plan:", {
      flight_number: flightNumber,
      flight_date: flightDateStr,
      date_original: results.header.date,
    })

    // 1. Insert load_plan
    const { data: loadPlan, error: loadPlanError } = await supabase
      .from("load_plans")
      .insert({
        flight_number: flightNumber,
        flight_date: flightDateStr,
        aircraft_type: results.header.aircraftType || null,
        aircraft_registration: results.header.aircraftReg || null,
        header_version: 1,
        route_origin: sectorInfo.origin,
        route_destination: sectorInfo.destination,
        route_full: sectorInfo.full,
        std_time: stdTime,
        prepared_by: results.header.preparedBy || null,
        total_planned_uld: null, // Not available in parsed data
        uld_version: null, // Not available in parsed data
        prepared_on: preparedOn,
        sector: results.header.sector || null,
      })
      .select()
      .single()

    if (loadPlanError) {
      console.error("[v0] Error inserting load_plan:", loadPlanError)
      return { success: false, error: loadPlanError.message }
    }

    if (!loadPlan) {
      return { success: false, error: "Failed to create load plan" }
    }

    const loadPlanId = loadPlan.id

    // 2. Insert load_plan_items from shipments
    if (shipments && shipments.length > 0) {
      // Check for VUN shipments before saving
      const vunShipments = shipments.filter(s => s.shc && s.shc.includes('VUN'))
      if (vunShipments.length > 0) {
        console.log(`[v0] Found ${vunShipments.length} shipment(s) with SHC=VUN:`, 
          vunShipments.map(s => ({
            serialNo: s.serialNo,
            awbNo: s.awbNo,
            shc: s.shc,
            origin: s.origin,
            destination: s.destination,
          }))
        )
      }
      
      const loadPlanItems = shipments.map((shipment) => ({
        load_plan_id: loadPlanId,
        serial_number: shipment.serialNo ? parseInt(shipment.serialNo, 10) : null,
        awb_number: shipment.awbNo || null,
        origin_destination: shipment.origin && shipment.destination 
          ? `${shipment.origin}${shipment.destination}` 
          : null,
        pieces: shipment.pieces || null,
        weight: shipment.weight || null,
        volume: shipment.volume || null,
        load_volume: shipment.lvol || null,
        special_handling_code: shipment.shc || null,
        manual_description: shipment.manDesc || null,
        product_code_pc: shipment.pcode || null,
        total_handling_charge: shipment.thc && !isNaN(parseFloat(shipment.thc)) ? parseFloat(shipment.thc) : null,
        additional_total_handling_charge: null, // Not available in parsed data
        booking_status: shipment.bs || null,
        priority_indicator: shipment.pi || null,
        flight_in: shipment.fltIn || null,
        arrival_date_time: shipment.arrDtTime ? parseDateTimeString(shipment.arrDtTime) : null,
        quantity_aqnn: shipment.qnnAqnn || null,
        payment_terms: null, // Not available in parsed data
        warehouse_code: shipment.whs || null,
        special_instructions: shipment.si || null,
        uld_allocation: shipment.uld || null,
      }))

      const { error: itemsError } = await supabase.from("load_plan_items").insert(loadPlanItems)

      if (itemsError) {
        console.error("[v0] Error inserting load_plan_items:", itemsError)
        // Continue even if this fails
      } else {
        console.log(`[v0] Successfully inserted ${loadPlanItems.length} load_plan_items`)
      }
    }

    console.log("[v0] Successfully saved lists data to Supabase, load_plan_id:", loadPlanId)
    return { success: true, loadPlanId }
  } catch (error) {
    console.error("[v0] Error saving lists data to Supabase:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
