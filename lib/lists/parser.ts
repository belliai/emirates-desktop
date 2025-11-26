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
  }
}

export function parseShipments(content: string, header: LoadPlanHeader): Shipment[] {
  const shipments: Shipment[] = []
  const lines = content.split("\n")
  let currentShipment: Partial<Shipment> | null = null
  let inShipmentSection = false
  let currentULD = ""
  let isRampTransfer = false
  // Buffer untuk menyimpan AWB rows yang belum memiliki ULD
  const awbBuffer: Partial<Shipment>[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.includes("SER.") && line.includes("AWB NO")) {
      inShipmentSection = true
      isRampTransfer = false // Reset ramp transfer flag when new section starts
      // Clear buffer ketika masuk section baru
      awbBuffer.length = 0
      currentULD = ""
      continue
    }

    // Check for RAMP TRANSFER marker
    if (line.match(/\*\*\*\*\*\s*RAMP\s+TRANSFER\s*\*\*\*\*\*/i)) {
      isRampTransfer = true
      console.log("[v0] ✅ RAMP TRANSFER marker detected, setting isRampTransfer = true for subsequent shipments")
      continue
    }

    if (line.match(/^TOTALS\s*:/i)) {
      // Flush buffer dan current shipment sebelum keluar dari section
      awbBuffer.forEach(shipment => {
        shipments.push(shipment as Shipment)
      })
      awbBuffer.length = 0
      if (currentShipment) {
        shipments.push(currentShipment as Shipment)
        currentShipment = null
      }
      inShipmentSection = false
      isRampTransfer = false
      currentULD = ""
      continue
    }

    if (line.match(/^[_\-=]+$/)) continue
    if (!line) continue

    // Check for ULD section - format: XX 06AKE XX or XX 02PMC 03AKE XX
    const uldMatch = line.match(/XX\s+(\d+(?:PMC|AKE|PAG|AMP|BULK)(?:\s+\d+(?:PMC|AKE|PAG|AMP|BULK))*)\s+XX/i)
    if (uldMatch) {
      const newULD = uldMatch[1]
      // Format ULD untuk disimpan: "XX 06AKE XX"
      const formattedULD = `XX ${newULD} XX`
      
      // Jika ada AWB rows di buffer, assign ULD tersebut ke semua AWB rows di buffer
      // (ULD section yang muncul SETELAH AWB rows menjadi parent dari AWB rows tersebut)
      if (awbBuffer.length > 0) {
        awbBuffer.forEach(shipment => {
          shipment.uld = formattedULD
          shipments.push(shipment as Shipment)
        })
        const bufferCount = awbBuffer.length
        awbBuffer.length = 0
        console.log("[v0] ✅ ULD section detected:", formattedULD, "- assigned to", bufferCount, "previous AWB rows in buffer")
      } else {
        // Jika buffer kosong, ULD section ini untuk AWB rows yang akan datang
        currentULD = formattedULD
        console.log("[v0] ✅ ULD section detected:", formattedULD, "- will be used for upcoming AWB rows")
      }
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
          uld: currentULD, // Akan di-assign nanti jika ULD section muncul setelahnya
          specialNotes: [],
          isRampTransfer: isRampTransfer,
        }
        
        // Jika currentULD sudah di-set (ULD muncul SEBELUM AWB row), 
        // assign ke AWB row pertama dan clear currentULD
        // AWB rows berikutnya akan masuk buffer untuk menunggu ULD section yang muncul setelahnya
        if (currentULD && awbBuffer.length === 0) {
          // ULD muncul sebelum AWB row, assign ke AWB row pertama
          shipments.push(currentShipment as Shipment)
          currentULD = "" // Clear untuk AWB rows berikutnya
          currentShipment = null
        } else {
          // Simpan di buffer, akan di-assign ULD nanti ketika menemukan ULD section
          awbBuffer.push(currentShipment)
          currentULD = "" // Clear currentULD karena AWB rows ini menunggu ULD section yang muncul setelahnya
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
        // Special notes bisa untuk currentShipment atau shipment terakhir di buffer
        const note = line.replace(/\*\*/g, "").replace(/[[\]]/g, "").trim()
        if (currentShipment) {
          currentShipment.specialNotes = currentShipment.specialNotes || []
          currentShipment.specialNotes.push(note)
        } else if (awbBuffer.length > 0) {
          // Assign ke shipment terakhir di buffer
          const lastShipment = awbBuffer[awbBuffer.length - 1]
          if (lastShipment) {
            lastShipment.specialNotes = lastShipment.specialNotes || []
            lastShipment.specialNotes.push(note)
          }
        }
      }
    }
  }

  // Flush buffer dan current shipment di akhir
  awbBuffer.forEach(shipment => {
    shipments.push(shipment as Shipment)
  })
  awbBuffer.length = 0
  
  if (currentShipment) {
    shipments.push(currentShipment as Shipment)
  }

  console.log("[v0] Parsed shipments:", shipments.length)
  if (shipments.length > 0) {
    console.log("[v0] Sample shipment:", shipments[0])
    // Log beberapa shipments dengan ULD untuk debugging
    const shipmentsWithULD = shipments.filter(s => s.uld && s.uld.trim() !== "")
    console.log("[v0] Shipments with ULD:", shipmentsWithULD.length, "out of", shipments.length)
    if (shipmentsWithULD.length > 0) {
      console.log("[v0] Sample shipments with ULD:", shipmentsWithULD.slice(0, 3).map(s => ({
        serialNo: s.serialNo,
        awbNo: s.awbNo,
        uld: s.uld
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
