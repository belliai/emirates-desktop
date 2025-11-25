"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export type LoadPlan = {
  flight: string
  date: string
  acftType: string
  acftReg: string
  pax: string
  std: string
  uldVersion: string
  ttlPlnUld: string
}

export type FlightAssignment = {
  flight: string
  std: string
  originDestination: string
  name: string
  sector: string
}

type LoadPlanContextType = {
  loadPlans: LoadPlan[]
  flightAssignments: FlightAssignment[]
  setLoadPlans: (plans: LoadPlan[]) => void
  addLoadPlan: (plan: LoadPlan) => void
  updateFlightAssignment: (flight: string, name: string) => void
  updateFlightAssignmentSector: (flight: string, sector: string) => void
  sendToFlightAssignment: (flight: string) => void
  getFlightsByStaff: (staffName: string) => LoadPlan[]
}

const LoadPlanContext = createContext<LoadPlanContextType | undefined>(undefined)

const defaultLoadPlans: LoadPlan[] = [
  {
    flight: "EK0544",
    date: "01Mar",
    acftType: "77WER",
    acftReg: "A6-ENT",
    pax: "DXB/MAA/0/23/251",
    std: "02:50",
    uldVersion: "06/26",
    ttlPlnUld: "06PMC/07AKE",
  },
  {
    flight: "EK0205",
    date: "12Oct",
    acftType: "388R",
    acftReg: "A6-EOW",
    pax: "DXB/MXP",
    std: "09:35",
    uldVersion: "05PMC/26",
    ttlPlnUld: "05PMC/10AKE",
  },
]

export function LoadPlanProvider({ children }: { children: ReactNode }) {
  const [loadPlans, setLoadPlans] = useState<LoadPlan[]>(defaultLoadPlans)
  const [flightAssignments, setFlightAssignments] = useState<FlightAssignment[]>([])

  const addLoadPlan = (plan: LoadPlan) => {
    setLoadPlans((prev) => {
      const exists = prev.some((p) => p.flight === plan.flight)
      if (exists) {
        return prev.map((p) => (p.flight === plan.flight ? plan : p))
      }
      return [...prev, plan]
    })

    // Auto-create flight assignment if it doesn't exist
    setFlightAssignments((prev) => {
      const exists = prev.some((fa) => fa.flight === plan.flight)
      if (!exists) {
        const originMatch = plan.pax.match(/^([A-Z]{3})/)
        const origin = originMatch ? originMatch[1] : "DXB"
        const destinations = plan.pax.split("/").filter((part) => part.length === 3 && part !== origin)
        const destination = destinations[0] || "JFK"
        const originDestination = `${origin}-${destination}`

        return [
          ...prev,
          {
            flight: plan.flight,
            std: plan.std,
            originDestination,
            name: "",
            sector: plan.acftType || "E75",
          },
        ]
      }
      return prev
    })
  }

  const updateFlightAssignment = (flight: string, name: string) => {
    setFlightAssignments((prev) => {
      const exists = prev.some((fa) => fa.flight === flight)
      if (exists) {
        return prev.map((fa) => (fa.flight === flight ? { ...fa, name } : fa))
      }
      // If assignment doesn't exist, find the load plan and create assignment
      const plan = loadPlans.find((p) => p.flight === flight)
      if (plan) {
        const originMatch = plan.pax.match(/^([A-Z]{3})/)
        const origin = originMatch ? originMatch[1] : "DXB"
        const destinations = plan.pax.split("/").filter((part) => part.length === 3 && part !== origin)
        const destination = destinations[0] || "JFK"
        const originDestination = `${origin}-${destination}`

        return [
          ...prev,
          {
            flight: plan.flight,
            std: plan.std,
            originDestination,
            name,
            sector: plan.acftType || "E75",
          },
        ]
      }
      // Even if load plan doesn't exist in context, create assignment for filtering
      return [
        ...prev,
        {
          flight,
          std: "",
          originDestination: "DXB-JFK",
          name,
          sector: "E75",
        },
      ]
    })
  }

  const updateFlightAssignmentSector = (flight: string, sector: string) => {
    setFlightAssignments((prev) => {
      const exists = prev.some((fa) => fa.flight === flight)
      if (exists) {
        return prev.map((fa) => (fa.flight === flight ? { ...fa, sector } : fa))
      }
      // If assignment doesn't exist, find the load plan and create assignment
      const plan = loadPlans.find((p) => p.flight === flight)
      if (plan) {
        const originMatch = plan.pax.match(/^([A-Z]{3})/)
        const origin = originMatch ? originMatch[1] : "DXB"
        const destinations = plan.pax.split("/").filter((part) => part.length === 3 && part !== origin)
        const destination = destinations[0] || "JFK"
        const originDestination = `${origin}-${destination}`

        return [
          ...prev,
          {
            flight: plan.flight,
            std: plan.std,
            originDestination,
            name: "",
            sector: sector || plan.acftType || "E75",
          },
        ]
      }
      // Even if load plan doesn't exist in context, create assignment
      return [
        ...prev,
        {
          flight,
          std: "",
          originDestination: "DXB-JFK",
          name: "",
          sector: sector || "E75",
        },
      ]
    })
  }

  const sendToFlightAssignment = (flight: string) => {
    // Clear the name assignment to send it back to flight assignment for reassignment
    setFlightAssignments((prev) => {
      return prev.map((fa) => 
        fa.flight === flight ? { ...fa, name: "" } : fa
      )
    })
  }

  const getFlightsByStaff = (staffName: string) => {
    const assignedFlights = flightAssignments
      .filter((fa) => fa.name.toLowerCase() === staffName.toLowerCase())
      .map((fa) => fa.flight)

    return loadPlans.filter((plan) => assignedFlights.includes(plan.flight))
  }

  return (
    <LoadPlanContext.Provider
      value={{
        loadPlans,
        flightAssignments,
        setLoadPlans,
        addLoadPlan,
        updateFlightAssignment,
        updateFlightAssignmentSector,
        sendToFlightAssignment,
        getFlightsByStaff,
      }}
    >
      {children}
    </LoadPlanContext.Provider>
  )
}

export function useLoadPlans() {
  const context = useContext(LoadPlanContext)
  if (context === undefined) {
    throw new Error("useLoadPlans must be used within a LoadPlanProvider")
  }
  return context
}

