"use client"

import { useState } from "react"
import { TrendingUp, Package, Users, AlertCircle } from "lucide-react"

const HARDCODED_FORECAST_DATA = {
  next3Hours: { ulds: 28, shipments: 156, weight: 12500, peakTime: "16:30" },
  next6Hours: { ulds: 52, shipments: 289, weight: 23400, peakTime: "18:45" },
  next12Hours: { ulds: 98, shipments: 534, weight: 45600, peakTime: "22:15" },
  next24Hours: { ulds: 187, shipments: 1023, weight: 87300, peakTime: "14:30 (Tomorrow)" },
}

const HOURLY_FORECAST = [
  { hour: "14:00", ulds: 8, type: "GCR" },
  { hour: "15:00", ulds: 12, type: "PER" },
  { hour: "16:00", ulds: 15, type: "GCR" },
  { hour: "17:00", ulds: 18, type: "Mail" },
  { hour: "18:00", ulds: 22, type: "GCR" },
  { hour: "19:00", ulds: 16, type: "FFN" },
  { hour: "20:00", ulds: 14, type: "GCR" },
  { hour: "21:00", ulds: 11, type: "PER" },
]

export default function WorkloadForecastScreen() {
  const [selectedHorizon, setSelectedHorizon] = useState<"3" | "6" | "12" | "24">("6")

  const currentForecast =
    selectedHorizon === "3"
      ? HARDCODED_FORECAST_DATA.next3Hours
      : selectedHorizon === "6"
        ? HARDCODED_FORECAST_DATA.next6Hours
        : selectedHorizon === "12"
          ? HARDCODED_FORECAST_DATA.next12Hours
          : HARDCODED_FORECAST_DATA.next24Hours

  const maxUlds = Math.max(...HOURLY_FORECAST.map((h) => h.ulds))

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">Workload Forecasting</h1>
          <p className="text-sm text-gray-600 mt-1">Predicted cargo load and capacity planning</p>
        </div>

        {/* Time Horizon Selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Forecast Horizon:</span>
            <div className="flex gap-2">
              {(["3", "6", "12", "24"] as const).map((hours) => (
                <button
                  key={hours}
                  onClick={() => setSelectedHorizon(hours)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedHorizon === hours
                      ? "bg-[#D71A21] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Next {hours} Hours
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Forecast Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Expected ULDs</p>
              <Package className="w-5 h-5 text-[#D71A21]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{currentForecast.ulds}</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">+12% from avg</span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Expected Shipments</p>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{currentForecast.shipments}</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">+8% from avg</span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Weight (kg)</p>
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{currentForecast.weight.toLocaleString()}</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">+15% from avg</span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Peak Time</p>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{currentForecast.peakTime}</p>
            <p className="text-xs text-gray-600 mt-2">Highest expected load</p>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">Hourly Forecast Timeline</h3>
          <div className="space-y-3">
            {HOURLY_FORECAST.map((item, idx) => {
              const percentage = (item.ulds / maxUlds) * 100
              return (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium text-gray-700">{item.hour}</div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-8 relative">
                      <div
                        className="bg-[#D71A21] h-8 rounded-full flex items-center justify-between px-3 transition-all"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-white text-sm font-semibold">{item.ulds} ULDs</span>
                        <span className="text-white text-xs">{item.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Capacity Comparison */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Capacity vs Demand</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Current Staffing Capacity</span>
                <span className="text-sm font-semibold text-gray-900">60 ULDs/hour</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-600 h-3 rounded-full" style={{ width: "75%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Expected Peak Load</span>
                <span className="text-sm font-semibold text-gray-900">22 ULDs/hour</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-[#D71A21] h-3 rounded-full" style={{ width: "37%" }} />
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">Current staffing is adequate for forecasted load</p>
              </div>
              <p className="text-xs text-green-700 mt-1">Capacity surplus: 38 ULDs/hour</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
