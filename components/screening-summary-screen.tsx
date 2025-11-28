"use client"

import { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Screening data structure (from image)
const initialScreeningData = {
  usaCaScreening: {
    totalBooked: { pcs: 6711, grWt: 136169, mABase: 56, lBase: 20, kBase: 36 },
    totalPending: { pcs: 0, grWt: 0, mABase: 0, lBase: 0, kBase: 0 },
  },
  usaCaNoScreening: {
    totalBooked: { pcs: 0, grWt: 0, mABase: 0, lBase: 0, kBase: 0 },
    totalPending: { pcs: 0, grWt: 0, mABase: 0, lBase: 0, kBase: 0 },
  },
  otherSectorScreening: {
    totalBooked: { pcs: 0, grWt: 0, mABase: 18, lBase: 1, kBase: 5 },
    totalPending: { pcs: 0, grWt: 0, mABase: 6, lBase: 0, kBase: 2 },
  },
  overall: {
    totalBooked: { pcs: 6711, grWt: 136169, mABase: 74, lBase: 21, kBase: 41 },
    totalPending: { pcs: 0, grWt: 0, mABase: 6, lBase: 0, kBase: 2 },
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
  const [screeningData, setScreeningData] = useState(initialScreeningData)

  const filterLabels: Record<ScreeningFilter, string> = {
    overall: "Total Load",
    usaCaScreening: "USA & CA Screening",
    usaCaNoScreening: "USA & CA No Screening",
    otherSectorScreening: "Other Sector Screening",
  }

  // Recalculate overall totals automatically
  const recalculatedScreeningData = useMemo(() => {
    const newOverall = {
      totalBooked: {
        pcs: screeningData.usaCaScreening.totalBooked.pcs + 
             screeningData.usaCaNoScreening.totalBooked.pcs + 
             screeningData.otherSectorScreening.totalBooked.pcs,
        grWt: screeningData.usaCaScreening.totalBooked.grWt + 
              screeningData.usaCaNoScreening.totalBooked.grWt + 
              screeningData.otherSectorScreening.totalBooked.grWt,
        mABase: screeningData.usaCaScreening.totalBooked.mABase + 
                screeningData.usaCaNoScreening.totalBooked.mABase + 
                screeningData.otherSectorScreening.totalBooked.mABase,
        lBase: screeningData.usaCaScreening.totalBooked.lBase + 
               screeningData.usaCaNoScreening.totalBooked.lBase + 
               screeningData.otherSectorScreening.totalBooked.lBase,
        kBase: screeningData.usaCaScreening.totalBooked.kBase + 
               screeningData.usaCaNoScreening.totalBooked.kBase + 
               screeningData.otherSectorScreening.totalBooked.kBase,
      },
      totalPending: {
        pcs: screeningData.usaCaScreening.totalPending.pcs + 
             screeningData.usaCaNoScreening.totalPending.pcs + 
             screeningData.otherSectorScreening.totalPending.pcs,
        grWt: screeningData.usaCaScreening.totalPending.grWt + 
              screeningData.usaCaNoScreening.totalPending.grWt + 
              screeningData.otherSectorScreening.totalPending.grWt,
        mABase: screeningData.usaCaScreening.totalPending.mABase + 
                screeningData.usaCaNoScreening.totalPending.mABase + 
                screeningData.otherSectorScreening.totalPending.mABase,
        lBase: screeningData.usaCaScreening.totalPending.lBase + 
               screeningData.usaCaNoScreening.totalPending.lBase + 
               screeningData.otherSectorScreening.totalPending.lBase,
        kBase: screeningData.usaCaScreening.totalPending.kBase + 
               screeningData.usaCaNoScreening.totalPending.kBase + 
               screeningData.otherSectorScreening.totalPending.kBase,
      },
    }
    
    return {
      ...screeningData,
      overall: newOverall,
    }
  }, [screeningData.usaCaScreening, screeningData.usaCaNoScreening, screeningData.otherSectorScreening])

  // Calculate Total Screening Load (same as Total Load for now)
  const totalScreeningLoad = useMemo(() => {
    return recalculatedScreeningData.overall.totalBooked
  }, [recalculatedScreeningData])

  // Helper function to update screening data
  const updateScreeningData = (
    category: keyof typeof initialScreeningData,
    field: "totalBooked" | "totalPending",
    subField: "pcs" | "grWt" | "mABase" | "lBase" | "kBase",
    value: number
  ) => {
    if (category === "overall") return // Don't allow editing overall directly
    
    setScreeningData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: {
          ...prev[category][field],
          [subField]: value,
        },
      },
    }))
  }

  // Get chart data based on filter
  const chartData = useMemo(() => {
    const data = screeningFilter === "overall" ? recalculatedScreeningData.overall : recalculatedScreeningData[screeningFilter]
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
  }, [screeningFilter, recalculatedScreeningData])

  // Get table data based on filter
  const tableData = useMemo(() => {
    if (screeningFilter === "overall") {
      return {
        usaCaScreening: recalculatedScreeningData.usaCaScreening,
        usaCaNoScreening: recalculatedScreeningData.usaCaNoScreening,
        otherSectorScreening: recalculatedScreeningData.otherSectorScreening,
        overall: recalculatedScreeningData.overall,
        totalScreeningLoad,
      }
    }
    return {
      [screeningFilter]: recalculatedScreeningData[screeningFilter],
      overall: recalculatedScreeningData.overall,
      totalScreeningLoad,
    }
  }, [screeningFilter, totalScreeningLoad, recalculatedScreeningData])

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
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalBooked.pcs}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "pcs", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalBooked.grWt}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "grWt", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalBooked.mABase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalBooked.lBase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalBooked.kBase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalPending.pcs}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "pcs", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalPending.grWt}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "grWt", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalPending.mABase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalPending.lBase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalPending.kBase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 border border-gray-300 font-medium">USA & CA No Screening</td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalBooked.pcs}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "pcs", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalBooked.grWt}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "grWt", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalBooked.mABase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalBooked.lBase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalBooked.kBase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalPending.pcs}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "pcs", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalPending.grWt}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "grWt", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalPending.mABase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalPending.lBase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalPending.kBase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 border border-gray-300 font-medium">Other Sector Screening</td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalBooked.pcs}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "pcs", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalBooked.grWt}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "grWt", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalBooked.mABase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalBooked.lBase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalBooked.kBase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalPending.pcs}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "pcs", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalPending.grWt}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "grWt", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalPending.mABase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalPending.lBase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalPending.kBase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                          />
                        </td>
                      </tr>
                    </>
                  )}
                  {screeningFilter !== "overall" && (
                    <tr>
                      <td className="px-3 py-2 border border-gray-300 font-medium">{filterLabels[screeningFilter]}</td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        <input
                          type="number"
                          value={screeningData[screeningFilter].totalBooked.pcs}
                          onChange={(e) => updateScreeningData(screeningFilter, "totalBooked", "pcs", parseInt(e.target.value) || 0)}
                          className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        <input
                          type="number"
                          value={screeningData[screeningFilter].totalBooked.grWt}
                          onChange={(e) => updateScreeningData(screeningFilter, "totalBooked", "grWt", parseInt(e.target.value) || 0)}
                          className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        <input
                          type="number"
                          value={screeningData[screeningFilter].totalBooked.mABase}
                          onChange={(e) => updateScreeningData(screeningFilter, "totalBooked", "mABase", parseInt(e.target.value) || 0)}
                          className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        <input
                          type="number"
                          value={screeningData[screeningFilter].totalBooked.lBase}
                          onChange={(e) => updateScreeningData(screeningFilter, "totalBooked", "lBase", parseInt(e.target.value) || 0)}
                          className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        <input
                          type="number"
                          value={screeningData[screeningFilter].totalBooked.kBase}
                          onChange={(e) => updateScreeningData(screeningFilter, "totalBooked", "kBase", parseInt(e.target.value) || 0)}
                          className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        <input
                          type="number"
                          value={screeningData[screeningFilter].totalPending.pcs}
                          onChange={(e) => updateScreeningData(screeningFilter, "totalPending", "pcs", parseInt(e.target.value) || 0)}
                          className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        <input
                          type="number"
                          value={screeningData[screeningFilter].totalPending.grWt}
                          onChange={(e) => updateScreeningData(screeningFilter, "totalPending", "grWt", parseInt(e.target.value) || 0)}
                          className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        <input
                          type="number"
                          value={screeningData[screeningFilter].totalPending.mABase}
                          onChange={(e) => updateScreeningData(screeningFilter, "totalPending", "mABase", parseInt(e.target.value) || 0)}
                          className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        <input
                          type="number"
                          value={screeningData[screeningFilter].totalPending.lBase}
                          onChange={(e) => updateScreeningData(screeningFilter, "totalPending", "lBase", parseInt(e.target.value) || 0)}
                          className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        <input
                          type="number"
                          value={screeningData[screeningFilter].totalPending.kBase}
                          onChange={(e) => updateScreeningData(screeningFilter, "totalPending", "kBase", parseInt(e.target.value) || 0)}
                          className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                        />
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 border border-gray-300">Total Load</td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalBooked.pcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalBooked.grWt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalBooked.mABase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalBooked.lBase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalBooked.kBase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalPending.pcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalPending.grWt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalPending.mABase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalPending.lBase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalPending.kBase}
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
                      {recalculatedScreeningData.overall.totalPending.pcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalPending.grWt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalPending.mABase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalPending.lBase}
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-center">
                      {recalculatedScreeningData.overall.totalPending.kBase}
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

