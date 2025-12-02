"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Upload, Database, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import type { ListsResults, Shipment, LoadPlanHeader } from "@/lib/lists/types"
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
import { fetchAllLoadPlansFromSupabase } from "@/lib/lists/supabase-fetch"
import { UploadModal } from "./lists/upload-modal"
import { ResultsDisplay } from "./lists/results-display"
import { EmptyState } from "./lists/empty-state"
import { getDefaultListsResults } from "@/lib/lists/default-data"

type DataSource = "file" | "database"

export default function ListsScreen() {
  const defaultResults = getDefaultListsResults()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ListsResults | null>(defaultResults)
  const [allShipments, setAllShipments] = useState<Shipment[]>(defaultResults?.shipments || [])
  const [combinedHeader, setCombinedHeader] = useState<LoadPlanHeader | null>(defaultResults?.header || null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  
  // Database mode state - default to database view
  const [dataSource, setDataSource] = useState<DataSource>("database")
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false)
  const [loadPlanCount, setLoadPlanCount] = useState(0)
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // Shift filter - DAY (1300-2359) or NIGHT (0000-1259)
  const [shiftFilter, setShiftFilter] = useState<"day" | "night">("day")

  // Load from database on mount
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true)
      handleLoadFromDatabase()
    }
  }, [hasInitialized])

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

  const handleFileUpload = async (file: File | File[]) => {
    setError(null)
    setIsProcessing(true)
    setProgress(0)
    
    const fileArray = Array.isArray(file) ? file : [file]
    setUploadedFile(fileArray[0])

    try {
      const validExtensions = [".md", ".txt", ".rtf", ".docx", ".doc", ".pdf"]
      
      // Validate all files
      for (const f of fileArray) {
        const hasValidExtension = validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
        if (!hasValidExtension) {
          throw new Error(`Invalid file type: ${f.name}. Please upload MD, DOCX, DOC, or PDF files.`)
        }
        if (f.size > 10 * 1024 * 1024) {
          throw new Error(`File size exceeds 10MB: ${f.name}`)
        }
      }

      let newShipments: Shipment[] = []
      let newHeader: LoadPlanHeader | null = null

      // Process each file and accumulate shipments
      for (let i = 0; i < fileArray.length; i++) {
        const f = fileArray[i]
        const fileProgress = Math.floor((i / fileArray.length) * 80) + 10
        setProgress(fileProgress)

        const content = await extractTextFromFile(f)
        console.log('[v0] Extracted content length:', content.length)

        const header = parseHeader(content)
        if (!newHeader) {
          newHeader = header // Use first file's header
        }

        const shipments = parseShipments(content, header)
        console.log('[v0] Parsed shipments from', f.name, ':', shipments.length)
        newShipments = [...newShipments, ...shipments]
      }

      // Combine with existing shipments
      const combinedShipments = [...allShipments, ...newShipments]
      setAllShipments(combinedShipments)
      
      // Use combined header (first one or existing)
      const finalHeader = combinedHeader || newHeader || (defaultResults?.header ?? { 
        flightNumber: '', 
        date: '', 
        aircraftType: '', 
        aircraftReg: '', 
        sector: '', 
        std: '', 
        preparedBy: '', 
        preparedOn: '' 
      })
      setCombinedHeader(finalHeader)

      setProgress(85)

      // Regenerate all reports from combined shipments
      const specialCargo = generateSpecialCargoReport(finalHeader, combinedShipments)
      const vunList = generateVUNList(finalHeader, combinedShipments)
      const qrtList = generateQRTList(finalHeader, combinedShipments)

      console.log('[v0] Combined - Special cargo items:', specialCargo.regular.length + specialCargo.weapons.length)
      console.log('[v0] Combined - VUN items:', vunList.length)
      console.log('[v0] Combined - QRT items:', qrtList.length)

      setProgress(90)

      const results: ListsResults = { 
        specialCargo, 
        vunList, 
        qrtList, 
        header: finalHeader, 
        shipments: combinedShipments 
      }
      setResults(results)
      setProgress(95)

      // Save data to Supabase (save each file)
      for (const f of fileArray) {
        try {
          const saveResult = await saveListsDataToSupabase({
            results,
            shipments: combinedShipments,
            fileName: f.name,
            fileSize: f.size,
          })

          if (saveResult.success) {
            console.log('[v0] Data saved to Supabase successfully for', f.name, ', load_plan_id:', saveResult.loadPlanId)
          } else {
            console.error('[v0] Failed to save data to Supabase for', f.name, ':', saveResult.error)
          }
        } catch (saveErr) {
          console.error('[v0] Error saving to Supabase for', f.name, ':', saveErr)
        }
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
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFileUpload(files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length > 0) handleFileUpload(files)
  }

  const handleReset = () => {
    setResults(defaultResults)
    setAllShipments(defaultResults?.shipments || [])
    setCombinedHeader(defaultResults?.header || null)
    setUploadedFile(null)
    setLoadPlanCount(0)
  }

  const handleLoadFromDatabase = async () => {
    setDatabaseError(null)
    setIsLoadingDatabase(true)

    try {
      const { shipments, header, loadPlanCount: count } = await fetchAllLoadPlansFromSupabase()
      
      if (shipments.length === 0) {
        setDatabaseError("No load plans found in the database")
        setIsLoadingDatabase(false)
        return
      }

      setLoadPlanCount(count)
      setAllShipments(shipments)
      setCombinedHeader(header)

      // Generate reports from database shipments (no QRT for database mode - available in sidebar)
      const specialCargo = generateSpecialCargoReport(header, shipments)
      const vunList = generateVUNList(header, shipments)

      console.log('[v0] Database - Special cargo items:', specialCargo.regular.length + specialCargo.weapons.length)
      console.log('[v0] Database - VUN items:', vunList.length)

      const dbResults: ListsResults = {
        specialCargo,
        vunList,
        qrtList: [], // Empty - QRT available in sidebar
        header,
        shipments,
      }

      setResults(dbResults)
    } catch (err) {
      console.error('[v0] Database load error:', err)
      setDatabaseError(err instanceof Error ? err.message : "Failed to load from database")
    } finally {
      setIsLoadingDatabase(false)
    }
  }

  const handleDataSourceChange = (source: DataSource) => {
    setDataSource(source)
    setDatabaseError(null)
    if (source === "database") {
      handleLoadFromDatabase()
    } else {
      handleReset()
    }
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Lists</h1>
            <p className="text-sm text-gray-500">Transform load plans into reports</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Data Source Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleDataSourceChange("file")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dataSource === "file"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                File Upload
              </button>
              <button
                onClick={() => handleDataSourceChange("database")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dataSource === "database"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                From Database
                {loadPlanCount > 0 && dataSource === "database" && (
                  <span className="ml-1 bg-[#D71A21] text-white text-xs px-1.5 py-0.5 rounded-full">
                    {loadPlanCount}
                  </span>
                )}
              </button>
            </div>

            {/* Action Button */}
            {dataSource === "file" ? (
              <Button onClick={() => setShowUploadModal(true)} className="bg-[#D71A21] hover:bg-[#B01419] text-white">
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            ) : (
              <Button 
                onClick={handleLoadFromDatabase} 
                disabled={isLoadingDatabase}
                className="bg-[#D71A21] hover:bg-[#B01419] text-white"
              >
                {isLoadingDatabase ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Loading state for database mode */}
        {isLoadingDatabase ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-12 h-12 text-[#D71A21] animate-spin mb-4" />
            <p className="text-gray-600">Loading from database...</p>
          </div>
        ) : databaseError ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
              <p className="text-red-800 font-medium mb-2">Database Error</p>
              <p className="text-red-600 text-sm">{databaseError}</p>
              <Button 
                onClick={handleLoadFromDatabase} 
                variant="outline" 
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : !results ? (
          <EmptyState />
        ) : (
          <ResultsDisplay
            results={results}
            onExportSpecialCargo={handleExportSpecialCargo}
            onExportVUNList={handleExportVUNList}
            onExportQRTList={handleExportQRTList}
            onReset={handleReset}
            loadPlanCount={dataSource === "database" ? loadPlanCount : undefined}
            shiftFilter={dataSource === "database" ? shiftFilter : undefined}
            onShiftFilterChange={dataSource === "database" ? setShiftFilter : undefined}
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
