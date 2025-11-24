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
  fltin: string
  arrdtTime: string
  qnnAqnn: string
  whs: string
  si: string
  remarks?: string
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
  uldVersion: string
  preparedOn: string
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

