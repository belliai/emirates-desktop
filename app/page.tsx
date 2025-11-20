"use client"

import { useState } from "react"
import LoginScreen from "@/components/login-screen"
import DesktopScreen from "@/components/desktop-screen"
import ULDHistoryScreen from "@/components/uld-history-screen"
import ListsScreen from "@/components/lists-screen"
import NonPreaannouncedScreen from "@/components/non-preannounced-screen"
import ULDSteeringScreen from "@/components/uld-steering-screen"
import BDNDashboardScreen from "@/components/bdn-dashboard-screen"
import ULDStatusTrackingScreen from "@/components/uld-status-tracking-screen"
import FlightRiskScreen from "@/components/flight-risk-screen"
import WorkloadForecastScreen from "@/components/workload-forecast-screen"
import ThresholdAlertsScreen from "@/components/threshold-alerts-screen"
import StaffRosterScreen from "@/components/staff-roster-screen"
import CustomReportsScreen from "@/components/custom-reports-screen"
import LoadPlansScreen from "@/components/load-plans-screen"
import BuildupStaffScreen from "@/components/buildup-staff-screen"
import FlightAssignmentScreen from "@/components/flight-assignment-screen"
import SideNavigation from "@/components/side-navigation"
import { FlightProvider, useFlights } from "@/lib/flight-context"
import { LoadPlanProvider } from "@/lib/load-plan-context"
import type { ULD } from "@/lib/flight-data"

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentScreen, setCurrentScreen] = useState<
    | "desktop"
    | "history"
    | "load-plans"
    | "lists"
    | "non-preannounced"
    | "dwc-steering"
    | "bdn-dashboard"
    | "uld-status"
    | "flight-risk"
    | "workload-forecast"
    | "threshold-alerts"
    | "staff-roster"
    | "custom-reports"
    | "staff"
    | "uld-management"
    | "buildup-staff"
    | "flight-assignment"
  >("desktop")
  const [selectedULD, setSelectedULD] = useState<(ULD & { flightNumber: string; uldIndex: number }) | null>(null)
  const { updateULDStatus, addMultipleStatusUpdates } = useFlights()

  const handleULDSelect = (uld: ULD, flightNumber: string, uldIndex: number) => {
    setSelectedULD({ ...uld, flightNumber, uldIndex })
    setCurrentScreen("history")
  }

  const handleStatusUpdate = (newStatus: number) => {
    if (selectedULD) {
      updateULDStatus(selectedULD.flightNumber, selectedULD.uldIndex, newStatus as 1 | 2 | 3 | 4 | 5)
    }
  }

  const handleMultipleStatusUpdates = (statuses: Array<1 | 2 | 3 | 4 | 5>) => {
    if (selectedULD) {
      addMultipleStatusUpdates(selectedULD.flightNumber, selectedULD.uldIndex, statuses)
    }
  }

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as any)
  }

  const renderScreen = () => {
    if (currentScreen === "history" && selectedULD) {
      return (
        <ULDHistoryScreen
          uld={selectedULD}
          onBack={() => setCurrentScreen("desktop")}
          onStatusUpdate={handleStatusUpdate}
          onMultipleStatusUpdates={handleMultipleStatusUpdates}
        />
      )
    }

    switch (currentScreen) {
      case "buildup-staff":
        return <BuildupStaffScreen />
      case "desktop":
        return <DesktopScreen onULDSelect={handleULDSelect} />
      case "load-plans":
        return <LoadPlansScreen />
      case "lists":
        return <ListsScreen />
      case "non-preannounced":
        return <NonPreaannouncedScreen />
      case "dwc-steering":
        return <ULDSteeringScreen />
      case "bdn-dashboard":
        return <BDNDashboardScreen />
      case "uld-status":
        return <ULDStatusTrackingScreen />
      case "flight-risk":
        return <FlightRiskScreen />
      case "workload-forecast":
        return <WorkloadForecastScreen />
      case "threshold-alerts":
        return <ThresholdAlertsScreen />
      case "staff-roster":
        return <StaffRosterScreen />
      case "custom-reports":
        return <CustomReportsScreen />
      case "flight-assignment":
        return <FlightAssignmentScreen />
      case "staff":
      case "uld-management":
        return (
          <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-full">
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h2>
                <p className="text-gray-600">This feature is under development</p>
              </div>
            </div>
          </div>
        )
      default:
        return <DesktopScreen onULDSelect={handleULDSelect} />
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {!isLoggedIn ? (
        <LoginScreen onLogin={() => setIsLoggedIn(true)} />
      ) : (
        <div className="flex h-screen overflow-hidden">
          <SideNavigation currentScreen={currentScreen} onNavigate={handleNavigate} />
          <div className="flex-1 overflow-y-auto">{renderScreen()}</div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <FlightProvider>
      <LoadPlanProvider>
        <AppContent />
      </LoadPlanProvider>
    </FlightProvider>
  )
}
