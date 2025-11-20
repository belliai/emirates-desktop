import type { LoadPlanHeader, Shipment, SpecialCargoReportRow, VUNListRow, QRTListRow } from "./types"
import { isSpecialCargo, isWeaponsCargo, isVUNCargo, isQRTCargo, isGeneralSpecialCargo } from "./classification"
import { formatDateForReport } from "./parser"

export function generateSpecialCargoReport(header: LoadPlanHeader, shipments: Shipment[]) {
  const regularCargo: SpecialCargoReportRow[] = []
  const weaponsCargo: SpecialCargoReportRow[] = []

  shipments.forEach((shipment) => {
    // General list: include all shipments with SHC = SWP, RXS, MUW, HUM, LHO, AVI, CAR, VEH, HEG, RDS, VIP, ASH, ICE, CPS, EKD, HUU, HUL, DOC
    if (!isGeneralSpecialCargo(shipment)) return

    let inCarrier = ""
    let inFlightNo = ""
    if (shipment.fltIn) {
      const match = shipment.fltIn.match(/([A-Z]{2})(\d+)/i)
      if (match) {
        inCarrier = match[1]
        inFlightNo = match[2]
      }
    }

    const outFlightNo = header.flightNumber.replace(/^EK/i, "")
    const depDate = formatDateForReport(header.date)

    const row: SpecialCargoReportRow = {
      serialNo: shipment.serialNo,
      carrier: "EK",
      outFlightNo,
      docNo: shipment.awbNo,
      origin: shipment.origin,
      destination: shipment.destination,
      inBrdPt: shipment.origin,
      outOffPt: shipment.destination,
      depDate,
      std: header.std,
      outPcs: shipment.pieces,
      outWt: shipment.weight,
      volume: shipment.volume,
      lvol: shipment.lvol,
      shc: shipment.shc,
      manifestDesc: shipment.manDesc,
      pcode: shipment.pcode,
      pc: shipment.pc,
      thc: shipment.thc,
      bs: shipment.bs,
      pi: shipment.pi,
      fltIn: shipment.fltIn,
      arrDtTime: shipment.arrDtTime,
      qnnAqnn: shipment.qnnAqnn,
      whs: shipment.whs,
      si: shipment.si,
      uld: shipment.uld,
      inCarrier,
      inFlightNo,
    }

    if (isWeaponsCargo(shipment)) {
      weaponsCargo.push(row)
    } else {
      regularCargo.push(row)
    }
  })

  return { regular: regularCargo, weapons: weaponsCargo }
}

export function generateVUNList(header: LoadPlanHeader, shipments: Shipment[]): VUNListRow[] {
  const vunList: VUNListRow[] = []

  console.log("[v0] generateVUNList: checking", shipments.length, "shipments")
  
  shipments.forEach((shipment) => {
    const isVUN = isVUNCargo(shipment)
    if (!isVUN) return
    
    console.log("[v0] ✅ Found VUN shipment in generateVUNList:", {
      serialNo: shipment.serialNo,
      awbNo: shipment.awbNo,
      shc: shipment.shc,
    })

    let inCarrier = ""
    let inFlightNo = ""
    let inSu = ""
    if (shipment.fltIn) {
      const match = shipment.fltIn.match(/([A-Z]{2})(\d+)([A-Z])?/i)
      if (match) {
        inCarrier = match[1]
        inFlightNo = match[2]
        inSu = match[3] || ""
      }
    }

    const arrMatch = shipment.arrDtTime.match(/(\d{2}[A-Za-z]{3})(\d{4})?\s*([\d:]+)?/i)
    const arrDate = arrMatch ? formatDateForReport(arrMatch[1]) : ""
    const arrTime = arrMatch?.[3]?.replace("/", "") || ""

    const cargoType = shipment.shc.includes("AVI")
      ? "Live Animals"
      : shipment.shc.includes("HUM") || shipment.shc.includes("HUU")
        ? "Human Remains"
        : shipment.shc.includes("MAL")
          ? "Mail"
          : "Hard Freight"

    const inUld = shipment.uld || (shipment.serialNo.includes("BULK") ? "BULK" : "***")
    const outUld = shipment.uld || "***"

    const isInBulk = inUld === "BULK" || inUld === ""
    const isOutBulk = outUld === "BULK" || outUld === "" || outUld === "***"
    const loadInOut =
      !isInBulk && !isOutBulk
        ? "ULD - ULD"
        : isInBulk && isOutBulk
          ? "BLK - BLK"
          : isInBulk
            ? "BLK - ULD"
            : "ULD - BLK"

    const outFlightNo = header.flightNumber.replace(/^EK/i, "")

    const row: VUNListRow = {
      serialNo: shipment.serialNo,
      cargoType,
      docNo: shipment.awbNo,
      origin: shipment.origin,
      destination: shipment.destination,
      inUld,
      inCarrier,
      inFlightNo,
      inSu,
      inBrdPt: shipment.origin,
      inOffPt: "DXB",
      inArrDate: arrDate,
      inAta: arrTime,
      inMvt: "RCF",
      outCarrier: "EK",
      outFlightNo,
      outSu: "",
      outBrdPt: "DXB",
      outOffPt: shipment.destination,
      outDepDate: formatDateForReport(header.date),
      outStd: header.std,
      outPcs: shipment.pieces,
      outWt: shipment.weight,
      outVol: shipment.volume,
      lvol: shipment.lvol,
      outBooking: shipment.bs,
      outMvt: "RCF",
      outUld,
      outMctActl: "",
      outMctStnd: "12:00",
      outMctDiff: "",
      outMctThc: shipment.thc === "QWT" ? "QWT" : "",
      loadInOut,
      product: shipment.pcode,
      shc: shipment.shc,
      commodity: "",
      manifestDesc: shipment.manDesc,
      pcode: shipment.pcode,
      pc: shipment.pc,
      thc: shipment.thc,
      bs: shipment.bs,
      pi: shipment.pi,
      qnnAqnn: shipment.qnnAqnn,
      whs: shipment.whs,
      si: shipment.si,
    }

    vunList.push(row)
  })

  return vunList
}

export function generateQRTList(header: LoadPlanHeader, shipments: Shipment[]): QRTListRow[] {
  const qrtList: QRTListRow[] = []

  console.log("[v0] generateQRTList: checking", shipments.length, "shipments")
  
  shipments.forEach((shipment) => {
    const isQRT = isQRTCargo(shipment)
    if (!isQRT) return
    
    console.log("[v0] ✅ Found QRT shipment in generateQRTList:", {
      serialNo: shipment.serialNo,
      awbNo: shipment.awbNo,
      thc: shipment.thc,
      shc: shipment.shc,
    })

    const outFlightNo = header.flightNumber.replace(/^EK/i, "")
    const depDate = formatDateForReport(header.date)

    const row: QRTListRow = {
      serialNo: shipment.serialNo,
      docNo: shipment.awbNo,
      origin: shipment.origin,
      destination: shipment.destination,
      carrier: "EK",
      flightNo: outFlightNo,
      outOffPt: shipment.destination,
      depDate,
      std: header.std,
      pcs: shipment.pieces,
      weight: shipment.weight,
      volume: shipment.volume,
      lvol: shipment.lvol,
      shc: shipment.shc,
      manifestDesc: shipment.manDesc,
      pcode: shipment.pcode,
      pc: shipment.pc,
      thc: shipment.thc,
      bs: shipment.bs,
      pi: shipment.pi,
      arrDtTime: shipment.arrDtTime,
      qnnAqnn: shipment.qnnAqnn,
      whs: shipment.whs,
      si: shipment.si,
      uld: shipment.uld || "***",
    }

    qrtList.push(row)
  })

  return qrtList
}
