import { Flight } from "@/types/flight-master/flight-master"
import { Agent } from "@/types/partner/agent"
import { CommodityCode } from "@/lib/hooks/commodity-codes"
import { Location } from "@/lib/hooks/locations"
import { SpecialHandlingCode } from "@/lib/hooks/special-handling-codes"

import { ULD } from "../../uld-management/uld-inventory/types/uld"

export type UldType = {
  id: string
  name: string
  uld_weight: number
  weight_capacity: number
  volume_capacity: number
}

export type SplitParcelData = {
  id: string
  parent_parcel_id: string
  qty: number
  weight_kg: number
  is_subracted_by_weight?: boolean
}

export type SplitGroup = {
  id: string
  parcels: SplitParcelData[]
}

export type BuildUpPayload = {
  flight_id: string
  offloaded_orders: {
    order_id: string
    pieces: number
    weight_kg: number
    volume?: number
    total_pieces: number
    total_weight_kg: number
    total_volume?: number
    remarks: string
  }[]
  bulk_load_orders: {
    order_id: string
    pieces: number
    weight_kg: number
    volume?: number
    total_pieces: number
    total_weight_kg: number
    total_volume?: number
  }[]
  ulds: {
    uld_id: string
    orders: {
      order_id: string
      pieces: number
      weight_kg: number
      volume?: number
      total_pieces: number
      total_weight_kg: number
      total_volume?: number
    }[]
  }[]
}

export type BuildUpDataState = {
  availableOrders: OrderShipmentData[]
  ulds: {
    uld: ULD
    orders: OrderShipmentData[]
  }[]
  bulkLoadOrders: OrderShipmentData[]
  offloadedOrders: {
    shipment: OrderShipmentData
    remarks: string
  }[]
}

type CustomerInfo = {
  id: string
  name: string
}

export type OrderShipmentData = {
  id: string
  awb: string
  order_id: string
  order_shipment_id: string
  agent: string
  consignee: string
  consignor: string
  pieces: number | string
  weight_kg: number | string
  volume_m3?: number | string
  total_pieces: number | string
  total_weight_kg: number | string
  total_volume_m3?: number | string
  commodity_code?: CommodityCode
  special_handling_codes?: SpecialHandlingCode[]
  remarks?: string
  is_partial?: boolean
  is_split?: boolean
  is_replanned?: boolean
  origin?: Location
  destination?: Location
  nature_of_goods?: string
  parent_order_shipment?: OrderShipmentData | null
}

export type OrderShipmentPayloadData = {
  id: string
  order_shipment_id: string
  order_id: string
  pieces: number
  weight_kg: number
  volume_m3?: number
  total_pieces: number
  total_weight_kg: number
  total_volume_m3?: number
  is_split: boolean
  is_partial: boolean
  remarks?: string
}

export type FinalizeBuildUpPayload = {
  flight_id: string
  is_finalized: boolean
  build_up_data: {
    ulds: {
      id: string
      orders: OrderShipmentPayloadData[]
    }[]
    bulk_load_orders: OrderShipmentPayloadData[]
    offloaded_orders: {
      shipment: OrderShipmentPayloadData
      remarks: string
    }[]
  }
  raw_build_up_data: string
}

export type FlightBuildUpShipment = {
  id: string
  order_shipment: OrderShipmentData
  is_offload: boolean
  uld: ULD | null
  remarks?: string | null
}

export type BuildUpListItem = {
  id: string
  is_finalized: boolean
  flight_build_up_shipments: FlightBuildUpShipment[]
  flight?: Flight
}

// Background Sync Types
export type SyncStatus = "idle" | "syncing" | "success" | "error" | "offline"

export type SyncPriority = "critical" | "userAction" | "standard"

export interface BackgroundSyncState {
  status: SyncStatus
  lastSynced: Date | null
  pendingChanges: boolean
  retryCount: number
  error: string | null
  isOffline: boolean
}

export interface BackgroundSyncOptions {
  flightId: string | null
  isFinalized: boolean
  debounceConfig: {
    critical: number // 500ms for offload/safety operations
    userAction: number // 1000ms for drag/drop actions
    standard: number // 3000ms for most changes
  }
}

export interface SyncOperation {
  id: string
  priority: SyncPriority
  timestamp: number
  data: BuildUpDataState
}

export interface ConflictResolutionData {
  localData: BuildUpDataState
  serverData: BuildUpDataState
  conflictFields: string[]
}
