"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { Plane, Clock, MapPin, Users, FileText, Check, ChevronsUpDown, Plus, Search, SlidersHorizontal, Settings2, ArrowUpDown, X } from "lucide-react"
import { useLoadPlans, type ShiftType, type PeriodType, type WaveType } from "@/lib/load-plan-context"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getSupervisors, getOperators, parseStaffName, parseStaffDisplayName, type BuildupStaff } from "@/lib/buildup-staff"
import { NotificationBadge } from "./notification-badge"
import { useNotifications } from "@/lib/notification-context"
import { useToast } from "@/hooks/use-toast"

type FlightAssignment = {
  flight: string
  std: string
  originDestination: string
  name: string
  sector: string
}

// Parse STD time (e.g., "02:50", "09:35") to hours
function parseStdToHours(std: string): number {
  const [hours, minutes] = std.split(":").map(Number)
  return hours + (minutes || 0) / 60
}

// Determine period and wave based on ETD/STD time
function determinePeriodAndWave(etd: string): { period: PeriodType; wave: WaveType | null; shiftType: ShiftType } {
  const [hours, minutes] = etd.split(":").map(Number)
  const timeInMinutes = hours * 60 + (minutes || 0)
  
  // Night Shift Early Morning: 00:01-05:59
  if (timeInMinutes >= 1 && timeInMinutes < 360) {
    return { period: "early-morning", wave: null, shiftType: "night" }
  }
  // Night Shift Late Morning First Wave: 06:00-09:00
  if (timeInMinutes >= 360 && timeInMinutes <= 540) {
    return { period: "late-morning", wave: "first-wave", shiftType: "night" }
  }
  // Night Shift Late Morning Second Wave: 09:01-12:59
  if (timeInMinutes > 540 && timeInMinutes < 780) {
    return { period: "late-morning", wave: "second-wave", shiftType: "night" }
  }
  // Day Shift Afternoon First Wave: 13:00-15:59
  if (timeInMinutes >= 780 && timeInMinutes < 960) {
    return { period: "afternoon", wave: "first-wave", shiftType: "day" }
  }
  // Day Shift Afternoon Second Wave: 16:00-23:59
  if (timeInMinutes >= 960 && timeInMinutes <= 1439) {
    return { period: "afternoon", wave: "second-wave", shiftType: "day" }
  }
  // Default to early morning for edge cases
  return { period: "early-morning", wave: null, shiftType: "night" }
}

// Extract flight number from flight string (e.g., "EK0205" -> 205)
function extractFlightNumber(flight: string): number {
  const match = flight.match(/EK0?(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

// Get region category based on flight number ranges
// 1-199 → EU/UK
// 200-299 → US
// 300-499 → FE/AUS (Far East/Australia)
// 500-699 → ISUB (Indian Subcontinent)
// 700-799 → Africa
// 800+ → M/East (Middle East)
function getFlightRegion(flight: string): { category: string; color: string } {
  const flightNum = extractFlightNumber(flight)
  
  if (flightNum >= 1 && flightNum <= 199) {
    return { category: "EU/UK", color: "bg-blue-200" }
  }
  if (flightNum >= 200 && flightNum <= 299) {
    return { category: "US", color: "bg-pink-200" }
  }
  if (flightNum >= 300 && flightNum <= 499) {
    return { category: "FE/AUS", color: "bg-cyan-200" }
  }
  if (flightNum >= 500 && flightNum <= 699) {
    return { category: "ISUB", color: "bg-purple-200" }
  }
  if (flightNum >= 700 && flightNum <= 799) {
    return { category: "Africa", color: "bg-green-200" }
  }
  
  // 800+ defaults to M/East
  return { category: "M/East", color: "bg-yellow-200" }
}

// Color coding based on flight number - only for origin destination cell
const getOriginDestinationColor = (flight: string, name: string, sector: string): string => {
  // If both name and sector are filled, return white (no color)
  if (name && sector) {
    return "bg-white"
  }

  return getFlightRegion(flight).color
}

const getDestinationCategory = (flight: string): { category: string; color: string } => {
  return getFlightRegion(flight)
}

interface FlightAssignmentScreenProps {
  initialSupervisor?: string
}

export default function FlightAssignmentScreen({ initialSupervisor }: FlightAssignmentScreenProps = {}) {
  const { loadPlans, flightAssignments: contextAssignments, bupAllocations, updateFlightAssignment, updateFlightAssignmentSector } = useLoadPlans()
  const [isLoading, setIsLoading] = useState(true)
  const [supervisors, setSupervisors] = useState<BuildupStaff[]>([])
  const [operators, setOperators] = useState<BuildupStaff[]>([])
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(initialSupervisor || "")
  const [supervisorDropdownOpen, setSupervisorDropdownOpen] = useState(false)
  const [supervisorSearch, setSupervisorSearch] = useState("")
  const { getNotificationsForStaff } = useNotifications()
  const { toast } = useToast()
  const shownNotificationIdsRef = React.useRef<Set<string>>(new Set())
  const [showAddFilterDropdown, setShowAddFilterDropdown] = useState(false)
  const [showViewOptions, setShowViewOptions] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [shiftFilter, setShiftFilter] = useState<ShiftType>("current")
  const [periodFilter, setPeriodFilter] = useState<PeriodType>("all")
  const [waveFilter, setWaveFilter] = useState<WaveType>("all")
  const addFilterRef = useRef<HTMLDivElement>(null)
  const viewOptionsRef = useRef<HTMLDivElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const savedScrollPositionRef = useRef<number | null>(null)

  // Create a set of flight numbers that have actual uploaded load plans
  const loadPlanFlights = useMemo(() => {
    return new Set(loadPlans.map(plan => plan.flight))
  }, [loadPlans])

  // Create a map of flight number to routing from BUP allocations
  const bupRoutingMap = useMemo(() => {
    const map = new Map<string, string>()
    bupAllocations.forEach((alloc) => {
      const flightKey = `EK${alloc.flightNo}`
      if (alloc.routing) {
        // Parse routing - could be "DXB-MXP", "DXBMXP", or just "MXP"
        let originDestination = ""
        if (alloc.routing.includes("-")) {
          originDestination = alloc.routing
        } else if (/^[A-Z]{6}$/.test(alloc.routing)) {
          originDestination = `${alloc.routing.slice(0, 3)}-${alloc.routing.slice(3, 6)}`
        } else if (/^[A-Z]{3}$/.test(alloc.routing)) {
          originDestination = `DXB-${alloc.routing}`
        } else {
          originDestination = alloc.routing
        }
        map.set(flightKey, originDestination)
      }
    })
    return map
  }, [bupAllocations])

  // Helper to parse origin-destination from pax field
  const parseOriginDestination = (pax: string | undefined): string => {
    if (!pax) return ""
    
    if (pax.includes("/")) {
      const parts = pax.split("/").filter((part) => /^[A-Z]{3}$/.test(part))
      const origin = parts[0] || "DXB"
      const destination = parts[1] || ""
      return destination ? `${origin}-${destination}` : ""
    } else if (/^[A-Z]{6}$/.test(pax)) {
      return `${pax.slice(0, 3)}-${pax.slice(3, 6)}`
    }
    return ""
  }

  // Create flight assignments from load plans and merge with context assignments
  const flightAssignments = useMemo(() => {
    // Start with assignments from context (which may have name/sector already set)
    const assignmentsMap = new Map<string, FlightAssignment>()
    
    // First, add all context assignments
    contextAssignments.forEach((fa) => {
      // If origin-destination looks like default, try to get from BUP allocation
      let originDestination = fa.originDestination
      if (!originDestination || originDestination === "DXB-???" || originDestination === "DXB-JFK") {
        originDestination = bupRoutingMap.get(fa.flight) || fa.originDestination
      }
      assignmentsMap.set(fa.flight, { ...fa, originDestination })
    })
    
    // Then, create assignments from load plans for flights not in context
    loadPlans.forEach((plan) => {
      if (!assignmentsMap.has(plan.flight)) {
        // Try to get routing from BUP allocation first, then parse from pax
        let originDestination = bupRoutingMap.get(plan.flight) || parseOriginDestination(plan.pax)
        if (!originDestination) {
          originDestination = "DXB-???"
        }
        
        assignmentsMap.set(plan.flight, {
          flight: plan.flight,
          std: plan.std,
          originDestination,
          name: "",
          sector: plan.acftType || "",
        })
      }
    })

    // Also add flights from BUP allocations that aren't in load plans or context
    bupAllocations.forEach((alloc) => {
      const flightKey = `EK${alloc.flightNo}`
      if (!assignmentsMap.has(flightKey)) {
        const originDestination = bupRoutingMap.get(flightKey) || "DXB-???"
        assignmentsMap.set(flightKey, {
          flight: flightKey,
          std: alloc.etd,
          originDestination,
          name: "",
          sector: alloc.acType || "",
        })
      }
    })
    
    return Array.from(assignmentsMap.values())
  }, [loadPlans, contextAssignments, loadPlanFlights, bupAllocations, bupRoutingMap])

  // Filter and sort flight assignments
  const filteredAssignments = useMemo(() => {
    let filtered = [...flightAssignments]

    // Filter by shift type
    if (shiftFilter === "current") {
      // Show all flights (no shift filter)
    } else if (shiftFilter === "night") {
      filtered = filtered.filter((a) => {
        const { shiftType } = determinePeriodAndWave(a.std)
        return shiftType === "night"
      })
    } else if (shiftFilter === "day") {
      filtered = filtered.filter((a) => {
        const { shiftType } = determinePeriodAndWave(a.std)
        return shiftType === "day"
      })
    }

    // Filter by period
    if (periodFilter !== "all") {
      filtered = filtered.filter((a) => {
        const { period } = determinePeriodAndWave(a.std)
        return period === periodFilter
      })
    }

    // Filter by wave (only applies to late-morning and afternoon periods)
    if (periodFilter === "early-morning" && waveFilter !== "all") {
      // Early morning doesn't have waves, so don't filter by wave
    } else if (waveFilter !== "all") {
      filtered = filtered.filter((a) => {
        const { period, wave } = determinePeriodAndWave(a.std)
        if (period === "late-morning" || period === "afternoon") {
          return wave === waveFilter
        }
        return true // Early morning doesn't have waves
      })
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((a) => 
        a.flight.toLowerCase().includes(query) ||
        a.originDestination.toLowerCase().includes(query) ||
        a.name?.toLowerCase().includes(query) ||
        a.sector?.toLowerCase().includes(query)
      )
    }

    // Sort: Unassigned flights first (by STD descending), then assigned flights at bottom (by STD descending)
    // A flight is "assigned" when both name AND sector are filled
    return filtered.sort((a, b) => {
      const aIsAssigned = !!(a.name && a.sector)
      const bIsAssigned = !!(b.name && b.sector)
      
      // Assigned flights go to the bottom
      if (aIsAssigned !== bIsAssigned) {
        return aIsAssigned ? 1 : -1
      }
      
      // Within the same group, sort by STD descending (most recent first)
      const hoursA = parseStdToHours(a.std)
      const hoursB = parseStdToHours(b.std)
      return hoursB - hoursA
    })
  }, [flightAssignments, shiftFilter, periodFilter, waveFilter, searchQuery])

  // Determine if wave filter should be shown
  const showWaveFilter = periodFilter === "late-morning" || periodFilter === "afternoon"

  // Fetch staff data from Supabase on mount
  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        const [supervisorsData, operatorsData] = await Promise.all([
          getSupervisors(),
          getOperators()
        ])
        setSupervisors(supervisorsData)
        setOperators(operatorsData)
        
        // Set supervisor: use initialSupervisor if provided, otherwise prefer "roosevelt", then first available
        if (supervisorsData.length > 0) {
          if (initialSupervisor) {
            // Check if initialSupervisor is a valid staff_no
            const supervisorByStaffNo = supervisorsData.find(sup => sup.staff_no.toString() === initialSupervisor)
            if (supervisorByStaffNo) {
              setSelectedSupervisorId(initialSupervisor)
            } else {
              // Fallback to default if initialSupervisor not found
              const rooseveltSupervisor = supervisorsData.find(sup => {
                const parsed = parseStaffName(sup.name)
                return parsed.displayName.toLowerCase() === "roosevelt"
              })
              const defaultSupervisor = rooseveltSupervisor || supervisorsData[0]
              setSelectedSupervisorId(defaultSupervisor.staff_no.toString())
            }
          } else {
            // No initialSupervisor provided, use default
            const rooseveltSupervisor = supervisorsData.find(sup => {
              const parsed = parseStaffName(sup.name)
              return parsed.displayName.toLowerCase() === "roosevelt"
            })
            const defaultSupervisor = rooseveltSupervisor || supervisorsData[0]
            setSelectedSupervisorId(defaultSupervisor.staff_no.toString())
          }
        }
      } catch (error) {
        console.error("[FlightAssignment] Error fetching staff data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStaffData()
  }, [initialSupervisor])
  
  // Update selectedSupervisorId if initialSupervisor prop changes
  useEffect(() => {
    if (initialSupervisor) {
      setSelectedSupervisorId(initialSupervisor)
    }
  }, [initialSupervisor])

  // Show notifications when screen opens or supervisor selection changes
  useEffect(() => {
    if (selectedSupervisorId) {
      const notifications = getNotificationsForStaff(selectedSupervisorId)
      const unreadNotifications = notifications.filter(
        (notif) => !notif.read && !shownNotificationIdsRef.current.has(notif.id)
      )

      // Show unread notifications as toasts
      unreadNotifications.forEach((notif) => {
        toast({
          title: notif.title,
          description: notif.message,
          duration: 5000,
        })
        shownNotificationIdsRef.current.add(notif.id)
      })
    }
  }, [selectedSupervisorId, getNotificationsForStaff, toast])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addFilterRef.current && !addFilterRef.current.contains(event.target as Node)) {
        setShowAddFilterDropdown(false)
      }
      if (viewOptionsRef.current && !viewOptionsRef.current.contains(event.target as Node)) {
        setShowViewOptions(false)
      }
    }

    if (showAddFilterDropdown || showViewOptions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showAddFilterDropdown, showViewOptions])

  // Get operator name options for the name dropdown
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

  // Get supervisor options with parsed names
  const supervisorOptions = useMemo(() => {
    return supervisors.map(sup => {
      const parsed = parseStaffName(sup.name)
      return {
        staff_no: sup.staff_no,
        displayName: parsed.displayName,
        fullName: parsed.fullName,
        searchName: parsed.searchName
      }
    })
  }, [supervisors])

  // Filter supervisors based on search
  const filteredSupervisors = useMemo(() => {
    if (!supervisorSearch) return supervisorOptions
    const search = supervisorSearch.toLowerCase()
    return supervisorOptions.filter(sup => 
      sup.searchName.includes(search) || 
      sup.displayName.toLowerCase().includes(search)
    )
  }, [supervisorOptions, supervisorSearch])

  // Get currently selected supervisor details
  const currentSupervisor = useMemo(() => {
    return supervisorOptions.find(s => s.staff_no.toString() === selectedSupervisorId)
  }, [supervisorOptions, selectedSupervisorId])

  const handleNameChange = (flight: string, name: string) => {
    // Save scroll position before the update so user view doesn't follow assigned flight
    if (tableContainerRef.current) {
      savedScrollPositionRef.current = tableContainerRef.current.scrollTop
    }
    // Update the context so Buildup Staff can filter
    updateFlightAssignment(flight, name)
  }

  const handleSectorChange = (flight: string, sector: string) => {
    // Save scroll position before the update so user view doesn't follow assigned flight
    if (tableContainerRef.current) {
      savedScrollPositionRef.current = tableContainerRef.current.scrollTop
    }
    // Update sector in context assignments
    updateFlightAssignmentSector(flight, sector)
  }

  // Restore scroll position after assignments change (to prevent view from following assigned flight)
  useEffect(() => {
    if (savedScrollPositionRef.current !== null && tableContainerRef.current) {
      tableContainerRef.current.scrollTop = savedScrollPositionRef.current
      savedScrollPositionRef.current = null
    }
  }, [filteredAssignments])

  // Calculate pending flights by category (based on flight number ranges)
  const pendingByCategory: Record<string, { count: number; color: string }> = {}
  filteredAssignments.forEach((assignment) => {
    if (!assignment.name || !assignment.sector) {
      const { category, color } = getDestinationCategory(assignment.flight)
      if (!pendingByCategory[category]) {
        pendingByCategory[category] = { count: 0, color }
      }
      pendingByCategory[category].count++
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header with Searchable Supervisor Dropdown */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">Flight Assignment</h2>
          <div className="flex items-center gap-3">
            {selectedSupervisorId && <NotificationBadge staffNo={selectedSupervisorId} />}
            <Popover 
            open={supervisorDropdownOpen} 
            onOpenChange={(open) => {
              setSupervisorDropdownOpen(open)
              if (!open) setSupervisorSearch("")
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={supervisorDropdownOpen}
                className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg w-auto min-w-[200px] h-auto justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#D71A21] text-white flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold">
                      {currentSupervisor ? currentSupervisor.displayName.charAt(0).toUpperCase() : "S"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900" title={currentSupervisor?.fullName}>
                    {currentSupervisor ? currentSupervisor.displayName : "Select supervisor"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="end">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search supervisor..."
                  value={supervisorSearch}
                  onValueChange={setSupervisorSearch}
                />
                <CommandList>
                  {isLoading ? (
                    <CommandEmpty>Loading supervisors...</CommandEmpty>
                  ) : filteredSupervisors.length === 0 ? (
                    <CommandEmpty>No supervisor found.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filteredSupervisors.map((sup) => (
                        <CommandItem
                          key={sup.staff_no}
                          value={sup.staff_no.toString()}
                          onSelect={() => {
                            setSelectedSupervisorId(sup.staff_no.toString())
                            setSupervisorDropdownOpen(false)
                            setSupervisorSearch("")
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSupervisorId === sup.staff_no.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="w-6 h-6 rounded-full bg-[#D71A21] text-white flex items-center justify-center flex-shrink-0 mr-2">
                            <span className="text-xs font-semibold">
                              {sup.displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span title={sup.fullName}>{sup.fullName}</span>
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

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 px-2 flex-wrap">
          {/* Default View Dropdown */}
          <div className="flex items-center">
            <select
              className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
            >
              <option value="default">≡ Default</option>
              <option value="custom">Custom View</option>
            </select>
          </div>

          {/* Add Filter Dropdown */}
          <div className="relative" ref={addFilterRef}>
            <button
              type="button"
              onClick={() => setShowAddFilterDropdown(!showAddFilterDropdown)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Filter</span>
            </button>
            
            {showAddFilterDropdown && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-48">
                <div className="p-2">
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search column..."
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
                    />
                  </div>
                  <div className="space-y-0.5">
                    {["Flight", "STD", "Origin Destination", "Name", "Sector"].map((col) => (
                      <button
                        key={col}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded transition-colors text-left"
                        onClick={() => setShowAddFilterDropdown(false)}
                      >
                        <span className="text-gray-400">≡</span>
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Assignments */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent w-36"
            />
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {/* Shift Type Filter - Compact */}
          <select
            id="shift-filter"
            value={shiftFilter}
            onChange={(e) => {
              const newShift = e.target.value as ShiftType
              setShiftFilter(newShift)
              setPeriodFilter("all")
              setWaveFilter("all")
            }}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
          >
            <option value="current">Current (All)</option>
            <option value="night">Night Shift</option>
            <option value="day">Day Shift</option>
          </select>

          {/* Period Filter - Compact (conditional based on shift) */}
          <select
            id="period-filter"
            value={periodFilter}
            onChange={(e) => {
              setPeriodFilter(e.target.value as PeriodType)
              if (e.target.value === "early-morning") {
                setWaveFilter("all")
              }
            }}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
          >
            {shiftFilter === "current" && (
              <>
                <option value="all">All Periods</option>
                <option value="early-morning">Early Morning (00:01-05:59)</option>
                <option value="late-morning">Late Morning (06:00-12:59)</option>
                <option value="afternoon">Afternoon (13:00-23:59)</option>
              </>
            )}
            {shiftFilter === "night" && (
              <>
                <option value="all">All Periods</option>
                <option value="early-morning">Early Morning (00:01-05:59)</option>
                <option value="late-morning">Late Morning (06:00-12:59)</option>
              </>
            )}
            {shiftFilter === "day" && (
              <>
                <option value="all">All Periods</option>
                <option value="afternoon">Afternoon (13:00-23:59)</option>
              </>
            )}
          </select>

          {/* Wave Filter - Compact (conditional) */}
          {showWaveFilter && (
            <select
              id="wave-filter"
              value={waveFilter}
              onChange={(e) => setWaveFilter(e.target.value as WaveType)}
              className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
            >
              <option value="all">All Waves</option>
              <option value="first-wave">
                {periodFilter === "late-morning" ? "First Wave (06:00-09:00)" : "First Wave (13:00-15:59)"}
              </option>
              <option value="second-wave">
                {periodFilter === "late-morning" ? "Second Wave (09:01-12:59)" : "Second Wave (16:00-23:59)"}
              </option>
            </select>
          )}

          <div className="flex-1" />

          {/* View Options Panel */}
          <div className="relative" ref={viewOptionsRef}>
            <button
              type="button"
              onClick={() => setShowViewOptions(!showViewOptions)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 transition-colors"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
            
            {showViewOptions && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-64">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">View Options</h3>
                  
                  {/* Show Assignments */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <Plane className="w-3 h-3 text-[#D71A21]" />
                      <span>Show Assignments</span>
                    </div>
                    <select className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded">
                      <option>All Assignments</option>
                      <option>Assigned Only</option>
                      <option>Unassigned Only</option>
                    </select>
                  </div>
                  
                  {/* Ordering */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Ordering</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <select className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded">
                        <option>STD Time</option>
                        <option>Flight Number</option>
                        <option>Origin Destination</option>
                      </select>
                      <button className="p-1.5 border border-gray-200 rounded hover:bg-gray-50">
                        <ArrowUpDown className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Display Fields */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <Settings2 className="w-3 h-3" />
                      <span>Display Fields</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {["Flight", "STD", "Origin Destination", "Name", "Sector"].map((field) => (
                        <span
                          key={field}
                          className="px-1.5 py-0.5 text-[10px] bg-[#D71A21]/10 text-[#D71A21] border border-[#D71A21]/20 rounded cursor-pointer hover:bg-[#D71A21]/20 transition-colors"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Assignment count */}
          <div className="text-xs text-gray-500 whitespace-nowrap">
            {filteredAssignments.length} of {flightAssignments.length} assignments
          </div>
        </div>

        {/* Pending Summary by Location */}
        <div className="mb-4 px-2">
          <div className="flex flex-wrap gap-2 items-center">
            {Object.keys(pendingByCategory).length > 0 ? (
              Object.entries(pendingByCategory).map(([category, { count, color }]) => (
                <span
                  key={category}
                  className={`${color} px-3 py-1.5 rounded-md text-xs font-medium text-gray-900 inline-block`}
                >
                  {category}: {count}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500">No pending flights</span>
            )}
          </div>
        </div>
        <div ref={tableContainerRef} className="mx-2 rounded-lg border border-gray-200 overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
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
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">STD</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Origin Destination</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Name</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Sector</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-center text-gray-500 text-sm">
                      Loading flight assignments...
                    </td>
                  </tr>
                ) : filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-center text-gray-500 text-sm">
                      {flightAssignments.length === 0 ? "No flight assignments available" : "No assignments match the selected filters"}
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <FlightAssignmentRow
                      key={assignment.flight}
                      assignment={assignment}
                      operatorOptions={operatorOptions}
                      onNameChange={(name) => handleNameChange(assignment.flight, name)}
                      onSectorChange={(sector) => handleSectorChange(assignment.flight, sector)}
                    />
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

type OperatorOption = {
  staff_no: number
  displayName: string
  fullName: string
  searchName: string
}

interface FlightAssignmentRowProps {
  assignment: FlightAssignment
  operatorOptions: OperatorOption[]
  onNameChange: (name: string) => void
  onSectorChange: (sector: string) => void
}

function FlightAssignmentRow({ assignment, operatorOptions, onNameChange, onSectorChange }: FlightAssignmentRowProps) {
  const [nameOpen, setNameOpen] = useState(false)
  const [nameSearch, setNameSearch] = useState("")

  const filteredOperators = operatorOptions.filter((op) => {
    if (!nameSearch) return true
    const search = nameSearch.toLowerCase()
    return op.searchName.includes(search) || op.displayName.toLowerCase().includes(search)
  })

  const originDestinationColor = getOriginDestinationColor(
    assignment.flight,
    assignment.name,
    assignment.sector
  )

  return (
    <tr className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 bg-white">
      <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
        {assignment.flight}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{assignment.std}</td>
      <td className={`px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate ${originDestinationColor}`}>
        {assignment.originDestination}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap">
        <Popover 
          open={nameOpen} 
          onOpenChange={(open) => {
            setNameOpen(open)
            if (!open) {
              setNameSearch("")
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={nameOpen}
              className="w-full h-8 justify-between text-xs px-2 py-1"
            >
              {assignment.name ? assignment.name.charAt(0).toUpperCase() + assignment.name.slice(1) : "Select name..."}
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search name..."
                value={nameSearch}
                onValueChange={setNameSearch}
              />
              <CommandList>
                <CommandEmpty>No operator found.</CommandEmpty>
                <CommandGroup>
                  {filteredOperators.map((op) => (
                    <CommandItem
                      key={op.staff_no}
                      value={op.displayName}
                      onSelect={() => {
                        onNameChange(op.displayName.toLowerCase())
                        setNameOpen(false)
                        setNameSearch("")
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          assignment.name.toLowerCase() === op.displayName.toLowerCase() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {op.fullName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap">
        <Input
          type="text"
          value={assignment.sector}
          onChange={(e) => onSectorChange(e.target.value)}
          placeholder="E75"
          className="w-full h-8 text-xs border-gray-300 placeholder:text-gray-400"
        />
      </td>
    </tr>
  )
}

