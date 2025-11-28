"use client"

import { useState } from "react"
import React from "react"
import { Plus, Trash2, CheckCircle } from "lucide-react"
import BCRModal, { generateBCRData } from "./bcr-modal"
import type { AWBComment } from "./bcr-modal"
import AWBAssignmentModal, { LoadedStatusModal, type AWBAssignmentData } from "./awb-assignment-modal"
import HandoverModal from "./handover-modal"
import { LoadPlanHeader } from "./load-plan-header"
import { FlightHeaderRow } from "./flight-header-row"
import { EditableField } from "./editable-field"
import { useLoadPlanState, type AWBAssignment } from "./use-load-plan-state"
import { useLoadPlans } from "@/lib/load-plan-context"
import type { LoadPlanDetail, AWBRow, ULDSection } from "./load-plan-types"
import { ULDNumberModal, type ULDEntry } from "./uld-number-modal"
import { parseULDSection, formatULDSection, formatULDSectionFromEntries, formatULDSectionFromCheckedEntries } from "@/lib/uld-parser"
import { getULDEntriesFromStorage, saveULDEntriesToStorage } from "@/lib/uld-storage"
import { AWBQuickActionModal } from "./awb-quick-action-modal"
import { uldSectionHasPilPerShc, type WorkArea } from "./flights-view-screen"

/**
 * Calculate total PMC and AKE from all ULD sections in the load plan
 * Returns formatted string like "05PMC/10AKE"
 */
function calculateTTLPlnUld(plan: LoadPlanDetail): string {
  let pmcCount = 0
  let akeCount = 0

  plan.sectors.forEach((sector) => {
    sector.uldSections.forEach((uldSection) => {
      if (uldSection.uld) {
        const { expandedTypes } = parseULDSection(uldSection.uld)
        expandedTypes.forEach((type) => {
          if (type === "PMC") {
            pmcCount++
          } else if (type === "AKE") {
            akeCount++
          }
        })
      }
    })
  })

  const parts: string[] = []
  if (pmcCount > 0) {
    parts.push(`${String(pmcCount).padStart(2, "0")}PMC`)
  }
  if (akeCount > 0) {
    parts.push(`${String(akeCount).padStart(2, "0")}AKE`)
  }

  return parts.length > 0 ? parts.join("/") : ""
}

// Re-export types for backward compatibility
export type { AWBRow, ULDSection, LoadPlanItem, LoadPlanDetail } from "./load-plan-types"

interface LoadPlanDetailScreenProps {
  loadPlan: LoadPlanDetail
  onBack: () => void
  onSave?: (updatedPlan: LoadPlanDetail) => void
  onNavigateToBuildupStaff?: (staffName: string) => void
  enableBulkCheckboxes?: boolean // Enable bulk checkbox functionality (default: false, true for Buildup Staff)
  workAreaFilter?: WorkArea // Filter ULD sections based on work area (SHC codes)
  isQRTList?: boolean // Show Bay Number and Connection Time columns for QRT List
}

export default function LoadPlanDetailScreen({ loadPlan, onBack, onSave, onNavigateToBuildupStaff, enableBulkCheckboxes = false, workAreaFilter, isQRTList = false }: LoadPlanDetailScreenProps) {
  const [showBCRModal, setShowBCRModal] = useState(false)
  const [showHandoverModal, setShowHandoverModal] = useState(false)
  const [awbComments, setAwbComments] = useState<AWBComment[]>([])
  const [showULDModal, setShowULDModal] = useState(false)
  const [selectedULDSection, setSelectedULDSection] = useState<{
    sectorIndex: number
    uldSectionIndex: number
    uld: string
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
  
  // Load ULD entries from localStorage on mount (supports both old format string[] and new format ULDEntry[])
  // Uses utility function to ensure checked state is preserved
  const [uldEntriesFromStorage, setUldEntriesFromStorage] = useState<Map<string, ULDEntry[]>>(() => {
    return getULDEntriesFromStorage(loadPlan.flight, loadPlan.sectors)
  })
  
  const {
    editedPlan,
    setEditedPlan,
    selectedAWB,
    setSelectedAWB,
    showAssignmentModal,
    setShowAssignmentModal,
    showLoadedModal,
    setShowLoadedModal,
    loadedAWBNo,
    setLoadedAWBNo,
    awbAssignments,
    setAwbAssignments,
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
  
  const isReadOnly = !onSave
  
  // Enhanced updateULDNumbers that also saves to localStorage
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
      saveULDEntriesToStorage(loadPlan.flight, updated)
      return updated
    })
  }

  const handleSave = () => {
    if (onSave) {
      onSave(editedPlan)
    }
    onBack()
  }

  const handleAWBRowClick = (
    awb: AWBRow,
    sectorIndex: number,
    uldSectionIndex: number,
    awbIndex: number,
    assignment: AWBAssignment | undefined
  ) => {
    if (!isReadOnly) return
    
    // For Buildup Staff (with bulk checkboxes), show Quick Actions modal instead of assignment modal
    if (enableBulkCheckboxes) {
      setSelectedAWBForQuickAction({ awb, sectorIndex, uldSectionIndex, awbIndex })
      setShowQuickActionModal(true)
      return
    }
    
    // For regular Load Plans, use assignment modal
    if (assignment?.isLoaded) {
      setLoadedAWBNo(awb.awbNo)
      setShowLoadedModal(true)
    } else {
      setSelectedAWB({ awb, sectorIndex, uldSectionIndex, awbIndex })
      setShowAssignmentModal(true)
    }
  }

  const handleAssignmentConfirm = (data: AWBAssignmentData) => {
    if (!selectedAWB) return
    
    const key = `${selectedAWB.awb.awbNo}-${selectedAWB.sectorIndex}-${selectedAWB.uldSectionIndex}-${selectedAWB.awbIndex}`
    setAwbAssignments((prev) => {
      const updated = new Map(prev)
      updated.set(key, {
        awbNo: selectedAWB.awb.awbNo,
        sectorIndex: selectedAWB.sectorIndex,
        uldSectionIndex: selectedAWB.uldSectionIndex,
        awbIndex: selectedAWB.awbIndex,
        assignmentData: data,
        isLoaded: data.isLoaded !== false,
      })
      return updated
    })
    setShowAssignmentModal(false)
    setSelectedAWB(null)
  }

  const existingUlds = Array.from(new Set(
    Array.from(awbAssignments.values())
      .map(a => {
        if (a.assignmentData.type === "single") return a.assignmentData.uld
        if (a.assignmentData.type === "existing") return a.assignmentData.existingUld
        return null
      })
      .filter((uld): uld is string => uld !== null)
  ))

  const handleHandover = () => {
    // Get the current staff name from flight assignments
    const assignment = flightAssignments.find(fa => fa.flight === editedPlan.flight)
    const staffName = assignment?.name || ""
    
    // Generate BCR data before sending
    const bcrData = generateBCRData(
      editedPlan, 
      awbComments, 
      awbAssignments, 
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
    
    // Send back to flight assignment (clear assignment)
    sendToFlightAssignment(editedPlan.flight)
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

  const handleMarkAWBLoaded = () => {
    if (!selectedAWBForQuickAction) return
    
    const { awb, sectorIndex, uldSectionIndex, awbIndex } = selectedAWBForQuickAction
    const assignmentKey = `${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`
    
    setAwbAssignments((prev) => {
      const updated = new Map(prev)
      const existing = updated.get(assignmentKey)
      if (existing) {
        updated.set(assignmentKey, {
          ...existing,
          isLoaded: true,
        })
      } else {
        updated.set(assignmentKey, {
          awbNo: awb.awbNo,
          sectorIndex,
          uldSectionIndex,
          awbIndex,
          assignmentData: { type: "single", isLoaded: true },
          isLoaded: true,
        })
      }
      return updated
    })
  }

  const handleMarkAWBOffload = (remainingPieces: string, remarks: string) => {
    if (!selectedAWBForQuickAction) return
    
    const { awb } = selectedAWBForQuickAction
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

  const handleBulkMarkLoaded = () => {
    if (selectedAWBKeys.size === 0) return

    setAwbAssignments((prev) => {
      const updated = new Map(prev)
      // Iterate through all AWBs to find matching keys
      editedPlan.sectors.forEach((sector, sectorIndex) => {
        sector.uldSections.forEach((uldSection, uldSectionIndex) => {
          uldSection.awbs.forEach((awb, awbIndex) => {
            const assignmentKey = `${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`
            if (selectedAWBKeys.has(assignmentKey)) {
              const existing = updated.get(assignmentKey)
              if (existing) {
                updated.set(assignmentKey, {
                  ...existing,
                  isLoaded: true,
                })
              } else {
                updated.set(assignmentKey, {
                  awbNo: awb.awbNo,
                  sectorIndex,
                  uldSectionIndex,
                  awbIndex,
                  assignmentData: { type: "single", isLoaded: true },
                  isLoaded: true,
                })
              }
            }
          })
        })
      })
      return updated
    })
    
    // Clear selection
    setSelectedAWBKeys(new Set())
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
        onHandover={isReadOnly ? () => setShowHandoverModal(true) : undefined}
        onSave={onSave ? handleSave : undefined}
      />

      <div className="bg-gray-50">
        <FlightHeaderRow
          plan={{
            ...editedPlan,
            ttlPlnUld: calculateTTLPlnUld(editedPlan) || editedPlan.ttlPlnUld,
          }}
          onFieldUpdate={updateField}
          isReadOnly={isReadOnly}
        />

        {/* Header Warning Display - Same format as original document */}
        {editedPlan.headerWarning && (
          <div className="mx-4 mt-4 mb-2">
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

        <div className="p-4 space-y-6">
          {/* Single Combined Table for All Sectors */}
          <CombinedTable
            editedPlan={editedPlan}
            awbAssignments={awbAssignments}
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
            onAWBRowClick={handleAWBRowClick}
            onAWBLeftSectionClick={(awb, sectorIndex, uldSectionIndex, awbIndex) => {
              setSelectedAWBForQuickAction({ awb, sectorIndex, uldSectionIndex, awbIndex })
              setShowQuickActionModal(true)
            }}
            onHoverUld={setHoveredUld}
            onULDSectionClick={(sectorIndex, uldSectionIndex, uld) => {
              setSelectedULDSection({ sectorIndex, uldSectionIndex, uld })
              setShowULDModal(true)
            }}
            isQRTList={isQRTList}
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
            awbAssignments, 
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

      {isReadOnly && selectedAWB && (
        <AWBAssignmentModal
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false)
            setSelectedAWB(null)
          }}
          awb={selectedAWB.awb}
          existingUlds={existingUlds}
          onConfirm={handleAssignmentConfirm}
        />
      )}

      {isReadOnly && (
        <LoadedStatusModal
          isOpen={showLoadedModal}
          onClose={() => {
            setShowLoadedModal(false)
            setLoadedAWBNo("")
          }}
          awbNo={loadedAWBNo}
          onCancelLoading={() => {
            setAwbAssignments((prev) => {
              const updated = new Map(prev)
              for (const [key, assignment] of updated.entries()) {
                if (assignment.awbNo === loadedAWBNo) {
                  updated.set(key, { ...assignment, isLoaded: false })
                }
              }
              return updated
            })
            setShowLoadedModal(false)
            setLoadedAWBNo("")
          }}
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
          initialNumbers={mergedUldEntries.get(`${selectedULDSection.sectorIndex}-${selectedULDSection.uldSectionIndex}`)?.map(e => e.number) || []}
          initialChecked={mergedUldEntries.get(`${selectedULDSection.sectorIndex}-${selectedULDSection.uldSectionIndex}`)?.map(e => e.checked)}
          initialTypes={mergedUldEntries.get(`${selectedULDSection.sectorIndex}-${selectedULDSection.uldSectionIndex}`)?.map(e => e.type)}
          onSave={(entries) => {
            handleUpdateULDNumbers(selectedULDSection.sectorIndex, selectedULDSection.uldSectionIndex, entries)
          }}
        />
      )}
      {selectedAWBForQuickAction && (
        <AWBQuickActionModal
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
    </div>
  )
}

// Combined Table Component - All sectors in one table
interface CombinedTableProps {
  editedPlan: LoadPlanDetail
  awbAssignments: Map<string, AWBAssignment>
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
  onAWBRowClick: (awb: AWBRow, sectorIndex: number, uldSectionIndex: number, awbIndex: number, assignment: AWBAssignment | undefined) => void
  onAWBLeftSectionClick: (awb: AWBRow, sectorIndex: number, uldSectionIndex: number, awbIndex: number) => void
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
  isQRTList?: boolean // Show Bay Number and Connection Time columns for QRT List
}

function CombinedTable({
  editedPlan,
  awbAssignments,
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
  onAWBLeftSectionClick,
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
  isQRTList = false,
}: CombinedTableProps) {
  // Group AWBs by sector first, then flatten within each sector
  // Structure: Map<sectorName, { regular: [], rampTransfer: [] }>
  const sectorGroups = new Map<string, {
    regular: Array<{
      awb: AWBRow
      sectorIndex: number
      uldSectionIndex: number
      awbIndex: number
      uld: string
    }>
    rampTransfer: Array<{
      awb: AWBRow
      sectorIndex: number
      uldSectionIndex: number
      awbIndex: number
      uld: string
    }>
  }>()

  editedPlan.sectors.forEach((sector, sectorIndex) => {
    const sectorName = sector.sector || "UNKNOWN"
    
    if (!sectorGroups.has(sectorName)) {
      sectorGroups.set(sectorName, { regular: [], rampTransfer: [] })
    }
    
    const group = sectorGroups.get(sectorName)!
    
    // Filter ULD sections based on workAreaFilter, tracking original indices
    const filteredUldSectionsWithIndices = sector.uldSections
      .map((uldSection, originalIndex) => ({ uldSection, originalIndex }))
      .filter(({ uldSection }) => {
        // If no filter or filter is "All" or "GCR", show all sections
        if (!workAreaFilter || workAreaFilter === "All" || workAreaFilter === "GCR") {
          return true
        }
        
        // For "PIL and PER" filter, only show sections that have PIL/PER SHC codes
        if (workAreaFilter === "PIL and PER") {
          return uldSectionHasPilPerShc(uldSection)
        }
        
        return true
      })
    
    filteredUldSectionsWithIndices.forEach(({ uldSection, originalIndex }) => {
      uldSection.awbs.forEach((awb, awbIndex) => {
        const item = {
          awb,
          sectorIndex,
          uldSectionIndex: originalIndex,
          awbIndex,
          uld: uldSection.uld || "",
        }
        
        if (uldSection.isRampTransfer) {
          group.rampTransfer.push(item)
        } else {
          group.regular.push(item)
        }
      })
    })
  })

  // Sort AWBs within each sector by serial number ascending
  sectorGroups.forEach((group) => {
    group.regular.sort((a, b) => {
      const aSer = parseInt(a.awb.ser) || 0
      const bSer = parseInt(b.awb.ser) || 0
      return aSer - bSer
    })
    
    group.rampTransfer.sort((a, b) => {
      const aSer = parseInt(a.awb.ser) || 0
      const bSer = parseInt(b.awb.ser) || 0
      return aSer - bSer
    })
  })
  
  // Convert to array for rendering - preserve sector order from editedPlan.sectors
  const sectorOrder = editedPlan.sectors.map(s => s.sector || "UNKNOWN")
  const sortedSectors = Array.from(sectorGroups.entries()).sort((a, b) => {
    const aIndex = sectorOrder.indexOf(a[0])
    const bIndex = sectorOrder.indexOf(b[0])
    // If sector not found in order, put at end
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
                  <>
                    <th className="px-2 py-2 text-left font-semibold">Bay Number</th>
                    <th className="px-2 py-2 text-left font-semibold">Conn. Time</th>
                  </>
                )}
                <th className="px-2 py-2 text-left font-semibold">FLTIN</th>
                <th className="px-2 py-2 text-left font-semibold">ARRDT.TIME</th>
                <th className="px-2 py-2 text-left font-semibold">QNN/AQNN</th>
                <th className="px-2 py-2 text-left font-semibold">WHS</th>
                <th className="px-2 py-2 text-left font-semibold">SI</th>
                <th className="px-2 py-2 text-left font-semibold w-20">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {/* Special Instructions - Note: Remarks update needs setEditedPlan, keeping simple for now */}
              {editedPlan.remarks && editedPlan.remarks.length > 0 && (
                <tr>
                  <td colSpan={enableBulkCheckboxes ? (isQRTList ? 23 : 21) : (isQRTList ? 22 : 20)} className="px-2 py-2 bg-gray-100 border-b border-gray-200">
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
              {sortedSectors.map(([sectorName, group], sectorGroupIndex) => {
                const hasMultipleSectors = sortedSectors.length > 1
                
                return (
                  <React.Fragment key={sectorName}>
                    {/* Sector Header - only show if multiple sectors */}
                    {hasMultipleSectors && (
                      <tr className="bg-blue-50 border-t-2 border-blue-200">
                        <td colSpan={enableBulkCheckboxes ? (isQRTList ? 23 : 21) : (isQRTList ? 22 : 20)} className="px-2 py-2 font-bold text-blue-900 text-center">
                          SECTOR: {sectorName}
                        </td>
                      </tr>
                    )}
                    
                    {/* Regular AWBs for this sector */}
                    {group.regular.map((item, index) => {
                      const { awb, sectorIndex, uldSectionIndex, awbIndex, uld } = item
                      const assignmentKey = `${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`
                      const assignment = awbAssignments.get(assignmentKey)
                      const isLoaded = assignment?.isLoaded || false
                      const assignmentUld = assignment?.assignmentData.type === "single" 
                        ? assignment.assignmentData.uld 
                        : assignment?.assignmentData.type === "existing"
                        ? assignment.assignmentData.existingUld
                        : null
                      const isHovered = !!(hoveredUld && assignmentUld && hoveredUld === assignmentUld)
                      const splitGroups = assignment?.assignmentData.type === "split" ? assignment.assignmentData.splitGroups : []
                      
                      // Check if we need to show ULD row after this AWB
                      // Show ULD row only if:
                      // 1. Current item has a ULD
                      // 2. Next item has different ULD (or is the last item in this sector)
                      const nextItem = group.regular[index + 1]
                      const shouldShowULD = uld && uld.trim() !== "" && (
                        !nextItem || 
                        nextItem.uld !== uld
                      )
                      
                      return (
                        <React.Fragment key={`${awb.ser}-${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`}>
                          <AWBRow
                            awb={awb}
                            sectorIndex={sectorIndex}
                            uldSectionIndex={uldSectionIndex}
                            awbIndex={awbIndex}
                            assignment={assignment}
                            assignmentKey={assignmentKey}
                            enableBulkCheckboxes={enableBulkCheckboxes}
                            isSelected={enableBulkCheckboxes ? selectedAWBKeys.has(assignmentKey) : false}
                            onToggleSelect={enableBulkCheckboxes ? () => onToggleAWB(assignmentKey) : () => {}}
                            isLoaded={isLoaded}
                            assignmentUld={assignmentUld}
                            isHovered={isHovered}
                            splitGroups={splitGroups || []}
                            isReadOnly={isReadOnly}
                            awbComments={awbComments}
                            onRowClick={() => onAWBRowClick(awb, sectorIndex, uldSectionIndex, awbIndex, assignment)}
                            onLeftSectionClick={() => onAWBLeftSectionClick(awb, sectorIndex, uldSectionIndex, awbIndex)}
                            onMouseEnter={() => assignmentUld && onHoverUld(assignmentUld)}
                            onMouseLeave={() => onHoverUld(null)}
                            onUpdateField={(field, value) => onUpdateAWBField(sectorIndex, uldSectionIndex, awbIndex, field, value)}
                            onAddRowAfter={() => onAddNewAWBRow(sectorIndex, uldSectionIndex, awbIndex)}
                            onDeleteRow={() => onDeleteAWBRow(sectorIndex, uldSectionIndex, awbIndex)}
                            hoveredUld={hoveredUld}
                            isQRTList={isQRTList}
                          />
                          {shouldShowULD && (
                            <ULDRow
                              uld={uld}
                              sectorIndex={sectorIndex}
                              uldSectionIndex={uldSectionIndex}
                              uldEntries={uldEntries.get(`${sectorIndex}-${uldSectionIndex}`) || []}
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
                            />
                          )}
                        </React.Fragment>
                      )
                    })}
                    
                    {/* Ramp Transfer AWBs for this sector */}
                    {group.rampTransfer.length > 0 && (
                      <>
                        <tr className="bg-gray-50">
                          <td colSpan={enableBulkCheckboxes ? (isQRTList ? 23 : 21) : (isQRTList ? 22 : 20)} className="px-2 py-1 font-semibold text-gray-900 text-center">
                            ***** RAMP TRANSFER *****
                          </td>
                        </tr>
                        {group.rampTransfer.map((item, index) => {
                          const { awb, sectorIndex, uldSectionIndex, awbIndex, uld } = item
                          const assignmentKey = `${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`
                          const assignment = awbAssignments.get(assignmentKey)
                          
                          // Check if we need to show ULD row after this AWB
                          const nextItem = group.rampTransfer[index + 1]
                          const shouldShowULD = uld && uld.trim() !== "" && (
                            !nextItem || 
                            nextItem.uld !== uld
                          )
                          
                          return (
                            <React.Fragment key={`${awb.ser}-${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`}>
                              <AWBRow
                                awb={awb}
                                sectorIndex={sectorIndex}
                                uldSectionIndex={uldSectionIndex}
                                awbIndex={awbIndex}
                                assignment={assignment}
                                assignmentKey={assignmentKey}
                                enableBulkCheckboxes={enableBulkCheckboxes}
                                isSelected={enableBulkCheckboxes ? selectedAWBKeys.has(assignmentKey) : false}
                                onToggleSelect={enableBulkCheckboxes ? () => onToggleAWB(assignmentKey) : () => {}}
                                isReadOnly={isReadOnly}
                                awbComments={awbComments}
                                onRowClick={() => onAWBRowClick(awb, sectorIndex, uldSectionIndex, awbIndex, assignment)}
                                onLeftSectionClick={() => onAWBLeftSectionClick(awb, sectorIndex, uldSectionIndex, awbIndex)}
                                onUpdateField={(field, value) => onUpdateAWBField(sectorIndex, uldSectionIndex, awbIndex, field, value)}
                                onAddRowAfter={() => onAddNewAWBRow(sectorIndex, uldSectionIndex, awbIndex)}
                                onDeleteRow={() => onDeleteAWBRow(sectorIndex, uldSectionIndex, awbIndex)}
                                isRampTransfer
                                hoveredUld={hoveredUld}
                                isQRTList={isQRTList}
                              />
                              {shouldShowULD && (
                                <ULDRow
                                  uld={uld}
                                  sectorIndex={sectorIndex}
                                  uldSectionIndex={uldSectionIndex}
                                  uldEntries={uldEntries.get(`${sectorIndex}-${uldSectionIndex}`) || []}
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
                                />
                              )}
                            </React.Fragment>
                          )
                        })}
                      </>
                    )}
                  </React.Fragment>
                )
              })}
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
  assignment?: AWBAssignment
  assignmentKey: string
  enableBulkCheckboxes: boolean
  isSelected: boolean
  onToggleSelect: () => void
  isLoaded?: boolean
  assignmentUld?: string | null
  isHovered?: boolean
  splitGroups?: Array<{ id: string; no: string; pieces: string; uld?: string }>
  isReadOnly: boolean
  awbComments?: AWBComment[]
  onRowClick?: () => void
  onLeftSectionClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onUpdateField: (field: keyof AWBRow, value: string) => void
  onAddRowAfter?: () => void
  onDeleteRow?: () => void
  isRampTransfer?: boolean
  hoveredUld?: string | null
  isQRTList?: boolean
}

function AWBRow({
  awb,
  assignmentKey,
  enableBulkCheckboxes,
  isSelected,
  onToggleSelect,
  isLoaded,
  isHovered,
  splitGroups,
  isReadOnly,
  awbComments,
  onRowClick,
  onLeftSectionClick,
  onMouseEnter,
  onMouseLeave,
  onUpdateField,
  onAddRowAfter,
  onDeleteRow,
  isRampTransfer,
  hoveredUld,
  isQRTList = false,
}: AWBRowProps) {
  const [hoveredSection, setHoveredSection] = useState<"left" | "right" | null>(null)
  
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

  const awbFields: Array<{ key: keyof AWBRow; className?: string }> = [
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
      { key: "bayNumber" as keyof AWBRow },
      { key: "connTime" as keyof AWBRow },
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

  return (
    <>
      <tr
        className={`border-b border-gray-100 ${isLoaded ? "bg-gray-200 opacity-60" : isRampTransfer ? "bg-gray-50 hover:bg-gray-50" : ""} ${isHovered ? "border-l-4 border-l-red-500" : ""}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={() => {
          onMouseLeave?.()
          setHoveredSection(null)
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
          // Remove whitespace from AWB number
          const displayValue = key === "awbNo" 
            ? (awb[key] || "").replace(/\s+/g, "")
            : (awb[key] || "")
          
          return (
            <td
              key={key}
              className={`px-2 py-1 ${isReadOnly && enableBulkCheckboxes ? "cursor-pointer" : ""} ${hoveredSection === "left" && isReadOnly && enableBulkCheckboxes ? "bg-blue-50" : ""}`}
              onMouseEnter={() => isReadOnly && enableBulkCheckboxes && setHoveredSection("left")}
              onMouseLeave={() => setHoveredSection(null)}
              onClick={(e) => {
                if (isReadOnly && enableBulkCheckboxes && onLeftSectionClick) {
                  e.stopPropagation()
                  onLeftSectionClick()
                }
              }}
            >
              <EditableField
                value={displayValue}
                onChange={(value) => {
                  // Remove whitespace when updating AWB number
                  const cleanedValue = key === "awbNo" ? value.replace(/\s+/g, "") : value
                  onUpdateField(key, cleanedValue)
                }}
                className={`text-xs ${className || ""}`}
                readOnly={isReadOnly}
              />
            </td>
          )
        })}
        
        {/* Right section - AWB Assignment (after SHC) */}
        {rightFields.map(({ key, className }) => {
          // Remove whitespace from AWB number (though it shouldn't be in right section)
          const displayValue = key === "awbNo" 
            ? (awb[key] || "").replace(/\s+/g, "")
            : (awb[key] || "")
          
          return (
            <td
              key={key}
              className={`px-2 py-1 ${isReadOnly && enableBulkCheckboxes ? "cursor-pointer" : ""} ${hoveredSection === "right" && isReadOnly && enableBulkCheckboxes ? "bg-gray-50" : ""}`}
              onMouseEnter={() => isReadOnly && enableBulkCheckboxes && setHoveredSection("right")}
              onMouseLeave={() => setHoveredSection(null)}
              onClick={(e) => {
                if (isReadOnly && enableBulkCheckboxes && onRowClick) {
                  e.stopPropagation()
                  onRowClick()
                }
              }}
            >
              <EditableField
                value={displayValue}
                onChange={(value) => {
                  // Remove whitespace when updating AWB number
                  const cleanedValue = key === "awbNo" ? value.replace(/\s+/g, "") : value
                  onUpdateField(key, cleanedValue)
                }}
                className={`text-xs ${className || ""}`}
                readOnly={isReadOnly}
              />
            </td>
          )
        })}
        <td className="px-2 py-1">
          {remainingPieces ? (
            <span className="text-xs text-orange-600 font-semibold">{remainingPieces}</span>
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
      </tr>
      {awb.remarks && (
        <tr>
          <td colSpan={isQRTList ? 22 : 20} className="px-2 py-1 text-xs text-gray-700 italic">
            <EditableField
              value={awb.remarks}
              onChange={(value) => onUpdateField("remarks", value)}
              className="text-xs italic w-full"
              multiline
              readOnly={isReadOnly}
            />
          </td>
        </tr>
      )}
      {/* Split Groups */}
      {splitGroups && splitGroups.length > 0 && splitGroups.map((group) => {
        const groupUld = group.uld
        const isGroupHovered = hoveredUld === groupUld && groupUld
        return (
          <tr
            key={`split-${group.id}`}
            className={`border-b border-gray-100 bg-gray-50 ${isGroupHovered ? "border-l-4 border-l-red-500" : ""}`}
            onMouseEnter={() => groupUld && onMouseEnter?.()}
            onMouseLeave={onMouseLeave}
          >
            {enableBulkCheckboxes && <td className="px-2 py-1"></td>}
            <td className="px-2 py-1 pl-8 text-xs text-gray-500">
              <span className="text-gray-400">└─</span>
            </td>
            <td className="px-2 py-1 text-xs font-medium text-gray-700">{awb.awbNo.replace(/\s+/g, "")}</td>
            <td className="px-2 py-1 text-xs text-gray-500">{awb.orgDes}</td>
            <td className="px-2 py-1 text-xs text-gray-700 font-semibold">{group.pieces || "-"}</td>
            <td className="px-2 py-1 text-xs text-gray-500">{groupUld || "-"}</td>
            <td className="px-2 py-1 text-xs text-gray-600 font-mono">{group.no || "-"}</td>
            <td colSpan={isQRTList ? 16 : 14} className="px-2 py-1"></td>
          </tr>
        )
      })}
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
}

function ULDRow({ uld, uldEntries, isReadOnly, enableBulkCheckboxes, sectionKeys, isAllSelected, isSomeSelected, onToggleSection, onUpdate, onAddAWB, onDelete, onClick, isRampTransfer, isQRTList = false }: ULDRowProps) {
  const { count, types } = parseULDSection(uld)
  const checkedEntries = uldEntries.filter(e => e.checked)
  const hasCheckedEntries = checkedEntries.length > 0
  
  // Left side: Show checked entries as {type}{number}EK format
  const displayNumbers = checkedEntries
    .filter(e => e.number.trim() !== "")
    .map(e => `${e.type}${e.number.trim()}EK`)
    .join(", ")
  
  // Right side: Use old formatULDSection format (XX 02PMC XX) with checked entries
  const finalSection = hasCheckedEntries 
    ? formatULDSectionFromCheckedEntries(uldEntries, uld) 
    : null
  
  return (
    <tr className={isRampTransfer ? "bg-gray-50" : ""}>
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
      <td colSpan={enableBulkCheckboxes ? (isQRTList ? 21 : 19) : (isQRTList ? 20 : 20)} className="px-2 py-1 font-semibold text-gray-900 text-center relative">
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
          <div 
            className={`flex-1 ${isReadOnly ? "cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors" : ""}`}
            onClick={isReadOnly ? onClick : undefined}
          >
            <EditableField
              value={uld}
              onChange={onUpdate}
              className="font-semibold text-gray-900 text-center min-w-[200px]"
              readOnly={isReadOnly}
            />
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
