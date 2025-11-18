"use client"

import { Home, List, Package, BarChart3, FileText, Bell, Users } from "lucide-react"

interface NavigationProps {
  currentScreen: string
  onNavigate: (screen: string) => void
}

export default function Navigation({ currentScreen, onNavigate }: NavigationProps) {
  const navItems = [
    { id: "desktop", label: "Dashboard", icon: Home },
    { id: "distribution", label: "Distribution Lists", icon: List },
    { id: "non-preannounced", label: "Non-Preannounced", icon: Package },
    { id: "dwc-steering", label: "DWC Steering", icon: BarChart3 },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "staff", label: "Staff", icon: Users },
  ]

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentScreen === item.id

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive ? "bg-[#D71A21] text-white" : "text-gray-700 hover:bg-gray-100 hover:text-[#D71A21]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
