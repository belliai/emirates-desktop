"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Package, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"

const HARDCODED_BDN_DATA = {
  areas: [
    {
      id: 1,
      name: "BDN",
      total: 45,
      completed: 32,
      inProgress: 8,
      pending: 5,
      modules: [
        { name: "Module 1", total: 15, completed: 12, inProgress: 2, pending: 1 },
        { name: "Module 2", total: 18, completed: 13, inProgress: 3, pending: 2 },
        { name: "Module 3", total: 12, completed: 7, inProgress: 3, pending: 2 },
      ],
    },
    {
      id: 2,
      name: "EKP",
      total: 28,
      completed: 22,
      inProgress: 4,
      pending: 2,
      modules: [
        { name: "Module 1", total: 14, completed: 11, inProgress: 2, pending: 1 },
        { name: "Module 2", total: 14, completed: 11, inProgress: 2, pending: 1 },
      ],
    },
    {
      id: 3,
      name: "Mail",
      total: 18,
      completed: 15,
      inProgress: 2,
      pending: 1,
      modules: [{ name: "Module 1", total: 18, completed: 15, inProgress: 2, pending: 1 }],
    },
  ],
}

export default function BDNDashboardScreen() {
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set([1, 2, 3]))

  const totalULDs = HARDCODED_BDN_DATA.areas.reduce((sum, area) => sum + area.total, 0)
  const totalCompleted = HARDCODED_BDN_DATA.areas.reduce((sum, area) => sum + area.completed, 0)
  const totalInProgress = HARDCODED_BDN_DATA.areas.reduce((sum, area) => sum + area.inProgress, 0)
  const totalPending = HARDCODED_BDN_DATA.areas.reduce((sum, area) => sum + area.pending, 0)

  const toggleArea = (areaId: number) => {
    setExpandedAreas((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(areaId)) {
        newSet.delete(areaId)
      } else {
        newSet.add(areaId)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">BDN Process Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Real-time breakdown monitoring and progress tracking</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total ULDs</p>
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalULDs}</p>
            <p className="text-xs text-gray-500 mt-2">All areas combined</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Completed</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalCompleted}</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">
                {Math.round((totalCompleted / totalULDs) * 100)}% complete
              </span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">In Progress</p>
              <Package className="w-5 h-5 text-[#D71A21]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalInProgress}</p>
            <p className="text-xs text-gray-500 mt-2">Currently being processed</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Pending</p>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalPending}</p>
            <p className="text-xs text-gray-500 mt-2">Awaiting breakdown</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Area Breakdown Progress</h3>
          <div className="space-y-2">
            {HARDCODED_BDN_DATA.areas.map((area) => {
              const isExpanded = expandedAreas.has(area.id)
              const completionPercentage = Math.round((area.completed / area.total) * 100)

              return (
                <div key={area.id} className="border border-gray-200 rounded-lg">
                  <div
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                    onClick={() => toggleArea(area.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <div className="flex-1 flex items-center gap-4">
                      <span className="font-semibold text-gray-900 text-sm w-16">{area.name}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-gray-600 h-2 rounded-full" style={{ width: `${completionPercentage}%` }} />
                      </div>
                      <span className="text-sm text-gray-600 w-12">{completionPercentage}%</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total: </span>
                        <span className="font-semibold text-gray-900">{area.total}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Done: </span>
                        <span className="font-semibold text-gray-900">{area.completed}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Active: </span>
                        <span className="font-semibold text-[#D71A21]">{area.inProgress}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Pending: </span>
                        <span className="font-semibold text-red-600">{area.pending}</span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                      <div className="space-y-2">
                        {area.modules.map((module, idx) => {
                          const moduleCompletion = Math.round((module.completed / module.total) * 100)
                          return (
                            <div key={idx} className="ml-7 flex items-center gap-3 text-sm">
                              <span className="text-gray-700 w-20">{module.name}</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-gray-600 h-1.5 rounded-full"
                                  style={{ width: `${moduleCompletion}%` }}
                                />
                              </div>
                              <span className="text-gray-600 w-12">{moduleCompletion}%</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">
                                  {module.completed}/{module.total}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
