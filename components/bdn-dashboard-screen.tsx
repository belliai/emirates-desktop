"use client"

import { useState, useMemo } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartCard, WorkAreaTreemap } from "@/components/reports/charts"
import type { WorkAreaData } from "@/components/reports/charts"

// Module type and options - reused from performance-screen.tsx
type Module = "All" | "PAX & PF build-up EUR (1st floor, E)" | "PAX & PF build-up AFR (1st floor, F)" | "PAX & PF build-up ME, SubCon, Asia (1st floor, G)" | "Build-up AUS (1st floor, H)" | "US Screening Flights (1st floor, I)" | "Freighter & PAX Breakdown & build-up (Ground floor, F)" | "IND/PAK Build-up (Ground floor, G)" | "PER (Ground floor, H)" | "PIL (Ground floor, I)"

// GCR modules (everything except PIL and PER)
const GCR_MODULES: Module[] = [
  "All",
  "PAX & PF build-up EUR (1st floor, E)",
  "PAX & PF build-up AFR (1st floor, F)",
  "PAX & PF build-up ME, SubCon, Asia (1st floor, G)",
  "Build-up AUS (1st floor, H)",
  "US Screening Flights (1st floor, I)",
  "Freighter & PAX Breakdown & build-up (Ground floor, F)",
  "IND/PAK Build-up (Ground floor, G)",
]

// PIL/PER modules
const PIL_MODULE: Module = "PIL (Ground floor, I)"
const PER_MODULE: Module = "PER (Ground floor, H)"

type PilPerSubFilter = "Both" | "PIL only" | "PER only"

// Hardcoded ULD data for each work area
const GCR_ULD_DATA = {
  pmcAmf: 45,
  alfPla: 32,
  akeRke: 58,
}

const PIL_ULD_DATA = {
  akeDpe: 28,
  alfDqf: 19,
  ldPmcAmf: 35,
  mdQ6Q7: 22,
}

const PER_ULD_DATA = {
  akeDpe: 41,
  alfDqf: 27,
  ldPmcAmf: 48,
  mdQ6Q7: 31,
}

const BOTH_PIL_PER_ULD_DATA = {
  akeDpe: PIL_ULD_DATA.akeDpe + PER_ULD_DATA.akeDpe,
  alfDqf: PIL_ULD_DATA.alfDqf + PER_ULD_DATA.alfDqf,
  ldPmcAmf: PIL_ULD_DATA.ldPmcAmf + PER_ULD_DATA.ldPmcAmf,
  mdQ6Q7: PIL_ULD_DATA.mdQ6Q7 + PER_ULD_DATA.mdQ6Q7,
}

// Data from CSV for Processed vs Remaining
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
    processed: {
      processed: { pmcAmf: 105, alfPla: 5, akeRke: 68, sclrPcs: 0, total: 178 },
      thru: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0, total: 0 },
      total: { pmcAmf: 105, alfPla: 5, akeRke: 68, sclrPcs: 0, total: 178 },
    },
    remaining: {
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
    processed: {
      processed: { pmcAmf: 63, alfPla: 10, akeRke: 31, sclrPcs: 0, total: 104 },
      thru: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0, total: 0 },
      total: { pmcAmf: 63, alfPla: 10, akeRke: 31, sclrPcs: 0, total: 104 },
    },
    remaining: {
      pmcAmf: 96,
      alfPla: 7,
      akeRke: 48,
      sclrPcs: 0,
      total: 151,
    },
  },
}

const processedChartData = [
  {
    shift: "0600-0900",
    planned: bdnData.shift1.planned.total,
    processed: bdnData.shift1.processed.total.total,
    remaining: bdnData.shift1.remaining.total,
    processedPMC: bdnData.shift1.processed.total.pmcAmf,
    processedALF: bdnData.shift1.processed.total.alfPla,
    processedAKE: bdnData.shift1.processed.total.akeRke,
    processedSCLR: bdnData.shift1.processed.total.sclrPcs,
    remainingPMC: bdnData.shift1.remaining.pmcAmf,
    remainingALF: bdnData.shift1.remaining.alfPla,
    remainingAKE: bdnData.shift1.remaining.akeRke,
    remainingSCLR: bdnData.shift1.remaining.sclrPcs,
  },
  {
    shift: "0901-1259",
    planned: bdnData.shift2.planned.total,
    processed: bdnData.shift2.processed.total.total,
    remaining: bdnData.shift2.remaining.total,
    processedPMC: bdnData.shift2.processed.total.pmcAmf,
    processedALF: bdnData.shift2.processed.total.alfPla,
    processedAKE: bdnData.shift2.processed.total.akeRke,
    processedSCLR: bdnData.shift2.processed.total.sclrPcs,
    remainingPMC: bdnData.shift2.remaining.pmcAmf,
    remainingALF: bdnData.shift2.remaining.alfPla,
    remainingAKE: bdnData.shift2.remaining.akeRke,
    remainingSCLR: bdnData.shift2.remaining.sclrPcs,
  },
]

// Screening data
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

// Custom tooltip for the Workload by ULD chart
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload || !payload.length) return null

  const value = typeof payload[0]?.value === 'number' ? payload[0].value : 0
  if (value <= 0) return null

  return (
    <div className="bg-white border border-gray-300 rounded px-3 py-2 shadow-lg">
      <p className="font-semibold text-sm mb-1">{label}</p>
      <div className="flex items-center gap-2 text-xs">
        <span
          style={{
            display: "inline-block",
            width: "10px",
            height: "10px",
            backgroundColor: "#DC2626",
            borderRadius: "2px"
          }}
        />
        <span>{value} ULDs</span>
      </div>
    </div>
  )
}

// Custom tooltip for Processed vs Remaining chart
function ProcessedTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: Record<string, number> }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    if (!data) return null
    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-xs">
        <div className="font-semibold text-gray-900 mb-3 text-sm">{data.shift}</div>
        <div className="space-y-2">
          <div className="font-semibold text-gray-700">Processed:</div>
          <div className="pl-2 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">PMC-AMF:</span>
              <span className="font-semibold">{data.processedPMC}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">ALF-PLA:</span>
              <span className="font-semibold">{data.processedALF}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">AKE-RKE:</span>
              <span className="font-semibold">{data.processedAKE}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">SCLR Pcs:</span>
              <span className="font-semibold">{data.processedSCLR}</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-gray-200 mt-1">
              <span className="font-semibold text-gray-700">Total:</span>
              <span className="font-semibold">{data.processed}</span>
            </div>
          </div>
          <div className="font-semibold text-gray-700 mt-3">Remaining:</div>
          <div className="pl-2 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">PMC-AMF:</span>
              <span className="font-semibold">{data.remainingPMC}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">ALF-PLA:</span>
              <span className="font-semibold">{data.remainingALF}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">AKE-RKE:</span>
              <span className="font-semibold">{data.remainingAKE}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">SCLR Pcs:</span>
              <span className="font-semibold">{data.remainingSCLR}</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-gray-200 mt-1">
              <span className="font-semibold text-gray-700">Total:</span>
              <span className="font-semibold">{data.remaining}</span>
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

// Custom tooltip for Screening Summary chart
function ScreeningTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { name?: string; pcs?: number; grWt?: number } }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    if (!data) return null
    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold text-gray-900 mb-2">{data.name}</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">No of Pcs:</span>
            <span className="font-semibold">{(data.pcs || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Gr. Wt:</span>
            <span className="font-semibold">{(data.grWt || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

// Work Area Treemap Data - Based on CMT floor layout
// Categories: buildup, breakdown, acceptance, delivery, per, pil, screening, inspection
// Floor: "Ground" or "1st" - arranged as rows matching physical warehouse layout
const workAreaTreemapData: WorkAreaData[] = [
  // Ground Floor Areas (left to right as per warehouse layout)
  {
    name: "MTD Area",
    shortName: "MTD",
    total: 25,
    completed: 18,
    floor: "Ground",
    category: "delivery",
  },
  {
    name: "Freighter & PAX Breakdown",
    shortName: "FRT/PAX",
    total: 45,
    completed: 28,
    floor: "Ground",
    category: "breakdown",
  },
  {
    name: "PAX Breakdown",
    shortName: "PAX BKD",
    total: 32,
    completed: 24,
    floor: "Ground",
    category: "breakdown",
  },
  {
    name: "Agency",
    shortName: "Agency",
    total: 15,
    completed: 12,
    floor: "Ground",
    category: "acceptance",
  },
  {
    name: "IND/PAK Build-up",
    shortName: "IND/PAK",
    total: 22,
    completed: 14,
    floor: "Ground",
    category: "buildup",
  },
  {
    name: "PER",
    shortName: "PER",
    total: 62,
    completed: 34,
    floor: "Ground",
    category: "per",
  },
  {
    name: "DM Inspection",
    shortName: "DM Insp",
    total: 8,
    completed: 8,
    floor: "Ground",
    category: "inspection",
  },
  {
    name: "PIL",
    shortName: "PIL",
    total: 48,
    completed: 26,
    floor: "Ground",
    category: "pil",
  },
  {
    name: "WCD Area",
    shortName: "WCD",
    total: 18,
    completed: 15,
    floor: "Ground",
    category: "delivery",
  },

  // 1st Floor Areas (left to right as per warehouse layout)
  {
    name: "PAX & PF Build-up EUR",
    shortName: "EUR",
    total: 38,
    completed: 22,
    floor: "1st",
    category: "buildup",
  },
  {
    name: "PAX & Build-up AFR",
    shortName: "AFR",
    total: 28,
    completed: 18,
    floor: "1st",
    category: "buildup",
  },
  {
    name: "PAX & PF Build-up ME/Asia",
    shortName: "ME/Asia",
    total: 42,
    completed: 30,
    floor: "1st",
    category: "buildup",
  },
  {
    name: "Build-up AUS",
    shortName: "AUS",
    total: 20,
    completed: 16,
    floor: "1st",
    category: "buildup",
  },
  {
    name: "Pax Breakdown",
    shortName: "PAX BKD",
    total: 25,
    completed: 19,
    floor: "1st",
    category: "breakdown",
  },
  {
    name: "US Screening Flights",
    shortName: "US Screen",
    total: 35,
    completed: 25,
    floor: "1st",
    category: "screening",
  },
]

export default function BDNDashboardScreen() {
  const [selectedModule, setSelectedModule] = useState<Module>("All")
  const [isTableOpen, setIsTableOpen] = useState(false)
  const [isScreeningTableOpen, setIsScreeningTableOpen] = useState(false)
  const [screeningFilter, setScreeningFilter] = useState<"overall" | "usaCaScreening" | "usaCaNoScreening" | "otherSectorScreening">("overall")
  
  // Local chip state - mutually exclusive (one must always be active)
  const [isGcrActive, setIsGcrActive] = useState(true) // true = GCR, false = PIL/PER
  const [pilPerSubFilter, setPilPerSubFilter] = useState<PilPerSubFilter>("Both")
  
  // Derived state
  const isPilPerActive = !isGcrActive
  
  // Filter available modules based on active chip
  const availableModules = useMemo(() => {
    if (isGcrActive) {
      return GCR_MODULES
    }
    // PIL/PER active
    if (pilPerSubFilter === "PIL only") {
      return ["All", PIL_MODULE] as Module[]
    }
    if (pilPerSubFilter === "PER only") {
      return ["All", PER_MODULE] as Module[]
    }
    // Both
    return ["All", PER_MODULE, PIL_MODULE] as Module[]
  }, [isGcrActive, pilPerSubFilter])
  
  // Reset selected module when switching chips if current selection is not available
  const handleChipToggle = (toGcr: boolean) => {
    if (toGcr === isGcrActive) return // No change
    
    setIsGcrActive(toGcr)
    setSelectedModule("All") // Reset to "All" when switching
    
    if (!toGcr) {
      // Switching to PIL/PER, reset sub-filter
      setPilPerSubFilter("Both")
    }
  }
  
  // Handle PIL/PER sub-filter change
  const handlePilPerSubFilterChange = (newFilter: PilPerSubFilter) => {
    setPilPerSubFilter(newFilter)
    setSelectedModule("All") // Reset module selection when sub-filter changes
  }

  const filterLabels: Record<typeof screeningFilter, string> = {
    overall: "Overall",
    usaCaScreening: "USA & CA Screening",
    usaCaNoScreening: "USA & CA No Screening",
    otherSectorScreening: "Other Sector Screening",
  }

  // Compute chart data based on filter state (chips are mutually exclusive)
  const chartData = useMemo(() => {
    // GCR active
    if (isGcrActive) {
      return [
        { type: "PMC-AMF", value: GCR_ULD_DATA.pmcAmf, color: "#DC2626" },
        { type: "ALF-PLA", value: GCR_ULD_DATA.alfPla, color: "#EF4444" },
        { type: "AKE-RKE", value: GCR_ULD_DATA.akeRke, color: "#F87171" },
      ]
    }
    
    // PIL/PER active
    let data = BOTH_PIL_PER_ULD_DATA
    
    if (pilPerSubFilter === "PIL only") {
      data = PIL_ULD_DATA
    } else if (pilPerSubFilter === "PER only") {
      data = PER_ULD_DATA
    }
    
    return [
      { type: "AKE/DPE", value: data.akeDpe, color: "#DC2626" },
      { type: "ALF/DQF", value: data.alfDqf, color: "#EF4444" },
      { type: "LD-PMC/AMF", value: data.ldPmcAmf, color: "#F87171" },
      { type: "MD-Q6/Q7", value: data.mdQ6Q7, color: "#FCA5A5" },
    ]
  }, [isGcrActive, pilPerSubFilter])

  // Determine chart title suffix based on filter
  const chartTitleSuffix = useMemo(() => {
    if (isGcrActive) return " (GCR)"
    if (pilPerSubFilter === "PIL only") return " (PIL)"
    if (pilPerSubFilter === "PER only") return " (PER)"
    return " (PIL + PER)"
  }, [isGcrActive, pilPerSubFilter])

  // Determine if showing PIL/PER data
  const isShowingPilPer = !isGcrActive

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 px-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Workload Visibility</h2>
            <p className="text-sm text-gray-500">Current shift, real-time visibility for management and shift in-charges</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 px-2 flex-wrap">
          {/* GCR / PIL/PER Chip Toggles - Mutually Exclusive */}
          <button
            type="button"
            onClick={() => handleChipToggle(true)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
              isGcrActive
                ? "bg-gray-200 text-gray-900 font-medium"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            GCR
          </button>
          <button
            type="button"
            onClick={() => handleChipToggle(false)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
              isPilPerActive
                ? "bg-gray-200 text-gray-900 font-medium"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            PIL/PER
          </button>
          
          {/* PIL/PER Sub-filter dropdown - only visible when PIL/PER is active */}
          {isPilPerActive && (
            <select
              value={pilPerSubFilter}
              onChange={(e) => handlePilPerSubFilterChange(e.target.value as PilPerSubFilter)}
              className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent cursor-pointer"
            >
              <option value="Both">Both</option>
              <option value="PIL only">PIL only</option>
              <option value="PER only">PER only</option>
            </select>
          )}
              
              <div className="w-px h-6 bg-gray-200" />
              
          {/* Module Filter - filtered based on active chip */}
          <select
            id="module-filter"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value as Module)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent max-w-40 truncate"
          >
            {availableModules.map(module => (
              <option key={module} value={module}>
                {module === "All" ? "Module: All" : module.length > 30 ? module.slice(0, 30) + "..." : module}
              </option>
            ))}
          </select>
            </div>

        {/* Workload by Work Area - Treemap */}
        <ChartCard
          title="Workload by Work Area"
          subtitle="Physical warehouse zones - size shows total ULDs, color shows category, opacity shows completion"
          className="mb-4"
        >
          <WorkAreaTreemap data={workAreaTreemapData} />
        </ChartCard>

        {/* Workload by ULD Graph */}
        <ChartCard
          title={`Workload by ULD${chartTitleSuffix}`}
          subtitle="ULD distribution by type"
          className="mb-4"
        >
          <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} barCategoryGap="35%" barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                  dataKey="type"
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      stroke="#9CA3AF"
                  type="category"
                  interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      stroke="#9CA3AF"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "20px", pointerEvents: "none" }} 
                      iconSize={12}
                  content={() => {
                    if (isShowingPilPer) {
                      return (
                        <ul className="flex justify-center gap-4 text-xs flex-wrap">
                          <li className="flex items-center gap-1">
                            <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#DC2626", borderRadius: "2px" }} />
                            <span>AKE/DPE</span>
                          </li>
                          <li className="flex items-center gap-1">
                            <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#EF4444", borderRadius: "2px" }} />
                            <span>ALF/DQF</span>
                          </li>
                          <li className="flex items-center gap-1">
                            <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#F87171", borderRadius: "2px" }} />
                            <span>LD-PMC/AMF</span>
                          </li>
                          <li className="flex items-center gap-1">
                            <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#FCA5A5", borderRadius: "2px" }} />
                            <span>MD-Q6/Q7</span>
                          </li>
                        </ul>
                      )
                    }
                    
                    return (
                      <ul className="flex justify-center gap-4 text-xs flex-wrap">
                        <li className="flex items-center gap-1">
                          <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#DC2626", borderRadius: "2px" }} />
                          <span>PMC-AMF</span>
                        </li>
                        <li className="flex items-center gap-1">
                          <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#EF4444", borderRadius: "2px" }} />
                          <span>ALF-PLA</span>
                        </li>
                        <li className="flex items-center gap-1">
                          <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#F87171", borderRadius: "2px" }} />
                          <span>AKE-RKE</span>
                        </li>
                      </ul>
                    )
                  }}
                />
                <Bar dataKey="value" barSize={60} radius={[4, 4, 0, 0]} name="ULDs">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Lower Half - Split into Left and Right */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Half - Processed vs Remaining */}
          <div className="space-y-4">
            {/* Single Bar Chart with Collapsible Breakdown */}
            <ChartCard
              title="Processed vs Remaining"
              subtitle="ULD build progress by shift window"
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="shift" tick={{ fontSize: 12, fill: "#6B7280" }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} stroke="#9CA3AF" />
                    <Tooltip content={<ProcessedTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} iconSize={12} />
                    <Bar dataKey="processed" stackId="stack" fill="#DC2626" name="Processed" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="remaining" stackId="stack" fill="rgba(220, 38, 38, 0.4)" name="Remaining" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Collapsible Table - Inside ChartCard */}
              <Collapsible open={isTableOpen} onOpenChange={setIsTableOpen}>
                <CollapsibleTrigger className="w-full mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between hover:text-gray-700 transition-colors">
                    <h3 className="text-sm font-semibold text-gray-700">Detailed Breakdown</h3>
                    {isTableOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-4 space-y-6">
                    {/* Shift 1: 0600-0900 */}
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900">Processed vs Remaining ({bdnData.shift1.timeRange})</h4>
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
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Processed</div>
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
                              <td className="px-3 py-2 border border-gray-300 font-medium">Processed</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.processed.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.processed.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.processed.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{bdnData.shift1.processed.processed.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.processed.total}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">Thru</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.thru.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.thru.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.thru.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{bdnData.shift1.processed.thru.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.thru.total}</td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.total}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Remaining</div>
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
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.remaining.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.remaining.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.remaining.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.remaining.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.remaining.total}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Shift 2: 0901-1259 */}
                    <div className="space-y-4 border-t border-gray-300 pt-6">
                      <h4 className="text-base font-semibold text-gray-900">Processed vs Remaining ({bdnData.shift2.timeRange})</h4>
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
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Processed</div>
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
                              <td className="px-3 py-2 border border-gray-300 font-medium">Processed</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.processed.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.processed.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.processed.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{bdnData.shift2.processed.processed.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.processed.total}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">Thru</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.thru.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.thru.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.thru.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{bdnData.shift2.processed.thru.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.thru.total}</td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.total.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.total.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.total.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.total.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.total.total}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Remaining</div>
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
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.remaining.pmcAmf}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.remaining.alfPla}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.remaining.akeRke}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.remaining.sclrPcs}</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.remaining.total}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Total Processed */}
                    <div className="space-y-4 border-t border-gray-300 pt-6">
                      <h4 className="text-base font-semibold text-gray-900">Total Processed</h4>
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
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.pmcAmf}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.alfPla}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.akeRke}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.sclrPcs}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.total}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300 font-medium">{bdnData.shift2.timeRange}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.total.pmcAmf}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.total.alfPla}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.total.akeRke}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.total.sclrPcs}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.processed.total.total}</td>
                          </tr>
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.pmcAmf + bdnData.shift2.processed.total.pmcAmf}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.alfPla + bdnData.shift2.processed.total.alfPla}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.akeRke + bdnData.shift2.processed.total.akeRke}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.sclrPcs + bdnData.shift2.processed.total.sclrPcs}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.processed.total.total + bdnData.shift2.processed.total.total}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Total Remaining */}
                    <div className="space-y-4 border-t border-gray-300 pt-6">
                      <h4 className="text-base font-semibold text-gray-900">Total Remaining</h4>
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
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.remaining.pmcAmf}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.remaining.alfPla}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.remaining.akeRke}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.remaining.sclrPcs}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift1.remaining.total}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300 font-medium">{bdnData.shift2.timeRange}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.remaining.pmcAmf}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.remaining.alfPla}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.remaining.akeRke}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.remaining.sclrPcs}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{bdnData.shift2.remaining.total}</td>
                          </tr>
                          <tr className="bg-red-50 font-semibold">
                            <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">{bdnData.shift1.remaining.pmcAmf + bdnData.shift2.remaining.pmcAmf}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">{bdnData.shift1.remaining.alfPla + bdnData.shift2.remaining.alfPla}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">{bdnData.shift1.remaining.akeRke + bdnData.shift2.remaining.akeRke}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">{bdnData.shift1.remaining.sclrPcs + bdnData.shift2.remaining.sclrPcs}</td>
                            <td className="px-3 py-2 border border-gray-300 text-center text-red-600">{bdnData.shift1.remaining.total + bdnData.shift2.remaining.total}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </ChartCard>
          </div>

          {/* Right Half - Screening Summary */}
          <div className="space-y-4">
            {/* Bar Chart for M/A Base, L Base, K Base */}
            <ChartCard
              title="Screening Summary"
              subtitle="Workload by screening base"
              action={
                <Select value={screeningFilter} onValueChange={(value) => setScreeningFilter(value as typeof screeningFilter)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue>{filterLabels[screeningFilter]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overall">Overall</SelectItem>
                    <SelectItem value="usaCaScreening">USA & CA Screening</SelectItem>
                    <SelectItem value="usaCaNoScreening">USA & CA No Screening</SelectItem>
                    <SelectItem value="otherSectorScreening">Other Sector Screening</SelectItem>
                  </SelectContent>
                </Select>
              }
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "M/A Base", value: screeningData[screeningFilter].totalBooked.mABase, pcs: screeningData[screeningFilter].totalBooked.mABase, grWt: screeningData[screeningFilter].totalBooked.grWt, color: "#DC2626" },
                      { name: "L Base", value: screeningData[screeningFilter].totalBooked.lBase, pcs: screeningData[screeningFilter].totalBooked.lBase, grWt: screeningData[screeningFilter].totalBooked.grWt, color: "#EF4444" },
                      { name: "K Base", value: screeningData[screeningFilter].totalBooked.kBase, pcs: screeningData[screeningFilter].totalBooked.kBase, grWt: screeningData[screeningFilter].totalBooked.grWt, color: "#B91C1C" },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} stroke="#9CA3AF" />
                    <Tooltip content={<ScreeningTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {[{ name: "M/A Base", color: "#DC2626" }, { name: "L Base", color: "#EF4444" }, { name: "K Base", color: "#B91C1C" }].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Collapsible Screening Tables - Inside ChartCard */}
              <Collapsible open={isScreeningTableOpen} onOpenChange={setIsScreeningTableOpen}>
                <CollapsibleTrigger className="w-full mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between hover:text-gray-700 transition-colors">
                    <h3 className="text-sm font-semibold text-gray-700">Detailed Breakdown</h3>
                    {isScreeningTableOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-4 space-y-6">
                    {/* SCREENING SUMMARY Table */}
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900">SCREENING SUMMARY</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th rowSpan={2} className="px-3 py-2 text-left border border-gray-300">Screening summary</th>
                              <th colSpan={5} className="px-3 py-2 text-center border border-gray-300">Total Booked Load</th>
                              <th colSpan={5} className="px-3 py-2 text-center border border-gray-300">Total Pending Booked Load</th>
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
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaScreening.totalBooked.pcs.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaScreening.totalBooked.grWt.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaScreening.totalBooked.mABase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaScreening.totalBooked.lBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaScreening.totalBooked.kBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaScreening.totalPending.pcs.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaScreening.totalPending.grWt.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaScreening.totalPending.mABase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaScreening.totalPending.lBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaScreening.totalPending.kBase}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">USA & CA No Screening</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaNoScreening.totalBooked.pcs.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaNoScreening.totalBooked.grWt.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaNoScreening.totalBooked.mABase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaNoScreening.totalBooked.lBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaNoScreening.totalBooked.kBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaNoScreening.totalPending.pcs.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaNoScreening.totalPending.grWt.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaNoScreening.totalPending.mABase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaNoScreening.totalPending.lBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.usaCaNoScreening.totalPending.kBase}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 border border-gray-300 font-medium">Other Sector Screening</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.otherSectorScreening.totalBooked.pcs.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.otherSectorScreening.totalBooked.grWt.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.otherSectorScreening.totalBooked.mABase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.otherSectorScreening.totalBooked.lBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.otherSectorScreening.totalBooked.kBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.otherSectorScreening.totalPending.pcs.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.otherSectorScreening.totalPending.grWt.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.otherSectorScreening.totalPending.mABase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.otherSectorScreening.totalPending.lBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.otherSectorScreening.totalPending.kBase}</td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 border border-gray-300">Total Load</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalBooked.pcs.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalBooked.grWt.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalBooked.mABase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalBooked.lBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalBooked.kBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.pcs.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.grWt.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.mABase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.lBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.kBase}</td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 border border-gray-300">Total Screening Load</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalBooked.pcs.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalBooked.grWt.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalBooked.mABase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalBooked.lBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalBooked.kBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.pcs.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.grWt.toLocaleString()}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.mABase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.lBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.kBase}</td>
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
                              <th colSpan={3} className="px-2 py-2 text-center border border-gray-300">Screened</th>
                              <th colSpan={3} className="px-2 py-2 text-center border border-gray-300">To be screened</th>
                              <th colSpan={3} className="px-2 py-2 text-center border border-gray-300">Units Build</th>
                              <th colSpan={3} className="px-2 py-2 text-center border border-gray-300">Units to be Build</th>
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
                            {flightDetails.map((flight, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-2 py-2 border border-gray-300 font-medium">{flight.flight}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center">{flight.dest}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center">{flight.etd}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center">{flight.screenedShipments}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center">{flight.screenedPcs}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center">{flight.screenedGrWt}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">{flight.toBeScreenedShipments === 0 ? "LOADING OVER" : flight.toBeScreenedShipments}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">{flight.toBeScreenedPcs === 0 ? "LOADING OVER" : flight.toBeScreenedPcs}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">{flight.toBeScreenedGrWt === 0 ? "LOADING OVER" : flight.toBeScreenedGrWt}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center">{flight.buildMABase}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center">{flight.buildLBase}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center">{flight.buildKBase}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">{flight.toBuildMABase === 0 ? "LOADING OVER" : flight.toBuildMABase}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">{flight.toBuildLBase === 0 ? "LOADING OVER" : flight.toBuildLBase}</td>
                                <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">{flight.toBuildKBase === 0 ? "LOADING OVER" : flight.toBuildKBase}</td>
                              </tr>
                            ))}
                            <tr className="bg-gray-50 font-semibold">
                              <td colSpan={3} className="px-2 py-2 border border-gray-300 text-right">TOTAL</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{flightDetails.reduce((sum, f) => sum + f.screenedShipments, 0)}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{flightDetails.reduce((sum, f) => sum + f.screenedPcs, 0)}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{flightDetails.reduce((sum, f) => sum + f.screenedGrWt, 0)}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">LOADING OVER</td>
                              <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">LOADING OVER</td>
                              <td className="px-2 py-2 border border-gray-300 text-center text-gray-400">LOADING OVER</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{flightDetails.reduce((sum, f) => sum + f.buildMABase, 0)}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{flightDetails.reduce((sum, f) => sum + f.buildLBase, 0)}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{flightDetails.reduce((sum, f) => sum + f.buildKBase, 0)}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.mABase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.lBase}</td>
                              <td className="px-2 py-2 border border-gray-300 text-center">{screeningData.overall.totalPending.kBase}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  )
}
