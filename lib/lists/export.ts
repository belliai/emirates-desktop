import type { SpecialCargoReportRow, VUNListRow, QRTListRow } from "./types"
import { formatDateForReport } from "./parser"

export function exportSpecialCargoReportToCSV(
  regular: SpecialCargoReportRow[],
  weapons: SpecialCargoReportRow[],
  reportDate: string,
): string {
  const headers = [
    "Serial No.",
    "Carr.",
    "Out.Flt. No.",
    "Doc No.",
    "Origin",
    "Destination",
    "In.Brd Pt",
    "Out.Off Pt",
    "Dep. Date",
    "STD",
    "Out.Pcs.",
    "Out.Wt.",
    "Volume",
    "L.Vol",
    "SHC",
    "Manifest Desc.",
    "P.Code",
    "PC",
    "THC",
    "BS",
    "PI",
    "Flt In",
    "Arr Dt/Time",
    "QNN/AQNN",
    "WHS",
    "SI",
    "ULD",
    "Carr.",
    "In.Flt. No.",
  ]

  let csv = `SPECIAL CARGO REPORT DATED ON ${reportDate} (1300 - 2359Hrs)${",".repeat(headers.length - 1)}\n`
  csv += headers.join(",") + "\n"

  regular.forEach((row) => {
    csv +=
      [
        ` ${row.serialNo || ""}`,
        ` ${row.carrier}`,
        row.outFlightNo,
        ` ${row.docNo}`,
        ` ${row.origin || ""}`,
        ` ${row.destination || ""}`,
        ` ${row.inBrdPt}`,
        ` ${row.outOffPt}`,
        ` ${row.depDate}`,
        ` ${row.std}`,
        row.outPcs,
        row.outWt,
        row.volume || "",
        row.lvol || "",
        ` ${row.shc}`,
        ` ${row.manifestDesc}`,
        ` ${row.pcode || ""}`,
        ` ${row.pc || ""}`,
        ` ${row.thc || ""}`,
        ` ${row.bs || ""}`,
        ` ${row.pi || ""}`,
        ` ${row.fltIn || ""}`,
        ` ${row.arrDtTime || ""}`,
        ` ${row.qnnAqnn || ""}`,
        ` ${row.whs || ""}`,
        ` ${row.si || ""}`,
        ` ${row.uld || ""}`,
        ` ${row.inCarrier}`,
        row.inFlightNo,
      ].join(",") + "\n"
  })

  if (weapons.length > 0) {
    csv += `\n/RXS/SWP/MUW/VIP/VEH/SPECIAL CARGO REPORT DATED ON ${reportDate} (1300 - 2359Hrs)${",".repeat(headers.length - 1)}\n`
    csv += headers.join(",") + "\n"

    weapons.forEach((row) => {
      csv +=
        [
          ` ${row.serialNo || ""}`,
          ` ${row.carrier}`,
          row.outFlightNo,
          ` ${row.docNo}`,
          ` ${row.origin || ""}`,
          ` ${row.destination || ""}`,
          ` ${row.inBrdPt}`,
          ` ${row.outOffPt}`,
          ` ${row.depDate}`,
          ` ${row.std}`,
          row.outPcs,
          row.outWt,
          row.volume || "",
          row.lvol || "",
          ` ${row.shc}`,
          ` ${row.manifestDesc}`,
          ` ${row.pcode || ""}`,
          ` ${row.pc || ""}`,
          ` ${row.thc || ""}`,
          ` ${row.bs || ""}`,
          ` ${row.pi || ""}`,
          ` ${row.fltIn || ""}`,
          ` ${row.arrDtTime || ""}`,
          ` ${row.qnnAqnn || ""}`,
          ` ${row.whs || ""}`,
          ` ${row.si || ""}`,
          ` ${row.uld || ""}`,
          ` ${row.inCarrier}`,
          row.inFlightNo,
        ].join(",") + "\n"
    })
  }

  return csv
}

export function exportVUNListToCSV(vunList: VUNListRow[]): string {
  const headers = [
    "Serial No.",
    "Cargo Type",
    "Doc No.",
    "Origin",
    "Destination",
    "In.ULD",
    "In.Carr.",
    "In.Flt. No.",
    "In.Su",
    "In.Brd Pt",
    "In.Off Pt",
    "In.Arr. Date",
    "In.ATA",
    "In.Mvt.",
    "Out.Carr.",
    "Out.Flt. No.",
    "Out.Su",
    "Out.Brd Pt",
    "Out.Off Pt",
    "Out.Dep. Date",
    "Out.STD",
    "Out.Pcs.",
    "Out.Wt.",
    "Out.Vol.",
    "L.Vol",
    "Out.Booking",
    "Out.Mvt.",
    "Out.ULD",
    "Out.MCT.Actl.",
    "Out.MCT.Stnd.",
    "Out.MCT.Diff.",
    "Out.MCT.THC",
    "Load In - Out",
    "Product",
    "SHC",
    "Commodity",
    "Manifest Desc.",
    "P.Code",
    "PC",
    "THC",
    "BS",
    "PI",
    "QNN/AQNN",
    "WHS",
    "SI",
  ]

  let csv = headers.join(",") + "\n"

  vunList.forEach((row) => {
    csv +=
      [
        ` ${row.serialNo || ""}`,
        ` ${row.cargoType}`,
        ` ${row.docNo}`,
        ` ${row.origin || ""}`,
        ` ${row.destination || ""}`,
        ` ${row.inUld}`,
        ` ${row.inCarrier}`,
        ` ${row.inFlightNo}`,
        ` ${row.inSu}`,
        ` ${row.inBrdPt}`,
        ` ${row.inOffPt}`,
        ` ${row.inArrDate}`,
        ` ${row.inAta}`,
        ` ${row.inMvt}`,
        ` ${row.outCarrier}`,
        ` ${row.outFlightNo}`,
        ` ${row.outSu}`,
        ` ${row.outBrdPt}`,
        ` ${row.outOffPt}`,
        ` ${row.outDepDate}`,
        ` ${row.outStd}`,
        row.outPcs,
        row.outWt,
        row.outVol,
        row.lvol || "",
        ` ${row.outBooking}`,
        ` ${row.outMvt}`,
        ` ${row.outUld}`,
        ` ${row.outMctActl}`,
        ` ${row.outMctStnd}`,
        ` ${row.outMctDiff}`,
        ` ${row.outMctThc}`,
        ` ${row.loadInOut}`,
        ` ${row.product}`,
        ` ${row.shc}`,
        row.commodity,
        ` ${row.manifestDesc}`,
        ` ${row.pcode || ""}`,
        ` ${row.pc || ""}`,
        ` ${row.thc || ""}`,
        ` ${row.bs || ""}`,
        ` ${row.pi || ""}`,
        ` ${row.qnnAqnn || ""}`,
        ` ${row.whs || ""}`,
        ` ${row.si || ""}`,
      ].join(",") + "\n"
  })

  return csv
}

export function exportSpecialCargoReportToXLSX(
  regular: SpecialCargoReportRow[],
  weapons: SpecialCargoReportRow[],
  reportDate: string,
): string {
  const headers = [
    "Serial No.",
    "Carr.",
    "Out.Flt. No.",
    "Doc No.",
    "Origin",
    "Destination",
    "In.Brd Pt",
    "Out.Off Pt",
    "Dep. Date",
    "STD",
    "Out.Pcs.",
    "Out.Wt.",
    "Volume",
    "L.Vol",
    "SHC",
    "Manifest Desc.",
    "P.Code",
    "PC",
    "THC",
    "BS",
    "PI",
    "Flt In",
    "Arr Dt/Time",
    "QNN/AQNN",
    "WHS",
    "SI",
    "ULD",
    "Carr.",
    "In.Flt. No.",
  ]

  let tsv = `SPECIAL CARGO REPORT DATED ON ${reportDate} (1300 - 2359Hrs)${"\t".repeat(headers.length - 1)}\n`
  tsv += headers.join("\t") + "\n"

  regular.forEach((row) => {
    tsv +=
      [
        row.serialNo || "",
        row.carrier,
        row.outFlightNo,
        row.docNo,
        row.origin || "",
        row.destination || "",
        row.inBrdPt,
        row.outOffPt,
        row.depDate,
        row.std,
        row.outPcs,
        row.outWt,
        row.volume || "",
        row.lvol || "",
        row.shc,
        row.manifestDesc,
        row.pcode || "",
        row.pc || "",
        row.thc || "",
        row.bs || "",
        row.pi || "",
        row.fltIn || "",
        row.arrDtTime || "",
        row.qnnAqnn || "",
        row.whs || "",
        row.si || "",
        row.uld || "",
        row.inCarrier,
        row.inFlightNo,
      ].join("\t") + "\n"
  })

  if (weapons.length > 0) {
    tsv += `\n/RXS/SWP/MUW/VIP/VEH/SPECIAL CARGO REPORT DATED ON ${reportDate} (1300 - 2359Hrs)${"\t".repeat(headers.length - 1)}\n`
    tsv += headers.join("\t") + "\n"

    weapons.forEach((row) => {
      tsv +=
        [
          row.serialNo || "",
          row.carrier,
          row.outFlightNo,
          row.docNo,
          row.origin || "",
          row.destination || "",
          row.inBrdPt,
          row.outOffPt,
          row.depDate,
          row.std,
          row.outPcs,
          row.outWt,
          row.volume || "",
          row.lvol || "",
          row.shc,
          row.manifestDesc,
          row.pcode || "",
          row.pc || "",
          row.thc || "",
          row.bs || "",
          row.pi || "",
          row.fltIn || "",
          row.arrDtTime || "",
          row.qnnAqnn || "",
          row.whs || "",
          row.si || "",
          row.uld || "",
          row.inCarrier,
          row.inFlightNo,
        ].join("\t") + "\n"
    })
  }

  return tsv
}

export function exportVUNListToXLSX(vunList: VUNListRow[]): string {
  const headers = [
    "Serial No.",
    "Cargo Type",
    "Doc No.",
    "Origin",
    "Destination",
    "In.ULD",
    "In.Carr.",
    "In.Flt. No.",
    "In.Su",
    "In.Brd Pt",
    "In.Off Pt",
    "In.Arr. Date",
    "In.ATA",
    "In.Mvt.",
    "Out.Carr.",
    "Out.Flt. No.",
    "Out.Su",
    "Out.Brd Pt",
    "Out.Off Pt",
    "Out.Dep. Date",
    "Out.STD",
    "Out.Pcs.",
    "Out.Wt.",
    "Out.Vol.",
    "L.Vol",
    "Out.Booking",
    "Out.Mvt.",
    "Out.ULD",
    "Out.MCT.Actl.",
    "Out.MCT.Stnd.",
    "Out.MCT.Diff.",
    "Out.MCT.THC",
    "Load In - Out",
    "Product",
    "SHC",
    "Commodity",
    "Manifest Desc.",
    "P.Code",
    "PC",
    "THC",
    "BS",
    "PI",
    "QNN/AQNN",
    "WHS",
    "SI",
  ]

  let tsv = headers.join("\t") + "\n"

  vunList.forEach((row) => {
    tsv +=
      [
        row.serialNo || "",
        row.cargoType,
        row.docNo,
        row.origin || "",
        row.destination || "",
        row.inUld,
        row.inCarrier,
        row.inFlightNo,
        row.inSu,
        row.inBrdPt,
        row.inOffPt,
        row.inArrDate,
        row.inAta,
        row.inMvt,
        row.outCarrier,
        row.outFlightNo,
        row.outSu,
        row.outBrdPt,
        row.outOffPt,
        row.outDepDate,
        row.outStd,
        row.outPcs,
        row.outWt,
        row.outVol,
        row.lvol || "",
        row.outBooking,
        row.outMvt,
        row.outUld,
        row.outMctActl,
        row.outMctStnd,
        row.outMctDiff,
        row.outMctThc,
        row.loadInOut,
        row.product,
        row.shc,
        row.commodity,
        row.manifestDesc,
        row.pcode || "",
        row.pc || "",
        row.thc || "",
        row.bs || "",
        row.pi || "",
        row.qnnAqnn || "",
        row.whs || "",
        row.si || "",
      ].join("\t") + "\n"
  })

  return tsv
}

export function exportQRTListToCSV(qrtList: QRTListRow[]): string {
  const headers = [
    "Serial No.",
    "Doc No.",
    "Origin",
    "Destination",
    "Carrier",
    "Flt No.",
    "Off Pt",
    "Dep. Date",
    "STD",
    "Pcs",
    "Weight",
    "Volume",
    "L.Vol",
    "MCT",
    "ULD",
    "SHC",
    "Manifest Desc.",
    "P.Code",
    "PC",
    "THC",
    "BS",
    "PI",
    "Arr Dt/Time",
    "QNN/AQNN",
    "WHS",
    "SI",
  ]

  let csv = headers.join(",") + "\n"

  qrtList.forEach((row) => {
    csv +=
      [
        ` ${row.serialNo || ""}`,
        ` ${row.docNo}`,
        ` ${row.origin || ""}`,
        ` ${row.destination || ""}`,
        ` ${row.carrier}`,
        ` ${row.flightNo}`,
        ` ${row.outOffPt}`,
        ` ${row.depDate}`,
        ` ${row.std}`,
        row.pcs || "",
        row.weight || "",
        row.volume || "",
        row.lvol || "",
        ` ${row.mct}`,
        ` ${row.uld}`,
        ` ${row.shc}`,
        ` ${row.manifestDesc}`,
        ` ${row.pcode || ""}`,
        ` ${row.pc || ""}`,
        ` ${row.thc || ""}`,
        ` ${row.bs || ""}`,
        ` ${row.pi || ""}`,
        ` ${row.arrDtTime || ""}`,
        ` ${row.qnnAqnn || ""}`,
        ` ${row.whs || ""}`,
        ` ${row.si || ""}`,
      ].join(",") + "\n"
  })

  return csv
}

export function exportQRTListToXLSX(qrtList: QRTListRow[]): string {
  const headers = [
    "Serial No.",
    "Doc No.",
    "Origin",
    "Destination",
    "Carrier",
    "Flt No.",
    "Off Pt",
    "Dep. Date",
    "STD",
    "Pcs",
    "Weight",
    "Volume",
    "L.Vol",
    "MCT",
    "ULD",
    "SHC",
    "Manifest Desc.",
    "P.Code",
    "PC",
    "THC",
    "BS",
    "PI",
    "Arr Dt/Time",
    "QNN/AQNN",
    "WHS",
    "SI",
  ]

  let tsv = headers.join("\t") + "\n"

  qrtList.forEach((row) => {
    tsv +=
      [
        row.serialNo || "",
        row.docNo,
        row.origin || "",
        row.destination || "",
        row.carrier,
        row.flightNo,
        row.outOffPt,
        row.depDate,
        row.std,
        row.pcs || "",
        row.weight || "",
        row.volume || "",
        row.lvol || "",
        row.mct,
        row.uld,
        row.shc,
        row.manifestDesc,
        row.pcode || "",
        row.pc || "",
        row.thc || "",
        row.bs || "",
        row.pi || "",
        row.arrDtTime || "",
        row.qnnAqnn || "",
        row.whs || "",
        row.si || "",
      ].join("\t") + "\n"
  })

  return tsv
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
