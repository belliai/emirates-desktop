"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

const HARDCODED_STAFF = [
  {
    id: 1,
    name: "Hassan Ibrahim",
    employeeId: "EK001",
    avatar: "HI",
    uldsHandled: 59,
    breakdowns: 7,
    percentOfTotal: 15.6,
    avgTimePerULD: "2h 34m",
    onlineTime: "8h 15m",
  },
  {
    id: 2,
    name: "Sophie Anderson",
    employeeId: "EK002",
    avatar: "SA",
    uldsHandled: 33,
    breakdowns: 7,
    percentOfTotal: 15.6,
    avgTimePerULD: "3h 13m",
    onlineTime: "7h 45m",
  },
  {
    id: 3,
    name: "Emily Chen",
    employeeId: "EK003",
    avatar: "EC",
    uldsHandled: 30,
    breakdowns: 4,
    percentOfTotal: 8.9,
    avgTimePerULD: "3h 34m",
    onlineTime: "8h 00m",
  },
  {
    id: 4,
    name: "Ahmed Hassan",
    employeeId: "EK004",
    avatar: "AH",
    uldsHandled: 45,
    breakdowns: 5,
    percentOfTotal: 12.3,
    avgTimePerULD: "2h 56m",
    onlineTime: "8h 30m",
  },
  {
    id: 5,
    name: "Mohammed Ali",
    employeeId: "EK005",
    avatar: "MA",
    uldsHandled: 38,
    breakdowns: 6,
    percentOfTotal: 14.2,
    avgTimePerULD: "3h 05m",
    onlineTime: "7h 50m",
  },
]

export default function StaffRosterScreen() {
  const [selectedDestination, setSelectedDestination] = useState("all")
  const [selectedBoardingPoint, setSelectedBoardingPoint] = useState("all")

  // Calculate averages
  const avgUldsHandled = Math.round(HARDCODED_STAFF.reduce((sum, s) => sum + s.uldsHandled, 0) / HARDCODED_STAFF.length)
  const avgBreakdowns = Math.round(HARDCODED_STAFF.reduce((sum, s) => sum + s.breakdowns, 0) / HARDCODED_STAFF.length)
  const avgPercentOfTotal = (
    HARDCODED_STAFF.reduce((sum, s) => sum + s.percentOfTotal, 0) / HARDCODED_STAFF.length
  ).toFixed(1)

  const topPerformers = HARDCODED_STAFF.slice(0, 3)

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Staff Performance</h1>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Download Data
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-3 border rounded-lg bg-gray-50 flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Destination:</label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="text-sm border rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
            >
              <option value="all">All Destinations</option>
              <option value="BKK">BKK</option>
              <option value="SIN">SIN</option>
              <option value="LHR">LHR</option>
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
              <option value="T3">Terminal 3</option>
              <option value="Cargo">Cargo Village</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-600">Showing 232 of 232 ULDs</div>
        </div>

        {/* Top Performers */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPerformers.map((staff, index) => (
              <div key={staff.id} className="border rounded-lg p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#D71A21] flex items-center justify-center text-white font-semibold">
                  {staff.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{staff.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {index === 0 && `Breakdowns: ${staff.breakdowns}`}
                    {index === 1 && `Avg time: ${staff.avgTimePerULD}`}
                    {index === 2 && `ULDs handled: ${staff.uldsHandled}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Performance Table */}
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
                  <td className="px-4 py-3 text-sm">{avgUldsHandled}</td>
                  <td className="px-4 py-3 text-sm">{avgBreakdowns}</td>
                  <td className="px-4 py-3 text-sm">{avgPercentOfTotal}%</td>
                  <td className="px-4 py-3 text-sm">-</td>
                  <td className="px-4 py-3 text-sm">-</td>
                </tr>
                {/* Staff Rows */}
                {HARDCODED_STAFF.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#D71A21] flex items-center justify-center text-white text-xs font-semibold">
                          {staff.avatar}
                        </div>
                        <span className="text-sm font-medium text-[#D71A21]">{staff.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#D71A21]">{staff.uldsHandled}</td>
                    <td className="px-4 py-3 text-sm">{staff.breakdowns}</td>
                    <td className="px-4 py-3 text-sm text-[#D71A21]">{staff.percentOfTotal}%</td>
                    <td className="px-4 py-3 text-sm">{staff.avgTimePerULD}</td>
                    <td className="px-4 py-3 text-sm">{staff.onlineTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
