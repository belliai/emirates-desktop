"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { X, SplitSquareVertical, PackageIcon, CheckCircle, CircleAlert, FilePen, Trash2, Plus, PackageX, BoxesIcon, PackageMinusIcon } from "lucide-react"
import { useForm, useFieldArray } from "react-hook-form"
import type { AWBRow } from "./load-plan-types"

interface AWBSplitOffloadModalProps {
  isOpen: boolean
  onClose: () => void
  awb: AWBRow
  onMarkLoaded: () => void
  onMarkOffload: (remainingPieces: string, remarks: string) => void
  onConfirmSplit?: (splitGroups: SplitGroup[]) => void
}

export type SplitGroup = {
  id: string
  weight_kg: number
  pieces: number
  assignment?: {
    type: "uld" | "bulk" | "offloaded"
    id: string
    name: string
  }
}

type SimpleSplitFormValues = {
  simple_split_groups: SplitGroup[]
}

const getInitialValues = () => {
  return {
    simple_split_groups: [
      {
        id: crypto.randomUUID(),
        weight_kg: 0,
        pieces: 0,
      },
    ],
  }
}

const formatDecimal = (num: number): number => {
  return Math.round(num * 100) / 100
}

export function AWBSplitOffloadModal({
  isOpen,
  onClose,
  awb,
  onMarkLoaded,
  onMarkOffload,
  onConfirmSplit,
}: AWBSplitOffloadModalProps) {
  const [activeTab, setActiveTab] = useState<"quick" | "split">("quick")
  const [remainingPieces, setRemainingPieces] = useState("")
  const [offloadRemarks, setOffloadRemarks] = useState("")
  
  const totalPieces = parseInt(awb.pcs) || 0
  const totalWeight = parseFloat(awb.wgt) || 0

  // Split form logic
  const form = useForm<SimpleSplitFormValues>({
    defaultValues: getInitialValues(),
  })

  const { setValue } = form
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  const onReset = useCallback(() => {
    form.reset(getInitialValues())
  }, [form])

  const splitGroups = form.watch("simple_split_groups")
  const stringifiedSplitGroups = JSON.stringify(splitGroups)

  const { totalWeight: splitTotalWeight, totalPieces: splitTotalPieces } = useMemo(() => {
    const parsedSplitGroups = JSON.parse(stringifiedSplitGroups) as SplitGroup[]
    return parsedSplitGroups.reduce(
      (acc, group) => {
        return {
          totalWeight: formatDecimal(acc.totalWeight + Number(group.weight_kg || 0)),
          totalPieces: formatDecimal(acc.totalPieces + Number(group.pieces || 0)),
        }
      },
      { totalWeight: 0, totalPieces: 0 }
    )
  }, [stringifiedSplitGroups])

  const { remainingWeight, remainingPieces: splitRemainingPieces } = useMemo(() => {
    return {
      remainingWeight: formatDecimal(totalWeight - splitTotalWeight),
      remainingPieces: formatDecimal(totalPieces - splitTotalPieces),
    }
  }, [totalWeight, totalPieces, splitTotalWeight, splitTotalPieces])

  const hasRemainingWeightOrPieces = remainingWeight > 0 || splitRemainingPieces > 0
  const hasNegativeRemainingWeightOrPieces = remainingWeight < 0 || splitRemainingPieces < 0

  const isInvalid =
    hasNegativeRemainingWeightOrPieces ||
    splitGroups.some((group) => (group.weight_kg || 0) <= 0 || (group.pieces || 0) <= 0)

  const splitGroupFieldArray = useFieldArray({
    control: form.control,
    name: "simple_split_groups",
  })

  const onRemoveSplitGroup = useCallback(
    (index: number) => {
      splitGroupFieldArray.remove(index)
    },
    [splitGroupFieldArray]
  )

  const onAutoFillRemaining = useCallback(() => {
    const lastGroup = splitGroupFieldArray.fields[splitGroupFieldArray.fields.length - 1]
    if (!lastGroup) return

    setValue(`simple_split_groups.${splitGroupFieldArray.fields.length - 1}`, {
      id: lastGroup.id,
      weight_kg: remainingWeight,
      pieces: splitRemainingPieces,
    })
  }, [remainingWeight, splitRemainingPieces, setValue, splitGroupFieldArray])

  const getCardDescription = useCallback(() => {
    if (hasNegativeRemainingWeightOrPieces)
      return "Totals of split group exceeds original total weight and pieces."
    if (hasRemainingWeightOrPieces)
      return "Remaining weight and pieces will be automatically allocated as a separate split group."
    if (splitGroups.some((group) => (group.weight_kg || 0) <= 0 || (group.pieces || 0) <= 0))
      return "Weight and pieces cannot be 0 or negative."
    return "All weight and pieces have been allocated."
  }, [hasRemainingWeightOrPieces, hasNegativeRemainingWeightOrPieces, splitGroups])

  const estimatedPerPieceWeight = useMemo(() => {
    return formatDecimal(totalWeight / totalPieces)
  }, [totalWeight, totalPieces])

  const isPrevFromLastIndexFilled = useMemo(() => {
    const parsedSplitGroups = JSON.parse(stringifiedSplitGroups) as SplitGroup[]
    if (parsedSplitGroups.length === 1) return false
    return parsedSplitGroups.slice(0, -1).every((group) => group.weight_kg && group.pieces)
  }, [stringifiedSplitGroups])

  const handlePiecesChange = useCallback(
    (index: number, value: string) => {
      const pieces = Number(value)
      setValue(`simple_split_groups.${index}.pieces`, pieces)

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      debounceTimeoutRef.current = setTimeout(() => {
        const currentRowWeight = Number(splitGroups[index].weight_kg)
        if (currentRowWeight) return

        const weight = formatDecimal(pieces * estimatedPerPieceWeight)
        const weightToSet =
          weight > remainingWeight || pieces === splitRemainingPieces ? remainingWeight : weight
        setValue(`simple_split_groups.${index}.weight_kg`, weightToSet)
      }, 500)
    },
    [setValue, splitGroups, estimatedPerPieceWeight, remainingWeight, splitRemainingPieces]
  )

  const handleWeightChange = useCallback(
    (index: number, value: string) => {
      const weight = Number(value)
      setValue(`simple_split_groups.${index}.weight_kg`, weight)

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      debounceTimeoutRef.current = setTimeout(() => {
        const currentRowPieces = Number(splitGroups[index].pieces)
        if (currentRowPieces) return

        const pieces = Math.round(weight / estimatedPerPieceWeight)
        setValue(`simple_split_groups.${index}.pieces`, pieces)
      }, 500)
    },
    [setValue, splitGroups, estimatedPerPieceWeight]
  )

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

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

  const handleSubmitSplit = () => {
    if (isInvalid) return
    
    let finalSplitGroups: SplitGroup[] = form.getValues().simple_split_groups.map((group) => ({
      id: group.id || crypto.randomUUID(),
      pieces: group.pieces,
      weight_kg: group.weight_kg,
    }))

    // If there are remaining weight or pieces, create an additional split group
    if (hasRemainingWeightOrPieces && (remainingWeight > 0 || splitRemainingPieces > 0)) {
      const remainingGroup: SplitGroup = {
        id: crypto.randomUUID(),
        pieces: splitRemainingPieces,
        weight_kg: remainingWeight,
      }
      finalSplitGroups.push(remainingGroup)
    }

    onConfirmSplit?.(finalSplitGroups)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg border border-gray-200 w-[90vw] max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <SplitSquareVertical className="w-5 h-5 text-gray-600" />
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab("quick")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "quick"
                ? "text-[#D71A21] border-b-2 border-[#D71A21] bg-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Quick Actions
          </button>
          <button
            onClick={() => setActiveTab("split")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "split"
                ? "text-[#D71A21] border-b-2 border-[#D71A21] bg-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Split AWB
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "quick" && (
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
          )}

          {activeTab === "split" && (
            <div className="space-y-4">
              {/* Remaining Status Card */}
              <div
                className={`rounded-lg p-3 border ${
                  hasNegativeRemainingWeightOrPieces
                    ? "border-red-500/50 bg-red-500/10"
                    : hasRemainingWeightOrPieces
                    ? "border-yellow-400/50 bg-yellow-400/10"
                    : "border-green-500/50 bg-green-500/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  {isInvalid ? (
                    <CircleAlert
                      className={`mt-0.5 w-4 h-4 flex-shrink-0 ${
                        hasNegativeRemainingWeightOrPieces ? "text-red-500" : "text-yellow-400"
                      }`}
                    />
                  ) : (
                    <CheckCircle className="mt-0.5 w-4 h-4 flex-shrink-0 text-green-500" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-medium ${
                          hasNegativeRemainingWeightOrPieces
                            ? "text-red-500"
                            : hasRemainingWeightOrPieces
                            ? "text-yellow-400"
                            : "text-green-500"
                        }`}
                      >
                        Remaining weight and pieces
                      </span>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span>{splitRemainingPieces} pcs</span>
                        <span className="text-gray-400">|</span>
                        <span>{remainingWeight} kg</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">{getCardDescription()}</p>
                  </div>
                </div>
              </div>

              {/* Split Groups */}
              <div className="space-y-3">
                {splitGroupFieldArray.fields.map((field, index) => {
                  const values = splitGroups[index]
                  const isValuesFilled = values.weight_kg || values.pieces
                  const isEnableAutoFill =
                    index !== 0 &&
                    index === splitGroups.length - 1 &&
                    isPrevFromLastIndexFilled &&
                    !isValuesFilled

                  return (
                    <div key={field.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Group {index + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEnableAutoFill && (
                            <button
                              type="button"
                              onClick={onAutoFillRemaining}
                              className="p-1 hover:bg-gray-200 rounded text-gray-600"
                              title="Auto fill remaining"
                            >
                              <FilePen className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onRemoveSplitGroup(index)}
                            disabled={splitGroupFieldArray.fields.length === 1}
                            className="p-1 hover:bg-red-100 rounded text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete group"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-1">
                            Pieces
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={values.pieces || ""}
                              onChange={(e) => handlePiecesChange(index, e.target.value)}
                              className="w-full px-2 py-1.5 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-400 bg-gray-50"
                              placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                              pcs
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-1">
                            Weight
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={values.weight_kg || ""}
                              onChange={(e) => handleWeightChange(index, e.target.value)}
                              className="w-full px-2 py-1.5 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-400 bg-gray-50"
                              placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                              kg
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <button
                  type="button"
                  onClick={() =>
                    splitGroupFieldArray.append({
                      id: crypto.randomUUID(),
                      weight_kg: 0,
                      pieces: 0,
                    })
                  }
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Group
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer (only show for Split tab) */}
        {activeTab === "split" && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onReset}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSubmitSplit}
              disabled={isInvalid}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#D71A21] rounded-md hover:bg-[#B01419] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Split
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


