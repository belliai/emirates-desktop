"use client"

import type { PeriodType, ShiftType, WaveType } from "./load-plan-context"

export function determinePeriodAndWave(etd: string): { period: PeriodType; wave: WaveType | null; shiftType: ShiftType } {
  const [hours, minutes] = etd.split(":").map(Number)
  const timeInMinutes = (hours || 0) * 60 + (minutes || 0)

  if (timeInMinutes >= 1 && timeInMinutes < 360) return { period: "early-morning", wave: null, shiftType: "night" }
  if (timeInMinutes >= 360 && timeInMinutes <= 540) return { period: "late-morning", wave: "first-wave", shiftType: "night" }
  if (timeInMinutes > 540 && timeInMinutes < 780) return { period: "late-morning", wave: "second-wave", shiftType: "night" }
  if (timeInMinutes >= 780 && timeInMinutes < 960) return { period: "afternoon", wave: "first-wave", shiftType: "day" }
  if (timeInMinutes >= 960 && timeInMinutes <= 1439) return { period: "afternoon", wave: "second-wave", shiftType: "day" }
  return { period: "early-morning", wave: null, shiftType: "night" }
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

export function extractFlightNumber(flight: string): number {
  const match = flight.match(/EK0?(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

export function getFlightRegion(flight: string): { category: string; color: string } {
  const flightNum = extractFlightNumber(flight)

  if (flightNum >= 1 && flightNum <= 199) return { category: "EU/UK", color: "bg-blue-200" }
  if (flightNum >= 200 && flightNum <= 299) return { category: "US", color: "bg-pink-200" }
  if (flightNum >= 300 && flightNum <= 499) return { category: "FE/AUS", color: "bg-cyan-200" }
  if (flightNum >= 500 && flightNum <= 699) return { category: "ISUB", color: "bg-purple-200" }
  if (flightNum >= 700 && flightNum <= 799) return { category: "Africa", color: "bg-green-200" }
  return { category: "M/East", color: "bg-yellow-200" }
}

export function getOriginDestinationColor(flight: string, name?: string, sector?: string): string {
  if (name && sector) return "bg-white"
  return getFlightRegion(flight).color
}

export function normalizeRoutingToOriginDestination(value: string | undefined): string {
  if (!value) return "DXB-???"
  if (value.includes("-")) return value
  if (/^[A-Z]{6}$/.test(value)) return `${value.slice(0, 3)}-${value.slice(3, 6)}`
  if (/^[A-Z]{3}$/.test(value)) return `DXB-${value}`
  if (value.includes("/")) {
    const parts = value.split("/").filter((part) => /^[A-Z]{3}$/.test(part))
    const origin = parts[0] || "DXB"
    const destination = parts[1] || ""
    return destination ? `${origin}-${destination}` : "DXB-???"
  }
  return "DXB-???"
}

