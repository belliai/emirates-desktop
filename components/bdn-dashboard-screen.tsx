"use client"

import { useState, useMemo } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Data from CSV
const bdnData = {
  shift1: {
    timeRange: "0600-0900",
    planned: {
      pmcAmf: 210,
      alfPla: 10,
      akeRke: 116,
      sclrPcs: 0,
      total: 336,
    },
    built: {
      built: { pmcAmf: 105, alfPla: 5, akeRke: 68, sclrPcs: 0, total: 178 },
      thru: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0, total: 0 },
      total: { pmcAmf: 105, alfPla: 5, akeRke: 68, sclrPcs: 0, total: 178 },
    },
    pending: {
      pmcAmf: 105,
      alfPla: 5,
      akeRke: 48,
      sclrPcs: 0,
      total: 158,
    },
  },
  shift2: {
    timeRange: "0901-1259",
    planned: {
      pmcAmf: 159,
      alfPla: 17,
      akeRke: 79,
      sclrPcs: 0,
      total: 255,
    },
    built: {
      built: { pmcAmf: 63, alfPla: 10, akeRke: 31, sclrPcs: 0, total: 104 },
      thru: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0, total: 0 },
      total: { pmcAmf: 63, alfPla: 10, akeRke: 31, sclrPcs: 0, total: 104 },
    },
    pending: {
      pmcAmf: 96,
      alfPla: 7,
      akeRke: 48,
      sclrPcs: 0,
      total: 151,
    },
  },
}

const chartData = [
  {
    shift: "0600-0900",
    planned: bdnData.shift1.planned.total,
    advance: bdnData.shift1.built.total.total,
    pending: bdnData.shift1.pending.total,
    // Breakdown for tooltip
    advancePMC: bdnData.shift1.built.total.pmcAmf,
    advanceALF: bdnData.shift1.built.total.alfPla,
    advanceAKE: bdnData.shift1.built.total.akeRke,
    advanceSCLR: bdnData.shift1.built.total.sclrPcs,
    pendingPMC: bdnData.shift1.pending.pmcAmf,
    pendingALF: bdnData.shift1.pending.alfPla,
    pendingAKE: bdnData.shift1.pending.akeRke,
    pendingSCLR: bdnData.shift1.pending.sclrPcs,
  },
  {
    shift: "0901-1259",
    planned: bdnData.shift2.planned.total,
    advance: bdnData.shift2.built.total.total,
    pending: bdnData.shift2.pending.total,
    // Breakdown for tooltip
    advancePMC: bdnData.shift2.built.total.pmcAmf,
    advanceALF: bdnData.shift2.built.total.alfPla,
    advanceAKE: bdnData.shift2.built.total.akeRke,
    advanceSCLR: bdnData.shift2.built.total.sclrPcs,
    pendingPMC: bdnData.shift2.pending.pmcAmf,
    pendingALF: bdnData.shift2.pending.alfPla,
    pendingAKE: bdnData.shift2.pending.akeRke,
    pendingSCLR: bdnData.shift2.pending.sclrPcs,
  },
]

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-xs">
        <div className="font-semibold text-gray-900 mb-3 text-sm">{data.shift}</div>
        <div className="space-y-2">
          <div className="font-semibold text-gray-700">Advance Built:</div>
          <div className="pl-2 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">PMC-AMF:</span>
              <span className="font-semibold">{data.advancePMC}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">ALF-PLA:</span>
              <span className="font-semibold">{data.advanceALF}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">AKE-RKE:</span>
              <span className="font-semibold">{data.advanceAKE}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">SCLR Pcs:</span>
              <span className="font-semibold">{data.advanceSCLR}</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-gray-200 mt-1">
              <span className="font-semibold text-gray-700">Total:</span>
              <span className="font-semibold">{data.advance}</span>
            </div>
          </div>
          <div className="font-semibold text-gray-700 mt-3">Pending:</div>
          <div className="pl-2 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">PMC-AMF:</span>
              <span className="font-semibold">{data.pendingPMC}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">ALF-PLA:</span>
              <span className="font-semibold">{data.pendingALF}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">AKE-RKE:</span>
              <span className="font-semibold">{data.pendingAKE}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">SCLR Pcs:</span>
              <span className="font-semibold">{data.pendingSCLR}</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-gray-200 mt-1">
              <span className="font-semibold text-gray-700">Total:</span>
              <span className="font-semibold">{data.pending}</span>
            </div>
          </div>
          <div className="flex justify-between gap-4 pt-2 border-t border-gray-300 mt-2">
            <span className="font-semibold text-gray-900">Planned Total:</span>
            <span className="font-semibold text-gray-900">{data.planned}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

// Screening data based on image
const screeningData = {
  overall: {
    totalBooked: { pcs: 6711, grWt: 136169, mABase: 74, lBase: 21, kBase: 41 },
    totalPending: { pcs: 0, grWt: 0, mABase: 6, lBase: 0, kBase: 2 },
  },
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
}

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
  { flight: "EK0953", dest: "BEY", etd: "15:10", screenedShipments: 0, screenedPcs: 0, screenedGrWt: 0, toBeScreenedShipments: 0, toBeScreenedPcs: 0, toBeScreenedGrWt: 0, buildMABase: 2, buildLBase: 1, buildKBase: 1, toBuildMABase: 0, toBuildLBase: 0, toBuildKBase: 0 },
]

const ScreeningTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold text-gray-900 mb-2">{data.name}</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">No of Pcs:</span>
            <span className="font-semibold">{data.pcs.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Gr. Wt:</span>
            <span className="font-semibold">{data.grWt.toLocaleString()}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

// Work area data - GCR > PER > PIL
const workAreaData = {
  overall: {
    GCR: { total: 85, remaining: 45 },
    PER: { total: 62, remaining: 28 },
    PIL: { total: 48, remaining: 22 },
  },
  E75: {
    GCR: { total: 35, remaining: 18 },
    PER: { total: 25, remaining: 12 },
    PIL: { total: 20, remaining: 9 },
  },
  L22: {
    GCR: { total: 28, remaining: 15 },
    PER: { total: 20, remaining: 8 },
    PIL: { total: 15, remaining: 7 },
  },
  // Add more work areas as needed
}

export default function BDNDashboardScreen() {
  const [isTableOpen, setIsTableOpen] = useState(false)
  const [isScreeningTableOpen, setIsScreeningTableOpen] = useState(false)
  const [screeningFilter, setScreeningFilter] = useState<"overall" | "usaCaScreening" | "usaCaNoScreening" | "otherSectorScreening">("overall")
  const [workAreaFilter, setWorkAreaFilter] = useState<"overall" | "sortByWorkArea">("overall")
  const [selectedWorkArea, setSelectedWorkArea] = useState<string>("E75")
  
  // State for editable screening data
  const [editableScreeningData, setEditableScreeningData] = useState(screeningData)
  
  // State for editable flight details
  const [editableFlightDetails, setEditableFlightDetails] = useState(flightDetails)
  
  // Recalculate overall totals automatically
  const recalculatedScreeningData = useMemo(() => {
    const newOverall = {
      totalBooked: {
        pcs: editableScreeningData.usaCaScreening.totalBooked.pcs + 
             editableScreeningData.usaCaNoScreening.totalBooked.pcs + 
             editableScreeningData.otherSectorScreening.totalBooked.pcs,
        grWt: editableScreeningData.usaCaScreening.totalBooked.grWt + 
              editableScreeningData.usaCaNoScreening.totalBooked.grWt + 
              editableScreeningData.otherSectorScreening.totalBooked.grWt,
        mABase: editableScreeningData.usaCaScreening.totalBooked.mABase + 
                editableScreeningData.usaCaNoScreening.totalBooked.mABase + 
                editableScreeningData.otherSectorScreening.totalBooked.mABase,
        lBase: editableScreeningData.usaCaScreening.totalBooked.lBase + 
               editableScreeningData.usaCaNoScreening.totalBooked.lBase + 
               editableScreeningData.otherSectorScreening.totalBooked.lBase,
        kBase: editableScreeningData.usaCaScreening.totalBooked.kBase + 
               editableScreeningData.usaCaNoScreening.totalBooked.kBase + 
               editableScreeningData.otherSectorScreening.totalBooked.kBase,
      },
      totalPending: {
        pcs: editableScreeningData.usaCaScreening.totalPending.pcs + 
             editableScreeningData.usaCaNoScreening.totalPending.pcs + 
             editableScreeningData.otherSectorScreening.totalPending.pcs,
        grWt: editableScreeningData.usaCaScreening.totalPending.grWt + 
              editableScreeningData.usaCaNoScreening.totalPending.grWt + 
              editableScreeningData.otherSectorScreening.totalPending.grWt,
        mABase: editableScreeningData.usaCaScreening.totalPending.mABase + 
                editableScreeningData.usaCaNoScreening.totalPending.mABase + 
                editableScreeningData.otherSectorScreening.totalPending.mABase,
        lBase: editableScreeningData.usaCaScreening.totalPending.lBase + 
               editableScreeningData.usaCaNoScreening.totalPending.lBase + 
               editableScreeningData.otherSectorScreening.totalPending.lBase,
        kBase: editableScreeningData.usaCaScreening.totalPending.kBase + 
               editableScreeningData.usaCaNoScreening.totalPending.kBase + 
               editableScreeningData.otherSectorScreening.totalPending.kBase,
      },
    }
    
    return {
      ...editableScreeningData,
      overall: newOverall,
    }
  }, [editableScreeningData.usaCaScreening, editableScreeningData.usaCaNoScreening, editableScreeningData.otherSectorScreening])
  
  // Helper function to update screening data
  const updateScreeningData = (
    category: keyof typeof screeningData,
    field: "totalBooked" | "totalPending",
    subField: "pcs" | "grWt" | "mABase" | "lBase" | "kBase",
    value: number
  ) => {
    if (category === "overall") return // Don't allow editing overall directly
    
    setEditableScreeningData((prev) => ({
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

  const filterLabels: Record<typeof screeningFilter, string> = {
    overall: "Overall",
    usaCaScreening: "USA & CA Screening",
    usaCaNoScreening: "USA & CA No Screening",
    otherSectorScreening: "Other Sector Screening",
  }

  const currentWorkAreaData = workAreaData[workAreaFilter === "overall" ? "overall" : (selectedWorkArea as keyof typeof workAreaData)] || workAreaData.overall
  const maxBarValue = 100 // Fixed maximum value for bar width

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">Workload Visibility</h1>
        </div>

        {/* Top Half - Workload */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Workload</h3>
            <div className="flex gap-2">
              <Select
                value={workAreaFilter}
                onValueChange={(value) => {
                  setWorkAreaFilter(value as "overall" | "sortByWorkArea")
                  if (value === "overall") {
                    setSelectedWorkArea("E75")
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue>
                    {workAreaFilter === "overall" ? "Overall" : "Sort by work area"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall</SelectItem>
                  <SelectItem value="sortByWorkArea">Sort by work area</SelectItem>
                </SelectContent>
              </Select>
              {workAreaFilter === "sortByWorkArea" && (
                <Select value={selectedWorkArea} onValueChange={setSelectedWorkArea}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue>{selectedWorkArea}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E75">E75</SelectItem>
                    <SelectItem value="L22">L22</SelectItem>
                    {/* Add more work areas as needed */}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {(["GCR", "PER", "PIL"] as const).map((area) => {
              const data = currentWorkAreaData[area]
              const completed = data.total - data.remaining
              const totalPercentage = (data.total / maxBarValue) * 100
              const completedPercentage = (completed / data.total) * 100
              const remainingPercentage = (data.remaining / data.total) * 100

              return (
                <div key={area} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium text-gray-700">{area}</div>
                  <div className="flex-1 relative">
                    <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                      {/* Bar container with width based on total out of 100 */}
                      <div
                        className="absolute left-0 top-0 h-8 flex transition-all"
                        style={{ width: `${totalPercentage}%` }}
                      >
                        {/* Completed portion (red) */}
                        <div
                          className="bg-[#DC2626] h-8 flex items-center justify-start px-3"
                          style={{ width: `${completedPercentage}%` }}
                        >
                          <span className="text-white text-sm font-semibold">{completed}</span>
                        </div>
                        {/* Remaining portion (pink) */}
                        <div
                          className="h-8 flex items-center justify-end px-3"
                          style={{ width: `${remainingPercentage}%`, backgroundColor: "rgba(220, 38, 38, 0.4)" }}
                        >
                          <span className="text-white text-sm font-semibold">{data.remaining}</span>
            </div>
            </div>
          </div>
                    {/* Total label */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-700">
                      {data.total} Total
            </div>
          </div>
            </div>
              )
            })}
          </div>
        </div>

        {/* Lower Half - Split into Left and Right */}
        <div className="flex gap-4">
          {/* Left Half - Graph and Table */}
          <div className="w-1/2 space-y-4">
            {/* Single Bar Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Advance Planned v/s Built</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="shift"
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      stroke="#9CA3AF"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      stroke="#9CA3AF"
                    />
                    <Tooltip 
                      content={<CustomTooltip />} 
                      position={{ x: undefined, y: undefined }}
                      allowEscapeViewBox={true}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", paddingTop: "20px", pointerEvents: "none" }}
                      iconSize={12}
                    />
                    <Bar
                      dataKey="advance"
                      stackId="stack"
                      fill="#DC2626"
                      name="Advance Built"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="pending"
                      stackId="stack"
                      fill="rgba(220, 38, 38, 0.4)"
                      name="Pending"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Collapsible Table */}
            <Collapsible open={isTableOpen} onOpenChange={setIsTableOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <h3 className="text-lg font-semibold text-gray-900">Detailed Breakdown</h3>
                  {isTableOpen ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-white rounded-lg border border-gray-200 border-t-0 overflow-hidden">
                  <div className="p-4 space-y-6">
                    {/* Shift 1: 0600-0900 */}
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900">
                        Advance planned v/s Built ({bdnData.shift1.timeRange})
                      </h4>

                      {/* Planned Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Planned</div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                              <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                              <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                              <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                              <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                              <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">Planned</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.planned.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.planned.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.planned.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{bdnData.shift1.planned.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center font-semibold">{bdnData.shift1.planned.total}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Advance Built Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Advance built</div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                              <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                              <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                              <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                              <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                              <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">Built</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.built.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.built.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.built.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{bdnData.shift1.built.built.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.built.total}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">Thru</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.thru.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.thru.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.thru.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{bdnData.shift1.built.thru.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.thru.total}</td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.total.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.total.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.total.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.total.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.total.total}</td>
                            </tr>
                          </tbody>
                        </table>
                    </div>

                      {/* Pending Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Pending</div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">ULD Details</th>
                              <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                              <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                              <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                              <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                              <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">To action</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.pending.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.pending.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.pending.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.pending.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.pending.total}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Shift 2: 0901-1259 */}
                    <div className="space-y-4 border-t border-gray-300 pt-6">
                      <h4 className="text-base font-semibold text-gray-900">
                        Advance planned v/s Built ({bdnData.shift2.timeRange})
                      </h4>

                      {/* Planned Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Planned</div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                              <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                              <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                              <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                              <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                              <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">Planned</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.planned.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.planned.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.planned.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{bdnData.shift2.planned.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center font-semibold">{bdnData.shift2.planned.total}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Advance Built Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Advance built</div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                              <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                              <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                              <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                              <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                              <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">Built</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.built.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.built.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.built.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{bdnData.shift2.built.built.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.built.total}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">Thru</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.thru.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.thru.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.thru.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{bdnData.shift2.built.thru.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.thru.total}</td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.total.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.total.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.total.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.total.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.total.total}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Pending Section */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Pending</div>
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left border border-gray-300">ULD Details</th>
                              <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                              <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                              <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                              <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                              <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">To action</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.pending.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.pending.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.pending.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.pending.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.pending.total}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Total Advance */}
                    <div className="space-y-4 border-t border-gray-300 pt-6">
                      <h4 className="text-base font-semibold text-gray-900">Total Advance</h4>
                      <table className="w-full text-xs border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                            <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                            <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                            <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                            <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                            <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300 font-medium">{bdnData.shift1.timeRange}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.total.pmcAmf}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.total.alfPla}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.total.akeRke}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.total.sclrPcs}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.built.total.total}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300 font-medium">{bdnData.shift2.timeRange}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.total.pmcAmf}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.total.alfPla}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.total.akeRke}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.total.sclrPcs}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.built.total.total}</td>
                          </tr>
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.pmcAmf + bdnData.shift2.built.total.pmcAmf}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.alfPla + bdnData.shift2.built.total.alfPla}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.akeRke + bdnData.shift2.built.total.akeRke}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.sclrPcs + bdnData.shift2.built.total.sclrPcs}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {bdnData.shift1.built.total.total + bdnData.shift2.built.total.total}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Total Pending */}
                    <div className="space-y-4 border-t border-gray-300 pt-6">
                      <h4 className="text-base font-semibold text-gray-900">Total Pending</h4>
                      <table className="w-full text-xs border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                            <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                            <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                            <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                            <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                            <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300 font-medium">{bdnData.shift1.timeRange}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.pending.pmcAmf}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.pending.alfPla}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.pending.akeRke}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.pending.sclrPcs}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.pending.total}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300 font-medium">{bdnData.shift2.timeRange}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.pending.pmcAmf}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.pending.alfPla}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.pending.akeRke}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.pending.sclrPcs}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.pending.total}</td>
                          </tr>
                          <tr className="bg-red-50 font-semibold">
                            <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                              {bdnData.shift1.pending.pmcAmf + bdnData.shift2.pending.pmcAmf}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                              {bdnData.shift1.pending.alfPla + bdnData.shift2.pending.alfPla}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                              {bdnData.shift1.pending.akeRke + bdnData.shift2.pending.akeRke}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                              {bdnData.shift1.pending.sclrPcs + bdnData.shift2.pending.sclrPcs}
                            </td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                              {bdnData.shift1.pending.total + bdnData.shift2.pending.total}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
                  </div>

          {/* Right Half - Screening Graph and Tables */}
          <div className="w-1/2 space-y-4">
            {/* Bar Chart for M/A Base, L Base, K Base */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Screening Summary</h3>
                <Select value={screeningFilter} onValueChange={(value) => setScreeningFilter(value as typeof screeningFilter)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue>{filterLabels[screeningFilter]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overall">Overall</SelectItem>
                    <SelectItem value="usaCaScreening">USA & CA Screening</SelectItem>
                    <SelectItem value="usaCaNoScreening">USA & CA No Screening</SelectItem>
                    <SelectItem value="otherSectorScreening">Other Sector Screening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "M/A Base",
                        value: recalculatedScreeningData[screeningFilter].totalBooked.mABase,
                        pcs: recalculatedScreeningData[screeningFilter].totalBooked.mABase,
                        grWt: recalculatedScreeningData[screeningFilter].totalBooked.grWt,
                        color: "#DC2626", // Red
                      },
                      {
                        name: "L Base",
                        value: recalculatedScreeningData[screeningFilter].totalBooked.lBase,
                        pcs: recalculatedScreeningData[screeningFilter].totalBooked.lBase,
                        grWt: recalculatedScreeningData[screeningFilter].totalBooked.grWt,
                        color: "#EF4444", // Lighter red
                      },
                      {
                        name: "K Base",
                        value: recalculatedScreeningData[screeningFilter].totalBooked.kBase,
                        pcs: recalculatedScreeningData[screeningFilter].totalBooked.kBase,
                        grWt: recalculatedScreeningData[screeningFilter].totalBooked.grWt,
                        color: "#B91C1C", // Darker red
                      },
                    ]}
                  >
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
                      {[
                        { name: "M/A Base", color: "#DC2626" },
                        { name: "L Base", color: "#EF4444" },
                        { name: "K Base", color: "#B91C1C" },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Collapsible Screening Tables */}
            <Collapsible open={isScreeningTableOpen} onOpenChange={setIsScreeningTableOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <h3 className="text-lg font-semibold text-gray-900">Detailed Breakdown</h3>
                  {isScreeningTableOpen ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                              </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-white rounded-lg border border-gray-200 border-t-0 overflow-hidden">
                  <div className="p-4 space-y-6">
                    {/* SCREENING SUMMARY Table */}
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900">SCREENING SUMMARY</h4>
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
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">USA & CA Screening</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaScreening.totalBooked.pcs}
                                  onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "pcs", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaScreening.totalBooked.grWt}
                                  onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "grWt", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaScreening.totalBooked.mABase}
                                  onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "mABase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaScreening.totalBooked.lBase}
                                  onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "lBase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaScreening.totalBooked.kBase}
                                  onChange={(e) => updateScreeningData("usaCaScreening", "totalBooked", "kBase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaScreening.totalPending.pcs}
                                  onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "pcs", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaScreening.totalPending.grWt}
                                  onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "grWt", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaScreening.totalPending.mABase}
                                  onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "mABase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaScreening.totalPending.lBase}
                                  onChange={(e) => updateScreeningData("usaCaScreening", "totalPending", "lBase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaScreening.totalPending.kBase}
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
                                  value={editableScreeningData.usaCaNoScreening.totalBooked.pcs}
                                  onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "pcs", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaNoScreening.totalBooked.grWt}
                                  onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "grWt", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaNoScreening.totalBooked.mABase}
                                  onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "mABase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaNoScreening.totalBooked.lBase}
                                  onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "lBase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaNoScreening.totalBooked.kBase}
                                  onChange={(e) => updateScreeningData("usaCaNoScreening", "totalBooked", "kBase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaNoScreening.totalPending.pcs}
                                  onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "pcs", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaNoScreening.totalPending.grWt}
                                  onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "grWt", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaNoScreening.totalPending.mABase}
                                  onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "mABase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaNoScreening.totalPending.lBase}
                                  onChange={(e) => updateScreeningData("usaCaNoScreening", "totalPending", "lBase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.usaCaNoScreening.totalPending.kBase}
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
                                  value={editableScreeningData.otherSectorScreening.totalBooked.pcs}
                                  onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "pcs", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.otherSectorScreening.totalBooked.grWt}
                                  onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "grWt", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.otherSectorScreening.totalBooked.mABase}
                                  onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "mABase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.otherSectorScreening.totalBooked.lBase}
                                  onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "lBase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.otherSectorScreening.totalBooked.kBase}
                                  onChange={(e) => updateScreeningData("otherSectorScreening", "totalBooked", "kBase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.otherSectorScreening.totalPending.pcs}
                                  onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "pcs", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.otherSectorScreening.totalPending.grWt}
                                  onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "grWt", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border border-blue-300 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.otherSectorScreening.totalPending.mABase}
                                  onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "mABase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.otherSectorScreening.totalPending.lBase}
                                  onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "lBase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-center">
                                <input
                                  type="number"
                                  value={editableScreeningData.otherSectorScreening.totalPending.kBase}
                                  onChange={(e) => updateScreeningData("otherSectorScreening", "totalPending", "kBase", parseInt(e.target.value) || 0)}
                                  className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                />
                              </td>
                            </tr>
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
                          </tbody>
                        </table>
                              </div>
                            </div>

                    {/* US SCREENING & LOADING DETAILS Table */}
                    <div className="space-y-4 border-t border-gray-300 pt-6">
                      <h4 className="text-base font-semibold text-gray-900">US SCREENING & LOADING DETAILS</h4>
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
                                    className="w-full text-center border-2 border-blue-400 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                                  />
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  <input
                                    type="number"
                                    value={flight.screenedPcs}
                                    onChange={(e) => updateFlightDetail(idx, "screenedPcs", parseInt(e.target.value) || 0)}
                                    className="w-full text-center border-2 border-blue-400 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                                  />
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  <input
                                    type="number"
                                    value={flight.screenedGrWt}
                                    onChange={(e) => updateFlightDetail(idx, "screenedGrWt", parseInt(e.target.value) || 0)}
                                    className="w-full text-center border-2 border-blue-400 rounded bg-blue-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
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
                                    className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                  />
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  <input
                                    type="number"
                                    value={flight.buildLBase}
                                    onChange={(e) => updateFlightDetail(idx, "buildLBase", parseInt(e.target.value) || 0)}
                                    className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
                                  />
                                </td>
                                <td className="px-2 py-2 border border-gray-300 text-center">
                                  <input
                                    type="number"
                                    value={flight.buildKBase}
                                    onChange={(e) => updateFlightDetail(idx, "buildKBase", parseInt(e.target.value) || 0)}
                                    className="w-full text-center border-2 border-yellow-400 rounded bg-yellow-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
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
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  )
}
