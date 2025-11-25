import type { LoadPlanHeader, Shipment } from "./types"

export function parseHeader(content: string): LoadPlanHeader {
  const flightMatch = content.match(/EK\s*(\d{4})/i)
  const flightNumber = flightMatch ? `EK${flightMatch[1]}` : ""

  const dateMatch = content.match(/(\d{1,2})\s*[-]?\s*Oct(?:\s*[-]?\s*(\d{4}))?/i)
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

  return { flightNumber, date, aircraftType, aircraftReg, sector, std, preparedBy, preparedOn }
}

export function parseShipments(content: string, header: LoadPlanHeader): Shipment[] {
  const shipments: Shipment[] = []
  const lines = content.split("\n")
  let currentShipment: Partial<Shipment> | null = null
  let inShipmentSection = false
  let currentULD = ""
  let isRampTransfer = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.includes("SER.") && line.includes("AWB NO")) {
      inShipmentSection = true
      isRampTransfer = false // Reset ramp transfer flag when new section starts
      continue
    }

    // Check for RAMP TRANSFER marker
    if (line.match(/\*\*\*\*\*\s*RAMP\s+TRANSFER\s*\*\*\*\*\*/i)) {
      isRampTransfer = true
      console.log("[v0] ✅ RAMP TRANSFER marker detected, setting isRampTransfer = true for subsequent shipments")
      continue
    }

    if (line.match(/^TOTALS\s*:/i)) {
      if (currentShipment) {
        shipments.push(currentShipment as Shipment)
      }
      inShipmentSection = false
      isRampTransfer = false
      continue
    }

    if (line.match(/^[_\-=]+$/)) continue
    if (!line) continue

    const uldMatch = line.match(/XX\s+(\d+(?:PMC|AKE|PAG|AMP)(?:\s+\d+(?:PMC|AKE|PAG|AMP))*)\s+XX/i)
    if (uldMatch) {
      currentULD = uldMatch[1]
      continue
    }

    if (inShipmentSection) {
      // Regex to parse shipment line - SHC can be single code (VUN) or multiple codes (VUN-CRT-EAP)
      // More flexible regex that handles variable spacing after SHC
      // Pattern: SER AWB ORG/DES PCS WGT VOL LVOL SHC MAN.DESC PCODE PC THC BS PI FLTIN ARRDT.TIME SI
      // THC can be empty, "QRT", "P2 QRT", etc. (can contain spaces)
      let shipmentMatch = line.match(
        /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s{2,}([A-Z\s]+?)\s{2,}([A-Z]{3})\s+([A-Z]\d)\s+([A-Z0-9\s]*?)\s+(SS)\s+([YN])\s+([A-Z]+\d+)?\s*(\d{2}[A-Za-z]{3}\d{4})?\s*([\d:\/]+)?\s*([YN])?/i,
      )
      
      // If first regex doesn't match, try with more flexible spacing
      if (!shipmentMatch) {
        const altMatch = line.match(
          /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]+)\s+(.+?)\s+([A-Z]{3})\s+([A-Z]\d)\s+([A-Z0-9\s]*?)\s+(SS)\s+([YN])\s+([A-Z]+\d+)?\s*(\d{2}[A-Za-z]{3}\d{4})?\s*([\d:\/]+)?\s*([YN])?/i,
        )
        if (altMatch) {
          console.log("[v0] Matched with alternative regex")
          shipmentMatch = altMatch
        } else {
          // Log lines that look like shipments but don't match
          if (line.match(/^\d{3}\s+\d{3}-\d{8}/)) {
            console.log("[v0] ⚠️ Failed to parse shipment line:", line.substring(0, 100))
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
          awbNo: awb,
          origin: origin,
          destination: destination,
          pieces: Number.parseInt(pcs),
          weight: Number.parseFloat(wgt),
          volume: Number.parseFloat(vol),
          lvol: Number.parseFloat(lvol),
          shc: trimmedSHC,
          manDesc: manDesc.trim(),
          pcode: pcode || "",
          pc: pc,
          thc: thc ? thc.trim() : "",
          bs: bs,
          pi: pi,
          fltIn: fltIn || "",
          arrDtTime: `${arrDate || ""} ${arrTime || ""}`.trim(),
          qnnAqnn: "",
          whs: "",
          si: si || "N",
          uld: currentULD,
          specialNotes: [],
          isRampTransfer: isRampTransfer,
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
      } else if ((line.startsWith("[") || line.startsWith("**[")) && currentShipment) {
        const note = line.replace(/\*\*/g, "").replace(/[[\]]/g, "").trim()
        currentShipment.specialNotes = currentShipment.specialNotes || []
        currentShipment.specialNotes.push(note)
      }
    }
  }

  if (currentShipment) {
    shipments.push(currentShipment as Shipment)
  }

  console.log("[v0] Parsed shipments:", shipments.length)
  console.log("[v0] Sample shipment:", shipments[0])

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
