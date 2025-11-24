"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { parseULDSection } from "@/lib/uld-parser"

interface ULDNumberModalProps {
  isOpen: boolean
  onClose: () => void
  uldSection: string
  sectorIndex: number
  uldSectionIndex: number
  initialNumbers: string[]
  onSave: (numbers: string[]) => void
}

export function ULDNumberModal({
  isOpen,
  onClose,
  uldSection,
  initialNumbers,
  onSave,
}: ULDNumberModalProps) {
  const { expandedTypes, types } = parseULDSection(uldSection)
  const [uldNumbers, setUldNumbers] = useState<string[]>([])
  const [currentTypes, setCurrentTypes] = useState<string[]>([])
  
  // Available ULD types for dropdown
  const availableTypes = ["PMC", "AKE", "AKL", "AMF", "ALF", "PLA", "PAG", "AMP", "RKE", "BULK"]

  useEffect(() => {
    if (isOpen) {
      // Initialize with existing numbers or empty strings based on expandedTypes count
      const expectedCount = expandedTypes.length
      if (initialNumbers.length === expectedCount && expectedCount > 0) {
        setUldNumbers([...initialNumbers])
        setCurrentTypes([...expandedTypes])
      } else if (initialNumbers.length > 0) {
        // If we have saved numbers, use those and extend types
        setUldNumbers([...initialNumbers])
        // Extend types array to match numbers length
        const extendedTypes = [...expandedTypes]
        const lastType = expandedTypes.length > 0 
          ? expandedTypes[expandedTypes.length - 1] 
          : (types[0] || "PMC")
        while (extendedTypes.length < initialNumbers.length) {
          extendedTypes.push(lastType)
        }
        setCurrentTypes(extendedTypes)
      } else if (expectedCount > 0) {
        setUldNumbers(Array(expectedCount).fill(""))
        setCurrentTypes([...expandedTypes])
      } else {
        // No expected ULDs, start with empty array
        setUldNumbers([])
        setCurrentTypes([])
      }
    } else {
      // Reset when modal closes
      setUldNumbers([])
      setCurrentTypes([])
    }
  }, [isOpen, initialNumbers.length, expandedTypes.length])

  if (!isOpen) return null

  const handleSave = () => {
    // Save all ULD numbers (including empty ones)
    onSave(uldNumbers)
    onClose()
  }

  const handleNumberChange = (index: number, value: string) => {
    const updated = [...uldNumbers]
    updated[index] = value
    setUldNumbers(updated)
  }

  const handleTypeChange = (index: number, value: string) => {
    setCurrentTypes((prev) => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const handleAdd = () => {
    // Add a new empty ULD number
    // Use the last type if available, otherwise use the first type
    setUldNumbers((prev) => {
      return [...prev, ""]
    })
    setCurrentTypes((prevTypes) => {
      const newType = prevTypes.length > 0
        ? prevTypes[prevTypes.length - 1] 
        : (expandedTypes.length > 0 
            ? expandedTypes[expandedTypes.length - 1] 
            : (types[0] || "PMC"))
      return [...prevTypes, newType]
    })
  }

  const handleRemoveItem = (index: number) => {
    setUldNumbers((prev) => {
      if (prev.length > 0) {
        return prev.filter((_, i) => i !== index)
      }
      return prev
    })
    setCurrentTypes((prev) => {
      if (prev.length > 0) {
        return prev.filter((_, i) => i !== index)
      }
      return prev
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-auto min-w-[500px] max-w-[800px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Enter ULD Numbers</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="mb-3 text-xs text-gray-600">
          Section: <span className="font-mono font-semibold">{uldSection}</span>
        </div>

        <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {uldNumbers.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">No ULDs yet. Click "Add ULD" to add one.</div>
          ) : (
            uldNumbers.map((number, index) => {
              const type = currentTypes[index] || types[0] || "PMC"
              return (
                <div key={index} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <label className="text-xs font-medium text-gray-700 whitespace-nowrap min-w-[80px]">
                    ULD {index + 1}:
                  </label>
                  <select
                    value={type}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleTypeChange(index, e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-400 min-w-[100px]"
                  >
                    {availableTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={number || ""}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleNumberChange(index, e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-400"
                    placeholder={`Enter ULD number`}
                    autoFocus={index === 0 && uldNumbers.every(n => !n)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveItem(index)
                    }}
                    className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove this ULD"
                    aria-label="Remove ULD"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleAdd()
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
            title="Add ULD"
          >
            <Plus className="w-4 h-4" />
            Add ULD
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleSave()
            }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#D71A21] hover:bg-[#B0151A] rounded-md transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

