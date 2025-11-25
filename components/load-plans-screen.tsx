"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Upload } from "lucide-react"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail } from "./load-plan-types"
import { extractTextFromFile } from "@/lib/lists/file-extractors"
import { UploadModal } from "./lists/upload-modal"
import { Button } from "@/components/ui/button"
import { useLoadPlans, type LoadPlan } from "@/lib/load-plan-context"
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase } from "@/lib/load-plans-supabase"
import { parseHeader, parseShipments } from "@/lib/lists/parser"
import { saveListsDataToSupabase } from "@/lib/lists/supabase-save"
import type { ListsResults } from "@/lib/lists/types"
import { generateSpecialCargoReport, generateVUNList, generateQRTList } from "@/lib/lists/report-generators"


// Sample detail data - fallback when Supabase data is not available
const getLoadPlanDetailFallback = (flight: string): LoadPlanDetail | null => {
  if (flight === "EK0205") {
    return {
      flight: "EK0205",
      date: "12Oct",
      acftType: "388R",
      acftReg: "A6-EOW",
      headerVersion: "1",
      pax: "DXB/MXP",
      std: "09:35",
      preparedBy: "S294162",
      ttlPlnUld: "05PMC/10AKE",
      uldVersion: "05PMC/26",
      preparedOn: "15-Oct-25 11:29:32",
      sectors: [
        {
          sector: "DXBMXP",
          uldSections: [
            {
              uld: "XX 01PMC XX",
              awbs: [
                {
                  ser: "001",
                  awbNo: "176-20257333",
                  orgDes: "DXBMXP",
                  pcs: "6",
                  wgt: "36.3",
                  vol: "0.1",
                  lvol: "0.1",
                  shc: "VAL",
                  manDesc: "CONSOLIDATION",
                  pcode: "VAL",
                  pc: "P2",
                  thc: "NORM",
                  bs: "SS",
                  pi: "N",
                  fltin: "",
                  arrdtTime: "",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
                {
                  ser: "002",
                  awbNo: "176-16505274",
                  orgDes: "BOMJFK",
                  pcs: "3",
                  wgt: "1450.0",
                  vol: "9.1",
                  lvol: "9.1",
                  shc: "HEA-CRT-EMD",
                  manDesc: "CONSOLIDATED AS",
                  pcode: "AXD",
                  pc: "P2",
                  thc: "",
                  bs: "SS",
                  pi: "Y",
                  fltin: "EK0509",
                  arrdtTime: "12Oct0024 13:29/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
            {
              uld: "XX 01AKE XX",
              awbs: [
                {
                  ser: "003",
                  awbNo: "176-13820240",
                  orgDes: "DXBJFK",
                  pcs: "1",
                  wgt: "242.0",
                  vol: "0.8",
                  lvol: "0.8",
                  shc: "HEA-SVC-CRT",
                  manDesc: "CATERING GOOD",
                  pcode: "SVC",
                  pc: "P2",
                  thc: "NORM",
                  bs: "SS",
                  pi: "N",
                  fltin: "",
                  arrdtTime: "",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
            {
              uld: "XX 01PMC 01AKE XX",
              awbs: [
                {
                  ser: "005",
                  awbNo: "176-15033524",
                  orgDes: "HKGMXP",
                  pcs: "105",
                  wgt: "2030.0",
                  vol: "12.0",
                  lvol: "12.0",
                  shc: "SPX-SBU",
                  manDesc: "WOMEN S COTTON",
                  pcode: "GCR",
                  pc: "P2",
                  thc: "",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK9789",
                  arrdtTime: "11Oct1055 17:11/23:11",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
            {
              uld: "",
              awbs: [
                {
                  ser: "006",
                  awbNo: "176-10603445",
                  orgDes: "BNEMXP",
                  pcs: "2",
                  wgt: "19.4",
                  vol: "0.2",
                  lvol: "0.2",
                  shc: "MAL",
                  manDesc: "INTL. MAIL",
                  pcode: "MAW",
                  pc: "",
                  thc: "",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK0435",
                  arrdtTime: "11Oct0533 28:34/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                  remarks: "[Must be load in Fire containment equipment]",
                },
                {
                  ser: "007",
                  awbNo: "176-10603456",
                  orgDes: "BNEMXP",
                  pcs: "3",
                  wgt: "29.9",
                  vol: "0.3",
                  lvol: "0.5",
                  shc: "MAL",
                  manDesc: "INTL. MAIL",
                  pcode: "MAW",
                  pc: "P2",
                  thc: "",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK0435",
                  arrdtTime: "11Oct0533 28:34/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                  remarks: "[Must be load in Fire containment equipment]",
                },
              ],
            },
            {
              uld: "XX 01AKE XX",
              awbs: [
                {
                  ser: "019",
                  awbNo: "176-18596476",
                  orgDes: "SYDMXP",
                  pcs: "1",
                  wgt: "14.2",
                  vol: "0.1",
                  lvol: "0.1",
                  shc: "MAL",
                  manDesc: "INTL. MAIL",
                  pcode: "MAW",
                  pc: "P2",
                  thc: "QWT",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK0415",
                  arrdtTime: "11Oct1306 21:00/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
          ],
          totals: {
            pcs: "166",
            wgt: "4,357.90",
            vol: "26.17",
            lvol: "27.28",
          },
        },
        {
          sector: "DXBJFK",
          uldSections: [
            {
              uld: "XX BULK XX",
              awbs: [
                {
                  ser: "001",
                  awbNo: "176-13926511",
                  orgDes: "CMBJFK",
                  pcs: "1",
                  wgt: "14.0",
                  vol: "0.1",
                  lvol: "0.1",
                  shc: "CGO",
                  manDesc: "CONSOLIDATION",
                  pcode: "GCR",
                  pc: "P1",
                  thc: "",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK0651",
                  arrdtTime: "11Oct1311 20:56/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
            {
              uld: "XX 02PMC 02AKE XX",
              awbs: [
                {
                  ser: "008",
                  awbNo: "176-19897102",
                  orgDes: "KTIJFK",
                  pcs: "60",
                  wgt: "140.979",
                  vol: "1.3",
                  lvol: "1.3",
                  shc: "",
                  manDesc: "CONSOLIDATION",
                  pcode: "GCR",
                  pc: "P2",
                  thc: "",
                  bs: "SS",
                  pi: "Y",
                  fltin: "EK0349",
                  arrdtTime: "11Oct0500 29:07/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
            {
              uld: "XX 01PMC XX",
              awbs: [
                {
                  ser: "009",
                  awbNo: "176-04616581",
                  orgDes: "LHEJFK",
                  pcs: "45",
                  wgt: "1320.0",
                  vol: "7.9",
                  lvol: "7.9",
                  shc: "COU-XPS-FCE",
                  manDesc: "COURIER ON AWB",
                  pcode: "COU",
                  pc: "P2",
                  thc: "QWT",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK0623",
                  arrdtTime: "12Oct0605 04:02/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
          ],
          bagg: "MXP 13AKE JFK 02AKE",
          totals: {
            pcs: "132",
            wgt: "5,757.98",
            vol: "25.90",
            lvol: "25.90",
          },
        },
      ],
    }
  }

  if (flight === "EK0544") {
    return {
      flight: "EK0544",
      date: "01Mar",
      acftType: "77WER",
      acftReg: "A6-ENT",
      headerVersion: "1",
      pax: "DXB/MAA/0/23/251",
      std: "02:50",
      preparedBy: "PRINCE",
      ttlPlnUld: "06PMC/07AKE",
      uldVersion: "06/26",
      preparedOn: "29-Feb-24 12:44:05",
      remarks: [
        "XX NO PART SHIPMENT XX",
        '"Station requirement". Do not use ALF or PLA instead of AKE allocation.',
      ],
      sectors: [
        {
          sector: "DXBMAA",
          uldSections: [
            {
              uld: "XX 02PMC XX",
              awbs: [
                {
                  ser: "001",
                  awbNo: "176-92065120",
                  orgDes: "FRAMAA",
                  pcs: "31",
                  wgt: "1640.2",
                  vol: "18.9",
                  lvol: "20.0",
                  shc: "PIL-CRT-EAP",
                  manDesc: "CONSOLIDATION A",
                  pcode: "AXD",
                  pc: "P2",
                  thc: "",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK9903",
                  arrdtTime: "29Feb0418 13:40/22:31",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
            {
              uld: "XX BULK XX",
              awbs: [
                {
                  ser: "002",
                  awbNo: "176-98208961",
                  orgDes: "DXBMAA",
                  pcs: "1",
                  wgt: "10.0",
                  vol: "0.1",
                  lvol: "0.1",
                  shc: "VAL",
                  manDesc: "GOLD JEWELLERY.",
                  pcode: "VAL",
                  pc: "P2",
                  thc: "NORM",
                  bs: "NN",
                  pi: "N",
                  fltin: "",
                  arrdtTime: "",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
            {
              uld: "XX 02PMC XX",
              awbs: [
                {
                  ser: "003",
                  awbNo: "176-93627586",
                  orgDes: "MNLMAA",
                  pcs: "13",
                  wgt: "2690.0",
                  vol: "18.5",
                  lvol: "18.5",
                  shc: "HEA-CGO",
                  manDesc: "CONSOLIDATION",
                  pcode: "GCR",
                  pc: "P1",
                  thc: "",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK0333",
                  arrdtTime: "27Feb2334 51:16/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
            {
              uld: "XX 06AKE XX",
              awbs: [
                {
                  ser: "008",
                  awbNo: "176-93270542",
                  orgDes: "FRAMAA",
                  pcs: "11",
                  wgt: "145.5",
                  vol: "0.9",
                  lvol: "0.9",
                  shc: "EAP",
                  manDesc: "CONSOLIDATION A",
                  pcode: "GCR",
                  pc: "P1",
                  thc: "",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK9903",
                  arrdtTime: "29Feb0418 13:30/22:31",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
            {
              uld: "",
              awbs: [
                {
                  ser: "004",
                  awbNo: "176-99699530",
                  orgDes: "PEKMAA",
                  pcs: "9",
                  wgt: "643.0",
                  vol: "1.3",
                  lvol: "1.3",
                  shc: "VUN",
                  manDesc: "CONSOLIDATION",
                  pcode: "GCR",
                  pc: "P2",
                  thc: "",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK9307",
                  arrdtTime: "29Feb0216 19:20/24:33",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
            {
              uld: "XX 01AKE XX",
              awbs: [
                {
                  ser: "013",
                  awbNo: "176-91073931",
                  orgDes: "KRKMAA",
                  pcs: "1",
                  wgt: "363.0",
                  vol: "0.6",
                  lvol: "4.0",
                  shc: "SPX-EAP-HEA",
                  manDesc: "CONSOLIDATION A",
                  pcode: "AXA",
                  pc: "P1",
                  thc: "QRT",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK0180",
                  arrdtTime: "29Feb2220 04:30/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
            },
            {
              uld: "",
              awbs: [
                {
                  ser: "009",
                  awbNo: "176-92388321",
                  orgDes: "MIAMAA",
                  pcs: "57",
                  wgt: "1499.0",
                  vol: "8.6",
                  lvol: "8.6",
                  shc: "PES-CRT",
                  manDesc: "SHRIMP",
                  pcode: "PXS",
                  pc: "P2",
                  thc: "QRT",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK0214",
                  arrdtTime: "29Feb1915 07:25/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
                {
                  ser: "010",
                  awbNo: "176-92388332",
                  orgDes: "MIAMAA",
                  pcs: "57",
                  wgt: "1499.0",
                  vol: "8.6",
                  lvol: "8.6",
                  shc: "PES-CRT",
                  manDesc: "LIVE SHRIMP",
                  pcode: "PXS",
                  pc: "",
                  thc: "QRT",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK0214",
                  arrdtTime: "29Feb1915 07:25/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
              isRampTransfer: true,
            },
            {
              uld: "XX BULK XX",
              awbs: [
                {
                  ser: "011",
                  awbNo: "176-91628773",
                  orgDes: "DARMAA",
                  pcs: "1",
                  wgt: "20.0",
                  vol: "0.1",
                  lvol: "0.1",
                  shc: "VAL",
                  manDesc: "GOLD",
                  pcode: "VAL",
                  pc: "P2",
                  thc: "QRT",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK0726",
                  arrdtTime: "29Feb2145 05:05/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
                {
                  ser: "012",
                  awbNo: "176-91629020",
                  orgDes: "DARMAA",
                  pcs: "1",
                  wgt: "20.0",
                  vol: "0.1",
                  lvol: "0.1",
                  shc: "VAL",
                  manDesc: "GOLD",
                  pcode: "VAL",
                  pc: "P2",
                  thc: "QRT",
                  bs: "SS",
                  pi: "N",
                  fltin: "EK0726",
                  arrdtTime: "29Feb2145 05:05/",
                  qnnAqnn: "",
                  whs: "",
                  si: "N",
                },
              ],
              isRampTransfer: true,
            },
          ],
          bagg: "10AKE",
          cou: "BULK DHL 300KGS",
          totals: {
            pcs: "201",
            wgt: "9,355.20",
            vol: "62.69",
            lvol: "67.23",
          },
        },
      ],
    }
  }

  return null
}

export default function LoadPlansScreen({ onLoadPlanSelect }: { onLoadPlanSelect?: (loadPlan: LoadPlan) => void }) {
  const { loadPlans, addLoadPlan, setLoadPlans } = useLoadPlans()
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [savedDetails, setSavedDetails] = useState<Map<string, LoadPlanDetail>>(new Map())
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch load plans from Supabase on mount
  useEffect(() => {
    const fetchLoadPlans = async () => {
      setIsLoading(true)
      try {
        const supabaseLoadPlans = await getLoadPlansFromSupabase()
        if (supabaseLoadPlans.length > 0) {
          setLoadPlans(supabaseLoadPlans)
          console.log(`[LoadPlansScreen] Loaded ${supabaseLoadPlans.length} load plans from Supabase`)
        } else {
          console.log("[LoadPlansScreen] No load plans from Supabase, using context data")
        }
      } catch (err) {
        console.error("[LoadPlansScreen] Error fetching load plans:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLoadPlans()
  }, [setLoadPlans])

  const handleRowClick = async (loadPlan: LoadPlan) => {
    // Check if we have a saved version first
    const savedDetail = savedDetails.get(loadPlan.flight)
    if (savedDetail) {
      console.log(`[LoadPlansScreen] Using saved detail for ${loadPlan.flight}`)
      setSelectedLoadPlan(savedDetail)
      return
    }

    // Try to fetch from Supabase
    try {
      console.log(`[LoadPlansScreen] Fetching load plan detail from Supabase for ${loadPlan.flight}`)
      const supabaseDetail = await getLoadPlanDetailFromSupabase(loadPlan.flight)
      if (supabaseDetail) {
        console.log(`[LoadPlansScreen] Successfully loaded detail from Supabase:`, {
          flight: supabaseDetail.flight,
          sectors: supabaseDetail.sectors.length,
          totalItems: supabaseDetail.sectors.reduce((sum, s) => sum + s.uldSections.reduce((sum2, u) => sum2 + u.awbs.length, 0), 0)
        })
        setSelectedLoadPlan(supabaseDetail)
        return
      } else {
        console.log(`[LoadPlansScreen] No data found in Supabase for ${loadPlan.flight}`)
      }
    } catch (err) {
      console.error("[LoadPlansScreen] Error fetching load plan detail:", err)
    }

    // Fallback to dummy data if Supabase doesn't have it
    const fallbackDetail = getLoadPlanDetailFallback(loadPlan.flight)
    if (fallbackDetail) {
      console.log(`[LoadPlansScreen] Using fallback dummy data for ${loadPlan.flight}`)
      setSelectedLoadPlan(fallbackDetail)
    } else if (onLoadPlanSelect) {
      onLoadPlanSelect(loadPlan)
    }
  }

  const handleSave = (updatedPlan: LoadPlanDetail) => {
    setSavedDetails((prev) => {
      const updated = new Map(prev)
      updated.set(updatedPlan.flight, updatedPlan)
      return updated
    })
  }

  const handleFileUpload = async (files: File | File[]) => {
    setError(null)
    setIsProcessing(true)
    setProgress(0)
    
    const fileArray = Array.isArray(files) ? files : [files]
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

      let totalAddedCount = 0
      let totalSkippedCount = 0
      const skippedFlights: string[] = []
      const failedFiles: string[] = []

      // Process each file and save to Supabase
      for (let i = 0; i < fileArray.length; i++) {
        const f = fileArray[i]
        const fileProgress = Math.floor((i / fileArray.length) * 80) + 10
        setProgress(fileProgress)

        try {
          const content = await extractTextFromFile(f)
          console.log('[LoadPlansScreen] Extracted content length:', content.length)

          const header = parseHeader(content)
          if (!header.flightNumber) {
            console.error('[LoadPlansScreen] Could not parse flight number from file:', f.name)
            failedFiles.push(f.name)
            continue
          }

          const shipments = parseShipments(content, header)
          console.log('[LoadPlansScreen] Parsed shipments from', f.name, ':', shipments.length)

          // Generate reports (required for saveListsDataToSupabase)
          const specialCargo = generateSpecialCargoReport(header, shipments)
          const vunList = generateVUNList(header, shipments)
          const qrtList = generateQRTList(header, shipments)

          const results: ListsResults = { 
            specialCargo, 
            vunList, 
            qrtList, 
            header, 
            shipments 
          }

          // Save to Supabase
          const saveResult = await saveListsDataToSupabase({
            results,
            shipments,
            fileName: f.name,
            fileSize: f.size,
          })

          if (saveResult.success) {
            console.log('[LoadPlansScreen] Data saved to Supabase successfully for', f.name, ', load_plan_id:', saveResult.loadPlanId)
            
            // Check if flight already exists in current list
            const exists = loadPlans.some((lp) => lp.flight === header.flightNumber)
            if (exists) {
              totalSkippedCount++
              skippedFlights.push(header.flightNumber)
            } else {
              totalAddedCount++
            }
          } else {
            console.error('[LoadPlansScreen] Failed to save data to Supabase for', f.name, ':', saveResult.error)
            failedFiles.push(f.name)
          }
        } catch (fileError) {
          console.error(`[LoadPlansScreen] Error processing file ${f.name}:`, fileError)
          failedFiles.push(f.name)
        }
      }

      setProgress(90)

      // Refresh load plans from Supabase after processing all files
      try {
        const supabaseLoadPlans = await getLoadPlansFromSupabase()
        if (supabaseLoadPlans.length > 0) {
          setLoadPlans(supabaseLoadPlans)
        }
      } catch (refreshError) {
        console.error("[LoadPlansScreen] Error refreshing load plans:", refreshError)
      }

      setProgress(100)

      if (totalAddedCount > 0 || totalSkippedCount > 0) {
        let message = `Processed ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}. `
        if (totalAddedCount > 0) {
          message += `Successfully added ${totalAddedCount} load plan${totalAddedCount > 1 ? "s" : ""}. `
        }
        if (totalSkippedCount > 0) {
          message += `${totalSkippedCount} flight${totalSkippedCount > 1 ? "s" : ""} already exist${totalSkippedCount > 1 ? "" : "s"} (${skippedFlights.slice(0, 5).join(", ")}${skippedFlights.length > 5 ? `, and ${skippedFlights.length - 5} more` : ""}) and ${totalSkippedCount > 1 ? "were" : "was"} updated. `
        }
        if (failedFiles.length > 0) {
          message += `${failedFiles.length} file${failedFiles.length > 1 ? "s" : ""} could not be processed (${failedFiles.slice(0, 3).join(", ")}${failedFiles.length > 3 ? "..." : ""}).`
        }

        setTimeout(() => {
          alert(message)
        }, 100)
      } else if (failedFiles.length === fileArray.length) {
        throw new Error(`Could not process any files. Please check the file format${fileArray.length > 1 ? "s" : ""}.`)
      }

      setShowUploadModal(false)
    } catch (err) {
      console.error("[LoadPlansScreen] File upload error:", err)
      setError(err instanceof Error ? err.message : "An error occurred while processing the file")
      setProgress(0)
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
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
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(Array.from(files))
    }
  }

  if (selectedLoadPlan) {
    return (
      <LoadPlanDetailScreen
        loadPlan={selectedLoadPlan}
        onBack={() => setSelectedLoadPlan(null)}
        onSave={handleSave}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full">
        {/* Header with Upload Button */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-900">Load Plans</h2>
          <Button onClick={() => setShowUploadModal(true)} className="bg-[#D71A21] hover:bg-[#B01419] text-white">
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
        </div>
        <div className="mx-2 rounded-lg border border-gray-200 overflow-x-auto">
          <div className="bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-[#D71A21] text-white">
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Flight</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Date</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ACFT TYPE</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ACFT REG</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">PAX</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">STD</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">TTL PLN ULD</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">ULD Version</span>
                    </div>
                  </th>
                  <th className="px-2 py-1 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-center text-gray-500 text-sm">
                      Loading load plans...
                    </td>
                  </tr>
                ) : loadPlans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-center text-gray-500 text-sm">
                      No load plans available
                    </td>
                  </tr>
                ) : (
                  loadPlans.map((loadPlan, index) => (
                    <LoadPlanRow key={index} loadPlan={loadPlan} onClick={handleRowClick} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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

interface LoadPlanRowProps {
  loadPlan: LoadPlan
  onClick: (loadPlan: LoadPlan) => void
}

function LoadPlanRow({ loadPlan, onClick }: LoadPlanRowProps) {
  return (
    <tr
      onClick={() => onClick(loadPlan)}
      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-2 py-1 font-semibold text-gray-900 text-xs whitespace-nowrap truncate">
        {loadPlan.flight}
      </td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.date}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.acftType}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.acftReg}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.pax}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.std}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.ttlPlnUld}</td>
      <td className="px-2 py-1 text-gray-900 text-xs whitespace-nowrap truncate">{loadPlan.uldVersion}</td>
      <td className="px-2 py-1 w-10">
        <ChevronRight className="h-4 w-4 text-gray-600 hover:text-[#D71A21]" />
      </td>
    </tr>
  )
}
