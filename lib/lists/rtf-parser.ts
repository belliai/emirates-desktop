/**
 * RTF-specific parser for load plans
 * This parser handles RTF files separately to avoid breaking existing parse functions
 */

import type { LoadPlanHeader, Shipment } from "./types"
import { extractTextFromFile } from "./file-extractors"

/**
 * Preprocess RTF content to clean up RTF-specific artifacts
 * This helps ensure the parser can correctly identify patterns
 */
function preprocessRTFContent(content: string): string {
  // Content should already be cleaned by extractTextFromRTFDirect
  // This function just does final normalization
  
  let processed = content

  // Normalize line breaks (ensure consistent \n)
  processed = processed.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  
  // Normalize multiple spaces
  processed = processed.replace(/[ \t]{3,}/g, "  ")
  
  // Remove excessive empty lines
  processed = processed.replace(/\n{4,}/g, "\n\n\n")
  
  console.log(`[RTFParser] Preprocessed content: ${processed.length} chars (from ${content.length} chars)`)
  
  return processed
}

/**
 * Parse header from RTF content
 * Uses the same logic as regular parser but with RTF preprocessing
 */
export function parseRTFHeader(content: string): LoadPlanHeader {
  // Preprocess RTF content first
  let processedContent = preprocessRTFContent(content)
  
  // Try multiple patterns for flight number (RTF may have different formatting)
  let flightNumber = ""
  
  // Pattern 1: EK followed by 4 digits (with optional spaces/dashes)
  let flightMatch = processedContent.match(/EK\s*[-]?\s*(\d{4})/i)
  if (flightMatch) {
    flightNumber = `EK${flightMatch[1]}`
  } else {
    // Pattern 2: EK followed by digits (more flexible)
    flightMatch = processedContent.match(/EK\s*(\d{3,5})/i)
    if (flightMatch) {
      flightNumber = `EK${flightMatch[1].padStart(4, '0')}`
    } else {
      // Pattern 3: Look for "FLIGHT" or "FLT" followed by EK and numbers
      flightMatch = processedContent.match(/(?:FLIGHT|FLT)[\s:]*EK\s*(\d{4})/i)
      if (flightMatch) {
        flightNumber = `EK${flightMatch[1]}`
      } else {
        // Pattern 4: Just look for EK followed by any 4 digits anywhere
        flightMatch = processedContent.match(/EK(\d{4})/i)
        if (flightMatch) {
          flightNumber = `EK${flightMatch[1]}`
        }
      }
    }
  }
  
  // If still not found, try without preprocessing (maybe preprocessing removed important info)
  if (!flightNumber) {
    console.warn('[RTFParser] Flight number not found after preprocessing, trying original content...')
    // Try with original content (less processed)
    const originalContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    
    flightMatch = originalContent.match(/EK\s*[-]?\s*(\d{4})/i)
    if (flightMatch) {
      flightNumber = `EK${flightMatch[1]}`
    } else {
      flightMatch = originalContent.match(/EK\s*(\d{3,5})/i)
      if (flightMatch) {
        flightNumber = `EK${flightMatch[1].padStart(4, '0')}`
      } else {
        flightMatch = originalContent.match(/EK(\d{4})/i)
        if (flightMatch) {
          flightNumber = `EK${flightMatch[1]}`
        }
      }
    }
    
    // If found in original, use original content for rest of parsing
    if (flightNumber) {
      processedContent = originalContent
      console.log('[RTFParser] Found flight number in original content, using original for parsing')
    }
  }
  
  // Debug logging if flight number still not found
  if (!flightNumber) {
    console.warn('[RTFParser] Could not find flight number. First 500 chars of processed content:', processedContent.substring(0, 500))
    // Try to find any EK pattern for debugging
    const debugMatch = processedContent.match(/EK[^\s]*/gi)
    if (debugMatch) {
      console.warn('[RTFParser] Found EK patterns:', debugMatch.slice(0, 5))
    }
    // Also check original content
    const originalDebugMatch = content.match(/EK[^\s]*/gi)
    if (originalDebugMatch) {
      console.warn('[RTFParser] Found EK patterns in original:', originalDebugMatch.slice(0, 5))
    }
  }

  // Parse date - support multiple months
  const dateMatch = processedContent.match(/(\d{1,2})\s*[-]?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s*[-]?\s*(\d{4}))?/i)
  const date = dateMatch ? dateMatch[0] : ""

  // Parse ACFT TYPE - more flexible for RTF (may have spaces or different formatting)
  // Format: ACFT TYPE: 77WEP or ACFT TYPE: 388Y
  // Pattern: ACFT TYPE: followed by value (can contain letters, numbers, may have spaces)
  const acftTypeMatch = processedContent.match(/ACFT\s+TYPE:\s*([A-Z0-9]+(?:\s+[A-Z0-9]+)*)/i)
  const aircraftType = acftTypeMatch ? acftTypeMatch[1].trim().replace(/\s+/g, "") : ""

  // Parse ACFT REG - more flexible for RTF
  // Format: ACFT REG: A6-EBY or ACFT REG: A6-EVO
  // Pattern: ACFT REG: followed by value (can contain letters, numbers, dashes)
  const acftRegMatch = processedContent.match(/ACFT\s+REG:\s*([A-Z0-9-]+)/i)
  const aircraftReg = acftRegMatch ? acftRegMatch[1].trim() : ""

  const stdMatch = processedContent.match(/STD:\s*(\d{2}:\d{2})/i)
  const std = stdMatch ? stdMatch[1] : ""

  const sectorMatch = processedContent.match(/SECTOR:\s*([A-Z]{6})/i)
  const sector = sectorMatch ? sectorMatch[1] : ""

  const prepByMatch = processedContent.match(/PREPARED\s+BY:\s*(\S+)/i)
  const preparedBy = prepByMatch ? prepByMatch[1] : ""

  const prepOnMatch = processedContent.match(/PREPARED\s+ON:\s*([\d-]+\s+[\d:]+)/i)
  const preparedOn = prepOnMatch ? prepOnMatch[1] : ""

  // Parse PAX - format: PAX: DXB/AMM/2/35/293 or PAX: DXB/MXP
  // Pattern: PAX: followed by route info (can contain /, letters, numbers, slashes)
  const paxMatch = processedContent.match(/PAX:\s*([A-Z0-9\/\s]+?)(?:\s+STD|\s+PREPARED|$)/i)
  const pax = paxMatch ? paxMatch[1].trim() : ""

  // Parse TTL PLN ULD - more flexible pattern for RTF
  // Format: TTL PLN ULD: 06PMC/07AKE or TTL PLN ULD: 6PMC/10AKE
  // Pattern: TTL PLN ULD: followed by value (can contain /, letters, numbers, spaces)
  // Stop at multiple spaces or next field (ULD VERSION or PREPARED ON)
  const ttlPlnUldMatch = processedContent.match(/TTL\s+PLN\s+ULD:\s*([A-Z0-9\/\s]+?)(?:\s+ULD\s+VERSION|\s+PREPARED|$)/i)
  const ttlPlnUld = ttlPlnUldMatch ? ttlPlnUldMatch[1].trim().replace(/\s+/g, "") : ""

  // Parse ULD VERSION - more flexible pattern for RTF
  // Format: ULD VERSION: 06/26 or ULD VERSION: 6/26 or ULD VERSION: 05PMC/26
  // Pattern: ULD VERSION: followed by value (can contain /, letters, numbers, spaces)
  // Stop at multiple spaces or next field (PREPARED ON)
  const uldVersionMatch = processedContent.match(/ULD\s+VERSION:\s*([A-Z0-9\/\s]+?)(?:\s+PREPARED|$)/i)
  const uldVersion = uldVersionMatch ? uldVersionMatch[1].trim().replace(/\s+/g, "") : ""

  // Parse header warning - same logic as regular parser
  let headerWarning = ""
  const lines = processedContent.split("\n")
  let foundTableHeader = false
  let foundSeparator = false
  const warningLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (line.includes("SER.") && line.includes("AWB NO")) {
      foundTableHeader = true
      continue
    }
    
    if (foundTableHeader && !foundSeparator) {
      if (line.match(/^[_\-=]+$/)) {
        foundSeparator = true
        continue
      }
    }
    
    if (foundTableHeader && foundSeparator) {
      const normalizedLine = line.replace(/\s+/g, " ")
      const isShipmentLine = line.match(/^\d{3}\s+\d{3}-\d{8}/) || normalizedLine.match(/^\d{3}\s+\d{3}-\d{8}/)
      if (isShipmentLine) {
        break
      }
      
      if (!line || line.match(/^[_\-=\s]+$/)) {
        continue
      }
      
      if (line.match(/xx\s+.*\s+xx/i) || normalizedLine.match(/xx\s+.*\s+xx/i)) {
        continue
      }
      
      if (line.match(/^List\s+Table/i) || 
          line.match(/^[0f\s]{50,}$/i) || 
          normalizedLine.match(/^List\s+Table/i) ||
          normalizedLine.match(/^[0f\s]{50,}$/i)) {
        continue
      }
      
      warningLines.push(line)
    }
  }
  
  if (warningLines.length > 0) {
    headerWarning = warningLines.join("\n").trim()
  }

  // Detect CRITICAL stamp - check if "CRITICAL" text appears anywhere in the content
  // The stamp can appear as:
  // 1. Visual stamp (image) - might not be detected in text extraction
  // 2. Text "CRITICAL" anywhere in document
  // 3. "CRITICAL SECTOR" or similar patterns
  // Search in entire document, not just header area
  const contentUpper = processedContent.toUpperCase()
  const hasCriticalText = /CRITICAL/i.test(processedContent)
  const hasCriticalSector = /CRITICAL\s+SECTOR/i.test(contentUpper)
  const hasCriticalStamp = /CRITICAL\s+STAMP/i.test(contentUpper)
  const isCritical = hasCriticalText || hasCriticalSector || hasCriticalStamp || contentUpper.includes("CRITICAL")
  
  // Log detection for debugging
  if (isCritical) {
    console.log('[RTFParser] ✅ CRITICAL detected:', {
      hasCriticalText,
      hasCriticalSector,
      hasCriticalStamp,
      sample: processedContent.substring(0, 500).replace(/\n/g, ' ')
    })
  } else {
    // Log first 1000 chars to help debug why CRITICAL wasn't detected
    console.log('[RTFParser] ⚠️ CRITICAL not detected. First 1000 chars:', processedContent.substring(0, 1000))
  }

  // Log parsed header fields for debugging
  console.log('[RTFParser] Parsed header fields:', {
    flightNumber,
    date,
    aircraftType,
    aircraftReg,
    sector,
    std,
    preparedBy,
    preparedOn,
    pax,
    ttlPlnUld,
    uldVersion,
    hasHeaderWarning: !!headerWarning,
    isCritical,
  })

  return { 
    flightNumber, 
    date, 
    aircraftType, 
    aircraftReg, 
    sector, 
    std, 
    preparedBy, 
    preparedOn,
    ttlPlnUld: ttlPlnUld || undefined,
    uldVersion: uldVersion || undefined,
    headerWarning: headerWarning || undefined,
    isCritical: isCritical === true ? true : undefined, // Explicitly set to true or undefined
  }
}

/**
 * Parse shipments from RTF content
 * Uses the same logic as regular parser but with RTF-specific preprocessing
 */
export function parseRTFShipments(content: string, header: LoadPlanHeader): Shipment[] {
  // Preprocess RTF content first
  const processedContent = preprocessRTFContent(content)
  
  console.log(`[RTFParser] Processing shipments from ${processedContent.length} chars of content`)
  
  const shipments: Shipment[] = []
  const lines = processedContent.split("\n")
  let currentShipment: Partial<Shipment> | null = null
  let inShipmentSection = false
  let currentULD = ""
  let isRampTransfer = false
  let currentSector = header.sector || ""
  const awbBuffer: Partial<Shipment>[] = []
  
  console.log(`[RTFParser] Total lines to process: ${lines.length}`)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Log first few lines that look like shipments for debugging
    if (i < 200 && line.match(/^\d{3}\s+\d{3}-\d{8}/)) {
      console.log(`[RTFParser] Line ${i} looks like shipment:`, line.substring(0, 200))
    }

    // Check for new SECTOR marker
    const sectorMatch = line.match(/^SECTOR:\s*([A-Z]{6})/i)
    if (sectorMatch) {
      currentSector = sectorMatch[1]
      console.log("[RTFParser] ✅ New SECTOR detected:", currentSector)
      continue
    }

    // Check for table header - be more flexible with spacing and format
    const hasSer = (line.includes("SER") || line.includes("SER.")) && !line.match(/^[0-9]/)
    const hasAWB = line.includes("AWB") || line.includes("AWBNO") || line.includes("AWB NO")
    
    if (hasSer && hasAWB) {
      // New table header - flush buffer
      if (awbBuffer.length > 0) {
        console.log("[RTFParser] ⚠️ New table header found with", awbBuffer.length, "items in buffer - flushing buffer for sector:", currentSector)
        awbBuffer.forEach((shipment) => {
          const s = shipment as Partial<Shipment> & { sector?: string }
          s.sector = currentSector
        })
        shipments.push(...(awbBuffer as Shipment[]))
        awbBuffer.length = 0
      }
      
      if (currentShipment) {
        const s = currentShipment as Partial<Shipment> & { sector?: string }
        s.sector = currentSector
        shipments.push(currentShipment as Shipment)
        currentShipment = null
      }
      
      inShipmentSection = true
      console.log("[RTFParser] ✅ New shipment table header detected at line", i, "- starting new sector section:", currentSector)
      console.log("[RTFParser] Header line:", line.substring(0, 200))
      continue
    }

    // Check for RAMP TRANSFER marker
    if (line.includes("RAMP TRANSFER") || line.includes("***** RAMP TRANSFER *****")) {
      isRampTransfer = true
      console.log("[RTFParser] ✅ RAMP TRANSFER section detected")
      continue
    }

    // Check for TOTALS line - end of shipments (but continue parsing in case there are more sectors)
    if (line.includes("TOTALS:") || line.match(/^TOTALS:/i)) {
      // Flush buffer before ending
      if (awbBuffer.length > 0) {
        console.log("[RTFParser] Flushing", awbBuffer.length, "items from buffer at TOTALS")
        awbBuffer.forEach((shipment) => {
          const s = shipment as Partial<Shipment> & { sector?: string }
          s.sector = currentSector
          if (!s.uld) {
            s.uld = ""
          }
        })
        shipments.push(...(awbBuffer as Shipment[]))
        awbBuffer.length = 0
      }
      
      if (currentShipment) {
        const s = currentShipment as Partial<Shipment> & { sector?: string }
        s.sector = currentSector
        if (!s.uld) {
          s.uld = ""
        }
        shipments.push(currentShipment as Shipment)
        currentShipment = null
      }
      
      console.log("[RTFParser] ✅ TOTALS found for sector:", currentSector, "- flushed buffer")
      // Don't set inShipmentSection = false here - there might be another sector
      isRampTransfer = false
      continue
    }

    // Only try to parse if we're in shipment section
    if (!inShipmentSection) {
      continue
    }
    
    // Parse shipment line - RTF may have inconsistent spacing, so normalize first
    // But preserve multiple spaces for table alignment - use \s+ instead of single space
    // First normalize: replace 3+ spaces with 2 spaces (preserve table structure)
    let normalizedLine = line.replace(/\s{3,}/g, "  ")
    // Then normalize remaining: replace 2+ spaces with single space for regex matching
    normalizedLine = normalizedLine.replace(/\s{2,}/g, " ")
    
    // Try full match first - more flexible regex for RTF format
    // Format: SER AWB ORG/DES PCS WGT VOL LVOL SHC MAN.DESC PCODE PC THC BS PI FLTIN ARRDT.TIME SI
    // Based on example: "001 176-92204630 ICNAMM 6 70.0 0.5 0.5 AXA-COL MEDICAL KITS AXA P1 SS N EK0323 29Feb0454 33:10/ N"
    // MAN.DESC can have spaces (MEDICAL KITS, CHILLED BONE-IN, etc.)
    // PC can be empty (some shipments don't have PC)
    // THC can be empty, NORM, QWT, QRT, etc.
    // FLTIN and ARRDT.TIME are optional
    
    // First try: standard format with all fields
    let shipmentMatch = normalizedLine.match(
      /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z]\d)?\s*([A-Z0-9]*)?\s+(SS|BS|NN)\s+([YN])\s+([A-Z]+\d+)?\s*(\d{2}[A-Za-z]{3}\d{2,4}(?:\s+[\d:\/]+)?)?\s*([\d:\/\s]+)?\s*([YN])?$/i,
    )
    
    // If regex doesn't match, try a more flexible approach: parse field by field
    if (!shipmentMatch) {
      // Try to extract fields manually by finding patterns
      const serMatch = normalizedLine.match(/^(\d{3})\s+(\d{3}-\d{8})/)
      if (serMatch) {
        // Found SER and AWB, try to parse the rest more flexibly
        const afterAWB = normalizedLine.substring(serMatch[0].length).trim()
        const orgDesMatch = afterAWB.match(/^([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+)/)
        if (orgDesMatch) {
          // We have ORG/DES, PCS, WGT, VOL, LVOL, SHC, and the rest
          // The rest should contain MAN.DESC, PCODE, PC, THC, BS, PI, FLTIN, ARRDT.TIME, SI
          // MAN.DESC is tricky - it can have spaces and ends before PCODE
          // PCODE is always 3 letters (AXA, COU, GCR, etc.)
          const rest = orgDesMatch[8]
          // Try to find PCODE pattern (3 uppercase letters) - this marks end of MAN.DESC
          const pcodeMatch = rest.match(/\s+([A-Z]{3})\s+([A-Z]\d)?\s*([A-Z0-9]*)?\s+(SS|BS|NN)\s+([YN])\s+([A-Z]+\d+)?\s*(\d{2}[A-Za-z]{3}\d{2,4}(?:\s+[\d:\/]+)?)?\s*([\d:\/\s]+)?\s*([YN])?$/i)
          if (pcodeMatch) {
            // Found PCODE pattern - extract MAN.DESC (everything before PCODE)
            const manDescEnd = rest.indexOf(pcodeMatch[0])
            const manDesc = rest.substring(0, manDescEnd).trim()
            
            shipmentMatch = [
              normalizedLine,
              serMatch[1], // serial
              serMatch[2], // awb
              orgDesMatch[1], // origin
              orgDesMatch[2], // destination
              orgDesMatch[3], // pcs
              orgDesMatch[4], // wgt
              orgDesMatch[5], // vol
              orgDesMatch[6], // lvol
              orgDesMatch[7], // shc
              manDesc, // manDesc
              pcodeMatch[1], // pcode
              pcodeMatch[2] || "", // pc
              pcodeMatch[3] || "", // thc
              pcodeMatch[4], // bs
              pcodeMatch[5], // pi
              pcodeMatch[6] || "", // fltIn
              pcodeMatch[7] || "", // arrDate
              pcodeMatch[8] || "", // arrTime
              pcodeMatch[9] || "N", // si
            ]
          }
        }
      }
    }
    
    // If regex doesn't match, try format without FLTIN/ARRDT.TIME (shipments 011-017)
    if (!shipmentMatch) {
      // Pattern: SER AWB ORG/DES PCS WGT VOL LVOL SHC MAN.DESC PCODE PC THC BS PI SI (no FLTIN/ARRDT)
      // Example: "011 176-96384385 DXBAMM 4 46.0 0.2 0.2 RCM SODIUM GCR P2 NORM SS N N"
      const altMatch = normalizedLine.match(
        /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z]\d)?\s*([A-Z0-9]*)?\s+(SS|BS|NN)\s+([YN])\s+([YN])?$/i,
      )
      if (altMatch) {
        const pc = altMatch[12] || ""
        const thc = altMatch[13] || ""
        const bs = altMatch[14] || "SS"
        const pi = altMatch[15] || "N"
        const si = altMatch[16] || "N"
        
        shipmentMatch = [
          altMatch[0],
          altMatch[1], // serial
          altMatch[2], // awb
          altMatch[3], // origin
          altMatch[4], // destination
          altMatch[5], // pcs
          altMatch[6], // wgt
          altMatch[7], // vol
          altMatch[8], // lvol
          altMatch[9], // shc
          altMatch[10], // manDesc
          altMatch[11], // pcode
          pc, // pc
          thc, // thc
          bs, // bs
          pi, // pi
          "", // fltIn
          "", // arrDate
          "", // arrTime
          si, // si
        ]
      }
    }
    
    // If still no match, try pattern for shipment without PC (PC field is empty, THC comes right after PCODE)
    if (!shipmentMatch) {
      // Example: "010 ... COU P2 QWT SS N ..." - but wait, this has PC (P2)
      // Actually, some shipments might have format: PCODE THC SS (no PC)
      // Let's try a more flexible pattern that handles missing PC
      const flexibleMatch = normalizedLine.match(
        /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z]\d\s+)?([A-Z0-9]+)?\s+(SS|BS|NN)\s+([YN])\s+([A-Z]+\d+)?\s*(\d{2}[A-Za-z]{3}\d{2,4}(?:\s+[\d:\/]+)?)?\s*([\d:\/\s]+)?\s*([YN])?/i,
      )
      if (flexibleMatch) {
        const pc = flexibleMatch[12]?.trim() || ""
        const thc = flexibleMatch[13] || ""
        const bs = flexibleMatch[14] || "SS"
        const pi = flexibleMatch[15] || "N"
        const fltIn = flexibleMatch[16] || ""
        const arrDate = flexibleMatch[17] || ""
        const arrTime = flexibleMatch[18] || ""
        const si = flexibleMatch[19] || "N"
        
        shipmentMatch = [
          flexibleMatch[0],
          flexibleMatch[1], // serial
          flexibleMatch[2], // awb
          flexibleMatch[3], // origin
          flexibleMatch[4], // destination
          flexibleMatch[5], // pcs
          flexibleMatch[6], // wgt
          flexibleMatch[7], // vol
          flexibleMatch[8], // lvol
          flexibleMatch[9], // shc
          flexibleMatch[10], // manDesc
          flexibleMatch[11], // pcode
          pc, // pc
          thc, // thc
          bs, // bs
          pi, // pi
          fltIn, // fltIn
          arrDate, // arrDate
          arrTime, // arrTime
          si, // si
        ]
      }
    }
    
    // If regex doesn't match, try field-by-field parsing (more robust for RTF)
    if (!shipmentMatch && /^\d{3}\s+\d{3}-\d{8}/.test(normalizedLine)) {
      console.log(`[RTFParser] Trying field-by-field parsing for line ${i}`)
      
      try {
        // Extract fields one by one using pattern matching
        const parts = normalizedLine.split(/\s+/)
        
        // Field 0: SER (3 digits)
        // Field 1: AWB (3-8 digits)
        if (parts.length >= 2 && /^\d{3}$/.test(parts[0]) && /^\d{3}-\d{8}$/.test(parts[1])) {
          const serial = parts[0]
          const awb = parts[1]
          
          // Find ORG/DES - should be 6 letters (3+3) after AWB
          let orgDesIdx = 2
          let origin = ""
          let destination = ""
          let pcs = ""
          let wgt = ""
          let vol = ""
          let lvol = ""
          let shc = ""
          let manDesc = ""
          let pcode = ""
          let pc = ""
          let thc = ""
          let bs = "SS"
          let pi = "N"
          let fltIn = ""
          let arrDate = ""
          let arrTime = ""
          let si = "N"
          
          // Try to find ORG/DES (6 consecutive uppercase letters)
          // Handle cases like "BOMAMM1" (BOM + AMM + 1) or "BOMAMM" (BOM + AMM)
          for (let j = orgDesIdx; j < parts.length; j++) {
            const part = parts[j]
            // Check if this part contains 6 uppercase letters (ORG/DES) possibly followed by digits
            const orgDesMatch = part.match(/^([A-Z]{3})([A-Z]{3})(\d*)$/)
            if (orgDesMatch) {
              origin = orgDesMatch[1]
              destination = orgDesMatch[2]
              pcs = orgDesMatch[3] || parts[j + 1] || ""
              orgDesIdx = j + (orgDesMatch[3] ? 0 : 1)
              break
            } else if (part.length >= 6 && /^[A-Z]{6}/.test(part)) {
              // Extract first 6 letters as ORG/DES
              origin = part.substring(0, 3)
              destination = part.substring(3, 6)
              // Check if there are digits after (PCS)
              const remaining = part.substring(6)
              if (/^\d+$/.test(remaining)) {
                pcs = remaining
                orgDesIdx = j
              } else {
                pcs = parts[j + 1] || ""
                orgDesIdx = j + 1
              }
              break
            } else if (part.length >= 3 && /^[A-Z]{3}$/.test(part) && j + 1 < parts.length) {
              // Check if next part is also 3 uppercase letters (ORG + DES)
              const nextPart = parts[j + 1]
              if (/^[A-Z]{3}/.test(nextPart)) {
                origin = part
                destination = nextPart.substring(0, 3)
                // Check if nextPart has digits after (like "AMM1")
                const remaining = nextPart.substring(3)
                if (/^\d+$/.test(remaining)) {
                  pcs = remaining
                  orgDesIdx = j + 1
                } else {
                  pcs = parts[j + 2] || ""
                  orgDesIdx = j + 2
                }
                break
              }
            }
          }
          
          if (origin && destination) {
            // Extract PCS, WGT, VOL, LVOL (should be numbers)
            let idx = orgDesIdx
            if (!pcs && idx < parts.length && /^\d+$/.test(parts[idx])) {
              pcs = parts[idx++]
            }
            if (idx < parts.length && /^[\d.]+$/.test(parts[idx])) {
              wgt = parts[idx++]
            }
            if (idx < parts.length && /^[\d.]+$/.test(parts[idx])) {
              vol = parts[idx++]
            }
            if (idx < parts.length && /^[\d.]+$/.test(parts[idx])) {
              lvol = parts[idx++]
            }
            
            // Extract SHC (starts with uppercase letters and may contain hyphens)
            if (idx < parts.length && /^[A-Z-]+$/.test(parts[idx])) {
              shc = parts[idx++]
            }
            
            // MAN.DESC is tricky - it can have spaces and ends before PCODE
            // PCODE is always 3 uppercase letters
            // Handle cases like "PILASPERSHIPPERAXDP2" where everything is concatenated
            // Strategy: Look for 3-letter PCODE pattern, then work backwards
            
            // First, try to find PCODE by looking for 3 uppercase letters followed by P# pattern
            let pcodeIdx = -1
            let foundPcode = false
            
            // Look for pattern like "AXDP2", "COUP2", etc. (PCODE + PC concatenated)
            for (let j = idx; j < parts.length; j++) {
              const part = parts[j]
              
              // Check if part contains PCODE+PC pattern (e.g., "AXDP2", "COUP2")
              const pcodePcMatch = part.match(/^([A-Z]{3})(P\d)$/)
              if (pcodePcMatch) {
                pcode = pcodePcMatch[1]
                pc = pcodePcMatch[2]
                pcodeIdx = j
                foundPcode = true
                break
              }
              
              // Check if part is just PCODE (3 letters) and next is PC
              if (/^[A-Z]{3}$/.test(part) && j + 1 < parts.length) {
                const nextPart = parts[j + 1]
                if (/^P\d$/.test(nextPart) || /^[A-Z0-9]+$/.test(nextPart)) {
                  pcode = part
                  pc = nextPart
                  pcodeIdx = j
                  foundPcode = true
                  break
                }
              }
            }
            
            // If PCODE not found, try to extract from concatenated string
            if (!foundPcode && idx < parts.length) {
              // Look for long concatenated strings that might contain PCODE+PC
              for (let j = idx; j < parts.length; j++) {
                const part = parts[j]
                // Check if part is very long and might contain multiple fields
                if (part.length > 10) {
                  // Try to find PCODE pattern (3 uppercase letters) in the string
                  const pcodeMatch = part.match(/([A-Z]{3})(P\d)/)
                  if (pcodeMatch) {
                    const pcodeStart = part.indexOf(pcodeMatch[0])
                    pcode = pcodeMatch[1]
                    pc = pcodeMatch[2]
                    // Extract MAN.DESC from before PCODE
                    const beforePcode = part.substring(0, pcodeStart)
                    manDesc = (parts.slice(idx, j).join(" ") + " " + beforePcode).trim()
                    pcodeIdx = j
                    foundPcode = true
                    break
                  }
                }
              }
            }
            
            // Extract MAN.DESC (everything between SHC and PCODE)
            if (foundPcode && pcodeIdx > idx) {
              if (manDesc === "") {
                manDesc = parts.slice(idx, pcodeIdx).join(" ")
              }
            } else if (idx < parts.length) {
              // No PCODE found, try to extract MAN.DESC differently
              // Look for pattern: ... PCODE PC ...
              for (let j = idx; j < parts.length - 1; j++) {
                if (/^[A-Z]{3}$/.test(parts[j])) {
                  pcode = parts[j]
                  pc = parts[j + 1] || ""
                  manDesc = parts.slice(idx, j).join(" ")
                  pcodeIdx = j + 1
                  foundPcode = true
                  break
                }
              }
            }
            
            // If still no PCODE found, try to extract from the last long part
            if (!foundPcode && idx < parts.length) {
              // Get the part after SHC
              const afterShc = parts.slice(idx).join(" ")
              // Try to find PCODE pattern anywhere in the string
              const pcodePattern = afterShc.match(/([A-Z]{3})(\s+P\d|\s+[A-Z0-9]+)/i)
              if (pcodePattern) {
                const pcodeStart = afterShc.indexOf(pcodePattern[0])
                pcode = pcodePattern[1]
                pc = pcodePattern[2].trim()
                manDesc = afterShc.substring(0, pcodeStart).trim()
                foundPcode = true
              }
            }
            
            // Extract THC, BS, PI, FLTIN, ARRDT.TIME, SI
            let currentIdx = pcodeIdx > 0 ? pcodeIdx + 1 : idx + 1
            if (currentIdx < parts.length) {
              // THC can be empty, NORM, QWT, QRT, etc.
              if (currentIdx < parts.length && /^[A-Z0-9]+$/.test(parts[currentIdx]) && 
                  !/^(SS|BS|NN|N|Y)$/i.test(parts[currentIdx])) {
                thc = parts[currentIdx++]
              }
              
              // BS (SS, BS, NN)
              if (currentIdx < parts.length && /^(SS|BS|NN)$/i.test(parts[currentIdx])) {
                bs = parts[currentIdx++].toUpperCase()
              }
              
              // PI (N, Y)
              if (currentIdx < parts.length && /^[YN]$/i.test(parts[currentIdx])) {
                pi = parts[currentIdx++].toUpperCase()
              }
              
              // FLTIN (EK####)
              if (currentIdx < parts.length && /^[A-Z]+\d+$/i.test(parts[currentIdx])) {
                fltIn = parts[currentIdx++]
              }
              
              // ARRDT (date pattern: ##Mon## or ##Mon####)
              if (currentIdx < parts.length && /\d{2}[A-Za-z]{3}\d{2,4}/.test(parts[currentIdx])) {
                arrDate = parts[currentIdx++]
                // Check if next part is time
                if (currentIdx < parts.length && /[\d:\/]+/.test(parts[currentIdx])) {
                  arrTime = parts[currentIdx++]
                }
              }
              
              // SI (last field, N or Y)
              if (currentIdx < parts.length && /^[YN]$/i.test(parts[currentIdx])) {
                si = parts[currentIdx].toUpperCase()
              }
            }
            
            // Create shipment with extracted fields
            if (serial && awb && origin && destination) {
              console.log(`[RTFParser] ✅ Field-by-field parsing succeeded for line ${i}`)
              shipmentMatch = [
                normalizedLine,
                serial,
                awb,
                origin,
                destination,
                pcs || "0",
                wgt || "0",
                vol || "0",
                lvol || "0",
                shc || "",
                manDesc || "",
                pcode || "",
                pc || "",
                thc || "",
                bs,
                pi,
                fltIn || "",
                arrDate || "",
                arrTime || "",
                si,
              ]
            }
          }
        }
      } catch (fieldParseError) {
        console.warn(`[RTFParser] Field-by-field parsing failed for line ${i}:`, fieldParseError)
      }
    }
    
    // Log if we still couldn't parse it
    if (!shipmentMatch && /^\d{3}\s+\d{3}-\d{8}/.test(normalizedLine)) {
      console.warn(`[RTFParser] ⚠️ Found shipment-like line but couldn't parse at line ${i}:`, line.substring(0, 200))
      console.warn(`[RTFParser] Normalized line:`, normalizedLine.substring(0, 200))
      
      // Try minimal parsing - just extract SER, AWB, ORG/DES, PCS, WGT, VOL, LVOL
      const minimalMatch = normalizedLine.match(/^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})(\d*)/i)
      if (minimalMatch) {
        const serial = minimalMatch[1]
        const awb = minimalMatch[2]
        const origin = minimalMatch[3]
        const destination = minimalMatch[4]
        let pcs = minimalMatch[5] || "0"
        
        // Try to extract WGT, VOL, LVOL from remaining parts
        const remaining = normalizedLine.substring(minimalMatch[0].length).trim()
        const remainingParts = remaining.split(/\s+/)
        let wgt = "0"
        let vol = "0"
        let lvol = "0"
        
        // Also check if PCS is in the ORG/DES part (like "BOMAMM1")
        if (pcs === "0" && minimalMatch[5] && /^\d+$/.test(minimalMatch[5])) {
          pcs = minimalMatch[5]
        }
        
        for (let j = 0; j < Math.min(3, remainingParts.length); j++) {
          if (/^[\d.]+$/.test(remainingParts[j])) {
            if (wgt === "0") wgt = remainingParts[j]
            else if (vol === "0") vol = remainingParts[j]
            else if (lvol === "0") lvol = remainingParts[j]
          }
        }
        
        // If still no PCS found, try to extract from the ORG/DES part
        if (pcs === "0") {
          const orgDesPart = normalizedLine.match(/\d{3}\s+\d{3}-\d{8}\s+([A-Z]{6,})/)?.[1]
          if (orgDesPart) {
            const pcsMatch = orgDesPart.match(/(\d+)$/)
            if (pcsMatch) {
              pcs = pcsMatch[1]
            }
          }
        }
        
        console.log(`[RTFParser] ⚠️ Using minimal parsing for line ${i} - only basic fields`)
        
        // Create minimal shipment
        const minimalShipment: Partial<Shipment> = {
          serialNo: serial,
          awbNo: awb.replace(/\s+/g, ""),
          origin: origin,
          destination: destination,
          pieces: Number.parseInt(pcs) || 0,
          weight: Number.parseFloat(wgt) || 0,
          volume: Number.parseFloat(vol) || 0,
          lvol: Number.parseFloat(lvol) || 0,
          shc: "",
          manDesc: "",
          pcode: "",
          pc: "",
          thc: "",
          bs: "SS",
          pi: "N",
          fltIn: "",
          arrDtTime: "",
          qnnAqnn: "",
          whs: "",
          si: "N",
          uld: currentULD || "",
          specialNotes: [],
          isRampTransfer: isRampTransfer,
          sector: currentSector,
        }
        
        // Add to buffer or shipments
        if (currentULD) {
          minimalShipment.uld = currentULD
          const s = minimalShipment as Partial<Shipment> & { sector?: string }
          s.sector = currentSector
          shipments.push(minimalShipment as Shipment)
          currentULD = ""
        } else {
          const s = minimalShipment as Partial<Shipment> & { sector?: string }
          s.sector = currentSector
          awbBuffer.push(minimalShipment)
        }
        
        continue
      }
    }
    
    if (shipmentMatch) {
      const serial = shipmentMatch[1]
      const awb = shipmentMatch[2]
      const origin = shipmentMatch[3]
      const destination = shipmentMatch[4]
      const pcs = shipmentMatch[5]
      const wgt = shipmentMatch[6]
      const vol = shipmentMatch[7]
      const lvol = shipmentMatch[8]
      const shc = shipmentMatch[9]?.trim() || ""
      const manDesc = shipmentMatch[10]?.trim() || ""
      const pcode = shipmentMatch[11] || ""
      const pc = shipmentMatch[12] || ""
      const thc = shipmentMatch[13]?.trim() || ""
      const bs = shipmentMatch[14] || "SS"
      const pi = shipmentMatch[15] || "N"
      const fltIn = shipmentMatch[16] || ""
      const arrDate = shipmentMatch[17] || ""
      const arrTime = shipmentMatch[18] || ""
      const si = shipmentMatch[19] || "N"

      // Extract PC from THC if needed (format: "PC/THC" or just "THC")
      let actualPC = pc
      let actualTHC = thc
      if (thc && thc.includes("/")) {
        const parts = thc.split("/")
        actualPC = parts[0] || ""
        actualTHC = parts[1] || ""
      }

      currentShipment = {
        serialNo: serial,
        awbNo: awb.replace(/\s+/g, ""),
        origin: origin,
        destination: destination,
        pieces: Number.parseInt(pcs) || 0,
        weight: Number.parseFloat(wgt) || 0,
        volume: Number.parseFloat(vol) || 0,
        lvol: Number.parseFloat(lvol) || 0,
        shc: shc,
        manDesc: manDesc,
        pcode: pcode,
        pc: actualPC,
        thc: actualTHC,
        bs: bs,
        pi: pi,
        fltIn: fltIn,
        arrDtTime: `${arrDate || ""} ${arrTime || ""}`.trim(),
        qnnAqnn: "",
        whs: "",
        si: si,
        uld: currentULD || "",
        specialNotes: [],
        isRampTransfer: isRampTransfer,
        sector: currentSector,
      }
      
      // If ULD was set before, assign it
      if (currentULD) {
        currentShipment.uld = currentULD
        const s = currentShipment as Partial<Shipment> & { sector?: string }
        s.sector = currentSector
        shipments.push(currentShipment as Shipment)
        currentShipment = null
        currentULD = ""
      } else {
        // Store in buffer until ULD is found
        // Make sure sector is set
        const s = currentShipment as Partial<Shipment> & { sector?: string }
        s.sector = currentSector
        awbBuffer.push(currentShipment)
        currentShipment = null
      }
      
      continue
    }
    
    // Log lines that look like shipments but don't match (for debugging)
    if (inShipmentSection && line.match(/^\d{3}\s+\d{3}-\d{8}/)) {
      console.warn("[RTFParser] ⚠️ Line looks like shipment but didn't match regex:", line.substring(0, 200))
      console.warn("[RTFParser] ⚠️ Normalized line:", normalizedLine.substring(0, 200))
      // Try to see what fields we can extract manually
      const parts = normalizedLine.split(/\s+/)
      console.warn("[RTFParser] ⚠️ Line parts count:", parts.length, "First 10 parts:", parts.slice(0, 10))
    }

    // Check for ULD section - more flexible pattern matching
    // Format: XX 06AKE XX, XX 02PMC 03AKE XX, XX BULK XX, XX XYP BOX XX, XX TOP UP JNG UNIT XX, etc.
    // Also: XX 01ALF 01AKE XX --- HL ON EK041 (include everything after XX markers)
    // Check if line contains XX/xx markers and ULD content between them
    const hasULDMarkers = /xx\s+/i.test(line) && /\s+xx/i.test(line)
    if (hasULDMarkers && inShipmentSection) {
      // Extract ALL content including everything after XX markers
      // Pattern: XX ... content ... XX (and everything after, like "--- HL ON EK041")
      let uldContent: string | null = null
      
      // Try to extract everything between XX markers AND everything after
      // Pattern: XX (with optional spaces) ... content ... (with optional spaces) XX (and rest of line)
      const uldMatch = line.match(/xx\s+(.+?)\s+xx(.*)/i)
      if (uldMatch) {
        const betweenXX = uldMatch[1].trim()
        const afterXX = uldMatch[2].trim()
        // Combine both parts, normalize spaces
        uldContent = (betweenXX + (afterXX ? " " + afterXX : "")).trim()
        // Normalize multiple spaces to single space, but preserve structure
        uldContent = uldContent.replace(/\s+/g, " ").toUpperCase()
      }
      
      // If no match with spaces, try without spaces requirement (XX...XX)
      if (!uldContent) {
        const uldMatchNoSpace = line.match(/xx(.+?)xx(.*)/i)
        if (uldMatchNoSpace) {
          const betweenXX = uldMatchNoSpace[1].trim()
          const afterXX = uldMatchNoSpace[2].trim()
          uldContent = (betweenXX + (afterXX ? " " + afterXX : "")).trim()
          uldContent = uldContent.replace(/\s+/g, " ").toUpperCase()
        }
      }
      
      if (uldContent && uldContent.length > 0) {
        // Format ULD untuk disimpan: "XX {content} XX" - preserve original format including after XX
        // If there's content after XX, include it: "XX {content} XX {after}"
        // Example: "XX 01ALF 01AKE XX --- HL ON EK041" should become "XX 01ALF 01AKE XX --- HL ON EK041"
        const afterPart = line.match(/xx\s+.+?\s+xx\s+(.+)/i)?.[1]?.trim()
        let formattedULD: string
        if (afterPart) {
          // Extract content between XX markers (without the after part that was merged)
          const betweenXXMatch = line.match(/xx\s+(.+?)\s+xx/i)
          const betweenXX = betweenXXMatch ? betweenXXMatch[1].trim().toUpperCase() : uldContent.replace(/\s+---.*$/i, "").trim()
          formattedULD = `XX ${betweenXX} XX ${afterPart}`
        } else {
          formattedULD = `XX ${uldContent} XX`
        }
        
        console.log("[RTFParser] ✅ ULD section detected:", formattedULD, "- buffer has", awbBuffer.length, "AWB rows")
        
        // Jika ada AWB rows di buffer, assign ULD tersebut ke semua AWB rows di buffer
        if (awbBuffer.length > 0) {
          awbBuffer.forEach((shipment) => {
            shipment.uld = formattedULD
            const s = shipment as Partial<Shipment> & { sector?: string }
            s.sector = currentSector
          })
          shipments.push(...(awbBuffer as Shipment[]))
          awbBuffer.length = 0
          console.log("[RTFParser] ✅ ULD section:", formattedULD, "- assigned to buffered AWB rows")
        } else {
          // Jika buffer kosong, ULD section ini untuk AWB rows yang akan datang
          currentULD = formattedULD
          console.log("[RTFParser] ✅ ULD section:", formattedULD, "- will be used for upcoming AWB rows")
        }
        continue
      }
    }
    
    // Check for special notes - HANYA yang ada bracket "[ ]"
    // Examples: "[Must be load in Fire containment equipment]"
    // Simpan dengan bracket "[ ]" tetap ada
    // IMPORTANT: Check this BEFORE ULD parsing to avoid conflicts
    if (inShipmentSection && (line.startsWith("[") || line.startsWith("**["))) {
      // Make sure this is NOT a ULD line (should not contain XX markers)
      if (!/xx\s+/i.test(line) && !/\s+xx/i.test(line)) {
        const note = line.replace(/\*\*/g, "").trim()
        if (note.length > 0) {
          if (currentShipment) {
            const shipment = currentShipment as Partial<Shipment> & { specialNotes?: string[] }
            if (!shipment.specialNotes) {
              shipment.specialNotes = []
            }
            shipment.specialNotes.push(note)
            console.log("[RTFParser] ✅ Special note added to currentShipment:", note.substring(0, 100))
          } else if (awbBuffer.length > 0) {
            const lastShipment = awbBuffer[awbBuffer.length - 1]
            if (lastShipment) {
              if (!lastShipment.specialNotes) {
                lastShipment.specialNotes = []
              }
              lastShipment.specialNotes.push(note)
              console.log("[RTFParser] ✅ Special note added to buffered shipment:", note.substring(0, 100))
            }
          }
        }
      }
      // Continue to next line - don't process ULD if this was a special note
      continue
    }
    
    // Check for ULD notes that don't start with XX markers
    // Examples: "SHPT RELOC X EK0005 , 29FEB DUE LATE BREAKDOWN --- SAME PLND ON EK041 AS HL"
    // These should go to ULD, NOT specialNotes
    if (inShipmentSection && line.length > 0 && 
        !line.match(/^\d{3}/) && // Not a shipment line (doesn't start with 3 digits)
        !line.match(/^xx\s+/i) && // Not a ULD marker
        !line.match(/^SECTOR:/i) && // Not a sector marker
        !line.match(/^TOTALS:/i) && // Not totals line
        !line.match(/^BAGG|COUR/i) && // Not summary line
        !line.match(/^RAMP|MAIL/i) && // Not section marker
        !line.startsWith("[") && !line.startsWith("**[") && // Not bracket-style note (those go to specialNotes)
        !line.match(/^GO SHOW/i)) { // Not GO SHOW marker
      
      const note = line.trim()
      if (note.length > 0) {
        // Append ke ULD shipment terakhir (currentShipment atau terakhir di buffer)
        if (currentShipment) {
          const shipment = currentShipment as Partial<Shipment>
          // Jika currentShipment sudah punya ULD, append dengan separator
          if (shipment.uld && shipment.uld.trim()) {
            shipment.uld = `${shipment.uld} --- ${note}`
          } else {
            // Jika belum ada ULD, simpan sebagai ULD
            shipment.uld = note
          }
          console.log("[RTFParser] ✅ ULD note detected (non-XX):", note.substring(0, 100))
        } else if (awbBuffer.length > 0) {
          // Assign ke shipment terakhir di buffer
          const lastShipment = awbBuffer[awbBuffer.length - 1] as Partial<Shipment>
          if (lastShipment) {
            if (lastShipment.uld && lastShipment.uld.trim()) {
              lastShipment.uld = `${lastShipment.uld} --- ${note}`
            } else {
              lastShipment.uld = note
            }
            console.log("[RTFParser] ✅ ULD note detected (non-XX) for buffered shipment:", note.substring(0, 100))
          }
        }
      }
    }
  }

  // Flush any remaining items
  if (awbBuffer.length > 0) {
    console.log(`[RTFParser] Flushing ${awbBuffer.length} items from buffer at end of parsing`)
    awbBuffer.forEach((shipment) => {
      const s = shipment as Partial<Shipment> & { sector?: string }
      // Ensure sector is set
      if (!s.sector) {
        s.sector = currentSector
      }
      // If no ULD assigned, use empty string
      if (!s.uld) {
        s.uld = ""
      }
      // Ensure specialNotes is initialized
      if (!s.specialNotes) {
        s.specialNotes = []
      }
    })
    shipments.push(...(awbBuffer as Shipment[]))
    awbBuffer.length = 0
  }
  
  if (currentShipment) {
    const s = currentShipment as Partial<Shipment> & { sector?: string }
    // Ensure sector is set
    if (!s.sector) {
      s.sector = currentSector
    }
    // If no ULD assigned, use empty string
    if (!s.uld) {
      s.uld = ""
    }
    // Ensure specialNotes is initialized
    if (!s.specialNotes) {
      s.specialNotes = []
    }
    shipments.push(currentShipment as Shipment)
  }

  console.log(`[RTFParser] Parsed ${shipments.length} shipments from RTF content`)
  console.log(`[RTFParser] Shipments by sector:`, 
    Array.from(new Map(shipments.map(s => [s.sector || 'UNKNOWN', 0])).keys()).map(sector => {
      const count = shipments.filter(s => (s.sector || 'UNKNOWN') === sector).length
      return { sector, count }
    })
  )
  console.log(`[RTFParser] Ramp transfer shipments:`, shipments.filter(s => s.isRampTransfer).length)
  
  // Log sample shipments for debugging - check ULD and specialNotes
  if (shipments.length > 0) {
    const samplesWithULD = shipments.filter(s => s.uld && s.uld.trim()).slice(0, 3)
    const samplesWithNotes = shipments.filter(s => s.specialNotes && s.specialNotes.length > 0).slice(0, 3)
    
    console.log(`[RTFParser] Sample shipments with ULD (${samplesWithULD.length}):`, 
      samplesWithULD.map(s => ({
        serialNo: s.serialNo,
        awbNo: s.awbNo,
        uld: s.uld,
        sector: s.sector,
      }))
    )
    
    console.log(`[RTFParser] Sample shipments with specialNotes (${samplesWithNotes.length}):`, 
      samplesWithNotes.map(s => ({
        serialNo: s.serialNo,
        awbNo: s.awbNo,
        specialNotes: s.specialNotes,
        uld: s.uld, // Check if ULD is also set
      }))
    )
    
    console.log(`[RTFParser] Sample shipment (first):`, {
      serialNo: shipments[0].serialNo,
      awbNo: shipments[0].awbNo,
      origin: shipments[0].origin,
      destination: shipments[0].destination,
      uld: shipments[0].uld,
      sector: shipments[0].sector,
      isRampTransfer: shipments[0].isRampTransfer,
      specialNotes: shipments[0].specialNotes,
    })
  }
  
  return shipments
}

/**
 * Extract text directly from RTF file without DOCX conversion
 * More aggressive cleaning to remove RTF artifacts
 */
async function extractTextFromRTFDirect(file: File): Promise<string> {
  try {
    // Read RTF file as text
    const rtfText = await file.text()
    
    // Step 1: Remove RTF header and font tables (everything before first \par or actual content)
    // Remove font table definitions
    let text = rtfText
      .replace(/\\fonttbl[^}]*\{[^}]*\}/gi, "")
      .replace(/\\colortbl[^}]*\{[^}]*\}/gi, "")
      .replace(/\\stylesheet[^}]*\{[^}]*\}/gi, "")
      .replace(/\\info[^}]*\{[^}]*\}/gi, "")
      .replace(/\\*\?[^}]*\{[^}]*\}/gi, "") // Remove unknown control groups
    
    // Step 2: Normalize line breaks and tabs
    text = text
      .replace(/\\par[d]?/gi, "\n")
      .replace(/\\line/gi, "\n")
      .replace(/\\tab/gi, " ")
      .replace(/\\;/g, "")
      .replace(/\\\\/g, "\\")

    // Step 3: Decode hex escapes like \'e9 -> é
    text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )

    // Step 4: Remove ALL RTF control words (more aggressive)
    // Remove control words with optional parameters
    // Remove patterns like \*013f, \*f, etc.
    text = text.replace(/\\\*[0-9a-fA-F]*/g, "") // Remove \* followed by hex digits
    text = text.replace(/\\[a-zA-Z]+\d*\s*/g, "")
    text = text.replace(/\\[a-zA-Z]+\-?\d+\s*/g, "")
    
    // Step 5: Remove braces and their content more aggressively
    // Remove nested braces - do multiple passes
    for (let i = 0; i < 10; i++) {
      const before = text.length
      // Remove braces that contain only control codes or are empty
      text = text.replace(/\{[^}]*\}/g, (match) => {
        const content = match.slice(1, -1)
        // If content is mostly control codes or binary, remove it
        if (!content.trim() || 
            /^\\[a-zA-Z]+\d*\s*$/.test(content) ||
            /^[0-9a-f]{20,}$/i.test(content.trim()) ||
            (content.match(/\\[a-zA-Z]+\d*/g)?.length || 0) > content.length / 2) {
          return ""
        }
        // Keep content but remove braces
        return content || ""
      })
      if (text.length === before) break
    }
    
    // Final pass: remove any remaining braces
    text = text.replace(/[{}]/g, "")

    // Step 5: Find the actual load plan content
    // Look for "SER." and "AWB NO" to find where the table starts
    const lines = text.split("\n")
    let startIndex = 0
    let foundTableHeader = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Look for table header - be flexible with spacing
      if ((line.includes("SER") || line.includes("SER.")) && 
          (line.includes("AWB") || line.includes("AWB NO") || line.includes("AWBNO"))) {
        startIndex = Math.max(0, i - 100) // Include some context before header
        foundTableHeader = true
        console.log(`[RTFParser] Found table header at line ${i}, starting extraction from line ${startIndex}`)
        break
      }
    }
    
    // If header found, only process from that point
    if (foundTableHeader) {
      text = lines.slice(startIndex).join("\n")
      console.log(`[RTFParser] Extracted ${text.length} chars from table header onwards`)
    } else {
      console.warn('[RTFParser] Table header not found, processing entire file')
    }
    
    // Step 6: Remove remaining RTF artifacts more aggressively
    // Remove patterns like \*013f, \*f, LayoutInCell, rotation, cropFrom, etc.
    // Do multiple passes to catch all variations
    for (let pass = 0; pass < 3; pass++) {
      text = text.replace(/\\\*[0-9a-fA-F]*/g, "") // Remove \* followed by hex
      text = text.replace(/\\\*[a-zA-Z]/g, "") // Remove \* followed by letter
      text = text.replace(/LayoutInCell\d+/g, "")
      text = text.replace(/rotation\d+/g, "")
      text = text.replace(/cropFrom[A-Z]+\d+/g, "")
      text = text.replace(/wzDescription/g, "")
      text = text.replace(/\bimage\b/g, "") // Only whole word "image"
      text = text.replace(/dxWrapDist[A-Z]+\d+/g, "")
      text = text.replace(/dyWrapDist[A-Z]+\d+/g, "")
      text = text.replace(/posrel[hv]\d+/g, "")
      text = text.replace(/fAllowOverlap\d+/g, "")
      text = text.replace(/shapeType\d+/g, "")
      text = text.replace(/pibName[A-Za-z0-9_]*/g, "")
      text = text.replace(/pibFlags\d+/g, "")
      text = text.replace(/pib\\\*[0-9a-fA-F]*/g, "") // Remove pib\*hex patterns
      text = text.replace(/Normal;heading\s+\d+;/g, "") // Remove RTF style definitions at end
    }
    
    // Remove binary/hex data patterns (long sequences of hex)
    text = text.replace(/[0-9a-fA-F]{50,}/g, (match) => {
      // If it's mostly hex and very long, it's likely binary data
      if (match.length > 100) return ""
      return match
    })
    
    // Step 7: Clean up lines - remove RTF artifacts and reconstruct broken lines
    // First, remove newlines that are in the middle of words/numbers
    // Pattern: letter/number followed by newline followed by letter/number (should be joined)
    // Also handle cases like "EK\n0903" -> "EK0903" or "EK 0903"
    text = text.replace(/([A-Za-z0-9])\n\s*([A-Za-z0-9])/g, '$1 $2')
    text = text.replace(/([A-Za-z0-9])\n\s*\n\s*([A-Za-z0-9])/g, '$1 $2')
    // Handle specific patterns like "EK\n0903" or "001\n176"
    text = text.replace(/([A-Z]{2})\n\s*(\d{4})/g, '$1$2') // EK\n0903 -> EK0903
    text = text.replace(/(\d{3})\n\s*(\d{3}-\d{8})/g, '$1 $2') // 001\n176-92204630 -> 001 176-92204630
    
    const textLines = text.split("\n")
    const cleanedLines: string[] = []
    let currentLine = ""
    
    for (let i = 0; i < textLines.length; i++) {
      let line = textLines[i].trim()
      
      // Skip empty lines
      if (!line) {
        if (currentLine) {
          cleanedLines.push(currentLine)
          currentLine = ""
        }
        continue
      }
      
      // Skip RTF style definitions and font names
      if (line.match(/^(List\s+Table|Colorful|Light|Medium|Dark|Subtle|Intense|Book|Bibliography|TOC|Times\s+New\s+Roman|Arial|Calibri|Courier|Normal|heading\s+\d+)/i)) {
        continue
      }
      
      // Skip binary/hex data
      if (line.match(/^[0f\s]{50,}$/i)) continue
      if (line.match(/^[0-9a-f]{100,}$/i)) continue
      
      // Skip lines that are mostly RTF control codes
      if ((line.match(/\\[a-zA-Z]+\d*/g) || []).length > 3) continue
      
      // Remove any remaining RTF artifacts
      line = line.replace(/\\\*[0-9a-fA-F]*/g, "") // Remove \*hex patterns
      line = line.replace(/\\[a-zA-Z]+\d*/g, "")
      line = line.replace(/[{}]/g, "")
      
      // IMPORTANT: Split multiple shipments that are joined in one line
      // Pattern: shipment ends with "N " or "Y " followed by another shipment starting with 3 digits
      // Example: "001 ... N 002 ..." should be split into two lines
      // Also handle cases like "038 ... N XXBULKXX **** MAIL**** 039 ..."
      const shipmentSplitPattern = /(\d{3}\s+\d{3}-\d{8}[\s\S]*?)\s+([YN])\s+(?=\d{3}\s+\d{3}-\d{8})/g
      if (shipmentSplitPattern.test(line)) {
        // Split the line into multiple shipments
        // Find all shipment starts
        const shipmentStarts: number[] = []
        let match
        const regex = /\d{3}\s+\d{3}-\d{8}/g
        while ((match = regex.exec(line)) !== null) {
          shipmentStarts.push(match.index)
        }
        
        if (shipmentStarts.length > 1) {
          // Multiple shipments in one line - split them
          for (let j = 0; j < shipmentStarts.length; j++) {
            const start = shipmentStarts[j]
            const end = j < shipmentStarts.length - 1 ? shipmentStarts[j + 1] : line.length
            const shipmentLine = line.substring(start, end).trim()
            
            if (shipmentLine && /^\d{3}\s+\d{3}-\d{8}/.test(shipmentLine)) {
              // Save previous line if it's a shipment
              if (currentLine && /^\d{3}\s+\d{3}-\d{8}/.test(currentLine)) {
                cleanedLines.push(currentLine)
              } else if (currentLine && !/^\d{3}\s+\d{3}-\d{8}/.test(currentLine)) {
                cleanedLines.push(currentLine)
              }
              currentLine = shipmentLine
            }
          }
          continue
        }
      }
      
      // Check if this line should be joined with previous line
      // Rules for joining:
      // 1. If current line starts with shipment pattern (3 digits + AWB), it's a new shipment
      // 2. If current line doesn't start with 3 digits and previous line doesn't end with complete pattern, join
      // 3. If line is very short (< 20 chars) and doesn't start with digits, likely continuation
      const isNewShipment = /^\d{3}\s+\d{3}-\d{8}/.test(line)
      const isShortLine = line.length < 20 && !/^\d{3}/.test(line)
      const prevLineEndsWithIncomplete = currentLine && !currentLine.match(/\s+[YN]\s*$/) && !currentLine.match(/TOTALS/)
      
      if (isNewShipment) {
        // New shipment line - save previous and start new
        if (currentLine) {
          cleanedLines.push(currentLine)
        }
        currentLine = line
      } else if (currentLine && (isShortLine || prevLineEndsWithIncomplete)) {
        // This looks like continuation - join with space
        currentLine += " " + line
      } else if (currentLine && /^[A-Z]{3}[A-Z]{3}/.test(line) && currentLine.match(/\d{3}-\d{8}$/)) {
        // Previous line ends with AWB, this starts with ORG/DES - continuation
        currentLine += " " + line
      } else {
        // New line - save previous if exists
        if (currentLine) {
          cleanedLines.push(currentLine)
        }
        currentLine = line
      }
    }
    
    // Don't forget last line
    if (currentLine) {
      cleanedLines.push(currentLine)
    }
    
    // Normalize spacing in each line - but preserve multiple spaces for table alignment
    // Also split any remaining multiple shipments in one line
    const finalLines: string[] = []
    for (const line of cleanedLines) {
      // Check if line contains multiple shipments (pattern: ... N 001 ... or ... Y 002 ...)
      const multiShipmentPattern = /(\d{3}\s+\d{3}-\d{8}[\s\S]*?)\s+([YN])\s+(?=\d{3}\s+\d{3}-\d{8})/g
      if (multiShipmentPattern.test(line)) {
        // Split into multiple shipments
        const shipmentStarts: number[] = []
        let match
        const regex = /\d{3}\s+\d{3}-\d{8}/g
        while ((match = regex.exec(line)) !== null) {
          shipmentStarts.push(match.index)
        }
        
        if (shipmentStarts.length > 1) {
          for (let j = 0; j < shipmentStarts.length; j++) {
            const start = shipmentStarts[j]
            const end = j < shipmentStarts.length - 1 ? shipmentStarts[j + 1] : line.length
            let shipmentLine = line.substring(start, end).trim()
            
            // Clean up the shipment line
            if (/^\d{3}\s+\d{3}-\d{8}/.test(shipmentLine)) {
              // Remove any RTF artifacts that might be in the middle
              shipmentLine = shipmentLine.replace(/\\\*[0-9a-fA-F]*/g, "")
              shipmentLine = shipmentLine.replace(/[{}]/g, "")
              // Normalize spacing but preserve structure
              shipmentLine = shipmentLine.replace(/\s{3,}/g, "  ").trim()
              finalLines.push(shipmentLine)
            }
          }
          continue
        }
      }
      
      // Single shipment or non-shipment line
      let processedLine = line
      if (/^\d{3}\s+\d{3}-\d{8}/.test(processedLine)) {
        // Shipment line - normalize but keep structure
        processedLine = processedLine.replace(/\s{3,}/g, "  ").trim()
      } else {
        // Other lines - normalize all spaces
        processedLine = processedLine.replace(/\s+/g, " ").trim()
      }
      finalLines.push(processedLine)
    }
    
    text = finalLines
      .filter(line => line.length > 0 || line === "") // Keep empty lines for structure
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    
    console.log('[RTFParser] Direct RTF extraction, length:', text.length)
    
    // Log sample for debugging
    if (text.length > 0) {
      const sampleStart = text.substring(0, 1000)
      console.log('[RTFParser] First 1000 chars of extracted text:', sampleStart)
      
      // Check if EK pattern exists
      const ekPatterns = text.match(/EK\s*\d{3,4}/gi)
      if (ekPatterns) {
        console.log('[RTFParser] Found EK patterns in extracted text:', ekPatterns.slice(0, 10))
      } else {
        console.warn('[RTFParser] No EK patterns found in extracted text!')
      }
      
      // Check if table header exists
      if (text.includes("SER") && text.includes("AWB")) {
        console.log('[RTFParser] ✅ Table header found in extracted text')
      } else {
        console.warn('[RTFParser] ⚠️ Table header not found in extracted text')
      }
    }
    
    return text
  } catch (error) {
    console.error('[RTFParser] Error extracting RTF text:', error)
    throw new Error('Failed to extract text from RTF file')
  }
}

/**
 * Extract flight number from filename as fallback
 */
function extractFlightNumberFromFilename(filename: string): string {
  // Try patterns like "EK 0001", "EK0001", "EK-0001" in filename
  const patterns = [
    /EK\s*[-]?\s*(\d{4})/i,
    /EK\s*(\d{3,5})/i,
    /EK(\d{4})/i,
  ]
  
  for (const pattern of patterns) {
    const match = filename.match(pattern)
    if (match) {
      const digits = match[1]
      return `EK${digits.padStart(4, '0')}`
    }
  }
  
  return ""
}

/**
 * Extract text from RTF file using rtf-stream-parser
 * This is the preferred method for RTF parsing
 */
async function extractTextWithStreamParser(file: File): Promise<string> {
  console.log('[RTFParser] Using rtf-stream-parser to extract text from:', file.name)
  
  const rtfText = await file.text()
  
  try {
    const RTFStreamParserModule = await import('rtf-stream-parser')
    
    // rtf-stream-parser might export differently - check the actual structure
    let ParserClass: any = null
    
    // Try different ways to access the parser class
    if (RTFStreamParserModule.default) {
      ParserClass = RTFStreamParserModule.default
    } else if ((RTFStreamParserModule as any).RTFStreamParser) {
      ParserClass = (RTFStreamParserModule as any).RTFStreamParser
    } else if (typeof RTFStreamParserModule === 'function') {
      ParserClass = RTFStreamParserModule
    } else {
      // Try to find any export that looks like a class/constructor
      const exports = Object.keys(RTFStreamParserModule)
      for (const key of exports) {
        const exportValue = (RTFStreamParserModule as any)[key]
        if (typeof exportValue === 'function' && exportValue.prototype) {
          ParserClass = exportValue
          break
        }
      }
    }
    
    if (!ParserClass || typeof ParserClass !== 'function') {
      throw new Error('Could not find RTFStreamParser class in rtf-stream-parser module')
    }
    
    return new Promise<string>((resolve, reject) => {
      let textContent = ''
      let parser: any
      let hasResolved = false
      
      // Add timeout to prevent hanging (10 seconds - faster fallback)
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true
          console.warn('[RTFParser] ⚠️ rtf-stream-parser timeout after 10 seconds, rejecting...')
          reject(new Error('rtf-stream-parser timeout - taking too long'))
        }
      }, 10000)
      
      try {
        parser = new ParserClass()
        console.log('[RTFParser] Parser created, setting up event listeners...')
        
        // Set up event listeners
        parser.on('text', (text: string) => {
          if (!hasResolved) {
            textContent += text
            console.log('[RTFParser] Received text chunk, total length:', textContent.length)
          }
        })
        
        parser.on('paragraph', () => {
          if (!hasResolved) {
            textContent += '\n'
          }
        })
        
        parser.on('error', (err: Error) => {
          if (!hasResolved) {
            hasResolved = true
            clearTimeout(timeout)
            console.error('[RTFParser] rtf-stream-parser error:', err)
            reject(err)
          }
        })
        
        parser.on('end', () => {
          if (!hasResolved) {
            hasResolved = true
            clearTimeout(timeout)
            const extractedText = textContent.trim()
            console.log('[RTFParser] ✅ rtf-stream-parser extracted text length:', extractedText.length)
            
            if (extractedText && extractedText.length > 100) {
              // Check for table header
              if (extractedText.includes("SER") && extractedText.includes("AWB")) {
                console.log('[RTFParser] ✅ Table header found in extracted text')
              }
              
              // Check for shipment-like lines
              const shipmentLines = extractedText.split("\n").filter(l => /^\d{3}\s+\d{3}-\d{8}/.test(l.trim())).slice(0, 5)
              if (shipmentLines.length > 0) {
                console.log('[RTFParser] ✅ Found shipment-like lines:', shipmentLines.length)
              }
              
              resolve(extractedText)
            } else {
              reject(new Error('rtf-stream-parser extracted too little text'))
            }
          }
        })
        
        // Also listen for 'finish' event as alternative
        parser.on('finish', () => {
          if (!hasResolved) {
            hasResolved = true
            clearTimeout(timeout)
            const extractedText = textContent.trim()
            console.log('[RTFParser] ✅ rtf-stream-parser finished, extracted text length:', extractedText.length)
            
            if (extractedText && extractedText.length > 100) {
              resolve(extractedText)
            } else {
              reject(new Error('rtf-stream-parser extracted too little text'))
            }
          }
        })
        
        console.log('[RTFParser] Event listeners set up, starting to parse RTF content...')
        
        // Parse the RTF content
        if (parser.write) {
          console.log('[RTFParser] Using parser.write() method')
          parser.write(rtfText)
          if (parser.end) {
            parser.end()
          }
        } else if (parser.parse) {
          console.log('[RTFParser] Using parser.parse() method')
          parser.parse(rtfText)
        } else {
          clearTimeout(timeout)
          throw new Error('rtf-stream-parser API not recognized - no write or parse method')
        }
        
        console.log('[RTFParser] RTF content written to parser, waiting for events...')
      } catch (error) {
        if (!hasResolved) {
          hasResolved = true
          clearTimeout(timeout)
          console.error('[RTFParser] Error initializing rtf-stream-parser:', error)
          reject(error)
        }
      }
    })
  } catch (importError) {
    console.error('[RTFParser] Error importing rtf-stream-parser:', importError)
    throw importError
  }
}


/**
 * Main function to parse RTF file using rtf-stream-parser
 * Extracts text using rtf-stream-parser, then parses using RTF-specific parser
 * NO DOCX conversion - direct RTF processing
 */
export async function parseRTFFileWithStreamParser(file: File): Promise<{ header: LoadPlanHeader; shipments: Shipment[] }> {
  console.log('[RTFParser] Starting RTF file parsing with rtf-stream-parser for:', file.name)
  
  let content: string
  
  try {
    // Try rtf-stream-parser first (preferred method)
    try {
      content = await extractTextWithStreamParser(file)
      console.log('[RTFParser] ✅ Extracted content using rtf-stream-parser, length:', content.length)
    } catch (streamParserError) {
      console.warn('[RTFParser] ⚠️ rtf-stream-parser failed, falling back to direct extraction:', streamParserError)
      // Fallback to direct extraction
      content = await extractTextFromRTFDirect(file)
      console.log('[RTFParser] Fallback extraction length:', content.length)
    }
    
    // Log sample for debugging
    if (content.length > 0) {
      const sample = content.substring(0, 500)
      console.log('[RTFParser] First 500 chars of content:', sample)
    }
  } catch (error) {
    console.error('[RTFParser] All parsing methods failed:', error)
    // Last resort: try direct extraction
    content = await extractTextFromRTFDirect(file)
    console.log('[RTFParser] Using direct extraction as last resort, length:', content.length)
  }
  
  // Log last 500 chars to see if content is complete
  if (content.length > 500) {
    console.log('[RTFParser] Last 500 chars of content:', content.substring(content.length - 500))
  }
  
  // Parse header using RTF-specific parser
  const header = parseRTFHeader(content)
  
  // If flight number not found in content, try to extract from filename
  if (!header.flightNumber) {
    console.warn('[RTFParser] Flight number not found in content, trying filename...')
    const filenameFlight = extractFlightNumberFromFilename(file.name)
    if (filenameFlight) {
      console.log('[RTFParser] Found flight number in filename:', filenameFlight)
      header.flightNumber = filenameFlight
    } else {
      console.error('[RTFParser] Could not find flight number in content or filename')
      throw new Error('Could not parse flight number from RTF file or filename')
    }
  }
  
  console.log('[RTFParser] Parsed header:', {
    flightNumber: header.flightNumber,
    date: header.date,
    aircraftType: header.aircraftType,
    sector: header.sector,
  })
  
  // Parse shipments using RTF-specific parser
  const shipments = parseRTFShipments(content, header)
  console.log('[RTFParser] Total parsed shipments:', shipments.length)
  
  // Validate shipments
  if (shipments.length === 0) {
    console.warn('[RTFParser] No shipments parsed! This might indicate a parsing issue.')
    // Log sample lines that look like shipments
    const lines = content.split('\n')
    const shipmentLikeLines = lines.filter(line => /^\d{3}\s+\d{3}-\d{8}/.test(line.trim())).slice(0, 5)
    if (shipmentLikeLines.length > 0) {
      console.warn('[RTFParser] Found lines that look like shipments but were not parsed:')
      shipmentLikeLines.forEach((line, idx) => {
        console.warn(`[RTFParser]   ${idx + 1}:`, line.substring(0, 100))
      })
    }
  }
  
  return { header, shipments }
}

