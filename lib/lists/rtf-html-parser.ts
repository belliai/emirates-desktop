/**
 * RTF to HTML Parser for Load Plans
 * 
 * This parser converts RTF files to HTML using rtf2html library,
 * then parses the HTML table structure to extract LoadPlanHeader and Shipment data.
 */

import type { LoadPlanHeader, Shipment } from "./types"

// rtf2html is a CommonJS module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rtf2html = require("rtf2html")

/**
 * Parse RTF content to HTML, then extract load plan data
 */
export async function parseRTFWithHtml(file: File): Promise<{ header: LoadPlanHeader; shipments: Shipment[] }> {
  console.log("[RTF-HTML] Starting RTF to HTML conversion for:", file.name)
  
  // Read file as text
  const rtfContent = await file.text()
  console.log("[RTF-HTML] RTF content length:", rtfContent.length)
  
  // Convert RTF to HTML
  let html: string
  try {
    html = rtf2html(rtfContent, "", null, 2)
    console.log("[RTF-HTML] HTML output length:", html?.length || 0)
    
    if (!html || html.length === 0) {
      throw new Error("rtf2html returned empty HTML")
    }
    
    // Log sample of HTML for debugging
    console.log("[RTF-HTML] First 2000 chars of HTML:", html.substring(0, 2000))
  } catch (error) {
    console.error("[RTF-HTML] Error converting RTF to HTML:", error)
    throw new Error(`Failed to convert RTF to HTML: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
  
  // Parse header from HTML
  const header = parseHeaderFromHtml(html, file.name)
  console.log("[RTF-HTML] Parsed header:", header)
  
  // Parse shipments from HTML
  const shipments = parseShipmentsFromHtml(html, header)
  console.log("[RTF-HTML] Parsed shipments count:", shipments.length)
  
  return { header, shipments }
}

/**
 * Extract header information from HTML content
 */
function parseHeaderFromHtml(html: string, filename: string): LoadPlanHeader {
  console.log("[RTF-HTML] Parsing header from HTML")
  
  // Remove HTML tags for easier text parsing, but preserve structure
  const textContent = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
  
  console.log("[RTF-HTML] Text content for header parsing (first 3000 chars):", textContent.substring(0, 3000))
  
  // Helper to extract field value
  const extractField = (patterns: RegExp[]): string => {
    for (const pattern of patterns) {
      const match = textContent.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    return ""
  }
  
  // Extract flight number - try patterns in order
  let flightNumber = extractField([
    /EK\s*[-]?\s*(\d{4})/i,
    /EK\s*(\d{3,5})/i,
    /(?:FLIGHT|FLT)[\s:]*EK\s*(\d{4})/i,
  ])
  
  if (flightNumber && !flightNumber.startsWith("EK")) {
    flightNumber = `EK${flightNumber.padStart(4, "0")}`
  }
  
  // If not found in content, try filename
  if (!flightNumber) {
    const filenameMatch = filename.match(/EK\s*[-]?\s*(\d{4})/i)
    if (filenameMatch) {
      flightNumber = `EK${filenameMatch[1]}`
    }
  }
  
  // Extract date
  const date = extractField([
    /(\d{1,2})\s*[-]?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s*[-]?\s*\d{4})?/i,
  ])
  
  // Extract ACFT TYPE - look for pattern like "ACFT TYPE: 388Y" or just aircraft codes
  const aircraftType = extractField([
    /ACFT\s+TYPE\s*:\s*([A-Z0-9]+)/i,
    /ACFT\s+TYPE\s+([A-Z0-9]+)/i,
  ])
  
  // Extract ACFT REG - look for registration like "A6-EVO"
  const aircraftReg = extractField([
    /ACFT\s+REG\s*:\s*([A-Z0-9-]+)/i,
    /ACFT\s+REG\s+([A-Z0-9-]+)/i,
    /([A-Z]\d-[A-Z]{3})/i,  // Common format A6-XXX
  ])
  
  // Extract SECTOR
  const sector = extractField([
    /SECTOR\s*:\s*([A-Z]{6})/i,
    /SECTOR\s+([A-Z]{6})/i,
  ])
  
  // Extract STD
  const std = extractField([
    /STD\s*:\s*(\d{2}:\d{2})/i,
    /STD\s+(\d{2}:\d{2})/i,
  ])
  
  // Extract PREPARED BY
  const preparedBy = extractField([
    /PREPARED\s+BY\s*:\s*([A-Z0-9]+)/i,
    /PREPARED\s+BY\s+([A-Z0-9]+)/i,
  ])
  
  // Extract PREPARED ON
  const preparedOn = extractField([
    /PREPARED\s+ON\s*:\s*([\d-]+\s+[\d:]+)/i,
    /PREPARED\s+ON\s+([\d-]+\s+[\d:]+)/i,
  ])
  
  // Extract TTL PLN ULD
  const ttlPlnUld = extractField([
    /TTL\s+PLN\s+ULD\s*:\s*([A-Z0-9\/]+)/i,
    /TTL\s+PLN\s+ULD\s+([A-Z0-9\/]+)/i,
  ])
  
  // Extract ULD VERSION
  const uldVersion = extractField([
    /ULD\s+VERSION\s*:\s*([A-Z0-9\/]+)/i,
    /ULD\s+VERSION\s+([A-Z0-9\/]+)/i,
  ])
  
  // Check for CRITICAL
  const isCritical = /CRITICAL/i.test(textContent)
  
  // Extract header warning (text between table header and first data row)
  let headerWarning = ""
  const warningPatterns = [
    /\/\/(.*?)\/\//g,  // Text between // markers
  ]
  
  const warningMatches: string[] = []
  for (const pattern of warningPatterns) {
    let match
    while ((match = pattern.exec(textContent)) !== null) {
      if (match[1] && match[1].trim().length > 5) {
        warningMatches.push(match[1].trim())
      }
    }
  }
  
  if (warningMatches.length > 0) {
    headerWarning = warningMatches.join("\n")
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
    ttlPlnUld,
    uldVersion,
    headerWarning: headerWarning || undefined,
    isCritical: isCritical || undefined,
  }
}

/**
 * Parse shipment rows from HTML content
 */
function parseShipmentsFromHtml(html: string, header: LoadPlanHeader): Shipment[] {
  console.log("[RTF-HTML] Parsing shipments from HTML")
  
  const shipments: Shipment[] = []
  
  // Remove HTML tags but preserve line structure
  const textContent = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "\t")  // Use tab as column separator
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
  
  const lines = textContent.split("\n")
  console.log("[RTF-HTML] Total lines to process:", lines.length)
  
  let inShipmentSection = false
  let currentULD = ""
  let isRampTransfer = false
  let currentSector = header.sector || ""
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (!line) continue
    
    // Check for table header (indicates start of shipment section)
    if ((line.includes("SER") || line.includes("SER.")) && 
        (line.includes("AWB") || line.includes("AWBNO"))) {
      inShipmentSection = true
      console.log("[RTF-HTML] Found shipment table header at line", i)
      continue
    }
    
    // Check for SECTOR marker
    const sectorMatch = line.match(/^SECTOR\s*:\s*([A-Z]{6})/i)
    if (sectorMatch) {
      currentSector = sectorMatch[1]
      console.log("[RTF-HTML] New sector detected:", currentSector)
      continue
    }
    
    // Check for RAMP TRANSFER marker
    if (line.includes("RAMP TRANSFER")) {
      isRampTransfer = true
      console.log("[RTF-HTML] Ramp transfer section detected")
      continue
    }
    
    // Check for TOTALS (end of section)
    if (line.match(/^TOTALS/i)) {
      isRampTransfer = false
      console.log("[RTF-HTML] Totals found, reset ramp transfer flag")
      continue
    }
    
    // Check for ULD section markers (XX ... XX)
    const uldMatch = line.match(/XX\s+(.+?)\s+XX/i)
    if (uldMatch) {
      currentULD = `XX ${uldMatch[1].trim().toUpperCase()} XX`
      console.log("[RTF-HTML] ULD section detected:", currentULD)
      continue
    }
    
    if (!inShipmentSection) continue
    
    // Try to parse shipment line
    // Pattern: SER (3 digits) AWB (###-########) ORG/DES (6 letters) PCS WGT VOL LVOL SHC MAN.DESC ...
    
    // Normalize the line - replace multiple spaces/tabs with single space
    const normalizedLine = line.replace(/[\t\s]+/g, " ").trim()
    
    // Match shipment pattern
    const shipmentMatch = normalizedLine.match(
      /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z0-9-]+)\s+(.+)/i
    )
    
    if (shipmentMatch) {
      // Parse the rest of the line for remaining fields
      const restOfLine = shipmentMatch[10]
      
      // Try to extract additional fields from rest of line
      // Format: MAN.DESC PCODE PC THC BS PI FLTIN ARRDT.TIME QNN/AQNN WHS SI
      const restParts = restOfLine.split(/\s+/)
      
      // Find PCODE (3 uppercase letters)
      let manDesc = ""
      let pcode = ""
      let pc = ""
      let thc = ""
      let bs = "SS"
      let pi = "N"
      let fltIn = ""
      let arrDtTime = ""
      let qnnAqnn = ""
      let whs = ""
      let si = "N"
      
      // Look for PCODE pattern (3 uppercase letters followed by optional PC like "P1", "P2")
      let pcodeIdx = -1
      for (let j = 0; j < restParts.length; j++) {
        // Check for PCODE+PC pattern like "AXDP2" or "COUP1"
        const pcodePcMatch = restParts[j].match(/^([A-Z]{3})(P\d)?$/i)
        if (pcodePcMatch && !["AVI", "CGO", "EAT", "RDS", "RCM", "ICE", "COL"].includes(pcodePcMatch[1])) {
          // Found PCODE
          pcode = pcodePcMatch[1]
          pc = pcodePcMatch[2] || ""
          pcodeIdx = j
          
          // Everything before PCODE is MAN.DESC
          manDesc = restParts.slice(0, j).join(" ")
          break
        }
        
        // Check if this is a known PCODE (3 letters) followed by separate PC
        if (/^[A-Z]{3}$/i.test(restParts[j]) && j + 1 < restParts.length && /^P\d$/i.test(restParts[j + 1])) {
          pcode = restParts[j]
          pc = restParts[j + 1]
          pcodeIdx = j
          manDesc = restParts.slice(0, j).join(" ")
          break
        }
      }
      
      // If no PCODE found, assume all remaining is MAN.DESC
      if (pcodeIdx === -1) {
        manDesc = restOfLine
      } else {
        // Parse remaining fields after PCODE/PC
        let idx = pcodeIdx + (pc ? 2 : 1)
        
        // THC (optional - like "NORM", "QWT", etc.)
        if (idx < restParts.length && /^[A-Z0-9]+$/i.test(restParts[idx]) && 
            !/^(SS|BS|NN|Y|N)$/i.test(restParts[idx])) {
          thc = restParts[idx++]
        }
        
        // BS (SS, BS, NN)
        if (idx < restParts.length && /^(SS|BS|NN)$/i.test(restParts[idx])) {
          bs = restParts[idx++].toUpperCase()
        }
        
        // PI (Y, N)
        if (idx < restParts.length && /^[YN]$/i.test(restParts[idx])) {
          pi = restParts[idx++].toUpperCase()
        }
        
        // FLTIN (EK####)
        if (idx < restParts.length && /^[A-Z]+\d+$/i.test(restParts[idx])) {
          fltIn = restParts[idx++]
        }
        
        // ARRDT.TIME (date pattern)
        if (idx < restParts.length && /\d{2}[A-Za-z]{3}\d{2,4}/.test(restParts[idx])) {
          arrDtTime = restParts[idx++]
          // Check for time part
          if (idx < restParts.length && /[\d:\/]+/.test(restParts[idx])) {
            arrDtTime += " " + restParts[idx++]
          }
        }
        
        // SI (last field, Y or N)
        if (idx < restParts.length && /^[YN]$/i.test(restParts[restParts.length - 1])) {
          si = restParts[restParts.length - 1].toUpperCase()
        }
      }
      
      const shipment: Shipment = {
        serialNo: shipmentMatch[1],
        awbNo: shipmentMatch[2].replace(/\s+/g, ""),
        origin: shipmentMatch[3],
        destination: shipmentMatch[4],
        pieces: parseInt(shipmentMatch[5]) || 0,
        weight: parseFloat(shipmentMatch[6]) || 0,
        volume: parseFloat(shipmentMatch[7]) || 0,
        lvol: parseFloat(shipmentMatch[8]) || 0,
        shc: shipmentMatch[9] || "",
        manDesc: manDesc.trim(),
        pcode,
        pc,
        thc,
        bs,
        pi,
        fltIn,
        arrDtTime,
        qnnAqnn,
        whs,
        si,
        uld: currentULD,
        specialNotes: [],
        isRampTransfer,
        sector: currentSector,
      }
      
      shipments.push(shipment)
      
      if (shipments.length <= 5) {
        console.log("[RTF-HTML] Parsed shipment:", {
          serialNo: shipment.serialNo,
          awbNo: shipment.awbNo,
          origin: shipment.origin,
          destination: shipment.destination,
          manDesc: shipment.manDesc,
          pcode: shipment.pcode,
        })
      }
    } else if (normalizedLine.match(/^\d{3}\s+\d{3}-\d{8}/)) {
      // Line looks like a shipment but didn't match full pattern
      // Try simpler parsing
      const simpleMatch = normalizedLine.match(/^(\d{3})\s+(\d{3}-\d{8})\s+(.+)/)
      if (simpleMatch) {
        const restOfLine = simpleMatch[3]
        const parts = restOfLine.split(/\s+/)
        
        // Try to extract ORG/DES (6 consecutive uppercase letters)
        let origin = ""
        let destination = ""
        let pcs = 0
        let wgt = 0
        let vol = 0
        let lvol = 0
        let shc = ""
        let manDesc = ""
        
        // Check first part for ORG/DES
        if (parts.length > 0) {
          const orgDesMatch = parts[0].match(/^([A-Z]{3})([A-Z]{3})(\d*)$/i)
          if (orgDesMatch) {
            origin = orgDesMatch[1]
            destination = orgDesMatch[2]
            pcs = parseInt(orgDesMatch[3]) || 0
            
            // Parse remaining numeric fields
            let idx = 1
            if (pcs === 0 && idx < parts.length && /^\d+$/.test(parts[idx])) {
              pcs = parseInt(parts[idx++]) || 0
            }
            if (idx < parts.length && /^[\d.]+$/.test(parts[idx])) {
              wgt = parseFloat(parts[idx++]) || 0
            }
            if (idx < parts.length && /^[\d.]+$/.test(parts[idx])) {
              vol = parseFloat(parts[idx++]) || 0
            }
            if (idx < parts.length && /^[\d.]+$/.test(parts[idx])) {
              lvol = parseFloat(parts[idx++]) || 0
            }
            if (idx < parts.length && /^[A-Z0-9-]+$/i.test(parts[idx])) {
              shc = parts[idx++]
            }
            
            // Rest is MAN.DESC
            manDesc = parts.slice(idx).join(" ")
            
            const shipment: Shipment = {
              serialNo: simpleMatch[1],
              awbNo: simpleMatch[2].replace(/\s+/g, ""),
              origin,
              destination,
              pieces: pcs,
              weight: wgt,
              volume: vol,
              lvol,
              shc,
              manDesc: manDesc.trim(),
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
              uld: currentULD,
              specialNotes: [],
              isRampTransfer,
              sector: currentSector,
            }
            
            shipments.push(shipment)
          }
        }
      }
    }
  }
  
  console.log("[RTF-HTML] Total shipments parsed:", shipments.length)
  
  // Log shipment distribution by sector
  const sectorCounts = new Map<string, number>()
  shipments.forEach(s => {
    const sector = s.sector || "UNKNOWN"
    sectorCounts.set(sector, (sectorCounts.get(sector) || 0) + 1)
  })
  console.log("[RTF-HTML] Shipments by sector:", Object.fromEntries(sectorCounts))
  
  return shipments
}

