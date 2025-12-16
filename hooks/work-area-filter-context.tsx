"use client"

import { createContext, useContext, useState, useMemo, type ReactNode } from "react"
import type { WorkArea, PilPerSubFilter } from "@/lib/work-area-filter-utils"

type WorkAreaFilterContextType = {
  selectedWorkArea: WorkArea
  pilPerSubFilter: PilPerSubFilter
  isGcrActive: boolean
  isPilPerActive: boolean
  toggleGcr: () => void
  togglePilPer: () => void
  setPilPerSubFilter: (filter: PilPerSubFilter) => void
  setIsGcrActive: (active: boolean) => void
  setIsPilPerActive: (active: boolean) => void
}

const WorkAreaFilterContext = createContext<WorkAreaFilterContextType | null>(null)

export function WorkAreaFilterProvider({ children }: { children: ReactNode }) {
  // Independent toggles for work areas
  const [isGcrActive, setIsGcrActive] = useState(true)
  const [isPilPerActive, setIsPilPerActive] = useState(true)
  const [pilPerSubFilter, setPilPerSubFilter] = useState<PilPerSubFilter>("Both")
  
  // Derive selectedWorkArea from toggle states
  const selectedWorkArea: WorkArea = useMemo(() => {
    if (isGcrActive && isPilPerActive) {
      return "All"
    } else if (isGcrActive) {
      return "GCR"
    } else if (isPilPerActive) {
      return "PIL and PER"
    } else {
      return "All" // Default to "All" when neither is active
    }
  }, [isGcrActive, isPilPerActive])
  
  function toggleGcr() {
    setIsGcrActive(prev => !prev)
  }
  
  function togglePilPer() {
    setIsPilPerActive(prev => {
      const newValue = !prev
      // Reset to "Both" when activating PIL/PER
      if (newValue) {
        setPilPerSubFilter("Both")
      }
      return newValue
    })
  }
  
  const value = {
    selectedWorkArea,
    pilPerSubFilter,
    isGcrActive,
    isPilPerActive,
    toggleGcr,
    togglePilPer,
    setPilPerSubFilter,
    setIsGcrActive,
    setIsPilPerActive,
  }
  
  return (
    <WorkAreaFilterContext.Provider value={value}>
      {children}
    </WorkAreaFilterContext.Provider>
  )
}

export function useWorkAreaFilterContext() {
  const context = useContext(WorkAreaFilterContext)
  if (!context) {
    throw new Error("useWorkAreaFilterContext must be used within a WorkAreaFilterProvider")
  }
  return context
}

