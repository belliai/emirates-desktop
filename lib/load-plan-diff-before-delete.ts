/**
 * Load Plan Diff Before Delete
 * Compare existing items with new shipments BEFORE deleting/updating
 * This allows us to record changes before data is modified
 */

import { createClient } from "@/lib/supabase/client"
import type { Shipment } from "@/lib/lists/types"

export type ChangeType = 'added' | 'modified' | 'deleted'
export type ItemType = 'awb' | 'uld_section' | 'sector' | 'comment' | 'header'

export interface FieldChange {
  old: string | number | boolean | null
  new: string | number | boolean | null
}

export interface LoadPlanChangeBeforeDelete {
  changeType: ChangeType
  itemType: ItemType
  originalItemId?: string
  serialNumber?: number
  fieldChanges?: Record<string, FieldChange>
  originalData?: any // Full original item from database
  newData?: any // New shipment data (before conversion to database format)
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
 * Parse datetime string to timestamp (same as in supabase-save.ts)
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
    // Silently fail - return null
  }
  
  return null
}

/**
 * Convert shipment to database format for comparison
 * IMPORTANT: This must match exactly how data is saved in createLoadPlanItem
 */
function shipmentToDbFormat(shipment: Shipment): Partial<LoadPlanItemRow> {
  // Helper to truncate (matching createLoadPlanItem logic)
  const truncate = (str: string | null | undefined, maxLength: number): string | null => {
    if (!str) return null
    return str.length > maxLength ? str.substring(0, maxLength) : str
  }
  
  // Helper to format ULD (matching createLoadPlanItem logic exactly from supabase-save.ts)
  const formatULD = (uld: string | null | undefined): string | null => {
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
    formatted = formatted.replace(/([^X\s])(XX)/gi, '$1 $2')
    
    // Step 3: Clean up any double spaces that might have been created
    formatted = formatted.replace(/\s{2,}/g, ' ')
    
    return formatted
  }
  
  return {
    serial_number: shipment.serialNo ? parseInt(shipment.serialNo, 10) : null,
    awb_number: truncate((shipment.awbNo || "").replace(/\s+/g, ""), 50),
    origin_destination: shipment.origin && shipment.destination 
      ? truncate(`${shipment.origin}${shipment.destination}`, 50)
      : null,
    pieces: shipment.pieces || null,
    weight: shipment.weight || null,
    volume: shipment.volume || null,
    load_volume: shipment.lvol || null,
    special_handling_code: truncate(shipment.shc, 50),
    manual_description: shipment.manDesc || null, // TEXT, no limit
    product_code_pc: truncate(shipment.pcode, 50),
    total_handling_charge: shipment.thc && !isNaN(parseFloat(shipment.thc)) ? parseFloat(shipment.thc) : null,
    booking_status: truncate(shipment.bs, 50),
    priority_indicator: truncate(shipment.pi, 50),
    flight_in: truncate(shipment.fltIn, 50),
    arrival_date_time: shipment.arrDtTime ? parseDateTimeString(shipment.arrDtTime) : null, // IMPORTANT: Parse to ISO format like createLoadPlanItem
    quantity_aqnn: truncate(shipment.qnnAqnn, 50),
    warehouse_code: truncate(shipment.whs, 50),
    special_instructions: truncate(shipment.si, 50),
    uld_allocation: truncate(formatULD(shipment.uld), 50),
    special_notes: shipment.specialNotes && shipment.specialNotes.length > 0
      ? shipment.specialNotes.join("\n")
      : null,
    sector: truncate(shipment.sector, 50),
    is_ramp_transfer: shipment.isRampTransfer === true,
  }
}

/**
 * Normalize value for comparison
 */
function normalizeValue(value: any): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'boolean') {
    return value
  }
  return value
}

/**
 * Check if two values are different
 */
function valuesAreDifferent(oldValue: any, newValue: any): boolean {
  const normalizedOld = normalizeValue(oldValue)
  const normalizedNew = normalizeValue(newValue)
  
  if (normalizedOld === null && normalizedNew === null) return false
  if (normalizedOld === null || normalizedNew === null) return true
  
  if (normalizedOld === normalizedNew) return false
  
  if (typeof normalizedOld === 'string' && typeof normalizedNew === 'string') {
    return normalizedOld !== normalizedNew
  }
  
  if (typeof normalizedOld === 'number' && typeof normalizedNew === 'number') {
    return normalizedOld !== normalizedNew
  }
  
  if (typeof normalizedOld === 'boolean' && typeof normalizedNew === 'boolean') {
    return normalizedOld !== normalizedNew
  }
  
  return true
}

/**
 * Compare existing item with new shipment
 * EXPORTED for use in supabase-save.ts
 */
export function compareItemWithShipment(
  existingItem: LoadPlanItemRow,
  newShipment: Shipment
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {}
  const newDbFormat = shipmentToDbFormat(newShipment)
  
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
    const oldValue = existingItem[field]
    const newValue = newDbFormat[field]
    
    // Special handling for arrival_date_time - compare ISO timestamps
    if (field === 'arrival_date_time') {
      const oldTimestamp = oldValue ? (typeof oldValue === 'string' ? oldValue : String(oldValue)) : null
      const newTimestamp = newValue ? (typeof newValue === 'string' ? newValue : String(newValue)) : null
      
      // Both null/empty - no change
      if (!oldTimestamp && !newTimestamp) {
        continue
      }
      
      // One is null, other is not - change
      if (!oldTimestamp || !newTimestamp) {
        // This is a change, will be recorded below
      } else {
        // Both have values - compare as ISO timestamps
        try {
          const oldDate = new Date(oldTimestamp)
          const newDate = new Date(newTimestamp)
          
          // Compare dates (ignore timezone, compare actual date/time)
          if (!isNaN(oldDate.getTime()) && !isNaN(newDate.getTime())) {
            if (oldDate.getTime() === newDate.getTime()) {
              continue // Same date/time, no change
            }
          } else {
            // Invalid dates - compare as strings
            if (oldTimestamp === newTimestamp) {
              continue
            }
          }
        } catch {
          // If parsing fails, compare as strings
          if (oldTimestamp === newTimestamp) {
            continue
          }
        }
      }
    }
    
    // Special handling for numbers - compare numeric values, not strings
    if (field === 'pieces' || field === 'weight' || field === 'volume' || field === 'load_volume' || field === 'total_handling_charge' || field === 'additional_total_handling_charge') {
      const oldNum = oldValue !== null && oldValue !== undefined ? Number(oldValue) : null
      const newNum = newValue !== null && newValue !== undefined ? Number(newValue) : null
      
      // Both null - no change
      if (oldNum === null && newNum === null) {
        continue
      }
      
      // One is null, other is not - change
      if (oldNum === null || newNum === null) {
        // This is a change, will be recorded below
      } else {
        // Both have numeric values - compare with tolerance for floating point
        if (!isNaN(oldNum) && !isNaN(newNum)) {
          // For floating point numbers, use small tolerance
          if (Math.abs(oldNum - newNum) < 0.001) {
            continue // Same numeric value (within tolerance), no change
          }
        } else {
          // One or both are NaN - compare as original values
          if (oldValue === newValue) {
            continue
          }
        }
      }
    }
    
    // Special handling for boolean - compare directly
    if (field === 'is_ramp_transfer') {
      const oldBool = oldValue === true || oldValue === 1 || oldValue === 'true'
      const newBool = newValue === true || newValue === 1 || newValue === 'true'
      if (oldBool === newBool) {
        continue // Same boolean value, no change
      }
    }
    
    if (valuesAreDifferent(oldValue, newValue)) {
      changes[field] = {
        old: oldValue !== null && oldValue !== undefined ? oldValue : null,
        new: newValue !== null && newValue !== undefined ? newValue : null,
      }
      
      // Log changes for item 001 specifically
      if (existingItem.serial_number === 1) {
        console.log(`[LoadPlanDiffBeforeDelete] Item 001 field changed: ${field}`, {
          old: oldValue,
          new: newValue,
          oldType: typeof oldValue,
          newType: typeof newValue,
        })
      }
    }
  }
  
  // Log if item 001 has no changes
  if (existingItem.serial_number === 1) {
    if (Object.keys(changes).length === 0) {
      console.log(`[LoadPlanDiffBeforeDelete] Item 001 exists but no changes detected (will be kept)`)
    } else {
      console.log(`[LoadPlanDiffBeforeDelete] Item 001 has ${Object.keys(changes).length} changed field(s):`, Object.keys(changes))
    }
  }
  
  return changes
}

/**
 * Compare existing items with new shipments BEFORE delete/update
 * This allows us to record changes before modifying the database
 */
export async function compareBeforeDelete(
  loadPlanId: string,
  existingRevision: number,
  newShipments: Shipment[]
): Promise<LoadPlanChangeBeforeDelete[]> {
  const supabase = createClient()
  const changes: LoadPlanChangeBeforeDelete[] = []
  
  // Fetch existing items from current revision
  const { data: existingItems, error: existingError } = await supabase
    .from("load_plan_items")
    .select("*")
    .eq("load_plan_id", loadPlanId)
    .eq("revision", existingRevision)
    .order("serial_number", { ascending: true })
  
  if (existingError) {
    console.error("[LoadPlanDiffBeforeDelete] Error fetching existing items:", existingError)
    return changes
  }
  
  // Create maps for fast lookup
  const existingItemsMap = new Map<number, LoadPlanItemRow>()
  const newShipmentsMap = new Map<number, Shipment>()
  
  // Build existing items map
  ;(existingItems || []).forEach(item => {
    if (item.serial_number !== null) {
      existingItemsMap.set(item.serial_number, item)
    }
  })
  
  // Build new shipments map
  newShipments.forEach(shipment => {
    // Parse serial number - handle both "001" (string) and 1 (number)
    let serialNo: number | null = null
    if (shipment.serialNo) {
      if (typeof shipment.serialNo === 'string') {
        serialNo = parseInt(shipment.serialNo.trim(), 10)
      } else if (typeof shipment.serialNo === 'number') {
        serialNo = shipment.serialNo
      }
    }
    
    if (serialNo !== null && !isNaN(serialNo)) {
      newShipmentsMap.set(serialNo, shipment)
      
      // Log item 001 specifically
      if (serialNo === 1) {
        console.log(`[LoadPlanDiffBeforeDelete] ✅ Item 001 found in new shipments:`, {
          serialNo: shipment.serialNo,
          awbNo: shipment.awbNo,
          origin: shipment.origin,
          destination: shipment.destination,
          weight: shipment.weight,
        })
      }
    } else {
      console.warn(`[LoadPlanDiffBeforeDelete] Warning: Shipment has invalid serialNo:`, {
        serialNo: shipment.serialNo,
        type: typeof shipment.serialNo,
        shipment: shipment,
      })
    }
  })
  
  console.log(`[LoadPlanDiffBeforeDelete] Maps created:`, {
    existingItems: existingItemsMap.size,
    newShipments: newShipmentsMap.size,
    existingSerialNumbers: Array.from(existingItemsMap.keys()).slice(0, 10),
    newSerialNumbers: Array.from(newShipmentsMap.keys()).slice(0, 10),
    hasItem001InExisting: existingItemsMap.has(1),
    hasItem001InNew: newShipmentsMap.has(1),
  })
  
  // Find added items (in new shipments but not in existing)
  newShipmentsMap.forEach((shipment, serialNumber) => {
    if (!existingItemsMap.has(serialNumber)) {
      changes.push({
        changeType: 'added',
        itemType: 'awb',
        serialNumber,
        newData: shipment,
      })
    }
  })
  
  // Find deleted items (in existing but not in new shipments)
  existingItemsMap.forEach((existingItem, serialNumber) => {
    if (!newShipmentsMap.has(serialNumber)) {
      changes.push({
        changeType: 'deleted',
        itemType: 'awb',
        originalItemId: existingItem.id,
        serialNumber,
        originalData: existingItem,
      })
    }
  })
  
  // Find modified items (in both but with different values)
  existingItemsMap.forEach((existingItem, serialNumber) => {
    const newShipment = newShipmentsMap.get(serialNumber)
    if (newShipment) {
      // Log item 001 specifically
      if (serialNumber === 1) {
        console.log(`[LoadPlanDiffBeforeDelete] 🔍 Item 001 found in both - comparing:`, {
          existing: {
            awb_number: existingItem.awb_number,
            origin_destination: existingItem.origin_destination,
            weight: existingItem.weight,
          },
          new: {
            awbNo: newShipment.awbNo,
            origin: newShipment.origin,
            destination: newShipment.destination,
            weight: newShipment.weight,
          },
        })
      }
      
      const fieldChanges = compareItemWithShipment(existingItem, newShipment)
      if (Object.keys(fieldChanges).length > 0) {
        console.log(`[LoadPlanDiffBeforeDelete] Modified item serial_number=${serialNumber}:`, {
          changedFields: Object.keys(fieldChanges),
          sampleChange: Object.entries(fieldChanges)[0] ? {
            field: Object.entries(fieldChanges)[0][0],
            old: Object.entries(fieldChanges)[0][1].old,
            new: Object.entries(fieldChanges)[0][1].new,
          } : null,
        })
        
        // Log item 001 specifically
        if (serialNumber === 1) {
          console.log(`[LoadPlanDiffBeforeDelete] ✅ Item 001 is MODIFIED:`, {
            changedFields: Object.keys(fieldChanges),
            allChanges: fieldChanges,
          })
        }
        
        changes.push({
          changeType: 'modified',
          itemType: 'awb',
          originalItemId: existingItem.id,
          serialNumber,
          fieldChanges, // Only changed fields
          originalData: existingItem,
          newData: newShipment,
        })
      } else {
        // Item exists in both but no changes - this is OK, we still keep it
        if (serialNumber === 1) {
          console.log(`[LoadPlanDiffBeforeDelete] ⚠️ Item 001 exists in both but NO CHANGES detected (will be kept but not recorded as modified)`)
        } else {
          console.log(`[LoadPlanDiffBeforeDelete] Item serial_number=${serialNumber} exists in both but no changes detected (will be kept)`)
        }
      }
    } else {
      // Item exists in existing but not in new shipments - will be deleted
      if (serialNumber === 1) {
        console.error(`[LoadPlanDiffBeforeDelete] ❌ Item 001 will be DELETED (not in new shipments)!`)
        console.error(`[LoadPlanDiffBeforeDelete] Available new shipments:`, Array.from(newShipmentsMap.keys()).slice(0, 10))
      } else {
        console.log(`[LoadPlanDiffBeforeDelete] Item serial_number=${serialNumber} will be deleted (not in new shipments)`)
      }
    }
  })
  
  console.log(`[LoadPlanDiffBeforeDelete] Found ${changes.length} changes:`, {
    added: changes.filter(c => c.changeType === 'added').length,
    modified: changes.filter(c => c.changeType === 'modified').length,
    deleted: changes.filter(c => c.changeType === 'deleted').length,
  })
  
  return changes
}

/**
 * Save changes to load_plan_changes table BEFORE delete/update
 */
export async function saveChangesBeforeDelete(
  loadPlanId: string,
  newRevision: number,
  changes: LoadPlanChangeBeforeDelete[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  if (changes.length === 0) {
    console.log(`[LoadPlanDiffBeforeDelete] No changes to save`)
    return { success: true }
  }
  
  // Prepare data for insertion
  const changesToInsert = changes.map(change => {
    let fieldChanges = null
    
    if (change.changeType === 'modified' && change.fieldChanges) {
      fieldChanges = change.fieldChanges
      
      if (Object.keys(fieldChanges).length === 0) {
        console.warn(`[LoadPlanDiffBeforeDelete] Modified item serial_number=${change.serialNumber} has no field changes, skipping`)
        return null // Skip if no fields changed
      }
      
      // Log item 001 specifically
      if (change.serialNumber === 1) {
        console.log(`[LoadPlanDiffBeforeDelete] Saving item 001 as modified:`, {
          changedFields: Object.keys(fieldChanges),
          fieldChanges: fieldChanges,
        })
      }
    }
    
    // Log item 001 for all change types
    if (change.serialNumber === 1) {
      console.log(`[LoadPlanDiffBeforeDelete] Saving item 001 change:`, {
        changeType: change.changeType,
        hasFieldChanges: fieldChanges ? Object.keys(fieldChanges).length : 0,
      })
    }
    
    return {
      load_plan_id: loadPlanId,
      revision: newRevision,
      change_type: change.changeType,
      item_type: change.itemType,
      original_item_id: change.originalItemId || null,
      revised_item_id: null, // Will be set after insert
      serial_number: change.serialNumber || null,
      uld_section_index: null,
      sector_index: null,
      field_changes: fieldChanges, // Only changed fields for modified items
      original_data: change.originalData || null, // Full original item
      revised_data: change.newData || null, // New shipment data (before conversion)
    }
  }).filter(change => change !== null)
  
  if (changesToInsert.length === 0) {
    console.warn(`[LoadPlanDiffBeforeDelete] No valid changes to insert after filtering`)
    return { success: true }
  }
  
  console.log(`[LoadPlanDiffBeforeDelete] Preparing to insert ${changesToInsert.length} changes to load_plan_changes`)
  
  const { error } = await supabase
    .from("load_plan_changes")
    .insert(changesToInsert)
  
  if (error) {
    console.error("[LoadPlanDiffBeforeDelete] ❌ Error saving changes:", error)
    console.error("[LoadPlanDiffBeforeDelete] Failed changes sample:", JSON.stringify(changesToInsert.slice(0, 1), null, 2))
    return {
      success: false,
      error: error.message,
    }
  }
  
  // Verify item 001 was saved
  const item001Saved = changesToInsert.find(c => c.serial_number === 1)
  if (item001Saved) {
    console.log(`[LoadPlanDiffBeforeDelete] ✅ Item 001 change saved:`, {
      changeType: item001Saved.change_type,
      hasFieldChanges: item001Saved.field_changes ? Object.keys(item001Saved.field_changes).length : 0,
    })
  }
  
  console.log(`[LoadPlanDiffBeforeDelete] ✅ Saved ${changesToInsert.length} changes before delete/update`)
  return { success: true }
}
