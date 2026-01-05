import { createClient } from "@/lib/supabase/client"
import type { LoadPlan } from "@/lib/load-plan-context"
import type { LoadPlanDetail } from "@/components/load-plan-types"

/**
 * Dubai/GST timezone constant (UTC+4)
 * All date displays in the app use this timezone
 */
const DISPLAY_TIMEZONE = "Asia/Dubai"

/**
 * Get date parts in Dubai timezone
 * Returns day, month, year, hours, minutes, seconds in GST
 */
function getDatePartsInDubai(date: Date): {
  day: number
  month: number
  year: number
  hours: number
  minutes: number
  seconds: number
} {
  // Use Intl.DateTimeFormat to get parts in Dubai timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  
  const parts = formatter.formatToParts(date)
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0", 10)
  
  return {
    day: getPart("day"),
    month: getPart("month") - 1, // Convert to 0-indexed for consistency with Date.getMonth()
    year: getPart("year"),
    hours: getPart("hour"),
    minutes: getPart("minute"),
    seconds: getPart("second"),
  }
}

/**
 * Format date from YYYY-MM-DD to DDMMM format (e.g., "2024-10-12" -> "12Oct")
 * Displays in Dubai/GST timezone
 */
function formatDateForDisplay(dateStr: string | null): string {
  if (!dateStr) return ""
  
  try {
    const date = new Date(dateStr)
    const { day, month } = getDatePartsInDubai(date)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return `${day}${monthNames[month]}`
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
 * Displays in Dubai/GST timezone
 */
function formatDateTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return ""
  
  try {
    const date = new Date(dateTimeStr)
    const { day, month, year, hours, minutes, seconds } = getDatePartsInDubai(date)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const yearStr = year.toString().substring(2)
    return `${day}-${monthNames[month]}-${yearStr} ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  } catch {
    return dateTimeStr
  }
}

/**
 * Format arrival date time to display format (e.g., "12Oct2024 13:29/")
 * Displays in Dubai/GST timezone
 */
function formatArrivalDateTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return ""
  
  try {
    const date = new Date(dateTimeStr)
    const { day, month, year, hours, minutes } = getDatePartsInDubai(date)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return `${day.toString().padStart(2, "0")}${monthNames[month]}${year} ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}/`
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

    // Fetch load plans with their items' work_areas
    const { data: loadPlans, error } = await supabase
      .from("load_plans")
      .select(`
        *,
        load_plan_items(work_areas)
      `)
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
      
      // Aggregate unique work areas from items
      const itemWorkAreas = (plan.load_plan_items || [])
        .map((item: { work_areas: string | null }) => item.work_areas)
        .filter((wa: string | null): wa is string => wa !== null && wa !== undefined)
      const uniqueWorkAreas = Array.from(new Set(itemWorkAreas))
      
      return {
        flight: plan.flight_number || "",
        date: formatDateForDisplay(plan.flight_date),
        acftType: plan.aircraft_type || "",
        acftReg: plan.aircraft_registration || "",
        pax,
        std: formatTime(plan.std_time),
        uldVersion: plan.uld_version || "",
        ttlPlnUld: plan.total_planned_uld || "",
        adjustedTtlPlnUld: plan.adjusted_ttl_pln_uld || undefined,
        workAreas: uniqueWorkAreas.length > 0 ? uniqueWorkAreas : ["GCR"], // Default to GCR if no items
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
      // Log full error object for debugging
      console.error("[LoadPlans] Error fetching load plan detail:", JSON.stringify(loadPlanError, null, 2))
      console.error("[LoadPlans] Flight number queried:", flightNumber)
      console.error("[LoadPlans] Error details:", {
        code: loadPlanError?.code,
        message: loadPlanError?.message,
        details: loadPlanError?.details,
        hint: loadPlanError?.hint
      })
      
      // Check if it's a "no rows found" error (common with .single())
      if (loadPlanError?.code === 'PGRST116') {
        console.log(`[LoadPlans] No load plan found for flight: ${flightNumber}`)
        return null
      }
      
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
    
    // Keep sectors in original order (by sector name)
    // Red items (additional_data = true) will be sorted to top WITHIN each sector, not by sector
    const sortedSectorEntries = Array.from(sectorMap.entries()).sort((a, b) => {
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
      
      // Helper function to get total ULD count from ULD string
      // E.g., "XX 01PMC XX" → 1, "XX 02PMC XX" → 2, "XX 01PMC/02AKE XX" → 3, "XX 6RAP XX" → 6
      // Flexible pattern auto-captures new ULD types without code changes
      const getUldTotalCount = (uld: string): number => {
        if (!uld) return 0
        // Pattern: digits + any 2-4 letter type, or BULK
        const uldPattern = /(\d{1,2})([A-Z]{2,4})|\b(BULK)\b/gi
        let total = 0
        let match
        while ((match = uldPattern.exec(uld)) !== null) {
          // match[1] = digits for regular ULDs, match[3] = "BULK"
          const count = match[3] ? 1 : (parseInt(match[1], 10) || 1)
          total += count
        }
        return total || 1
      }
      
      // Process regular items for this sector - group by CONSECUTIVE items with same ULD
      // IMPORTANT: We must NOT merge items with same ULD string if they appear in separate sections
      // E.g., AWB 001 with "XX 01PMC XX" and AWB 002 with "XX 01PMC XX" should be SEPARATE sections
      // 
      // Key heuristic: For ULDs with exactly 1 unit (e.g., "01PMC"), each AWB gets its own section
      // because in the original load plan, each "XX 01PMC XX" line after an AWB means that AWB
      // is in its own 1-PMC section. For ULDs with multiple units (e.g., "02PMC"), multiple AWBs
      // share that section.
      const sectorRegularUldGroups: Array<{ uld: string; awbs: any[] }> = []
      let currentUldGroup: { uld: string; awbs: any[]; isSingleUnit: boolean } | null = null
      
      sectorRegularItems.forEach((item: any) => {
        const uld = item.uld_allocation || ""
        const uldCount = getUldTotalCount(uld)
        const isSingleUnit = uldCount === 1
        
        // Check if this item should start a new ULD group
        // A new group starts when:
        // 1. No current group exists, OR
        // 2. The ULD string is different from current group, OR
        // 3. Current ULD is single-unit (count=1), meaning each AWB has its own section, OR
        // 4. This is an additional_data item (red item) that should be grouped separately
        const isAdditional = item.additional_data === true
        const currentIsAdditional = currentUldGroup && currentUldGroup.awbs.length > 0 && 
          currentUldGroup.awbs[0].additional_data === true
        
        const shouldStartNewGroup = !currentUldGroup || 
          currentUldGroup.uld !== uld ||
          currentUldGroup.isSingleUnit || // Single-unit ULDs always start new section per AWB
          (isAdditional !== currentIsAdditional) // Separate red items from black items
        
        if (shouldStartNewGroup) {
          // Start a new group
          currentUldGroup = { uld, awbs: [item], isSingleUnit }
          sectorRegularUldGroups.push(currentUldGroup)
        } else {
          // Add to current group
          currentUldGroup.awbs.push(item)
        }
      })
      
      // Sort ULD sections: additional_data DESC (red on top), then by first serial_number
      sectorRegularUldGroups
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
              uldNumber: item.uld_number || "",
              connTime: item.conn_time || "0",
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
              uldNumber: item.uld_number || "",
              connTime: item.conn_time || "0",
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
      adjustedTtlPlnUld: loadPlan.adjusted_ttl_pln_uld || undefined,
      uldVersion: loadPlan.uld_version || "",
      preparedOn: formatDateTime(loadPlan.prepared_on),
      headerWarning: loadPlan.header_warning || undefined,
      isCritical: loadPlan.is_critical || undefined,
      revision: loadPlan.revision || 1,
      // ULD exclusion data for display
      courAllocation: loadPlan.cour_allocation || undefined,
      mailAllocation: loadPlan.mail_allocation || undefined,
      rampTransferUlds: loadPlan.ramp_transfer_ulds || undefined,
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
    console.log(`[LoadPlans] 🗑️ Deleting load plan ${flightNumber} with ID: ${loadPlanId}`)

    // Delete all uld_entries associated with this load plan first
    const { error: uldEntriesDeleteError } = await supabase
      .from("uld_entries")
      .delete()
      .eq("load_plan_id", loadPlanId)

    if (uldEntriesDeleteError) {
      console.warn("[LoadPlans] Warning deleting ULD entries (may not exist):", {
        code: uldEntriesDeleteError.code,
        message: uldEntriesDeleteError.message,
      })
      // Continue even if uld_entries deletion fails - table might not exist
    } else {
      console.log(`[LoadPlans] ✅ Deleted ULD entries for ${flightNumber}`)
    }

    // Delete all load_plan_items associated with this load plan
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

    console.log(`[LoadPlans] ✅ Deleted load plan items for ${flightNumber}`)

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

    console.log(`[LoadPlans] ✅ Successfully deleted load plan ${flightNumber} (ID: ${loadPlanId})`)
    return { success: true }
  } catch (error) {
    console.error("[LoadPlans] Error deleting load plan:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" }
  }
}

/**
 * Update assigned_to and assigned_by for a load plan in Supabase
 * @param flightNumber - Flight number (e.g., "EK0801" or "EK801")
 * @param assignedTo - staff_no of the operator (COA) being assigned
 * @param assignedBy - staff_no of the supervisor (CHS) making the assignment (0 or undefined means no login)
 */
export async function updateLoadPlanAssignment(
  flightNumber: string,
  assignedTo: number,
  assignedBy: number | undefined
): Promise<{ success: boolean; error?: string }> {
  try {
    const isSupabaseConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key"

    if (!isSupabaseConfigured) {
      console.log("[LoadPlans] Supabase not configured")
      return { success: false, error: "Supabase not configured" }
    }

    const supabase = createClient()
    const flightNo = flightNumber.replace(/^EK0?/, "")

    // Find the load plan first
    const { data: existing, error: findError } = await supabase
      .from("load_plans")
      .select("id, flight_number")
      .or(`flight_number.eq.${flightNumber},flight_number.eq.EK${flightNo},flight_number.eq.EK0${flightNo}`)
      .limit(1)
      .single()

    if (findError || !existing) {
      console.log(`[LoadPlans] No load plan found for ${flightNumber}`)
      return { success: false, error: "Load plan not found" }
    }

    // Update by ID - only update assigned_by if provided (user is logged in)
    const updateData: { assigned_to: number; assigned_by?: number | null } = {
      assigned_to: assignedTo,
    }
    
    // If assignedBy is provided and not 0, set it; otherwise leave it as null
    if (assignedBy && assignedBy !== 0) {
      updateData.assigned_by = assignedBy
    } else {
      updateData.assigned_by = null
    }

    const { error: updateError } = await supabase
      .from("load_plans")
      .update(updateData)
      .eq("id", existing.id)

    if (updateError) {
      console.error("[LoadPlans] Update error:", updateError.message)
      return { success: false, error: updateError.message }
    }

    console.log(`[LoadPlans] ✅ Updated load_plans for ${existing.flight_number}`)
    return { success: true }
  } catch (error) {
    console.error("[LoadPlans] Error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// BUP Allocation type for desktop
export type BUPAllocationFromSupabase = {
  carrier: string
  flightNo: string
  etd: string
  routing: string
  staff: string
  mobile: string
  acType: string
  regnNo: string
  shiftType?: string
  period?: string
  wave?: string | null
  date?: string | null
}

/**
 * Fetch BUP allocations from Supabase
 * Used to load persisted flight assignments on app startup
 */
export async function getBupAllocationsFromSupabase(): Promise<BUPAllocationFromSupabase[]> {
  try {
    const isSupabaseConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key"

    if (!isSupabaseConfigured) {
      console.log("[BupAllocations] Supabase not configured, returning empty array")
      return []
    }

    const supabase = createClient()
    
    const { data: allocations, error } = await supabase
      .from("bup_allocations")
      .select("*")
      .order("etd", { ascending: true })

    if (error) {
      console.error("[BupAllocations] Error fetching allocations:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return []
    }

    if (!allocations || allocations.length === 0) {
      console.log("[BupAllocations] No BUP allocations found in database")
      return []
    }

    // Transform to BUPAllocationFromSupabase format
    const transformed: BUPAllocationFromSupabase[] = allocations.map((alloc: any) => ({
      carrier: alloc.carrier || "EK",
      flightNo: alloc.flight_no || "",
      etd: alloc.etd || "",
      routing: alloc.routing || "",
      staff: alloc.staff || "",
      mobile: alloc.mobile || "",
      acType: alloc.ac_type || alloc.aircraft_type || "",
      regnNo: alloc.regn_no || alloc.aircraft_registration || "",
      shiftType: alloc.shift_type,
      period: alloc.period,
      wave: alloc.wave,
      date: alloc.date || alloc.flight_date,
    }))

    console.log(`[BupAllocations] Successfully fetched ${transformed.length} BUP allocations from Supabase`)
    return transformed
  } catch (error) {
    console.error("[BupAllocations] Error fetching BUP allocations:", error)
    return []
  }
}

