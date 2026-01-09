"use client"

import { useState } from "react"
import { X, CheckCircle, PackageX } from "lucide-react"
import type { AWBRow } from "./load-plan-types"
import { BCR_REASON_CODES } from "@/lib/bcr-reason-codes"

interface AWBQuickActionModalProps {
  isOpen: boolean
  onClose: () => void
  awb: AWBRow
  onMarkLoaded: () => void
  onMarkOffload: (remainingPieces: string, remarks: string) => void
}

export function AWBQuickActionModal({
  isOpen,
  onClose,
  awb,
  onMarkLoaded,
  onMarkOffload,
}: AWBQuickActionModalProps) {
  const [remainingPieces, setRemainingPieces] = useState("")
  const [offloadRemarks, setOffloadRemarks] = useState("")

  if (!isOpen) return null

  const handleMarkLoaded = () => {
    onMarkLoaded()
    onClose()
  }

  const handleMarkOffload = () => {
    if (remainingPieces.trim()) {
      onMarkOffload(remainingPieces.trim(), offloadRemarks.trim())
      setRemainingPieces("")
      setOffloadRemarks("")
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-auto min-w-[400px] max-w-[500px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="mb-3 text-xs text-gray-600">
          AWB: <span className="font-mono font-semibold">{awb.awbNo}</span>
        </div>

        <div className="space-y-3">
          {/* Mark as Fully Loaded */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleMarkLoaded()
            }}
            className="w-full flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors text-left"
          >
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-medium text-gray-900">Mark ULD as Fully Loaded</div>
              <div className="text-xs text-gray-500">Mark this AWB as completely loaded</div>
            </div>
          </button>

          {/* Mark Remaining Pieces for Offload */}
          <div className="border border-gray-300 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-3">
              <PackageX className="w-5 h-5 text-orange-600" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Mark Remaining Pieces for Offload</div>
                <div className="text-xs text-gray-500">Specify pieces to offload (will be added to BCR)</div>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Remaining Pieces to Offload
                </label>
                <input
                  type="text"
                  value={remainingPieces}
                  onChange={(e) => setRemainingPieces(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-400"
                  placeholder={`Out of ${awb.pcs || "0"} pieces`}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Reason
                </label>
                <select
                  value={offloadRemarks}
                  onChange={(e) => setOffloadRemarks(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-400 bg-white"
                >
                  <option value="">Select...</option>
                  {BCR_REASON_CODES.map((reason) => (
                    <option key={reason.code} value={reason.code}>
                      {reason.code} - {reason.description.length > 40 ? reason.description.substring(0, 37) + "..." : reason.description}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarkOffload()
                }}
                disabled={!remainingPieces.trim()}
                className="w-full px-3 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark for Offload
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}






