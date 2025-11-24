"use client"

import { useState, useEffect } from "react"
import { Clock, Plane, ChevronDown, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line } from "recharts"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useLoadPlans, type LoadPlan } from "@/lib/load-plan-context"

// Enhanced work area data with date-time and shift support
const workAreaDataByShift: Record<string, Record<string, Record<string, { total: number; remaining: number; completed: number }>>> = {
  "0600-0900": {
    overall: {
      GCR: { total: 85, remaining: 45, completed: 40 },
      PER: { total: 62, remaining: 28, completed: 34 },
      PIL: { total: 48, remaining: 22, completed: 26 },
    },
    E75: {
      GCR: { total: 35, remaining: 18, completed: 17 },
      PER: { total: 25, remaining: 12, completed: 13 },
      PIL: { total: 20, remaining: 9, completed: 11 },
    },
    L22: {
      GCR: { total: 28, remaining: 15, completed: 13 },
      PER: { total: 20, remaining: 8, completed: 12 },
      PIL: { total: 15, remaining: 7, completed: 8 },
    },
  },
  "0901-1259": {
    overall: {
      GCR: { total: 92, remaining: 38, completed: 54 },
      PER: { total: 68, remaining: 25, completed: 43 },
      PIL: { total: 52, remaining: 18, completed: 34 },
    },
    E75: {
      GCR: { total: 38, remaining: 15, completed: 23 },
      PER: { total: 28, remaining: 10, completed: 18 },
      PIL: { total: 22, remaining: 8, completed: 14 },
    },
    L22: {
      GCR: { total: 30, remaining: 12, completed: 18 },
      PER: { total: 22, remaining: 8, completed: 14 },
      PIL: { total: 18, remaining: 6, completed: 12 },
    },
  },
}

// AWB Status Types
type AWBStatus = "completed" | "pending" | "split" | "offloaded" | "in-progress"

type AWBProgress = {
  ser: string
  awbNo: string
  orgDes: string
  pcs: string
  wgt: string
  uld: string
  status: AWBStatus
  splitDetails?: {
    parts: number
    loadedInto: string[]
    remainingPcs: number
  }
  offloadDetails?: {
    flight: string
    pcs: number
    reason: string
  }
  progress: number // 0-100
}

// EK0544 Load Plan Detail - Based on actual data structure
const ek0544LoadPlanDetail = {
  flight: "EK0544",
  date: "01Mar",
  acftType: "77WER",
  acftReg: "A6-ENT",
  std: "02:50",
  pax: "DXB/MAA/0/23/251",
  ttlPlnUld: "06PMC/07AKE",
  uldVersion: "06/26",
  sectors: [
    {
      sector: "DXBMAA",
      uldSections: [
        {
          uld: "XX 02PMC XX",
          awbs: [
            {
              ser: "001",
              awbNo: "176-92065120",
              orgDes: "FRAMAA",
              pcs: "31",
              wgt: "1640.2",
            },
          ],
        },
        {
          uld: "XX BULK XX",
          awbs: [
            {
              ser: "002",
              awbNo: "176-98208961",
              orgDes: "DXBMAA",
              pcs: "1",
              wgt: "10.0",
            },
          ],
        },
        {
          uld: "XX 02PMC XX",
          awbs: [
            {
              ser: "003",
              awbNo: "176-93627586",
              orgDes: "MNLMAA",
              pcs: "13",
              wgt: "2690.0",
            },
          ],
        },
        {
          uld: "XX 06AKE XX",
          awbs: [
            {
              ser: "008",
              awbNo: "176-93270542",
              orgDes: "FRAMAA",
              pcs: "11",
              wgt: "145.5",
            },
          ],
        },
        {
          uld: "",
          awbs: [
            {
              ser: "004",
              awbNo: "176-99699530",
              orgDes: "PEKMAA",
              pcs: "9",
              wgt: "643.0",
            },
          ],
        },
        {
          uld: "XX 01AKE XX",
          awbs: [
            {
              ser: "013",
              awbNo: "176-91073931",
              orgDes: "KRKMAA",
              pcs: "1",
              wgt: "363.0",
            },
          ],
        },
        {
          uld: "",
          awbs: [
            {
              ser: "009",
              awbNo: "176-92388321",
              orgDes: "MIAMAA",
              pcs: "57",
              wgt: "1499.0",
            },
            {
              ser: "010",
              awbNo: "176-92388332",
              orgDes: "MIAMAA",
              pcs: "57",
              wgt: "1499.0",
            },
          ],
          isRampTransfer: true,
        },
        {
          uld: "XX BULK XX",
          awbs: [
            {
              ser: "011",
              awbNo: "176-91628773",
              orgDes: "DARMAA",
              pcs: "1",
              wgt: "20.0",
            },
            {
              ser: "012",
              awbNo: "176-91629020",
              orgDes: "DARMAA",
              pcs: "1",
              wgt: "20.0",
            },
          ],
          isRampTransfer: true,
        },
      ],
    },
  ],
}

// Create AWB progress tracking with complex statuses
const createAWBProgressData = (): AWBProgress[] => {
  const awbs: AWBProgress[] = []
  let sequence = 0

  ek0544LoadPlanDetail.sectors.forEach((sector) => {
    sector.uldSections.forEach((uldSection) => {
      uldSection.awbs.forEach((awb) => {
        sequence++
        let status: AWBStatus = "pending"
        let progress = 0
        let splitDetails
        let offloadDetails

        // Simulate different statuses based on sequence
        if (sequence <= 3) {
          status = "completed"
          progress = 100
        } else if (sequence === 4) {
          status = "in-progress"
          progress = 65
        } else if (sequence === 5) {
          status = "split"
          progress = 40
          splitDetails = {
            parts: 2,
            loadedInto: ["02PMC", "03PMC"],
            remainingPcs: parseInt(awb.pcs) - Math.floor(parseInt(awb.pcs) * 0.4),
          }
        } else if (sequence === 6) {
          status = "offloaded"
          progress = 0
          offloadDetails = {
            flight: "EK0214",
            pcs: parseInt(awb.pcs),
            reason: "Capacity constraint",
          }
        } else if (sequence === 7 || sequence === 8) {
          status = "split"
          progress = 30
          splitDetails = {
            parts: 3,
            loadedInto: ["01AKE", "02AKE", "BULK"],
            remainingPcs: parseInt(awb.pcs) - Math.floor(parseInt(awb.pcs) * 0.3),
          }
        } else {
          status = "pending"
          progress = 0
        }

        awbs.push({
          ser: awb.ser,
          awbNo: awb.awbNo,
          orgDes: awb.orgDes,
          pcs: awb.pcs,
          wgt: awb.wgt,
          uld: uldSection.uld || "BULK",
          status,
          progress,
          splitDetails,
          offloadDetails,
        })
      })
    })
  })

  return awbs
}

const awbProgressData = createAWBProgressData()

// Calculate flight-level stats
const calculateFlightStats = () => {
  const totalAWBs = awbProgressData.length
  const completed = awbProgressData.filter((a) => a.status === "completed").length
  const inProgress = awbProgressData.filter((a) => a.status === "in-progress").length
  const split = awbProgressData.filter((a) => a.status === "split").length
  const offloaded = awbProgressData.filter((a) => a.status === "offloaded").length
  const pending = awbProgressData.filter((a) => a.status === "pending").length

  const totalPcs = awbProgressData.reduce((sum, a) => sum + parseInt(a.pcs), 0)
  const completedPcs = awbProgressData
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + parseInt(a.pcs), 0)
  const splitPcs = awbProgressData
    .filter((a) => a.status === "split")
    .reduce((sum, a) => sum + (a.splitDetails?.remainingPcs || 0), 0)

  return {
    totalAWBs,
    completed,
    inProgress,
    split,
    offloaded,
    pending,
    totalPcs,
    completedPcs,
    splitPcs,
    completionRate: totalPcs > 0 ? ((completedPcs / totalPcs) * 100).toFixed(1) : "0",
  }
}

const flightStats = calculateFlightStats()

// Calculate total planned PCS
const totalPlannedPcs = awbProgressData.reduce((sum, a) => sum + parseInt(a.pcs), 0)

// Prepare line chart data - remaining, completed, offloaded (numbers add up)
const createLineChartData = (showSplit: boolean) => {
  let cumulativeCompleted = 0
  let cumulativeOffloaded = 0
  let cumulativeSplit = 0

  return awbProgressData.map((awb, index) => {
    const awbPcs = parseInt(awb.pcs)
    
    // Update cumulative values based on status
    if (awb.status === "completed") {
      cumulativeCompleted += awbPcs
    } else if (awb.status === "offloaded") {
      cumulativeOffloaded += awbPcs
    } else if (awb.status === "split") {
      const splitLoaded = awb.splitDetails?.remainingPcs || 0
      if (showSplit) {
        cumulativeSplit += splitLoaded
      } else {
        // If not showing split, treat loaded portion as completed
        cumulativeCompleted += splitLoaded
      }
    }

    // Remaining = Total - Completed - Offloaded - Split (if shown)
    const remaining = totalPlannedPcs - cumulativeCompleted - cumulativeOffloaded - (showSplit ? cumulativeSplit : 0)

    return {
      sequence: index + 1,
      awbNo: awb.awbNo,
      ser: awb.ser,
      orgDes: awb.orgDes,
      pcs: awbPcs,
      wgt: parseFloat(awb.wgt),
      uld: awb.uld,
      status: awb.status,
      progress: awb.progress,
      remaining: Math.max(0, remaining),
      completed: cumulativeCompleted,
      offloaded: cumulativeOffloaded,
      split: showSplit ? cumulativeSplit : 0,
      splitDetails: awb.splitDetails,
      offloadDetails: awb.offloadDetails,
    }
  })
}

// Custom Tooltip for complex line chart
const ComplexTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs max-w-xs">
        <div className="font-semibold text-gray-900 mb-2">AWB: {data.awbNo}</div>
        <div className="space-y-1 text-gray-700">
          <div><span className="font-medium">SER:</span> {data.ser}</div>
          <div><span className="font-medium">Origin/Dest:</span> {data.orgDes}</div>
          <div><span className="font-medium">ULD:</span> {data.uld || "BULK"}</div>
          <div><span className="font-medium">PCS:</span> {data.pcs}</div>
          <div><span className="font-medium">Weight:</span> {data.wgt} kg</div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="font-semibold text-gray-900">Status: <span className={`${
              data.status === "completed" ? "text-green-600" :
              data.status === "in-progress" ? "text-amber-600" :
              data.status === "split" ? "text-blue-600" :
              data.status === "offloaded" ? "text-red-600" :
              "text-gray-600"
            }`}>{data.status.toUpperCase()}</span></div>
            <div className="font-medium">Progress: {data.progress}%</div>
          </div>
          {data.splitDetails && (
            <div className="mt-2 pt-2 border-t border-gray-200 bg-blue-50 p-2 rounded">
              <div className="font-semibold text-blue-900">SPLIT DETAILS:</div>
              <div>Split into {data.splitDetails.parts} parts</div>
              <div>Loaded into: {data.splitDetails.loadedInto.join(", ")}</div>
              <div>Remaining PCS: {data.splitDetails.remainingPcs}</div>
            </div>
          )}
          {data.offloadDetails && (
            <div className="mt-2 pt-2 border-t border-gray-200 bg-red-50 p-2 rounded">
              <div className="font-semibold text-red-900">OFFLOAD DETAILS:</div>
              <div>Offloaded to: {data.offloadDetails.flight}</div>
              <div>PCS: {data.offloadDetails.pcs}</div>
              <div>Reason: {data.offloadDetails.reason}</div>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

// Calculate ULD type breakdown from EK0544 load plan
const calculateULDBreakdown = () => {
  // Count ULD types from actual EK0544 data
  let pmcCount = 0
  let akeCount = 0
  let bulkCount = 0

  ek0544LoadPlanDetail.sectors.forEach((sector) => {
    sector.uldSections.forEach((uldSection) => {
      const uld = uldSection.uld || ""
      if (uld.includes("PMC")) {
        pmcCount++
      } else if (uld.includes("AKE")) {
        akeCount++
      } else if (uld.includes("BULK") || (uld === "" && uldSection.awbs.length > 0)) {
        bulkCount++
      }
    })
  })

  // Use ttlPlnUld as source of truth: "06PMC/07AKE"
  const pmcMatch = ek0544LoadPlanDetail.ttlPlnUld.match(/(\d+)PMC/)
  const akeMatch = ek0544LoadPlanDetail.ttlPlnUld.match(/(\d+)AKE/)
  const plannedPMC = pmcMatch ? parseInt(pmcMatch[1]) : pmcCount
  const plannedAKE = akeMatch ? parseInt(akeMatch[1]) : akeCount

  return {
    PMC: plannedPMC,
    AKE: plannedAKE,
    BULK: bulkCount,
    total: plannedPMC + plannedAKE + bulkCount,
  }
}

const uldBreakdownData = calculateULDBreakdown()

// Prepare bar chart data for ULD types - 3rd bar is total with BULK highlighted
const uldTypeChartData = [
  {
    type: "PMC",
    count: uldBreakdownData.PMC,
    pmcAke: 0,
    bulk: 0,
    total: uldBreakdownData.PMC,
    color: "#DC2626",
  },
  {
    type: "AKE",
    count: uldBreakdownData.AKE,
    pmcAke: 0,
    bulk: 0,
    total: uldBreakdownData.AKE,
    color: "#EF4444",
  },
  {
    type: "Total",
    count: 0,
    pmcAke: uldBreakdownData.PMC + uldBreakdownData.AKE,
    bulk: uldBreakdownData.BULK,
    total: uldBreakdownData.PMC + uldBreakdownData.AKE + uldBreakdownData.BULK,
    color: "#DC2626",
  },
]

// Prepare chart data for anticipated flights
const getAnticipatedChartData = (loadPlans: LoadPlan[]) => {
  const tomorrowFlights = loadPlans.filter((plan) => {
    // Filter for flights scheduled tomorrow (EK0205 and any others)
    return plan.flight === "EK0205" || plan.flight === "EK0789"
  })

  return tomorrowFlights.map((plan) => {
    const pmcMatch = plan.ttlPlnUld.match(/(\d+)PMC/)
    const akeMatch = plan.ttlPlnUld.match(/(\d+)AKE/)
    const pmc = pmcMatch ? parseInt(pmcMatch[1]) : 0
    const ake = akeMatch ? parseInt(akeMatch[1]) : 0
    const destination = plan.pax.split("/")[1] || "JFK"
    
    return {
      flight: plan.flight,
      PMC: pmc,
      AKE: ake,
      destination: `DXB-${destination}`,
    }
  })
}

type CSVRow = {
  Date: string
  Day: string
  Shift: string
  "Duty Hrs": string
  "Peak A/F"?: string
  "Peak E/M"?: string
  "Early Morning First Wave"?: string
  "Early Morning Second Wave"?: string
  "Early Morning Total"?: string
  "Late Morning"?: string
  "Advance First Wave": string
  "Advance Second Wave": string
  "Total Advance": string
  "Total DX BUP"?: string
  "Total  NI BUP"?: string
  "Planned PMC F/W": string
  "Planned ALF F/W": string
  "Planned AKE F/W": string
  "Total Planned F/W": string
  "Planned PMC S/W": string
  "Planned ALF S/W": string
  "Planned AKE S/W": string
  "Total Palnned S/W": string
  "Build PMC": string
  "Build ALF": string
  "Build AKE": string
  "Total Build": string
  "Pending  PMC": string
  "Pending ALF": string
  "Pending AKE": string
  "Total Pending": string
  [key: string]: string | undefined
}

type ChartDataPoint = {
  date: string
  dateFormatted: string
  advance: number
  planned: number
  built: number
  pending: number
  efficiency: number
  staffRequired: number
  shift: "Day" | "Night"
}

export default function SituationalAwarenessScreen() {
  const { loadPlans } = useLoadPlans()
  const [selectedShift, setSelectedShift] = useState<"0600-0900" | "0901-1259">("0600-0900")
  const [workAreaFilter, setWorkAreaFilter] = useState<"overall" | "sortByWorkArea">("overall")
  const [selectedWorkArea, setSelectedWorkArea] = useState<string>("E75")
  const [showSplit, setShowSplit] = useState<boolean>(false)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [dayShiftData, setDayShiftData] = useState<CSVRow[]>([])
  const [nightShiftData, setNightShiftData] = useState<CSVRow[]>([])
  const [isTableOpen, setIsTableOpen] = useState(false)
  const [recommendations, setRecommendations] = useState<string[]>([])

  // Parse CSV function - handles duplicate column names by using array indices
  const parseCSV = (csvText: string): CSVRow[] => {
    const lines = csvText.trim().split("\n")
    if (lines.length < 2) return []
    
    const headers = lines[0].split(",").map((h) => h.trim())
    
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim())
      const obj: any = {}
      
      // Map headers by index, handling duplicates
      headers.forEach((header, index) => {
        const value = values[index] || ""
        
        // Handle duplicate column names by position
        if (header === "Planned PMC") {
          if (index === 12) obj["Planned PMC F/W"] = value
          else if (index === 18) obj["Planned PMC S/W"] = value
          obj[header] = value // Keep original for compatibility
        } else if (header === "Planned ALF") {
          if (index === 13) obj["Planned ALF F/W"] = value
          else if (index === 19) obj["Planned ALF S/W"] = value
          obj[header] = value
        } else if (header === "Planned AKE") {
          if (index === 14) obj["Planned AKE F/W"] = value
          else if (index === 20) obj["Planned AKE S/W"] = value
          obj[header] = value
        } else {
          obj[header] = value
        }
      })
      
      return obj as CSVRow
    })
  }

  // Fetch and parse CSV files
  useEffect(() => {
    const fetchCSVData = async () => {
      try {
        // Fetch Day shift data
        const dayResponse = await fetch("/bdn-sheet1.csv")
        const dayText = await dayResponse.text()
        const dayRows = parseCSV(dayText)
        setDayShiftData(dayRows)

        // Fetch Night shift data
        const nightResponse = await fetch("/bdn-sheet2.csv")
        const nightText = await nightResponse.text()
        const nightRows = parseCSV(nightText)
        setNightShiftData(nightRows)

        // Process chart data
        const processedData: ChartDataPoint[] = []
        
        // Process Day shift data
        dayRows.forEach((row) => {
          const advance = parseInt(row["Total Advance"]) || 0
          const plannedFW = parseInt(row["Total Planned F/W"]) || 0
          const plannedSW = parseInt(row["Total Palnned S/W"]) || 0
          const planned = plannedFW + plannedSW
          const built = parseInt(row["Total Build"]) || 0
          const pending = parseInt(row["Total Pending"]) || 0
          const efficiency = planned > 0 ? (built / planned) * 100 : 0
          const staffRequired = Math.ceil(planned / 50) // Estimate: ~50 ULDs per staff member

          // Format date: "1-Jan-23" -> "01-Jan"
          const dateParts = row.Date.split("-")
          const dateFormatted = dateParts.length >= 2 
            ? `${dateParts[0].padStart(2, "0")}-${dateParts[1].substring(0, 3)}`
            : row.Date

          processedData.push({
            date: row.Date,
            dateFormatted,
            advance,
            planned,
            built,
            pending,
            efficiency: Math.round(efficiency * 10) / 10,
            staffRequired,
            shift: "Day",
          })
        })

        // Process Night shift data
        nightRows.forEach((row) => {
          const advance = parseInt(row["Total Advance"]) || 0
          const plannedFW = parseInt(row["Total Planned F/W"]) || 0
          const plannedSW = parseInt(row["Total Palnned S/W"]) || 0
          const planned = plannedFW + plannedSW
          const built = parseInt(row["Total Build"]) || 0
          const pending = parseInt(row["Total Pending"]) || 0
          const efficiency = planned > 0 ? (built / planned) * 100 : 0
          const staffRequired = Math.ceil(planned / 50)

          // Format date: "1-Jan-23" -> "01-Jan"
          const dateParts = row.Date.split("-")
          const dateFormatted = dateParts.length >= 2 
            ? `${dateParts[0].padStart(2, "0")}-${dateParts[1].substring(0, 3)}`
            : row.Date

          processedData.push({
            date: row.Date,
            dateFormatted,
            advance,
            planned,
            built,
            pending,
            efficiency: Math.round(efficiency * 10) / 10,
            staffRequired,
            shift: "Night",
          })
        })

        // Sort by date
        processedData.sort((a, b) => {
          const dateA = new Date(a.date.split("-").reverse().join("-"))
          const dateB = new Date(b.date.split("-").reverse().join("-"))
          return dateA.getTime() - dateB.getTime()
        })

        setChartData(processedData)

        // Calculate recommendations
        const avgEfficiencyDay = dayRows.reduce((sum, row) => {
          const plannedFW = parseInt(row["Total Planned F/W"]) || 0
          const plannedSW = parseInt(row["Total Palnned S/W"]) || 0
          const planned = plannedFW + plannedSW
          const built = parseInt(row["Total Build"]) || 0
          return sum + (planned > 0 ? (built / planned) * 100 : 0)
        }, 0) / dayRows.length

        const avgEfficiencyNight = nightRows.reduce((sum, row) => {
          const plannedFW = parseInt(row["Total Planned F/W"]) || 0
          const plannedSW = parseInt(row["Total Palnned S/W"]) || 0
          const planned = plannedFW + plannedSW
          const built = parseInt(row["Total Build"]) || 0
          return sum + (planned > 0 ? (built / planned) * 100 : 0)
        }, 0) / nightRows.length

        const recs: string[] = []
        if (avgEfficiencyDay < 80) {
          recs.push(`Day shift efficiency (${avgEfficiencyDay.toFixed(1)}%) is below target. Consider increasing advance build allocation.`)
        }
        if (avgEfficiencyNight < 80) {
          recs.push(`Night shift efficiency (${avgEfficiencyNight.toFixed(1)}%) is below target. Review staff allocation during peak hours.`)
        }
        
        const avgAdvanceDay = dayRows.reduce((sum, row) => sum + (parseInt(row["Total Advance"]) || 0), 0) / dayRows.length
        const avgPlannedDay = dayRows.reduce((sum, row) => {
          const plannedFW = parseInt(row["Total Planned F/W"]) || 0
          const plannedSW = parseInt(row["Total Palnned S/W"]) || 0
          return sum + plannedFW + plannedSW
        }, 0) / dayRows.length
        
        if (avgAdvanceDay / avgPlannedDay < 0.3) {
          recs.push(`Advance build ratio (${((avgAdvanceDay / avgPlannedDay) * 100).toFixed(1)}%) is low. Increase advance allocation to reduce pending workload.`)
        }

        setRecommendations(recs)
      } catch (error) {
        console.error("Error fetching CSV data:", error)
      }
    }

    fetchCSVData()
  }, [])

  // Calculate shift hours
  const shiftHours = selectedShift === "0600-0900" ? 3.0 : 3.97 // 3 hours (0600-0900) or ~3.97 hours (0901-1259 = 3h 58min)

  // Create line chart data based on split toggle
  const lineChartData = createLineChartData(showSplit)

  // Get current flight (EK0544) from load plans
  const currentFlightPlan = loadPlans.find((p) => p.flight === "EK0544") || {
    flight: "EK0544",
    date: "01Mar",
    acftType: "77WER",
    acftReg: "A6-ENT",
    pax: "DXB/MAA/0/23/251",
    std: "02:50",
    uldVersion: "06/26",
    ttlPlnUld: "06PMC/07AKE",
  }

  // Get anticipated flights (tomorrow)
  const anticipatedChartData = getAnticipatedChartData(loadPlans)
  
  // If EK0789 doesn't exist, add it
  if (!loadPlans.find((p) => p.flight === "EK0789")) {
    anticipatedChartData.push({
      flight: "EK0789",
      PMC: 4,
      AKE: 8,
      destination: "DXB-LHR",
    })
  }

  const currentWorkAreaData = workAreaDataByShift[selectedShift][workAreaFilter === "overall" ? "overall" : (selectedWorkArea as keyof typeof workAreaDataByShift[typeof selectedShift])] || workAreaDataByShift[selectedShift].overall
  const maxBarValue = 100

  // Calculate statistics
  const totalWork = Object.values(currentWorkAreaData).reduce((sum, area) => sum + area.total, 0)
  const totalCompleted = Object.values(currentWorkAreaData).reduce((sum, area) => sum + area.completed, 0)
  const totalRemaining = Object.values(currentWorkAreaData).reduce((sum, area) => sum + area.remaining, 0)
  const completionRate = totalWork > 0 ? ((totalCompleted / totalWork) * 100).toFixed(1) : "0"

  // Custom tooltip for multi-axis chart - shows accurate values from the data
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Get the data point - all payloads share the same payload object
      const data = payload[0].payload
      
      // Verify calculations match what's displayed
      const planned = data.planned || 0
      const built = data.built || 0
      const advance = data.advance || 0
      const pending = data.pending || 0
      const efficiency = planned > 0 ? Math.round((built / planned) * 100 * 10) / 10 : 0
      const staffRequired = data.staffRequired || 0
      
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs">
          <div className="font-semibold text-gray-900 mb-2">{data.dateFormatted || label}</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Advance:</span>
              <span className="font-semibold text-blue-600">{advance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Planned:</span>
              <span className="font-semibold text-gray-700">{planned.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Built:</span>
              <span className="font-semibold text-green-600">{built.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Pending:</span>
              <span className="font-semibold text-red-600">{pending.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-gray-200 pt-1 mt-1">
              <span className="text-gray-600">Efficiency:</span>
              <span className="font-semibold text-orange-600">{efficiency}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Staff Required:</span>
              <span className="font-semibold text-purple-600">{staffRequired}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Shift:</span>
              <span className="font-semibold">{data.shift}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-lg font-bold text-gray-900">Situational Awareness</h1>
        </div>

        {/* Statistics Cards - No borders, no gaps, information dense */}
        <div className="grid grid-cols-4 gap-0 mb-0 bg-white border border-gray-200 divide-x divide-gray-200">
          <div className="p-2.5">
            <p className="text-[10px] text-gray-600 mb-0.5 leading-tight">Total ULDs</p>
            <p className="text-xl font-bold text-gray-900 leading-tight">{totalWork}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Across all areas</p>
          </div>
          <div className="p-2.5">
            <p className="text-[10px] text-gray-600 mb-0.5 leading-tight">Completed</p>
            <p className="text-xl font-bold text-green-600 leading-tight">{totalCompleted}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{completionRate}% completion rate</p>
          </div>
          <div className="p-2.5">
            <p className="text-[10px] text-gray-600 mb-0.5 leading-tight">Remaining</p>
            <p className="text-xl font-bold text-amber-600 leading-tight">{totalRemaining}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Pending completion</p>
          </div>
          <div className="p-2.5">
            <p className="text-[10px] text-gray-600 mb-0.5 leading-tight">Shift</p>
            <p className="text-lg font-bold text-gray-900 leading-tight">{selectedShift}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Current selection</p>
          </div>
        </div>

        {/* Enhanced Work Area Timeline - No border, connected to stats */}
        <div className="bg-white border-x border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Workload</h3>
            
            {/* Filters in Top Right */}
            <div className="flex gap-2 items-center">
              <Select
                value={selectedShift}
                onValueChange={(value) => setSelectedShift(value as "0600-0900" | "0901-1259")}
              >
                <SelectTrigger className="h-7 w-[120px] text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  <SelectValue>{selectedShift}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0600-0900">0600-0900</SelectItem>
                  <SelectItem value="0901-1259">0901-1259</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={workAreaFilter}
                onValueChange={(value) => {
                  setWorkAreaFilter(value as "overall" | "sortByWorkArea")
                  if (value === "overall") {
                    setSelectedWorkArea("E75")
                  }
                }}
              >
                <SelectTrigger className="h-7 w-[130px] text-xs">
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
                  <SelectTrigger className="h-7 w-[70px] text-xs">
                    <SelectValue>{selectedWorkArea}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E75">E75</SelectItem>
                    <SelectItem value="L22">L22</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {(["GCR", "PER", "PIL"] as const).map((area) => {
              const data = currentWorkAreaData[area]
              const completed = data.completed
              const totalPercentage = (data.total / maxBarValue) * 100
              const completedPercentage = (completed / data.total) * 100
              const remainingPercentage = (data.remaining / data.total) * 100
              const efficiency = data.total > 0 ? ((completed / data.total) * 100).toFixed(1) : "0"

              return (
                <div key={area} className="border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 text-xs font-semibold text-gray-900">{area}</div>
                      <div className="text-[10px] text-gray-500">
                        Efficiency: <span className="font-semibold text-gray-900">{efficiency}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500">Total</div>
                      <div className="text-sm font-bold text-gray-900">{data.total}</div>
                    </div>
                  </div>
                  
                  <div className="flex-1 relative">
                    <div className="w-full bg-gray-200 rounded-full h-7 relative overflow-hidden">
                      {/* Bar container with width based on total out of 100 */}
                      <div
                        className="absolute left-0 top-0 h-7 flex transition-all duration-300"
                        style={{ width: `${totalPercentage}%` }}
                      >
                        {/* Completed portion (red) */}
                        <div
                          className="bg-[#DC2626] h-7 flex items-center justify-start px-2.5 transition-all duration-300"
                          style={{ width: `${completedPercentage}%` }}
                        >
                          <span className="text-white text-[10px] font-semibold">{completed}</span>
                        </div>
                        {/* Remaining portion (translucent red) */}
                        <div
                          className="h-7 flex items-center justify-end px-2.5 transition-all duration-300"
                          style={{
                            width: `${remainingPercentage}%`,
                            backgroundColor: "rgba(220, 38, 38, 0.4)",
                          }}
                        >
                          <span className="text-white text-[10px] font-semibold">{data.remaining}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress indicators - More compact */}
                    <div className="flex justify-between mt-1 text-[10px] text-gray-600">
                      <span>Completed: {completed}</span>
                      <span>Remaining: {data.remaining}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Left and Right Halves - Flight Progress Sections */}
        <div className="flex gap-3 mt-3">
          {/* Left Half - Flights in Progress */}
          <div className="w-1/2 bg-white border border-gray-200">
            <div className="p-2.5 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Flights in Progress</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Completion rates against planned ULDs – At a ULD level by flight</p>
            </div>
            
            {/* Flight List */}
            <div className="p-2 border-b border-gray-100">
              <div className="grid grid-cols-[1fr_0.8fr_1.2fr_0.8fr_0.8fr_0.8fr] gap-2 text-[10px]">
                <div className="font-semibold text-gray-700">Flight</div>
                <div className="font-semibold text-gray-700">STD</div>
                <div className="font-semibold text-gray-700">Destination</div>
                <div className="font-semibold text-gray-700">Planned</div>
                <div className="font-semibold text-gray-700">Completed</div>
                <div className="font-semibold text-gray-700">%</div>
              </div>
              <div className="grid grid-cols-[1fr_0.8fr_1.2fr_0.8fr_0.8fr_0.8fr] gap-2 mt-1.5 text-xs">
                <div className="font-semibold text-[#D71A21]">{currentFlightPlan.flight}</div>
                <div className="text-gray-900">{currentFlightPlan.std}</div>
                <div className="text-gray-900">{currentFlightPlan.pax.split("/")[1] ? `DXB-${currentFlightPlan.pax.split("/")[1]}` : "DXB-MAA"}</div>
                <div className="text-gray-900">{flightStats.totalAWBs}</div>
                <div className="text-green-600 font-semibold">{flightStats.completed}</div>
                <div className="text-gray-900 font-semibold">{flightStats.completionRate}%</div>
              </div>
            </div>
            
            {/* Complex Line Chart - AWB Level Progress */}
            <div className="p-3 relative" style={{ height: "320px" }}>
              {/* Shift Selector - Top Right */}
              <div className="absolute top-3 right-3 z-10">
                <Select
                  value={selectedShift}
                  onValueChange={(value) => setSelectedShift(value as "0600-0900" | "0901-1259")}
                >
                  <SelectTrigger className="h-7 w-[140px] text-xs bg-white">
                    <Clock className="w-3 h-3 mr-1" />
                    <SelectValue>{selectedShift} ({shiftHours}h)</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0600-0900">0600-0900 (3.0h)</SelectItem>
                    <SelectItem value="0901-1259">0901-1259 (3.97h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {lineChartData && lineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="sequence"
                    tick={{ fontSize: 9, fill: "#6B7280" }}
                    stroke="#9CA3AF"
                    label={{ value: "AWB Sequence", position: "insideBottom", offset: -5, style: { fontSize: "10px", fill: "#6B7280" } }}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#6B7280" }}
                    stroke="#9CA3AF"
                    label={{ value: "PCS", angle: -90, position: "insideLeft", style: { fontSize: "10px", fill: "#6B7280" } }}
                  />
                  <Tooltip content={<ComplexTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} iconSize={10} />
                  <Line
                    type="monotone"
                    dataKey="remaining"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="Remaining"
                    dot={{ fill: "#F59E0B", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Completed"
                    dot={{ fill: "#10B981", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="offloaded"
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    name="Offloaded"
                    dot={{ fill: "#EF4444", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  {showSplit && (
                    <Line
                      type="monotone"
                      dataKey="split"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Split (Partial)"
                      dot={{ fill: "#3B82F6", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No data available
                </div>
              )}

              {/* Split Toggle - Bottom Right */}
              <div className="absolute bottom-3 right-3 z-10">
                <button
                  onClick={() => setShowSplit(!showSplit)}
                  className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                    showSplit
                      ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {showSplit ? "✓" : ""} Show Split (Partial)
                </button>
              </div>
            </div>
          </div>
          
          {/* Right Half - Anticipated Incoming Workload */}
          <div className="w-1/2 bg-white border border-gray-200">
            <div className="p-2.5 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Anticipated Incoming Workload</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Based on upcoming flights</p>
            </div>
            
            {/* Flight List */}
            <div className="p-2 border-b border-gray-100">
              <div className="grid grid-cols-[1fr_0.8fr_1.2fr_0.8fr] gap-2 text-[10px]">
                <div className="font-semibold text-gray-700">Flight</div>
                <div className="font-semibold text-gray-700">STD</div>
                <div className="font-semibold text-gray-700">Destination</div>
                <div className="font-semibold text-gray-700">Planned ULDs</div>
              </div>
              {anticipatedChartData.map((flight) => {
                const flightPlan = loadPlans.find((p) => p.flight === flight.flight) || {
                  flight: flight.flight,
                  std: flight.flight === "EK0205" ? "09:35" : "14:20",
                  date: "",
                  acftType: "",
                  acftReg: "",
                  pax: "",
                  uldVersion: "",
                  ttlPlnUld: "",
                }
                return (
                  <div key={flight.flight} className="grid grid-cols-[1fr_0.8fr_1.2fr_0.8fr] gap-2 mt-1.5 text-xs">
                    <div className="font-semibold text-[#D71A21]">{flight.flight}</div>
                    <div className="text-gray-900">{flightPlan.std}</div>
                    <div className="text-gray-900">{flight.destination}</div>
                    <div className="text-gray-900 font-semibold">{flight.PMC + flight.AKE}</div>
                  </div>
                )
              })}
            </div>
            
            {/* Graph - ULD Type Breakdown */}
            <div className="p-3 h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={uldTypeChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} barCategoryGap="20%" barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    stroke="#9CA3AF"
                    type="category"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#6B7280" }}
                    stroke="#9CA3AF"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "4px",
                      fontSize: "11px",
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      if (props.payload.type === "Total") {
                        if (name === "pmcAke") {
                          return [`${value} ULDs (PMC + AKE)`, "PMC + AKE"]
                        } else if (name === "bulk") {
                          return [`${value} ULDs`, "BULK"]
                        } else if (name === "total") {
                          return [`${value} ULDs`, "Total"]
                        }
                      } else {
                        // PMC or AKE
                        return [`${value} ULDs`, props.payload.type]
                      }
                      return null
                    }}
                    labelFormatter={(label) => {
                      if (label === "Total") {
                        return `Total: ${uldBreakdownData.total} ULDs`
                      }
                      return `ULD Type: ${label}`
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} 
                    iconSize={10}
                    content={({ payload }) => {
                      const filteredPayload = payload?.filter(entry => entry.dataKey !== "count") || []
                      const hasTotal = filteredPayload.some(entry => entry.dataKey === "bulk")
                      
                      return (
                        <ul className="flex justify-center gap-4 text-[10px]">
                          {/* PMC + AKE */}
                          {filteredPayload
                            .filter(entry => entry.dataKey === "pmcAke")
                            .map((entry, index) => (
                              <li key={`item-pmcake-${index}`} className="flex items-center gap-1">
                                <span 
                                  style={{ 
                                    display: "inline-block",
                                    width: "10px",
                                    height: "10px",
                                    backgroundColor: entry.color || "#DC2626",
                                    borderRadius: "2px"
                                  }}
                                />
                                <span>{entry.value}</span>
                              </li>
                            ))}
                          
                          {/* BULK */}
                          {filteredPayload
                            .filter(entry => entry.dataKey === "bulk")
                            .map((entry, index) => (
                              <li key={`item-bulk-${index}`} className="flex items-center gap-1">
                                <span 
                                  style={{ 
                                    display: "inline-block",
                                    width: "10px",
                                    height: "10px",
                                    backgroundColor: entry.color || "#F59E0B",
                                    borderRadius: "2px"
                                  }}
                                />
                                <span>{entry.value}</span>
                              </li>
                            ))}
                          
                          {/* Total with half-black/half-yellow icon */}
                          {hasTotal && (
                            <li key="item-total" className="flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 10 10" className="inline-block" style={{ borderRadius: "2px", overflow: "hidden" }}>
                                <rect width="5" height="10" fill="#000000" />
                                <rect x="5" width="5" height="10" fill="#F59E0B" />
                              </svg>
                              <span>Total</span>
                            </li>
                          )}
                        </ul>
                      )
                    }}
                  />
                  {/* PMC and AKE bars - using count dataKey, centered on their categories */}
                  <Bar dataKey="count" fill="#DC2626" name="" radius={[4, 4, 0, 0]}>
                    {uldTypeChartData.map((entry, index) => {
                      if (entry.type === "Total") {
                        return <Cell key={`cell-empty-${index}`} fill="transparent" />
                      }
                      return <Cell key={`cell-${index}`} fill={entry.color} />
                    })}
                  </Bar>
                  {/* Total bar with stacked PMC+AKE (bottom) and BULK (top highlighted) - centered on Total category */}
                  <Bar dataKey="pmcAke" stackId="total" fill="#DC2626" name="PMC + AKE" radius={[0, 0, 0, 0]}>
                    {uldTypeChartData.map((entry, index) => {
                      if (entry.type === "Total") {
                        return <Cell key={`cell-total-pmcake-${index}`} fill="#DC2626" />
                      }
                      return <Cell key={`cell-empty-pmcake-${index}`} fill="transparent" />
                    })}
                  </Bar>
                  <Bar dataKey="bulk" stackId="total" fill="#F59E0B" name="BULK" radius={[4, 4, 0, 0]}>
                    {uldTypeChartData.map((entry, index) => {
                      if (entry.type === "Total") {
                        return <Cell key={`cell-total-bulk-${index}`} fill="#F59E0B" />
                      }
                      return <Cell key={`cell-empty-bulk-${index}`} fill="transparent" />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Multi-Axis Line Chart */}
        {chartData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 mt-3">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Advance vs Planned - Efficiency & Staff Analysis</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="dateFormatted"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  stroke="#9CA3AF"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  yAxisId="left"
                  label={{ value: "Count", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  stroke="#9CA3AF"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: "Efficiency % / Staff", angle: 90, position: "insideRight", style: { fontSize: 11 } }}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  stroke="#9CA3AF"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} iconSize={10} />
                <Line
                  yAxisId="left"
                  type="basis"
                  dataKey="advance"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  name="Advance"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="left"
                  type="basis"
                  dataKey="planned"
                  stroke="#6B7280"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  name="Planned"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="left"
                  type="basis"
                  dataKey="built"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  name="Built"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="left"
                  type="basis"
                  dataKey="pending"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  name="Pending"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="basis"
                  dataKey="efficiency"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  name="Efficiency %"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="basis"
                  dataKey="staffRequired"
                  stroke="#A855F7"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  name="Staff Required"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Raw Data Tables Dropdown */}
            <Collapsible open={isTableOpen} onOpenChange={setIsTableOpen} className="mt-4">
              <CollapsibleTrigger className="w-full">
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex items-center justify-between hover:bg-gray-100 transition-colors">
                  <h3 className="text-sm font-semibold text-gray-900">Raw Data Tables</h3>
                  {isTableOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 space-y-4">
                  {/* Day Shift Table */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Day Shift</h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Date</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Day</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Advance F/W</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Advance S/W</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Total Advance</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Planned F/W</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Planned S/W</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Total Build</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Total Pending</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Duty Hrs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayShiftData.slice(0, 20).map((row, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-2 py-1.5 border-b">{row.Date}</td>
                              <td className="px-2 py-1.5 border-b">{row.Day}</td>
                              <td className="px-2 py-1.5 border-b">{row["Advance First Wave"]}</td>
                              <td className="px-2 py-1.5 border-b">{row["Advance Second Wave"]}</td>
                              <td className="px-2 py-1.5 border-b font-semibold">{row["Total Advance"]}</td>
                              <td className="px-2 py-1.5 border-b">{row["Total Planned F/W"]}</td>
                              <td className="px-2 py-1.5 border-b">{row["Total Palnned S/W"]}</td>
                              <td className="px-2 py-1.5 border-b font-semibold text-green-600">{row["Total Build"]}</td>
                              <td className="px-2 py-1.5 border-b font-semibold text-red-600">{row["Total Pending"]}</td>
                              <td className="px-2 py-1.5 border-b">{row["Duty Hrs"]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Night Shift Table */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Night Shift</h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Date</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Day</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Advance F/W</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Advance S/W</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Total Advance</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Planned F/W</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Planned S/W</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Total Build</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Total Pending</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b">Duty Hrs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nightShiftData.slice(0, 20).map((row, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-2 py-1.5 border-b">{row.Date}</td>
                              <td className="px-2 py-1.5 border-b">{row.Day}</td>
                              <td className="px-2 py-1.5 border-b">{row["Advance First Wave"]}</td>
                              <td className="px-2 py-1.5 border-b">{row["Advance Second Wave"]}</td>
                              <td className="px-2 py-1.5 border-b font-semibold">{row["Total Advance"]}</td>
                              <td className="px-2 py-1.5 border-b">{row["Total Planned F/W"]}</td>
                              <td className="px-2 py-1.5 border-b">{row["Total Palnned S/W"]}</td>
                              <td className="px-2 py-1.5 border-b font-semibold text-green-600">{row["Total Build"]}</td>
                              <td className="px-2 py-1.5 border-b font-semibold text-red-600">{row["Total Pending"]}</td>
                              <td className="px-2 py-1.5 border-b">{row["Duty Hrs"]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Recommendations</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  {recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>  
  )
}

