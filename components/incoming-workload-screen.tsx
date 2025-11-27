"use client"

import { useMemo } from "react"
import { Plane, Clock, MapPin, Package } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, TooltipProps } from "recharts"
import { useLoadPlans, type LoadPlan } from "@/lib/load-plan-context"
import { BUP_ALLOCATION_DATA } from "@/lib/bup-allocation-data"

// Parse ULD count from ttlPlnUld string (e.g., "06PMC/07AKE" -> {pmc: 6, ake: 7, bulk: 0, total: 13})
function parseULDCount(ttlPlnUld: string): { pmc: number; ake: number; bulk: number; total: number } {
  if (!ttlPlnUld) return { pmc: 0, ake: 0, bulk: 0, total: 0 }
  const pmcMatch = ttlPlnUld.match(/(\d+)PMC/i)
  const akeMatch = ttlPlnUld.match(/(\d+)AKE/i)
  const bulkMatch = ttlPlnUld.match(/(\d+)BULK/i)
  const pmc = pmcMatch ? parseInt(pmcMatch[1]) : 0
  const ake = akeMatch ? parseInt(akeMatch[1]) : 0
  const bulk = bulkMatch ? parseInt(bulkMatch[1]) : 0
  return { pmc, ake, bulk, total: pmc + ake + bulk }
}

// Custom tooltip to prevent duplicates and only show relevant data
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0]?.payload
  if (!data) return null

  // For Total bar, show breakdown
  if (label === "Total" && data.pmc !== undefined) {
    const items: Array<{ name: string; value: number; color: string }> = []
    
    if (data.pmc > 0) {
      items.push({ name: "PMC", value: data.pmc, color: "#DC2626" })
    }
    if (data.ake > 0) {
      items.push({ name: "AKE", value: data.ake, color: "#EF4444" })
    }
    if (data.bulk > 0) {
      items.push({ name: "Bulk", value: data.bulk, color: "#F59E0B" })
    }
    
    return (
      <div className="bg-white border border-gray-300 rounded px-3 py-2 shadow-lg">
        <p className="font-semibold text-sm mb-1">Total: {data.total || 0} ULDs</p>
        {items.length > 0 && (
          <div className="space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    backgroundColor: item.color,
                    borderRadius: "2px"
                  }}
                />
                <span>{item.name}: {item.value} ULDs</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // For individual bars (PMC or AKE), show single value
  const value = typeof payload[0]?.value === 'number' ? payload[0].value : 0
  if (value <= 0) return null

  const color = label === "AKE" ? "#EF4444" : "#DC2626"
  
  return (
    <div className="bg-white border border-gray-300 rounded px-3 py-2 shadow-lg">
      <p className="font-semibold text-sm mb-1">ULD Type: {label}</p>
      <div className="flex items-center gap-2 text-xs">
        <span
          style={{
            display: "inline-block",
            width: "10px",
            height: "10px",
            backgroundColor: color,
            borderRadius: "2px"
          }}
        />
        <span>{label}: {value} ULDs</span>
      </div>
    </div>
  )
}

// Extract destination from pax field (e.g., "DXB/MAA/0/23/251" -> "DXB-MAA")
function extractDestination(pax: string): string {
  if (!pax) return "DXB-JFK"
  const parts = pax.split("/")
  const origin = parts[0] || "DXB"
  const destination = parts[1] || "JFK"
  return `${origin}-${destination}`
}

// Calculate ULD breakdown from actual flight data
function calculateULDBreakdown(flights: Array<{ uldBreakdown: { pmc: number; ake: number; bulk: number; total: number } }>) {
  let pmcCount = 0
  let akeCount = 0
  let bulkCount = 0

  flights.forEach((flight) => {
    pmcCount += flight.uldBreakdown.pmc
    akeCount += flight.uldBreakdown.ake
    bulkCount += flight.uldBreakdown.bulk
  })

  return {
    PMC: pmcCount,
    AKE: akeCount,
    BULK: bulkCount,
    total: pmcCount + akeCount + bulkCount,
  }
}

export default function IncomingWorkloadScreen() {
  const { loadPlans } = useLoadPlans()

  // Get all load plans first (show all available load plans)
  const allFlights = useMemo(() => {
    return loadPlans
      .map((plan) => ({
        flight: plan.flight,
        std: plan.std,
        destination: extractDestination(plan.pax),
        uldBreakdown: parseULDCount(plan.ttlPlnUld),
        ttlPlnUld: plan.ttlPlnUld,
      }))
      .sort((a, b) => {
        // Sort by STD time
        const [aHours, aMinutes] = a.std.split(":").map(Number)
        const [bHours, bMinutes] = b.std.split(":").map(Number)
        const aTime = aHours * 60 + (aMinutes || 0)
        const bTime = bHours * 60 + (bMinutes || 0)
        return aTime - bTime
      })
  }, [loadPlans])

  // Get flights that are NOT in BUP allocation list (logic kept for future filtering)
  // Currently showing all load plans first as requested
  const incomingFlightsLogic = useMemo(() => {
    // Get all flight numbers from BUP allocation (normalize to match load plan format)
    const bupFlightNumbers = new Set(
      BUP_ALLOCATION_DATA.map((a) => {
        return a.flightNo.startsWith("EK") ? a.flightNo : `EK${a.flightNo}`
      })
    )

    // Filter load plans to only include flights NOT in BUP allocation
    // Logic kept but showing all flights first as requested
    return allFlights.filter((flight) => {
      const normalizedFlight = flight.flight.startsWith("EK") ? flight.flight : `EK${flight.flight}`
      return !bupFlightNumbers.has(normalizedFlight)
    })
  }, [allFlights])

  // Use all flights for display (show all available load plans first)
  const displayFlights = allFlights

  // Calculate ULD breakdown for graph based on ACTUAL flights in the table
  const uldBreakdownData = useMemo(() => {
    return calculateULDBreakdown(displayFlights)
  }, [displayFlights])

  // Prepare bar chart data for ULD types - based on actual load plan ttlPlnUld data
  const uldTypeChartData = useMemo(() => {
    return [
      {
        type: "PMC",
        value: uldBreakdownData.PMC,
        total: uldBreakdownData.PMC,
      },
      {
        type: "AKE",
        value: uldBreakdownData.AKE,
        total: uldBreakdownData.AKE,
      },
      {
        type: "Total",
        value: uldBreakdownData.PMC + uldBreakdownData.AKE + uldBreakdownData.BULK,
        pmc: uldBreakdownData.PMC,
        ake: uldBreakdownData.AKE,
        bulk: uldBreakdownData.BULK,
        total: uldBreakdownData.PMC + uldBreakdownData.AKE + uldBreakdownData.BULK,
      },
    ]
  }, [uldBreakdownData])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">Anticipated Incoming Workload</h2>
          <p className="text-sm text-gray-500 mt-1">Based on upcoming flights</p>
        </div>

        {/* Graph - ULD Type Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ULD Type Breakdown</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uldTypeChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} barCategoryGap="35%" barGap={0}>
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
                    return (
                      <ul className="flex justify-center gap-4 text-xs">
                        <li className="flex items-center gap-1">
                          <span 
                            style={{ 
                              display: "inline-block",
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#DC2626",
                              borderRadius: "2px"
                            }}
                          />
                          <span>PMC</span>
                        </li>
                        <li className="flex items-center gap-1">
                          <span 
                            style={{ 
                              display: "inline-block",
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#EF4444",
                              borderRadius: "2px"
                            }}
                          />
                          <span>AKE</span>
                        </li>
                        <li className="flex items-center gap-1">
                          <span 
                            style={{ 
                              display: "inline-block",
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#F59E0B",
                              borderRadius: "2px"
                            }}
                          />
                          <span>Bulk</span>
                        </li>
                      </ul>
                    )
                  }}
                />
                <Bar dataKey="value" barSize={60} radius={[4, 4, 0, 0]} name="value">
                  {uldTypeChartData.map((entry, index) => {
                    let fillColor = "#DC2626"
                    
                    if (entry.type === "AKE") {
                      fillColor = "#EF4444"
                    } else if (entry.type === "Total") {
                      fillColor = "#DC2626"
                    }
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={fillColor}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Flight List Table */}
        <div className="mx-2 rounded-lg border border-gray-200 overflow-x-auto">
          <div className="bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-[#D71A21] text-white">
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Flight</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">STD</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Destination</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Planned ULDs</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayFlights.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-center text-gray-500 text-sm">
                      No load plans available
                    </td>
                  </tr>
                ) : (
                  displayFlights.map((flight) => (
                    <tr key={flight.flight} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-2 py-1 font-semibold text-[#D71A21] text-xs whitespace-nowrap truncate">
                        {flight.flight}
                      </td>
                      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{flight.std}</td>
                      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{flight.destination}</td>
                      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate font-semibold">
                        {flight.uldBreakdown.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

