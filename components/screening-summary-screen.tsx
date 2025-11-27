"use client"

import { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Screening data structure (from BDN dashboard)
const screeningData = {
  usaCaScreening: {
    totalBooked: { pcs: 1250, grWt: 125000, mABase: 45, lBase: 30, kBase: 15 },
    totalPending: { pcs: 320, grWt: 32000, mABase: 12, lBase: 8, kBase: 4 },
  },
  usaCaNoScreening: {
    totalBooked: { pcs: 850, grWt: 85000, mABase: 30, lBase: 20, kBase: 10 },
    totalPending: { pcs: 180, grWt: 18000, mABase: 6, lBase: 4, kBase: 2 },
  },
  otherSectorScreening: {
    totalBooked: { pcs: 2100, grWt: 210000, mABase: 75, lBase: 50, kBase: 25 },
    totalPending: { pcs: 450, grWt: 45000, mABase: 15, lBase: 10, kBase: 5 },
  },
  overall: {
    totalBooked: { pcs: 4200, grWt: 420000, mABase: 150, lBase: 100, kBase: 50 },
    totalPending: { pcs: 950, grWt: 95000, mABase: 32, lBase: 22, kBase: 11 },
  },
}

const ScreeningTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold text-gray-900 mb-2">{data.name}</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">No of Pcs:</span>
            <span className="font-semibold">{data.pcs?.toLocaleString() || data.value}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Gr. Wt:</span>
            <span className="font-semibold">{data.grWt?.toLocaleString() || "-"}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

type ScreeningFilter = "overall" | "usaCaScreening" | "usaCaNoScreening" | "otherSectorScreening"

export default function ScreeningSummaryScreen() {
  const [screeningFilter, setScreeningFilter] = useState<ScreeningFilter>("overall")

  const filterLabels: Record<ScreeningFilter, string> = {
    overall: "Total Load",
    usaCaScreening: "USA & CA Screening",
    usaCaNoScreening: "USA & CA No Screening",
    otherSectorScreening: "Other Sector Screening",
  }

  // Calculate Total Screening Load (same as Total Load for now)
  const totalScreeningLoad = useMemo(() => {
    return screeningData.overall.totalBooked
  }, [])

  // Get chart data based on filter
  const chartData = useMemo(() => {
    const data = screeningFilter === "overall" ? screeningData.overall : screeningData[screeningFilter]
    return [
      {
        name: "M/A Base",
        value: data.totalBooked.mABase,
        pcs: data.totalBooked.pcs,
        grWt: data.totalBooked.grWt,
        color: "#DC2626",
      },
      {
        name: "L Base",
        value: data.totalBooked.lBase,
        pcs: data.totalBooked.pcs,
        grWt: data.totalBooked.grWt,
        color: "#EF4444",
      },
      {
        name: "K Base",
        value: data.totalBooked.kBase,
        pcs: data.totalBooked.pcs,
        grWt: data.totalBooked.grWt,
        color: "#B91C1C",
      },
    ]
  }, [screeningFilter])

  // Get table data based on filter
  const tableData = useMemo(() => {
    if (screeningFilter === "overall") {
      return {
        usaCaScreening: screeningData.usaCaScreening,
        usaCaNoScreening: screeningData.usaCaNoScreening,
        otherSectorScreening: screeningData.otherSectorScreening,
        overall: screeningData.overall,
        totalScreeningLoad,
      }
    }
    return {
      [screeningFilter]: screeningData[screeningFilter],
      overall: screeningData.overall,
      totalScreeningLoad,
    }
  }, [screeningFilter, totalScreeningLoad])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-4 px-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Screening Summary</h2>
              <p className="text-sm text-gray-500 mt-1">Total booked and pending screening load breakdown</p>
            </div>
            <Select value={screeningFilter} onValueChange={(value) => setScreeningFilter(value as ScreeningFilter)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue>{filterLabels[screeningFilter]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">Total Load</SelectItem>
                <SelectItem value="usaCaScreening">USA & CA Screening</SelectItem>
                <SelectItem value="usaCaNoScreening">USA & CA No Screening</SelectItem>
                <SelectItem value="otherSectorScreening">Other Sector Screening</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Graph */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Screening Summary by Base</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  stroke="#9CA3AF"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  stroke="#9CA3AF"
                />
                <Tooltip 
                  content={<ScreeningTooltip />} 
                  position={{ x: undefined, y: undefined }}
                  allowEscapeViewBox={true}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SCREENING SUMMARY Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4">
            <h4 className="text-base font-semibold text-gray-900 mb-4">SCREENING SUMMARY</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th rowSpan={2} className="px-3 py-2 text-left border border-gray-300">
                      Screening summary
                    </th>
                    <th colSpan={5} className="px-3 py-2 text-center border border-gray-300">
                      Total Booked Load
                    </th>
                    <th colSpan={5} className="px-3 py-2 text-center border border-gray-300">
                      Total Pending Booked Load
                    </th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-2 text-center border border-gray-300">No of Pcs</th>
                    <th className="px-2 py-2 text-center border border-gray-300">Gr.Wt</th>
                    <th className="px-2 py-2 text-center border border-gray-300">M & A Base</th>
                    <th className="px-2 py-2 text-center border border-gray-300">L Base</th>
                    <th className="px-2 py-2 text-center border border-gray-300">K Base</th>
                    <th className="px-2 py-2 text-center border border-gray-300">No of Pcs</th>
                    <th className="px-2 py-2 text-center border border-gray-300">Gr.Wt</th>
                    <th className="px-2 py-2 text-center border border-gray-300">M & A Base</th>
                    <th className="px-2 py-2 text-center border border-gray-300">L Base</th>
                    <th className="px-2 py-2 text-center border border-gray-300">K Base</th>
                  </tr>
                </thead>
                <tbody>
                  {screeningFilter === "overall" && (
                    <>
                      <tr>
                        <td className="px-3 py-2 border border-gray-300 font-medium">USA & CA Screening</td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaScreening.totalBooked.pcs.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaScreening.totalBooked.grWt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaScreening.totalBooked.mABase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaScreening.totalBooked.lBase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaScreening.totalBooked.kBase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaScreening.totalPending.pcs.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaScreening.totalPending.grWt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaScreening.totalPending.mABase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaScreening.totalPending.lBase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaScreening.totalPending.kBase}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 border border-gray-300 font-medium">USA & CA No Screening</td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaNoScreening.totalBooked.pcs.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaNoScreening.totalBooked.grWt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaNoScreening.totalBooked.mABase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaNoScreening.totalBooked.lBase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaNoScreening.totalBooked.kBase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaNoScreening.totalPending.pcs.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaNoScreening.totalPending.grWt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaNoScreening.totalPending.mABase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaNoScreening.totalPending.lBase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.usaCaNoScreening.totalPending.kBase}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 border border-gray-300 font-medium">Other Sector Screening</td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.otherSectorScreening.totalBooked.pcs.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.otherSectorScreening.totalBooked.grWt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.otherSectorScreening.totalBooked.mABase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.otherSectorScreening.totalBooked.lBase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.otherSectorScreening.totalBooked.kBase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.otherSectorScreening.totalPending.pcs.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.otherSectorScreening.totalPending.grWt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.otherSectorScreening.totalPending.mABase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.otherSectorScreening.totalPending.lBase}
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          {screeningData.otherSectorScreening.totalPending.kBase}
                        </td>
                      </tr>
                    </>
                  )}
                  {screeningFilter !== "overall" && (
                    <tr>
                      <td className="px-3 py-2 border border-gray-300 font-medium">{filterLabels[screeningFilter]}</td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {screeningData[screeningFilter].totalBooked.pcs.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {screeningData[screeningFilter].totalBooked.grWt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {screeningData[screeningFilter].totalBooked.mABase}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {screeningData[screeningFilter].totalBooked.lBase}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {screeningData[screeningFilter].totalBooked.kBase}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {screeningData[screeningFilter].totalPending.pcs.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {screeningData[screeningFilter].totalPending.grWt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {screeningData[screeningFilter].totalPending.mABase}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {screeningData[screeningFilter].totalPending.lBase}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {screeningData[screeningFilter].totalPending.kBase}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 border border-gray-300">Total Load</td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalBooked.pcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalBooked.grWt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalBooked.mABase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalBooked.lBase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalBooked.kBase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalPending.pcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalPending.grWt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalPending.mABase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalPending.lBase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalPending.kBase}
                    </td>
                  </tr>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 border border-gray-300">Total Screening Load</td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {totalScreeningLoad.pcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {totalScreeningLoad.grWt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {totalScreeningLoad.mABase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {totalScreeningLoad.lBase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {totalScreeningLoad.kBase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalPending.pcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalPending.grWt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalPending.mABase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalPending.lBase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {screeningData.overall.totalPending.kBase}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

