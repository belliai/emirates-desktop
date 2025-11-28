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
import PerformanceScreen from "@/components/performance-screen"
import CustomReportsScreen from "@/components/custom-reports-screen"
import LoadPlansScreen from "@/components/load-plans-screen"
import BuildupStaffScreen from "@/components/buildup-staff-screen"
import FlightAssignmentScreen from "@/components/flight-assignment-screen"
import SituationalAwarenessScreen from "@/components/situational-awareness-screen"
import WorkAreaScreen from "@/components/work-area-screen"
import FlightsViewScreen from "@/components/flights-view-screen"
import ShiftSummaryReportScreen from "@/components/shift-summary-report-screen"
import BUPAllocationListScreen from "@/components/bup-allocation-list-screen"
import ScreeningSummaryScreen from "@/components/screening-summary-screen"
import IncomingWorkloadScreen from "@/components/incoming-workload-screen"
import QRTListScreen from "@/components/qrt-list-screen"
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
    | "custom-reports"
    | "staff"
    | "uld-management"
    | "buildup-staff"
    | "flight-assignment"
    | "shift-summary-report"
    | "situational-awareness"
    | "flights-view"
    | "work-area-gcr"
    | "work-area-per"
    | "work-area-pil"
    | "bup-allocation-list"
    | "screening"
    | "incoming-workload"
    | "qrt-list"
  >("desktop")
  const [selectedULD, setSelectedULD] = useState<(ULD & { flightNumber: string; uldIndex: number }) | null>(null)
  const [buildupStaffParams, setBuildupStaffParams] = useState<{ staff?: string } | null>(null)
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

  const handleNavigate = (screen: string, params?: any) => {
    setCurrentScreen(screen as any)
    if (screen === "buildup-staff" && params?.staff) {
      setBuildupStaffParams({ staff: params.staff })
    } else {
      setBuildupStaffParams(null)
    }
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
        return (
          <BuildupStaffScreen 
            initialStaff={buildupStaffParams?.staff as "david" | "harley" | undefined}
            onNavigate={handleNavigate}
          />
        )
      case "desktop":
        return <DesktopScreen onULDSelect={handleULDSelect} />
      case "load-plans":
        return <LoadPlansScreen />
      case "lists":
        return <ListsScreen />
      case "qrt-list":
        return <QRTListScreen />
      case "non-preannounced":
        return <NonPreaannouncedScreen />
      case "dwc-steering":
        return <ULDSteeringScreen />
      case "bdn-dashboard":
        return <BDNDashboardScreen onNavigate={handleNavigate} />
      case "situational-awareness":
        return <SituationalAwarenessScreen onNavigate={handleNavigate} />
      case "incoming-workload":
        return <IncomingWorkloadScreen />
      case "flights-view":
        return <FlightsViewScreen />
      case "bup-allocation-list":
        return <BUPAllocationListScreen onNavigate={handleNavigate} />
      case "screening":
        return <ScreeningSummaryScreen />
      case "work-area-gcr":
        return <WorkAreaScreen workArea="GCR" onBack={() => setCurrentScreen("desktop")} />
      case "work-area-per":
        return <WorkAreaScreen workArea="PER" onBack={() => setCurrentScreen("desktop")} />
      case "work-area-pil":
        return <WorkAreaScreen workArea="PIL" onBack={() => setCurrentScreen("desktop")} />
      case "uld-status":
        return <ULDStatusTrackingScreen />
      case "flight-risk":
        return <FlightRiskScreen />
      case "workload-forecast":
        return <WorkloadForecastScreen />
      case "threshold-alerts":
        return <ThresholdAlertsScreen />
      case "custom-reports":
        return <CustomReportsScreen />
      case "flight-assignment":
        return <FlightAssignmentScreen />
      case "shift-summary-report":
        return <ShiftSummaryReportScreen />
      case "staff":
        return <PerformanceScreen />
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
