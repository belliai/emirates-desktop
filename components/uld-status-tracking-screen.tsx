"use client"

import { useState } from "react"
import { Download } from "lucide-react"

const HARDCODED_DROP_STATUS = [
  {
    id: 1,
    uldNumber: "AKE12345DXB",
    flight: "EK524",
    location: "CMT-A",
    dropTime: "12:30",
    receivedTime: "12:45",
    logisticsPartner: "Dnata",
    slaStatus: "On Time",
    slaMinutes: 15,
  },
  {
    id: 2,
    uldNumber: "PMC67890DXB",
    flight: "EK001",
    location: "CMT-B",
    dropTime: "13:15",
    receivedTime: "14:30",
    logisticsPartner: "Emirates Flight Catering",
    slaStatus: "Delayed",
    slaMinutes: 75,
  },
  {
    id: 3,
    uldNumber: "AKE23456DXB",
    flight: "EK203",
    location: "CMT-A",
    dropTime: "14:00",
    receivedTime: "14:25",
    logisticsPartner: "Dnata",
    slaStatus: "On Time",
    slaMinutes: 25,
  },
  {
    id: 4,
    uldNumber: "PMC78901DXB",
    flight: "EK412",
    location: "CMT-C",
    dropTime: "15:30",
    receivedTime: null,
    logisticsPartner: "Dnata",
    slaStatus: "Pending",
    slaMinutes: 0,
  },
]

const HARDCODED_INDUCTION_STATUS = [
  {
    id: 1,
    uldNumber: "AKE12345DXB",
    flight: "EK524",
    tunnelLocation: "Tunnel 1",
    inductionTime: "13:00",
    inductedBy: "Ahmed Hassan",
    status: "Inducted",
  },
  {
    id: 2,
    uldNumber: "PMC67890DXB",
    flight: "EK001",
    tunnelLocation: "Tunnel 2",
    inductionTime: "14:45",
    inductedBy: "Mohammed Ali",
    status: "Inducted",
  },
  {
    id: 3,
    uldNumber: "AKE23456DXB",
    flight: "EK203",
    tunnelLocation: "Tunnel 1",
    inductionTime: "14:40",
    inductedBy: "Ahmed Hassan",
    status: "Inducted",
  },
  {
    id: 4,
    uldNumber: "PMC78901DXB",
    flight: "EK412",
    tunnelLocation: null,
    inductionTime: null,
    inductedBy: null,
    status: "Pending",
  },
]

export default function ULDStatusTrackingScreen() {
  const [activeTab, setActiveTab] = useState<"drop" | "induction" | "reconciliation">("drop")

  const getSLAColor = (status: string) => {
    switch (status) {
      case "On Time":
        return "bg-green-100 text-green-800 border-green-200"
      case "Delayed":
        return "bg-red-100 text-red-800 border-red-200"
      case "Pending":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    return status === "Inducted"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-gray-100 text-gray-800 border-gray-200"
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">ULD Status Tracking</h1>
            <p className="text-sm text-gray-500">Drop, induction & reconciliation</p>
          </div>
          <button className="flex items-center gap-1.5 bg-[#D71A21] text-white px-3 py-1.5 rounded hover:bg-[#B01519] transition-colors text-sm font-medium">
            <Download className="w-4 h-4" />
            <span>Report</span>
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 flex">
        <button
          onClick={() => setActiveTab("drop")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "drop"
              ? "text-[#D71A21] border-b-2 border-[#D71A21] bg-red-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Drop Status
        </button>
        <button
          onClick={() => setActiveTab("induction")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "induction"
              ? "text-[#D71A21] border-b-2 border-[#D71A21] bg-red-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Induction
        </button>
        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "reconciliation"
              ? "text-[#D71A21] border-b-2 border-[#D71A21] bg-red-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Reconciliation
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "drop" && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">ULD</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Flight</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Location</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Drop</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Received</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Partner</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">SLA</th>
              </tr>
            </thead>
            <tbody>
              {HARDCODED_DROP_STATUS.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-900">{item.uldNumber}</td>
                  <td className="px-3 py-2 text-gray-700">{item.flight}</td>
                  <td className="px-3 py-2 text-gray-600">{item.location}</td>
                  <td className="px-3 py-2 text-gray-600">{item.dropTime}</td>
                  <td className="px-3 py-2 text-gray-600">{item.receivedTime || "Pending"}</td>
                  <td className="px-3 py-2 text-gray-600">{item.logisticsPartner}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium border ${getSLAColor(item.slaStatus)}`}
                    >
                      {item.slaStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "induction" && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">ULD</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Flight</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Tunnel</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Time</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">By</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {HARDCODED_INDUCTION_STATUS.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-900">{item.uldNumber}</td>
                  <td className="px-3 py-2 text-gray-700">{item.flight}</td>
                  <td className="px-3 py-2 text-gray-600">{item.tunnelLocation || "N/A"}</td>
                  <td className="px-3 py-2 text-gray-600">{item.inductionTime || "Pending"}</td>
                  <td className="px-3 py-2 text-gray-600">{item.inductedBy || "N/A"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getStatusColor(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "reconciliation" && (
          <div className="p-4">
            <div className="flex items-center gap-4 text-sm mb-3">
              <div>
                <span className="text-gray-600">Expected: </span>
                <span className="font-semibold text-gray-900">4</span>
              </div>
              <div>
                <span className="text-gray-600">Received: </span>
                <span className="font-semibold text-gray-900">3</span>
              </div>
              <div>
                <span className="text-gray-600">Inducted: </span>
                <span className="font-semibold text-gray-900">3</span>
              </div>
              <div>
                <span className="text-red-600">Missing: </span>
                <span className="font-semibold text-red-600">1</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
