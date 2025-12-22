"use client"

import { useState, useEffect, useRef } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { parseULDSection } from "@/lib/uld-parser"

export type ULDEntry = {
  number: string
  checked: boolean
  type: string
}

interface ULDNumberModalProps {
  isOpen: boolean
  onClose: () => void
  uldSection: string // For display purposes (section name)
  ttlPlnUld?: string // TTL PLN ULD from header - source of truth for ULD count
  sectorIndex: number
  uldSectionIndex: number
  initialNumbers: string[]
  initialChecked?: boolean[]
  initialTypes?: string[]
  onSave: (entries: ULDEntry[]) => void
}

export function ULDNumberModal({
  isOpen,
  onClose,
  uldSection,
  ttlPlnUld,
  initialNumbers,
  initialChecked,
  initialTypes,
  onSave,
}: ULDNumberModalProps) {
  // Use TTL PLN ULD from header if provided, otherwise fall back to section string
  // TTL PLN ULD is the authoritative source for total ULD count
  const sourceString = ttlPlnUld || uldSection
  const { expandedTypes, types } = parseULDSection(sourceString)
  const [uldEntries, setUldEntries] = useState<ULDEntry[]>([])
  
  // Track previous values to avoid infinite loops
  const prevIsOpenRef = useRef(false)
  const prevInitialNumbersRef = useRef<string>("")
  const prevInitialCheckedRef = useRef<string>("")
  const prevInitialTypesRef = useRef<string>("")
  
  // Available ULD types for dropdown
  const availableTypes = ["PMC", "AKE", "AKL", "AMF", "ALF", "PLA", "PAG", "AMP", "RKE", "BULK"]

  useEffect(() => {
    // Only initialize when modal opens or when initial values actually change
    const initialNumbersStr = JSON.stringify(initialNumbers)
    const initialCheckedStr = JSON.stringify(initialChecked)
    const initialTypesStr = JSON.stringify(initialTypes)
    
    const isOpening = isOpen && !prevIsOpenRef.current
    const numbersChanged = initialNumbersStr !== prevInitialNumbersRef.current
    const checkedChanged = initialCheckedStr !== prevInitialCheckedRef.current
    const typesChanged = initialTypesStr !== prevInitialTypesRef.current
    
    if (isOpen) {
      if (isOpening || numbersChanged || checkedChanged || typesChanged) {
        // Initialize with existing entries or create new ones
        const expectedCount = expandedTypes.length
        
        if (initialNumbers.length > 0 && initialTypes && initialTypes.length === initialNumbers.length) {
          // Use existing data
          const entries: ULDEntry[] = initialNumbers.map((number, index) => ({
            number: number || "",
            checked: initialChecked?.[index] ?? false,
            type: initialTypes[index] || expandedTypes[index] || types[0] || "PMC"
          }))
          setUldEntries(entries)
        } else if (expectedCount > 0) {
          // Initialize with empty entries based on expandedTypes
          const entries: ULDEntry[] = expandedTypes.map((type) => ({
            number: "",
            checked: false,
            type: type
          }))
          setUldEntries(entries)
        } else {
          // No expected ULDs, start with empty array
          setUldEntries([])
        }
        
        // Update refs
        prevInitialNumbersRef.current = initialNumbersStr
        prevInitialCheckedRef.current = initialCheckedStr
        prevInitialTypesRef.current = initialTypesStr
      }
    } else {
      // Reset when modal closes
      if (prevIsOpenRef.current) {
        setUldEntries([])
      }
    }
    
    prevIsOpenRef.current = isOpen
  }, [isOpen, initialNumbers, initialChecked, initialTypes, expandedTypes, types])

  if (!isOpen) return null

  const handleSave = () => {
    // Save only checked entries (saving is based on checkbox, not ULD number)
    onSave(uldEntries)
    onClose()
  }

  const handleNumberChange = (index: number, value: string) => {
    setUldEntries((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], number: value }
      return updated
    })
  }

  const handleTypeChange = (index: number, value: string) => {
    setUldEntries((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], type: value }
      return updated
    })
  }

  const handleCheckedChange = (index: number, checked: boolean) => {
    setUldEntries((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], checked }
      return updated
    })
  }

  const handleAdd = () => {
    // Add a new empty ULD entry
    const lastType = uldEntries.length > 0
      ? uldEntries[uldEntries.length - 1].type
      : (expandedTypes.length > 0 
          ? expandedTypes[expandedTypes.length - 1] 
          : (types[0] || "PMC"))
    
    setUldEntries((prev) => [
      ...prev,
      { number: "", checked: false, type: lastType }
    ])
  }

  const handleRemoveItem = (index: number) => {
    setUldEntries((prev) => {
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
          {uldEntries.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">No ULDs yet. Click "Add ULD" to add one.</div>
          ) : (
            uldEntries.map((entry, index) => {
              return (
                <div 
                  key={index} 
                  className="flex items-center gap-2" 
                  onClick={(e) => {
                    // Only stop propagation if not clicking on interactive elements
                    const target = e.target as HTMLElement
                    if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT' && target.tagName !== 'BUTTON' && !target.closest('button')) {
                      e.stopPropagation()
                    }
                  }}
                >
                  <label className="text-xs font-medium text-gray-700 whitespace-nowrap min-w-[80px]">
                    ULD {index + 1}:
                  </label>
                  <input
                    type="checkbox"
                    checked={entry.checked}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleCheckedChange(index, e.target.checked)
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                    }}
                    className="w-4 h-4 text-[#D71A21] border-gray-300 rounded focus:ring-[#D71A21] cursor-pointer flex-shrink-0"
                    title="Mark as final"
                  />
                  <select
                    value={entry.type}
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
                    value={entry.number || ""}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleNumberChange(index, e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-400"
                    placeholder="Enter ULD number (optional)"
                    autoFocus={index === 0 && uldEntries.every(e => !e.number)}
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

