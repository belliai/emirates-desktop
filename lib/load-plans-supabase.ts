import { createClient } from "@/lib/supabase/client"
import type { LoadPlan } from "@/lib/load-plan-context"
import type { LoadPlanDetail } from "@/components/load-plan-types"

/**
 * Format date from YYYY-MM-DD to DDMMM format (e.g., "2024-10-12" -> "12Oct")
 */
function formatDateForDisplay(dateStr: string | null): string {
  if (!dateStr) return ""
  
  try {
    const date = new Date(dateStr)
    const day = date.getDate()
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[date.getMonth()]
    return `${day}${month}`
  } catch {
    return dateStr
  }
}

/**
 * Format time from HH:MM:SS to HH:MM
 */
function formatTime(timeStr: string | null): string {
  if (!timeStr) return ""
  return timeStr.substring(0, 5) // Get HH:MM from HH:MM:SS
}

/**
 * Format datetime to display format (for prepared_on)
 */
function formatDateTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return ""
  
  try {
    const date = new Date(dateTimeStr)
    const day = date.getDate()
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear().toString().substring(2)
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const seconds = date.getSeconds().toString().padStart(2, "0")
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
  } catch {
    return dateTimeStr
  }
}

/**
 * Format arrival date time to display format (e.g., "12Oct0024 13:29/")
 */
function formatArrivalDateTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return ""
  
  try {
    const date = new Date(dateTimeStr)
    const day = date.getDate().toString().padStart(2, "0")
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear().toString()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `${day}${month}${year} ${hours}:${minutes}/`
  } catch {
    return dateTimeStr
  }
}

/**
 * Fetch load plans from Supabase
 */
export async function getLoadPlansFromSupabase(): Promise<LoadPlan[]> {
  try {
    // Check if Supabase is configured
    const isSupabaseConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key"

    if (!isSupabaseConfigured) {
      console.log("[LoadPlans] Supabase not configured, returning empty array")
      return []
    }

    const supabase = createClient()

    // Fetch load plans
    const { data: loadPlans, error } = await supabase
      .from("load_plans")
      .select("*")
      .order("flight_date", { ascending: false })
      .order("flight_number", { ascending: true })

    if (error) {
      console.error("[LoadPlans] Error fetching load plans:", error)
      return []
    }

    if (!loadPlans || loadPlans.length === 0) {
      console.log("[LoadPlans] No load plans found in database")
      return []
    }

    // Transform Supabase data to LoadPlan format
    const transformed: LoadPlan[] = loadPlans.map((plan) => {
      // Format pax: prefer route_full, otherwise use origin/destination
      let pax = ""
      if (plan.route_full) {
        pax = plan.route_full
      } else if (plan.route_origin && plan.route_destination) {
        pax = `${plan.route_origin}/${plan.route_destination}`
      }
      
      return {
        flight: plan.flight_number || "",
        date: formatDateForDisplay(plan.flight_date),
        acftType: plan.aircraft_type || "",
        acftReg: plan.aircraft_registration || "",
        pax,
        std: formatTime(plan.std_time),
        uldVersion: plan.uld_version || "",
        ttlPlnUld: plan.total_planned_uld || "",
      }
    })

    console.log(`[LoadPlans] Successfully fetched ${transformed.length} load plans from Supabase`)
    return transformed
  } catch (error) {
    console.error("[LoadPlans] Error fetching load plans:", error)
    return []
  }
}

/**
 * Fetch load plan detail from Supabase
 */
export async function getLoadPlanDetailFromSupabase(flightNumber: string): Promise<LoadPlanDetail | null> {
  try {
    // Check if Supabase is configured
    const isSupabaseConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key"

    if (!isSupabaseConfigured) {
      console.log("[LoadPlans] Supabase not configured, returning null")
      return null
    }

    const supabase = createClient()

    // Fetch load plan with items
    const { data: loadPlan, error: loadPlanError } = await supabase
      .from("load_plans")
      .select(`
        *,
        load_plan_items (*)
      `)
      .eq("flight_number", flightNumber)
      .order("flight_date", { ascending: false })
      .limit(1)
      .single()

    if (loadPlanError || !loadPlan) {
      console.error("[LoadPlans] Error fetching load plan detail:", loadPlanError)
      return null
    }

    // Group items by sector and ULD, and separate by ramp transfer
    const items = loadPlan.load_plan_items || []
    
    // Sort items by serial_number first
    const sortedItems = [...items].sort((a: any, b: any) => {
      const aSer = parseInt(a.serial_number) || 0
      const bSer = parseInt(b.serial_number) || 0
      return aSer - bSer
    })
    
    // Group by origin_destination (sector) and ramp transfer status
    const sectorMap = new Map<string, Map<string, Map<boolean, any[]>>>()
    
    sortedItems.forEach((item: any) => {
      const sector = item.origin_destination || "UNKNOWN"
      const uld = item.uld_allocation || ""
      // Check if item is ramp transfer from is_ramp_transfer field
      const isRampTransfer = item.is_ramp_transfer === true || item.is_ramp_transfer === 1
      
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, new Map())
      }
      
      const uldMap = sectorMap.get(sector)!
      if (!uldMap.has(uld)) {
        uldMap.set(uld, new Map())
      }
      
      const rampTransferMap = uldMap.get(uld)!
      if (!rampTransferMap.has(isRampTransfer)) {
        rampTransferMap.set(isRampTransfer, [])
      }
      
      rampTransferMap.get(isRampTransfer)!.push(item)
    })

    // Transform to LoadPlanDetail format - combine all sectors into one
    // Separate only by ramp transfer, not by sector
    const allRegularItems: any[] = []
    const allRampTransferItems: any[] = []
    
    // Collect all items and separate by ramp transfer status
    Array.from(sectorMap.entries()).forEach(([sector, sectorUldMap]) => {
      Array.from(sectorUldMap.entries()).forEach(([uld, rampTransferMap]) => {
        Array.from(rampTransferMap.entries()).forEach(([isRamp, items]) => {
          if (isRamp) {
            allRampTransferItems.push(...items)
          } else {
            allRegularItems.push(...items)
          }
        })
      })
    })
    
    // Create ULD sections - regular first, then ramp transfer
    const regularUldSections: any[] = []
    const rampTransferUldSections: any[] = []
    
    // Process regular items
    const regularUldMap = new Map<string, any[]>()
    allRegularItems.forEach((item: any) => {
      const uld = item.uld_allocation || ""
      if (!regularUldMap.has(uld)) {
        regularUldMap.set(uld, [])
      }
      regularUldMap.get(uld)!.push(item)
    })
    
    Array.from(regularUldMap.entries())
      .sort(([uldA], [uldB]) => {
        if (!uldA && !uldB) return 0
        if (!uldA) return -1
        if (!uldB) return 1
        return uldA.localeCompare(uldB)
      })
      .forEach(([uld, awbs]) => {
        const sortedAwbs = [...awbs].sort((a: any, b: any) => {
          const aSer = parseInt(a.serial_number) || 0
          const bSer = parseInt(b.serial_number) || 0
          return aSer - bSer
        })
        
        regularUldSections.push({
          uld: uld || "",
          awbs: sortedAwbs.map((item: any) => ({
              ser: item.serial_number?.toString().padStart(3, "0") || "",
              awbNo: item.awb_number || "",
              orgDes: item.origin_destination || "",
              pcs: item.pieces?.toString() || "",
              wgt: item.weight?.toString() || "",
              vol: item.volume?.toString() || "",
              lvol: item.load_volume?.toString() || "",
              shc: item.special_handling_code || "",
              manDesc: item.manual_description || "",
              pcode: item.product_code_pc || "",
              pc: "",
              thc: item.total_handling_charge ? item.total_handling_charge.toString() : "",
              bs: item.booking_status || "",
              pi: item.priority_indicator || "",
              fltin: item.flight_in || "",
              arrdtTime: item.arrival_date_time ? formatArrivalDateTime(item.arrival_date_time) : "",
              qnnAqnn: item.quantity_aqnn || "",
              whs: item.warehouse_code || "",
              si: item.special_instructions || "",
              // remarks field not available in database schema
            })),
          isRampTransfer: false,
        })
      })
    
    // Process ramp transfer items
    const rampTransferUldMap = new Map<string, any[]>()
    allRampTransferItems.forEach((item: any) => {
      const uld = item.uld_allocation || ""
      if (!rampTransferUldMap.has(uld)) {
        rampTransferUldMap.set(uld, [])
      }
      rampTransferUldMap.get(uld)!.push(item)
    })
    
    Array.from(rampTransferUldMap.entries())
      .sort(([uldA], [uldB]) => {
        if (!uldA && !uldB) return 0
        if (!uldA) return -1
        if (!uldB) return 1
        return uldA.localeCompare(uldB)
      })
      .forEach(([uld, awbs]) => {
        const sortedAwbs = [...awbs].sort((a: any, b: any) => {
          const aSer = parseInt(a.serial_number) || 0
          const bSer = parseInt(b.serial_number) || 0
          return aSer - bSer
        })
        
        rampTransferUldSections.push({
          uld: uld || "",
          awbs: sortedAwbs.map((item: any) => ({
              ser: item.serial_number?.toString().padStart(3, "0") || "",
              awbNo: item.awb_number || "",
              orgDes: item.origin_destination || "",
              pcs: item.pieces?.toString() || "",
              wgt: item.weight?.toString() || "",
              vol: item.volume?.toString() || "",
              lvol: item.load_volume?.toString() || "",
              shc: item.special_handling_code || "",
              manDesc: item.manual_description || "",
              pcode: item.product_code_pc || "",
              pc: "",
              thc: item.total_handling_charge ? item.total_handling_charge.toString() : "",
              bs: item.booking_status || "",
              pi: item.priority_indicator || "",
              fltin: item.flight_in || "",
              arrdtTime: item.arrival_date_time ? formatArrivalDateTime(item.arrival_date_time) : "",
              qnnAqnn: item.quantity_aqnn || "",
              whs: item.warehouse_code || "",
              si: item.special_instructions || "",
              // remarks field not available in database schema
            })),
          isRampTransfer: true,
        })
      })
    
    // Combine all items for totals
    const allItems = [...allRegularItems, ...allRampTransferItems]
    const totals = {
      pcs: allItems.reduce((sum, item: any) => sum + (parseFloat(item.pieces) || 0), 0).toString(),
      wgt: allItems.reduce((sum, item: any) => sum + (parseFloat(item.weight) || 0), 0).toFixed(2),
      vol: allItems.reduce((sum, item: any) => sum + (parseFloat(item.volume) || 0), 0).toFixed(2),
      lvol: allItems.reduce((sum, item: any) => sum + (parseFloat(item.load_volume) || 0), 0).toFixed(2),
    }
    
    // Create single sector with all ULD sections (regular + ramp transfer)
    const sectors = [{
      sector: loadPlan.route_full || (loadPlan.route_origin && loadPlan.route_destination ? `${loadPlan.route_origin}${loadPlan.route_destination}` : "UNKNOWN"),
      uldSections: [...regularUldSections, ...rampTransferUldSections],
      totals,
    }]

    const detail: LoadPlanDetail = {
      flight: loadPlan.flight_number || "",
      date: formatDateForDisplay(loadPlan.flight_date),
      acftType: loadPlan.aircraft_type || "",
      acftReg: loadPlan.aircraft_registration || "",
      headerVersion: loadPlan.header_version?.toString() || "1",
      pax: loadPlan.route_full || (loadPlan.route_origin && loadPlan.route_destination ? `${loadPlan.route_origin}/${loadPlan.route_destination}` : ""),
      std: formatTime(loadPlan.std_time),
      preparedBy: loadPlan.prepared_by || "",
      ttlPlnUld: loadPlan.total_planned_uld || "",
      uldVersion: loadPlan.uld_version || "",
      preparedOn: formatDateTime(loadPlan.prepared_on),
      sectors,
    }

    console.log(`[LoadPlans] Successfully fetched load plan detail for ${flightNumber}`)
    return detail
  } catch (error) {
    console.error("[LoadPlans] Error fetching load plan detail:", error)
    return null
  }
}

