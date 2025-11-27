"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Upload, Calendar, User, Phone } from "lucide-react"
import { BUP_ALLOCATION_DATA, type ShiftType, type PeriodType, type WaveType, type BUPAllocationFlight } from "@/lib/bup-allocation-data"
import { UploadModal } from "./lists/upload-modal"
import { useLoadPlans } from "@/lib/load-plan-context"

interface BUPAllocationListScreenProps {
  onNavigate?: (screen: string, params?: any) => void
}

export default function BUPAllocationListScreen({ onNavigate }: BUPAllocationListScreenProps = {}) {
  const { updateFlightAssignment } = useLoadPlans()
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

  // Get current date's allocations (latest date in the data)
  const currentDate = useMemo(() => {
    if (BUP_ALLOCATION_DATA.length === 0) return null
    const dates = BUP_ALLOCATION_DATA.map((a) => a.date).filter(Boolean) as string[]
    if (dates.length === 0) return null
    // Sort dates and get the latest
    return dates.sort().reverse()[0]
  }, [])

  // Filter allocations based on selected filters
  const filteredAllocations = useMemo(() => {
    let filtered = [...BUP_ALLOCATION_DATA]

    // Filter by shift type
    if (shiftFilter === "current") {
      // Show only flights from the latest date
      if (currentDate) {
        filtered = filtered.filter((a) => a.date === currentDate)
      }
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

    // Sort by ETD
    return filtered.sort((a, b) => {
      const [aHours, aMinutes] = a.etd.split(":").map(Number)
      const [bHours, bMinutes] = b.etd.split(":").map(Number)
      const aTime = aHours * 60 + (aMinutes || 0)
      const bTime = bHours * 60 + (bMinutes || 0)
      return aTime - bTime
    })
  }, [shiftFilter, periodFilter, waveFilter, currentDate])

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

  // Sync staff from BUP allocation to flight assignment
  const syncStaffToFlightAssignment = (allocation: BUPAllocationFlight) => {
    if (!allocation.staff || !allocation.flightNo) return
    
    // Normalize staff name (convert to lowercase for matching)
    const normalizedStaff = allocation.staff.toLowerCase().trim()
    
    // Map common staff name variations to flight assignment names
    const staffNameMap: Record<string, string> = {
      "bright": "bright",
      "saleem": "saleem",
      "amandeep": "amandeep",
      "christian": "christian",
      "jamil ek": "jamil",
      "jamil dl": "jamil",
      "leo": "leo",
      "sumit": "sumit",
      "barshad": "barshad",
      "bibek": "bibek",
      "sana": "sana",
      "dues": "dues",
      "fred": "fred",
      "abraham": "abraham",
      "jaber": "jaber",
      "malinga": "malinga",
      "bryan": "bryan",
      "juned": "juned",
      "raza": "raza",
      "jithin": "jithin",
      "bakari": "bakari",
      "anuraag": "anuraag",
      "waqas": "waqas",
      "albert": "albert",
      "mian": "mian",
      "ben": "ben",
      "obinna": "obinna",
      "sanjeev": "sanjeev",
      "matia": "matia",
      "anzwab": "anzwab",
      "kannan": "kannan",
      "kassim": "kassim",
    }
    
    // Find matching staff name
    const matchedStaff = Object.entries(staffNameMap).find(([key]) => 
      normalizedStaff.includes(key) || key.includes(normalizedStaff)
    )?.[1]
    
    if (matchedStaff) {
      // Update flight assignment with staff name
      updateFlightAssignment(allocation.flightNo, matchedStaff)
    }
  }

  // Handle staff name click - navigate to flight assignment
  const handleStaffClick = (allocation: BUPAllocationFlight) => {
    if (!allocation.staff || !allocation.flightNo) return
    
    // Sync staff to flight assignment first
    syncStaffToFlightAssignment(allocation)
    
    // Navigate to flight assignment screen
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
      const validExtensions = [".csv"]
      
      // Validate all files
      for (const f of fileArray) {
        const hasValidExtension = validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
        if (!hasValidExtension) {
          throw new Error(`Invalid file type: ${f.name}. Please upload CSV files.`)
        }
        if (f.size > 10 * 1024 * 1024) {
          throw new Error(`File size exceeds 10MB: ${f.name}`)
        }
      }

      setProgress(50)
      
      // Process CSV files (parsing logic kept but not auto-syncing)
      // Staff assignment syncing can be done manually via clicking staff names
      for (const file of fileArray) {
        const text = await file.text()
        // CSV parsing logic kept for future use
        // Currently not auto-syncing to flight assignment
        const lines = text.split("\n").filter((line) => line.trim())
        
        // Parse CSV but don't auto-sync
        for (const line of lines) {
          const columns = line.split(",").map((col) => col.trim())
          if (columns.length >= 4 && columns[0] === "EK" && columns[1].match(/^\d{4}$/)) {
            // Parsing logic kept but not syncing
            // Users can click staff names to sync manually
          }
        }
      }

      setProgress(100)
      
      setTimeout(() => {
        alert(`Processed ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}. Files uploaded successfully.`)
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
            <h2 className="text-lg font-semibold text-gray-900">BUP Allocation List</h2>
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
              <p className="text-gray-600 text-sm">No allocations match the selected filters.</p>
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
                            title="Click to sync and view in Flight Assignment"
                          >
                            <User className="w-4 h-4" />
                            {allocation.staff}
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
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
      />
    </div>
  )
}
