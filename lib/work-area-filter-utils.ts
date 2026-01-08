import type { AWBRow, ULDSection } from "@/components/load-plan-types"

// Types
export type WorkArea = "All" | "GCR" | "PIL and PER"
export type PilPerSubFilter = "Both" | "PIL only" | "PER only"

// PIL/PER SHC codes that identify PIL and PER work areas
// These codes indicate perishable (PER) or live animal (PIL) cargo
export const PIL_PER_SHC_CODES = [
  // Perishable codes
  "FRO", "FRI", "ACT", "CRT", "COL", "ERT", "PER", "PEP", "PEF",
  // Live animal codes
  "PIL", "AVI", "LIV",
  // Compound codes (for reference)
  "PIL-ACT", "PIL-COL", "PEF-COL", "PER-COL", "PEP-COL"
]

/**
 * Check if an AWB has any PIL/PER SHC code
 * Case-insensitive matching, checks if SHC contains any of the PIL/PER codes
 */
export function hasPilPerShcCode(awb: AWBRow): boolean {
  if (!awb.shc || awb.shc.trim() === "") {
    return false
  }
  
  const shcUpper = awb.shc.trim().toUpperCase()
  // Check if the SHC contains any of the PIL/PER codes (partial match)
  return PIL_PER_SHC_CODES.some(code => shcUpper.includes(code.toUpperCase()))
}

/**
 * Check if an AWB has PIL SHC code (Live Animals)
 * PIL codes include: PIL, AVI (Aviation/Live Animals), LIV (Live Animals)
 * Used to distinguish between PIL and PER work areas
 */
export function hasPilShcCode(awb: AWBRow): boolean {
  if (!awb.shc || awb.shc.trim() === "") {
    return false
  }
  
  const shcUpper = awb.shc.trim().toUpperCase()
  // PIL = Perishable In Live, AVI = Aviation (Live Animals), LIV = Live Animals
  return shcUpper.includes("PIL") || shcUpper.includes("AVI") || shcUpper.includes("LIV")
}

/**
 * Check if an AWB has PER SHC code (perishable cargo, NOT live animals)
 * PER codes include: PER, PEP, PEF, FRO, FRI, ACT, CRT, COL, ERT, PES (perishable fish, etc.)
 * Used to distinguish between PIL (live animals) and PER (perishables) work areas
 */
export function hasPerShcCode(awb: AWBRow): boolean {
  if (!awb.shc || awb.shc.trim() === "") {
    return false
  }
  
  // If it's a PIL code (live animals), it's NOT a PER code
  if (hasPilShcCode(awb)) {
    return false
  }
  
  const shcUpper = awb.shc.trim().toUpperCase()
  // Check for perishable indicators (excludes live animals which are handled by hasPilShcCode)
  const perCodes = ["PER", "PEP", "PEF", "FRO", "FRI", "ACT", "CRT", "COL", "ERT", "PES", "ECC"]
  return perCodes.some(code => shcUpper.includes(code))
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
 * Check if a ULD section is a BULK-only section (excluded from completion calculations)
 * BULK sections are view-only and not part of ULD completion tracking
 */
export function isBulkULDSection(uldSection: ULDSection): boolean {
  if (!uldSection.uld) return false
  const uldUpper = uldSection.uld.toUpperCase()
  // Check if this is a BULK-only section (e.g., "XX BULK XX")
  // A section is BULK-only if it contains BULK but no other ULD types with counts
  return uldUpper.includes("BULK") && !uldUpper.match(/\d+\s*[A-Z]{2,4}(?!\s*BULK)/i)
}

/**
 * Determine if a ULD section should be included based on work area filter
 * Centralizes the filtering logic used across multiple screens
 * 
 * IMPORTANT: This function excludes Ramp Transfer and BULK-only sections from
 * completion calculations, as they are not part of the TTL PLN ULD count.
 */
export function shouldIncludeULDSection(
  uldSection: ULDSection,
  workArea: WorkArea,
  pilPerSubFilter?: PilPerSubFilter
): boolean {
  // Always exclude ramp transfer sections from completion calculations
  // Ramp transfer items are excluded from TTL PLN ULD count
  if (uldSection.isRampTransfer) {
    return false
  }
  
  // Always exclude BULK-only sections from completion calculations
  // BULK is view-only and not part of ULD completion tracking
  if (isBulkULDSection(uldSection)) {
    return false
  }
  
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



