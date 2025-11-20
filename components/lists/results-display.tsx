"use client"

import { Download, ChevronDown } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { ListsResults } from "@/lib/lists/types"
import { formatDateForReport } from "@/lib/lists/parser"

interface ResultsDisplayProps {
  results: ListsResults
  onExportSpecialCargo: (format: "csv" | "xlsx") => void
  onExportVUNList: (format: "csv" | "xlsx") => void
  onExportQRTList: (format: "csv" | "xlsx") => void
  onReset: () => void
}


export function ResultsDisplay({
  results,
  onExportSpecialCargo,
  onExportVUNList,
  onExportQRTList,
  onReset,
}: ResultsDisplayProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6 justify-between">
          <div className="flex-1">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Load Plan Upload</h2>
              <p className="text-sm text-gray-600">Your load plan has been successfully processed</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-[#D71A21] hover:bg-[#B01419] px-3 py-2 h-9">
                    <Download className="w-4 h-4 mr-1.5" />
                    Cargo List
                    <ChevronDown className="w-3 h-3 ml-1.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onExportSpecialCargo("csv")}>Export as CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExportSpecialCargo("xlsx")}>Export as XLSX</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {results.vunList.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-[#D71A21] hover:bg-[#B01419] px-3 py-2 h-9">
                      <Download className="w-4 h-4 mr-1.5" />
                      VUN List
                      <ChevronDown className="w-3 h-3 ml-1.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onExportVUNList("csv")}>Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExportVUNList("xlsx")}>Export as XLSX</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {results.qrtList.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-[#D71A21] hover:bg-[#B01419] px-3 py-2 h-9">
                      <Download className="w-4 h-4 mr-1.5" />
                      QRT List
                      <ChevronDown className="w-3 h-3 ml-1.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onExportQRTList("csv")}>Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExportQRTList("xlsx")}>Export as XLSX</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Special Cargo Items</p>
            <p className="text-xl font-semibold text-[#D71A21]">
              {results.specialCargo.regular.length + results.specialCargo.weapons.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {results.specialCargo.weapons.length > 0 && `${results.specialCargo.weapons.length} weapons`}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">VUN Items</p>
            <p className="text-xl font-semibold text-[#D71A21]">{results.vunList.length}</p>
            <p className="text-xs text-gray-500 mt-1">Tracked shipments</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">QRT Items</p>
            <p className="text-xl font-semibold text-[#D71A21]">{results.qrtList.length}</p>
            <p className="text-xs text-gray-500 mt-1">Quick ramp transfer</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <Tabs defaultValue="special-cargo" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="special-cargo">
              Special Cargo Report
              <span className="ml-2 text-xs text-gray-500">
                ({results.specialCargo.regular.length + results.specialCargo.weapons.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="vun">
              VUN List
              <span className="ml-2 text-xs text-gray-500">({results.vunList.length})</span>
            </TabsTrigger>
            <TabsTrigger value="qrt">
              QRT List
              <span className="ml-2 text-xs text-gray-500">({results.qrtList.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="special-cargo" className="mt-0">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="general">
                  General
                  <span className="ml-2 text-xs text-gray-500">
                    ({results.specialCargo.regular.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="special">
                  Special
                  <span className="ml-2 text-xs text-gray-500">
                    ({results.specialCargo.weapons.length})
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-0">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Doc No.</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Route</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Pcs</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Weight</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">SHC</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.specialCargo.regular.length > 0 ? (
                        results.specialCargo.regular.map((row, idx) => (
                          <tr 
                            key={idx} 
                            className={`border-b border-gray-100 ${row.hasHUM ? 'bg-yellow-50 hover:bg-yellow-100' : ''}`}
                          >
                            <td className="px-3 py-2 text-gray-900">{row.docNo}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {row.inBrdPt}-{row.outOffPt}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{row.outPcs}</td>
                            <td className="px-3 py-2 text-gray-600">{row.outWt}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{row.shc}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{row.manifestDesc}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                            No data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="special" className="mt-0">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Carr. Out.Flt. No.</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Doc No.</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">In.Brd Pt</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Out.Off Pt</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Dep. Date</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">STD</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Out.Pcs.</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Out.Wt.</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">SHC</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Manifest Desc.</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Carr. In.Flt. No.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.specialCargo.weapons.length > 0 ? (
                        results.specialCargo.weapons.map((row, idx) => (
                          <tr 
                            key={idx} 
                            className={`border-b border-gray-100 ${row.hasHUM ? 'bg-yellow-50 hover:bg-yellow-100' : ''}`}
                          >
                            <td className="px-3 py-2 text-gray-900">{row.carrier} {row.outFlightNo}</td>
                            <td className="px-3 py-2 text-gray-900">{row.docNo}</td>
                            <td className="px-3 py-2 text-gray-600">{row.inBrdPt}</td>
                            <td className="px-3 py-2 text-gray-600">{row.outOffPt}</td>
                            <td className="px-3 py-2 text-gray-600">{row.depDate}</td>
                            <td className="px-3 py-2 text-gray-600">{row.std}</td>
                            <td className="px-3 py-2 text-gray-600">{row.outPcs}</td>
                            <td className="px-3 py-2 text-gray-600">{row.outWt}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{row.shc}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{row.manifestDesc}</td>
                            <td className="px-3 py-2 text-gray-600">{row.inCarrier} {row.inFlightNo}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} className="px-3 py-8 text-center text-gray-500">
                            No data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="vun" className="mt-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Doc No.</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Route</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Pcs</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Weight</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">SHC</th>
                  </tr>
                </thead>
                <tbody>
                  {results.vunList.length > 0 ? (
                    results.vunList.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="px-3 py-2 text-gray-900">{row.docNo}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{row.cargoType}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {row.inBrdPt}-{row.outOffPt}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{row.outPcs}</td>
                        <td className="px-3 py-2 text-gray-600">{row.outWt}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs font-semibold text-[#D71A21]">{row.shc}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="qrt" className="mt-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Doc No.</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Carrier</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Flt No.</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Off Pt</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Dep. Date</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">STD</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">MCT</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">ULD</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">SHC</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">THC</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Manifest Desc.</th>
                  </tr>
                </thead>
                <tbody>
                  {results.qrtList.length > 0 ? (
                    results.qrtList.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="px-3 py-2 text-gray-900">{row.docNo}</td>
                        <td className="px-3 py-2 text-gray-600">{row.carrier}</td>
                        <td className="px-3 py-2 text-gray-600">{row.flightNo}</td>
                        <td className="px-3 py-2 text-gray-600">{row.outOffPt}</td>
                        <td className="px-3 py-2 text-gray-600">{row.depDate}</td>
                        <td className="px-3 py-2 text-gray-600">{row.std}</td>
                        <td className="px-3 py-2 text-gray-600">{row.mct}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{row.uld}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{row.shc}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs font-semibold text-[#D71A21]">{row.thc}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{row.manifestDesc}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-3 py-8 text-center text-gray-500">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <div className="flex justify-center">
        <Button onClick={onReset} variant="outline">
          Process Another File
        </Button>
      </div>
    </div>
  )
}
