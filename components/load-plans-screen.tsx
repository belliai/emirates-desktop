"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Upload } from "lucide-react"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail } from "./load-plan-types"
import { extractTextFromFile } from "@/lib/lists/file-extractors"
import { UploadModal } from "./lists/upload-modal"
import { Button } from "@/components/ui/button"
import { useLoadPlans, type LoadPlan } from "@/lib/load-plan-context"
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase } from "@/lib/load-plans-supabase"
import { parseHeader, parseShipments } from "@/lib/lists/parser"
import { saveListsDataToSupabase } from "@/lib/lists/supabase-save"
import type { ListsResults } from "@/lib/lists/types"
import { generateSpecialCargoReport, generateVUNList, generateQRTList } from "@/lib/lists/report-generators"


export default function LoadPlansScreen({ onLoadPlanSelect }: { onLoadPlanSelect?: (loadPlan: LoadPlan) => void }) {
  const { loadPlans, addLoadPlan, setLoadPlans } = useLoadPlans()
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [savedDetails, setSavedDetails] = useState<Map<string, LoadPlanDetail>>(new Map())
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch load plans from Supabase on mount
  useEffect(() => {
    const fetchLoadPlans = async () => {
      setIsLoading(true)
      try {
        const supabaseLoadPlans = await getLoadPlansFromSupabase()
        if (supabaseLoadPlans.length > 0) {
          setLoadPlans(supabaseLoadPlans)
          console.log(`[LoadPlansScreen] Loaded ${supabaseLoadPlans.length} load plans from Supabase`)
        } else {
          // Clear load plans if no data from Supabase
          setLoadPlans([])
          console.log("[LoadPlansScreen] No load plans from Supabase, clearing load plans")
        }
      } catch (err) {
        console.error("[LoadPlansScreen] Error fetching load plans:", err)
        // Clear load plans on error too
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
      console.log(`[LoadPlansScreen] Using saved detail for ${loadPlan.flight}`)
      setSelectedLoadPlan(savedDetail)
      return
    }

    // Try to fetch from Supabase
    try {
      console.log(`[LoadPlansScreen] Fetching load plan detail from Supabase for ${loadPlan.flight}`)
      const supabaseDetail = await getLoadPlanDetailFromSupabase(loadPlan.flight)
      if (supabaseDetail) {
        console.log(`[LoadPlansScreen] Successfully loaded detail from Supabase:`, {
          flight: supabaseDetail.flight,
          sectors: supabaseDetail.sectors.length,
          totalItems: supabaseDetail.sectors.reduce((sum, s) => sum + s.uldSections.reduce((sum2, u) => sum2 + u.awbs.length, 0), 0)
        })
        setSelectedLoadPlan(supabaseDetail)
        return
      } else {
        console.log(`[LoadPlansScreen] No data found in Supabase for ${loadPlan.flight}`)
        // Don't show dummy data - just return or show message
        if (onLoadPlanSelect) {
          onLoadPlanSelect(loadPlan)
        }
        return
      }
    } catch (err) {
      console.error("[LoadPlansScreen] Error fetching load plan detail:", err)
      // Don't show dummy data on error either
      if (onLoadPlanSelect) {
        onLoadPlanSelect(loadPlan)
      }
    }
  }

  const handleSave = (updatedPlan: LoadPlanDetail) => {
    setSavedDetails((prev) => {
      const updated = new Map(prev)
      updated.set(updatedPlan.flight, updatedPlan)
      return updated
    })
  }

  const handleFileUpload = async (files: File | File[]) => {
    setError(null)
    setIsProcessing(true)
    setProgress(0)
    
    const fileArray = Array.isArray(files) ? files : [files]
    setUploadedFile(fileArray[0])

    try {
      const validExtensions = [".md", ".txt", ".rtf", ".docx", ".doc", ".pdf"]
      
      // Validate all files
      for (const f of fileArray) {
        const hasValidExtension = validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
        if (!hasValidExtension) {
          throw new Error(`Invalid file type: ${f.name}. Please upload MD, DOCX, DOC, or PDF files.`)
        }
        if (f.size > 10 * 1024 * 1024) {
          throw new Error(`File size exceeds 10MB: ${f.name}`)
        }
      }

      let totalAddedCount = 0
      let totalSkippedCount = 0
      const skippedFlights: string[] = []
      const failedFiles: string[] = []

      // Process each file and save to Supabase
      for (let i = 0; i < fileArray.length; i++) {
        const f = fileArray[i]
        const fileProgress = Math.floor((i / fileArray.length) * 80) + 10
        setProgress(fileProgress)

        try {
          const content = await extractTextFromFile(f)
          console.log('[LoadPlansScreen] Extracted content length:', content.length)

          const header = parseHeader(content)
          if (!header.flightNumber) {
            console.error('[LoadPlansScreen] Could not parse flight number from file:', f.name)
            failedFiles.push(f.name)
            continue
          }

          const shipments = parseShipments(content, header)
          console.log('[LoadPlansScreen] Parsed shipments from', f.name, ':', shipments.length)
          
          // Log ramp transfer detection
          const rampTransferShipments = shipments.filter(s => s.isRampTransfer)
          const regularShipments = shipments.filter(s => !s.isRampTransfer)
          console.log('[LoadPlansScreen] Ramp transfer shipments:', rampTransferShipments.length)
          console.log('[LoadPlansScreen] Regular shipments:', regularShipments.length)
          if (rampTransferShipments.length > 0) {
            console.log('[LoadPlansScreen] Sample ramp transfer shipments:', 
              rampTransferShipments.slice(0, 3).map(s => ({
                serialNo: s.serialNo,
                awbNo: s.awbNo,
                isRampTransfer: s.isRampTransfer
              }))
            )
          }

          // Generate reports (required for saveListsDataToSupabase)
          const specialCargo = generateSpecialCargoReport(header, shipments)
          const vunList = generateVUNList(header, shipments)
          const qrtList = generateQRTList(header, shipments)

          const results: ListsResults = { 
            specialCargo, 
            vunList, 
            qrtList, 
            header, 
            shipments 
          }

          // Save to Supabase
          const saveResult = await saveListsDataToSupabase({
            results,
            shipments,
            fileName: f.name,
            fileSize: f.size,
          })

          if (saveResult.success) {
            console.log('[LoadPlansScreen] Data saved to Supabase successfully for', f.name, ', load_plan_id:', saveResult.loadPlanId)
            
            // Check if flight already exists in current list
            const exists = loadPlans.some((lp) => lp.flight === header.flightNumber)
            if (exists) {
              totalSkippedCount++
              skippedFlights.push(header.flightNumber)
            } else {
              totalAddedCount++
            }
          } else {
            console.error('[LoadPlansScreen] Failed to save data to Supabase for', f.name, ':', saveResult.error)
            failedFiles.push(f.name)
          }
        } catch (fileError) {
          console.error(`[LoadPlansScreen] Error processing file ${f.name}:`, fileError)
          failedFiles.push(f.name)
        }
      }

      setProgress(90)

      // Refresh load plans from Supabase after processing all files
      try {
        const supabaseLoadPlans = await getLoadPlansFromSupabase()
        if (supabaseLoadPlans.length > 0) {
          setLoadPlans(supabaseLoadPlans)
        }
      } catch (refreshError) {
        console.error("[LoadPlansScreen] Error refreshing load plans:", refreshError)
      }

      setProgress(100)

      if (totalAddedCount > 0 || totalSkippedCount > 0) {
        let message = `Processed ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}. `
        if (totalAddedCount > 0) {
          message += `Successfully added ${totalAddedCount} load plan${totalAddedCount > 1 ? "s" : ""}. `
        }
        if (totalSkippedCount > 0) {
          message += `${totalSkippedCount} flight${totalSkippedCount > 1 ? "s" : ""} already exist${totalSkippedCount > 1 ? "" : "s"} (${skippedFlights.slice(0, 5).join(", ")}${skippedFlights.length > 5 ? `, and ${skippedFlights.length - 5} more` : ""}) and ${totalSkippedCount > 1 ? "were" : "was"} updated. `
        }
        if (failedFiles.length > 0) {
          message += `${failedFiles.length} file${failedFiles.length > 1 ? "s" : ""} could not be processed (${failedFiles.slice(0, 3).join(", ")}${failedFiles.length > 3 ? "..." : ""}).`
        }

        setTimeout(() => {
          alert(message)
        }, 100)
      } else if (failedFiles.length === fileArray.length) {
        throw new Error(`Could not process any files. Please check the file format${fileArray.length > 1 ? "s" : ""}.`)
      }

      setShowUploadModal(false)
    } catch (err) {
      console.error("[LoadPlansScreen] File upload error:", err)
      setError(err instanceof Error ? err.message : "An error occurred while processing the file")
      setProgress(0)
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(Array.from(files))
    }
  }

  if (selectedLoadPlan) {
    return (
      <LoadPlanDetailScreen
        loadPlan={selectedLoadPlan}
        onBack={() => setSelectedLoadPlan(null)}
        onSave={handleSave}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header with Upload Button */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">Load Plans</h2>
          <Button onClick={() => setShowUploadModal(true)} className="bg-[#D71A21] hover:bg-[#B01419] text-white">
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
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

      <UploadModal
        isOpen={showUploadModal}
        isProcessing={isProcessing}
        isDragging={isDragging}
        progress={progress}
        error={error}
        uploadedFile={uploadedFile}
        fileInputRef={fileInputRef}
        onClose={() => setShowUploadModal(false)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileInputChange={handleFileInputChange}
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
