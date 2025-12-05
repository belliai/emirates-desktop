"use client"

import { useWorkAreaFilter } from "@/hooks/use-work-area-filter"
import type { PilPerSubFilter } from "@/lib/work-area-filter-utils"

export { useWorkAreaFilter }

type WorkAreaFilterControlsProps = {
  className?: string
}

export function WorkAreaFilterControls({ className = "" }: WorkAreaFilterControlsProps) {
  const {
    isGcrActive,
    isPilPerActive,
    pilPerSubFilter,
    toggleGcr,
    togglePilPer,
    setPilPerSubFilter,
  } = useWorkAreaFilter()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={toggleGcr}
        className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
          isGcrActive
            ? "bg-gray-200 text-gray-900 font-medium"
            : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
        }`}
      >
        GCR
      </button>
      <button
        type="button"
        onClick={togglePilPer}
        className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
          isPilPerActive
            ? "bg-gray-200 text-gray-900 font-medium"
            : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
        }`}
      >
        PIL/PER
      </button>
      
      {/* PIL/PER Sub-filter dropdown - always visible, only clickable when PIL/PER is sole active toggle */}
      <select
        value={pilPerSubFilter}
        onChange={(e) => setPilPerSubFilter(e.target.value as PilPerSubFilter)}
        disabled={!isPilPerActive || isGcrActive}
        className={`px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent transition-colors ${
          isPilPerActive && !isGcrActive
            ? "bg-white cursor-pointer"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        <option value="Both">Both</option>
        <option value="PIL only">PIL only</option>
        <option value="PER only">PER only</option>
      </select>
    </div>
  )
}


