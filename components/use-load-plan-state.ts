"use client"

import { useState } from "react"
import type { LoadPlanDetail, AWBRow, ULDSection } from "./load-plan-types"
import type { AWBAssignmentData } from "./awb-assignment-modal"

export type AWBAssignment = {
  awbNo: string
  sectorIndex: number
  uldSectionIndex: number
  awbIndex: number
  assignmentData: AWBAssignmentData
  isLoaded: boolean
}

export function useLoadPlanState(initialPlan: LoadPlanDetail) {
  // Clean AWB numbers from whitespace when initializing
  const cleanedPlan: LoadPlanDetail = {
    ...initialPlan,
    sectors: initialPlan.sectors.map((sector) => ({
      ...sector,
      uldSections: sector.uldSections.map((uldSection) => ({
        ...uldSection,
        awbs: uldSection.awbs.map((awb) => ({
          ...awb,
          awbNo: (awb.awbNo || "").replace(/\s+/g, ""), // Remove whitespace from AWB number
        })),
      })),
    })),
  }
  
  const [editedPlan, setEditedPlan] = useState<LoadPlanDetail>(cleanedPlan)
  const [selectedAWB, setSelectedAWB] = useState<{
    awb: AWBRow
    sectorIndex: number
    uldSectionIndex: number
    awbIndex: number
  } | null>(null)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [showLoadedModal, setShowLoadedModal] = useState(false)
  const [loadedAWBNo, setLoadedAWBNo] = useState<string>("")
  const [awbAssignments, setAwbAssignments] = useState<Map<string, AWBAssignment>>(new Map())
  const [hoveredUld, setHoveredUld] = useState<string | null>(null)
  // Map key: `${sectorIndex}-${uldSectionIndex}` -> string[] (ULD numbers)
  const [uldNumbers, setUldNumbers] = useState<Map<string, string[]>>(new Map())

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

  const updateULDNumbers = (sectorIndex: number, uldSectionIndex: number, numbers: string[]) => {
    const key = `${sectorIndex}-${uldSectionIndex}`
    setUldNumbers((prev) => {
      const updated = new Map(prev)
      updated.set(key, numbers)
      return updated
    })
  }

  return {
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
  }
}

