"use client"

import { useState, useRef } from "react"
import { ChevronRight, Plane, Calendar, Package, Users, Clock, FileText, Upload } from "lucide-react"
import LoadPlanDetailScreen from "./load-plan-detail-screen"
import type { LoadPlanDetail } from "./load-plan-detail-screen"
import { extractTextFromFile } from "@/lib/lists/file-extractors"
import { UploadModal } from "./lists/upload-modal"
import { Button } from "@/components/ui/button"
import { useLoadPlans, type LoadPlan } from "@/lib/load-plan-context"


// Sample detail data - in production, this would come from an API
const getLoadPlanDetail = (flight: string): LoadPlanDetail | null => {
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
  const { loadPlans, addLoadPlan } = useLoadPlans()
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [savedDetails, setSavedDetails] = useState<Map<string, LoadPlanDetail>>(new Map())
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleRowClick = (loadPlan: LoadPlan) => {
    // Check if we have a saved version, otherwise use the default
    const savedDetail = savedDetails.get(loadPlan.flight)
    const detail = savedDetail || getLoadPlanDetail(loadPlan.flight)
    if (detail) {
      setSelectedLoadPlan(detail)
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

  const parseLoadPlanFile = async (file: File): Promise<LoadPlan[]> => {
    try {
      const text = await extractTextFromFile(file)
      const loadPlans: LoadPlan[] = []

      const cleanValue = (value: string): string => {
        if (!value) return ""
        let cleaned = value.split(/PREPARED BY/i)[0]
        cleaned = cleaned.split(/PREPARED ON/i)[0]
        return cleaned.trim()
      }

      // Try CSV format
      if (file.name.endsWith(".csv") || (text.includes(",") && text.split("\n").length > 2)) {
        const lines = text.split("\n").filter((line) => line.trim())
        const rows = lines.map((line) => line.split(",").map((cell) => cell.trim()))
        const dataRows = rows.filter((row) => {
          const firstCell = row[0]?.toLowerCase()
          return firstCell && firstCell !== "flight" && !firstCell.includes("header") && firstCell.match(/^ek\d+/i)
        })

        dataRows.forEach((row) => {
          if (row.length >= 8) {
            const loadPlan: LoadPlan = {
              flight: cleanValue(row[0] || ""),
              date: cleanValue(row[1] || ""),
              acftType: cleanValue(row[2] || ""),
              acftReg: cleanValue(row[3] || ""),
              pax: cleanValue(row[4] || ""),
              std: cleanValue(row[5] || ""),
              ttlPlnUld: cleanValue(row[6] || ""),
              uldVersion: cleanValue(row[7] || ""),
            }
            if (loadPlan.flight) {
              loadPlans.push(loadPlan)
            }
          }
        })

        return loadPlans
      }

      // Try text format - look for multiple load plans
      const planSeparators = [/EMIRATES LOAD PLAN/gi, /(?=EK\d+\s*\/)/g]
      let sections: string[] = []

      if (text.match(/EMIRATES LOAD PLAN/gi)) {
        sections = text.split(/EMIRATES LOAD PLAN/gi).filter((s) => s.trim())
      } else {
        const flightPattern = /(EK\d+\s*\/\s*\w+)/gi
        const matches = [...text.matchAll(flightPattern)]

        if (matches.length > 1) {
          for (let i = 0; i < matches.length; i++) {
            const start = matches[i].index || 0
            const end = i < matches.length - 1 ? (matches[i + 1].index || text.length) : text.length
            sections.push(text.substring(start, end))
          }
        } else {
          sections = [text]
        }
      }

      sections.forEach((section) => {
        const flightMatch = section.match(/(EK\d+)\s*\/\s*(\w+)/i)
        if (flightMatch) {
          const flight = flightMatch[1]
          const date = flightMatch[2]

          const acftTypeMatch = section.match(/ACFT TYPE:\s*(\S+)/i)
          const acftRegMatch = section.match(/ACFT REG:\s*(\S+)/i)
          const paxMatch = section.match(/PAX:\s*([^\n]*?)(?:\s+STD:|PREPARED BY|$)/i)
          const stdMatch = section.match(/STD:\s*([^\n]*?)(?:\s+PREPARED BY|$)/i)
          const ttlPlnUldMatch = section.match(/TTL PLN ULD:\s*([^\n]*?)(?:\s+ULD VERSION|PREPARED|$)/i)
          const uldVersionMatch = section.match(/ULD VERSION:\s*([^\n]*?)(?:\s+PREPARED|$)/i)

          const loadPlan: LoadPlan = {
            flight: flight || "",
            date: date || "",
            acftType: cleanValue(acftTypeMatch?.[1] || ""),
            acftReg: cleanValue(acftRegMatch?.[1] || ""),
            pax: cleanValue(paxMatch?.[1] || ""),
            std: cleanValue(stdMatch?.[1] || ""),
            ttlPlnUld: cleanValue(ttlPlnUldMatch?.[1] || ""),
            uldVersion: cleanValue(uldVersionMatch?.[1] || ""),
          }

          if (loadPlan.flight) {
            loadPlans.push(loadPlan)
          }
        }
      })

      return loadPlans.length > 0 ? loadPlans : []
    } catch (error) {
      console.error("Error parsing load plan file:", error)
      return []
    }
  }

  const handleFileUpload = async (files: File | File[]) => {
    setError(null)
    setIsProcessing(true)
    setProgress(0)

    const fileArray = Array.isArray(files) ? files : [files]
    setUploadedFile(fileArray[0])

    try {
      const validExtensions = [".md", ".txt", ".rtf", ".docx", ".doc", ".pdf", ".csv"]

      for (const file of fileArray) {
        const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
        if (!hasValidExtension) {
          throw new Error(`Invalid file type: ${file.name}. Please upload MD, DOCX, DOC, PDF, or CSV files.`)
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File size exceeds 10MB: ${file.name}`)
        }
      }

      let totalAddedCount = 0
      let totalSkippedCount = 0
      const skippedFlights: string[] = []
      const failedFiles: string[] = []

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const fileProgress = Math.floor((i / fileArray.length) * 80) + 10
        setProgress(fileProgress)

        try {
          const parsedLoadPlans = await parseLoadPlanFile(file)

          if (parsedLoadPlans && parsedLoadPlans.length > 0) {
            parsedLoadPlans.forEach((loadPlan) => {
              const exists = loadPlans.some((lp) => lp.flight === loadPlan.flight)
              if (exists) {
                totalSkippedCount++
                skippedFlights.push(loadPlan.flight)
                // Update existing plan
                addLoadPlan(loadPlan)
              } else {
                addLoadPlan(loadPlan)
                totalAddedCount++
              }
            })
          } else {
            failedFiles.push(file.name)
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError)
          failedFiles.push(file.name)
        }
      }

      setProgress(100)

      if (totalAddedCount > 0 || totalSkippedCount > 0) {
        let message = `Processed ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}. `
        if (totalAddedCount > 0) {
          message += `Successfully added ${totalAddedCount} load plan${totalAddedCount > 1 ? "s" : ""}. `
        }
        if (totalSkippedCount > 0) {
          message += `${totalSkippedCount} flight${totalSkippedCount > 1 ? "s" : ""} already exist${totalSkippedCount > 1 ? "" : "s"} (${skippedFlights.slice(0, 5).join(", ")}${skippedFlights.length > 5 ? `, and ${skippedFlights.length - 5} more` : ""}) and ${totalSkippedCount > 1 ? "were" : "was"} skipped. `
        }
        if (failedFiles.length > 0) {
          message += `${failedFiles.length} file${failedFiles.length > 1 ? "s" : ""} could not be parsed (${failedFiles.slice(0, 3).join(", ")}${failedFiles.length > 3 ? "..." : ""}).`
        }

        setTimeout(() => {
          alert(message)
        }, 100)
      } else {
        throw new Error(`Could not parse any load plans from ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}. Please check the file format${fileArray.length > 1 ? "s" : ""}.`)
      }

      setShowUploadModal(false)
    } catch (err) {
      console.error("Error uploading files:", err)
      setError(err instanceof Error ? err.message : "Error processing files. Please try again.")
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
                {loadPlans.length === 0 ? (
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
