"use client"

import { useState } from "react"
import { FileText, AlertTriangle, RefreshCw, Plus, Replace, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export type LoadPlanImportType = "new" | "additional" | "revised"

type ImportOptionProps = {
  id: LoadPlanImportType
  title: string
  description: string
  icon: React.ReactNode
  iconBg: string
}

const importOptions: ImportOptionProps[] = [
  {
    id: "new",
    title: "New Load Plan",
    description: "Replace the existing load plan completely with this file",
    icon: <Replace className="h-4 w-4 text-blue-600" />,
    iconBg: "bg-blue-100",
  },
  {
    id: "additional",
    title: "Additional Load Plan",
    description: "Keep existing items and add new items from this file",
    icon: <Plus className="h-4 w-4 text-green-600" />,
    iconBg: "bg-green-100",
  },
  {
    id: "revised",
    title: "Revised Load Plan",
    description: "Update existing items and mark removed items as deleted",
    icon: <RefreshCw className="h-4 w-4 text-amber-600" />,
    iconBg: "bg-amber-100",
  },
]

type LoadPlanImportModalProps = {
  isOpen: boolean
  fileName: string
  flightNumber: string
  flightDate: string
  onImport: (type: LoadPlanImportType) => void
  onCancel: () => void
  isProcessing?: boolean
}

export function LoadPlanImportModal({
  isOpen,
  fileName,
  flightNumber,
  flightDate,
  onImport,
  onCancel,
  isProcessing = false,
}: LoadPlanImportModalProps) {
  const [selectedType, setSelectedType] = useState<LoadPlanImportType>("additional")

  if (!isOpen) return null

  const handleImport = () => {
    onImport(selectedType)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Import Load Plan
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {flightNumber} / {flightDate}
            </p>
          </div>
          {!isProcessing && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* File Info */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200">
              <FileText className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
              <p className="text-xs text-gray-500">A load plan already exists for this flight</p>
            </div>
          </div>
        </div>

        {/* Import Options */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Choose import type</p>
          <div className="space-y-2">
            {importOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={isProcessing}
                onClick={() => setSelectedType(option.id)}
                className={`w-full flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                  selectedType === option.id
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                } ${isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${option.iconBg}`}>
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{option.title}</p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </div>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedType === option.id
                    ? "border-amber-500 bg-amber-500"
                    : "border-gray-300"
                }`}>
                  {selectedType === option.id && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-6"
          >
            Discard
          </Button>
          <Button
            onClick={handleImport}
            disabled={isProcessing}
            className="bg-[#D71A21] hover:bg-[#B01419] text-white px-6"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
