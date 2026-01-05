"use client"

import { useWorkAreaFilterContext, WorkAreaFilterProvider } from "@/hooks/work-area-filter-context"
import type { PilPerSubFilter } from "@/lib/work-area-filter-utils"

// Re-export for backward compatibility
export { useWorkAreaFilterContext as useWorkAreaFilter, useWorkAreaFilterContext, WorkAreaFilterProvider }

type WorkAreaFilterControlsProps = {
  className?: string
  variant?: "combined" | "separate" // "combined" = PIL/PER together, "separate" = GCR, PER, PIL individually
}

export function WorkAreaFilterControls({ className = "", variant = "combined" }: WorkAreaFilterControlsProps) {
  const {
    isGcrActive,
    isPilPerActive,
    pilPerSubFilter,
    toggleGcr,
    togglePilPer,
    setPilPerSubFilter,
  } = useWorkAreaFilterContext()

  // Prevent toggling off if it's the only active chip
  const canToggleGcr = !isGcrActive || isPilPerActive
  const canTogglePilPer = !isPilPerActive || isGcrActive

  // For separate variant: determine if PER and PIL are individually active
  const isPerActive = isPilPerActive && (pilPerSubFilter === "Both" || pilPerSubFilter === "PER only")
  const isPilActive = isPilPerActive && (pilPerSubFilter === "Both" || pilPerSubFilter === "PIL only")

  // Handler for separate PER/PIL buttons
  const handlePerToggle = () => {
    if (!isPilPerActive) {
      // Enable PIL/PER and set to PER only
      togglePilPer()
      setPilPerSubFilter("PER only")
    } else if (pilPerSubFilter === "Both") {
      // Turn off PER, keep PIL
      setPilPerSubFilter("PIL only")
    } else if (pilPerSubFilter === "PER only") {
      // Turn off PER entirely - but only if GCR is active
      if (isGcrActive) {
        togglePilPer()
      }
    } else {
      // PIL only is active, add PER
      setPilPerSubFilter("Both")
    }
  }

  const handlePilToggle = () => {
    if (!isPilPerActive) {
      // Enable PIL/PER and set to PIL only
      togglePilPer()
      setPilPerSubFilter("PIL only")
    } else if (pilPerSubFilter === "Both") {
      // Turn off PIL, keep PER
      setPilPerSubFilter("PER only")
    } else if (pilPerSubFilter === "PIL only") {
      // Turn off PIL entirely - but only if GCR is active
      if (isGcrActive) {
        togglePilPer()
      }
    } else {
      // PER only is active, add PIL
      setPilPerSubFilter("Both")
    }
  }

  // Check if we can toggle off (at least one must remain active)
  const canTogglePerOff = isGcrActive || isPilActive
  const canTogglePilOff = isGcrActive || isPerActive

  if (variant === "separate") {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={() => canToggleGcr && toggleGcr()}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            isGcrActive
              ? "bg-gray-200 text-gray-900 font-medium"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          } ${!canToggleGcr ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          GCR
        </button>
        <button
          type="button"
          onClick={handlePerToggle}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            isPerActive
              ? "bg-gray-200 text-gray-900 font-medium"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          } ${!canTogglePerOff && isPerActive ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          PER
        </button>
        <button
          type="button"
          onClick={handlePilToggle}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            isPilActive
              ? "bg-gray-200 text-gray-900 font-medium"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          } ${!canTogglePilOff && isPilActive ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          PIL
        </button>
      </div>
    )
  }

  // Default combined variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => canToggleGcr && toggleGcr()}
        className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
          isGcrActive
            ? "bg-gray-200 text-gray-900 font-medium"
            : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
        } ${!canToggleGcr ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
      >
        GCR
      </button>
      <button
        type="button"
        onClick={() => canTogglePilPer && togglePilPer()}
        className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
          isPilPerActive
            ? "bg-gray-200 text-gray-900 font-medium"
            : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
        } ${!canTogglePilPer ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
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


