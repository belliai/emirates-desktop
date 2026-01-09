/**
 * BCR (Build-up Completion Report) Reason Codes
 * 
 * Standard codes for shipment misconnection and offload reasons
 * Used in the BCR modal's "Reason" dropdown field
 */

export type BCRReasonCode = {
  code: string
  description: string
}

export const BCR_REASON_CODES: BCRReasonCode[] = [
  { code: "DMGD", description: "Shipment misconnected due damaged" },
  { code: "ERROR", description: "Shipment misconnected due staff error" },
  { code: "LIAC", description: "Shipment misconnected due late inbound flight" },
  { code: "LDWC", description: "Shipment misconnected due Late incoming Truck from DWC" },
  { code: "LITU", description: "Late incoming Truck other than DWC origin" },
  { code: "QWMX", description: "Shipment Misconnected due QWT mix with non QWT shipment in ULD" },
  { code: "LTBD", description: "Shipment misconnected due Late break down" },
  { code: "NO SHOW", description: "Shipment No Show for the flight" },
  { code: "WPSC", description: "Shipment misconnected due SPACE" },
  { code: "WHOC", description: "Shipment misconnected due Warehouse Congestion" },
  { code: "DIMS", description: "Not loaded due over size or volume (specify the Dimension)" },
  { code: "VOLX", description: "Shipment misconnected due wrong VOL declared (Specify Actual Volume with Dimension)" },
  { code: "LDBL", description: "Shipment misconnected due poor load ability (Specify Actual Loadable volume)" },
  { code: "MSAW", description: "Shipment misconnected due missing AWB" },
  { code: "DOCS", description: "Shipment misconnected due discrepancy in Documents" },
  { code: "PYMT", description: "Shipment misconnected due no payment" },
  { code: "SYTM", description: "Shipment misconnected due System error" },
  { code: "CMTS", description: "Shipment misconnected due CCS system" },
  { code: "MSCA", description: "Shipment misconnected due Missing cargo upon Arrival" },
  { code: "HOLD", description: "Shipment on HOLD (Reason for HOLD)" },
  { code: "FLTD", description: "Downgrading / Flight Cancellation" },
  { code: "SECU", description: "Not loaded due to Security reasons" },
  { code: "SCRC", description: "Not loaded due screening process not completed" },
  { code: "CTRC", description: "Tracing at DXB airport / Not located" },
  { code: "DTRC", description: "Tracing at DWC airport / Not located" },
  { code: "MISC", description: "Miscellaneous" },
  { code: "RELP", description: "Relocation of cargo to accommodate volume increase of other priority loads" },
] as const

/**
 * Get the description for a reason code
 */
export function getReasonDescription(code: string): string {
  const reason = BCR_REASON_CODES.find(r => r.code === code)
  return reason?.description || code
}

/**
 * Format reason code for display (code + short description)
 */
export function formatReasonCode(code: string): string {
  const reason = BCR_REASON_CODES.find(r => r.code === code)
  if (!reason) return code
  // Truncate long descriptions for dropdown display
  const shortDesc = reason.description.length > 50 
    ? reason.description.substring(0, 47) + "..." 
    : reason.description
  return `${reason.code} - ${shortDesc}`
}
