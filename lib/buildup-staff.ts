import { createClient } from "@/lib/supabase/client"

/**
 * BuildupStaff type matching Supabase buildup_staff_list table
 * Schema:
 * - employee_group: text
 * - contract_id: text
 * - shift_pattern: text
 * - staff_no: bigint (primary key)
 * - name: text
 * - job_code: text ("COA" for operators, "CHS" for supervisors)
 */
export type BuildupStaff = {
  employee_group: string | null
  contract_id: string | null
  shift_pattern: string | null
  staff_no: number
  name: string | null
  job_code: string | null
}

/**
 * Parsed staff name with first name and last name separated
 */
export type ParsedStaffName = {
  firstName: string      // e.g., "John Kimani" - the part BEFORE the comma (first to appear in cell)
  lastName: string       // e.g., "Muchiri" - everything AFTER the comma  
  displayName: string    // e.g., "John Kimani" - short display (firstName only)
  fullName: string       // e.g., "John Kimani Muchiri" - for tooltips/search
  searchName: string     // e.g., "john kimani muchiri" - lowercase for search
}

/**
 * Parse the name from "FIRSTNAME, LASTNAME" format (as it appears in the cell)
 * Example: "JOHN KIMANI, MUCHIRI" -> firstName="John", lastName="Kimani Muchiri"
 * Example: "ROOSEVELT, DSOUZA" -> firstName="Roosevelt", lastName="Dsouza"
 */
export function parseStaffName(rawName: string | null): ParsedStaffName {
  if (!rawName) {
    return { firstName: "", lastName: "", displayName: "", fullName: "", searchName: "" }
  }
  
  // Split by comma - format is "FIRSTNAME, LASTNAME"
  // firstName = first word before comma
  // lastName = everything after comma + remaining words before comma
  const parts = rawName.split(",").map(p => p.trim())
  
  if (parts.length >= 2) {
    const beforeComma = parts[0] // Everything before comma
    const afterComma = parts[1] // Everything after comma
    
    // Split before comma into words - first word is firstName, rest goes to lastName
    const beforeCommaWords = beforeComma.split(/\s+/).filter(w => w.length > 0)
    const firstNameRaw = beforeCommaWords[0] || ""
    const remainingBeforeComma = beforeCommaWords.slice(1).join(" ")
    
    // Combine remaining words before comma with after comma for lastName
    const lastNameRaw = [remainingBeforeComma, afterComma].filter(s => s.length > 0).join(" ")
    
    // Capitalize properly (first letter uppercase, rest lowercase for each word)
    const capitalize = (str: string) => 
      str.split(" ").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(" ")
    
    const firstName = capitalize(firstNameRaw)
    const lastName = capitalize(lastNameRaw)
    const fullName = `${firstName} ${lastName}`.trim()
    
    return {
      firstName,
      lastName,
      displayName: firstName, // Short display is just the first word
      fullName,
      searchName: fullName.toLowerCase()
    }
  }
  
  // If no comma, treat first word as first name, rest as last name
  const words = rawName.split(/\s+/).filter(w => w.length > 0)
  if (words.length > 0) {
    const firstNameRaw = words[0]
    const lastNameRaw = words.slice(1).join(" ")
    const capitalize = (str: string) => 
      str.split(" ").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(" ")
    
    const firstName = capitalize(firstNameRaw)
    const lastName = capitalize(lastNameRaw)
    const fullName = `${firstName} ${lastName}`.trim()
    
    return {
      firstName,
      lastName,
      displayName: firstName,
      fullName,
      searchName: fullName.toLowerCase()
    }
  }
  
  // Fallback: treat whole thing as first name
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase()
  return {
    firstName: name,
    lastName: "",
    displayName: name,
    fullName: name,
    searchName: name.toLowerCase()
  }
}

/**
 * Simple helper that returns just the display name (firstName - the part before comma)
 * For backwards compatibility
 */
export function parseStaffDisplayName(fullName: string | null): string {
  return parseStaffName(fullName).displayName
}

/**
 * Parse first name from the name field for matching with BUP allocation
 * Example: "JOHN KIMANI, MUCHIRI" -> "JOHN KIMANI"
 */
export function parseFirstNameForMatching(fullName: string): string {
  if (!fullName) return ""
  
  const parsed = parseStaffName(fullName)
  return parsed.firstName.toUpperCase()
}

/**
 * Check if Supabase is configured
 */
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key"
  )
}

/**
 * Fetch all buildup staff from Supabase
 */
export async function getAllBuildupStaff(): Promise<BuildupStaff[]> {
  try {
    if (!isSupabaseConfigured()) {
      console.log("[BuildupStaff] Supabase not configured, returning empty array")
      return []
    }

    const supabase = createClient()

    const { data: staff, error } = await supabase
      .from("buildup_staff_list")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      console.error("[BuildupStaff] Error fetching buildup staff:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
        console.error("[BuildupStaff] RLS Policy Error: Row Level Security is blocking SELECT queries")
      }
      
      return []
    }

    if (!staff || staff.length === 0) {
      console.log("[BuildupStaff] No buildup staff found in database")
      return []
    }

    console.log(`[BuildupStaff] Successfully fetched ${staff.length} buildup staff from Supabase`)
    return staff as BuildupStaff[]
  } catch (error) {
    console.error("[BuildupStaff] Error fetching buildup staff:", error)
    return []
  }
}

/**
 * Fetch supervisors (CHS job code) from Supabase
 */
export async function getSupervisors(): Promise<BuildupStaff[]> {
  try {
    if (!isSupabaseConfigured()) {
      console.log("[BuildupStaff] Supabase not configured, returning empty array")
      return []
    }

    const supabase = createClient()

    const { data: staff, error } = await supabase
      .from("buildup_staff_list")
      .select("*")
      .eq("job_code", "CHS")
      .order("name", { ascending: true })

    if (error) {
      console.error("[BuildupStaff] Error fetching supervisors:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return []
    }

    if (!staff || staff.length === 0) {
      console.log("[BuildupStaff] No supervisors found in database")
      return []
    }

    console.log(`[BuildupStaff] Successfully fetched ${staff.length} supervisors (CHS) from Supabase`)
    return staff as BuildupStaff[]
  } catch (error) {
    console.error("[BuildupStaff] Error fetching supervisors:", error)
    return []
  }
}

/**
 * Fetch operators/workers (COA job code) from Supabase
 */
export async function getOperators(): Promise<BuildupStaff[]> {
  try {
    if (!isSupabaseConfigured()) {
      console.log("[BuildupStaff] Supabase not configured, returning empty array")
      return []
    }

    const supabase = createClient()

    const { data: staff, error } = await supabase
      .from("buildup_staff_list")
      .select("*")
      .eq("job_code", "COA")
      .order("name", { ascending: true })

    if (error) {
      console.error("[BuildupStaff] Error fetching operators:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return []
    }

    if (!staff || staff.length === 0) {
      console.log("[BuildupStaff] No operators found in database")
      return []
    }

    console.log(`[BuildupStaff] Successfully fetched ${staff.length} operators (COA) from Supabase`)
    return staff as BuildupStaff[]
  } catch (error) {
    console.error("[BuildupStaff] Error fetching operators:", error)
    return []
  }
}

/**
 * Fetch staff by shift pattern from Supabase
 */
export async function getStaffByShift(shiftPattern: string): Promise<BuildupStaff[]> {
  try {
    if (!isSupabaseConfigured()) {
      console.log("[BuildupStaff] Supabase not configured, returning empty array")
      return []
    }

    const supabase = createClient()

    const { data: staff, error } = await supabase
      .from("buildup_staff_list")
      .select("*")
      .eq("shift_pattern", shiftPattern)
      .order("name", { ascending: true })

    if (error) {
      console.error("[BuildupStaff] Error fetching staff by shift:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return []
    }

    if (!staff || staff.length === 0) {
      console.log(`[BuildupStaff] No staff found for shift pattern: ${shiftPattern}`)
      return []
    }

    console.log(`[BuildupStaff] Successfully fetched ${staff.length} staff for shift ${shiftPattern} from Supabase`)
    return staff as BuildupStaff[]
  } catch (error) {
    console.error("[BuildupStaff] Error fetching staff by shift:", error)
    return []
  }
}

/**
 * Find staff by name (partial match, case insensitive)
 * Useful for matching BUP allocation names like "BRIGHT" to full names
 */
export async function findStaffByName(searchName: string): Promise<BuildupStaff | null> {
  try {
    if (!isSupabaseConfigured()) {
      return null
    }

    const supabase = createClient()

    // Search using ilike for case-insensitive partial match
    const { data: staff, error } = await supabase
      .from("buildup_staff_list")
      .select("*")
      .ilike("name", `%${searchName}%`)
      .limit(1)

    if (error || !staff || staff.length === 0) {
      return null
    }

    return staff[0] as BuildupStaff
  } catch (error) {
    console.error("[BuildupStaff] Error finding staff by name:", error)
    return null
  }
}

/**
 * Find staff by staff number
 * Used for authentication by staff ID
 */
export async function findStaffByStaffNo(staffNo: string | number): Promise<BuildupStaff | null> {
  try {
    if (!isSupabaseConfigured()) {
      console.log("[BuildupStaff] Supabase not configured for findStaffByStaffNo")
      return null
    }

    const supabase = createClient()
    // Parse to number, handling both string and number inputs
    const staffNoNum = typeof staffNo === "string" ? parseInt(staffNo.trim(), 10) : staffNo

    if (isNaN(staffNoNum)) {
      console.error("[BuildupStaff] Invalid staff number:", staffNo)
      return null
    }

    console.log(`[BuildupStaff] Searching for staff_no: ${staffNoNum} (type: ${typeof staffNoNum})`)

    // Try querying with number first (Supabase should handle bigint conversion)
    let { data: staff, error } = await supabase
      .from("buildup_staff_list")
      .select("*")
      .eq("staff_no", staffNoNum)
      .limit(1)

    // If that fails or returns nothing, try as string (in case Supabase stores/compares as string)
    if ((error || !staff || staff.length === 0) && typeof staffNo === "string") {
      console.log(`[BuildupStaff] Retrying search with staff_no as string: ${staffNo.trim()}`)
      const result = await supabase
        .from("buildup_staff_list")
        .select("*")
        .eq("staff_no", staffNo.trim())
        .limit(1)
      
      staff = result.data
      error = result.error
    }

    if (error) {
      console.error("[BuildupStaff] Error finding staff by staff number:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        staffNo: staffNoNum,
        originalInput: staffNo
      })
      return null
    }

    if (!staff || staff.length === 0) {
      console.log(`[BuildupStaff] No staff found with staff_no: ${staffNoNum} (searched as: ${staffNo})`)
      // Debug: Let's see what staff numbers exist (first 5)
      const { data: sampleStaff } = await supabase
        .from("buildup_staff_list")
        .select("staff_no, name")
        .limit(5)
      console.log("[BuildupStaff] Sample staff numbers in DB:", sampleStaff?.map(s => ({ staff_no: s.staff_no, name: s.name })))
      return null
    }

    console.log(`[BuildupStaff] Found staff: ${staff[0].name} (staff_no: ${staff[0].staff_no})`)
    return staff[0] as BuildupStaff
  } catch (error) {
    console.error("[BuildupStaff] Error finding staff by staff number:", error)
    return null
  }
}

/**
 * Generate a deterministic mobile number based on staff_no
 * This creates a unique, consistent mobile number for each staff member
 * Format: +971 5X XXX XXXX (UAE mobile format)
 */
export function generateMobileNumber(staffNo: number): string {
  // Use staff_no to generate a deterministic but random-looking number
  // Seed based on staff_no for consistency
  const seed = staffNo * 2654435761 // Golden ratio prime for better distribution
  const hash = Math.abs(seed) % 100000000 // 8 digit number
  
  // Format as UAE mobile: +971 5X XXX XXXX
  const prefix = 50 + (staffNo % 9) // 50-58 (UAE mobile prefixes)
  const part1 = String(hash).padStart(8, '0').slice(0, 3)
  const part2 = String(hash).padStart(8, '0').slice(3, 7)
  
  return `+971 ${prefix} ${part1} ${part2}`
}

/**
 * Staff mobile number cache - maps display name to mobile number
 * This is populated when operators are loaded and used for consistent lookup
 */
const staffMobileCache: Map<string, string> = new Map()

/**
 * Get mobile number for a staff member by their display name
 * Returns cached mobile or generates one based on a hash of the name
 */
export function getMobileForStaff(displayName: string): string {
  if (!displayName) return ""
  
  const normalizedName = displayName.toLowerCase().trim()
  
  if (staffMobileCache.has(normalizedName)) {
    return staffMobileCache.get(normalizedName)!
  }
  
  // Generate from name hash if not in cache
  let hash = 0
  for (let i = 0; i < normalizedName.length; i++) {
    const char = normalizedName.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  const mobile = generateMobileNumber(Math.abs(hash))
  staffMobileCache.set(normalizedName, mobile)
  return mobile
}

/**
 * Cache mobile numbers for a list of staff members
 * Call this after loading operators from Supabase
 */
export function cacheStaffMobiles(staffList: BuildupStaff[]): void {
  for (const staff of staffList) {
    if (staff.name && staff.staff_no) {
      const parsed = parseStaffName(staff.name)
      const mobile = generateMobileNumber(staff.staff_no)
      staffMobileCache.set(parsed.displayName.toLowerCase(), mobile)
      staffMobileCache.set(parsed.fullName.toLowerCase(), mobile)
    }
  }
}

