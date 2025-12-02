"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ClipboardPaste, Trash2, Check } from "lucide-react"

type ParsedData = {
  headers: string[]
  rows: string[][]
}

type ClipboardPasteModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: ParsedData) => void
  title?: string
  description?: string
}

function parseTSV(text: string): ParsedData {
  const lines = text.trim().split("\n")
  if (lines.length === 0) return { headers: [], rows: [] }
  
  const headers = lines[0].split("\t").map((h) => h.trim())
  const rows = lines.slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split("\t").map((cell) => cell.trim()))
  
  return { headers, rows }
}

export function ClipboardPasteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Paste Data",
  description = "Copy data from a spreadsheet and paste below",
}: ClipboardPasteModalProps) {
  const [rawText, setRawText] = useState("")
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text")
    setRawText(text)
    
    if (text.includes("\t")) {
      const parsed = parseTSV(text)
      setParsedData(parsed)
    } else {
      setParsedData(null)
    }
  }, [])

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setRawText(text)
    
    if (text.includes("\t")) {
      const parsed = parseTSV(text)
      setParsedData(parsed)
    } else {
      setParsedData(null)
    }
  }, [])

  const handleClear = useCallback(() => {
    setRawText("")
    setParsedData(null)
  }, [])

  const handleConfirm = useCallback(() => {
    if (parsedData && parsedData.rows.length > 0) {
      onConfirm(parsedData)
      handleClear()
      onClose()
    }
  }, [parsedData, onConfirm, onClose, handleClear])

  const handleClose = useCallback(() => {
    handleClear()
    onClose()
  }, [onClose, handleClear])

  const hasData = parsedData && parsedData.rows.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* Paste Area */}
          {!hasData && (
            <div className="relative">
              <Textarea
                value={rawText}
                onChange={handleTextChange}
                onPaste={handlePaste}
                placeholder="Paste tab-separated data here (Ctrl+V / Cmd+V)..."
                className="min-h-[120px] font-mono text-sm"
              />
              {rawText && !parsedData && (
                <p className="text-xs text-amber-600 mt-1">
                  Data doesn't appear to be tab-separated. Try copying directly from Excel or Google Sheets.
                </p>
              )}
            </div>
          )}

          {/* Preview Table */}
          {hasData && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{parsedData.rows.length}</span> rows parsed
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-gray-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        {parsedData.headers.map((header, i) => (
                          <th
                            key={i}
                            className="px-3 py-2 text-left font-semibold text-gray-700 border-b whitespace-nowrap"
                          >
                            {header || `Column ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.rows.slice(0, 100).map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          {parsedData.headers.map((_, colIndex) => (
                            <td
                              key={colIndex}
                              className="px-3 py-1.5 border-b border-gray-100 whitespace-nowrap"
                            >
                              {row[colIndex] || ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.rows.length > 100 && (
                  <p className="text-xs text-gray-500 p-2 bg-gray-50 border-t">
                    Showing first 100 of {parsedData.rows.length} rows
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasData}
            className="bg-[#D71A21] hover:bg-[#B01419] text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Confirm ({parsedData?.rows.length || 0} rows)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

