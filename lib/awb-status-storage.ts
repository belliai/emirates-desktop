/**
 * AWB Status Storage
 * 
 * Manages AWB-level loaded/offload status for shift handover tracking.
 * Uses the is_loaded/is_offloaded columns on load_plan_items table.
 * Fallback: localStorage (for offline support)
 */

import { createClient } from "@/lib/supabase/client"

// Type definitions
export type AWBStatusType = 'pending' | 'loaded' | 'offloaded' | 'partial'

export interface AWBStatus {
  id?: string
  serialNumber: number
  awbNumber: string
  sectorIndex: number
  uldSectionIndex: number
  isLoaded: boolean
  loadedBy?: string
  loadedAt?: string
  isOffloaded: boolean
  offloadPieces?: number
  offloadReason?: string
  offloadedBy?: string
  offloadedAt?: string
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
 * Get load plan ID from flight number
 */
async function getLoadPlanId(flightNumber: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("load_plans")
      .select("id")
      .eq("flight_number", flightNumber)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      console.log(`[AWBStatus] No load plan found for ${flightNumber}`)
      return null
    }

    return data.id
  } catch (e) {
    console.error(`[AWBStatus] Error getting load plan ID for ${flightNumber}:`, e)
    return null
  }
}

/**
 * Generate a unique key for an AWB status entry
 */
function getAWBStatusKey(serialNumber: number, sectorIndex: number, uldSectionIndex: number): string {
  return `${serialNumber}-${sectorIndex}-${uldSectionIndex}`
}

/**
 * Get AWB statuses from localStorage (fallback)
 */
function getAWBStatusesFromLocalStorage(flightNumber: string): Map<string, AWBStatus> {
  if (typeof window === 'undefined') return new Map()

  try {
    const stored = localStorage.getItem(`awb-status-${flightNumber}`)
    if (stored) {
      const parsed = JSON.parse(stored) as AWBStatus[]
      const map = new Map<string, AWBStatus>()
      parsed.forEach(status => {
        const key = getAWBStatusKey(status.serialNumber, status.sectorIndex, status.uldSectionIndex)
        map.set(key, status)
      })
      return map
    }
  } catch (e) {
    console.error(`[AWBStatus] Error reading localStorage for ${flightNumber}:`, e)
  }
  return new Map()
}

/**
 * Save AWB statuses to localStorage
 */
function saveAWBStatusesToLocalStorage(flightNumber: string, statuses: Map<string, AWBStatus>): void {
  if (typeof window === 'undefined') return

  try {
    const array = Array.from(statuses.values())
    localStorage.setItem(`awb-status-${flightNumber}`, JSON.stringify(array))
  } catch (e) {
    console.error(`[AWBStatus] Error saving to localStorage for ${flightNumber}:`, e)
  }
}

/**
 * Clear AWB statuses from localStorage
 */
export function clearAWBStatusesFromLocalStorage(flightNumber: string): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(`awb-status-${flightNumber}`)
    console.log(`[AWBStatus] Cleared localStorage for ${flightNumber}`)
  } catch (e) {
    console.error(`[AWBStatus] Error clearing localStorage for ${flightNumber}:`, e)
  }
}

/**
 * Get all AWB statuses for a flight from Supabase (load_plan_items table)
 */
export async function getAWBStatusesFromSupabase(flightNumber: string): Promise<Map<string, AWBStatus>> {
  // Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const loadPlanId = await getLoadPlanId(flightNumber)
      if (!loadPlanId) {
        return getAWBStatusesFromLocalStorage(flightNumber)
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from("load_plan_items")
        .select("*")
        .eq("load_plan_id", loadPlanId)

      // If columns don't exist yet, fall back to localStorage
      if (error && (error.message?.includes("column") || error.code === "42703")) {
        console.log(`[AWBStatus] AWB status columns not found on load_plan_items, using localStorage`)
        return getAWBStatusesFromLocalStorage(flightNumber)
      }

      if (!error && data && data.length > 0) {
        const map = new Map<string, AWBStatus>()
        data.forEach((row: any) => {
          // Only add to map if the item has any status set
          if (row.is_loaded || row.is_offloaded) {
            const key = getAWBStatusKey(row.serial_number, row.sector_index || 0, row.uld_section_index || 0)
            map.set(key, {
              id: row.id,
              serialNumber: row.serial_number,
              awbNumber: row.awb_number,
              sectorIndex: row.sector_index || 0,
              uldSectionIndex: row.uld_section_index || 0,
              isLoaded: row.is_loaded || false,
              loadedBy: row.loaded_by || undefined,
              loadedAt: row.loaded_at || undefined,
              isOffloaded: row.is_offloaded || false,
              offloadPieces: row.offload_pieces || undefined,
              offloadReason: row.offload_reason || undefined,
              offloadedBy: row.offloaded_by || undefined,
              offloadedAt: row.offloaded_at || undefined,
            })
          }
        })

        // Also save to localStorage for offline access
        if (map.size > 0) {
          saveAWBStatusesToLocalStorage(flightNumber, map)
        }
        console.log(`[AWBStatus] Loaded ${map.size} AWB statuses from Supabase for ${flightNumber}`)
        return map
      }
    } catch (e) {
      console.error(`[AWBStatus] Error fetching from Supabase for ${flightNumber}:`, e)
    }
  }

  // Fall back to localStorage
  return getAWBStatusesFromLocalStorage(flightNumber)
}

/**
 * Find the load_plan_item ID for a specific AWB
 */
async function findLoadPlanItemId(
  loadPlanId: string,
  serialNumber: number,
  sectorIndex: number,
  uldSectionIndex: number
): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("load_plan_items")
      .select("id")
      .eq("load_plan_id", loadPlanId)
      .eq("serial_number", serialNumber)
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }
    return data.id
  } catch (e) {
    return null
  }
}

/**
 * Mark an AWB as loaded
 */
export async function markAWBLoaded(
  flightNumber: string,
  serialNumber: number,
  awbNumber: string,
  sectorIndex: number,
  uldSectionIndex: number,
  staffName?: string
): Promise<boolean> {
  const key = getAWBStatusKey(serialNumber, sectorIndex, uldSectionIndex)
  const now = new Date().toISOString()

  // Update localStorage immediately for responsive UI
  const statuses = await getAWBStatusesFromSupabase(flightNumber)
  const existing = statuses.get(key) || {
    serialNumber,
    awbNumber,
    sectorIndex,
    uldSectionIndex,
    isLoaded: false,
    isOffloaded: false,
  }
  
  const updated: AWBStatus = {
    ...existing,
    isLoaded: true,
    loadedBy: staffName,
    loadedAt: now,
  }
  statuses.set(key, updated)
  saveAWBStatusesToLocalStorage(flightNumber, statuses)

  // Sync to Supabase
  if (isSupabaseConfigured()) {
    try {
      const loadPlanId = await getLoadPlanId(flightNumber)
      if (!loadPlanId) {
        console.log(`[AWBStatus] No load plan ID, saved to localStorage only`)
        return true
      }

      const itemId = await findLoadPlanItemId(loadPlanId, serialNumber, sectorIndex, uldSectionIndex)
      if (!itemId) {
        console.log(`[AWBStatus] No load_plan_item found for serial ${serialNumber}, saved to localStorage only`)
        return true
      }

      const supabase = createClient()
      const { error } = await supabase
        .from("load_plan_items")
        .update({
          is_loaded: true,
          loaded_by: staffName || null,
          loaded_at: now,
        })
        .eq("id", itemId)

      if (error && !error.message?.includes("column")) {
        console.error(`[AWBStatus] Error saving loaded status:`, error)
        return false
      }

      console.log(`[AWBStatus] Marked AWB ${awbNumber} as loaded by ${staffName}`)
      return true
    } catch (e) {
      console.error(`[AWBStatus] Error marking AWB loaded:`, e)
      return false
    }
  }

  return true
}

/**
 * Mark an AWB for offload
 */
export async function markAWBOffloaded(
  flightNumber: string,
  serialNumber: number,
  awbNumber: string,
  sectorIndex: number,
  uldSectionIndex: number,
  pieces: number,
  reason: string,
  staffName?: string
): Promise<boolean> {
  const key = getAWBStatusKey(serialNumber, sectorIndex, uldSectionIndex)
  const now = new Date().toISOString()

  // Update localStorage immediately
  const statuses = await getAWBStatusesFromSupabase(flightNumber)
  const existing = statuses.get(key) || {
    serialNumber,
    awbNumber,
    sectorIndex,
    uldSectionIndex,
    isLoaded: false,
    isOffloaded: false,
  }
  
  const updated: AWBStatus = {
    ...existing,
    isOffloaded: true,
    offloadPieces: pieces,
    offloadReason: reason,
    offloadedBy: staffName,
    offloadedAt: now,
  }
  statuses.set(key, updated)
  saveAWBStatusesToLocalStorage(flightNumber, statuses)

  // Sync to Supabase
  if (isSupabaseConfigured()) {
    try {
      const loadPlanId = await getLoadPlanId(flightNumber)
      if (!loadPlanId) {
        console.log(`[AWBStatus] No load plan ID, saved to localStorage only`)
        return true
      }

      const itemId = await findLoadPlanItemId(loadPlanId, serialNumber, sectorIndex, uldSectionIndex)
      if (!itemId) {
        console.log(`[AWBStatus] No load_plan_item found for serial ${serialNumber}, saved to localStorage only`)
        return true
      }

      const supabase = createClient()
      const { error } = await supabase
        .from("load_plan_items")
        .update({
          is_offloaded: true,
          offload_pieces: pieces,
          offload_reason: reason,
          offloaded_by: staffName || null,
          offloaded_at: now,
        })
        .eq("id", itemId)

      if (error && !error.message?.includes("column")) {
        console.error(`[AWBStatus] Error saving offload status:`, error)
        return false
      }

      console.log(`[AWBStatus] Marked AWB ${awbNumber} for offload: ${pieces} pcs - ${reason}`)
      return true
    } catch (e) {
      console.error(`[AWBStatus] Error marking AWB offloaded:`, e)
      return false
    }
  }

  return true
}

/**
 * Bulk mark multiple AWBs as loaded
 */
export async function bulkMarkAWBsLoaded(
  flightNumber: string,
  awbs: Array<{
    serialNumber: number
    awbNumber: string
    sectorIndex: number
    uldSectionIndex: number
  }>,
  staffName?: string
): Promise<boolean> {
  const now = new Date().toISOString()

  // Update localStorage immediately
  const statuses = await getAWBStatusesFromSupabase(flightNumber)
  
  awbs.forEach(awb => {
    const key = getAWBStatusKey(awb.serialNumber, awb.sectorIndex, awb.uldSectionIndex)
    const existing = statuses.get(key) || {
      serialNumber: awb.serialNumber,
      awbNumber: awb.awbNumber,
      sectorIndex: awb.sectorIndex,
      uldSectionIndex: awb.uldSectionIndex,
      isLoaded: false,
      isOffloaded: false,
    }
    
    statuses.set(key, {
      ...existing,
      isLoaded: true,
      loadedBy: staffName,
      loadedAt: now,
    })
  })
  saveAWBStatusesToLocalStorage(flightNumber, statuses)

  // Sync to Supabase - update each item
  if (isSupabaseConfigured()) {
    try {
      const loadPlanId = await getLoadPlanId(flightNumber)
      if (!loadPlanId) {
        console.log(`[AWBStatus] No load plan ID, saved to localStorage only`)
        return true
      }

      const supabase = createClient()
      
      // Update all items with matching serial numbers
      for (const awb of awbs) {
        const itemId = await findLoadPlanItemId(loadPlanId, awb.serialNumber, awb.sectorIndex, awb.uldSectionIndex)
        if (itemId) {
          await supabase
            .from("load_plan_items")
            .update({
              is_loaded: true,
              loaded_by: staffName || null,
              loaded_at: now,
            })
            .eq("id", itemId)
        }
      }

      console.log(`[AWBStatus] Bulk marked ${awbs.length} AWBs as loaded by ${staffName}`)
      return true
    } catch (e) {
      console.error(`[AWBStatus] Error bulk marking AWBs loaded:`, e)
      return false
    }
  }

  return true
}

/**
 * Get count of loaded AWBs for a flight (for progress calculation)
 */
export async function getLoadedAWBCount(flightNumber: string): Promise<number> {
  const statuses = await getAWBStatusesFromSupabase(flightNumber)
  let count = 0
  statuses.forEach(status => {
    if (status.isLoaded) {
      count++
    }
  })
  return count
}

/**
 * Batch fetch loaded AWB counts for multiple flights (optimized for Flights View)
 * Returns a Map of flightNumber -> loadedCount
 */
export async function getBatchLoadedAWBCounts(flightNumbers: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  
  // Initialize all to 0
  flightNumbers.forEach(f => result.set(f, 0))
  
  if (!isSupabaseConfigured()) {
    // Fall back to localStorage for each flight
    flightNumbers.forEach(flightNumber => {
      const statuses = getAWBStatusesFromLocalStorage(flightNumber)
      let count = 0
      statuses.forEach(status => {
        if (status.isLoaded) count++
      })
      result.set(flightNumber, count)
    })
    return result
  }

  try {
    const supabase = createClient()
    
    // Single query to get all load plans for these flight numbers
    const { data: loadPlans, error: loadPlansError } = await supabase
      .from("load_plans")
      .select("id, flight_number")
      .in("flight_number", flightNumbers)
    
    if (loadPlansError || !loadPlans || loadPlans.length === 0) {
      console.log(`[AWBStatus] No load plans found for batch query`)
      return result
    }
    
    // Create a map of load_plan_id -> flight_number
    const loadPlanIdToFlight = new Map<string, string>()
    const loadPlanIds: string[] = []
    loadPlans.forEach((lp: any) => {
      loadPlanIdToFlight.set(lp.id, lp.flight_number)
      loadPlanIds.push(lp.id)
    })
    
    // Single query to get all loaded AWB counts
    const { data: items, error: itemsError } = await supabase
      .from("load_plan_items")
      .select("load_plan_id, is_loaded")
      .in("load_plan_id", loadPlanIds)
      .eq("is_loaded", true)
    
    if (itemsError) {
      console.log(`[AWBStatus] Error fetching batch AWB counts:`, itemsError)
      return result
    }
    
    if (items && items.length > 0) {
      // Count loaded items per flight
      items.forEach((item: any) => {
        const flightNumber = loadPlanIdToFlight.get(item.load_plan_id)
        if (flightNumber) {
          result.set(flightNumber, (result.get(flightNumber) || 0) + 1)
        }
      })
    }
    
    console.log(`[AWBStatus] Batch loaded ${items?.length || 0} AWB statuses for ${flightNumbers.length} flights`)
    return result
  } catch (e) {
    console.error(`[AWBStatus] Error in batch fetch:`, e)
    return result
  }
}

/**
 * Get count of total AWBs with any status tracked (loaded or offloaded)
 */
export async function getAWBStatusCounts(flightNumber: string): Promise<{
  loaded: number
  offloaded: number
  total: number
}> {
  const statuses = await getAWBStatusesFromSupabase(flightNumber)
  let loaded = 0
  let offloaded = 0
  
  statuses.forEach(status => {
    if (status.isLoaded) loaded++
    if (status.isOffloaded) offloaded++
  })
  
  return {
    loaded,
    offloaded,
    total: statuses.size
  }
}
