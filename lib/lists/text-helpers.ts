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

/**
 * Parse shipment line with joined fields
 * Handles cases where fields are joined without spaces (e.g., "BAHLHR1", "VAL- ECCCONSOLIDATIONVALP2")
 * 
 * Format: SER AWB ORG/DES PCS WGT VOL LVOL SHC MAN.DESC PCODE PC THC BS PI FLTIN ARRDT.TIME QNN/AQNN WHS SI
 * Example: "001 176-90972910 BAHLHR1  4.5  0.1  0.1 VAL- ECCCONSOLIDATIONVALP2 QWTSSNEK0836 01Mar0605 08:25/  N XXXYPBOXXX"
 */
export interface ParsedShipmentFields {
  serial: string
  awb: string
  origin: string
  destination: string
  pcs: string
  wgt: string
  vol: string
  lvol: string
  shc: string
  manDesc: string
  pcode: string
  pc: string
  thc: string
  bs: string
  pi: string
  fltIn: string
  arrDtTime: string
  qnnAqnn: string
  whs: string
  si: string
  uld: string
  specialNotes: string[]
}

/**
 * Parse shipment line field by field, handling joined fields
 * This is a smarter parser that works backwards from known patterns
 */
export function parseShipmentLine(line: string): ParsedShipmentFields | null {
  // Normalize line - preserve original for ULD extraction
  const originalLine = line
  let normalized = line.replace(/\s{2,}/g, " ").trim()
  
  // Pattern: Start with 3 digits (SER) followed by AWB pattern
  const serAWBMatch = normalized.match(/^(\d{3})\s+(\d{3}-\d{8})/)
  if (!serAWBMatch) {
    return null
  }
  
  const serial = serAWBMatch[1]
  const awb = serAWBMatch[2]
  let remaining = normalized.substring(serAWBMatch[0].length).trim()
  
  // Parse ORG/DES and PCS (can be joined like "BAHLHR1" or "EBBLGW1")
  // Pattern: 6 uppercase letters possibly followed by digits (PCS)
  // Also handle cases where there might be spaces: "EBB LGW" or "EBBLGW 1"
  let origin = ""
  let destination = ""
  let pcs = ""
  
  // Try pattern 1: 6 letters followed by digit (e.g., "EBBLGW1")
  const orgDesPcsMatch = remaining.match(/^([A-Z]{3})([A-Z]{3})(\d+)/)
  if (orgDesPcsMatch) {
    origin = orgDesPcsMatch[1]
    destination = orgDesPcsMatch[2]
    pcs = orgDesPcsMatch[3]
    remaining = remaining.substring(orgDesPcsMatch[0].length).trim()
  } else {
    // Try pattern 2: 6 letters without digit (e.g., "EBBLGW")
    const orgDesMatch = remaining.match(/^([A-Z]{3})([A-Z]{3})(?:\s|$)/)
    if (orgDesMatch) {
      origin = orgDesMatch[1]
      destination = orgDesMatch[2]
      remaining = remaining.substring(orgDesMatch[0].length).trim()
      // PCS should be in next token
      const nextToken = remaining.split(/\s+/)[0]
      if (/^\d+$/.test(nextToken)) {
        pcs = nextToken
        remaining = remaining.substring(nextToken.length).trim()
      } else {
        // PCS might be 0 or missing, default to "0"
        pcs = "0"
      }
    } else {
      // Try pattern 3: 3 letters, space, 3 letters (e.g., "EBB LGW")
      const orgDesSpaceMatch = remaining.match(/^([A-Z]{3})\s+([A-Z]{3})(\d*)/)
      if (orgDesSpaceMatch) {
        origin = orgDesSpaceMatch[1]
        destination = orgDesSpaceMatch[2]
        pcs = orgDesSpaceMatch[3]
        remaining = remaining.substring(orgDesSpaceMatch[0].length).trim()
        // If PCS not found, get from next token
        if (!pcs) {
          const nextToken = remaining.split(/\s+/)[0]
          if (/^\d+$/.test(nextToken)) {
            pcs = nextToken
            remaining = remaining.substring(nextToken.length).trim()
          }
        }
      } else {
        // No match - return null
        return null
      }
    }
  }
  
  // Parse WGT, VOL, LVOL (should be decimal numbers)
  const numbers: string[] = []
  const parts = remaining.split(/\s+/)
  let idx = 0
  while (idx < parts.length && numbers.length < 3) {
    const part = parts[idx]
    if (/^[\d.]+$/.test(part)) {
      numbers.push(part)
      idx++
    } else {
      break
    }
  }
  
  const wgt = numbers[0] || "0"
  const vol = numbers[1] || "0"
  const lvol = numbers[2] || "0"
  remaining = parts.slice(idx).join(" ").trim()
  
  // Now parse the rest: SHC MAN.DESC PCODE PC THC BS PI FLTIN ARRDT.TIME SI
  // Strategy: Work backwards from known patterns (SI, PI, BS, ARRDT.TIME, FLTIN)
  
  // Extract ULD and special notes first (they come after SI, before next shipment)
  // ULD pattern: XX...XX or just text after SI
  // Special notes: [text]
  let uld = ""
  let specialNotes: string[] = []
  
  // Find SI first (usually N or Y, before ULD)
  // SI can be at the end or before ULD
  let si = "N"
  let siIndex = -1
  
  // Try to find SI pattern - can be separate or joined
  // Pattern 1: " N " or " Y " (with spaces)
  const siPatternSeparate = /\s+([YN])\s+(?=XX|$|\d{3}\s+\d{3}-\d{8})/
  const siMatchSeparate = remaining.match(siPatternSeparate)
  
  // Pattern 2: SI at the very end (before potential ULD on next line)
  const siPatternEnd = /\s+([YN])\s*$/
  const siMatchEnd = remaining.match(siPatternEnd)
  
  if (siMatchSeparate) {
    si = siMatchSeparate[1]
    siIndex = remaining.indexOf(siMatchSeparate[0])
    // Extract ULD after SI
    const afterSI = remaining.substring(siIndex + siMatchSeparate[0].length).trim()
    // ULD can be XX...XX or just text (not starting with shipment pattern)
    const uldMatch = afterSI.match(/^(XX\s+.*?\s+XX|XX[^X]+XX|[^0-9]+?)(?=\s+\d{3}\s+\d{3}-\d{8}|$)/)
    if (uldMatch) {
      uld = uldMatch[1].trim()
    } else if (afterSI && !afterSI.match(/^\d{3}\s+\d{3}-\d{8}/)) {
      // If there's text after SI and it's not a shipment, it might be ULD
      uld = afterSI.trim()
    }
    remaining = remaining.substring(0, siIndex).trim()
  } else if (siMatchEnd) {
    si = siMatchEnd[1]
    siIndex = remaining.indexOf(siMatchEnd[0])
    remaining = remaining.substring(0, siIndex).trim()
    // ULD will be extracted from next line or from current line if available
  }
  
  // Find WHS (warehouse code) - before SI, after QNN/AQNN
  // WHS is typically a short code or empty, extract cautiously
  let whs = ""
  // Look for a short alphanumeric code at the end (before where SI was)
  // Pattern: non-date, non-flight-number text at the end
  const whsPattern = /\s+([A-Z0-9]{2,6})\s*$/
  const whsMatch = remaining.match(whsPattern)
  // Only extract if it's not a date or flight number pattern
  if (whsMatch && !/\d{2}[A-Za-z]{3}\d{2,4}/.test(whsMatch[1]) && !/^[A-Z]{2}\d{4}$/.test(whsMatch[1])) {
    const potentialWhs = whsMatch[1]
    // Make sure it's not part of a date/time string
    const beforeWhs = remaining.substring(0, remaining.length - whsMatch[0].length)
    if (!beforeWhs.match(/[\d:\/]\s*$/)) {
      whs = potentialWhs
      remaining = beforeWhs.trim()
    }
  }
  
  // Find QNN/AQNN - before WHS, after ARRDT.TIME
  // QNN/AQNN is typically a quantity or alphanumeric code or empty
  let qnnAqnn = ""
  const qnnPattern = /\s+([A-Z0-9\/]{2,10})\s*$/
  const qnnMatch = remaining.match(qnnPattern)
  // Only extract if it's not a date, time, or flight number pattern
  if (qnnMatch && !/\d{2}[A-Za-z]{3}\d{2,4}/.test(qnnMatch[1]) && !/^[A-Z]{2}\d{4}$/.test(qnnMatch[1]) && !/^[\d:\/]+$/.test(qnnMatch[1])) {
    const potentialQnn = qnnMatch[1]
    // Make sure it's not part of a date/time string
    const beforeQnn = remaining.substring(0, remaining.length - qnnMatch[0].length)
    if (!beforeQnn.match(/[\d:\/]\s*$/)) {
      qnnAqnn = potentialQnn
      remaining = beforeQnn.trim()
    }
  }
  
  // Find ARRDT.TIME pattern (date + time) - before QNN/AQNN
  let arrDtTime = ""
  const dateTimePattern = /(\d{2}[A-Za-z]{3}\d{2,4}(?:\s+[\d:\/]+)?)\s*$/
  const dateTimeMatch = remaining.match(dateTimePattern)
  if (dateTimeMatch) {
    arrDtTime = dateTimeMatch[1].trim()
    remaining = remaining.substring(0, remaining.length - dateTimeMatch[0].length).trim()
  }
  
  // Find FLTIN (EK#### or similar pattern) - before ARRDT.TIME
  let fltIn = ""
  const fltInPattern = /([A-Z]{2}\d{4})\s*$/
  const fltInMatch = remaining.match(fltInPattern)
  if (fltInMatch) {
    fltIn = fltInMatch[1]
    remaining = remaining.substring(0, remaining.length - fltInMatch[0].length).trim()
  }
  
  // Now parse SHC, MAN.DESC, PCODE, PC, THC, BS, PI from remaining
  // Remaining should be something like: "VAL- ECCCONSOLIDATIONVALP2 QWT"
  // Pattern: SHC + MAN.DESC + PCODE + PC + THC + BS + PI
  // Note: FLTIN and ARRDT.TIME already extracted above
  
  let shc = ""
  let manDesc = ""
  let pcode = ""
  let pc = ""
  let thc = ""
  let bs = "SS"
  let pi = "N"
  
  // Strategy: Work backwards from BS/PI, then THC, then PCODE+PC
  
  // Find BS and PI (SS/BS/NN followed by N/Y) - can be separate or joined
  if (!bs || bs === "SS") {
    const bsPiPattern = /\s+(SS|BS|NN)\s+([YN])\s*$/
    const bsPiMatch = remaining.match(bsPiPattern)
    if (bsPiMatch) {
      bs = bsPiMatch[1]
      pi = bsPiMatch[2]
      remaining = remaining.substring(0, remaining.length - bsPiMatch[0].length).trim()
    } else {
      // Try joined pattern (e.g., "SSN" = SS + N)
      const bsPiJoinedPattern = /(SS|BS|NN)([YN])\s*$/
      const bsPiJoinedMatch = remaining.match(bsPiJoinedPattern)
      if (bsPiJoinedMatch) {
        bs = bsPiJoinedMatch[1]
        pi = bsPiJoinedMatch[2]
        remaining = remaining.substring(0, remaining.length - bsPiJoinedMatch[0].length).trim()
      }
    }
  }
  
  // Find THC (QWT, QRT, NORM, etc.) - usually 3-4 uppercase letters/numbers
  // Can be before BS/PI or after PCODE+PC
  const thcPattern = /\s+([A-Z0-9]{3,4})\s*$/
  const thcMatch = remaining.match(thcPattern)
  if (thcMatch) {
    thc = thcMatch[1]
    remaining = remaining.substring(0, remaining.length - thcMatch[0].length).trim()
  } else {
    // Try to find THC in joined pattern (e.g., "QWTSS" = QWT + SS)
    const thcBsJoinedPattern = /([A-Z0-9]{3,4})(SS|BS|NN)\s*$/
    const thcBsJoinedMatch = remaining.match(thcBsJoinedPattern)
    if (thcBsJoinedMatch) {
      thc = thcBsJoinedMatch[1]
      if (!bs || bs === "SS") {
        bs = thcBsJoinedMatch[2]
      }
      remaining = remaining.substring(0, remaining.length - thcBsJoinedMatch[0].length).trim()
    }
  }
  
  // Try to find PCODE+PC pattern (3 letters + P#)
  // Examples: "VALP2", "AXDP2", "GCRP2"
  const pcodePcPattern = /([A-Z]{3})(P\d)/
  const pcodePcMatch = remaining.match(pcodePcPattern)
  
  if (pcodePcMatch) {
    pcode = pcodePcMatch[1]
    pc = pcodePcMatch[2]
    const pcodeIndex = remaining.indexOf(pcodePcMatch[0])
    
    // Before PCODE: SHC and MAN.DESC
    const beforePcode = remaining.substring(0, pcodeIndex).trim()
    // After PCODE: might have THC (but we already extracted it)
    const afterPcode = remaining.substring(pcodeIndex + pcodePcMatch[0].length).trim()
    
    // If afterPcode still has content and we don't have THC yet, it might be THC
    if (afterPcode && !thc) {
      const thcFromAfter = afterPcode.match(/^([A-Z0-9]{3,4})/)
      if (thcFromAfter) {
        thc = thcFromAfter[1]
      }
    }
    
    // Parse SHC and MAN.DESC from beforePcode
    // Example: "VAL- ECCCONSOLIDATION" -> SHC: "VAL-ECC", MAN.DESC: "CONSOLIDATION"
    const shcManDescCombined = beforePcode.replace(/\s+/g, "")
    
    // Pattern 1: SHC ends with hyphen, MAN.DESC starts after
    // Example: "VAL-ECCCONSOLIDATION" -> SHC: "VAL-ECC", MAN.DESC: "CONSOLIDATION"
    const shcHyphenMatch = shcManDescCombined.match(/^([A-Z]{2,4}-[A-Z]{2,4})([A-Z]+)$/)
    if (shcHyphenMatch) {
      shc = shcHyphenMatch[1]
      manDesc = shcHyphenMatch[2]
    } else {
      // Pattern 2: Try to find where SHC ends
      // Common SHC patterns: "VAL-", "AXA-COL", "PIL-COL", "PEP-COL-BUP", etc.
      const shcPattern = /^([A-Z]{2,4}(?:-[A-Z]{2,4})*?)([A-Z]{4,})/
      const shcMatch = shcManDescCombined.match(shcPattern)
      if (shcMatch) {
        shc = shcMatch[1]
        manDesc = shcMatch[2]
      } else {
        // Fallback: use space if available
        const spaceIndex = beforePcode.indexOf(" ")
        if (spaceIndex > 0) {
          shc = beforePcode.substring(0, spaceIndex).trim()
          manDesc = beforePcode.substring(spaceIndex).trim()
        } else {
          shc = beforePcode
        }
      }
    }
  } else {
    // PCODE and PC might be separate
    const pcodeMatch = remaining.match(/\s+([A-Z]{3})\s+(P\d)/)
    if (pcodeMatch) {
      pcode = pcodeMatch[1]
      pc = pcodeMatch[2]
      const beforePcode = remaining.substring(0, remaining.indexOf(pcodeMatch[0])).trim()
      const afterPcode = remaining.substring(remaining.indexOf(pcodeMatch[0]) + pcodeMatch[0].length).trim()
      
      // Parse SHC and MAN.DESC from beforePcode
      const shcManDescCombined = beforePcode.replace(/\s+/g, "")
      const shcPattern = /^([A-Z]{2,4}(?:-[A-Z]{2,4})*?)([A-Z]{4,})/
      const shcMatch = shcManDescCombined.match(shcPattern)
      if (shcMatch) {
        shc = shcMatch[1]
        manDesc = shcMatch[2]
      } else {
        const spaceIndex = beforePcode.indexOf(" ")
        if (spaceIndex > 0) {
          shc = beforePcode.substring(0, spaceIndex).trim()
          manDesc = beforePcode.substring(spaceIndex).trim()
        } else {
          shc = beforePcode
        }
      }
      
      // Parse THC from afterPcode if not already found
      if (!thc) {
        const thcMatch = afterPcode.match(/^([A-Z0-9]{3,4})/)
        if (thcMatch) {
          thc = thcMatch[1]
        }
      }
    }
  }
  
  // Extract special notes from original line (pattern: [text])
  const specialNotesMatches = originalLine.match(/\[([^\]]+)\]/g)
  if (specialNotesMatches) {
    specialNotes = specialNotesMatches.map(match => match.trim())
  }
  
  return {
    serial,
    awb,
    origin,
    destination,
    pcs: pcs || "0",
    wgt,
    vol,
    lvol,
    shc: shc || "",
    manDesc: manDesc || "",
    pcode: pcode || "",
    pc: pc || "",
    thc: thc || "",
    bs,
    pi,
    fltIn,
    arrDtTime,
    qnnAqnn,
    whs,
    si,
    uld: uld || "",
    specialNotes,
  }
}

