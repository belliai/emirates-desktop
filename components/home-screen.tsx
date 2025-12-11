"use client"

import { Menu, Search, X, ChevronRight, Plane, Clock, MapPin, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useFlights } from "@/lib/flight-context"
import type { Flight } from "@/lib/flight-data"

interface FlightDetail {
  flightNumber: string
  eta: string
  boardingPoint: string
  uldCount: number
}

interface HomeScreenProps {
  onLogout: () => void
  onFlightSelect: (flight: Flight) => void
}

export default function HomeScreen({ onLogout, onFlightSelect }: HomeScreenProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { flights, loading } = useFlights()

  const handleFlightClick = (flight: Flight) => {
    console.log("[v0] Flight clicked:", flight.flightNumber)
    onFlightSelect(flight)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors group">
            <Menu className="h-6 w-6 text-gray-700 group-hover:text-[#D71A21] transition-colors" />
          </button>

          <h1 className="text-lg font-semibold text-gray-900">Flight Dashboard</h1>

          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => setIsSearchOpen(true)}>
            <Search className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr_0.5fr] gap-2 bg-[#D71A21] text-white px-3 py-3 text-base font-semibold">
            <div className="flex items-center">
              <Plane className="h-5 w-5" />
            </div>
            <div className="flex items-center">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex items-center">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <div></div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-3 py-6 text-center text-gray-500">Loading flights...</div>
            ) : flights.length === 0 ? (
              <div className="px-3 py-6 text-center text-gray-500">No flights available</div>
            ) : (
              flights.map((flight, index) => <FlightRow key={index} flight={flight} onClick={handleFlightClick} />)
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-4">
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full border-[#D71A21] text-[#D71A21] hover:bg-[#D71A21] hover:text-white bg-transparent"
          >
            Logout
          </Button>
        </div>
      </main>

      {/* Search Modal Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100]">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)} />

          {/* Search Modal */}
          <div className="relative z-[101] bg-white shadow-lg">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>

              <input
                type="text"
                placeholder="Search flights..."
                autoFocus
                className="flex-1 text-base text-gray-900 placeholder:text-gray-500 outline-none bg-transparent"
              />

              <Search className="h-5 w-5 text-[#D71A21]" />
            </div>

            {/* Search suggestions/results area */}
            <div className="p-4">
              <p className="text-sm text-gray-500">Start typing to search flights</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface FlightRowProps {
  flight: Flight
  onClick: (flight: Flight) => void
}

function FlightRow({ flight, onClick }: FlightRowProps) {
  return (
    <button
      onClick={() => onClick(flight)}
      className="grid grid-cols-[1fr_1fr_1fr_0.8fr_0.5fr] gap-2 px-3 py-3 text-sm hover:bg-gray-50 transition-colors w-full text-left group"
    >
      <div className="font-semibold text-gray-900">{flight.flightNumber}</div>
      <div className="text-gray-700">{flight.eta}</div>
      <div className="text-gray-700">{flight.boardingPoint}</div>
      <div className="text-center font-medium text-gray-900">{flight.uldCount}</div>
      <div className="flex items-center justify-center">
        <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-[#D71A21] transition-colors" />
      </div>
    </button>
  )
}
