"use client"

import React, { useState, useEffect, useMemo } from "react"
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Check, ChevronsUpDown } from "lucide-react"
import { useLoadPlans, type LoadPlan } from "@/lib/load-plan-context"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail } from "./load-plan-types"
import { getLoadPlanDetailFromSupabase } from "@/lib/load-plans-supabase"
import { getOperators, parseStaffName, type BuildupStaff } from "@/lib/buildup-staff"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface BuildupStaffScreenProps {
  initialStaff?: string
  onNavigate?: (screen: string, params?: any) => void
}

export default function BuildupStaffScreen({ initialStaff, onNavigate }: BuildupStaffScreenProps = {}) {
  const { loadPlans, getFlightsByStaff } = useLoadPlans()
  const [operators, setOperators] = useState<BuildupStaff[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaff || "")
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false)
  const [staffSearch, setStaffSearch] = useState("")
  
  // Fetch operators from Supabase on mount
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const operatorsData = await getOperators()
        setOperators(operatorsData)
        
        // Set default operator if available and none selected
        if (operatorsData.length > 0 && !selectedStaffId) {
          setSelectedStaffId(operatorsData[0].staff_no.toString())
        }
      } catch (error) {
        console.error("[BuildupStaffScreen] Error fetching operators:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchOperators()
  }, [])

  // Update selectedStaffId if initialStaff prop changes
  useEffect(() => {
    if (initialStaff) {
      setSelectedStaffId(initialStaff)
    }
  }, [initialStaff])

  // Parse all operators into options with display names
  const operatorOptions = useMemo(() => {
    return operators.map(op => {
      const parsed = parseStaffName(op.name)
      return {
        staff_no: op.staff_no,
        displayName: parsed.displayName,
        fullName: parsed.fullName,
        searchName: parsed.searchName
      }
    })
  }, [operators])

  // Filter operators based on search
  const filteredOperators = useMemo(() => {
    if (!staffSearch) return operatorOptions
    const search = staffSearch.toLowerCase()
    return operatorOptions.filter(op => 
      op.searchName.includes(search) || 
      op.displayName.toLowerCase().includes(search)
    )
  }, [operatorOptions, staffSearch])

  // Get currently selected operator details
  const currentOperator = useMemo(() => {
    return operatorOptions.find(op => op.staff_no.toString() === selectedStaffId)
  }, [operatorOptions, selectedStaffId])

  // Get display name for the selected operator
  const getDisplayName = () => {
    if (currentOperator) {
      return currentOperator.displayName
    }
    return "Select staff"
  }

  // Get initials for the selected operator
  const getInitials = () => {
    const displayName = getDisplayName()
    return displayName.charAt(0).toUpperCase() || "S"
  }

  // Get flights assigned to the selected staff member
  const assignedLoadPlans = getFlightsByStaff(getDisplayName().toLowerCase())

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
        {/* Header with Staff Name and Searchable Dropdown */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">Build-up Staff</h2>
          <div className="flex items-center gap-3">
            <Popover 
              open={staffDropdownOpen} 
              onOpenChange={(open) => {
                setStaffDropdownOpen(open)
                if (!open) setStaffSearch("")
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={staffDropdownOpen}
                  className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg w-auto min-w-[200px] h-auto justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#D71A21] text-white flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">{getInitials()}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900" title={currentOperator?.fullName}>
                      {getDisplayName()}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="end">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search staff..."
                    value={staffSearch}
                    onValueChange={setStaffSearch}
                  />
                  <CommandList>
                    {isLoading ? (
                      <CommandEmpty>Loading operators...</CommandEmpty>
                    ) : filteredOperators.length === 0 ? (
                      <CommandEmpty>No operator found.</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {filteredOperators.map((op) => (
                          <CommandItem
                            key={op.staff_no}
                            value={op.staff_no.toString()}
                            onSelect={() => {
                              setSelectedStaffId(op.staff_no.toString())
                              setStaffDropdownOpen(false)
                              setStaffSearch("")
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedStaffId === op.staff_no.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="w-6 h-6 rounded-full bg-[#D71A21] text-white flex items-center justify-center flex-shrink-0 mr-2">
                              <span className="text-xs font-semibold">
                                {op.displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span title={op.fullName}>{op.displayName}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
                      No load plans assigned to {getDisplayName()}
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

