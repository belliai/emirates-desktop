"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Plane, Clock, MapPin, Users, FileText, Check, ChevronsUpDown, RefreshCw } from "lucide-react"
import { useLoadPlans } from "@/lib/load-plan-context"
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
import { getLoadPlansFromSupabase } from "@/lib/load-plans-supabase"

type FlightAssignment = {
  flight: string
  std: string
  originDestination: string
  name: string
  sector: string
}

// Extract flight number from flight string (e.g., "EK0205" -> 205)
function extractFlightNumber(flight: string): number {
  const match = flight.match(/EK0?(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

// Airport to region mapping
const airportToRegion: Record<string, { category: string; color: string }> = {
  // EU/UK airports
  LHR: { category: "EU/UK", color: "bg-blue-200" },
  LGW: { category: "EU/UK", color: "bg-blue-200" },
  MAN: { category: "EU/UK", color: "bg-blue-200" },
  EDI: { category: "EU/UK", color: "bg-blue-200" },
  BRS: { category: "EU/UK", color: "bg-blue-200" },
  CDG: { category: "EU/UK", color: "bg-blue-200" },
  FRA: { category: "EU/UK", color: "bg-blue-200" },
  MXP: { category: "EU/UK", color: "bg-blue-200" },
  FCO: { category: "EU/UK", color: "bg-blue-200" },
  AMS: { category: "EU/UK", color: "bg-blue-200" },
  MAD: { category: "EU/UK", color: "bg-blue-200" },
  VIE: { category: "EU/UK", color: "bg-blue-200" },
  ZUR: { category: "EU/UK", color: "bg-blue-200" },
  CPH: { category: "EU/UK", color: "bg-blue-200" },
  ARN: { category: "EU/UK", color: "bg-blue-200" },
  OSL: { category: "EU/UK", color: "bg-blue-200" },
  DUB: { category: "EU/UK", color: "bg-blue-200" },
  BRU: { category: "EU/UK", color: "bg-blue-200" },
  LIS: { category: "EU/UK", color: "bg-blue-200" },
  ATH: { category: "EU/UK", color: "bg-blue-200" },
  VCE: { category: "EU/UK", color: "bg-blue-200" },
  BCN: { category: "EU/UK", color: "bg-blue-200" },
  // US airports
  JFK: { category: "US", color: "bg-pink-200" },
  LAX: { category: "US", color: "bg-pink-200" },
  ORD: { category: "US", color: "bg-pink-200" },
  IAD: { category: "US", color: "bg-pink-200" },
  SFO: { category: "US", color: "bg-pink-200" },
  BOS: { category: "US", color: "bg-pink-200" },
  MIA: { category: "US", color: "bg-pink-200" },
  DFW: { category: "US", color: "bg-pink-200" },
  ATL: { category: "US", color: "bg-pink-200" },
  SEA: { category: "US", color: "bg-pink-200" },
  IAH: { category: "US", color: "bg-pink-200" },
  // FE/AUS airports
  SIN: { category: "FE/AUS", color: "bg-cyan-200" },
  HKG: { category: "FE/AUS", color: "bg-cyan-200" },
  SYD: { category: "FE/AUS", color: "bg-cyan-200" },
  MEL: { category: "FE/AUS", color: "bg-cyan-200" },
  BKK: { category: "FE/AUS", color: "bg-cyan-200" },
  NRT: { category: "FE/AUS", color: "bg-cyan-200" },
  HND: { category: "FE/AUS", color: "bg-cyan-200" },
  KUL: { category: "FE/AUS", color: "bg-cyan-200" },
  MNL: { category: "FE/AUS", color: "bg-cyan-200" },
  BNE: { category: "FE/AUS", color: "bg-cyan-200" },
  PER: { category: "FE/AUS", color: "bg-cyan-200" },
  ADL: { category: "FE/AUS", color: "bg-cyan-200" },
  ICN: { category: "FE/AUS", color: "bg-cyan-200" },
  PVG: { category: "FE/AUS", color: "bg-cyan-200" },
  PEK: { category: "FE/AUS", color: "bg-cyan-200" },
  CAN: { category: "FE/AUS", color: "bg-cyan-200" },
  // ISUB airports
  DEL: { category: "ISUB", color: "bg-purple-200" },
  BOM: { category: "ISUB", color: "bg-purple-200" },
  DAC: { category: "ISUB", color: "bg-purple-200" },
  KHI: { category: "ISUB", color: "bg-purple-200" },
  LHE: { category: "ISUB", color: "bg-purple-200" },
  ISB: { category: "ISUB", color: "bg-purple-200" },
  CMB: { category: "ISUB", color: "bg-purple-200" },
  CCU: { category: "ISUB", color: "bg-purple-200" },
  MAA: { category: "ISUB", color: "bg-purple-200" },
  BLR: { category: "ISUB", color: "bg-purple-200" },
  HYD: { category: "ISUB", color: "bg-purple-200" },
  COK: { category: "ISUB", color: "bg-purple-200" },
  // Africa airports
  JNB: { category: "Africa", color: "bg-green-200" },
  CPT: { category: "Africa", color: "bg-green-200" },
  CAI: { category: "Africa", color: "bg-green-200" },
  ADD: { category: "Africa", color: "bg-green-200" },
  NBO: { category: "Africa", color: "bg-green-200" },
  DAR: { category: "Africa", color: "bg-green-200" },
  LOS: { category: "Africa", color: "bg-green-200" },
  ACC: { category: "Africa", color: "bg-green-200" },
  // M/East airports
  DXB: { category: "M/East", color: "bg-yellow-200" },
  DOH: { category: "M/East", color: "bg-yellow-200" },
  BAH: { category: "M/East", color: "bg-yellow-200" },
  KWI: { category: "M/East", color: "bg-yellow-200" },
  AMM: { category: "M/East", color: "bg-yellow-200" },
  BEY: { category: "M/East", color: "bg-yellow-200" },
  RUH: { category: "M/East", color: "bg-yellow-200" },
  JED: { category: "M/East", color: "bg-yellow-200" },
  DMM: { category: "M/East", color: "bg-yellow-200" },
  AUH: { category: "M/East", color: "bg-yellow-200" },
  DWC: { category: "M/East", color: "bg-yellow-200" },
}

// Extract destination airport code from originDestination string (e.g., "DXB-LHR" -> "LHR")
function extractDestination(originDestination: string): string {
  if (!originDestination) return ""
  const parts = originDestination.split("-")
  return parts.length > 1 ? parts[1].toUpperCase() : ""
}

// Get region category based on destination airport or flight number ranges
// Priority: airport mapping > flight number ranges > Other
function getFlightRegion(flight: string, originDestination: string = ""): { category: string; color: string } {
  // First, try to get category from airport mapping
  const destination = extractDestination(originDestination)
  if (destination && airportToRegion[destination]) {
    return airportToRegion[destination]
  }
  
  // Fall back to flight number ranges
  const flightNum = extractFlightNumber(flight)
  
  if (flightNum >= 200 && flightNum <= 299) {
    return { category: "US", color: "bg-pink-200" }
  }
  if (flightNum >= 300 && flightNum <= 399) {
    return { category: "FE/AUS", color: "bg-cyan-200" }
  }
  if (flightNum >= 500 && flightNum <= 699) {
    return { category: "ISUB", color: "bg-purple-200" }
  }
  if (flightNum >= 700 && flightNum <= 799) {
    return { category: "Africa", color: "bg-green-200" }
  }
  if (flightNum >= 800 && flightNum <= 999) {
    return { category: "M/East", color: "bg-yellow-200" }
  }
  
  // Default for other flight numbers (000-199, 400-499)
  return { category: "Other", color: "bg-orange-200" }
}

// Color coding based on flight number - only for origin destination cell
const getOriginDestinationColor = (flight: string, name: string, sector: string, originDestination: string = ""): string => {
  // If both name and sector are filled, return white (no color)
  if (name && sector) {
    return "bg-white"
  }

  return getFlightRegion(flight, originDestination).color
}

const getDestinationCategory = (flight: string, originDestination: string = ""): { category: string; color: string } => {
  return getFlightRegion(flight, originDestination)
}

interface FlightAssignmentScreenProps {
  initialSupervisor?: string
}

export default function FlightAssignmentScreen({ initialSupervisor }: FlightAssignmentScreenProps = {}) {
  const { loadPlans, flightAssignments: contextAssignments, bupAllocations, updateFlightAssignment, updateFlightAssignmentSector, setLoadPlans, setActiveSupervisorId } = useLoadPlans()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [supervisors, setSupervisors] = useState<BuildupStaff[]>([])
  const [operators, setOperators] = useState<BuildupStaff[]>([])
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(initialSupervisor || "")
  const [supervisorDropdownOpen, setSupervisorDropdownOpen] = useState(false)
  const [supervisorSearch, setSupervisorSearch] = useState("")
  const { getNotificationsForStaff } = useNotifications()
  const { toast } = useToast()
  const shownNotificationIdsRef = React.useRef<Set<string>>(new Set())

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
    
    // Convert map to array and sort:
    // 1. Flights with actual load plans first (for demo)
    // 2. Then by flight number within each group
    return Array.from(assignmentsMap.values()).sort((a, b) => {
      const aHasLoadPlan = loadPlanFlights.has(a.flight)
      const bHasLoadPlan = loadPlanFlights.has(b.flight)
      
      // Prioritize flights with uploaded load plans
      if (aHasLoadPlan && !bHasLoadPlan) return -1
      if (!aHasLoadPlan && bHasLoadPlan) return 1
      
      // Within same category, sort by flight number
      return a.flight.localeCompare(b.flight)
    })
  }, [loadPlans, contextAssignments, loadPlanFlights, bupAllocations, bupRoutingMap])

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

  // Set active supervisor in context when supervisor selection changes
  // NOTE: We don't clear on unmount so notifications work when navigating to Load Plans
  useEffect(() => {
    if (selectedSupervisorId) {
      setActiveSupervisorId(selectedSupervisorId)
    }
  }, [selectedSupervisorId, setActiveSupervisorId])

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
      sup.displayName.toLowerCase().includes(search) ||
      sup.fullName.toLowerCase().includes(search)
    )
  }, [supervisorOptions, supervisorSearch])

  // Get currently selected supervisor details
  const currentSupervisor = useMemo(() => {
    return supervisorOptions.find(s => s.staff_no.toString() === selectedSupervisorId)
  }, [supervisorOptions, selectedSupervisorId])

  const handleNameChange = (flight: string, name: string) => {
    // Update the context so Buildup Staff can filter
    updateFlightAssignment(flight, name)
  }

  const handleSectorChange = (flight: string, sector: string) => {
    // Update sector in context assignments
    updateFlightAssignmentSector(flight, sector)
  }

  // Handle refresh with new/deleted detection
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Store current flight numbers for comparison
      const currentFlightNumbers = new Set(loadPlans.map(lp => lp.flight))
      
      // Fetch fresh data
      const freshLoadPlans = await getLoadPlansFromSupabase()
      setLoadPlans(freshLoadPlans)
      
      const freshFlightNumbers = new Set(freshLoadPlans.map(lp => lp.flight))
      
      // Find new load plans
      const newFlights = Array.from(freshFlightNumbers).filter(flight => !currentFlightNumbers.has(flight))
      // Find deleted load plans
      const deletedFlights = Array.from(currentFlightNumbers).filter(flight => !freshFlightNumbers.has(flight))
      
      // Show notifications
      if (newFlights.length > 0) {
        toast({
          title: "New Load Plans",
          description: `${newFlights.length} new load plan(s) added: ${newFlights.join(", ")}`,
          duration: 5000,
        })
      }
      
      if (deletedFlights.length > 0) {
        toast({
          title: "Load Plans Removed",
          description: `${deletedFlights.length} load plan(s) removed: ${deletedFlights.join(", ")}`,
          duration: 5000,
        })
      }
      
      if (newFlights.length === 0 && deletedFlights.length === 0) {
        toast({
          title: "Data Refreshed",
          description: "No changes detected.",
          duration: 3000,
        })
      }
    } catch (err) {
      console.error("[FlightAssignmentScreen] Error refreshing load plans:", err)
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh load plans. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Calculate pending flights by category (based on destination airport or flight number ranges)
  const pendingByCategory: Record<string, { count: number; color: string }> = {}
  flightAssignments.forEach((assignment) => {
    if (!assignment.name || !assignment.sector) {
      const { category, color } = getDestinationCategory(assignment.flight, assignment.originDestination)
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
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="border-gray-300 hover:bg-gray-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
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
                ) : flightAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-center text-gray-500 text-sm">
                      No flight assignments available
                    </td>
                  </tr>
                ) : (
                  flightAssignments.map((assignment) => (
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
    return op.searchName.includes(search) || op.displayName.toLowerCase().includes(search) || op.fullName.toLowerCase().includes(search)
  })

  const originDestinationColor = getOriginDestinationColor(
    assignment.flight,
    assignment.name,
    assignment.sector,
    assignment.originDestination
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

