"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Upload } from 'lucide-react'
import { Button } from "@/components/ui/button"
import type { ListsResults } from "@/lib/lists/types"
import { parseHeader, parseShipments, formatDateForReport } from "@/lib/lists/parser"
import { generateSpecialCargoReport, generateVUNList, generateQRTList } from "@/lib/lists/report-generators"
import {
  exportSpecialCargoReportToCSV,
  exportSpecialCargoReportToXLSX,
  exportVUNListToCSV,
  exportVUNListToXLSX,
  exportQRTListToCSV,
  exportQRTListToXLSX,
  downloadFile,
} from "@/lib/lists/export"
import { extractTextFromFile } from "@/lib/lists/file-extractors"
import { saveListsDataToSupabase } from "@/lib/lists/supabase-save"
import { UploadModal } from "./lists/upload-modal"
import { ResultsDisplay } from "./lists/results-display"
import { EmptyState } from "./lists/empty-state"

export default function ListsScreen() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ListsResults | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExportSpecialCargo = (format: "csv" | "xlsx") => {
    if (!results) return
    const reportDate = formatDateForReport(results.header.date)
    const cleanDate = reportDate.replace(/\s/g, "_")

    if (format === "csv") {
      const csv = exportSpecialCargoReportToCSV(results.specialCargo.regular, results.specialCargo.weapons, reportDate)
      downloadFile(csv, `Special_Cargo_Report_${cleanDate}.csv`, "text/csv")
    } else {
      const xlsx = exportSpecialCargoReportToXLSX(
        results.specialCargo.regular,
        results.specialCargo.weapons,
        reportDate,
      )
      downloadFile(xlsx, `Special_Cargo_Report_${cleanDate}.xlsx`, "application/vnd.ms-excel")
    }
  }

  const handleExportVUNList = (format: "csv" | "xlsx") => {
    if (!results) return
    const reportDate = formatDateForReport(results.header.date)
    const cleanDate = reportDate.replace(/\s/g, "_")

    if (format === "csv") {
      const csv = exportVUNListToCSV(results.vunList)
      downloadFile(csv, `VUN_List_${cleanDate}.csv`, "text/csv")
    } else {
      const xlsx = exportVUNListToXLSX(results.vunList)
      downloadFile(xlsx, `VUN_List_${cleanDate}.xlsx`, "application/vnd.ms-excel")
    }
  }

  const handleExportQRTList = (format: "csv" | "xlsx") => {
    if (!results) return
    const reportDate = formatDateForReport(results.header.date)
    const cleanDate = reportDate.replace(/\s/g, "_")

    if (format === "csv") {
      const csv = exportQRTListToCSV(results.qrtList)
      downloadFile(csv, `QRT_List_${cleanDate}.csv`, "text/csv")
    } else {
      const xlsx = exportQRTListToXLSX(results.qrtList)
      downloadFile(xlsx, `QRT_List_${cleanDate}.xlsx`, "application/vnd.ms-excel")
    }
  }

  const handleFileUpload = async (file: File) => {
    setError(null)
    setIsProcessing(true)
    setProgress(10)
    setUploadedFile(file)

    try {
      const validExtensions = [".md", ".txt", ".rtf", ".docx", ".doc", ".pdf"]
      const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))

      if (!hasValidExtension) {
        throw new Error("Invalid file type. Please upload a MD, DOCX, DOC, or PDF file.")
      }
      
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB")
      }
      setProgress(20)

      const content = await extractTextFromFile(file)
      console.log('[v0] Extracted content length:', content.length)
      setProgress(40)

      const header = parseHeader(content)
      console.log('[v0] Parsed header:', header)
      setProgress(50)

      const shipments = parseShipments(content, header)
      console.log('[v0] Parsed shipments:', shipments.length)
      setProgress(60)

      const specialCargo = generateSpecialCargoReport(header, shipments)
      console.log('[v0] Special cargo items:', specialCargo.regular.length + specialCargo.weapons.length)
      setProgress(70)

      const vunList = generateVUNList(header, shipments)
      console.log('[v0] VUN items:', vunList.length)
      
      // Log VUN shipments for verification
      if (vunList.length > 0) {
        console.log('[v0] VUN List details:', vunList.map(item => ({
          serialNo: item.serialNo,
          awbNo: item.docNo,
          shc: item.shc,
          origin: item.origin,
          destination: item.destination,
        })))
      }
      
      // Also check shipments with SHC containing VUN
      const shipmentsWithVUN = shipments.filter(s => s.shc && s.shc.includes('VUN'))
      if (shipmentsWithVUN.length > 0) {
        console.log('[v0] Shipments with SHC=VUN found:', shipmentsWithVUN.length)
        console.log('[v0] VUN Shipments:', shipmentsWithVUN.map(s => ({
          serialNo: s.serialNo,
          awbNo: s.awbNo,
          shc: s.shc,
          origin: s.origin,
          destination: s.destination,
        })))
      }
      
      setProgress(80)

      const qrtList = generateQRTList(header, shipments)
      console.log('[v0] QRT items:', qrtList.length)
      
      // Log QRT shipments for verification
      if (qrtList.length > 0) {
        console.log('[v0] QRT List details:', qrtList.map(item => ({
          serialNo: item.serialNo,
          awbNo: item.docNo,
          thc: item.thc,
          shc: item.shc,
          origin: item.origin,
          destination: item.destination,
        })))
      }
      
      // Also check shipments with THC containing QRT
      const shipmentsWithQRT = shipments.filter(s => s.thc && s.thc.includes('QRT'))
      if (shipmentsWithQRT.length > 0) {
        console.log('[v0] Shipments with THC=QRT found:', shipmentsWithQRT.length)
        console.log('[v0] QRT Shipments:', shipmentsWithQRT.map(s => ({
          serialNo: s.serialNo,
          awbNo: s.awbNo,
          thc: s.thc,
          shc: s.shc,
          origin: s.origin,
          destination: s.destination,
        })))
      }
      
      setProgress(90)

      const results = { specialCargo, vunList, qrtList, header, shipments }
      setResults(results)
      setProgress(95)

      // Save data to Supabase
      const saveResult = await saveListsDataToSupabase({
        results,
        shipments,
        fileName: file.name,
        fileSize: file.size,
      })

      if (saveResult.success) {
        console.log('[v0] Data saved to Supabase successfully, load_plan_id:', saveResult.loadPlanId)
      } else {
        console.error('[v0] Failed to save data to Supabase:', saveResult.error)
        // Don't show error to user, just log it - the processing was successful
      }

      setProgress(100)
      setShowUploadModal(false)
    } catch (err) {
      console.error('[v0] File upload error:', err)
      setError(err instanceof Error ? err.message : "An error occurred while processing the file")
      setProgress(0)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleReset = () => {
    setResults(null)
    setUploadedFile(null)
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Lists</h1>
            <p className="text-sm text-gray-500">Transform load plans into reports</p>
          </div>
          <Button onClick={() => setShowUploadModal(true)} className="bg-[#D71A21] hover:bg-[#B01419] text-white">
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!results ? (
          <EmptyState />
        ) : (
          <ResultsDisplay
            results={results}
            onExportSpecialCargo={handleExportSpecialCargo}
            onExportVUNList={handleExportVUNList}
            onExportQRTList={handleExportQRTList}
            onReset={handleReset}
          />
        )}
      </div>

      <UploadModal
        isOpen={showUploadModal}
        isProcessing={isProcessing}
        isDragging={isDragging}
        progress={progress}
        error={error}
        uploadedFile={uploadedFile}
        fileInputRef={fileInputRef}
        onClose={() => setShowUploadModal(false)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileInputChange={handleFileInputChange}
      />
    </div>
  )
}
