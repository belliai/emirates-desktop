"use client"

import { useState } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "./editable-field"

type UWSDelayEntry = {
  slNo: number
  flightNumber: string
  date: string
  std: string
  routing: string
  uwsLmcNorms: string
  uwsLmcActual: string
  delayedBy: string
  delayReason: string
  shift: string
  actionTaken: string
  delayedDueLateUWS: "Yes" | "NO"
}

interface UWSDelayReportModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UWSDelayReportModal({ isOpen, onClose }: UWSDelayReportModalProps) {
  const [entries, setEntries] = useState<UWSDelayEntry[]>([
    {
      slNo: 1,
      flightNumber: "EK213",
      date: "14OCT",
      std: "2:15",
      routing: "MIA-BOG",
      uwsLmcNorms: "0:45",
      uwsLmcActual: "1:05",
      delayedBy: "0:20",
      delayReason: "LMC 01 PRINTED ADDITIONAL AXA AKE43833EK UPLIFTED.",
      shift: "2",
      actionTaken: "Authorised P&D Officer",
      delayedDueLateUWS: "NO",
    },
    {
      slNo: 2,
      flightNumber: "",
      date: "14OCT",
      std: "",
      routing: "",
      uwsLmcNorms: "22:30",
      uwsLmcActual: "",
      delayedBy: "1:30",
      delayReason: "",
      shift: "",
      actionTaken: "Authorised P&D Officer",
      delayedDueLateUWS: "NO",
    },
    {
      slNo: 3,
      flightNumber: "",
      date: "14OCT",
      std: "",
      routing: "",
      uwsLmcNorms: "22:30",
      uwsLmcActual: "",
      delayedBy: "1:30",
      delayReason: "",
      shift: "",
      actionTaken: "Authorised P&D Officer",
      delayedDueLateUWS: "NO",
    },
  ])

  if (!isOpen) return null

  const updateEntry = (index: number, field: keyof UWSDelayEntry, value: string | number) => {
    const updated = [...entries]
    updated[index] = { ...updated[index], [field]: value }
    setEntries(updated)
  }

  const addEntry = () => {
    const newEntry: UWSDelayEntry = {
      slNo: entries.length + 1,
      flightNumber: "",
      date: "14OCT",
      std: "",
      routing: "",
      uwsLmcNorms: "",
      uwsLmcActual: "",
      delayedBy: "",
      delayReason: "",
      shift: "",
      actionTaken: "",
      delayedDueLateUWS: "NO",
    }
    setEntries([...entries, newEntry])
  }

  const deleteEntry = (index: number) => {
    const updated = entries.filter((_, i) => i !== index)
    // Re-number entries
    const renumbered = updated.map((entry, i) => ({ ...entry, slNo: i + 1 }))
    setEntries(renumbered)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">UWS Delay reason for passenger & passenger freighter</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#4A90E2] text-white">
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300">Sl.No</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300">Flight Number / Date-14OCT</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300">STD</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300">Routing-DXB</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300">UWS LMC Norms (STD-90)</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300">UWS LMC Actual</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300">Delayed by (Hrs:Mins)</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300" colSpan={8}>Delay Reason</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300">Shift</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300" colSpan={3}>Action taken</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300" colSpan={3}>Flight Delayed due late UWS/NOTOC (Yes/NO)</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs border border-gray-300 w-10">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-300 text-xs text-center bg-gray-50">
                      {entry.slNo}
                    </td>
                    <td className="px-3 py-2 border border-gray-300 text-xs">
                      <div className="flex items-center gap-1">
                        <EditableField
                          value={entry.flightNumber}
                          onChange={(v) => updateEntry(index, "flightNumber", v)}
                          className="font-semibold min-w-[80px]"
                        />
                        <span className="text-gray-400">/</span>
                        <EditableField
                          value={entry.date}
                          onChange={(v) => updateEntry(index, "date", v)}
                          className="text-gray-600 min-w-[60px]"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 border border-gray-300 text-xs">
                      <EditableField
                        value={entry.std}
                        onChange={(v) => updateEntry(index, "std", v)}
                        className="min-w-[60px]"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-300 text-xs">
                      <EditableField
                        value={entry.routing}
                        onChange={(v) => updateEntry(index, "routing", v)}
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-300 text-xs">
                      <EditableField
                        value={entry.uwsLmcNorms}
                        onChange={(v) => updateEntry(index, "uwsLmcNorms", v)}
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-300 text-xs">
                      <EditableField
                        value={entry.uwsLmcActual}
                        onChange={(v) => updateEntry(index, "uwsLmcActual", v)}
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-300 text-xs">
                      <EditableField
                        value={entry.delayedBy}
                        onChange={(v) => updateEntry(index, "delayedBy", v)}
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-300 text-xs" colSpan={8}>
                      <EditableField
                        value={entry.delayReason}
                        onChange={(v) => updateEntry(index, "delayReason", v)}
                        className="w-full"
                        multiline
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-300 text-xs">
                      <EditableField
                        value={entry.shift}
                        onChange={(v) => updateEntry(index, "shift", v)}
                        className="min-w-[50px] text-center"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-300 text-xs" colSpan={3}>
                      <EditableField
                        value={entry.actionTaken}
                        onChange={(v) => updateEntry(index, "actionTaken", v)}
                        className="w-full"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-300 text-xs" colSpan={3}>
                      <select
                        value={entry.delayedDueLateUWS}
                        onChange={(e) => updateEntry(index, "delayedDueLateUWS", e.target.value as "Yes" | "NO")}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                      >
                        <option value="NO">NO</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 border border-gray-300 text-xs">
                      <button
                        onClick={() => deleteEntry(index)}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                        title="Remove Row"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row Button */}
          <div className="mt-4">
            <Button
              onClick={addEntry}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </Button>
          </div>
        </div>

        {/* Footer with Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-4 py-2"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}




