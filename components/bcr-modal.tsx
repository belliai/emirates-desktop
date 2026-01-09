"use client"

import { useState, useRef, useEffect } from "react"
import { X, Download, FileText, Printer, Plus, Trash2, CheckCircle, Loader2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LoadPlanDetail, AWBRow } from "./load-plan-types"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { submitBCR, updateBCR } from "@/lib/bcr-storage"
import { BCR_REASON_CODES } from "@/lib/bcr-reason-codes"

// Infrastructure for future commenting/status tracking
export type AWBStatus = "completed" | "split" | "offloaded" | "pending" | "hold" | "late"

export type AWBComment = {
  awbNo: string
  status: AWBStatus
  remarks?: string
  location?: string
  locationChecked?: string
  reason?: string
  completedAt?: string
  completedBy?: string
}

export type BCRData = {
  flightNo: string
  date: string
  destination: string
  shipments: BCRShipment[]
  volumeDifferences: BCRVolumeDifference[]
  unitsUnableToUpdate: BCRUnitUnableToUpdate[]
  flightPartiallyActioned: boolean
  handoverTakenFrom?: string
  loadersName?: string
  buildupStaff?: string
  supervisor?: string
}

export type BCRShipment = {
  srNo: string
  awb: string
  pcs: string
  location: string
  reason: string
  locationChecked: string
  remarks: string
}

export type BCRVolumeDifference = {
  awb: string
  declaredVolume: string
  loadableVolume: string
  remarks: string
}

export type BCRUnitUnableToUpdate = {
  uld: string
  reason: string
}

interface BCRModalProps {
  isOpen: boolean
  onClose: () => void
  loadPlan: LoadPlanDetail
  bcrData: BCRData
  onSubmit?: () => void  // Called when BCR is successfully submitted
  isAlreadySubmitted?: boolean  // If true, show as read-only
  staffName?: string  // Current user's name for sentBy field
}

// Helper to compare BCR data for change detection
function bcrDataHasChanges(original: BCRData, current: BCRData): boolean {
  // Simple deep comparison for change detection
  const originalStr = JSON.stringify({
    shipments: original.shipments,
    volumeDifferences: original.volumeDifferences,
    unitsUnableToUpdate: original.unitsUnableToUpdate,
    flightPartiallyActioned: original.flightPartiallyActioned,
    handoverTakenFrom: original.handoverTakenFrom,
    loadersName: original.loadersName,
    buildupStaff: original.buildupStaff,
    supervisor: original.supervisor,
  })
  const currentStr = JSON.stringify({
    shipments: current.shipments,
    volumeDifferences: current.volumeDifferences,
    unitsUnableToUpdate: current.unitsUnableToUpdate,
    flightPartiallyActioned: current.flightPartiallyActioned,
    handoverTakenFrom: current.handoverTakenFrom,
    loadersName: current.loadersName,
    buildupStaff: current.buildupStaff,
    supervisor: current.supervisor,
  })
  return originalStr !== currentStr
}

export default function BCRModal({ isOpen, onClose, loadPlan, bcrData: initialBcrData, onSubmit, isAlreadySubmitted = false, staffName }: BCRModalProps) {
  const [bcrData, setBcrData] = useState<BCRData>(initialBcrData)
  const [showPDFView, setShowPDFView] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(isAlreadySubmitted)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [savedBcrData, setSavedBcrData] = useState<BCRData>(initialBcrData)
  const [justSaved, setJustSaved] = useState(false)
  const pdfContentRef = useRef<HTMLDivElement>(null)

  // Update bcrData when initialBcrData changes (e.g., when comments are updated)
  useEffect(() => {
    if (isOpen) {
      setBcrData(initialBcrData)
      setSavedBcrData(initialBcrData)
      setIsSubmitted(isAlreadySubmitted)
      setSubmitError(null)
      setHasChanges(false)
      setJustSaved(false)
    }
  }, [initialBcrData, isOpen, isAlreadySubmitted])

  // Track changes when bcrData changes
  useEffect(() => {
    if (isAlreadySubmitted) {
      const changed = bcrDataHasChanges(savedBcrData, bcrData)
      setHasChanges(changed)
      // Clear the "saved" message when user makes new changes
      if (changed && justSaved) {
        setJustSaved(false)
      }
    }
  }, [bcrData, savedBcrData, isAlreadySubmitted, justSaved])

  // Handle BCR submission to Supabase
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const submission = {
        flightNumber: loadPlan.flight,
        handoverFrom: bcrData.handoverTakenFrom || "",
        loadersName: bcrData.loadersName || "",
        buildupStaff: bcrData.buildupStaff || "",
        supervisor: bcrData.supervisor || "",
        partiallyActioned: bcrData.flightPartiallyActioned,
        shipments: bcrData.shipments.map(s => ({
          srNo: s.srNo,
          awb: s.awb,
          pcs: s.pcs,
          location: s.location,
          reason: s.reason,
          locationChecked: s.locationChecked,
          remarks: s.remarks,
        })),
        volumeDifferences: bcrData.volumeDifferences.map(v => ({
          awb: v.awb,
          declaredVolume: v.declaredVolume,
          loadableVolume: v.loadableVolume,
          remarks: v.remarks,
        })),
        unitsUnableToUpdate: bcrData.unitsUnableToUpdate.map(u => ({
          uld: u.uld,
          reason: u.reason,
        })),
        sentBy: staffName || "Unknown",
      }

      // Use update if already submitted, otherwise use submit
      const result = isAlreadySubmitted 
        ? await updateBCR(submission)
        : await submitBCR(submission)

      if (result.success) {
        setIsSubmitted(true)
        setSavedBcrData(bcrData) // Update saved state so hasChanges becomes false
        setHasChanges(false)
        setJustSaved(isAlreadySubmitted) // Only show "saved" message for updates
        onSubmit?.()
      } else {
        setSubmitError(result.error || "Failed to submit BCR")
      }
    } catch (e) {
      setSubmitError(String(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const updateShipment = (index: number, field: keyof BCRShipment, value: string) => {
    setBcrData((prev) => {
      const updated = { ...prev }
      updated.shipments = [...prev.shipments]
      updated.shipments[index] = { ...updated.shipments[index], [field]: value }
      return updated
    })
  }

  const addShipmentRow = () => {
    setBcrData((prev) => ({
      ...prev,
      shipments: [
        ...prev.shipments,
        {
          srNo: String(prev.shipments.length + 1),
          awb: "",
          pcs: "",
          location: "",
          reason: "",
          locationChecked: "",
          remarks: "",
        },
      ],
    }))
  }

  const removeShipmentRow = (index: number) => {
    setBcrData((prev) => ({
      ...prev,
      shipments: prev.shipments.filter((_, i) => i !== index),
    }))
  }

  const updateVolumeDifference = (index: number, field: keyof BCRVolumeDifference, value: string) => {
    setBcrData((prev) => {
      const updated = { ...prev }
      updated.volumeDifferences = [...prev.volumeDifferences]
      updated.volumeDifferences[index] = { ...updated.volumeDifferences[index], [field]: value }
      return updated
    })
  }

  const addVolumeDifferenceRow = () => {
    setBcrData((prev) => ({
      ...prev,
      volumeDifferences: [
        ...prev.volumeDifferences,
        {
          awb: "",
          declaredVolume: "",
          loadableVolume: "",
          remarks: "",
        },
      ],
    }))
  }

  const removeVolumeDifferenceRow = (index: number) => {
    setBcrData((prev) => ({
      ...prev,
      volumeDifferences: prev.volumeDifferences.filter((_, i) => i !== index),
    }))
  }

  const updateUnitUnableToUpdate = (index: number, field: keyof BCRUnitUnableToUpdate, value: string) => {
    setBcrData((prev) => {
      const updated = { ...prev }
      updated.unitsUnableToUpdate = [...prev.unitsUnableToUpdate]
      updated.unitsUnableToUpdate[index] = { ...updated.unitsUnableToUpdate[index], [field]: value }
      return updated
    })
  }

  const addUnitUnableToUpdateRow = () => {
    setBcrData((prev) => ({
      ...prev,
      unitsUnableToUpdate: [
        ...prev.unitsUnableToUpdate,
        {
          uld: "",
          reason: "",
        },
      ],
    }))
  }

  const removeUnitUnableToUpdateRow = (index: number) => {
    setBcrData((prev) => ({
      ...prev,
      unitsUnableToUpdate: prev.unitsUnableToUpdate.filter((_, i) => i !== index),
    }))
  }

  const handleDownloadPDF = async () => {
    if (!pdfContentRef.current) return

    try {
      const canvas = await html2canvas(pdfContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const imgData = canvas.toDataURL("image/png")

      const pdf = new jsPDF("p", "mm", "a4")
      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`BCR-${bcrData.flightNo}-${bcrData.date}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
    }
  }

  const handlePrint = () => {
    if (!pdfContentRef.current) return
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>BCR - ${bcrData.flightNo}</title>
            <style>
              @media print {
                @page {
                  size: A4;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            ${pdfContentRef.current.innerHTML}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleViewPDF = () => {
    setShowPDFView(true)
  }

  // PDF View Component
  if (showPDFView) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">PDF Preview</h2>
            <button
              onClick={() => setShowPDFView(false)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div ref={pdfContentRef} className="bg-white p-8" style={{ width: "210mm", minHeight: "297mm" }}>
              {/* PDF Content matching paper form */}
              <div className="mb-6">
                <img
                  src="/images/design-mode/image.png"
                  alt="Emirates SkyCargo"
                  className="h-16 w-auto mb-4"
                />
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Build-up Completion Report</h1>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Flight No.</div>
                    <div className="text-base font-semibold text-gray-900 border-b-2 border-gray-900 pb-1">
                      {bcrData.flightNo}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Date</div>
                    <div className="text-base font-semibold text-gray-900 border-b-2 border-gray-900 pb-1">
                      {bcrData.date}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Destination</div>
                    <div className="text-base font-semibold text-gray-900 border-b-2 border-gray-900 pb-1">
                      {bcrData.destination}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipments Table */}
              <div className="mb-6">
                <table className="w-full border border-gray-900 text-xs" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">SR No.</th>
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">AWB</th>
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">PCS</th>
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">Location</th>
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">Reason</th>
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">Location Checked</th>
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bcrData.shipments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-gray-900 px-2 py-4 text-center text-gray-500">
                          No shipments to display
                        </td>
                      </tr>
                    ) : (
                      bcrData.shipments.map((shipment, index) => (
                        <tr key={index}>
                          <td className="border border-gray-900 px-2 py-2">{shipment.srNo}</td>
                          <td className="border border-gray-900 px-2 py-2 font-mono">{shipment.awb}</td>
                          <td className="border border-gray-900 px-2 py-2">{shipment.pcs}</td>
                          <td className="border border-gray-900 px-2 py-2">{shipment.location}</td>
                          <td className="border border-gray-900 px-2 py-2">{shipment.reason}</td>
                          <td className="border border-gray-900 px-2 py-2">{shipment.locationChecked || ""}</td>
                          <td className="border border-gray-900 px-2 py-2">{shipment.remarks || ""}</td>
                        </tr>
                      ))
                    )}
                    {/* Add empty rows for form-like appearance */}
                    {Array.from({ length: Math.max(0, 10 - bcrData.shipments.length) }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td className="border border-gray-900 px-2 py-2"></td>
                        <td className="border border-gray-900 px-2 py-2"></td>
                        <td className="border border-gray-900 px-2 py-2"></td>
                        <td className="border border-gray-900 px-2 py-2"></td>
                        <td className="border border-gray-900 px-2 py-2"></td>
                        <td className="border border-gray-900 px-2 py-2"></td>
                        <td className="border border-gray-900 px-2 py-2"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Shipments Unable to Load Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Shipments unable to load due to volume differences
                </h3>
                <table className="w-full border border-gray-900 text-xs" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">AWB</th>
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">Declared Volume</th>
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">Loadable Volume</th>
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bcrData.volumeDifferences.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="border border-gray-900 px-2 py-4 text-center text-gray-500">
                          No volume differences
                        </td>
                      </tr>
                    ) : (
                      bcrData.volumeDifferences.map((diff, index) => (
                        <tr key={index}>
                          <td className="border border-gray-900 px-2 py-2 font-mono">{diff.awb}</td>
                          <td className="border border-gray-900 px-2 py-2">{diff.declaredVolume}</td>
                          <td className="border border-gray-900 px-2 py-2">{diff.loadableVolume}</td>
                          <td className="border border-gray-900 px-2 py-2">{diff.remarks || ""}</td>
                        </tr>
                      ))
                    )}
                    {Array.from({ length: Math.max(0, 5 - bcrData.volumeDifferences.length) }).map((_, i) => (
                      <tr key={`empty-vol-${i}`}>
                        <td className="border border-gray-900 px-2 py-2"></td>
                        <td className="border border-gray-900 px-2 py-2"></td>
                        <td className="border border-gray-900 px-2 py-2"></td>
                        <td className="border border-gray-900 px-2 py-2"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Units Unable to be Updated Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Units unable to be updated through HHTs'
                </h3>
                <table className="w-full border border-gray-900 text-xs" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">ULD</th>
                      <th className="border border-gray-900 px-2 py-2 text-left font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bcrData.unitsUnableToUpdate.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="border border-gray-900 px-2 py-4 text-center text-gray-500">
                          No units unable to update
                        </td>
                      </tr>
                    ) : (
                      bcrData.unitsUnableToUpdate.map((unit, index) => (
                        <tr key={index}>
                          <td className="border border-gray-900 px-2 py-2">{unit.uld}</td>
                          <td className="border border-gray-900 px-2 py-2">{unit.reason}</td>
                        </tr>
                      ))
                    )}
                    {Array.from({ length: Math.max(0, 5 - bcrData.unitsUnableToUpdate.length) }).map((_, i) => (
                      <tr key={`empty-unit-${i}`}>
                        <td className="border border-gray-900 px-2 py-2"></td>
                        <td className="border border-gray-900 px-2 py-2"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Section */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-900">Flight partially actioned:</span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={bcrData.flightPartiallyActioned}
                      readOnly
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!bcrData.flightPartiallyActioned}
                      readOnly
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                  <span className="text-xs text-gray-500">(Tick appropriate)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Handover taken from:</div>
                    <div className="text-sm font-semibold text-gray-900 border-b border-gray-900 pb-1">
                      {bcrData.handoverTakenFrom || ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Loaders Name/Number:</div>
                    <div className="text-sm font-semibold text-gray-900 border-b border-gray-900 pb-1">
                      {bcrData.loadersName || ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Build-up / UWS Staff:</div>
                    <div className="text-sm font-semibold text-gray-900 border-b border-gray-900 pb-1">
                      {bcrData.buildupStaff || ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Supervisor:</div>
                    <div className="text-sm font-semibold text-gray-900 border-b border-gray-900 pb-1">
                      {bcrData.supervisor || ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-[#D71A21] hover:bg-[#B0151A]">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Editable Form View
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img
                src="/images/design-mode/image.png"
                alt="Emirates SkyCargo"
                className="h-12 w-auto"
              />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Build-up Completion Report</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Flight Info */}
          <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b border-gray-200">
            <div>
              <div className="text-xs text-gray-500 mb-1">Flight No.</div>
              <input
                type="text"
                value={bcrData.flightNo}
                onChange={(e) => setBcrData((prev) => ({ ...prev, flightNo: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Date</div>
              <input
                type="text"
                value={bcrData.date}
                onChange={(e) => setBcrData((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Destination</div>
              <input
                type="text"
                value={bcrData.destination}
                onChange={(e) => setBcrData((prev) => ({ ...prev, destination: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold"
              />
            </div>
          </div>

          {/* Main Shipments Table */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Shipments</h3>
              <Button
                onClick={addShipmentRow}
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Row
              </Button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">SR No.</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">AWB</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">PCS</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Location</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Reason</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Location Checked</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Remarks</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 w-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bcrData.shipments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                        No shipments to display
                      </td>
                    </tr>
                  ) : (
                    bcrData.shipments.map((shipment, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={shipment.srNo}
                            onChange={(e) => updateShipment(index, "srNo", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={shipment.awb}
                            onChange={(e) => updateShipment(index, "awb", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={shipment.pcs}
                            onChange={(e) => updateShipment(index, "pcs", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={shipment.location}
                            onChange={(e) => updateShipment(index, "location", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <select
                            value={shipment.reason}
                            onChange={(e) => updateShipment(index, "reason", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          >
                            <option value="">Select...</option>
                            {BCR_REASON_CODES.map((r) => (
                              <option key={r.code} value={r.code}>{r.code}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={shipment.locationChecked}
                            onChange={(e) => updateShipment(index, "locationChecked", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={shipment.remarks}
                            onChange={(e) => updateShipment(index, "remarks", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <button
                            onClick={() => removeShipmentRow(index)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                            title="Remove Row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shipments Unable to Load Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Shipments unable to load due to volume differences
              </h3>
              <Button
                onClick={addVolumeDifferenceRow}
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Row
              </Button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">AWB</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Declared Volume</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Loadable Volume</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Remarks</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 w-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bcrData.volumeDifferences.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                        No volume differences
                      </td>
                    </tr>
                  ) : (
                    bcrData.volumeDifferences.map((diff, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={diff.awb}
                            onChange={(e) => updateVolumeDifference(index, "awb", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={diff.declaredVolume}
                            onChange={(e) => updateVolumeDifference(index, "declaredVolume", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={diff.loadableVolume}
                            onChange={(e) => updateVolumeDifference(index, "loadableVolume", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={diff.remarks}
                            onChange={(e) => updateVolumeDifference(index, "remarks", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <button
                            onClick={() => removeVolumeDifferenceRow(index)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                            title="Remove Row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Units Unable to be Updated Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Units unable to be updated through HHTs'
              </h3>
              <Button
                onClick={addUnitUnableToUpdateRow}
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Row
              </Button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">ULD</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Reason</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 w-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bcrData.unitsUnableToUpdate.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                        No units unable to update
                      </td>
                    </tr>
                  ) : (
                    bcrData.unitsUnableToUpdate.map((unit, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={unit.uld}
                            onChange={(e) => updateUnitUnableToUpdate(index, "uld", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={unit.reason}
                            onChange={(e) => updateUnitUnableToUpdate(index, "reason", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <button
                            onClick={() => removeUnitUnableToUpdateRow(index)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                            title="Remove Row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Section */}
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-900">Flight partially actioned:</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bcrData.flightPartiallyActioned}
                  onChange={(e) => setBcrData((prev) => ({ ...prev, flightPartiallyActioned: e.target.checked }))}
                  className="w-4 h-4 text-[#D71A21] border-gray-300 rounded focus:ring-[#D71A21]"
                />
                <span className="text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!bcrData.flightPartiallyActioned}
                  onChange={(e) => setBcrData((prev) => ({ ...prev, flightPartiallyActioned: !e.target.checked }))}
                  className="w-4 h-4 text-[#D71A21] border-gray-300 rounded focus:ring-[#D71A21]"
                />
                <span className="text-sm text-gray-700">No</span>
              </label>
              <span className="text-xs text-gray-500">(Tick appropriate)</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Handover taken from:</div>
                <input
                  type="text"
                  value={bcrData.handoverTakenFrom || ""}
                  onChange={(e) => setBcrData((prev) => ({ ...prev, handoverTakenFrom: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Loaders Name/Number:</div>
                <input
                  type="text"
                  value={bcrData.loadersName || ""}
                  onChange={(e) => setBcrData((prev) => ({ ...prev, loadersName: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Build-up / UWS Staff:</div>
                <input
                  type="text"
                  value={bcrData.buildupStaff || ""}
                  onChange={(e) => setBcrData((prev) => ({ ...prev, buildupStaff: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Supervisor:</div>
                <input
                  type="text"
                  value={bcrData.supervisor || ""}
                  onChange={(e) => setBcrData((prev) => ({ ...prev, supervisor: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          {/* Error message */}
          {submitError && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {submitError}
            </div>
          )}
          
          {/* Success message */}
          {isSubmitted && !isAlreadySubmitted && (
            <div className="mb-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              BCR has been submitted successfully
            </div>
          )}
          {justSaved && (
            <div className="mb-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Changes saved successfully
            </div>
          )}
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleViewPDF} className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Preview
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1">
                <Printer className="w-3 h-3" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                Download
              </Button>
            </div>
            {isAlreadySubmitted ? (
              // Already submitted BCR - show "Save Changes" only when there are changes
              hasChanges ? (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#D71A21] hover:bg-[#B0151A]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              ) : (
                <span className="text-sm text-gray-500 italic">No changes to save</span>
              )
            ) : !isSubmitted ? (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-[#D71A21] hover:bg-[#B0151A]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit BCR
                  </>
                )}
              </Button>
            ) : (
              <Button 
                disabled
                className="flex items-center gap-2 bg-green-600 cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                Submitted
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to generate BCR data from load plan
export function generateBCRData(
  loadPlan: LoadPlanDetail,
  comments?: AWBComment[],
  awbAssignments?: Map<string, { awbNo: string; isLoaded: boolean }>,
  uldEntries?: Map<string, Array<{ number: string; checked: boolean; type: string }>>,
  staffInfo?: { buildupStaff?: string | null; handoverFrom?: string | null }
): BCRData {
  // Extract all AWBs from the load plan with their sector/uldSection info
  const allAWBsWithContext: Array<{
    awb: AWBRow
    sectorIndex: number
    uldSectionIndex: number
  }> = []
  loadPlan.sectors.forEach((sector, sectorIndex) => {
    sector.uldSections.forEach((uldSection, uldSectionIndex) => {
      uldSection.awbs.forEach((awb) => {
        allAWBsWithContext.push({
          awb,
          sectorIndex,
          uldSectionIndex,
        })
      })
    })
  })

  // Generate BCR shipments based on actual offload markings
  const shipments: BCRShipment[] = []
  const volumeDifferences: BCRVolumeDifference[] = []
  const unitsUnableToUpdate: BCRUnitUnableToUpdate[] = []

  // Process all AWBs - if they have remaining pieces, add to shipments
  // Simple logic: as long as there's a non-null remaining pieces value, it shows up in BCR
  if (comments && comments.length > 0) {
    comments.forEach((comment) => {
      // Check if this comment has remaining pieces
      if (comment && comment.remarks && comment.awbNo) {
        // Try to extract remaining pieces from remarks - more flexible pattern
        // Format: "Remaining X pieces offloaded. [optional remarks]"
        // Also handles variations like "Remaining X pieces offloaded" (no period)
        const piecesMatch = comment.remarks.match(/Remaining\s+(\d+)\s+pieces\s+offloaded/i)
        if (piecesMatch && piecesMatch[1]) {
          // Found remaining pieces - find the AWB and add to shipments
          const pieces = piecesMatch[1]
          let remarks = ""
          
          // Extract optional remarks (everything after "offloaded" and optional period/space)
          const remarksMatch = comment.remarks.match(/offloaded[.\s]*\s*(.+)/i)
          if (remarksMatch && remarksMatch[1] && remarksMatch[1].trim()) {
            remarks = remarksMatch[1].trim()
          }

          // Find the AWB to get SER number
          const awbContext = allAWBsWithContext.find((ctx) => {
            // Try exact match first
            if (ctx.awb.awbNo === comment.awbNo) return true
            // Try string comparison in case of type mismatch
            return String(ctx.awb.awbNo) === String(comment.awbNo)
          })
          
          if (awbContext) {
            // Check if this AWB is already in shipments (avoid duplicates)
            const existingIndex = shipments.findIndex((s) => s.awb === comment.awbNo || String(s.awb) === String(comment.awbNo))
            if (existingIndex === -1) {
              shipments.push({
                srNo: awbContext.awb.ser || "",
                awb: comment.awbNo,
                pcs: pieces,
                location: comment.location || "",
                reason: comment.reason || "Offloaded",
                locationChecked: comment.locationChecked || "",
                remarks: remarks,
              })
            }
          }
        }
      }
    })
  }

  // Volume differences - empty for now (can be added later if needed)
  // volumeDifferences remains empty array

  // Units unable to update - leave blank by default
  // unitsUnableToUpdate remains empty array

  // Extract destination from Route field - always use last 3 characters
  // Route formats: "DXB/KWI", "DXBKWI", "DXB/KWI/0/23/251" - destination is always last 3-letter code
  let destination = "N/A"
  const pax = loadPlan.pax || ""
  if (pax.includes("/")) {
    // Format: "DXB/KWI" or "DXB/KWI/0/23/251" - get the second 3-letter code
    const parts = pax.split("/")
    const destPart = parts.find((p, i) => i > 0 && /^[A-Z]{3}$/.test(p))
    destination = destPart || parts[1]?.substring(0, 3) || "N/A"
  } else if (pax.length >= 6) {
    // Format: "DXBKWI" - get last 3 characters
    destination = pax.slice(-3)
  } else if (pax.length === 3) {
    destination = pax
  }

  return {
    flightNo: loadPlan.flight,
    date: loadPlan.date,
    destination: destination,
    shipments: shipments,
    volumeDifferences: volumeDifferences,
    unitsUnableToUpdate: unitsUnableToUpdate,
    flightPartiallyActioned: shipments.length > 0,
    handoverTakenFrom: staffInfo?.handoverFrom || "",
    loadersName: "",
    buildupStaff: staffInfo?.buildupStaff || "",
    supervisor: "",
  }
}
