/**
 * Utility functions for managing ULD entries with checked state
 * Primary storage: Supabase (synced across devices)
 * Fallback: localStorage (for offline support and caching)
 */

import { createClient } from "@/lib/supabase/client"
import type { ULDEntry } from "@/components/uld-number-modal"
import { parseULDSection } from "./uld-parser"

// Type for database row
interface ULDEntryRow {
  id: string
  load_plan_id: string
  flight_number: string
  sector_index: number
  uld_section_index: number
  entry_index: number
  uld_type: string
  uld_number: string | null
  is_checked: boolean
  work_type: 'BUILT' | 'THRU' | null
  checked_by: string | null
  checked_at: string | null
  created_at: string
  updated_at: string
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
 * Get load_plan_id from flight_number
 * Returns the most recent load plan ID for the given flight
 */
async function getLoadPlanId(flightNumber: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("load_plans")
      .select("id")
      .eq("flight_number", flightNumber)
      .order("flight_date", { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data) {
      console.warn(`[ULDStorage] Could not find load_plan_id for ${flightNumber}:`, error?.message)
      return null
    }
    
    return data.id
  } catch (e) {
    console.error(`[ULDStorage] Error getting load_plan_id for ${flightNumber}:`, e)
    return null
  }
}

/**
 * Get ULD entries from Supabase for a specific flight
 * Falls back to localStorage if Supabase is not available
 */
export async function getULDEntriesFromSupabase(
  flightNumber: string,
  loadPlanSectors?: Array<{ uldSections: Array<{ uld: string }> }>
): Promise<Map<string, ULDEntry[]>> {
  // First try to get from Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const loadPlanId = await getLoadPlanId(flightNumber)
      
      if (loadPlanId) {
        const { data, error } = await supabase
          .from("uld_entries")
          .select("*")
          .eq("load_plan_id", loadPlanId)
          .order("sector_index", { ascending: true })
          .order("uld_section_index", { ascending: true })
          .order("entry_index", { ascending: true })
        
        // If table doesn't exist, fall back to localStorage silently
        if (error && (error.message?.includes("relation") || error.code === "42P01")) {
          console.log(`[ULDStorage] uld_entries table not found, using localStorage fallback`)
          return getULDEntriesFromLocalStorage(flightNumber, loadPlanSectors)
        }
        
        if (!error && data && data.length > 0) {
          const entriesMap = new Map<string, ULDEntry[]>()
          
          // Group by sector-uldSection key
          data.forEach((row: ULDEntryRow) => {
            const key = `${row.sector_index}-${row.uld_section_index}`
            if (!entriesMap.has(key)) {
              entriesMap.set(key, [])
            }
            entriesMap.get(key)!.push({
              number: row.uld_number || "",
              checked: row.is_checked,
              type: row.uld_type,
              workType: row.work_type || null
            })
          })
          
          console.log(`[ULDStorage] Loaded ${data.length} ULD entries from Supabase for ${flightNumber}`)
          
          // Also update localStorage cache
          saveULDEntriesToLocalStorage(flightNumber, entriesMap)
          
          return entriesMap
        }
      }
    } catch (e) {
      console.error(`[ULDStorage] Error fetching from Supabase for ${flightNumber}:`, e)
    }
  }
  
  // Fall back to localStorage
  return getULDEntriesFromLocalStorage(flightNumber, loadPlanSectors)
}

/**
 * Get ULD entries from localStorage (legacy/fallback)
 */
export function getULDEntriesFromStorage(
  flightNumber: string,
  loadPlanSectors?: Array<{ uldSections: Array<{ uld: string }> }>
): Map<string, ULDEntry[]> {
  return getULDEntriesFromLocalStorage(flightNumber, loadPlanSectors)
}

/**
 * Get ULD entries from localStorage only
 */
function getULDEntriesFromLocalStorage(
  flightNumber: string,
  loadPlanSectors?: Array<{ uldSections: Array<{ uld: string }> }>
): Map<string, ULDEntry[]> {
  if (typeof window === 'undefined') {
    return new Map()
  }

  try {
    const stored = localStorage.getItem(`uld-numbers-${flightNumber}`)
    if (!stored) {
      return new Map()
    }

    const parsed = JSON.parse(stored)
    const entriesMap = new Map<string, ULDEntry[]>()

    Object.entries(parsed).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Check if it's new format (ULDEntry[]) or old format (string[])
        if (value.length > 0 && typeof value[0] === 'object' && 'checked' in value[0]) {
          // New format: ULDEntry[] - preserve checked state
          entriesMap.set(key, value as ULDEntry[])
        } else if (loadPlanSectors) {
          // Old format: string[] - convert to ULDEntry[] with checked inferred from number presence
          const numbers = value as string[]
          const [sectorIndexStr, uldSectionIndexStr] = key.split('-')
          const sectorIndex = parseInt(sectorIndexStr, 10)
          const uldSectionIndex = parseInt(uldSectionIndexStr, 10)
          const sector = loadPlanSectors[sectorIndex]
          const uldSection = sector?.uldSections[uldSectionIndex]
          const { expandedTypes } = parseULDSection(uldSection?.uld || "")

          const entries: ULDEntry[] = numbers.map((number, index) => ({
            number: number || "",
            checked: number.trim() !== "", // Legacy: checked if number is filled
            type: expandedTypes[index] || "PMC"
          }))
          entriesMap.set(key, entries)
        }
      }
    })

    return entriesMap
  } catch (e) {
    console.error(`[ULDStorage] Error reading ULD entries from localStorage for ${flightNumber}:`, e)
    return new Map()
  }
}

/**
 * Save ULD entries to localStorage only (for caching)
 */
function saveULDEntriesToLocalStorage(
  flightNumber: string,
  entries: Map<string, ULDEntry[]>
): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const toStore = Object.fromEntries(entries)
    localStorage.setItem(`uld-numbers-${flightNumber}`, JSON.stringify(toStore))
  } catch (e) {
    console.error(`[ULDStorage] Error saving ULD entries to localStorage for ${flightNumber}:`, e)
  }
}

/**
 * Clear ULD entries from localStorage for a flight
 * Should be called when a load plan is deleted or before re-uploading
 */
export function clearULDEntriesFromLocalStorage(flightNumber: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(`uld-numbers-${flightNumber}`)
    console.log(`[ULDStorage] Cleared localStorage for ${flightNumber}`)
  } catch (e) {
    console.error(`[ULDStorage] Error clearing localStorage for ${flightNumber}:`, e)
  }
}

/**
 * Save ULD entries to Supabase and localStorage
 * Primary storage: Supabase, Fallback: localStorage
 */
export async function saveULDEntriesToSupabase(
  flightNumber: string,
  sectorIndex: number,
  uldSectionIndex: number,
  entries: ULDEntry[],
  checkedBy?: string
): Promise<boolean> {
  const key = `${sectorIndex}-${uldSectionIndex}`
  
  console.log(`[ULDStorage] saveULDEntriesToSupabase called:`, {
    flightNumber,
    sectorIndex,
    uldSectionIndex,
    entriesCount: entries.length,
    entries: entries.map(e => ({ type: e.type, number: e.number, checked: e.checked }))
  })
  
  // Always save to localStorage first (immediate feedback)
  const existingEntries = getULDEntriesFromLocalStorage(flightNumber)
  existingEntries.set(key, entries)
  saveULDEntriesToLocalStorage(flightNumber, existingEntries)
  
  // Then sync to Supabase if configured
  if (!isSupabaseConfigured()) {
    console.log(`[ULDStorage] Supabase not configured, saved to localStorage only for ${flightNumber}`)
    return true
  }
  
  console.log(`[ULDStorage] Supabase is configured, attempting to save to database...`)
  
  try {
    const supabase = createClient()
    const loadPlanId = await getLoadPlanId(flightNumber)
    
    console.log(`[ULDStorage] Got loadPlanId:`, loadPlanId)
    
    if (!loadPlanId) {
      console.warn(`[ULDStorage] No load_plan_id found for ${flightNumber}, saving to localStorage only`)
      return true
    }
    
    // First, delete any entries with entry_index >= entries.length
    // This handles the case where user reduces the number of ULDs (e.g., deletes one)
    if (entries.length >= 0) {
      const { error: deleteError } = await supabase
        .from("uld_entries")
        .delete()
        .eq("load_plan_id", loadPlanId)
        .eq("sector_index", sectorIndex)
        .eq("uld_section_index", uldSectionIndex)
        .gte("entry_index", entries.length)
      
      if (deleteError) {
        console.warn(`[ULDStorage] Error deleting old entries:`, deleteError.message)
      } else {
        console.log(`[ULDStorage] Deleted entries with index >= ${entries.length}`)
      }
    }
    
    // Use upsert to insert or update entries
    if (entries.length > 0) {
      const now = new Date().toISOString()
      const rowsToUpsert = entries.map((entry, index) => ({
        load_plan_id: loadPlanId,
        flight_number: flightNumber,
        sector_index: sectorIndex,
        uld_section_index: uldSectionIndex,
        entry_index: index,
        uld_type: entry.type,
        uld_number: entry.number || null,
        is_checked: entry.checked,
        work_type: entry.workType || null,
        checked_by: entry.checked ? checkedBy || null : null,
        checked_at: entry.checked ? now : null
      }))
      
      console.log(`[ULDStorage] Attempting to upsert ${rowsToUpsert.length} rows`)
      
      let { data: upsertData, error: upsertError } = await supabase
        .from("uld_entries")
        .upsert(rowsToUpsert, {
          onConflict: "load_plan_id,sector_index,uld_section_index,entry_index"
        })
        .select()
      
      // If table doesn't exist, just use localStorage (table will be created later)
      if (upsertError && (upsertError.message?.includes("relation") || upsertError.code === "42P01")) {
        console.log(`[ULDStorage] uld_entries table not found, using localStorage only`)
        return true
      }
      
      // If work_type column not in schema cache, retry without it
      if (upsertError && (upsertError.message?.includes("work_type") || upsertError.message?.includes("schema cache"))) {
        console.warn(`[ULDStorage] work_type column not in schema cache, retrying without it...`)
        const rowsWithoutWorkType = entries.map((entry, index) => ({
          load_plan_id: loadPlanId,
          flight_number: flightNumber,
          sector_index: sectorIndex,
          uld_section_index: uldSectionIndex,
          entry_index: index,
          uld_type: entry.type,
          uld_number: entry.number || null,
          is_checked: entry.checked,
          checked_by: entry.checked ? checkedBy || null : null,
          checked_at: entry.checked ? now : null
        }))
        
        const retryResult = await supabase
          .from("uld_entries")
          .upsert(rowsWithoutWorkType, {
            onConflict: "load_plan_id,sector_index,uld_section_index,entry_index"
          })
          .select()
        
        upsertData = retryResult.data
        upsertError = retryResult.error
        
        if (!upsertError) {
          console.log(`[ULDStorage] ✅ Saved (without work_type) ${upsertData?.length || entries.length} ULD entries for ${flightNumber} [${key}]`)
          return true
        }
      }
      
      if (upsertError) {
        // Log full error object for debugging
        console.error(`[ULDStorage] Error upserting entries to Supabase:`, JSON.stringify(upsertError, null, 2))
        console.error(`[ULDStorage] Error details:`, {
          message: upsertError.message || 'No message',
          code: upsertError.code || 'No code',
          details: upsertError.details || 'No details',
          hint: upsertError.hint || 'No hint'
        })
        return false
      }
      
      console.log(`[ULDStorage] ✅ Saved ${upsertData?.length || entries.length} ULD entries to Supabase for ${flightNumber} [${key}]`)
    }
    
    return true
  } catch (e) {
    console.error(`[ULDStorage] Error saving to Supabase for ${flightNumber}:`, e)
    return false
  }
}

/**
 * Save ULD entries to localStorage (legacy function - also triggers Supabase sync)
 */
export function saveULDEntriesToStorage(
  flightNumber: string,
  entries: Map<string, ULDEntry[]>
): void {
  // Save to localStorage immediately
  saveULDEntriesToLocalStorage(flightNumber, entries)
  
  // Sync each section to Supabase in background
  if (isSupabaseConfigured()) {
    entries.forEach((entryList, key) => {
      const [sectorIndexStr, uldSectionIndexStr] = key.split('-')
      const sectorIndex = parseInt(sectorIndexStr, 10)
      const uldSectionIndex = parseInt(uldSectionIndexStr, 10)
      
      // Fire and forget - don't wait for Supabase
      saveULDEntriesToSupabase(flightNumber, sectorIndex, uldSectionIndex, entryList)
        .catch(e => console.error(`[ULDStorage] Background sync failed for ${flightNumber} [${key}]:`, e))
    })
  }
}

/**
 * Delete ULD entries for a specific section (Desktop only)
 */
export async function deleteULDEntriesFromSupabase(
  flightNumber: string,
  sectorIndex: number,
  uldSectionIndex: number
): Promise<boolean> {
  // Remove from localStorage
  const existingEntries = getULDEntriesFromLocalStorage(flightNumber)
  const key = `${sectorIndex}-${uldSectionIndex}`
  existingEntries.delete(key)
  saveULDEntriesToLocalStorage(flightNumber, existingEntries)
  
  if (!isSupabaseConfigured()) {
    return true
  }
  
  try {
    const supabase = createClient()
    const loadPlanId = await getLoadPlanId(flightNumber)
    
    if (!loadPlanId) {
      return true
    }
    
    const { error } = await supabase
      .from("uld_entries")
      .delete()
      .eq("load_plan_id", loadPlanId)
      .eq("sector_index", sectorIndex)
      .eq("uld_section_index", uldSectionIndex)
    
    if (error) {
      console.error(`[ULDStorage] Error deleting entries from Supabase:`, error)
      return false
    }
    
    console.log(`[ULDStorage] Deleted ULD entries from Supabase for ${flightNumber} [${key}]`)
    return true
  } catch (e) {
    console.error(`[ULDStorage] Error deleting from Supabase for ${flightNumber}:`, e)
    return false
  }
}

/**
 * Get all checked ULD entries for a flight
 * Useful for progress calculations and reporting
 */
export function getCheckedULDEntries(
  flightNumber: string,
  loadPlanSectors?: Array<{ uldSections: Array<{ uld: string }> }>
): Array<{ key: string; entry: ULDEntry }> {
  const entriesMap = getULDEntriesFromLocalStorage(flightNumber, loadPlanSectors)
  const checkedEntries: Array<{ key: string; entry: ULDEntry }> = []

  entriesMap.forEach((entries, key) => {
    entries.forEach((entry) => {
      if (entry.checked) {
        checkedEntries.push({ key, entry })
      }
    })
  })

  return checkedEntries
}

/**
 * Get count of checked ULDs for a flight
 */
export function getCheckedULDCount(
  flightNumber: string,
  loadPlanSectors?: Array<{ uldSections: Array<{ uld: string }> }>
): number {
  return getCheckedULDEntries(flightNumber, loadPlanSectors).length
}

/**
 * Sync all localStorage ULD entries to Supabase
 * Useful for initial migration or reconnection after offline period
 */
export async function syncLocalStorageToSupabase(
  flightNumber: string,
  loadPlanSectors?: Array<{ uldSections: Array<{ uld: string }> }>,
  checkedBy?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    console.log(`[ULDStorage] Supabase not configured, skipping sync for ${flightNumber}`)
    return false
  }
  
  const entries = getULDEntriesFromLocalStorage(flightNumber, loadPlanSectors)
  
  if (entries.size === 0) {
    console.log(`[ULDStorage] No localStorage entries to sync for ${flightNumber}`)
    return true
  }
  
  console.log(`[ULDStorage] Syncing ${entries.size} sections from localStorage to Supabase for ${flightNumber}`)
  
  let success = true
  for (const [key, entryList] of entries) {
    const [sectorIndexStr, uldSectionIndexStr] = key.split('-')
    const sectorIndex = parseInt(sectorIndexStr, 10)
    const uldSectionIndex = parseInt(uldSectionIndexStr, 10)
    
    const result = await saveULDEntriesToSupabase(flightNumber, sectorIndex, uldSectionIndex, entryList, checkedBy)
    if (!result) {
      success = false
    }
  }
  
  return success
}
