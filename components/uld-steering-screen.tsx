"use client"

import { useState } from "react"
import { Download, Filter } from "lucide-react"

const HARDCODED_ULD_STEERING_DATA = [
  {
    id: 1,
    uldNumber: "AKE12345DXB",
    flightNumber: "EK524",
    loadType: "GCR",
    currentLocation: "CMT-A",
    assignedModule: "Module 3",
    priority: "High",
    status: "Pending Assignment",
    destination: "DWC",
    weight: 1250,
    pieces: 45,
  },
  {
    id: 2,
    uldNumber: "PMC67890DXB",
    flightNumber: "EK001",
    loadType: "PER",
    currentLocation: "CMT-B",
    assignedModule: "Module 1",
    priority: "Medium",
    status: "Assigned",
    destination: "DWC",
    weight: 980,
    pieces: 32,
  },
  {
    id: 3,
    uldNumber: "AKE23456DXB",
    flightNumber: "EK203",
    loadType: "Mail",
    currentLocation: "CMT-A",
    assignedModule: "Module 2",
    priority: "High",
    status: "In Progress",
    destination: "DWC",
    weight: 1450,
    pieces: 67,
  },
  {
    id: 4,
    uldNumber: "PMC78901DXB",
    flightNumber: "EK412",
    loadType: "FFN",
    currentLocation: "CMT-C",
    assignedModule: "Module 4",
    priority: "Low",
    status: "Assigned",
    destination: "DWC",
    weight: 750,
    pieces: 28,
  },
  {
    id: 5,
    uldNumber: "AKE34567DXB",
    flightNumber: "EK225",
    loadType: "EKP",
    currentLocation: "CMT-B",
    assignedModule: "Module 1",
    priority: "High",
    status: "Pending Assignment",
    destination: "DWC",
    weight: 1680,
    pieces: 89,
  },
]

export default function ULDSteeringScreen() {
  const [selectedModule, setSelectedModule] = useState("All")
  const [selectedPriority, setSelectedPriority] = useState("All")
  const [selectedStatus, setSelectedStatus] = useState("All")

  const filteredData = HARDCODED_ULD_STEERING_DATA.filter((item) => {
    return (
      (selectedModule === "All" || item.assignedModule === selectedModule) &&
      (selectedPriority === "All" || item.priority === selectedPriority) &&
      (selectedStatus === "All" || item.status === selectedStatus)
    )
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Assigned":
        return "bg-gray-200 text-gray-800 border-gray-300"
      case "In Progress":
        return "bg-red-100 text-red-800 border-red-200"
      case "Pending Assignment":
        return "bg-gray-100 text-gray-600 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">ULD Steering (DWC)</h1>
            <p className="text-sm text-gray-500">Module allocation</p>
          </div>
          <button className="flex items-center gap-1.5 bg-[#D71A21] text-white px-3 py-1.5 rounded hover:bg-[#B01519] transition-colors text-sm font-medium">
            <Download className="w-4 h-4" />
            <span>UWS List</span>
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
        <div className="flex items-center gap-2 text-sm">
          <Filter className="w-4 h-4 text-gray-600" />
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
          >
            <option value="All">All Modules</option>
            <option value="Module 1">Module 1</option>
            <option value="Module 2">Module 2</option>
            <option value="Module 3">Module 3</option>
            <option value="Module 4">Module 4</option>
          </select>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
          >
            <option value="All">All Status</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Assignment">Pending</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">ULD</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Flight</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Location</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Module</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Priority</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Weight</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Pcs</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-semibold text-gray-900">{item.uldNumber}</td>
                <td className="px-3 py-2 text-gray-700">{item.flightNumber}</td>
                <td className="px-3 py-2 text-gray-600">{item.loadType}</td>
                <td className="px-3 py-2 text-gray-600">{item.currentLocation}</td>
                <td className="px-3 py-2 font-medium text-gray-900">{item.assignedModule}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(item.priority)}`}
                  >
                    {item.priority}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getStatusColor(item.status)}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600">{item.weight}</td>
                <td className="px-3 py-2 text-gray-600">{item.pieces}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
        <p className="text-sm text-gray-600">{filteredData.length} ULDs</p>
      </div>
    </div>
  )
}
