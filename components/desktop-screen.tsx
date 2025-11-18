"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react"
import {
  ChevronDown,
  Calendar,
  Plane,
  Clock,
  MapPin,
  Package,
  Shield,
  FileText,
  ChevronRight,
  Upload,
  Users,
  ArrowRight,
  Warehouse,
  CheckCircle,
  X,
  BarChart3,
  Filter,
} from "lucide-react"
import { useFlights } from "@/lib/flight-context"
import type { ULD } from "@/lib/flight-data"
import DatePicker from "./date-picker"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import AnalyticsCharts from "./analytics-charts"
import { getRandomName } from "@/lib/names"
import { StaffStatisticsModal } from "./staff-statistics-modal" // Import StaffStatisticsModal

interface DesktopScreenProps {
  onULDSelect?: (uld: ULD, flightNumber: string, uldIndex: number) => void
}

type ViewMode = "time" | "count"

const shifts = ["All Shifts", "12am to 4am", "4am to 8am", "8am to 12pm", "12pm to 4pm", "4pm to 8pm", "8pm to 12am"]

const parseEtaToHours = (eta: string): number => {
  const [time] = eta.split(" ")
  const [hours, minutes] = time.split(":").map(Number)
  return hours + minutes / 60
}

const isEtaInShift = (eta: string, shift: string): boolean => {
  if (shift === "All Shifts") return true

  const etaHours = parseEtaToHours(eta)

  const shiftMap: Record<string, { start: number; end: number }> = {
    "12am to 4am": { start: 0, end: 4 },
    "4am to 8am": { start: 4, end: 8 },
    "8am to 12pm": { start: 8, end: 12 },
    "12pm to 4pm": { start: 12, end: 16 },
    "4pm to 8pm": { start: 16, end: 20 },
    "8pm to 12am": { start: 20, end: 24 },
  }

  const range = shiftMap[shift]
  if (!range) return true

  return etaHours >= range.start && etaHours < range.end
}

const truncateUldShc = (uldshc: string): { display: string; isTruncated: boolean } => {
  const codes = uldshc.split("-")
  if (codes.length > 5) {
    return {
      display: codes.slice(0, 5).join("-") + "...",
      isTruncated: true,
    }
  }
  return {
    display: uldshc,
    isTruncated: false,
  }
}

const findColumnIndex = (headers: string[], patterns: string[]): number => {
  return headers.findIndex((header) => {
    const normalized = header
      .toLowerCase()
      .trim()
      .replace(/[().\s_-]/g, "")
    return patterns.some((pattern) => {
      const normalizedPattern = pattern
        .toLowerCase()
        .trim()
        .replace(/[().\s_-]/g, "")
      return normalized.includes(normalizedPattern) || normalizedPattern.includes(normalized)
    })
  })
}

export default function DesktopScreen({ onULDSelect }: DesktopScreenProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedShift, setSelectedShift] = useState("All Shifts")
  const [viewMode, setViewMode] = useState<ViewMode>("count")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showShiftPicker, setShowShiftPicker] = useState(false)
  const [selectedBreakdownRate, setSelectedBreakdownRate] = useState("All")
  const [selectedStaff, setSelectedStaff] = useState("All Staff")
  const [showBreakdownPicker, setShowBreakdownPicker] = useState(false)
  const [showStaffPicker, setShowStaffPicker] = useState(false)
  const [showStaffStatistics, setShowStaffStatistics] = useState(false) // Add state for statistics modal
  const { flights, loading, refreshFlights, setFlights } = useFlights()
  const [hoveredFlight, setHoveredFlight] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const datePickerRef = useRef<HTMLDivElement>(null)
  const shiftPickerRef = useRef<HTMLDivElement>(null)
  const breakdownPickerRef = useRef<HTMLDivElement>(null)
  const staffPickerRef = useRef<HTMLDivElement>(null)
  const MAX_VISIBLE_CHIPS = 3

  const [columnFilters, setColumnFilters] = useState({
    flightNo: "",
    boardingPoint: "",
    uldNo: "",
    uldShc: "",
    destination: "",
    remarks: "",
    status: "All",
  })
  const [showColumnFilters, setShowColumnFilters] = useState(false)

  const formatDateDisplay = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
      if (shiftPickerRef.current && !shiftPickerRef.current.contains(event.target as Node)) {
        setShowShiftPicker(false)
      }
      if (breakdownPickerRef.current && !breakdownPickerRef.current.contains(event.target as Node)) {
        setShowBreakdownPicker(false)
      }
      if (staffPickerRef.current && !staffPickerRef.current.contains(event.target as Node)) {
        setShowStaffPicker(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const allUlds: Array<ULD & { flight: string; eta: string; origin: string }> = flights.flatMap((flight) =>
    flight.ulds.map((uld) => ({
      ...uld,
      flight: flight.flightNumber,
      eta: flight.eta,
      origin: flight.boardingPoint,
    })),
  )

  const uniqueStaff = useMemo(() => {
    const staffSet = new Set<string>()
    allUlds.forEach((uld) => {
      uld.statusHistory?.forEach((entry) => {
        if (entry.changedBy) {
          staffSet.add(entry.changedBy)
        }
      })
    })
    return ["All Staff", ...Array.from(staffSet).sort()]
  }, [allUlds])

  const uniqueFlightNumbers = useMemo(() => {
    const flights = new Set(allUlds.map((uld) => uld.flight))
    return ["All", ...Array.from(flights).sort()]
  }, [allUlds])

  const uniqueBoardingPoints = useMemo(() => {
    const points = new Set(allUlds.map((uld) => uld.origin))
    return ["All", ...Array.from(points).sort()]
  }, [allUlds])

  const uniqueDestinations = useMemo(() => {
    const dests = new Set(allUlds.map((uld) => uld.destination))
    return ["All", ...Array.from(dests).sort()]
  }, [allUlds])

  const uniqueUldShcCodes = useMemo(() => {
    const codes = new Set<string>()
    allUlds.forEach((uld) => {
      if (uld.uldshc) {
        uld.uldshc.split("-").forEach((code) => {
          if (code.trim()) codes.add(code.trim())
        })
      }
    })
    return ["All", ...Array.from(codes).sort()]
  }, [allUlds])

  const filteredUlds = allUlds.filter((uld) => {
    if (!isEtaInShift(uld.eta, selectedShift)) {
      return false
    }

    if (selectedBreakdownRate !== "All") {
      const breakdownEntry = uld.statusHistory?.find((entry) => entry.status === 5)
      if (!breakdownEntry) {
        return false
      }

      const now = new Date()
      const breakdownTime = new Date(breakdownEntry.timestamp)
      const hoursDiff = (now.getTime() - breakdownTime.getTime()) / (1000 * 60 * 60)

      switch (selectedBreakdownRate) {
        case "Last Hour":
          if (hoursDiff > 1) return false
          break
        case "Last 2 Hours":
          if (hoursDiff > 2) return false
          break
        case "Last 4 Hours":
          if (hoursDiff > 4) return false
          break
        case "Last 8 Hours":
          if (hoursDiff > 8) return false
          break
        case "Today":
          if (breakdownTime.toDateString() !== now.toDateString()) return false
          break
      }
    }

    if (selectedStaff !== "All Staff") {
      const hasStaff = uld.statusHistory?.some((entry) => entry.changedBy === selectedStaff)
      if (!hasStaff) {
        return false
      }
    }

    if (columnFilters.flightNo && columnFilters.flightNo !== "All") {
      if (uld.flight !== columnFilters.flightNo) return false
    }

    if (columnFilters.boardingPoint && columnFilters.boardingPoint !== "All") {
      if (uld.origin !== columnFilters.boardingPoint) return false
    }

    if (columnFilters.uldNo) {
      if (!uld.uldNumber.toLowerCase().includes(columnFilters.uldNo.toLowerCase())) return false
    }

    if (columnFilters.uldShc && columnFilters.uldShc !== "All") {
      if (!uld.uldshc || !uld.uldshc.includes(columnFilters.uldShc)) return false
    }

    if (columnFilters.destination && columnFilters.destination !== "All") {
      if (uld.destination !== columnFilters.destination) return false
    }

    if (columnFilters.remarks) {
      if (!uld.remarks.toLowerCase().includes(columnFilters.remarks.toLowerCase())) return false
    }

    if (columnFilters.status !== "All") {
      const statusNum = Number.parseInt(columnFilters.status)
      if (uld.status !== statusNum) return false
    }

    return true
  })

  const statusCounts = {
    1: filteredUlds.filter((uld) => uld.status === 1).length,
    2: filteredUlds.filter((uld) => uld.status === 2).length,
    3: filteredUlds.filter((uld) => uld.status === 3).length,
    4: filteredUlds.filter((uld) => uld.status === 4).length,
    5: filteredUlds.filter((uld) => uld.status === 5).length,
  }

  const statusStages = [
    { id: 1, label: "on aircraft", count: statusCounts[1], avgTime: "12 min", icon: Plane, trend: -2 },
    { id: 2, label: "received by GHA", count: statusCounts[2], avgTime: "8 min", icon: Users, trend: +5 },
    { id: 3, label: "tunnel indicated", count: statusCounts[3], avgTime: "15 min", icon: ArrowRight, trend: +3 },
    { id: 4, label: "store the ULD", count: statusCounts[4], avgTime: "10 min", icon: Warehouse, trend: -1 },
    { id: 5, label: "breakdown completed", count: statusCounts[5], avgTime: "18 min", icon: CheckCircle, trend: +7 },
  ]

  const getFlightGroupIndices = (flightNumber: string): number[] => {
    const indices: number[] = []
    let inGroup = false

    for (let i = 0; i < filteredUlds.length; i++) {
      if (filteredUlds[i].flight === flightNumber) {
        indices.push(i)
        inGroup = true
      } else if (inGroup) {
        break
      }
    }

    return indices
  }

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1:
        return "1) on aircraft"
      case 2:
        return "2) received by GHA (AACS)"
      case 3:
        return "3) tunnel inducted (Skychain)"
      case 4:
        return "4) store the ULD (MHS)"
      case 5:
        return "5) breakdown completed"
      default:
        return "1) on aircraft"
    }
  }

  const maxValue = viewMode === "count" ? Math.max(...statusStages.map((s) => s.count)) : 20

  const mapHeaderToField = (header: string): string | null => {
    const normalized = header.toLowerCase().trim().replace(/[.\s]/g, "")

    const headerMap: Record<string, string> = {
      fltno: "flightNumber",
      flightno: "flightNumber",
      flightnumber: "flightNumber",
      flight: "flightNumber",
      eta: "eta",
      time: "eta",
      brdpnt: "boardingPoint",
      boardingpoint: "boardingPoint",
      boarding: "boardingPoint",
      origin: "boardingPoint",
      uldnumber: "uldNumber",
      uldno: "uldNumber",
      uld: "uldNumber",
      uldshc: "uldshc",
      shc: "uldshc",
      specialhandling: "uldshc",
      dest: "destination",
      destination: "destination",
      remarks: "remarks",
      remark: "remarks",
      comment: "remarks",
      status: "status",
    }

    return headerMap[normalized] || null
  }

  const handleFileUpload = async (file: File) => {
    console.log("[v0] File selected:", file.name, file.type)
    setIsProcessing(true)

    try {
      const text = await file.text()
      console.log("[v0] File content loaded, length:", text.length)

      const lines = text.split("\n").filter((line) => line.trim())
      if (lines.length < 2) {
        console.error("[v0] Invalid CSV: not enough lines")
        alert("Invalid CSV file: file is empty or has no data rows")
        setIsProcessing(false)
        return
      }

      const headers = lines[0].split(",").map((h) => h.trim())
      console.log("[v0] CSV headers:", headers)

      const uldNumberIndex = findColumnIndex(headers, ["uld no", "uldnumber", "uld number", "uldno"])

      if (uldNumberIndex === -1) {
        console.error("[v0] Missing ULD No. column")
        alert('Invalid CSV file: missing "ULD No." column')
        setIsProcessing(false)
        return
      }

      const statusColumns = [
        {
          index: findColumnIndex(headers, ["1 on aircraft", "1)on aircraft", "on aircraft", "1onaircraft"]),
          status: 1 as const,
        },
        {
          index: findColumnIndex(headers, [
            "2 received by gha",
            "2)received by gha",
            "received by gha",
            "2receivedbygha",
          ]),
          status: 2 as const,
        },
        {
          index: findColumnIndex(headers, [
            "3 tunnel inducted",
            "3)tunnel inducted",
            "tunnel inducted",
            "3tunnelinducted",
          ]),
          status: 3 as const,
        },
        {
          index: findColumnIndex(headers, ["4 store the uld", "4)store the uld", "store the uld", "4storetheuld"]),
          status: 4 as const,
        },
        {
          index: findColumnIndex(headers, [
            "5 breakdown completed",
            "5)breakdown completed",
            "breakdown completed",
            "5breakdowncompleted",
          ]),
          status: 5 as const,
        },
      ]

      const staffColumnIndex = findColumnIndex(headers, [
        "staff",
        "staff who broke",
        "staff who broke it down",
        "staffwhobrokeit",
      ])

      console.log("[v0] Column indices:", { uldNumberIndex, statusColumns, staffColumnIndex })

      let updatedCount = 0
      let notFoundCount = 0

      const rows = lines.slice(1)

      setFlights((prevFlights) => {
        const updatedFlights = prevFlights.map((flight) => {
          const updatedUlds = flight.ulds.map((uld) => {
            const matchingRow = rows.find((line) => {
              const values = line.split(",").map((v) => v.trim())
              const csvUldNumber = values[uldNumberIndex]
              return csvUldNumber === uld.uldNumber
            })

            if (!matchingRow) {
              return uld
            }

            console.log("[v0] Found matching ULD:", uld.uldNumber)
            updatedCount++

            const values = matchingRow.split(",").map((v) => v.trim())

            const csvStatusDates = new Map<1 | 2 | 3 | 4 | 5, Date>()

            statusColumns.forEach(({ index, status }) => {
              if (index !== -1 && values[index] && values[index].trim() !== "") {
                const dateStr = values[index].trim()
                const timestamp = new Date(dateStr)

                if (!isNaN(timestamp.getTime())) {
                  csvStatusDates.set(status, timestamp)
                  console.log(`[v0] ULD ${uld.uldNumber}: Found status ${status} with date ${dateStr}`)
                }
              }
            })

            let staffName = getRandomName()
            if (staffColumnIndex !== -1 && values[staffColumnIndex] && values[staffColumnIndex].trim() !== "") {
              staffName = values[staffColumnIndex].trim()
              console.log(`[v0] ULD ${uld.uldNumber}: Staff name from CSV: ${staffName}`)
            }

            let highestStatus = 0
            csvStatusDates.forEach((_, status) => {
              if (status > highestStatus) {
                highestStatus = status
              }
            })

            console.log(`[v0] ULD ${uld.uldNumber}: Highest status found in CSV: ${highestStatus}`)

            if (highestStatus === 0) {
              console.log(`[v0] ULD ${uld.uldNumber}: No valid status data found, skipping`)
              return uld
            }

            const newStatusHistory: Array<{ status: 1 | 2 | 3 | 4 | 5; timestamp: Date; changedBy: string }> = []

            for (let status = 1; status <= highestStatus; status++) {
              const typedStatus = status as 1 | 2 | 3 | 4 | 5

              const csvDate = csvStatusDates.get(typedStatus)

              if (csvDate) {
                const changedBy = typedStatus === 5 ? staffName : getRandomName()

                newStatusHistory.push({
                  status: typedStatus,
                  timestamp: csvDate,
                  changedBy,
                })
                console.log(
                  `[v0] ULD ${uld.uldNumber}: Adding status ${status} with CSV date ${csvDate.toISOString()} by ${changedBy}`,
                )
              } else {
                const earliestCsvDate = Array.from(csvStatusDates.values()).sort((a, b) => a.getTime() - b.getTime())[0]
                const autoTimestamp = new Date(earliestCsvDate)
                autoTimestamp.setHours(autoTimestamp.getHours() - (highestStatus - status))

                newStatusHistory.push({
                  status: typedStatus,
                  timestamp: autoTimestamp,
                  changedBy: getRandomName(),
                })
                console.log(
                  `[v0] ULD ${uld.uldNumber}: Auto-filling status ${status} with calculated date ${autoTimestamp.toISOString()}`,
                )
              }
            }

            newStatusHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

            console.log(
              `[v0] ULD ${uld.uldNumber}: Replacing status history with ${newStatusHistory.length} entries, setting status to ${highestStatus}`,
            )

            return {
              ...uld,
              status: highestStatus as 1 | 2 | 3 | 4 | 5,
              statusHistory: newStatusHistory,
            }
          })

          return {
            ...flight,
            ulds: updatedUlds,
          }
        })

        return updatedFlights
      })

      rows.forEach((line) => {
        const values = line.split(",").map((v) => v.trim())
        const csvUldNumber = values[uldNumberIndex]

        const found = flights.some((flight) => flight.ulds.some((uld) => uld.uldNumber === csvUldNumber))

        if (!found) {
          notFoundCount++
          console.log("[v0] ULD not found in dataset:", csvUldNumber)
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 1000))

      alert(
        `File processed successfully!\n\nUpdated: ${updatedCount} ULDs\nNot found: ${notFoundCount} ULDs\n\nStatus history has been replaced with CSV data for matching ULDs.`,
      )
      setIsProcessing(false)
      setShowUploadModal(false)
    } catch (error) {
      console.error("[v0] Error processing file:", error)
      alert("Error processing file. Please check the file format and try again.")
      setIsProcessing(false)
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

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const totalUlds = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full">
        {/* Header Controls */}
        <div className="flex items-center gap-2 px-2 py-1">
          {/* Date Picker */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => {
                setShowDatePicker(!showDatePicker)
                setShowShiftPicker(false)
                setShowBreakdownPicker(false)
                setShowStaffPicker(false)
              }}
              className="flex items-center gap-2 bg-white text-gray-700 px-2 py-1 rounded-lg border border-gray-200 hover:text-[#D71A21] transition-colors text-sm font-medium cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{formatDateDisplay(selectedDate)}</span>
            </button>
            {showDatePicker && (
              <div className="absolute top-full mt-2 z-10">
                <DatePicker
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onClose={() => setShowDatePicker(false)}
                />
              </div>
            )}
          </div>

          {/* Shift Picker */}
          <div className="relative" ref={shiftPickerRef}>
            <button
              onClick={() => {
                setShowShiftPicker(!showShiftPicker)
                setShowDatePicker(false)
                setShowBreakdownPicker(false)
                setShowStaffPicker(false)
              }}
              className="flex items-center gap-1 text-gray-700 px-2 py-1 hover:text-[#D71A21] transition-colors text-sm font-medium cursor-pointer"
            >
              <span>{selectedShift}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showShiftPicker && (
              <div className="absolute top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10 min-w-[140px]">
                {shifts.map((shift) => (
                  <button
                    key={shift}
                    onClick={() => {
                      setSelectedShift(shift)
                      setShowShiftPicker(false)
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-gray-700 text-sm font-medium"
                  >
                    {shift}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Breakdown Rate Filter */}
          <div className="relative" ref={breakdownPickerRef}>
            <button
              onClick={() => {
                setShowBreakdownPicker(!showBreakdownPicker)
                setShowDatePicker(false)
                setShowShiftPicker(false)
                setShowStaffPicker(false)
              }}
              className="flex items-center gap-1 text-gray-700 px-2 py-1.5 hover:text-[#D71A21] transition-colors text-sm font-medium cursor-pointer"
            >
              <span>{selectedBreakdownRate === "All" ? "Breakdown Rate" : selectedBreakdownRate}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showBreakdownPicker && (
              <div className="absolute top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10 min-w-[160px]">
                {["All", "Last Hour", "Last 2 Hours", "Last 4 Hours", "Last 8 Hours", "Today"].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setSelectedBreakdownRate(rate)
                      setShowBreakdownPicker(false)
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-gray-700 text-sm font-medium"
                  >
                    {rate}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Staff Filter */}
          <div className="relative" ref={staffPickerRef}>
            <button
              onClick={() => {
                setShowStaffPicker(!showStaffPicker)
                setShowDatePicker(false)
                setShowShiftPicker(false)
                setShowBreakdownPicker(false)
              }}
              className="flex items-center gap-1 text-gray-700 px-2 py-1.5 hover:text-[#D71A21] transition-colors text-sm font-medium cursor-pointer"
            >
              <span>{selectedStaff}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showStaffPicker && (
              <div className="absolute top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10 min-w-[160px] max-h-[300px] overflow-y-auto">
                {uniqueStaff.map((staff) => (
                  <button
                    key={staff}
                    onClick={() => {
                      setSelectedStaff(staff)
                      setShowStaffPicker(false)
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-gray-700 text-sm font-medium"
                  >
                    {staff}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Staff Statistics Button */}
          <button
            onClick={() => setShowStaffStatistics(true)}
            className="flex items-center gap-2 bg-white text-gray-700 px-2 py-1 rounded-lg border border-gray-200 hover:bg-[#D71A21] hover:text-white transition-colors text-sm font-medium cursor-pointer"
            title="View Staff Statistics"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Statistics</span>
          </button>

          <button
            onClick={() => setShowColumnFilters(!showColumnFilters)}
            className={`flex items-center gap-2 px-2 py-1 rounded-lg border transition-colors text-sm font-medium cursor-pointer ${
              showColumnFilters
                ? "bg-[#D71A21] text-white border-[#D71A21]"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
            title="Toggle Column Filters"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>

          {/* File Upload Button */}
          <div className="ml-auto">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 bg-white text-gray-700 px-2 py-1 rounded-lg border border-gray-300 hover:bg-[#D71A21] hover:text-white transition-colors text-sm font-medium cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload File</span>
            </button>
          </div>
        </div>

        {/* Analytics Charts */}
        <AnalyticsCharts statusStages={statusStages} />

        <div className="px-2 mt-1">
          <h3 className="text-sm font-semibold text-gray-900 tracking-tight">ULDs per stage</h3>
        </div>

        <div className="flex items-end justify-between px-32 mb-2">
          {statusStages.map((stage, index) => {
            const barHeight = maxValue > 0 ? (stage.count / maxValue) * 60 + 20 : 20

            const gradients = [
              "from-red-300 to-red-400",
              "from-red-400 to-red-500",
              "from-red-500 to-red-600",
              "from-red-600 to-red-700",
              "from-red-700 to-red-800",
            ]

            return (
              <div key={stage.id} className="flex flex-col items-center gap-1.5 group">
                <div className="text-xl font-black text-gray-900">{stage.count}</div>

                <div
                  className={`w-32 bg-gradient-to-b ${gradients[index]} rounded-t-lg transition-all duration-200 group-hover:scale-105 shadow-md`}
                  style={{ height: `${barHeight}px` }}
                />

                <div className="text-[11px] font-medium text-gray-700 text-center max-w-[140px] leading-tight whitespace-nowrap">
                  {stage.label}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mx-2 rounded-lg border border-gray-200 overflow-x-auto">
          <div className="bg-white">
            <TooltipProvider delayDuration={200}>
              <table className="w-full">
                <thead>
                  <tr className="bg-[#D71A21] text-white">
                    <th className="px-2 py-1 text-left font-semibold text-xs">
                      <div className="flex items-center gap-2">
                        <Plane className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Flight No.</span>
                      </div>
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">ETA</span>
                      </div>
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-xs">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Boarding Point</span>
                      </div>
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-xs">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">ULD No.</span>
                      </div>
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-xs w-[120px]">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">ULD SHC</span>
                      </div>
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-xs">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Destination</span>
                      </div>
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Remarks</span>
                      </div>
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-xs">
                      <span className="whitespace-nowrap">Status</span>
                    </th>
                    <th className="px-2 py-1 w-10"></th>
                  </tr>

                  {showColumnFilters && (
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-2 py-1">
                        <select
                          value={columnFilters.flightNo}
                          onChange={(e) => setColumnFilters({ ...columnFilters, flightNo: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21] text-gray-700"
                        >
                          {uniqueFlightNumbers.map((flight) => (
                            <option key={flight} value={flight}>
                              {flight}
                            </option>
                          ))}
                        </select>
                      </th>
                      <th className="px-2 py-1">
                        <div className="text-xs text-gray-400 text-center">-</div>
                      </th>
                      <th className="px-2 py-1">
                        <select
                          value={columnFilters.boardingPoint}
                          onChange={(e) => setColumnFilters({ ...columnFilters, boardingPoint: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21] text-gray-700"
                        >
                          {uniqueBoardingPoints.map((point) => (
                            <option key={point} value={point}>
                              {point}
                            </option>
                          ))}
                        </select>
                      </th>
                      <th className="px-2 py-1">
                        <input
                          type="text"
                          placeholder="Search..."
                          value={columnFilters.uldNo}
                          onChange={(e) => setColumnFilters({ ...columnFilters, uldNo: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21] text-gray-700"
                        />
                      </th>
                      <th className="px-2 py-1 w-[120px]">
                        <select
                          value={columnFilters.uldShc}
                          onChange={(e) => setColumnFilters({ ...columnFilters, uldShc: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21] text-gray-700"
                        >
                          {uniqueUldShcCodes.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>
                      </th>
                      <th className="px-2 py-1">
                        <select
                          value={columnFilters.destination}
                          onChange={(e) => setColumnFilters({ ...columnFilters, destination: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21] text-gray-700"
                        >
                          {uniqueDestinations.map((dest) => (
                            <option key={dest} value={dest}>
                              {dest}
                            </option>
                          ))}
                        </select>
                      </th>
                      <th className="px-2 py-1">
                        <input
                          type="text"
                          placeholder="Search..."
                          value={columnFilters.remarks}
                          onChange={(e) => setColumnFilters({ ...columnFilters, remarks: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21] text-gray-700"
                        />
                      </th>
                      <th className="px-2 py-1">
                        <select
                          value={columnFilters.status}
                          onChange={(e) => setColumnFilters({ ...columnFilters, status: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21] text-gray-700"
                        >
                          <option value="All">All</option>
                          <option value="1">1) on aircraft</option>
                          <option value="2">2) received by GHA</option>
                          <option value="3">3) tunnel inducted</option>
                          <option value="4">4) store the ULD</option>
                          <option value="5">5) breakdown completed</option>
                        </select>
                      </th>
                      <th className="px-2 py-1 w-10"></th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-2 text-center text-gray-500 text-sm">
                        Loading data...
                      </td>
                    </tr>
                  ) : filteredUlds.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-2 text-center text-gray-500 text-sm">
                        No ULDs available for the selected shift
                      </td>
                    </tr>
                  ) : (
                    filteredUlds.map((uld, index) => {
                      const flightGroupIndices = hoveredFlight ? getFlightGroupIndices(hoveredFlight) : []
                      const isInHoveredGroup = flightGroupIndices.includes(index)

                      const flight = flights.find((f) => f.flightNumber === uld.flight)
                      const uldIndex = flight ? flight.ulds.findIndex((u) => u.uldNumber === uld.uldNumber) : 0

                      const uldShcCodes = uld.uldshc ? uld.uldshc.split("-").filter((code) => code.trim() !== "") : []

                      return (
                        <tr
                          key={index}
                          onMouseEnter={() => setHoveredFlight(uld.flight)}
                          onMouseLeave={() => setHoveredFlight(null)}
                          className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 relative ${
                            isInHoveredGroup ? "border-l-4 border-l-[#D71A21]" : ""
                          }`}
                        >
                          <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
                            {uld.flight}
                          </td>
                          <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{uld.eta}</td>
                          <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
                            {uld.origin}
                          </td>
                          <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
                            {uld.uldNumber}
                          </td>
                          <td className="px-2 py-1 w-[120px]">
                            {uldShcCodes.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {uldShcCodes.slice(0, MAX_VISIBLE_CHIPS).map((code, codeIndex) => (
                                  <span
                                    key={codeIndex}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-[#D71A21] border border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap"
                                  >
                                    {code}
                                  </span>
                                ))}
                                {uldShcCodes.length > MAX_VISIBLE_CHIPS && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-[#D71A21] border border-red-200 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap">
                                        +{uldShcCodes.length - MAX_VISIBLE_CHIPS}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="max-w-none bg-gray-100/95 border-gray-300 text-gray-900 rounded-md"
                                      hideArrow={true}
                                    >
                                      <div className="flex items-center gap-1 flex-nowrap">
                                        {uldShcCodes.slice(MAX_VISIBLE_CHIPS).map((code, codeIndex) => (
                                          <span
                                            key={codeIndex}
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-[#D71A21] border border-red-200 whitespace-nowrap"
                                          >
                                            {code}
                                          </span>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">--</span>
                            )}
                          </td>
                          <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
                            {uld.destination}
                          </td>
                          <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
                            {uld.remarks}
                          </td>
                          <td className="px-2 py-1 text-left">
                            <span className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                              {getStatusLabel(uld.status)}
                            </span>
                          </td>
                          <td className="px-2 py-1 w-10">
                            <button
                              className="flex-shrink-0 p-1"
                              onClick={() => {
                                if (onULDSelect && flight) {
                                  onULDSelect(flight.ulds[uldIndex], uld.flight, uldIndex)
                                }
                              }}
                            >
                              <ChevronRight className="h-4 w-4 text-gray-600 hover:text-[#D71A21]" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Staff Statistics Modal */}
      <StaffStatisticsModal
        isOpen={showStaffStatistics}
        onClose={() => setShowStaffStatistics(false)}
        ulds={allUlds}
        dateRange={{ from: selectedDate, to: selectedDate }}
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            {/* Modal Header */}
            <div className="border-b border-gray-200 px-6 py-4 relative">
              <h2 className="text-xl font-semibold text-gray-900">Upload Excel File</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload your Excel file. The system will verify and assess each row of data.
              </p>
              <button
                onClick={() => setShowUploadModal(false)}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-8">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D71A21]"></div>
                  <p className="mt-4 text-gray-600 font-medium">Processing file...</p>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging ? "border-[#D71A21] bg-red-50" : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <Upload className="w-12 h-12 text-gray-400" />
                    <div>
                      <p className="text-gray-700 font-medium mb-1">Click to upload or drag and drop</p>
                      <p className="text-sm text-gray-500">.xlsx, .xls, .csv - Maximum file size 50 MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileInputChange}
                      className="hidden"
                      id="modal-file-upload"
                    />
                    <label
                      htmlFor="modal-file-upload"
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      Choose File
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!isProcessing && (
              <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
