"use client"

import { useState, useEffect, useRef } from 'react'
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Upload, ChevronDown, ClipboardPaste } from 'lucide-react'
import LoadPlanDetailScreen from './load-plan-detail-screen'
import type { LoadPlanDetail } from './load-plan-types'
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase } from '@/lib/load-plans-supabase'
import { useLoadPlans, type LoadPlan } from '@/lib/load-plan-context'
import { Button } from '@/components/ui/button'
import { UploadModal } from './lists/upload-modal'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ClipboardPasteModal } from './clipboard-paste-modal'

interface QRTListScreenProps {
  onBack?: () => void
}

export default function QRTListScreen({ onBack }: QRTListScreenProps) {
  const { loadPlans, setLoadPlans } = useLoadPlans()
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [savedDetails, setSavedDetails] = useState<Map<string, LoadPlanDetail>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [isBayNumbersOpen, setIsBayNumbersOpen] = useState(false)
  const [bayNumberData, setBayNumberData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  const handleRowClick = async (loadPlan: LoadPlan) => {
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

  // Generate placeholder bay numbers and connection times based on destination
  const addQRTFields = (plan: LoadPlanDetail): LoadPlanDetail => {
    // Bay number mapping based on common Dubai Airport cargo bays (Terminal 2/3 cargo areas)
    const bayNumberMap: Record<string, string> = {
      'JFK': 'C12', 'LHR': 'C15', 'CDG': 'C18', 'FRA': 'C20',
      'AMS': 'C22', 'MXP': 'C25', 'DXB': 'C30', 'BOM': 'C35',
      'DEL': 'C38', 'BKK': 'C40', 'SIN': 'C42', 'HKG': 'C45',
      'SYD': 'C48', 'MEL': 'C50', 'LAX': 'C52', 'SFO': 'C55',
      'IAD': 'C58', 'ORD': 'C60', 'ATL': 'C62', 'MIA': 'C65',
      'RUH': 'C28', 'JED': 'C32', 'CAI': 'C36', 'IST': 'C40',
      'DOH': 'C33', 'KWI': 'C34', 'BAH': 'C35', 'AUH': 'C31',
    }
    
    // Connection time calculation (D-3 means 3 hours before STD)
    const getConnectionTime = (std: string): string => {
      if (!std || std.length < 5) return 'D-3'
      try {
        const [hours, minutes] = std.split(':').map(Number)
        if (isNaN(hours) || isNaN(minutes)) return 'D-3'
        
        // Calculate 3 hours before STD
        let connHours = hours - 3
        let connMinutes = minutes
        
        // Handle negative hours (wrap around)
        if (connHours < 0) {
          connHours += 24
        }
        
        const connHoursStr = String(connHours).padStart(2, '0')
        const connMinutesStr = String(connMinutes).padStart(2, '0')
        return `${connHoursStr}:${connMinutesStr}`
      } catch {
        return 'D-3'
      }
    }
    
    const updatedPlan = {
      ...plan,
      sectors: plan.sectors.map(sector => ({
        ...sector,
        uldSections: sector.uldSections.map(uldSection => ({
          ...uldSection,
          awbs: uldSection.awbs.map(awb => {
            // Extract destination from orgDes (format: "DXBRUH" or "RUH", last 3 chars or first 3)
            let dest = ''
            if (awb.orgDes && awb.orgDes.length >= 3) {
              // Try last 3 characters first (destination)
              dest = awb.orgDes.substring(awb.orgDes.length - 3).toUpperCase()
              // If it starts with DXB, try the part after DXB
              if (awb.orgDes.toUpperCase().startsWith('DXB') && awb.orgDes.length > 3) {
                dest = awb.orgDes.substring(3).toUpperCase()
              }
            }
            
            // Get bay number from map or generate based on destination code
            let bayNumber = bayNumberMap[dest] || ''
            if (!bayNumber && dest) {
              // Generate a bay number based on destination code hash
              const hash = dest.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
              bayNumber = `C${(hash % 50) + 10}` // C10 to C59
            }
            if (!bayNumber) {
              bayNumber = 'C30' // Default to C30 (DXB)
            }
            
            // Calculate connection time (3 hours before STD)
            const connTime = getConnectionTime(plan.std)
            
            return {
              ...awb,
              bayNumber: awb.bayNumber || bayNumber,
              connTime: awb.connTime || connTime,
            }
          })
        }))
      }))
    }
    
    return updatedPlan
  }

  if (selectedLoadPlan) {
    const filteredPlan = filterToRampTransferOnly(selectedLoadPlan)
    const planWithQRTFields = addQRTFields(filteredPlan)
    return (
      <LoadPlanDetailScreen
        loadPlan={planWithQRTFields}
        onBack={() => setSelectedLoadPlan(null)}
        onSave={handleSave}
        isQRTList={true}
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
