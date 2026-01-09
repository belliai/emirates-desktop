/**
 * Load Plan Review - Compare and Review Changes Before Saving
 * 
 * This module implements Option B: In-Memory comparison
 * - Parse uploaded file
 * - Compare with existing data in database
 * - Show diff to user for review
 * - User decides to accept or discard changes
 */

import { createClient } from "@/lib/supabase/client"
import type { LoadPlanHeader, Shipment } from "./types"

// Types for the diff/comparison result
export interface FieldChange {
  field: string
  oldValue: string | number | null
  newValue: string | number | null
}

export interface ItemDiff {
  serialNumber: number
  awbNumber: string
  changeType: 'added' | 'modified' | 'deleted'
  fieldChanges?: FieldChange[]
  // For display
  oldData?: Record<string, any>
  newData?: Record<string, any>
}

export interface LoadPlanDiff {
  // Flight identification
  flightNumber: string
  flightDate: string
  
  // Is this a new load plan or update to existing?
  isNewLoadPlan: boolean
  existingLoadPlanId: string | null
  existingRevision: number
  newRevision: number
  
  // Summary counts
  addedCount: number
  modifiedCount: number
  deletedCount: number
  unchangedCount: number
  
  // Detailed changes
  addedItems: ItemDiff[]
  modifiedItems: ItemDiff[]
  deletedItems: ItemDiff[]
  
  // Has any changes at all?
  hasChanges: boolean
  
  // Original parsed data (needed for apply step)
  parsedResults: any
  parsedShipments: Shipment[]
  
  // Header changes (if any)
  headerChanges?: FieldChange[]
}

export interface CompareLoadPlanParams {
  results: {
    header: LoadPlanHeader
    [key: string]: any
  }
  shipments: Shipment[]
}

// Helper function to parse date string
function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date()
  
  const months: Record<string, number> = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  }
  
  const match = dateStr.match(/(\d{1,2})\s*[-]?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s*[-]?\s*(\d{4}))?/i)
  if (match) {
    const day = parseInt(match[1], 10)
    const month = months[match[2].toLowerCase()]
    const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear()
    return new Date(year, month, day)
  }
  
  return new Date()
}

// Helper functions for creating keys
// REVISED mode: Match by AWB number only (items can be renumbered)
// ADDITIONAL mode: Match by serial_number + awb_number
function normalizeAwb(awbNo: string | null): string {
  return awbNo ? awbNo.replace(/\s+/g, "").trim() : ""
}

function createItemKeyBySerialAwb(serialNo: number | null, awbNo: string | null): string | null {
  if (serialNo === null || serialNo === undefined || isNaN(serialNo)) return null
  return `${serialNo}_${normalizeAwb(awbNo)}`
}

function createItemKeyByAwbOnly(awbNo: string | null): string | null {
  const normalized = normalizeAwb(awbNo)
  return normalized || null
}

// Helper function to format ULD
function formatULD(uld: string | null | undefined): string | null {
  if (!uld || !uld.trim()) return null
  
  let formatted = uld.trim()
  
  // Add space after "XX" at the start if not already present
  if (formatted.startsWith("XX") && formatted.length > 2 && formatted[2] !== " ") {
    formatted = "XX " + formatted.substring(2)
  }
  
  // Add space before "XX" at the end if not already present
  if (formatted.endsWith("XX") && formatted.length > 2 && formatted[formatted.length - 3] !== " ") {
    formatted = formatted.substring(0, formatted.length - 2) + " XX"
  }
  
  return formatted
}

// Compare individual fields between existing item and new shipment
function compareItemFields(existingItem: any, shipment: Shipment): FieldChange[] {
  const changes: FieldChange[] = []
  
  const fieldMappings: Array<{ dbField: string; shipmentField: keyof Shipment; label: string }> = [
    { dbField: 'serial_number', shipmentField: 'serialNo', label: 'Serial Number' }, // Added for REVISED mode
    { dbField: 'origin_destination', shipmentField: 'origin', label: 'Origin/Destination' },
    { dbField: 'pieces', shipmentField: 'pieces', label: 'Pieces' },
    { dbField: 'weight', shipmentField: 'weight', label: 'Weight' },
    { dbField: 'volume', shipmentField: 'volume', label: 'Volume' },
    { dbField: 'load_volume', shipmentField: 'lvol', label: 'Load Volume' },
    { dbField: 'special_handling_code', shipmentField: 'shc', label: 'SHC' },
    { dbField: 'manual_description', shipmentField: 'manDesc', label: 'Description' },
    { dbField: 'uld_allocation', shipmentField: 'uld', label: 'ULD' },
    { dbField: 'sector', shipmentField: 'sector', label: 'Sector' },
    { dbField: 'booking_status', shipmentField: 'bs', label: 'Booking Status' },
    { dbField: 'priority_indicator', shipmentField: 'pi', label: 'Priority' },
    { dbField: 'flight_in', shipmentField: 'fltIn', label: 'Flight In' },
    { dbField: 'warehouse_code', shipmentField: 'whs', label: 'Warehouse' },
  ]
  
  for (const mapping of fieldMappings) {
    let oldValue = existingItem[mapping.dbField]
    let newValue = shipment[mapping.shipmentField]
    
    // Special handling for origin_destination (combine origin + destination)
    if (mapping.dbField === 'origin_destination') {
      newValue = shipment.origin && shipment.destination 
        ? `${shipment.origin}${shipment.destination}` 
        : null
    }
    
    // Special handling for ULD (format it)
    if (mapping.dbField === 'uld_allocation') {
      newValue = formatULD(shipment.uld)
    }
    
    // Normalize values for comparison
    const normalizedOld = oldValue === null || oldValue === undefined ? null : String(oldValue).trim()
    const normalizedNew = newValue === null || newValue === undefined ? null : String(newValue).trim()
    
    // Skip if both are empty/null
    if (!normalizedOld && !normalizedNew) continue
    
    // Check if changed
    if (normalizedOld !== normalizedNew) {
      changes.push({
        field: mapping.label,
        oldValue: normalizedOld,
        newValue: normalizedNew,
      })
    }
  }
  
  return changes
}

/**
 * Compare uploaded load plan with existing data in database
 * Returns a diff object without saving anything
 */
export async function compareLoadPlanChanges({
  results,
  shipments,
}: CompareLoadPlanParams): Promise<LoadPlanDiff> {
  const supabase = createClient()
  
  // Parse flight info
  const flightNumber = results.header.flightNumber?.trim() || "UNKNOWN"
  const flightDate = parseDateString(results.header.date)
  // Use local date components to avoid timezone shifting (same fix as supabase-save.ts)
  const flightDateStr = `${flightDate.getFullYear()}-${String(flightDate.getMonth() + 1).padStart(2, '0')}-${String(flightDate.getDate()).padStart(2, '0')}`
  
  // Determine mode: REVISED (cor/corr) vs ADDITIONAL
  const isCorrectVersion = results.header.isCorrectVersion === true
  const keyMode = isCorrectVersion ? "AWB-only (REVISED)" : "serial+AWB (ADDITIONAL)"
  
  console.log("[Review] Comparing load plan:", { flightNumber, flightDateStr, mode: keyMode })
  
  // Check if load plan exists
  const { data: existingLoadPlan, error: checkError } = await supabase
    .from("load_plans")
    .select("*")
    .eq("flight_number", flightNumber)
    .eq("flight_date", flightDateStr)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (checkError && checkError.code !== 'PGRST116') {
    console.error("[Review] Error checking existing load plan:", checkError)
    throw new Error(`Failed to check existing load plan: ${checkError.message}`)
  }
  
  // Initialize diff result
  const diff: LoadPlanDiff = {
    flightNumber,
    flightDate: flightDateStr,
    isNewLoadPlan: !existingLoadPlan,
    existingLoadPlanId: existingLoadPlan?.id || null,
    existingRevision: existingLoadPlan?.revision || 0,
    newRevision: existingLoadPlan ? (existingLoadPlan.revision || 1) + 1 : 1,
    addedCount: 0,
    modifiedCount: 0,
    deletedCount: 0,
    unchangedCount: 0,
    addedItems: [],
    modifiedItems: [],
    deletedItems: [],
    hasChanges: false,
    parsedResults: results,
    parsedShipments: shipments,
  }
  
  // If new load plan, all items are "added"
  if (!existingLoadPlan) {
    diff.addedCount = shipments.length
    diff.hasChanges = shipments.length > 0
    diff.addedItems = shipments.map(shipment => ({
      serialNumber: shipment.serialNo ? parseInt(shipment.serialNo, 10) : 0,
      awbNumber: shipment.awbNo || "",
      changeType: 'added' as const,
      newData: {
        pieces: shipment.pieces,
        weight: shipment.weight,
        volume: shipment.volume,
        shc: shipment.shc,
        manDesc: shipment.manDesc,
        uld: shipment.uld,
        sector: shipment.sector,
      },
    }))
    
    console.log("[Review] New load plan - all items will be added:", diff.addedCount)
    return diff
  }
  
  // Fetch existing items from the CURRENT revision only
  // This ensures we compare against the latest state, not mixed revisions
  const currentRevision = existingLoadPlan.revision || 1
  console.log("[Review] 🔍 Fetching existing items:", {
    loadPlanId: existingLoadPlan.id,
    currentRevision,
    flightNumber,
  })
  
  const { data: existingItems, error: itemsError } = await supabase
    .from("load_plan_items")
    .select("*")
    .eq("load_plan_id", existingLoadPlan.id)
    .eq("revision", currentRevision)
    .order("serial_number", { ascending: true })
  
  console.log("[Review] 📋 Existing items fetched:", {
    count: existingItems?.length || 0,
    items: existingItems?.slice(0, 3).map(i => ({ ser: i.serial_number, awb: i.awb_number, rev: i.revision })),
  })
  
  if (itemsError) {
    console.error("[Review] Error fetching existing items:", itemsError)
    throw new Error(`Failed to fetch existing items: ${itemsError.message}`)
  }
  
  // Build maps for comparison using mode-appropriate key
  const existingItemsMap = new Map<string, any>()
  const newShipmentsMap = new Map<string, Shipment>()
  
  console.log(`[Review] 🔑 Using ${keyMode} matching for comparison`)
  
  // Build existing items map
  ;(existingItems || []).forEach(item => {
    const key = isCorrectVersion 
      ? createItemKeyByAwbOnly(item.awb_number)
      : createItemKeyBySerialAwb(item.serial_number, item.awb_number)
    if (key) {
      existingItemsMap.set(key, item)
    }
  })
  
  // Build new shipments map
  shipments.forEach(shipment => {
    let serialNo: number | null = null
    if (shipment.serialNo) {
      serialNo = typeof shipment.serialNo === 'string' 
        ? parseInt(shipment.serialNo.trim(), 10) 
        : shipment.serialNo
    }
    
    const key = isCorrectVersion
      ? createItemKeyByAwbOnly(shipment.awbNo)
      : createItemKeyBySerialAwb(serialNo, shipment.awbNo)
    
    if (key) {
      newShipmentsMap.set(key, shipment)
    }
  })
  
  console.log(`[Review] Maps created (${keyMode}):`, {
    existingItems: existingItemsMap.size,
    newShipments: newShipmentsMap.size,
  })
  
  // Compare items
  for (const [itemKey, shipment] of newShipmentsMap.entries()) {
    const existingItem = existingItemsMap.get(itemKey)
    const serialNo = shipment.serialNo ? parseInt(shipment.serialNo.trim(), 10) : 0
    const awbNo = shipment.awbNo || ""
    
    if (existingItem) {
      // Item exists in both - check for changes (applies to both REVISED and ADDITIONAL modes)
      // In ADDITIONAL mode, if an item with same serial+AWB exists, it can still be modified
      const fieldChanges = compareItemFields(existingItem, shipment)
      
      if (fieldChanges.length > 0) {
        // Has changes
        diff.modifiedCount++
        diff.modifiedItems.push({
          serialNumber: serialNo,
          awbNumber: awbNo,
          changeType: 'modified',
          fieldChanges,
          oldData: {
            pieces: existingItem.pieces,
            weight: existingItem.weight,
            volume: existingItem.volume,
            shc: existingItem.special_handling_code,
            manDesc: existingItem.manual_description,
            uld: existingItem.uld_allocation,
            sector: existingItem.sector,
          },
          newData: {
            pieces: shipment.pieces,
            weight: shipment.weight,
            volume: shipment.volume,
            shc: shipment.shc,
            manDesc: shipment.manDesc,
            uld: shipment.uld,
            sector: shipment.sector,
          },
        })
      } else {
        // No changes
        diff.unchangedCount++
      }
    } else {
      // Item only in new shipments - added (same for both modes)
      diff.addedCount++
      diff.addedItems.push({
        serialNumber: serialNo,
        awbNumber: awbNo,
        changeType: 'added',
        newData: {
          pieces: shipment.pieces,
          weight: shipment.weight,
          volume: shipment.volume,
          shc: shipment.shc,
          manDesc: shipment.manDesc,
          uld: shipment.uld,
          sector: shipment.sector,
        },
      })
    }
  }
  
  // Find deleted items - ONLY for REVISED mode
  // For ADDITIONAL mode: skip deleted detection - all existing items are retained
  if (isCorrectVersion) {
    for (const [itemKey, existingItem] of existingItemsMap.entries()) {
      if (!newShipmentsMap.has(itemKey)) {
        diff.deletedCount++
        diff.deletedItems.push({
          serialNumber: existingItem.serial_number,
          awbNumber: existingItem.awb_number,
          changeType: 'deleted',
          oldData: {
            pieces: existingItem.pieces,
            weight: existingItem.weight,
            volume: existingItem.volume,
            shc: existingItem.special_handling_code,
            manDesc: existingItem.manual_description,
            uld: existingItem.uld_allocation,
            sector: existingItem.sector,
          },
        })
      }
    }
  }
  
  // Determine if there are any changes
  diff.hasChanges = diff.addedCount > 0 || diff.modifiedCount > 0 || diff.deletedCount > 0
  
  console.log("[Review] Comparison complete:", {
    added: diff.addedCount,
    modified: diff.modifiedCount,
    deleted: diff.deletedCount,
    unchanged: diff.unchangedCount,
    hasChanges: diff.hasChanges,
  })
  
  return diff
}

/**
 * Apply the reviewed changes to the database
 * Called after user confirms the changes
 */
export async function applyLoadPlanChanges(
  diff: LoadPlanDiff,
  options: {
    applyDeletes?: boolean  // Whether to mark deleted items (false for ADDITIONAL mode)
  } = {}
): Promise<{ success: boolean; error?: string }> {
  // Import and use the existing save function
  const { saveListsDataToSupabase } = await import("./supabase-save")
  
  // The saveListsDataToSupabase function will handle all the logic
  // We just need to pass the parsed data
  const result = await saveListsDataToSupabase({
    results: diff.parsedResults,
    shipments: diff.parsedShipments,
  })
  
  return result
}

