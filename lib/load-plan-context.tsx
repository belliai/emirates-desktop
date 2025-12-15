"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { useNotifications } from "./notification-context"
import { getSupervisors, findStaffByName, findStaffByStaffNo, generateMobileNumber } from "./buildup-staff"
import { createClient } from "./supabase/client"
import { updateLoadPlanAssignment } from "./load-plans-supabase"

export type LoadPlan = {
  flight: string
  date: string
  acftType: string
  acftReg: string
  pax: string
  std: string
  uldVersion: string
  ttlPlnUld: string
  workAreas?: string[] // Pre-computed work areas: ["GCR"], ["PIL", "PER"], or ["GCR", "PIL", "PER"]
}

export type FlightAssignment = {
  flight: string
  std: string
  originDestination: string
  name: string
  sector: string
}

export type SentBCR = {
  flight: string
  date: string
  loadPlan: any // LoadPlanDetail
  bcrData: any // BCRData
  sentAt: string
  sentBy?: string
}

// Shift types for BUP Allocation
export type ShiftType = "night" | "day" | "current"
export type PeriodType = "early-morning" | "late-morning" | "afternoon" | "all"
export type WaveType = "first-wave" | "second-wave" | "all"

// BUP Allocation type - represents a flight allocation from uploaded CSV
export type BUPAllocation = {
  carrier: string
  flightNo: string
  etd: string
  routing: string
  staff: string
  mobile: string
  acType: string
  regnNo: string
  shiftType: ShiftType
  period: PeriodType
  wave: WaveType | null
  date: string | null
}

type LoadPlanContextType = {
  loadPlans: LoadPlan[]
  flightAssignments: FlightAssignment[]
  sentBCRs: SentBCR[]
  bupAllocations: BUPAllocation[]
  setLoadPlans: (plans: LoadPlan[]) => void
  addLoadPlan: (plan: LoadPlan) => void
  updateFlightAssignment: (flight: string, name: string, assignedToStaffNo?: number, assignedByStaffNo?: number) => void
  updateFlightAssignmentSector: (flight: string, sector: string) => void
  sendToFlightAssignment: (flight: string) => void
  getFlightsByStaff: (staffName: string) => LoadPlan[]
  addSentBCR: (bcr: SentBCR) => void
  setBupAllocations: (allocations: BUPAllocation[]) => void
  addBupAllocation: (allocation: BUPAllocation) => void
  updateBupAllocationStaff: (flightNo: string, staff: string, mobile: string) => void
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

// Helper function to parse origin-destination from pax field
// Supports both formats: "DXBMAA" (6 letters) or "DXB/MAA" (slash-separated)
function parseOriginDestination(pax: string | undefined): string {
  if (!pax) return "DXB-???"
  
  let origin = "DXB"
  let destination = ""
  
  if (pax.includes("/")) {
    // Slash-separated format: "DXB/MAA/0/23/251"
    const parts = pax.split("/").filter((part) => /^[A-Z]{3}$/.test(part))
    origin = parts[0] || "DXB"
    destination = parts[1] || ""
  } else if (/^[A-Z]{6}$/.test(pax)) {
    // Concatenated format: "DXBMAA" (6 uppercase letters)
    origin = pax.slice(0, 3)
    destination = pax.slice(3, 6)
  } else {
    // Try to extract first 3-letter code as origin
    const originMatch = pax.match(/^([A-Z]{3})/)
    if (originMatch) {
      origin = originMatch[1]
      // Try to find destination in remaining text
      const remaining = pax.slice(3)
      const destMatch = remaining.match(/([A-Z]{3})/)
      if (destMatch) {
        destination = destMatch[1]
      }
    }
  }
  
  return destination ? `${origin}-${destination}` : `${origin}-???`
}

/**
 * Sync unassignment to Supabase bup_allocations table
 * Clears the staff and mobile fields when a flight is sent back for reassignment
 */
async function syncUnassignmentToSupabase(flight: string): Promise<void> {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.log("[LoadPlan] Supabase not configured, skipping unassignment sync")
      return
    }

    const supabase = createClient()
    
    // Extract flight number without EK prefix (handle both EK500 and EK0500 formats)
    const flightNo = flight.replace(/^EK0?/, "")
    
    // Update the staff and mobile fields to empty
    const { error } = await supabase
      .from("bup_allocations")
      .update({
        staff: "",
        mobile: "",
        updated_at: new Date().toISOString()
      })
      .or(`flight_no.eq.${flightNo},flight_no.eq.0${flightNo}`)
    
    if (error) {
      console.error("[LoadPlan] Error clearing assignment in Supabase:", error)
    } else {
      console.log(`[LoadPlan] Cleared assignment for flight ${flight} in Supabase`)
    }
  } catch (error) {
    console.error("[LoadPlan] Error syncing unassignment to Supabase:", error)
  }
}

/**
 * Sync flight assignment to Supabase bup_allocations table
 * This allows mobile apps to see assignments made on desktop
 */
async function syncAssignmentToSupabase(flight: string, staffName: string): Promise<void> {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.log("[LoadPlan] Supabase not configured, skipping sync")
      return
    }

    const supabase = createClient()
    
    // Extract flight number without EK prefix
    const flightNo = flight.replace(/^EK/, "")
    
    // Get staff details to find staff_no for mobile number generation
    const staff = await findStaffByName(staffName)
    const mobile = staff ? generateMobileNumber(staff.staff_no) : ""
    
    // Format staff name for consistency - capitalize first letter
    const formattedStaffName = staffName.charAt(0).toUpperCase() + staffName.slice(1).toLowerCase()
    
    // Check if assignment already exists
    const { data: existing, error: checkError } = await supabase
      .from("bup_allocations")
      .select("id")
      .eq("flight_no", flightNo)
      .limit(1)
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error("[LoadPlan] Error checking existing assignment:", checkError)
      return
    }
    
    const assignmentData = {
      flight_no: flightNo,
      staff: formattedStaffName,
      mobile: mobile,
      carrier: "EK",
      updated_at: new Date().toISOString()
    }
    
    if (existing && existing.length > 0) {
      // Update existing assignment
      const { error: updateError } = await supabase
        .from("bup_allocations")
        .update(assignmentData)
        .eq("flight_no", flightNo)
      
      if (updateError) {
        console.error("[LoadPlan] Error updating assignment in Supabase:", updateError)
      } else {
        console.log(`[LoadPlan] Updated assignment for ${flight} to ${formattedStaffName} in Supabase`)
      }
    } else {
      // Insert new assignment
      const { error: insertError } = await supabase
        .from("bup_allocations")
        .insert([{
          ...assignmentData,
          created_at: new Date().toISOString()
        }])
      
      if (insertError) {
        console.error("[LoadPlan] Error inserting assignment in Supabase:", insertError)
      } else {
        console.log(`[LoadPlan] Created assignment for ${flight} to ${formattedStaffName} in Supabase`)
      }
    }
  } catch (error) {
    console.error("[LoadPlan] Error syncing assignment to Supabase:", error)
  }
}

export function LoadPlanProvider({ children }: { children: ReactNode }) {
  const [loadPlans, setLoadPlans] = useState<LoadPlan[]>(defaultLoadPlans)
  const [flightAssignments, setFlightAssignments] = useState<FlightAssignment[]>([])
  const [sentBCRs, setSentBCRs] = useState<SentBCR[]>([])
  const [bupAllocations, setBupAllocations] = useState<BUPAllocation[]>([])
  const { addNotification } = useNotifications()

  const addLoadPlan = async (plan: LoadPlan) => {
    let isUpdate = false
    
    setLoadPlans((prev) => {
      const exists = prev.some((p) => p.flight === plan.flight)
      isUpdate = exists
      if (exists) {
        return prev.map((p) => (p.flight === plan.flight ? plan : p))
      }
      return [...prev, plan]
    })

    // Auto-create flight assignment if it doesn't exist
    setFlightAssignments((prev) => {
      const exists = prev.some((fa) => fa.flight === plan.flight)
      if (!exists) {
        return [
          ...prev,
          {
            flight: plan.flight,
            std: plan.std,
            originDestination: parseOriginDestination(plan.pax),
            name: "",
            sector: plan.acftType || "E75",
          },
        ]
      }
      return prev
    })

    // Notify supervisors when load plan is updated
    if (isUpdate) {
      try {
        const supervisors = await getSupervisors()
        // Create notification for all supervisors (staffNo undefined means all supervisors)
        addNotification({
          type: "load_plan_updated",
          flight: plan.flight,
          title: "Load Plan Updated",
          message: `Load plan for flight ${plan.flight} has been updated.`,
        })
      } catch (error) {
        console.error("[LoadPlan] Error notifying supervisors:", error)
      }
    }
  }

  const updateFlightAssignment = async (flight: string, name: string, assignedToStaffNo?: number, assignedByStaffNo?: number) => {
    let previousAssignment: FlightAssignment | undefined
    let wasAssigned = false
    let isNewAssignment = false

    setFlightAssignments((prev) => {
      previousAssignment = prev.find((fa) => fa.flight === flight)
      wasAssigned = previousAssignment?.name !== undefined && previousAssignment.name !== ""
      isNewAssignment = name !== undefined && name !== "" && (!wasAssigned || previousAssignment?.name !== name)
      
      const exists = prev.some((fa) => fa.flight === flight)
      if (exists) {
        return prev.map((fa) => (fa.flight === flight ? { ...fa, name } : fa))
      }
      // If assignment doesn't exist, find the load plan and create assignment
      const plan = loadPlans.find((p) => p.flight === flight)
      if (plan) {
        return [
          ...prev,
          {
            flight: plan.flight,
            std: plan.std,
            originDestination: parseOriginDestination(plan.pax),
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
          originDestination: "DXB-???",
          name,
          sector: "E75",
        },
      ]
    })

    // Sync assignment to Supabase for mobile app (bup_allocations table)
    if (name) {
      try {
        await syncAssignmentToSupabase(flight, name)
      } catch (error) {
        console.error("[LoadPlan] Error syncing assignment to Supabase:", error)
      }
    }

    // Sync assigned_to and assigned_by to load_plans table
    // Only update if assignedToStaffNo is provided (assignedByStaffNo can be undefined/null if no login)
    if (assignedToStaffNo) {
      try {
        // Fetch names for logging
        const assignedToStaff = await findStaffByStaffNo(assignedToStaffNo)
        const assignedByStaff = assignedByStaffNo ? await findStaffByStaffNo(assignedByStaffNo) : null
        
        const assignedToName = assignedToStaff?.name || `Staff No ${assignedToStaffNo}`
        const assignedByName = assignedByStaff?.name || (assignedByStaffNo ? `Staff No ${assignedByStaffNo}` : "No login")
        
        console.log(`[LoadPlan] ${flight} is assigned to ${assignedToName} (Staff No: ${assignedToStaffNo}), assigned by ${assignedByName}${assignedByStaffNo ? ` (Staff No: ${assignedByStaffNo})` : ""}`)
        
        const result = await updateLoadPlanAssignment(flight, assignedToStaffNo, assignedByStaffNo || 0)
        if (!result.success) {
          console.error(`[LoadPlan] Failed to update load_plans:`, result.error)
        }
      } catch (error) {
        console.error("[LoadPlan] Error syncing assignment:", error)
      }
    }

    // Notify staff member when load plan is assigned to them
    if (isNewAssignment && name) {
      try {
        const staff = await findStaffByName(name)
        if (staff && staff.staff_no) {
          const plan = loadPlans.find((p) => p.flight === flight)
          addNotification({
            type: "load_plan_assigned",
            flight: flight,
            staffNo: staff.staff_no,
            title: "Load Plan Assigned",
            message: `You have been assigned to flight ${flight}${plan ? ` (STD: ${plan.std})` : ""}.`,
          })
        }
      } catch (error) {
        console.error("[LoadPlan] Error notifying staff:", error)
      }
    }
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
        return [
          ...prev,
          {
            flight: plan.flight,
            std: plan.std,
            originDestination: parseOriginDestination(plan.pax),
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
          originDestination: "DXB-???",
          name: "",
          sector: sector || "E75",
        },
      ]
    })
  }

  const sendToFlightAssignment = async (flight: string) => {
    // Helper to extract numeric flight number for normalized comparison
    const extractFlightNum = (f: string): number => {
      const match = f.match(/EK0?(\d+)/i)
      return match ? parseInt(match[1], 10) : 0
    }
    
    const targetFlightNum = extractFlightNum(flight)
    console.log(`[LoadPlan] sendToFlightAssignment called for flight: ${flight}, normalized: ${targetFlightNum}`)
    
    // Clear the name assignment to send it back to flight assignment for reassignment
    setFlightAssignments((prev) => {
      console.log(`[LoadPlan] Checking ${prev.length} flight assignments to clear`)
      return prev.map((fa) => {
        const faFlightNum = extractFlightNum(fa.flight)
        if (faFlightNum === targetFlightNum) {
          console.log(`[LoadPlan] Clearing name for flight ${fa.flight} (was: ${fa.name})`)
          return { ...fa, name: "" }
        }
        return fa
      })
    })
    
    // Also clear the staff in bupAllocations
    const flightNo = flight.replace(/^EK0?/, "")
    setBupAllocations((prev) => {
      console.log(`[LoadPlan] Checking ${prev.length} BUP allocations to clear`)
      return prev.map((a) => {
        // Match flight number with or without leading zeros
        const allocFlightNo = a.flightNo.replace(/^0+/, "")
        const targetFlightNo = flightNo.replace(/^0+/, "")
        if (allocFlightNo === targetFlightNo) {
          console.log(`[LoadPlan] Clearing staff for BUP allocation ${a.flightNo} (was: ${a.staff})`)
          return { ...a, staff: "", mobile: "" }
        }
        return a
      })
    })
    
    // Sync unassignment to Supabase
    try {
      await syncUnassignmentToSupabase(flight)
    } catch (error) {
      console.error("[LoadPlan] Error syncing unassignment to Supabase:", error)
    }
  }

  const getFlightsByStaff = (staffName: string) => {
    const normalized = staffName.toLowerCase()
    const assignedFlights = flightAssignments.filter((fa) => fa.name.toLowerCase() === normalized)
    
    console.log(`[LoadPlan] getFlightsByStaff("${staffName}") - found ${assignedFlights.length} assignments:`, 
      assignedFlights.map(fa => ({ flight: fa.flight, name: fa.name }))
    )

    // Helper to extract numeric flight number for comparison
    const extractFlightNum = (flight: string): number => {
      const match = flight.match(/EK0?(\d+)/i)
      return match ? parseInt(match[1], 10) : 0
    }

    const loadPlanMatches = loadPlans.filter((plan) => {
      const planNum = extractFlightNum(plan.flight)
      return assignedFlights.some((fa) => extractFlightNum(fa.flight) === planNum)
    })

    // Include assignments that don't have a load plan by synthesizing minimal rows
    const missingFlights = assignedFlights
      .filter((fa) => {
        const faNum = extractFlightNum(fa.flight)
        return !loadPlans.some((lp) => extractFlightNum(lp.flight) === faNum)
      })
      .map<LoadPlan>((fa) => ({
        flight: fa.flight,
        date: "",
        acftType: fa.sector || "",
        acftReg: "",
        pax: fa.originDestination || "",
        std: fa.std || "",
        uldVersion: "",
        ttlPlnUld: "",
      }))

    return [...loadPlanMatches, ...missingFlights]
  }

  const addSentBCR = (bcr: SentBCR) => {
    setSentBCRs((prev) => {
      // Check if BCR already exists for this flight, replace it
      const existingIndex = prev.findIndex((b) => b.flight === bcr.flight)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = bcr
        return updated
      }
      return [...prev, bcr]
    })
  }

  const addBupAllocation = (allocation: BUPAllocation) => {
    setBupAllocations((prev) => {
      // Check if allocation already exists for this flight, replace it
      const existingIndex = prev.findIndex((a) => a.flightNo === allocation.flightNo)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = allocation
        return updated
      }
      return [...prev, allocation]
    })
    
    // Auto-sync to flight assignments when BUP allocation is added
    if (allocation.flightNo) {
      const flightNumber = `EK${allocation.flightNo}`
      // Parse routing - could be "DXB-MXP", "DXBMXP", or just destination "MXP"
      let originDestination = "DXB-???"
      if (allocation.routing) {
        if (allocation.routing.includes("-")) {
          // Already in correct format
          originDestination = allocation.routing
        } else if (/^[A-Z]{6}$/.test(allocation.routing)) {
          // Concatenated format: "DXBMXP"
          originDestination = `${allocation.routing.slice(0, 3)}-${allocation.routing.slice(3, 6)}`
        } else if (/^[A-Z]{3}$/.test(allocation.routing)) {
          // Just destination: "MXP"
          originDestination = `DXB-${allocation.routing}`
        } else {
          originDestination = parseOriginDestination(allocation.routing)
        }
      }
      
      setFlightAssignments((prev) => {
        const exists = prev.some((fa) => fa.flight === flightNumber)
        if (!exists) {
          return [
            ...prev,
            {
              flight: flightNumber,
              std: allocation.etd,
              originDestination,
              name: allocation.staff.toLowerCase(),
              sector: allocation.acType || "",
            },
          ]
        }
        // Update existing assignment if staff is provided
        if (allocation.staff) {
          return prev.map((fa) =>
            fa.flight === flightNumber
              ? { ...fa, name: allocation.staff.toLowerCase() }
              : fa
          )
        }
        return prev
      })
    }
  }

  const updateBupAllocationStaff = async (flightNo: string, staff: string, mobile: string) => {
    setBupAllocations((prev) =>
      prev.map((a) =>
        a.flightNo === flightNo ? { ...a, staff, mobile } : a
      )
    )
    
    // Sync to Supabase
    try {
      await syncBupAllocationStaffToSupabase(flightNo, staff, mobile)
    } catch (error) {
      console.error("[LoadPlan] Error syncing BUP allocation staff to Supabase:", error)
    }
    
    // Also update flight assignment
    const flightNumber = `EK${flightNo}`
    updateFlightAssignment(flightNumber, staff.toLowerCase())
  }
  
  /**
   * Sync BUP allocation staff update to Supabase
   */
  async function syncBupAllocationStaffToSupabase(flightNo: string, staff: string, mobile: string): Promise<void> {
    try {
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log("[LoadPlan] Supabase not configured, skipping sync")
        return
      }

      const supabase = createClient()
      
      // Update the staff and mobile fields
      const { error } = await supabase
        .from("bup_allocations")
        .update({
          staff,
          mobile,
          updated_at: new Date().toISOString()
        })
        .eq("flight_no", flightNo)
      
      if (error) {
        console.error("[LoadPlan] Error updating BUP allocation staff in Supabase:", error)
      } else {
        console.log(`[LoadPlan] Updated BUP allocation staff for flight ${flightNo} to ${staff} in Supabase`)
      }
    } catch (error) {
      console.error("[LoadPlan] Error syncing BUP allocation staff to Supabase:", error)
    }
  }

  return (
    <LoadPlanContext.Provider
      value={{
        loadPlans,
        flightAssignments,
        sentBCRs,
        bupAllocations,
        setLoadPlans,
        addLoadPlan,
        updateFlightAssignment,
        updateFlightAssignmentSector,
        sendToFlightAssignment,
        getFlightsByStaff,
        addSentBCR,
        setBupAllocations,
        addBupAllocation,
        updateBupAllocationStaff,
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

