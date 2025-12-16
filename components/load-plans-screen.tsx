"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Upload, Trash2, AlertTriangle, CheckCircle, XCircle, Plus, Search, SlidersHorizontal, Settings2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Swal from "sweetalert2"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail } from "./load-plan-types"
import { extractTextFromFile, extractTextFromDOCX, extractImagesFromDOCX } from "@/lib/lists/file-extractors"
import { UploadModal } from "./lists/upload-modal"
import { Button } from "@/components/ui/button"
import { useLoadPlans, type LoadPlan, type ShiftType, type PeriodType, type WaveType } from "@/lib/load-plan-context"
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase, deleteLoadPlanFromSupabase } from "@/lib/load-plans-supabase"
import { parseHeader, parseShipments, detectCriticalFromFileImages } from "@/lib/lists/parser"
import { useWorkAreaFilter, WorkAreaFilterControls, WorkAreaFilterProvider } from "./work-area-filter-controls"
import { saveListsDataToSupabase } from "@/lib/lists/supabase-save"
import type { ListsResults } from "@/lib/lists/types"
import { generateSpecialCargoReport, generateVUNList, generateQRTList } from "@/lib/lists/report-generators"

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


// Wrapper component that provides the WorkAreaFilter context
export default function LoadPlansScreen({ onLoadPlanSelect }: { onLoadPlanSelect?: (loadPlan: LoadPlan) => void }) {
  return (
    <WorkAreaFilterProvider>
      <LoadPlansScreenContent onLoadPlanSelect={onLoadPlanSelect} />
    </WorkAreaFilterProvider>
  )
}

// Inner component that uses the shared WorkAreaFilter context
function LoadPlansScreenContent({ onLoadPlanSelect }: { onLoadPlanSelect?: (loadPlan: LoadPlan) => void }) {
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
  const [showAddFilterDropdown, setShowAddFilterDropdown] = useState(false)
  const [showViewOptions, setShowViewOptions] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [shiftFilter, setShiftFilter] = useState<ShiftType>("current")
  const [periodFilter, setPeriodFilter] = useState<PeriodType>("all")
  const [waveFilter, setWaveFilter] = useState<WaveType>("all")
  // Work area filter hook
  const { selectedWorkArea, pilPerSubFilter } = useWorkAreaFilter()
  const [sortColumn, setSortColumn] = useState<"std" | "flight" | "date">("std")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const addFilterRef = useRef<HTMLDivElement>(null)
  const viewOptionsRef = useRef<HTMLDivElement>(null)

  // Fetch load plans from Supabase on mount
  useEffect(() => {
    const fetchLoadPlans = async () => {
      setIsLoading(true)
      try {
        const supabaseLoadPlans = await getLoadPlansFromSupabase()
        if (supabaseLoadPlans.length > 0) {
          setLoadPlans(supabaseLoadPlans)
        } else {
          // Clear load plans if no data from Supabase
          setLoadPlans([])
        }
      } catch (err) {
        // Clear load plans on error too
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

    // Filter by work area (GCR / PIL/PER)
    if (selectedWorkArea !== "All") {
      filtered = filtered.filter((plan) => {
        const planWorkAreas = plan.workAreas || ["GCR"]
        
        if (selectedWorkArea === "GCR") {
          // Show plans that have GCR work area
          return planWorkAreas.includes("GCR")
        } else if (selectedWorkArea === "PIL and PER") {
          // Show plans that have PIL or PER work areas
          const hasPilPer = planWorkAreas.includes("PIL") || planWorkAreas.includes("PER")
          
          // Apply PIL/PER sub-filter if specified
          if (hasPilPer && pilPerSubFilter && pilPerSubFilter !== "Both") {
            if (pilPerSubFilter === "PIL only") {
              return planWorkAreas.includes("PIL")
            } else if (pilPerSubFilter === "PER only") {
              return planWorkAreas.includes("PER")
            }
          }
          
          return hasPilPer
        }
        
        return true
      })
    }

    // Sort based on selected column and direction
    return filtered.sort((a, b) => {
      let comparison = 0
      
      if (sortColumn === "flight") {
        // Sort by flight number
        const flightA = a.flight || ""
        const flightB = b.flight || ""
        comparison = flightA.localeCompare(flightB)
      } else if (sortColumn === "date") {
        // Sort by date only
        const dateA = a.date || ""
        const dateB = b.date || ""
        comparison = dateA.localeCompare(dateB)
      } else {
        // Sort by STD (default) - combines date and STD time for proper chronological sorting
        const dateA = a.date || ""
        const dateB = b.date || ""
        const stdA = a.std || "00:00"
        const stdB = b.std || "00:00"
        
        // Compare dates first
        if (dateA !== dateB) {
          comparison = dateA.localeCompare(dateB)
        } else {
          // If same date, compare STD times
          const hoursA = parseStdToHours(stdA)
          const hoursB = parseStdToHours(stdB)
          comparison = hoursA - hoursB
        }
      }
      
      // Apply sort direction
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [loadPlans, shiftFilter, periodFilter, waveFilter, searchQuery, sortColumn, sortDirection, selectedWorkArea, pilPerSubFilter])

  // Determine if wave filter should be shown
  const showWaveFilter = periodFilter === "late-morning" || periodFilter === "afternoon"

  // Handle column header click for sorting
  const handleSortByColumn = (column: "std" | "flight" | "date") => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new column and default to ascending
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const handleRowClick = async (loadPlan: LoadPlan) => {
    // Check if we have a saved version first
    const savedDetail = savedDetails.get(loadPlan.flight)
    if (savedDetail) {
      setSelectedLoadPlan(savedDetail)
      return
    }

    // Try to fetch from Supabase
    try {
      const supabaseDetail = await getLoadPlanDetailFromSupabase(loadPlan.flight)
      if (supabaseDetail) {
        setSelectedLoadPlan(supabaseDetail)
        return
      } else {
        // Don't show dummy data - just return or show message
        if (onLoadPlanSelect) {
          onLoadPlanSelect(loadPlan)
        }
        return
      }
    } catch (err) {
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
          const isDocx = f.name.toLowerCase().endsWith(".docx") || f.name.toLowerCase().endsWith(".doc")

          // Extract text from file (handles RTF, DOCX, PDF, TXT, MD)
          const content = await extractTextFromFile(f)

          let header = parseHeader(content)
          if (!header.flightNumber) {
            const filenameMatch = f.name.match(/EK\s*[-]?\s*(\d{4})/i)
            if (filenameMatch) {
              header.flightNumber = `EK${filenameMatch[1]}`
            } else if (!isDocx) {
              failedFiles.push(f.name)
              continue
            }
          }

          // Only check for critical images in DOCX files (RTF uses rtf.js which doesn't support image extraction for OCR)
          if (isDocx && !header.isCritical) {
            try {
              const isCriticalFromOCR = await detectCriticalFromFileImages(f)
              if (isCriticalFromOCR) {
                header.isCritical = true
              }
            } catch {
              // Ignore OCR errors
            }
          }

          const shipments = parseShipments(content, header)
          
          // Generate reports (required for saveListsDataToSupabase)
          // Use empty array if no shipments to avoid errors
          const shipmentsForReports = shipments || []
          const specialCargo = generateSpecialCargoReport(header, shipmentsForReports)
          const vunList = generateVUNList(header, shipmentsForReports)
          const qrtList = generateQRTList(header, shipmentsForReports)

          const results: ListsResults = { 
            specialCargo, 
            vunList, 
            qrtList, 
            header, 
            shipments 
          }

          // Save to Supabase (will save load plan even if no shipments)
          const saveResult = await saveListsDataToSupabase({
            results,
            shipments: shipments || [], // Use empty array if no shipments
            fileName: f.name,
            fileSize: f.size,
          })
          
          // Log if no shipments but load plan was saved
          if ((!shipments || shipments.length === 0) && saveResult.success) {
            console.log(`[LoadPlansScreen] Load plan saved without shipments: ${header.flightNumber}`)
          }

          if (saveResult.success) {
            // Check if flight already exists in current list
            const exists = loadPlans.some((lp) => lp.flight === header.flightNumber)
            if (exists) {
              // Flight was updated (revision incremented)
              totalSkippedCount++
              skippedFlights.push(header.flightNumber)
            } else {
              totalAddedCount++
            }
          } else {
            failedFiles.push(f.name)
          }
        } catch (fileError) {
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
        // Error refreshing load plans
      }

      setProgress(100)

      if (totalAddedCount > 0 || totalSkippedCount > 0) {
        // Build success message with improved UI
        let title = "Upload Successful!"
        let html = `<div style="text-align: left; padding: 8px 0;">`
        
        // Summary section
        html += `<div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 15px; color: #374151; font-weight: 500;">
            Processed <span style="color: #D71A21; font-weight: 600;">${fileArray.length}</span> file${fileArray.length > 1 ? "s" : ""}
          </p>
        </div>`
        
        // Results section
        html += `<div style="display: flex; flex-direction: column; gap: 12px;">`
        
        if (totalAddedCount > 0) {
          html += `<div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 6px;">
            <div style="flex-shrink: 0; width: 24px; height: 24px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">✓</div>
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 14px; color: #065f46; font-weight: 500;">
                Successfully added <strong style="color: #047857;">${totalAddedCount}</strong> load plan${totalAddedCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>`
        }
        
        if (totalSkippedCount > 0) {
          html += `<div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
            <div style="flex-shrink: 0; width: 24px; height: 24px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">↻</div>
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: 500; margin-bottom: 4px;">
                <strong style="color: #1d4ed8;">${totalSkippedCount}</strong> flight${totalSkippedCount > 1 ? "s" : ""} updated with revision incremented
              </p>
              <p style="margin: 0; font-size: 12px; color: #3b82f6; font-weight: 400;">
                ${skippedFlights.slice(0, 5).join(", ")}${skippedFlights.length > 5 ? `, and ${skippedFlights.length - 5} more` : ""}
              </p>
            </div>
          </div>`
        }
        
        if (failedFiles.length > 0) {
          html += `<div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px;">
            <div style="flex-shrink: 0; width: 24px; height: 24px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">✗</div>
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 500; margin-bottom: 4px;">
                <strong style="color: #dc2626;">${failedFiles.length}</strong> file${failedFiles.length > 1 ? "s" : ""} could not be processed
              </p>
              <p style="margin: 0; font-size: 12px; color: #ef4444; font-weight: 400;">
                ${failedFiles.slice(0, 3).join(", ")}${failedFiles.length > 3 ? "..." : ""}
              </p>
            </div>
          </div>`
        }
        
        html += `</div></div>`

        // Determine icon and color based on results
        let icon: "success" | "warning" | "error" = "success"
        if (failedFiles.length > 0 && totalAddedCount === 0 && totalSkippedCount === 0) {
          icon = "error"
          title = "Upload Failed"
        } else if (failedFiles.length > 0) {
          icon = "warning"
          title = "Upload Completed with Errors"
        }

        setTimeout(() => {
          Swal.fire({
            title: title,
            html: html,
            icon: icon,
            confirmButtonText: "Got it",
            confirmButtonColor: "#D71A21",
            width: "520px",
            padding: "24px",
            showCloseButton: true,
            customClass: {
              popup: "rounded-xl shadow-2xl border border-gray-200",
              title: "text-2xl font-bold text-gray-900 mb-2",
              confirmButton: "px-8 py-3 rounded-lg font-semibold text-base shadow-md hover:shadow-lg transition-shadow",
              closeButton: "text-gray-400 hover:text-gray-600",
              icon: "!mb-4"
            },
            buttonsStyling: true,
            backdrop: true,
            allowOutsideClick: true,
            allowEscapeKey: true
          })
        }, 100)
      } else if (failedFiles.length === fileArray.length && skippedFlights.length === 0) {
        // Only throw error if all files failed AND none were skipped
        // If files were skipped (e.g., RTF with no shipments), that's okay
        setTimeout(() => {
          Swal.fire({
            title: "Upload Failed",
            html: `<div style="text-align: left; padding: 8px 0;">
              <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; font-size: 15px; color: #991b1b; font-weight: 500;">
                  Could not process any files. Please check the file format${fileArray.length > 1 ? "s" : ""}.
                </p>
              </div>
            </div>`,
            icon: "error",
            confirmButtonText: "Got it",
            confirmButtonColor: "#D71A21",
            width: "520px",
            padding: "24px",
            showCloseButton: true,
            customClass: {
              popup: "rounded-xl shadow-2xl border border-gray-200",
              title: "text-2xl font-bold text-gray-900 mb-2",
              confirmButton: "px-8 py-3 rounded-lg font-semibold text-base shadow-md hover:shadow-lg transition-shadow",
              closeButton: "text-gray-400 hover:text-gray-600",
              icon: "!mb-4"
            },
            buttonsStyling: true,
            backdrop: true,
            allowOutsideClick: true,
            allowEscapeKey: true
          })
        }, 100)
        
        // Still throw error for error handling flow
        throw new Error(`Could not process any files. Please check the file format${fileArray.length > 1 ? "s" : ""}.`)
      }

      setShowUploadModal(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred while processing the file"
      setError(errorMessage)
      setProgress(0)
      
      // Show error with SweetAlert
      setTimeout(() => {
        Swal.fire({
          title: "Upload Error",
          html: `<div style="text-align: left; padding: 8px 0;">
            <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
              <p style="margin: 0; font-size: 15px; color: #991b1b; font-weight: 500; line-height: 1.5;">
                ${errorMessage}
              </p>
            </div>
          </div>`,
          icon: "error",
          confirmButtonText: "Got it",
          confirmButtonColor: "#D71A21",
          width: "520px",
          padding: "24px",
          showCloseButton: true,
          customClass: {
            popup: "rounded-xl shadow-2xl border border-gray-200",
            title: "text-2xl font-bold text-gray-900 mb-2",
            confirmButton: "px-8 py-3 rounded-lg font-semibold text-base shadow-md hover:shadow-lg transition-shadow",
            closeButton: "text-gray-400 hover:text-gray-600",
            icon: "!mb-4"
          },
          buttonsStyling: true,
          backdrop: true,
          allowOutsideClick: true,
          allowEscapeKey: true
        })
      }, 100)
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

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 px-2 flex-wrap">
          {/* Default View Dropdown */}
          <div className="flex items-center">
            <select
              className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
            >
              <option value="default">≡ Default</option>
              <option value="custom">Custom View</option>
            </select>
          </div>

          {/* Add Filter Dropdown */}
          <div className="relative" ref={addFilterRef}>
            <button
              type="button"
              onClick={() => setShowAddFilterDropdown(!showAddFilterDropdown)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Filter</span>
            </button>
            
            {showAddFilterDropdown && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-48">
                <div className="p-2">
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search column..."
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
                    />
                  </div>
                  <div className="space-y-0.5">
                    {["Flight", "Date", "ACFT TYPE", "ACFT REG", "Route", "STD", "TTL PLN ULD"].map((col) => (
                      <button
                        key={col}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded transition-colors text-left"
                        onClick={() => setShowAddFilterDropdown(false)}
                      >
                        <span className="text-gray-400">≡</span>
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Load Plans */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search load plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent w-36"
            />
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {/* Work Area Filter */}
          <WorkAreaFilterControls />

          {/* Shift Type Filter - Compact */}
          <select
            id="shift-filter"
            value={shiftFilter}
            onChange={(e) => {
              const newShift = e.target.value as ShiftType
              setShiftFilter(newShift)
              setPeriodFilter("all")
              setWaveFilter("all")
            }}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
          >
            <option value="current">Current (All)</option>
            <option value="night">Night Shift</option>
            <option value="day">Day Shift</option>
          </select>

          {/* Period Filter - Compact (conditional based on shift) */}
          <select
            id="period-filter"
            value={periodFilter}
            onChange={(e) => {
              setPeriodFilter(e.target.value as PeriodType)
              if (e.target.value === "early-morning") {
                setWaveFilter("all")
              }
            }}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
          >
            {shiftFilter === "current" && (
              <>
                <option value="all">All Periods</option>
                <option value="early-morning">Early Morning (00:01-05:59)</option>
                <option value="late-morning">Late Morning (06:00-12:59)</option>
                <option value="afternoon">Afternoon (13:00-23:59)</option>
              </>
            )}
            {shiftFilter === "night" && (
              <>
                <option value="all">All Periods</option>
                <option value="early-morning">Early Morning (00:01-05:59)</option>
                <option value="late-morning">Late Morning (06:00-12:59)</option>
              </>
            )}
            {shiftFilter === "day" && (
              <>
                <option value="all">All Periods</option>
                <option value="afternoon">Afternoon (13:00-23:59)</option>
              </>
            )}
          </select>

          {/* Wave Filter - Compact (conditional) */}
          {showWaveFilter && (
            <select
              id="wave-filter"
              value={waveFilter}
              onChange={(e) => setWaveFilter(e.target.value as WaveType)}
              className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
            >
              <option value="all">All Waves</option>
              <option value="first-wave">
                {periodFilter === "late-morning" ? "First Wave (06:00-09:00)" : "First Wave (13:00-15:59)"}
              </option>
              <option value="second-wave">
                {periodFilter === "late-morning" ? "Second Wave (09:01-12:59)" : "Second Wave (16:00-23:59)"}
              </option>
            </select>
          )}

          <div className="flex-1" />

          {/* View Options Panel */}
          <div className="relative" ref={viewOptionsRef}>
            <button
              type="button"
              onClick={() => setShowViewOptions(!showViewOptions)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 transition-colors"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
            
            {showViewOptions && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-64">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">View Options</h3>
                  
                  {/* Show Load Plans */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <Plane className="w-3 h-3 text-[#D71A21]" />
                      <span>Show Load Plans</span>
                    </div>
                    <select className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded">
                      <option>All Load Plans</option>
                      <option>With ULDs Only</option>
                      <option>Without ULDs</option>
                    </select>
                  </div>
                  
                  {/* Ordering */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Ordering</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <select 
                        value={sortColumn}
                        onChange={(e) => setSortColumn(e.target.value as "std" | "flight" | "date")}
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21]"
                      >
                        <option value="std">STD Time</option>
                        <option value="flight">Flight Number</option>
                        <option value="date">Date</option>
                      </select>
                      <button 
                        onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                        className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                        title={sortDirection === "asc" ? "Ascending" : "Descending"}
                      >
                        <ArrowUpDown className={`w-3 h-3 text-gray-500 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Display Fields */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                      <Settings2 className="w-3 h-3" />
                      <span>Display Fields</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {["Flight", "Date", "ACFT TYPE", "ACFT REG", "Route", "STD", "TTL PLN ULD", "ULD Version"].map((field) => (
                        <span
                          key={field}
                          className="px-1.5 py-0.5 text-[10px] bg-[#D71A21]/10 text-[#D71A21] border border-[#D71A21]/20 rounded cursor-pointer hover:bg-[#D71A21]/20 transition-colors"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Load plan count */}
          <div className="text-xs text-gray-500 whitespace-nowrap">
            {filteredLoadPlans.length} of {loadPlans.length} load plans
          </div>
        </div>

        <div className="mx-2 rounded-lg border border-gray-200 overflow-x-auto">
          <div className="bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-[#D71A21] text-white">
                  <th 
                    className="px-2 py-1 text-left font-semibold text-xs cursor-pointer hover:bg-[#B01419] transition-colors select-none"
                    onClick={() => handleSortByColumn("flight")}
                  >
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Flight</span>
                      {sortColumn === "flight" && (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3 flex-shrink-0" />
                        ) : (
                          <ArrowDown className="w-3 h-3 flex-shrink-0" />
                        )
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-2 py-1 text-left font-semibold text-xs cursor-pointer hover:bg-[#B01419] transition-colors select-none"
                    onClick={() => handleSortByColumn("date")}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Date</span>
                      {sortColumn === "date" && (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3 flex-shrink-0" />
                        ) : (
                          <ArrowDown className="w-3 h-3 flex-shrink-0" />
                        )
                      )}
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
                  <th 
                    className="px-2 py-1 text-left font-semibold text-xs cursor-pointer hover:bg-[#B01419] transition-colors select-none"
                    onClick={() => handleSortByColumn("std")}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">STD</span>
                      {sortColumn === "std" && (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3 flex-shrink-0" />
                        ) : (
                          <ArrowDown className="w-3 h-3 flex-shrink-0" />
                        )
                      )}
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
                ) : filteredLoadPlans.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-2 text-center text-gray-500 text-sm">
                      {loadPlans.length === 0 ? "No load plans available" : "No load plans match the selected filters"}
                    </td>
                  </tr>
                ) : (
                  filteredLoadPlans.map((loadPlan, index) => (
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
