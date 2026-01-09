"use client"

import { useState, useEffect, useMemo } from "react"
import React from "react"
import { Plus, Trash2, CheckCircle } from "lucide-react"
import BCRModal, { generateBCRData } from "./bcr-modal"
import type { AWBComment } from "./bcr-modal"
import HandoverModal from "./handover-modal"
import { AWBSplitOffloadModal } from "./awb-split-offload-modal"
import { LoadPlanHeader } from "./load-plan-header"
import { FlightHeaderRow } from "./flight-header-row"
import { EditableField } from "./editable-field"
import { useLoadPlanState } from "./use-load-plan-state"
import { useLoadPlans } from "@/lib/load-plan-context"
import type { LoadPlanDetail, AWBRow, ULDSection } from "./load-plan-types"
import { ULDNumberModal, type ULDEntry, type WorkType, type AWBInfo } from "./uld-number-modal"
import { parseULDSection, formatULDSection, formatULDSectionFromEntries, formatULDSectionFromCheckedEntries, extractULDParts } from "@/lib/uld-parser"
import { getULDEntriesFromStorage, saveULDEntriesToStorage, getULDEntriesFromSupabase, saveULDEntriesToSupabase } from "@/lib/uld-storage"
import type { WorkArea, PilPerSubFilter } from "@/lib/work-area-filter-utils"
import { shouldIncludeULDSection } from "@/lib/work-area-filter-utils"
import { getLoadPlanChanges, type LoadPlanChange } from "@/lib/load-plan-diff"
import { createClient } from "@/lib/supabase/client"
import { getAWBStatusesFromSupabase, markAWBLoaded, markAWBOffloaded, bulkMarkAWBsLoaded, type AWBStatus } from "@/lib/awb-status-storage"
import { useUser } from "@/lib/user-context"

// Re-export types for backward compatibility
export type { AWBRow, ULDSection, LoadPlanItem, LoadPlanDetail } from "./load-plan-types"

// Bay info types for QRT List
type BayInfoData = {
  sta?: string
  flightNo?: string
  orig?: string
  via?: string
  eta?: string
  ata?: string
  acType?: string
  regn?: string
  pos?: string
  term?: string
  belt?: string
} | null

type DepartureBayInfoData = {
  std?: string
  flightNo?: string
  dest?: string
  via?: string
  etd?: string
  atd?: string
  acType?: string
  regn?: string
  pos?: string
  term?: string
  gate?: string
} | null

/**
 * Calculate connection time in minutes based on arrival and departure times
 * Priority: ATD - ATA > ATD - ETA > ETD - ATA > ETD - ETA
 * Returns formatted string in minutes or empty string if calculation not possible
 */
function calculateConnectionTime(
  arrivalInfo: BayInfoData,
  departureInfo: DepartureBayInfoData
): string {
  if (!arrivalInfo && !departureInfo) return "0"
  
  // Helper to parse time in HH:MM format to minutes since midnight
  const parseTime = (timeStr: string | undefined): number | null => {
    if (!timeStr || timeStr.trim() === "" || timeStr === "-") return null
    const match = timeStr.match(/(\d{1,2}):(\d{2})/)
    if (!match) return null
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    return hours * 60 + minutes
  }
  
  // Get available times
  const ata = arrivalInfo?.ata ? parseTime(arrivalInfo.ata) : null
  const eta = arrivalInfo?.eta ? parseTime(arrivalInfo.eta) : null
  const atd = departureInfo?.atd ? parseTime(departureInfo.atd) : null
  const etd = departureInfo?.etd ? parseTime(departureInfo.etd) : null
  
  let arrivalTime: number | null = null
  let departureTime: number | null = null
  
  // Determine best arrival time (ATA preferred, then ETA)
  if (ata !== null) {
    arrivalTime = ata
  } else if (eta !== null) {
    arrivalTime = eta
  }
  
  // Determine best departure time (ATD preferred, then ETD)
  if (atd !== null) {
    departureTime = atd
  } else if (etd !== null) {
    departureTime = etd
  }
  
  // Calculate connection time
  if (arrivalTime !== null && departureTime !== null) {
    let connectionMinutes = departureTime - arrivalTime
    
    // Handle overnight flights (departure next day)
    if (connectionMinutes < 0) {
      connectionMinutes += 24 * 60 // Add 24 hours
    }
    
    // Format based on duration
    if (connectionMinutes < 60) {
      return `${connectionMinutes} mins`
    } else {
      const hours = Math.floor(connectionMinutes / 60)
      const mins = connectionMinutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
  }
  
  return "N/A"
}

interface LoadPlanDetailScreenProps {
  loadPlan: LoadPlanDetail
  onBack: () => void
  onNavigateToBuildupStaff?: (staffName: string) => void
  enableBulkCheckboxes?: boolean // Enable bulk checkbox functionality (default: false, true for Buildup Staff)
  workAreaFilter?: WorkArea // Filter ULD sections based on work area (SHC codes)
  pilPerSubFilter?: PilPerSubFilter // Sub-filter for PIL/PER work area (PIL only, PER only, or Both)
  isQRTList?: boolean // Show Bay Number and Connection Time columns for QRT List
  onULDUpdate?: () => void // Callback when ULD entries are updated (for progress bar recalculation)
  arrivalBayInfo?: BayInfoData // Bay info for QRT List arrival
  departureBayInfo?: DepartureBayInfoData // Bay info for QRT List departure
  hideHandover?: boolean // Hide handover button (when handover is managed at a higher level, e.g., Buildup Staff screen)
}

export default function LoadPlanDetailScreen({ loadPlan, onBack, onNavigateToBuildupStaff, enableBulkCheckboxes = false, workAreaFilter, pilPerSubFilter, isQRTList = false, onULDUpdate, arrivalBayInfo, departureBayInfo, hideHandover = false }: LoadPlanDetailScreenProps) {
  const [showBCRModal, setShowBCRModal] = useState(false)
  const [showHandoverModal, setShowHandoverModal] = useState(false)
  const [awbComments, setAwbComments] = useState<AWBComment[]>([])
  const [showULDModal, setShowULDModal] = useState(false)
  
  // Calculate connection time for QRT List (flight-level, applies to all AWBs)
  const calculatedConnectionTime = isQRTList && arrivalBayInfo && departureBayInfo
    ? calculateConnectionTime(arrivalBayInfo, departureBayInfo)
    : "0"
  const [selectedULDSection, setSelectedULDSection] = useState<{
    sectorIndex: number
    uldSectionIndex: number
    uld: string
    awbs: AWBInfo[]
  } | null>(null)
  const [showQuickActionModal, setShowQuickActionModal] = useState(false)
  const [selectedAWBForQuickAction, setSelectedAWBForQuickAction] = useState<{
    awb: AWBRow
    sectorIndex: number
    uldSectionIndex: number
    awbIndex: number
  } | null>(null)
  const [selectedAWBKeys, setSelectedAWBKeys] = useState<Set<string>>(new Set())
  const { sendToFlightAssignment, flightAssignments, addSentBCR } = useLoadPlans()
  const [loadPlanChanges, setLoadPlanChanges] = useState<Map<number, LoadPlanChange>>(new Map())
  const [loadPlanId, setLoadPlanId] = useState<string | null>(null)
  const [deletedItems, setDeletedItems] = useState<AWBRow[]>([]) // Deleted items from original load plan
  
  // Load ULD entries from localStorage initially (for immediate display)
  // Then fetch from Supabase to ensure we have the latest data synced across devices
  const [uldEntriesFromStorage, setUldEntriesFromStorage] = useState<Map<string, ULDEntry[]>>(() => {
    return getULDEntriesFromStorage(loadPlan.flight, loadPlan.sectors)
  })
  
  // Track entries specifically from Supabase (not localStorage) for extra ULD calculation
  // This prevents showing "extra" ULDs from old/auto-initialized localStorage data
  const [supabaseEntries, setSupabaseEntries] = useState<Map<string, ULDEntry[]>>(new Map())
  
  // AWB status tracking for shift handover (loaded/offloaded status)
  const [awbStatusMap, setAwbStatusMap] = useState<Map<string, AWBStatus>>(new Map())
  const { currentUser } = useUser()
  const staffName = currentUser?.name || "Unknown"
  
  // Fetch ULD entries from Supabase on mount (for cross-device sync)
  useEffect(() => {
    const fetchULDEntriesFromDB = async () => {
      try {
        const entries = await getULDEntriesFromSupabase(loadPlan.flight, loadPlan.sectors)
        // Always set supabaseEntries (even if empty) to track what's actually in DB
        setSupabaseEntries(entries)
        if (entries.size > 0) {
          setUldEntriesFromStorage(entries)
          console.log(`[LoadPlanDetail] Loaded ${entries.size} ULD sections from Supabase for ${loadPlan.flight}`)
        }
      } catch (error) {
        console.error(`[LoadPlanDetail] Error fetching ULD entries from Supabase:`, error)
      }
    }
    
    fetchULDEntriesFromDB()
  }, [loadPlan.flight])
  
  // Fetch AWB statuses from Supabase on mount (for shift handover tracking)
  useEffect(() => {
    const fetchAWBStatuses = async () => {
      try {
        const statuses = await getAWBStatusesFromSupabase(loadPlan.flight)
        if (statuses.size > 0) {
          setAwbStatusMap(statuses)
          console.log(`[LoadPlanDetail] Loaded ${statuses.size} AWB statuses from Supabase for ${loadPlan.flight}`)
        }
      } catch (error) {
        console.error(`[LoadPlanDetail] Error fetching AWB statuses:`, error)
      }
    }
    
    fetchAWBStatuses()
  }, [loadPlan.flight])
  
  // Fetch load plan changes on mount
  useEffect(() => {
    const fetchChanges = async () => {
      if (!loadPlan.revision || loadPlan.revision <= 1) {
        // No changes for revision 1
        return
      }
      
      try {
        const supabase = createClient()
        // Get load plan ID from database
        const { data: loadPlanData } = await supabase
          .from("load_plans")
          .select("id")
          .eq("flight_number", loadPlan.flight)
          .order("revision", { ascending: false })
          .limit(1)
          .single()
        
        if (loadPlanData?.id) {
          setLoadPlanId(loadPlanData.id)
          const changes = await getLoadPlanChanges(loadPlanData.id, loadPlan.revision)
          
          // Create a map by serial number for quick lookup
          const changesMap = new Map<number, LoadPlanChange>()
          const deletedItemsList: AWBRow[] = []
          
          changes.forEach(change => {
            if (change.serialNumber !== undefined) {
              changesMap.set(change.serialNumber, change)
              
              // If deleted, add to deleted items list
              if (change.changeType === 'deleted' && change.originalData) {
                const deletedItem = transformDeletedItemToAWBRow(change.originalData)
                if (deletedItem) {
                  deletedItemsList.push(deletedItem)
                }
              }
            }
          })
          
          setLoadPlanChanges(changesMap)
          setDeletedItems(deletedItemsList)
        }
      } catch (error) {
        console.error("[LoadPlanDetailScreen] Error fetching changes:", error)
      }
    }
    
    fetchChanges()
  }, [loadPlan.flight, loadPlan.revision])
  
  // Helper function to format arrival date time to display format (e.g., "12Oct2024 13:29/")
  // Displays in Dubai/GST timezone (UTC+4)
  const formatArrivalDateTime = (dateTimeStr: string | null): string => {
    if (!dateTimeStr) return ""
    
    try {
      const date = new Date(dateTimeStr)
      const DISPLAY_TIMEZONE = "Asia/Dubai"
      
      // Use Intl.DateTimeFormat to get parts in Dubai timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: DISPLAY_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      
      const parts = formatter.formatToParts(date)
      const getPart = (type: string) => parts.find(p => p.type === type)?.value || ""
      
      const day = getPart("day")
      const monthIndex = parseInt(getPart("month"), 10) - 1
      const year = getPart("year")
      const hours = getPart("hour")
      const minutes = getPart("minute")
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return `${day}${monthNames[monthIndex]}${year} ${hours}:${minutes}/`
    } catch {
      return dateTimeStr
    }
  }
  
  // Helper function to transform deleted item data to AWBRow
  const transformDeletedItemToAWBRow = (itemData: any): AWBRow | null => {
    if (!itemData) return null
    
    return {
      ser: String(itemData.serial_number || ""),
      awbNo: itemData.awb_number || "",
      orgDes: itemData.origin_destination || "",
      pcs: String(itemData.pieces || ""),
      wgt: String(itemData.weight || ""),
      vol: String(itemData.volume || ""),
      lvol: String(itemData.load_volume || ""),
      shc: itemData.special_handling_code || "",
      manDesc: itemData.manual_description || "",
      pcode: itemData.product_code_pc || "",
      pc: "",
      thc: String(itemData.total_handling_charge || ""),
      bs: itemData.booking_status || "",
      pi: itemData.priority_indicator || "",
      fltin: itemData.flight_in || "",
      arrdtTime: formatArrivalDateTime(itemData.arrival_date_time),
      qnnAqnn: itemData.quantity_aqnn || "",
      whs: itemData.warehouse_code || "",
      si: itemData.special_instructions || "",
      remarks: itemData.special_notes || "",
    }
  }
  
  const {
    editedPlan,
    setEditedPlan,
    hoveredUld,
    setHoveredUld,
    uldNumbers,
    updateULDNumbers,
    updateField,
    updateSectorField,
    updateSectorTotals,
    addNewAWBRow,
    addNewULDSection,
    addNewSector,
    deleteAWBRow,
    deleteULDSection,
    deleteSector,
    updateAWBField,
    updateULDField,
  } = useLoadPlanState(loadPlan)
  
  // Merge stored ULD entries with component state (convert uldNumbers Map to entries format)
  const mergedUldEntries = new Map<string, ULDEntry[]>()
  
  // Convert uldNumbers (Map<string, string[]>) to entries format
  uldNumbers.forEach((numbers, key) => {
    const [sectorIndexStr, uldSectionIndexStr] = key.split('-')
    const sectorIndex = parseInt(sectorIndexStr, 10)
    const uldSectionIndex = parseInt(uldSectionIndexStr, 10)
    const sector = loadPlan.sectors[sectorIndex]
    const uldSection = sector?.uldSections[uldSectionIndex]
    const { expandedTypes } = parseULDSection(uldSection?.uld || "")
    
    const entries: ULDEntry[] = numbers.map((number, index) => ({
      number: number || "",
      checked: number.trim() !== "", // Legacy: checked if number is filled
      type: expandedTypes[index] || "PMC"
    }))
    mergedUldEntries.set(key, entries)
  })
  
  // Merge with stored entries
  uldEntriesFromStorage.forEach((value, key) => {
    mergedUldEntries.set(key, value)
  })
  
  // Calculate extra ULDs added by users beyond original load plan
  // Only count entries that were EXPLICITLY saved by users to Supabase database
  // This prevents showing "extra" ULDs from old/auto-initialized localStorage data
  // Returns a map of ULD type to extra count (e.g., { PMC: 2, AKE: 1 })
  const extraUldsByType = useMemo(() => {
    const extras = new Map<string, number>()
    loadPlan.sectors.forEach((sector, sectorIndex) => {
      sector.uldSections.forEach((uldSection, uldSectionIndex) => {
        const key = `${sectorIndex}-${uldSectionIndex}`
        // Only use entries from Supabase (not localStorage) to prevent false positives
        const storedEntries = supabaseEntries.get(key) || []
        const { expandedTypes } = parseULDSection(uldSection.uld || "")
        const expectedCount = expandedTypes.length
        
        // If user saved more entries than expected, count the extra by type
        if (storedEntries.length > expectedCount) {
          // Extra entries are those beyond the expected count
          const extraEntries = storedEntries.slice(expectedCount)
          extraEntries.forEach(entry => {
            const type = entry.type || "PMC"
            extras.set(type, (extras.get(type) || 0) + 1)
          })
        }
      })
    })
    return extras
  }, [loadPlan.sectors, supabaseEntries])
  
  // Format extra ULDs for display (e.g., "+1 PMC +2 AKE")
  const extraUldsDisplay = useMemo(() => {
    if (extraUldsByType.size === 0) return ""
    const parts: string[] = []
    extraUldsByType.forEach((count, type) => {
      parts.push(`+${count} ${type}`)
    })
    return parts.join(" ")
  }, [extraUldsByType])
  
  const isReadOnly = true // All views are read-only since changes save directly to Supabase (ULD entries)
  
  // Enhanced updateULDNumbers that also saves to localStorage and Supabase
  // Preserves checked state using utility function
  const handleUpdateULDNumbers = (sectorIndex: number, uldSectionIndex: number, entries: ULDEntry[]) => {
    // Convert entries back to numbers array for backward compatibility with useLoadPlanState
    const numbers = entries.map(e => e.number)
    updateULDNumbers(sectorIndex, uldSectionIndex, numbers)
    
    const key = `${sectorIndex}-${uldSectionIndex}`
    setUldEntriesFromStorage((prev) => {
      const updated = new Map(prev)
      updated.set(key, entries)
      // Save to localStorage using utility function to ensure checked state is preserved
      // This also syncs to Supabase in background
      saveULDEntriesToStorage(loadPlan.flight, updated)
      return updated
    })
    
    // Also update supabaseEntries to keep extra ULD calculation in sync
    setSupabaseEntries((prev) => {
      const updated = new Map(prev)
      updated.set(key, entries)
      return updated
    })
    
    // Notify parent component to recalculate progress bar
    // IMPORTANT: Call this OUTSIDE the state setter to avoid "setState during render" error
    if (onULDUpdate) {
      // Use setTimeout to defer the callback to the next tick, avoiding render conflicts
      setTimeout(() => onULDUpdate(), 0)
    }
  }


  const handleHandover = async () => {
    // Helper to extract numeric flight number for normalized comparison
    const extractFlightNum = (f: string): number => {
      const match = f.match(/EK0?(\d+)/i)
      return match ? parseInt(match[1], 10) : 0
    }
    
    // Get the current staff name from flight assignments (use normalized comparison)
    const targetFlightNum = extractFlightNum(editedPlan.flight)
    const assignment = flightAssignments.find(fa => extractFlightNum(fa.flight) === targetFlightNum)
    const staffName = assignment?.name || ""
    
    console.log(`[LoadPlanDetail] handleHandover - flight: ${editedPlan.flight}, staffName: ${staffName}`)
    
    // Generate BCR data before sending
    const bcrData = generateBCRData(
      editedPlan, 
      awbComments, 
      undefined, 
      mergedUldEntries
    )
    
    // Save BCR to context
    addSentBCR({
      flight: editedPlan.flight,
      date: editedPlan.date,
      loadPlan: editedPlan,
      bcrData,
      sentAt: new Date().toISOString(),
      sentBy: staffName,
    })
    
    // Send back to flight assignment (clear assignment) - await the async function
    await sendToFlightAssignment(editedPlan.flight)
    setShowHandoverModal(false)
    
    // Navigate to buildup staff screen with the staff member
    if (onNavigateToBuildupStaff && staffName) {
      onNavigateToBuildupStaff(staffName.toLowerCase())
    } else {
      // If no staff name, just go back
      onBack()
    }
  }

  const handleHandoverReport = () => {
    // TODO: Generate/download handover report
    // For now, just close the modal
    setShowHandoverModal(false)
  }

  const handleMarkAWBLoaded = async () => {
    if (!selectedAWBForQuickAction) return
    
    const { awb, sectorIndex, uldSectionIndex } = selectedAWBForQuickAction
    const serialNumber = parseInt(awb.ser) || 0
    const statusKey = `${serialNumber}-${sectorIndex}-${uldSectionIndex}`
    
    // Update local state immediately for responsive UI
    setAwbStatusMap((prev) => {
      const updated = new Map(prev)
      updated.set(statusKey, {
        serialNumber,
        awbNumber: awb.awbNo,
        sectorIndex,
        uldSectionIndex,
        isLoaded: true,
        loadedBy: staffName,
        loadedAt: new Date().toISOString(),
        isOffloaded: false,
      })
      return updated
    })
    
    // Persist to Supabase in background
    markAWBLoaded(
      loadPlan.flight,
      serialNumber,
      awb.awbNo,
      sectorIndex,
      uldSectionIndex,
      staffName
    ).catch(error => {
      console.error(`[LoadPlanDetail] Error saving AWB loaded status:`, error)
    })
  }

  const handleMarkAWBOffload = async (remainingPieces: string, remarks: string) => {
    if (!selectedAWBForQuickAction) return
    
    const { awb, sectorIndex, uldSectionIndex } = selectedAWBForQuickAction
    const serialNumber = parseInt(awb.ser) || 0
    const pieces = parseInt(remainingPieces) || 0
    const statusKey = `${serialNumber}-${sectorIndex}-${uldSectionIndex}`
    
    // Update local state immediately for responsive UI
    setAwbStatusMap((prev) => {
      const updated = new Map(prev)
      updated.set(statusKey, {
        serialNumber,
        awbNumber: awb.awbNo,
        sectorIndex,
        uldSectionIndex,
        isLoaded: false,
        isOffloaded: true,
        offloadPieces: pieces,
        offloadReason: remarks,
        offloadedBy: staffName,
        offloadedAt: new Date().toISOString(),
      })
      return updated
    })
    
    // Also update awbComments for BCR generation (backward compatibility)
    const comment: AWBComment = {
      awbNo: awb.awbNo,
      status: "offloaded",
      remarks: `Remaining ${remainingPieces} pieces offloaded. ${remarks || ""}`.trim(),
    }
    
    setAwbComments((prev) => {
      const existingIndex = prev.findIndex(c => c.awbNo === awb.awbNo)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = comment
        return updated
      }
      return [...prev, comment]
    })
    
    // Persist to Supabase in background
    markAWBOffloaded(
      loadPlan.flight,
      serialNumber,
      awb.awbNo,
      sectorIndex,
      uldSectionIndex,
      pieces,
      remarks,
      staffName
    ).catch(error => {
      console.error(`[LoadPlanDetail] Error saving AWB offload status:`, error)
    })
  }

  // Helper functions for bulk selection
  const getAllAWBKeys = (): Set<string> => {
    const keys = new Set<string>()
    editedPlan.sectors.forEach((sector, sectorIndex) => {
      sector.uldSections.forEach((uldSection, uldSectionIndex) => {
        uldSection.awbs.forEach((awb, awbIndex) => {
          const key = `${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`
          keys.add(key)
        })
      })
    })
    return keys
  }

  const getULDSectionAWBKeys = (sectorIndex: number, uldSectionIndex: number): Set<string> => {
    const keys = new Set<string>()
    const sector = editedPlan.sectors[sectorIndex]
    if (sector && sector.uldSections[uldSectionIndex]) {
      const uldSection = sector.uldSections[uldSectionIndex]
      uldSection.awbs.forEach((awb, awbIndex) => {
        const key = `${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`
        keys.add(key)
      })
    }
    return keys
  }

  const isAllSelected = (keys: Set<string>): boolean => {
    if (keys.size === 0) return false
    return Array.from(keys).every(key => selectedAWBKeys.has(key))
  }

  const isSomeSelected = (keys: Set<string>): boolean => {
    const selectedCount = Array.from(keys).filter(key => selectedAWBKeys.has(key)).length
    return selectedCount > 0 && selectedCount < keys.size
  }

  const handleBulkMarkLoaded = async () => {
    if (selectedAWBKeys.size === 0) return

    // Collect all AWBs to mark as loaded
    const awbsToMark: Array<{
      serialNumber: number
      awbNumber: string
      sectorIndex: number
      uldSectionIndex: number
    }> = []
    
    // Update local state immediately for responsive UI
    setAwbStatusMap((prev) => {
      const updated = new Map(prev)
      editedPlan.sectors.forEach((sector, sectorIndex) => {
        sector.uldSections.forEach((uldSection, uldSectionIndex) => {
          uldSection.awbs.forEach((awb, awbIndex) => {
            const assignmentKey = `${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`
            if (selectedAWBKeys.has(assignmentKey)) {
              const serialNumber = parseInt(awb.ser) || 0
              const statusKey = `${serialNumber}-${sectorIndex}-${uldSectionIndex}`
              
              // Add to local state
              updated.set(statusKey, {
                serialNumber,
                awbNumber: awb.awbNo,
                sectorIndex,
                uldSectionIndex,
                isLoaded: true,
                loadedBy: staffName,
                loadedAt: new Date().toISOString(),
                isOffloaded: false,
              })
              
              // Collect for bulk save
              awbsToMark.push({
                serialNumber,
                awbNumber: awb.awbNo,
                sectorIndex,
                uldSectionIndex,
              })
            }
          })
        })
      })
      return updated
    })
    
    // Clear selection
    setSelectedAWBKeys(new Set())
    
    // Persist to Supabase in background
    if (awbsToMark.length > 0) {
      bulkMarkAWBsLoaded(loadPlan.flight, awbsToMark, staffName).catch(error => {
        console.error(`[LoadPlanDetail] Error bulk saving AWB loaded status:`, error)
      })
    }
  }

  const handleToggleSelectAll = () => {
    const allKeys = getAllAWBKeys()
    if (isAllSelected(allKeys)) {
      setSelectedAWBKeys(new Set())
    } else {
      setSelectedAWBKeys(new Set(allKeys))
    }
  }

  const handleToggleULDSection = (sectorIndex: number, uldSectionIndex: number) => {
    const sectionKeys = getULDSectionAWBKeys(sectorIndex, uldSectionIndex)
    if (isAllSelected(sectionKeys)) {
      // Deselect all in this section
      setSelectedAWBKeys((prev) => {
        const updated = new Set(prev)
        sectionKeys.forEach(key => updated.delete(key))
        return updated
      })
    } else {
      // Select all in this section
      setSelectedAWBKeys((prev) => {
        const updated = new Set(prev)
        sectionKeys.forEach(key => updated.add(key))
        return updated
      })
    }
  }

  const handleToggleAWB = (assignmentKey: string) => {
    setSelectedAWBKeys((prev) => {
      const updated = new Set(prev)
      if (updated.has(assignmentKey)) {
        updated.delete(assignmentKey)
      } else {
        updated.add(assignmentKey)
      }
      return updated
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <LoadPlanHeader
        onBack={onBack}
        isReadOnly={isReadOnly}
        onGenerateBCR={isReadOnly ? () => setShowBCRModal(true) : undefined}
        onHandover={isReadOnly && !hideHandover ? () => setShowHandoverModal(true) : undefined}
        revision={editedPlan.revision}
      />

      <div className="bg-gray-50 relative">
        <FlightHeaderRow
          plan={{
            ...editedPlan,
            // Keep original ttlPlnUld for display, pass adjusted separately for strikethrough
            adjustedTtlPlnUld: loadPlan.adjustedTtlPlnUld,
          }}
          onFieldUpdate={updateField}
          isReadOnly={isReadOnly}
          extraUldsDisplay={extraUldsDisplay}
        />

        {/* Bay Numbers Table - Only for QRT List, shown after flight header */}
        {isQRTList && (arrivalBayInfo || departureBayInfo) && (
          <div className="bg-white border-b border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 w-16"></th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">STA/STD</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">FLIGHTNO</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">ORIG/DEST</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">VIA</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">ETA/ETD</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">ATA/ATD</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">A/T</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">REGN</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">POS</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">TERM</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">BELT/GATE</th>
                </tr>
              </thead>
              <tbody>
                {/* ARRIVAL Row */}
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2 text-xs font-semibold text-[#D71A21]">ARR</td>
                  <td className="px-3 py-2 text-gray-900">{arrivalBayInfo?.sta || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{arrivalBayInfo?.flightNo || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{arrivalBayInfo?.orig || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{arrivalBayInfo?.via || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{arrivalBayInfo?.eta || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{arrivalBayInfo?.ata || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{arrivalBayInfo?.acType || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{arrivalBayInfo?.regn || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{arrivalBayInfo?.pos || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{arrivalBayInfo?.term || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{arrivalBayInfo?.belt || '-'}</td>
                </tr>
                {/* DEPARTURE Row */}
                <tr>
                  <td className="px-3 py-2 text-xs font-semibold text-[#D71A21]">DEP</td>
                  <td className="px-3 py-2 text-gray-900">{departureBayInfo?.std || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{departureBayInfo?.flightNo || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{departureBayInfo?.dest || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{departureBayInfo?.via || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{departureBayInfo?.etd || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{departureBayInfo?.atd || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{departureBayInfo?.acType || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{departureBayInfo?.regn || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{departureBayInfo?.pos || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{departureBayInfo?.term || '-'}</td>
                  <td className="px-3 py-2 text-gray-900">{departureBayInfo?.gate || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Connection Time Display - For QRT List, shown after DEP row and before main table */}
        {isQRTList && (
          <div className="mx-4 mt-3 mb-2">
            <p className="text-sm text-red-700">
              <span className="font-bold">Connection Time:</span> {calculatedConnectionTime}
            </p>
          </div>
        )}

        {/* Header Warning Display - Same format as original document (NOT shown inline for QRT List - moved to bottom) */}
        {!isQRTList && editedPlan.headerWarning && (
          <div className="mx-4 mt-4 mb-2 relative">
            {/* CRITICAL Stamp Indicator - Top Right of Header Warning */}
            {editedPlan.isCritical && (
              <div className="absolute top-2 right-2 z-20 pointer-events-none">
                <img 
                  src="/images/critical.png" 
                  alt="CRITICAL Stamp" 
                  className="w-32 h-32 object-contain drop-shadow-2xl transform rotate-[-3deg]"
                  style={{
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                  }}
                />
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-center space-y-2">
                {editedPlan.headerWarning.split("\n").map((warningLine, index) => {
                  // Check if line contains "XX NO PART SHIPMENT XX"
                  const isNoPartShipment = /xx\s+no\s+part\s+shipment\s+xx/i.test(warningLine)
                  // Check if line contains station requirement
                  const isStationRequirement = warningLine.toLowerCase().includes("station requirement") || 
                                               warningLine.toLowerCase().includes("do not use")
                  
                  return (
                    <p
                      key={index}
                      className={`text-sm font-mono ${
                        isNoPartShipment 
                          ? "font-bold text-gray-900" 
                          : isStationRequirement
                          ? "text-gray-700 underline"
                          : "text-gray-700"
                      }`}
                    >
                      {warningLine}
                    </p>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* CRITICAL Stamp - Show even if no headerWarning */}
        {editedPlan.isCritical && !editedPlan.headerWarning && (
          <div className="mx-4 mt-4 mb-2 relative">
            <div className="absolute top-2 right-2 z-20 pointer-events-none">
              <img 
                src="/images/critical.png" 
                alt="CRITICAL Stamp" 
                className="w-32 h-32 object-contain drop-shadow-2xl transform rotate-[-3deg]"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                }}
              />
            </div>
          </div>
        )}

        <div className="p-4 space-y-6">
          {/* Single Combined Table for All Sectors */}
          <CombinedTable
            editedPlan={editedPlan}
            hoveredUld={hoveredUld}
            uldEntries={mergedUldEntries}
            isReadOnly={isReadOnly}
            awbComments={awbComments}
            enableBulkCheckboxes={enableBulkCheckboxes}
            selectedAWBKeys={enableBulkCheckboxes ? selectedAWBKeys : new Set()}
            getAllAWBKeys={enableBulkCheckboxes ? getAllAWBKeys : () => new Set()}
            getULDSectionAWBKeys={enableBulkCheckboxes ? getULDSectionAWBKeys : () => new Set()}
            isAllSelected={enableBulkCheckboxes ? isAllSelected : () => false}
            isSomeSelected={enableBulkCheckboxes ? isSomeSelected : () => false}
            onToggleSelectAll={enableBulkCheckboxes ? handleToggleSelectAll : () => {}}
            onToggleULDSection={enableBulkCheckboxes ? handleToggleULDSection : () => {}}
            onToggleAWB={enableBulkCheckboxes ? handleToggleAWB : () => {}}
            onAWBRowClick={(awb, sectorIndex, uldSectionIndex, awbIndex, uldType) => {
              setSelectedAWBForQuickAction({ awb, sectorIndex, uldSectionIndex, awbIndex })
              setShowQuickActionModal(true)
            }}
            onHoverUld={setHoveredUld}
            onULDSectionClick={(sectorIndex, uldSectionIndex, uld) => {
              // Don't open ULD Numbers modal for BULK ULD types - BULK is view-only
              if (uld && uld.toUpperCase().includes("BULK")) {
                return
              }
              // Get AWBs from this section to display in the modal
              const sectionAwbs = editedPlan.sectors[sectorIndex]?.uldSections[uldSectionIndex]?.awbs || []
              const awbInfos: AWBInfo[] = sectionAwbs.map(awb => ({
                awbNumber: awb.awbNo || '',
                pieces: parseInt(awb.pcs || '0', 10) || 0,
                weight: parseFloat(awb.wgt || '0') || 0,
                commodity: awb.manDesc || undefined
              }))
              setSelectedULDSection({ sectorIndex, uldSectionIndex, uld, awbs: awbInfos })
              setShowULDModal(true)
            }}
            isQRTList={isQRTList}
            calculatedConnectionTime={calculatedConnectionTime}
            onUpdateAWBField={updateAWBField}
            onUpdateULDField={updateULDField}
            onAddNewAWBRow={addNewAWBRow}
            onDeleteAWBRow={deleteAWBRow}
            onAddNewULDSection={addNewULDSection}
            onDeleteULDSection={deleteULDSection}
            onUpdateSectorField={updateSectorField}
            onUpdateSectorTotals={updateSectorTotals}
            setEditedPlan={setEditedPlan}
            workAreaFilter={workAreaFilter}
            pilPerSubFilter={pilPerSubFilter}
            loadPlanChanges={loadPlanChanges}
            deletedItems={deletedItems}
            awbStatusMap={awbStatusMap}
          />

          {/* Bottom Footer */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
              <span>PREPARED BY:</span>
              <EditableField
                value={editedPlan.preparedBy}
                onChange={(value) => updateField("preparedBy", value)}
                className="text-sm text-gray-700 min-w-[100px]"
                readOnly={isReadOnly}
              />
              <span>PREPARED ON:</span>
              <EditableField
                value={editedPlan.preparedOn}
                onChange={(value) => updateField("preparedOn", value)}
                className="text-sm text-gray-700 min-w-[150px]"
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isReadOnly && (
        <BCRModal
          isOpen={showBCRModal}
          onClose={() => setShowBCRModal(false)}
          loadPlan={editedPlan}
          bcrData={generateBCRData(
            editedPlan, 
            awbComments, 
            undefined, 
            mergedUldEntries // Pass full entries with checked state for future use
          )}
        />
      )}

      {isReadOnly && (
        <HandoverModal
          isOpen={showHandoverModal}
          onClose={() => setShowHandoverModal(false)}
          loadPlan={editedPlan}
          onHandover={handleHandover}
          onHandoverReport={handleHandoverReport}
        />
      )}

      {selectedULDSection && (
        <ULDNumberModal
          isOpen={showULDModal}
          onClose={() => {
            setShowULDModal(false)
            setSelectedULDSection(null)
          }}
          uldSection={selectedULDSection.uld}
          sectorIndex={selectedULDSection.sectorIndex}
          uldSectionIndex={selectedULDSection.uldSectionIndex}
          awbsInSection={selectedULDSection.awbs}
          initialNumbers={mergedUldEntries.get(`${selectedULDSection.sectorIndex}-${selectedULDSection.uldSectionIndex}`)?.map(e => e.number) || []}
          initialChecked={mergedUldEntries.get(`${selectedULDSection.sectorIndex}-${selectedULDSection.uldSectionIndex}`)?.map(e => e.checked)}
          initialTypes={mergedUldEntries.get(`${selectedULDSection.sectorIndex}-${selectedULDSection.uldSectionIndex}`)?.map(e => e.type)}
          initialWorkTypes={mergedUldEntries.get(`${selectedULDSection.sectorIndex}-${selectedULDSection.uldSectionIndex}`)?.map(e => e.workType || null)}
          onSave={(entries) => {
            handleUpdateULDNumbers(selectedULDSection.sectorIndex, selectedULDSection.uldSectionIndex, entries)
          }}
        />
      )}
      {selectedAWBForQuickAction && (
        <AWBSplitOffloadModal
          isOpen={showQuickActionModal}
          onClose={() => {
            setShowQuickActionModal(false)
            setSelectedAWBForQuickAction(null)
          }}
          awb={selectedAWBForQuickAction.awb}
          onMarkLoaded={handleMarkAWBLoaded}
          onMarkOffload={handleMarkAWBOffload}
        />
      )}

      {/* Bulk Action Button */}
      {enableBulkCheckboxes && selectedAWBKeys.size > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={handleBulkMarkLoaded}
            className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-lg transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Mark {selectedAWBKeys.size} Selected as Fully Loaded</span>
          </button>
        </div>
      )}

      {/* Header Warning (SI:) - At bottom for QRT List */}
      {isQRTList && editedPlan.headerWarning && (
        <div className="bg-white border-t border-gray-200 p-4 mt-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-center space-y-2">
              {editedPlan.headerWarning.split("\n").map((warningLine, index) => {
                const isNoPartShipment = /xx\s+no\s+part\s+shipment\s+xx/i.test(warningLine)
                const isStationRequirement = warningLine.toLowerCase().includes("station requirement") || 
                                             warningLine.toLowerCase().includes("do not use")
                
                return (
                  <p
                    key={index}
                    className={`text-sm font-mono ${
                      isNoPartShipment 
                        ? "font-bold text-gray-900" 
                        : isStationRequirement
                        ? "text-gray-700 underline"
                        : "text-gray-700"
                    }`}
                  >
                    {warningLine}
                  </p>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Special Instructions (remarks) - At bottom for QRT List */}
      {isQRTList && editedPlan.remarks && editedPlan.remarks.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">SPECIAL INSTRUCTIONS</h4>
          <div className="space-y-1">
            {editedPlan.remarks.map((remark, index) => (
              <EditableField
                key={index}
                value={remark}
                onChange={(value) => {
                  setEditedPlan((prev) => {
                    const updatedRemarks = [...(prev.remarks || [])]
                    updatedRemarks[index] = value
                    return { ...prev, remarks: updatedRemarks }
                  })
                }}
                className="text-xs text-gray-900 block w-full"
                multiline
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Combined Table Component - All sectors in one table
interface CombinedTableProps {
  editedPlan: LoadPlanDetail
  hoveredUld: string | null
  uldEntries: Map<string, ULDEntry[]>
  isReadOnly: boolean
  awbComments: AWBComment[]
  enableBulkCheckboxes: boolean
  selectedAWBKeys: Set<string>
  getAllAWBKeys: () => Set<string>
  getULDSectionAWBKeys: (sectorIndex: number, uldSectionIndex: number) => Set<string>
  isAllSelected: (keys: Set<string>) => boolean
  isSomeSelected: (keys: Set<string>) => boolean
  onToggleSelectAll: () => void
  onToggleULDSection: (sectorIndex: number, uldSectionIndex: number) => void
  onToggleAWB: (assignmentKey: string) => void
  onAWBRowClick: (awb: AWBRow, sectorIndex: number, uldSectionIndex: number, awbIndex: number, uldType: string) => void
  onHoverUld: (uld: string | null) => void
  onULDSectionClick: (sectorIndex: number, uldSectionIndex: number, uld: string) => void
  onUpdateAWBField: (sectorIndex: number, uldSectionIndex: number, awbIndex: number, field: keyof AWBRow, value: string) => void
  onUpdateULDField: (sectorIndex: number, uldSectionIndex: number, value: string) => void
  onAddNewAWBRow: (sectorIndex: number, uldSectionIndex: number, afterAWBIndex?: number) => void
  onDeleteAWBRow: (sectorIndex: number, uldSectionIndex: number, awbIndex: number) => void
  onAddNewULDSection: (sectorIndex: number) => void
  onDeleteULDSection: (sectorIndex: number, uldSectionIndex: number) => void
  onUpdateSectorField: (sectorIndex: number, field: string, value: string) => void
  onUpdateSectorTotals: (sectorIndex: number, field: string, value: string) => void
  setEditedPlan: (updater: (prev: LoadPlanDetail) => LoadPlanDetail) => void
  workAreaFilter?: WorkArea // Filter ULD sections based on work area (SHC codes)
  pilPerSubFilter?: PilPerSubFilter // Sub-filter for PIL/PER work area (PIL only, PER only, or Both)
  isQRTList?: boolean // Show Bay Number and Connection Time columns for QRT List
  calculatedConnectionTime?: string // Calculated connection time for QRT List (ETD - ETA with fallbacks)
  loadPlanChanges?: Map<number, LoadPlanChange> // Map of serial number to change information
  deletedItems?: AWBRow[] // Deleted items from original load plan to display with strikethrough
  awbStatusMap?: Map<string, AWBStatus> // AWB status map for loaded/offloaded tracking
}

function CombinedTable({
  editedPlan,
  hoveredUld,
  uldEntries,
  isReadOnly,
  awbComments,
  enableBulkCheckboxes,
  selectedAWBKeys,
  getAllAWBKeys,
  getULDSectionAWBKeys,
  isAllSelected,
  isSomeSelected,
  onToggleSelectAll,
  onToggleULDSection,
  onToggleAWB,
  onAWBRowClick,
  onHoverUld,
  onULDSectionClick,
  onUpdateAWBField,
  onUpdateULDField,
  onAddNewAWBRow,
  onDeleteAWBRow,
  onAddNewULDSection,
  onDeleteULDSection,
  onUpdateSectorField,
  onUpdateSectorTotals,
  setEditedPlan,
  workAreaFilter,
  pilPerSubFilter,
  isQRTList = false,
  calculatedConnectionTime = "0",
  loadPlanChanges = new Map(),
  deletedItems = [],
  awbStatusMap = new Map(),
}: CombinedTableProps) {
  // CRITICAL: Flatten ALL items first, then sort GLOBALLY by additional_data DESC (red on top), then by serial_number
  // This ensures ALL items with additional_data = true appear at the top of the ENTIRE table,
  // regardless of which sector or ULD section they're in
  type FlatItem = {
    awb: AWBRow
    sectorIndex: number
    uldSectionIndex: number
    awbIndex: number
    uld: string
    sectorName: string
    isRampTransfer: boolean
  }
  
  const allItems: FlatItem[] = []
  
  editedPlan.sectors.forEach((sector, sectorIndex) => {
    const sectorName = sector.sector || "UNKNOWN"
    
    // Filter ULD sections based on workAreaFilter, tracking original indices
    const filteredUldSectionsWithIndices = sector.uldSections
      .map((uldSection, originalIndex) => ({ uldSection, originalIndex }))
      .filter(({ uldSection }) => {
        return shouldIncludeULDSection(uldSection, workAreaFilter || "All", pilPerSubFilter)
      })
    
    filteredUldSectionsWithIndices.forEach(({ uldSection, originalIndex }) => {
      uldSection.awbs.forEach((awb, awbIndex) => {
        allItems.push({
          awb,
          sectorIndex,
          uldSectionIndex: originalIndex,
          awbIndex,
          uld: uldSection.uld || "",
          sectorName,
          isRampTransfer: uldSection.isRampTransfer || false,
        })
      })
    })
  })
  
  // Group ALL items by sector (keeping red and original together in same sector)
  const itemsBySector = new Map<string, {
    regular: FlatItem[]
    rampTransfer: FlatItem[]
  }>()
  
  allItems.forEach((item) => {
    if (!itemsBySector.has(item.sectorName)) {
      itemsBySector.set(item.sectorName, { regular: [], rampTransfer: [] })
    }
    const group = itemsBySector.get(item.sectorName)!
    if (item.isRampTransfer) {
      group.rampTransfer.push(item)
    } else {
      group.regular.push(item)
    }
  })
  
  // Sort items within each sector: red items (additional_data = true) first, then by serial_number
  itemsBySector.forEach((group) => {
    const sortFn = (a: FlatItem, b: FlatItem) => {
      const aAdditional = a.awb?.additional_data === true
      const bAdditional = b.awb?.additional_data === true
      
      // FIRST PRIORITY: additional_data DESC (true first/red on top)
      if (aAdditional !== bAdditional) {
        return bAdditional ? 1 : -1 // DESC: additional_data = true first (red on top)
      }
      
      // SECOND PRIORITY: serial_number ASC (lower number first)
      const aSer = parseInt(a.awb.ser) || 0
      const bSer = parseInt(b.awb.ser) || 0
      return aSer - bSer
    }
    group.regular.sort(sortFn)
    group.rampTransfer.sort(sortFn)
  })
  
  // Convert to format for rendering
  const sectorOrder = editedPlan.sectors.map(s => s.sector || "UNKNOWN")
  
  // Prepare sectors for rendering (single list, each sector appears once)
  const sortedSectors = Array.from(itemsBySector.entries()).map(([sectorName, group]) => ({
    sectorName,
    regular: group.regular.map(item => ({
      awb: item.awb,
      sectorIndex: item.sectorIndex,
      uldSectionIndex: item.uldSectionIndex,
      awbIndex: item.awbIndex,
      uld: item.uld,
    })),
    rampTransfer: group.rampTransfer.map(item => ({
      awb: item.awb,
      sectorIndex: item.sectorIndex,
      uldSectionIndex: item.uldSectionIndex,
      awbIndex: item.awbIndex,
      uld: item.uld,
    })),
  })).sort((a, b) => {
    const aIndex = sectorOrder.indexOf(a.sectorName)
    const bIndex = sectorOrder.indexOf(b.sectorName)
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })
  
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-gray-300">
                {enableBulkCheckboxes && (
                  <th className="px-2 py-2 text-center font-semibold w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected(getAllAWBKeys())}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = isSomeSelected(getAllAWBKeys())
                        }
                      }}
                      onChange={onToggleSelectAll}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-2 py-2 text-left font-semibold">SER.</th>
                <th className="px-2 py-2 text-left font-semibold">AWB NO</th>
                <th className="px-2 py-2 text-left font-semibold">ORG/DES</th>
                <th className="px-2 py-2 text-left font-semibold">PCS</th>
                <th className="px-2 py-2 text-left font-semibold">WGT</th>
                <th className="px-2 py-2 text-left font-semibold">VOL</th>
                <th className="px-2 py-2 text-left font-semibold">LVOL</th>
                <th className="px-2 py-2 text-left font-semibold">SHC</th>
                <th className="px-2 py-2 text-left font-semibold">MAN.DESC</th>
                <th className="px-2 py-2 text-left font-semibold">PCODE</th>
                <th className="px-2 py-2 text-left font-semibold">PC</th>
                <th className="px-2 py-2 text-left font-semibold">THC</th>
                <th className="px-2 py-2 text-left font-semibold">BS</th>
                <th className="px-2 py-2 text-left font-semibold">PI</th>
                {isQRTList && (
                  <th className="px-2 py-2 text-left font-semibold bg-yellow-50">ULD Number</th>
                )}
                <th className="px-2 py-2 text-left font-semibold">FLTIN</th>
                <th className="px-2 py-2 text-left font-semibold">ARRDT.TIME</th>
                <th className="px-2 py-2 text-left font-semibold">QNN/AQNN</th>
                <th className="px-2 py-2 text-left font-semibold">WHS</th>
                <th className="px-2 py-2 text-left font-semibold">SI</th>
                <th className="px-2 py-2 text-left font-semibold w-20">Remaining</th>
                <th className="px-2 py-2 text-center font-semibold w-20">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Special Instructions - Show inline only when NOT QRT List (for QRT List, show at bottom) */}
              {!isQRTList && editedPlan.remarks && editedPlan.remarks.length > 0 && (
                <tr>
                  <td colSpan={enableBulkCheckboxes ? (isQRTList ? 23 : 22) : (isQRTList ? 22 : 21)} className="px-2 py-2 bg-gray-100 border-b border-gray-200">
                    <div className="space-y-1">
                      {editedPlan.remarks.map((remark, index) => (
                        <EditableField
                          key={index}
                          value={remark}
                          onChange={(value) => {
                            setEditedPlan((prev) => {
                              const updatedRemarks = [...(prev.remarks || [])]
                              updatedRemarks[index] = value
                              return { ...prev, remarks: updatedRemarks }
                            })
                          }}
                          className="text-xs text-gray-900 block w-full"
                          multiline
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              {/* Group by Sector - Show AWBs grouped by sector */}
              {/* CRITICAL: Red items (additional_data = true) are rendered first, then original items */}
              {sortedSectors.map((sectorData, sectorGroupIndex) => {
                const { sectorName, regular, rampTransfer } = sectorData
                const hasMultipleSectors = sortedSectors.length > 1
                const hasSectorName = sectorName && sectorName !== "UNKNOWN"
                
                return (
                  <React.Fragment key={sectorName}>
                    {/* Sector Header - show if sector name exists (even if only one sector) */}
                    {hasSectorName && (
                      <tr className="bg-blue-50 border-t-2 border-blue-200">
                        <td colSpan={enableBulkCheckboxes ? (isQRTList ? 23 : 22) : (isQRTList ? 22 : 21)} className="px-2 py-2 font-bold text-blue-900 text-center">
                          SECTOR: {sectorName}
                        </td>
                      </tr>
                    )}
                    
                    {/* Regular AWBs for this sector */}
                    {regular.map((item, index) => {
                      const { awb, sectorIndex, uldSectionIndex, awbIndex, uld } = item
                      const assignmentKey = `${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`
                      
                      // Get additional_data flag from awb item (from database)
                      // Use additional_data for styling (red if true, black if false)
                      const isAdditionalData = awb.additional_data === true
                      
                      // Check if we need to show ULD row after this AWB
                      // Only show ULD row after the LAST AWB in each ULD section
                      // This groups all AWBs under one ULD header per section
                      const nextItem = regular[index + 1]
                      const isLastInSection = !nextItem || 
                        nextItem.sectorIndex !== sectorIndex || 
                        nextItem.uldSectionIndex !== uldSectionIndex
                      const shouldShowULD = uld && uld.trim() !== "" && isLastInSection
                      
                      return (
                        <React.Fragment key={`${awb.ser}-${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}-${awb.additional_data ? 'add' : 'orig'}`}>
                          <AWBRow
                            awb={awb}
                            sectorIndex={sectorIndex}
                            uldSectionIndex={uldSectionIndex}
                            awbIndex={awbIndex}
                            assignmentKey={assignmentKey}
                            enableBulkCheckboxes={enableBulkCheckboxes}
                            isSelected={enableBulkCheckboxes ? selectedAWBKeys.has(assignmentKey) : false}
                            onToggleSelect={enableBulkCheckboxes ? () => onToggleAWB(assignmentKey) : () => {}}
                            isReadOnly={isReadOnly}
                            awbComments={awbComments}
                            onRowClick={() => onAWBRowClick(awb, sectorIndex, uldSectionIndex, awbIndex, uld)}
                            onUpdateField={(field, value) => onUpdateAWBField(sectorIndex, uldSectionIndex, awbIndex, field, value)}
                            onAddRowAfter={() => onAddNewAWBRow(sectorIndex, uldSectionIndex, awbIndex)}
                            onDeleteRow={() => onDeleteAWBRow(sectorIndex, uldSectionIndex, awbIndex)}
                            hoveredUld={hoveredUld}
                            isQRTList={isQRTList}
                            calculatedConnectionTime={calculatedConnectionTime}
                            additional_data={isAdditionalData}
                            changeInfo={loadPlanChanges.get(parseInt(awb.ser) || 0)}
                            uldType={uld}
                            awbStatus={awbStatusMap.get(`${parseInt(awb.ser) || 0}-${sectorIndex}-${uldSectionIndex}`)}
                          />
                          {shouldShowULD && (() => {
                            // Calculate extra ULDs for this specific section
                            const sectionEntries = uldEntries.get(`${sectorIndex}-${uldSectionIndex}`) || []
                            const { expandedTypes } = parseULDSection(uld)
                            const expectedCount = expandedTypes.length
                            const extraCount = Math.max(0, sectionEntries.length - expectedCount)
                            // Get the types of extra ULDs for this section
                            const extraUldsForSection = extraCount > 0 
                              ? sectionEntries.slice(expectedCount).reduce((acc, entry) => {
                                  const type = entry.type || "PMC"
                                  acc.set(type, (acc.get(type) || 0) + 1)
                                  return acc
                                }, new Map<string, number>())
                              : new Map<string, number>()
                            // Format extra ULDs display for this section (e.g., "+1 AKE")
                            const sectionExtrasDisplay = extraUldsForSection.size > 0
                              ? Array.from(extraUldsForSection.entries()).map(([type, count]) => `+${count} ${type}`).join(" ")
                              : ""
                            
                            return (
                              <ULDRow
                                uld={uld}
                                sectorIndex={sectorIndex}
                                uldSectionIndex={uldSectionIndex}
                                uldEntries={sectionEntries}
                                isReadOnly={isReadOnly}
                                enableBulkCheckboxes={enableBulkCheckboxes}
                                sectionKeys={enableBulkCheckboxes ? getULDSectionAWBKeys(sectorIndex, uldSectionIndex) : new Set()}
                                isAllSelected={enableBulkCheckboxes ? isAllSelected(getULDSectionAWBKeys(sectorIndex, uldSectionIndex)) : false}
                                isSomeSelected={enableBulkCheckboxes ? isSomeSelected(getULDSectionAWBKeys(sectorIndex, uldSectionIndex)) : false}
                                onToggleSection={enableBulkCheckboxes ? () => onToggleULDSection(sectorIndex, uldSectionIndex) : () => {}}
                                onUpdate={(value) => onUpdateULDField(sectorIndex, uldSectionIndex, value)}
                                onAddAWB={() => onAddNewAWBRow(sectorIndex, uldSectionIndex)}
                                onDelete={() => onDeleteULDSection(sectorIndex, uldSectionIndex)}
                                onClick={() => onULDSectionClick(sectorIndex, uldSectionIndex, uld)}
                                isQRTList={isQRTList}
                                extraUldsDisplay={sectionExtrasDisplay}
                              />
                            )
                          })()}
                        </React.Fragment>
                      )
                    })}
                    
                    {/* COUR/MAIL Footer Row - greyed out to indicate exclusion from TTL PLN ULD */}
                    {(editedPlan.courAllocation || editedPlan.mailAllocation) && (
                      <tr className="bg-gray-100/70 opacity-60">
                        <td colSpan={enableBulkCheckboxes ? (isQRTList ? 23 : 22) : (isQRTList ? 22 : 21)} className="px-2 py-1 text-gray-500 italic">
                          <div className="flex items-center gap-6 justify-center">
                            {editedPlan.courAllocation && (
                              <span>
                                <span className="font-semibold">COUR:</span> {editedPlan.courAllocation}
                                <span className="text-xs font-normal ml-2">(excluded from TTL PLN ULD)</span>
                              </span>
                            )}
                            {editedPlan.mailAllocation && (
                              <span>
                                <span className="font-semibold">MAIL:</span> {editedPlan.mailAllocation}
                                <span className="text-xs font-normal ml-2">(excluded from TTL PLN ULD)</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    
                    {/* Ramp Transfer AWBs for this sector - greyed out to indicate exclusion from TTL PLN ULD */}
                    {rampTransfer.length > 0 && (
                      <>
                        <tr className="bg-gray-200/70">
                          <td colSpan={enableBulkCheckboxes ? (isQRTList ? 23 : 22) : (isQRTList ? 22 : 21)} className="px-2 py-1 font-semibold text-gray-500 text-center italic">
                            ***** RAMP TRANSFER ***** <span className="text-xs font-normal">(excluded from TTL PLN ULD)</span>
                          </td>
                        </tr>
                        {rampTransfer.map((item, index) => {
                          const { awb, sectorIndex, uldSectionIndex, awbIndex, uld } = item
                          const assignmentKey = `${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`
                          
                          // For RAMP TRANSFER, each AWB has its own ULD instance - always show ULD row
                          // (Unlike regular sections where multiple AWBs share one ULD)
                          const shouldShowULD = uld && uld.trim() !== ""
                          
                          // Get additional_data flag from awb item (from database)
                          const isRampAdditionalData = awb.additional_data === true
                          
                          return (
                            <React.Fragment key={`${awb.ser}-${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}-${awb.additional_data ? 'add' : 'orig'}`}>
                              <AWBRow
                                awb={awb}
                                sectorIndex={sectorIndex}
                                uldSectionIndex={uldSectionIndex}
                                awbIndex={awbIndex}
                                assignmentKey={assignmentKey}
                                enableBulkCheckboxes={enableBulkCheckboxes}
                                isSelected={enableBulkCheckboxes ? selectedAWBKeys.has(assignmentKey) : false}
                                onToggleSelect={enableBulkCheckboxes ? () => onToggleAWB(assignmentKey) : () => {}}
                                isReadOnly={isReadOnly}
                                awbComments={awbComments}
                                onRowClick={() => onAWBRowClick(awb, sectorIndex, uldSectionIndex, awbIndex, uld)}
                                onUpdateField={(field, value) => onUpdateAWBField(sectorIndex, uldSectionIndex, awbIndex, field, value)}
                                onAddRowAfter={() => onAddNewAWBRow(sectorIndex, uldSectionIndex, awbIndex)}
                                onDeleteRow={() => onDeleteAWBRow(sectorIndex, uldSectionIndex, awbIndex)}
                                isRampTransfer
                                hoveredUld={hoveredUld}
                                isQRTList={isQRTList}
                                calculatedConnectionTime={calculatedConnectionTime}
                                additional_data={isRampAdditionalData}
                                changeInfo={loadPlanChanges.get(parseInt(awb.ser) || 0)}
                                uldType={uld}
                                awbStatus={awbStatusMap.get(`${parseInt(awb.ser) || 0}-${sectorIndex}-${uldSectionIndex}`)}
                              />
                              {shouldShowULD && (() => {
                                // Calculate extra ULDs for this specific section (ramp transfer)
                                const sectionEntries = uldEntries.get(`${sectorIndex}-${uldSectionIndex}`) || []
                                const { expandedTypes } = parseULDSection(uld)
                                const expectedCount = expandedTypes.length
                                const extraCount = Math.max(0, sectionEntries.length - expectedCount)
                                // Get the types of extra ULDs for this section
                                const extraUldsForSection = extraCount > 0 
                                  ? sectionEntries.slice(expectedCount).reduce((acc, entry) => {
                                      const type = entry.type || "PMC"
                                      acc.set(type, (acc.get(type) || 0) + 1)
                                      return acc
                                    }, new Map<string, number>())
                                  : new Map<string, number>()
                                // Format extra ULDs display for this section (e.g., "+1 AKE")
                                const sectionExtrasDisplay = extraUldsForSection.size > 0
                                  ? Array.from(extraUldsForSection.entries()).map(([type, count]) => `+${count} ${type}`).join(" ")
                                  : ""
                                
                                return (
                                  <ULDRow
                                    uld={uld}
                                    sectorIndex={sectorIndex}
                                    uldSectionIndex={uldSectionIndex}
                                    uldEntries={sectionEntries}
                                    isReadOnly={isReadOnly}
                                    enableBulkCheckboxes={enableBulkCheckboxes}
                                    sectionKeys={enableBulkCheckboxes ? getULDSectionAWBKeys(sectorIndex, uldSectionIndex) : new Set()}
                                    isAllSelected={enableBulkCheckboxes ? isAllSelected(getULDSectionAWBKeys(sectorIndex, uldSectionIndex)) : false}
                                    isSomeSelected={enableBulkCheckboxes ? isSomeSelected(getULDSectionAWBKeys(sectorIndex, uldSectionIndex)) : false}
                                    onToggleSection={enableBulkCheckboxes ? () => onToggleULDSection(sectorIndex, uldSectionIndex) : () => {}}
                                    onUpdate={(value) => onUpdateULDField(sectorIndex, uldSectionIndex, value)}
                                    onAddAWB={() => onAddNewAWBRow(sectorIndex, uldSectionIndex)}
                                    onDelete={() => onDeleteULDSection(sectorIndex, uldSectionIndex)}
                                    onClick={() => onULDSectionClick(sectorIndex, uldSectionIndex, uld)}
                                    isRampTransfer
                                    isQRTList={isQRTList}
                                    extraUldsDisplay={sectionExtrasDisplay}
                                  />
                                )
                              })()}
                            </React.Fragment>
                          )
                        })}
                      </>
                    )}
                  </React.Fragment>
                )
              })}
              
              {/* Deleted Items - Display with strikethrough */}
              {deletedItems.length > 0 && (
                <>
                  <tr className="bg-red-50 border-t-2 border-red-300">
                    <td colSpan={enableBulkCheckboxes ? (isQRTList ? 23 : 22) : (isQRTList ? 22 : 21)} className="px-2 py-2 font-bold text-red-900 text-center">
                      ***** DELETED ITEMS (FROM ORIGINAL LOAD PLAN) *****
                    </td>
                  </tr>
                  {deletedItems.map((deletedAWB, index) => {
                    const serialNo = parseInt(deletedAWB.ser) || 0
                    const changeInfo = loadPlanChanges.get(serialNo)
                    
                    return (
                      <AWBRow
                        key={`deleted-${serialNo}-${index}`}
                        awb={deletedAWB}
                        sectorIndex={-1} // Deleted items don't belong to any sector
                        uldSectionIndex={-1}
                        awbIndex={index}
                        assignmentKey={`deleted-${serialNo}-${index}`}
                        enableBulkCheckboxes={false}
                        isSelected={false}
                        onToggleSelect={() => {}}
                        isReadOnly={isReadOnly}
                        awbComments={awbComments}
                        onRowClick={() => {}}
                        onUpdateField={() => {}}
                        hoveredUld={hoveredUld}
                        isQRTList={isQRTList}
                        calculatedConnectionTime={calculatedConnectionTime}
                        changeInfo={changeInfo}
                      />
                    )
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
        {!isReadOnly && editedPlan.sectors.length > 0 && (
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={() => onAddNewULDSection(editedPlan.sectors.length - 1)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full"
            >
              <Plus className="w-4 h-4" />
              Add ULD Section
            </button>
          </div>
        )}
      </div>

      {/* Footer Info - Combined totals from all sectors */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
        {editedPlan.sectors.length > 0 && (
          <>
            {/* Show all sectors info */}
            {editedPlan.sectors.map((sector, sectorIndex) => (
              <div key={sectorIndex} className="border-b border-gray-200 pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
                <div className="text-sm text-gray-900 mb-2">
                  <span className="font-semibold">SECTOR:</span>{" "}
                  <EditableField
                    value={sector.sector}
                    onChange={(value) => onUpdateSectorField(sectorIndex, "sector", value)}
                    className="inline-block min-w-[100px]"
                    readOnly={isReadOnly}
                  />
                </div>
                <div className="text-sm text-gray-900">
                  <span className="font-semibold">BAGG</span>{" "}
                  <EditableField
                    value={sector.bagg || ""}
                    onChange={(value) => onUpdateSectorField(sectorIndex, "bagg", value)}
                    className="inline-block min-w-[200px]"
                    readOnly={isReadOnly}
                  />
                </div>
                <div className="text-sm text-gray-900">
                  <span className="font-semibold">COU</span>{" "}
                  <EditableField
                    value={sector.cou || ""}
                    onChange={(value) => onUpdateSectorField(sectorIndex, "cou", value)}
                    className="inline-block min-w-[200px]"
                    readOnly={isReadOnly}
                  />
                </div>
                <div className="text-sm text-gray-900 mt-2">
                  <span className="font-semibold">TOTALS:</span>{" "}
                  <EditableField
                    value={sector.totals.pcs}
                    onChange={(value) => onUpdateSectorTotals(sectorIndex, "pcs", value)}
                    className="inline-block min-w-[50px]"
                    readOnly={isReadOnly}
                  />{" "}
                  <EditableField
                    value={sector.totals.wgt}
                    onChange={(value) => onUpdateSectorTotals(sectorIndex, "wgt", value)}
                    className="inline-block min-w-[80px]"
                    readOnly={isReadOnly}
                  />{" "}
                  <EditableField
                    value={sector.totals.vol}
                    onChange={(value) => onUpdateSectorTotals(sectorIndex, "vol", value)}
                    className="inline-block min-w-[80px]"
                    readOnly={isReadOnly}
                  />{" "}
                  <EditableField
                    value={sector.totals.lvol}
                    onChange={(value) => onUpdateSectorTotals(sectorIndex, "lvol", value)}
                    className="inline-block min-w-[80px]"
                    readOnly={isReadOnly}
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}

// AWB Row Component
interface AWBRowProps {
  awb: AWBRow
  sectorIndex: number
  uldSectionIndex: number
  awbIndex: number
  assignmentKey: string
  enableBulkCheckboxes: boolean
  isSelected: boolean
  onToggleSelect: () => void
  isReadOnly: boolean
  awbComments?: AWBComment[]
  onRowClick?: () => void
  onUpdateField: (field: keyof AWBRow, value: string) => void
  onAddRowAfter?: () => void
  onDeleteRow?: () => void
  isRampTransfer?: boolean
  hoveredUld?: string | null
  isQRTList?: boolean
  calculatedConnectionTime?: string // Calculated connection time for QRT List
  additional_data?: boolean // Flag indicating if this item is additional data (new item added in subsequent upload)
  changeInfo?: LoadPlanChange // Change information for this AWB (added, modified, deleted)
  uldType?: string // ULD type string to determine if AWB Actions modal should open
  awbStatus?: AWBStatus // AWB loaded/offloaded status for shift handover tracking
}

function AWBRow({
  awb,
  assignmentKey,
  enableBulkCheckboxes,
  isSelected,
  onToggleSelect,
  isReadOnly,
  awbComments,
  onRowClick,
  onUpdateField,
  onAddRowAfter,
  onDeleteRow,
  isRampTransfer,
  hoveredUld,
  isQRTList = false,
  calculatedConnectionTime = "0",
  additional_data = false,
  changeInfo,
  uldType,
  awbStatus,
}: AWBRowProps) {
  // Note: BULK AWBs can still open AWB Actions modal - only ULD Number modal is blocked for BULK
  const isBulkULD = false // AWB Actions modal is always allowed
  // Extract remaining pieces from offload comments
  const getRemainingPieces = (): string | null => {
    if (!awbComments) return null
    const comment = awbComments.find((c: AWBComment) => c.awbNo === awb.awbNo && c.status === "offloaded")
    if (comment?.remarks) {
      const piecesMatch = comment.remarks.match(/Remaining\s+(\d+)\s+pieces\s+offloaded/i)
      return piecesMatch ? piecesMatch[1] : null
    }
    return null
  }
  
  const remainingPieces = getRemainingPieces()

  const awbFields: Array<{ key: keyof AWBRow; className?: string; isEditable?: boolean }> = [
    { key: "ser" },
    { key: "awbNo", className: "font-medium" },
    { key: "orgDes" },
    { key: "pcs" },
    { key: "wgt" },
    { key: "vol" },
    { key: "lvol" },
    { key: "shc" }, // End of left section (8 fields)
    { key: "manDesc" }, // Start of right section
    { key: "pcode" },
    { key: "pc" },
    { key: "thc" },
    { key: "bs" },
    { key: "pi" },
    ...(isQRTList ? [
      { key: "uldNumber" as keyof AWBRow, isEditable: true },
    ] : []),
    { key: "fltin" },
    { key: "arrdtTime" },
    { key: "qnnAqnn" },
    { key: "whs" },
    { key: "si" },
  ]

  // Split fields into left and right sections
  const leftFields = awbFields.slice(0, 8) // Up to and including SHC
  const rightFields = awbFields.slice(8) // After SHC

  // Determine styling based on change type:
  // - added: all text red (additional_data = true)
  // - modified: only modified fields red
  // - deleted: strikethrough for all text
  const isDeleted = changeInfo?.changeType === 'deleted'
  const isAdded = changeInfo?.changeType === 'added' || (awb.additional_data === true || additional_data === true)
  const isModified = changeInfo?.changeType === 'modified'
  
  // Base text color: red for added, gray for deleted, muted for ramp transfer, black for others
  const baseTextColorClass = isDeleted 
    ? "text-gray-500 line-through" 
    : isAdded 
    ? "text-red-600" 
    : isRampTransfer
    ? "text-gray-500"
    : "text-gray-900"
  
  // Helper function to check if a field was modified
  const isFieldModified = (fieldKey: string): boolean => {
    if (!isModified || !changeInfo?.fieldChanges) return false
    // Map AWBRow field names to database field names
    const fieldMap: Record<string, string> = {
      'ser': 'serial_number', // Usually not modified, but include for completeness
      'awbNo': 'awb_number',
      'orgDes': 'origin_destination',
      'pcs': 'pieces',
      'wgt': 'weight',
      'vol': 'volume',
      'lvol': 'load_volume',
      'shc': 'special_handling_code',
      'manDesc': 'manual_description',
      'pcode': 'product_code_pc',
      'pc': 'product_code_pc', // Alternative mapping
      'thc': 'total_handling_charge',
      'bs': 'booking_status',
      'pi': 'priority_indicator',
      'fltin': 'flight_in',
      'arrdtTime': 'arrival_date_time',
      'qnnAqnn': 'quantity_aqnn',
      'whs': 'warehouse_code',
      'si': 'special_instructions',
      'remarks': 'special_notes',
      'uldNumber': 'uld_allocation', // For QRT List
    }
    const dbFieldName = fieldMap[fieldKey] || fieldKey
    // Check if this field exists in fieldChanges
    const hasChange = changeInfo.fieldChanges[dbFieldName] !== undefined
    return hasChange
  }

  return (
    <>
      <tr
        className={`border-b border-gray-100 ${isRampTransfer ? "bg-gray-100/70 opacity-60" : ""} ${isDeleted ? "opacity-60" : ""} ${isReadOnly && onRowClick && !isBulkULD ? "cursor-pointer hover:bg-gray-50" : ""}`}
        data-uld-type={uldType || "none"}
        data-is-bulk={isBulkULD ? "true" : "false"}
        onClick={() => {
          // Don't open AWB Actions modal for BULK ULD types
          if (isReadOnly && onRowClick && !isBulkULD) {
            onRowClick()
          }
        }}
      >
        {/* Checkbox column */}
        {enableBulkCheckboxes && (
          <td
            className="px-2 py-1 text-center"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <label
              className="cursor-pointer flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation()
                  onToggleSelect()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer accent-green-600"
              />
            </label>
          </td>
        )}
        {/* Left section - Quick Actions (SER onwards, up to and including SHC) */}
        {leftFields.map(({ key, className }) => {
          // Remove whitespace from AWB number and ensure string type
          const rawValue = awb[key]
          const displayValue: string = key === "awbNo" 
            ? String(rawValue || "").replace(/\s+/g, "")
            : String(rawValue || "")
          
          // Check if vol ≠ lvol for highlighting
          const hasVolumeMismatch = key === "vol" || key === "lvol"
            ? (awb.vol && awb.lvol && parseFloat(awb.vol) > 0 && parseFloat(awb.lvol) > 0 && awb.vol !== awb.lvol)
            : false
          
          return (
            <td
              key={key}
              className={`px-2 py-1 ${hasVolumeMismatch ? "bg-amber-50" : ""}`}
            >
              <EditableField
                value={displayValue}
                onChange={(value) => {
                  // Remove whitespace when updating AWB number
                  const cleanedValue = key === "awbNo" ? value.replace(/\s+/g, "") : value
                  onUpdateField(key, cleanedValue)
                }}
                className={`text-xs ${
                  hasVolumeMismatch
                    ? "text-amber-600 font-semibold"
                    : isModified && isFieldModified(key) 
                    ? "text-red-600 font-semibold" 
                    : baseTextColorClass
                } ${className || ""}`}
                readOnly={isReadOnly}
              />
            </td>
          )
        })}
        
        {/* Right section - AWB Assignment (after SHC) */}
        {rightFields.map(({ key, className, isEditable }) => {
          // Remove whitespace from AWB number and ensure string type
          const rawValue = awb[key]
          const displayValue: string = key === "awbNo" 
            ? String(rawValue || "").replace(/\s+/g, "")
            : String(rawValue || "")
          
          // ULD Number field in QRT mode is always editable and visually distinct
          const isUldNumberField = key === "uldNumber" && isEditable
          const isEditableQRTField = isUldNumberField
          
          return (
            <td
              key={key}
              className={`px-2 py-1 ${isUldNumberField ? "bg-yellow-50" : ""}`}
              onClick={(e) => {
                // Don't trigger row click for editable QRT field
                if (isEditableQRTField) {
                  e.stopPropagation()
                }
              }}
            >
              {isUldNumberField ? (
                <input
                  type="text"
                  value={displayValue}
                  onChange={(e) => onUpdateField(key, e.target.value)}
                  placeholder="Enter ULD#"
                  className={`w-full px-1.5 py-0.5 text-xs border border-yellow-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 ${baseTextColorClass}`}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <EditableField
                  value={displayValue}
                  onChange={(value) => {
                    // Remove whitespace when updating AWB number
                    const cleanedValue = key === "awbNo" ? value.replace(/\s+/g, "") : value
                    onUpdateField(key, cleanedValue)
                  }}
                  className={`text-xs ${
                    isModified && isFieldModified(key) 
                      ? "text-red-600 font-semibold" 
                      : baseTextColorClass
                  } ${className || ""}`}
                  readOnly={isReadOnly}
                />
              )}
            </td>
          )
        })}
        <td className={`px-2 py-1 ${baseTextColorClass}`}>
          {remainingPieces ? (
            <span className={`text-xs font-semibold ${baseTextColorClass}`}>{remainingPieces}</span>
          ) : (
            !isReadOnly && (
              <div className="flex items-center gap-1">
                {onAddRowAfter && (
                  <button
                    onClick={onAddRowAfter}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600"
                    title="Add Row After"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
                {onDeleteRow && (
                  <button
                    onClick={onDeleteRow}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                    title="Delete Row"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          )}
        </td>
        {/* AWB Status Column */}
        <td className="px-2 py-1 text-center">
          {awbStatus?.isLoaded ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
              <CheckCircle className="w-3 h-3" />
              Loaded
            </span>
          ) : awbStatus?.isOffloaded ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
              {awbStatus.offloadPieces} pcs
            </span>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </td>
      </tr>
      {awb.remarks && (
        <tr>
          <td colSpan={isQRTList ? 22 : 21} className={`px-2 py-1 text-xs italic ${
            isModified && isFieldModified("remarks") 
              ? "text-red-600 font-semibold" 
              : baseTextColorClass
          }`}>
            <EditableField
              value={awb.remarks}
              onChange={(value) => onUpdateField("remarks", value)}
              className={`text-xs italic w-full ${
                isModified && isFieldModified("remarks") 
                  ? "text-red-600 font-semibold" 
                  : baseTextColorClass
              }`}
              multiline
              readOnly={isReadOnly}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// ULD Row Component
interface ULDRowProps {
  uld: string
  sectorIndex: number
  uldSectionIndex: number
  uldEntries: ULDEntry[]
  isReadOnly: boolean
  enableBulkCheckboxes: boolean
  sectionKeys: Set<string>
  isAllSelected: boolean
  isSomeSelected: boolean
  onToggleSection: () => void
  onUpdate: (value: string) => void
  onAddAWB: () => void
  onDelete: () => void
  onClick: () => void
  isRampTransfer?: boolean
  isQRTList?: boolean
  extraUldsDisplay?: string // Display string for extra ULDs in this section (e.g., "+1 AKE")
}

function ULDRow({ uld, uldEntries, isReadOnly, enableBulkCheckboxes, sectionKeys, isAllSelected, isSomeSelected, onToggleSection, onUpdate, onAddAWB, onDelete, onClick, isRampTransfer, isQRTList = false, extraUldsDisplay = "" }: ULDRowProps) {
  const { count, types } = parseULDSection(uld)
  const checkedEntries = uldEntries.filter(e => e.checked)
  // BULK ULD sections are view-only - don't allow opening ULD Numbers modal
  const isBulkULD = uld ? uld.toUpperCase().includes("BULK") : false
  const hasCheckedEntries = checkedEntries.length > 0
  const hasExtraUlds = extraUldsDisplay.length > 0
  
  // Extract core ULD (XX ... XX) and trailing comment with type classification
  const { core: coreULD, trailing: trailingComment, trailingType } = extractULDParts(uld)
  
  // Left side: Show checked entries
  // - With number: {type}{number}EK (e.g., "PMC12e3EK")
  // - Without number: just {type} (e.g., "AKE") to indicate it's marked as final
  const displayNumbers = checkedEntries
    .map(e => e.number.trim() !== "" ? `${e.type}${e.number.trim()}EK` : e.type)
    .join(", ")
  
  // Right side: Always show Final section (core ULD only, no trailing comment)
  // - If entries are checked with numbers: show dynamic count (XX 02PMC 01AKE XX)
  // - If no entries checked or no numbers: show core ULD section only
  const finalSection = hasCheckedEntries 
    ? formatULDSectionFromCheckedEntries(uldEntries, uld) 
    : coreULD // Show only core ULD when no entries are checked (no trailing comment)
  
  // Trailing comment truncation threshold - 65 chars covers ~90% of instructions fully
  const maxTrailingLength = 65
  const isTrailingTruncated = trailingComment.length > maxTrailingLength
  const displayTrailing = isTrailingTruncated 
    ? trailingComment.substring(0, maxTrailingLength) + "..."
    : trailingComment
  
  return (
    <tr className={`${isRampTransfer ? "bg-gray-100/70 opacity-60" : ""} ${hasExtraUlds ? "bg-orange-50" : ""}`}>
      {/* Checkbox column */}
      {enableBulkCheckboxes && (
        <td
          className="px-2 py-1 text-center"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSection()
          }}
        >
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(input) => {
              if (input) {
                input.indeterminate = isSomeSelected
              }
            }}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSection()
            }}
            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
          />
        </td>
      )}
      <td colSpan={enableBulkCheckboxes ? (isQRTList ? 21 : 20) : (isQRTList ? 22 : 21)} className="px-2 py-1 font-semibold text-gray-900 text-center relative">
        <div className="flex items-center justify-center gap-4">
          {displayNumbers && (
            <div className="group relative flex-shrink-0">
              <div className="text-xs font-normal text-gray-500 max-w-[200px] truncate pr-3 border-r border-gray-200">
                {displayNumbers}
              </div>
              <div className="absolute left-0 bottom-full mb-1.5 px-2 py-1 bg-gray-800/95 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-20">
                {displayNumbers}
                <div className="absolute top-full left-3 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-gray-800/95"></div>
              </div>
            </div>
          )}
          {/* Center: Core ULD + trailing comment inline */}
          <div 
            className={`flex-1 flex items-center justify-center gap-1 ${isReadOnly && !isBulkULD ? "cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors" : ""}`}
            onClick={isReadOnly && !isBulkULD ? onClick : undefined}
          >
            <EditableField
              value={coreULD}
              onChange={onUpdate}
              className="font-semibold text-gray-900 text-center min-w-[200px]"
              readOnly={isReadOnly}
            />
            {/* Extra ULDs indicator */}
            {hasExtraUlds && (
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-orange-500 text-white rounded whitespace-nowrap">
                {extraUldsDisplay}
              </span>
            )}
            {/* Trailing comment inline after XX - with hover tooltip for truncated text */}
            {trailingComment && (
              <div className="group/trailing relative inline-flex">
                <span className="text-xs font-normal text-gray-500 whitespace-nowrap cursor-default">
                  {displayTrailing}
                </span>
                {isTrailingTruncated && (
                  <div className="absolute left-0 bottom-full mb-1.5 px-2 py-1.5 bg-gray-800/95 text-white text-xs rounded shadow-lg opacity-0 group-hover/trailing:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-normal max-w-[400px] z-50">
                    {trailingComment}
                    <div className="absolute top-full left-4 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-800/95"></div>
                  </div>
                )}
              </div>
            )}
          </div>
          {finalSection && (
            <div className="text-xs font-normal text-gray-600 flex-shrink-0 pl-3 border-l border-gray-200">
              Final: <span className="font-mono font-semibold">{finalSection}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-1">
        {!isReadOnly && (
          <div className="flex items-center gap-1">
            <button
              onClick={onAddAWB}
              className="p-1 hover:bg-gray-100 rounded text-gray-600"
              title="Add AWB Row"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 hover:bg-red-100 rounded text-red-600"
              title="Delete ULD Section"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
