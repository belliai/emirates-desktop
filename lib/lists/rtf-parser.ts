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
    isCritical: isCritical || undefined,
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
    
    // Try full match first - use \s+ for flexible spacing
    let shipmentMatch = normalizedLine.match(
      /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z]\d)?\s+([A-Z0-9\s]+?)\s+(SS)\s+([YN])\s+([A-Z]+\d+)?\s*(\d{2}[A-Za-z]{3}\d{2,4}(?:\s+[\d:\/]+)?)?\s*([\d:\/\s]+)?\s*([YN])?$/i,
    )
    
    // First, try to match minimal format (just SER and AWB) - RTF might have incomplete lines
    if (!shipmentMatch) {
      const minimalMatch = normalizedLine.match(/^(\d{3})\s+(\d{3}-\d{8})(?:\s+(.{6}))?/i)
      if (minimalMatch) {
        // This looks like a shipment but is incomplete - log it for debugging
        console.warn(`[RTFParser] ⚠️ Found minimal shipment line at line ${i}:`, line.substring(0, 150))
        console.warn(`[RTFParser] Normalized line:`, normalizedLine.substring(0, 150))
      }
    }
    
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
    if (inShipmentSection && (line.startsWith("[") || line.startsWith("**["))) {
      const note = line.replace(/\*\*/g, "").trim()
      if (note.length > 0) {
        if (currentShipment) {
          const shipment = currentShipment as Partial<Shipment> & { specialNotes?: string[] }
          if (!shipment.specialNotes) {
            shipment.specialNotes = []
          }
          shipment.specialNotes.push(note)
        } else if (awbBuffer.length > 0) {
          const lastShipment = awbBuffer[awbBuffer.length - 1]
          if (lastShipment) {
            if (!lastShipment.specialNotes) {
              lastShipment.specialNotes = []
            }
            lastShipment.specialNotes.push(note)
          }
        }
      }
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
    
    // Step 6: Clean up lines - remove RTF artifacts and reconstruct broken lines
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
      line = line.replace(/\\[a-zA-Z]+\d*/g, "")
      line = line.replace(/[{}]/g, "")
      
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
    text = cleanedLines
      .map(line => {
        // For shipment lines, preserve spacing more carefully
        if (/^\d{3}\s+\d{3}-\d{8}/.test(line)) {
          // Shipment line - normalize but keep structure
          return line.replace(/\s{3,}/g, "  ").trim()
        } else {
          // Other lines - normalize all spaces
          return line.replace(/\s+/g, " ").trim()
        }
      })
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
    // It might be a named export or have a different structure
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
      
      try {
        parser = new ParserClass()
        
        // Set up event listeners
      parser.on('text', (text: string) => {
        textContent += text
      })
      
      parser.on('paragraph', () => {
        textContent += '\n'
      })
      
      parser.on('error', (err: Error) => {
        console.error('[RTFParser] rtf-stream-parser error:', err)
        reject(err)
      })
      
      parser.on('end', () => {
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
      })
      
      // Parse the RTF content
      if (parser.write) {
        parser.write(rtfText)
        parser.end()
      } else if (parser.parse) {
        parser.parse(rtfText)
      } else {
        throw new Error('rtf-stream-parser API not recognized - no write or parse method')
      }
      } catch (error) {
        console.error('[RTFParser] Error initializing rtf-stream-parser:', error)
        reject(error)
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
    // Extract text using rtf-stream-parser
    content = await extractTextWithStreamParser(file)
    console.log('[RTFParser] ✅ Extracted content length:', content.length)
    
    // Log sample for debugging
    if (content.length > 0) {
      const sample = content.substring(0, 500)
      console.log('[RTFParser] First 500 chars of content:', sample)
    }
  } catch (streamParserError) {
    console.warn('[RTFParser] ⚠️ rtf-stream-parser failed, falling back to direct extraction:', streamParserError)
    // Fallback to direct extraction
    content = await extractTextFromRTFDirect(file)
    console.log('[RTFParser] Fallback extraction length:', content.length)
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

