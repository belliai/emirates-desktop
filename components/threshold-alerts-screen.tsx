"use client"

import { useState } from "react"
import { Bell, AlertTriangle, AlertCircle, Settings } from "lucide-react"

const HARDCODED_ALERTS = [
  {
    id: 1,
    type: "Load vs Manpower",
    message: "BDN area load exceeds available manpower by 25%",
    currentValue: 45,
    thresholdValue: 36,
    area: "BDN",
    priority: "High",
    status: "Active",
    triggeredAt: "13:45",
  },
  {
    id: 2,
    type: "Equipment Shortage",
    message: "LSP availability below threshold in Module 2",
    currentValue: 3,
    thresholdValue: 5,
    area: "EKP",
    priority: "Medium",
    status: "Active",
    triggeredAt: "14:20",
  },
  {
    id: 3,
    type: "SLA Breach Risk",
    message: "3 ULDs approaching SLA deadline",
    currentValue: 3,
    thresholdValue: 0,
    area: "All",
    priority: "High",
    status: "Active",
    triggeredAt: "14:35",
  },
  {
    id: 4,
    type: "Connection Risk",
    message: "Flight EK524 at risk of missing connection",
    currentValue: 1,
    thresholdValue: 0,
    area: "BDN",
    priority: "Critical",
    status: "Active",
    triggeredAt: "14:50",
  },
]

export default function ThresholdAlertsScreen() {
  const [activeTab, setActiveTab] = useState<"active" | "config">("active")

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "bg-red-600 text-white"
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "Critical":
      case "High":
        return <AlertTriangle className="w-5 h-5" />
      case "Medium":
        return <AlertCircle className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const criticalCount = HARDCODED_ALERTS.filter((a) => a.priority === "Critical").length
  const highCount = HARDCODED_ALERTS.filter((a) => a.priority === "High").length
  const mediumCount = HARDCODED_ALERTS.filter((a) => a.priority === "Medium").length

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Threshold Alerts</h1>
          <p className="text-sm text-gray-600 mt-1">Monitor and configure resource capacity alerts</p>
        </div>

        {/* Alert Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-red-50 rounded-lg border-2 border-red-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Critical Alerts</p>
                <p className="text-3xl font-bold text-red-900 mt-1">{criticalCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">High Priority</p>
                <p className="text-3xl font-bold text-red-900 mt-1">{highCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">Medium Priority</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{mediumCount}</p>
              </div>
              <Bell className="w-8 h-8 text-gray-600" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">All Alerts</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{HARDCODED_ALERTS.length}</p>
              </div>
              <Bell className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "active"
                  ? "text-[#D71A21] border-b-2 border-[#D71A21] bg-red-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Active Alerts
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "config"
                  ? "text-[#D71A21] border-b-2 border-[#D71A21] bg-red-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Configuration
            </button>
          </div>

          <div className="p-4">
            {activeTab === "active" && (
              <div className="space-y-3">
                {HARDCODED_ALERTS.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border-2 p-4 ${
                      alert.priority === "Critical"
                        ? "bg-red-50 border-red-200"
                        : alert.priority === "High"
                          ? "bg-red-50 border-red-200"
                          : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`p-2 rounded-lg ${
                            alert.priority === "Critical"
                              ? "bg-red-100"
                              : alert.priority === "High"
                                ? "bg-red-100"
                                : "bg-gray-100"
                          }`}
                        >
                          {getPriorityIcon(alert.priority)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{alert.type}</h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                alert.priority === "Critical" ? getPriorityColor(alert.priority) : ""
                              }`}
                            >
                              {alert.priority === "Critical" && alert.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>Area: {alert.area}</span>
                            <span>
                              Current: <span className="font-semibold">{alert.currentValue}</span>
                            </span>
                            <span>
                              Threshold: <span className="font-semibold">{alert.thresholdValue}</span>
                            </span>
                            <span>Triggered: {alert.triggeredAt}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                          View Details
                        </button>
                        <button className="px-3 py-1.5 bg-[#D71A21] text-white rounded-lg text-xs font-medium hover:bg-[#B01519] transition-colors">
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "config" && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Alert Configuration</h3>
                    <Settings className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="space-y-4">
                    {["Load vs Manpower", "Equipment Shortage", "SLA Breach Risk", "Connection Risk"].map(
                      (alertType, idx) => (
                        <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">{alertType}</h4>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" defaultChecked />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D71A21]"></div>
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Threshold Value</label>
                              <input
                                type="number"
                                defaultValue={idx === 0 ? 36 : idx === 1 ? 5 : 0}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21] text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21] text-sm">
                                <option>High</option>
                                <option>Medium</option>
                                <option>Low</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  <button className="mt-4 w-full bg-[#D71A21] text-white px-4 py-2 rounded-lg hover:bg-[#B01519] transition-colors text-sm font-medium">
                    Save Configuration
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
