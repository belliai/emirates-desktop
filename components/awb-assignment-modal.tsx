"use client"

import { useState } from "react"
import { X, Plus, Trash2, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AWBRow } from "./load-plan-detail-screen"

// Client-safe ID generator
const generateId = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }
  // Fallback for SSR/build time
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export type AWBAssignmentType = "single" | "split" | "existing" | "offload"

export type SplitGroup = {
  id: string
  no: string // Identifier like "829379"
  pieces: string
  uld?: string
}

export type AWBAssignmentData = {
  type: AWBAssignmentType
  uld?: string // For single ULD assignment
  existingUld?: string // For existing ULD assignment
  splitGroups?: SplitGroup[] // For split assignment
  isLoaded?: boolean // Whether to mark as loaded (false for splits)
}

interface AWBAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  awb: AWBRow
  onConfirm: (data: AWBAssignmentData) => void
  existingUlds?: string[] // List of existing ULDs to choose from
}

export default function AWBAssignmentModal({
  isOpen,
  onClose,
  awb,
  onConfirm,
  existingUlds = [],
}: AWBAssignmentModalProps) {
  const [loadType, setLoadType] = useState<"new" | "existing" | null>(null)
  const [actionType, setActionType] = useState<"split" | "offload" | null>(null)
  const [uld, setUld] = useState("")
  const [existingUld, setExistingUld] = useState("")
  const [splitGroups, setSplitGroups] = useState<SplitGroup[]>([
    { id: generateId(), no: "", pieces: "", uld: "" },
  ])

  if (!isOpen) return null

  const handleAddSplitGroup = () => {
    setSplitGroups([...splitGroups, { id: generateId(), no: "", pieces: "", uld: "" }])
  }

  const handleRemoveSplitGroup = (index: number) => {
    if (splitGroups.length > 1) {
      setSplitGroups(splitGroups.filter((_, i) => i !== index))
    }
  }

  const updateSplitGroup = (index: number, field: keyof SplitGroup, value: string) => {
    const updated = [...splitGroups]
    updated[index] = { ...updated[index], [field]: value }
    setSplitGroups(updated)
  }

  const handleLoadULD = () => {
    if (loadType === "new") {
      if (!uld.trim()) return
      onConfirm({ type: "single", uld: uld.trim(), isLoaded: true })
    } else if (loadType === "existing") {
      if (!existingUld.trim()) return
      onConfirm({ type: "existing", existingUld: existingUld.trim(), isLoaded: true })
    }
    onClose()
  }

  const handleSplit = () => {
    // Validate split groups
    const validGroups = splitGroups.filter((g) => g.no.trim() && g.pieces.trim())
    if (validGroups.length === 0) return
    onConfirm({ type: "split", splitGroups: validGroups, isLoaded: false })
    onClose()
  }

  const handleOffload = () => {
    onConfirm({ type: "offload", isLoaded: false })
    onClose()
  }

  const canLoadULD = (loadType === "new" && uld.trim()) || (loadType === "existing" && existingUld.trim())
  const canSplit = actionType === "split" && splitGroups.some((g) => g.no.trim() && g.pieces.trim())
  const canOffload = actionType === "offload"

  const totalSplitPieces = splitGroups.reduce((sum, g) => sum + (parseInt(g.pieces) || 0), 0)
  const remainingPieces = parseInt(awb.pcs) - totalSplitPieces

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Assign AWB</h2>
            <p className="text-sm text-gray-500 mt-1">AWB: {awb.awbNo}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Original AWB Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Original AWB</div>
                <div className="text-sm font-semibold text-gray-900">{awb.awbNo}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Total Pieces</div>
                <div className="text-sm font-semibold text-gray-900">{awb.pcs}</div>
              </div>
            </div>
          </div>

          {/* Load Options Group */}
          <div>
            <Label className="text-sm font-semibold text-gray-900 mb-3 block">Load Options</Label>
            <RadioGroup 
              value={loadType || ""} 
              onValueChange={(value) => {
                setLoadType(value === "new" ? "new" : value === "existing" ? "existing" : null)
                setActionType(null)
              }}
            >
              <div className="space-y-3">
                <label
                  htmlFor="new-uld"
                  className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    loadType === "new" ? "border-[#D71A21] bg-red-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <RadioGroupItem value="new" id="new-uld" />
                  <div className="flex-1">
                    <div className="font-medium">Load into new ULD</div>
                    <div className="text-xs text-gray-500 mt-1">Enter ULD number</div>
                  </div>
                </label>
                <label
                  htmlFor="existing-uld"
                  className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    loadType === "existing" ? "border-[#D71A21] bg-red-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <RadioGroupItem value="existing" id="existing-uld" />
                  <div className="flex-1">
                    <div className="font-medium">Load into existing ULD</div>
                    <div className="text-xs text-gray-500 mt-1">Share ULD with existing row</div>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Action Options Group */}
          <div>
            <Label className="text-sm font-semibold text-gray-900 mb-3 block">Actions</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setActionType(actionType === "split" ? null : "split")
                  setLoadType(null)
                }}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  actionType === "split" ? "border-[#D71A21] bg-red-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">Split</div>
                <div className="text-xs text-gray-500 mt-1">Create multiple groups</div>
              </button>
              <button
                onClick={() => {
                  setActionType(actionType === "offload" ? null : "offload")
                  setLoadType(null)
                }}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  actionType === "offload" ? "border-[#D71A21] bg-red-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">Offload</div>
                <div className="text-xs text-gray-500 mt-1">Remove from loading</div>
              </button>
            </div>
          </div>

          {/* New ULD Input */}
          {loadType === "new" && (
            <div>
              <Label htmlFor="uld" className="text-sm font-semibold text-gray-900 mb-2 block">
                ULD Number
              </Label>
              <Input
                id="uld"
                value={uld}
                onChange={(e) => setUld(e.target.value)}
                placeholder="Enter ULD number"
                className="w-full"
              />
            </div>
          )}

          {/* Existing ULD Selection */}
          {loadType === "existing" && (
            <div>
              <Label htmlFor="existing-uld-select" className="text-sm font-semibold text-gray-900 mb-2 block">
                Select Existing ULD
              </Label>
              {existingUlds.length > 0 ? (
                <select
                  id="existing-uld-select"
                  value={existingUld}
                  onChange={(e) => setExistingUld(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select ULD...</option>
                  {existingUlds.map((uldOption) => (
                    <option key={uldOption} value={uldOption}>
                      {uldOption}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="existing-uld-input"
                  value={existingUld}
                  onChange={(e) => setExistingUld(e.target.value)}
                  placeholder="Enter existing ULD number"
                  className="w-full"
                />
              )}
            </div>
          )}

          {/* Split Groups */}
          {actionType === "split" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-gray-900">Split Groups</Label>
                <Button
                  onClick={handleAddSplitGroup}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Group
                </Button>
              </div>
              <div className="space-y-3">
                {splitGroups.map((group, index) => (
                  <div key={group.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-sm">Group {index + 1}</div>
                      <button
                        onClick={() => handleRemoveSplitGroup(index)}
                        disabled={splitGroups.length === 1}
                        className="p-1 hover:bg-red-100 rounded text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">No.</Label>
                        <Input
                          value={group.no}
                          onChange={(e) => updateSplitGroup(index, "no", e.target.value)}
                          placeholder="e.g., 829379"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Pieces</Label>
                        <Input
                          type="number"
                          value={group.pieces}
                          onChange={(e) => updateSplitGroup(index, "pieces", e.target.value)}
                          placeholder="0"
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Label className="text-xs text-gray-600 mb-1 block">ULD (Optional)</Label>
                      <Input
                        value={group.uld || ""}
                        onChange={(e) => updateSplitGroup(index, "uld", e.target.value)}
                        placeholder="Enter ULD number"
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {remainingPieces !== 0 && (
                <div className={`mt-3 p-3 rounded-lg ${remainingPieces > 0 ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800"}`}>
                  <div className="text-xs font-medium">
                    {remainingPieces > 0
                      ? `Remaining pieces: ${remainingPieces}`
                      : `Total pieces exceed original (${awb.pcs}) by ${Math.abs(remainingPieces)}`}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {actionType === "split" && (
              <Button 
                onClick={handleSplit} 
                disabled={!canSplit}
                className="bg-[#D71A21] hover:bg-[#B0151A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Split
              </Button>
            )}
            {actionType === "offload" && (
              <Button 
                onClick={handleOffload} 
                disabled={!canOffload}
                className="bg-[#D71A21] hover:bg-[#B0151A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Offload
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {loadType && (
              <Button 
                onClick={handleLoadULD} 
                disabled={!canLoadULD}
                className="bg-[#D71A21] hover:bg-[#B0151A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load ULD
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Component for showing "Loaded" status with cancel option
export function LoadedStatusModal({
  isOpen,
  onClose,
  awbNo,
  onCancelLoading,
}: {
  isOpen: boolean
  onClose: () => void
  awbNo: string
  onCancelLoading: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Loaded</h3>
              <p className="text-sm text-gray-500">{awbNo}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-gray-600">...</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCancelLoading} className="text-red-600">
                Cancel Loading
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

