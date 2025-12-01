"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Plane, Clock, MapPin, Users, FileText, Check, ChevronsUpDown } from "lucide-react"
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
      sup.displayName.toLowerCase().includes(search)
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

  // Calculate pending flights by category (based on flight number ranges)
  const pendingByCategory: Record<string, { count: number; color: string }> = {}
  flightAssignments.forEach((assignment) => {
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
                          <span title={sup.fullName}>{sup.displayName}</span>
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
                      {op.displayName}
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

