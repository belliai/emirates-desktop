import { PropsWithChildren, useEffect, useMemo, useState } from "react"
import { isAxiosError } from "axios"
import {
  BoxesIcon,
  CircleCheckBigIcon,
  Code2Icon,
  DownloadIcon,
  LockIcon,
  LockOpenIcon,
  MessageSquareCodeIcon,
  PackageMinusIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
} from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"
import { useDebounceValue } from "usehooks-ts"

import { Flight } from "@/types/flight-master/flight-master"
import { Order } from "@/types/orders"
import { UldIcon } from "@/lib/icons/UldIcon"
import { ObjectSet } from "@/lib/utils/array-utils"
import { getOffsetFromTzIdentifier } from "@/lib/utils/timezone-utils"
import {
  transformOrderShipment,
  transformOrderShipmentToPayload,
} from "@/lib/utils/transform-utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import {
  convertTo24Hour,
  getIsFlightDeparted,
} from "@/app/dashboards/flights/utils/flight-utils"

import {
  BuildUpData,
  useBuildUpData,
  useFinalizeBuildUp,
} from "../hooks/build-up"
import { useBuildUpPersistence } from "../hooks/use-build-up-persistence"
import { BuildUpFormValues } from "../schemas/build-up"
import {
  BuildUpDataState,
  FinalizeBuildUpPayload,
  OrderShipmentData,
  OrderShipmentPayloadData,
  SplitGroup,
  UldType,
} from "../types/build-up"
import AddUldDialog from "./add-uld-dialog"
import AwbCard from "./card-awb"
import BulkLoadCard from "./card-bulk-load"
import OffloadedCard from "./card-offloaded"
import UldCard from "./card-uld"
import BulkOffloadDialog from "./dialog-bulk-offload"
import CargoManifestDialog from "./dialog-cargo-manifest"
import OffloadOrderDialog from "./dialog-offload-order"
import SplitAwbDialog from "./dialog-split-awb-v2"
import { PerformanceMonitor } from "./performance-monitor"
import ShipmentDetailsDialog from "./shipment-details-dialog"
import SyncStatusIndicator from "./sync-status-indicator"
import { UldAssignmentSkeleton } from "./uld-assignment-skeleton"

type SectionUldAssignmentProps = {
  selectedFlight: Flight | null
}

const initialFormValues: BuildUpFormValues = {
  ulds: [],
  bulk_load_order_ids: [],
  offloaded_orders: [],
}

export function SectionUldAssignment({
  selectedFlight,
}: SectionUldAssignmentProps) {
  const [awbSearch, setAwbSearch] = useState("")
  const [uldSearch, setUldSearch] = useState("")

  const [debouncedUldSearch] = useDebounceValue(uldSearch, 200)
  const [debouncedAwbSearch] = useDebounceValue(awbSearch, 200)

  const [isReopening, setIsReopening] = useState(false)

  // Fetch build-up data
  const { data: buildUpData, isFetching: isLoadingBuildUp } = useBuildUpData({
    flight_id: selectedFlight?.id ?? "",
  })

  // Check if build-up is finalized
  const isFinalized = useMemo(() => {
    if (isReopening) return false
    return !!buildUpData?.build_up_data?.is_finalized
  }, [buildUpData, isReopening])

  // Optimize acceptedOrders computation - remove JSON.parse overhead and use shared utility
  const acceptedOrders = useMemo(() => {
    if (!buildUpData?.accepted_orders) return []

    return buildUpData.accepted_orders.map(transformOrderShipment)
  }, [buildUpData?.accepted_orders])

  useEffect(() => {
    setIsReopening(false)
  }, [selectedFlight])

  // Use the build-up persistence hook with background sync
  const {
    buildUpForm,
    buildUpState,
    resetToBackend,
    syncState,
    forceSync,
    hasPendingChanges,
    lastSyncedState,
  } = useBuildUpPersistence(
    selectedFlight,
    acceptedOrders,
    isFinalized,
    isReopening,
    buildUpData // Pass buildUpData to the hook
  )

  const [addUldDialogOpen, setAddUldDialogOpen] = useState(false)

  const [openDetails, setOpenDetails] = useState<OrderShipmentData | null>(null)
  const [openSplitAwb, setOpenSplitAwb] = useState<OrderShipmentData | null>(
    null
  )
  const [openOffloadOrder, setOpenOffloadOrder] =
    useState<OrderShipmentData | null>(null)
  const [openBulkOffload, setOpenBulkOffload] = useState(false)

  const [selectedOrders, setSelectedOrders] = useState<OrderShipmentData[]>([])

  const [uldToRemove, setUldToRemove] = useState<string | null>(null)
  const [orderToUnsplit, setOrderToUnsplit] =
    useState<OrderShipmentData | null>(null)

  const uldOptions = useMemo(() => {
    return buildUpState.ulds.map((uld) => ({
      label: uld.uld.uld_number,
      value: uld.uld.id,
    }))
  }, [buildUpState.ulds])

  const onToggleSelectedOrder = (order: OrderShipmentData) => {
    setSelectedOrders((prev) => {
      if (prev.includes(order)) {
        return prev.filter((o) => o.id !== order.id)
      }
      return [...prev, order]
    })
  }

  const onAssignShipmentsToUld = (
    orders: OrderShipmentData[],
    targetUldId: string,
    sourceUldId?: string
  ): boolean => {
    const targetUld = buildUpState.ulds.find(
      (uld) => uld.uld.id === targetUldId
    )
    if (!targetUld) return false

    const sourceUld = sourceUldId
      ? buildUpState.ulds.find((uld) => uld.uld.id === sourceUldId) || null
      : null

    // Calculate total weight of orders being moved
    const totalWeight = orders.reduce(
      (acc, order) => acc + (Number(order.weight_kg) || 0),
      0
    )

    // Calculate current weight in target ULD
    const weightInUld = targetUld.orders.reduce(
      (acc, order) => acc + (Number(order.weight_kg) || 0),
      0
    )

    // Calculate remaining weight capacity
    const remainingUldWeight = targetUld.uld.max_weight_kg - weightInUld

    // Validate weight capacity
    if (totalWeight > remainingUldWeight) {
      toast({
        title: "ULD Weight Exceeded",
        description: `The total weight of the orders (${totalWeight}kg) exceeds the ULD's remaining weight capacity (${remainingUldWeight}kg)`,
        variant: "destructive",
      })
      return false
    }

    // Create new state updates
    const updates: Partial<BuildUpDataState> = {}

    if (sourceUld) {
      // Moving between ULDs
      const [removedOrders, addedOrders] = moveOrderShipments(
        sourceUld.orders,
        targetUld.orders,
        orders
      )

      updates.ulds = buildUpState.ulds.map((uld) => {
        if (uld.uld.id === sourceUldId) {
          return { ...uld, orders: removedOrders }
        }
        if (uld.uld.id === targetUldId) {
          return { ...uld, orders: addedOrders }
        }
        return uld
      })
    } else {
      // Moving from available orders to ULD
      const [removedOrders, addedOrders] = moveOrderShipments(
        buildUpState.availableOrders,
        targetUld.orders,
        orders
      )

      updates.availableOrders = removedOrders
      updates.ulds = buildUpState.ulds.map((uld) => {
        if (uld.uld.id === targetUldId) {
          return { ...uld, orders: addedOrders }
        }
        return uld
      })
    }

    // Apply all updates at once with proper type safety
    ;(
      Object.entries(updates) as Array<[keyof BuildUpDataState, unknown]>
    ).forEach(([key, value]) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[DRAG_DROP] setValue called:", {
          timestamp: new Date().toISOString(),
          field: key,
          valueType: Array.isArray(value) ? "array" : typeof value,
          valueLength: Array.isArray(value) ? value.length : "N/A",
        })
      }
      buildUpForm.setValue(key, value as BuildUpDataState[typeof key], {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    })

    setSelectedOrders([])

    return true
  }

  const onAssignShipmentsToBulkLoad = (
    orders: OrderShipmentData[],
    sourceUldId?: string
  ): boolean => {
    // Calculate total weight of orders being moved
    const totalWeight = orders.reduce(
      (acc, order) => acc + (Number(order.weight_kg) || 0),
      0
    )

    // Calculate current weight in bulk load
    const weightInBulkLoad = buildUpState.bulkLoadOrders.reduce(
      (acc, order) => acc + (Number(order.weight_kg) || 0),
      0
    )

    // Calculate remaining weight capacity
    const remainingWeight =
      Number(selectedFlight?.tail?.total_max_weight || 0) - weightInBulkLoad

    // Validate weight capacity
    if (totalWeight > remainingWeight) {
      toast({
        title: "Bulk Load Weight Exceeded",
        description: `The total weight of the orders (${totalWeight}kg) exceeds the remaining weight capacity (${remainingWeight}kg)`,
        variant: "destructive",
      })
      return false
    }

    // Create new state updates
    const updates: Partial<BuildUpDataState> = {}

    if (sourceUldId) {
      // Moving from ULD to bulk load
      const sourceUld = buildUpState.ulds.find(
        (uld) => uld.uld.id === sourceUldId
      )
      if (!sourceUld) return false

      const [removedOrders, addedOrders] = moveOrderShipments(
        sourceUld.orders,
        buildUpState.bulkLoadOrders,
        orders
      )

      updates.ulds = buildUpState.ulds.map((uld) => {
        if (uld.uld.id === sourceUldId) {
          return { ...uld, orders: removedOrders }
        }
        return uld
      })
      updates.bulkLoadOrders = addedOrders
    } else {
      // Moving from available orders to bulk load
      const [removedOrders, addedOrders] = moveOrderShipments(
        buildUpState.availableOrders,
        buildUpState.bulkLoadOrders,
        orders
      )

      console.log(removedOrders, addedOrders)

      updates.availableOrders = removedOrders
      updates.bulkLoadOrders = addedOrders
    }

    // Apply all updates at once with proper type safety
    ;(
      Object.entries(updates) as Array<[keyof BuildUpDataState, unknown]>
    ).forEach(([key, value]) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[DRAG_DROP] setValue called:", {
          timestamp: new Date().toISOString(),
          field: key,
          valueType: Array.isArray(value) ? "array" : typeof value,
          valueLength: Array.isArray(value) ? value.length : "N/A",
        })
      }
      buildUpForm.setValue(key, value as BuildUpDataState[typeof key], {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    })

    setSelectedOrders([])

    return true
  }

  const onUnassignShipmentsFromUld = (
    orders: OrderShipmentData[],
    uldId: string
  ): boolean => {
    const targetUld = buildUpState.ulds.find((uld) => uld.uld.id === uldId)
    if (!targetUld) return false

    // Create new state updates
    const updates: Partial<BuildUpDataState> = {}

    // Move orders from ULD to available orders
    const [removedOrders, addedOrders] = moveOrderShipments(
      targetUld.orders,
      buildUpState.availableOrders,
      orders
    )

    updates.availableOrders = addedOrders
    updates.ulds = buildUpState.ulds.map((uld) => {
      if (uld.uld.id === uldId) {
        return { ...uld, orders: removedOrders }
      }
      return uld
    })

    // Apply all updates at once with proper type safety
    ;(
      Object.entries(updates) as Array<[keyof BuildUpDataState, unknown]>
    ).forEach(([key, value]) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[DRAG_DROP] setValue called:", {
          timestamp: new Date().toISOString(),
          field: key,
          valueType: Array.isArray(value) ? "array" : typeof value,
          valueLength: Array.isArray(value) ? value.length : "N/A",
        })
      }
      buildUpForm.setValue(key, value as BuildUpDataState[typeof key], {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    })

    return true
  }

  const onUnassignShipmentsFromBulkLoad = (
    orders: OrderShipmentData[]
  ): boolean => {
    // Create new state updates
    const updates: Partial<BuildUpDataState> = {}

    // Move orders from bulk load to available orders
    const [removedOrders, addedOrders] = moveOrderShipments(
      buildUpState.bulkLoadOrders,
      buildUpState.availableOrders,
      orders
    )

    updates.availableOrders = addedOrders
    updates.bulkLoadOrders = removedOrders

    // Apply all updates at once with proper type safety
    ;(
      Object.entries(updates) as Array<[keyof BuildUpDataState, unknown]>
    ).forEach(([key, value]) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[DRAG_DROP] setValue called:", {
          timestamp: new Date().toISOString(),
          field: key,
          valueType: Array.isArray(value) ? "array" : typeof value,
          valueLength: Array.isArray(value) ? value.length : "N/A",
        })
      }
      buildUpForm.setValue(key, value as BuildUpDataState[typeof key], {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    })

    return true
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    const orderData = e.dataTransfer.getData("order")
    const uldId = e.dataTransfer.getData("uld_id")
    if (!orderData || !uldId) return

    const order = JSON.parse(orderData) as OrderShipmentData
    if (uldId === "bulk-load") {
      onUnassignShipmentsFromBulkLoad([order])
      return
    }
    if (uldId === "offloaded") {
      onCancelOffload(order)
      return
    }
    const index = buildUpState.ulds.findIndex((uld) => uld.uld.id === uldId)
    if (index === -1) return
    onUnassignShipmentsFromUld([order], uldId)
  }

  const onOffloadOrder = ({
    shipment,
    remarks,
  }: {
    shipment: OrderShipmentData
    remarks: string
  }) => {
    const orderId = shipment.order_id

    function setPartialTrue<
      T extends { order_id: string; is_partial?: boolean },
    >(orders: T[]): T[] {
      return orders.map((order) =>
        order.order_id === orderId ? { ...order, is_partial: true } : order
      )
    }

    const updatedAvailableOrders = setPartialTrue(buildUpState.availableOrders)
    const updatedBulkLoadOrders = setPartialTrue(buildUpState.bulkLoadOrders)
    const updatedUlds = buildUpState.ulds.map((uld) => ({
      ...uld,
      orders: setPartialTrue(uld.orders),
    }))

    const offloadedOrders = buildUpState.offloadedOrders.flatMap(
      (o) => o.shipment
    )
    const [removedOrders] = moveOrderShipments(
      updatedAvailableOrders,
      offloadedOrders,
      [shipment]
    )

    buildUpForm.setValue("availableOrders", removedOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    buildUpForm.setValue("bulkLoadOrders", updatedBulkLoadOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue("ulds", updatedUlds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue(
      "offloadedOrders",
      [
        ...buildUpState.offloadedOrders,
        { shipment: { ...shipment, is_partial: true }, remarks },
      ],
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      }
    )

    toast({
      title: "Order Offloaded",
      description: "The order has been offloaded to the lying list",
    })

    setSelectedOrders([])
  }

  const onBulkOffloadOrders = ({
    orders,
    remarks,
  }: {
    orders: OrderShipmentData[]
    remarks: string
  }) => {
    if (orders.length === 0) return

    const orderIds = orders.map((order) => order.order_id)

    function setPartialTrue<
      T extends { order_id: string; is_partial?: boolean },
    >(existingOrders: T[]): T[] {
      return existingOrders.map((order) =>
        orderIds.includes(order.order_id)
          ? { ...order, is_partial: true }
          : order
      )
    }

    // Update all collections to mark affected orders as partial
    const updatedAvailableOrders = setPartialTrue(buildUpState.availableOrders)
    const updatedBulkLoadOrders = setPartialTrue(buildUpState.bulkLoadOrders)
    const updatedUlds = buildUpState.ulds.map((uld) => ({
      ...uld,
      orders: setPartialTrue(uld.orders),
    }))

    // Remove selected orders from available orders
    const offloadedOrders = buildUpState.offloadedOrders.flatMap(
      (o) => o.shipment
    )
    const [removedOrders] = moveOrderShipments(
      updatedAvailableOrders,
      offloadedOrders,
      orders
    )

    // Create new offloaded orders with the shared remarks
    const newOffloadedOrders = orders.map((shipment) => ({
      shipment: { ...shipment, is_partial: true },
      remarks,
    }))

    // Update all form values
    buildUpForm.setValue("availableOrders", removedOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    buildUpForm.setValue("bulkLoadOrders", updatedBulkLoadOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue("ulds", updatedUlds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue(
      "offloadedOrders",
      [...buildUpState.offloadedOrders, ...newOffloadedOrders],
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      }
    )

    toast({
      title: "Orders Offloaded",
      description: `${orders.length} order${orders.length > 1 ? "s" : ""} have been offloaded to the lying list`,
    })

    setSelectedOrders([])
  }

  const onCancelOffload = (shipment: OrderShipmentData) => {
    const orderId = shipment.order_id

    // Remove the specific offloaded shipment
    const updatedOffloadedOrders = buildUpState.offloadedOrders.filter(
      (o) => o.shipment.id !== shipment.id
    )

    // Check if any other offloaded shipments with the same order_id remain
    const stillOffloadedWithOrderId = updatedOffloadedOrders.some(
      (o) => o.shipment.order_id === orderId
    )

    // Helper to update is_partial for all with this order_id
    function setPartialFlag<
      T extends { order_id: string; is_partial?: boolean },
    >(orders: T[], flag: boolean): T[] {
      return orders.map((order) =>
        order.order_id === orderId ? { ...order, is_partial: flag } : order
      )
    }

    const updatedAvailableOrders = setPartialFlag(
      buildUpState.availableOrders,
      stillOffloadedWithOrderId
    )
    const updatedBulkLoadOrders = setPartialFlag(
      buildUpState.bulkLoadOrders,
      stillOffloadedWithOrderId
    )
    const updatedUlds = buildUpState.ulds.map((uld) => ({
      ...uld,
      orders: setPartialFlag(uld.orders, stillOffloadedWithOrderId),
    }))

    buildUpForm.setValue("offloadedOrders", updatedOffloadedOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue(
      "availableOrders",
      [
        ...updatedAvailableOrders,
        {
          ...shipment,
          is_partial: stillOffloadedWithOrderId,
          remarks: "",
        },
      ],
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      }
    )
    buildUpForm.setValue("bulkLoadOrders", updatedBulkLoadOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue("ulds", updatedUlds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
  }

  const onAddUlds = (ulds: BuildUpDataState["ulds"][number][]) => {
    const filteredUlds = ulds.filter(
      (uld) => !buildUpState.ulds.some((u) => u.uld.id === uld.uld.id)
    )
    buildUpForm.setValue("ulds", [...filteredUlds, ...buildUpState.ulds], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
  }

  const onRemoveUld = (uldId: string) => {
    setUldToRemove(uldId)
  }

  const confirmRemoveUld = () => {
    if (!uldToRemove) return

    const targetUld = buildUpState.ulds.find(
      (uld) => uld.uld.id === uldToRemove
    )
    if (!targetUld) return

    let newState = { ...buildUpState }

    const uldOrders = targetUld.orders

    buildUpForm.setValue(
      "availableOrders",
      [...newState.availableOrders, ...uldOrders],
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      }
    )

    buildUpForm.setValue(
      "ulds",
      buildUpState.ulds.filter((uld) => uld.uld.id !== uldToRemove),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      }
    )

    setUldToRemove(null)
    return true
  }

  const { mutate: finalizeBuildUp, isPending: isFinalizing } =
    useFinalizeBuildUp()

  const onFinalize = (offloadRemainingOrders: boolean = false) => {
    if (!selectedFlight) return

    const data = buildUpForm.getValues()

    if (offloadRemainingOrders) {
      const availableOrders = data.availableOrders

      data.offloadedOrders = [
        ...data.offloadedOrders,
        ...availableOrders.map((order) => ({
          shipment: order,
          remarks: "Offloaded during build up",
        })),
      ]
    }

    // Merge shipments with same order_id before sending to backend
    const payload: FinalizeBuildUpPayload = {
      flight_id: selectedFlight.id,
      is_finalized: true,
      build_up_data: {
        ulds: data.ulds.map((uld) => ({
          id: uld.uld.id,
          orders: mergeShipmentsByOrderId(uld.orders).map(
            transformOrderShipmentToPayload
          ),
        })),
        bulk_load_orders: mergeShipmentsByOrderId(data.bulkLoadOrders).map(
          transformOrderShipmentToPayload
        ),
        offloaded_orders: (() => {
          // First merge the shipments
          const mergedShipments = mergeShipmentsByOrderId(
            data.offloadedOrders.map((o) => o.shipment)
          )
          // Then map them with remarks from original offloaded orders
          return mergedShipments.map((shipment) => {
            // Find the first matching offloaded order for remarks
            const originalOffload = data.offloadedOrders.find(
              (o) => o.shipment.order_id === shipment.order_id
            )
            return {
              shipment: {
                ...transformOrderShipmentToPayload(shipment),
                remarks: originalOffload?.remarks || "",
              },
              remarks: originalOffload?.remarks || "",
            }
          })
        })(),
      },
      raw_build_up_data: JSON.stringify(data, null, 2),
    }

    // TODO: Implement finalize
    finalizeBuildUp(payload, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Build up data saved successfully",
        })
        setIsReopening(false)
      },
      onError: (err) => {
        let message = "Failed to save build up data"
        if (isAxiosError(err)) {
          message = err.response?.data.message || message
        }
        toast({
          title: "Error Finalizing Build Up",
          description: message,
        })
      },
    })
  }

  const onReopen = () => {
    if (!selectedFlight) return
    setIsReopening(true)
  }

  const onReset = () => {
    resetToBackend()
  }

  const onConfirmSplit = (groups: OrderShipmentData[], orderId: string) => {
    let newState = { ...buildUpState }

    newState.availableOrders = newState.availableOrders.filter(
      (o) => o.order_id !== orderId
    )

    // create a map of location IDs to assigned groups
    const splitIdToAssignedGroups: Record<string, OrderShipmentData[]> = {}
    buildUpState.ulds.forEach((uld) => {
      uld.orders.forEach((order) => {
        if (order.order_id === orderId) {
          const contents = splitIdToAssignedGroups?.[uld.uld.id] || []
          splitIdToAssignedGroups[uld.uld.id] = [...contents, order]
        }
      })
    })
    buildUpState.bulkLoadOrders.forEach((order) => {
      if (order.order_id === orderId) {
        const contents = splitIdToAssignedGroups?.["bulk-load"] || []
        splitIdToAssignedGroups["bulk-load"] = [...contents, order]
      }
    })
    buildUpState.offloadedOrders.forEach((order) => {
      if (order.shipment.order_id === orderId) {
        const contents = splitIdToAssignedGroups?.["offloaded"] || []
        splitIdToAssignedGroups["offloaded"] = [...contents, order.shipment]
      }
    })

    // For each group, check if it was previously assigned
    groups.forEach((group) => {
      // Find the location where this group was previously assigned
      let assignedLocation: string | undefined
      let originalGroup: OrderShipmentData | undefined

      // Check all locations in the map
      // Fix: The original code assumes each map value is always a single-item array, but in reality, it may not be.
      for (const [locationId, groupsAtLocation] of Object.entries(
        splitIdToAssignedGroups
      )) {
        const found = groupsAtLocation.find(
          (existingGroup) => existingGroup.id === group.id
        )
        if (found) {
          assignedLocation = locationId
          originalGroup = found
          break
        }
      }

      if (!assignedLocation || !originalGroup) {
        // If not assigned anywhere, add to available orders
        newState.availableOrders = [...newState.availableOrders, group]
        return
      }

      // Update based on the assigned location
      if (assignedLocation === "bulk-load") {
        // Update in bulk load
        newState.bulkLoadOrders = newState.bulkLoadOrders.map((order) =>
          order.id === originalGroup.id ? group : order
        )
      } else if (assignedLocation === "offloaded") {
        // Update in offloaded
        newState.offloadedOrders = newState.offloadedOrders.map((o) =>
          o.shipment.id === originalGroup.id ? { ...o, shipment: group } : o
        )
      } else {
        // Update in ULD
        newState.ulds = newState.ulds.map((uld) => {
          if (uld.uld.id === assignedLocation) {
            return {
              ...uld,
              orders: uld.orders.map((order) =>
                order.id === originalGroup.id ? group : order
              ),
            }
          }
          return uld
        })
      }
    })

    buildUpForm.setValue("availableOrders", newState.availableOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue("ulds", newState.ulds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue("bulkLoadOrders", newState.bulkLoadOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue("offloadedOrders", newState.offloadedOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
  }

  const onUnsplit = (order: OrderShipmentData) => {
    setOrderToUnsplit(order)
  }

  const confirmUnsplit = () => {
    if (!orderToUnsplit) return

    let newState = buildUpForm.getValues()
    const orderId = orderToUnsplit.order_id

    newState.availableOrders = newState.availableOrders.filter(
      (o) => o.order_id !== orderId
    )

    newState.ulds = newState.ulds.map((uld) => ({
      ...uld,
      orders: uld.orders.filter((o) => o.order_id !== orderId),
    }))

    newState.bulkLoadOrders = newState.bulkLoadOrders.filter(
      (o) => o.order_id !== orderId
    )

    newState.offloadedOrders = newState.offloadedOrders.filter(
      (o) => o.shipment.order_id !== orderId
    )

    let originalShipment = null

    if (orderToUnsplit.parent_order_shipment) {
      originalShipment = orderToUnsplit.parent_order_shipment
    } else {
      originalShipment = acceptedOrders.find((o) => o.order_id === orderId)
    }

    if (originalShipment) {
      newState.availableOrders = [...newState.availableOrders, originalShipment]
    }

    buildUpForm.setValue("availableOrders", newState.availableOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue("ulds", newState.ulds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue("bulkLoadOrders", newState.bulkLoadOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    buildUpForm.setValue("offloadedOrders", newState.offloadedOrders, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })

    setOrderToUnsplit(null)
  }

  const getInitialSplitGroups = () => {
    if (!openSplitAwb) return []
    const allShipments = [
      ...buildUpState.ulds.flatMap((uld) => uld.orders),
      ...buildUpState.bulkLoadOrders,
      ...buildUpState.offloadedOrders.flatMap((o) => o.shipment),
      ...buildUpState.availableOrders,
    ]
    const splitShipments = allShipments.filter(
      (o) => o.order_id === openSplitAwb.order_id
    )
    return splitShipments
  }

  const filteredAvailableOrders = useMemo(() => {
    return buildUpState.availableOrders.filter((o) =>
      o.awb.includes(debouncedAwbSearch)
    )
  }, [buildUpState.availableOrders, debouncedAwbSearch])

  const filteredUlds = useMemo(() => {
    return buildUpState.ulds.filter((uld) => {
      const searchLower = debouncedUldSearch.toLowerCase()

      // Check if ULD number matches
      const uldNumberMatches = uld.uld.uld_number
        .toLowerCase()
        .includes(searchLower)

      // Check if any AWB in this ULD matches
      const awbMatches = uld.orders.some((order) =>
        order.awb.toLowerCase().includes(searchLower)
      )

      return uldNumberMatches || awbMatches
    })
  }, [buildUpState.ulds, debouncedUldSearch])

  if (isLoadingBuildUp || !selectedFlight) {
    return (
      <PerformanceMonitor id="build-up-section">
        <UldAssignmentSkeleton />
      </PerformanceMonitor>
    )
  }

  return (
    <PerformanceMonitor id="build-up-section">
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-clip">
        <div className="flex flex-row items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold">Build Up</h3>
              {selectedFlight && (
                <Badge
                  variant="chip-primary"
                  className="h-fit px-3 py-1 text-xs"
                >
                  {selectedFlight?.flight_number}
                </Badge>
              )}
              {/* Background sync status indicator */}
              {selectedFlight && !isFinalized && (
                <div className="flex items-center gap-2">
                  <SyncStatusIndicator
                    syncState={syncState}
                    onForceSync={forceSync}
                    compact
                  />
                  {/* Debug: Manual Force Sync button in development */}
                  {process.env.NODE_ENV === "development" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={forceSync}
                      className="h-6 px-2 text-xs"
                    >
                      Force Sync
                    </Button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Drag & drop shipments into available containers to build up flight{" "}
              {selectedFlight?.flight_number}
            </p>
          </div>
          <div className="flex flex-row items-center gap-2">
            {!isFinalized && (
              <>
                <FinalizeConfirmationDialog
                  availableOrders={buildUpState.availableOrders}
                  onConfirm={onFinalize}
                >
                  <Button
                    variant="button-primary"
                    isLoading={isFinalizing}
                    disabled={!selectedFlight}
                  >
                    <LockIcon className="mr-2 h-4 w-4" />
                    Finalize Build Up
                  </Button>
                </FinalizeConfirmationDialog>
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={onReset}
                >
                  <RotateCcwIcon className="h-4 w-4" />
                </Button>
              </>
            )}
            {isFinalized && selectedFlight && buildUpData?.build_up_data && (
              <>
                <Button
                  variant="outline"
                  disabled={!selectedFlight}
                  onClick={onReopen}
                >
                  <LockOpenIcon className="mr-2 h-4 w-4" />
                  Reopen Flight
                </Button>
                <Separator orientation="vertical" className="h-9" />
                <CargoManifestDialog
                  flight={selectedFlight}
                  buildUpData={buildUpData?.build_up_data}
                >
                  <Button variant="outline" disabled={!selectedFlight}>
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Preview Manifest
                  </Button>
                </CargoManifestDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="button-primary" disabled={!selectedFlight}>
                      <CircleCheckBigIcon className="mr-2 h-4 w-4" />
                      Manifest Shipment
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Manifest Flight {selectedFlight?.flight_number}?
                      </AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                      The FFM (Flight Freight Manifest), FWB (Freight Waybill),
                      and FHL (Freight House List) for flight{" "}
                      {selectedFlight?.flight_number} will be submitted.
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction>Manifest Flight</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
        <div className="flex max-h-screen w-full flex-1 flex-row items-stretch divide-x divide-border/50 overflow-clip">
          <div className="flex flex-1 flex-col gap-4 pr-5">
            <div className="flex flex-row gap-2">
              <Input
                value={awbSearch}
                onChange={(e) => setAwbSearch(e.target.value)}
                placeholder="Search Airway Bills..."
                className="h-9 bg-muted/15 pl-10"
                leftIcon={
                  <SearchIcon className="size-4 text-muted-foreground/80" />
                }
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 rounded-sm"
                    disabled={selectedOrders.length === 0}
                  >
                    Move Selected{" "}
                    <span className="ml-2 font-mono text-muted-foreground">
                      ({selectedOrders.length})
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-[400px] overflow-y-auto">
                  <DropdownMenuItem
                    key={"bulk-load"}
                    onClick={() => {
                      onAssignShipmentsToBulkLoad(selectedOrders)
                      setSelectedOrders([])
                    }}
                    className="font-mono"
                  >
                    Bulk Load
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    key={"offload"}
                    onClick={() => {
                      setOpenBulkOffload(true)
                    }}
                    className="font-mono"
                  >
                    Offload
                  </DropdownMenuItem>
                  {uldOptions.map((uld) => (
                    <DropdownMenuItem
                      key={uld.value}
                      onClick={() => {
                        onAssignShipmentsToUld(selectedOrders, uld.value)
                        setSelectedOrders([])
                      }}
                      className="font-mono"
                    >
                      {uld.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div
              className="custom-scrollbar max-h-[calc(100vh-48px-32px-36px-16px)] min-h-0 flex-1 !overflow-y-auto"
              onDrop={handleDragEnd}
              onDragOver={handleDragOver}
            >
              {selectedFlight && filteredAvailableOrders.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {filteredAvailableOrders?.map((shipment) => {
                    return (
                      <PerformanceMonitor
                        key={shipment.id}
                        id={`awb-card-${shipment.id}`}
                      >
                        <AwbCard
                          order={shipment}
                          onSelect={onToggleSelectedOrder}
                          isSelected={selectedOrders.includes(shipment)}
                          isFinalized={isFinalized}
                          onViewDetails={setOpenDetails}
                          onOffload={setOpenOffloadOrder}
                          onSplit={(order) => {
                            if (order.parent_order_shipment) {
                              setOpenSplitAwb(order.parent_order_shipment)
                            } else {
                              setOpenSplitAwb(order)
                            }
                            setSelectedOrders([])
                          }}
                          onUnsplit={onUnsplit}
                        />
                      </PerformanceMonitor>
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-md border border-dashed bg-muted/10 p-4">
                  <p className="text-sm text-muted-foreground">
                    {!selectedFlight
                      ? "Select a flight to view air waybills and begin build up process"
                      : "No air waybills available"}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex max-h-[calc(100vh-48px-32px)] min-h-0 flex-1 flex-col pl-5">
            <Tabs
              defaultValue="uld"
              className="flex h-full flex-1 flex-col gap-4"
            >
              <TabsList className="w-full gap-0 bg-transparent p-0 px-0">
                <TabsTrigger
                  className="h-9 flex-1 rounded-none rounded-tl-sm border-b border-secondary bg-muted/15 hover:bg-muted/30 data-[state=active]:border-button-primary data-[state=active]:bg-muted/30"
                  value={"uld"}
                >
                  <UldIcon className="mr-2 size-3.5 text-muted-foreground" />
                  ULDs{" "}
                  <span className="ml-1 font-mono text-xs text-muted-foreground">
                    ({buildUpState.ulds.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  className="h-9 flex-1 rounded-none rounded-tr-sm border-b border-secondary bg-muted/15 hover:bg-muted/30 data-[state=active]:border-button-primary data-[state=active]:bg-muted/30"
                  value={"bulk-load"}
                >
                  <BoxesIcon className="mr-2 size-3.5 text-muted-foreground" />
                  Bulk Load
                </TabsTrigger>
                <TabsTrigger
                  className="h-9 flex-1 rounded-none rounded-tr-sm border-b border-secondary bg-muted/15 hover:bg-muted/30 data-[state=active]:border-button-primary data-[state=active]:bg-muted/30"
                  value={"offloaded"}
                >
                  <PackageMinusIcon className="mr-2 size-3.5 text-muted-foreground" />
                  Offloaded
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="uld"
                className="min-h-0 flex-1 space-y-4 overflow-y-auto"
              >
                <div className="flex flex-row items-center gap-2">
                  <div className="flex-1">
                    <Input
                      value={uldSearch}
                      onChange={(e) => setUldSearch(e.target.value)}
                      placeholder="Search ULDs or AWBs..."
                      className="h-9 bg-muted/15 pl-10"
                      leftIcon={
                        <SearchIcon className="!focus-visible:ring-0 size-4 text-muted-foreground/80" />
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <AddUldDialog
                      open={addUldDialogOpen}
                      location={selectedFlight?.origin ?? null}
                      onOpenChange={setAddUldDialogOpen}
                      addedUlds={buildUpState.ulds}
                      onAdd={(data) => {
                        onAddUlds(data)
                        setAddUldDialogOpen(false)
                      }}
                    >
                      <Button
                        variant="outline"
                        size={"fit"}
                        disabled={isFinalized}
                        className="!h-9 w-full rounded-sm px-6"
                      >
                        <PlusIcon className="mr-2 size-4" />
                        Add ULD
                      </Button>
                    </AddUldDialog>
                  </div>
                </div>

                {filteredUlds.map((item, index) => {
                  const orders = item.orders
                  const uld = item.uld

                  return (
                    <UldCard
                      key={uld.id}
                      id={uld.id}
                      orders={orders}
                      uld={uld}
                      onRemoveUld={onRemoveUld}
                      onRemoveOrder={(shipments) =>
                        onUnassignShipmentsFromUld([shipments], uld.id)
                      }
                      onAssignOrder={onAssignShipmentsToUld}
                      isFinalized={isFinalized}
                    />
                  )
                })}
              </TabsContent>
              <TabsContent
                value="bulk-load"
                className="min-h-0 flex-1 space-y-4 overflow-y-auto"
              >
                <BulkLoadCard
                  id={"bulk-load"}
                  isFinalized={isFinalized}
                  orders={buildUpState.bulkLoadOrders}
                  onRemoveOrder={(shipment) =>
                    onUnassignShipmentsFromBulkLoad([shipment])
                  }
                  onAssignOrder={(shipments) =>
                    onAssignShipmentsToBulkLoad(shipments)
                  }
                  maxWeight={Number(
                    selectedFlight?.tail?.total_max_weight || 0
                  )}
                />
              </TabsContent>
              <TabsContent
                value="offloaded"
                className="min-h-0 flex-1 space-y-4 overflow-y-auto"
              >
                <OffloadedCard
                  id={"offloaded"}
                  isFinalized={isFinalized}
                  offloadedOrders={buildUpState.offloadedOrders}
                  onCancelOffload={(shipment) => onCancelOffload(shipment)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <ShipmentDetailsDialog
          open={!!openDetails}
          onOpenChange={(open) => {
            if (!open) setOpenDetails(null)
          }}
          order={openDetails}
        />
        <OffloadOrderDialog
          open={!!openOffloadOrder}
          onOpenChange={(open) => {
            if (!open) setOpenOffloadOrder(null)
          }}
          order={openOffloadOrder}
          onOffload={onOffloadOrder}
        />
        <BulkOffloadDialog
          open={openBulkOffload}
          onOpenChange={setOpenBulkOffload}
          orders={selectedOrders}
          onBulkOffload={onBulkOffloadOrders}
        />
        <SplitAwbDialog
          open={!!openSplitAwb}
          onOpenChange={(open) => {
            if (!open) setOpenSplitAwb(null)
          }}
          order={openSplitAwb || null}
          onConfirmSplit={onConfirmSplit}
          initialSplitGroups={getInitialSplitGroups()}
          buildUpState={buildUpState}
        />
        <AlertDialog
          open={!!uldToRemove}
          onOpenChange={(open) => !open && setUldToRemove(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove ULD?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              Are you sure you want to remove this ULD? All assigned shipments
              will be moved back to the available orders list.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUldToRemove(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmRemoveUld}>
                Remove ULD
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={!!orderToUnsplit}
          onOpenChange={(open) => !open && setOrderToUnsplit(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsplit AWB?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              Are you sure you want to unsplit AWB {orderToUnsplit?.awb}? This
              will combine all split groups back into the original shipment and
              remove all split assignments.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOrderToUnsplit(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmUnsplit}>
                Unsplit AWB
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PerformanceMonitor>
  )
}

// Helper function to merge shipments with the same order_id
// Placed outside component to avoid re-initialization on re-renders
function mergeShipmentsByOrderId(
  shipments: OrderShipmentData[]
): OrderShipmentData[] {
  const grouped = shipments.reduce(
    (acc, shipment) => {
      if (!acc[shipment.order_id]) {
        acc[shipment.order_id] = []
      }
      acc[shipment.order_id].push(shipment)
      return acc
    },
    {} as Record<string, OrderShipmentData[]>
  )

  return Object.values(grouped).map((group) => {
    if (group.length === 1) return group[0]

    const firstItem = group[0]

    // Merge multiple shipments with same order_id
    const merged: OrderShipmentData = {
      ...firstItem,
      // Aggregate numeric values
      pieces: group.reduce((sum, s) => sum + Number(s.pieces || 0), 0),
      weight_kg: group.reduce((sum, s) => sum + Number(s.weight_kg || 0), 0),
      volume_m3: group.reduce((sum, s) => sum + (Number(s.volume_m3) || 0), 0),
      // Keep first shipment's ID as the primary ID
      id: firstItem.id,
    }
    return merged
  })
}

type FinalizeConfirmationDialogProps = PropsWithChildren & {
  onConfirm: (offloadRemainingOrders: boolean) => void
  availableOrders: OrderShipmentData[]
}

function FinalizeConfirmationDialog(props: FinalizeConfirmationDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{props.children}</AlertDialogTrigger>
      <AlertDialogContent className="!w-fit max-w-[600px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Finalize Flight Build Up?</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          You are about to finalise the build-up for this flight. You may reopen
          the flight up until departure to make edits and additions.
        </AlertDialogDescription>
        {props.availableOrders.length > 0 ? (
          <>
            <AlertDialogDescription className="text-red-500">
              <span className="font-semibold">Warning:</span> There are{" "}
              {props.availableOrders.length} shipment(s) remaining on the
              build-up list. Do you wish to offload these remaining orders to
              the lying list?
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant={"secondary"}
                onClick={() => props.onConfirm(false)}
              >
                No, Keep Remaining Orders
              </AlertDialogAction>
              <AlertDialogAction onClick={() => props.onConfirm(true)}>
                Yes, Offload Remaining Orders
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => props.onConfirm(false)}>
                Finalize
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}

function moveOrderShipments(
  source: OrderShipmentData[],
  target: OrderShipmentData[],
  orders: OrderShipmentData[]
): [OrderShipmentData[], OrderShipmentData[]] {
  // Create a Set of order IDs to move for faster lookup
  const orderIdsToMove = new Set(orders.map((order) => order.id))

  // Filter out orders that are being moved from source
  const sourceWithoutOrders = source.filter(
    (item) => !orderIdsToMove.has(item.id)
  )

  console.log({ target, orders })

  // Add orders to target, avoiding duplicates
  const targetWithOrderObjectSet = new ObjectSet<OrderShipmentData>("id")
  targetWithOrderObjectSet.addAll([...target, ...orders])
  const targetWithOrders = targetWithOrderObjectSet.getItems()

  return [sourceWithoutOrders, targetWithOrders]
}
