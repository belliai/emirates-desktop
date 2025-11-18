import type { Shipment } from "./types"
import { SPECIAL_CARGO_CODES, WEAPONS_CODES, VUN_INDICATOR_CODES, VUN_PCODE_VALUES, VALUE_KEYWORDS } from "./constants"

function rowContainsKeyword(shipment: Shipment, keyword: string): boolean {
  const searchableValues = [
    shipment.serialNo,
    shipment.awbNo,
    shipment.origin,
    shipment.destination,
    shipment.shc,
    shipment.manDesc,
    shipment.pcode,
    shipment.pc,
    shipment.thc,
    shipment.bs,
    shipment.pi,
    shipment.fltIn,
    shipment.arrDtTime,
    shipment.qnnAqnn,
    shipment.whs,
    shipment.si,
    shipment.uld,
    ...(shipment.specialNotes || []),
  ]
  
  return searchableValues.some((value) => 
    value && typeof value === 'string' && value.toUpperCase().includes(keyword.toUpperCase())
  )
}

export function isSpecialCargo(shipment: Shipment): boolean {
  return rowContainsKeyword(shipment, "AXA") || 
         rowContainsKeyword(shipment, "AOG") || 
         rowContainsKeyword(shipment, "VIP")
}

export function isWeaponsCargo(shipment: Shipment): boolean {
  if (!shipment.shc) return false
  const shcCodes = shipment.shc.split("-").map((code) => code.trim())
  return shcCodes.some((code) => WEAPONS_CODES.includes(code))
}

export function isVUNCargo(shipment: Shipment): boolean {
  return rowContainsKeyword(shipment, "VUN")
}

export function isQRTCargo(shipment: Shipment): boolean {
  return rowContainsKeyword(shipment, "QRT")
}
