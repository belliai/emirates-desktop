"use client"

import { useState } from "react"
import React from "react"
import { Plus, Trash2 } from "lucide-react"
import BCRModal, { generateBCRData } from "./bcr-modal"
import type { AWBComment } from "./bcr-modal"
import AWBAssignmentModal, { LoadedStatusModal, type AWBAssignmentData } from "./awb-assignment-modal"
import HandoverModal from "./handover-modal"
import { LoadPlanHeader } from "./load-plan-header"
import { FlightHeaderRow } from "./flight-header-row"
import { EditableField } from "./editable-field"
import { useLoadPlanState, type AWBAssignment } from "./use-load-plan-state"
import { useLoadPlans } from "@/lib/load-plan-context"
import type { LoadPlanDetail, AWBRow } from "./load-plan-types"
import { ULDNumberModal } from "./uld-number-modal"
import { parseULDSection, formatULDSection } from "@/lib/uld-parser"
import { AWBQuickActionModal } from "./awb-quick-action-modal"

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
}

export default function LoadPlanDetailScreen({ loadPlan, onBack, onSave, onNavigateToBuildupStaff }: LoadPlanDetailScreenProps) {
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
  const { sendToFlightAssignment, flightAssignments } = useLoadPlans()
  
  // Load ULD numbers from localStorage on mount
  const [uldNumbersFromStorage, setUldNumbersFromStorage] = useState<Map<string, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`uld-numbers-${loadPlan.flight}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          return new Map(Object.entries(parsed))
        } catch (e) {
          return new Map()
        }
      }
    }
    return new Map()
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
  
  // Merge stored ULD numbers with component state
  const mergedUldNumbers = new Map(uldNumbers)
  uldNumbersFromStorage.forEach((value, key) => {
    if (!mergedUldNumbers.has(key)) {
      mergedUldNumbers.set(key, value)
    }
  })
  
  const isReadOnly = !onSave
  
  // Enhanced updateULDNumbers that also saves to localStorage
  const handleUpdateULDNumbers = (sectorIndex: number, uldSectionIndex: number, numbers: string[]) => {
    updateULDNumbers(sectorIndex, uldSectionIndex, numbers)
    const key = `${sectorIndex}-${uldSectionIndex}`
    setUldNumbersFromStorage((prev) => {
      const updated = new Map(prev)
      updated.set(key, numbers)
      // Save to localStorage
      if (typeof window !== 'undefined') {
        const toStore = Object.fromEntries(updated)
        localStorage.setItem(`uld-numbers-${loadPlan.flight}`, JSON.stringify(toStore))
      }
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

        <div className="p-4 space-y-6">
          {/* Single Combined Table for All Sectors */}
          <CombinedTable
            editedPlan={editedPlan}
            awbAssignments={awbAssignments}
            hoveredUld={hoveredUld}
            uldNumbers={mergedUldNumbers}
            isReadOnly={isReadOnly}
            awbComments={awbComments}
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
            onUpdateAWBField={updateAWBField}
            onUpdateULDField={updateULDField}
            onAddNewAWBRow={addNewAWBRow}
            onDeleteAWBRow={deleteAWBRow}
            onAddNewULDSection={addNewULDSection}
            onDeleteULDSection={deleteULDSection}
            onUpdateSectorField={updateSectorField}
            onUpdateSectorTotals={updateSectorTotals}
            setEditedPlan={setEditedPlan}
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
          bcrData={generateBCRData(editedPlan, awbComments, awbAssignments, mergedUldNumbers)}
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
          initialNumbers={mergedUldNumbers.get(`${selectedULDSection.sectorIndex}-${selectedULDSection.uldSectionIndex}`) || []}
          onSave={(numbers) => {
            handleUpdateULDNumbers(selectedULDSection.sectorIndex, selectedULDSection.uldSectionIndex, numbers)
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
    </div>
  )
}

// Combined Table Component - All sectors in one table
interface CombinedTableProps {
  editedPlan: LoadPlanDetail
  awbAssignments: Map<string, AWBAssignment>
  hoveredUld: string | null
  uldNumbers: Map<string, string[]>
  isReadOnly: boolean
  awbComments: AWBComment[]
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
}

function CombinedTable({
  editedPlan,
  awbAssignments,
  hoveredUld,
  uldNumbers,
  isReadOnly,
  awbComments,
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
}: CombinedTableProps) {
  // Collect all ULD sections from all sectors and flatten
  const allSections: Array<{
    sectorIndex: number
    uldSectionIndex: number
    uldSection: LoadPlanDetail["sectors"][0]["uldSections"][0]
    sector: LoadPlanDetail["sectors"][0]
    isRampTransfer: boolean
  }> = []

  editedPlan.sectors.forEach((sector, sectorIndex) => {
    sector.uldSections.forEach((uldSection, uldSectionIndex) => {
      allSections.push({
        sectorIndex,
        uldSectionIndex,
        uldSection,
        sector,
        isRampTransfer: uldSection.isRampTransfer || false,
      })
    })
  })

  // Separate ONLY by ramp transfer - not by sector
  const regularSections = allSections.filter((s) => !s.isRampTransfer)
  const rampTransferSections = allSections.filter((s) => s.isRampTransfer)
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-gray-300">
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
                  <td colSpan={20} className="px-2 py-2 bg-gray-100 border-b border-gray-200">
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
              {/* Regular Sections - Render AWB rows from all sectors */}
              {regularSections.map((section) => {
                const { sectorIndex, uldSectionIndex, uldSection } = section
                return (
                  <React.Fragment key={`${sectorIndex}-${uldSectionIndex}`}>
                    {uldSection.awbs.map((awb, awbIndex) => {
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
                      
                      return (
                        <React.Fragment key={awbIndex}>
                          <AWBRow
                            awb={awb}
                            sectorIndex={sectorIndex}
                            uldSectionIndex={uldSectionIndex}
                            awbIndex={awbIndex}
                            assignment={assignment}
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
                          />
                        </React.Fragment>
                      )
                    })}
                    {uldSection.uld && (
                      <ULDRow
                        uld={uldSection.uld}
                        sectorIndex={sectorIndex}
                        uldSectionIndex={uldSectionIndex}
                        uldNumbers={uldNumbers.get(`${sectorIndex}-${uldSectionIndex}`) || []}
                        isReadOnly={isReadOnly}
                        onUpdate={(value) => onUpdateULDField(sectorIndex, uldSectionIndex, value)}
                        onAddAWB={() => onAddNewAWBRow(sectorIndex, uldSectionIndex)}
                        onDelete={() => onDeleteULDSection(sectorIndex, uldSectionIndex)}
                        onClick={() => onULDSectionClick(sectorIndex, uldSectionIndex, uldSection.uld)}
                      />
                    )}
                  </React.Fragment>
                )
              })}
              {/* Ramp Transfer Sections - Similar structure */}
              {rampTransferSections.length > 0 && (
                <>
                  <tr className="bg-gray-50">
                    <td colSpan={20} className="px-2 py-1 font-semibold text-gray-900 text-center">
                      ***** RAMP TRANSFER *****
                    </td>
                  </tr>
                  {rampTransferSections.map((section) => {
                    const { sectorIndex, uldSectionIndex, uldSection } = section
                    return (
                      <React.Fragment key={`${sectorIndex}-${uldSectionIndex}`}>
                        {uldSection.uld && (
                          <ULDRow
                            uld={uldSection.uld}
                            sectorIndex={sectorIndex}
                            uldSectionIndex={uldSectionIndex}
                            uldNumbers={uldNumbers.get(`${sectorIndex}-${uldSectionIndex}`) || []}
                            isReadOnly={isReadOnly}
                            onUpdate={(value) => onUpdateULDField(sectorIndex, uldSectionIndex, value)}
                            onAddAWB={() => onAddNewAWBRow(sectorIndex, uldSectionIndex)}
                            onDelete={() => onDeleteULDSection(sectorIndex, uldSectionIndex)}
                            onClick={() => onULDSectionClick(sectorIndex, uldSectionIndex, uldSection.uld)}
                            isRampTransfer
                          />
                        )}
                        {uldSection.awbs.map((awb, awbIndex) => {
                          const assignmentKey = `${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`
                          const assignment = awbAssignments.get(assignmentKey)
                          return (
                            <AWBRow
                              key={awbIndex}
                              awb={awb}
                              sectorIndex={sectorIndex}
                              uldSectionIndex={uldSectionIndex}
                              awbIndex={awbIndex}
                              assignment={assignment}
                              isReadOnly={isReadOnly}
                              awbComments={awbComments}
                              onRowClick={() => onAWBRowClick(awb, sectorIndex, uldSectionIndex, awbIndex, assignment)}
                              onLeftSectionClick={() => onAWBLeftSectionClick(awb, sectorIndex, uldSectionIndex, awbIndex)}
                              onUpdateField={(field, value) => onUpdateAWBField(sectorIndex, uldSectionIndex, awbIndex, field, value)}
                              onAddRowAfter={() => onAddNewAWBRow(sectorIndex, uldSectionIndex, awbIndex)}
                              onDeleteRow={() => onDeleteAWBRow(sectorIndex, uldSectionIndex, awbIndex)}
                              isRampTransfer
                              hoveredUld={hoveredUld}
                            />
                          )
                        })}
                      </React.Fragment>
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
  assignment?: AWBAssignment
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
}

function AWBRow({
  awb,
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
        {/* Left section - Quick Actions (up to and including SHC) */}
        {leftFields.map(({ key, className }) => (
          <td
            key={key}
            className={`px-2 py-1 ${isReadOnly ? "cursor-pointer" : ""} ${hoveredSection === "left" && isReadOnly ? "bg-blue-50" : ""}`}
            onMouseEnter={() => isReadOnly && setHoveredSection("left")}
            onMouseLeave={() => setHoveredSection(null)}
            onClick={(e) => {
              if (isReadOnly && onLeftSectionClick) {
                e.stopPropagation()
                onLeftSectionClick()
              }
            }}
          >
            <EditableField
              value={awb[key] || ""}
              onChange={(value) => onUpdateField(key, value)}
              className={`text-xs ${className || ""}`}
              readOnly={isReadOnly}
            />
          </td>
        ))}
        
        {/* Right section - AWB Assignment (after SHC) */}
        {rightFields.map(({ key, className }) => (
          <td
            key={key}
            className={`px-2 py-1 ${isReadOnly ? "cursor-pointer" : ""} ${hoveredSection === "right" && isReadOnly ? "bg-gray-50" : ""}`}
            onMouseEnter={() => isReadOnly && setHoveredSection("right")}
            onMouseLeave={() => setHoveredSection(null)}
            onClick={(e) => {
              if (isReadOnly && onRowClick) {
                e.stopPropagation()
                onRowClick()
              }
            }}
          >
            <EditableField
              value={awb[key] || ""}
              onChange={(value) => onUpdateField(key, value)}
              className={`text-xs ${className || ""}`}
              readOnly={isReadOnly}
            />
          </td>
        ))}
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
          <td colSpan={20} className="px-2 py-1 text-xs text-gray-700 italic">
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
            <td className="px-2 py-1 pl-8 text-xs text-gray-500">
              <span className="text-gray-400">└─</span>
            </td>
            <td className="px-2 py-1 text-xs font-medium text-gray-700">{awb.awbNo}</td>
            <td className="px-2 py-1 text-xs text-gray-500">{awb.orgDes}</td>
            <td className="px-2 py-1 text-xs text-gray-700 font-semibold">{group.pieces || "-"}</td>
            <td className="px-2 py-1 text-xs text-gray-500">{groupUld || "-"}</td>
            <td className="px-2 py-1 text-xs text-gray-600 font-mono">{group.no || "-"}</td>
            <td colSpan={14} className="px-2 py-1"></td>
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
  uldNumbers: string[]
  isReadOnly: boolean
  onUpdate: (value: string) => void
  onAddAWB: () => void
  onDelete: () => void
  onClick: () => void
  isRampTransfer?: boolean
}

function ULDRow({ uld, uldNumbers, isReadOnly, onUpdate, onAddAWB, onDelete, onClick, isRampTransfer }: ULDRowProps) {
  const { count, types } = parseULDSection(uld)
  const hasULDNumbers = uldNumbers.length > 0 && uldNumbers.some(n => n.trim() !== "")
  const displayNumbers = uldNumbers.filter(n => n.trim() !== "").join(", ")
  const finalSection = hasULDNumbers ? formatULDSection(uldNumbers, uld) : null
  
  return (
    <tr className={isRampTransfer ? "bg-gray-50" : ""}>
      <td colSpan={19} className="px-2 py-1 font-semibold text-gray-900 text-center relative">
        <div className="flex items-center justify-center gap-4">
          {hasULDNumbers && (
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
