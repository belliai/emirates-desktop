"use client"

import { useState } from "react"
import { ArrowLeft, ChevronsLeft, ChevronsRight, Users, Search, ChevronDown, ChevronRight } from "lucide-react"
import Image from "next/image"

interface SettingsSidebarProps {
  currentScreen: string
  onNavigate: (screen: string) => void
  onBackToDashboard: () => void
}

interface SettingsItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export default function SettingsSidebar({ currentScreen, onNavigate, onBackToDashboard }: SettingsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const settingsItems: SettingsItem[] = [
    { id: "settings-buildup-staff", label: "Build-up Staff List", icon: Users },
    { id: "settings-screening", label: "Screening", icon: Search },
  ]

  return (
    <div
      className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Header with Back Button */}
      <div className="px-3 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 text-gray-700 hover:text-[#D71A21] transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Back to Dashboard</span>}
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronsRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronsLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Settings Header */}
      <div className="px-3 py-3 border-b border-gray-200">
        {!isCollapsed && <h2 className="text-base font-semibold text-gray-900">Settings</h2>}
      </div>

      {/* Settings Navigation Items */}
      <div className="flex-1 overflow-y-auto py-2">
        {settingsItems.map((item) => {
          const ItemIcon = item.icon
          const isActive = currentScreen === item.id

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "text-[#D71A21] bg-red-50 border-l-2 border-[#D71A21] font-medium"
                  : "text-gray-700 hover:bg-gray-50 hover:text-[#D71A21]"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <ItemIcon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

