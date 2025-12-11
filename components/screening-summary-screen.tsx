"use client"

import { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"

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

// US Screening & Loading Details flight data
const flightDetails = [
  { flight: "EK0213", dest: "MIA-BOG", etd: "02:15", screenedShipments: 0, screenedPcs: 0, screenedGrWt: 0, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 1, buildLBase: 0, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0231", dest: "IAD", etd: "02:20", screenedShipments: 0, screenedPcs: 5, screenedGrWt: 1285, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 1, buildLBase: 1, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0243", dest: "YUL", etd: "02:30", screenedShipments: 0, screenedPcs: 0, screenedGrWt: 0, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 0, buildLBase: 0, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0221", dest: "DFW", etd: "02:40", screenedShipments: 0, screenedPcs: 0, screenedGrWt: 0, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 0, buildLBase: 0, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0203", dest: "JFK", etd: "02:50", screenedShipments: 0, screenedPcs: 0, screenedGrWt: 0, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 0, buildLBase: 0, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0241", dest: "YYZ", etd: "03:30", screenedShipments: 0, screenedPcs: 0, screenedGrWt: 0, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 0, buildLBase: 0, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0237", dest: "BOS", etd: "08:20", screenedShipments: 2, screenedPcs: 822, screenedGrWt: 9242, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 4, buildLBase: 0, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0201", dest: "JFK", etd: "08:30", screenedShipments: 5, screenedPcs: 120, screenedGrWt: 1230, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 4, buildLBase: 1, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0215", dest: "LAX", etd: "08:55", screenedShipments: 0, screenedPcs: 0, screenedGrWt: 0, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 0, buildLBase: 4, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0225", dest: "SFO", etd: "09:10", screenedShipments: 2, screenedPcs: 11, screenedGrWt: 289, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 0, buildLBase: 0, buildKBase: 1, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0205", dest: "JFK", etd: "09:30", screenedShipments: 1, screenedPcs: 45, screenedGrWt: 1300, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 0, buildLBase: 0, buildKBase: 2, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0211", dest: "IAH", etd: "09:30", screenedShipments: 3, screenedPcs: 4, screenedGrWt: 22, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 1, buildLBase: 0, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0235", dest: "ORD", etd: "09:55", screenedShipments: 2, screenedPcs: 360, screenedGrWt: 4205, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 1, buildLBase: 0, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0229", dest: "SEA", etd: "09:55", screenedShipments: 0, screenedPcs: 0, screenedGrWt: 0, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 0, buildLBase: 0, buildKBase: 1, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0209", dest: "EWR", etd: "10:50", screenedShipments: 1, screenedPcs: 4, screenedGrWt: 160, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 0, buildLBase: 1, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0957", dest: "BEY", etd: "07:35", screenedShipments: 0, screenedPcs: 0, screenedGrWt: 0, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 8, buildLBase: 0, buildKBase: 2, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0943", dest: "BGW", etd: "12:40", screenedShipments: 0, screenedPcs: 0, screenedGrWt: 0, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 3, buildLBase: 0, buildKBase: 0, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
  { flight: "EK0953", dest: "BEY", etd: "15:10", screenedShipments: 0, screenedPcs: 0, screenedGrWt: 0, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 2, buildLBase: 1, buildKBase: 1, toBuildMABase: 6, toBuildLBase: 0, toBuildKBase: 2 },
]

export default function ScreeningSummaryScreen() {
  const [screeningFilter, setScreeningFilter] = useState<ScreeningFilter>("overall")
  const [screeningData, setScreeningData] = useState(initialScreeningData)
  const [isUSDetailsOpen, setIsUSDetailsOpen] = useState(false)
  const [editableFlightDetails, setEditableFlightDetails] = useState(flightDetails)

  const filterLabels: Record<ScreeningFilter, string> = {
    overall: "Total Load",
    usaCaScreening: "USA & CA Screening",
    usaCaNoScreening: "USA & CA No Screening",
    otherSectorScreening: "Other Sector Screening",
  }

  // Calculate total screened values from flight details
  const totalScreenedValues = useMemo(() => {
    return editableFlightDetails.reduce(
      (acc, flight) => ({
        shipments: acc.shipments + flight.screenedShipments,
        pcs: acc.pcs + flight.screenedPcs,
        grWt: acc.grWt + flight.screenedGrWt,
      }),
      { shipments: 0, pcs: 0, grWt: 0 }
    )
  }, [editableFlightDetails])

  // Recalculate overall totals automatically with auto-calculated pending pcs and grWt
  const recalculatedScreeningData = useMemo(() => {
    // Auto-calculate totalPending.pcs and totalPending.grWt for each category
    const usaCaScreeningWithCalc = {
      ...screeningData.usaCaScreening,
      totalPending: {
        ...screeningData.usaCaScreening.totalPending,
        pcs: Math.max(0, screeningData.usaCaScreening.totalBooked.pcs - totalScreenedValues.pcs),
        grWt: Math.max(0, screeningData.usaCaScreening.totalBooked.grWt - totalScreenedValues.grWt),
      },
    }

    const usaCaNoScreeningWithCalc = {
      ...screeningData.usaCaNoScreening,
      totalPending: {
        ...screeningData.usaCaNoScreening.totalPending,
        pcs: Math.max(0, screeningData.usaCaNoScreening.totalBooked.pcs - 0),
        grWt: Math.max(0, screeningData.usaCaNoScreening.totalBooked.grWt - 0),
      },
    }

    const otherSectorScreeningWithCalc = {
      ...screeningData.otherSectorScreening,
      totalPending: {
        ...screeningData.otherSectorScreening.totalPending,
        pcs: Math.max(0, screeningData.otherSectorScreening.totalBooked.pcs - 0),
        grWt: Math.max(0, screeningData.otherSectorScreening.totalBooked.grWt - 0),
      },
    }

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
        pcs: usaCaScreeningWithCalc.totalPending.pcs + 
             usaCaNoScreeningWithCalc.totalPending.pcs + 
             otherSectorScreeningWithCalc.totalPending.pcs,
        grWt: usaCaScreeningWithCalc.totalPending.grWt + 
              usaCaNoScreeningWithCalc.totalPending.grWt + 
              otherSectorScreeningWithCalc.totalPending.grWt,
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
      usaCaScreening: usaCaScreeningWithCalc,
      usaCaNoScreening: usaCaNoScreeningWithCalc,
      otherSectorScreening: otherSectorScreeningWithCalc,
      overall: newOverall,
    }
  }, [screeningData, totalScreenedValues])

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

  // Helper function to update flight details
  const updateFlightDetail = (
    index: number,
    field: keyof typeof flightDetails[0],
    value: number | string
  ) => {
    setEditableFlightDetails((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
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
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalBooked.grWt}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "grWt", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalBooked.mABase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalBooked.lBase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalBooked.kBase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center bg-gray-100">
                          <div className="text-center text-gray-700 font-medium">
                            {recalculatedScreeningData.usaCaScreening.totalPending.pcs.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center bg-gray-100">
                          <div className="text-center text-gray-700 font-medium">
                            {recalculatedScreeningData.usaCaScreening.totalPending.grWt.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalPending.mABase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalPending.lBase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaScreening.totalPending.kBase}
                            onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
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
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalBooked.grWt}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "grWt", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalBooked.mABase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalBooked.lBase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalBooked.kBase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center bg-gray-100">
                          <div className="text-center text-gray-700 font-medium">
                            {recalculatedScreeningData.usaCaNoScreening.totalPending.pcs.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center bg-gray-100">
                          <div className="text-center text-gray-700 font-medium">
                            {recalculatedScreeningData.usaCaNoScreening.totalPending.grWt.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalPending.mABase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalPending.lBase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.usaCaNoScreening.totalPending.kBase}
                            onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
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
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalBooked.grWt}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "grWt", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalBooked.mABase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalBooked.lBase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalBooked.kBase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center bg-gray-100">
                          <div className="text-center text-gray-700 font-medium">
                            {recalculatedScreeningData.otherSectorScreening.totalPending.pcs.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center bg-gray-100">
                          <div className="text-center text-gray-700 font-medium">
                            {recalculatedScreeningData.otherSectorScreening.totalPending.grWt.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalPending.mABase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "mABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalPending.lBase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "lBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={screeningData.otherSectorScreening.totalPending.kBase}
                            onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "kBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
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
                      <td className="px-2 py-2 border border-gray-300 text-center bg-gray-100">
                        <div className="text-center text-gray-700 font-medium">
                          {recalculatedScreeningData[screeningFilter].totalPending.pcs.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center bg-gray-100">
                        <div className="text-center text-gray-700 font-medium">
                          {recalculatedScreeningData[screeningFilter].totalPending.grWt.toLocaleString()}
                        </div>
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

        {/* US SCREENING & LOADING DETAILS Table */}
        <Collapsible open={isUSDetailsOpen} onOpenChange={setIsUSDetailsOpen} className="mt-4">
          <CollapsibleTrigger className="w-full">
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900">US SCREENING & LOADING DETAILS</h3>
              {isUSDetailsOpen ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-white rounded-lg border border-gray-200 border-t-0 p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th rowSpan={2} className="px-2 py-2 text-left border border-gray-300">Flight No</th>
                      <th rowSpan={2} className="px-2 py-2 text-center border border-gray-300">DEST</th>
                      <th rowSpan={2} className="px-2 py-2 text-center border border-gray-300">ETD</th>
                      <th colSpan={3} className="px-2 py-2 text-center border border-gray-300">
                        Screened
                      </th>
                      <th colSpan={3} className="px-2 py-2 text-center border border-gray-300">
                        To be screened
                      </th>
                      <th colSpan={3} className="px-2 py-2 text-center border border-gray-300">
                        Units Build
                      </th>
                      <th colSpan={3} className="px-2 py-2 text-center border border-gray-300">
                        Units to be Build
                      </th>
                    </tr>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 text-center border border-gray-300">No of shipments</th>
                      <th className="px-2 py-2 text-center border border-gray-300">No of Pcs</th>
                      <th className="px-2 py-2 text-center border border-gray-300">Gr. Wt.</th>
                      <th className="px-2 py-2 text-center border border-gray-300">No of shipments</th>
                      <th className="px-2 py-2 text-center border border-gray-300">No of Pcs</th>
                      <th className="px-2 py-2 text-center border border-gray-300">Gr. Wt.</th>
                      <th className="px-2 py-2 text-center border border-gray-300">M/A Base</th>
                      <th className="px-2 py-2 text-center border border-gray-300">L Base</th>
                      <th className="px-2 py-2 text-center border border-gray-300">K Base</th>
                      <th className="px-2 py-2 text-center border border-gray-300">M/A Base</th>
                      <th className="px-2 py-2 text-center border border-gray-300">L Base</th>
                      <th className="px-2 py-2 text-center border border-gray-300">K Base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableFlightDetails.map((flight, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-2 py-2 border border-gray-300 font-medium">
                          <input
                            type="text"
                            value={flight.flight}
                            onChange={(e) => updateFlightDetail(idx, "flight", e.target.value)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="text"
                            value={flight.dest}
                            onChange={(e) => updateFlightDetail(idx, "dest", e.target.value)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="text"
                            value={flight.etd}
                            onChange={(e) => updateFlightDetail(idx, "etd", e.target.value)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={flight.screenedShipments}
                            onChange={(e) => updateFlightDetail(idx, "screenedShipments", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={flight.screenedPcs}
                            onChange={(e) => updateFlightDetail(idx, "screenedPcs", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={flight.screenedGrWt}
                            onChange={(e) => updateFlightDetail(idx, "screenedGrWt", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                          <input
                            type="number"
                            value={flight.toBeScreenedShipments}
                            onChange={(e) => updateFlightDetail(idx, "toBeScreenedShipments", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                            placeholder={flight.toBeScreenedShipments === 0 ? "LOADING OVER" : ""}
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                          <input
                            type="number"
                            value={flight.toBeScreenedPcs}
                            onChange={(e) => updateFlightDetail(idx, "toBeScreenedPcs", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                            placeholder={flight.toBeScreenedPcs === 0 ? "LOADING OVER" : ""}
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                          <input
                            type="number"
                            value={flight.toBeScreenedGrWt}
                            onChange={(e) => updateFlightDetail(idx, "toBeScreenedGrWt", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                            placeholder={flight.toBeScreenedGrWt === 0 ? "LOADING OVER" : ""}
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={flight.buildMABase}
                            onChange={(e) => updateFlightDetail(idx, "buildMABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={flight.buildLBase}
                            onChange={(e) => updateFlightDetail(idx, "buildLBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center">
                          <input
                            type="number"
                            value={flight.buildKBase}
                            onChange={(e) => updateFlightDetail(idx, "buildKBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                          <input
                            type="number"
                            value={flight.toBuildMABase}
                            onChange={(e) => updateFlightDetail(idx, "toBuildMABase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                            placeholder={flight.toBuildMABase === 0 ? "LOADING OVER" : ""}
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                          <input
                            type="number"
                            value={flight.toBuildLBase}
                            onChange={(e) => updateFlightDetail(idx, "toBuildLBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                            placeholder={flight.toBuildLBase === 0 ? "LOADING OVER" : ""}
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                          <input
                            type="number"
                            value={flight.toBuildKBase}
                            onChange={(e) => updateFlightDetail(idx, "toBuildKBase", parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                            placeholder={flight.toBuildKBase === 0 ? "LOADING OVER" : ""}
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={3} className="px-2 py-2 border border-gray-300 text-right">
                        TOTAL
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {editableFlightDetails.reduce((sum, f) => sum + f.screenedShipments, 0)}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {editableFlightDetails.reduce((sum, f) => sum + f.screenedPcs, 0)}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {editableFlightDetails.reduce((sum, f) => sum + f.screenedGrWt, 0)}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                        LOADING OVER
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                        LOADING OVER
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">
                        LOADING OVER
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {editableFlightDetails.reduce((sum, f) => sum + f.buildMABase, 0)}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {editableFlightDetails.reduce((sum, f) => sum + f.buildLBase, 0)}
                      </td>
                      <td className="px-2 py-2 border border-gray-300 text-center">
                        {editableFlightDetails.reduce((sum, f) => sum + f.buildKBase, 0)}
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
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}

