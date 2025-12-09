"use client"

import { useState, useMemo } from "react"
import { Search, Plus, Trash2, Shield, Settings, ArrowLeft } from "lucide-react"
import { TagInput } from "./tag-input"

type MasterScreeningRule = {
  id: string
  inboundCountry: string
  inboundCity: string
  inboundCode: string
  outboundCountry: string
  outboundCity: string
  outboundCode: string
  remarks: string
}

type InboundScreeningEntry = {
  country: string
  city: string
  code: string
  remarks: string
  isFirstInGroup: boolean
  groupSize: number
  textColor?: string
  isBold?: boolean
  isSpecialRow?: boolean
  colSpan?: number
}

type OutboundScreeningEntry = {
  country: string
  city: string
  code: string
  isFirstInGroup: boolean
  groupSize: number
  textColor?: string
}

// Helper functions to process screening rules
function generateInboundScreening(rules: MasterScreeningRule[]): InboundScreeningEntry[] {
  const entries: InboundScreeningEntry[] = []
  
  // Filter rules where inbound is not "*" (meaning there's an inbound screening requirement)
  const inboundRules = rules.filter(
    rule => rule.inboundCountry !== "*" && rule.inboundCode !== "*"
  )
  
  // Group by country
  const countryGroups = new Map<string, Array<{ city: string; code: string; remarks: string }>>()
  
  inboundRules.forEach(rule => {
    const codes = rule.inboundCode.split(',').map(c => c.trim())
    const cities = rule.inboundCity.includes(',') 
      ? rule.inboundCity.split(',').map(c => c.trim())
      : [rule.inboundCity]
    
    codes.forEach((code, idx) => {
      const city = cities[idx] || cities[0] || rule.inboundCity
      if (!countryGroups.has(rule.inboundCountry)) {
        countryGroups.set(rule.inboundCountry, [])
      }
      countryGroups.get(rule.inboundCountry)!.push({ city, code, remarks: rule.remarks })
    })
  })
  
  // Convert to entries with proper grouping
  countryGroups.forEach((items, country) => {
    items.forEach((item, idx) => {
      entries.push({
        country: country,
        city: item.city,
        code: item.code,
        remarks: item.remarks,
        isFirstInGroup: idx === 0,
        groupSize: items.length,
        isBold: item.code !== "" && item.code !== "*",
        isSpecialRow: false,
        colSpan: 1
      })
    })
  })
  
  // Add special rows (special cases with specific logic)
  const specialRules = rules.filter(rule => 
    rule.inboundCountry === "RFS (Trucks)" ||
    rule.inboundCountry === "PO MAIL" ||
    rule.inboundCountry === "High Risk Cargo & Mail (HRCM)"
  )
  
  specialRules.forEach(rule => {
    entries.push({
      country: rule.inboundCountry,
      city: rule.inboundCity,
      code: "",
      remarks: rule.remarks,
      isFirstInGroup: true,
      groupSize: 1,
      isSpecialRow: true,
      colSpan: 1
    })
  })
  
  // Add special destination-based rows
  const specialDestRules = rules.filter(rule =>
    (rule.inboundCountry === "Bangladesh" && rule.outboundCountry === "Australia") ||
    (rule.inboundCountry === "Egypt" && rule.outboundCountry === "Australia")
  )
  
  specialDestRules.forEach(rule => {
    entries.push({
      country: "",
      city: "",
      code: "",
      remarks: `${rule.inboundCountry} to ${rule.outboundCountry} ${rule.remarks}`,
      isFirstInGroup: true,
      groupSize: 1,
      isSpecialRow: true,
      colSpan: 3
    })
  })
  
  return entries
}

function generateOutboundScreening(rules: MasterScreeningRule[]): OutboundScreeningEntry[] {
  const entries: OutboundScreeningEntry[] = []
  
  // Filter rules where outbound is not "*" and inbound is "*"
  const outboundRules = rules.filter(
    rule => rule.outboundCountry !== "*" && 
            rule.outboundCountry !== "EU" && 
            rule.outboundCountry !== "EU/UK" &&
            rule.outboundCountry !== "Australia" &&
            rule.inboundCountry === "*"
  )
  
  // Group by country
  const countryGroups = new Map<string, Array<{ city: string; code: string }>>()
  
  outboundRules.forEach(rule => {
    const codes = rule.outboundCode.split(',').map(c => c.trim())
    const cities = rule.outboundCity.includes(',') && codes.length > 1
      ? rule.outboundCity.split(',').map(c => c.trim())
      : codes.map(() => rule.outboundCity)
    
    codes.forEach((code, idx) => {
      const city = cities[idx] || rule.outboundCity
      if (!countryGroups.has(rule.outboundCountry)) {
        countryGroups.set(rule.outboundCountry, [])
      }
      countryGroups.get(rule.outboundCountry)!.push({ city, code })
    })
  })
  
  // Convert to entries with proper grouping
  countryGroups.forEach((items, country) => {
    items.forEach((item, idx) => {
      entries.push({
        country: country,
        city: item.city,
        code: item.code,
        isFirstInGroup: idx === 0,
        groupSize: items.length,
        textColor: country === "Egypt" ? "text-red-600" : undefined
      })
    })
  })
  
  return entries
}

function generateHRCMforEU(rules: MasterScreeningRule[]): string[] {
  const countries = rules
    .filter(rule => 
      rule.remarks.includes("SHR to be applied on CSD") && 
      rule.outboundCountry === "EU"
    )
    .map(rule => rule.inboundCountry)
  
  return countries
}

function generateHRCMforCanada(rules: MasterScreeningRule[]): { regular: string[]; embargo: string[] } {
  const canadaRules = rules.filter(rule => 
    rule.outboundCountry === "Canada" && 
    rule.inboundCountry !== "*"
  )
  
  const regular = canadaRules
    .filter(rule => !rule.remarks.toLowerCase().includes("embargo"))
    .map(rule => rule.inboundCountry)
  
  const embargo = canadaRules
    .filter(rule => rule.remarks.toLowerCase().includes("embargo"))
    .map(rule => rule.inboundCountry)
  
  return { regular, embargo }
}

function generateNonRA3Stations(rules: MasterScreeningRule[]): Array<{ city: string; code: string; remarks: string }> {
  return rules
    .filter(rule => rule.remarks.includes("Not validated RA3"))
    .map(rule => ({
      city: rule.inboundCity,
      code: rule.inboundCode,
      remarks: rule.remarks
    }))
}

export default function SettingsScreening() {
  const [showMasterTable, setShowMasterTable] = useState(false)

  // Master screening table combining all rules
  const [screeningRules, setScreeningRules] = useState<MasterScreeningRule[]>([
    // US Outbound Screening Requirements
    { id: "1", inboundCountry: "*", inboundCity: "*", inboundCode: "*", outboundCountry: "United States of America", outboundCity: "*All US cities", outboundCode: "JFK,SEA,MCO,LAX,IAH,BOS,DFW,IAD,SFO,ORD,FLL,EWR,MIA", remarks: "" },
    
    // Canada Outbound Screening Requirements
    { id: "2", inboundCountry: "*", inboundCity: "*", inboundCode: "*", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "" },
    
    // High Risk Countries for EU - Inbound Screening
    { id: "3", inboundCountry: "Nigeria", inboundCity: "*All cities in Nigeria", inboundCode: "LOS,ABV", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "4", inboundCountry: "Federal Republic of Somalia", inboundCity: "*", inboundCode: "*", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "5", inboundCountry: "Republic of Iraq", inboundCity: "*All cities in Iraq", inboundCode: "BGW,BSR,EBL", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "6", inboundCountry: "Islamic Republic of Afghanistan", inboundCity: "*", inboundCode: "*", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "7", inboundCountry: "Republic of Mali", inboundCity: "*", inboundCode: "*", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "8", inboundCountry: "Islamic Republic of Mauritania", inboundCity: "*", inboundCode: "*", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "9", inboundCountry: "Republic of Niger", inboundCity: "*", inboundCode: "*", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "10", inboundCountry: "Islamic Republic of Pakistan", inboundCity: "*All cities in Pakistan", inboundCode: "SKT,PEW,KHI,ISB,LHE,MUX", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "11", inboundCountry: "Republic of the Sudan", inboundCity: "KHARTOUM", inboundCode: "KRT", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "12", inboundCountry: "Lebanese Republic", inboundCity: "BEIRUT", inboundCode: "BEY", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "13", inboundCountry: "Republic of Yemen", inboundCity: "*", inboundCode: "*", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "14", inboundCountry: "Libya", inboundCity: "*", inboundCode: "*", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "15", inboundCountry: "Syrian Arab Republic", inboundCity: "*", inboundCode: "*", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "16", inboundCountry: "People's Republic of Bangladesh", inboundCity: "DHAKA", inboundCode: "DAC", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "17", inboundCountry: "Republic of Chad", inboundCity: "*", inboundCode: "*", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    { id: "18", inboundCountry: "Kuwait", inboundCity: "*", inboundCode: "*", outboundCountry: "EU", outboundCity: "*All countries in EU", outboundCode: "*", remarks: "SHR to be applied on CSD" },
    
    // High Risk Countries for Canada - Inbound Screening
    { id: "19", inboundCountry: "Afghanistan", inboundCity: "*", inboundCode: "*", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "Embargo" },
    { id: "20", inboundCountry: "Nigeria", inboundCity: "*All cities in Nigeria", inboundCode: "LOS,ABV", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "" },
    { id: "21", inboundCountry: "Iran", inboundCity: "*All cities in Iran", inboundCode: "IKA,MHD", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "" },
    { id: "22", inboundCountry: "Sudan", inboundCity: "KHARTOUM", inboundCode: "KRT", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "" },
    { id: "23", inboundCountry: "Iraq", inboundCity: "*All cities in Iraq", inboundCode: "BGW,BSR,EBL", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "" },
    { id: "24", inboundCountry: "Syria", inboundCity: "*", inboundCode: "*", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "" },
    { id: "25", inboundCountry: "Lebanon", inboundCity: "BEIRUT", inboundCode: "BEY", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "" },
    { id: "26", inboundCountry: "Mali", inboundCity: "*", inboundCode: "*", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "" },
    { id: "27", inboundCountry: "Libya", inboundCity: "*", inboundCode: "*", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "" },
    { id: "28", inboundCountry: "Somalia", inboundCity: "*", inboundCode: "*", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "Embargo" },
    { id: "29", inboundCountry: "Yemen", inboundCity: "*", inboundCode: "*", outboundCountry: "Canada", outboundCity: "*All Canadian cities", outboundCode: "YYZ,YUL", remarks: "Embargo" },
    
    // Other specific screening requirements
    { id: "30", inboundCountry: "Pakistan", inboundCity: "*All cities in Pakistan", inboundCode: "SKT,PEW,KHI,ISB,LHE,MUX", outboundCountry: "*", outboundCity: "*", outboundCode: "*", remarks: "Inbound screening required" },
    { id: "31", inboundCountry: "Iran", inboundCity: "TEHRAN", inboundCode: "IKA", outboundCountry: "*", outboundCity: "*", outboundCode: "*", remarks: "Inbound screening required" },
    { id: "32", inboundCountry: "Guinea", inboundCity: "Conakry", inboundCode: "CKY", outboundCountry: "*", outboundCity: "*", outboundCode: "*", remarks: "Drug Detection screening on arrival" },
    { id: "33", inboundCountry: "Bangladesh", inboundCity: "DHAKA", inboundCode: "DAC", outboundCountry: "Australia", outboundCity: "*", outboundCode: "*", remarks: "Require screening if not SHR" },
    { id: "34", inboundCountry: "Egypt", inboundCity: "CAIRO", inboundCode: "CAI", outboundCountry: "Australia", outboundCity: "*", outboundCode: "*", remarks: "Require screening - Embargo in NGSC" },
    { id: "35", inboundCountry: "*", inboundCity: "*", inboundCode: "*", outboundCountry: "Israel", outboundCity: "Tel Aviv", outboundCode: "TLV", remarks: "" },
    { id: "36", inboundCountry: "*", inboundCity: "*", inboundCode: "*", outboundCountry: "Lebanon", outboundCity: "BEIRUT", outboundCode: "BEY", remarks: "" },
    { id: "37", inboundCountry: "*", inboundCity: "*", inboundCode: "*", outboundCountry: "Egypt", outboundCity: "CAIRO", outboundCode: "CAI", remarks: "" },
    { id: "38", inboundCountry: "*", inboundCity: "*", inboundCode: "*", outboundCountry: "Turkey", outboundCity: "ISTANBUL", outboundCode: "IST", remarks: "" },
    { id: "39", inboundCountry: "*", inboundCity: "*", inboundCode: "*", outboundCountry: "Turkey", outboundCity: "SABIHA GOKCEN", outboundCode: "SAW", remarks: "" },
    { id: "40", inboundCountry: "*", inboundCity: "*", inboundCode: "*", outboundCountry: "Iraq", outboundCity: "BAGHDAD", outboundCode: "BGW", remarks: "" },
    { id: "41", inboundCountry: "*", inboundCity: "*", inboundCode: "*", outboundCountry: "Iraq", outboundCity: "BASRA / Erbil", outboundCode: "BSR / EBL", remarks: "" },
    
    // Special cases
    { id: "42", inboundCountry: "RFS (Trucks)", inboundCity: "All trucks", inboundCode: "*", outboundCountry: "*", outboundCity: "*", outboundCode: "*", remarks: "Except from DWC" },
    { id: "43", inboundCountry: "PO MAIL", inboundCity: "All transit and transfer mail", inboundCode: "*", outboundCountry: "*", outboundCity: "*", outboundCode: "*", remarks: "" },
    { id: "44", inboundCountry: "High Risk Cargo & Mail (HRCM)", inboundCity: "*", inboundCode: "*", outboundCountry: "*", outboundCity: "*", outboundCode: "*", remarks: "Reference C&MHM C.6/5.2" },
    { id: "45", inboundCountry: "Cyprus", inboundCity: "LARNACA", inboundCode: "LCA", outboundCountry: "*", outboundCity: "*", outboundCode: "*", remarks: "" },
    { id: "46", inboundCountry: "France", inboundCity: "CDG / NCE", inboundCode: "CDG,NCE", outboundCountry: "*", outboundCity: "*", outboundCode: "*", remarks: "Screening commenced eff 29OCT, discontinued 10NOV2020" },
    { id: "47", inboundCountry: "Jordan", inboundCity: "AMMAN", inboundCode: "AMM", outboundCountry: "*", outboundCity: "*", outboundCode: "*", remarks: "" },
    
    // Stations not validated RA3
    { id: "48", inboundCountry: "Iraq", inboundCity: "Basra", inboundCode: "BSR", outboundCountry: "EU/UK", outboundCity: "*", outboundCode: "*", remarks: "Not validated RA3 as per EU and UK ACC3/RA3 Security programme" },
    { id: "49", inboundCountry: "Guinea", inboundCity: "Conakry", inboundCode: "CKY", outboundCountry: "EU/UK", outboundCity: "*", outboundCode: "*", remarks: "Not validated RA3 as per EU and UK ACC3/RA3 Security programme" },
    { id: "50", inboundCountry: "Russia", inboundCity: "Moscow", inboundCode: "DME", outboundCountry: "EU/UK", outboundCity: "*", outboundCode: "*", remarks: "Not validated RA3 as per EU and UK ACC3/RA3 Security programme" },
    { id: "51", inboundCountry: "Iran", inboundCity: "Tehran", inboundCode: "IKA", outboundCountry: "EU/UK", outboundCity: "*", outboundCode: "*", remarks: "Not validated RA3 as per EU and UK ACC3/RA3 Security programme" },
    { id: "52", inboundCountry: "Russia", inboundCity: "Saint Petersburg", inboundCode: "LED", outboundCountry: "EU/UK", outboundCity: "*", outboundCode: "*", remarks: "Not validated RA3 as per EU and UK ACC3/RA3 Security programme" },
    { id: "53", inboundCountry: "Saudi Arabia", inboundCity: "Medina", inboundCode: "MED", outboundCountry: "EU/UK", outboundCity: "*", outboundCode: "*", remarks: "Not validated RA3 as per EU and UK ACC3/RA3 Security programme" },
    { id: "54", inboundCountry: "India", inboundCity: "Trivandrum", inboundCode: "TRV", outboundCountry: "EU/UK", outboundCity: "*", outboundCode: "*", remarks: "Not validated RA3 as per EU and UK ACC3/RA3 Security programme" },
    { id: "55", inboundCountry: "Cambodia", inboundCity: "Siem Reap", inboundCode: "SAI", outboundCountry: "EU/UK", outboundCity: "*", outboundCode: "*", remarks: "Not validated RA3 - Valid until 18-08-2025" },
    { id: "56", inboundCountry: "Vietnam", inboundCity: "DA NANG", inboundCode: "DAD", outboundCountry: "EU/UK", outboundCity: "*", outboundCode: "*", remarks: "Not validated RA3 - Valid until 03-11-2025" },
  ])

  // Compute table data from screening rules
  const inboundData = useMemo(() => generateInboundScreening(screeningRules), [screeningRules])
  const outboundData = useMemo(() => generateOutboundScreening(screeningRules), [screeningRules])
  const hrcmEUData = useMemo(() => generateHRCMforEU(screeningRules), [screeningRules])
  const hrcmCanadaData = useMemo(() => generateHRCMforCanada(screeningRules), [screeningRules])
  const nonRA3Data = useMemo(() => generateNonRA3Stations(screeningRules), [screeningRules])

  const updateRule = (id: string, field: keyof MasterScreeningRule, value: string) => {
    setScreeningRules(screeningRules.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)))
  }

  const addRule = () => {
    const newId = Date.now().toString()
    setScreeningRules([
      ...screeningRules,
      {
        id: newId,
        inboundCountry: "",
        inboundCity: "",
        inboundCode: "",
        outboundCountry: "",
        outboundCity: "",
        outboundCode: "",
        remarks: "",
      },
    ])
  }

  const deleteRule = (id: string) => {
    setScreeningRules(screeningRules.filter((rule) => rule.id !== id))
  }

  const EditableCell = ({
    value,
    onChange,
    className = "",
  }: {
    value: string
    onChange: (value: string) => void
    className?: string
  }) => {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-2 py-1 text-xs border border-transparent rounded hover:border-gray-300 focus:border-[#D71A21] focus:outline-none focus:ring-1 focus:ring-[#D71A21] bg-transparent ${className}`}
      />
    )
  }

  const renderMasterTable = () => {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="bg-[#D71A21] text-white px-4 py-3 flex items-center gap-2 flex-shrink-0">
          <Shield className="w-5 h-5 flex-shrink-0" />
          <h2 className="text-base font-semibold">MASTER SCREENING REQUIREMENTS</h2>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                  INBOUND COUNTRY
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                  INBOUND CITY
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                  INBOUND CODE
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                  OUTBOUND COUNTRY
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                  OUTBOUND CITY
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                  OUTBOUND CODE
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">REMARKS</th>
                <th className="px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {screeningRules.map((rule) => (
                <tr key={rule.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <EditableCell value={rule.inboundCountry} onChange={(value) => updateRule(rule.id, "inboundCountry", value)} />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={rule.inboundCity} onChange={(value) => updateRule(rule.id, "inboundCity", value)} />
                  </td>
                  <td className="px-3 py-2">
                    <TagInput 
                      value={rule.inboundCode} 
                      onChange={(value) => updateRule(rule.id, "inboundCode", value)}
                      placeholder="Add code..."
                      maxVisible={2}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={rule.outboundCountry} onChange={(value) => updateRule(rule.id, "outboundCountry", value)} />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={rule.outboundCity} onChange={(value) => updateRule(rule.id, "outboundCity", value)} />
                  </td>
                  <td className="px-3 py-2">
                    <TagInput 
                      value={rule.outboundCode} 
                      onChange={(value) => updateRule(rule.id, "outboundCode", value)}
                      placeholder="Add code..."
                      maxVisible={2}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={rule.remarks} onChange={(value) => updateRule(rule.id, "remarks", value)} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={addRule}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-[#D71A21] hover:bg-gray-50 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
        </div>
      </div>
    )
  }

  const renderMainView = () => {
    return (
      <>
        {/* Inbound and Outbound Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Inbound Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-[#D71A21] text-white px-4 py-3">
              <h2 className="text-base font-semibold">INBOUND SCREENING REQUIREMENTS</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">COUNTRY</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">CITIES</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">CODE</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900">
                  {inboundData.map((entry, idx) => {
                    if (entry.colSpan === 3) {
                      return (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="px-3 py-2 font-bold" colSpan={3}>
                            {entry.remarks}
                          </td>
                        </tr>
                      )
                    }
                    
                    return (
                      <tr key={idx} className={`border-b border-gray-100 ${entry.textColor || ""}`}>
                        {entry.isFirstInGroup && entry.groupSize > 1 ? (
                          <td className="px-3 py-2" rowSpan={entry.groupSize}>
                            {entry.country}
                          </td>
                        ) : entry.groupSize === 1 ? (
                          <td className="px-3 py-2">{entry.country}</td>
                        ) : null}
                        <td className={`px-3 py-2 ${entry.isBold ? "font-bold" : ""}`}>
                          {entry.city}
                        </td>
                        <td className={`px-3 py-2 ${entry.isBold ? "font-bold" : ""}`}>
                          {entry.code}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Outbound Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-[#D71A21] text-white px-4 py-3">
              <h2 className="text-base font-semibold">OUTBOUND SCREENING REQUIREMENTS</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">COUNTRY</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">CITIES</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">CODE</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900">
                  {outboundData.map((entry, idx) => (
                    <tr key={idx} className={`border-b border-gray-100 ${entry.textColor || ""}`}>
                      {entry.isFirstInGroup && entry.groupSize > 1 ? (
                        <td className="px-3 py-2" rowSpan={entry.groupSize}>
                          {entry.country}
                        </td>
                      ) : entry.groupSize === 1 ? (
                        <td className="px-3 py-2">{entry.country}</td>
                      ) : null}
                      <td className="px-3 py-2 font-bold">{entry.city}</td>
                      <td className="px-3 py-2 font-bold">{entry.code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* HRCM Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* HRCM for EU */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-[#D71A21] text-white px-4 py-3 text-center">
              <h2 className="text-base font-semibold">High Risk Cargo and Mail (HRCM)</h2>
              <p className="text-sm">List of High Risk countries for EU</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <tbody className="text-gray-900">
                  {Array.from({ length: Math.ceil(hrcmEUData.length / 2) }).map((_, rowIdx) => {
                    const leftIdx = rowIdx * 2
                    const rightIdx = leftIdx + 1
                    return (
                      <tr key={rowIdx} className="border-b border-gray-200">
                        <td className="px-3 py-2 border-r border-gray-200">
                          {hrcmEUData[leftIdx] || ""}
                        </td>
                        <td className="px-3 py-2">
                          {hrcmEUData[rightIdx] || ""}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* HRCM for Canada */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-[#D71A21] text-white px-4 py-3 text-center">
              <h2 className="text-base font-semibold">High Risk Cargo and Mail (HRCM)</h2>
              <p className="text-sm">List of High Risk countries for Canada</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <tbody className="text-gray-900">
                  {Array.from({ length: Math.ceil(hrcmCanadaData.regular.length / 2) }).map((_, rowIdx) => {
                    const leftIdx = rowIdx * 2
                    const rightIdx = leftIdx + 1
                    return (
                      <tr key={`regular-${rowIdx}`} className="border-b border-gray-200">
                        <td className="px-3 py-2 border-r border-gray-200">
                          {hrcmCanadaData.regular[leftIdx] || ""}
                        </td>
                        <td className="px-3 py-2">
                          {hrcmCanadaData.regular[rightIdx] || ""}
                        </td>
                      </tr>
                    )
                  })}
                  {hrcmCanadaData.embargo.length > 0 && (
                    <>
                      <tr className="border-b-4 border-[#D71A21]">
                        <td className="px-3 py-2 text-center font-bold" colSpan={2}>
                          Embargo
                        </td>
                      </tr>
                      {Array.from({ length: Math.ceil(hrcmCanadaData.embargo.length / 2) }).map((_, rowIdx) => {
                        const leftIdx = rowIdx * 2
                        const rightIdx = leftIdx + 1
                        return (
                          <tr key={`embargo-${rowIdx}`} className="border-b border-gray-200">
                            <td className="px-3 py-2 border-r border-gray-200">
                              {hrcmCanadaData.embargo[leftIdx] || ""}
                            </td>
                            <td className="px-3 py-2">
                              {hrcmCanadaData.embargo[rightIdx] || ""}
                            </td>
                          </tr>
                        )
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 text-xs text-gray-700 italic border-t border-gray-200">
              <p>
                Cargo originated / received / accepted from, or transiting through High Risk countries as mentioned above and has
                not been screened with two of the screening methods at origin, then Hub operations must screen the cargo by using
                two of the screening methods. CSD from origin must be fully reviewed to ensure compliance and recovery action.
              </p>
            </div>
          </div>
        </div>

        {/* Non-RA3 Validated Stations */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <div className="bg-[#D71A21] text-white px-4 py-3 text-center">
            <h2 className="text-base font-semibold">
              Stations that are not validated RA3 as per EU and UK ACC3/RA3 Security programme
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900">
              {Array.from({ length: 2 }).map((_, colIdx) => (
                <div key={colIdx} className="space-y-2">
                  {nonRA3Data
                    .filter((_, idx) => idx % 2 === colIdx)
                    .map((station, idx) => {
                      const displayText = station.code 
                        ? `${station.city} (${station.code})`
                        : station.city
                      
                      const hasValidityDate = station.remarks.includes("Valid until")
                      const validityMatch = station.remarks.match(/Valid until (\d{2}-\d{2}-\d{4})/)
                      const validityText = validityMatch ? ` ** ${validityMatch[1]}` : ""
                      
                      return (
                        <p key={idx}>
                          {displayText}{validityText}
                        </p>
                      )
                    })}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-700">
              <p>
                Ensure that whenever there is cargo destined to, transiting via or transferring from EU/UK that such cargo is
                subject to rescreening at Hub (DXB/DWC) and new CSD for These stations are prepared - (ref email - Mohamed
                Abubakar /Friday, January 12, 2024 9:03 AM)
              </p>
            </div>
          </div>
        </div>

        {/* List of high risk countries (SHR to be applied on CSD) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <div className="bg-[#D71A21] text-white px-4 py-3 text-center">
            <h2 className="text-lg font-bold">List of high risk countries</h2>
            <p className="text-sm">(SHR to be applied on CSD)</p>
          </div>
        </div>

        {/* Footnotes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Footnotes</h3>
          <div className="space-y-2 text-sm">
            <p className="text-blue-600">
              * CKY effective 27MAR 2023, Drug Detection screening on arrival (MEMO 0007/2023/AB)
            </p>
            <p className="text-gray-900">
              * Effective 12MAy2022, Nigeria all inbound screening (ref message from Hassan / Thomas 12 May 2022 11:29)
            </p>
            <p className="text-blue-600">
              * France screening commenced eff 29OCT and discontinued on 10NOV2020 (email Trevor - Safi)
            </p>
            <p className="text-gray-900">
              * KRT {"-->"} Effective 22OCT 100% piece by piece screening of import cargo. (Trevor)
            </p>
            <p className="text-red-600">
              ** Turkey Screening discontinued - (email From: Trevor Howard - MSOS(EK) Sent: 24 June 2020 14:55)
            </p>
            <p className="text-gray-900">
              *DAC Screening applicable only if cargo not passed through EDS machine and RA3 area in DAC.
            </p>
            <p className="text-purple-600">
              * LCA revoked from inbound screening effective 29/08/2019. (ref email from S&P)
            </p>
            <p className="text-red-600">
              * CAI/AMM revoked from inbound/outbound screening effective 24FEB2020 . (ref email from S&P date 24 February 2020
              15:09)
            </p>
            <p className="text-gray-900">
              * MUX / MHD - Route flight not operating (terminated 28-Oct-2018)
            </p>
            <p className="line-through text-gray-600">
              *EBL - Route flight not operating (Suspended 22NOV2015). Sereening applieable on freighters.
            </p>
            <p className="text-gray-900">
              * For cargo originating form high risk countries as per Transport Canada dual screening must be performed at LPD
              except for PF, MF & FF (screening needed only if passenger on board : eff 16NOV - Mohd Abubakar) -
            </p>
            <p className="text-orange-600">
              BEY screening effective - 16OCT (reference CARGO OPERATIONS NOTICE - 007A/2023 & MEMOE M00023/RB
            </p>
            <p className="text-orange-600">
              BEY - In reference to CON -003/2025, screening mandates updated, Export screening only from BAH, CAl, Iraq, IKA,
              KWI, Oman
            </p>
            <p className="text-red-600">
              RESCREENING OF IRAQ DESTINED SHIPMENTS AT HUB - Deactivated ref: email : SkyCargo - S&P Support Friday, May 9, 2025
              3:00 PM
            </p>
            <p className="text-gray-900">
              Withdraw the re-screening requirement from ISB, KHI, LHE & Nigeria - Email from Thomas, Thursday, July 10, 2025
              11:34:47 pm
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Screening Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Configure screening parameters and rules</p>
          </div>
          {!showMasterTable ? (
            <button
              onClick={() => setShowMasterTable(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#D71A21] text-white rounded-lg hover:bg-[#B71419] transition-colors text-sm font-medium"
            >
              <Settings className="w-4 h-4" />
              Rules
            </button>
          ) : (
            <button
              onClick={() => setShowMasterTable(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Main View
            </button>
          )}
        </div>

        {/* Content */}
        {showMasterTable ? renderMasterTable() : renderMainView()}
      </div>
    </div>
  )
}

