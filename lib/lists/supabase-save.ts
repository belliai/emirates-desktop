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
 * Format ULD allocation string to ensure proper spacing
 * Adds space after "XX" at the start and before "XX" at the end if not already present
 * Examples:
 * - "XX02PMCXX" -> "XX 02PMC XX"
 * - "XXTOPUPJNGUNITXX" -> "XX TOPUPJNGUNIT XX"
 * - "XX01ALF 01AKEXX--- HLONEK041" -> "XX 01ALF 01AKE XX --- HLONEK041"
 * - "XX 01ALF 01AKE XX --- HLONEK041" -> "XX 01ALF 01AKE XX --- HLONEK041" (already correct)
 */
function formatULD(uld: string | null | undefined): string | null {
  if (!uld || !uld.trim()) {
    return null
  }
  
  let formatted = uld.trim()
  
  // Step 1: Add space after "XX" at the start if not already present
  // Pattern: "XX" followed immediately by non-space, non-X character
  if (/^XX[^X\s]/i.test(formatted)) {
    formatted = formatted.replace(/^(XX)([^X\s])/i, '$1 $2')
  }
  
  // Step 2: Find all "XX" patterns (case insensitive) and ensure space before them
  // Pattern: any character (except space and X) followed by "XX"
  // We need to be careful not to match "XX" that's already part of a correctly formatted pattern
  // Replace: character + "XX" -> character + " XX"
  // But skip if there's already a space before "XX"
  formatted = formatted.replace(/([^X\s])(XX)/gi, '$1 $2')
  
  // Step 3: Clean up any double spaces that might have been created
  formatted = formatted.replace(/\s{2,}/g, ' ')
  
  return formatted
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
    // Handle load plan format: "12Oct0024 13:29/" or "11Oct0439 29:28/"
    // Format: DDMmmHHMM TIME/ where DD=day, Mmm=month, HHMM=time
    const loadPlanMatch = dateTimeStr.match(/^(\d{2})([A-Za-z]{3})(\d{4})/)
    if (loadPlanMatch) {
      const day = parseInt(loadPlanMatch[1], 10)
      const monthStr = loadPlanMatch[2]
      const timeStr = loadPlanMatch[3] // HHMM format
      
      const monthMap: { [key: string]: number } = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      }
      
      const month = monthMap[monthStr.toLowerCase()]
      if (month !== undefined) {
        const hours = parseInt(timeStr.substring(0, 2), 10)
        const minutes = parseInt(timeStr.substring(2, 4), 10)
        
        // Use current year as the year is not in the format
        const currentYear = new Date().getFullYear()
        const parsed = new Date(currentYear, month, day, hours, minutes)
        
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString()
        }
      }
    }
    
    // Try to parse common datetime formats as fallback
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

    // Check if load plan with this flight_number already exists
    const { data: existingLoadPlan, error: checkError } = await supabase
      .from("load_plans")
      .select("id, revision")
      .eq("flight_number", flightNumber)
      .order("revision", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("[v0] Error checking existing load plan:", checkError)
      return {
        success: false,
        error: `Failed to check existing load plan: ${checkError.message}`
      }
    }

    // Determine revision number
    let newRevision = 1
    let existingLoadPlanId: string | null = null
    
    if (existingLoadPlan) {
      existingLoadPlanId = existingLoadPlan.id
      newRevision = (existingLoadPlan.revision || 1) + 1
      console.log("[v0] Found existing load plan for flight", flightNumber, "with revision", existingLoadPlan.revision, "- updating to revision", newRevision)
    } else {
      console.log("[v0] No existing load plan found for flight", flightNumber, "- creating new with revision", newRevision)
    }

    // 1. Insert or Update load_plan
    // Prepare insert/update data
    const loadPlanData: any = {
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
      total_planned_uld: results.header.ttlPlnUld || null,
      uld_version: results.header.uldVersion || null,
      prepared_on: preparedOn,
      sector: results.header.sector || null,
      header_warning: results.header.headerWarning || null,
      revision: newRevision,
    }
    
    // Log header data for debugging
    console.log("[v0] Header data to save:", {
      flight_number: loadPlanData.flight_number,
      aircraft_type: loadPlanData.aircraft_type,
      aircraft_registration: loadPlanData.aircraft_registration,
      total_planned_uld: loadPlanData.total_planned_uld,
      uld_version: loadPlanData.uld_version,
      sector: loadPlanData.sector,
      route_origin: loadPlanData.route_origin,
      route_destination: loadPlanData.route_destination,
      route_full: loadPlanData.route_full,
      header_warning: loadPlanData.header_warning,
    })
    
    // Log headerWarning from results for debugging
    console.log("[v0] Header warning from results:", {
      headerWarning: results.header.headerWarning,
      headerWarningType: typeof results.header.headerWarning,
      headerWarningLength: results.header.headerWarning?.length,
      headerWarningPreview: results.header.headerWarning?.substring(0, 100),
    })
    
    // Add is_critical if available (with fallback if column doesn't exist)
    console.log("[v0] Checking isCritical value:", {
      isCritical: results.header.isCritical,
      isCriticalType: typeof results.header.isCritical,
      isCriticalUndefined: results.header.isCritical === undefined,
      isCriticalNull: results.header.isCritical === null,
    })
    
    if (results.header.isCritical !== undefined && results.header.isCritical !== null) {
      loadPlanData.is_critical = results.header.isCritical === true
      console.log("[v0] ✅ Setting is_critical to:", loadPlanData.is_critical)
    } else {
      console.log("[v0] ⚠️ isCritical is undefined or null, defaulting to false")
      loadPlanData.is_critical = false
    }
    
    console.log("[v0] " + (existingLoadPlanId ? "Updating" : "Inserting") + " load_plan with data:", {
      ...loadPlanData,
      is_critical: loadPlanData.is_critical,
    })
    
    let { data: loadPlan, error: loadPlanError } = existingLoadPlanId
      ? await supabase
          .from("load_plans")
          .update({
            ...loadPlanData,
            revision: newRevision, // Update revision
          })
          .eq("id", existingLoadPlanId)
          .select()
          .single()
      : await supabase
          .from("load_plans")
          .insert(loadPlanData)
          .select()
          .single()

    // If error is about is_critical column, retry without it
    if (loadPlanError) {
      const errorMessage = loadPlanError.message || JSON.stringify(loadPlanError) || 'Unknown error'
      const errorDetails = {
        message: loadPlanError.message || 'No error message',
        details: loadPlanError.details || 'No details',
        hint: loadPlanError.hint || 'No hint',
        code: loadPlanError.code || 'No error code',
      }
      console.error("[v0] Error " + (existingLoadPlanId ? "updating" : "inserting") + " load_plan:", errorDetails)
      
      // Check if error is related to is_critical column
      if (errorMessage.includes('is_critical') || 
          errorMessage.includes("Could not find the 'is_critical' column") ||
          (errorMessage.includes("column") && errorMessage.includes("schema cache"))) {
        console.warn("[v0] is_critical column not found in schema cache. Retrying without is_critical field...")
        
        // Remove is_critical and retry
        const { is_critical, ...loadPlanDataWithoutCritical } = loadPlanData
        const retryResult = existingLoadPlanId
          ? await supabase
              .from("load_plans")
              .update({
                ...loadPlanDataWithoutCritical,
                revision: newRevision,
              })
              .eq("id", existingLoadPlanId)
              .select()
              .single()
          : await supabase
              .from("load_plans")
              .insert(loadPlanDataWithoutCritical)
              .select()
              .single()
        
        if (retryResult.error) {
          console.error("[v0] Error " + (existingLoadPlanId ? "updating" : "inserting") + " load_plan (retry without is_critical):", {
            message: retryResult.error.message || 'No error message',
            details: retryResult.error.details || 'No details',
            hint: retryResult.error.hint || 'No hint',
            code: retryResult.error.code || 'No error code',
          })
          return { 
            success: false, 
            error: retryResult.error.message || JSON.stringify(retryResult.error) || 'Failed to ' + (existingLoadPlanId ? 'update' : 'insert') + ' load plan' 
          }
        }
        
        loadPlan = retryResult.data
        loadPlanError = null
        console.warn("[v0] ⚠️ Load plan saved without is_critical field. Please refresh Supabase schema cache or restart the application.")
      } else {
        return { 
          success: false, 
          error: loadPlanError.message || JSON.stringify(loadPlanError) || 'Failed to ' + (existingLoadPlanId ? 'update' : 'insert') + ' load plan' 
        }
      }
    }

    if (!loadPlan) {
      return { success: false, error: "Failed to " + (existingLoadPlanId ? "update" : "create") + " load plan" }
    }

    const loadPlanId = loadPlan.id

    // 2. If updating existing load plan, delete old items first
    if (existingLoadPlanId) {
      console.log("[v0] Deleting old load_plan_items for load_plan_id:", loadPlanId)
      const { error: deleteItemsError } = await supabase
        .from("load_plan_items")
        .delete()
        .eq("load_plan_id", loadPlanId)
      
      if (deleteItemsError) {
        console.error("[v0] Error deleting old load_plan_items:", deleteItemsError)
        // Continue anyway - we'll try to insert new items
      } else {
        console.log("[v0] Successfully deleted old load_plan_items")
      }
    }

    // 3. Insert load_plan_items from shipments
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
      
      // Helper function to truncate string to max length
      const truncate = (str: string | null | undefined, maxLength: number): string | null => {
        if (!str) return null
        return str.length > maxLength ? str.substring(0, maxLength) : str
      }

      const loadPlanItems = shipments.map((shipment) => {
        const item = {
          load_plan_id: loadPlanId,
          serial_number: shipment.serialNo ? parseInt(shipment.serialNo, 10) : null,
          awb_number: truncate(shipment.awbNo, 50),
          origin_destination: shipment.origin && shipment.destination 
            ? truncate(`${shipment.origin}${shipment.destination}`, 50)
            : null,
          pieces: shipment.pieces || null,
          weight: shipment.weight || null,
          volume: shipment.volume || null,
          load_volume: shipment.lvol || null,
          special_handling_code: truncate(shipment.shc, 50),
          // Manual description - DO NOT include special notes here
          // Special notes like "[Must be load in Fire containment equipment]" should be stored separately
          manual_description: shipment.manDesc || null, // This is TEXT, no limit
          product_code_pc: truncate(shipment.pcode, 50),
          total_handling_charge: shipment.thc && !isNaN(parseFloat(shipment.thc)) ? parseFloat(shipment.thc) : null,
          additional_total_handling_charge: null, // Not available in parsed data
          booking_status: truncate(shipment.bs, 50),
          priority_indicator: truncate(shipment.pi, 50),
          flight_in: truncate(shipment.fltIn, 50),
          arrival_date_time: shipment.arrDtTime ? parseDateTimeString(shipment.arrDtTime) : null,
          quantity_aqnn: truncate(shipment.qnnAqnn, 50),
          payment_terms: null, // Not available in parsed data
          warehouse_code: truncate(shipment.whs, 50),
          // SI field - only store original SI value, NOT special notes
          special_instructions: truncate(shipment.si, 50),
          // ULD allocation - format ULD with proper spacing before saving
          uld_allocation: truncate(formatULD(shipment.uld), 50),
          // Special notes - store in separate column (e.g., "[Must be load in Fire containment equipment]")
          // Join multiple special notes with newline
          special_notes: shipment.specialNotes && shipment.specialNotes.length > 0
            ? shipment.specialNotes.join("\n")
            : null,
          // Sector information for grouping items by sector
          sector: truncate(shipment.sector, 50),
          is_ramp_transfer: shipment.isRampTransfer === true,
        }
        
        // Log if ULD is being saved to special_notes (this should NOT happen)
        if (item.uld_allocation && item.special_notes && item.special_notes.includes(item.uld_allocation)) {
          console.warn(`[v0] ⚠️ WARNING: ULD "${item.uld_allocation}" found in special_notes for shipment ${item.serial_number}`)
        }
        
        return item
      })
      
      // Log ramp transfer items being saved
      const rampTransferItems = loadPlanItems.filter(item => item.is_ramp_transfer)
      if (rampTransferItems.length > 0) {
        console.log(`[v0] Saving ${rampTransferItems.length} ramp transfer items to database:`, 
          rampTransferItems.slice(0, 3).map(item => ({
            serial_number: item.serial_number,
            awb_number: item.awb_number,
            is_ramp_transfer: item.is_ramp_transfer
          }))
        )
      }
      
      // Log sample item structure for debugging
      if (loadPlanItems.length > 0) {
        console.log("[v0] Sample load_plan_item structure:", {
          keys: Object.keys(loadPlanItems[0]),
          has_is_ramp_transfer: 'is_ramp_transfer' in loadPlanItems[0],
          sample_item: {
            serial_number: loadPlanItems[0].serial_number,
            awb_number: loadPlanItems[0].awb_number,
            uld_allocation: loadPlanItems[0].uld_allocation,
            is_ramp_transfer: loadPlanItems[0].is_ramp_transfer,
          }
        })
        
        // Check for fields that might exceed 50 characters
        const sampleItem = loadPlanItems[0] as any
        const fieldsToCheck = [
          'awb_number', 'origin_destination', 'special_handling_code', 
          'product_code_pc', 'booking_status', 'priority_indicator', 
          'flight_in', 'quantity_aqnn', 'warehouse_code', 
          'special_instructions', 'uld_allocation'
        ]
        fieldsToCheck.forEach(field => {
          if (sampleItem[field] && sampleItem[field].length > 50) {
            console.log(`[v0] ⚠️ Field ${field} exceeds 50 characters:`, {
              length: sampleItem[field].length,
              value: sampleItem[field].substring(0, 100)
            })
          }
        })
        
        // Log items with BULK ULD allocation
        const bulkItems = loadPlanItems.filter(item => item.uld_allocation && item.uld_allocation.includes("BULK"))
        if (bulkItems.length > 0) {
          console.log(`[v0] Found ${bulkItems.length} item(s) with BULK ULD allocation:`, 
            bulkItems.map(item => ({
              serial_number: item.serial_number,
              awb_number: item.awb_number,
              uld_allocation: item.uld_allocation,
              is_ramp_transfer: item.is_ramp_transfer
            }))
          )
        }
      }

      // Try to insert with is_ramp_transfer field first
      let { error: itemsError } = await supabase.from("load_plan_items").insert(loadPlanItems)

      // If error occurs, it might be because is_ramp_transfer field doesn't exist yet
      // Try without is_ramp_transfer field as fallback
      if (itemsError) {
        console.error("[v0] Error inserting load_plan_items with is_ramp_transfer:", {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
        })
        
        // Check if error is related to is_ramp_transfer field
        const errorMessage = itemsError.message || JSON.stringify(itemsError)
        if (errorMessage.includes('is_ramp_transfer') || errorMessage.includes('column') || errorMessage.includes('does not exist')) {
          console.warn("[v0] is_ramp_transfer field may not exist. Retrying without is_ramp_transfer field...")
          
          // Remove is_ramp_transfer field and try again
          const loadPlanItemsWithoutRampTransfer = loadPlanItems.map(({ is_ramp_transfer, ...item }) => item)
          
          const { error: retryError } = await supabase.from("load_plan_items").insert(loadPlanItemsWithoutRampTransfer)
          
          if (retryError) {
            console.error("[v0] Error inserting load_plan_items (retry without is_ramp_transfer):", {
              message: retryError.message,
              details: retryError.details,
              hint: retryError.hint,
              code: retryError.code,
            })
            // Return error instead of continuing silently
            return { 
              success: false, 
              error: `Failed to insert load_plan_items: ${retryError.message || JSON.stringify(retryError)}. Please run migration script 003_add_ramp_transfer_flag.sql to add is_ramp_transfer field.` 
            }
          } else {
            console.log(`[v0] Successfully inserted ${loadPlanItems.length} load_plan_items (without is_ramp_transfer field)`)
            console.warn("[v0] ⚠️ is_ramp_transfer field is missing. Please run migration script 003_add_ramp_transfer_flag.sql")
          }
        } else {
          // Different error, return it
          return { 
            success: false, 
            error: `Failed to insert load_plan_items: ${itemsError.message || JSON.stringify(itemsError)}` 
          }
        }
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
