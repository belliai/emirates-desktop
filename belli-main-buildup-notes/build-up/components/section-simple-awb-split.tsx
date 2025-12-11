import { useCallback, useEffect, useMemo, useRef } from "react"
import {
  BoxesIcon,
  CheckCircleIcon,
  CircleAlertIcon,
  FilePen,
  PackageMinusIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { DefaultValues, useFieldArray, useForm } from "react-hook-form"

import { Order } from "@/types/orders"
import { UldIcon } from "@/lib/icons/UldIcon"
import { cn } from "@/lib/utils"
import { formatDecimal } from "@/lib/utils/number-utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DialogFooter } from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Unit, UnitText } from "@/components/ui/unit-text"
import InputSwitch from "@/components/form/InputSwitch"

import { calculateTotals } from "../lib/utils"
import { OrderShipmentData, SplitGroup } from "../types/build-up"

type SimpleSplitGroup = {
  id: string
  weight_kg: number
  pieces: number
  assignment?: {
    type: "uld" | "bulk" | "offloaded"
    id: string
    name: string
  }
}

type SimpleSplitFormValues = {
  simple_split_groups: SimpleSplitGroup[]
}

const getInitialValues = () => {
  return {
    simple_split_groups: [
      {
        id: crypto.randomUUID(),
      },
    ],
  }
}

type SimpleSplitTabProps = {
  order: OrderShipmentData | null
  onConfirmSplit: (data: OrderShipmentData[], orderId: string) => void
  onOpenChange: (open: boolean) => void
  initialSplitGroups?: OrderShipmentData[]
  buildUpState?: {
    ulds: {
      uld: { id: string; uld_number: string }
      orders: OrderShipmentData[]
    }[]
    bulkLoadOrders: OrderShipmentData[]
    offloadedOrders: { shipment: OrderShipmentData; remarks: string }[]
  }
}

const getInitialFormValues = (
  initialSplitGroups?: OrderShipmentData[],
  buildUpState?: SimpleSplitTabProps["buildUpState"]
) => {
  if (!initialSplitGroups || initialSplitGroups.length < 2)
    return getInitialValues()

  return {
    simple_split_groups: initialSplitGroups.map((group) => {
      let assignment: SimpleSplitGroup["assignment"] | undefined

      // Check if the group is assigned to a ULD
      if (buildUpState) {
        const uldAssignment = buildUpState.ulds.find((uld) =>
          uld.orders.some((order) => order.id === group.id)
        )
        if (uldAssignment) {
          assignment = {
            type: "uld",
            id: uldAssignment.uld.id,
            name: uldAssignment.uld.uld_number,
          }
        } else {
          // Check if it's in bulk load
          const isBulkLoad = buildUpState.bulkLoadOrders.some(
            (order) => order.id === group.id
          )
          if (isBulkLoad) {
            assignment = {
              type: "bulk",
              id: "bulk-load",
              name: "Bulk Load",
            }
          } else {
            // Check if it's offloaded
            const isOffloaded = buildUpState.offloadedOrders.some(
              (o) => o.shipment.id === group.id
            )
            if (isOffloaded) {
              assignment = {
                type: "offloaded",
                id: "offloaded",
                name: "Offloaded",
              }
            }
          }
        }
      }

      return {
        id: group.id,
        weight_kg: Number(group.weight_kg),
        pieces: Number(group.pieces),
        assignment,
      }
    }),
  }
}

export function SimpleSplitTab({
  order,
  onConfirmSplit,
  onOpenChange,
  initialSplitGroups,
  buildUpState,
}: SimpleSplitTabProps) {
  const form = useForm<SimpleSplitFormValues>({
    defaultValues: getInitialFormValues(initialSplitGroups, buildUpState),
  })

  const { setValue } = form
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  const onReset = useCallback(() => {
    form.reset(getInitialValues())
  }, [form])

  // useEffect(() => {
  //   if (initialSplitGroups && initialSplitGroups.length > 1) {
  //     form.reset({
  //       simple_split_groups: initialSplitGroups.map((group) => ({
  //         id: group.id,
  //         weight_kg: Number(group.weight_kg),
  //         pieces: Number(group.pieces),
  //       })),
  //     })
  //   }
  // }, [initialSplitGroups])

  const splitGroups = form.watch("simple_split_groups")

  const stringifiedSplitGroups = JSON.stringify(splitGroups)

  const { totalWeight, totalPieces } = useMemo(() => {
    const parsedSplitGroups = JSON.parse(
      stringifiedSplitGroups
    ) as SimpleSplitGroup[]
    return parsedSplitGroups.reduce(
      (
        acc: { totalWeight: number; totalPieces: number },
        group: SimpleSplitGroup
      ) => {
        return {
          totalWeight: formatDecimal(
            acc.totalWeight + Number(group.weight_kg || 0)
          ),
          totalPieces: formatDecimal(
            acc.totalPieces + Number(group.pieces || 0)
          ),
        }
      },
      { totalWeight: 0, totalPieces: 0 }
    )
  }, [stringifiedSplitGroups])

  const { remainingWeight, remainingPieces } = useMemo(() => {
    return {
      remainingWeight: formatDecimal(
        Number(order?.total_weight_kg) - totalWeight
      ),
      remainingPieces: formatDecimal(Number(order?.total_pieces) - totalPieces),
    }
  }, [order, totalWeight, totalPieces])

  const hasRemainingWeightOrPieces = remainingWeight > 0 || remainingPieces > 0

  const hasNegativeRemainingWeightOrPieces =
    remainingWeight < 0 || remainingPieces < 0

  const isInvalid =
    hasNegativeRemainingWeightOrPieces ||
    splitGroups.some(
      (group) => (group.weight_kg || 0) <= 0 || (group.pieces || 0) <= 0
    )

  const onSubmit = useCallback(
    (data: SimpleSplitFormValues) => {
      if (!order) return
      const baseShipment = order
      if (!baseShipment) return

      let splitGroups: OrderShipmentData[] = data.simple_split_groups.map(
        (group) => ({
          ...baseShipment,
          id: group.id || crypto.randomUUID(),
          pieces: group.pieces,
          weight_kg: group.weight_kg,
          volume_m3: undefined,
          is_split: true,
        })
      )

      // If there are remaining weight or pieces, create an additional split group
      if (
        hasRemainingWeightOrPieces &&
        (remainingWeight > 0 || remainingPieces > 0)
      ) {
        const remainingGroup: OrderShipmentData = {
          ...baseShipment,
          id: crypto.randomUUID(),
          pieces: remainingPieces,
          weight_kg: remainingWeight,
          volume_m3: undefined,
          is_split: true,
        }
        splitGroups.push(remainingGroup)
      }

      onConfirmSplit(splitGroups, order.order_id)
      onOpenChange(false)
    },
    [
      onConfirmSplit,
      onOpenChange,
      order,
      hasRemainingWeightOrPieces,
      remainingWeight,
      remainingPieces,
    ]
  )

  const isPrevFromLastIndexFilled = useMemo(() => {
    const parsedSplitGroups = JSON.parse(
      stringifiedSplitGroups
    ) as SimpleSplitGroup[]

    if (parsedSplitGroups.length === 1) return false

    return parsedSplitGroups
      .slice(0, -1)
      .every((group) => group.weight_kg && group.pieces)
  }, [stringifiedSplitGroups])

  const splitGroupFieldArray = useFieldArray({
    control: form.control,
    name: "simple_split_groups",
  })

  const onRemoveSplitGroup = useCallback(
    (index: number) => {
      splitGroupFieldArray.remove(index)
    },
    [splitGroupFieldArray]
  )

  const onAutoFillRemaining = useCallback(() => {
    const lastGroup =
      splitGroupFieldArray.fields[splitGroupFieldArray.fields.length - 1]
    if (!lastGroup) return

    lastGroup.weight_kg = remainingWeight
    lastGroup.pieces = remainingPieces

    setValue(`simple_split_groups.${splitGroupFieldArray.fields.length - 1}`, {
      id: lastGroup.id,
      weight_kg: remainingWeight,
      pieces: remainingPieces,
    })
  }, [remainingWeight, remainingPieces, setValue, splitGroupFieldArray])

  const getCardDescription = useCallback(() => {
    if (hasNegativeRemainingWeightOrPieces)
      return "Totals of split group exceeds original total weight and pieces."
    if (hasRemainingWeightOrPieces)
      return "Remaining weight and pieces will be automatically allocated as a separate split group."
    if (
      splitGroups.some(
        (group) => (group.weight_kg || 0) <= 0 || (group.pieces || 0) <= 0
      )
    )
      return "Weight and pieces cannot be 0 or negative."
    return "All weight and pieces have been allocated."
  }, [
    hasRemainingWeightOrPieces,
    hasNegativeRemainingWeightOrPieces,
    splitGroups,
  ])

  const estimatedPerPieceWeight = useMemo(() => {
    return formatDecimal(
      Number(order?.total_weight_kg || 0) / Number(order?.total_pieces || 0)
    )
  }, [order])

  const handlePiecesChange = useCallback(
    (index: number, value: string) => {
      const pieces = Number(value)
      setValue(`simple_split_groups.${index}.pieces`, pieces)

      // Clear any existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Set a new timeout for auto-calculation
      debounceTimeoutRef.current = setTimeout(() => {
        const currentRowWeight = Number(splitGroups[index].weight_kg)
        if (currentRowWeight) return

        const weight = formatDecimal(pieces * estimatedPerPieceWeight)
        const weightToSet =
          weight > remainingWeight || pieces === remainingPieces
            ? remainingWeight
            : weight
        setValue(`simple_split_groups.${index}.weight_kg`, weightToSet)
      }, 500) // 500ms delay
    },
    [
      setValue,
      splitGroups,
      estimatedPerPieceWeight,
      remainingWeight,
      remainingPieces,
    ]
  )

  const handleWeightChange = useCallback(
    (index: number, value: string) => {
      const weight = Number(value)
      setValue(`simple_split_groups.${index}.weight_kg`, weight)

      // Clear any existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Set a new timeout for auto-calculation
      debounceTimeoutRef.current = setTimeout(() => {
        const currentRowPieces = Number(splitGroups[index].pieces)
        if (currentRowPieces) return

        const pieces = Math.round(weight / estimatedPerPieceWeight)
        setValue(`simple_split_groups.${index}.pieces`, pieces)
      }, 500) // 500ms delay
    },
    [setValue, splitGroups, estimatedPerPieceWeight]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return (
    <Form {...form}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <Card
          className={cn(
            "border-green-500/50 bg-green-500/10",
            hasRemainingWeightOrPieces &&
              "border-yellow-400/50 bg-yellow-400/10",
            hasNegativeRemainingWeightOrPieces &&
              "border-red-500/50 bg-red-500/10"
          )}
        >
          <CardHeader className="flex flex-row items-start justify-start gap-4 space-y-0">
            {isInvalid ? (
              <CircleAlertIcon
                className={cn(
                  "mt-0.5 size-4 text-red-500",
                  hasRemainingWeightOrPieces && "text-yellow-400",
                  hasNegativeRemainingWeightOrPieces && "text-red-500"
                )}
              />
            ) : (
              <CheckCircleIcon className="mt-0.5 size-4 text-green-500" />
            )}
            <div className="flex flex-1 flex-col items-stretch gap-1">
              <div className="flex flex-1 flex-row items-center justify-between space-y-0">
                <CardTitle
                  className={cn(
                    "text-sm text-green-500",
                    hasRemainingWeightOrPieces && "text-yellow-400",
                    hasNegativeRemainingWeightOrPieces && "text-red-500"
                  )}
                >
                  Remaining weight and pieces
                </CardTitle>
                <div className="flex flex-row items-center gap-2">
                  <CardTitle className="text-sm">
                    <UnitText unit="pcs" className="text-sm font-medium">
                      {remainingPieces}
                    </UnitText>
                  </CardTitle>
                  <Separator orientation="vertical" className="h-4" />
                  <CardTitle className="text-sm">
                    <UnitText unit="kg" className="text-sm font-medium">
                      {remainingWeight}
                    </UnitText>
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="text-xs">
                {getCardDescription()}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
        <Separator />

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {splitGroupFieldArray.fields.map((field, index) => {
            const values = splitGroups[index]
            const isValuesFilled = values.weight_kg || values.pieces
            const isEnableAutoFill =
              index !== 0 &&
              index === splitGroups.length - 1 &&
              isPrevFromLastIndexFilled &&
              !isValuesFilled

            const getAssignmentIcon = () => {
              if (!values.assignment) return null
              switch (values.assignment.type) {
                case "uld":
                  return <UldIcon className="size-3.5 text-muted-foreground" />
                case "bulk":
                  return (
                    <BoxesIcon className="size-3.5 text-muted-foreground" />
                  )
                case "offloaded":
                  return (
                    <PackageMinusIcon className="size-3.5 text-muted-foreground" />
                  )
              }
            }

            const getAssignmentLabel = () => {
              if (!values.assignment) return null
              switch (values.assignment.type) {
                case "uld":
                  return `${values.assignment.name}`
                case "bulk":
                  return "Bulk Load"
                case "offloaded":
                  return "Offloaded"
              }
            }

            return (
              <Card key={field.id} className="divide-y">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/80 py-2 dark:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">Group {index + 1}</CardTitle>
                    {values.assignment && (
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1 text-xs text-muted-foreground"
                      >
                        {getAssignmentIcon()}
                        {getAssignmentLabel()}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-row items-center gap-2">
                    {isEnableAutoFill && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="fit"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            disabled={splitGroupFieldArray.fields.length === 1}
                            onClick={onAutoFillRemaining}
                          >
                            <FilePen className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Auto fill remaining weight and pieces</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Button
                      variant="ghost"
                      size="fit"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={splitGroupFieldArray.fields.length === 1}
                      onClick={() => onRemoveSplitGroup(index)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 py-4 pt-2">
                  <InputSwitch
                    label="Pieces"
                    name={`simple_split_groups.${index}.pieces`}
                    type="number-parsed"
                    className="bg-muted/15"
                    placeholder={"0"}
                    value={values.pieces ? Number(values.pieces) : undefined}
                    // onChange={(e) => handlePiecesChange(index, e.target.value)}
                    rightIcon={<Unit>pcs</Unit>}
                  />
                  <InputSwitch
                    label="Weight"
                    name={`simple_split_groups.${index}.weight_kg`}
                    type="number-parsed"
                    className="bg-muted/15"
                    placeholder={"0"}
                    value={
                      values.weight_kg ? Number(values.weight_kg) : undefined
                    }
                    // onChange={(e) => handleWeightChange(index, e.target.value)}
                    rightIcon={<Unit>kg</Unit>}
                  />
                </CardContent>
              </Card>
            )
          })}
          <Button
            variant="secondary"
            className="mt-1"
            onClick={() =>
              splitGroupFieldArray.append({
                id: crypto.randomUUID(),
                weight_kg: 0,
                pieces: 0,
              })
            }
          >
            <PlusIcon className="mr-2 size-4" /> Add Group
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Separator orientation="vertical" className="h-9" />
          <Button variant="secondary" onClick={onReset}>
            Reset
          </Button>
          <Button
            variant="button-primary"
            disabled={isInvalid}
            onClick={form.handleSubmit(onSubmit)}
          >
            Confirm Split
          </Button>
        </DialogFooter>
      </div>
    </Form>
  )
}
