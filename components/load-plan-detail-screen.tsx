"use client"

import { useState } from "react"
import React from "react"
import { ArrowLeft, Plane, Calendar, Package, Users, Clock, FileText, Plus, Trash2 } from "lucide-react"

export type AWBRow = {
  ser: string
  awbNo: string
  orgDes: string
  pcs: string
  wgt: string
  vol: string
  lvol: string
  shc: string
  manDesc: string
  pcode: string
  pc: string
  thc: string
  bs: string
  pi: string
  fltin: string
  arrdtTime: string
  qnnAqnn: string
  whs: string
  si: string
  remarks?: string
}

export type ULDSection = {
  uld: string
  awbs: AWBRow[]
  isRampTransfer?: boolean
}

export type LoadPlanItem = {
  type: "uld" | "awb"
  uld?: string
  awb?: AWBRow
  isRampTransfer?: boolean
}

export type LoadPlanDetail = {
  flight: string
  date: string
  acftType: string
  acftReg: string
  headerVersion: string
  pax: string
  std: string
  preparedBy: string
  ttlPlnUld: string
  uldVersion: string
  preparedOn: string
  remarks?: string[]
  sectors: {
    sector: string
    uldSections: ULDSection[]
    bagg?: string
    cou?: string
    totals: {
      pcs: string
      wgt: string
      vol: string
      lvol: string
    }
  }[]
}

interface LoadPlanDetailScreenProps {
  loadPlan: LoadPlanDetail
  onBack: () => void
  onSave?: (updatedPlan: LoadPlanDetail) => void
}

export default function LoadPlanDetailScreen({ loadPlan, onBack, onSave }: LoadPlanDetailScreenProps) {
  const [editedPlan, setEditedPlan] = useState<LoadPlanDetail>(loadPlan)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingAWB, setEditingAWB] = useState<{ sectorIndex: number; itemIndex: number } | null>(null)
  const isReadOnly = !onSave

  const updateField = (field: keyof LoadPlanDetail, value: string) => {
    setEditedPlan((prev) => ({ ...prev, [field]: value }))
  }

  const updateSectorField = (sectorIndex: number, field: string, value: string) => {
    setEditedPlan((prev) => {
      const updatedSectors = [...prev.sectors]
      updatedSectors[sectorIndex] = { ...updatedSectors[sectorIndex], [field]: value }
      return { ...prev, sectors: updatedSectors }
    })
  }

  const updateSectorTotals = (sectorIndex: number, field: string, value: string) => {
    setEditedPlan((prev) => {
      const updatedSectors = [...prev.sectors]
      updatedSectors[sectorIndex] = {
        ...updatedSectors[sectorIndex],
        totals: { ...updatedSectors[sectorIndex].totals, [field]: value },
      }
      return { ...prev, sectors: updatedSectors }
    })
  }

  const addNewAWBRow = (sectorIndex: number, uldSectionIndex: number, afterAWBIndex?: number) => {
    setEditedPlan((prev) => {
      const updatedSectors = [...prev.sectors]
      const sector = updatedSectors[sectorIndex]
      const updatedSections = [...sector.uldSections]
      const uldSection = updatedSections[uldSectionIndex]

      const newAWB: AWBRow = {
        ser: String(uldSection.awbs.length + 1).padStart(3, "0"),
        awbNo: "",
        orgDes: "",
        pcs: "",
        wgt: "",
        vol: "",
        lvol: "",
        shc: "",
        manDesc: "",
        pcode: "",
        pc: "",
        thc: "",
        bs: "",
        pi: "",
        fltin: "",
        arrdtTime: "",
        qnnAqnn: "",
        whs: "",
        si: "",
      }

      if (afterAWBIndex !== undefined) {
        updatedSections[uldSectionIndex] = {
          ...uldSection,
          awbs: [
            ...uldSection.awbs.slice(0, afterAWBIndex + 1),
            newAWB,
            ...uldSection.awbs.slice(afterAWBIndex + 1),
          ],
        }
      } else {
        updatedSections[uldSectionIndex] = {
          ...uldSection,
          awbs: [...uldSection.awbs, newAWB],
        }
      }

      updatedSectors[sectorIndex] = { ...sector, uldSections: updatedSections }
      return { ...prev, sectors: updatedSectors }
    })
  }

  const addNewULDSection = (sectorIndex: number) => {
    setEditedPlan((prev) => {
      const updatedSectors = [...prev.sectors]
      const sector = updatedSectors[sectorIndex]
      const newULDSection: ULDSection = {
        uld: "",
        awbs: [],
      }
      updatedSectors[sectorIndex] = {
        ...sector,
        uldSections: [...sector.uldSections, newULDSection],
      }
      return { ...prev, sectors: updatedSectors }
    })
  }

  const addNewSector = () => {
    setEditedPlan((prev) => {
      const newSector = {
        sector: "",
        uldSections: [] as ULDSection[],
        totals: {
          pcs: "0",
          wgt: "0",
          vol: "0",
          lvol: "0",
        },
      }
      return { ...prev, sectors: [...prev.sectors, newSector] }
    })
  }

  const deleteAWBRow = (sectorIndex: number, uldSectionIndex: number, awbIndex: number) => {
    setEditedPlan((prev) => {
      const updatedSectors = [...prev.sectors]
      const sector = updatedSectors[sectorIndex]
      const updatedSections = [...sector.uldSections]
      updatedSections[uldSectionIndex] = {
        ...updatedSections[uldSectionIndex],
        awbs: updatedSections[uldSectionIndex].awbs.filter((_, i) => i !== awbIndex),
      }
      updatedSectors[sectorIndex] = { ...sector, uldSections: updatedSections }
      return { ...prev, sectors: updatedSectors }
    })
  }

  const deleteULDSection = (sectorIndex: number, uldSectionIndex: number) => {
    setEditedPlan((prev) => {
      const updatedSectors = [...prev.sectors]
      const sector = updatedSectors[sectorIndex]
      updatedSectors[sectorIndex] = {
        ...sector,
        uldSections: sector.uldSections.filter((_, i) => i !== uldSectionIndex),
      }
      return { ...prev, sectors: updatedSectors }
    })
  }

  const deleteSector = (sectorIndex: number) => {
    setEditedPlan((prev) => ({
      ...prev,
      sectors: prev.sectors.filter((_, i) => i !== sectorIndex),
    }))
  }

  const updateAWBField = (
    sectorIndex: number,
    uldSectionIndex: number,
    awbIndex: number,
    field: keyof AWBRow,
    value: string,
  ) => {
    setEditedPlan((prev) => {
      const updatedSectors = [...prev.sectors]
      const sector = updatedSectors[sectorIndex]
      const updatedSections = [...sector.uldSections]
      const updatedAWBs = [...updatedSections[uldSectionIndex].awbs]
      updatedAWBs[awbIndex] = { ...updatedAWBs[awbIndex], [field]: value }
      updatedSections[uldSectionIndex] = { ...updatedSections[uldSectionIndex], awbs: updatedAWBs }
      updatedSectors[sectorIndex] = { ...sector, uldSections: updatedSections }
      return { ...prev, sectors: updatedSectors }
    })
  }

  const updateULDField = (sectorIndex: number, uldSectionIndex: number, value: string) => {
    setEditedPlan((prev) => {
      const updatedSectors = [...prev.sectors]
      const sector = updatedSectors[sectorIndex]
      const updatedSections = [...sector.uldSections]
      updatedSections[uldSectionIndex] = { ...updatedSections[uldSectionIndex], uld: value }
      updatedSectors[sectorIndex] = { ...sector, uldSections: updatedSections }
      return { ...prev, sectors: updatedSectors }
    })
  }

  const handleSave = () => {
    if (onSave) {
      onSave(editedPlan)
    }
    onBack()
  }
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Load Plan Detail</h1>
          </div>
          {onSave && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#D71A21] text-white rounded-lg hover:bg-[#B01419] transition-colors font-medium"
            >
              Save Changes
            </button>
          )}
        </div>
      </header>

      <div className="bg-gray-50">
        {/* Flight Header Row - Similar to list screen, showing clicked row as header */}
        <div className="bg-white border-b border-gray-200">
          {/* Header Labels Row */}
          <div className="grid grid-cols-[1fr_0.8fr_1fr_1fr_1.5fr_0.8fr_1fr_1fr] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">Flight</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">Date</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">ACFT TYPE</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">ACFT REG</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">PAX</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">STD</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">TTL PLN ULD</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">ULD Version</span>
            </div>
          </div>
          {/* Data Row - The clicked row becomes the header */}
          <div className="grid grid-cols-[1fr_0.8fr_1fr_1fr_1.5fr_0.8fr_1fr_1fr] gap-2 px-3 py-3">
            <EditableField
              value={editedPlan.flight}
              onChange={(value) => updateField("flight", value)}
              className="font-semibold text-gray-900"
              readOnly={isReadOnly}
            />
            <EditableField
              value={editedPlan.date}
              onChange={(value) => updateField("date", value)}
              className="text-gray-700"
              readOnly={isReadOnly}
            />
            <EditableField
              value={editedPlan.acftType}
              onChange={(value) => updateField("acftType", value)}
              className="text-gray-700"
              readOnly={isReadOnly}
            />
            <EditableField
              value={editedPlan.acftReg}
              onChange={(value) => updateField("acftReg", value)}
              className="text-gray-700"
              readOnly={isReadOnly}
            />
            <EditableField
              value={editedPlan.pax}
              onChange={(value) => updateField("pax", value)}
              className="text-gray-700"
              readOnly={isReadOnly}
            />
            <EditableField
              value={editedPlan.std}
              onChange={(value) => updateField("std", value)}
              className="text-gray-700"
              readOnly={isReadOnly}
            />
            <EditableField
              value={editedPlan.ttlPlnUld}
              onChange={(value) => updateField("ttlPlnUld", value)}
              className="text-gray-700"
              readOnly={isReadOnly}
            />
            <EditableField
              value={editedPlan.uldVersion}
              onChange={(value) => updateField("uldVersion", value)}
              className="text-gray-700"
              readOnly={isReadOnly}
            />
          </div>
        </div>

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

                {/* Table */}
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
                        {/* Special Instructions */}
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
                        {/* Regular Sections */}
                        {regularSections.map((uldSection, uldSectionIndex) => {
                          const actualUldSectionIndex = sector.uldSections.indexOf(uldSection)
                          return (
                            <React.Fragment key={uldSectionIndex}>
                              {uldSection.awbs.map((awb, awbIndex) => (
                                <React.Fragment key={awbIndex}>
                                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.ser}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "ser", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.awbNo}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "awbNo", value)}
                                        className="text-xs font-medium"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.orgDes}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "orgDes", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.pcs}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "pcs", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.wgt}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "wgt", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.vol}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "vol", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.lvol}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "lvol", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.shc || ""}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "shc", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.manDesc}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "manDesc", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.pcode || ""}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "pcode", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.pc || ""}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "pc", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.thc || ""}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "thc", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.bs || ""}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "bs", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.pi || ""}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "pi", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.fltin || ""}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "fltin", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.arrdtTime || ""}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "arrdtTime", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.qnnAqnn || ""}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "qnnAqnn", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.whs || ""}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "whs", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <EditableField
                                        value={awb.si || ""}
                                        onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "si", value)}
                                        className="text-xs"
                                        readOnly={isReadOnly}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      {!isReadOnly && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => addNewAWBRow(sectorIndex, actualUldSectionIndex, awbIndex)}
                                            className="p-1 hover:bg-gray-100 rounded text-gray-600"
                                            title="Add Row After"
                                          >
                                            <Plus className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => deleteAWBRow(sectorIndex, actualUldSectionIndex, awbIndex)}
                                            className="p-1 hover:bg-red-100 rounded text-red-600"
                                            title="Delete Row"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                  {awb.remarks && (
                                    <tr>
                                      <td colSpan={20} className="px-2 py-1 text-xs text-gray-700 italic">
                                        <EditableField
                                          value={awb.remarks}
                                          onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "remarks", value)}
                                          className="text-xs italic w-full"
                                          multiline
                                          readOnly={isReadOnly}
                                        />
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                              {uldSection.uld && (
                                <tr className="">
                                  <td colSpan={19} className="px-2 py-1 font-semibold text-gray-900 text-center">
                                    <EditableField
                                      value={uldSection.uld}
                                      onChange={(value) => updateULDField(sectorIndex, actualUldSectionIndex, value)}
                                      className="font-semibold text-gray-900 text-center min-w-[200px]"
                                      readOnly={isReadOnly}
                                    />
                                  </td>
                                  <td className="px-2 py-1">
                                    {!isReadOnly && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => addNewAWBRow(sectorIndex, actualUldSectionIndex)}
                                          className="p-1 hover:bg-gray-100 rounded text-gray-600"
                                          title="Add AWB Row"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => deleteULDSection(sectorIndex, actualUldSectionIndex)}
                                          className="p-1 hover:bg-red-100 rounded text-red-600"
                                          title="Delete ULD Section"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                        {/* Ramp Transfer Sections */}
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
                                    <tr className="bg-gray-50">
                                      <td colSpan={19} className="px-2 py-1 font-semibold text-gray-900 text-center">
                                        <EditableField
                                          value={uldSection.uld}
                                          onChange={(value) => updateULDField(sectorIndex, actualUldSectionIndex, value)}
                                          className="font-semibold text-gray-900 text-center min-w-[200px]"
                                          readOnly={isReadOnly}
                                        />
                                      </td>
                                      <td className="px-2 py-1">
                                        {!isReadOnly && (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => addNewAWBRow(sectorIndex, actualUldSectionIndex)}
                                              className="p-1 hover:bg-gray-100 rounded text-gray-600"
                                              title="Add AWB Row"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => deleteULDSection(sectorIndex, actualUldSectionIndex)}
                                              className="p-1 hover:bg-red-100 rounded text-red-600"
                                              title="Delete ULD Section"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                  {uldSection.awbs.map((awb, awbIndex) => (
                                    <React.Fragment key={awbIndex}>
                                      <tr className="border-b border-gray-100 hover:bg-gray-50 bg-gray-50">
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.ser}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "ser", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.awbNo}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "awbNo", value)}
                                            className="text-xs font-medium"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.orgDes}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "orgDes", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.pcs}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "pcs", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.wgt}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "wgt", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.vol}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "vol", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.lvol}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "lvol", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.shc || ""}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "shc", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.manDesc}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "manDesc", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.pcode || ""}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "pcode", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.pc || ""}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "pc", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.thc || ""}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "thc", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.bs || ""}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "bs", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.pi || ""}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "pi", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.fltin || ""}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "fltin", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.arrdtTime || ""}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "arrdtTime", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.qnnAqnn || ""}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "qnnAqnn", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.whs || ""}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "whs", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <EditableField
                                            value={awb.si || ""}
                                            onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "si", value)}
                                            className="text-xs"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => addNewAWBRow(sectorIndex, actualUldSectionIndex, awbIndex)}
                                              className="p-1 hover:bg-gray-100 rounded text-gray-600"
                                              title="Add Row After"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => deleteAWBRow(sectorIndex, actualUldSectionIndex, awbIndex)}
                                              className="p-1 hover:bg-red-100 rounded text-red-600"
                                              title="Delete Row"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                      {awb.remarks && (
                                        <tr>
                                          <td colSpan={20} className="px-2 py-1 text-xs text-gray-700 italic">
                                            <EditableField
                                              value={awb.remarks}
                                              onChange={(value) => updateAWBField(sectorIndex, actualUldSectionIndex, awbIndex, "remarks", value)}
                                              className="text-xs italic w-full"
                                              multiline
                                            />
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))}
                                  {uldSection.uld && (
                                    <tr className="bg-gray-50">
                                      <td colSpan={19} className="px-2 py-1 font-semibold text-gray-900 text-center">
                                        <EditableField
                                          value={uldSection.uld}
                                          onChange={(value) => updateULDField(sectorIndex, actualUldSectionIndex, value)}
                                          className="font-semibold text-gray-900 text-center min-w-[200px]"
                                          readOnly={isReadOnly}
                                        />
                                      </td>
                                      <td className="px-2 py-1">
                                        {!isReadOnly && (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => addNewAWBRow(sectorIndex, actualUldSectionIndex)}
                                              className="p-1 hover:bg-gray-100 rounded text-gray-600"
                                              title="Add AWB Row"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => deleteULDSection(sectorIndex, actualUldSectionIndex)}
                                              className="p-1 hover:bg-red-100 rounded text-red-600"
                                              title="Delete ULD Section"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )}
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
                        onClick={() => addNewULDSection(sectorIndex)}
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
                      onChange={(value) => updateSectorField(sectorIndex, "bagg", value)}
                      className="inline-block min-w-[200px]"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="text-sm text-gray-900">
                    <span className="font-semibold">COU</span>{" "}
                    <EditableField
                      value={sector.cou || ""}
                      onChange={(value) => updateSectorField(sectorIndex, "cou", value)}
                      className="inline-block min-w-[200px]"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="text-sm text-gray-900 mt-4">
                    <span className="font-semibold">TOTALS:</span>{" "}
                    <EditableField
                      value={sector.totals.pcs}
                      onChange={(value) => updateSectorTotals(sectorIndex, "pcs", value)}
                      className="inline-block min-w-[50px]"
                      readOnly={isReadOnly}
                    />{" "}
                    <EditableField
                      value={sector.totals.wgt}
                      onChange={(value) => updateSectorTotals(sectorIndex, "wgt", value)}
                      className="inline-block min-w-[80px]"
                      readOnly={isReadOnly}
                    />{" "}
                    <EditableField
                      value={sector.totals.vol}
                      onChange={(value) => updateSectorTotals(sectorIndex, "vol", value)}
                      className="inline-block min-w-[80px]"
                      readOnly={isReadOnly}
                    />{" "}
                    <EditableField
                      value={sector.totals.lvol}
                      onChange={(value) => updateSectorTotals(sectorIndex, "lvol", value)}
                      className="inline-block min-w-[80px]"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>
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
    </div>
  )
}

interface EditableFieldProps {
  value: string
  onChange: (value: string) => void
  className?: string
  multiline?: boolean
  readOnly?: boolean
}

function EditableField({ value, onChange, className = "", multiline = false, readOnly = false }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleBlur = () => {
    onChange(editValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleBlur()
    }
    if (e.key === "Escape") {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  if (readOnly) {
    return (
      <span className={`px-1 py-0.5 ${className}`}>
        {value || ""}
      </span>
    )
  }

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full px-2 py-1 border border-[#D71A21] rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21] ${className}`}
          autoFocus
          rows={2}
        />
      )
    }
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`px-2 py-1 border border-[#D71A21] rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21] min-w-[60px] ${className}`}
        autoFocus
      />
    )
  }

  return (
    <span
      onClick={() => {
        setEditValue(value)
        setIsEditing(true)
      }}
      className={`cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded transition-colors ${className}`}
      title="Click to edit"
    >
      {value || ""}
    </span>
  )
}

