/**
 * Utility functions for managing ULD entries with checked state in localStorage
 * This ensures the checked state is accessible to all future infrastructure
 */

import type { ULDEntry } from "@/components/uld-number-modal"
import { parseULDSection } from "./uld-parser"

/**
 * Get ULD entries from localStorage for a specific flight
 * Returns entries with checked state preserved
 * @param flightNumber - The flight number
 * @param loadPlanSectors - Optional sectors from load plan for type inference (legacy support)
 * @returns Map of sectorIndex-uldSectionIndex -> ULDEntry[]
 */
export function getULDEntriesFromStorage(
  flightNumber: string,
  loadPlanSectors?: Array<{ uldSections: Array<{ uld: string }> }>
): Map<string, ULDEntry[]> {
  if (typeof window === 'undefined') {
    return new Map()
  }

  try {
    const stored = localStorage.getItem(`uld-numbers-${flightNumber}`)
    if (!stored) {
      return new Map()
    }

    const parsed = JSON.parse(stored)
    const entriesMap = new Map<string, ULDEntry[]>()

    Object.entries(parsed).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Check if it's new format (ULDEntry[]) or old format (string[])
        if (value.length > 0 && typeof value[0] === 'object' && 'checked' in value[0]) {
          // New format: ULDEntry[] - preserve checked state
          entriesMap.set(key, value as ULDEntry[])
        } else if (loadPlanSectors) {
          // Old format: string[] - convert to ULDEntry[] with checked inferred from number presence
          const numbers = value as string[]
          const [sectorIndexStr, uldSectionIndexStr] = key.split('-')
          const sectorIndex = parseInt(sectorIndexStr, 10)
          const uldSectionIndex = parseInt(uldSectionIndexStr, 10)
          const sector = loadPlanSectors[sectorIndex]
          const uldSection = sector?.uldSections[uldSectionIndex]
          const { expandedTypes } = parseULDSection(uldSection?.uld || "")

          const entries: ULDEntry[] = numbers.map((number, index) => ({
            number: number || "",
            checked: number.trim() !== "", // Legacy: checked if number is filled
            type: expandedTypes[index] || "PMC"
          }))
          entriesMap.set(key, entries)
        }
      }
    })

    return entriesMap
  } catch (e) {
    console.error(`[ULDStorage] Error reading ULD entries for ${flightNumber}:`, e)
    return new Map()
  }
}

/**
 * Save ULD entries to localStorage for a specific flight
 * Preserves checked state
 * @param flightNumber - The flight number
 * @param entries - Map of sectorIndex-uldSectionIndex -> ULDEntry[]
 */
export function saveULDEntriesToStorage(
  flightNumber: string,
  entries: Map<string, ULDEntry[]>
): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const toStore = Object.fromEntries(entries)
    localStorage.setItem(`uld-numbers-${flightNumber}`, JSON.stringify(toStore))
  } catch (e) {
    console.error(`[ULDStorage] Error saving ULD entries for ${flightNumber}:`, e)
  }
}

/**
 * Get all checked ULD entries for a flight
 * Useful for progress calculations and reporting
 * @param flightNumber - The flight number
 * @param loadPlanSectors - Optional sectors from load plan for type inference (legacy support)
 * @returns Array of all checked ULD entries with their keys
 */
export function getCheckedULDEntries(
  flightNumber: string,
  loadPlanSectors?: Array<{ uldSections: Array<{ uld: string }> }>
): Array<{ key: string; entry: ULDEntry }> {
  const entriesMap = getULDEntriesFromStorage(flightNumber, loadPlanSectors)
  const checkedEntries: Array<{ key: string; entry: ULDEntry }> = []

  entriesMap.forEach((entries, key) => {
    entries.forEach((entry) => {
      if (entry.checked) {
        checkedEntries.push({ key, entry })
      }
    })
  })

  return checkedEntries
}

/**
 * Get count of checked ULDs for a flight
 * @param flightNumber - The flight number
 * @param loadPlanSectors - Optional sectors from load plan for type inference (legacy support)
 * @returns Number of checked ULDs
 */
export function getCheckedULDCount(
  flightNumber: string,
  loadPlanSectors?: Array<{ uldSections: Array<{ uld: string }> }>
): number {
  return getCheckedULDEntries(flightNumber, loadPlanSectors).length
}





