"use client"

import { useState } from 'react'
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText } from 'lucide-react'
import LoadPlanDetailScreen from './load-plan-detail-screen'
import BCRModal from './bcr-modal'
import type { LoadPlanDetail } from './load-plan-types'
import { useLoadPlans, type SentBCR } from '@/lib/load-plan-context'

interface BCRScreenProps {
  onBack?: () => void
}

export default function BCRScreen({ onBack }: BCRScreenProps) {
  const { sentBCRs } = useLoadPlans()
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [selectedBCR, setSelectedBCR] = useState<SentBCR | null>(null)
  const [showBCRModal, setShowBCRModal] = useState(false)

  const handleRowClick = (bcr: SentBCR) => {
    // Open the load plan detail view with BCR modal on top
    if (bcr.loadPlan) {
      setSelectedLoadPlan(bcr.loadPlan)
      setSelectedBCR(bcr)
      setShowBCRModal(true)
    }
  }

  // Show load plan detail view when a BCR is selected
  if (selectedLoadPlan) {
    return (
      <>
        <LoadPlanDetailScreen
          loadPlan={selectedLoadPlan}
          onBack={() => {
            setSelectedLoadPlan(null)
            setSelectedBCR(null)
            setShowBCRModal(false)
          }}
          // Read-only view for supervisor verification
          enableBulkCheckboxes={true}
        />
        
        {/* BCR Modal on top */}
        {selectedBCR && (
          <BCRModal
            isOpen={showBCRModal}
            onClose={() => {
              setShowBCRModal(false)
              setSelectedBCR(null)
            }}
            loadPlan={selectedBCR.loadPlan}
            bcrData={selectedBCR.bcrData}
          />
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">Build-up Completion</h2>
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
                {sentBCRs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-center text-gray-500 text-sm">
                      No sent BCRs available
                    </td>
                  </tr>
                ) : (
                  sentBCRs.map((bcr, index) => (
                    <BCRRow key={index} bcr={bcr} onClick={() => handleRowClick(bcr)} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

interface BCRRowProps {
  bcr: SentBCR
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

  return (
    <tr
      onClick={onClick}
      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
        {bcr.flight}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{bcr.date}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">
        {bcr.loadPlan?.acftType || '-'}
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

