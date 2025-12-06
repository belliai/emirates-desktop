/**
 * Load Plan Diff Utility
 * Compares original and revised load plans to identify changes (added, modified, deleted)
 */

import { createClient } from "@/lib/supabase/client"
import type { AWBRow } from "@/components/load-plan-types"

export type ChangeType = 'added' | 'modified' | 'deleted'
export type ItemType = 'awb' | 'uld_section' | 'sector' | 'comment' | 'header'

export interface FieldChange {
  old: string | number | boolean | null
  new: string | number | boolean | null
}

export interface LoadPlanChange {
  changeType: ChangeType
  itemType: ItemType
  originalItemId?: string
  revisedItemId?: string
  serialNumber?: number
  uldSectionIndex?: number
  sectorIndex?: number
  fieldChanges?: Record<string, FieldChange>
  originalData?: any
  revisedData?: any
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
  additional_total_handling_charge: number | null
  booking_status: string | null
  priority_indicator: string | null
  flight_in: string | null
  arrival_date_time: string | null
  quantity_aqnn: string | null
  payment_terms: string | null
  warehouse_code: string | null
  special_instructions: string | null
  uld_allocation: string | null
  special_notes: string | null
  sector: string | null
  is_ramp_transfer: boolean | null
  revision: number | null
  additional_data: boolean | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Compare two AWB items and return field-level changes
 */
function compareAWBItems(
  original: LoadPlanItemRow,
  revised: LoadPlanItemRow
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {}
  
  // Fields to compare (excluding metadata fields like id, load_plan_id, created_at, updated_at, revision, additional_data)
  const fieldsToCompare: Array<keyof LoadPlanItemRow> = [
    'awb_number',
    'origin_destination',
    'pieces',
    'weight',
    'volume',
    'load_volume',
    'special_handling_code',
    'manual_description',
    'product_code_pc',
    'total_handling_charge',
    'additional_total_handling_charge',
    'booking_status',
    'priority_indicator',
    'flight_in',
    'arrival_date_time',
    'quantity_aqnn',
    'payment_terms',
    'warehouse_code',
    'special_instructions',
    'uld_allocation',
    'special_notes',
    'sector',
    'is_ramp_transfer',
  ]
  
  for (const field of fieldsToCompare) {
    const oldValue = original[field]
    const newValue = revised[field]
    
    // Check if values are different (only record if they actually changed)
    if (valuesAreDifferent(oldValue, newValue)) {
      // Store both old and new values to track what changed
      // old: value from original revision (preserve original type and value)
      // new: value from revised revision (preserve original type and value)
      changes[field] = {
        old: oldValue !== null && oldValue !== undefined ? oldValue : null,
        new: newValue !== null && newValue !== undefined ? newValue : null,
      }
      
      // Log the change for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[LoadPlanDiff] Field changed: ${field}`, {
          old: oldValue,
          new: newValue,
        })
      }
    }
  }
  
  return changes
}

/**
 * Normalize value for comparison (handle null, undefined, empty strings)
 * IMPORTANT: Only normalize for comparison, but preserve original values for storage
 */
function normalizeValue(value: any): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  if (typeof value === 'number') {
    // For numbers, compare as-is (including 0)
    return value
  }
  if (typeof value === 'boolean') {
    return value
  }
  return value
}

/**
 * Check if two values are different (strict comparison after normalization)
 */
function valuesAreDifferent(oldValue: any, newValue: any): boolean {
  const normalizedOld = normalizeValue(oldValue)
  const normalizedNew = normalizeValue(newValue)
  
  // Handle null/undefined cases
  if (normalizedOld === null && normalizedNew === null) return false
  if (normalizedOld === null || normalizedNew === null) return true
  
  // Strict equality check
  if (normalizedOld === normalizedNew) return false
  
  // For strings, do case-sensitive comparison (preserve case differences)
  if (typeof normalizedOld === 'string' && typeof normalizedNew === 'string') {
    return normalizedOld !== normalizedNew
  }
  
  // For numbers, compare numeric values
  if (typeof normalizedOld === 'number' && typeof normalizedNew === 'number') {
    return normalizedOld !== normalizedNew
  }
  
  // For booleans, compare directly
  if (typeof normalizedOld === 'boolean' && typeof normalizedNew === 'boolean') {
    return normalizedOld !== normalizedNew
  }
  
  // Different types are considered different
  return true
}

/**
 * Compare original and revised load plans and identify changes
 */
export async function compareLoadPlans(
  loadPlanId: string,
  originalRevision: number,
  revisedRevision: number
): Promise<LoadPlanChange[]> {
  const supabase = createClient()
  const changes: LoadPlanChange[] = []
  
  // Fetch original items (revision 1 or specified original revision)
  const { data: originalItems, error: originalError } = await supabase
    .from("load_plan_items")
    .select("*")
    .eq("load_plan_id", loadPlanId)
    .eq("revision", originalRevision)
    .order("serial_number", { ascending: true })
  
  if (originalError) {
    console.error("[LoadPlanDiff] Error fetching original items:", originalError)
    return changes
  }
  
  // Fetch revised items (latest revision or specified revised revision)
  const { data: revisedItems, error: revisedError } = await supabase
    .from("load_plan_items")
    .select("*")
    .eq("load_plan_id", loadPlanId)
    .eq("revision", revisedRevision)
    .order("serial_number", { ascending: true })
  
  if (revisedError) {
    console.error("[LoadPlanDiff] Error fetching revised items:", revisedError)
    return changes
  }
  
  const originalItemsMap = new Map<number, LoadPlanItemRow>()
  const revisedItemsMap = new Map<number, LoadPlanItemRow>()
  
  // Build maps by serial_number for fast lookup
  ;(originalItems || []).forEach(item => {
    if (item.serial_number !== null) {
      originalItemsMap.set(item.serial_number, item)
    }
  })
  
  ;(revisedItems || []).forEach(item => {
    if (item.serial_number !== null) {
      revisedItemsMap.set(item.serial_number, item)
    }
  })
  
  // Find added items (in revised but not in original)
  revisedItemsMap.forEach((revisedItem, serialNumber) => {
    if (!originalItemsMap.has(serialNumber)) {
      changes.push({
        changeType: 'added',
        itemType: 'awb',
        revisedItemId: revisedItem.id,
        serialNumber,
        revisedData: revisedItem,
      })
    }
  })
  
  // Find deleted items (in original but not in revised)
  originalItemsMap.forEach((originalItem, serialNumber) => {
    if (!revisedItemsMap.has(serialNumber)) {
      changes.push({
        changeType: 'deleted',
        itemType: 'awb',
        originalItemId: originalItem.id,
        serialNumber,
        originalData: originalItem,
      })
    }
  })
  
  // Find modified items (in both but with different values)
  originalItemsMap.forEach((originalItem, serialNumber) => {
    const revisedItem = revisedItemsMap.get(serialNumber)
    if (revisedItem) {
      const fieldChanges = compareAWBItems(originalItem, revisedItem)
      
      // Only record as modified if there are actual field changes
      if (Object.keys(fieldChanges).length > 0) {
        // Log the changes for debugging
        console.log(`[LoadPlanDiff] Modified item serial_number=${serialNumber}:`, {
          changedFields: Object.keys(fieldChanges),
          totalChangedFields: Object.keys(fieldChanges).length,
        })
        
        changes.push({
          changeType: 'modified',
          itemType: 'awb',
          originalItemId: originalItem.id,
          revisedItemId: revisedItem.id,
          serialNumber,
          fieldChanges, // Contains ONLY fields that changed: {"field_name": {"old": "old_value", "new": "new_value"}}
          originalData: originalItem, // Full snapshot of original item (for reference)
          revisedData: revisedItem, // Full snapshot of revised item (for reference)
        })
      }
      // Note: If item exists in both but no changes detected, we don't record it (as expected)
    }
  })
  
  console.log(`[LoadPlanDiff] Comparison complete: ${changes.length} total changes (${changes.filter(c => c.changeType === 'added').length} added, ${changes.filter(c => c.changeType === 'modified').length} modified, ${changes.filter(c => c.changeType === 'deleted').length} deleted)`)
  
  return changes
}

/**
 * Save load plan changes to database
 */
export async function saveLoadPlanChanges(
  loadPlanId: string,
  revision: number,
  changes: LoadPlanChange[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  if (changes.length === 0) {
    return { success: true }
  }
  
  // Prepare data for insertion
  const changesToInsert = changes.map(change => {
    // For modified items, only include field_changes (not all fields, only changed ones)
    // For added/deleted items, field_changes will be null
    let fieldChanges = null
    
    if (change.changeType === 'modified' && change.fieldChanges) {
      // Only include fields that actually changed
      // fieldChanges already contains only changed fields from compareAWBItems
      fieldChanges = change.fieldChanges
      
      // Verify we're only saving changed fields
      if (Object.keys(fieldChanges).length === 0) {
        console.warn(`[LoadPlanDiff] Warning: Modified item serial_number=${change.serialNumber} has no field changes, skipping`)
        return null // Skip this change if no fields actually changed
      }
      
      // Log what we're saving
      console.log(`[LoadPlanDiff] Saving modified item serial_number=${change.serialNumber}:`, {
        changedFields: Object.keys(fieldChanges),
        sampleChange: Object.entries(fieldChanges)[0] ? {
          field: Object.entries(fieldChanges)[0][0],
          old: Object.entries(fieldChanges)[0][1].old,
          new: Object.entries(fieldChanges)[0][1].new,
        } : null,
      })
    }
    
    return {
      load_plan_id: loadPlanId,
      revision,
      change_type: change.changeType,
      item_type: change.itemType,
      original_item_id: change.originalItemId || null,
      revised_item_id: change.revisedItemId || null,
      serial_number: change.serialNumber || null,
      uld_section_index: change.uldSectionIndex || null,
      sector_index: change.sectorIndex || null,
      field_changes: fieldChanges, // JSONB: Only changed fields {"field_name": {"old": "old_value", "new": "new_value"}}
      original_data: change.originalData || null, // JSONB: Full original item data (for reference)
      revised_data: change.revisedData || null, // JSONB: Full revised item data (for reference)
    }
  }).filter(change => change !== null) // Remove any null entries
  
  const { error } = await supabase
    .from("load_plan_changes")
    .insert(changesToInsert)
  
  if (error) {
    console.error("[LoadPlanDiff] Error saving changes:", error)
    console.error("[LoadPlanDiff] Failed to insert changes:", JSON.stringify(changesToInsert.slice(0, 1), null, 2))
    return {
      success: false,
      error: error.message,
    }
  }
  
  // Log summary of what was saved
  const addedCount = changes.filter(c => c.changeType === 'added').length
  const modifiedCount = changes.filter(c => c.changeType === 'modified').length
  const deletedCount = changes.filter(c => c.changeType === 'deleted').length
  
  console.log(`[LoadPlanDiff] ✅ Saved ${changes.length} changes for load plan ${loadPlanId}, revision ${revision}:`, {
    added: addedCount,
    modified: modifiedCount,
    deleted: deletedCount,
  })
  
  return { success: true }
}

/**
 * Get load plan changes for a specific revision
 */
export async function getLoadPlanChanges(
  loadPlanId: string,
  revision: number
): Promise<LoadPlanChange[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("load_plan_changes")
    .select("*")
    .eq("load_plan_id", loadPlanId)
    .eq("revision", revision)
    .order("change_type", { ascending: true })
    .order("serial_number", { ascending: true })
  
  if (error) {
    console.error("[LoadPlanDiff] Error fetching changes:", error)
    return []
  }
  
  return (data || []).map(item => ({
    changeType: item.change_type as ChangeType,
    itemType: item.item_type as ItemType,
    originalItemId: item.original_item_id || undefined,
    revisedItemId: item.revised_item_id || undefined,
    serialNumber: item.serial_number || undefined,
    uldSectionIndex: item.uld_section_index || undefined,
    sectorIndex: item.sector_index || undefined,
    fieldChanges: item.field_changes as Record<string, FieldChange> | undefined,
    originalData: item.original_data,
    revisedData: item.revised_data,
  }))
}

/**
 * Get change information for a specific AWB item by serial number
 */
export async function getAWBChange(
  loadPlanId: string,
  revision: number,
  serialNumber: number
): Promise<LoadPlanChange | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("load_plan_changes")
    .select("*")
    .eq("load_plan_id", loadPlanId)
    .eq("revision", revision)
    .eq("serial_number", serialNumber)
    .eq("item_type", "awb")
    .maybeSingle()
  
  if (error) {
    console.error("[LoadPlanDiff] Error fetching AWB change:", error)
    return null
  }
  
  if (!data) {
    return null
  }
  
  return {
    changeType: data.change_type as ChangeType,
    itemType: data.item_type as ItemType,
    originalItemId: data.original_item_id || undefined,
    revisedItemId: data.revised_item_id || undefined,
    serialNumber: data.serial_number || undefined,
    uldSectionIndex: data.uld_section_index || undefined,
    sectorIndex: data.sector_index || undefined,
    fieldChanges: data.field_changes as Record<string, FieldChange> | undefined,
    originalData: data.original_data,
    revisedData: data.revised_data,
  }
}
