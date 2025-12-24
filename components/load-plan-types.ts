export type AWBRow = {
  ser: string
  awbNo: string
  orgDes: string
  pcs: string
  wgt: string
  vol: string
  lvol: string
  shc: string
  manDesc: string
  pcode: string
  pc: string
  thc: string
  bs: string
  pi: string
  bayNumber?: string // Bay number for QRT List
  connTime?: string // Connection time for QRT List
  uldNumber?: string // ULD number for QRT List
  fltin: string
  arrdtTime: string
  qnnAqnn: string
  whs: string
  si: string
  remarks?: string
  revision?: number // Revision number of the load plan item
  additional_data?: boolean // Flag indicating if this item is additional data (new item added in subsequent upload)
}

export type ULDSection = {
  uld: string
  awbs: AWBRow[]
  isRampTransfer?: boolean
}

export type LoadPlanItem = {
  type: "uld" | "awb"
  uld?: string
  awb?: AWBRow
  isRampTransfer?: boolean
}

export type LoadPlanDetail = {
  flight: string
  date: string
  acftType: string
  acftReg: string
  headerVersion: string
  pax: string
  std: string
  preparedBy: string
  ttlPlnUld: string
  adjustedTtlPlnUld?: string // TTL PLN ULD minus COUR/MAIL/RAMP TRANSFER exclusions
  uldVersion: string
  preparedOn: string
  headerWarning?: string
  isCritical?: boolean // Flag to indicate if document has CRITICAL stamp
  revision?: number // Revision number for the load plan
  remarks?: string[]
  sectors: {
    sector: string
    uldSections: ULDSection[]
    bagg?: string
    cou?: string
    totals: {
      pcs: string
      wgt: string
      vol: string
      lvol: string
    }
  }[]
}

