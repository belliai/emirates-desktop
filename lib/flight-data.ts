import { createClient } from "@/lib/supabase/client"
import { getRandomName } from "./names"

export interface StatusHistoryEntry {
  status: 1 | 2 | 3 | 4 | 5
  timestamp: Date
  changedBy?: string
}

export interface StatusHistory {
  status: 1 | 2 | 3 | 4 | 5
  timestamp: Date
}

export interface ULD {
  uldNumber: string
  uldshc: string
  destination: string
  remarks: string
  status: 1 | 2 | 3 | 4 | 5
  statusHistory?: StatusHistoryEntry[]
}

export interface Flight {
  flightNumber: string
  eta: string
  boardingPoint: string
  uldCount: number
  ulds: ULD[]
}

// Parse CSV text into array of objects
function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split("\n")
  const headers = lines[0].split(",").map((h) => h.trim())

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim())
    const obj: any = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ""
    })
    return obj
  })
}

async function getFlightDataFromCSV(): Promise<Flight[]> {
  try {
    console.log("[v0] Fetching flight data from CSV fallback...")
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Emirates%20distribtion%20-%20EF%20%28wareshouse%20modules%29-Mo7zpcsy5wICzmbw9Pd47ClRyKa5qq.csv",
    )
    const csvText = await response.text()
    const rows = parseCSV(csvText)

    // Group by flight number, ETA, and boarding point
    const flightMap = new Map<string, Flight>()

    rows.forEach((row) => {
      if (!row["FLTno."] || !row["ETA"] || !row["Brdpnt"]) {
        return
      }

      const flightKey = `${row["FLTno."]}-${row["ETA"]}-${row["Brdpnt"]}`

      if (!flightMap.has(flightKey)) {
        flightMap.set(flightKey, {
          flightNumber: row["FLTno."],
          eta: row["ETA"],
          boardingPoint: row["Brdpnt"],
          uldCount: 0,
          ulds: [],
        })
      }

      const flight = flightMap.get(flightKey)!

      const randomStatus = (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5

      const statusHistory: StatusHistoryEntry[] = []
      for (let s = 1; s <= randomStatus; s++) {
        statusHistory.push({
          status: s as 1 | 2 | 3 | 4 | 5,
          timestamp: new Date(Date.now() - (randomStatus - s + 1) * 60 * 60 * 1000),
          changedBy: getRandomName(),
        })
      }

      // Add ULD to flight
      flight.ulds.push({
        uldNumber: row["ULDNumber"],
        uldshc: row["ULDSHC"],
        destination: row["Dest"],
        remarks: row["Remarks"],
        status: randomStatus,
        statusHistory: statusHistory,
      })

      flight.uldCount = flight.ulds.length
    })

    return Array.from(flightMap.values())
  } catch (error) {
    console.error("[v0] Error fetching flight data from CSV:", error)
    return []
  }
}

export async function getFlightData(): Promise<Flight[]> {
  try {
    // Check if Supabase is configured before attempting to use it
    const isSupabaseConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key"

    if (!isSupabaseConfigured) {
      console.log("[v0] Supabase not configured, using CSV fallback")
      return await getFlightDataFromCSV()
    }

    const supabase = createClient()

    // Fetch flights with their ULDs and status history
    const { data: flights, error: flightsError } = await supabase
      .from("flights")
      .select(
        `
        id,
        flight_number,
        eta,
        boarding_point,
        ulds (
          id,
          uld_number,
          uld_shc,
          destination,
          remarks,
          status,
          status_history (
            status,
            timestamp,
            changed_by
          )
        )
      `,
      )
      .order("eta", { ascending: true })

    if (flightsError) {
      console.log("[v0] Supabase tables not found, falling back to CSV data")
      return await getFlightDataFromCSV()
    }

    if (!flights || flights.length === 0) {
      console.log("[v0] No flights found in database, falling back to CSV data")
      return await getFlightDataFromCSV()
    }

    console.log("[v0] Successfully fetched flights from Supabase")
    // Transform Supabase data to match our Flight interface
    return flights.map((flight) => ({
      flightNumber: flight.flight_number,
      eta: flight.eta,
      boardingPoint: flight.boarding_point,
      uldCount: flight.ulds?.length || 0,
      ulds:
        flight.ulds?.map((uld: any) => ({
          uldNumber: uld.uld_number,
          uldshc: uld.uld_shc,
          destination: uld.destination,
          remarks: uld.remarks,
          status: uld.status as 1 | 2 | 3 | 4 | 5,
          statusHistory: uld.status_history
            ?.map((history: any) => ({
              status: history.status as 1 | 2 | 3 | 4 | 5,
              timestamp: new Date(history.timestamp),
              changedBy: history.changed_by,
            }))
            .sort((a: StatusHistoryEntry, b: StatusHistoryEntry) => a.timestamp.getTime() - b.timestamp.getTime()),
        })) || [],
    }))
  } catch (error) {
    console.error("[v0] Error in getFlightData, falling back to CSV:", error)
    return await getFlightDataFromCSV()
  }
}
