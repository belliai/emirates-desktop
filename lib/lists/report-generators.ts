import type { LoadPlanHeader, Shipment, SpecialCargoReportRow, VUNListRow, QRTListRow } from "./types"
import { isSpecialCargo, isWeaponsCargo, isVUNCargo, isQRTCargo } from "./classification"
import { formatDateForReport } from "./parser"

export function generateSpecialCargoReport(header: LoadPlanHeader, shipments: Shipment[]) {
  const regularCargo: SpecialCargoReportRow[] = []
  const weaponsCargo: SpecialCargoReportRow[] = []

  shipments.forEach((shipment) => {
    if (!isSpecialCargo(shipment)) return

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

  shipments.forEach((shipment) => {
    if (!isVUNCargo(shipment)) return

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

  shipments.forEach((shipment) => {
    if (!isQRTCargo(shipment)) return

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
