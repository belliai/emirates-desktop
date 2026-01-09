"use client"

import { useState } from "react"
import { X, PackageIcon, CheckCircle, PackageX } from "lucide-react"
import type { AWBRow } from "./load-plan-types"

interface AWBSplitOffloadModalProps {
  isOpen: boolean
  onClose: () => void
  awb: AWBRow
  onMarkLoaded: () => void
  onMarkOffload: (remainingPieces: string, remarks: string) => void
}

export function AWBSplitOffloadModal({
  isOpen,
  onClose,
  awb,
  onMarkLoaded,
  onMarkOffload,
}: AWBSplitOffloadModalProps) {
  const [remainingPieces, setRemainingPieces] = useState("")
  const [offloadRemarks, setOffloadRemarks] = useState("")
  
  const totalPieces = parseInt(awb.pcs) || 0
  const totalWeight = parseFloat(awb.wgt) || 0

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg border border-gray-200 w-[90vw] max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <PackageIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-900">AWB Actions</h3>
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm font-mono font-semibold text-gray-700">{awb.awbNo}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Original AWB Info Card */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-gray-600">Original AWB</span>
              <span className="text-sm font-mono">{awb.awbNo}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-medium text-gray-600">Total</span>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{totalPieces} pcs</span>
                  <span className="text-gray-400">|</span>
                  <span>{totalWeight} kg</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {/* Mark as Fully Loaded */}
              <button
                type="button"
                onClick={handleMarkLoaded}
                className="w-full flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors text-left"
              >
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">Mark ULD as Fully Loaded</div>
                  <div className="text-xs text-gray-500">Mark this AWB as completely loaded</div>
                </div>
              </button>

              {/* Mark Remaining Pieces for Offload */}
              <div className="border border-gray-300 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <PackageX className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Mark Remaining Pieces for Offload</div>
                    <div className="text-xs text-gray-500">
                      Specify pieces to offload (will be added to BCR)
                    </div>
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
                      Remarks (Optional)
                    </label>
                    <textarea
                      value={offloadRemarks}
                      onChange={(e) => setOffloadRemarks(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-400 resize-none"
                      rows={2}
                      placeholder="Enter reason for offload..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkOffload}
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
    </div>
  )
}
