import { useMemo } from "react"
import { PackageIcon, SplitSquareVerticalIcon } from "lucide-react"

import { Order } from "@/types/orders"
import { formatDecimal } from "@/lib/utils/number-utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UnitText } from "@/components/ui/unit-text"

import { BuildUpDataState, OrderShipmentData } from "../types/build-up"
import { SimpleSplitTab } from "./section-simple-awb-split"

type SplitAwbDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: OrderShipmentData | null
  onConfirmSplit: (data: OrderShipmentData[], orderId: string) => void
  initialSplitGroups?: OrderShipmentData[]
  buildUpState?: BuildUpDataState
}

export default function SplitAwbDialog(props: SplitAwbDialogProps) {
  const {
    open,
    onOpenChange,
    order,
    onConfirmSplit,
    initialSplitGroups,
    buildUpState,
  } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex !max-h-[calc(100vh-32px)] min-h-[650px] min-w-[600px] flex-col"
        hideCloseButton
      >
        <DialogHeader>
          <div className="flex flex-row items-center gap-2">
            <SplitSquareVerticalIcon className="size-5 text-muted-foreground" />
            <DialogTitle className="tabular-nums">Split AWB</DialogTitle>
            <Separator orientation="vertical" className="h-4" />
            <DialogTitle className="tabular-nums text-muted-foreground">
              {order?.awb}
            </DialogTitle>
          </div>
        </DialogHeader>
        <Tabs
          defaultValue="simple"
          className="flex min-h-0 flex-1 flex-col space-y-4"
        >
          {/* <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="simple">
              Simple Split
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="advanced">
              Advanced Split
            </TabsTrigger>
          </TabsList> */}
          {order && <OriginalOrderInfoCard order={order} />}
          <TabsContent value="simple" asChild>
            {open && (
              <SimpleSplitTab
                order={order}
                onConfirmSplit={onConfirmSplit}
                onOpenChange={onOpenChange}
                initialSplitGroups={initialSplitGroups}
                buildUpState={buildUpState}
              />
            )}
          </TabsContent>
          {/* <TabsContent value="advanced" asChild>
            <AdvancedSplitTab
              order={order}
              onConfirmSplit={onConfirmSplit}
              onOpenChange={onOpenChange}
              initialSplitGroups={initialSplitGroups}
            />
          </TabsContent> */}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function OriginalOrderInfoCard(props: { order: OrderShipmentData }) {
  const { order } = props

  // const isHawb = order.hawbs?.length > 0

  // const parcels = useMemo(() => {
  //   if (!order) return []
  //   return getOrderParcels(order)
  // }, [order])

  // const { pieceCount, totalWeight } = useMemo(() => {
  //   return calculateTotals(order)
  // }, [order])

  return (
    <Card className="flex flex-col gap-4 bg-muted/15 p-4">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">
            Original AWB
          </span>
          <span className="text-sm tabular-nums">{order?.awb}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">
            Total
          </span>
          <div className="flex flex-row items-center gap-2">
            <UnitText unit="pcs" className="text-sm font-medium tabular-nums">
              {order.total_pieces}
            </UnitText>
            <Separator orientation="vertical" className="h-4" />
            <UnitText unit="kg" className="text-sm font-medium tabular-nums">
              {order.total_weight_kg}
            </UnitText>
          </div>
        </div>
      </div>
      {/* <Accordion type="single" collapsible>
        <AccordionItem value="hawbs" className="border-b-0">
          <AccordionTrigger className="w-fit border-b-0 p-0 hover:no-underline [&_svg]:!text-muted-foreground">
            <div className="flex flex-row items-center gap-1.5">
              <PackageIcon className="size-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {isHawb ? "HAWBs" : "Piece Details"} ({parcels.length})
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="w-full pb-0">
            <div className="mt-2 flex w-full flex-col gap-2">
              {isHawb ? (
                <>
                  {order.hawbs.map((hawb) => {
                    const qty = hawb.parcels.reduce((acc, parcel) => {
                      return acc + Number(parcel.qty)
                    }, 0)
                    const weight = hawb.parcels.reduce((acc, parcel) => {
                      return acc + Number(parcel.weight_kg) * Number(parcel.qty)
                    }, 0)
                    return (
                      <div
                        className="flex w-full flex-row items-center justify-between gap-2 text-xs"
                        key={hawb.id}
                      >
                        <span className="tabular-nums">{hawb.hawb}</span>
                        <div className="flex flex-row items-center gap-2">
                          <UnitText unit="pcs" className="tabular-nums">
                            {qty}
                          </UnitText>
                          <Separator orientation="vertical" className="h-4" />
                          <UnitText unit="kg" className="tabular-nums">
                            {formatDecimal(weight)}
                          </UnitText>
                        </div>
                      </div>
                    )
                  })}
                </>
              ) : (
                <>
                  {parcels.map((parcel, index) => (
                    <div
                      className="flex w-full flex-row items-center justify-between gap-2 text-xs"
                      key={parcel.id}
                    >
                      <span className="tabular-nums">Item {index + 1}</span>
                      <div className="flex flex-row items-center gap-2">
                        <UnitText unit="pcs" className="tabular-nums">
                          {parcel.qty}
                        </UnitText>
                        <Separator orientation="vertical" className="h-4" />
                        <UnitText unit="kg" className="tabular-nums">
                          {formatDecimal(
                            Number(parcel.weight_kg) * Number(parcel.qty)
                          )}
                        </UnitText>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion> */}
    </Card>
  )
}
