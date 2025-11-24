"use client"

import { useState } from "react"
import React from "react"
import { Plus, Trash2 } from "lucide-react"
import BCRModal, { generateBCRData, type AWBComment } from "./bcr-modal"
import AWBAssignmentModal, { LoadedStatusModal, type AWBAssignmentData } from "./awb-assignment-modal"
import HandoverModal from "./handover-modal"
import { LoadPlanHeader } from "./load-plan-header"
import { FlightHeaderRow } from "./flight-header-row"
import { EditableField } from "./editable-field"
import { useLoadPlanState, type AWBAssignment } from "./use-load-plan-state"
import { useLoadPlans } from "@/lib/load-plan-context"
import type { LoadPlanDetail, AWBRow } from "./load-plan-types"

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
  const { sendToFlightAssignment, flightAssignments } = useLoadPlans()
  
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
  
  const isReadOnly = !onSave

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
          plan={editedPlan}
          onFieldUpdate={updateField}
          isReadOnly={isReadOnly}
        />

        <div className="p-4 space-y-6">
          {/* Sectors */}
          {editedPlan.sectors.map((sector, sectorIndex) => {
            const regularSections = sector.uldSections.filter((s) => !s.isRampTransfer)
            const rampTransferSections = sector.uldSections.filter((s) => s.isRampTransfer)

            return (
              <div key={sectorIndex} className="space-y-4">
                {/* Sector Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">SECTOR:</span>
                    <EditableField
                      value={sector.sector}
                      onChange={(value) => updateSectorField(sectorIndex, "sector", value)}
                      className="text-lg font-semibold text-gray-900 min-w-[100px]"
                      readOnly={isReadOnly}
                    />
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => deleteSector(sectorIndex)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                      title="Delete Sector"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sector Table - Keeping inline for now due to complexity */}
                <SectorTable
                  sector={sector}
                  sectorIndex={sectorIndex}
                  regularSections={regularSections}
                  rampTransferSections={rampTransferSections}
                  editedPlan={editedPlan}
                  awbAssignments={awbAssignments}
                  hoveredUld={hoveredUld}
                  isReadOnly={isReadOnly}
                  onAWBRowClick={handleAWBRowClick}
                  onHoverUld={setHoveredUld}
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
              </div>
            )
          })}

          {/* Add New Sector Button */}
          {!isReadOnly && (
            <button
              onClick={addNewSector}
              className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-[#D71A21] hover:bg-red-50 transition-colors w-full"
            >
              <Plus className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Add New Sector</span>
            </button>
          )}

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
          bcrData={generateBCRData(editedPlan, awbComments)}
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
    </div>
  )
}

// Sector Table Component - Extracted but kept in same file for now
interface SectorTableProps {
  sector: LoadPlanDetail["sectors"][0]
  sectorIndex: number
  regularSections: typeof sector.uldSections
  rampTransferSections: typeof sector.uldSections
  editedPlan: LoadPlanDetail
  awbAssignments: Map<string, AWBAssignment>
  hoveredUld: string | null
  isReadOnly: boolean
  onAWBRowClick: (awb: AWBRow, sectorIndex: number, uldSectionIndex: number, awbIndex: number, assignment: AWBAssignment | undefined) => void
  onHoverUld: (uld: string | null) => void
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

function SectorTable({
  sector,
  sectorIndex,
  regularSections,
  rampTransferSections,
  editedPlan,
  awbAssignments,
  hoveredUld,
  isReadOnly,
  onAWBRowClick,
  onHoverUld,
  onUpdateAWBField,
  onUpdateULDField,
  onAddNewAWBRow,
  onDeleteAWBRow,
  onAddNewULDSection,
  onDeleteULDSection,
  onUpdateSectorField,
  onUpdateSectorTotals,
  setEditedPlan,
}: SectorTableProps) {
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
                <th className="px-2 py-2 text-left font-semibold w-20">Actions</th>
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
              {/* Regular Sections - Render AWB rows */}
              {regularSections.map((uldSection, uldSectionIndex) => {
                const actualUldSectionIndex = sector.uldSections.indexOf(uldSection)
                return (
                  <React.Fragment key={uldSectionIndex}>
                    {uldSection.awbs.map((awb, awbIndex) => {
                      const assignmentKey = `${awb.awbNo}-${sectorIndex}-${actualUldSectionIndex}-${awbIndex}`
                      const assignment = awbAssignments.get(assignmentKey)
                      const isLoaded = assignment?.isLoaded || false
                      const assignmentUld = assignment?.assignmentData.type === "single" 
                        ? assignment.assignmentData.uld 
                        : assignment?.assignmentData.type === "existing"
                        ? assignment.assignmentData.existingUld
                        : null
                      const isHovered = hoveredUld === assignmentUld && assignmentUld
                      const splitGroups = assignment?.assignmentData.type === "split" ? assignment.assignmentData.splitGroups : []
                      
                      return (
                        <React.Fragment key={awbIndex}>
                          <AWBRow
                            awb={awb}
                            sectorIndex={sectorIndex}
                            uldSectionIndex={actualUldSectionIndex}
                            awbIndex={awbIndex}
                            assignment={assignment}
                            isLoaded={isLoaded}
                            assignmentUld={assignmentUld}
                            isHovered={isHovered}
                            splitGroups={splitGroups || []}
                            isReadOnly={isReadOnly}
                            onRowClick={() => onAWBRowClick(awb, sectorIndex, actualUldSectionIndex, awbIndex, assignment)}
                            onMouseEnter={() => assignmentUld && onHoverUld(assignmentUld)}
                            onMouseLeave={() => onHoverUld(null)}
                            onUpdateField={(field, value) => onUpdateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, field, value)}
                            onAddRowAfter={() => onAddNewAWBRow(sectorIndex, actualUldSectionIndex, awbIndex)}
                            onDeleteRow={() => onDeleteAWBRow(sectorIndex, actualUldSectionIndex, awbIndex)}
                            hoveredUld={hoveredUld}
                          />
                        </React.Fragment>
                      )
                    })}
                    {uldSection.uld && (
                      <ULDRow
                        uld={uldSection.uld}
                        sectorIndex={sectorIndex}
                        uldSectionIndex={actualUldSectionIndex}
                        isReadOnly={isReadOnly}
                        onUpdate={(value) => onUpdateULDField(sectorIndex, actualUldSectionIndex, value)}
                        onAddAWB={() => onAddNewAWBRow(sectorIndex, actualUldSectionIndex)}
                        onDelete={() => onDeleteULDSection(sectorIndex, actualUldSectionIndex)}
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
                  {rampTransferSections.map((uldSection, uldSectionIndex) => {
                    const actualUldSectionIndex = sector.uldSections.indexOf(uldSection)
                    return (
                      <React.Fragment key={uldSectionIndex}>
                        {uldSection.uld && (
                          <ULDRow
                            uld={uldSection.uld}
                            sectorIndex={sectorIndex}
                            uldSectionIndex={actualUldSectionIndex}
                            isReadOnly={isReadOnly}
                            onUpdate={(value) => onUpdateULDField(sectorIndex, actualUldSectionIndex, value)}
                            onAddAWB={() => onAddNewAWBRow(sectorIndex, actualUldSectionIndex)}
                            onDelete={() => onDeleteULDSection(sectorIndex, actualUldSectionIndex)}
                            isRampTransfer
                          />
                        )}
                        {uldSection.awbs.map((awb, awbIndex) => {
                          const assignmentKey = `${awb.awbNo}-${sectorIndex}-${actualUldSectionIndex}-${awbIndex}`
                          const assignment = awbAssignments.get(assignmentKey)
                          return (
                            <AWBRow
                              key={awbIndex}
                              awb={awb}
                              sectorIndex={sectorIndex}
                              uldSectionIndex={actualUldSectionIndex}
                              awbIndex={awbIndex}
                              assignment={assignment}
                              isReadOnly={false}
                              onUpdateField={(field, value) => onUpdateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, field, value)}
                              onAddRowAfter={() => onAddNewAWBRow(sectorIndex, actualUldSectionIndex, awbIndex)}
                              onDeleteRow={() => onDeleteAWBRow(sectorIndex, actualUldSectionIndex, awbIndex)}
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
        {!isReadOnly && (
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={() => onAddNewULDSection(sectorIndex)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full"
            >
              <Plus className="w-4 h-4" />
              Add ULD Section
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
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
        <div className="text-sm text-gray-900 mt-4">
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
  onRowClick?: () => void
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
  onRowClick,
  onMouseEnter,
  onMouseLeave,
  onUpdateField,
  onAddRowAfter,
  onDeleteRow,
  isRampTransfer,
  hoveredUld,
}: AWBRowProps) {
  const awbFields: Array<{ key: keyof AWBRow; className?: string }> = [
    { key: "ser" },
    { key: "awbNo", className: "font-medium" },
    { key: "orgDes" },
    { key: "pcs" },
    { key: "wgt" },
    { key: "vol" },
    { key: "lvol" },
    { key: "shc" },
    { key: "manDesc" },
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

  return (
    <>
      <tr
        className={`border-b border-gray-100 ${isLoaded ? "bg-gray-200 opacity-60" : isRampTransfer ? "bg-gray-50 hover:bg-gray-50" : "hover:bg-gray-50"} ${isHovered ? "border-l-4 border-l-red-500" : ""} ${isReadOnly ? "cursor-pointer" : ""}`}
        onClick={onRowClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {awbFields.map(({ key, className }) => (
          <td key={key} className="px-2 py-1">
            <EditableField
              value={awb[key] || ""}
              onChange={(value) => onUpdateField(key, value)}
              className={`text-xs ${className || ""}`}
              readOnly={isReadOnly}
            />
          </td>
        ))}
        <td className="px-2 py-1">
          {!isReadOnly && (
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
  isReadOnly: boolean
  onUpdate: (value: string) => void
  onAddAWB: () => void
  onDelete: () => void
  isRampTransfer?: boolean
}

function ULDRow({ uld, isReadOnly, onUpdate, onAddAWB, onDelete, isRampTransfer }: ULDRowProps) {
  return (
    <tr className={isRampTransfer ? "bg-gray-50" : ""}>
      <td colSpan={19} className="px-2 py-1 font-semibold text-gray-900 text-center">
        <EditableField
          value={uld}
          onChange={onUpdate}
          className="font-semibold text-gray-900 text-center min-w-[200px]"
          readOnly={isReadOnly}
        />
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
