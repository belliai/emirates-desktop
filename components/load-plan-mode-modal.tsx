"use client"

import { useState } from "react"
import { FileText, RefreshCw, Plus, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export type LoadPlanMode = "revised" | "additional"

type LoadPlanModeModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName: string
  flightNumber: string
  existingRevision: number
  onConfirm: (mode: LoadPlanMode) => void
  onCancel: () => void
}

export function LoadPlanModeModal({
  open,
  onOpenChange,
  fileName,
  flightNumber,
  existingRevision,
  onConfirm,
  onCancel,
}: LoadPlanModeModalProps) {
  const [selectedMode, setSelectedMode] = useState<LoadPlanMode>("revised")

  const handleConfirm = () => {
    onConfirm(selectedMode)
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] gap-0 p-0 overflow-hidden" showCloseButton={false}>
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Update Load Plan
            </DialogTitle>
            <button
              onClick={handleCancel}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            A load plan for this flight already exists
          </DialogDescription>
        </DialogHeader>

        {/* File Info */}
        <div className="px-6 py-4 bg-gray-50 border-b overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg border flex items-center justify-center">
              <FileText className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate" title={fileName}>{fileName}</p>
              <p className="text-xs text-gray-500">
                Flight: <span className="font-semibold text-[#D71A21]">{flightNumber}</span>
                <span className="mx-2">•</span>
                Current Revision: <span className="font-semibold">{existingRevision}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="px-6 py-5 overflow-hidden">
          <Label className="text-sm font-medium text-gray-700 mb-4 block">
            How would you like to update this load plan?
          </Label>
          
          <RadioGroup
            value={selectedMode}
            onValueChange={(value) => setSelectedMode(value as LoadPlanMode)}
            className="space-y-3"
          >
            {/* Revised Option */}
            <label
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMode === "revised"
                  ? "border-[#D71A21] bg-red-50/50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <RadioGroupItem value="revised" id="revised" className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 flex-shrink-0 ${selectedMode === "revised" ? "text-[#D71A21]" : "text-gray-500"}`} />
                  <span className={`font-medium ${selectedMode === "revised" ? "text-[#D71A21]" : "text-gray-900"}`}>
                    Revised Load Plan
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Replace and update existing items. Items not in the new file will be marked as deleted.
                </p>
              </div>
            </label>

            {/* Additional Option */}
            <label
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMode === "additional"
                  ? "border-[#D71A21] bg-red-50/50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <RadioGroupItem value="additional" id="additional" className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2">
                  <Plus className={`h-4 w-4 flex-shrink-0 ${selectedMode === "additional" ? "text-[#D71A21]" : "text-gray-500"}`} />
                  <span className={`font-medium ${selectedMode === "additional" ? "text-[#D71A21]" : "text-gray-900"}`}>
                    Additional Load Plan
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Only add new items. Existing items will remain unchanged.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex flex-row items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="px-6 bg-[#D71A21] hover:bg-[#b91519] text-white"
          >
            Update Load Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


