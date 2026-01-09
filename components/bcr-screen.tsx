"use client"

import { useState, useEffect } from 'react'
import { ChevronRight, Plane, Calendar, Package, Users, Clock, Loader2 } from 'lucide-react'
import BCRModal from './bcr-modal'
import type { BCRData, BCRShipment, BCRVolumeDifference, BCRUnitUnableToUpdate } from './bcr-modal'
import { getAllSubmittedBCRs, updateBCR, type SubmittedBCR } from '@/lib/bcr-storage'

interface BCRScreenProps {
  onBack?: () => void
  staffName?: string
}

export default function BCRScreen({ onBack, staffName }: BCRScreenProps) {
  const [submittedBCRs, setSubmittedBCRs] = useState<SubmittedBCR[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBCR, setSelectedBCR] = useState<SubmittedBCR | null>(null)
  const [showBCRModal, setShowBCRModal] = useState(false)
  const [initialBcrData, setInitialBcrData] = useState<BCRData | null>(null)

  // Fetch submitted BCRs from Supabase on mount
  useEffect(() => {
    async function fetchBCRs() {
      setIsLoading(true)
      try {
        const bcrs = await getAllSubmittedBCRs()
        setSubmittedBCRs(bcrs)
        console.log(`[BCR Screen] Loaded ${bcrs.length} submitted BCRs`)
      } catch (error) {
        console.error("[BCR Screen] Error fetching BCRs:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBCRs()
  }, [])

  const handleRowClick = (bcr: SubmittedBCR) => {
    // Convert SubmittedBCR to BCRData format for the modal
    const bcrData: BCRData = {
      flightNo: bcr.flightNumber,
      date: bcr.flightDate,
      destination: bcr.destination || "",
      shipments: (bcr.shipments || []).map((s: any, index: number) => ({
        srNo: s.srNo || String(index + 1),
        awb: s.awb || "",
        pcs: s.pcs || "",
        location: s.location || "",
        reason: s.reason || "",
        locationChecked: s.locationChecked || "",
        remarks: s.remarks || "",
      })),
      volumeDifferences: (bcr.volumeDifferences || []).map((v: any) => ({
        awb: v.awb || "",
        declaredVolume: v.declaredVolume || "",
        loadableVolume: v.loadableVolume || "",
        remarks: v.remarks || "",
      })),
      unitsUnableToUpdate: (bcr.unitsUnableToUpdate || []).map((u: any) => ({
        uld: u.uld || "",
        reason: u.reason || "",
      })),
      flightPartiallyActioned: bcr.partiallyActioned || false,
      handoverTakenFrom: bcr.handoverFrom || "",
      loadersName: bcr.loadersName || "",
      buildupStaff: bcr.buildupStaff || "",
      supervisor: bcr.supervisor || "",
    }

    setSelectedBCR(bcr)
    setInitialBcrData(bcrData)
    setShowBCRModal(true)
  }

  const handleModalClose = () => {
    setShowBCRModal(false)
    setSelectedBCR(null)
    setInitialBcrData(null)
  }

  const handleBCRUpdate = async () => {
    // Refresh the list after update
    const bcrs = await getAllSubmittedBCRs()
    setSubmittedBCRs(bcrs)
  }

  // Create a minimal LoadPlanDetail object for BCR modal
  const createMinimalLoadPlan = (bcr: SubmittedBCR) => ({
    flight: bcr.flightNumber,
    date: bcr.flightDate,
    acftType: bcr.acftType,
    acftReg: "",
    pax: "",
    std: "",
    uldVersion: "",
    ttlPlnUld: "",
    sectors: [],
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">Build-up Completion Report</h2>
        </div>
        <div className="mx-2 rounded-lg border border-gray-200 overflow-x-auto">
          <div className="bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-[#D71A21] text-white">
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Flight</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Date</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ACFT TYPE</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Sent By</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Sent At</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading BCRs...</span>
                      </div>
                    </td>
                  </tr>
                ) : submittedBCRs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-center text-gray-500 text-sm">
                      No sent BCRs available
                    </td>
                  </tr>
                ) : (
                  submittedBCRs.map((bcr, index) => (
                    <BCRRow key={`${bcr.flightNumber}-${index}`} bcr={bcr} onClick={() => handleRowClick(bcr)} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* BCR Modal */}
      {selectedBCR && initialBcrData && (
        <BCRModal
          isOpen={showBCRModal}
          onClose={handleModalClose}
          loadPlan={createMinimalLoadPlan(selectedBCR)}
          bcrData={initialBcrData}
          onSubmit={handleBCRUpdate}
          isAlreadySubmitted={true}
          staffName={staffName}
        />
      )}
    </div>
  )
}

interface BCRRowProps {
  bcr: SubmittedBCR
  onClick: () => void
}

function BCRRow({ bcr, onClick }: BCRRowProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      // Display in Dubai/GST timezone (UTC+4)
      return date.toLocaleString('en-US', {
        timeZone: 'Asia/Dubai',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const formatFlightDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  return (
    <tr
      onClick={onClick}
      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
        {bcr.flightNumber}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">
        {formatFlightDate(bcr.flightDate)}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">
        {bcr.acftType || '-'}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">
        {bcr.sentBy || '-'}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">
        {formatDate(bcr.sentAt)}
      </td>
      <td className="px-2 py-1 w-10">
        <ChevronRight className="h-4 w-4 text-gray-600 hover:text-[#D71A21]" />
      </td>
    </tr>
  )
}
