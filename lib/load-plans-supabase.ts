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
      console.error("[LoadPlans] Error fetching load plans:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      
      // Check if it's an RLS/permission error
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
        console.error("[LoadPlans] RLS Policy Error: Row Level Security is blocking SELECT queries")
        console.error("[LoadPlans] Fix: Go to Supabase Dashboard > Authentication > Policies")
        console.error("[LoadPlans] Create a policy that allows SELECT for the anon role")
      }
      
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

    // Fetch load plan first
    const { data: loadPlan, error: loadPlanError } = await supabase
      .from("load_plans")
      .select("*")
      .eq("flight_number", flightNumber)
      .order("flight_date", { ascending: false })
      .limit(1)
      .single()

    if (loadPlanError || !loadPlan) {
      console.error("[LoadPlans] Error fetching load plan detail:", {
        code: loadPlanError?.code,
        message: loadPlanError?.message,
        details: loadPlanError?.details,
        hint: loadPlanError?.hint
      })
      
      // Check if it's an RLS/permission error
      if (loadPlanError && (loadPlanError.code === '42501' || loadPlanError.message?.includes('permission denied') || loadPlanError.message?.includes('row-level security'))) {
        console.error("[LoadPlans] RLS Policy Error: Row Level Security is blocking SELECT queries")
        console.error("[LoadPlans] Fix: Go to Supabase Dashboard > Authentication > Policies")
        console.error("[LoadPlans] Create a policy that allows SELECT for the anon role")
      }
      
      return null
    }

    // Fetch load plan items from ALL revisions
    // Order by additional_data DESC (additional_data = true first/red on top), then by serial_number
    // Each item's additional_data field will be checked individually for styling (red if additional_data = true, black if false)
    const { data: items, error: itemsError } = await supabase
      .from("load_plan_items")
      .select("*")
      .eq("load_plan_id", loadPlan.id)
      .order("additional_data", { ascending: false }) // DESC: additional_data = true first (red on top)
      .order("serial_number", { ascending: true })

    if (itemsError) {
      console.error("[LoadPlans] Error fetching load plan items:", {
        code: itemsError.code,
        message: itemsError.message,
        details: itemsError.details,
        hint: itemsError.hint
      })
      
      // Check if it's an RLS/permission error
      if (itemsError.code === '42501' || itemsError.message?.includes('permission denied') || itemsError.message?.includes('row-level security')) {
        console.error("[LoadPlans] RLS Policy Error: Row Level Security is blocking SELECT queries")
        console.error("[LoadPlans] Fix: Go to Supabase Dashboard > Authentication > Policies")
        console.error("[LoadPlans] Create a policy that allows SELECT for the anon role")
      }
      
      return null
    }

    // Group items by sector and ULD, and separate by ramp transfer
    // IMPORTANT: Sort by additional_data DESC FIRST (red items on top), then by serial_number
    // This ensures items with additional_data = true appear first regardless of grouping
    const sortedItems = (items || []).sort((a: any, b: any) => {
      const aAdditional = a.additional_data === true
      const bAdditional = b.additional_data === true
      if (aAdditional !== bAdditional) {
        return bAdditional ? 1 : -1 // DESC: additional_data = true first (red on top)
      }
      const aSer = parseInt(a.serial_number) || 0
      const bSer = parseInt(b.serial_number) || 0
      return aSer - bSer // ASC: lower serial number first
    })
    
    // Group by origin_destination (sector) and ramp transfer status
    const sectorMap = new Map<string, Map<string, Map<boolean, any[]>>>()
    
    sortedItems.forEach((item: any) => {
      // Use sector column - if null, use "NULL_SECTOR" as temporary key
      // All null sectors will be grouped into 1 sector later
      const sector = item.sector || "NULL_SECTOR"
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
    
    // If there's a "NULL_SECTOR" (items with null sector), rename it to header sector or "UNKNOWN"
    // All null sectors should be in 1 sector together
    if (sectorMap.has("NULL_SECTOR")) {
      const nullSectorItems = sectorMap.get("NULL_SECTOR")!
      sectorMap.delete("NULL_SECTOR")
      // Use header sector name for items without sector, or "UNKNOWN" if not available
      const headerSector = loadPlan.sector || "UNKNOWN"
      if (!sectorMap.has(headerSector)) {
        sectorMap.set(headerSector, nullSectorItems)
      } else {
        // Merge with existing sector if it exists
        const existingSector = sectorMap.get(headerSector)!
        nullSectorItems.forEach((uldMap, uld) => {
          if (!existingSector.has(uld)) {
            existingSector.set(uld, new Map())
          }
          const existingRampMap = existingSector.get(uld)!
          uldMap.forEach((items, isRamp) => {
            if (!existingRampMap.has(isRamp)) {
              existingRampMap.set(isRamp, [])
            }
            existingRampMap.get(isRamp)!.push(...items)
          })
        })
      }
    }

    // Transform to LoadPlanDetail format - GROUP BY SECTOR
    // Each sector should have its own ULD sections
    const sectors: any[] = []
    
    // CRITICAL: Sort sectors by additional_data first (sectors with red items on top)
    // This ensures all red items (additional_data = true) appear at the top of the entire table
    const sortedSectorEntries = Array.from(sectorMap.entries()).sort((a, b) => {
      // Get all items from both sectors to check for additional_data
      const aAllItems: any[] = []
      const bAllItems: any[] = []
      
      Array.from(a[1].entries()).forEach(([uld, rampTransferMap]) => {
        Array.from(rampTransferMap.entries()).forEach(([isRamp, items]) => {
          aAllItems.push(...items)
        })
      })
      
      Array.from(b[1].entries()).forEach(([uld, rampTransferMap]) => {
        Array.from(rampTransferMap.entries()).forEach(([isRamp, items]) => {
          bAllItems.push(...items)
        })
      })
      
      const aHasAdditional = aAllItems.some(item => item.additional_data === true || item.additional_data === 1)
      const bHasAdditional = bAllItems.some(item => item.additional_data === true || item.additional_data === 1)
      
      // Sort by additional_data DESC first (sectors with additional_data = true/red items on top)
      if (aHasAdditional !== bHasAdditional) {
        return bHasAdditional ? 1 : -1 // Sectors with red items first
      }
      
      // If both have or don't have additional_data, check count of items with additional_data = true
      const aRedCount = aAllItems.filter(item => item.additional_data === true || item.additional_data === 1).length
      const bRedCount = bAllItems.filter(item => item.additional_data === true || item.additional_data === 1).length
      if (aRedCount !== bRedCount) {
        return bRedCount - aRedCount // More red items first
      }
      
      // If same additional_data status and red count, preserve original order (by sector name)
      return a[0].localeCompare(b[0])
    })
    
    // Process each sector separately (now sorted by additional_data)
    sortedSectorEntries.forEach(([sectorName, sectorUldMap]) => {
      // Separate items by ramp transfer status for this sector
      const sectorRegularItems: any[] = []
      const sectorRampTransferItems: any[] = []
      
      Array.from(sectorUldMap.entries()).forEach(([uld, rampTransferMap]) => {
        Array.from(rampTransferMap.entries()).forEach(([isRamp, items]) => {
          if (isRamp) {
            sectorRampTransferItems.push(...items)
          } else {
            sectorRegularItems.push(...items)
          }
        })
      })
      
      // Sort items by additional_data DESC (true first/red on top), then by serial_number ASC
      sectorRegularItems.sort((a: any, b: any) => {
        const aAdditional = a.additional_data === true
        const bAdditional = b.additional_data === true
        if (aAdditional !== bAdditional) {
          return bAdditional ? 1 : -1 // DESC: additional_data = true first (red on top)
        }
        const aSer = parseInt(a.serial_number) || 0
        const bSer = parseInt(b.serial_number) || 0
        return aSer - bSer // ASC: lower serial number first
      })
      
      sectorRampTransferItems.sort((a: any, b: any) => {
        const aAdditional = a.additional_data === true
        const bAdditional = b.additional_data === true
        if (aAdditional !== bAdditional) {
          return bAdditional ? 1 : -1 // DESC: additional_data = true first (red on top)
        }
        const aSer = parseInt(a.serial_number) || 0
        const bSer = parseInt(b.serial_number) || 0
        return aSer - bSer // ASC: lower serial number first
      })
      
      // Create ULD sections for this sector - regular first, then ramp transfer
      const sectorRegularUldSections: any[] = []
      const sectorRampTransferUldSections: any[] = []
      
      // Process regular items for this sector - group by ULD but maintain serial number order
      const sectorRegularUldMap = new Map<string, any[]>()
      sectorRegularItems.forEach((item: any) => {
        const uld = item.uld_allocation || ""
        if (!sectorRegularUldMap.has(uld)) {
          sectorRegularUldMap.set(uld, [])
        }
        sectorRegularUldMap.get(uld)!.push(item)
      })
      
      // Sort ULD sections by additional_data DESC (red on top), then by first serial_number
      Array.from(sectorRegularUldMap.entries())
        .map(([uld, awbs]) => {
          // Sort awbs within ULD section by additional_data DESC (red on top), then by serial_number ASC
          const sortedAwbs = [...awbs].sort((a: any, b: any) => {
            const aAdditional = a.additional_data === true
            const bAdditional = b.additional_data === true
            if (aAdditional !== bAdditional) {
              return bAdditional ? 1 : -1 // DESC: additional_data = true first (red on top)
            }
            const aSer = parseInt(a.serial_number) || 0
            const bSer = parseInt(b.serial_number) || 0
            return aSer - bSer // ASC: lower serial number first
          })
          return { uld, awbs: sortedAwbs }
        })
        .sort((a, b) => {
          // Sort ULD sections by first item's additional_data DESC (red on top), then by first serial_number
          if (a.awbs.length > 0 && b.awbs.length > 0) {
            const aFirstAdditional = a.awbs[0].additional_data === true
            const bFirstAdditional = b.awbs[0].additional_data === true
            if (aFirstAdditional !== bFirstAdditional) {
              return bFirstAdditional ? 1 : -1 // DESC: additional_data = true first (red on top)
            }
          }
          const aFirstSer = a.awbs.length > 0 ? (parseInt(a.awbs[0].serial_number) || 0) : 0
          const bFirstSer = b.awbs.length > 0 ? (parseInt(b.awbs[0].serial_number) || 0) : 0
          return aFirstSer - bFirstSer
        })
        .forEach(({ uld, awbs }) => {
          sectorRegularUldSections.push({
            uld: uld || "",
            awbs: awbs.map((item: any) => ({
              ser: item.serial_number?.toString().padStart(3, "0") || "",
              awbNo: (item.awb_number || "").replace(/\s+/g, ""),
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
              remarks: item.special_notes || undefined,
              revision: item.revision !== null && item.revision !== undefined ? Number(item.revision) : 1, // Store revision from load_plan_items table (each item has its own revision)
              additional_data: item.additional_data === true || item.additional_data === 1, // Store additional_data flag (true = new item, false = original)
            })),
            isRampTransfer: false,
          })
        })
      
      // Process ramp transfer items for this sector - group by ULD but maintain serial number order
      const sectorRampTransferUldMap = new Map<string, any[]>()
      sectorRampTransferItems.forEach((item: any) => {
        const uld = item.uld_allocation || ""
        if (!sectorRampTransferUldMap.has(uld)) {
          sectorRampTransferUldMap.set(uld, [])
        }
        sectorRampTransferUldMap.get(uld)!.push(item)
      })
      
      // Sort ULD sections by additional_data DESC (red on top), then by first serial_number
      Array.from(sectorRampTransferUldMap.entries())
        .map(([uld, awbs]) => {
          // Sort awbs within ULD section by additional_data DESC (red on top), then by serial_number ASC
          const sortedAwbs = [...awbs].sort((a: any, b: any) => {
            const aAdditional = a.additional_data === true
            const bAdditional = b.additional_data === true
            if (aAdditional !== bAdditional) {
              return bAdditional ? 1 : -1 // DESC: additional_data = true first (red on top)
            }
            const aSer = parseInt(a.serial_number) || 0
            const bSer = parseInt(b.serial_number) || 0
            return aSer - bSer // ASC: lower serial number first
          })
          return { uld, awbs: sortedAwbs }
        })
        .sort((a, b) => {
          // Sort ULD sections by first item's additional_data DESC (red on top), then by first serial_number
          if (a.awbs.length > 0 && b.awbs.length > 0) {
            const aFirstAdditional = a.awbs[0].additional_data === true
            const bFirstAdditional = b.awbs[0].additional_data === true
            if (aFirstAdditional !== bFirstAdditional) {
              return bFirstAdditional ? 1 : -1 // DESC: additional_data = true first (red on top)
            }
          }
          const aFirstSer = a.awbs.length > 0 ? (parseInt(a.awbs[0].serial_number) || 0) : 0
          const bFirstSer = b.awbs.length > 0 ? (parseInt(b.awbs[0].serial_number) || 0) : 0
          return aFirstSer - bFirstSer
        })
        .forEach(({ uld, awbs }) => {
          sectorRampTransferUldSections.push({
            uld: uld || "",
            awbs: awbs.map((item: any) => ({
              ser: item.serial_number?.toString().padStart(3, "0") || "",
              awbNo: (item.awb_number || "").replace(/\s+/g, ""),
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
              remarks: item.special_notes || undefined,
              revision: item.revision !== null && item.revision !== undefined ? Number(item.revision) : 1, // Store revision from load_plan_items table (each item has its own revision)
              additional_data: item.additional_data === true || item.additional_data === 1, // Store additional_data flag (true = new item, false = original)
            })),
            isRampTransfer: true,
          })
        })
      
      // Calculate totals for this sector
      const sectorAllItems = [...sectorRegularItems, ...sectorRampTransferItems]
      const sectorTotals = {
        pcs: sectorAllItems.reduce((sum, item: any) => sum + (parseFloat(item.pieces) || 0), 0).toString(),
        wgt: sectorAllItems.reduce((sum, item: any) => sum + (parseFloat(item.weight) || 0), 0).toFixed(2),
        vol: sectorAllItems.reduce((sum, item: any) => sum + (parseFloat(item.volume) || 0), 0).toFixed(2),
        lvol: sectorAllItems.reduce((sum, item: any) => sum + (parseFloat(item.load_volume) || 0), 0).toFixed(2),
      }
      
      // Add this sector to sectors array
      sectors.push({
        sector: sectorName,
        uldSections: [...sectorRegularUldSections, ...sectorRampTransferUldSections],
        totals: sectorTotals,
      })
    })
    
    // Log sectors for debugging
    console.log(`[LoadPlans] Grouped into ${sectors.length} sector(s):`, sectors.map(s => ({
      sector: s.sector,
      uldSections: s.uldSections.length,
      totalItems: s.uldSections.reduce((sum: number, u: any) => sum + (u.awbs?.length || 0), 0)
    })))

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
      headerWarning: loadPlan.header_warning || undefined,
      isCritical: loadPlan.is_critical || undefined,
      revision: loadPlan.revision || 1,
      sectors,
    }

    console.log(`[LoadPlans] Successfully fetched load plan detail for ${flightNumber}`)
    return detail
  } catch (error) {
    console.error("[LoadPlans] Error fetching load plan detail:", error)
    return null
  }
}

/**
 * Delete load plan and its items from Supabase
 * This will delete all load_plan_items associated with the load plan, then delete the load plan itself
 */
export async function deleteLoadPlanFromSupabase(flightNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if Supabase is configured
    const isSupabaseConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key"

    if (!isSupabaseConfigured) {
      console.log("[LoadPlans] Supabase not configured, cannot delete")
      return { success: false, error: "Supabase not configured" }
    }

    const supabase = createClient()

    // First, find the load plan to get its ID
    const { data: loadPlan, error: loadPlanError } = await supabase
      .from("load_plans")
      .select("id")
      .eq("flight_number", flightNumber)
      .order("flight_date", { ascending: false })
      .limit(1)
      .single()

    if (loadPlanError || !loadPlan) {
      console.error("[LoadPlans] Error finding load plan to delete:", {
        code: loadPlanError?.code,
        message: loadPlanError?.message,
      })
      return { success: false, error: loadPlanError?.message || "Load plan not found" }
    }

    const loadPlanId = loadPlan.id

    // Delete all load_plan_items associated with this load plan first
    const { error: itemsDeleteError } = await supabase
      .from("load_plan_items")
      .delete()
      .eq("load_plan_id", loadPlanId)

    if (itemsDeleteError) {
      console.error("[LoadPlans] Error deleting load plan items:", {
        code: itemsDeleteError.code,
        message: itemsDeleteError.message,
      })
      return { success: false, error: `Failed to delete load plan items: ${itemsDeleteError.message}` }
    }

    console.log(`[LoadPlans] Successfully deleted load plan items for ${flightNumber}`)

    // Now delete the load plan itself
    const { error: loadPlanDeleteError } = await supabase
      .from("load_plans")
      .delete()
      .eq("id", loadPlanId)

    if (loadPlanDeleteError) {
      console.error("[LoadPlans] Error deleting load plan:", {
        code: loadPlanDeleteError.code,
        message: loadPlanDeleteError.message,
      })
      return { success: false, error: `Failed to delete load plan: ${loadPlanDeleteError.message}` }
    }

    console.log(`[LoadPlans] Successfully deleted load plan ${flightNumber}`)
    return { success: true }
  } catch (error) {
    console.error("[LoadPlans] Error deleting load plan:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" }
  }
}

