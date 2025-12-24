import type { LoadPlanHeader, Shipment } from "./types"
import { extractImagesFromDOCX } from "./file-extractors"
import { detectCriticalFromImages } from "./ocr-detector"

export function parseHeader(content: string, fileName?: string): LoadPlanHeader {
  // Detect "cor" or "corr" in header or filename - indicates revised/correction load plan (not additional)
  // Check first 20 lines for patterns like "COR", "CORR", "CORRECT VERSION", "CORRECTION", etc.
  const firstLines = content.split("\n").slice(0, 20).join("\n").toLowerCase()
  // Match "cor" or "corr" as standalone or part of words (e.g., CORRECT, CORRECTION, COR, CORR)
  const hasCorInHeader = /\bcorr?\b|corr?ect/i.test(firstLines)
  // Also check filename for "cor" or "corr" patterns
  const fileNameLower = (fileName || "").toLowerCase()
  const hasCorInFilename = /\bcorr?\b|corr?ect|[-_\s]cor[-_\s]|[-_\s]corr[-_\s]/i.test(fileNameLower)
  const isCorrectVersion = hasCorInHeader || hasCorInFilename
  
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
  console.log("total Lines:", lines.length)
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
    isCorrectVersion: isCorrectVersion === true ? true : undefined, // true if "cor"/"corr" found in header or filename (revised mode)
  }
}

/**
 * ULD type aliases - some types are equivalent
 * QKE = AKE (same container type, different naming convention)
 */
const ULD_TYPE_ALIASES: Record<string, string> = {
  'QKE': 'AKE',
}

/**
 * Normalize ULD type using aliases
 */
function normalizeUldType(type: string): string {
  const upperType = type.toUpperCase()
  return ULD_TYPE_ALIASES[upperType] || upperType
}

/**
 * Parse ULD allocation string (e.g., "02QKE", "3PMC 2QKE", "05PMC/01PLA/07AKE")
 * Returns a map of normalized ULD type to count
 */
export function parseUldAllocation(allocation: string): Map<string, number> {
  const result = new Map<string, number>()
  if (!allocation) return result
  
  // Match patterns like "02QKE", "3PMC", "07AKE", etc.
  // Pattern: optional digits followed by ULD type
  const pattern = /(\d+)?(PMC|AKE|QKE|AKL|AMF|ALF|PLA|PAG|AMP|RKE|BULK)/gi
  const matches = allocation.matchAll(pattern)
  
  for (const match of matches) {
    const count = match[1] ? parseInt(match[1], 10) : 1
    const type = normalizeUldType(match[2])
    result.set(type, (result.get(type) || 0) + count)
  }
  
  return result
}

/**
 * Convert ULD allocation map to string format (e.g., "02PMC/04AKE")
 */
export function formatUldAllocation(allocation: Map<string, number>): string {
  if (allocation.size === 0) return ""
  
  const parts: string[] = []
  // Sort by type for consistent output
  const sortedTypes = Array.from(allocation.keys()).sort()
  
  for (const type of sortedTypes) {
    const count = allocation.get(type) || 0
    if (count > 0) {
      parts.push(`${String(count).padStart(2, '0')}${type}`)
    }
  }
  
  return parts.join('/')
}

/**
 * Subtract one ULD allocation from another
 * Returns the difference (original - subtract), with no negative values
 */
export function subtractUldAllocation(
  original: Map<string, number>,
  subtract: Map<string, number>
): Map<string, number> {
  const result = new Map<string, number>()
  
  // Copy original values
  original.forEach((count, type) => {
    result.set(type, count)
  })
  
  // Subtract
  subtract.forEach((count, type) => {
    const normalizedType = normalizeUldType(type)
    const currentCount = result.get(normalizedType) || 0
    const newCount = Math.max(0, currentCount - count)
    if (newCount > 0) {
      result.set(normalizedType, newCount)
    } else {
      result.delete(normalizedType)
    }
  })
  
  return result
}

/**
 * Parse ULD exclusions from content (COUR, MAIL, RAMP TRANSFER)
 * Returns allocation strings for each category
 */
export function parseUldExclusions(content: string, shipments?: Shipment[]): {
  courAllocation: string
  mailAllocation: string
  rampTransferUlds: string
} {
  const lines = content.split('\n')
  let courAllocation = ''
  let mailAllocation = ''
  
  // Parse COUR/COU line from footer
  // Formats: "COUR 3PMC 2QKE BULK 100K", "COU 02QKE BULK (FEDEX...)", "COUR 1QKE BULK 650K"
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Match COUR or COU line
    const courMatch = trimmed.match(/^(?:COUR|COU)\s+(.+)/i)
    if (courMatch) {
      // Extract ULD allocations from the matched content
      const allocation = parseUldAllocation(courMatch[1])
      if (allocation.size > 0) {
        courAllocation = formatUldAllocation(allocation)
        console.log('[v0] Parsed COUR allocation:', courAllocation, 'from line:', trimmed)
      }
    }
    
    // Match MAIL line
    // Formats: "MAIL 01QKE", "MAIL 2AKE"
    const mailMatch = trimmed.match(/^MAIL\s+(.+)/i)
    if (mailMatch) {
      const allocation = parseUldAllocation(mailMatch[1])
      if (allocation.size > 0) {
        mailAllocation = formatUldAllocation(allocation)
        console.log('[v0] Parsed MAIL allocation:', mailAllocation, 'from line:', trimmed)
      }
    }
  }
  
  // Parse RAMP TRANSFER ULDs from shipments (if provided)
  // Sum all ULDs from sections marked as isRampTransfer
  let rampTransferUlds = ''
  if (shipments && shipments.length > 0) {
    const rampTransferAllocation = new Map<string, number>()
    
    // Get unique ULDs from ramp transfer shipments
    const rampTransferUldSet = new Set<string>()
    shipments
      .filter(s => s.isRampTransfer && s.uld)
      .forEach(s => rampTransferUldSet.add(s.uld))
    
    // Parse each unique ULD and sum
    rampTransferUldSet.forEach(uld => {
      const allocation = parseUldAllocation(uld)
      allocation.forEach((count, type) => {
        rampTransferAllocation.set(type, (rampTransferAllocation.get(type) || 0) + count)
      })
    })
    
    if (rampTransferAllocation.size > 0) {
      rampTransferUlds = formatUldAllocation(rampTransferAllocation)
      console.log('[v0] Parsed RAMP TRANSFER ULDs:', rampTransferUlds)
    }
  }
  
  return {
    courAllocation,
    mailAllocation,
    rampTransferUlds,
  }
}

/**
 * Calculate adjusted TTL PLN ULD by subtracting exclusions
 * @param ttlPlnUld - Original TTL PLN ULD from header (e.g., "05PMC/01PLA/07AKE")
 * @param courAllocation - COUR allocation to subtract (e.g., "02AKE")
 * @param mailAllocation - MAIL allocation to subtract (e.g., "01AKE")
 * @param rampTransferUlds - RAMP TRANSFER ULDs to subtract (e.g., "04PMC")
 * @returns Adjusted TTL PLN ULD string (e.g., "01PMC/01PLA/04AKE")
 */
export function calculateAdjustedTtlPlnUld(
  ttlPlnUld: string,
  courAllocation: string,
  mailAllocation: string,
  rampTransferUlds: string
): string {
  if (!ttlPlnUld) return ''
  
  // Parse original TTL PLN ULD
  let result = parseUldAllocation(ttlPlnUld)
  
  // Subtract COUR allocation
  if (courAllocation) {
    const cour = parseUldAllocation(courAllocation)
    result = subtractUldAllocation(result, cour)
    console.log('[v0] After subtracting COUR:', formatUldAllocation(result))
  }
  
  // Subtract MAIL allocation
  if (mailAllocation) {
    const mail = parseUldAllocation(mailAllocation)
    result = subtractUldAllocation(result, mail)
    console.log('[v0] After subtracting MAIL:', formatUldAllocation(result))
  }
  
  // Subtract RAMP TRANSFER ULDs
  if (rampTransferUlds) {
    const rampTransfer = parseUldAllocation(rampTransferUlds)
    result = subtractUldAllocation(result, rampTransfer)
    console.log('[v0] After subtracting RAMP TRANSFER:', formatUldAllocation(result))
  }
  
  return formatUldAllocation(result)
}

/**
 * Detect CRITICAL stamp from images in DOCX file using OCR
 * This is called separately after text-based detection fails
 * @param file - DOCX file to check for images
 * @returns Promise<boolean> - true if CRITICAL is detected in images
 */
export async function detectCriticalFromFileImages(file: File): Promise<boolean> {
  const fileName = file.name.toLowerCase()
  
  // Only check DOCX files for now (RTF image extraction is more complex)
  if (!fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
    return false
  }
  
  try {
    const images = await extractImagesFromDOCX(file)
    
    if (images.length === 0) {
      return false
    }
    
    const isCritical = await detectCriticalFromImages(images)
    
    return isCritical
  } catch (error) {
    return false
  }
}

export function parseShipments(content: string, header: LoadPlanHeader): Shipment[] {
  console.log("parseShipments called")
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
      const bufferCount = awbBuffer.length
      const bufferSerials = awbBuffer.map(s => s.serialNo).filter(Boolean).join(", ")
      console.log("[v0] ✅ TOTALS found for sector:", currentSector, "- flushed", bufferCount, "item(s) from buffer (serials:", bufferSerials + "), but keeping inShipmentSection active for potential next sector")
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

    // Check for "TO BE LDD IN" ULD section markers
    // Examples: "TO BE LDD IN 02PMC", "TO BE LDD IN 01AKE", "TO BE LDD IN 04PMC/05AKE(STATION REQUIREMENT/DO NOT LOAD ALF'S/PLA'S)"
    // These should be treated as ULD sections just like "XX 01AKE XX"
    const toBeLddMatch = line.match(/^TO BE LDD IN\s+(.+)/i)
    if (toBeLddMatch && inShipmentSection) {
      const uldContent = toBeLddMatch[1].trim().toUpperCase()
      if (uldContent && uldContent.length > 0) {
        // Format as "XX {content} XX" to match existing ULD format
        const formattedULD = `XX ${uldContent} XX`
        
        console.log("[v0] ✅ TO BE LDD IN ULD section detected:", formattedULD, "- buffer has", awbBuffer.length, "AWB rows")
        
        // If there are AWB rows in buffer, assign this ULD to all of them
        if (awbBuffer.length > 0) {
          awbBuffer.forEach((shipment) => {
            // Append to existing ULD if present, otherwise set as ULD
            if (shipment.uld && shipment.uld.trim()) {
              shipment.uld = `${shipment.uld} --- ${formattedULD}`
            } else {
              shipment.uld = formattedULD
            }
            shipment.sector = currentSector
          })
          shipments.push(...(awbBuffer as Shipment[]))
          awbBuffer.length = 0
          console.log("[v0] ✅ TO BE LDD IN ULD section:", formattedULD, "- assigned to buffered AWB rows")
        } else {
          // If buffer is empty, this ULD section is for upcoming AWB rows
          currentULD = formattedULD
          console.log("[v0] ✅ TO BE LDD IN ULD section:", formattedULD, "- will be used for upcoming AWB rows")
        }
        continue
      }
    }

    if (inShipmentSection) {
      // Regex to parse shipment line - SHC can be single code (VUN) or multiple codes (VUN-CRT-EAP)
      // More flexible regex that handles variable spacing and optional fields
      // Pattern: SER AWB ORG/DES PCS WGT VOL LVOL SHC MAN.DESC PCODE PC THC BS PI FLTIN ARRDT.TIME QNN/AQNN WHS SI
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
      // - "002 ... SS Y EK0509 12Oct0024 13:29/           N" (with FLTIN and ARRDT.TIME)
      // - "001 ... SS N                                   N" (without FLTIN/ARRDT.TIME)
      // Pattern breakdown after BS PI:
      // - FLTIN: EK0509 (optional capture group)
      // - ARRDT DATE: 12Oct0024 (date part, optional capture group)
      // - ARRDT TIME: 13:29/ (time part with trailing /, optional capture group)
      // - QNN/AQNN: captures any non-Y/N text before SI (optional)
      // - WHS: captures any non-Y/N text between QNN and SI (optional)
      // - SI: Y or N (required at end)
      // Between ARRDT.TIME and SI there's often just whitespace
      let shipmentMatch = normalizedLine.match(
        /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z]\d)?\s*([A-Z0-9\s]*?)\s+(SS|BS|NN)\s+([YN])\s+([A-Z]{2}\d{4})?\s*(\d{2}[A-Za-z]{3}\d{2,4})?\s*([\d:\/]+)?\s*([A-Z0-9\/]+)?\s*([A-Z0-9]+)?\s+([YN])\s*$/i,
      )
      
      // If first regex doesn't match, try format with empty SHC (e.g., shipments 003-007)
      // Pattern: SER AWB ORG/DES PCS WGT VOL LVOL (empty or short SHC) MAN.DESC PCODE PC THC BS PI FLTIN ARRDT.TIME SI
      // Example: 003 176-20476223 CGKJFK 4 505.0 5.4 5.4 CONSOLIDATION GCR P7 SS N EK0359 30Nov0524 50:00/ N
      // Key: SHC codes are short (3-10 chars) like HEA, HEA-SPX, VUN-CRT-EAP
      // When SHC is empty, MAN.DESC (like CONSOLIDATION) comes directly after LVOL
      if (!shipmentMatch) {
        // Try pattern that allows SHC to be completely empty or a valid short SHC code
        // SHC pattern: ([A-Z]{3}(?:-[A-Z]{3})*)? matches:
        //   - Empty (nothing)
        //   - HEA (3 letters)
        //   - HEA-SPX (3-3)
        //   - VUN-CRT-EAP (3-3-3)
        // IMPORTANT: Use \s* (not \s+) after SHC to handle empty SHC case
        // When SHC is empty, there's no space between "nothing" and MAN.DESC
        const emptySHCMatch = normalizedLine.match(
          /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z]{3}(?:-[A-Z]{3})*)?\s*([A-Z][A-Z\s]*?)\s+([A-Z]{3})\s+([A-Z]\d)?\s*([A-Z0-9\s]*?)\s*(SS|BS|NN|HL)\s+([YN])\s+([A-Z]{2}\d{4})?\s*(\d{2}[A-Za-z]{3}\d{2,4})?\s*([\d:\/]+)?\s*([A-Z0-9\/]+)?\s*([A-Z0-9]+)?\s+([YN])\s*$/i,
        )
        if (emptySHCMatch) {
          const capturedSHC = (emptySHCMatch[9] || "").trim()
          const capturedManDesc = emptySHCMatch[10]?.trim()
          const capturedPcode = emptySHCMatch[11]
          
          // Verify: MAN.DESC should start with capital letter, PCODE should be 3 letters
          // SHC can be empty string ""
          const isValidManDesc = capturedManDesc && capturedManDesc.length > 0 && capturedManDesc.match(/^[A-Z]/)
          const isValidPcode = capturedPcode && capturedPcode.length === 3 && capturedPcode.match(/^[A-Z]{3}$/i)
          const isValidSHC = !capturedSHC || capturedSHC.match(/^[A-Z]{3}(-[A-Z]{3})*$/i)
          
          if (isValidManDesc && isValidPcode && isValidSHC) {
            console.log("[v0] ✅ Matched with empty/short SHC regex (e.g., shipments 003-007):", {
              serial: emptySHCMatch[1],
              awb: emptySHCMatch[2],
              shc: capturedSHC || "(empty)",
              manDesc: capturedManDesc.substring(0, 30),
              pcode: capturedPcode
            })
            shipmentMatch = emptySHCMatch
          }
        }
      }
      
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
            "", // qnnAqnn (empty)
            "", // whs (empty)
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
              "", // qnnAqnn (empty)
              "", // whs (empty)
              noPCMatch[18] || "N", // si
            ]
          } else {
            // Log lines that look like shipments but don't match
            if (line.match(/^\d{3}\s+\d{3}-\d{8}/)) {
              console.log("[v0] ⚠️ Failed to parse shipment line:", line.substring(0, 150))
              console.log("[v0] ⚠️ Normalized line:", normalizedLine.substring(0, 150))
              // Try to identify which part might be causing the issue
              const serialMatch = normalizedLine.match(/^(\d{3})/)
              if (serialMatch) {
                const serial = serialMatch[1]
                console.log("[v0] ⚠️ Serial number detected:", serial, "- attempting to debug parsing issue")
                
                // Special handling for shipment 012 (known issue with empty SHC)
                if (serial === "012") {
                  console.log("[v0] 🔍 Special debug for shipment 012 with empty SHC")
                  // Try to manually parse shipment 012 format
                  // Pattern: 012 176-90670086 KULLHR 11 1200.0 29.7 29.7 CONSOLIDATION GCR P1 QRT NN N EK0345 01Mar1320 01:10/ N
                  const manualMatch = normalizedLine.match(/^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z][A-Z\s]+?)\s+([A-Z]{3})\s+([A-Z]\d)\s+([A-Z0-9\s]+?)\s+(SS|BS|NN)\s+([YN])\s+([A-Z]{2}\d{4})?\s*(\d{2}[A-Za-z]{3}\d{2,4})?\s*([\d:\/]+)?\s*([A-Z0-9\/]+)?\s*([A-Z0-9]+)?\s+([YN])\s*$/i)
                  if (manualMatch) {
                    console.log("[v0] ✅ Manual pattern matched for shipment 012:", {
                      serial: manualMatch[1],
                      awb: manualMatch[2],
                      manDesc: manualMatch[9]?.substring(0, 30),
                      pcode: manualMatch[10]
                    })
                    // Create shipment match array manually
                    shipmentMatch = [
                      manualMatch[0], // full match
                      manualMatch[1], // serial
                      manualMatch[2], // awb
                      manualMatch[3], // origin
                      manualMatch[4], // destination
                      manualMatch[5], // pcs
                      manualMatch[6], // wgt
                      manualMatch[7], // vol
                      manualMatch[8], // lvol
                      "", // shc (empty)
                      manualMatch[9], // manDesc
                      manualMatch[10], // pcode
                      manualMatch[11], // pc
                      manualMatch[12], // thc
                      manualMatch[13], // bs
                      manualMatch[14], // pi
                      manualMatch[15] || "", // fltIn
                      manualMatch[16] || "", // arrDate
                      manualMatch[17] || "", // arrTime
                      manualMatch[18] || "", // qnnAqnn
                      manualMatch[19] || "", // whs
                      manualMatch[20] || "N", // si
                    ]
                    console.log("[v0] ✅ Created manual shipment match for 012 with empty SHC")
                  }
                }
              }
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
          qnnAqnn,
          whs,
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

        // Ensure SHC is saved as empty string "" if empty or undefined
        // This handles cases like shipment 012 where SHC field is completely empty
        const trimmedSHC = (shc && shc.trim()) ? shc.trim() : ""
        
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
          qnnAqnn: (qnnAqnn || "").trim(),
          whs: (whs || "").trim(),
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
        
        // Log shipments with empty SHC for debugging (e.g., shipment 012)
        // Ensure SHC is saved as empty string "" if empty
        if (!trimmedSHC || trimmedSHC === "") {
          console.log("[v0] ✅ Shipment with empty SHC detected (will save as empty string \"\"):", {
            serialNo: serial,
            awbNo: awb,
            shcRaw: shc || "(empty)",
            shcTrimmed: trimmedSHC || "(empty string)",
            manDesc: manDesc?.substring(0, 30),
            isInBuffer: !currentULD && awbBuffer.length > 0
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
      } else if (inShipmentSection && line.length > 0 && !normalizedLine.match(/^\d{3}\s+\d{3}-\d{8}/) && !line.match(/^xx\s+/i) && !line.match(/^SECTOR:/i) && !line.match(/^TOTALS:/i) && !line.match(/^BAGG|COUR/i) && !line.match(/^RAMP|MAIL/i) && !line.match(/^GO SHOW/i)) {
        // Comment lines like "137P RELOC ON EK035 01DEC DUE SPACE" or "CAN BE KEPT AS GO SHOW OK TO MIX LD"
        // These should be stored as specialNotes (remarks) for the preceding AWB
        // Conditions: 
        // - Inside shipment section
        // - Not empty
        // - Doesn't match shipment line pattern (3 digits + space + AWB like 176-12345678)
        //   This allows "137P RELOC..." to be captured as comment (starts with digits but no AWB pattern)
        // - Doesn't start with XX (not a ULD marker)
        // - Doesn't start with SECTOR, TOTALS, BAGG, COUR, RAMP, MAIL, GO SHOW (not section markers)
        const note = line.trim()
        if (note.length > 0) {
          // Store as specialNotes (remarks) for the preceding AWB
          if (currentShipment) {
            const shipment = currentShipment as Partial<Shipment> & { specialNotes?: string[] }
            if (!shipment.specialNotes) {
              shipment.specialNotes = []
            }
            shipment.specialNotes.push(note)
            console.log("[v0] ✅ Comment line captured as specialNotes:", note.substring(0, 100))
          } else if (awbBuffer.length > 0) {
            // Assign to the last shipment in buffer
            const lastShipment = awbBuffer[awbBuffer.length - 1]
            if (lastShipment) {
              if (!lastShipment.specialNotes) {
                lastShipment.specialNotes = []
              }
              lastShipment.specialNotes.push(note)
              console.log("[v0] ✅ Comment line captured as specialNotes for buffered shipment:", note.substring(0, 100))
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
