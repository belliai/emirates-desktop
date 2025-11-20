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
  // VUN is a Special Handling Code, so check SHC field specifically
  if (!shipment.shc) return false
  
  // Check if SHC contains VUN (can be standalone "VUN" or part of codes like "VUN-CRT")
  const shcUpper = shipment.shc.toUpperCase().trim()
  const shcCodes = shcUpper.split("-").map((code) => code.trim())
  return shcCodes.includes("VUN")
}

export function isQRTCargo(shipment: Shipment): boolean {
  // QRT is in the THC (Total Handling Charge) field, so check THC field specifically
  if (!shipment.thc) return false
  
  // Check if THC contains QRT (can be standalone "QRT" or part of codes like "P2 QRT")
  const thcUpper = shipment.thc.toUpperCase().trim()
  return thcUpper.includes("QRT")
}
