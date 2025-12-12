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
import AllocationAssignmentScreen from "@/components/allocation-assignment-screen"
import SituationalAwarenessScreen from "@/components/situational-awareness-screen"
import WorkAreaScreen from "@/components/work-area-screen"
import FlightsViewScreen from "@/components/flights-view-screen"
import ShiftSummaryReportScreen from "@/components/shift-summary-report-screen"
import ScreeningSummaryScreen from "@/components/screening-summary-screen"
import IncomingWorkloadScreen from "@/components/incoming-workload-screen"
import QRTListScreen from "@/components/qrt-list-screen"
import BCRScreen from "@/components/bcr-screen"
import SideNavigation from "@/components/side-navigation"
import SettingsSidebar from "@/components/settings-sidebar"
import SettingsBuildupStaffList from "@/components/settings-buildup-staff-list"
import SettingsScreening from "@/components/settings-screening"
import { FlightProvider, useFlights } from "@/lib/flight-context"
import { LoadPlanProvider } from "@/lib/load-plan-context"
import { NotificationProvider } from "@/lib/notification-context"
import type { ULD } from "@/lib/flight-data"
import { findStaffByStaffNo } from "@/lib/buildup-staff"

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
    | "allocations"
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
    | "bcr"
    | "settings-buildup-staff"
    | "settings-screening"
  >("desktop")
  const [isSettingsMode, setIsSettingsMode] = useState(false)
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
    const target =
      screen === "flight-assignment" || screen === "bup-allocation-list" ? "allocations" : screen

    setCurrentScreen(target as any)
    if (target === "buildup-staff" && params?.staff) {
      setBuildupStaffParams({ staff: params.staff })
    } else {
      setBuildupStaffParams(null)
    }
  }

  const handleSettingsClick = () => {
    setIsSettingsMode(true)
    setCurrentScreen("settings-buildup-staff")
  }

  const handleBackToDashboard = () => {
    setIsSettingsMode(false)
    setCurrentScreen("desktop")
  }

  const handleSettingsNavigate = (screen: string) => {
    setCurrentScreen(screen as any)
  }

  const handleLogin = async (staffId?: string) => {
    setIsLoggedIn(true)
    
    // If staff ID provided, look up staff and route accordingly
    if (staffId) {
      try {
        const staff = await findStaffByStaffNo(staffId)
        if (staff) {
          if (staff.job_code === "COA") {
            // Route to buildup-staff screen for this staff member
            setBuildupStaffParams({ staff: staff.staff_no.toString() })
            setCurrentScreen("buildup-staff")
            return
          } else if (staff.job_code === "CHS") {
            // Route to flight-assignment screen for this supervisor
            setBuildupStaffParams(null)
            setCurrentScreen("allocations")
            return
          }
        }
      } catch (error) {
        console.error("[App] Error looking up staff:", error)
        // Fall through to default desktop view
      }
    }
    
    // Default: go to desktop (master view)
    setCurrentScreen("desktop")
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
      case "flight-assignment":
      case "allocations":
        return <AllocationAssignmentScreen />
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
      case "shift-summary-report":
        return <ShiftSummaryReportScreen />
      case "bcr":
        return <BCRScreen />
      case "settings-buildup-staff":
        return <SettingsBuildupStaffList />
      case "settings-screening":
        return <SettingsScreening />
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
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <div className="flex h-screen overflow-hidden">
          {isSettingsMode ? (
            <SettingsSidebar 
              currentScreen={currentScreen} 
              onNavigate={handleSettingsNavigate} 
              onBackToDashboard={handleBackToDashboard}
            />
          ) : (
            <SideNavigation 
              currentScreen={currentScreen} 
              onNavigate={handleNavigate} 
              onSettingsClick={handleSettingsClick}
            />
          )}
          <div className="flex-1 overflow-y-auto">{renderScreen()}</div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <NotificationProvider>
      <FlightProvider>
        <LoadPlanProvider>
          <AppContent />
        </LoadPlanProvider>
      </FlightProvider>
    </NotificationProvider>
  )
}
