"use client"

import React from "react"
import { X, Send, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LoadPlanDetail } from "./load-plan-types"
import { FlightHeaderRow } from "./flight-header-row"

interface HandoverModalProps {
  isOpen: boolean
  onClose: () => void
  loadPlan: LoadPlanDetail
  onHandover: () => void
  onHandoverReport?: () => void
}

export default function HandoverModal({ isOpen, onClose, loadPlan, onHandover, onHandoverReport }: HandoverModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Handover Report Preview</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Flight Header */}
          <div className="bg-white border-b border-gray-200">
            <FlightHeaderRow
              plan={loadPlan}
              onFieldUpdate={() => {}}
              isReadOnly={true}
            />
          </div>

          {/* Load Plan Preview */}
          <div className="p-4 space-y-6">
            {/* Sectors */}
            {loadPlan.sectors.map((sector, sectorIndex) => {
              const regularSections = sector.uldSections.filter((s) => !s.isRampTransfer)
              const rampTransferSections = sector.uldSections.filter((s) => s.isRampTransfer)

              return (
                <div key={sectorIndex} className="space-y-4">
                  {/* Sector Header */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">SECTOR:</span>
                    <span className="text-lg font-semibold text-gray-900">{sector.sector}</span>
                  </div>

                  {/* Sector Table */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b-2 border-gray-300">
                            <th className="px-2 py-2 text-left font-semibold">SER.</th>
                            <th className="px-2 py-2 text-left font-semibold">AWB NO</th>
                            <th className="px-2 py-2 text-left font-semibold">ORG/DES</th>
                            <th className="px-2 py-2 text-left font-semibold">PCS</th>
                            <th className="px-2 py-2 text-left font-semibold">WGT</th>
                            <th className="px-2 py-2 text-left font-semibold">VOL</th>
                            <th className="px-2 py-2 text-left font-semibold">LVOL</th>
                            <th className="px-2 py-2 text-left font-semibold">SHC</th>
                            <th className="px-2 py-2 text-left font-semibold">MAN.DESC</th>
                            <th className="px-2 py-2 text-left font-semibold">PCODE</th>
                            <th className="px-2 py-2 text-left font-semibold">PC</th>
                            <th className="px-2 py-2 text-left font-semibold">THC</th>
                            <th className="px-2 py-2 text-left font-semibold">BS</th>
                            <th className="px-2 py-2 text-left font-semibold">PI</th>
                            <th className="px-2 py-2 text-left font-semibold">FLTIN</th>
                            <th className="px-2 py-2 text-left font-semibold">ARRDT.TIME</th>
                            <th className="px-2 py-2 text-left font-semibold">QNN/AQNN</th>
                            <th className="px-2 py-2 text-left font-semibold">WHS</th>
                            <th className="px-2 py-2 text-left font-semibold">SI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Remarks */}
                          {loadPlan.remarks && loadPlan.remarks.length > 0 && (
                            <tr>
                              <td colSpan={19} className="px-2 py-2 bg-gray-100 border-b border-gray-200">
                                <div className="space-y-1">
                                  {loadPlan.remarks.map((remark, index) => (
                                    <div key={index} className="text-xs text-gray-900">
                                      {remark}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                          {/* Regular Sections */}
                          {regularSections.map((uldSection, uldSectionIndex) => (
                            <React.Fragment key={uldSectionIndex}>
                              {uldSection.awbs.map((awb, awbIndex) => (
                                <React.Fragment key={awbIndex}>
                                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-2 py-1">{awb.ser}</td>
                                    <td className="px-2 py-1 font-medium">{awb.awbNo}</td>
                                    <td className="px-2 py-1">{awb.orgDes}</td>
                                    <td className="px-2 py-1">{awb.pcs}</td>
                                    <td className="px-2 py-1">{awb.wgt}</td>
                                    <td className="px-2 py-1">{awb.vol}</td>
                                    <td className="px-2 py-1">{awb.lvol}</td>
                                    <td className="px-2 py-1">{awb.shc}</td>
                                    <td className="px-2 py-1">{awb.manDesc}</td>
                                    <td className="px-2 py-1">{awb.pcode}</td>
                                    <td className="px-2 py-1">{awb.pc}</td>
                                    <td className="px-2 py-1">{awb.thc}</td>
                                    <td className="px-2 py-1">{awb.bs}</td>
                                    <td className="px-2 py-1">{awb.pi}</td>
                                    <td className="px-2 py-1">{awb.fltin}</td>
                                    <td className="px-2 py-1">{awb.arrdtTime}</td>
                                    <td className="px-2 py-1">{awb.qnnAqnn}</td>
                                    <td className="px-2 py-1">{awb.whs}</td>
                                    <td className="px-2 py-1">{awb.si}</td>
                                  </tr>
                                  {awb.remarks && (
                                    <tr>
                                      <td colSpan={19} className="px-2 py-1 text-xs text-gray-700 italic">
                                        {awb.remarks}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                              {uldSection.uld && (
                                <tr>
                                  <td colSpan={19} className="px-2 py-1 font-semibold text-gray-900 text-center">
                                    {uldSection.uld}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                          {/* Ramp Transfer Sections */}
                          {rampTransferSections.length > 0 && (
                            <>
                              <tr className="bg-gray-50">
                                <td colSpan={19} className="px-2 py-1 font-semibold text-gray-900 text-center">
                                  ***** RAMP TRANSFER *****
                                </td>
                              </tr>
                              {rampTransferSections.map((uldSection, uldSectionIndex) => (
                                <React.Fragment key={uldSectionIndex}>
                                  {uldSection.uld && (
                                    <tr className="bg-gray-50">
                                      <td colSpan={19} className="px-2 py-1 font-semibold text-gray-900 text-center">
                                        {uldSection.uld}
                                      </td>
                                    </tr>
                                  )}
                                  {uldSection.awbs.map((awb, awbIndex) => (
                                    <React.Fragment key={awbIndex}>
                                      <tr className="border-b border-gray-100 bg-gray-50 hover:bg-gray-50">
                                        <td className="px-2 py-1">{awb.ser}</td>
                                        <td className="px-2 py-1 font-medium">{awb.awbNo}</td>
                                        <td className="px-2 py-1">{awb.orgDes}</td>
                                        <td className="px-2 py-1">{awb.pcs}</td>
                                        <td className="px-2 py-1">{awb.wgt}</td>
                                        <td className="px-2 py-1">{awb.vol}</td>
                                        <td className="px-2 py-1">{awb.lvol}</td>
                                        <td className="px-2 py-1">{awb.shc}</td>
                                        <td className="px-2 py-1">{awb.manDesc}</td>
                                        <td className="px-2 py-1">{awb.pcode}</td>
                                        <td className="px-2 py-1">{awb.pc}</td>
                                        <td className="px-2 py-1">{awb.thc}</td>
                                        <td className="px-2 py-1">{awb.bs}</td>
                                        <td className="px-2 py-1">{awb.pi}</td>
                                        <td className="px-2 py-1">{awb.fltin}</td>
                                        <td className="px-2 py-1">{awb.arrdtTime}</td>
                                        <td className="px-2 py-1">{awb.qnnAqnn}</td>
                                        <td className="px-2 py-1">{awb.whs}</td>
                                        <td className="px-2 py-1">{awb.si}</td>
                                      </tr>
                                      {awb.remarks && (
                                        <tr>
                                          <td colSpan={19} className="px-2 py-1 text-xs text-gray-700 italic">
                                            {awb.remarks}
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </React.Fragment>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                    <div className="text-sm text-gray-900">
                      <span className="font-semibold">BAGG</span> {sector.bagg || ""}
                    </div>
                    <div className="text-sm text-gray-900">
                      <span className="font-semibold">COU</span> {sector.cou || ""}
                    </div>
                    <div className="text-sm text-gray-900 mt-4">
                      <span className="font-semibold">TOTALS:</span>{" "}
                      {sector.totals.pcs} {sector.totals.wgt} {sector.totals.vol} {sector.totals.lvol}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Bottom Footer */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                <span>PREPARED BY:</span>
                <span>{loadPlan.preparedBy}</span>
                <span>PREPARED ON:</span>
                <span>{loadPlan.preparedOn}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          {onHandoverReport && (
            <Button
              variant="outline"
              onClick={onHandoverReport}
              className="px-4 py-2 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Handover Report
            </Button>
          )}
          <Button
            onClick={onHandover}
            className="px-4 py-2 bg-[#D71A21] hover:bg-[#B01419] text-white flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Handover
          </Button>
        </div>
      </div>
    </div>
  )
}

