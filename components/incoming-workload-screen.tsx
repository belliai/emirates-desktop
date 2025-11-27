"use client"

import { useMemo } from "react"
import { Plane, Clock, MapPin, Package } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
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

  // Prepare bar chart data for ULD types - based on actual flight data
  const uldTypeChartData = useMemo(() => {
    return [
      {
        type: "PMC",
        pmc: uldBreakdownData.PMC,
        ake: 0,
        pmcAke: 0,
        bulk: 0,
        total: uldBreakdownData.PMC,
      },
      {
        type: "AKE",
        pmc: 0,
        ake: uldBreakdownData.AKE,
        pmcAke: 0,
        bulk: 0,
        total: uldBreakdownData.AKE,
      },
      {
        type: "Total",
        pmc: 0,
        ake: 0,
        pmcAke: uldBreakdownData.PMC + uldBreakdownData.AKE,
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    if (props.payload.type === "Total") {
                      if (name === "pmcAke") {
                        return [`${value} ULDs (PMC + AKE)`, "PMC + AKE"]
                      } else if (name === "bulk") {
                        return [`${value} ULDs`, "Bulk"]
                      } else if (name === "total") {
                        return [`${value} ULDs`, "Total"]
                      }
                    } else {
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
                <Bar dataKey="pmc" fill="#DC2626" name="PMC" barSize={60} radius={[4, 4, 0, 0]}>
                  {uldTypeChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-pmc-${index}`} 
                      fill={entry.type === "PMC" ? "#DC2626" : "transparent"} 
                    />
                  ))}
                </Bar>
                <Bar dataKey="ake" fill="#EF4444" name="AKE" barSize={60} radius={[4, 4, 0, 0]}>
                  {uldTypeChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-ake-${index}`} 
                      fill={entry.type === "AKE" ? "#EF4444" : "transparent"} 
                    />
                  ))}
                </Bar>
                <Bar dataKey="pmcAke" stackId="total" fill="#DC2626" name="PMC + AKE" barSize={60} radius={[0, 0, 0, 0]}>
                  {uldTypeChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-total-pmcake-${index}`} 
                      fill={entry.type === "Total" ? "#DC2626" : "transparent"} 
                    />
                  ))}
                </Bar>
                <Bar dataKey="bulk" stackId="total" fill="#F59E0B" name="Bulk" barSize={60} radius={[4, 4, 0, 0]}>
                  {uldTypeChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-total-bulk-${index}`} 
                      fill={entry.type === "Total" ? "#F59E0B" : "transparent"} 
                    />
                  ))}
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

