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
 * Check if an AWB has VAL (Valuable) or AVI (Live Animals) SHC code
 * These shipments are handled by specialized teams, not regular build-up staff
 * VAL = Valuable cargo (gold, jewelry, cash) → Handled by security team
 * AVI = Live Animals → Handled by animal handling team
 */
export function hasValAviShcCode(awb: AWBRow): boolean {
  if (!awb.shc || awb.shc.trim() === "") {
    return false
  }
  
  const shcUpper = awb.shc.trim().toUpperCase()
  // VAL = Valuable cargo, AVI = Live Animals
  return shcUpper.includes("VAL") || shcUpper.includes("AVI")
}

/**
 * Check if a ULD section contains ONLY VAL/AVI cargo (no regular cargo)
 * These sections are handled by specialized teams and should be excluded from completion calculations
 * 
 * NOTE: If a section has MIXED cargo (VAL + regular), it's still included because
 * staff needs to build up the regular cargo even if they don't handle the VAL/AVI pieces
 */
export function isValAviOnlyULDSection(uldSection: ULDSection): boolean {
  if (!uldSection.awbs || uldSection.awbs.length === 0) {
    return false
  }
  // Section is VAL/AVI only if ALL AWBs have VAL or AVI SHC
  return uldSection.awbs.every(awb => hasValAviShcCode(awb))
}

/**
 * Determine if a ULD section should be included in COMPLETION BAR calculations
 * 
 * IMPORTANT: This function excludes the following from completion calculations:
 * - Ramp Transfer sections (not part of TTL PLN ULD count)
 * - BULK-only sections (view-only, not part of ULD completion tracking)
 * - VAL/AVI-only sections (handled by specialized teams, not regular build-up staff)
 * 
 * For UI DISPLAY filtering (showing sections in the table), use shouldDisplayULDSection instead.
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
  
  // Always exclude VAL/AVI-only sections from completion calculations
  // VAL (Valuable) and AVI (Live Animals) are handled by specialized teams
  // Only exclude if ALL AWBs in the section are VAL/AVI (not mixed cargo)
  if (isValAviOnlyULDSection(uldSection)) {
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

/**
 * Determine if a ULD section should be DISPLAYED in the UI based on work area filter
 * 
 * Unlike shouldIncludeULDSection (used for completion calculations), this function:
 * - INCLUDES Ramp Transfer sections (they should be visible but grayed out)
 * - INCLUDES BULK sections (they should be visible)
 * - INCLUDES VAL/AVI-only sections (they should be visible but handled by specialized teams)
 * - Still filters by work area (GCR vs PIL/PER)
 * 
 * Use this for filtering what's shown in the load plan detail table.
 */
export function shouldDisplayULDSection(
  uldSection: ULDSection,
  workArea: WorkArea,
  pilPerSubFilter?: PilPerSubFilter
): boolean {
  // If no filter or filter is "All", show all sections (including RAMP TRANSFER, BULK, VAL/AVI)
  if (!workArea || workArea === "All") {
    return true
  }
  
  // For RAMP TRANSFER, BULK, and VAL/AVI-only sections, always show them regardless of work area filter
  // They should be visible but styled differently (grayed out / not counted in completion)
  if (uldSection.isRampTransfer || isBulkULDSection(uldSection) || isValAviOnlyULDSection(uldSection)) {
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



