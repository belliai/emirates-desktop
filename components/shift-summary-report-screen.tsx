"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Data from CSV files - Plan vs Advance
const planVsAdvanceData = {
  time1300_1600: {
    planned: { pmcAmf: 244, alfPla: 14, akeRke: 78, sclrPcs: 0, total: 336 },
    built: { pmcAmf: 192, alfPla: 14, akeRke: 64, sclrPcs: 0, total: 270 },
    thru: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0, total: 0 },
    total: { pmcAmf: 192, alfPla: 14, akeRke: 64, sclrPcs: 0, total: 270 },
    pending: { pmcAmf: 52, alfPla: 0, akeRke: 14, sclrPcs: 0, total: 66 },
  },
  time1601_2359: {
    planned: { pmcAmf: 76, alfPla: 11, akeRke: 23, sclrPcs: 0, total: 110 },
    built: { pmcAmf: 39, alfPla: 1, akeRke: 12, sclrPcs: 0, total: 52 },
    thru: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0, total: 0 },
    total: { pmcAmf: 39, alfPla: 1, akeRke: 12, sclrPcs: 0, total: 52 },
    pending: { pmcAmf: 37, alfPla: 10, akeRke: 11, sclrPcs: 0, total: 58 },
  },
  totalAdvance: { pmcAmf: 231, alfPla: 15, akeRke: 76, sclrPcs: 0, total: 322 },
  totalPending: { pmcAmf: 89, alfPla: 10, akeRke: 25, sclrPcs: 0, total: 124 },
  dayShiftHandover: {
    pendingAdvance: 124,
    firstWave: 336,
    secondWave: 110,
    total: 446,
    staffs: 0,
    averageEfficiency: 1.90,
    overtime: 0,
    perStaffEfficiency: 22.8,
    totalStaffs: 0,
    staffsRequired: 14,
    totalULD: 322,
    aftBuilt: 0,
    totalHours: 0,
    emBuilt: 0,
    efficiency: "#DIV/0!",
    advance: 322,
    firstWavePending: 66,
    secondWavePending: 58,
    totalPending: 124,
    screeningTotal: 322,
  },
  nightShiftHandover: {
    pendingAdvance: 124,
    firstWave: 336,
    secondWave: 110,
    total: 446,
    pendingULDsTill1600: 66,
    pendingULDsFrom1600: 58,
    pendingTotal: 248,
    staffs: 42,
    averageEfficiency: 1.90,
    overtime: 5,
    perStaffEfficiency: 23,
    totalStaffs: 47,
    staffsRequired: 44,
    totalULD: 992,
    emBuilt: 77,
    totalHours: 530,
    lmBuilt: 593,
    efficiency: 1.87,
    advance: 322,
    firstWavePending: 66,
    secondWavePending: 58,
    totalPending: 124,
    screeningTotal: 992,
    plannedPcs: 1602,
    builtPcs: 1602,
    supervisor: "Roosevelt",
    emPending: 77,
    lmPending: 371,
  },
}

// Data from Advance Report CSV
const advanceReportData = {
  advanceUnits: {
    totalFlights: 40,
    totalStaff: 40,
    thruULDs: { pmc: 0, alf: 0, ake: 0 },
    builtULDs: { pmc: 192, alf: 14, ake: 64 },
    total: 270,
    pendingUnits: { pmc: 0, alf: 0, ake: 0 },
    totalPending: 0,
  },
  bonusUnits: {
    totalFlights: 28,
    totalStaff: 28,
    thruULDs: { pmc: 0, alf: 0, ake: 0 },
    builtULDs: { pmc: 39, alf: 1, ake: 12 },
    total: 52,
    pendingUnits: { pmc: 0, alf: 0, ake: 0 },
    totalPending: 0,
  },
  totalBuiltUnits: 322,
  totalPendingUnits: 0,
}

// Sample flight data from BUP Shift Details Night CSV (simplified for display)
const bupShiftDetailsData = {
  shift: "04",
  dutyHours: "21:00-09:00",
  date: "24TH NOV2025",
  supervisor: "Roosevelt",
  supervisorID: "S416437",
  totalULDs: {
    pmc: 616,
    alf: 59,
    ake: 317,
    total: 992,
  },
  thruULDs: {
    pmc: 0,
    alf: 0,
    ake: 0,
    total: 0,
  },
  flights: [
    { no: 1, flight: "0801", etd: "00:15", dst: "DXB-JED", staff: "L/OVER", pmc: 0, alf: 0, ake: 0, total: 0 },
    { no: 2, flight: "0977", etd: "01:15", dst: "DXB-IKA", staff: "L/OVER", pmc: 0, alf: 0, ake: 0, total: 0 },
    { no: 3, flight: "0807", etd: "01:15", dst: "DXB-MED", staff: "SOHAN", pmc: 1, alf: 1, ake: 0, total: 1 },
    // Add more flights as needed - truncated for brevity
  ],
  staffDetails: [
    { srNo: 1, name: "DAVID", staffNo: "439111", flightCount: 0, uldCount: 0, deployment: "Chaser", contact: "", dutyHours: "12", actualHours: "12" },
    { srNo: 2, name: "MARK", staffNo: "418664", flightCount: 0, uldCount: 0, deployment: "RXS", contact: "", dutyHours: "12", actualHours: "12" },
    // Add more staff as needed
  ],
}

export default function ShiftSummaryReportScreen() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["plan-vs-advance", "bup-shift-details", "advance-report"])
  )

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">Shift Summary Report</h2>
          <p className="text-sm text-gray-500 mt-1">Date: 24/11/2025 | Day: Monday | Shift: 4 | Duty: 21:00-09:00</p>
        </div>

        {/* Plan vs Advance Section - Top Header */}
        <Collapsible
          open={expandedSections.has("plan-vs-advance")}
          onOpenChange={() => toggleSection("plan-vs-advance")}
        >
          <div className="bg-white rounded-lg border border-gray-200 mb-4">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  {expandedSections.has("plan-vs-advance") ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <h3 className="text-sm font-semibold text-gray-900">Advance planned v/s Built</h3>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4">
                {/* 1300-1600 Section */}
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-gray-700 mb-3">1300-1600</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Planned */}
                    <div className="border border-gray-200 rounded p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Planned</h5>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1 text-left">Details</th>
                            <th className="px-2 py-1 text-right">PMC-AMF</th>
                            <th className="px-2 py-1 text-right">ALF-PLA</th>
                            <th className="px-2 py-1 text-right">AKE-RKE</th>
                            <th className="px-2 py-1 text-right">SCLR Pcs</th>
                            <th className="px-2 py-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-2 py-1">Planned</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.planned.pmcAmf}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.planned.alfPla}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.planned.akeRke}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.planned.sclrPcs}</td>
                            <td className="px-2 py-1 text-right font-semibold">{planVsAdvanceData.time1300_1600.planned.total}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Advance Built */}
                    <div className="border border-gray-200 rounded p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Advance Built</h5>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1 text-left">Details</th>
                            <th className="px-2 py-1 text-right">PMC-AMF</th>
                            <th className="px-2 py-1 text-right">ALF-PLA</th>
                            <th className="px-2 py-1 text-right">AKE-RKE</th>
                            <th className="px-2 py-1 text-right">SCLR Pcs</th>
                            <th className="px-2 py-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-2 py-1">Built</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.built.pmcAmf}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.built.alfPla}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.built.akeRke}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.built.sclrPcs}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.built.total}</td>
                          </tr>
                          <tr>
                            <td className="px-2 py-1">Thru</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.thru.pmcAmf}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.thru.alfPla}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.thru.akeRke}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.thru.sclrPcs}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.thru.total}</td>
                          </tr>
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-2 py-1">TOTAL</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.total.pmcAmf}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.total.alfPla}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.total.akeRke}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.total.sclrPcs}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.total.total}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pending */}
                  <div className="mt-3 border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Pending</h5>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">ULD Details</th>
                          <th className="px-2 py-1 text-right">PMC-AMF</th>
                          <th className="px-2 py-1 text-right">ALF-PLA</th>
                          <th className="px-2 py-1 text-right">AKE-RKE</th>
                          <th className="px-2 py-1 text-right">SCLR Pcs</th>
                          <th className="px-2 py-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">To action</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.pending.pmcAmf}</td>
                          <td className={`px-2 py-1 text-right ${planVsAdvanceData.time1300_1600.pending.alfPla === 0 ? 'bg-green-100' : ''}`}>
                            {planVsAdvanceData.time1300_1600.pending.alfPla}
                          </td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.pending.akeRke}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.pending.sclrPcs}</td>
                          <td className="px-2 py-1 text-right font-semibold">{planVsAdvanceData.time1300_1600.pending.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 1601-2359 Section */}
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-gray-700 mb-3">1601-2359</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Planned */}
                    <div className="border border-gray-200 rounded p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Planned</h5>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1 text-left">Details</th>
                            <th className="px-2 py-1 text-right">PMC-AMF</th>
                            <th className="px-2 py-1 text-right">ALF-PLA</th>
                            <th className="px-2 py-1 text-right">AKE-RKE</th>
                            <th className="px-2 py-1 text-right">SCLR Pcs</th>
                            <th className="px-2 py-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-2 py-1">Planned</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.planned.pmcAmf}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.planned.alfPla}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.planned.akeRke}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.planned.sclrPcs}</td>
                            <td className="px-2 py-1 text-right font-semibold">{planVsAdvanceData.time1601_2359.planned.total}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Advance Built */}
                    <div className="border border-gray-200 rounded p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Advance Built</h5>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1 text-left">Details</th>
                            <th className="px-2 py-1 text-right">PMC-AMF</th>
                            <th className="px-2 py-1 text-right">ALF-PLA</th>
                            <th className="px-2 py-1 text-right">AKE-RKE</th>
                            <th className="px-2 py-1 text-right">SCLR Pcs</th>
                            <th className="px-2 py-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-2 py-1">Built</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.built.pmcAmf}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.built.alfPla}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.built.akeRke}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.built.sclrPcs}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.built.total}</td>
                          </tr>
                          <tr>
                            <td className="px-2 py-1">Thru</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.thru.pmcAmf}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.thru.alfPla}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.thru.akeRke}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.thru.sclrPcs}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.thru.total}</td>
                          </tr>
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-2 py-1">TOTAL</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.total.pmcAmf}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.total.alfPla}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.total.akeRke}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.total.sclrPcs}</td>
                            <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.total.total}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pending */}
                  <div className="mt-3 border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Pending</h5>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">ULD Details</th>
                          <th className="px-2 py-1 text-right">PMC-AMF</th>
                          <th className="px-2 py-1 text-right">ALF-PLA</th>
                          <th className="px-2 py-1 text-right">AKE-RKE</th>
                          <th className="px-2 py-1 text-right">SCLR Pcs</th>
                          <th className="px-2 py-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">To action</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.pending.pmcAmf}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.pending.alfPla}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.pending.akeRke}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.pending.sclrPcs}</td>
                          <td className="px-2 py-1 text-right font-semibold">{planVsAdvanceData.time1601_2359.pending.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Advance and Total Pending Summary */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Total Advance</h5>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">Details</th>
                          <th className="px-2 py-1 text-right">PMC-AMF</th>
                          <th className="px-2 py-1 text-right">ALF-PLA</th>
                          <th className="px-2 py-1 text-right">AKE-RKE</th>
                          <th className="px-2 py-1 text-right">SCLR Pcs</th>
                          <th className="px-2 py-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">1300-1600</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.total.pmcAmf}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.total.alfPla}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.total.akeRke}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.total.sclrPcs}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.total.total}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">1601-2359</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.total.pmcAmf}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.total.alfPla}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.total.akeRke}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.total.sclrPcs}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.total.total}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-2 py-1">TOTAL</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.totalAdvance.pmcAmf}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.totalAdvance.alfPla}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.totalAdvance.akeRke}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.totalAdvance.sclrPcs}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.totalAdvance.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Total Pending</h5>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">Details</th>
                          <th className="px-2 py-1 text-right">PMC-AMF</th>
                          <th className="px-2 py-1 text-right">ALF-PLA</th>
                          <th className="px-2 py-1 text-right">AKE-RKE</th>
                          <th className="px-2 py-1 text-right">SCLR Pcs</th>
                          <th className="px-2 py-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">1300-1600</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.pending.pmcAmf}</td>
                          <td className={`px-2 py-1 text-right ${planVsAdvanceData.time1300_1600.pending.alfPla === 0 ? 'bg-green-100' : ''}`}>
                            {planVsAdvanceData.time1300_1600.pending.alfPla}
                          </td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.pending.akeRke}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.pending.sclrPcs}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1300_1600.pending.total}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">1601-2359</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.pending.pmcAmf}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.pending.alfPla}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.pending.akeRke}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.pending.sclrPcs}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.time1601_2359.pending.total}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-2 py-1">TOTAL</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.totalPending.pmcAmf}</td>
                          <td className={`px-2 py-1 text-right ${planVsAdvanceData.totalPending.alfPla === 10 ? 'bg-green-100' : ''}`}>
                            {planVsAdvanceData.totalPending.alfPla}
                          </td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.totalPending.akeRke}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.totalPending.sclrPcs}</td>
                          <td className="px-2 py-1 text-right">{planVsAdvanceData.totalPending.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Day Shift and Night Shift Handover Sections */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {/* Day Shift Handover */}
                  <div className="border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Day Shift handover</h5>
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">24/11/2025</span>
                        <span className="text-gray-600">Day:</span>
                        <span className="font-medium">Monday</span>
                        <span className="text-gray-600">Shift:</span>
                        <span className="font-medium">4</span>
                        <span className="text-gray-600">Duty:</span>
                        <span className="font-medium">21:00-09:00</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="font-semibold mb-1">Handover Details</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Pending Advance:</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.pendingAdvance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>First Wave (06:00-09:00):</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.firstWave}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Second Wave (09:01-12:59):</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.secondWave}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>Total:</span>
                            <span>{planVsAdvanceData.dayShiftHandover.total}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="font-semibold mb-1">Man Power</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Staffs (POS+Floor+OS Staffs):</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.staffs}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Average Efficiency:</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.averageEfficiency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Overtime:</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.overtime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Per Staff Efficiency:</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.perStaffEfficiency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.totalStaffs}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold">Staffs Required:</span>
                            <span className={`font-semibold ${planVsAdvanceData.dayShiftHandover.staffsRequired === 14 ? 'bg-green-100 px-2 py-1 rounded' : ''}`}>
                              {planVsAdvanceData.dayShiftHandover.staffsRequired}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="font-semibold mb-1">Advance Built</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Total ULD:</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.totalULD}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>AFT Built:</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.aftBuilt}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Advance:</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.advance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>First Wave Pending:</span>
                            <span className={`font-medium ${planVsAdvanceData.dayShiftHandover.firstWavePending === 66 ? 'bg-green-100 px-2 py-1 rounded' : ''}`}>
                              {planVsAdvanceData.dayShiftHandover.firstWavePending}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Second Wave Pending:</span>
                            <span className="font-medium">{planVsAdvanceData.dayShiftHandover.secondWavePending}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>Total Pending:</span>
                            <span className={`${planVsAdvanceData.dayShiftHandover.totalPending === 124 ? 'bg-yellow-100 px-2 py-1 rounded' : ''}`}>
                              {planVsAdvanceData.dayShiftHandover.totalPending}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Night Shift Handover */}
                  <div className="border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Night Shift handover</h5>
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">24/11/2025</span>
                        <span className="text-gray-600">Day:</span>
                        <span className="font-medium">Monday</span>
                        <span className="text-gray-600">Shift:</span>
                        <span className="font-medium">4</span>
                        <span className="text-gray-600">Duty:</span>
                        <span className="font-medium">21:00-09:00</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="font-semibold mb-1">Handover Details</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Pending Advance:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.pendingAdvance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>First Wave (13:00-16:00):</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.firstWave}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Second Wave (16:01-23:59):</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.secondWave}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pending ULDs till 16:00:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.pendingULDsTill1600}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pending ULDs from 16:00-23:59:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.pendingULDsFrom1600}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>Pending Total:</span>
                            <span>{planVsAdvanceData.nightShiftHandover.pendingTotal}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="font-semibold mb-1">Man Power</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Staffs (POS+Floor+OS Staffs):</span>
                            <span className={`font-medium ${planVsAdvanceData.nightShiftHandover.staffs === 42 ? 'bg-red-100 px-2 py-1 rounded' : ''}`}>
                              {planVsAdvanceData.nightShiftHandover.staffs}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Average Efficiency:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.averageEfficiency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Overtime:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.overtime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Per Staff Efficiency:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.perStaffEfficiency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.totalStaffs}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold">Staffs Required:</span>
                            <span className={`font-semibold ${planVsAdvanceData.nightShiftHandover.staffsRequired === 44 ? 'bg-yellow-100 px-2 py-1 rounded' : ''}`}>
                              {planVsAdvanceData.nightShiftHandover.staffsRequired}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="font-semibold mb-1">Advance Built</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Total ULD:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.totalULD}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>E/M Built:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.emBuilt}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Hours:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.totalHours}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>L/M Built:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.lmBuilt}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Efficiency:</span>
                            <span className={`font-medium ${planVsAdvanceData.nightShiftHandover.efficiency === 1.87 ? 'bg-red-100 px-2 py-1 rounded' : ''}`}>
                              {planVsAdvanceData.nightShiftHandover.efficiency}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Advance:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.advance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>First Wave Pending:</span>
                            <span className={`font-medium ${planVsAdvanceData.nightShiftHandover.firstWavePending === 66 ? 'bg-yellow-100 px-2 py-1 rounded' : ''}`}>
                              {planVsAdvanceData.nightShiftHandover.firstWavePending}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Second Wave Pending:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.secondWavePending}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>Total Pending:</span>
                            <span className={`${planVsAdvanceData.nightShiftHandover.totalPending === 124 ? 'bg-yellow-100 px-2 py-1 rounded' : ''}`}>
                              {planVsAdvanceData.nightShiftHandover.totalPending}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="font-semibold mb-1">Screening Load</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.screeningTotal}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Planned Pcs:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.plannedPcs}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Built Pcs:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.builtPcs}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Supervisor:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.supervisor}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>E/M Pending:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.emPending}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>L/M Pending:</span>
                            <span className="font-medium">{planVsAdvanceData.nightShiftHandover.lmPending}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* BUP Shift Details Night Section */}
        <Collapsible
          open={expandedSections.has("bup-shift-details")}
          onOpenChange={() => toggleSection("bup-shift-details")}
        >
          <div className="bg-white rounded-lg border border-gray-200 mb-4">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  {expandedSections.has("bup-shift-details") ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <h3 className="text-sm font-semibold text-gray-900">BUP Shift Details Night</h3>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4">
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">
                    BUILD UP // {bupShiftDetailsData.date} // SHIFT : {bupShiftDetailsData.shift} // {bupShiftDetailsData.dutyHours}HRS
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Checked by Supervisor</div>
                      <div className="text-xs font-medium">{bupShiftDetailsData.supervisor}</div>
                      <div className="text-xs text-gray-500">{bupShiftDetailsData.supervisorID}</div>
                    </div>
                  </div>
                </div>

                {/* ULD Summary */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Built ULD Details</h5>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">Type</th>
                          <th className="px-2 py-1 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">Total PMC</td>
                          <td className="px-2 py-1 text-right font-semibold">{bupShiftDetailsData.totalULDs.pmc}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">Total ALF</td>
                          <td className="px-2 py-1 text-right font-semibold">{bupShiftDetailsData.totalULDs.alf}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">Total AKE</td>
                          <td className="px-2 py-1 text-right font-semibold">{bupShiftDetailsData.totalULDs.ake}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-2 py-1">Total ULD</td>
                          <td className="px-2 py-1 text-right">{bupShiftDetailsData.totalULDs.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Thru ULD Details</h5>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">Type</th>
                          <th className="px-2 py-1 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">Total PMC</td>
                          <td className="px-2 py-1 text-right">{bupShiftDetailsData.thruULDs.pmc}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">Total ALF</td>
                          <td className="px-2 py-1 text-right">{bupShiftDetailsData.thruULDs.alf}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">Total AKE</td>
                          <td className="px-2 py-1 text-right">{bupShiftDetailsData.thruULDs.ake}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-2 py-1">Total ULD</td>
                          <td className="px-2 py-1 text-right">{bupShiftDetailsData.thruULDs.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Flight Allocation Table */}
                <div className="border border-gray-200 rounded p-3 mb-4">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">Allocation</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">No</th>
                          <th className="px-2 py-1 text-left">Flight</th>
                          <th className="px-2 py-1 text-left">ETD</th>
                          <th className="px-2 py-1 text-left">DST</th>
                          <th className="px-2 py-1 text-left">Staff</th>
                          <th className="px-2 py-1 text-right">PMC/AMF</th>
                          <th className="px-2 py-1 text-right">ALF/PLA</th>
                          <th className="px-2 py-1 text-right">AKE/AKL</th>
                          <th className="px-2 py-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bupShiftDetailsData.flights.slice(0, 20).map((flight) => (
                          <tr key={flight.no} className="border-b border-gray-100">
                            <td className="px-2 py-1">{flight.no}</td>
                            <td className="px-2 py-1 font-semibold">{flight.flight}</td>
                            <td className="px-2 py-1">{flight.etd}</td>
                            <td className="px-2 py-1">{flight.dst}</td>
                            <td className="px-2 py-1">{flight.staff}</td>
                            <td className="px-2 py-1 text-right">{flight.pmc}</td>
                            <td className="px-2 py-1 text-right">{flight.alf}</td>
                            <td className="px-2 py-1 text-right">{flight.ake}</td>
                            <td className="px-2 py-1 text-right font-semibold">{flight.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Staff Performance Table */}
                <div className="border border-gray-200 rounded p-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">Shift & Staff Details</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">Sr.No</th>
                          <th className="px-2 py-1 text-left">Total Staffs</th>
                          <th className="px-2 py-1 text-left">Staff No</th>
                          <th className="px-2 py-1 text-left">Flight Count</th>
                          <th className="px-2 py-1 text-left">ULD Count</th>
                          <th className="px-2 py-1 text-left">Deployment</th>
                          <th className="px-2 py-1 text-left">Contact</th>
                          <th className="px-2 py-1 text-left">Duty Hours</th>
                          <th className="px-2 py-1 text-left">Actual Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bupShiftDetailsData.staffDetails.map((staff) => (
                          <tr key={staff.srNo} className="border-b border-gray-100">
                            <td className="px-2 py-1">{staff.srNo}</td>
                            <td className="px-2 py-1"></td>
                            <td className="px-2 py-1 font-semibold">{staff.name}</td>
                            <td className="px-2 py-1">{staff.staffNo}</td>
                            <td className="px-2 py-1">{staff.flightCount}</td>
                            <td className="px-2 py-1">{staff.uldCount}</td>
                            <td className="px-2 py-1">{staff.deployment}</td>
                            <td className="px-2 py-1">{staff.contact}</td>
                            <td className="px-2 py-1">{staff.dutyHours}</td>
                            <td className="px-2 py-1">{staff.actualHours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Advance Report Section */}
        <Collapsible
          open={expandedSections.has("advance-report")}
          onOpenChange={() => toggleSection("advance-report")}
        >
          <div className="bg-white rounded-lg border border-gray-200 mb-4">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  {expandedSections.has("advance-report") ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <h3 className="text-sm font-semibold text-gray-900">Advance Report</h3>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Advance Units */}
                  <div className="border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">ADVANCE UNITS</h5>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">Category</th>
                          <th className="px-2 py-1 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">TTL FLTS</td>
                          <td className="px-2 py-1 text-right font-semibold">{advanceReportData.advanceUnits.totalFlights}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">TTL STAFF</td>
                          <td className="px-2 py-1 text-right font-semibold">{advanceReportData.advanceUnits.totalStaff}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-2 py-1">THRU ULDS - PMC</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.thruULDs.pmc}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">THRU ULDS - ALF</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.thruULDs.alf}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">THRU ULDS - AKE</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.thruULDs.ake}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-2 py-1">BUILT ULDS - PMC</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.builtULDs.pmc}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">BUILT ULDS - ALF</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.builtULDs.alf}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">BUILT ULDS - AKE</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.builtULDs.ake}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold border-t">
                          <td className="px-2 py-1">TOT</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.total}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-2 py-1">PENDING UNITS - PMC</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.pendingUnits.pmc}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">PENDING UNITS - ALF</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.pendingUnits.alf}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">PENDING UNITS - AKE</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.pendingUnits.ake}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-2 py-1">TOT</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.totalPending}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Bonus Units */}
                  <div className="border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">BONUS UNITS</h5>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">Category</th>
                          <th className="px-2 py-1 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">TTL FLTS</td>
                          <td className="px-2 py-1 text-right font-semibold">{advanceReportData.bonusUnits.totalFlights}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">TTL STAFF</td>
                          <td className="px-2 py-1 text-right font-semibold">{advanceReportData.bonusUnits.totalStaff}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-2 py-1">THRU ULDS - PMC</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.thruULDs.pmc}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">THRU ULDS - ALF</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.thruULDs.alf}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">THRU ULDS - AKE</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.thruULDs.ake}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-2 py-1">BUILT ULDS - PMC</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.builtULDs.pmc}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">BUILT ULDS - ALF</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.builtULDs.alf}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">BUILT ULDS - AKE</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.builtULDs.ake}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold border-t">
                          <td className="px-2 py-1">TOT</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.total}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-2 py-1">PENDING UNITS - PMC</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.pendingUnits.pmc}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">PENDING UNITS - ALF</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.pendingUnits.alf}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">PENDING UNITS - AKE</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.pendingUnits.ake}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-2 py-1">TOT</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.totalPending}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Totals */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">ADVANCE UNITS</h5>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">ULD Details</th>
                          <th className="px-2 py-1 text-right">PMC</th>
                          <th className="px-2 py-1 text-right">ALF</th>
                          <th className="px-2 py-1 text-right">AKE</th>
                          <th className="px-2 py-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">Units-Built</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.builtULDs.pmc}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.builtULDs.alf}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.builtULDs.ake}</td>
                          <td className="px-2 py-1 text-right font-semibold">{advanceReportData.advanceUnits.total}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">Thru Units</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.thruULDs.pmc}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.thruULDs.alf}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.thruULDs.ake}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.thruULDs.pmc + advanceReportData.advanceUnits.thruULDs.alf + advanceReportData.advanceUnits.thruULDs.ake}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-2 py-1">Total</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.builtULDs.pmc}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.builtULDs.alf}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.builtULDs.ake}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.advanceUnits.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-gray-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">BONUS UNITS</h5>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left">ULD Details</th>
                          <th className="px-2 py-1 text-right">PMC</th>
                          <th className="px-2 py-1 text-right">ALF</th>
                          <th className="px-2 py-1 text-right">AKE</th>
                          <th className="px-2 py-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">Units-Built</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.builtULDs.pmc}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.builtULDs.alf}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.builtULDs.ake}</td>
                          <td className="px-2 py-1 text-right font-semibold">{advanceReportData.bonusUnits.total}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">Thru Units</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.thruULDs.pmc}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.thruULDs.alf}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.thruULDs.ake}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.thruULDs.pmc + advanceReportData.bonusUnits.thruULDs.alf + advanceReportData.bonusUnits.thruULDs.ake}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-2 py-1">Total</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.builtULDs.pmc}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.builtULDs.alf}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.builtULDs.ake}</td>
                          <td className="px-2 py-1 text-right">{advanceReportData.bonusUnits.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Grand Totals */}
                <div className="mt-4 border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-semibold mb-1">TOTAL BUILT UNITS (ADVANCE + BONUS)</div>
                      <div className="text-lg font-bold text-[#D71A21]">{advanceReportData.totalBuiltUnits}</div>
                    </div>
                    <div>
                      <div className="font-semibold mb-1">TOTAL PENDING UNITS (ADVANCE + BONUS)</div>
                      <div className="text-lg font-bold">{advanceReportData.totalPendingUnits}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  )
}

