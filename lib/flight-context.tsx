"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getFlightData, type Flight, type ULD } from "@/lib/flight-data"
import { validateStatusTransition, getMissingStatuses } from "@/lib/status-workflow"

interface FlightContextType {
  flights: Flight[]
  loading: boolean
  updateULDStatus: (flightNumber: string, uldIndex: number, newStatus: 1 | 2 | 3 | 4 | 5) => void
  addMultipleStatusUpdates: (flightNumber: string, uldIndex: number, statuses: Array<1 | 2 | 3 | 4 | 5>) => void
  addULD: (flightNumber: string, uld: ULD) => void
  refreshFlights: () => Promise<void>
  setFlights: (flights: Flight[]) => void
}

const FlightContext = createContext<FlightContextType | undefined>(undefined)

export function FlightProvider({ children }: { children: ReactNode }) {
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(true)

  // Load flights on mount
  useEffect(() => {
    loadFlights()
  }, [])

  const loadFlights = async () => {
    console.log("[v0] Loading flight data from CSV...")
    const data = await getFlightData()
    console.log("[v0] Loaded flights:", data.length)
    setFlights(data)
    setLoading(false)
  }

  const updateULDStatus = (flightNumber: string, uldIndex: number, newStatus: 1 | 2 | 3 | 4 | 5) => {
    setFlights((prevFlights) =>
      prevFlights.map((flight) => {
        if (flight.flightNumber === flightNumber) {
          const updatedUlds = [...flight.ulds]
          const currentUld = updatedUlds[uldIndex]

          const validation = validateStatusTransition(currentUld.statusHistory || [], newStatus)

          if (!validation.isValid) {
            console.warn("[v0] Status transition blocked:", validation.message)
            // Get missing statuses and add them automatically
            const missingStatuses = getMissingStatuses(currentUld.statusHistory || [], newStatus)

            if (missingStatuses.length > 0) {
              console.log("[v0] Auto-filling missing statuses:", missingStatuses)
              // Create entries for all missing statuses plus the target status
              const allStatuses = [...missingStatuses, newStatus]
              const newEntries = allStatuses.map((status) => ({
                status,
                timestamp: new Date(),
                changedBy: "David",
              }))

              updatedUlds[uldIndex] = {
                ...currentUld,
                status: newStatus,
                statusHistory: [...(currentUld.statusHistory || []), ...newEntries],
              }

              return {
                ...flight,
                ulds: updatedUlds,
              }
            }

            // If no missing statuses but still invalid, don't update
            return flight
          }

          updatedUlds[uldIndex] = {
            ...currentUld,
            status: newStatus,
            statusHistory: [
              ...(currentUld.statusHistory || []),
              {
                status: newStatus,
                timestamp: new Date(),
                changedBy: "David",
              },
            ],
          }

          return {
            ...flight,
            ulds: updatedUlds,
          }
        }
        return flight
      }),
    )
  }

  const addMultipleStatusUpdates = (flightNumber: string, uldIndex: number, statuses: Array<1 | 2 | 3 | 4 | 5>) => {
    setFlights((prevFlights) =>
      prevFlights.map((flight) => {
        if (flight.flightNumber === flightNumber) {
          const updatedUlds = [...flight.ulds]
          const currentUld = updatedUlds[uldIndex]

          // Create all new status entries at once
          const newEntries = statuses.map((status) => ({
            status,
            timestamp: new Date(),
            changedBy: "user",
          }))

          updatedUlds[uldIndex] = {
            ...currentUld,
            status: statuses[statuses.length - 1], // Set status to the last one in the array
            statusHistory: [...(currentUld.statusHistory || []), ...newEntries],
          }

          return {
            ...flight,
            ulds: updatedUlds,
          }
        }
        return flight
      }),
    )
  }

  const addULD = (flightNumber: string, uld: ULD) => {
    setFlights((prevFlights) =>
      prevFlights.map((flight) => {
        if (flight.flightNumber === flightNumber) {
          return {
            ...flight,
            ulds: [...flight.ulds, uld],
            uldCount: flight.ulds.length + 1,
          }
        }
        return flight
      }),
    )
  }

  const refreshFlights = async () => {
    await loadFlights()
  }

  const setFlightsData = (newFlights: Flight[]) => {
    setFlights(newFlights)
  }

  return (
    <FlightContext.Provider
      value={{
        flights,
        loading,
        updateULDStatus,
        addMultipleStatusUpdates,
        addULD,
        refreshFlights,
        setFlights: setFlightsData,
      }}
    >
      {children}
    </FlightContext.Provider>
  )
}

export function useFlights() {
  const context = useContext(FlightContext)
  if (context === undefined) {
    throw new Error("useFlights must be used within a FlightProvider")
  }
  return context
}
