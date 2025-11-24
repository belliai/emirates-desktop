"use client"

import { ArrowLeft, FileCheck } from "lucide-react"

interface LoadPlanHeaderProps {
  onBack: () => void
  isReadOnly: boolean
  onGenerateBCR?: () => void
  onSave?: () => void
}

export function LoadPlanHeader({ onBack, isReadOnly, onGenerateBCR, onSave }: LoadPlanHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Load Plan Detail</h1>
        </div>
        <div className="flex items-center gap-3">
          {isReadOnly && onGenerateBCR && (
            <button
              onClick={onGenerateBCR}
              className="px-4 py-2 bg-[#D71A21] text-white rounded-lg hover:bg-[#B01419] transition-colors font-medium flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              Generate BCR
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              className="px-4 py-2 bg-[#D71A21] text-white rounded-lg hover:bg-[#B01419] transition-colors font-medium"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

