import { memo, useMemo } from "react"
import {
  EllipsisIcon,
  EyeIcon,
  PackageMinusIcon,
  SquareSplitHorizontalIcon,
  UndoIcon,
} from "lucide-react"

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
import { Checkbox } from "@/components/ui/checkbox"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { UnitText } from "@/components/ui/unit-text"

import { calculateTotals } from "../lib/utils"
import { OrderShipmentData } from "../types/build-up"

type AwbCardProps = {
  order: OrderShipmentData
  onSelect: (order: OrderShipmentData) => void
  isSelected: boolean
  isFinalized: boolean
  onViewDetails: (order: OrderShipmentData) => void
  onOffload: (order: OrderShipmentData) => void
  onSplit: (order: OrderShipmentData) => void
  onUnsplit: (order: OrderShipmentData) => void
}

function AwbCard(props: AwbCardProps) {
  const {
    order,
    onSelect,
    isSelected,
    isFinalized,
    onViewDetails,
    onOffload,
    onSplit,
    onUnsplit,
  } = props

  const isSplit = order.pieces < order.total_pieces
  const isReplanned =
    order.is_replanned || order.parent_order_shipment?.is_replanned

  const AWB_ACTIONS = useMemo(() => {
    const splitActions = isSplit
      ? [
          {
            label: "Unsplit AWB",
            icon: <UndoIcon className="mr-2 size-4 text-muted-foreground" />,
            onClick: () => onUnsplit(order),
          },
          {
            label: "Adjust Split",
            icon: (
              <SquareSplitHorizontalIcon className="mr-2 size-4 text-muted-foreground" />
            ),
            onClick: () => onSplit(order),
          },
        ]
      : [
          {
            label: "Split AWB",
            icon: (
              <SquareSplitHorizontalIcon className="mr-2 size-4 text-muted-foreground" />
            ),
            onClick: () => onSplit(order),
          },
        ]

    return [
      {
        label: "View Details",
        icon: <EyeIcon className="mr-2 size-4 text-muted-foreground" />,
        onClick: () => onViewDetails(order),
      },
      ...splitActions,
      {
        label: "Offload to Lying List",
        icon: (
          <PackageMinusIcon className="mr-2 size-4 text-muted-foreground" />
        ),
        onClick: () => onOffload(order),
      },
    ]
  }, [order, onViewDetails, onSplit, onOffload, isSplit, onUnsplit])

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("order", JSON.stringify(order))
  }

  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>
        <Card
          onDragStart={(e) => handleDragStart(e)}
          draggable={!isFinalized}
          onClick={() => !isFinalized && onSelect(order)}
          className={cn(
            "flex flex-row transition-colors duration-200 hover:bg-muted/15",
            !isFinalized && "cursor-grab active:cursor-grabbing"
          )}
        >
          <Checkbox checked={isSelected} className="ml-4 mt-[18px]" />
          <div className="flex flex-1 flex-col">
            <CardHeader className="w-full space-y-0.5">
              <div className="flex w-full items-start justify-between gap-2">
                <div className="flex w-full items-center gap-2">
                  <div className="mt-0.5 space-y-1">
                    <CardTitle className="tabular-nums">{order.awb}</CardTitle>
                    <CardDescription className="text-xs">
                      {order.agent || order.consignor}
                    </CardDescription>
                  </div>
                  {/* <Badge variant="chip-primary" className="text-xs">
                    Accepted
                  </Badge> */}
                </div>
                <div className="flex flex-row items-center gap-2">
                  {isReplanned && (
                    <Badge
                      variant="outline"
                      className="border-yellow-500/20 bg-yellow-500/10 font-mono text-xs text-orange-500"
                    >
                      Replanned
                    </Badge>
                  )}
                  {isSplit && (
                    <Badge
                      variant="outline"
                      className="border-yellow-500/20 bg-yellow-500/10 font-mono text-xs text-yellow-500"
                    >
                      Split
                    </Badge>
                  )}
                  {!isFinalized && (
                    <Button
                      variant="outline"
                      size={"sm"}
                      className="h-fit p-1 px-3 pl-2.5"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onSplit(order)
                      }}
                      disabled={isFinalized}
                    >
                      <SquareSplitHorizontalIcon className="mr-1.5 size-3.5 text-muted-foreground" />
                      {isSplit && !isReplanned ? "Adjust Split" : "Split AWB"}
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size={"fit"}
                        className="p-1"
                        disabled={isFinalized}
                      >
                        <EllipsisIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {AWB_ACTIONS.map((action) => (
                        <DropdownMenuItem
                          key={action.label}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            action.onClick()
                          }}
                        >
                          {action.icon}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-row gap-2 text-xs">
                  <span className="text-muted-foreground">Pieces</span>
                  <span className="text-muted-foreground">:</span>
                  <UnitText className="font-medium" unit="pcs">
                    {order.pieces}
                    {isSplit && !isReplanned && (
                      <>
                        <span className="text-muted-foreground"> / </span>
                        <span>{order.total_pieces}</span>
                      </>
                    )}
                  </UnitText>
                </div>
                <div className="flex flex-row gap-2 text-xs">
                  <span className="text-muted-foreground">Weight</span>
                  <span className="text-muted-foreground">:</span>
                  <UnitText className="font-medium" unit="kg">
                    {formatDecimal(Number(order.weight_kg))}
                  </UnitText>
                </div>
                <div className="flex flex-row gap-2 text-xs">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="text-muted-foreground">:</span>
                  <UnitText className="font-medium" unit="m3">
                    {formatDecimal(Number(order.volume_m3)) || "~"}
                  </UnitText>
                </div>
              </div>
              {order.special_handling_codes &&
                order.special_handling_codes.length > 0 && (
                  <div className="flex flex-row flex-wrap gap-1.5">
                    {order.special_handling_codes.map((code) => (
                      <Tooltip key={code.id}>
                        <TooltipTrigger>
                          <Badge
                            variant="chip-secondary"
                            className="h-fit px-2 py-0.5 font-mono !text-xs"
                          >
                            {code.code}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{code.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}
            </CardContent>
          </div>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {AWB_ACTIONS.map((action) => (
          <ContextMenuItem key={action.label} onClick={action.onClick}>
            {action.icon}
            {action.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default memo(AwbCard)
