"use client"

import { useState } from "react"
import { WarehouseIcon } from "lucide-react"

import { Flight } from "@/types/flight-master/flight-master"
import { useGlobalLocation } from "@/lib/hooks/use-global-location"
import { Separator } from "@/components/ui/separator"
import { FacetedFilters } from "@/components/faceted-filters"

import { SectionFlightSelect } from "../components/section-flight-select"
import { SectionUldAssignment } from "./components/section-uld-assignment"

export default function BuildUpPage() {
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const {
    locations,
    locationOptions,
    selectedLocation,
    setSelectedLocation,
    locationSearch,
    setLocationSearch,
  } = useGlobalLocation()

  return (
    <div className="flex w-full flex-row items-start justify-center">
      <div className="flex h-full min-h-[calc(100vh-48px-32px)] w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-row items-center justify-end">
          <FacetedFilters
            title="Station"
            type="select"
            filterIcon={WarehouseIcon}
            options={locationOptions}
            onSearchValueChange={setLocationSearch}
            searchValue={locationSearch}
            value={selectedLocation?.id || ""}
            onValueChange={(value) => {
              const location = locations?.find(
                (location) => location.id === value
              )
              setSelectedLocation(location || null)
            }}
          />
        </div>
        <SectionFlightSelect
          selectedFlight={selectedFlight}
          onFlightSelect={setSelectedFlight}
        />
        <Separator className="bg-muted/80" />
        <SectionUldAssignment selectedFlight={selectedFlight} />
      </div>
    </div>
  )
}
