// Script to migrate CSV data to Supabase
// 
// TODO: To use this script, set the following environment variables:
// - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
// - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (for admin operations)
// 
// You can find these values in your Supabase dashboard:
// https://supabase.com/dashboard/project/_/settings/api
// 
// Run with: npx tsx scripts/002_seed_data.ts
// Or: ts-node scripts/002_seed_data.ts

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key"

// Check if Supabase is configured
const isConfigured = 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
  process.env.SUPABASE_SERVICE_ROLE_KEY !== "placeholder-service-role-key"

if (!isConfigured) {
  console.error("❌ Supabase is not configured!")
  console.error("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
  console.error("See the comments at the top of this file for instructions.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

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

function getRandomName(): string {
  const names = [
    "Ahmed Al-Mansoori",
    "Fatima Hassan",
    "Mohammed Al-Rashid",
    "Aisha Abdullah",
    "Omar Al-Zaabi",
    "Layla Al-Mazrouei",
    "Khalid Al-Nuaimi",
    "Mariam Al-Shamsi",
  ]
  return names[Math.floor(Math.random() * names.length)]
}

async function seedData() {
  try {
    console.log("Fetching CSV data...")
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Emirates%20distribtion%20-%20EF%20%28wareshouse%20modules%29-Mo7zpcsy5wICzmbw9Pd47ClRyKa5qq.csv",
    )
    const csvText = await response.text()
    const rows = parseCSV(csvText)

    console.log(`Processing ${rows.length} rows...`)

    // Group by flight
    const flightMap = new Map<
      string,
      {
        flight_number: string
        eta: string
        boarding_point: string
        ulds: any[]
      }
    >()

    rows.forEach((row) => {
      if (!row["FLTno."] || !row["ETA"] || !row["Brdpnt"]) {
        return
      }

      const flightKey = `${row["FLTno."]}-${row["ETA"]}-${row["Brdpnt"]}`

      if (!flightMap.has(flightKey)) {
        flightMap.set(flightKey, {
          flight_number: row["FLTno."],
          eta: row["ETA"],
          boarding_point: row["Brdpnt"],
          ulds: [],
        })
      }

      const flight = flightMap.get(flightKey)!
      const randomStatus = (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5

      flight.ulds.push({
        uld_number: row["ULDNumber"],
        uld_shc: row["ULDSHC"],
        destination: row["Dest"],
        remarks: row["Remarks"],
        status: randomStatus,
        statusHistory: Array.from({ length: randomStatus }, (_, i) => {
          const status = (i + 1) as 1 | 2 | 3 | 4 | 5
          const minutesAgo = (randomStatus - status) * (5 + Math.random() * 10)
          const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000)
          return {
            status,
            timestamp: timestamp.toISOString(),
            changed_by: getRandomName(),
          }
        }),
      })
    })

    console.log(`Inserting ${flightMap.size} flights...`)

    // Insert flights and ULDs
    for (const [, flightData] of flightMap) {
      // Insert flight
      const { data: flight, error: flightError } = await supabase
        .from("flights")
        .insert({
          flight_number: flightData.flight_number,
          eta: flightData.eta,
          boarding_point: flightData.boarding_point,
        })
        .select()
        .single()

      if (flightError) {
        console.error("Error inserting flight:", flightError)
        continue
      }

      // Insert ULDs for this flight
      for (const uldData of flightData.ulds) {
        const { data: uld, error: uldError } = await supabase
          .from("ulds")
          .insert({
            flight_id: flight.id,
            uld_number: uldData.uld_number,
            uld_shc: uldData.uld_shc,
            destination: uldData.destination,
            remarks: uldData.remarks,
            status: uldData.status,
          })
          .select()
          .single()

        if (uldError) {
          console.error("Error inserting ULD:", uldError)
          continue
        }

        // Insert status history for this ULD
        const statusHistoryRecords = uldData.statusHistory.map((history: any) => ({
          uld_id: uld.id,
          status: history.status,
          timestamp: history.timestamp,
          changed_by: history.changed_by,
        }))

        const { error: historyError } = await supabase.from("status_history").insert(statusHistoryRecords)

        if (historyError) {
          console.error("Error inserting status history:", historyError)
        }
      }
    }

    console.log("Data seeding completed successfully!")
  } catch (error) {
    console.error("Error seeding data:", error)
  }
}

seedData()
