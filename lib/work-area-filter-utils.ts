import type { AWBRow, ULDSection } from "@/components/load-plan-types"

// Types
export type WorkArea = "All" | "GCR" | "PIL and PER"
export type PilPerSubFilter = "Both" | "PIL only" | "PER only"

// PIL/PER SHC codes that identify PIL and PER work areas
export const PIL_PER_SHC_CODES = ["FRO", "FRI", "ACT", "CRT", "COL", "ERT", "PIL-ACT", "PIL-COL", "PEF-COL", "PER-COL"]

/**
 * Check if an AWB has any PIL/PER SHC code
 * Case-insensitive matching, exact match required
 */
export function hasPilPerShcCode(awb: AWBRow): boolean {
  if (!awb.shc || awb.shc.trim() === "") {
    return false
  }
  
  const shcUpper = awb.shc.trim().toUpperCase()
  return PIL_PER_SHC_CODES.some(code => shcUpper === code.toUpperCase())
}

/**
 * Check if an AWB has PIL SHC code (contains "PIL" in the SHC)
 * Used to distinguish between PIL and PER work areas
 */
export function hasPilShcCode(awb: AWBRow): boolean {
  if (!awb.shc || awb.shc.trim() === "") {
    return false
  }
  
  const shcUpper = awb.shc.trim().toUpperCase()
  return shcUpper.includes("PIL")
}

/**
 * Check if an AWB has PER SHC code (has PIL/PER codes but NOT "PIL")
 * Used to distinguish between PIL and PER work areas
 */
export function hasPerShcCode(awb: AWBRow): boolean {
  return hasPilPerShcCode(awb) && !hasPilShcCode(awb)
}

/**
 * Check if a ULD section contains any AWB with PIL/PER SHC codes
 */
export function uldSectionHasPilPerShc(uldSection: ULDSection): boolean {
  return uldSection.awbs.some(awb => hasPilPerShcCode(awb))
}

/**
 * Check if a ULD section contains any AWB with PIL SHC codes
 */
export function uldSectionHasPilShc(uldSection: ULDSection): boolean {
  return uldSection.awbs.some(awb => hasPilShcCode(awb))
}

/**
 * Check if a ULD section contains any AWB with PER SHC codes
 */
export function uldSectionHasPerShc(uldSection: ULDSection): boolean {
  return uldSection.awbs.some(awb => hasPerShcCode(awb))
}

/**
 * Determine if a ULD section should be included based on work area filter
 * Centralizes the filtering logic used across multiple screens
 */
export function shouldIncludeULDSection(
  uldSection: ULDSection,
  workArea: WorkArea,
  pilPerSubFilter?: PilPerSubFilter
): boolean {
  // If no filter or filter is "All", show all sections
  if (!workArea || workArea === "All") {
    return true
  }
  
  // For "GCR" filter, only show sections that DON'T have PIL/PER SHC codes
  if (workArea === "GCR") {
    return !uldSectionHasPilPerShc(uldSection)
  }
  
  // For "PIL and PER" filter, show sections that have PIL/PER SHC codes
  if (workArea === "PIL and PER") {
    const hasPilPer = uldSectionHasPilPerShc(uldSection)
    
    // Apply PIL/PER sub-filter if specified
    if (hasPilPer && pilPerSubFilter && pilPerSubFilter !== "Both") {
      if (pilPerSubFilter === "PIL only") {
        return uldSectionHasPilShc(uldSection)
      } else if (pilPerSubFilter === "PER only") {
        return uldSectionHasPerShc(uldSection)
      }
    }
    
    return hasPilPer
  }
  
  return true
}


