/**
 * Trailing instruction pattern types (based on ULD analysis of 1,144 sections)
 * - parenthetical: (ENSURE TO LOAD...) - 24 instances
 * - doubleslash: // OPTIMIZE WITH SBY CARGO - 25 instances  
 * - dashes: --- HL ON EK041 - 15 instances
 * - brackets: [Must load QKE] - 5 instances
 * - other: Fallback for any other trailing content
 */
export type TrailingType = "parenthetical" | "doubleslash" | "dashes" | "brackets" | "other" | "none"

/**
 * Detect the type of trailing instruction pattern
 */
export function detectTrailingType(trailing: string): TrailingType {
  if (!trailing || trailing.trim() === "") return "none"
  
  const trimmed = trailing.trim()
  
  // Check for parenthetical: (...)
  if (trimmed.startsWith("(") && trimmed.includes(")")) return "parenthetical"
  
  // Check for double-slash: // ...
  if (trimmed.startsWith("//")) return "doubleslash"
  
  // Check for dashes: --- or ----
  if (trimmed.startsWith("---")) return "dashes"
  
  // Check for brackets: [...]
  if (trimmed.startsWith("[") && trimmed.includes("]")) return "brackets"
  
  // Fallback for any other trailing content
  return "other"
}

/**
 * Extract core ULD section (XX ... XX) and trailing comment from a ULD string
 * Examples:
 * - "XX 08PMC/01PLA/02AKE XX (ENSURE TO LOAD...)" -> { core: "XX 08PMC/01PLA/02AKE XX", trailing: "(ENSURE TO LOAD...)", trailingType: "parenthetical" }
 * - "XX 01PMC XX --- HL ON EK041" -> { core: "XX 01PMC XX", trailing: "--- HL ON EK041", trailingType: "dashes" }
 * - "XX 02AKE XX" -> { core: "XX 02AKE XX", trailing: "", trailingType: "none" }
 */
export function extractULDParts(uldString: string): { core: string; trailing: string; trailingType: TrailingType } {
  if (!uldString) {
    return { core: "", trailing: "", trailingType: "none" }
  }
  
  // Match pattern: XX ... XX followed by optional trailing content
  const match = uldString.match(/^(XX\s+.+?\s+XX)(.*)/i)
  if (match) {
    const trailing = match[2].trim()
    return {
      core: match[1].trim(),
      trailing,
      trailingType: detectTrailingType(trailing)
    }
  }
  
  // If no XX markers found, treat entire string as core
  return { core: uldString, trailing: "", trailingType: "none" }
}

/**
 * Parse ULD section string to extract ULD count and types
 * Examples:
 * - "XX 01PMC XX" -> { count: 1, types: ["PMC"], expandedTypes: ["PMC"] }
 * - "XX 02PMC XX" -> { count: 2, types: ["PMC"], expandedTypes: ["PMC", "PMC"] }
 * - "XX 06AKE XX" -> { count: 6, types: ["AKE"], expandedTypes: ["AKE", "AKE", "AKE", "AKE", "AKE", "AKE"] }
 * - "XX 01PMC 01AKE XX" -> { count: 2, types: ["PMC", "AKE"], expandedTypes: ["PMC", "AKE"] }
 * - "XX 02PMC 03AKE XX" -> { count: 5, types: ["PMC", "AKE"], expandedTypes: ["PMC", "PMC", "AKE", "AKE", "AKE"] }
 */
export function parseULDSection(uldString: string): { count: number; types: string[]; expandedTypes: string[] } {
  // Extract only the core ULD part (ignore trailing comment)
  const { core } = extractULDParts(uldString)
  // Remove XX markers and trim
  const cleaned = core.replace(/^XX\s+/i, "").replace(/\s+XX$/i, "").trim()
  
  if (!cleaned) {
    return { count: 0, types: [], expandedTypes: [] }
  }
  
  // Match patterns like "01PMC", "02AKE", "BULK", etc.
  // Pattern: digits followed by ULD type code (PMC, AKE, AKL, AMF, ALF, PLA, etc.) or BULK
  const uldPattern = /\b(\d+)?(PMC|AKE|AKL|AMF|ALF|PLA|PAG|AMP|RKE|BULK)\b/gi
  const matches = Array.from(cleaned.matchAll(uldPattern))
  
  if (!matches || matches.length === 0) {
    return { count: 0, types: [], expandedTypes: [] }
  }
  
  const expandedTypes: string[] = []
  const uniqueTypes: string[] = []
  
  for (const match of matches) {
    const numberStr = match[1] || "1"
    const type = match[2].toUpperCase()
    const count = parseInt(numberStr, 10) || 1
    
    // Add unique type if not already present
    if (!uniqueTypes.includes(type)) {
      uniqueTypes.push(type)
    }
    
    // Expand based on count
    for (let i = 0; i < count; i++) {
      expandedTypes.push(type)
    }
  }
  
  return {
    count: expandedTypes.length,
    types: uniqueTypes,
    expandedTypes,
  }
}

/**
 * Format ULD section string based on saved ULD entries (with checkboxes) for display on left side
 * Format: {type}{number}EK for checked entries
 * Example: [{type: "AKE", number: "73838", checked: true}] -> "AKE73838EK"
 * Example: [{type: "PMC", number: "12345", checked: true}, {type: "AKE", number: "67890", checked: true}] -> "PMC12345EK, AKE67890EK"
 */
export function formatULDSectionFromEntries(entries: Array<{ type: string; number: string; checked: boolean }>): string {
  // Only include checked entries
  const checkedEntries = entries.filter(e => e.checked)
  
  if (checkedEntries.length === 0) {
    return ""
  }
  
  // Format as {type}{number}EK (only for entries with numbers)
  return checkedEntries
    .filter(e => e.number.trim() !== "")
    .map(entry => {
      const number = entry.number.trim()
      return `${entry.type}${number}EK`
    })
    .join(", ")
}

/**
 * Format ULD section string based on checked ULD entries for Final display (right side)
 * Uses the same format as formatULDSection but works with entries
 * IMPORTANT: Final section only shows core ULD part (XX ... XX), NOT trailing comments
 * Example: entries with checked PMC entries -> "XX 02PMC XX"
 */
export function formatULDSectionFromCheckedEntries(entries: Array<{ type: string; number: string; checked: boolean }>, originalSection: string): string {
  // Include ALL checked entries (regardless of whether number is filled)
  // This way, when user marks an entry as "final" without a number, it still counts
  const checkedEntries = entries.filter(e => e.checked)
  
  // Extract core ULD part (without trailing comment) for fallback
  const { core } = extractULDParts(originalSection)
  
  if (checkedEntries.length === 0) {
    // Return only the core ULD part, not the trailing comment
    return core || originalSection
  }
  
  // Group by type and count ALL checked entries
  const typeCounts: Record<string, number> = {}
  checkedEntries.forEach(entry => {
    typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1
  })
  
  // Get original types order (from core ULD part only)
  const { types } = parseULDSection(core)
  if (types.length === 0) {
    return core || originalSection
  }
  
  // Build the formatted string maintaining the order of types from original
  const parts: string[] = []
  for (const type of types) {
    const count = typeCounts[type] || 0
    if (count > 0) {
      const countStr = String(count).padStart(2, "0")
      parts.push(`${countStr}${type}`)
    }
  }
  
  // Also include any types that weren't in the original (newly added)
  Object.keys(typeCounts).forEach(type => {
    if (!types.includes(type)) {
      const count = typeCounts[type]
      const countStr = String(count).padStart(2, "0")
      parts.push(`${countStr}${type}`)
    }
  })
  
  if (parts.length === 0) {
    return core || originalSection
  }
  
  // Return only the core ULD format, no trailing comment
  return `XX ${parts.join(" ")} XX`
}

/**
 * Format ULD section string based on saved ULD numbers (legacy support)
 * Example: ["A6-123", "A6-456"] with original "XX 02PMC XX" -> "XX 02PMC XX"
 * Example: ["A6-123", "A6-456", "A6-789"] with original "XX 02PMC XX" -> "XX 03PMC XX"
 * Example: ["A6-123", "A6-456"] with original "XX 06AKE XX" -> "XX 02AKE XX"
 */
export function formatULDSection(uldNumbers: string[], originalSection: string): string {
  if (uldNumbers.length === 0) {
    return originalSection
  }
  
  const { expandedTypes, types } = parseULDSection(originalSection)
  if (types.length === 0) {
    return originalSection
  }
  
  // Get indices of filled ULD numbers
  const filledIndices = uldNumbers
    .map((n, i) => ({ value: n.trim(), index: i }))
    .filter(({ value }) => value !== "")
  
  const filledCount = filledIndices.length
  
  if (filledCount === 0) {
    return originalSection
  }
  
  // Group by type based on the expanded types array
  const typeCounts: Record<string, number> = {}
  
  // Count types for filled ULDs based on their position in expandedTypes
  for (const { index } of filledIndices) {
    // Use the type at this index, or the last type if index exceeds expandedTypes
    const type = index < expandedTypes.length 
      ? expandedTypes[index] 
      : (expandedTypes[expandedTypes.length - 1] || types[0] || "PMC")
    typeCounts[type] = (typeCounts[type] || 0) + 1
  }
  
  // Build the formatted string maintaining the order of types from original
  const parts: string[] = []
  for (const type of types) {
    const count = typeCounts[type] || 0
    if (count > 0) {
      const countStr = String(count).padStart(2, "0")
      parts.push(`${countStr}${type}`)
    }
  }
  
  if (parts.length === 0) {
    return originalSection
  }
  
  return `XX ${parts.join(" ")} XX`
}

