"use client"

import { useState, useEffect, useMemo } from "react"
import { Plane, Clock, MapPin, Users, FileText, Check, ChevronsUpDown } from "lucide-react"
import { useLoadPlans } from "@/lib/load-plan-context"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type FlightAssignment = {
  flight: string
  std: string
  originDestination: string
  name: string
  sector: string
}

const nameOptions = ["david", "harley"]

// Color coding based on destination - only for origin destination cell
const getOriginDestinationColor = (originDestination: string, name: string, sector: string): string => {
  // If both name and sector are filled, return white (no color)
  if (name && sector) {
    return "bg-white"
  }

  const destination = originDestination.split("-")[1] || ""

  // UK destinations - Pink
  const ukDestinations = ["LHR", "LGW", "MAN", "EDI", "BHX", "GLA"]
  if (ukDestinations.includes(destination)) {
    return "bg-pink-200"
  }

  // US destinations - Pink
  const usDestinations = ["JFK", "LAX", "SFO", "ORD", "MIA", "DFW", "BOS", "IAD", "SEA", "ATL"]
  if (usDestinations.includes(destination)) {
    return "bg-pink-200"
  }

  // Europe destinations - Yellow
  const europeDestinations = [
    "CDG",
    "FRA",
    "AMS",
    "MXP",
    "FCO",
    "MAD",
    "BCN",
    "ZRH",
    "VIE",
    "CPH",
    "ARN",
    "OSL",
    "HEL",
    "DUB",
    "LIS",
    "ATH",
    "BRU",
    "PRG",
  ]
  if (europeDestinations.includes(destination)) {
    return "bg-yellow-200"
  }

  // Southeast Asia destinations - Blue
  const southeastAsiaDestinations = ["SIN", "BKK", "KUL", "MNL", "CGK", "HKG"]
  if (southeastAsiaDestinations.includes(destination)) {
    return "bg-blue-200"
  }

  // South Asia destinations - Purple
  const southAsiaDestinations = ["MAA", "BOM", "DEL", "CCU"]
  if (southAsiaDestinations.includes(destination)) {
    return "bg-purple-200"
  }

  // East Asia destinations - Cyan
  const eastAsiaDestinations = ["NRT", "ICN", "PEK", "PVG", "CAN"]
  if (eastAsiaDestinations.includes(destination)) {
    return "bg-cyan-200"
  }

  // Middle East / Africa - Green
  const meaDestinations = ["CAI", "JNB", "CPT", "DOH", "BAH", "KWI", "RUH", "AMM", "BEY"]
  if (meaDestinations.includes(destination)) {
    return "bg-green-200"
  }

  // Default for other destinations - Orange
  return "bg-orange-200"
}

const getDestinationCategory = (destination: string): { category: string; color: string } => {
  // UK destinations
  const ukDestinations = ["LHR", "LGW", "MAN", "EDI", "BHX", "GLA"]
  if (ukDestinations.includes(destination)) {
    return { category: "UK", color: "bg-pink-200" }
  }

  // US destinations
  const usDestinations = ["JFK", "LAX", "SFO", "ORD", "MIA", "DFW", "BOS", "IAD", "SEA", "ATL"]
  if (usDestinations.includes(destination)) {
    return { category: "US", color: "bg-pink-200" }
  }

  // Europe destinations
  const europeDestinations = [
    "CDG",
    "FRA",
    "AMS",
    "MXP",
    "FCO",
    "MAD",
    "BCN",
    "ZRH",
    "VIE",
    "CPH",
    "ARN",
    "OSL",
    "HEL",
    "DUB",
    "LIS",
    "ATH",
    "BRU",
    "PRG",
  ]
  if (europeDestinations.includes(destination)) {
    return { category: "Europe", color: "bg-yellow-200" }
  }

  // Southeast Asia destinations
  const southeastAsiaDestinations = ["SIN", "BKK", "KUL", "MNL", "CGK", "HKG"]
  if (southeastAsiaDestinations.includes(destination)) {
    return { category: "Southeast Asia", color: "bg-blue-200" }
  }

  // South Asia destinations
  const southAsiaDestinations = ["MAA", "BOM", "DEL", "CCU"]
  if (southAsiaDestinations.includes(destination)) {
    return { category: "South Asia", color: "bg-purple-200" }
  }

  // East Asia destinations
  const eastAsiaDestinations = ["NRT", "ICN", "PEK", "PVG", "CAN"]
  if (eastAsiaDestinations.includes(destination)) {
    return { category: "East Asia", color: "bg-cyan-200" }
  }

  // Middle East / Africa
  const meaDestinations = ["CAI", "JNB", "CPT", "DOH", "BAH", "KWI", "RUH", "AMM", "BEY"]
  if (meaDestinations.includes(destination)) {
    return { category: "Middle East/Africa", color: "bg-green-200" }
  }

  // Default for other destinations
  return { category: "Other", color: "bg-orange-200" }
}

export default function FlightAssignmentScreen() {
  const { loadPlans, flightAssignments: contextAssignments, updateFlightAssignment, updateFlightAssignmentSector } = useLoadPlans()
  const [isLoading, setIsLoading] = useState(true)

  // Create flight assignments from load plans and merge with context assignments
  const flightAssignments = useMemo(() => {
    // Start with assignments from context (which may have name/sector already set)
    const assignmentsMap = new Map<string, FlightAssignment>()
    
    // First, add all context assignments
    contextAssignments.forEach((fa) => {
      assignmentsMap.set(fa.flight, { ...fa })
    })
    
    // Then, create assignments from load plans for flights not in context
    loadPlans.forEach((plan) => {
      if (!assignmentsMap.has(plan.flight)) {
        // Parse origin and destination from pax field
        const originMatch = plan.pax.match(/^([A-Z]{3})/)
        const origin = originMatch ? originMatch[1] : "DXB"
        const destinations = plan.pax.split("/").filter((part) => part.length === 3 && part !== origin)
        const destination = destinations[0] || "JFK"
        const originDestination = `${origin}-${destination}`
        
        assignmentsMap.set(plan.flight, {
          flight: plan.flight,
          std: plan.std,
          originDestination,
          name: "",
          sector: plan.acftType || "",
        })
      }
    })
    
    // Convert map to array and sort by flight number
    return Array.from(assignmentsMap.values()).sort((a, b) => 
      a.flight.localeCompare(b.flight)
    )
  }, [loadPlans, contextAssignments])

  useEffect(() => {
    setIsLoading(false)
  }, [])

  const handleNameChange = (flight: string, name: string) => {
    // Update the context so Buildup Staff can filter
    updateFlightAssignment(flight, name)
  }

  const handleSectorChange = (flight: string, sector: string) => {
    // Update sector in context assignments
    updateFlightAssignmentSector(flight, sector)
  }

  // Calculate pending flights by category
  const pendingByCategory: Record<string, { count: number; color: string }> = {}
  flightAssignments.forEach((assignment) => {
    if (!assignment.name || !assignment.sector) {
      const destination = assignment.originDestination.split("-")[1] || ""
      const { category, color } = getDestinationCategory(destination)
      if (!pendingByCategory[category]) {
        pendingByCategory[category] = { count: 0, color }
      }
      pendingByCategory[category].count++
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header with Roosevelt Name and Icon Bar */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">Flight Assignment</h2>
          <div className="flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[#D71A21] text-white flex items-center justify-center">
              <span className="text-sm font-semibold">R</span>
            </div>
            <span className="text-sm font-medium text-gray-900">Roosevelt</span>
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

interface FlightAssignmentRowProps {
  assignment: FlightAssignment
  onNameChange: (name: string) => void
  onSectorChange: (sector: string) => void
}

function FlightAssignmentRow({ assignment, onNameChange, onSectorChange }: FlightAssignmentRowProps) {
  const [nameOpen, setNameOpen] = useState(false)
  const [nameSearch, setNameSearch] = useState("")

  const filteredNames = nameOptions.filter((name) =>
    name.toLowerCase().includes(nameSearch.toLowerCase())
  )

  const originDestinationColor = getOriginDestinationColor(
    assignment.originDestination,
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
                <CommandEmpty>No name found.</CommandEmpty>
                <CommandGroup>
                  {filteredNames.map((name) => (
                    <CommandItem
                      key={name}
                      value={name}
                      onSelect={() => {
                        onNameChange(name)
                        setNameOpen(false)
                        setNameSearch("")
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          assignment.name === name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {name.charAt(0).toUpperCase() + name.slice(1)}
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

