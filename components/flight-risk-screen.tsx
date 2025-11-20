"use client"

import { AlertTriangle, Clock, Plane, Package } from "lucide-react"

const HARDCODED_RISK_DATA = [
  {
    id: 1,
    flightNumber: "EK524",
    uldCount: 3,
    connectionFlight: "EK001",
    connectionTime: "2h 15m",
    timeRemaining: "45m",
    riskLevel: "High",
    priority: "AOG",
  },
  {
    id: 2,
    flightNumber: "EK203",
    uldCount: 2,
    connectionFlight: "EK412",
    connectionTime: "3h 30m",
    timeRemaining: "1h 45m",
    riskLevel: "Medium",
    priority: "AXA",
  },
  {
    id: 3,
    flightNumber: "EK225",
    uldCount: 1,
    connectionFlight: "EK318",
    connectionTime: "1h 45m",
    timeRemaining: "25m",
    riskLevel: "High",
    priority: "EXD",
  },
]

export default function FlightRiskScreen() {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200"
      case "Medium":
        return "bg-gray-200 text-gray-800 border-gray-300"
      case "Low":
        return "bg-gray-100 text-gray-600 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "AOG":
        return "bg-red-600 text-white"
      case "AXA":
        return "bg-red-500 text-white"
      case "EXD":
        return "bg-red-400 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">Flight Risk Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Monitor at-risk connections and high-priority cargo</p>
        </div>

        {/* Alert Banner */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">
                {HARDCODED_RISK_DATA.filter((f) => f.riskLevel === "High").length} flights at high risk
              </p>
              <p className="text-sm text-red-700">Immediate attention required for connection management</p>
            </div>
          </div>
        </div>

        {/* Priority Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {["AOG", "AXA", "EXD"].map((priority) => {
            const flights = HARDCODED_RISK_DATA.filter((f) => f.priority === priority)
            return (
              <div key={priority} className="bg-gray-100 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{priority}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(priority)}`}>
                    {flights.length} Active
                  </span>
                </div>
                <div className="space-y-2">
                  {flights.map((flight) => (
                    <div key={flight.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">{flight.flightNumber}</p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getRiskColor(flight.riskLevel)}`}
                        >
                          {flight.riskLevel} Risk
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <Package className="w-3 h-3 inline mr-1" />
                          {flight.uldCount} ULDs
                        </p>
                        <p>
                          <Plane className="w-3 h-3 inline mr-1" />
                          Connection: {flight.connectionFlight}
                        </p>
                        <p>
                          <Clock className="w-3 h-3 inline mr-1" />
                          Time Remaining: <span className="font-semibold text-red-600">{flight.timeRemaining}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* At-Risk Flights Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-[#D71A21] text-white">
            <h2 className="font-semibold">At-Risk Flights</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">Flight Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">ULD Count</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">Connection Flight</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">Connection Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">Time Remaining</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">Risk Level</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">Priority</th>
                </tr>
              </thead>
              <tbody>
                {HARDCODED_RISK_DATA.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{item.flightNumber}</td>
                    <td className="px-4 py-3 text-gray-900 text-sm">{item.uldCount}</td>
                    <td className="px-4 py-3 text-gray-900 text-sm">{item.connectionFlight}</td>
                    <td className="px-4 py-3 text-gray-700 text-sm">{item.connectionTime}</td>
                    <td className="px-4 py-3 text-red-600 font-semibold text-sm">{item.timeRemaining}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getRiskColor(item.riskLevel)}`}
                      >
                        {item.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
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
