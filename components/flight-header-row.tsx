"use client"

import { Plane, Calendar, Package, Users, Clock, FileText, ArrowRight } from "lucide-react"
import { EditableField } from "./editable-field"
import type { LoadPlanDetail } from "./load-plan-types"

interface FlightHeaderRowProps {
  plan: LoadPlanDetail
  onFieldUpdate: (field: keyof LoadPlanDetail, value: string) => void
  isReadOnly: boolean
}

/**
 * TTL PLN ULD Display Component
 * Shows original value with strikethrough and adjusted value when different
 */
function TtlPlnUldDisplay({ original, adjusted }: { original: string; adjusted?: string }) {
  // If no adjusted value or they're the same, just show original
  if (!adjusted || adjusted === original) {
    return (
      <span className="text-gray-700 font-semibold text-sm">
        {original || "-"}
      </span>
    )
  }
  
  // Show strikethrough original with adjusted value
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 line-through text-sm">
        {original}
      </span>
      <ArrowRight className="w-3 h-3 text-gray-400" />
      <span className="text-green-700 font-semibold text-sm">
        {adjusted}
      </span>
    </div>
  )
}

export function FlightHeaderRow({ plan, onFieldUpdate, isReadOnly }: FlightHeaderRowProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      {/* Header Labels Row */}
      <div className="grid grid-cols-[1fr_0.8fr_1fr_1fr_1.5fr_0.8fr_1fr_1fr] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Flight</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Date</span>
        </div>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">ACFT TYPE</span>
        </div>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">ACFT REG</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Route</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">STD</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">TTL PLN ULD</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">ULD Version</span>
        </div>
      </div>
      {/* Data Row */}
      <div className="grid grid-cols-[1fr_0.8fr_1fr_1fr_1.5fr_0.8fr_1fr_1fr] gap-2 px-3 py-3">
        <EditableField
          value={plan.flight}
          onChange={(value) => onFieldUpdate("flight", value)}
          className="font-semibold text-gray-900"
          readOnly={isReadOnly}
        />
        <EditableField
          value={plan.date}
          onChange={(value) => onFieldUpdate("date", value)}
          className="text-gray-700"
          readOnly={isReadOnly}
        />
        <EditableField
          value={plan.acftType}
          onChange={(value) => onFieldUpdate("acftType", value)}
          className="text-gray-700"
          readOnly={isReadOnly}
        />
        <EditableField
          value={plan.acftReg}
          onChange={(value) => onFieldUpdate("acftReg", value)}
          className="text-gray-700"
          readOnly={isReadOnly}
        />
        <EditableField
          value={plan.pax}
          onChange={(value) => onFieldUpdate("pax", value)}
          className="text-gray-700"
          readOnly={isReadOnly}
        />
        <EditableField
          value={plan.std}
          onChange={(value) => onFieldUpdate("std", value)}
          className="text-gray-700"
          readOnly={isReadOnly}
        />
        <TtlPlnUldDisplay 
          original={plan.ttlPlnUld} 
          adjusted={plan.adjustedTtlPlnUld}
        />
        <EditableField
          value={plan.uldVersion}
          onChange={(value) => onFieldUpdate("uldVersion", value)}
          className="text-gray-700"
          readOnly={isReadOnly}
        />
      </div>
    </div>
  )
}

