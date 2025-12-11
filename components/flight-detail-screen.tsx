"use client"

import type React from "react"

import { ArrowLeft, Plane, Clock, MapPin, Package, Plus, X, ChevronDown, ChevronUp } from "lucide-react"
import type { Flight, ULD, StatusHistoryEntry } from "@/lib/flight-data"
import { useState, useRef, useEffect } from "react"
import { useFlights } from "@/lib/flight-context"
import { validateStatusTransition, getMissingStatuses } from "@/lib/status-workflow"

interface FlightDetailScreenProps {
  flight: Flight
  onBack: () => void
  onULDSelect: (uld: ULD) => void
}

export default function FlightDetailScreen({ flight, onBack, onULDSelect }: FlightDetailScreenProps) {
  const { flights, updateULDStatus: updateGlobalStatus, addULD: addGlobalULD } = useFlights()

  const currentFlight = flights.find((f) => f.flightNumber === flight.flightNumber) || flight
  const [ulds, setUlds] = useState<ULD[]>(currentFlight.ulds)

  useEffect(() => {
    const updatedFlight = flights.find((f) => f.flightNumber === flight.flightNumber)
    if (updatedFlight) {
      setUlds(updatedFlight.ulds)
    }
  }, [flights, flight.flightNumber])

  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    uldNumber: "",
    uldshc: "",
    destination: "",
    remarks: "",
    status: 1,
  })

  const [swipeStates, setSwipeStates] = useState<{ [key: number]: number }>({})
  const [isSwipingStates, setIsSwipingStates] = useState<{ [key: number]: boolean }>({})
  const [hapticTriggered, setHapticTriggered] = useState<{ [key: number]: boolean }>({})
  const [leftHapticTriggered, setLeftHapticTriggered] = useState<{ [key: number]: boolean }>({})
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const [openUpward, setOpenUpward] = useState(false)
  const touchStartX = useRef<number>(0)
  const touchCurrentX = useRef<number>(0)
  const touchStartTime = useRef<number>(0)
  const lastTouchX = useRef<number>(0)
  const lastTouchTime = useRef<number>(0)
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({})

  const triggerHaptic = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(10) // Light haptic feedback
    }
  }

  useEffect(() => {
    const updateDropdownPosition = () => {
      if (openDropdown !== null && buttonRefs.current[openDropdown]) {
        const button = buttonRefs.current[openDropdown]
        const rect = button.getBoundingClientRect()
        const dropdownWidth = 200
        const estimatedDropdownHeight = 210

        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top

        const shouldOpenUpward = spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow

        setOpenUpward(shouldOpenUpward)
        setDropdownPosition({
          top: shouldOpenUpward ? rect.top - estimatedDropdownHeight - 16 : rect.bottom + 4,
          left: rect.right - dropdownWidth,
          width: dropdownWidth,
        })
      } else {
        setDropdownPosition(null)
      }
    }

    updateDropdownPosition()

    if (openDropdown !== null) {
      window.addEventListener("scroll", updateDropdownPosition, true)
      return () => {
        window.removeEventListener("scroll", updateDropdownPosition, true)
      }
    }
  }, [openDropdown])

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

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const currentOffset = swipeStates[index] || 0
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
    touchStartTime.current = Date.now()
    lastTouchX.current = e.touches[0].clientX
    lastTouchTime.current = Date.now()
    setIsSwipingStates((prev) => ({ ...prev, [index]: true }))
    setHapticTriggered((prev) => ({ ...prev, [index]: false }))
    setLeftHapticTriggered((prev) => ({ ...prev, [index]: false }))
  }

  const handleTouchMove = (e: React.TouchEvent, index: number) => {
    lastTouchX.current = touchCurrentX.current
    lastTouchTime.current = Date.now()

    touchCurrentX.current = e.touches[0].clientX
    const currentOffset = swipeStates[index] || 0
    const touchDiff = touchCurrentX.current - touchStartX.current

    // If swiped left (showing status 5), only allow swiping right (closing)
    if (currentOffset < -50 && touchDiff < 0) {
      return // Block further left swipe
    }
    // If swiped right (showing statuses 2,3,4), only allow swiping left (closing)
    if (currentOffset > 100 && touchDiff > 0) {
      return // Block further right swipe
    }

    const diff = currentOffset + touchDiff

    const maxSwipe = diff < 0 ? -200 : 350
    let limitedDiff: number

    if (diff < 0) {
      const resistance = Math.abs(diff) / 200
      const easedDiff = diff * (1 - resistance * 0.3)
      limitedDiff = Math.max(easedDiff, maxSwipe)

      if (limitedDiff <= -100 && !hapticTriggered[index]) {
        triggerHaptic()
        setHapticTriggered((prev) => ({ ...prev, [index]: true }))
      }
    } else {
      const resistance = diff / 350
      const easedDiff = diff * (1 - resistance * 0.3)
      limitedDiff = Math.min(easedDiff, maxSwipe)

      if (limitedDiff >= 150 && !leftHapticTriggered[index]) {
        triggerHaptic()
        setLeftHapticTriggered((prev) => ({ ...prev, [index]: true }))
      }
    }

    setSwipeStates((prev) => ({ ...prev, [index]: limitedDiff }))
  }

  const handleTouchEnd = (index: number) => {
    const currentOffset = swipeStates[index] || 0
    const touchDistance = touchCurrentX.current - touchStartX.current
    const finalPosition = currentOffset + touchDistance

    setIsSwipingStates((prev) => ({ ...prev, [index]: false }))

    const currentTime = Date.now()
    const timeDiff = currentTime - lastTouchTime.current
    const distance = touchCurrentX.current - lastTouchX.current
    const velocity = timeDiff > 0 ? Math.abs(distance / timeDiff) : 0
    const isQuickSwipe = velocity > 0.5

    if (currentOffset < -50 && touchDistance > 0 && isQuickSwipe) {
      setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
      return
    }

    if (currentOffset > 100 && touchDistance < 0 && isQuickSwipe) {
      setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
      return
    }

    if (touchDistance < -150 && currentOffset === 0) {
      triggerHaptic()
      updateULDStatus(index, 5)
      setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
    } else if (finalPosition < -50) {
      setSwipeStates((prev) => ({ ...prev, [index]: -200 }))
    } else if (finalPosition > 200) {
      setSwipeStates((prev) => ({ ...prev, [index]: 350 }))
    } else if (finalPosition > 100) {
      setSwipeStates((prev) => ({ ...prev, [index]: 350 }))
    } else {
      setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
    }
  }

  const updateULDStatus = (index: number, newStatus: number) => {
    const updatedUlds = [...ulds]
    const currentUld = updatedUlds[index]

    const validation = validateStatusTransition(currentUld.statusHistory || [], newStatus as 1 | 2 | 3 | 4 | 5)

    if (!validation.isValid) {
      console.warn("[v0] Status transition blocked:", validation.message)
      // Get missing statuses and add them automatically
      const missingStatuses = getMissingStatuses(currentUld.statusHistory || [], newStatus as 1 | 2 | 3 | 4 | 5)

      if (missingStatuses.length > 0) {
        console.log("[v0] Auto-filling missing statuses:", missingStatuses)
        // Create entries for all missing statuses plus the target status
        const allStatuses = [...missingStatuses, newStatus as 1 | 2 | 3 | 4 | 5]
        const newEntries = allStatuses.map((status) => ({
          status,
          timestamp: new Date(),
          changedBy: "David",
        }))

        updatedUlds[index] = {
          ...currentUld,
          status: newStatus as 1 | 2 | 3 | 4 | 5,
          statusHistory: [...(currentUld.statusHistory || []), ...newEntries],
        }

        setUlds(updatedUlds)
        updateGlobalStatus(flight.flightNumber, index, newStatus as 1 | 2 | 3 | 4 | 5)
        setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
        setOpenDropdown(null)
        return
      }

      // If no missing statuses but still invalid, don't update
      return
    }

    const newHistoryEntry: StatusHistoryEntry = {
      status: newStatus as 1 | 2 | 3 | 4 | 5,
      timestamp: new Date(),
      changedBy: "David",
    }

    updatedUlds[index] = {
      ...currentUld,
      status: newStatus as 1 | 2 | 3 | 4 | 5,
      statusHistory: [...(currentUld.statusHistory || []), newHistoryEntry],
    }

    setUlds(updatedUlds)
    updateGlobalStatus(flight.flightNumber, index, newStatus as 1 | 2 | 3 | 4 | 5)
    setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
    setOpenDropdown(null)
  }

  const handleCardClick = (index: number) => {
    const swipeOffset = swipeStates[index] || 0
    if (Math.abs(swipeOffset) >= 10) {
      setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
    } else if (openDropdown !== index) {
      onULDSelect(ulds[index])
    }
  }

  const handleAddULD = (e: React.FormEvent) => {
    e.preventDefault()
    const newULD: ULD = {
      uldNumber: formData.uldNumber,
      uldshc: formData.uldshc,
      destination: formData.destination,
      remarks: formData.remarks,
      status: formData.status as 1 | 2 | 3 | 4 | 5,
      statusHistory: [{ status: formData.status as 1 | 2 | 3 | 4 | 5, timestamp: new Date(), changedBy: "David" }],
    }
    setUlds([...ulds, newULD])
    addGlobalULD(flight.flightNumber, newULD)
    setShowAddForm(false)
    setFormData({
      uldNumber: "",
      uldshc: "",
      destination: "",
      remarks: "",
      status: 1,
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">ULDs</h1>
          </div>
          <button onClick={() => setShowAddForm(true)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Plus className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </header>

      <div className="bg-[#D71A21] px-4 py-3">
        <div className="grid grid-cols-4 gap-2">
          <div className="flex justify-center">
            <Plane className="h-5 w-5 text-white" />
          </div>
          <div className="flex justify-center">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div className="flex justify-center">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <div className="flex justify-center">
            <Package className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      <div
        className="bg-white border-b border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onBack}
      >
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="text-base font-semibold text-gray-900">{flight.flightNumber}</div>
          <div className="text-base font-semibold text-gray-900">{flight.eta}</div>
          <div className="text-base font-semibold text-gray-900">{flight.boardingPoint}</div>
          <div className="text-base font-semibold text-gray-900">{flight.uldCount}</div>
        </div>
      </div>

      <main className="p-4 space-y-2 overflow-x-hidden">
        {ulds.map((uld, index) => {
          const swipeOffset = swipeStates[index] || 0
          const isDropdownOpen = openDropdown === index
          const isActivelySwiping = isSwipingStates[index] || false

          const rightSwipeProgress = Math.min(Math.abs(Math.min(swipeOffset, 0)) / 150, 1)
          const actionOpacity = 0.7 + rightSwipeProgress * 0.3
          const actionScale = 0.95 + rightSwipeProgress * 0.05

          const leftSwipeProgress = Math.min(Math.max(swipeOffset, 0) / 200, 1)
          const leftActionOpacity = 0.7 + leftSwipeProgress * 0.3
          const leftActionScale = 0.95 + leftSwipeProgress * 0.05

          return (
            <div key={index} className="relative">
              <div className="relative overflow-hidden">
                {swipeOffset <= -50 && (
                  <div
                    className="absolute right-0 top-0 bottom-0 w-[200px] bg-green-500 flex items-center justify-center rounded-r-lg transition-all duration-200"
                    style={{
                      opacity: actionOpacity,
                      transform: `scale(${actionScale})`,
                    }}
                  >
                    <button
                      onClick={() => updateULDStatus(index, 5)}
                      className="text-white text-xs font-semibold px-4 py-2"
                    >
                      ✓ 5) breakdown completed
                    </button>
                  </div>
                )}

                {swipeOffset >= 100 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
                    }}
                    className="absolute left-0 top-0 bottom-0 w-[350px] bg-[#D71A21] flex items-stretch rounded-l-lg transition-all duration-200"
                    style={{
                      opacity: leftActionOpacity,
                      transform: `scale(${leftActionScale})`,
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateULDStatus(index, 2)
                      }}
                      className="flex-1 text-white text-[10px] font-semibold hover:bg-[#B91419] transition-colors px-1 leading-tight"
                    >
                      2) received by GHA (AACS)
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateULDStatus(index, 3)
                      }}
                      className="flex-1 text-white text-[10px] font-semibold hover:bg-[#B91419] transition-colors border-l border-red-300 px-1 leading-tight"
                    >
                      3) tunnel inducted (Skychain)
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateULDStatus(index, 4)
                      }}
                      className="flex-1 text-white text-[10px] font-semibold hover:bg-[#B91419] transition-colors border-l border-red-300 px-1 leading-tight"
                    >
                      4) store the ULD (MHS)
                    </button>
                  </div>
                )}

                <div
                  className="bg-white py-4 px-4 touch-pan-y relative"
                  style={{
                    transform: `translateX(${swipeOffset}px)`,
                    transition: isActivelySwiping ? "none" : "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={(e) => handleTouchMove(e, index)}
                  onTouchEnd={() => handleTouchEnd(index)}
                  onClick={() => handleCardClick(index)}
                >
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-gray-900 break-words">
                      {isBulkULD(uld) ? (
                        <>
                          {getCleanBulkNumber(uld.uldNumber)} • {uld.uldshc} • {parseBulkDate(uld.uldNumber)}
                        </>
                      ) : (
                        <>
                          {uld.uldNumber} • {uld.uldshc}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 text-sm text-gray-500 break-words">
                        {uld.destination} • {uld.remarks}
                      </div>

                      <div className="relative flex-shrink-0">
                        <button
                          ref={(el) => {
                            buttonRefs.current[index] = el
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (Math.abs(swipeOffset) < 10) {
                              setOpenDropdown(isDropdownOpen ? null : index)
                            }
                          }}
                          disabled={Math.abs(swipeOffset) >= 10}
                          className={`text-xs px-3 py-1.5 rounded-full font-semibold leading-tight text-center min-w-[100px] max-w-[140px] transition-colors flex items-center justify-center gap-1 ${
                            Math.abs(swipeOffset) >= 10
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : isDropdownOpen
                                ? "bg-[#D71A21] text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-[#D71A21] hover:text-white"
                          }`}
                        >
                          <span className="flex-1">{getStatusLabel(uld.status)}</span>
                          {isDropdownOpen && openUpward ? (
                            <ChevronUp className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-3 w-3 flex-shrink-0" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />
              </div>
            </div>
          )
        })}
      </main>

      {openDropdown !== null && dropdownPosition && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {[1, 2, 3, 4, 5].map((statusNum) => (
            <button
              key={statusNum}
              onClick={(e) => {
                e.stopPropagation()
                updateULDStatus(openDropdown, statusNum)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg transition-colors"
            >
              {getStatusLabel(statusNum)}
            </button>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add ULD</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleAddULD} className="p-4 space-y-4">
              <div>
                <label htmlFor="uldNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  ULD Number
                </label>
                <input
                  type="text"
                  id="uldNumber"
                  required
                  value={formData.uldNumber}
                  onChange={(e) => setFormData({ ...formData, uldNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
                  placeholder="e.g., PMC31580EK or BULK-EK0393/31-AUG-25"
                />
              </div>

              <div>
                <label htmlFor="uldshc" className="block text-sm font-medium text-gray-700 mb-1">
                  ULD SHC
                </label>
                <input
                  type="text"
                  id="uldshc"
                  required
                  value={formData.uldshc}
                  onChange={(e) => setFormData({ ...formData, uldshc: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
                  placeholder="e.g., HEA or EAW"
                />
              </div>

              <div>
                <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  id="destination"
                  required
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
                  placeholder="e.g., FRA or LAX"
                />
              </div>

              <div>
                <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <input
                  type="text"
                  id="remarks"
                  required
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
                  placeholder="e.g., QWM or BULK"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
                >
                  <option value={1}>1) on aircraft</option>
                  <option value={2}>2) received by GHA (AACS)</option>
                  <option value={3}>3) tunnel inducted (Skychain)</option>
                  <option value={4}>4) store the ULD (MHS)</option>
                  <option value={5}>5) breakdown completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#D71A21] text-white rounded-lg font-medium hover:bg-[#B91419] transition-colors"
                >
                  Add ULD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
