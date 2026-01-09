/**
 * BCR (Build-up Completion Report) Storage
 * 
 * Saves and loads BCR data from the load_plans table in Supabase.
 */

import { createClient } from "@/lib/supabase/client"

export interface BCRSubmission {
  flightNumber: string
  handoverFrom: string
  loadersName: string
  buildupStaff: string
  supervisor: string
  partiallyActioned: boolean
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
      .select("bcr_sent_at, bcr_sent_by, bcr_handover_from, bcr_loaders_name, bcr_buildup_staff, bcr_supervisor, bcr_partially_actioned, bcr_volume_differences, bcr_units_unable_update")
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

/**
 * Get all submitted BCRs for display in BCR list
 */
export async function getAllSubmittedBCRs(): Promise<Array<{
  flightNumber: string
  flightDate: string
  acftType: string
  sentBy: string
  sentAt: string
}>> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("load_plans")
      .select("flight_number, flight_date, aircraft_type, bcr_sent_by, bcr_sent_at")
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
      sentBy: row.bcr_sent_by || "",
      sentAt: row.bcr_sent_at,
    }))
  } catch (e) {
    console.error(`[BCR] Exception fetching submitted BCRs:`, e)
    return []
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

