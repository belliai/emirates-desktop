"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Upload, Calendar, User, Phone } from "lucide-react"
import { UploadModal } from "./lists/upload-modal"
import { useLoadPlans, type BUPAllocation, type ShiftType, type PeriodType, type WaveType } from "@/lib/load-plan-context"
import { getOperators, cacheStaffMobiles, getMobileForStaff, type BuildupStaff } from "@/lib/buildup-staff"
import * as XLSX from "xlsx"

// Helper function to determine period and wave based on ETD time
function determinePeriodAndWave(etd: string): { period: PeriodType; wave: WaveType | null; shiftType: ShiftType } {
  const [hours, minutes] = etd.split(":").map(Number)
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
  // Day Shift Afternoon First Wave: 13:00-16:00
  if (timeInMinutes >= 780 && timeInMinutes <= 960) {
    return { period: "afternoon", wave: "first-wave", shiftType: "day" }
  }
  // Day Shift Afternoon Second Wave: 16:00-23:59
  if (timeInMinutes > 960 && timeInMinutes <= 1439) {
    return { period: "afternoon", wave: "second-wave", shiftType: "day" }
  }
  // Default to early morning for edge cases
  return { period: "early-morning", wave: null, shiftType: "night" }
}

interface BUPAllocationListScreenProps {
  onNavigate?: (screen: string, params?: any) => void
}

export default function BUPAllocationListScreen({ onNavigate }: BUPAllocationListScreenProps = {}) {
  const { flightAssignments, bupAllocations, setBupAllocations } = useLoadPlans()
  // Default to "current" which shows latest uploaded allocations, or "day"/"night" to filter by shift
  const [shiftFilter, setShiftFilter] = useState<ShiftType>("current")
  const [periodFilter, setPeriodFilter] = useState<PeriodType>("all")
  const [waveFilter, setWaveFilter] = useState<WaveType>("all")
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [operators, setOperators] = useState<BuildupStaff[]>([])

  // Load operators on mount to cache mobile numbers
  useEffect(() => {
    async function loadOperators() {
      const ops = await getOperators()
      setOperators(ops)
      // Cache mobile numbers for lookup
      cacheStaffMobiles(ops)
    }
    loadOperators()
  }, [])

  // Get current date's allocations (latest date in the data)
  const currentDate = useMemo(() => {
    if (bupAllocations.length === 0) return null
    const dates = bupAllocations.map((a) => a.date).filter(Boolean) as string[]
    if (dates.length === 0) return null
    // Sort dates and get the latest
    return dates.sort().reverse()[0]
  }, [bupAllocations])

  // Create a map of flight assignments for quick lookup
  const flightAssignmentMap = useMemo(() => {
    const map = new Map<string, string>()
    flightAssignments.forEach((fa) => {
      // Map EK0123 -> staff name
      map.set(fa.flight, fa.name)
    })
    return map
  }, [flightAssignments])

  // Filter allocations and merge in staff from Flight Assignment context
  const filteredAllocations = useMemo(() => {
    let filtered = [...bupAllocations]

    // Filter by shift type
    if (shiftFilter === "current") {
      // Show all flights from the latest date, or all if no date available
      if (currentDate) {
        filtered = filtered.filter((a) => a.date === currentDate)
      }
      // If no currentDate, show all allocations
    } else if (shiftFilter === "night") {
      filtered = filtered.filter((a) => a.shiftType === "night")
    } else if (shiftFilter === "day") {
      filtered = filtered.filter((a) => a.shiftType === "day")
    }

    // Filter by period
    if (periodFilter !== "all") {
      filtered = filtered.filter((a) => a.period === periodFilter)
    }

    // Filter by wave (only applies to late-morning and afternoon periods)
    if (periodFilter === "early-morning" && waveFilter !== "all") {
      // Early morning doesn't have waves, so don't filter by wave
    } else if (waveFilter !== "all") {
      filtered = filtered.filter((a) => {
        if (a.period === "late-morning" || a.period === "afternoon") {
          return a.wave === waveFilter
        }
        return true // Early morning doesn't have waves
      })
    }

    // Merge in staff assignments from Flight Assignment context
    filtered = filtered.map((allocation) => {
      const flightKey = `EK${allocation.flightNo}`
      const assignedStaff = flightAssignmentMap.get(flightKey) || ""
      const mobile = assignedStaff ? getMobileForStaff(assignedStaff) : ""
      
      return {
        ...allocation,
        staff: assignedStaff,
        mobile
      }
    })

    // Sort by ETD
    return filtered.sort((a, b) => {
      const [aHours, aMinutes] = a.etd.split(":").map(Number)
      const [bHours, bMinutes] = b.etd.split(":").map(Number)
      const aTime = aHours * 60 + (aMinutes || 0)
      const bTime = bHours * 60 + (bMinutes || 0)
      return aTime - bTime
    })
  }, [bupAllocations, shiftFilter, periodFilter, waveFilter, currentDate, flightAssignmentMap])

  // Determine if wave filter should be shown
  const showWaveFilter = periodFilter === "late-morning" || periodFilter === "afternoon"

  // Get filter labels
  const getPeriodLabel = (period: PeriodType) => {
    switch (period) {
      case "early-morning":
        return "Early Morning"
      case "late-morning":
        return "Late Morning"
      case "afternoon":
        return "Afternoon"
      default:
        return "All Periods"
    }
  }

  const getWaveLabel = (wave: WaveType) => {
    switch (wave) {
      case "first-wave":
        return "First Wave"
      case "second-wave":
        return "Second Wave"
      default:
        return "All Waves"
    }
  }

  // Handle staff name click - navigate to flight assignment
  const handleStaffClick = (allocation: BUPAllocation) => {
    // Navigate to flight assignment screen to see/edit assignment
    if (onNavigate) {
      onNavigate("flight-assignment")
    }
  }

  const handleFileUpload = async (files: File | File[]) => {
    setError(null)
    setIsProcessing(true)
    setProgress(0)
    
    const fileArray = Array.isArray(files) ? files : [files]
    setUploadedFile(fileArray[0])

    try {
      const validExtensions = [".csv", ".xlsx", ".xls"]
      
      // Validate all files
      for (const f of fileArray) {
        const hasValidExtension = validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
        if (!hasValidExtension) {
          throw new Error(`Invalid file type: ${f.name}. Please upload CSV or Excel files.`)
        }
        if (f.size > 10 * 1024 * 1024) {
          throw new Error(`File size exceeds 10MB: ${f.name}`)
        }
      }

      setProgress(25)
      
      // Extract date from filename (e.g., "16) BUP ALLOCATION LIST 14 OCT 2025 DX 0900-2100H")
      const extractDateFromFilename = (filename: string): string | null => {
        const dateMatch = filename.match(/(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{4})/i)
        if (dateMatch) {
          return `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}`
        }
        return null
      }
      
      // Helper to parse a single flight from columns
      const parseFlightFromColumns = (
        cols: (string | number | null | undefined)[], 
        startIdx: number, 
        fileDate: string | null
      ): BUPAllocation | null => {
        const toString = (val: string | number | null | undefined): string => {
          if (val === null || val === undefined) return ""
          return String(val).trim()
        }
        
        const carrier = toString(cols[startIdx])
        const flightNo = toString(cols[startIdx + 1])
        const etd = toString(cols[startIdx + 2])
        const routing = toString(cols[startIdx + 3])
        // Staff and mobile are always blank on upload - assignments come from Flight Assignment
        const acType = toString(cols[startIdx + 6])
        const regnNo = toString(cols[startIdx + 7])
        
        // Validate: must have carrier EK, valid flight number, and valid ETD
        if (carrier !== "EK") return null
        if (!flightNo || !flightNo.match(/^\d{3,4}$/)) return null
        if (!etd || !etd.includes(":")) return null
        
        // Determine period and wave based on ETD
        const { period, wave, shiftType } = determinePeriodAndWave(etd)
        
        return {
          carrier,
          flightNo,
          etd,
          routing,
          staff: "",  // Always blank - staff assigned via Flight Assignment
          mobile: "", // Always blank - generated when staff is assigned
          acType,
          regnNo,
          shiftType,
          period,
          wave,
          date: fileDate
        }
      }
      
      // Helper to parse rows (works for both CSV lines and XLSX rows)
      const parseRowsToAllocations = (
        rows: (string | number | null | undefined)[][], 
        fileDate: string | null
      ): BUPAllocation[] => {
        const allocations: BUPAllocation[] = []
        
        for (const row of rows) {
          // Skip header rows and empty rows (less than 4 columns)
          if (row.length < 4) continue
          
          // Try to parse flight from left columns (index 0-7)
          const leftFlight = parseFlightFromColumns(row, 0, fileDate)
          if (leftFlight) {
            allocations.push(leftFlight)
          }
          
          // Check for dual-column format (EM & LM combined files)
          // These files have a second flight starting around column 8 or 9
          if (row.length >= 12) {
            // Try index 8 first (format with empty column separator)
            let rightFlight = parseFlightFromColumns(row, 8, fileDate)
            if (!rightFlight && row.length >= 13) {
              // Try index 9 (alternative format)
              rightFlight = parseFlightFromColumns(row, 9, fileDate)
            }
            if (rightFlight) {
              allocations.push(rightFlight)
            }
          }
        }
        
        return allocations
      }
      
      const parsedAllocations: BUPAllocation[] = []
      
      // Process files (CSV or XLSX)
      for (const file of fileArray) {
        const fileDate = extractDateFromFilename(file.name)
        const isExcel = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")
        
        console.log(`[BUPAllocation] Processing file: ${file.name}, date: ${fileDate}, isExcel: ${isExcel}`)
        
        if (isExcel) {
          // Parse Excel file
          const arrayBuffer = await file.arrayBuffer()
          const workbook = XLSX.read(arrayBuffer, { type: "array" })
          
          // Process all sheets in the workbook
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName]
            // Convert sheet to array of arrays (rows)
            const rows: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { 
              header: 1,  // Return array of arrays
              defval: ""  // Default value for empty cells
            })
            
            console.log(`[BUPAllocation] Processing sheet: ${sheetName}, rows: ${rows.length}`)
            
            const sheetAllocations = parseRowsToAllocations(rows, fileDate)
            parsedAllocations.push(...sheetAllocations)
          }
        } else {
          // Parse CSV file
          const text = await file.text()
          const lines = text.split("\n").filter((line) => line.trim())
          
          // Convert CSV lines to rows (array of arrays)
          const rows = lines.map(line => 
            line.split(",").map(col => col.trim().replace(/"/g, ""))
          )
          
          const csvAllocations = parseRowsToAllocations(rows, fileDate)
          parsedAllocations.push(...csvAllocations)
        }
        
        console.log(`[BUPAllocation] Total parsed: ${parsedAllocations.length} allocations so far`)
      }

      setProgress(75)
      
      // Add all parsed allocations to context
      if (parsedAllocations.length > 0) {
        // Clear existing and set new allocations
        // Staff/mobile are always blank - assignments come from Flight Assignment
        setBupAllocations(parsedAllocations)
      }

      setProgress(100)
      
      setTimeout(() => {
        const message = parsedAllocations.length > 0
          ? `Successfully imported ${parsedAllocations.length} flight allocations from ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}.`
          : `No valid flight allocations found in the uploaded file${fileArray.length > 1 ? "s" : ""}.`
        alert(message)
        setShowUploadModal(false)
      }, 100)
    } catch (err) {
      console.error("[BUPAllocationListScreen] File upload error:", err)
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

  // Note: Auto-sync on mount removed - keeping logic for manual sync via clicks/upload

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 px-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Build-up Allocation</h2>
            <p className="text-sm text-gray-500">Manage and filter buildup allocation lists</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 px-2">
          <div className="flex items-center gap-2">
            <label htmlFor="shift-filter" className="text-sm font-medium text-gray-700">
              Shift Type:
            </label>
            <select
              id="shift-filter"
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value as ShiftType)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
            >
              <option value="current">Current (Latest)</option>
              <option value="night">Night Shift</option>
              <option value="day">Day Shift</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="period-filter" className="text-sm font-medium text-gray-700">
              Period:
            </label>
            <select
              id="period-filter"
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value as PeriodType)
                // Reset wave filter if switching to early-morning (no waves)
                if (e.target.value === "early-morning") {
                  setWaveFilter("all")
                }
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
            >
              <option value="all">All Periods</option>
              <option value="early-morning">Early Morning</option>
              <option value="late-morning">Late Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
          </div>

          {showWaveFilter && (
            <div className="flex items-center gap-2">
              <label htmlFor="wave-filter" className="text-sm font-medium text-gray-700">
                Wave:
              </label>
              <select
                id="wave-filter"
                value={waveFilter}
                onChange={(e) => setWaveFilter(e.target.value as WaveType)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#D71A21] focus:border-transparent"
              >
                <option value="all">All Waves</option>
                <option value="first-wave">First Wave</option>
                <option value="second-wave">Second Wave</option>
              </select>
            </div>
          )}
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Allocations</h3>
              <p className="text-xs text-gray-500">
                Showing {filteredAllocations.length} flight{filteredAllocations.length !== 1 ? "s" : ""}
                {currentDate && shiftFilter === "current" && ` for ${currentDate}`}
              </p>
            </div>
          </div>

          {filteredAllocations.length === 0 ? (
            <div className="text-center py-12">
              {bupAllocations.length === 0 ? (
                <>
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 text-sm font-medium">No allocations uploaded yet</p>
                  <p className="text-gray-500 text-xs mt-1">Click the Upload button to import a BUP Allocation file (CSV or Excel)</p>
                </>
              ) : (
                <p className="text-gray-600 text-sm">No allocations match the selected filters.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Carrier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Flight No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ETD</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Routing</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Staff</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">A/C Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Regn No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Wave</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAllocations.map((allocation, index) => (
                    <tr key={`${allocation.flightNo}-${allocation.etd}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{allocation.carrier}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{allocation.flightNo}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {allocation.etd}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{allocation.routing}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {allocation.staff ? (
                          <button
                            onClick={() => handleStaffClick(allocation)}
                            className="flex items-center gap-1 text-[#D71A21] hover:text-[#B0151A] hover:underline transition-colors cursor-pointer"
                            title="Click to view in Flight Assignment"
                          >
                            <User className="w-4 h-4" />
                            {allocation.staff.charAt(0).toUpperCase() + allocation.staff.slice(1)}
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {allocation.mobile ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {allocation.mobile}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{allocation.acType || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{allocation.regnNo || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {getPeriodLabel(allocation.period)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {allocation.wave ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            {getWaveLabel(allocation.wave)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
        accept=".csv,.xlsx,.xls"
        fileTypeDescription=".csv, .xlsx, .xls - Maximum file size 10 MB (multiple files supported)"
      />
    </div>
  )
}
