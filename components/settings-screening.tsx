"use client"

import { useState } from "react"
import { Search, Plus, Trash2, Shield, Settings, ArrowLeft } from "lucide-react"

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
                    <EditableCell value={rule.inboundCode} onChange={(value) => updateRule(rule.id, "inboundCode", value)} />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={rule.outboundCountry} onChange={(value) => updateRule(rule.id, "outboundCountry", value)} />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={rule.outboundCity} onChange={(value) => updateRule(rule.id, "outboundCity", value)} />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={rule.outboundCode} onChange={(value) => updateRule(rule.id, "outboundCode", value)} />
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
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Pakistan</td>
                    <td className="px-3 py-2 font-bold">SIALKOT</td>
                    <td className="px-3 py-2 font-bold">SKT</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2 font-bold">PESHAWAR</td>
                    <td className="px-3 py-2 font-bold">PEW</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Iran</td>
                    <td className="px-3 py-2 font-bold">TEHRAN</td>
                    <td className="px-3 py-2 font-bold">IKA</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2 font-bold">BASRA</td>
                    <td className="px-3 py-2 font-bold">BSR</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Iraq</td>
                    <td className="px-3 py-2 font-bold">BAGHDAD</td>
                    <td className="px-3 py-2 font-bold">BGW</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Sudan</td>
                    <td className="px-3 py-2 font-bold">KHARTOUM</td>
                    <td className="px-3 py-2 font-bold">KRT</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">RFS (Trucks)</td>
                    <td className="px-3 py-2">All trucks - except from DWC</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">PO MAIL</td>
                    <td className="px-3 py-2">All transit and transfer mail</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">High Risk Cargo & Mail (HRCM)</td>
                    <td className="px-3 py-2">Reference C&MHM C.6/5.2</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Guinea</td>
                    <td className="px-3 py-2">Conakry</td>
                    <td className="px-3 py-2 font-bold">CKY</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">Bangladesh</td>
                    <td className="px-3 py-2">DHAKA</td>
                    <td className="px-3 py-2 font-bold">DAC*</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2" rowSpan={3}>Pakistan</td>
                    <td className="px-3 py-2 font-bold">KARACHI</td>
                    <td className="px-3 py-2 font-bold">KHI</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">ISLAMABAD</td>
                    <td className="px-3 py-2 font-bold">ISB</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">LAHORE</td>
                    <td className="px-3 py-2 font-bold">LHE</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2" rowSpan={2}>Nigeria</td>
                    <td className="px-3 py-2">Lagos</td>
                    <td className="px-3 py-2 font-bold">LOS</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Abuja</td>
                    <td className="px-3 py-2 font-bold">ABV</td>
                  </tr>
                  <tr className="border-b border-gray-100 text-red-600">
                    <td className="px-3 py-2 font-bold">CAIRO</td>
                    <td className="px-3 py-2 font-bold">Egypt</td>
                    <td className="px-3 py-2 font-bold">CAI</td>
                  </tr>
                  <tr className="border-b border-gray-100 text-red-600">
                    <td className="px-3 py-2 font-bold">AMMAN</td>
                    <td className="px-3 py-2 font-bold">Jordan</td>
                    <td className="px-3 py-2 font-bold">AMM</td>
                  </tr>
                  <tr className="border-b border-gray-100 text-purple-600">
                    <td className="px-3 py-2 font-bold">LARNACA</td>
                    <td className="px-3 py-2 font-bold">Cyprus</td>
                    <td className="px-3 py-2 font-bold">LCA*</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">MULTAN</td>
                    <td className="px-3 py-2">Pakistan</td>
                    <td className="px-3 py-2 font-bold">MUX</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">MASHAD</td>
                    <td className="px-3 py-2">Iran</td>
                    <td className="px-3 py-2 font-bold">MHD</td>
                  </tr>
                  <tr className="border-b border-gray-100 text-blue-600">
                    <td className="px-3 py-2 font-bold">CDG / NCE</td>
                    <td className="px-3 py-2 font-bold">FRANCE</td>
                    <td className="px-3 py-2 font-bold">FRANCE</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Lebanon</td>
                    <td className="px-3 py-2 font-bold">BEIRUT</td>
                    <td className="px-3 py-2 font-bold">BEY</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold" colSpan={3}>
                      <span className="font-bold">Bangladesh</span> to <span className="font-bold">Australia</span> require
                      screening if not SHR
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold" colSpan={3}>
                      <span className="font-bold">Egypt</span> to <span className="font-bold">Australia</span> require
                      screening - Embargo in NGSC
                    </td>
                  </tr>
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
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2" rowSpan={13}>
                      United States of America
                    </td>
                    <td className="px-3 py-2 font-bold">NEW YORK</td>
                    <td className="px-3 py-2 font-bold">JFK</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">SEATTLE</td>
                    <td className="px-3 py-2 font-bold">SEA</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">ORLANDO</td>
                    <td className="px-3 py-2 font-bold">MCO</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">LOS ANGELES</td>
                    <td className="px-3 py-2 font-bold">LAX</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">HOUSTON</td>
                    <td className="px-3 py-2 font-bold">IAH</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">BOSTON</td>
                    <td className="px-3 py-2 font-bold">BOS</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">DALLAS</td>
                    <td className="px-3 py-2 font-bold">DFW</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">WASHINGTON</td>
                    <td className="px-3 py-2 font-bold">IAD</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">SAN FRANCISCO</td>
                    <td className="px-3 py-2 font-bold">SFO</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">CHICAGO</td>
                    <td className="px-3 py-2 font-bold">ORD</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">FORT LAUDERDALE</td>
                    <td className="px-3 py-2 font-bold">FLL</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">NEWARK</td>
                    <td className="px-3 py-2 font-bold">EWR</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">MIAMI</td>
                    <td className="px-3 py-2 font-bold">MIA</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2" rowSpan={2}>
                      Canada*
                    </td>
                    <td className="px-3 py-2 font-bold">TORONTO</td>
                    <td className="px-3 py-2 font-bold">YYZ</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">MONTREAL</td>
                    <td className="px-3 py-2 font-bold">YUL</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Israel</td>
                    <td className="px-3 py-2">Tel Aviv</td>
                    <td className="px-3 py-2 font-bold">TLV</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Lebanon*</td>
                    <td className="px-3 py-2 font-bold">BEIRUT</td>
                    <td className="px-3 py-2 font-bold">BEY</td>
                  </tr>
                  <tr className="border-b border-gray-100 text-red-600">
                    <td className="px-3 py-2 font-bold">Egypt</td>
                    <td className="px-3 py-2 font-bold">CAIRO</td>
                    <td className="px-3 py-2 font-bold">CAI</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2" rowSpan={2}>
                      Turkey
                    </td>
                    <td className="px-3 py-2 font-bold">ISTANBUL</td>
                    <td className="px-3 py-2 font-bold">IST</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">SABIHA GOKCEN</td>
                    <td className="px-3 py-2 font-bold">SAW</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2" rowSpan={2}>
                      Iraq
                    </td>
                    <td className="px-3 py-2 font-bold">BAGHDAD</td>
                    <td className="px-3 py-2 font-bold">BGW</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 font-bold">BASRA / Erbil</td>
                    <td className="px-3 py-2 font-bold">BSR / EBL</td>
                  </tr>
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
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Federal Republic of Nigeria</td>
                    <td className="px-3 py-2">Republic of China</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Federal Republic of Somalia</td>
                    <td className="px-3 py-2">Republic of Iraq</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Islamic Republic of Afghanistan</td>
                    <td className="px-3 py-2">Republic of Mali</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Islamic Republic of Mauritania</td>
                    <td className="px-3 py-2">Republic of Niger</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Islamic Republic of Pakistan</td>
                    <td className="px-3 py-2">Republic of the Sudan</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Lebanese Republic</td>
                    <td className="px-3 py-2">Republic of Yemen</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Libya</td>
                    <td className="px-3 py-2">Syrian Arab Republic</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">People's Republic of Bangladesh</td>
                    <td className="px-3 py-2">Republic of Chad</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Kuwait</td>
                    <td className="px-3 py-2"></td>
                  </tr>
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
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Afghanistan</td>
                    <td className="px-3 py-2">Nigeria</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Iran</td>
                    <td className="px-3 py-2">Sudan</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Iraq</td>
                    <td className="px-3 py-2">Syria</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Lebanon</td>
                    <td className="px-3 py-2">Mali</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Libya</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="border-b-4 border-[#D71A21]">
                    <td className="px-3 py-2 text-center font-bold" colSpan={2}>
                      Embargo
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 border-r border-gray-200">Somalia</td>
                    <td className="px-3 py-2">Yemen</td>
                  </tr>
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
              <div className="space-y-2">
                <p>Basra (BSR)</p>
                <p>Conakry (CKY)</p>
                <p className="pt-4">Moscow (DME)</p>
                <p>Tehran (IKA)</p>
                <p className="pt-4">Saint Petersburg (LED)</p>
                <p>Medina (MED)</p>
                <p>Trivandrum (TRV)</p>
                <p>Siem Reap (SAI) ** 18-08-2025</p>
                <p>DA NANG (DAD) **03-11-2025</p>
              </div>
              <div className="space-y-2">
                <p className="line-through text-red-600">
                  Krong Ta Khmau - KTH ** 10OCT2025 - Email from Rahul 17 September 2025 07:34
                </p>
                <p className="line-through text-red-600">
                  Istanbul (IST)** Revoked email from Rahul (Thu 11/09/2025 11:57
                </p>
                <p className="pt-4 line-through text-red-600">
                  Phnom Penh (PNH) * 01-May-24 (revoked message from Rahul)
                </p>
                <p className="font-bold text-red-600">
                  Denpasar (DPS)** 5-DEC-2024 - updates (09DEC) (Transit Screening Exemption) SHC code for shipments screened by
                  ID/RAC is extended until 01-APR-01 till
                </p>
                <p className="font-bold">
                  ANGKASA PURA LOGISTICS) -ref Rahul email Monday, December 9, 2024 1:36 PM / refer corresponding correction
                  email. K Sent: 28 May 2025 12:24 as RA3/00013-C3 (PT JAS) are now acceptable (MEMO M0002E/2024 relaes on
                  02-JUN-2025)
                </p>
              </div>
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
              * MUX / MHD - PAX flight not operating (terminated 28-Oct-2018)
            </p>
            <p className="line-through text-gray-600">
              *EBL - PAX flight not operating (Suspended 22NOV2015). Sereening applieable on freighters.
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

