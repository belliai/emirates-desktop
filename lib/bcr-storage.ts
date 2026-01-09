/**
 * BCR (Build-up Completion Report) Storage
 * 
 * Saves and loads BCR data from the load_plans table in Supabase.
 */

import { createClient } from "@/lib/supabase/client"

export interface BCRShipment {
  srNo: string
  awb: string
  pcs: string
  location: string
  reason: string
  locationChecked: string
  remarks: string
}

export interface BCRSubmission {
  flightNumber: string
  handoverFrom: string
  loadersName: string
  buildupStaff: string
  supervisor: string
  partiallyActioned: boolean
  shipments: BCRShipment[]
  volumeDifferences: Array<{
    awb: string
    declaredVolume: string
    loadableVolume: string
    remarks: string
  }>
  unitsUnableToUpdate: Array<{
    uld: string
    reason: string
  }>
  sentBy: string
}

export interface BCRData {
  bcrSentAt: string | null
  bcrSentBy: string | null
  bcrHandoverFrom: string | null
  bcrLoadersName: string | null
  bcrBuildupStaff: string | null
  bcrSupervisor: string | null
  bcrPartiallyActioned: boolean | null
  bcrShipments: BCRShipment[] | null
  bcrVolumeDifferences: any[] | null
  bcrUnitsUnableUpdate: any[] | null
}

/**
 * Check if Supabase is properly configured
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
 * Submit BCR to Supabase
 */
export async function submitBCR(submission: BCRSubmission): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    console.log(`[BCR] Supabase not configured`)
    return { success: false, error: "Supabase not configured" }
  }

  try {
    const supabase = createClient()
    const now = new Date().toISOString()

    // Update the load_plan with BCR data
    const { error } = await supabase
      .from("load_plans")
      .update({
        bcr_sent_at: now,
        bcr_sent_by: submission.sentBy || null,
        bcr_handover_from: submission.handoverFrom || null,
        bcr_loaders_name: submission.loadersName || null,
        bcr_buildup_staff: submission.buildupStaff || null,
        bcr_supervisor: submission.supervisor || null,
        bcr_partially_actioned: submission.partiallyActioned,
        bcr_shipments: submission.shipments.length > 0 ? submission.shipments : null,
        bcr_volume_differences: submission.volumeDifferences.length > 0 ? submission.volumeDifferences : null,
        bcr_units_unable_update: submission.unitsUnableToUpdate.length > 0 ? submission.unitsUnableToUpdate : null,
      })
      .eq("flight_number", submission.flightNumber)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error(`[BCR] Error submitting BCR:`, error)
      return { success: false, error: error.message }
    }

    console.log(`[BCR] Successfully submitted BCR for ${submission.flightNumber}`)
    return { success: true }
  } catch (e) {
    console.error(`[BCR] Exception submitting BCR:`, e)
    return { success: false, error: String(e) }
  }
}

/**
 * Get BCR data for a flight
 */
export async function getBCRData(flightNumber: string): Promise<BCRData | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("load_plans")
      .select("bcr_sent_at, bcr_sent_by, bcr_handover_from, bcr_loaders_name, bcr_buildup_staff, bcr_supervisor, bcr_partially_actioned, bcr_shipments, bcr_volume_differences, bcr_units_unable_update")
      .eq("flight_number", flightNumber)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return {
      bcrSentAt: data.bcr_sent_at,
      bcrSentBy: data.bcr_sent_by,
      bcrHandoverFrom: data.bcr_handover_from,
      bcrLoadersName: data.bcr_loaders_name,
      bcrBuildupStaff: data.bcr_buildup_staff,
      bcrSupervisor: data.bcr_supervisor,
      bcrPartiallyActioned: data.bcr_partially_actioned,
      bcrShipments: data.bcr_shipments,
      bcrVolumeDifferences: data.bcr_volume_differences,
      bcrUnitsUnableUpdate: data.bcr_units_unable_update,
    }
  } catch (e) {
    console.error(`[BCR] Error fetching BCR data:`, e)
    return null
  }
}

/**
 * Check if BCR has been submitted for a flight
 */
export async function isBCRSubmitted(flightNumber: string): Promise<boolean> {
  const bcrData = await getBCRData(flightNumber)
  return bcrData?.bcrSentAt !== null && bcrData?.bcrSentAt !== undefined
}

export interface SubmittedBCR {
  flightNumber: string
  flightDate: string
  acftType: string
  destination: string
  sentBy: string
  sentAt: string
  shipments: BCRShipment[] | null
  volumeDifferences: any[] | null
  unitsUnableToUpdate: any[] | null
  handoverFrom: string | null
  loadersName: string | null
  buildupStaff: string | null
  supervisor: string | null
  partiallyActioned: boolean | null
}

/**
 * Get all submitted BCRs for display in BCR list
 */
export async function getAllSubmittedBCRs(): Promise<SubmittedBCR[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("load_plans")
      .select("flight_number, flight_date, aircraft_type, route_destination, bcr_sent_by, bcr_sent_at, bcr_shipments, bcr_volume_differences, bcr_units_unable_update, bcr_handover_from, bcr_loaders_name, bcr_buildup_staff, bcr_supervisor, bcr_partially_actioned")
      .not("bcr_sent_at", "is", null)
      .order("bcr_sent_at", { ascending: false })

    if (error || !data) {
      console.error(`[BCR] Error fetching submitted BCRs:`, error)
      return []
    }

    return data.map((row: any) => ({
      flightNumber: row.flight_number,
      flightDate: row.flight_date,
      acftType: row.aircraft_type || "",
      destination: row.route_destination || "",
      sentBy: row.bcr_sent_by || "",
      sentAt: row.bcr_sent_at,
      shipments: row.bcr_shipments || null,
      volumeDifferences: row.bcr_volume_differences || null,
      unitsUnableToUpdate: row.bcr_units_unable_update || null,
      handoverFrom: row.bcr_handover_from || null,
      loadersName: row.bcr_loaders_name || null,
      buildupStaff: row.bcr_buildup_staff || null,
      supervisor: row.bcr_supervisor || null,
      partiallyActioned: row.bcr_partially_actioned || null,
    }))
  } catch (e) {
    console.error(`[BCR] Exception fetching submitted BCRs:`, e)
    return []
  }
}

/**
 * Update an existing submitted BCR
 */
export async function updateBCR(submission: BCRSubmission): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    console.log(`[BCR] Supabase not configured`)
    return { success: false, error: "Supabase not configured" }
  }

  try {
    const supabase = createClient()

    // Update the load_plan with BCR data (keep the original bcr_sent_at)
    const { error } = await supabase
      .from("load_plans")
      .update({
        bcr_sent_by: submission.sentBy || null,
        bcr_handover_from: submission.handoverFrom || null,
        bcr_loaders_name: submission.loadersName || null,
        bcr_buildup_staff: submission.buildupStaff || null,
        bcr_supervisor: submission.supervisor || null,
        bcr_partially_actioned: submission.partiallyActioned,
        bcr_shipments: submission.shipments.length > 0 ? submission.shipments : null,
        bcr_volume_differences: submission.volumeDifferences.length > 0 ? submission.volumeDifferences : null,
        bcr_units_unable_update: submission.unitsUnableToUpdate.length > 0 ? submission.unitsUnableToUpdate : null,
      })
      .eq("flight_number", submission.flightNumber)
      .not("bcr_sent_at", "is", null)

    if (error) {
      console.error(`[BCR] Error updating BCR:`, error)
      return { success: false, error: error.message }
    }

    console.log(`[BCR] Successfully updated BCR for ${submission.flightNumber}`)
    return { success: true }
  } catch (e) {
    console.error(`[BCR] Exception updating BCR:`, e)
    return { success: false, error: String(e) }
  }
}

/**
 * Get the currently assigned staff name for a flight (for build-up staff auto-population)
 * Also fetches handover info for "Handover taken from" field
 */
export async function getAssignedStaffForFlight(flightNumber: string): Promise<{ buildupStaff: string | null; handoverFrom: string | null }> {
  console.log(`[BCR] getAssignedStaffForFlight called for: ${flightNumber}`)
  
  if (!isSupabaseConfigured()) {
    console.log(`[BCR] Supabase not configured`)
    return { buildupStaff: null, handoverFrom: null }
  }

  try {
    const supabase = createClient()
    
    // Get the load plan with assigned_to and handed_over_by
    const { data: loadPlan, error: loadPlanError } = await supabase
      .from("load_plans")
      .select("assigned_to, handed_over_by")
      .eq("flight_number", flightNumber)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    console.log(`[BCR] Load plan query result:`, { loadPlan, loadPlanError })

    let buildupStaff: string | null = null
    let handoverFrom: string | null = null

    // Get current assignee name (build-up staff)
    if (loadPlan?.assigned_to) {
      console.log(`[BCR] Found assigned_to: ${loadPlan.assigned_to}`)
      const { data: staff, error: staffError } = await supabase
        .from("buildup_staff_list")
        .select("name")
        .eq("staff_no", loadPlan.assigned_to)
        .single()

      console.log(`[BCR] Build-up staff query result:`, { staff, staffError })

      if (staff?.name) {
        const nameParts = staff.name.split(",") || []
        const firstNamePart = nameParts[1]?.trim().split(/\s+/)[0] || staff.name || ""
        buildupStaff = firstNamePart.charAt(0).toUpperCase() + firstNamePart.slice(1).toLowerCase()
        console.log(`[BCR] Build-up staff for ${flightNumber}: ${buildupStaff}`)
      }
    }

    // Get handover from person's name
    if (loadPlan?.handed_over_by) {
      console.log(`[BCR] Found handed_over_by: ${loadPlan.handed_over_by}`)
      const { data: handoverStaff, error: handoverError } = await supabase
        .from("buildup_staff_list")
        .select("name")
        .eq("staff_no", loadPlan.handed_over_by)
        .single()

      console.log(`[BCR] Handover staff query result:`, { handoverStaff, handoverError })

      if (handoverStaff?.name) {
        const nameParts = handoverStaff.name.split(",") || []
        const firstNamePart = nameParts[1]?.trim().split(/\s+/)[0] || handoverStaff.name || ""
        handoverFrom = firstNamePart.charAt(0).toUpperCase() + firstNamePart.slice(1).toLowerCase()
        console.log(`[BCR] Handover from for ${flightNumber}: ${handoverFrom}`)
      }
    }

    return { buildupStaff, handoverFrom }
  } catch (e) {
    console.error(`[BCR] Error fetching assigned staff:`, e)
    return { buildupStaff: null, handoverFrom: null }
  }
}

/**
 * Batch check BCR submission status for multiple flights
 */
export async function getBatchBCRStatus(flightNumbers: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>()
  flightNumbers.forEach(f => result.set(f, false))

  if (!isSupabaseConfigured() || flightNumbers.length === 0) {
    return result
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("load_plans")
      .select("flight_number, bcr_sent_at")
      .in("flight_number", flightNumbers)

    if (error || !data) {
      return result
    }

    data.forEach((row: any) => {
      if (row.bcr_sent_at) {
        result.set(row.flight_number, true)
      }
    })

    console.log(`[BCR] Batch checked BCR status for ${flightNumbers.length} flights`)
    return result
  } catch (e) {
    console.error(`[BCR] Error in batch BCR check:`, e)
    return result
  }
}

/**
 * Batch fetch staff info (name, contact) for multiple flights
 * Returns a map of flight_number -> { name, contact }
 */
export async function getBatchStaffInfo(
  flightNumbers: string[]
): Promise<Map<string, { name: string; contact: string }>> {
  const result = new Map<string, { name: string; contact: string }>()
  flightNumbers.forEach(f => result.set(f, { name: "Unassigned", contact: "-" }))

  if (!isSupabaseConfigured() || flightNumbers.length === 0) {
    return result
  }

  try {
    const supabase = createClient()
    
    // First, get assigned_to for all flights
    const { data: loadPlans, error: lpError } = await supabase
      .from("load_plans")
      .select("flight_number, assigned_to")
      .in("flight_number", flightNumbers)

    if (lpError || !loadPlans) {
      console.error("[BCR] Error fetching flight assignments:", lpError?.message)
      return result
    }

    // Collect unique staff_no values
    const staffNos = new Set<number>()
    loadPlans.forEach((lp: any) => {
      if (lp.assigned_to) {
        staffNos.add(lp.assigned_to)
      }
    })

    if (staffNos.size === 0) {
      console.log("[BCR] No staff assigned to any flights")
      return result
    }

    // Fetch staff details for all assigned staff
    // Note: buildup_staff_list table doesn't have mobile/contact column
    const { data: staffList, error: staffError } = await supabase
      .from("buildup_staff_list")
      .select("staff_no, name")
      .in("staff_no", Array.from(staffNos))

    if (staffError || !staffList) {
      console.error("[BCR] Error fetching staff details:", staffError?.message)
      return result
    }

    // Create a map of staff_no -> staff info
    const staffMap = new Map<number, { name: string; contact: string }>()
    staffList.forEach((staff: any) => {
      staffMap.set(staff.staff_no, {
        name: staff.name || "Unknown",
        contact: "-" // Contact column not available in buildup_staff_list
      })
    })

    // Map flight_number -> staff info
    loadPlans.forEach((lp: any) => {
      if (lp.assigned_to && staffMap.has(lp.assigned_to)) {
        result.set(lp.flight_number, staffMap.get(lp.assigned_to)!)
      }
    })

    console.log(`[BCR] Fetched staff info for ${result.size} flights`)
    return result
  } catch (e) {
    console.error(`[BCR] Error in batch staff fetch:`, e)
    return result
  }
}

