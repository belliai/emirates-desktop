"use client"

import type React from "react"
import { Upload, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

interface UploadModalProps {
  isOpen: boolean
  isProcessing: boolean
  isDragging: boolean
  progress: number
  error: string | null
  uploadedFile: File | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onClose: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function UploadModal({
  isOpen,
  isProcessing,
  isDragging,
  progress,
  error,
  uploadedFile,
  fileInputRef,
  onClose,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
}: UploadModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full">
        <div className="border-b border-gray-200 px-6 py-4 relative">
          <h2 className="text-xl font-semibold text-gray-900">Upload BUP Allocation List</h2>
          <p className="text-sm text-gray-500 mt-1">Upload your BUP allocation CSV files</p>
          <button
            onClick={() => !isProcessing && onClose()}
            disabled={isProcessing}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-8">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-full max-w-md">
                <Progress value={progress} className="h-2" />
              </div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D71A21]"></div>
              <p className="text-gray-600 font-medium">Processing file...</p>
              {uploadedFile && <p className="text-sm text-gray-500">{uploadedFile.name}</p>}
            </div>
          ) : (
            <>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging ? "border-[#D71A21] bg-red-50" : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center gap-4">
                  <Upload className="w-12 h-12 text-gray-400" />
                  <div>
                    <p className="text-gray-700 font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">.csv - Maximum file size 10 MB (multiple files supported)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={onFileInputChange}
                    className="hidden"
                    id="lists-file-upload"
                    multiple
                  />
                  <label
                    htmlFor="lists-file-upload"
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    Choose File
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {!isProcessing && (
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
