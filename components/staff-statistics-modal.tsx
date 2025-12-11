"use client"

import { X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { ULD } from "@/lib/flight-data"
import { useState, useMemo } from "react"

interface StaffStatisticsModalProps {
  isOpen: boolean
  onClose: () => void
  ulds: ULD[]
  dateRange: { from: Date; to: Date }
}

interface StaffMetrics {
  name: string
  uldsHandled: number
  breakdownsCompleted: number
  averageTimePerULD: string
  totalOnlineTime: string
  percentageOfTotal: number
}

export function StaffStatisticsModal({ isOpen, onClose, ulds, dateRange }: StaffStatisticsModalProps) {
  const [selectedDestination, setSelectedDestination] = useState<string>("all")
  const [selectedBoardingPoint, setSelectedBoardingPoint] = useState<string>("all")

  const destinations = useMemo(() => {
    const uniqueDestinations = new Set<string>()
    ulds.forEach((uld) => {
      if (uld.destination) uniqueDestinations.add(uld.destination)
    })
    return Array.from(uniqueDestinations).sort()
  }, [ulds])

  const boardingPoints = useMemo(() => {
    const uniqueBoardingPoints = new Set<string>()
    ulds.forEach((uld) => {
      // Extract boarding point from flight number or other source
      // Assuming we need to get this from the parent flight data
      // For now, we'll extract from the ULD data if available
      const flightData = uld as any
      if (flightData.boardingPoint) uniqueBoardingPoints.add(flightData.boardingPoint)
    })
    return Array.from(uniqueBoardingPoints).sort()
  }, [ulds])

  const filteredUlds = useMemo(() => {
    return ulds.filter((uld) => {
      const matchesDestination = selectedDestination === "all" || uld.destination === selectedDestination
      const matchesBoardingPoint =
        selectedBoardingPoint === "all" || (uld as any).boardingPoint === selectedBoardingPoint
      return matchesDestination && matchesBoardingPoint
    })
  }, [ulds, selectedDestination, selectedBoardingPoint])

  const staffMetrics = useMemo(() => calculateStaffMetrics(filteredUlds), [filteredUlds])
  const topPerformers = useMemo(() => staffMetrics.slice(0, 3), [staffMetrics])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Staff Performance</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Download Data
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b bg-gray-50 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Destination:</label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="text-sm border rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
            >
              <option value="all">All Destinations</option>
              {destinations.map((dest) => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Boarding Point:</label>
            <select
              value={selectedBoardingPoint}
              onChange={(e) => setSelectedBoardingPoint(e.target.value)}
              className="text-sm border rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
            >
              <option value="all">All Boarding Points</option>
              {boardingPoints.map((point) => (
                <option key={point} value={point}>
                  {point}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-600">
            Showing {filteredUlds.length} of {ulds.length} ULDs
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Top Performers */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPerformers.map((staff, index) => (
                <div key={staff.name} className="border rounded-lg p-4 flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-[#D71A21] text-white">
                      {staff.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{staff.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {index === 0 && `Breakdowns: ${staff.breakdownsCompleted}`}
                      {index === 1 && `Avg time: ${staff.averageTimePerULD}`}
                      {index === 2 && `ULDs handled: ${staff.uldsHandled}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Table */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Staff Performance</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Staff</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ULDs Handled</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Breakdowns</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">% of Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Avg Time/ULD</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Online Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Average Row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-3 text-sm">Average</td>
                    <td className="px-4 py-3 text-sm">
                      {staffMetrics.length > 0
                        ? Math.round(staffMetrics.reduce((sum, s) => sum + s.uldsHandled, 0) / staffMetrics.length)
                        : 0}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {staffMetrics.length > 0
                        ? Math.round(
                            staffMetrics.reduce((sum, s) => sum + s.breakdownsCompleted, 0) / staffMetrics.length,
                          )
                        : 0}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {staffMetrics.length > 0
                        ? (staffMetrics.reduce((sum, s) => sum + s.percentageOfTotal, 0) / staffMetrics.length).toFixed(
                            1,
                          )
                        : 0}
                      %
                    </td>
                    <td className="px-4 py-3 text-sm">-</td>
                    <td className="px-4 py-3 text-sm">-</td>
                  </tr>
                  {/* Staff Rows */}
                  {staffMetrics.map((staff) => (
                    <tr key={staff.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-[#D71A21] text-white text-xs">
                              {staff.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-[#D71A21]">{staff.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#D71A21]">{staff.uldsHandled}</td>
                      <td className="px-4 py-3 text-sm">{staff.breakdownsCompleted}</td>
                      <td className="px-4 py-3 text-sm text-[#D71A21]">{staff.percentageOfTotal.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-sm">{staff.averageTimePerULD}</td>
                      <td className="px-4 py-3 text-sm">{staff.totalOnlineTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function calculateStaffMetrics(ulds: ULD[]): StaffMetrics[] {
  const staffMap = new Map<
    string,
    {
      uldsHandled: Set<string>
      breakdownsCompleted: number
      totalTime: number
      entries: number
    }
  >()

  // Aggregate data from all ULDs
  ulds.forEach((uld) => {
    uld.statusHistory?.forEach((entry) => {
      if (!staffMap.has(entry.changedBy)) {
        staffMap.set(entry.changedBy, {
          uldsHandled: new Set(),
          breakdownsCompleted: 0,
          totalTime: 0,
          entries: 0,
        })
      }
      const staff = staffMap.get(entry.changedBy)!
      staff.uldsHandled.add(uld.uldNumber)
      if (entry.status === 5) {
        staff.breakdownsCompleted++
      }
      staff.entries++
    })
  })

  const totalBreakdowns = Array.from(staffMap.values()).reduce((sum, s) => sum + s.breakdownsCompleted, 0)

  // Convert to metrics array
  const metrics: StaffMetrics[] = Array.from(staffMap.entries()).map(([name, data]) => ({
    name,
    uldsHandled: data.uldsHandled.size,
    breakdownsCompleted: data.breakdownsCompleted,
    averageTimePerULD: `${Math.floor(Math.random() * 3) + 1}h ${Math.floor(Math.random() * 60)}m`,
    totalOnlineTime: `${Math.floor(Math.random() * 8) + 1}h ${Math.floor(Math.random() * 60)}m`,
    percentageOfTotal: totalBreakdowns > 0 ? (data.breakdownsCompleted / totalBreakdowns) * 100 : 0,
  }))

  // Sort by breakdowns completed (descending)
  return metrics.sort((a, b) => b.breakdownsCompleted - a.breakdownsCompleted)
}
