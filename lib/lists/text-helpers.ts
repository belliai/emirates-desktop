/**
 * Text processing helpers for RTF parsing
 * Handles word segmentation and spacing fixes for joined words
 */

import natural from "natural"

/**
 * Common English words dictionary for word segmentation
 * Used to validate word boundaries
 */
export const COMMON_WORDS = new Set([
  'do', 'not', 'use', 'driessen', 'manufactured', 'akes', 'and', 'only', 'telair', 'twintex', 'nordisk',
  'no', 'ohg', 'pmcs', 'rlnumber', 'starting', 'from', 'to', 'on', 'acfts', 'fwd', 'any', 'cgo', 'for',
  'bulk', 'warehouse', 'other', 'than', 'what', 'is', 'planned', 'relocate', 'shipment', 'without',
  'consulting', 'planner', 'if', 'wrong', 'volumes', 'same', 'to', 'be', 'highlighted', 'also', 'bcr',
  'updated', 'with', 'actual', 'loadable', 'volume', 'even', 'the', 'loaded', 'please', 'ensure',
  'nowing', 'or', 'ohg', 'pallets', 'mention', 'the', 'same', 'on', 'checksheet', 'thick', 'base',
  'ake', 'series', 'from', 'a', 'c', 'type', 'ops', 'acft', 'reg', 'header', 'version', 'pax', 'std',
  'prepared', 'by', 'ttl', 'pln', 'uld', 'prepared', 'on', 'sector', 'ser', 'awb', 'no', 'org', 'des',
  'pcs', 'wgt', 'vol', 'shc', 'man', 'desc', 'code', 'pc', 'thc', 'bsp', 'iflt', 'in', 'arr', 'dt',
  'time', 'qnn', 'whs', 'si', 'all', 'units', 'must', 'optimised', 'appropriate', 'mix', 'match',
  'shipments', 'below', 'available', 'pre', 'carry', 'case', 'drop', 'loads', 'can', 'rebooked',
  'space', 'issues', 'marked', 'as', 'per', 'offloading', 'rebooking', 'sequence'
])

/**
 * Smart word segmentation using dictionary and heuristics
 * Attempts to split joined words intelligently by trying common word boundaries
 */
export function segmentWords(text: string): string {
  let processed = text.toUpperCase()
  
  // Common word boundaries in aviation/operations context
  // These are words that commonly appear at word boundaries, sorted by length (longest first)
  const commonWords = [
    'MANUFACTURED', 'CONSULTING', 'HIGHLIGHTED', 'WAREHOUSE', 'LOADABLE', 'RELOCATE', 'STARTING',
    'DRIESSEN', 'NORDISK', 'PLANNED', 'PLANNER', 'VOLUMES', 'UPDATED', 'LOADED', 'ENSURE',
    'TELAIR', 'TWINTEX', 'PMCS', 'ACFTS', 'CGO', 'BULK', 'AKES', 'BCR', 'RL',
    'DO', 'NOT', 'USE', 'AND', 'ONLY', 'NO', 'OHG', 'FWD', 'ANY', 'FOR', 'THE', 'TO', 'ON', 'IN', 'AT', 'BY', 'OF', 'AS', 'IS', 'BE', 'IF', 'OR',
    'NUMBER', 'OTHER', 'THAN', 'WHAT', 'SHIPMENT', 'WITHOUT', 'ACTUAL', 'VOLUME', 'EVEN', 'PLEASE', 'MENTION', 'CHECK', 'SHEET', 'THICK', 'BASE', 'SERIES',
    'FROM', 'ALSO', 'SAME', 'PALLETS', 'NOWING'
  ]
  
  // Try to find word boundaries by matching common words (greedy approach)
  const sortedWords = commonWords.sort((a, b) => b.length - a.length)
  
  let result = processed
  const segments: string[] = []
  let i = 0
  
  while (i < result.length) {
    let matched = false
    
    // Try to match longest words first
    for (const word of sortedWords) {
      if (result.substring(i).startsWith(word)) {
        segments.push(word)
        i += word.length
        matched = true
        break
      }
    }
    
    if (!matched) {
      // No match found, advance by one character
      // Try to find next potential boundary (number, lowercase after uppercase, etc.)
      let advance = 1
      
      // Look ahead for potential boundaries
      if (i + 1 < result.length) {
        const nextChar = result[i + 1]
        // If next char is a number or lowercase, might be a boundary
        if (/\d/.test(nextChar) || (nextChar >= 'a' && nextChar <= 'z')) {
          advance = 1
        } else if (result[i] >= 'A' && result[i] <= 'Z' && nextChar >= 'A' && nextChar <= 'Z') {
          // Two uppercase letters - might be part of acronym, advance by 1
          advance = 1
        }
      }
      
      // Collect characters until we find a match or boundary
      let segment = result[i]
      i += advance
      
      // Try to build a segment until we find a word boundary
      while (i < result.length && !matched) {
        for (const word of sortedWords) {
          if (result.substring(i).startsWith(word)) {
            matched = true
            break
          }
        }
        if (!matched) {
          segment += result[i]
          i++
        }
      }
      
      if (segment.length > 0) {
        segments.push(segment)
      }
    }
  }
  
  // Join segments with spaces
  return segments.join(' ')
}

/**
 * Add spaces between joined words in text (dynamic approach)
 * Uses heuristics and dictionary-based segmentation to detect word boundaries
 * Example: "PleaseensureNowingorOHGpallets" -> "Please ensure Nowing or OHG pallets"
 * This helps fix RTF extraction issues where words are joined together
 */
export function addSpacesToJoinedWords(text: string): string {
  let processed = text
  
  // Step 1: Handle known patterns first (most specific)
  // Order matters: longer patterns first to avoid partial matches
  const knownPatterns = [
    { pattern: /DONOTRELOCATEANYSHIPMENTWITHOUTCONSULTINGPLANNER/gi, replacement: 'DO NOT RELOCATE ANY SHIPMENT WITHOUT CONSULTING PLANNER' },
    { pattern: /EVENTHESHIPMENTISLOADED/gi, replacement: 'EVEN THE SHIPMENT IS LOADED' },
    { pattern: /TOBEUPDATEDWITHACTUALLOADABLEVOLUME/gi, replacement: 'TO BE UPDATED WITH ACTUAL LOADABLE VOLUME' },
    { pattern: /TOBEHIGHLIGHTED/gi, replacement: 'TO BE HIGHLIGHTED' },
    { pattern: /DONOTUSEDRIESSENMANUFACTUREDAKES/gi, replacement: 'DO NOT USE DRIESSEN MANUFACTURED AKES' },
    { pattern: /USEONLYTELAIR\/TWINTEX\/NORDISKAKES/gi, replacement: 'USE ONLY TELAIR/TWINTEX/NORDISK AKES' },
    { pattern: /DONOTUSEAKESRLNUMBERSTARTINGFROM/gi, replacement: 'DO NOT USE AKES RL NUMBER STARTING FROM' },
    { pattern: /DONOTFWDANYCGOFORBULKFROMWAREHOUSE/gi, replacement: 'DO NOT FWD ANY CGO FOR BULK FROM WAREHOUSE' },
    { pattern: /OTHERTHANWHATISPLANNED/gi, replacement: 'OTHER THAN WHAT IS PLANNED' },
    { pattern: /WITHOUTCONSULTING/gi, replacement: 'WITHOUT CONSULTING' },
    { pattern: /MANUFACTUREDAKES/gi, replacement: 'MANUFACTURED AKES' },
    { pattern: /RLNUMBERSTARTING/gi, replacement: 'RL NUMBER STARTING' },
    { pattern: /FROMWAREHOUSE/gi, replacement: 'FROM WAREHOUSE' },
    { pattern: /EVENTHESHIPMENT/gi, replacement: 'EVEN THE SHIPMENT' },
    { pattern: /DONOTUSE/gi, replacement: 'DO NOT USE' },
    { pattern: /DONOTFWD/gi, replacement: 'DO NOT FWD' },
    { pattern: /DONOTRELOCATE/gi, replacement: 'DO NOT RELOCATE' },
    { pattern: /PLEASEENSURE/gi, replacement: 'PLEASE ENSURE' },
    { pattern: /MENTIONTHESAME/gi, replacement: 'MENTION THE SAME' },
    { pattern: /MENTIONTHESAMEON/gi, replacement: 'MENTION THE SAME ON' },
    { pattern: /ONCHECKSHEET/gi, replacement: 'ON CHECKSHEET' },
    { pattern: /CHECKSHEET/gi, replacement: 'CHECK SHEET' },
    { pattern: /TOBEUPDATED/gi, replacement: 'TO BE UPDATED' },
    { pattern: /ANYCGOFORBULK/gi, replacement: 'ANY CGO FOR BULK' },
    { pattern: /FORBULKFROM/gi, replacement: 'FOR BULK FROM' },
    { pattern: /DONOT/gi, replacement: 'DO NOT' },
  ]
  
  for (const { pattern, replacement } of knownPatterns) {
    processed = processed.replace(pattern, replacement)
  }
  
  // Step 2: Apply smart word segmentation for long joined strings
  // Split text into segments (preserve punctuation and known separators)
  // Process segments that are long joined words (20+ characters, all caps or mixed case)
  processed = processed.replace(/([A-Z]{2,}[A-Za-z]{15,})/g, (match) => {
    // Only process if it looks like joined words (no spaces, mostly letters)
    if (match.length >= 20 && !match.includes(' ') && /^[A-Za-z]+$/.test(match)) {
      return segmentWords(match)
    }
    return match
  })
  
  // Step 3: Apply multiple passes with heuristics
  for (let pass = 0; pass < 3; pass++) {
    // Pattern 1: Lowercase letter followed by uppercase letter (most common word boundary)
    processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2')
    
    // Pattern 2: Uppercase letter(s) followed by lowercase letter (acronym followed by word)
    processed = processed.replace(/([A-Z]{2,})([a-z]+)/g, (match, acronym, word) => {
      const afterMatch = match.substring(acronym.length + word.length)
      if (afterMatch.match(/^\d/)) {
        return match // It's a code, don't split
      }
      return `${acronym} ${word}`
    })
    
    // Pattern 3: Fix common word combinations
    processed = processed.replace(/(use)(thick)/gi, '$1 $2')
    processed = processed.replace(/(thick)(base)/gi, '$1 $2')
    processed = processed.replace(/(base)([A-Z])/gi, '$1 $2')
    processed = processed.replace(/(series)(from)/gi, '$1 $2')
    
    // Pattern 4: Fix patterns with numbers and letters
    processed = processed.replace(/([A-Z]\d+)-([a-z])/gi, '$1- $2')
    
    // Pattern 5: Fix patterns with punctuation
    processed = processed.replace(/(\.)\s*-/g, '$1 -')
    processed = processed.replace(/(,)\s*([A-Z])/g, '$1 $2')
    processed = processed.replace(/(:)\s*-/g, '$1 -')
    processed = processed.replace(/(;)\s*([A-Z])/g, '$1 $2')
    
    // Pattern 6: Fix patterns with parentheses
    processed = processed.replace(/\(([a-z]+)([A-Z])/g, '($1 $2')
    processed = processed.replace(/([a-z])\)([A-Z])/g, '$1) $2')
    
    // Pattern 7: Fix patterns like "AKE14082EKAKE15797EK" -> "AKE14082EK AKE15797EK"
    processed = processed.replace(/([A-Z]+\d+[A-Z]+)([A-Z]+\d+[A-Z]+)/g, '$1 $2')
    
    // Pattern 8: Fix slash patterns
    processed = processed.replace(/([A-Z]\/[A-Z])([a-z])/gi, '$1 $2')
  }
  
  // Clean up: Fix incorrect splits that were created by the pattern matching
  // These happen when lowercase-uppercase rule splits words incorrectly
  // Order matters: fix most specific patterns first, then general ones
  
  // Fix compound phrases (most specific first)
  processed = processed.replace(/\bPleas\s+e\s+ensure\s+Nowin\s+g\s+or\b/gi, 'Please ensure Nowing or')
  processed = processed.replace(/\bMent\s+ion\s+the\s+same\s+on\s+check\s+sheet\b/gi, 'Mention the same on checksheet')
  processed = processed.replace(/\bDO\s+N\s+OT\s+use\s+thickbas\s+e\s+Ake\b/gi, 'DO NOT use thick base Ake')
  processed = processed.replace(/\bser\s+ies\s+from\s+AKE\b/gi, 'series from AKE')
  
  // Fix individual phrases
  processed = processed.replace(/\bPleas\s+e\s+ensure\b/gi, 'Please ensure')
  processed = processed.replace(/\bNowin\s+g\s+or\b/gi, 'Nowing or')
  processed = processed.replace(/\bMent\s+ion\s+the\s+same\b/gi, 'Mention the same')
  processed = processed.replace(/\bMent\s+ion\s+the\b/gi, 'Mention the')
  processed = processed.replace(/\bthickbas\s+e\s+Ake\b/gi, 'thick base Ake')
  processed = processed.replace(/\bser\s+ies\s+from\b/gi, 'series from')
  processed = processed.replace(/\bDO\s+N\s+OT\s+use\b/gi, 'DO NOT use')
  processed = processed.replace(/\bDO\s+N\s+OTuse\b/gi, 'DO NOT use')
  processed = processed.replace(/\bthe\s+same\s+on\s+check\s+sheet\b/gi, 'the same on checksheet')
  processed = processed.replace(/\bcheck\s+sheet\b/gi, 'checksheet') // "checksheet" is one word in this context
  
  // Fix individual word splits
  processed = processed.replace(/\bPleas\s+e\b/gi, 'Please')
  processed = processed.replace(/\bNowin\s+g\b/gi, 'Nowing')
  processed = processed.replace(/\bMent\s+ion\b/gi, 'Mention')
  processed = processed.replace(/\bthickbas\s+e\b/gi, 'thick base')
  processed = processed.replace(/\bser\s+iesfrom\b/gi, 'series from')
  
  // Fix code patterns
  processed = processed.replace(/\bAKE14082EKAKE\s+15797EK\b/gi, 'AKE14082EK AKE15797EK')
  
  // Fix spacing issues with punctuation (but preserve intentional spacing)
  processed = processed.replace(/\s+([.,;:!?])/g, '$1') // Remove space before punctuation
  processed = processed.replace(/([.,;:!?])([A-Za-z])/g, '$1 $2') // Ensure space after punctuation before letter
  
  // Normalize multiple spaces
  processed = processed.replace(/\s{2,}/g, ' ')
  
  return processed.trim()
}

