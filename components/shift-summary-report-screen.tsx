"use client"

import { useState, useMemo } from "react"
import { EditableField } from "./editable-field"

// Types
type ULDBreakdown = {
  pmcAmf: number
  alfPla: number
  akeRke: number
  sclrPcs: number
}

type TimeWindowData = {
  planned: ULDBreakdown
  built: ULDBreakdown
  thru: ULDBreakdown
  total: ULDBreakdown
  pending: ULDBreakdown
}

type FlightData = {
  no: number
  flight: string
  etd: string
  dst: string
  staff: string
  builtPmc: number
  builtAlf: number
  builtAke: number
  thruPmc: number
  thruAlf: number
  thruAke: number
}

export default function ShiftSummaryReportScreen() {
  const [shiftType, setShiftType] = useState<"Night" | "Day">("Night")
  const [date, setDate] = useState("24/11/2025")
  const [day, setDay] = useState("Monday")
  const [shift, setShift] = useState("4")
  const [dutyHours, setDutyHours] = useState("21:00-09:00")
  const [supervisor, setSupervisor] = useState("Roosevelt")
  const [supervisorID, setSupervisorID] = useState("S416437")

  // Planned ULDs - Editable inputs (from Plan vs Advance)
  const [planned1300_1600, setPlanned1300_1600] = useState<ULDBreakdown>({
    pmcAmf: 244,
    alfPla: 14,
    akeRke: 78,
    sclrPcs: 0,
  })
  const [planned1601_2359, setPlanned1601_2359] = useState<ULDBreakdown>({
    pmcAmf: 76,
    alfPla: 11,
    akeRke: 23,
    sclrPcs: 0,
  })

  // Advance Report - Flight data (editable inputs)
  const [advanceFlights, setAdvanceFlights] = useState<FlightData[]>([
    { no: 1, flight: "0943", etd: "13:00", dst: "DXB-BGW", staff: "manu", builtPmc: 3, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 2, flight: "0502", etd: "13:15", dst: "DXB-BOM", staff: "WAHAB", builtPmc: 4, builtAlf: 1, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 3, flight: "0566", etd: "13:35", dst: "DXB-BLR", staff: "RENATO", builtPmc: 7, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 4, flight: "0041", etd: "13:40", dst: "DXB-LHR", staff: "HARLEY", builtPmc: 8, builtAlf: 1, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 5, flight: "0187", etd: "14:00", dst: "DXB-BCN", staff: "BILAL", builtPmc: 12, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
  ])
  const [bonusFlights, setBonusFlights] = useState<FlightData[]>([
    { no: 1, flight: "0839", etd: "16:00", dst: "DXB-BAH", staff: "KINTU", builtPmc: 3, builtAlf: 0, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 2, flight: "0005", etd: "16:05", dst: "DXB-LHR", staff: "HARLEY", builtPmc: 3, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 3, flight: "0648", etd: "16:10", dst: "DXB-CMB", staff: "BRIGHT", builtPmc: 5, builtAlf: 0, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
  ])

  // BUP Shift Details - Flight data (editable inputs)
  const [bupFlights, setBupFlights] = useState<FlightData[]>([
    { no: 1, flight: "0801", etd: "00:15", dst: "DXB-JED", staff: "L/OVER", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 2, flight: "0977", etd: "01:15", dst: "DXB-IKA", staff: "L/OVER", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 3, flight: "0807", etd: "01:15", dst: "DXB-MED", staff: "SOHAN", builtPmc: 1, builtAlf: 1, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 4, flight: "0815", etd: "01:25", dst: "DXB-RUH", staff: "HARLEY", builtPmc: 4, builtAlf: 2, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 5, flight: "0582", etd: "01:55", dst: "DXB-DAC", staff: "L/OVER", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
  ])

  // Calculate totals from Advance Report flights (formula: SUM from flights)
  const advanceReportTotals = useMemo(() => {
    const advanceBuilt = advanceFlights.reduce(
      (acc, f) => ({
        pmcAmf: acc.pmcAmf + f.builtPmc,
        alfPla: acc.alfPla + f.builtAlf,
        akeRke: acc.akeRke + f.builtAke,
        sclrPcs: 0,
      }),
      { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 }
    )
    const advanceThru = advanceFlights.reduce(
      (acc, f) => ({
        pmcAmf: acc.pmcAmf + f.thruPmc,
        alfPla: acc.alfPla + f.thruAlf,
        akeRke: acc.akeRke + f.thruAke,
        sclrPcs: 0,
      }),
      { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 }
    )
    const bonusBuilt = bonusFlights.reduce(
      (acc, f) => ({
        pmcAmf: acc.pmcAmf + f.builtPmc,
        alfPla: acc.alfPla + f.builtAlf,
        akeRke: acc.akeRke + f.builtAke,
        sclrPcs: 0,
      }),
      { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 }
    )
    const bonusThru = bonusFlights.reduce(
      (acc, f) => ({
        pmcAmf: acc.pmcAmf + f.thruPmc,
        alfPla: acc.alfPla + f.thruAlf,
        akeRke: acc.akeRke + f.thruAke,
        sclrPcs: 0,
      }),
      { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 }
    )

    return {
      advanceBuilt,
      advanceThru,
      bonusBuilt,
      bonusThru,
      totalBuilt: {
        pmcAmf: advanceBuilt.pmcAmf + bonusBuilt.pmcAmf,
        alfPla: advanceBuilt.alfPla + bonusBuilt.alfPla,
        akeRke: advanceBuilt.akeRke + bonusBuilt.akeRke,
        sclrPcs: 0,
      },
      totalThru: {
        pmcAmf: advanceThru.pmcAmf + bonusThru.pmcAmf,
        alfPla: advanceThru.alfPla + bonusThru.alfPla,
        akeRke: advanceThru.akeRke + bonusThru.akeRke,
        sclrPcs: 0,
      },
    }
  }, [advanceFlights, bonusFlights])

  // Calculate BUP Shift Details totals (formula: SUM from flights)
  const bupTotals = useMemo(() => {
    return bupFlights.reduce(
      (acc, f) => ({
        built: {
          pmcAmf: acc.built.pmcAmf + f.builtPmc,
          alfPla: acc.built.alfPla + f.builtAlf,
          akeRke: acc.built.akeRke + f.builtAke,
          sclrPcs: 0,
        },
        thru: {
          pmcAmf: acc.thru.pmcAmf + f.thruPmc,
          alfPla: acc.thru.alfPla + f.thruAlf,
          akeRke: acc.thru.akeRke + f.thruAke,
          sclrPcs: 0,
        },
      }),
      {
        built: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 },
        thru: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 },
      }
    )
  }, [bupFlights])

  // Calculate Plan vs Advance totals (formula: Built + Thru)
  const time1300_1600 = useMemo((): TimeWindowData => {
    const built = advanceReportTotals.advanceBuilt
    const thru = advanceReportTotals.advanceThru
    const total = {
      pmcAmf: built.pmcAmf + thru.pmcAmf,
      alfPla: built.alfPla + thru.alfPla,
      akeRke: built.akeRke + thru.akeRke,
      sclrPcs: 0,
    }
    const pending = {
      pmcAmf: planned1300_1600.pmcAmf - total.pmcAmf,
      alfPla: planned1300_1600.alfPla - total.alfPla,
      akeRke: planned1300_1600.akeRke - total.akeRke,
      sclrPcs: 0,
    }
    return { planned: planned1300_1600, built, thru, total, pending }
  }, [planned1300_1600, advanceReportTotals.advanceBuilt, advanceReportTotals.advanceThru])

  const time1601_2359 = useMemo((): TimeWindowData => {
    const built = advanceReportTotals.bonusBuilt
    const thru = advanceReportTotals.bonusThru
    const total = {
      pmcAmf: built.pmcAmf + thru.pmcAmf,
      alfPla: built.alfPla + thru.alfPla,
      akeRke: built.akeRke + thru.akeRke,
      sclrPcs: 0,
    }
    const pending = {
      pmcAmf: planned1601_2359.pmcAmf - total.pmcAmf,
      alfPla: planned1601_2359.alfPla - total.alfPla,
      akeRke: planned1601_2359.akeRke - total.akeRke,
      sclrPcs: 0,
    }
    return { planned: planned1601_2359, built, thru, total, pending }
  }, [planned1601_2359, advanceReportTotals.bonusBuilt, advanceReportTotals.bonusThru])

  // Calculate total advance and total pending
  const totalAdvance = useMemo(() => ({
    pmcAmf: time1300_1600.total.pmcAmf + time1601_2359.total.pmcAmf,
    alfPla: time1300_1600.total.alfPla + time1601_2359.total.alfPla,
    akeRke: time1300_1600.total.akeRke + time1601_2359.total.akeRke,
    sclrPcs: 0,
  }), [time1300_1600, time1601_2359])

  const totalPending = useMemo(() => ({
    pmcAmf: time1300_1600.pending.pmcAmf + time1601_2359.pending.pmcAmf,
    alfPla: time1300_1600.pending.alfPla + time1601_2359.pending.alfPla,
    akeRke: time1300_1600.pending.akeRke + time1601_2359.pending.akeRke,
    sclrPcs: 0,
  }), [time1300_1600, time1601_2359])

  // Helper to calculate total from breakdown
  const getTotal = (breakdown: ULDBreakdown) =>
    breakdown.pmcAmf + breakdown.alfPla + breakdown.akeRke + breakdown.sclrPcs

  // Helper to update flight data
  const updateFlight = (
    flights: FlightData[],
    setFlights: React.Dispatch<React.SetStateAction<FlightData[]>>,
    index: number,
    field: keyof FlightData,
    value: string | number
  ) => {
    const updated = [...flights]
    updated[index] = { ...updated[index], [field]: value }
    setFlights(updated)
  }

  return (
    <div className="min-h-screen bg-white p-2" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}>
      <div className="max-w-full space-y-2">
        {/* TOP SECTION: Advance Planned vs Built */}
        <div className="border border-gray-400 p-2 bg-white">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="text-xs font-semibold mb-1">Advance planned v/s Built</div>
              <div className="text-xs text-gray-600">
                <span className="mr-4">Date</span>
                <EditableField value={date} onChange={setDate} className="text-xs" />
                <span className="mx-2">|</span>
                <span className="mr-2">Day</span>
                <EditableField value={day} onChange={setDay} className="text-xs" />
        </div>
                </div>
            <div className="text-right text-xs text-gray-600">
              <div>
                <span className="mr-2">Shift</span>
                <EditableField value={shift} onChange={setShift} className="text-xs w-8" />
                <span className="mx-2">|</span>
                <span className="mr-2">Duty</span>
                <EditableField value={dutyHours} onChange={setDutyHours} className="text-xs" />
              </div>
            </div>
          </div>

                {/* 1300-1600 Section */}
          <div className="mb-3">
            <div className="text-xs font-semibold mb-1">1300-1600</div>
            <div className="grid grid-cols-3 gap-2">
                    {/* Planned */}
              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">Planned</div>
                <table className="w-full text-xs border-collapse">
                        <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-1 py-0.5 text-left">Details</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">PMC-AMF</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">ALF-PLA</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">AKE-RKE</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">SCLR Pcs</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Planned</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">
                        <EditableField
                          value={planned1300_1600.pmcAmf.toString()}
                          onChange={(v) =>
                            setPlanned1300_1600((prev) => ({ ...prev, pmcAmf: parseInt(v) || 0 }))
                          }
                          type="number"
                          className="w-12 text-right text-xs"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">
                        <EditableField
                          value={planned1300_1600.alfPla.toString()}
                          onChange={(v) =>
                            setPlanned1300_1600((prev) => ({ ...prev, alfPla: parseInt(v) || 0 }))
                          }
                          type="number"
                          className="w-12 text-right text-xs"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">
                        <EditableField
                          value={planned1300_1600.akeRke.toString()}
                          onChange={(v) =>
                            setPlanned1300_1600((prev) => ({ ...prev, akeRke: parseInt(v) || 0 }))
                          }
                          type="number"
                          className="w-12 text-right text-xs"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">
                        <EditableField
                          value={planned1300_1600.sclrPcs.toString()}
                          onChange={(v) =>
                            setPlanned1300_1600((prev) => ({ ...prev, sclrPcs: parseInt(v) || 0 }))
                          }
                          type="number"
                          className="w-12 text-right text-xs"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold bg-gray-50">
                        {getTotal(planned1300_1600)}
                      </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Advance Built */}
              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">Advance built</div>
                <table className="w-full text-xs border-collapse">
                        <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-1 py-0.5 text-left">Details</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">PMC-AMF</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">ALF-PLA</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">AKE-RKE</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">SCLR Pcs</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Built</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.built.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.built.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.built.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.built.sclrPcs}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(time1300_1600.built)}</td>
                          </tr>
                          <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Thru</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.thru.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.thru.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.thru.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.thru.sclrPcs}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(time1300_1600.thru)}</td>
                          </tr>
                    <tr className="bg-gray-200 font-semibold">
                      <td className="border border-gray-400 px-1 py-0.5">TOTAL</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.total.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.total.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.total.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.total.sclrPcs}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(time1300_1600.total)}</td>
                          </tr>
                        </tbody>
                      </table>
                  </div>

                  {/* Pending */}
              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">Pending</div>
                <table className="w-full text-xs border-collapse">
                      <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-1 py-0.5 text-left">ULD Details</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">PMC-AMF</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">ALF-PLA</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">AKE-RKE</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">SCLR Pcs</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">To action</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.pending.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.pending.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.pending.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.pending.sclrPcs}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold bg-gray-50">
                        {getTotal(time1300_1600.pending)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
              </div>
                  </div>
                </div>

                {/* 1601-2359 Section */}
          <div className="mb-3">
            <div className="text-xs font-semibold mb-1">1601-2359</div>
            <div className="grid grid-cols-3 gap-2">
                    {/* Planned */}
              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">Planned</div>
                <table className="w-full text-xs border-collapse">
                        <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-1 py-0.5 text-left">Details</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">PMC-AMF</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">ALF-PLA</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">AKE-RKE</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">SCLR Pcs</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Planned</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">
                        <EditableField
                          value={planned1601_2359.pmcAmf.toString()}
                          onChange={(v) =>
                            setPlanned1601_2359((prev) => ({ ...prev, pmcAmf: parseInt(v) || 0 }))
                          }
                          type="number"
                          className="w-12 text-right text-xs"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">
                        <EditableField
                          value={planned1601_2359.alfPla.toString()}
                          onChange={(v) =>
                            setPlanned1601_2359((prev) => ({ ...prev, alfPla: parseInt(v) || 0 }))
                          }
                          type="number"
                          className="w-12 text-right text-xs"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">
                        <EditableField
                          value={planned1601_2359.akeRke.toString()}
                          onChange={(v) =>
                            setPlanned1601_2359((prev) => ({ ...prev, akeRke: parseInt(v) || 0 }))
                          }
                          type="number"
                          className="w-12 text-right text-xs"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">
                        <EditableField
                          value={planned1601_2359.sclrPcs.toString()}
                          onChange={(v) =>
                            setPlanned1601_2359((prev) => ({ ...prev, sclrPcs: parseInt(v) || 0 }))
                          }
                          type="number"
                          className="w-12 text-right text-xs"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold bg-gray-50">
                        {getTotal(planned1601_2359)}
                      </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Advance Built */}
              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">Advance built</div>
                <table className="w-full text-xs border-collapse">
                        <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-1 py-0.5 text-left">Details</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">PMC-AMF</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">ALF-PLA</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">AKE-RKE</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">SCLR Pcs</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Built</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.built.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.built.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.built.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.built.sclrPcs}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(time1601_2359.built)}</td>
                          </tr>
                          <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Thru</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.thru.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.thru.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.thru.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.thru.sclrPcs}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(time1601_2359.thru)}</td>
                          </tr>
                    <tr className="bg-gray-200 font-semibold">
                      <td className="border border-gray-400 px-1 py-0.5">TOTAL</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.total.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.total.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.total.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.total.sclrPcs}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(time1601_2359.total)}</td>
                          </tr>
                        </tbody>
                      </table>
                  </div>

                  {/* Pending */}
              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">Pending</div>
                <table className="w-full text-xs border-collapse">
                      <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-1 py-0.5 text-left">ULD Details</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">PMC-AMF</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">ALF-PLA</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">AKE-RKE</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">SCLR Pcs</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">To action</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.pending.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.pending.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.pending.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.pending.sclrPcs}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold bg-gray-50">
                        {getTotal(time1601_2359.pending)}
                      </td>
                        </tr>
                      </tbody>
                    </table>
              </div>
                  </div>
                </div>

          {/* Total Advance and Total Pending */}
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-gray-400">
              <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">Total Advance</div>
              <table className="w-full text-xs border-collapse">
                      <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-1 py-0.5 text-left">Details</th>
                    <th className="border border-gray-400 px-1 py-0.5 text-right">PMC-AMF</th>
                    <th className="border border-gray-400 px-1 py-0.5 text-right">ALF-PLA</th>
                    <th className="border border-gray-400 px-1 py-0.5 text-right">AKE-RKE</th>
                    <th className="border border-gray-400 px-1 py-0.5 text-right">SCLR Pcs</th>
                    <th className="border border-gray-400 px-1 py-0.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                    <td className="border border-gray-400 px-1 py-0.5">1300-1600</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.total.pmcAmf}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.total.alfPla}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.total.akeRke}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.total.sclrPcs}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(time1300_1600.total)}</td>
                        </tr>
                        <tr>
                    <td className="border border-gray-400 px-1 py-0.5">1601-2359</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.total.pmcAmf}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.total.alfPla}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.total.akeRke}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.total.sclrPcs}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(time1601_2359.total)}</td>
                        </tr>
                  <tr className="bg-gray-200 font-semibold">
                    <td className="border border-gray-400 px-1 py-0.5">TOTAL</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{totalAdvance.pmcAmf}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{totalAdvance.alfPla}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{totalAdvance.akeRke}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{totalAdvance.sclrPcs}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(totalAdvance)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

            <div className="border border-gray-400">
              <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">Total Pending</div>
              <table className="w-full text-xs border-collapse">
                      <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-1 py-0.5 text-left">Details</th>
                    <th className="border border-gray-400 px-1 py-0.5 text-right">PMC-AMF</th>
                    <th className="border border-gray-400 px-1 py-0.5 text-right">ALF-PLA</th>
                    <th className="border border-gray-400 px-1 py-0.5 text-right">AKE-RKE</th>
                    <th className="border border-gray-400 px-1 py-0.5 text-right">SCLR Pcs</th>
                    <th className="border border-gray-400 px-1 py-0.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                    <td className="border border-gray-400 px-1 py-0.5">1300-1600</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.pending.pmcAmf}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.pending.alfPla}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.pending.akeRke}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1300_1600.pending.sclrPcs}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(time1300_1600.pending)}</td>
                        </tr>
                        <tr>
                    <td className="border border-gray-400 px-1 py-0.5">1601-2359</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.pending.pmcAmf}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.pending.alfPla}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.pending.akeRke}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{time1601_2359.pending.sclrPcs}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(time1601_2359.pending)}</td>
                        </tr>
                  <tr className="bg-gray-200 font-semibold">
                    <td className="border border-gray-400 px-1 py-0.5">TOTAL</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{totalPending.pmcAmf}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{totalPending.alfPla}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{totalPending.akeRke}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{totalPending.sclrPcs}</td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(totalPending)}</td>
                        </tr>
                      </tbody>
                    </table>
                      </div>
                    </div>
                  </div>

        {/* BOTTOM SECTION: Split into Left and Right */}
                      <div className="grid grid-cols-2 gap-2">
          {/* BOTTOM LEFT: BUP Shift Details */}
          <div className="border border-gray-400 p-2 bg-white">
            <div className="text-xs font-semibold mb-1">
              BUILD UP // {date.toUpperCase()} // SHIFT : {shift} // {dutyHours}HRS
                      </div>
            <div className="mb-2">
              <div className="text-xs mb-1">Checked by Supervisor</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-medium">
                    <EditableField value={supervisor} onChange={setSupervisor} className="text-xs" />
                          </div>
                  <div className="text-gray-600">
                    <EditableField value={supervisorID} onChange={setSupervisorID} className="text-xs" />
                          </div>
                          </div>
                          </div>
                          </div>

            {/* Allocation Table */}
            <div className="border border-gray-400">
              <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">Allocation</div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      <th className="border border-gray-400 px-1 py-0.5 text-left">No</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-left">Flight</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-left">ETD</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-left">DST</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-left">Staff</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">PMC/AMF</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">ALF/PLA</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">AKE/AKL</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bupFlights.map((flight, index) => (
                      <tr key={index}>
                        <td className="border border-gray-400 px-1 py-0.5">{flight.no}</td>
                        <td className="border border-gray-400 px-1 py-0.5">
                          <EditableField
                            value={flight.flight}
                            onChange={(v) => updateFlight(bupFlights, setBupFlights, index, "flight", v)}
                            className="font-semibold text-xs"
                          />
                        </td>
                        <td className="border border-gray-400 px-1 py-0.5">
                          <EditableField
                            value={flight.etd}
                            onChange={(v) => updateFlight(bupFlights, setBupFlights, index, "etd", v)}
                            className="text-xs"
                          />
                        </td>
                        <td className="border border-gray-400 px-1 py-0.5">
                          <EditableField
                            value={flight.dst}
                            onChange={(v) => updateFlight(bupFlights, setBupFlights, index, "dst", v)}
                            className="text-xs"
                          />
                        </td>
                        <td className="border border-gray-400 px-1 py-0.5">
                          <EditableField
                            value={flight.staff}
                            onChange={(v) => updateFlight(bupFlights, setBupFlights, index, "staff", v)}
                            className="text-xs"
                          />
                        </td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">
                          <EditableField
                            value={flight.builtPmc.toString()}
                            onChange={(v) =>
                              updateFlight(bupFlights, setBupFlights, index, "builtPmc", parseInt(v) || 0)
                            }
                            type="number"
                            className="w-10 text-right text-xs"
                          />
                        </td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">
                          <EditableField
                            value={flight.builtAlf.toString()}
                            onChange={(v) =>
                              updateFlight(bupFlights, setBupFlights, index, "builtAlf", parseInt(v) || 0)
                            }
                            type="number"
                            className="w-10 text-right text-xs"
                          />
                        </td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">
                          <EditableField
                            value={flight.builtAke.toString()}
                            onChange={(v) =>
                              updateFlight(bupFlights, setBupFlights, index, "builtAke", parseInt(v) || 0)
                            }
                            type="number"
                            className="w-10 text-right text-xs"
                          />
                        </td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold bg-gray-50">
                          {flight.builtPmc + flight.builtAlf + flight.builtAke}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                </div>

            {/* ULD Analysis */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">Built ULD Details</div>
                <table className="w-full text-xs border-collapse">
                      <tbody>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Total PMC</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold">{bupTotals.built.pmcAmf}</td>
                        </tr>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Total ALF</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold">{bupTotals.built.alfPla}</td>
                        </tr>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Total AKE</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold">{bupTotals.built.akeRke}</td>
                        </tr>
                    <tr className="bg-gray-200 font-semibold">
                      <td className="border border-gray-400 px-1 py-0.5">Total ULD</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(bupTotals.built)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">Thru ULD Details</div>
                <table className="w-full text-xs border-collapse">
                      <tbody>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Total PMC</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{bupTotals.thru.pmcAmf}</td>
                        </tr>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Total ALF</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{bupTotals.thru.alfPla}</td>
                        </tr>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Total AKE</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{bupTotals.thru.akeRke}</td>
                        </tr>
                    <tr className="bg-gray-200 font-semibold">
                      <td className="border border-gray-400 px-1 py-0.5">Total ULD</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(bupTotals.thru)}</td>
                        </tr>
                      </tbody>
                    </table>
              </div>
                  </div>
                </div>

          {/* BOTTOM RIGHT: Advance Report */}
          <div className="border border-gray-400 p-2 bg-white">
            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* ADVANCE UNITS */}
              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400 text-center">ADVANCE UNITS</div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        <th className="border border-gray-400 px-1 py-0.5 text-left">FLTS</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-left">STAFF</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-center" colSpan={3}>THRU ULDS</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-center" colSpan={3}>BUILT ULDS</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">TOT</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-center" colSpan={3}>PENDING UNITS</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">TOT</th>
                      </tr>
                      <tr>
                        <th className="border border-gray-400 px-1 py-0.5"></th>
                        <th className="border border-gray-400 px-1 py-0.5"></th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">PMC</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">ALF</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">AKE</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">PMC</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">ALF</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">AKE</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right bg-gray-300"></th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">PMC</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">ALF</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">AKE</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right bg-gray-300"></th>
                        </tr>
                      </thead>
                      <tbody>
                      {advanceFlights.map((flight, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border border-gray-400 px-1 py-0.5">
                            <EditableField
                              value={flight.flight}
                              onChange={(v) => updateFlight(advanceFlights, setAdvanceFlights, index, "flight", v)}
                              className="text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5">
                            <EditableField
                              value={flight.staff}
                              onChange={(v) => updateFlight(advanceFlights, setAdvanceFlights, index, "staff", v)}
                              className="text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.thruPmc.toString()}
                              onChange={(v) =>
                                updateFlight(advanceFlights, setAdvanceFlights, index, "thruPmc", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.thruAlf.toString()}
                              onChange={(v) =>
                                updateFlight(advanceFlights, setAdvanceFlights, index, "thruAlf", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.thruAke.toString()}
                              onChange={(v) =>
                                updateFlight(advanceFlights, setAdvanceFlights, index, "thruAke", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.builtPmc.toString()}
                              onChange={(v) =>
                                updateFlight(advanceFlights, setAdvanceFlights, index, "builtPmc", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.builtAlf.toString()}
                              onChange={(v) =>
                                updateFlight(advanceFlights, setAdvanceFlights, index, "builtAlf", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.builtAke.toString()}
                              onChange={(v) =>
                                updateFlight(advanceFlights, setAdvanceFlights, index, "builtAke", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold bg-gray-300">
                            {flight.builtPmc + flight.builtAlf + flight.builtAke}
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right bg-gray-300">0</td>
                          </tr>
                        ))}
                      <tr className="bg-gray-200 font-semibold">
                        <td className="border border-gray-400 px-1 py-0.5">TTL FLTS</td>
                        <td className="border border-gray-400 px-1 py-0.5">TTL STAFF</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right" colSpan={3}>THRU ULDS</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right" colSpan={3}>BUILT ULDS</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">TOT</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right" colSpan={3}>PENDING UNITS</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">TOT</td>
                        </tr>
                      <tr className="bg-gray-200 font-semibold">
                        <td className="border border-gray-400 px-1 py-0.5">{advanceFlights.length}</td>
                        <td className="border border-gray-400 px-1 py-0.5">
                          {new Set(advanceFlights.map((f) => f.staff).filter(Boolean)).size}
                        </td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceThru.pmcAmf}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceThru.alfPla}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceThru.akeRke}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceBuilt.pmcAmf}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceBuilt.alfPla}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceBuilt.akeRke}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right bg-gray-300">
                          {getTotal(advanceReportTotals.advanceBuilt)}
                        </td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right bg-gray-300">0</td>
                          </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              {/* BONUS UNITS */}
              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400 text-center">BONUS UNITS</div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        <th className="border border-gray-400 px-1 py-0.5 text-left">FLTS</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-left">STAFF</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-center" colSpan={3}>THRU ULDS</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-center" colSpan={3}>BUILT ULDS</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">TOT</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-center" colSpan={3}>PENDING UNITS</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">TOT</th>
                        </tr>
                        <tr>
                        <th className="border border-gray-400 px-1 py-0.5"></th>
                        <th className="border border-gray-400 px-1 py-0.5"></th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">PMC</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">ALF</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">AKE</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">PMC</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">ALF</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">AKE</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right bg-gray-300"></th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">PMC</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">ALF</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right">AKE</th>
                        <th className="border border-gray-400 px-1 py-0.5 text-right bg-gray-300"></th>
                        </tr>
                      </thead>
                      <tbody>
                      {bonusFlights.map((flight, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border border-gray-400 px-1 py-0.5">
                            <EditableField
                              value={flight.flight}
                              onChange={(v) => updateFlight(bonusFlights, setBonusFlights, index, "flight", v)}
                              className="text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5">
                            <EditableField
                              value={flight.staff}
                              onChange={(v) => updateFlight(bonusFlights, setBonusFlights, index, "staff", v)}
                              className="text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.thruPmc.toString()}
                              onChange={(v) =>
                                updateFlight(bonusFlights, setBonusFlights, index, "thruPmc", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.thruAlf.toString()}
                              onChange={(v) =>
                                updateFlight(bonusFlights, setBonusFlights, index, "thruAlf", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.thruAke.toString()}
                              onChange={(v) =>
                                updateFlight(bonusFlights, setBonusFlights, index, "thruAke", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.builtPmc.toString()}
                              onChange={(v) =>
                                updateFlight(bonusFlights, setBonusFlights, index, "builtPmc", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.builtAlf.toString()}
                              onChange={(v) =>
                                updateFlight(bonusFlights, setBonusFlights, index, "builtAlf", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">
                            <EditableField
                              value={flight.builtAke.toString()}
                              onChange={(v) =>
                                updateFlight(bonusFlights, setBonusFlights, index, "builtAke", parseInt(v) || 0)
                              }
                              type="number"
                              className="w-8 text-right text-xs"
                            />
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold bg-gray-300">
                            {flight.builtPmc + flight.builtAlf + flight.builtAke}
                          </td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                          <td className="border border-gray-400 px-1 py-0.5 text-right bg-gray-300">0</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-200 font-semibold">
                        <td className="border border-gray-400 px-1 py-0.5">TTL FLTS</td>
                        <td className="border border-gray-400 px-1 py-0.5">TTL STAFF</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right" colSpan={3}>THRU ULDS</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right" colSpan={3}>BUILT ULDS</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">TOT</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right" colSpan={3}>PENDING UNITS</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">TOT</td>
                        </tr>
                      <tr className="bg-gray-200 font-semibold">
                        <td className="border border-gray-400 px-1 py-0.5">{bonusFlights.length}</td>
                        <td className="border border-gray-400 px-1 py-0.5">
                          {new Set(bonusFlights.map((f) => f.staff).filter(Boolean)).size}
                        </td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusThru.pmcAmf}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusThru.alfPla}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusThru.akeRke}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusBuilt.pmcAmf}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusBuilt.alfPla}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusBuilt.akeRke}</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right bg-gray-300">
                          {getTotal(advanceReportTotals.bonusBuilt)}
                        </td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right">0</td>
                        <td className="border border-gray-400 px-1 py-0.5 text-right bg-gray-300">0</td>
                        </tr>
                      </tbody>
                    </table>
                </div>
                  </div>
                </div>

                {/* Summary Totals */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">ADVANCE UNITS</div>
                <table className="w-full text-xs border-collapse">
                      <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-1 py-0.5 text-left">ULD Details</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">PMC</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">ALF</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">AKE</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Units-Built</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceBuilt.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceBuilt.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceBuilt.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold bg-gray-50">
                        {getTotal(advanceReportTotals.advanceBuilt)}
                      </td>
                        </tr>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Thru Units</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceThru.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceThru.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceThru.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">
                        {getTotal(advanceReportTotals.advanceThru)}
                      </td>
                        </tr>
                    <tr className="bg-gray-200 font-semibold">
                      <td className="border border-gray-400 px-1 py-0.5">Total</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceBuilt.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceBuilt.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.advanceBuilt.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(advanceReportTotals.advanceBuilt)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

              <div className="border border-gray-400">
                <div className="bg-gray-200 px-1 py-0.5 text-xs font-semibold border-b border-gray-400">BONUS UNITS</div>
                <table className="w-full text-xs border-collapse">
                      <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-1 py-0.5 text-left">ULD Details</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">PMC</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">ALF</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">AKE</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Units-Built</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusBuilt.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusBuilt.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusBuilt.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right font-semibold bg-gray-50">
                        {getTotal(advanceReportTotals.bonusBuilt)}
                      </td>
                        </tr>
                        <tr>
                      <td className="border border-gray-400 px-1 py-0.5">Thru Units</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusThru.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusThru.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusThru.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">
                        {getTotal(advanceReportTotals.bonusThru)}
                      </td>
                        </tr>
                    <tr className="bg-gray-200 font-semibold">
                      <td className="border border-gray-400 px-1 py-0.5">Total</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusBuilt.pmcAmf}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusBuilt.alfPla}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{advanceReportTotals.bonusBuilt.akeRke}</td>
                      <td className="border border-gray-400 px-1 py-0.5 text-right">{getTotal(advanceReportTotals.bonusBuilt)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Grand Totals */}
            <div className="mt-2 border border-gray-400 bg-gray-100 p-1">
              <div className="text-xs font-semibold mb-1">TOTAL BUILT UNITS (ADVANCE + BONUS)</div>
              <div className="text-base font-bold" style={{ color: "#8B0000" }}>
                {getTotal(advanceReportTotals.totalBuilt)}
                    </div>
                    </div>
                  </div>
                </div>
      </div>
    </div>
  )
}
