"use client"

import { useState } from "react"
import { X, Check, AlertTriangle, Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import type { LoadPlanDiff, ItemDiff, FieldChange } from "@/lib/lists/load-plan-review"

interface LoadPlanReviewModalProps {
  diff: LoadPlanDiff
  onAccept: () => void
  onDiscard: () => void
  isApplying?: boolean
}

export function LoadPlanReviewModal({
  diff,
  onAccept,
  onDiscard,
  isApplying = false,
}: LoadPlanReviewModalProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['modified', 'added', 'deleted']))
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }
  
  const totalChanges = diff.addedCount + diff.modifiedCount + diff.deletedCount
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Review Changes Before Saving
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {diff.flightNumber} / {diff.flightDate} • Revision {diff.existingRevision} → {diff.newRevision}
            </p>
          </div>
          <button
            onClick={onDiscard}
            disabled={isApplying}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Summary */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-6">
            {diff.modifiedCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm font-medium text-gray-700">
                  {diff.modifiedCount} Modified
                </span>
              </div>
            )}
            {diff.addedCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-700">
                  {diff.addedCount} Added
                </span>
              </div>
            )}
            {diff.deletedCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-gray-700">
                  {diff.deletedCount} Deleted
                </span>
              </div>
            )}
            {diff.unchangedCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <span className="text-sm text-gray-500">
                  {diff.unchangedCount} Unchanged
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* No changes message */}
          {!diff.hasChanges && (
            <div className="text-center py-12 text-gray-500">
              <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No changes detected</p>
              <p className="text-sm">The uploaded file matches the existing data.</p>
            </div>
          )}
          
          {/* Modified Items */}
          {diff.modifiedCount > 0 && (
            <div className="border border-amber-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('modified')}
                className="w-full px-4 py-3 bg-amber-50 flex items-center justify-between hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Edit className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-900">
                    Modified Items ({diff.modifiedCount})
                  </span>
                </div>
                {expandedSections.has('modified') ? (
                  <ChevronDown className="h-4 w-4 text-amber-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-amber-600" />
                )}
              </button>
              
              {expandedSections.has('modified') && (
                <div className="divide-y divide-amber-100">
                  {diff.modifiedItems.map((item, index) => (
                    <ModifiedItemRow key={index} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Added Items */}
          {diff.addedCount > 0 && (
            <div className="border border-green-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('added')}
                className="w-full px-4 py-3 bg-green-50 flex items-center justify-between hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">
                    New Items ({diff.addedCount})
                  </span>
                </div>
                {expandedSections.has('added') ? (
                  <ChevronDown className="h-4 w-4 text-green-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-green-600" />
                )}
              </button>
              
              {expandedSections.has('added') && (
                <div className="divide-y divide-green-100">
                  {diff.addedItems.map((item, index) => (
                    <AddedItemRow key={index} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Deleted Items */}
          {diff.deletedCount > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('deleted')}
                className="w-full px-4 py-3 bg-red-50 flex items-center justify-between hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-900">
                    Deleted Items ({diff.deletedCount})
                  </span>
                </div>
                {expandedSections.has('deleted') ? (
                  <ChevronDown className="h-4 w-4 text-red-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-red-600" />
                )}
              </button>
              
              {expandedSections.has('deleted') && (
                <div className="divide-y divide-red-100">
                  {diff.deletedItems.map((item, index) => (
                    <DeletedItemRow key={index} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-sm text-gray-500">
            {totalChanges} change{totalChanges !== 1 ? 's' : ''} will be applied
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onDiscard}
              disabled={isApplying}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Discard Changes
            </button>
            <button
              onClick={onAccept}
              disabled={isApplying || !diff.hasChanges}
              className="px-4 py-2 text-sm font-medium text-white bg-[#D71A21] rounded-lg hover:bg-[#b81219] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isApplying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Applying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Accept & Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Sub-components for different item types

function ModifiedItemRow({ item }: { item: ItemDiff }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div className="bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-50/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 w-8">
            {String(item.serialNumber).padStart(3, '0')}
          </span>
          <span className="font-medium text-gray-900">{item.awbNumber}</span>
          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
            {item.fieldChanges?.length || 0} field{(item.fieldChanges?.length || 0) !== 1 ? 's' : ''} changed
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      
      {expanded && item.fieldChanges && (
        <div className="px-4 pb-3 ml-11">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-1 font-medium">Field</th>
                <th className="text-left py-1 font-medium">Old Value</th>
                <th className="text-left py-1 font-medium">New Value</th>
              </tr>
            </thead>
            <tbody>
              {item.fieldChanges.map((change, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="py-2 text-gray-600">{change.field}</td>
                  <td className="py-2 text-red-600 line-through">
                    {change.oldValue || <span className="text-gray-400 italic">empty</span>}
                  </td>
                  <td className="py-2 text-green-600 font-medium">
                    {change.newValue || <span className="text-gray-400 italic">empty</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AddedItemRow({ item }: { item: ItemDiff }) {
  return (
    <div className="px-4 py-3 bg-white flex items-center gap-4">
      <span className="text-xs font-mono text-gray-400 w-8">
        {String(item.serialNumber).padStart(3, '0')}
      </span>
      <span className="font-medium text-gray-900">{item.awbNumber}</span>
      <span className="text-sm text-gray-500">
        {item.newData?.pieces} pcs • {item.newData?.weight}kg
      </span>
      {item.newData?.shc && (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
          {item.newData.shc}
        </span>
      )}
      {item.newData?.uld && (
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
          {item.newData.uld}
        </span>
      )}
    </div>
  )
}

function DeletedItemRow({ item }: { item: ItemDiff }) {
  return (
    <div className="px-4 py-3 bg-white flex items-center gap-4 opacity-60">
      <span className="text-xs font-mono text-gray-400 w-8 line-through">
        {String(item.serialNumber).padStart(3, '0')}
      </span>
      <span className="font-medium text-gray-900 line-through">{item.awbNumber}</span>
      <span className="text-sm text-gray-500 line-through">
        {item.oldData?.pieces} pcs • {item.oldData?.weight}kg
      </span>
      {item.oldData?.shc && (
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded line-through">
          {item.oldData.shc}
        </span>
      )}
    </div>
  )
}

