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
  const [bayArrivalData, setBayNumberData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [bayDepartureData, setBayDepartureData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
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
