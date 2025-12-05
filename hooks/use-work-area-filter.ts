import { useState, useMemo } from "react"
import type { WorkArea, PilPerSubFilter } from "@/lib/work-area-filter-utils"

export function useWorkAreaFilter() {
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
  
  return {
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
}


