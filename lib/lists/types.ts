export interface LoadPlanHeader {
  flightNumber: string
  date: string
  aircraftType: string
  aircraftReg: string
  sector: string
  std: string
  preparedBy: string
  preparedOn: string
  ttlPlnUld?: string
  uldVersion?: string
  headerWarning?: string
  isCritical?: boolean // Flag to indicate if document has CRITICAL stamp
  isCorrectVersion?: boolean // Flag to indicate if header or filename contains "cor" or "corr" (revised/correction mode)
}

export interface Shipment {
  serialNo: string
  awbNo: string
  origin: string
  destination: string
  pieces: number
  weight: number
  volume: number
  lvol: number
  shc: string
  manDesc: string
  pcode: string
  pc: string
  thc: string
  bs: string
  pi: string
  fltIn: string
  arrDtTime: string
  qnnAqnn: string
  whs: string
  si: string
  uld: string
  specialNotes: string[]
  isRampTransfer?: boolean
  sector?: string // Sector information (e.g., "DXBMXP", "DXBJFK")
  outFlight?: string // Outgoing flight number from load plan header (e.g., "EK501")
  outStd?: string // Outgoing STD from load plan header (e.g., "14:30")
  outDepDate?: string // Outgoing departure date from load plan header
}

export interface SpecialCargoReportRow {
  serialNo?: string
  carrier: string
  outFlightNo: string
  docNo: string
  origin?: string
  destination?: string
  inBrdPt: string
  outOffPt: string
  depDate: string
  std: string
  outPcs: number
  outWt: number
  volume?: number
  lvol?: number
  shc: string
  manifestDesc: string
  pcode?: string
  pc?: string
  thc?: string
  bs?: string
  pi?: string
  fltIn?: string
  arrDtTime?: string
  qnnAqnn?: string
  whs?: string
  si?: string
  uld?: string
  inCarrier: string
  inFlightNo: string
  hasHUM?: boolean // Flag to highlight shipment with HUM SHC
}

export interface VUNListRow {
  serialNo?: string
  cargoType: string
  docNo: string
  origin?: string
  destination?: string
  inUld: string
  inCarrier: string
  inFlightNo: string
  inSu: string
  inBrdPt: string
  inOffPt: string
  inArrDate: string
  inAta: string
  inMvt: string
  outCarrier: string
  outFlightNo: string
  outSu: string
  outBrdPt: string
  outOffPt: string
  outDepDate: string
  outStd: string
  outPcs: number
  outWt: number
  outVol: number
  lvol?: number
  outBooking: string
  outMvt: string
  outUld: string
  outMctActl: string
  outMctStnd: string
  outMctDiff: string
  outMctThc: string
  loadInOut: string
  product: string
  shc: string
  commodity: string
  manifestDesc: string
  pcode?: string
  pc?: string
  thc?: string
  bs?: string
  pi?: string
  qnnAqnn?: string
  whs?: string
  si?: string
}

export interface QRTListRow {
  serialNo?: string
  docNo: string
  origin?: string
  destination?: string
  carrier: string
  flightNo: string
  outOffPt: string
  depDate: string
  std: string
  pcs?: number
  weight?: number
  volume?: number
  lvol?: number
  mct: string
  uld: string
  shc: string
  manifestDesc: string
  pcode?: string
  pc?: string
  thc?: string
  bs?: string
  pi?: string
  arrDtTime?: string
  qnnAqnn?: string
  whs?: string
  si?: string
}

export interface ListsResults {
  specialCargo: { regular: SpecialCargoReportRow[]; weapons: SpecialCargoReportRow[] }
  vunList: VUNListRow[]
  qrtList: QRTListRow[]
  header: LoadPlanHeader
  shipments?: Shipment[]
}
