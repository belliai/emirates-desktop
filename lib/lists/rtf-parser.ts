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

  const acftTypeMatch = processedContent.match(/ACFT\s+TYPE:\s*(\S+)/i)
  const aircraftType = acftTypeMatch ? acftTypeMatch[1] : ""

  const acftRegMatch = processedContent.match(/ACFT\s+REG:\s*(\S+)/i)
  const aircraftReg = acftRegMatch ? acftRegMatch[1] : ""

  const stdMatch = processedContent.match(/STD:\s*(\d{2}:\d{2})/i)
  const std = stdMatch ? stdMatch[1] : ""

  const sectorMatch = processedContent.match(/SECTOR:\s*([A-Z]{6})/i)
  const sector = sectorMatch ? sectorMatch[1] : ""

  const prepByMatch = processedContent.match(/PREPARED\s+BY:\s*(\S+)/i)
  const preparedBy = prepByMatch ? prepByMatch[1] : ""

  const prepOnMatch = processedContent.match(/PREPARED\s+ON:\s*([\d-]+\s+[\d:]+)/i)
  const preparedOn = prepOnMatch ? prepOnMatch[1] : ""

  // Parse TTL PLN ULD
  const ttlPlnUldMatch = processedContent.match(/TTL\s+PLN\s+ULD:\s*([A-Z0-9\/]+)/i)
  const ttlPlnUld = ttlPlnUldMatch ? ttlPlnUldMatch[1].trim() : ""

  // Parse ULD VERSION
  const uldVersionMatch = processedContent.match(/ULD\s+VERSION:\s*([A-Z0-9\/]+)/i)
  const uldVersion = uldVersionMatch ? uldVersionMatch[1].trim() : ""

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
    // Use same pattern as regular parser but with normalization for RTF
    const normalizedLine = line.replace(/\s+/g, " ")
    
    // First, try to match minimal format (just SER and AWB) - RTF might have incomplete lines
    const minimalMatch = normalizedLine.match(/^(\d{3})\s+(\d{3}-\d{8})(?:\s+(.{6}))?/i)
    if (minimalMatch && !shipmentMatch) {
      // This looks like a shipment but is incomplete - log it for debugging
      console.warn(`[RTFParser] ⚠️ Found minimal shipment line at line ${i}:`, line.substring(0, 150))
    }
    
    let shipmentMatch = normalizedLine.match(
      /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z]\d)?\s+([A-Z0-9\s]+?)\s+(SS)\s+([YN])\s+([A-Z]+\d+)?\s*(\d{2}[A-Za-z]{3}\d{4})?\s*([\d:\/]+)?\s*([YN])?/i,
    )
    
    // If first regex doesn't match, try format without FLTIN/ARRDT.TIME
    if (!shipmentMatch) {
      const altMatch = normalizedLine.match(
        /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z]\d)\s+(.+?)\s+([YN])?$/i,
      )
      if (altMatch) {
        const rest = altMatch[13] || ""
        const thcParts: string[] = []
        const restWords = rest.split(/\s+/)
        let thcEndIndex = restWords.length
        
        for (let i = 0; i < restWords.length; i++) {
          const word = restWords[i]
          if (word === "NORM" || word === "NN" || word === "N" || word === "Y" || 
              word.match(/^[YN]$/) || word === "SS" || word === "BS" || word === "PI") {
            thcEndIndex = i
            break
          }
          thcParts.push(word)
        }
        
        const thc = thcParts.join(" ").trim()
        const si = restWords[restWords.length - 1] || "N"
        
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
          altMatch[12], // pc
          thc, // thc
          "SS", // bs
          "N", // pi
          "", // fltIn
          "", // arrDate
          "", // arrTime
          si, // si
        ]
      } else {
        // Try pattern for shipment without PC
        const noPCMatch = normalizedLine.match(
          /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z0-9]+)\s+(SS)\s+([YN])\s+([A-Z]+\d+)?\s*(\d{2}[A-Za-z]{3}\d{4})?\s*([\d:\/]+)?\s*([YN])?/i,
        )
        if (noPCMatch) {
          shipmentMatch = [
            noPCMatch[0],
            noPCMatch[1], // serial
            noPCMatch[2], // awb
            noPCMatch[3], // origin
            noPCMatch[4], // destination
            noPCMatch[5], // pcs
            noPCMatch[6], // wgt
            noPCMatch[7], // vol
            noPCMatch[8], // lvol
            noPCMatch[9], // shc
            noPCMatch[10], // manDesc
            noPCMatch[11], // pcode
            "", // pc (empty)
            noPCMatch[12], // thc
            noPCMatch[13], // bs
            noPCMatch[14], // pi
            noPCMatch[15] || "", // fltIn
            noPCMatch[16] || "", // arrDate
            noPCMatch[17] || "", // arrTime
            noPCMatch[18] || "N", // si
          ]
        }
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

    // Check for ULD section - same pattern as regular parser
    // Format: XX 06AKE XX, XX 02PMC 03AKE XX, XX BULK XX, or xx 01PMC xx (case insensitive)
    const hasULDMarkers = /xx\s+/i.test(line) && /\s+xx/i.test(line)
    if (hasULDMarkers && inShipmentSection) {
      let uldContent: string | null = null
      
      // Try BULK first (no numbers)
      const bulkMatch = line.match(/xx\s+(bulk)\s+xx/i)
      if (bulkMatch) {
        uldContent = bulkMatch[1].toUpperCase()
      } else {
        // Try numbered ULD pattern: digits + type codes
        const numberedMatch = line.match(/xx\s+(\d+(?:pmc|ake|pag|amp)(?:\s+\d+(?:pmc|ake|pag|amp))*)\s+xx/i)
        if (numberedMatch) {
          // Normalize to uppercase for consistency
          uldContent = numberedMatch[1].toUpperCase().replace(/\s+/g, " ")
        }
      }
      
      if (uldContent) {
        // Format ULD untuk disimpan: "XX 06AKE XX" or "XX BULK XX"
        const formattedULD = `XX ${uldContent} XX`
        
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
  }

  // Flush any remaining items
  if (awbBuffer.length > 0) {
    console.log(`[RTFParser] Flushing ${awbBuffer.length} items from buffer at end of parsing`)
    awbBuffer.forEach((shipment) => {
      const s = shipment as Partial<Shipment> & { sector?: string }
      s.sector = currentSector
      // If no ULD assigned, use empty string
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
  }

  console.log(`[RTFParser] Parsed ${shipments.length} shipments from RTF content`)
  console.log(`[RTFParser] Shipments by sector:`, 
    Array.from(new Map(shipments.map(s => [s.sector || 'UNKNOWN', 0])).keys()).map(sector => {
      const count = shipments.filter(s => (s.sector || 'UNKNOWN') === sector).length
      return { sector, count }
    })
  )
  console.log(`[RTFParser] Ramp transfer shipments:`, shipments.filter(s => s.isRampTransfer).length)
  
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
    
    // Step 1: Basic RTF control word removal
    let text = rtfText
      .replace(/\\par[d]?/gi, "\n")
      .replace(/\\line/gi, "\n")
      .replace(/\\tab/gi, "\t")
      .replace(/\\;/g, ";")
      .replace(/\\\\/g, "\\")

    // Step 2: Decode hex escapes like \'e9 -> é
    text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )

    // Step 3: Remove RTF control words more aggressively
    text = text.replace(/\\[a-zA-Z]+-?\d*(?:\s|)/g, "")
    
    // Step 4: Remove braces and their content (RTF groups)
    // First pass: remove empty braces
    text = text.replace(/\{[^}]*\}/g, (match) => {
      const content = match.slice(1, -1)
      if (!content.trim() || /^\\[a-zA-Z]+\d*\s*$/.test(content)) {
        return ""
      }
      // If content looks like binary/hex data, remove it
      if (/^[0-9a-f]{50,}$/i.test(content.trim())) {
        return ""
      }
      return match
    })
    
    // Second pass: remove remaining braces but keep content
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
    
    // Step 6: Clean up lines - remove RTF artifacts
    const textLines = text.split("\n")
    const cleanedLines: string[] = []
    
    for (let i = 0; i < textLines.length; i++) {
      let line = textLines[i].trim()
      
      // Skip empty lines (but keep structure)
      if (!line) {
        cleanedLines.push("")
        continue
      }
      
      // Skip RTF style definitions
      if (line.match(/^List\s+Table\s+\d+/i)) continue
      if (line.match(/^Colorful|^Light|^Medium|^Dark|^Subtle|^Intense|^Book|^Bibliography|^TOC/i)) continue
      if (line.match(/^Times\s+New\s+Roman|^Arial|^Calibri|^Courier/i)) continue
      if (line.match(/^Normal|^heading\s+\d+/i)) continue
      
      // Skip binary/hex data
      if (line.match(/^[0f\s]{50,}$/i)) continue
      if (line.match(/^[0-9a-f]{100,}$/i)) continue
      
      // Skip lines with too many RTF control codes
      if ((line.match(/\\[a-zA-Z]+\d*/g) || []).length > 5) continue
      
      // Skip lines that are mostly special characters
      if ((line.match(/[{}]/g) || []).length > 10) continue
      
      // Normalize spacing
      line = line.replace(/\s+/g, " ")
      
      cleanedLines.push(line)
    }
    
    text = cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
    
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
 * Main function to parse RTF file
 * Extracts text directly from RTF without DOCX conversion, then parses using RTF-specific parser
 */
export async function parseRTFFile(file: File): Promise<{ header: LoadPlanHeader; shipments: Shipment[] }> {
  console.log('[RTFParser] Starting RTF file parsing for:', file.name)
  
  // Extract text directly from RTF file (no DOCX conversion needed)
  const content = await extractTextFromRTFDirect(file)
  console.log('[RTFParser] Extracted content length:', content.length)
  
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

