"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Upload, Trash2, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail } from "./load-plan-types"
import { extractTextFromFile } from "@/lib/lists/file-extractors"
import { UploadModal } from "./lists/upload-modal"
import { Button } from "@/components/ui/button"
import { useLoadPlans, type LoadPlan } from "@/lib/load-plan-context"
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase, deleteLoadPlanFromSupabase } from "@/lib/load-plans-supabase"
import { parseHeader, parseShipments, detectCriticalFromFileImages } from "@/lib/lists/parser"
import { parseRTFHeader, parseRTFShipments, parseRTFFileWithStreamParser } from "@/lib/lists/rtf-parser"
import { saveListsDataToSupabase } from "@/lib/lists/supabase-save"
import type { ListsResults } from "@/lib/lists/types"
import { generateSpecialCargoReport, generateVUNList, generateQRTList } from "@/lib/lists/report-generators"

// Delete Confirmation Modal Component
type DeleteModalState = {
  isOpen: boolean
  type: "confirm" | "success" | "error"
  flight: string
  message?: string
}

function DeleteConfirmationModal({ 
  state, 
  onClose, 
  onConfirm 
}: { 
  state: DeleteModalState
  onClose: () => void
  onConfirm: () => void
}) {
  const [confirmText, setConfirmText] = useState("")
  const confirmWord = "DELETE"
  const isConfirmValid = confirmText === confirmWord

  // Reset confirm text when modal opens/closes
  useEffect(() => {
    if (!state.isOpen) {
      setConfirmText("")
    }
  }, [state.isOpen])

  if (!state.isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            {state.type === "confirm" && (
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            )}
            {state.type === "success" && (
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            )}
            {state.type === "error" && (
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-3">
            {state.type === "confirm" && "Delete Load Plan?"}
            {state.type === "success" && "Success!"}
            {state.type === "error" && "Error"}
          </h3>

          {/* Content */}
          <div className="text-center text-gray-600 text-sm mb-4">
            {state.type === "confirm" && (
              <>
                <p>Are you sure you want to delete the load plan for flight <strong className="text-gray-900">{state.flight}</strong>?</p>
                <p className="mt-2 text-gray-500">This action will delete the load plan and all related items. This action cannot be undone.</p>
              </>
            )}
            {state.type === "success" && (
              <p>Load plan for flight <strong className="text-gray-900">{state.flight}</strong> has been deleted.</p>
            )}
            {state.type === "error" && (
              <p>{state.message || "An error occurred while deleting the load plan."}</p>
            )}
          </div>

          {/* Type to confirm */}
          {state.type === "confirm" && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2 text-center">
                Type <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{confirmWord}</span> to confirm
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder={confirmWord}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
                autoFocus
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {state.type === "confirm" ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#D71A21] hover:bg-[#B01419] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={onConfirm}
                  disabled={!isConfirmValid}
                >
                  Delete
                </Button>
              </>
            ) : (
              <Button
                className="w-full bg-[#D71A21] hover:bg-[#B01419] text-white"
                onClick={onClose}
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


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
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ isOpen: false, type: "confirm", flight: "" })
  const [pendingDeletePlan, setPendingDeletePlan] = useState<LoadPlan | null>(null)

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

  const handleDelete = (loadPlan: LoadPlan, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click when clicking delete button
    setPendingDeletePlan(loadPlan)
    setDeleteModal({ isOpen: true, type: "confirm", flight: loadPlan.flight })
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeletePlan) return

    setDeleteModal(prev => ({ ...prev, isOpen: false }))
    
    try {
      setIsLoading(true)
      const deleteResult = await deleteLoadPlanFromSupabase(pendingDeletePlan.flight)
      
      if (deleteResult.success) {
        // Remove from saved details if exists
        setSavedDetails((prev) => {
          const updated = new Map(prev)
          updated.delete(pendingDeletePlan.flight)
          return updated
        })
        
        // Refresh load plans from Supabase
        const supabaseLoadPlans = await getLoadPlansFromSupabase()
        if (supabaseLoadPlans.length > 0) {
          setLoadPlans(supabaseLoadPlans)
        } else {
          setLoadPlans([])
        }
        
        console.log(`[LoadPlansScreen] Successfully deleted load plan ${pendingDeletePlan.flight}`)
        
        // Show success message
        setDeleteModal({ isOpen: true, type: "success", flight: pendingDeletePlan.flight })
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          setDeleteModal({ isOpen: false, type: "confirm", flight: "" })
          setPendingDeletePlan(null)
        }, 2000)
      } else {
        // Show error message
        setDeleteModal({ 
          isOpen: true, 
          type: "error", 
          flight: pendingDeletePlan.flight,
          message: `Failed to delete load plan: ${deleteResult.error || "Unknown error"}`
        })
      }
    } catch (err) {
      console.error("[LoadPlansScreen] Error deleting load plan:", err)
      // Show error message
      setDeleteModal({ 
        isOpen: true, 
        type: "error", 
        flight: pendingDeletePlan.flight,
        message: `An error occurred while deleting the load plan: ${err instanceof Error ? err.message : "Unknown error"}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseDeleteModal = () => {
    setDeleteModal({ isOpen: false, type: "confirm", flight: "" })
    setPendingDeletePlan(null)
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
          throw new Error(`Invalid file type: ${f.name}. Please upload MD, DOCX, DOC, RTF, or PDF files.`)
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
          // Check if file is RTF
          const isRTF = f.name.toLowerCase().endsWith('.rtf')
          let header, shipments
          
          if (isRTF) {
            // Use new rtf-stream-parser function - NO DOCX conversion, direct RTF processing
            console.log('[LoadPlansScreen] Processing RTF file directly with rtf-stream-parser (no DOCX conversion):', f.name)
            
            try {
              const result = await parseRTFFileWithStreamParser(f)
              header = result.header
              
              // If CRITICAL not detected in text, try OCR on images (for RTF converted to DOCX if needed)
              if (!header.isCritical) {
                console.log('[LoadPlansScreen] CRITICAL not detected in RTF text, trying OCR on images...')
                try {
                  // Note: RTF image extraction is complex, but we can try if file was converted
                  // For now, we'll try OCR detection which might work if images are accessible
                  const isCriticalFromOCR = await detectCriticalFromFileImages(f)
                  if (isCriticalFromOCR) {
                    header.isCritical = true
                    console.log('[LoadPlansScreen] ✅ CRITICAL detected via OCR in RTF!')
                  } else {
                    console.log('[LoadPlansScreen] ⚠️ CRITICAL not detected via OCR in RTF')
                  }
                } catch (ocrError) {
                  console.warn('[LoadPlansScreen] OCR detection failed for RTF (expected):', ocrError)
                  // OCR for RTF is not fully implemented, this is expected
                }
              } else {
                console.log('[LoadPlansScreen] ✅ CRITICAL already detected in RTF text')
              }
              
              shipments = result.shipments
              
              console.log('[LoadPlansScreen] ✅ Successfully parsed RTF file with rtf-stream-parser')
              console.log('[LoadPlansScreen] Parsed shipments:', shipments.length)
            } catch (rtfError) {
              console.error('[LoadPlansScreen] Error parsing RTF file:', rtfError)
              failedFiles.push(f.name)
              continue
            }
          } else {
            // Process file normally (DOCX, PDF, etc.)
            console.log('[LoadPlansScreen] Processing non-RTF file:', f.name)
            const content = await extractTextFromFile(f)
            console.log('[LoadPlansScreen] Extracted content length:', content.length)
            
            header = parseHeader(content)
            if (!header.flightNumber) {
              // Try to extract from filename
              const filenameMatch = f.name.match(/EK\s*[-]?\s*(\d{4})/i)
              if (filenameMatch) {
                header.flightNumber = `EK${filenameMatch[1]}`
                console.log('[LoadPlansScreen] Extracted flight number from filename:', header.flightNumber)
              } else {
                console.error('[LoadPlansScreen] Could not parse flight number from file:', f.name)
                failedFiles.push(f.name)
                continue
              }
            }
            
            // Always try OCR on images (stamps are usually images, not text)
            // OCR is more reliable for detecting visual stamps even if text detection found something
            console.log('[LoadPlansScreen] ========================================')
            console.log('[LoadPlansScreen] Starting OCR detection for CRITICAL stamp...')
            console.log('[LoadPlansScreen] File name:', f.name)
            console.log('[LoadPlansScreen] File type:', f.type)
            console.log('[LoadPlansScreen] File size:', f.size, 'bytes')
            console.log('[LoadPlansScreen] ========================================')
            try {
              const isCriticalFromOCR = await detectCriticalFromFileImages(f)
              if (isCriticalFromOCR) {
                header.isCritical = true
                console.log('[LoadPlansScreen] ✅ CRITICAL detected via OCR!')
              } else {
                console.log('[LoadPlansScreen] ⚠️ CRITICAL not detected via OCR')
                if (!header.isCritical) {
                  console.log('[LoadPlansScreen] ⚠️ CRITICAL not detected in text or images')
                } else {
                  console.log('[LoadPlansScreen] ✅ CRITICAL was detected in text (but not in images)')
                }
              }
            } catch (ocrError) {
              console.error('[LoadPlansScreen] Error during OCR detection:', ocrError)
              // Don't fail the whole process if OCR fails
            }
            
            shipments = parseShipments(content, header)
          }
          
          const processingNote = isRTF ? '(RTF processed directly with rtf-stream-parser)' : ''
          console.log('[LoadPlansScreen] Parsed shipments from', f.name, processingNote, ':', shipments.length)
          
          // Validate that we have shipments
          if (!shipments || shipments.length === 0) {
            console.error('[LoadPlansScreen] No shipments parsed from file:', f.name)
            failedFiles.push(f.name)
            continue
          }
          
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

          // Validate shipments before saving
          console.log('[LoadPlansScreen] About to save to Supabase:', {
            flightNumber: header.flightNumber,
            shipmentsCount: shipments.length,
            fileName: f.name,
            isCritical: header.isCritical,
          })
          console.log('[LoadPlansScreen] Header object before save:', {
            ...header,
            isCritical: header.isCritical,
          })
          
          // Save to Supabase
          const saveResult = await saveListsDataToSupabase({
            results,
            shipments,
            fileName: f.name,
            fileSize: f.size,
          })

          if (saveResult.success) {
            console.log('[LoadPlansScreen] ✅ Data saved to Supabase successfully for', f.name, isRTF ? '(converted from RTF)' : '', ', load_plan_id:', saveResult.loadPlanId)
            console.log('[LoadPlansScreen] Saved', shipments.length, 'shipments to load_plan_items')
            
            // Check if flight already exists in current list
            const exists = loadPlans.some((lp) => lp.flight === header.flightNumber)
            if (exists) {
              totalSkippedCount++
              skippedFlights.push(header.flightNumber)
            } else {
              totalAddedCount++
            }
          } else {
            console.error('[LoadPlansScreen] ❌ Failed to save to Supabase:', saveResult.error)
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
                  <th className="px-2 py-1 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-2 text-center text-gray-500 text-sm">
                      Loading load plans...
                    </td>
                  </tr>
                ) : loadPlans.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-2 text-center text-gray-500 text-sm">
                      No load plans available
                    </td>
                  </tr>
                ) : (
                  loadPlans.map((loadPlan, index) => (
                    <LoadPlanRow key={index} loadPlan={loadPlan} onClick={handleRowClick} onDelete={handleDelete} />
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
        title="Upload Load Plans"
        description="Upload your load plan files (DOCX, DOC, RTF, PDF, MD, TXT)"
        accept=".docx,.doc,.rtf,.pdf,.md,.txt"
        fileTypeDescription="DOCX, DOC, RTF, PDF, MD, TXT - Maximum file size 10 MB (multiple files supported)"
      />

      <DeleteConfirmationModal
        state={deleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

interface LoadPlanRowProps {
  loadPlan: LoadPlan
  onClick: (loadPlan: LoadPlan) => void
  onDelete: (loadPlan: LoadPlan, e: React.MouseEvent) => void
}

function LoadPlanRow({ loadPlan, onClick, onDelete }: LoadPlanRowProps) {
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
      <td className="px-2 py-1 w-10">
        <button
          onClick={(e) => onDelete(loadPlan, e)}
          className="p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700 transition-colors"
          title="Hapus Load Plan"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}
