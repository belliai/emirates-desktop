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
  // Remove XX markers and trim
  const cleaned = uldString.replace(/^XX\s+/i, "").replace(/\s+XX$/i, "").trim()
  
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
 * Format ULD section string based on saved ULD numbers
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

