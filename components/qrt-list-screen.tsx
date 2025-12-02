"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Upload, ChevronDown, ClipboardPaste } from 'lucide-react'
import LoadPlanDetailScreen from './load-plan-detail-screen'
import type { LoadPlanDetail } from './load-plan-types'
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase } from '@/lib/load-plans-supabase'
import { useLoadPlans, type LoadPlan } from '@/lib/load-plan-context'
import { Button } from '@/components/ui/button'
import { UploadModal } from './lists/upload-modal'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ClipboardPasteModal } from './clipboard-paste-modal'

// Type for bay info data from pasted CSV
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

// Normalize flight number for matching (remove spaces, uppercase)
function normalizeFlightNo(flightNo: string): string {
  return flightNo.replace(/\s+/g, '').toUpperCase()
}

// Parse bay data row into BayInfo object
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

interface QRTListScreenProps {
  onBack?: () => void
}

export default function QRTListScreen({ onBack }: QRTListScreenProps) {
  const { loadPlans, setLoadPlans } = useLoadPlans()
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [selectedBayInfo, setSelectedBayInfo] = useState<BayInfo | null>(null)
  const [savedDetails, setSavedDetails] = useState<Map<string, LoadPlanDetail>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [isBayNumbersOpen, setIsBayNumbersOpen] = useState(false)
  const [bayNumberData, setBayNumberData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Create a lookup map from bay data by normalized flight number
  const bayInfoLookup = useMemo(() => {
    const lookup = new Map<string, BayInfo>()
    if (bayNumberData) {
      bayNumberData.rows.forEach(row => {
        const bayInfo = parseBayInfoRow(bayNumberData.headers, row)
        const normalizedFlightNo = normalizeFlightNo(bayInfo.flightNo)
        if (normalizedFlightNo) {
          lookup.set(normalizedFlightNo, bayInfo)
        }
      })
    }
    return lookup
  }, [bayNumberData])

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

  // Sample bay info for demo when no data is pasted
  const sampleBayInfo: BayInfo = {
    sta: '11/27/25 23:00',
    flightNo: 'EK 0206',
    orig: 'JFK/MXP',
    via: 'MXP',
    eta: '2:12',
    ata: '',
    acType: 'A380',
    regn: 'A6EEX',
    pos: 'D08/A15',
    term: 'T3',
    belt: '',
    remarks: '',
  }

  const handleRowClick = async (loadPlan: LoadPlan) => {
    // Pick a random bay info row to display, or use sample if no data pasted
    let bayInfo: BayInfo = sampleBayInfo
    if (bayNumberData && bayNumberData.rows.length > 0) {
      const randomIndex = Math.floor(Math.random() * bayNumberData.rows.length)
      bayInfo = parseBayInfoRow(bayNumberData.headers, bayNumberData.rows[randomIndex])
    }
    setSelectedBayInfo(bayInfo)
    
    // Check if we have a saved version first
    const savedDetail = savedDetails.get(loadPlan.flight)
    if (savedDetail) {
      console.log(`[QRTListScreen] Using saved detail for ${loadPlan.flight}`)
      setSelectedLoadPlan(savedDetail)
      return
    }

    // Try to fetch from Supabase
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

  const handleSave = (updatedPlan: LoadPlanDetail) => {
    setSavedDetails((prev) => {
      const updated = new Map(prev)
      updated.set(updatedPlan.flight, updatedPlan)
      return updated
    })
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
      <div className="min-h-screen bg-gray-50">
        {/* Bay Info Table */}
        {selectedBayInfo && (
          <div className="bg-white border-b border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">STA</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">FLIGHTNO</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">ORIG</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">VIA</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">ETA</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">ATA</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">A/T</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">REGN</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">POS</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">TERM</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">BELT</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.sta}</td>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.flightNo}</td>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.orig}</td>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.via}</td>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.eta}</td>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.ata}</td>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.acType}</td>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.regn}</td>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.pos}</td>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.term}</td>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.belt}</td>
                  <td className="px-4 py-2 text-gray-900">{selectedBayInfo.remarks}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        
        <LoadPlanDetailScreen
          loadPlan={filteredPlan}
          onBack={() => {
            setSelectedLoadPlan(null)
            setSelectedBayInfo(null)
          }}
          onSave={handleSave}
          isQRTList={true}
        />
      </div>
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
              Paste Bay Data
            </Button>
            <Button onClick={() => setShowUploadModal(true)} className="bg-[#D71A21] hover:bg-[#B01419] text-white">
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>

        {/* Bay Numbers Section Toggle */}
        <div className="mx-2 mb-4">
          <Collapsible open={isBayNumbersOpen} onOpenChange={setIsBayNumbersOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">Bay Numbers</h3>
                  {bayNumberData && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {bayNumberData.rows.length} flights loaded
                    </span>
                  )}
                </div>
                {isBayNumbersOpen ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-white rounded-lg border border-gray-200 border-t-0 overflow-hidden">
                {bayNumberData ? (
                  <div className="max-h-[400px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {bayNumberData.headers.map((header, i) => (
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
                        {bayNumberData.rows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            {bayNumberData.headers.map((_, colIndex) => (
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
                      No bay data loaded. Click "Paste Bay Data" to import from the legacy system.
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
                      <span className="whitespace-nowrap">PAX</span>
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
                ) : loadPlans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-center text-gray-500 text-sm">
                      No load plans available
                    </td>
                  </tr>
                ) : (
                  loadPlans.map((loadPlan, index) => (
                    <LoadPlanRow key={index} loadPlan={loadPlan} onClick={handleRowClick} />
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
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        title="Paste Bay Data"
        description="Copy the bay/flight table from the legacy system and paste below"
        onConfirm={(data) => {
          setBayNumberData(data)
          setIsBayNumbersOpen(true)
        }}
      />
    </div>
  )
}

interface LoadPlanRowProps {
  loadPlan: LoadPlan
  onClick: (loadPlan: LoadPlan) => void
}

function LoadPlanRow({ loadPlan, onClick }: LoadPlanRowProps) {
  return (
    <tr
      onClick={() => onClick(loadPlan)}
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
