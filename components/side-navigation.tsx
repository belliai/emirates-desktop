"use client"

import type React from "react"

import { useState } from "react"
import { Home, List, BarChart3, FileText, Bell, Users, ChevronDown, ChevronRight, Settings, ChevronsLeft, ChevronsRight, TrendingUp, AlertTriangle, ClipboardList, Clipboard, Plane, LayoutDashboard, Activity, Package, Upload, Download, Search } from 'lucide-react'
import Image from "next/image"

interface SideNavigationProps {
  currentScreen: string
  onNavigate: (screen: string) => void
  onSettingsClick?: () => void
}

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
  defaultOpen?: boolean
}

export default function SideNavigation({ currentScreen, onNavigate, onSettingsClick }: SideNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["data-tables", "operations", "reports"]), // All sections open by default
  )

  const navSections: NavSection[] = [
    {
      id: "data-tables",
      label: "Data Tables",
      icon: FileText,
      defaultOpen: true,
      items: [
        { id: "flights-view", label: "Flights View", icon: Plane },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      icon: Activity,
      defaultOpen: true,
      items: [
        { id: "load-plans", label: "Upload Load Plans", icon: Upload },
        { id: "lists", label: "Export Lists", icon: Download },
        { id: "qrt-list", label: "QRT List", icon: Download },
        { id: "allocations", label: "Flight Assignment", icon: Clipboard },
        { id: "buildup-staff", label: "Build-up Staff", icon: Users },
        { id: "screening", label: "Screening", icon: Search },
        { id: "incoming-workload", label: "Incoming Workload", icon: TrendingUp },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
      defaultOpen: true,
      items: [
        { id: "staff", label: "Staff Performance", icon: Users },
        { id: "bcr", label: "BCRs", icon: FileText },
        { id: "shift-summary-report", label: "Shift Summary Report", icon: FileText },
        { id: "bdn-dashboard", label: "Workload Visibility", icon: ClipboardList },
        { id: "situational-awareness", label: "Situational Awareness", icon: Activity },
      ],
    },
  ]

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  return (
    <div
      className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="px-3 py-3 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vAiqNG5lNGkFk5MkayL9DiMFZAV17N.png"
            alt="Emirates SkyCargo"
            width={80}
            height={80}
            className="w-20 h-auto"
          />
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors ml-auto"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronsRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronsLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-2">
        {navSections.map((section) => {
          const SectionIcon = section.icon
          const isExpanded = expandedSections.has(section.id)

          return (
            <div key={section.id} className="mb-1">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                title={isCollapsed ? section.label : undefined}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <SectionIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm font-medium truncate">{section.label}</span>}
                </div>
                {!isCollapsed &&
                  (isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ))}
              </button>

              {isExpanded && !isCollapsed && (
                <div className="ml-6">
                  {section.items.map((item) => {
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
                      >
                        <ItemIcon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-200 py-2">
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#D71A21] transition-colors"
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </div>
  )
}
