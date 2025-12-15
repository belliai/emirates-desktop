"use client"
import { ArrowLeft } from "lucide-react"
import type { ULD } from "@/lib/flight-data"

interface ULDHistoryScreenProps {
  uld: ULD
  onBack: () => void
  onStatusUpdate: (newStatus: number) => void
  onMultipleStatusUpdates: (statuses: Array<1 | 2 | 3 | 4 | 5>) => void
}

export default function ULDHistoryScreen({
  uld,
  onBack,
  onStatusUpdate,
  onMultipleStatusUpdates,
}: ULDHistoryScreenProps) {
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

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1:
        return "rgba(215, 26, 33, 0.25)" // Very light Emirates red (25% opacity)
      case 2:
        return "rgba(215, 26, 33, 0.4)" // Light Emirates red (40% opacity)
      case 3:
        return "rgba(215, 26, 33, 0.6)" // Medium Emirates red (60% opacity)
      case 4:
        return "rgba(215, 26, 33, 0.8)" // Strong Emirates red (80% opacity)
      case 5:
        return "#D71A21" // Full Emirates red (100% opacity)
      default:
        return "rgba(215, 26, 33, 0.25)"
    }
  }

  // Dubai/GST timezone constant (UTC+4)
  const DISPLAY_TIMEZONE = "Asia/Dubai"

  const formatDate = (date: Date) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: DISPLAY_TIMEZONE,
      month: "2-digit",
      day: "2-digit",
    })
    const parts = formatter.formatToParts(date)
    const month = parts.find(p => p.type === "month")?.value || ""
    const day = parts.find(p => p.type === "day")?.value || ""
    return `${month}/${day}`
  }

  const formatTime = (date: Date) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: DISPLAY_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const parts = formatter.formatToParts(date)
    const hours = parts.find(p => p.type === "hour")?.value || ""
    const minutes = parts.find(p => p.type === "minute")?.value || ""
    return `${hours}:${minutes}`
  }

  const parseBulkDate = (uldNumber: string): string => {
    const match = uldNumber.match(/\/(.+)$/)
    return match ? match[1] : ""
  }

  const getCleanBulkNumber = (uldNumber: string): string => {
    return uldNumber.split("/")[0]
  }

  const isBulkULD = (uld: ULD): boolean => {
    return uld.uldNumber.startsWith("BULK") && uld.remarks === "BULK"
  }

  const getPersonName = (status: number): string => {
    const names = [
      "Ahmed Hassan",
      "Sarah Johnson",
      "Mohammed Ali",
      "Emily Chen",
      "Fatima Ahmed",
      "David Smith",
      "Aisha Khan",
      "John Williams",
    ]
    return names[status % names.length]
  }

  const displayTimeline = () => {
    if (!uld.statusHistory || uld.statusHistory.length === 0) {
      return [
        {
          status: uld.status,
          timestamp: new Date(),
          changedBy: getPersonName(uld.status),
        },
      ]
    }
    return uld.statusHistory
  }

  const timeline = displayTimeline()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 px-6 py-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Status History</h1>
        </div>
      </header>

      {/* ULD Info */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="text-lg font-bold text-gray-900 mb-1">
          {isBulkULD(uld) ? getCleanBulkNumber(uld.uldNumber) : uld.uldNumber}
        </div>
        <div className="text-sm text-gray-500">
          {uld.destination} • {uld.remarks}
        </div>
        <div className="text-sm text-gray-500">{uld.uldshc}</div>
      </div>

      <main className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full">
        {timeline.length > 0 ? (
          <div className="space-y-2">
            {timeline.map((entry, index) => (
              <div key={index} className="flex items-center gap-4 h-20">
                {/* Date and Time */}
                <div className="text-sm font-medium w-20 flex-shrink-0 flex flex-col items-center justify-center">
                  <span className="text-gray-500 whitespace-nowrap">{formatDate(entry.timestamp)}</span>
                  <span className="text-gray-500 whitespace-nowrap">{formatTime(entry.timestamp)}</span>
                </div>

                <div className="relative flex items-center justify-center w-6 h-full flex-shrink-0">
                  {/* Vertical bar */}
                  <div className="absolute w-1 h-16 bg-gray-300 rounded-full" />

                  {/* Circle positioned on bar based on status */}
                  <div
                    className="absolute w-5 h-5 rounded-full border-2 border-white z-10"
                    style={{
                      backgroundColor: getStatusColor(entry.status),
                      top: `${((entry.status - 1) / 4) * 100}%`,
                      transform: "translateY(-50%)",
                    }}
                  />
                </div>

                {/* Name and Status */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <span className="text-base font-medium text-gray-900 whitespace-nowrap truncate">
                    {entry.changedBy || getPersonName(entry.status)}
                  </span>
                  <span className="text-sm text-gray-500 whitespace-nowrap truncate">
                    changed to {getStatusLabel(entry.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8 text-base">No status history available</div>
        )}
      </main>
    </div>
  )
}
