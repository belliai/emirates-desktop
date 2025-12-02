import type { LoadPlanHeader, Shipment } from "./types"
import { extractImagesFromDOCX } from "./file-extractors"
import { detectCriticalFromImages } from "./ocr-detector"

export function parseHeader(content: string): LoadPlanHeader {
  const flightMatch = content.match(/EK\s*(\d{4})/i)
  const flightNumber = flightMatch ? `EK${flightMatch[1]}` : ""

  // Parse date - support multiple months, not just Oct
  const dateMatch = content.match(/(\d{1,2})\s*[-]?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s*[-]?\s*(\d{4}))?/i)
  const date = dateMatch ? dateMatch[0] : ""

  const acftTypeMatch = content.match(/ACFT\s+TYPE:\s*(\S+)/i)
  const aircraftType = acftTypeMatch ? acftTypeMatch[1] : ""

  const acftRegMatch = content.match(/ACFT\s+REG:\s*(\S+)/i)
  const aircraftReg = acftRegMatch ? acftRegMatch[1] : ""

  const stdMatch = content.match(/STD:\s*(\d{2}:\d{2})/i)
  const std = stdMatch ? stdMatch[1] : ""

  const sectorMatch = content.match(/SECTOR:\s*([A-Z]{6})/i)
  const sector = sectorMatch ? sectorMatch[1] : ""

  const prepByMatch = content.match(/PREPARED\s+BY:\s*(\S+)/i)
  const preparedBy = prepByMatch ? prepByMatch[1] : ""

  const prepOnMatch = content.match(/PREPARED\s+ON:\s*([\d-]+\s+[\d:]+)/i)
  const preparedOn = prepOnMatch ? prepOnMatch[1] : ""

  // Parse TTL PLN ULD: TTL PLN ULD: 06PMC/07AKE
  // Pattern: TTL PLN ULD: followed by value (can contain /, letters, numbers)
  // Stop at multiple spaces or next field (ULD VERSION or PREPARED ON)
  const ttlPlnUldMatch = content.match(/TTL\s+PLN\s+ULD:\s*([A-Z0-9\/]+)/i)
  const ttlPlnUld = ttlPlnUldMatch ? ttlPlnUldMatch[1].trim() : ""

  // Parse ULD VERSION: ULD VERSION: 06/26 or ULD VERSION: 05PMC/26
  // Pattern: ULD VERSION: followed by value (can contain /, letters, numbers)
  // Stop at multiple spaces or next field (PREPARED ON)
  const uldVersionMatch = content.match(/ULD\s+VERSION:\s*([A-Z0-9\/]+)/i)
  const uldVersion = uldVersionMatch ? uldVersionMatch[1].trim() : ""

  // Parse header warning: Can be various formats like:
  // - "XX NO PART SHIPMENT XX" and "Station requirement" message
  // - "SI: - A/C type, A380- OPS. - PLEASE ENSURE..." etc.
  // Look for the warning text between the table header and first shipment
  // Format should preserve the original structure with line breaks
  let headerWarning = ""
  const lines = content.split("\n")
  let foundTableHeader = false
  let foundSeparator = false
  const warningLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Check if we've found the table header
    if (line.includes("SER.") && line.includes("AWB NO")) {
      foundTableHeader = true
      continue
    }
    
    // Check for separator line after table header
    if (foundTableHeader && !foundSeparator) {
      if (line.match(/^[_\-=]+$/)) {
        foundSeparator = true
        continue
      }
    }
    
    // After table header and separator, look for warning lines until we find the first shipment
    if (foundTableHeader && foundSeparator) {
      // Normalize line for pattern matching (collapse multiple spaces)
      const normalizedLine = line.replace(/\s+/g, " ")
      
      // Stop if we find a shipment line (starts with 3 digits followed by AWB)
      // Check both original and normalized line
      const isShipmentLine = line.match(/^\d{3}\s+\d{3}-\d{8}/) || normalizedLine.match(/^\d{3}\s+\d{3}-\d{8}/)
      if (isShipmentLine) {
        console.log("[v0] ✅ Found first shipment line, stopping warning collection:", line.substring(0, 80))
        break
      }
      
      // Skip empty lines and separator lines
      if (!line || line.match(/^[_\-=\s]+$/)) {
        continue
      }
      
      // Skip ULD lines (XX ... XX)
      if (line.match(/xx\s+.*\s+xx/i) || normalizedLine.match(/xx\s+.*\s+xx/i)) {
        continue
      }
      
      // Skip lines that look like RTF control codes or binary data
      // (e.g., "List Table 4 Accent 5", long sequences of 0s and fs)
      if (line.match(/^List\s+Table/i) || 
          line.match(/^[0f\s]{50,}$/i) || 
          normalizedLine.match(/^List\s+Table/i) ||
          normalizedLine.match(/^[0f\s]{50,}$/i)) {
        continue
      }
      
      // Collect ALL non-empty lines between separator and first shipment as warning
      // This includes various formats like:
      // - "XX NO PART SHIPMENT XX"
      // - "Station requirement" messages
      // - "SI: - A/C type, A380- OPS." etc.
      warningLines.push(line)
    }
  }
  
  // Join with newlines to preserve original format
  if (warningLines.length > 0) {
    headerWarning = warningLines.join("\n").trim()
  }

  // Detect CRITICAL stamp - check if "CRITICAL" text appears anywhere in the content
  // The stamp can appear as:
  // 1. Visual stamp (image) - might not be detected in text extraction
  // 2. Text "CRITICAL" anywhere in document
  // 3. "CRITICAL SECTOR" or similar patterns
  // Search in entire document, not just header area
  const contentUpper = content.toUpperCase()
  const hasCriticalText = /CRITICAL/i.test(content)
  const hasCriticalSector = /CRITICAL\s+SECTOR/i.test(contentUpper)
  const hasCriticalStamp = /CRITICAL\s+STAMP/i.test(contentUpper)
  const isCritical = hasCriticalText || hasCriticalSector || hasCriticalStamp || contentUpper.includes("CRITICAL")
  
  // Log detection for debugging
  if (isCritical) {
    console.log('[Parser] ✅ CRITICAL detected:', {
      hasCriticalText,
      hasCriticalSector,
      hasCriticalStamp,
      sample: content.substring(0, 500).replace(/\n/g, ' ')
    })
  } else {
    // Log first 1000 chars to help debug why CRITICAL wasn't detected
    console.log('[Parser] ⚠️ CRITICAL not detected. First 1000 chars:', content.substring(0, 1000))
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
    isCritical: isCritical === true ? true : undefined, // Explicitly set to true or undefined
  }
}

/**
 * Detect CRITICAL stamp from images in DOCX file using OCR
 * This is called separately after text-based detection fails
 * @param file - DOCX file to check for images
 * @returns Promise<boolean> - true if CRITICAL is detected in images
 */
export async function detectCriticalFromFileImages(file: File): Promise<boolean> {
  const fileName = file.name.toLowerCase()
  console.log('[Parser] detectCriticalFromFileImages called for file:', file.name)
  console.log('[Parser] File name (lowercase):', fileName)
  console.log('[Parser] Ends with .docx?', fileName.endsWith('.docx'))
  console.log('[Parser] Ends with .doc?', fileName.endsWith('.doc'))
  
  // Only check DOCX files for now (RTF image extraction is more complex)
  if (!fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
    console.log('[Parser] ⚠️ File is not DOCX/DOC, skipping OCR detection')
    return false
  }
  
  try {
    console.log('[Parser] ✅ File is DOCX/DOC, extracting images for OCR detection...')
    const images = await extractImagesFromDOCX(file)
    
    if (images.length === 0) {
      console.log('[Parser] No images found in DOCX file')
      return false
    }
    
    console.log(`[Parser] Found ${images.length} image(s), running OCR...`)
    const isCritical = await detectCriticalFromImages(images)
    
    return isCritical
  } catch (error) {
    console.error('[Parser] Error detecting CRITICAL from images:', error)
    return false
  }
}

export function parseShipments(content: string, header: LoadPlanHeader): Shipment[] {
  const shipments: Shipment[] = []
  const lines = content.split("\n")
  let currentShipment: Partial<Shipment> | null = null
  let inShipmentSection = false
  let currentULD = ""
  let isRampTransfer = false
  // Track current sector - starts with header sector, updates when new SECTOR: found
  let currentSector = header.sector || ""
  // Buffer untuk menyimpan AWB rows yang belum memiliki ULD
  const awbBuffer: Partial<Shipment>[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Check for new SECTOR marker - this indicates a new sector section
    // When we find "SECTOR: ...", update current sector
    const sectorMatch = line.match(/^SECTOR:\s*([A-Z]{6})/i)
    if (sectorMatch) {
      currentSector = sectorMatch[1]
      console.log("[v0] ✅ New SECTOR detected:", currentSector)
      // Don't reset buffer here - wait for table header to ensure we don't lose pending shipments
      continue
    }

    if (line.includes("SER.") && line.includes("AWB NO")) {
      inShipmentSection = true
      isRampTransfer = false // Reset ramp transfer flag when new section starts
      // Clear buffer ketika masuk section baru (new table header = new sector section)
      // This means previous sector's shipments should have been processed
      if (awbBuffer.length > 0) {
        console.log("[v0] ⚠️ New table header found with", awbBuffer.length, "items in buffer - flushing buffer for sector:", currentSector)
        awbBuffer.forEach(shipment => {
          const s = shipment as Partial<Shipment> & { sector?: string }
          s.sector = currentSector // Ensure sector is set before flushing
          shipments.push(shipment as Shipment)
        })
        awbBuffer.length = 0
      }
      if (currentShipment) {
        const s = currentShipment as Partial<Shipment> & { sector?: string }
        s.sector = currentSector // Ensure sector is set
        shipments.push(currentShipment as Shipment)
        currentShipment = null
      }
      currentULD = ""
      console.log("[v0] ✅ New shipment table header detected - starting new sector section:", currentSector)
      continue
    }

    // Check for RAMP TRANSFER marker
    // IMPORTANT: Don't reset buffer when RAMP TRANSFER marker appears
    // The buffer should continue to accumulate shipments until ULD is found
    if (line.match(/\*\*\*\*\*\s*RAMP\s+TRANSFER\s*\*\*\*\*\*/i)) {
      isRampTransfer = true
      console.log("[v0] ✅ RAMP TRANSFER marker detected, setting isRampTransfer = true for subsequent shipments (buffer has", awbBuffer.length, "items)")
      continue
    }

    if (line.match(/^TOTALS\s*:/i)) {
      // Flush buffer dan current shipment sebelum keluar dari section
      // But don't set inShipmentSection = false yet - there might be another sector
      awbBuffer.forEach(shipment => {
        const s = shipment as Partial<Shipment> & { sector?: string }
        s.sector = currentSector // Ensure sector is set before flushing
        shipments.push(shipment as Shipment)
      })
      awbBuffer.length = 0
      if (currentShipment) {
        const s = currentShipment as Partial<Shipment> & { sector?: string }
        s.sector = currentSector // Ensure sector is set
        shipments.push(currentShipment as Shipment)
        currentShipment = null
      }
      // Don't set inShipmentSection = false here - there might be another sector
      // Reset ramp transfer flag for next sector
      isRampTransfer = false
      currentULD = ""
      console.log("[v0] ✅ TOTALS found for sector:", currentSector, "- flushed buffer, but keeping inShipmentSection active for potential next sector")
      continue
    }

    if (line.match(/^[_\-=]+$/)) continue
    if (!line) continue

    // Check for ULD section - more flexible pattern matching
    // Format: XX 06AKE XX, XX 02PMC 03AKE XX, XX BULK XX, XX XYP BOX XX, XX TOP UP JNG UNIT XX, etc.
    // Also: XX 01ALF 01AKE XX --- HL ON EK041 (include everything after XX markers)
    // Check if line contains XX/xx markers and ULD content between them
    // More flexible: allow for case variations (XX, xx, Xx) and variable spacing
    const hasULDMarkers = /xx\s+/i.test(line) && /\s+xx/i.test(line)
    if (hasULDMarkers) {
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
        
        console.log("[v0] ✅ ULD section detected:", formattedULD, "- buffer has", awbBuffer.length, "AWB rows")
        
        // Jika ada AWB rows di buffer, assign ULD tersebut ke semua AWB rows di buffer
        // (ULD section yang muncul SETELAH AWB rows menjadi parent dari AWB rows tersebut)
        // Ini adalah kasus yang paling umum: shipment muncul dulu, lalu ULD muncul setelahnya
        if (awbBuffer.length > 0) {
          // Assign ULD ke semua AWB rows di buffer dan push ke shipments
          // Special notes are stored separately in specialNotes array, NOT appended to ULD
          awbBuffer.forEach(shipment => {
            shipment.uld = formattedULD
            shipment.sector = currentSector // Ensure sector is set
            // Keep special notes in specialNotes array - they will be saved to special_notes column
            shipments.push(shipment as Shipment)
          })
          const bufferCount = awbBuffer.length
          const bufferSerials = awbBuffer.map(s => s.serialNo).filter(Boolean).join(", ")
          awbBuffer.length = 0
          console.log("[v0] ✅ ULD section:", formattedULD, "- assigned to", bufferCount, "AWB row(s) in buffer (serials:", bufferSerials + ")")
        } else {
          // Jika buffer kosong, ULD section ini untuk AWB rows yang akan datang
          // (ULD muncul SEBELUM shipment, kasus yang jarang)
          currentULD = formattedULD
          console.log("[v0] ✅ ULD section:", formattedULD, "- will be used for upcoming AWB rows")
        }
        continue
      }
    }

    if (inShipmentSection) {
      // Regex to parse shipment line - SHC can be single code (VUN) or multiple codes (VUN-CRT-EAP)
      // More flexible regex that handles variable spacing and optional fields
      // Pattern: SER AWB ORG/DES PCS WGT VOL LVOL SHC MAN.DESC PCODE PC THC BS PI FLTIN ARRDT.TIME SI
      // PC can be optional (e.g., shipment 010 has "PXS    QRT" without PC)
      // Some shipments may not have FLTIN/ARRDT.TIME (e.g., shipment 002)
      // Try standard format first (with SS and FLTIN, PC optional)
      // Handle cases like shipment 010: "PXS    QRT" (PC is empty, THC is QRT)
      // PC can be optional, and there can be multiple spaces between PCODE and THC
      // Use \s+ to match one or more spaces (more flexible for RTF-extracted text)
      // Normalize line first: collapse multiple spaces to single space for regex matching
      // But preserve spacing in MAN.DESC field which can have multiple words
      const normalizedLine = line.replace(/\s+/g, " ")
      // Updated regex to handle various date/time formats from RTF files:
      // Examples from user's RTF:
      // - "001 ... EK0323 29Feb0454 33:10/ N" (date with embedded time + separate time)
      // - "002 ... EK9918 29Feb0315 25:35/34:50 N" (date with embedded time + multiple times)
      // - "011 ... N" (no FLTIN/ARRDT/TIME)
      // Pattern breakdown:
      // - FLTIN: EK0323 or empty
      // - ARRDT: 29Feb0454 (date + HHMM time embedded) or 29Feb2024 or 29Feb24
      // - TIME: 33:10/ or 25:35/34:50 (time with optional multiple values separated by /)
      // Note: MAN.DESC uses (.+?) which is non-greedy to stop at PCODE
      // THC can be empty (just spaces), so use * instead of + for optional matching
      let shipmentMatch = normalizedLine.match(
        /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z]\d)?\s*([A-Z0-9\s]*?)\s+(SS)\s+([YN])\s+([A-Z]+\d+)?\s*(\d{2}[A-Za-z]{3}\d{2,4}(?:\s+[\d:\/]+)?)?\s*([\d:\/\s]+)?\s*([YN])?$/i,
      )
      
      // If first regex doesn't match, try format without FLTIN/ARRDT.TIME (e.g., shipment 002)
      // Pattern: SER AWB ORG/DES PCS WGT VOL LVOL SHC MAN.DESC PCODE PC THC ... SI
      // Example: 002 176-98208961 DXBMAA 1 10.0 0.1 0.1 VAL GOLD JEWELLERY. VAL P2 NORM NN N N
      if (!shipmentMatch) {
        // Try pattern: SER AWB ORG/DES PCS WGT VOL LVOL SHC MAN.DESC PCODE PC THC ... SI (no SS/BS/PI/FLTIN)
        const altMatch = normalizedLine.match(
          /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z]\d)\s+(.+?)\s+([YN])?$/i,
        )
        if (altMatch) {
          console.log("[v0] Matched with alternative regex (no FLTIN/ARRDT.TIME)")
          // Parse the remaining part after PC to extract THC and other fields
          const rest = altMatch[13] || ""
          // THC can be like "P2 NORM NN" or "P2 QRT" or just empty
          // Try to extract THC (everything until we hit common patterns like NORM, NN, N, etc.)
          const thcParts: string[] = []
          const restWords = rest.split(/\s+/)
          let thcEndIndex = restWords.length
          
          // Look for patterns that indicate end of THC
          for (let i = 0; i < restWords.length; i++) {
            const word = restWords[i]
            // Stop at common patterns that indicate end of THC
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
            altMatch[0], // full match
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
            "SS", // bs (default)
            "N", // pi (default)
            "", // fltIn (empty)
            "", // arrDate (empty)
            "", // arrTime (empty)
            si, // si
          ]
        } else {
          // Try pattern for shipment 010: PC is missing, format is "PXS    QRT  SS N ..."
          // Pattern: SER AWB ORG/DES PCS WGT VOL LVOL SHC MAN.DESC PCODE (no PC) THC SS PI FLTIN ARRDT.TIME SI
          const noPCMatch = normalizedLine.match(
            /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z0-9]+)\s+(SS)\s+([YN])\s+([A-Z]+\d+)?\s*(\d{2}[A-Za-z]{3}\d{4})?\s*([\d:\/]+)?\s*([YN])?/i,
          )
          if (noPCMatch) {
            console.log("[v0] Matched with no-PC regex (e.g., shipment 010)")
            shipmentMatch = [
              noPCMatch[0], // full match
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
          } else {
            // Log lines that look like shipments but don't match
            if (line.match(/^\d{3}\s+\d{3}-\d{8}/)) {
              console.log("[v0] ⚠️ Failed to parse shipment line:", line.substring(0, 150))
            }
          }
        }
      }

      if (shipmentMatch) {
        if (currentShipment) {
          shipments.push(currentShipment as Shipment)
        }

        const [
          _,
          serial,
          awb,
          origin,
          destination,
          pcs,
          wgt,
          vol,
          lvol,
          shc,
          manDesc,
          pcode,
          pc,
          thc,
          bs,
          pi,
          fltIn,
          arrDate,
          arrTime,
          si,
        ] = shipmentMatch

        // Handle case where PC might be missing (e.g., shipment 010: "PXS    QRT")
        // PC can be empty, and THC comes directly after PCODE
        let actualPC = (pc || "").trim()
        let actualTHC = (thc || "").trim()
        
        // If PC is empty but thc starts with pattern that looks like PC (e.g., "P2 QRT"),
        // extract PC from THC
        if (!actualPC && actualTHC) {
          const pcMatch = actualTHC.match(/^([A-Z]\d)\s+(.+)$/)
          if (pcMatch) {
            actualPC = pcMatch[1]
            actualTHC = pcMatch[2]
          }
        }
        
        // Log for debugging shipment 010
        if (serial === "010") {
          console.log("[v0] 🔍 Parsing shipment 010:", {
            pcode,
            pc: pc,
            thc: thc,
            actualPC,
            actualTHC,
            fullLine: line.substring(0, 150)
          })
        }

        const trimmedSHC = shc ? shc.trim() : ""
        
        // Log VUN shipments specifically for debugging
        if (trimmedSHC && trimmedSHC.includes("VUN")) {
          console.log("[v0] ✅ VUN shipment detected during parsing:", {
            serialNo: serial,
            awbNo: awb,
            shc: trimmedSHC,
            shcRaw: shc,
            origin,
            destination,
          })
        }
        
        // Log QRT shipments specifically for debugging (THC contains QRT)
        const trimmedTHC = thc ? thc.trim() : ""
        if (trimmedTHC && trimmedTHC.includes("QRT")) {
          console.log("[v0] ✅ QRT shipment detected during parsing:", {
            serialNo: serial,
            awbNo: awb,
            thc: trimmedTHC,
            thcRaw: thc,
            shc: trimmedSHC,
            origin,
            destination,
          })
        }

        currentShipment = {
          serialNo: serial,
          awbNo: awb.replace(/\s+/g, ""), // Remove whitespace from AWB number
          origin: origin,
          destination: destination,
          pieces: Number.parseInt(pcs),
          weight: Number.parseFloat(wgt),
          volume: Number.parseFloat(vol),
          lvol: Number.parseFloat(lvol),
          shc: trimmedSHC,
          manDesc: manDesc.trim(),
          pcode: pcode || "",
          pc: actualPC,
          thc: actualTHC.trim(),
          bs: bs,
          pi: pi,
          fltIn: fltIn || "",
          arrDtTime: `${arrDate || ""} ${arrTime || ""}`.trim(),
          qnnAqnn: "",
          whs: "",
          si: si || "N",
          uld: currentULD || "", // Assign currentULD jika ada, jika tidak akan di-assign nanti
          specialNotes: [],
          isRampTransfer: isRampTransfer,
          sector: currentSector, // Store current sector for this shipment
        }
        
        // Jika currentULD sudah di-set (ULD muncul SEBELUM AWB row), 
        // assign ke AWB row pertama dan clear currentULD
        if (currentULD) {
          // ULD muncul sebelum AWB row, assign ke AWB row pertama
          // Special notes are stored separately in specialNotes array, NOT appended to ULD
          const shipment = currentShipment as Partial<Shipment> & { specialNotes?: string[] }
          shipment.uld = currentULD
          // Keep special notes in specialNotes array - they will be saved to special_notes column
          shipments.push(currentShipment as Shipment)
          currentULD = "" // Clear untuk AWB rows berikutnya
          currentShipment = null
        } else {
          // Simpan di buffer, akan di-assign ULD nanti ketika menemukan ULD section
          // ULD section yang muncul SETELAH AWB row akan di-assign ke AWB row tersebut
          awbBuffer.push(currentShipment)
          currentShipment = null
        }
        
        // Log ramp transfer shipments for debugging
        if (isRampTransfer) {
          console.log("[v0] ✅ Ramp transfer shipment detected:", {
            serialNo: serial,
            awbNo: awb,
            origin,
            destination,
            isRampTransfer: true,
          })
        }
      } else if ((line.startsWith("[") || line.startsWith("**["))) {
        // Special notes HANYA untuk yang ada bracket "[ ]"
        // Contoh: "[Must be load in Fire containment equipment]"
        // Simpan dengan bracket "[ ]" tetap ada
        const note = line.replace(/\*\*/g, "").trim()
        if (currentShipment) {
          const shipment = currentShipment as Partial<Shipment> & { specialNotes?: string[] }
          if (!shipment.specialNotes) {
            shipment.specialNotes = []
          }
          shipment.specialNotes.push(note)
        } else if (awbBuffer.length > 0) {
          // Assign ke shipment terakhir di buffer
          const lastShipment = awbBuffer[awbBuffer.length - 1]
          if (lastShipment) {
            if (!lastShipment.specialNotes) {
              lastShipment.specialNotes = []
            }
            lastShipment.specialNotes.push(note)
          }
        }
      } else if (inShipmentSection && line.length > 0 && !line.match(/^\d{3}/) && !line.match(/^xx\s+/i) && !line.match(/^SECTOR:/i) && !line.match(/^TOTALS:/i) && !line.match(/^BAGG|COUR/i) && !line.match(/^RAMP|MAIL/i) && !line.match(/^GO SHOW/i)) {
        // Baris seperti "SHPT RELOC X EK0005 , 29FEB DUE LATE BREAKDOWN --- SAME PLND ON EK041 AS HL"
        // Harus masuk ke ULD, bukan specialNotes
        // Kondisi: 
        // - Di dalam shipment section
        // - Tidak kosong
        // - Tidak dimulai dengan 3 digit (bukan shipment line)
        // - Tidak dimulai dengan XX (bukan ULD marker)
        // - Tidak dimulai dengan SECTOR, TOTALS, BAGG, COUR, RAMP, MAIL, GO SHOW (bukan section marker)
        const note = line.trim()
        if (note.length > 0) {
          // Append ke ULD shipment terakhir (currentShipment atau terakhir di buffer)
          if (currentShipment) {
            // Jika currentShipment sudah punya ULD, append dengan separator
            if (currentShipment.uld && currentShipment.uld.trim()) {
              currentShipment.uld = `${currentShipment.uld} --- ${note}`
            } else {
              // Jika belum ada ULD, simpan sebagai ULD
              currentShipment.uld = note
            }
            console.log("[v0] ✅ ULD note detected (non-XX):", note.substring(0, 100))
          } else if (awbBuffer.length > 0) {
            // Assign ke shipment terakhir di buffer
            const lastShipment = awbBuffer[awbBuffer.length - 1]
            if (lastShipment) {
              if (lastShipment.uld && lastShipment.uld.trim()) {
                lastShipment.uld = `${lastShipment.uld} --- ${note}`
              } else {
                lastShipment.uld = note
              }
              console.log("[v0] ✅ ULD note detected (non-XX) for buffered shipment:", note.substring(0, 100))
            }
          }
        }
      }
    }
  }

  // Flush buffer dan current shipment di akhir
  // AWB rows yang masih di buffer tanpa ULD akan di-push tanpa ULD
  awbBuffer.forEach(shipment => {
    const s = shipment as Partial<Shipment> & { sector?: string }
    s.sector = currentSector // Ensure sector is set before flushing
    shipments.push(shipment as Shipment)
  })
  awbBuffer.length = 0
  
  if (currentShipment) {
    const s = currentShipment as Partial<Shipment> & { sector?: string }
    s.sector = currentSector // Ensure sector is set
    shipments.push(currentShipment as Shipment)
  }

  console.log("[v0] Parsed shipments:", shipments.length)
  if (shipments.length > 0) {
    console.log("[v0] Sample shipment:", shipments[0])
    // Log beberapa shipments dengan ULD untuk debugging
    const shipmentsWithULD = shipments.filter(s => s.uld && s.uld.trim() !== "")
    const shipmentsWithBULK = shipments.filter(s => s.uld && s.uld.includes("BULK"))
    const rampTransferShipments = shipments.filter(s => s.isRampTransfer)
    console.log("[v0] Shipments with ULD:", shipmentsWithULD.length, "out of", shipments.length)
    console.log("[v0] Shipments with BULK:", shipmentsWithBULK.length)
    console.log("[v0] Ramp transfer shipments:", rampTransferShipments.length)
    
    // Log ramp transfer shipments with their ULDs
    if (rampTransferShipments.length > 0) {
      console.log("[v0] Ramp transfer shipments with ULDs:", rampTransferShipments.map(s => ({
        serialNo: s.serialNo,
        awbNo: s.awbNo,
        uld: s.uld || "(no ULD)",
        isRampTransfer: s.isRampTransfer
      })))
    }
    
    if (shipmentsWithBULK.length > 0) {
      console.log("[v0] Shipments with BULK ULD:", shipmentsWithBULK.map(s => ({
        serialNo: s.serialNo,
        awbNo: s.awbNo,
        uld: s.uld,
        isRampTransfer: s.isRampTransfer
      })))
    }
    if (shipmentsWithULD.length > 0) {
      console.log("[v0] Sample shipments with ULD:", shipmentsWithULD.slice(0, 10).map(s => ({
        serialNo: s.serialNo,
        awbNo: s.awbNo,
        uld: s.uld,
        isRampTransfer: s.isRampTransfer
      })))
    }
  }

  return shipments
}

export function formatDateForReport(date: string): string {
  const match = date.match(/(\d{1,2})\s*[-]?\s*([A-Za-z]{3})(?:\s*[-]?\s*(\d{4}))?/i)
  if (!match) return date
  const day = match[1].padStart(2, "0")
  const month = match[2]
  const year = match[3] || new Date().getFullYear().toString()
  return `${day}-${month}-${year}`
}
