"use client"

import { Search } from "lucide-react"

export default function SettingsScreening() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Screening Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure screening parameters and rules</p>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
            <p className="text-sm text-gray-500 max-w-md">
              Screening settings configuration will be available here. This section is currently under development.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

