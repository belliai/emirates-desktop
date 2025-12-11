"use client"

import { FileText } from "lucide-react"
import { Card } from "@/components/ui/card"

export function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-2xl">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Transform Load Plans</h2>
        <p className="text-gray-600 mb-6">
          Upload load plan files to automatically generate Special Cargo Reports and VUN Lists
        </p>

        <Card className="p-6 text-left space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Supported Formats</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                .md (Markdown)
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                .docx (Word)
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                .pdf (PDF)
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">What You'll Get</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Special Cargo Report with time-segmented data</li>
              <li>• VUN List with tracking information</li>
              <li>• Downloadable reports in CSV format</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}
