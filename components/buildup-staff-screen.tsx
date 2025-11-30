"use client"

import React, { useState } from "react"
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLoadPlans, type LoadPlan } from "@/lib/load-plan-context"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail } from "./load-plan-types"
import { getLoadPlanDetailFromSupabase } from "@/lib/load-plans-supabase"

interface BuildupStaffScreenProps {
  initialStaff?: "david" | "harley"
  onNavigate?: (screen: string, params?: any) => void
}

export default function BuildupStaffScreen({ initialStaff, onNavigate }: BuildupStaffScreenProps = {}) {
  const { loadPlans, getFlightsByStaff } = useLoadPlans()
  const [selectedStaff, setSelectedStaff] = useState<"david" | "harley">(initialStaff || "david")
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  
  // Update selectedStaff if initialStaff prop changes
  React.useEffect(() => {
    if (initialStaff) {
      setSelectedStaff(initialStaff)
    }
  }, [initialStaff])

  const getInitials = (staff: "david" | "harley") => {
    return staff === "david" ? "D" : "H"
  }

  const getName = (staff: "david" | "harley") => {
    return staff === "david" ? "David" : "Harley"
  }

  // Get flights assigned to the selected staff member
  const assignedLoadPlans = getFlightsByStaff(selectedStaff)

  const handleRowClick = async (loadPlan: LoadPlan) => {
    // Try to fetch from Supabase
    try {
      console.log(`[BuildupStaffScreen] Fetching load plan detail from Supabase for ${loadPlan.flight}`)
      const supabaseDetail = await getLoadPlanDetailFromSupabase(loadPlan.flight)
      if (supabaseDetail) {
        console.log(`[BuildupStaffScreen] Successfully loaded detail from Supabase:`, {
          flight: supabaseDetail.flight,
          sectors: supabaseDetail.sectors.length,
          totalItems: supabaseDetail.sectors.reduce((sum, s) => sum + s.uldSections.reduce((sum2, u) => sum2 + u.awbs.length, 0), 0)
        })
        setSelectedLoadPlan(supabaseDetail)
        return
      } else {
        console.log(`[BuildupStaffScreen] No data found in Supabase for ${loadPlan.flight}`)
      }
    } catch (err) {
      console.error("[BuildupStaffScreen] Error fetching load plan detail:", err)
    }

    // Don't show dummy data - just return if no data found
  }

  const handleNavigateToBuildupStaff = (staffName: string) => {
    setSelectedLoadPlan(null)
    if (onNavigate) {
      onNavigate("buildup-staff", { staff: staffName })
    }
  }

  if (selectedLoadPlan) {
    return (
      <LoadPlanDetailScreen
        loadPlan={selectedLoadPlan}
        onBack={() => setSelectedLoadPlan(null)}
        // No onSave - makes it read-only with Handover and Generate BCR buttons
        onNavigateToBuildupStaff={handleNavigateToBuildupStaff}
        enableBulkCheckboxes={true}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header with Staff Name and Icon Bar */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">Build-up Staff</h2>
          <div className="flex items-center gap-3">
            <Select value={selectedStaff} onValueChange={(value: "david" | "harley") => setSelectedStaff(value)}>
              <SelectTrigger className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-[#D71A21] text-white flex items-center justify-center">
                  <span className="text-sm font-semibold">{getInitials(selectedStaff)}</span>
                </div>
                <SelectValue>
                  <span className="text-sm font-medium text-gray-900">{getName(selectedStaff)}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="david">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#D71A21] text-white flex items-center justify-center">
                      <span className="text-xs font-semibold">D</span>
                    </div>
                    <span>David</span>
                  </div>
                </SelectItem>
                <SelectItem value="harley">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#D71A21] text-white flex items-center justify-center">
                      <span className="text-xs font-semibold">H</span>
                    </div>
                    <span>Harley</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mx-2 rounded-lg border border-gray-200 overflow-x-auto">
          <div className="bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-[#D71A21] text-white">
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Flight</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Date</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ACFT TYPE</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ACFT REG</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">PAX</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">STD</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">TTL PLN ULD</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ULD Version</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {assignedLoadPlans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-center text-gray-500 text-sm">
                      No load plans assigned to {getName(selectedStaff)}
                    </td>
                  </tr>
                ) : (
                  assignedLoadPlans.map((loadPlan, index) => (
                    <LoadPlanRow key={index} loadPlan={loadPlan} onClick={handleRowClick} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

interface LoadPlanRowProps {
  loadPlan: LoadPlan
  onClick: (loadPlan: LoadPlan) => void
}

function LoadPlanRow({ loadPlan, onClick }: LoadPlanRowProps) {
  return (
    <tr
      onClick={() => onClick(loadPlan)}
      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
        {loadPlan.flight}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.date}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.acftType}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.acftReg}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.pax}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.std}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.ttlPlnUld}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.uldVersion}</td>
      <td className="px-2 py-1 w-10">
        <ChevronRight className="h-4 w-4 text-gray-600 hover:text-[#D71A21]" />
      </td>
    </tr>
  )
}

