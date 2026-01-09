"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Upload, ChevronDown, ClipboardPaste, Plus, Search, SlidersHorizontal, Settings2, ArrowUpDown } from 'lucide-react'
import LoadPlanDetailScreen from './load-plan-detail-screen'
import type { LoadPlanDetail } from './load-plan-types'
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase } from '@/lib/load-plans-supabase'
import { useLoadPlans, type LoadPlan, type ShiftType, type PeriodType, type WaveType } from '@/lib/load-plan-context'
import { Button } from '@/components/ui/button'
import { UploadModal } from './lists/upload-modal'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ClipboardPasteModal } from './clipboard-paste-modal'

// Type for bay info data from pasted CSV (Arrival)
export type BayInfo = {
  sta: string        // STA - Scheduled Time of Arrival
  flightNo: string   // FLIGHTNO - e.g., "EK 0206"
  orig: string       // ORIG - Origin
  via: string        // VIA
  eta: string        // ETA - Estimated Time of Arrival
  ata: string        // ATA - Actual Time of Arrival
  acType: string     // A/T - Aircraft Type
  regn: string       // REGN - Registration
  pos: string        // POS - Position/Bay Number
  term: string       // TERM - Terminal
  belt: string       // BELT
  remarks: string    // REMARKS
}

// Type for departure bay info data from pasted CSV
export type DepartureBayInfo = {
  std: string        // STD - Scheduled Time of Departure
  flightNo: string   // FLIGHTNO - e.g., "EK 0206"
  dest: string       // DEST - Destination
  via: string        // VIA
  etd: string        // ETD - Estimated Time of Departure
  atd: string        // ATD - Actual Time of Departure
  acType: string     // A/T - Aircraft Type
  regn: string       // REGN - Registration
  pos: string        // POS - Position/Bay Number
  term: string       // TERM - Terminal
  gate: string       // GATE
  remarks: string    // REMARKS
}

// Parse STD time (e.g., "02:50", "09:35") to hours
function parseStdToHours(std: string): number {
  const [hours, minutes] = std.split(":").map(Number)
  return hours + (minutes || 0) / 60
}

// Determine period and wave based on STD time
function determinePeriodAndWave(std: string): { period: PeriodType; wave: WaveType | null; shiftType: ShiftType } {
  const [hours, minutes] = std.split(":").map(Number)
  const timeInMinutes = hours * 60 + (minutes || 0)
  
  // Night Shift Early Morning: 00:01-05:59
  if (timeInMinutes >= 1 && timeInMinutes < 360) {
    return { period: "early-morning", wave: null, shiftType: "night" }
  }
  // Night Shift Late Morning First Wave: 06:00-09:00
  if (timeInMinutes >= 360 && timeInMinutes <= 540) {
    return { period: "late-morning", wave: "first-wave", shiftType: "night" }
  }
  // Night Shift Late Morning Second Wave: 09:01-12:59
  if (timeInMinutes > 540 && timeInMinutes < 780) {
    return { period: "late-morning", wave: "second-wave", shiftType: "night" }
  }
  // Day Shift Afternoon First Wave: 13:00-15:59
  if (timeInMinutes >= 780 && timeInMinutes < 960) {
    return { period: "afternoon", wave: "first-wave", shiftType: "day" }
  }
  // Day Shift Afternoon Second Wave: 16:00-23:59
  if (timeInMinutes >= 960 && timeInMinutes <= 1439) {
    return { period: "afternoon", wave: "second-wave", shiftType: "day" }
  }
  // Default to early morning for edge cases
  return { period: "early-morning", wave: null, shiftType: "night" }
}

// Normalize flight number for matching (remove spaces, uppercase)
function normalizeFlightNo(flightNo: string): string {
  return flightNo.replace(/\s+/g, '').toUpperCase()
}

// Parse bay data row into BayInfo object (Arrival)
function parseBayInfoRow(headers: string[], row: string[]): BayInfo {
  const getCol = (name: string) => {
    const idx = headers.findIndex(h => h.toUpperCase() === name.toUpperCase())
    return idx >= 0 ? row[idx] || '' : ''
  }
  
  return {
    sta: getCol('STA'),
    flightNo: getCol('FLIGHTNO'),
    orig: getCol('ORIG'),
    via: getCol('VIA'),
    eta: getCol('ETA'),
    ata: getCol('ATA'),
    acType: getCol('A/T'),
    regn: getCol('REGN'),
    pos: getCol('POS'),
    term: getCol('TERM'),
    belt: getCol('BELT'),
    remarks: getCol('REMARKS'),
  }
}

// Parse departure bay data row into DepartureBayInfo object
function parseDepartureBayInfoRow(headers: string[], row: string[]): DepartureBayInfo {
  const getCol = (name: string) => {
    const idx = headers.findIndex(h => h.toUpperCase() === name.toUpperCase())
    return idx >= 0 ? row[idx] || '' : ''
  }
  
  return {
    std: getCol('STD'),
    flightNo: getCol('FLIGHTNO'),
    dest: getCol('DEST'),
    via: getCol('VIA'),
    etd: getCol('ETD'),
    atd: getCol('ATD'),
    acType: getCol('A/T'),
    regn: getCol('REGN'),
    pos: getCol('POS'),
    term: getCol('TERM'),
    gate: getCol('GATE'),
    remarks: getCol('REMARKS'),
  }
}

interface QRTListScreenProps {
  onBack?: () => void
}

// Default arrival bay data (pre-populated from legacy system export)
const DEFAULT_ARRIVAL_BAY_DATA: { headers: string[]; rows: string[][] } = {
  headers: ["STA", "FLIGHTNO", "ORIG", "VIA", "ETA", "ATA", "A/T", "REGN", "POS", "TERM", "BELT", "REMARKS"],
  rows: [
    ["11/27/25 23:00", "EK 0206", "JFK/MXP", "MXP", "2:12", "", "A380", "A6EEX", "D08/A15", "T3", "", ""],
    ["11/27/25 23:59", "EK 0082", "LYS", "", "0:02", "0:04", "A350900", "A6EXA", "G04", "T1", "9", ""],
    ["11/28/25 0:05", "EK 0158", "ARN", "", "0:17", "0:17", "B7773ER", "A6ECM", "G15", "T1", "6", ""],
    ["11/28/25 0:10", "EK 0060", "HAM", "", "0:05", "0:08", "B7773ER", "A6ENL", "C39", "T1", "10", ""],
    ["11/28/25 0:15", "EK 0074", "CDG", "", "0:48", "0:50", "A380", "A6EDS", "D09/A16", "T3", "13", ""],
    ["11/28/25 0:15", "EK 0148", "AMS", "", "0:31", "0:28", "A380", "A6EOJ", "F26R/B29", "T3", "13", ""],
    ["11/28/25 0:15", "EK 0136", "VCE", "", "0:08", "0:11", "B7773ER", "A6EGO", "B03/C6", "T3", "2", ""],
    ["11/28/25 0:25", "EK 0210", "EWR/ATH", "ATH", "0:21", "0:19", "B7773ER", "A6EQD", "A04/A2", "T3", "12", ""],
    ["11/28/25 0:25", "EK 0142", "MAD", "", "0:32", "0:35", "A380", "A6EEN", "D07/A14", "T3", "4", ""],
    ["11/28/25 0:25", "EK 0184", "BRU", "", "0:34", "0:37", "B7773ER", "A6EQO", "C45", "T1", "4", ""],
    ["11/28/25 0:25", "EK 0036", "NCL", "", "0:29", "0:29", "B7773ER", "A6ENB", "G10", "T1", "2", ""],
    ["11/28/25 0:25", "EK 0018", "MAN", "", "0:38", "0:38", "A380", "A6EVQ", "D04/A11", "T3", "1", ""],
    ["11/28/25 0:30", "EK 0804", "JED", "", "0:23", "0:22", "A380", "A6EOA", "F08/C13", "T3", "7", ""],
    ["11/28/25 0:35", "EK 0256", "MEX/BCN", "BCN", "0:28", "0:27", "B7772LR", "A6EWF", "B24/B26", "T3", "9", ""],
    ["11/28/25 0:35", "EK 0248", "EZE/GIG", "GIG", "0:12", "0:15", "B7773ER", "A6ECH", "C46", "T1", "11", ""],
    ["11/28/25 0:40", "EK 0002", "LHR", "", "0:45", "0:44", "A380", "A6EUV", "A10/A20", "T3", "14", ""],
    ["11/28/25 0:40", "EK 0924", "CAI", "", "0:25", "0:24", "A380", "A6EEV", "F06/C9", "T3", "8", ""],
    ["11/28/25 0:40", "EK 0016", "LGW", "", "0:43", "0:42", "A380", "A6EES", "F09/C17", "T3", "3", ""],
    ["11/28/25 0:45", "EK 0547", "MAA", "", "0:15", "0:14", "B7773ER", "A6EGW", "F12/C21", "T3", "5", ""],
    ["11/28/25 0:45", "EK 0162", "DUB", "", "1:10", "1:10", "B7773ER", "A6ENS", "D03/A10", "T3", "11", ""],
    ["11/28/25 0:45", "EK 0040", "BHX", "", "0:57", "0:55", "A380", "A6EOP", "D01/A8", "T3", "8", ""],
    ["11/28/25 0:50", "EK 0954", "BEY", "", "0:47", "0:47", "B7773ER", "A6ENP", "D06/A13", "T3", "3", ""],
    ["11/28/25 0:50", "EK 0655", "CMB", "", "1:04", "1:04", "A350900", "A6EXB", "G12", "T1", "11", ""],
    ["11/28/25 0:55", "EK 0028", "GLA", "", "1:21", "1:21", "A380", "A6EOB", "D02/A9", "T3", "1", ""],
    ["11/28/25 0:55", "EK 0110", "MLA/LCA", "LCA", "1:02", "1:05", "B7772LR", "A6EWC", "B21L/B20", "T3", "7", ""],
    ["11/28/25 1:00", "EK 0186", "BCN", "", "0:50", "0:50", "A380", "A6EEY", "F18/B13", "T3", "6", ""],
    ["11/28/25 1:00", "EK 0355", "SIN", "", "0:58", "0:58", "A380", "A6EOI", "F13/C23", "T3", "5", ""],
    ["11/28/25 1:00", "EK 0066", "STN", "", "1:05", "1:06", "B7773ER", "A6EPH", "B15/B8", "T3", "10", ""],
    ["11/28/25 1:00", "EK 0192", "LIS", "", "1:25", "1:27", "B7773ER", "A6EPK", "F07/C11", "T3", "6", ""],
    ["11/28/25 1:00", "EK 0373", "BKK", "", "1:14", "1:13", "A380", "A6EEW", "D05/A12", "T3", "14", ""],
    ["11/28/25 1:05", "EK 0773", "CPT", "", "1:09", "1:10", "B7773ER", "A6ENZ", "C47", "T1", "3", ""],
    ["11/28/25 1:10", "EK 0338", "CEB/CRK", "CRK", "1:19", "1:23", "B7773ER", "A6ECY", "B05/C10", "T3", "9", ""],
    ["11/28/25 1:10", "EK 0369", "DPS", "", "1:12", "1:10", "A380", "A6EOX", "F20/B17", "T3", "2", ""],
    ["11/28/25 1:10", "EK 0758", "ALG", "", "1:15", "1:15", "B7773ER", "A6ECO", "B22/B22", "T3", "12", ""],
    ["11/28/25 1:20", "EK 0122", "IST", "", "1:33", "1:32", "B7773ER", "A6ECZ", "F17/B11", "T3", "13", ""],
    ["11/28/25 1:25", "EK 0834", "BAH", "", "1:26", "1:40", "B7773ER", "A6EGE", "B11/C20", "T3", "4", ""],
    ["11/28/25 1:30", "EK 0822", "DMM", "", "1:32", "1:35", "A350900", "A6EXK", "C30", "T1", "8", ""],
    ["11/28/25 1:40", "EK 0752", "CMN", "", "1:44", "1:56", "A380", "A6EEZ", "B12/C22", "T3", "5", ""],
    ["11/28/25 1:45", "EK 0860", "KWI", "", "1:35", "1:34", "B7773ER", "A6ECA", "B16/B10", "T3", "7", ""],
    ["11/28/25 2:05", "EK 0653", "CMB/MLE", "MLE", "1:59", "2:04", "B7773ER", "A6EGS", "B17/B12", "T3", "2", ""],
  ],
}

// Default departure bay data (pre-populated from legacy system export)
const DEFAULT_DEPARTURE_BAY_DATA: { headers: string[]; rows: string[][] } = {
  headers: ["STD", "FLIGHTNO", "DEST", "VIA", "ETD", "ATD", "A/T", "REGN", "POS", "TERM", "GATE", "REMARKS"],
  rows: [
    ["12/3/25 0:15", "EK 0801", "JED", "", "0:15", "0:17", "A380", "A6EOH", "D06", "T3", "A13", ""],
    ["12/3/25 1:15", "EK 0977", "IKA", "", "1:15", "1:17", "B7773ER", "A6EGJ", "B01", "T3", "C2", ""],
    ["12/3/25 1:25", "EK 0853", "KWI", "", "1:25", "1:24", "A350900", "A6EXA", "G08", "T1", "A7", ""],
    ["12/3/25 1:25", "EK 0815", "RUH", "", "1:25", "1:25", "B7773ER", "A6EQK", "A06", "T3", "A24", ""],
    ["12/3/25 1:55", "EK 0582", "DAC", "", "2:30", "2:25", "B7773ER", "A6ENI", "A07", "T3", "A23", ""],
    ["12/3/25 2:00", "EK 0570", "CCU", "", "2:00", "2:00", "B7773ER", "A6ENR", "B18L", "T3", "B14", ""],
    ["12/3/25 2:00", "EK 0414", "SYD", "", "2:05", "2:04", "A380", "A6EUW", "D01", "T3", "A8", ""],
    ["12/3/25 2:00", "EK 0440", "ADL", "", "2:00", "2:10", "A350900", "A6EXM", "A10", "T3", "A20", ""],
    ["12/3/25 2:10", "EK 0835", "BAH", "", "2:10", "2:11", "A350900", "A6EXJ", "B15", "T3", "B8", ""],
    ["12/3/25 2:10", "EK 0165", "DUB", "", "2:20", "2:19", "B7773ER", "A6ECU", "G12", "T1", "A19", ""],
    ["12/3/25 2:15", "EK 0866", "MCT", "", "2:15", "2:08", "A350900", "A6EXE", "G07", "T1", "A19a", ""],
    ["12/3/25 2:15", "EK 0213", "MIA/BOG", "BOG", "2:35", "2:34", "B7773ER", "A6EPW", "B21L", "T3", "B20", ""],
    ["12/3/25 2:20", "EK 0823", "DMM", "", "2:30", "2:25", "B7773ER", "A6EQJ", "F02", "T3", "C1", ""],
    ["12/3/25 2:25", "EK 0231", "IAD", "", "2:25", "2:32", "A380", "A6EEO", "F22", "T3", "B21", ""],
    ["12/3/25 2:25", "EK 0701", "MRU", "", "2:35", "2:32", "A380", "A6EEC", "F19", "T3", "B15", ""],
    ["12/3/25 2:30", "EK 0348", "SIN/KTI", "KTI", "2:35", "2:34", "B7773ER", "A6ECG", "B12", "T3", "C22", ""],
    ["12/3/25 2:30", "EK 0656", "MLE", "", "2:30", "2:26", "B7773ER", "A6EPK", "F16", "T3", "B9", ""],
    ["12/3/25 2:35", "EK 0203", "JFK", "", "2:45", "2:38", "A380", "A6EOG", "A03", "T3", "A3", ""],
    ["12/3/25 2:35", "EK 0650", "CMB", "", "2:45", "2:50", "B7773ER", "A6EPH", "B05", "T3", "C10", ""],
    ["12/3/25 2:40", "EK 0705", "SEZ", "", "2:40", "2:40", "B7773ER", "A6ECJ", "A09", "T3", "A21", ""],
    ["12/3/25 2:40", "EK 0021", "MAN", "", "3:10", "3:02", "A380", "A6EET", "D03", "T3", "A10", ""],
    ["12/3/25 2:40", "EK 0221", "DFW", "", "2:45", "2:40", "B7773ER", "A6EQG", "F17", "T3", "B11", ""],
    ["12/3/25 2:45", "EK 0420", "PER", "", "3:10", "3:09", "A380", "A6EOF", "F18", "T3", "B13", ""],
    ["12/3/25 2:45", "EK 0243", "YUL", "", "2:50", "2:45", "B7772LR", "A6EWF", "B20", "T3", "B18", ""],
    ["12/3/25 2:45", "EK 0530", "COK", "", "2:45", "2:51", "B7773ER", "A6EGQ", "F24", "T3", "B25", ""],
    ["12/3/25 2:50", "EK 0338", "CEB/CRK", "CRK", "2:55", "2:55", "B7773ER", "A6ENW", "B22", "T3", "B22", ""],
    ["12/3/25 2:50", "EK 0011", "LGW", "", "2:50", "2:51", "A380", "A6EOP", "D04", "T3", "A11", ""],
    ["12/3/25 2:50", "EK 0430", "BNE", "", "2:55", "2:55", "B7773ER", "A6EGC", "B14", "T3", "B6", ""],
    ["12/3/25 2:50", "EK 0544", "MAA", "", "3:00", "2:57", "B7773ER", "A6ENQ", "A01", "T3", "A5", ""],
    ["12/3/25 2:55", "EK 0408", "MEL", "", "3:25", "3:25", "A380", "A6EUL", "B26R", "T3", "B32", ""],
    ["12/3/25 2:55", "EK 0318", "NRT", "", "2:55", "2:56", "A380", "A6EUS", "F10", "T3", "C19", ""],
    ["12/3/25 3:00", "EK 0378", "HKT", "", "3:00", "3:02", "B7773ER", "A6EGG", "F26L", "T3", "B29", ""],
    ["12/3/25 3:05", "EK 0316", "KIX", "", "3:15", "3:13", "A380", "A6EEW", "F07", "T3", "C11", ""],
    ["12/3/25 3:05", "EK 0219", "MCO", "", "3:15", "3:10", "B7773ER", "A6ECH", "B24", "T3", "B26", ""],
    ["12/3/25 3:05", "EK 0384", "BKK/HKG", "HKG", "3:30", "3:34", "A380", "A6EDF", "F13", "T3", "C23", ""],
    ["12/3/25 3:10", "EK 0007", "LHR", "", "3:15", "3:14", "A380", "A6EEE", "A08", "T3", "A22", ""],
    ["12/3/25 3:10", "EK 0302", "PVG", "", "3:15", "3:14", "A380", "A6EEY", "F09", "T3", "C17", ""],
    ["12/3/25 3:10", "EK 0612", "ISB", "", "3:25", "3:18", "B7773ER", "A6ENH", "B10", "T3", "C18", ""],
    ["12/3/25 3:15", "EK 0145", "AMS", "", "3:15", "3:14", "B7773ER", "A6ENG", "B03", "T3", "C6", ""],
    ["12/3/25 3:15", "EK 0354", "SIN", "", "3:30", "3:24", "A380", "A6EOI", "F12", "T3", "C21", ""],
  ],
}

export default function QRTListScreen({ onBack }: QRTListScreenProps) {
  const { loadPlans, setLoadPlans } = useLoadPlans()
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [selectedBayInfo, setSelectedBayInfo] = useState<BayInfo | null>(null)
  const [selectedDepartureBayInfo, setSelectedDepartureBayInfo] = useState<DepartureBayInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPasteArrivalModal, setShowPasteModal] = useState(false)
  const [showPasteDepartureModal, setShowPasteDepartureModal] = useState(false)
  const [isArrivalBayNumbersOpen, setIsBayNumbersOpen] = useState(false)
  const [isDepartureBayNumbersOpen, setIsDepartureNumbersOpen] = useState(false)
  const [bayArrivalData, setBayNumberData] = useState<{ headers: string[]; rows: string[][] } | null>(DEFAULT_ARRIVAL_BAY_DATA)
  const [bayDepartureData, setBayDepartureData] = useState<{ headers: string[]; rows: string[][] } | null>(DEFAULT_DEPARTURE_BAY_DATA)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [showAddFilterDropdown, setShowAddFilterDropdown] = useState(false)
  const [showViewOptions, setShowViewOptions] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [shiftFilter, setShiftFilter] = useState<ShiftType>("current")
  const [periodFilter, setPeriodFilter] = useState<PeriodType>("all")
  const [waveFilter, setWaveFilter] = useState<WaveType>("all")
  const addFilterRef = useRef<HTMLDivElement>(null)
  const viewOptionsRef = useRef<HTMLDivElement>(null)

  // Create a lookup map from arrival bay data by normalized flight number
  const bayArrivalLookup = useMemo(() => {
    const lookup = new Map<string, BayInfo>()
    if (bayArrivalData) {
      bayArrivalData.rows.forEach(row => {
        const bayInfo = parseBayInfoRow(bayArrivalData.headers, row)
        const normalizedFlightNo = normalizeFlightNo(bayInfo.flightNo)
        if (normalizedFlightNo) {
          lookup.set(normalizedFlightNo, bayInfo)
        }
      })
    }
    return lookup
  }, [bayArrivalData])

  // Create a lookup map from departure bay data by normalized flight number
  const bayDepartureLookup = useMemo(() => {
    const lookup = new Map<string, DepartureBayInfo>()
    if (bayDepartureData) {
      bayDepartureData.rows.forEach(row => {
        const bayInfo = parseDepartureBayInfoRow(bayDepartureData.headers, row)
        const normalizedFlightNo = normalizeFlightNo(bayInfo.flightNo)
        if (normalizedFlightNo) {
          lookup.set(normalizedFlightNo, bayInfo)
        }
      })
    }
    return lookup
  }, [bayDepartureData])

  // Fetch load plans from Supabase on mount
  useEffect(() => {
    const fetchLoadPlans = async () => {
      setIsLoading(true)
      try {
        const supabaseLoadPlans = await getLoadPlansFromSupabase()
        if (supabaseLoadPlans.length > 0) {
          setLoadPlans(supabaseLoadPlans)
          console.log(`[QRTListScreen] Loaded ${supabaseLoadPlans.length} load plans from Supabase`)
        } else {
          setLoadPlans([])
          console.log("[QRTListScreen] No load plans from Supabase")
        }
      } catch (err) {
        console.error("[QRTListScreen] Error fetching load plans:", err)
        setLoadPlans([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchLoadPlans()
  }, [setLoadPlans])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addFilterRef.current && !addFilterRef.current.contains(event.target as Node)) {
        setShowAddFilterDropdown(false)
      }
      if (viewOptionsRef.current && !viewOptionsRef.current.contains(event.target as Node)) {
        setShowViewOptions(false)
      }
    }

    if (showAddFilterDropdown || showViewOptions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showAddFilterDropdown, showViewOptions])

  // Filter and sort load plans
  const filteredLoadPlans = useMemo(() => {
    let filtered = [...loadPlans]

    // Filter by shift type
    if (shiftFilter === "current") {
      // Show all flights (no shift filter)
    } else if (shiftFilter === "night") {
      filtered = filtered.filter((plan) => {
        const { shiftType } = determinePeriodAndWave(plan.std)
        return shiftType === "night"
      })
    } else if (shiftFilter === "day") {
      filtered = filtered.filter((plan) => {
        const { shiftType } = determinePeriodAndWave(plan.std)
        return shiftType === "day"
      })
    }

    // Filter by period
    if (periodFilter !== "all") {
      filtered = filtered.filter((plan) => {
        const { period } = determinePeriodAndWave(plan.std)
        return period === periodFilter
      })
    }

    // Filter by wave (only applies to late-morning and afternoon periods)
    if (periodFilter === "early-morning" && waveFilter !== "all") {
      // Early morning doesn't have waves, so don't filter by wave
    } else if (waveFilter !== "all") {
      filtered = filtered.filter((plan) => {
        const { period, wave } = determinePeriodAndWave(plan.std)
        if (period === "late-morning" || period === "afternoon") {
          return wave === waveFilter
        }
        return true // Early morning doesn't have waves
      })
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((plan) => 
        plan.flight.toLowerCase().includes(query) ||
        plan.date?.toLowerCase().includes(query) ||
        plan.acftType?.toLowerCase().includes(query) ||
        plan.acftReg?.toLowerCase().includes(query) ||
        plan.pax?.toLowerCase().includes(query) ||
        plan.std?.toLowerCase().includes(query)
      )
    }

    // Sort by STD descending (most recent first)
    // Combines date and STD time for proper chronological sorting
    return filtered.sort((a, b) => {
      // Parse date and STD for comparison
      const dateA = a.date || ""
      const dateB = b.date || ""
      const stdA = a.std || "00:00"
      const stdB = b.std || "00:00"
      
      // Compare dates first (descending - latest date first)
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA)
      }
      
      // If same date, compare STD times (descending - latest time first)
      const hoursA = parseStdToHours(stdA)
      const hoursB = parseStdToHours(stdB)
      return hoursB - hoursA
    })
  }, [loadPlans, shiftFilter, periodFilter, waveFilter, searchQuery])

  // Determine if wave filter should be shown
  const showWaveFilter = periodFilter === "late-morning" || periodFilter === "afternoon"

  const handleRowClick = async (loadPlan: LoadPlan, flightIndex: number) => {
    // DEPARTURE: Lazy flight matching by normalized flight number
    const normalizedFlight = normalizeFlightNo(loadPlan.flight)
    const departureInfo = bayDepartureLookup.get(normalizedFlight) || null
    setSelectedDepartureBayInfo(departureInfo)
    
    // ARRIVAL: Index-based matching - row N from arrival data for Nth flight in list
    let arrivalInfo: BayInfo | null = null
    if (bayArrivalData && bayArrivalData.rows.length > 0) {
      // Use modulo to wrap around if we have more flights than arrival rows
      const arrivalIndex = flightIndex % bayArrivalData.rows.length
      arrivalInfo = parseBayInfoRow(bayArrivalData.headers, bayArrivalData.rows[arrivalIndex])
    }
    setSelectedBayInfo(arrivalInfo)

    // Fetch from Supabase
    try {
      console.log(`[QRTListScreen] Fetching load plan detail from Supabase for ${loadPlan.flight}`)
      const supabaseDetail = await getLoadPlanDetailFromSupabase(loadPlan.flight)
      if (supabaseDetail) {
        console.log(`[QRTListScreen] Successfully loaded detail from Supabase:`, {
          flight: supabaseDetail.flight,
          sectors: supabaseDetail.sectors.length,
        })
        setSelectedLoadPlan(supabaseDetail)
        return
      } else {
        console.log(`[QRTListScreen] No data found in Supabase for ${loadPlan.flight}`)
        return
      }
    } catch (err) {
      console.error("[QRTListScreen] Error fetching load plan detail:", err)
    }
  }


  // Filter load plan to only show ramp transfer sections
  const filterToRampTransferOnly = (plan: LoadPlanDetail): LoadPlanDetail => {
    const filteredSectors = plan.sectors.map(sector => {
      // Find the index of the first ramp transfer section
      const firstRampTransferIndex = sector.uldSections.findIndex(uldSection => uldSection.isRampTransfer)
      
      if (firstRampTransferIndex === -1) {
        // No ramp transfer sections, return empty sector
        return {
          ...sector,
          uldSections: []
        }
      }
      
      // Return sector with only ramp transfer sections and everything after
      return {
        ...sector,
        uldSections: sector.uldSections.slice(firstRampTransferIndex)
      }
    }).filter(sector => sector.uldSections.length > 0) // Remove sectors with no ramp transfer
    
    return {
      ...plan,
      sectors: filteredSectors
    }
  }

  if (selectedLoadPlan) {
    const filteredPlan = filterToRampTransferOnly(selectedLoadPlan)
    
    return (
      <LoadPlanDetailScreen
        loadPlan={filteredPlan}
        onBack={() => {
          setSelectedLoadPlan(null)
          setSelectedBayInfo(null)
          setSelectedDepartureBayInfo(null)
        }}
        isQRTList={true}
        arrivalBayInfo={selectedBayInfo}
        departureBayInfo={selectedDepartureBayInfo}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header with Upload Button */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">QRT List</h2>
          <div className="flex gap-2">
            <Button onClick={() => setShowPasteModal(true)} variant="outline" className="border-[#D71A21] text-[#D71A21] hover:bg-[#D71A21] hover:text-white">
              <ClipboardPaste className="w-4 h-4 mr-2" />
              Paste Arrival
            </Button>
            <Button onClick={() => setShowPasteDepartureModal(true)} variant="outline" className="border-[#D71A21] text-[#D71A21] hover:bg-[#D71A21] hover:text-white">
              <ClipboardPaste className="w-4 h-4 mr-2" />
              Paste Departure
            </Button>
            <Button onClick={() => setShowUploadModal(true)} className="bg-[#D71A21] hover:bg-[#B01419] text-white">
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>

        {/* Bay Numbers Section Toggle */}
        <div className="mx-2 mb-4">
          <Collapsible open={isArrivalBayNumbersOpen} onOpenChange={setIsBayNumbersOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">Bay Numbers (Arrival)</h3>
                  {bayArrivalData && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {bayArrivalData.rows.length} flights loaded
                    </span>
                  )}
                </div>
                {isArrivalBayNumbersOpen ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-white rounded-lg border border-gray-200 border-t-0 overflow-hidden">
                {bayArrivalData ? (
                  <div className="max-h-[400px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {bayArrivalData.headers.map((header, i) => (
                            <th
                              key={i}
                              className="px-3 py-2 text-left font-semibold text-gray-700 border-b whitespace-nowrap text-xs"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bayArrivalData.rows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            {bayArrivalData.headers.map((_, colIndex) => (
                              <td
                                key={colIndex}
                                className="px-3 py-1.5 border-b border-gray-100 whitespace-nowrap text-xs"
                              >
                                {row[colIndex] || ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4">
                    <p className="text-sm text-gray-500">
                      No arrival bay data loaded. Click "Paste Arrival" to import from the legacy system.
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Departure Numbers Section Toggle */}
        <div className="mx-2 mb-4">
          <Collapsible open={isDepartureBayNumbersOpen} onOpenChange={setIsDepartureNumbersOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">Bay Numbers (Departure)</h3>
                  {bayDepartureData && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {bayDepartureData.rows.length} flights loaded
                    </span>
                  )}
                </div>
                {isDepartureBayNumbersOpen ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-white rounded-lg border border-gray-200 border-t-0 overflow-hidden">
                {bayDepartureData ? (
                  <div className="max-h-[400px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {bayDepartureData.headers.map((header, i) => (
                            <th
                              key={i}
                              className="px-3 py-2 text-left font-semibold text-gray-700 border-b whitespace-nowrap text-xs"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bayDepartureData.rows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            {bayDepartureData.headers.map((_, colIndex) => (
                              <td
                                key={colIndex}
                                className="px-3 py-1.5 border-b border-gray-100 whitespace-nowrap text-xs"
                              >
                                {row[colIndex] || ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4">
                    <p className="text-sm text-gray-500">
                      No departure data loaded. Click "Paste Departure" to import from the legacy system.
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="mx-2 rounded-lg border border-gray-200 overflow-x-auto">
          <div className="bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-[#D71A21] text-white">
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Flight</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Date</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ACFT TYPE</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ACFT REG</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Route</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">STD</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">TTL PLN ULD</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ULD Version</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-center text-gray-500 text-sm">
                      Loading load plans...
                    </td>
                  </tr>
                ) : filteredLoadPlans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-center text-gray-500 text-sm">
                      {loadPlans.length === 0 ? "No load plans available" : "No load plans match the selected filters"}
                    </td>
                  </tr>
                ) : (
                  filteredLoadPlans.map((loadPlan, index) => (
                    <LoadPlanRow key={index} loadPlan={loadPlan} flightIndex={index} onClick={handleRowClick} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dummy Upload Modal - Empty and useless */}
      <UploadModal
        isOpen={showUploadModal}
        isProcessing={false}
        isDragging={false}
        progress={0}
        error={null}
        uploadedFile={null}
        fileInputRef={fileInputRef}
        onClose={() => setShowUploadModal(false)}
        onDragOver={() => {}}
        onDragLeave={() => {}}
        onDrop={() => {}}
        onFileInputChange={() => {}}
      />

      {/* Clipboard Paste Modal for Bay Data */}
      <ClipboardPasteModal
        isOpen={showPasteArrivalModal}
        onClose={() => setShowPasteModal(false)}
        title="Paste Arrival Data"
        description="Copy the arrival bay/flight table from the legacy system and paste below"
        onConfirm={(data) => {
          setBayNumberData(data)
        }}
      />

      {/* Clipboard Paste Modal for Departure Data */}
      <ClipboardPasteModal
        isOpen={showPasteDepartureModal}
        onClose={() => setShowPasteDepartureModal(false)}
        title="Paste Departure Data"
        description="Copy the departure table from the legacy system and paste below"
        onConfirm={(data) => {
          setBayDepartureData(data)
        }}
      />
    </div>
  )
}

interface LoadPlanRowProps {
  loadPlan: LoadPlan
  flightIndex: number
  onClick: (loadPlan: LoadPlan, flightIndex: number) => void
}

function LoadPlanRow({ loadPlan, flightIndex, onClick }: LoadPlanRowProps) {
  return (
    <tr
      onClick={() => onClick(loadPlan, flightIndex)}
      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
        {loadPlan.flight}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.date}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.acftType}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.acftReg}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.pax}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.std}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.ttlPlnUld}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.uldVersion}</td>
      <td className="px-2 py-1 w-10">
        <ChevronRight className="h-4 w-4 text-gray-600 hover:text-[#D71A21]" />
      </td>
    </tr>
  )
}
