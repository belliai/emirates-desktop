"use client"

import { useState } from "react"
import { FileText, Download, CheckSquare, Square } from "lucide-react"

const REPORT_ELEMENTS = {
  flightDetails: ["Flight Number", "Origin", "Destination", "ETA", "ATA", "Aircraft Type", "Flight Status"],
  uldDetails: ["ULD Number", "ULD Type", "Contour", "Load Type", "Status", "Weight", "Pieces"],
  awbDetails: ["AWB Number", "Pieces", "Weight", "Volume", "Product Type", "Commodity"],
  shcCodes: ["DGR", "PER", "AVI", "HEA", "VAL", "VUN", "EAT", "EAW"],
  screening: ["Screening Status", "Screening Method", "Screening Time", "Screened By"],
  staff: ["Processed By", "Induction Time", "Breakdown Time", "Service Provider"],
  timestamps: ["Created At", "Updated At", "Completed At", "Last Modified"],
  remarks: ["OPS Remarks", "Internal Notes", "Special Instructions"],
}

export default function CustomReportsScreen() {
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set())

  const toggleElement = (element: string) => {
    setSelectedElements((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(element)) {
        newSet.delete(element)
      } else {
        newSet.add(element)
      }
      return newSet
    })
  }

  const toggleCategory = (category: string[]) => {
    const allSelected = category.every((el) => selectedElements.has(el))
    setSelectedElements((prev) => {
      const newSet = new Set(prev)
      if (allSelected) {
        category.forEach((el) => newSet.delete(el))
      } else {
        category.forEach((el) => newSet.add(el))
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Custom Report Builder</h1>
          <p className="text-sm text-gray-600 mt-1">Select AWB elements and generate customized reports</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Element Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Report Elements</h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {Object.entries(REPORT_ELEMENTS).map(([category, elements]) => {
                  const categoryName = category.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
                  const allSelected = elements.every((el) => selectedElements.has(el))

                  return (
                    <div key={category} className="border-b border-gray-200 pb-3">
                      <button
                        onClick={() => toggleCategory(elements)}
                        className="flex items-center gap-2 w-full text-left mb-2 hover:text-[#D71A21] transition-colors"
                      >
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#D71A21]" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm font-medium text-gray-900">{categoryName}</span>
                      </button>
                      <div className="ml-6 space-y-1.5">
                        {elements.map((element) => (
                          <button
                            key={element}
                            onClick={() => toggleElement(element)}
                            className="flex items-center gap-2 w-full text-left hover:text-[#D71A21] transition-colors"
                          >
                            {selectedElements.has(element) ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#D71A21]" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <span className="text-xs text-gray-700">{element}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Preview & Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Report Preview</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{selectedElements.size} elements selected</span>
                </div>
              </div>

              {selectedElements.size === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Select elements from the left to preview your report</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {Array.from(selectedElements).map((element) => (
                          <th key={element} className="px-3 py-2 text-left font-semibold text-gray-700 text-xs">
                            {element}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3].map((row) => (
                        <tr key={row} className="border-b border-gray-100">
                          {Array.from(selectedElements).map((element) => (
                            <td key={element} className="px-3 py-2 text-gray-600 text-xs">
                              Sample {row}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Report Templates */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Report Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button className="text-left p-3 border border-gray-200 rounded-lg hover:border-[#D71A21] hover:bg-red-50 transition-colors">
                  <p className="font-medium text-gray-900 text-sm">ULDs Inducted with Staff Details</p>
                  <p className="text-xs text-gray-600 mt-1">ULD, Staff, Timestamps</p>
                </button>
                <button className="text-left p-3 border border-gray-200 rounded-lg hover:border-[#D71A21] hover:bg-red-50 transition-colors">
                  <p className="font-medium text-gray-900 text-sm">Complete AWB Report</p>
                  <p className="text-xs text-gray-600 mt-1">All AWB elements</p>
                </button>
                <button className="text-left p-3 border border-gray-200 rounded-lg hover:border-[#D71A21] hover:bg-red-50 transition-colors">
                  <p className="font-medium text-gray-900 text-sm">Screening Status Report</p>
                  <p className="text-xs text-gray-600 mt-1">Screening, SHC, Status</p>
                </button>
                <button className="text-left p-3 border border-gray-200 rounded-lg hover:border-[#D71A21] hover:bg-red-50 transition-colors">
                  <p className="font-medium text-gray-900 text-sm">Flight Summary Report</p>
                  <p className="text-xs text-gray-600 mt-1">Flight, ULD, Status</p>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <button
                  disabled={selectedElements.size === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#D71A21] text-white px-4 py-3 rounded-lg hover:bg-[#B01519] transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Report</span>
                </button>
                <button
                  disabled={selectedElements.size === 0}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>Download XLS</span>
                </button>
                <button
                  disabled={selectedElements.size === 0}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
