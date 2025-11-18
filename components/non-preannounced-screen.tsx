"use client"

import { useState } from "react"
import { Package, AlertTriangle, Plus, Search } from "lucide-react"

const HARDCODED_NON_PREANNOUNCED = [
  {
    id: 1,
    uldNumber: "AKE12345DXB",
    discoveredAt: "13:45 13/10/2025",
    location: "Warehouse A - Bay 12",
    status: "Pending Investigation",
    notes: "Found during routine inspection",
    priority: "High",
  },
  {
    id: 2,
    uldNumber: "PMC98765UAE",
    discoveredAt: "10:20 13/10/2025",
    location: "Tunnel 3",
    status: "Under Review",
    notes: "No matching flight manifest",
    priority: "Medium",
  },
  {
    id: 3,
    uldNumber: "AKE54321LHR",
    discoveredAt: "08:15 13/10/2025",
    location: "Warehouse B - Bay 5",
    status: "Resolved",
    notes: "Matched to delayed flight EK524",
    priority: "Low",
  },
]

export default function NonPreaannouncedScreen() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)

  const filteredData = HARDCODED_NON_PREANNOUNCED.filter(
    (item) =>
      searchQuery === "" ||
      item.uldNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending Investigation":
        return "bg-red-100 text-red-800 border-red-200"
      case "Under Review":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Resolved":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Non-Preannounced ULDs</h1>
            <p className="text-sm text-gray-500">Track discovered ULDs</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-[#D71A21] text-white px-3 py-1.5 rounded hover:bg-[#B01419] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Report</span>
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search ULD or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
          />
        </div>
      </div>

      <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-gray-600">Pending:</span>
            <span className="font-semibold text-red-600">
              {HARDCODED_NON_PREANNOUNCED.filter((u) => u.status === "Pending Investigation").length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-gray-600" />
            <span className="text-gray-600">Review:</span>
            <span className="font-semibold text-gray-900">
              {HARDCODED_NON_PREANNOUNCED.filter((u) => u.status === "Under Review").length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-gray-600" />
            <span className="text-gray-600">Resolved:</span>
            <span className="font-semibold text-gray-900">
              {HARDCODED_NON_PREANNOUNCED.filter((u) => u.status === "Resolved").length}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">ULD Number</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Discovered</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Location</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Priority</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-gray-500 text-sm">
                  No ULDs found
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-900">{item.uldNumber}</td>
                  <td className="px-3 py-2 text-gray-600">{item.discoveredAt}</td>
                  <td className="px-3 py-2 text-gray-700">{item.location}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getStatusColor(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(item.priority)}`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{item.notes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Non-Preannounced ULD</h3>
            <p className="text-sm text-gray-600 mb-4">This feature will allow staff to report discovered ULDs.</p>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full bg-[#D71A21] text-white px-4 py-2 rounded-lg hover:bg-[#B01419] transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
