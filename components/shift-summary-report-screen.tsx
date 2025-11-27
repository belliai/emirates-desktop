"use client"

import { useState, useMemo } from "react"
import { EditableField } from "./editable-field"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"

// Types
type ULDBreakdown = {
  pmcAmf: number
  alfPla: number
  akeRke: number
  sclrPcs: number
}

type TimeWindowData = {
  planned: ULDBreakdown
  built: ULDBreakdown
  thru: ULDBreakdown
  total: ULDBreakdown
  pending: ULDBreakdown
}

type FlightData = {
  no: number
  flight: string
  etd: string
  dst: string
  staff: string
  builtPmc: number
  builtAlf: number
  builtAke: number
  thruPmc: number
  thruAlf: number
  thruAke: number
}

type StaffDetail = {
  srNo: number
  name: string
  staffNo: string
  flightCount: number
  uldCount: number
  deployment: string
  contact: string
  dutyHours: number
  actualHours: number
}

type EfficiencyData = {
  totalUld: number
  totalHours: number
  efficiency: number
}

type PlasticUsage = {
  eFModule: number
  gHModule: number
  iModule: number
  indPak: number
  cto: number
  totalNew: number
  recycled: number
  total: number
  recycledPercent: number
  newPercent: number
}

type Resources = {
  staffCount: number
  staffHours: number
  operatorCount: number
  operatorHours: number
  driverCount: number
  driverHours: number
  warehouse: number
  usAdditional: number
  indPak: number
  ctoTlv: number
  cto: number
  lashing: number
  chaser: number
  expRamp: number
  pceCheck: number
  totalCount: number
  totalHours: number
}

type DGHandling = {
  supervisorCount: number
  hours: number
  shipmentsBooked: number
  preTeamHandled: number
  shipmentsHandled: number
  handover: number
  efficiency: number
}

type AdvanceData = {
  firstWave: number
  secondWave: number
  total: number
}

type ScreeningLoad = {
  plannedPieces: number
  builtPieces: number
  balance: number
}

type SanityData = {
  emPending: number
  lmPending: number
  advance: number
  superAdvance: number
  total: number
  reportTotal: number
  varAdnl: number
  varAdnlPercent: number
}

export default function ShiftSummaryReportScreen() {
  const [shiftType, setShiftType] = useState<"Night" | "Day">("Night")
  const [date, setDate] = useState("25 NOV 2025")
  const [shift, setShift] = useState("01")
  const [dutyHours, setDutyHours] = useState("21:00-09:00")
  const [supervisor, setSupervisor] = useState("Roosevelt")
  const [supervisorID, setSupervisorID] = useState("S416437")

  // Toggle states for collapsible sections
  const [isPlanVsAdvanceOpen, setIsPlanVsAdvanceOpen] = useState(true)
  const [isBUPDetailsOpen, setIsBUPDetailsOpen] = useState(true)
  const [isAdvanceReportOpen, setIsAdvanceReportOpen] = useState(true)

  // Shift & Staff Details state
  const [positionals, setPositionals] = useState<StaffDetail[]>([
    { srNo: 1, name: "DAVID", staffNo: "439111", flightCount: 0, uldCount: 0, deployment: "Chaser", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 2, name: "MARK", staffNo: "418664", flightCount: 0, uldCount: 0, deployment: "RXS", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 3, name: "VINCENt", staffNo: "416793", flightCount: 0, uldCount: 0, deployment: "CTO", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 4, name: "SYAM", staffNo: "431191", flightCount: 2, uldCount: 18, deployment: "Screening", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 5, name: "ARUN", staffNo: "443623", flightCount: 0, uldCount: 0, deployment: "Screening", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 6, name: "AIWAZ", staffNo: "480224", flightCount: 0, uldCount: 0, deployment: "CTO Support", contact: "", dutyHours: 12, actualHours: 12 },
  ])
  const [ekOnFloor, setEkOnFloor] = useState<StaffDetail[]>([
    { srNo: 1, name: "BRYAN", staffNo: "619795", flightCount: 4, uldCount: 16, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 2, name: "MARIO", staffNo: "618692", flightCount: 4, uldCount: 24, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 3, name: "SAMUEL", staffNo: "618713", flightCount: 3, uldCount: 16, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 4, name: "SUDHESH", staffNo: "618482", flightCount: 2, uldCount: 9, deployment: "OT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 5, name: "kim", staffNo: "618763", flightCount: 5, uldCount: 14, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 6, name: "ISURU", staffNo: "618344", flightCount: 5, uldCount: 18, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 7, name: "SALIN", staffNo: "495336", flightCount: 7, uldCount: 32, deployment: "OT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 8, name: "ZAHID", staffNo: "401648", flightCount: 11, uldCount: 18, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 9, name: "WAHAB", staffNo: "72763", flightCount: 9, uldCount: 27, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 10, name: "SULEMAN", staffNo: "495380", flightCount: 5, uldCount: 13, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 11, name: "ERIC", staffNo: "434671", flightCount: 3, uldCount: 24, deployment: "SHIFT", contact: "", dutyHours: 8, actualHours: 8 },
    { srNo: 12, name: "Matrika", staffNo: "495554", flightCount: 4, uldCount: 20, deployment: "SHIFT", contact: "", dutyHours: 8, actualHours: 8 },
    { srNo: 13, name: "NABIN", staffNo: "482260", flightCount: 8, uldCount: 28, deployment: "OT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 14, name: "harley", staffNo: "416445", flightCount: 10, uldCount: 48, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 15, name: "SOHAN", staffNo: "437449", flightCount: 6, uldCount: 9, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 16, name: "RAJU", staffNo: "480376", flightCount: 8, uldCount: 41, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 17, name: "MANU", staffNo: "433740", flightCount: 5, uldCount: 40, deployment: "OT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 18, name: "KHALFAN", staffNo: "480034", flightCount: 11, uldCount: 29, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 19, name: "BILAL", staffNo: "423044", flightCount: 7, uldCount: 57, deployment: "SHIFT", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 20, name: "Renato", staffNo: "399916", flightCount: 6, uldCount: 35, deployment: "OT", contact: "", dutyHours: 12, actualHours: 12 },
  ])
  const [shiftEfficiency, setShiftEfficiency] = useState<EfficiencyData>({
    totalUld: 992,
    totalHours: 530,
    efficiency: 1.87,
  })
  const [flightDetailsCurrent, setFlightDetailsCurrent] = useState({
    em: 64,
    lm: 101,
    af: 68,
    rfs: 5,
    total: 238,
  })
  const [flightDetailsNext, setFlightDetailsNext] = useState({
    af: 68,
    em: 67,
    lm: 100,
    rfs: 2,
    total: 237,
  })
  const [ekEfficiency, setEkEfficiency] = useState<EfficiencyData>({
    totalUld: 518,
    totalHours: 232,
    efficiency: 2.23,
  })
  const [tgOnFloor, setTgOnFloor] = useState<StaffDetail[]>([
    { srNo: 1, name: "adnan", staffNo: "961594", flightCount: 5, uldCount: 24, deployment: "TG", contact: "", dutyHours: 8, actualHours: 8 },
    { srNo: 2, name: "abdul", staffNo: "979431", flightCount: 4, uldCount: 23, deployment: "TG", contact: "", dutyHours: 8, actualHours: 8 },
    { srNo: 3, name: "BEN", staffNo: "923948", flightCount: 11, uldCount: 23, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 4, name: "SALMAN", staffNo: "979434", flightCount: 6, uldCount: 26, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 5, name: "KINTU", staffNo: "961581", flightCount: 6, uldCount: 30, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 6, name: "SILAS", staffNo: "774295", flightCount: 10, uldCount: 23, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 7, name: "JOHN", staffNo: "C308984", flightCount: 2, uldCount: 15, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 8, name: "NERUS", staffNo: "958770", flightCount: 2, uldCount: 14, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 9, name: "SREE", staffNo: "937942", flightCount: 3, uldCount: 21, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 10, name: "SUDHEER", staffNo: "C037982", flightCount: 4, uldCount: 26, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 11, name: "JATIN", staffNo: "984565", flightCount: 5, uldCount: 27, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 12, name: "ANURAG", staffNo: "780975", flightCount: 5, uldCount: 31, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 13, name: "HARSHAD", staffNo: "997303", flightCount: 4, uldCount: 17, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 14, name: "AMANDEEP", staffNo: "754308", flightCount: 5, uldCount: 41, deployment: "TG", contact: "", dutyHours: 12, actualHours: 12 },
  ])
  const [tgEfficiency, setTgEfficiency] = useState<EfficiencyData>({
    totalUld: 341,
    totalHours: 160,
    efficiency: 2.13,
  })
  const [dlOnFloor, setDlOnFloor] = useState<StaffDetail[]>([
    { srNo: 1, name: "BARI", staffNo: "904881", flightCount: 4, uldCount: 17, deployment: "DL", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 2, name: "BRIGHT", staffNo: "954816", flightCount: 6, uldCount: 30, deployment: "DL", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 3, name: "MICHAEL", staffNo: "950460", flightCount: 5, uldCount: 20, deployment: "DL", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 4, name: "ASHISH", staffNo: "997727", flightCount: 3, uldCount: 15, deployment: "DL", contact: "", dutyHours: 12, actualHours: 12 },
    { srNo: 5, name: "fred", staffNo: "951664", flightCount: 4, uldCount: 6, deployment: "dl", contact: "", dutyHours: 3, actualHours: 3 },
    { srNo: 6, name: "JAMIL", staffNo: "951948", flightCount: 2, uldCount: 3, deployment: "DL", contact: "", dutyHours: 3, actualHours: 3 },
  ])
  const [dlEfficiency, setDlEfficiency] = useState<EfficiencyData>({
    totalUld: 91,
    totalHours: 54,
    efficiency: 1.69,
  })
  const [dpWorldOnFloor, setDpWorldOnFloor] = useState<StaffDetail[]>([
    { srNo: 1, name: "ADWAITH", staffNo: "997302", flightCount: 4, uldCount: 24, deployment: "DP", contact: "", dutyHours: 12, actualHours: 12 },
  ])
  const [dpWorldEfficiency, setDpWorldEfficiency] = useState<EfficiencyData>({
    totalUld: 24,
    totalHours: 12,
    efficiency: 2.00,
  })
  const [plasticUsage, setPlasticUsage] = useState<PlasticUsage>({
    eFModule: 170,
    gHModule: 100,
    iModule: 40,
    indPak: 66,
    cto: 50,
    totalNew: 360,
    recycled: 872,
    total: 1232,
    recycledPercent: 71,
    newPercent: 29,
  })
  const [plannedResources, setPlannedResources] = useState<Resources>({
    staffCount: 50,
    staffHours: 600,
    operatorCount: 35,
    operatorHours: 420,
    driverCount: 11,
    driverHours: 132,
    warehouse: 100,
    usAdditional: 10,
    indPak: 18,
    ctoTlv: 6,
    cto: 4,
    lashing: 12,
    chaser: 2,
    expRamp: 2,
    pceCheck: 6,
    totalCount: 160,
    totalHours: 1920,
  })
  const [actualResources, setActualResources] = useState<Resources>({
    staffCount: 46,
    staffHours: 992,
    operatorCount: 35,
    operatorHours: 420,
    driverCount: 11,
    driverHours: 110,
    warehouse: 92,
    usAdditional: 12,
    indPak: 8,
    ctoTlv: 0,
    cto: 10,
    lashing: 18,
    chaser: 2,
    expRamp: 3,
    pceCheck: 6,
    totalCount: 162,
    totalHours: 1863,
  })
  const [dgHandling, setDgHandling] = useState<DGHandling>({
    supervisorCount: 1,
    hours: 12,
    shipmentsBooked: 177,
    preTeamHandled: 49,
    shipmentsHandled: 79,
    handover: 49,
    efficiency: 6.6,
  })
  const [aogShipments, setAogShipments] = useState({
    planned: 0,
    processed: 0,
    pending: 0,
  })
  const [advancePlanned, setAdvancePlanned] = useState<AdvanceData>({
    firstWave: 336,
    secondWave: 110,
    total: 446,
  })
  const [advanceBuilt, setAdvanceBuilt] = useState<AdvanceData>({
    firstWave: 270,
    secondWave: 52,
    total: 322,
  })
  const [advancePending, setAdvancePending] = useState<AdvanceData>({
    firstWave: 66,
    secondWave: 58,
    total: 124,
  })
  const [cabinLoad, setCabinLoad] = useState({
    planned: 0,
    built: 0,
    balance: 0,
  })
  const [screeningLoad, setScreeningLoad] = useState<ScreeningLoad>({
    plannedPieces: 1602,
    builtPieces: 1602,
    balance: 0,
  })
  const [sanity, setSanity] = useState<SanityData>({
    emPending: 77,
    lmPending: 371,
    advance: 322,
    superAdvance: 0,
    total: 770,
    reportTotal: 992,
    varAdnl: 222,
    varAdnlPercent: 29,
  })

  // Planned ULDs - Editable inputs (from Plan vs Advance)
  const [planned1300_1600, setPlanned1300_1600] = useState<ULDBreakdown>({
    pmcAmf: 244,
    alfPla: 14,
    akeRke: 78,
    sclrPcs: 0,
  })
  const [planned1601_2359, setPlanned1601_2359] = useState<ULDBreakdown>({
    pmcAmf: 76,
    alfPla: 11,
    akeRke: 23,
    sclrPcs: 0,
  })

  // Advance Report - Flight data (editable inputs) - populated from CSV
  const [advanceFlights, setAdvanceFlights] = useState<FlightData[]>([
    { no: 1, flight: "0943", etd: "13:00", dst: "DXB-BGW", staff: "manu", builtPmc: 3, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 2, flight: "0502", etd: "13:15", dst: "DXB-BOM", staff: "WAHAB", builtPmc: 4, builtAlf: 1, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 3, flight: "0566", etd: "13:35", dst: "DXB-BLR", staff: "RENATO", builtPmc: 7, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 4, flight: "0041", etd: "13:40", dst: "DXB-LHR", staff: "HARLEY", builtPmc: 8, builtAlf: 1, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 2 },
    { no: 5, flight: "0187", etd: "14:00", dst: "DXB-BCN", staff: "BILAL", builtPmc: 12, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 6, flight: "0181", etd: "14:05", dst: "DXB-BRU", staff: "BILAL", builtPmc: 7, builtAlf: 0, builtAke: 5, thruPmc: 0, thruAlf: 0, thruAke: 5 },
    { no: 7, flight: "0121", etd: "14:20", dst: "DXB-IST", staff: "NABIN", builtPmc: 4, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 8, flight: "0009", etd: "14:25", dst: "DXB-LGW", staff: "MARIO", builtPmc: 3, builtAlf: 1, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 9, flight: "0765", etd: "14:25", dst: "DXB-JNB", staff: "RAJU", builtPmc: 1, builtAlf: 0, builtAke: 4, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 10, flight: "0193", etd: "14:30", dst: "DXB-LIS", staff: "salin", builtPmc: 8, builtAlf: 1, builtAke: 1, thruPmc: 0, thruAlf: 1, thruAke: 1 },
    { no: 11, flight: "0019", etd: "14:30", dst: "DXB-MAN", staff: "JATIN", builtPmc: 2, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 12, flight: "0067", etd: "14:30", dst: "DXB-STN", staff: "AMANDEEP", builtPmc: 8, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 13, flight: "0003", etd: "14:30", dst: "DXB-LHR", staff: "HARLEY", builtPmc: 6, builtAlf: 0, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 14, flight: "0903", etd: "14:30", dst: "DXB-AMM", staff: "FRED", builtPmc: 4, builtAlf: 0, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 15, flight: "0163", etd: "14:35", dst: "DXB-DUB", staff: "salin", builtPmc: 5, builtAlf: 1, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 16, flight: "0083", etd: "14:40", dst: "DXB-GVA", staff: "ANURAG", builtPmc: 10, builtAlf: 0, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 17, flight: "0057", etd: "14:40", dst: "DXB-DUS", staff: "MANU", builtPmc: 5, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 18, flight: "0546", etd: "14:45", dst: "DXB-MAA", staff: "RENATO", builtPmc: 6, builtAlf: 0, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 19, flight: "0528", etd: "14:45", dst: "DXB-HYD", staff: "RENATO", builtPmc: 4, builtAlf: 4, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 20, flight: "0143", etd: "14:45", dst: "DXB-MAD", staff: "AMANDEEP", builtPmc: 7, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 21, flight: "0857", etd: "14:45", dst: "DXB-KWI", staff: "BEN", builtPmc: 0, builtAlf: 0, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 22, flight: "0075", etd: "14:50", dst: "DXB-CDG", staff: "RAJU", builtPmc: 4, builtAlf: 1, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 23, flight: "0023", etd: "14:50", dst: "DXB-EDI", staff: "NIL", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 24, flight: "0037", etd: "14:50", dst: "DXB-BHX", staff: "sudheer", builtPmc: 4, builtAlf: 2, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 25, flight: "0061", etd: "15:00", dst: "DXB-HAM", staff: "RAJU", builtPmc: 9, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 26, flight: "0979", etd: "15:00", dst: "DXB-IKA", staff: "BEN", builtPmc: 0, builtAlf: 0, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 27, flight: "0923", etd: "15:00", dst: "DXB-CAI", staff: "ISURU", builtPmc: 3, builtAlf: 1, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 28, flight: "0095", etd: "15:05", dst: "DXB-FCO", staff: "BILAL", builtPmc: 11, builtAlf: 0, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 29, flight: "0514", etd: "15:10", dst: "DXB-DEL", staff: "ZAHID", builtPmc: 1, builtAlf: 0, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 30, flight: "0091", etd: "15:15", dst: "DXB-MXP", staff: "NABIN", builtPmc: 4, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 31, flight: "0047", etd: "15:15", dst: "DXB-FRA", staff: "BRYAN", builtPmc: 3, builtAlf: 0, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 32, flight: "0721", etd: "15:20", dst: "DXB-NBO", staff: "KIM", builtPmc: 1, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 33, flight: "0149", etd: "15:20", dst: "DXB-AMS", staff: "JOHN", builtPmc: 6, builtAlf: 0, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 34, flight: "0125", etd: "15:40", dst: "DXB-VIE", staff: "salin", builtPmc: 6, builtAlf: 0, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 35, flight: "0953", etd: "15:40", dst: "DXB-BEY", staff: "SYAM", builtPmc: 4, builtAlf: 0, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 36, flight: "0508", etd: "15:40", dst: "DXB-BOM", staff: "WAHAB", builtPmc: 5, builtAlf: 1, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 37, flight: "0803", etd: "15:45", dst: "DXB-JED", staff: "JAMIL", builtPmc: 2, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 38, flight: "0051", etd: "15:50", dst: "DXB-MUC", staff: "HARLEY", builtPmc: 6, builtAlf: 0, builtAke: 4, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 39, flight: "0085", etd: "15:55", dst: "DXB-ZRH", staff: "NABIN", builtPmc: 9, builtAlf: 0, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 40, flight: "0175", etd: "15:55", dst: "DXB-LED", staff: "ZAHID", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
  ])
  const [bonusFlights, setBonusFlights] = useState<FlightData[]>([
    { no: 1, flight: "0839", etd: "16:00", dst: "DXB-BAH", staff: "KINTU", builtPmc: 3, builtAlf: 0, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 2, flight: "0005", etd: "16:05", dst: "DXB-LHR", staff: "HARLEY", builtPmc: 3, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 3, flight: "0648", etd: "16:10", dst: "DXB-CMB", staff: "BRIGHT", builtPmc: 5, builtAlf: 0, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 4, flight: "0131", etd: "16:15", dst: "DXB-DME", staff: "WAHAB", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 5, flight: "0584", etd: "16:45", dst: "DXB-DAC", staff: "salman", builtPmc: 3, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 6, flight: "0817", etd: "17:40", dst: "DXB-RUH", staff: "harshad", builtPmc: 4, builtAlf: 0, builtAke: 2, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 7, flight: "0117", etd: "17:45", dst: "DXB-IST", staff: "NABIN", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 8, flight: "0336", etd: "17:55", dst: "DXB-MNL", staff: "BRIGHT", builtPmc: 5, builtAlf: 0, builtAke: 1, thruPmc: 5, thruAlf: 0, thruAke: 1 },
    { no: 9, flight: "0602", etd: "18:10", dst: "DXB-KHI", staff: "SILAS", builtPmc: 1, builtAlf: 0, builtAke: 0, thruPmc: 1, thruAlf: 0, thruAke: 0 },
    { no: 10, flight: "0859", etd: "20:45", dst: "DXB-KWI", staff: "BEN", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 11, flight: "0925", etd: "20:55", dst: "DXB-CAI", staff: "ISURU", builtPmc: 3, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 12, flight: "0542", etd: "21:00", dst: "DXB-MAA", staff: "WAHAB", builtPmc: 0, builtAlf: 1, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 13, flight: "0314", etd: "21:00", dst: "DXB-SIN", staff: "FRED", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 14, flight: "0821", etd: "21:00", dst: "DXB-DMM", staff: "JAMIL", builtPmc: 1, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 15, flight: "0618", etd: "21:15", dst: "DXB-SKT", staff: "SILAS", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 16, flight: "0524", etd: "21:30", dst: "DXB-HYD", staff: "ZAHID", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 17, flight: "0522", etd: "21:30", dst: "DXB-TRV", staff: "ZAHID", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 18, flight: "0512", etd: "21:30", dst: "DXB-DEL", staff: "ZAHID", builtPmc: 1, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 19, flight: "0568", etd: "21:35", dst: "DXB-BLR", staff: "RENATO", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 20, flight: "0500", etd: "21:40", dst: "DXB-BOM", staff: "WAHAB", builtPmc: 2, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 21, flight: "0532", etd: "21:40", dst: "DXB-COK", staff: "ZAHID", builtPmc: 1, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 22, flight: "0416", etd: "21:45", dst: "DXB-SYD", staff: "FRED", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 23, flight: "0404", etd: "21:50", dst: "DXB-MEL", staff: "FRED", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 24, flight: "0622", etd: "21:50", dst: "DXB-LHE", staff: "SILAS", builtPmc: 1, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 25, flight: "0606", etd: "22:00", dst: "DXB-KHI", staff: "SILAS", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 26, flight: "0374", etd: "22:35", dst: "DXB-BKK", staff: "BEN", builtPmc: 1, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 27, flight: "0538", etd: "22:50", dst: "DXB-AMD", staff: "ZAHID", builtPmc: 3, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 28, flight: "0767", etd: "23:25", dst: "DXB-JNB", staff: "RAJU", builtPmc: 2, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
  ])

  // BUP Shift Details - Flight data (editable inputs) - populated from CSV
  const [bupFlights, setBupFlights] = useState<FlightData[]>([
    { no: 1, flight: "0801", etd: "00:15", dst: "DXB-JED", staff: "L/OVER", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 2, flight: "0977", etd: "01:15", dst: "DXB-IKA", staff: "L/OVER", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 3, flight: "0807", etd: "01:15", dst: "DXB-MED", staff: "SOHAN", builtPmc: 1, builtAlf: 1, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 4, flight: "0815", etd: "01:25", dst: "DXB-RUH", staff: "HARLEY", builtPmc: 4, builtAlf: 2, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 5, flight: "0582", etd: "01:55", dst: "DXB-DAC", staff: "L/OVER", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 6, flight: "0414", etd: "02:00", dst: "DXB-SYD", staff: "RAJU", builtPmc: 1, builtAlf: 1, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 7, flight: "0440", etd: "02:00", dst: "DXB-ADL", staff: "SOHAN", builtPmc: 1, builtAlf: 1, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 8, flight: "0570", etd: "02:00", dst: "DXB-CCU", staff: "WAHAB", builtPmc: 4, builtAlf: 2, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 9, flight: "0165", etd: "02:10", dst: "DXB-DUB", staff: "NABIN", builtPmc: 1, builtAlf: 1, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 10, flight: "0213", etd: "02:15", dst: "DXB-MIA-BOG", staff: "MANU", builtPmc: 3, builtAlf: 1, builtAke: 1, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 11, flight: "0823", etd: "02:20", dst: "DXB-DMM", staff: "RAJU", builtPmc: 5, builtAlf: 3, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 12, flight: "0701", etd: "02:25", dst: "DXB-MRU", staff: "BILAL", builtPmc: 4, builtAlf: 0, builtAke: 3, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 13, flight: "0231", etd: "02:25", dst: "DXB-IAD", staff: "L/OVER", builtPmc: 0, builtAlf: 0, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 14, flight: "0656", etd: "02:30", dst: "DXB-MLE", staff: "MICHAEL", builtPmc: 1, builtAlf: 1, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
    { no: 15, flight: "0348", etd: "02:30", dst: "DXB-SIN-KTI", staff: "SALIN", builtPmc: 2, builtAlf: 2, builtAke: 0, thruPmc: 0, thruAlf: 0, thruAke: 0 },
  ])

  // Calculate totals from Advance Report flights (formula: SUM from flights)
  const advanceReportTotals = useMemo(() => {
    const advanceBuilt = advanceFlights.reduce(
      (acc, f) => ({
        pmcAmf: acc.pmcAmf + f.builtPmc,
        alfPla: acc.alfPla + f.builtAlf,
        akeRke: acc.akeRke + f.builtAke,
        sclrPcs: 0,
      }),
      { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 }
    )
    const advanceThru = advanceFlights.reduce(
      (acc, f) => ({
        pmcAmf: acc.pmcAmf + f.thruPmc,
        alfPla: acc.alfPla + f.thruAlf,
        akeRke: acc.akeRke + f.thruAke,
        sclrPcs: 0,
      }),
      { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 }
    )
    const bonusBuilt = bonusFlights.reduce(
      (acc, f) => ({
        pmcAmf: acc.pmcAmf + f.builtPmc,
        alfPla: acc.alfPla + f.builtAlf,
        akeRke: acc.akeRke + f.builtAke,
        sclrPcs: 0,
      }),
      { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 }
    )
    const bonusThru = bonusFlights.reduce(
      (acc, f) => ({
        pmcAmf: acc.pmcAmf + f.thruPmc,
        alfPla: acc.alfPla + f.thruAlf,
        akeRke: acc.akeRke + f.thruAke,
        sclrPcs: 0,
      }),
      { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 }
    )

    return {
      advanceBuilt,
      advanceThru,
      bonusBuilt,
      bonusThru,
      totalBuilt: {
        pmcAmf: advanceBuilt.pmcAmf + bonusBuilt.pmcAmf,
        alfPla: advanceBuilt.alfPla + bonusBuilt.alfPla,
        akeRke: advanceBuilt.akeRke + bonusBuilt.akeRke,
        sclrPcs: 0,
      },
      totalThru: {
        pmcAmf: advanceThru.pmcAmf + bonusThru.pmcAmf,
        alfPla: advanceThru.alfPla + bonusThru.alfPla,
        akeRke: advanceThru.akeRke + bonusThru.akeRke,
        sclrPcs: 0,
      },
    }
  }, [advanceFlights, bonusFlights])

  // Calculate BUP Shift Details totals (formula: SUM from flights)
  const bupTotals = useMemo(() => {
    return bupFlights.reduce(
      (acc, f) => ({
        built: {
          pmcAmf: acc.built.pmcAmf + f.builtPmc,
          alfPla: acc.built.alfPla + f.builtAlf,
          akeRke: acc.built.akeRke + f.builtAke,
          sclrPcs: 0,
        },
        thru: {
          pmcAmf: acc.thru.pmcAmf + f.thruPmc,
          alfPla: acc.thru.alfPla + f.thruAlf,
          akeRke: acc.thru.akeRke + f.thruAke,
          sclrPcs: 0,
        },
      }),
      {
        built: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 },
        thru: { pmcAmf: 0, alfPla: 0, akeRke: 0, sclrPcs: 0 },
      }
    )
  }, [bupFlights])

  // Calculate Plan vs Advance totals (formula: Built + Thru)
  const time1300_1600 = useMemo((): TimeWindowData => {
    const built = advanceReportTotals.advanceBuilt
    const thru = advanceReportTotals.advanceThru
    const total = {
      pmcAmf: built.pmcAmf + thru.pmcAmf,
      alfPla: built.alfPla + thru.alfPla,
      akeRke: built.akeRke + thru.akeRke,
      sclrPcs: 0,
    }
    const pending = {
      pmcAmf: planned1300_1600.pmcAmf - total.pmcAmf,
      alfPla: planned1300_1600.alfPla - total.alfPla,
      akeRke: planned1300_1600.akeRke - total.akeRke,
      sclrPcs: 0,
    }
    return { planned: planned1300_1600, built, thru, total, pending }
  }, [planned1300_1600, advanceReportTotals.advanceBuilt, advanceReportTotals.advanceThru])

  const time1601_2359 = useMemo((): TimeWindowData => {
    const built = advanceReportTotals.bonusBuilt
    const thru = advanceReportTotals.bonusThru
    const total = {
      pmcAmf: built.pmcAmf + thru.pmcAmf,
      alfPla: built.alfPla + thru.alfPla,
      akeRke: built.akeRke + thru.akeRke,
      sclrPcs: 0,
    }
    const pending = {
      pmcAmf: planned1601_2359.pmcAmf - total.pmcAmf,
      alfPla: planned1601_2359.alfPla - total.alfPla,
      akeRke: planned1601_2359.akeRke - total.akeRke,
      sclrPcs: 0,
    }
    return { planned: planned1601_2359, built, thru, total, pending }
  }, [planned1601_2359, advanceReportTotals.bonusBuilt, advanceReportTotals.bonusThru])

  // Calculate total advance and total pending
  const totalAdvance = useMemo(() => ({
    pmcAmf: time1300_1600.total.pmcAmf + time1601_2359.total.pmcAmf,
    alfPla: time1300_1600.total.alfPla + time1601_2359.total.alfPla,
    akeRke: time1300_1600.total.akeRke + time1601_2359.total.akeRke,
    sclrPcs: 0,
  }), [time1300_1600, time1601_2359])

  const totalPending = useMemo(() => ({
    pmcAmf: time1300_1600.pending.pmcAmf + time1601_2359.pending.pmcAmf,
    alfPla: time1300_1600.pending.alfPla + time1601_2359.pending.alfPla,
    akeRke: time1300_1600.pending.akeRke + time1601_2359.pending.akeRke,
    sclrPcs: 0,
  }), [time1300_1600, time1601_2359])

  // Helper to calculate total from breakdown
  const getTotal = (breakdown: ULDBreakdown) =>
    breakdown.pmcAmf + breakdown.alfPla + breakdown.akeRke + breakdown.sclrPcs

  // Helper to update flight data
  const updateFlight = (
    flights: FlightData[],
    setFlights: React.Dispatch<React.SetStateAction<FlightData[]>>,
    index: number,
    field: keyof FlightData,
    value: string | number
  ) => {
    const updated = [...flights]
    updated[index] = { ...updated[index], [field]: value }
    setFlights(updated)
  }

  // Helper to update staff detail
  const updateStaffDetail = (
    staffList: StaffDetail[],
    setStaffList: React.Dispatch<React.SetStateAction<StaffDetail[]>>,
    index: number,
    field: keyof StaffDetail,
    value: string | number
  ) => {
    const updated = [...staffList]
    updated[index] = { ...updated[index], [field]: value }
    setStaffList(updated)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full space-y-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">Shift Summary Report</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <EditableField value={date} onChange={setDate} className="text-sm" />
            <span>|</span>
            <EditableField value={shift} onChange={setShift} className="text-sm w-16" />
            <span>|</span>
            <EditableField value={dutyHours} onChange={setDutyHours} className="text-sm" />
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value as "Night" | "Day")}
              className="px-3 py-1 border border-gray-300 rounded text-sm ml-2"
            >
              <option value="Night">Night</option>
              <option value="Day">Day</option>
            </select>
          </div>
        </div>

        {/* TOP SECTION: Advance Planned vs Built */}
        <Collapsible open={isPlanVsAdvanceOpen} onOpenChange={setIsPlanVsAdvanceOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900">Advance planned v/s Built</h3>
              {isPlanVsAdvanceOpen ? (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-600" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-white rounded-lg border border-gray-200 border-t-0 overflow-hidden">
              <div className="p-4 space-y-6">
                {/* 1300-1600 Section */}
                <div className="space-y-4">
                  <h4 className="text-base font-semibold text-gray-900">1300-1600</h4>

                  {/* Planned Section */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Planned</div>
                    <table className="w-full text-xs border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                          <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                          <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                          <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                          <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                          <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 font-medium">Planned</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">
                            <EditableField
                              value={planned1300_1600.pmcAmf.toString()}
                              onChange={(v) =>
                                setPlanned1300_1600((prev) => ({ ...prev, pmcAmf: parseInt(v) || 0 }))
                              }
                              type="number"
                              className="w-16 text-center text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 border border-gray-300 text-center">
                            <EditableField
                              value={planned1300_1600.alfPla.toString()}
                              onChange={(v) =>
                                setPlanned1300_1600((prev) => ({ ...prev, alfPla: parseInt(v) || 0 }))
                              }
                              type="number"
                              className="w-16 text-center text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 border border-gray-300 text-center">
                            <EditableField
                              value={planned1300_1600.akeRke.toString()}
                              onChange={(v) =>
                                setPlanned1300_1600((prev) => ({ ...prev, akeRke: parseInt(v) || 0 }))
                              }
                              type="number"
                              className="w-16 text-center text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">
                            <EditableField
                              value={planned1300_1600.sclrPcs.toString()}
                              onChange={(v) =>
                                setPlanned1300_1600((prev) => ({ ...prev, sclrPcs: parseInt(v) || 0 }))
                              }
                              type="number"
                              className="w-16 text-center text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 border border-gray-300 text-center font-semibold">
                            {getTotal(planned1300_1600)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Advance Built Section */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Advance built</div>
                    <table className="w-full text-xs border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                          <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                          <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                          <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                          <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                          <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 font-medium">Built</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.built.pmcAmf}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.built.alfPla}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.built.akeRke}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{time1300_1600.built.sclrPcs}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1300_1600.built)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 font-medium">Thru</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.thru.pmcAmf}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.thru.alfPla}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.thru.akeRke}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{time1300_1600.thru.sclrPcs}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1300_1600.thru)}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.total.pmcAmf}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.total.alfPla}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.total.akeRke}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.total.sclrPcs}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1300_1600.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Pending Section */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Pending</div>
                    <table className="w-full text-xs border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left border border-gray-300">ULD Details</th>
                          <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                          <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                          <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                          <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                          <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 font-medium">To action</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.pending.pmcAmf}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.pending.alfPla}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.pending.akeRke}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.pending.sclrPcs}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1300_1600.pending)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 1601-2359 Section */}
                <div className="space-y-4 border-t border-gray-300 pt-6">
                  <h4 className="text-base font-semibold text-gray-900">1601-2359</h4>

                  {/* Planned Section */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Planned</div>
                    <table className="w-full text-xs border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                          <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                          <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                          <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                          <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                          <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 font-medium">Planned</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">
                            <EditableField
                              value={planned1601_2359.pmcAmf.toString()}
                              onChange={(v) =>
                                setPlanned1601_2359((prev) => ({ ...prev, pmcAmf: parseInt(v) || 0 }))
                              }
                              type="number"
                              className="w-16 text-center text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 border border-gray-300 text-center">
                            <EditableField
                              value={planned1601_2359.alfPla.toString()}
                              onChange={(v) =>
                                setPlanned1601_2359((prev) => ({ ...prev, alfPla: parseInt(v) || 0 }))
                              }
                              type="number"
                              className="w-16 text-center text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 border border-gray-300 text-center">
                            <EditableField
                              value={planned1601_2359.akeRke.toString()}
                              onChange={(v) =>
                                setPlanned1601_2359((prev) => ({ ...prev, akeRke: parseInt(v) || 0 }))
                              }
                              type="number"
                              className="w-16 text-center text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">
                            <EditableField
                              value={planned1601_2359.sclrPcs.toString()}
                              onChange={(v) =>
                                setPlanned1601_2359((prev) => ({ ...prev, sclrPcs: parseInt(v) || 0 }))
                              }
                              type="number"
                              className="w-16 text-center text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 border border-gray-300 text-center font-semibold">
                            {getTotal(planned1601_2359)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Advance Built Section */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Advance built</div>
                    <table className="w-full text-xs border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                          <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                          <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                          <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                          <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                          <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 font-medium">Built</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.built.pmcAmf}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.built.alfPla}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.built.akeRke}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{time1601_2359.built.sclrPcs}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1601_2359.built)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 font-medium">Thru</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.thru.pmcAmf}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.thru.alfPla}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.thru.akeRke}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center bg-yellow-100">{time1601_2359.thru.sclrPcs}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1601_2359.thru)}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.total.pmcAmf}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.total.alfPla}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.total.akeRke}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.total.sclrPcs}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1601_2359.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Pending Section */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Pending</div>
                    <table className="w-full text-xs border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left border border-gray-300">ULD Details</th>
                          <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                          <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                          <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                          <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                          <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 font-medium">To action</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.pending.pmcAmf}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.pending.alfPla}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.pending.akeRke}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.pending.sclrPcs}</td>
                          <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1601_2359.pending)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Advance */}
                <div className="space-y-4 border-t border-gray-300 pt-6">
                  <h4 className="text-base font-semibold text-gray-900">Total Advance</h4>
                  <table className="w-full text-xs border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                        <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                        <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                        <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                        <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                        <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2 border border-gray-300 font-medium">1300-1600</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.total.pmcAmf}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.total.alfPla}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.total.akeRke}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.total.sclrPcs}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1300_1600.total)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 border border-gray-300 font-medium">1601-2359</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.total.pmcAmf}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.total.alfPla}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.total.akeRke}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.total.sclrPcs}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1601_2359.total)}</td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{totalAdvance.pmcAmf}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{totalAdvance.alfPla}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{totalAdvance.akeRke}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{totalAdvance.sclrPcs}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(totalAdvance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Total Pending */}
                <div className="space-y-4 border-t border-gray-300 pt-6">
                  <h4 className="text-base font-semibold text-gray-900">Total Pending</h4>
                  <table className="w-full text-xs border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left border border-gray-300">Details</th>
                        <th className="px-3 py-2 text-center border border-gray-300">PMC-AMF</th>
                        <th className="px-3 py-2 text-center border border-gray-300">ALF-PLA</th>
                        <th className="px-3 py-2 text-center border border-gray-300">AKE-RKE</th>
                        <th className="px-3 py-2 text-center border border-gray-300">SCLR Pcs</th>
                        <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2 border border-gray-300 font-medium">1300-1600</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.pending.pmcAmf}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.pending.alfPla}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.pending.akeRke}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1300_1600.pending.sclrPcs}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1300_1600.pending)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 border border-gray-300 font-medium">1601-2359</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.pending.pmcAmf}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.pending.alfPla}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.pending.akeRke}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{time1601_2359.pending.sclrPcs}</td>
                        <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(time1601_2359.pending)}</td>
                      </tr>
                      <tr className="bg-red-50 font-semibold">
                        <td className="px-3 py-2 border border-gray-300">TOTAL</td>
                        <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                          {totalPending.pmcAmf}
                        </td>
                        <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                          {totalPending.alfPla}
                        </td>
                        <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                          {totalPending.akeRke}
                        </td>
                        <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                          {totalPending.sclrPcs}
                        </td>
                        <td className="px-3 py-2 border border-gray-300 text-center text-red-600">
                          {getTotal(totalPending)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* BOTTOM SECTION: Split into Left and Right */}
        <div className="grid grid-cols-2 gap-4">
          {/* BOTTOM LEFT: BUP Shift Details */}
          <Collapsible open={isBUPDetailsOpen} onOpenChange={setIsBUPDetailsOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900">
                  BUP Shift Details {shiftType}
                </h3>
                {isBUPDetailsOpen ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-white rounded-lg border border-gray-200 border-t-0 overflow-hidden">
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-2">
                    BUILD UP // {date} // SHIFT : {shift} // {dutyHours}HRS
                  </div>
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Checked by Supervisor</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <EditableField
                          value={supervisor}
                          onChange={setSupervisor}
                          className="text-sm font-medium"
                          placeholder="Name"
                        />
                        <EditableField
                          value={supervisorID}
                          onChange={setSupervisorID}
                          className="text-sm text-gray-500"
                          placeholder="Staff ID"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Two Column Layout: Allocation Left, Staff Details Right */}
                  <div className="grid grid-cols-[1fr_1fr] gap-4">
                    {/* LEFT COLUMN: Allocation Table */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Allocation & Staff Performance</div>
                      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-xs border border-gray-300">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left border border-gray-300" colSpan={5}>Allocation</th>
                              <th className="px-3 py-2 text-center border border-gray-300" colSpan={4}>Built</th>
                              <th className="px-3 py-2 text-center border border-gray-300" colSpan={4}>Thru</th>
                            </tr>
                            <tr>
                              <th className="px-3 py-2 text-left border border-gray-300">No</th>
                              <th className="px-3 py-2 text-left border border-gray-300">Flight</th>
                              <th className="px-3 py-2 text-left border border-gray-300">ETD</th>
                              <th className="px-3 py-2 text-left border border-gray-300">DST</th>
                              <th className="px-3 py-2 text-left border border-gray-300">Staff</th>
                              <th className="px-3 py-2 text-center border border-gray-300">PMC/AMF</th>
                              <th className="px-3 py-2 text-center border border-gray-300">ALF/PLA</th>
                              <th className="px-3 py-2 text-center border border-gray-300">AKE/AKL</th>
                              <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                              <th className="px-3 py-2 text-center border border-gray-300">PMC/AMF</th>
                              <th className="px-3 py-2 text-center border border-gray-300">ALF/PLA</th>
                              <th className="px-3 py-2 text-center border border-gray-300">AKE/AKL</th>
                              <th className="px-3 py-2 text-center border border-gray-300">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bupFlights.map((flight, index) => (
                              <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="px-3 py-2 border border-gray-300">{flight.no}</td>
                                <td className="px-3 py-2 border border-gray-300">
                                  <EditableField
                                    value={flight.flight}
                                    onChange={(v) => updateFlight(bupFlights, setBupFlights, index, "flight", v)}
                                    className="font-semibold text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300">
                                  <EditableField
                                    value={flight.etd}
                                    onChange={(v) => updateFlight(bupFlights, setBupFlights, index, "etd", v)}
                                    className="text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300">
                                  <EditableField
                                    value={flight.dst}
                                    onChange={(v) => updateFlight(bupFlights, setBupFlights, index, "dst", v)}
                                    className="text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300">
                                  <EditableField
                                    value={flight.staff}
                                    onChange={(v) => updateFlight(bupFlights, setBupFlights, index, "staff", v)}
                                    className="text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300 text-center">
                                  <EditableField
                                    value={flight.builtPmc.toString()}
                                    onChange={(v) =>
                                      updateFlight(bupFlights, setBupFlights, index, "builtPmc", parseInt(v) || 0)
                                    }
                                    type="number"
                                    className="w-16 text-center text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300 text-center">
                                  <EditableField
                                    value={flight.builtAlf.toString()}
                                    onChange={(v) =>
                                      updateFlight(bupFlights, setBupFlights, index, "builtAlf", parseInt(v) || 0)
                                    }
                                    type="number"
                                    className="w-16 text-center text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300 text-center">
                                  <EditableField
                                    value={flight.builtAke.toString()}
                                    onChange={(v) =>
                                      updateFlight(bupFlights, setBupFlights, index, "builtAke", parseInt(v) || 0)
                                    }
                                    type="number"
                                    className="w-16 text-center text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300 text-center font-semibold">
                                  {flight.builtPmc + flight.builtAlf + flight.builtAke}
                                </td>
                                <td className="px-3 py-2 border border-gray-300 text-center">
                                  <EditableField
                                    value={flight.thruPmc.toString()}
                                    onChange={(v) =>
                                      updateFlight(bupFlights, setBupFlights, index, "thruPmc", parseInt(v) || 0)
                                    }
                                    type="number"
                                    className="w-16 text-center text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300 text-center">
                                  <EditableField
                                    value={flight.thruAlf.toString()}
                                    onChange={(v) =>
                                      updateFlight(bupFlights, setBupFlights, index, "thruAlf", parseInt(v) || 0)
                                    }
                                    type="number"
                                    className="w-16 text-center text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300 text-center">
                                  <EditableField
                                    value={flight.thruAke.toString()}
                                    onChange={(v) =>
                                      updateFlight(bupFlights, setBupFlights, index, "thruAke", parseInt(v) || 0)
                                    }
                                    type="number"
                                    className="w-16 text-center text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2 border border-gray-300 text-center font-semibold">
                                  {flight.thruPmc + flight.thruAlf + flight.thruAke}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Shift & Staff Details */}
                    <div className="space-y-3 overflow-y-auto max-h-[600px]">
                      {/* ULD Analysis */}
                      <div>
                        <div className="text-xs font-semibold mb-1">ULD Analysis</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="border border-gray-300">
                            <div className="bg-gray-50 px-1 py-0.5 font-semibold border-b border-gray-300">Built ULD Details</div>
                            <table className="w-full text-xs">
                              <tbody>
                                <tr>
                                  <td className="px-1 py-0.5 border border-gray-300">Total PMC</td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">{bupTotals.built.pmcAmf}</td>
                                </tr>
                                <tr>
                                  <td className="px-1 py-0.5 border border-gray-300">Total ALF</td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">{bupTotals.built.alfPla}</td>
                                </tr>
                                <tr>
                                  <td className="px-1 py-0.5 border border-gray-300">Total AKE</td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">{bupTotals.built.akeRke}</td>
                                </tr>
                                <tr className="bg-gray-50 font-semibold">
                                  <td className="px-1 py-0.5 border border-gray-300">Total ULD</td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-right">{getTotal(bupTotals.built)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div className="border border-gray-300">
                            <div className="bg-gray-50 px-1 py-0.5 font-semibold border-b border-gray-300">Thru ULD Details</div>
                            <table className="w-full text-xs">
                              <tbody>
                                <tr>
                                  <td className="px-1 py-0.5 border border-gray-300">Total PMC</td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-right">{bupTotals.thru.pmcAmf}</td>
                                </tr>
                                <tr>
                                  <td className="px-1 py-0.5 border border-gray-300">Total ALF</td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-right">{bupTotals.thru.alfPla}</td>
                                </tr>
                                <tr>
                                  <td className="px-1 py-0.5 border border-gray-300">Total AKE</td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-right">{bupTotals.thru.akeRke}</td>
                                </tr>
                                <tr className="bg-gray-50 font-semibold">
                                  <td className="px-1 py-0.5 border border-gray-300">Total ULD</td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-right">{getTotal(bupTotals.thru)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="border border-gray-300 mt-2">
                          <div className="bg-gray-50 px-1 py-0.5 font-semibold border-b border-gray-300">Total ULD Details</div>
                          <table className="w-full text-xs">
                            <tbody>
                              <tr>
                                <td className="px-1 py-0.5 border border-gray-300">Total PMC</td>
                                <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">{bupTotals.built.pmcAmf + bupTotals.thru.pmcAmf}</td>
                              </tr>
                              <tr>
                                <td className="px-1 py-0.5 border border-gray-300">Total ALF</td>
                                <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">{bupTotals.built.alfPla + bupTotals.thru.alfPla}</td>
                              </tr>
                              <tr>
                                <td className="px-1 py-0.5 border border-gray-300">Total AKE</td>
                                <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">{bupTotals.built.akeRke + bupTotals.thru.akeRke}</td>
                              </tr>
                              <tr className="bg-gray-50 font-semibold">
                                <td className="px-1 py-0.5 border border-gray-300">Total ULD</td>
                                <td className="px-1 py-0.5 border border-gray-300 text-right">{getTotal(bupTotals.built) + getTotal(bupTotals.thru)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Positionals */}
                      <div>
                        <div className="text-xs font-semibold mb-1">Positionals</div>
                        <div className="overflow-x-auto max-h-32 overflow-y-auto">
                          <table className="w-full text-xs border border-gray-300">
                            <thead className="sticky top-0 bg-gray-50">
                              <tr>
                                <th className="px-1 py-0.5 text-left border border-gray-300">Sr.No</th>
                                <th className="px-1 py-0.5 text-left border border-gray-300">Total Staffs</th>
                                <th className="px-1 py-0.5 text-left border border-gray-300">Staff No</th>
                                <th className="px-1 py-0.5 text-center border border-gray-300">Flight Count</th>
                                <th className="px-1 py-0.5 text-center border border-gray-300">ULD Count</th>
                                <th className="px-1 py-0.5 text-left border border-gray-300">Deployment</th>
                                <th className="px-1 py-0.5 text-left border border-gray-300">Contact</th>
                                <th className="px-1 py-0.5 text-center border border-gray-300">Duty Hours</th>
                                <th className="px-1 py-0.5 text-center border border-gray-300">Actual Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {positionals.map((staff, index) => (
                                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                  <td className="px-1 py-0.5 border border-gray-300">{staff.srNo}</td>
                                  <td className="px-1 py-0.5 border border-gray-300">
                                    <EditableField
                                      value={staff.name}
                                      onChange={(v) => updateStaffDetail(positionals, setPositionals, index, "name", v)}
                                      className="text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300">
                                    <EditableField
                                      value={staff.staffNo}
                                      onChange={(v) => updateStaffDetail(positionals, setPositionals, index, "staffNo", v)}
                                      className="text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-center">
                                    <EditableField
                                      value={staff.flightCount.toString()}
                                      onChange={(v) => updateStaffDetail(positionals, setPositionals, index, "flightCount", parseInt(v) || 0)}
                                      type="number"
                                      className="w-12 text-center text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-center">
                                    <EditableField
                                      value={staff.uldCount.toString()}
                                      onChange={(v) => updateStaffDetail(positionals, setPositionals, index, "uldCount", parseInt(v) || 0)}
                                      type="number"
                                      className="w-12 text-center text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300">
                                    <EditableField
                                      value={staff.deployment}
                                      onChange={(v) => updateStaffDetail(positionals, setPositionals, index, "deployment", v)}
                                      className="text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300">
                                    <EditableField
                                      value={staff.contact}
                                      onChange={(v) => updateStaffDetail(positionals, setPositionals, index, "contact", v)}
                                      className="text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-center">
                                    <EditableField
                                      value={staff.dutyHours.toString()}
                                      onChange={(v) => updateStaffDetail(positionals, setPositionals, index, "dutyHours", parseInt(v) || 0)}
                                      type="number"
                                      className="w-12 text-center text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-center">
                                    <EditableField
                                      value={staff.actualHours.toString()}
                                      onChange={(v) => updateStaffDetail(positionals, setPositionals, index, "actualHours", parseInt(v) || 0)}
                                      type="number"
                                      className="w-12 text-center text-xs"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* EK On Floor & Support Team */}
                      <div>
                        <div className="text-xs font-semibold mb-1">EK On Floor & Support Team</div>
                        <div className="overflow-x-auto max-h-48 overflow-y-auto">
                          <table className="w-full text-xs border border-gray-300">
                            <thead className="sticky top-0 bg-gray-50">
                              <tr>
                                <th className="px-1 py-0.5 text-left border border-gray-300">Sr.No</th>
                                <th className="px-1 py-0.5 text-left border border-gray-300">Total Staffs</th>
                                <th className="px-1 py-0.5 text-left border border-gray-300">Staff No</th>
                                <th className="px-1 py-0.5 text-center border border-gray-300">Flight Count</th>
                                <th className="px-1 py-0.5 text-center border border-gray-300">ULD Count</th>
                                <th className="px-1 py-0.5 text-left border border-gray-300">Deployment</th>
                                <th className="px-1 py-0.5 text-left border border-gray-300">Contact</th>
                                <th className="px-1 py-0.5 text-center border border-gray-300">Duty Hours</th>
                                <th className="px-1 py-0.5 text-center border border-gray-300">Actual Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ekOnFloor.map((staff, index) => (
                                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                  <td className="px-1 py-0.5 border border-gray-300">{staff.srNo}</td>
                                  <td className="px-1 py-0.5 border border-gray-300">
                                    <EditableField
                                      value={staff.name}
                                      onChange={(v) => updateStaffDetail(ekOnFloor, setEkOnFloor, index, "name", v)}
                                      className="text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300">
                                    <EditableField
                                      value={staff.staffNo}
                                      onChange={(v) => updateStaffDetail(ekOnFloor, setEkOnFloor, index, "staffNo", v)}
                                      className="text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-center">
                                    <EditableField
                                      value={staff.flightCount.toString()}
                                      onChange={(v) => updateStaffDetail(ekOnFloor, setEkOnFloor, index, "flightCount", parseInt(v) || 0)}
                                      type="number"
                                      className="w-12 text-center text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-center">
                                    <EditableField
                                      value={staff.uldCount.toString()}
                                      onChange={(v) => updateStaffDetail(ekOnFloor, setEkOnFloor, index, "uldCount", parseInt(v) || 0)}
                                      type="number"
                                      className="w-12 text-center text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300">
                                    <EditableField
                                      value={staff.deployment}
                                      onChange={(v) => updateStaffDetail(ekOnFloor, setEkOnFloor, index, "deployment", v)}
                                      className="text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300">
                                    <EditableField
                                      value={staff.contact}
                                      onChange={(v) => updateStaffDetail(ekOnFloor, setEkOnFloor, index, "contact", v)}
                                      className="text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-center">
                                    <EditableField
                                      value={staff.dutyHours.toString()}
                                      onChange={(v) => updateStaffDetail(ekOnFloor, setEkOnFloor, index, "dutyHours", parseInt(v) || 0)}
                                      type="number"
                                      className="w-12 text-center text-xs"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 border border-gray-300 text-center">
                                    <EditableField
                                      value={staff.actualHours.toString()}
                                      onChange={(v) => updateStaffDetail(ekOnFloor, setEkOnFloor, index, "actualHours", parseInt(v) || 0)}
                                      type="number"
                                      className="w-12 text-center text-xs"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Shift Efficiency */}
                      <div>
                        <div className="text-xs font-semibold mb-1">Shift Efficiency</div>
                        <table className="w-full text-xs border border-gray-300">
                          <tbody>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Total ULD</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={shiftEfficiency.totalUld.toString()}
                                  onChange={(v) => setShiftEfficiency(prev => ({ ...prev, totalUld: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Total Hours</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={shiftEfficiency.totalHours.toString()}
                                  onChange={(v) => setShiftEfficiency(prev => ({ ...prev, totalHours: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Efficiency</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">
                                {shiftEfficiency.totalHours > 0 ? (shiftEfficiency.totalUld / shiftEfficiency.totalHours).toFixed(2) : "0.00"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Flight Details */}
                      <div>
                        <div className="text-xs font-semibold mb-1">Flight Details current shift</div>
                        <table className="w-full text-xs border border-gray-300">
                          <tbody>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">E/M</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={flightDetailsCurrent.em.toString()}
                                  onChange={(v) => setFlightDetailsCurrent(prev => ({ ...prev, em: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">L/M</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={flightDetailsCurrent.lm.toString()}
                                  onChange={(v) => setFlightDetailsCurrent(prev => ({ ...prev, lm: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">A/F</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={flightDetailsCurrent.af.toString()}
                                  onChange={(v) => setFlightDetailsCurrent(prev => ({ ...prev, af: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">RFS</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={flightDetailsCurrent.rfs.toString()}
                                  onChange={(v) => setFlightDetailsCurrent(prev => ({ ...prev, rfs: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-1 py-0.5 border border-gray-300">Total</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                {flightDetailsCurrent.em + flightDetailsCurrent.lm + flightDetailsCurrent.af + flightDetailsCurrent.rfs}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* EK Efficiency */}
                      <div>
                        <div className="text-xs font-semibold mb-1">EK Efficiency</div>
                        <table className="w-full text-xs border border-gray-300">
                          <tbody>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Total ULD</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={ekEfficiency.totalUld.toString()}
                                  onChange={(v) => setEkEfficiency(prev => ({ ...prev, totalUld: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Total Hours</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={ekEfficiency.totalHours.toString()}
                                  onChange={(v) => setEkEfficiency(prev => ({ ...prev, totalHours: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Efficiency</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">
                                {ekEfficiency.totalHours > 0 ? (ekEfficiency.totalUld / ekEfficiency.totalHours).toFixed(2) : "0.00"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Plastic Usage */}
                      <div>
                        <div className="text-xs font-semibold mb-1">Plastic Usage</div>
                        <table className="w-full text-xs border border-gray-300">
                          <tbody>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">E/F Module</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={plasticUsage.eFModule.toString()}
                                  onChange={(v) => setPlasticUsage(prev => ({ ...prev, eFModule: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">G/H Module</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={plasticUsage.gHModule.toString()}
                                  onChange={(v) => setPlasticUsage(prev => ({ ...prev, gHModule: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">I Module</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={plasticUsage.iModule.toString()}
                                  onChange={(v) => setPlasticUsage(prev => ({ ...prev, iModule: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">IND/PAK</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={plasticUsage.indPak.toString()}
                                  onChange={(v) => setPlasticUsage(prev => ({ ...prev, indPak: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">CTO</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={plasticUsage.cto.toString()}
                                  onChange={(v) => setPlasticUsage(prev => ({ ...prev, cto: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-1 py-0.5 border border-gray-300">Total New Plastic</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                {plasticUsage.eFModule + plasticUsage.gHModule + plasticUsage.iModule + plasticUsage.indPak + plasticUsage.cto}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Recycled Plastic</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={plasticUsage.recycled.toString()}
                                  onChange={(v) => setPlasticUsage(prev => ({ ...prev, recycled: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-1 py-0.5 border border-gray-300">Total Plastic</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                {(plasticUsage.eFModule + plasticUsage.gHModule + plasticUsage.iModule + plasticUsage.indPak + plasticUsage.cto) + plasticUsage.recycled}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Recycled %</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                {((plasticUsage.recycled / ((plasticUsage.eFModule + plasticUsage.gHModule + plasticUsage.iModule + plasticUsage.indPak + plasticUsage.cto) + plasticUsage.recycled)) * 100).toFixed(0) || 0}%
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">New %</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                {(((plasticUsage.eFModule + plasticUsage.gHModule + plasticUsage.iModule + plasticUsage.indPak + plasticUsage.cto) / ((plasticUsage.eFModule + plasticUsage.gHModule + plasticUsage.iModule + plasticUsage.indPak + plasticUsage.cto) + plasticUsage.recycled)) * 100).toFixed(0) || 0}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Advance Planned/Built/Pending */}
                      <div>
                        <div className="text-xs font-semibold mb-1">Advance Planned</div>
                        <table className="w-full text-xs border border-gray-300 mb-2">
                          <tbody>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">1st Wave</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={advancePlanned.firstWave.toString()}
                                  onChange={(v) => setAdvancePlanned(prev => ({ ...prev, firstWave: parseInt(v) || 0, total: prev.firstWave + prev.secondWave }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">2nd Wave</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={advancePlanned.secondWave.toString()}
                                  onChange={(v) => setAdvancePlanned(prev => ({ ...prev, secondWave: parseInt(v) || 0, total: prev.firstWave + prev.secondWave }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-1 py-0.5 border border-gray-300">Total</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                {advancePlanned.firstWave + advancePlanned.secondWave}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="text-xs font-semibold mb-1">Advance Built</div>
                        <table className="w-full text-xs border border-gray-300 mb-2">
                          <tbody>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">1st Wave</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={advanceBuilt.firstWave.toString()}
                                  onChange={(v) => setAdvanceBuilt(prev => ({ ...prev, firstWave: parseInt(v) || 0, total: prev.firstWave + prev.secondWave }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">2nd Wave</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={advanceBuilt.secondWave.toString()}
                                  onChange={(v) => setAdvanceBuilt(prev => ({ ...prev, secondWave: parseInt(v) || 0, total: prev.firstWave + prev.secondWave }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-1 py-0.5 border border-gray-300">Total</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                {advanceBuilt.firstWave + advanceBuilt.secondWave}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="text-xs font-semibold mb-1">Advance Pending</div>
                        <table className="w-full text-xs border border-gray-300">
                          <tbody>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">1st Wave</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">
                                {advancePlanned.firstWave - advanceBuilt.firstWave}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">2nd Wave</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">
                                {advancePlanned.secondWave - advanceBuilt.secondWave}
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-1 py-0.5 border border-gray-300">Total</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                {(advancePlanned.firstWave - advanceBuilt.firstWave) + (advancePlanned.secondWave - advanceBuilt.secondWave)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Screening Load */}
                      <div>
                        <div className="text-xs font-semibold mb-1">Screening Load</div>
                        <table className="w-full text-xs border border-gray-300">
                          <tbody>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Planned Pieces</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={screeningLoad.plannedPieces.toString()}
                                  onChange={(v) => setScreeningLoad(prev => ({ ...prev, plannedPieces: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Built Pieces</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={screeningLoad.builtPieces.toString()}
                                  onChange={(v) => setScreeningLoad(prev => ({ ...prev, builtPieces: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Balance</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">
                                {screeningLoad.plannedPieces - screeningLoad.builtPieces}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Sanity */}
                      <div>
                        <div className="text-xs font-semibold mb-1">Sanity</div>
                        <table className="w-full text-xs border border-gray-300">
                          <tbody>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">E/M Pending</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={sanity.emPending.toString()}
                                  onChange={(v) => setSanity(prev => ({ ...prev, emPending: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">L/M Pending</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={sanity.lmPending.toString()}
                                  onChange={(v) => setSanity(prev => ({ ...prev, lmPending: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Advance</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={sanity.advance.toString()}
                                  onChange={(v) => setSanity(prev => ({ ...prev, advance: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Super Advance</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={sanity.superAdvance.toString()}
                                  onChange={(v) => setSanity(prev => ({ ...prev, superAdvance: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-1 py-0.5 border border-gray-300">Total</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                {sanity.emPending + sanity.lmPending + sanity.advance + sanity.superAdvance}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Report Total</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right">
                                <EditableField
                                  value={sanity.reportTotal.toString()}
                                  onChange={(v) => setSanity(prev => ({ ...prev, reportTotal: parseInt(v) || 0 }))}
                                  type="number"
                                  className="w-16 text-right text-xs"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Var/Adnl</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">
                                {sanity.reportTotal - (sanity.emPending + sanity.lmPending + sanity.advance + sanity.superAdvance)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-1 py-0.5 border border-gray-300">Var/Adnl %</td>
                              <td className="px-1 py-0.5 border border-gray-300 text-right font-semibold">
                                {sanity.reportTotal > 0 ? (((sanity.reportTotal - (sanity.emPending + sanity.lmPending + sanity.advance + sanity.superAdvance)) / sanity.reportTotal) * 100).toFixed(0) : 0}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* BOTTOM RIGHT: Advance Report */}
          <Collapsible open={isAdvanceReportOpen} onOpenChange={setIsAdvanceReportOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900">Advance Report</h3>
                {isAdvanceReportOpen ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-white rounded-lg border border-gray-200 border-t-0 overflow-hidden">
                <div className="p-4 space-y-4">
                  {/* Advance Units and Bonus Units Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Advance Units */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">ADVANCE UNITS</h5>
                      <table className="w-full text-xs border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left border border-gray-300">Category</th>
                            <th className="px-3 py-2 text-center border border-gray-300">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">TTL FLTS</td>
                            <td className="px-3 py-2 border border-gray-300 text-center font-semibold">{advanceFlights.length}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">TTL STAFF</td>
                            <td className="px-3 py-2 border border-gray-300 text-center font-semibold">
                              {new Set(advanceFlights.map((f) => f.staff).filter(Boolean)).size}
                            </td>
                          </tr>
                          <tr className="border-t border-gray-300">
                            <td className="px-3 py-2 border border-gray-300">THRU ULDS - PMC</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.advanceThru.pmcAmf}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">THRU ULDS - ALF</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.advanceThru.alfPla}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">THRU ULDS - AKE</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.advanceThru.akeRke}</td>
                          </tr>
                          <tr className="border-t border-gray-300">
                            <td className="px-3 py-2 border border-gray-300">BUILT ULDS - PMC</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.advanceBuilt.pmcAmf}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">BUILT ULDS - ALF</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.advanceBuilt.alfPla}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">BUILT ULDS - AKE</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.advanceBuilt.akeRke}</td>
                          </tr>
                          <tr className="bg-gray-50 font-semibold border-t border-gray-300">
                            <td className="px-3 py-2 border border-gray-300">TOT</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">
                              {getTotal(advanceReportTotals.advanceBuilt)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Bonus Units */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">BONUS UNITS</h5>
                      <table className="w-full text-xs border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left border border-gray-300">Category</th>
                            <th className="px-3 py-2 text-center border border-gray-300">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">TTL FLTS</td>
                            <td className="px-3 py-2 border border-gray-300 text-center font-semibold">{bonusFlights.length}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">TTL STAFF</td>
                            <td className="px-3 py-2 border border-gray-300 text-center font-semibold">
                              {new Set(bonusFlights.map((f) => f.staff).filter(Boolean)).size}
                            </td>
                          </tr>
                          <tr className="border-t border-gray-300">
                            <td className="px-3 py-2 border border-gray-300">THRU ULDS - PMC</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.bonusThru.pmcAmf}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">THRU ULDS - ALF</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.bonusThru.alfPla}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">THRU ULDS - AKE</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.bonusThru.akeRke}</td>
                          </tr>
                          <tr className="border-t border-gray-300">
                            <td className="px-3 py-2 border border-gray-300">BUILT ULDS - PMC</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.bonusBuilt.pmcAmf}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">BUILT ULDS - ALF</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.bonusBuilt.alfPla}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300">BUILT ULDS - AKE</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{advanceReportTotals.bonusBuilt.akeRke}</td>
                          </tr>
                          <tr className="bg-gray-50 font-semibold border-t border-gray-300">
                            <td className="px-3 py-2 border border-gray-300">TOT</td>
                            <td className="px-3 py-2 border border-gray-300 text-center">{getTotal(advanceReportTotals.bonusBuilt)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Flight Details Table */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Flight Details</div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-xs border border-gray-300">
                        <thead className="sticky top-0 bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left border border-gray-300">FLTS</th>
                            <th className="px-3 py-2 text-left border border-gray-300">STAFF</th>
                            <th className="px-3 py-2 text-center border border-gray-300" colSpan={3}>THRU ULDS</th>
                            <th className="px-3 py-2 text-center border border-gray-300" colSpan={3}>BUILT ULDS</th>
                            <th className="px-3 py-2 text-center border border-gray-300">TOT</th>
                            <th className="px-3 py-2 text-center border border-gray-300" colSpan={3}>PENDING UNITS</th>
                            <th className="px-3 py-2 text-center border border-gray-300">TOT</th>
                          </tr>
                          <tr>
                            <th className="px-3 py-2 border border-gray-300"></th>
                            <th className="px-3 py-2 border border-gray-300"></th>
                            <th className="px-3 py-2 text-center border border-gray-300">PMC</th>
                            <th className="px-3 py-2 text-center border border-gray-300">ALF</th>
                            <th className="px-3 py-2 text-center border border-gray-300">AKE</th>
                            <th className="px-3 py-2 text-center border border-gray-300">PMC</th>
                            <th className="px-3 py-2 text-center border border-gray-300">ALF</th>
                            <th className="px-3 py-2 text-center border border-gray-300">AKE</th>
                            <th className="px-3 py-2 text-center border border-gray-300 bg-orange-100"></th>
                            <th className="px-3 py-2 text-center border border-gray-300">PMC</th>
                            <th className="px-3 py-2 text-center border border-gray-300">ALF</th>
                            <th className="px-3 py-2 text-center border border-gray-300">AKE</th>
                            <th className="px-3 py-2 text-center border border-gray-300 bg-green-100"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {advanceFlights.map((flight, index) => (
                            <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"} >
                              <td className="px-3 py-2 border border-gray-300">
                                <EditableField
                                  value={flight.flight}
                                  onChange={(v) => updateFlight(advanceFlights, setAdvanceFlights, index, "flight", v)}
                                  className="text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300">
                                <EditableField
                                  value={flight.staff}
                                  onChange={(v) => updateFlight(advanceFlights, setAdvanceFlights, index, "staff", v)}
                                  className="text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.thruPmc.toString()}
                                  onChange={(v) =>
                                    updateFlight(advanceFlights, setAdvanceFlights, index, "thruPmc", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.thruAlf.toString()}
                                  onChange={(v) =>
                                    updateFlight(advanceFlights, setAdvanceFlights, index, "thruAlf", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.thruAke.toString()}
                                  onChange={(v) =>
                                    updateFlight(advanceFlights, setAdvanceFlights, index, "thruAke", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.builtPmc.toString()}
                                  onChange={(v) =>
                                    updateFlight(advanceFlights, setAdvanceFlights, index, "builtPmc", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.builtAlf.toString()}
                                  onChange={(v) =>
                                    updateFlight(advanceFlights, setAdvanceFlights, index, "builtAlf", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.builtAke.toString()}
                                  onChange={(v) =>
                                    updateFlight(advanceFlights, setAdvanceFlights, index, "builtAke", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center font-semibold bg-orange-100">
                                {flight.builtPmc + flight.builtAlf + flight.builtAke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">0</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">0</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">0</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-green-100">0</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-3 py-2 border border-gray-300">TTL FLTS</td>
                            <td className="px-3 py-2 border border-gray-300">TTL STAFF</td>
                            <td className="px-3 py-2 text-center border border-gray-300" colSpan={3}>THRU ULDS</td>
                            <td className="px-3 py-2 text-center border border-gray-300" colSpan={3}>BUILT ULDS</td>
                            <td className="px-3 py-2 text-center border border-gray-300">TOT</td>
                            <td className="px-3 py-2 text-center border border-gray-300" colSpan={3}>PENDING UNITS</td>
                            <td className="px-3 py-2 text-center border border-gray-300">TOT</td>
                          </tr>
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-3 py-2 border border-gray-300">{advanceFlights.length}</td>
                            <td className="px-3 py-2 border border-gray-300">
                              {new Set(advanceFlights.map((f) => f.staff).filter(Boolean)).size}
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.advanceThru.pmcAmf}</td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.advanceThru.alfPla}</td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.advanceThru.akeRke}</td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.advanceBuilt.pmcAmf}</td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.advanceBuilt.alfPla}</td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.advanceBuilt.akeRke}</td>
                            <td className="px-3 py-2 text-center border border-gray-300 bg-orange-100">
                              {getTotal(advanceReportTotals.advanceBuilt)}
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-300">0</td>
                            <td className="px-3 py-2 text-center border border-gray-300">0</td>
                            <td className="px-3 py-2 text-center border border-gray-300">0</td>
                            <td className="px-3 py-2 text-center border border-gray-300 bg-green-100">0</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bonus Units Flight Details */}
                  <div className="border-t border-gray-300 pt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">BONUS UNITS - Flight Details</div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-xs border border-gray-300">
                        <thead className="sticky top-0 bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left border border-gray-300">FLTS</th>
                            <th className="px-3 py-2 text-left border border-gray-300">STAFF</th>
                            <th className="px-3 py-2 text-center border border-gray-300" colSpan={3}>THRU ULDS</th>
                            <th className="px-3 py-2 text-center border border-gray-300" colSpan={3}>BUILT ULDS</th>
                            <th className="px-3 py-2 text-center border border-gray-300">TOT</th>
                            <th className="px-3 py-2 text-center border border-gray-300" colSpan={3}>PENDING UNITS</th>
                            <th className="px-3 py-2 text-center border border-gray-300">TOT</th>
                          </tr>
                          <tr>
                            <th className="px-3 py-2 border border-gray-300"></th>
                            <th className="px-3 py-2 border border-gray-300"></th>
                            <th className="px-3 py-2 text-center border border-gray-300">PMC</th>
                            <th className="px-3 py-2 text-center border border-gray-300">ALF</th>
                            <th className="px-3 py-2 text-center border border-gray-300">AKE</th>
                            <th className="px-3 py-2 text-center border border-gray-300">PMC</th>
                            <th className="px-3 py-2 text-center border border-gray-300">ALF</th>
                            <th className="px-3 py-2 text-center border border-gray-300">AKE</th>
                            <th className="px-3 py-2 text-center border border-gray-300 bg-orange-100"></th>
                            <th className="px-3 py-2 text-center border border-gray-300">PMC</th>
                            <th className="px-3 py-2 text-center border border-gray-300">ALF</th>
                            <th className="px-3 py-2 text-center border border-gray-300">AKE</th>
                            <th className="px-3 py-2 text-center border border-gray-300 bg-green-100"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {bonusFlights.map((flight, index) => (
                            <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-3 py-2 border border-gray-300">
                                <EditableField
                                  value={flight.flight}
                                  onChange={(v) => updateFlight(bonusFlights, setBonusFlights, index, "flight", v)}
                                  className="text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300">
                                <EditableField
                                  value={flight.staff}
                                  onChange={(v) => updateFlight(bonusFlights, setBonusFlights, index, "staff", v)}
                                  className="text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.thruPmc.toString()}
                                  onChange={(v) =>
                                    updateFlight(bonusFlights, setBonusFlights, index, "thruPmc", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.thruAlf.toString()}
                                  onChange={(v) =>
                                    updateFlight(bonusFlights, setBonusFlights, index, "thruAlf", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.thruAke.toString()}
                                  onChange={(v) =>
                                    updateFlight(bonusFlights, setBonusFlights, index, "thruAke", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.builtPmc.toString()}
                                  onChange={(v) =>
                                    updateFlight(bonusFlights, setBonusFlights, index, "builtPmc", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.builtAlf.toString()}
                                  onChange={(v) =>
                                    updateFlight(bonusFlights, setBonusFlights, index, "builtAlf", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">
                                <EditableField
                                  value={flight.builtAke.toString()}
                                  onChange={(v) =>
                                    updateFlight(bonusFlights, setBonusFlights, index, "builtAke", parseInt(v) || 0)
                                  }
                                  type="number"
                                  className="w-12 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center font-semibold bg-orange-100">
                                {flight.builtPmc + flight.builtAlf + flight.builtAke}
                              </td>
                              <td className="px-3 py-2 border border-gray-300 text-center">0</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">0</td>
                              <td className="px-3 py-2 border border-gray-300 text-center">0</td>
                              <td className="px-3 py-2 border border-gray-300 text-center bg-green-100">0</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-3 py-2 border border-gray-300">TTL FLTS</td>
                            <td className="px-3 py-2 border border-gray-300">TTL STAFF</td>
                            <td className="px-3 py-2 text-center border border-gray-300" colSpan={3}>THRU ULDS</td>
                            <td className="px-3 py-2 text-center border border-gray-300" colSpan={3}>BUILT ULDS</td>
                            <td className="px-3 py-2 text-center border border-gray-300">TOT</td>
                            <td className="px-3 py-2 text-center border border-gray-300" colSpan={3}>PENDING UNITS</td>
                            <td className="px-3 py-2 text-center border border-gray-300">TOT</td>
                          </tr>
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-3 py-2 border border-gray-300">{bonusFlights.length}</td>
                            <td className="px-3 py-2 border border-gray-300">
                              {new Set(bonusFlights.map((f) => f.staff).filter(Boolean)).size}
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.bonusThru.pmcAmf}</td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.bonusThru.alfPla}</td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.bonusThru.akeRke}</td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.bonusBuilt.pmcAmf}</td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.bonusBuilt.alfPla}</td>
                            <td className="px-3 py-2 text-center border border-gray-300">{advanceReportTotals.bonusBuilt.akeRke}</td>
                            <td className="px-3 py-2 text-center border border-gray-300 bg-orange-100">
                              {getTotal(advanceReportTotals.bonusBuilt)}
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-300">0</td>
                            <td className="px-3 py-2 text-center border border-gray-300">0</td>
                            <td className="px-3 py-2 text-center border border-gray-300">0</td>
                            <td className="px-3 py-2 text-center border border-gray-300 bg-green-100">0</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Grand Totals */}
                  <div className="border-t border-gray-300 pt-4">
                    <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-semibold mb-1 text-gray-700">TOTAL BUILT UNITS (ADVANCE + BONUS)</div>
                          <div className="text-2xl font-bold text-[#D71A21]">
                            {getTotal(advanceReportTotals.totalBuilt)}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold mb-1 text-gray-700">TOTAL THRU UNITS (ADVANCE + BONUS)</div>
                          <div className="text-2xl font-bold text-gray-900">{getTotal(advanceReportTotals.totalThru)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  )
}
