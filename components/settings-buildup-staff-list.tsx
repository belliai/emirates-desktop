"use client"

import { useState, useMemo } from "react"
import { Search, ChevronDown, ChevronUp, Plus, Trash2, Edit2, Check, X, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type StaffMember = {
  id: string
  employee_group: string
  contract_id: string
  shift_pattern: string
  staff_no: string
  name: string
  job_code: string
}

type SortConfig = {
  key: keyof StaffMember | null
  direction: "asc" | "desc"
}

// Initial data from CSV
const initialStaffData: StaffMember[] = [
  { id: "1", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_2NI-0", staff_no: "72763", name: "ABDUL, LAMBADE", job_code: "COA" },
  { id: "2", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_CORE_04-0", staff_no: "178205", name: "REJITH, VELLATATH", job_code: "COA" },
  { id: "3", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-0", staff_no: "190514", name: "ZAINAL, ABDEEN", job_code: "CHS" },
  { id: "4", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-1", staff_no: "214255", name: "AJIT, GOPINATHAN", job_code: "CHS" },
  { id: "5", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-3", staff_no: "216403", name: "MOHAMMED, RIZWAN", job_code: "CHS" },
  { id: "6", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-3", staff_no: "238383", name: "VALIYAKATH, SALAHUDHEEN", job_code: "CHS" },
  { id: "7", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-1", staff_no: "239035", name: "FAROOQ, AHMAD", job_code: "CHS" },
  { id: "8", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-0", staff_no: "379571", name: "NADEEM, DESAI", job_code: "CHS" },
  { id: "9", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-1", staff_no: "380202", name: "ASHRAF, JABLE", job_code: "CHS" },
  { id: "10", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-1", staff_no: "381769", name: "REHMAN, ZAIB", job_code: "CHS" },
  { id: "11", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-2", staff_no: "386797", name: "TINTO, JOHNY", job_code: "CHS" },
  { id: "12", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-2", staff_no: "388521", name: "RANDY, LUMIDAO", job_code: "CHS" },
  { id: "13", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_2DX-0", staff_no: "391322", name: "SHANTHA, HAPUTHANTHRIGE", job_code: "COA" },
  { id: "14", employee_group: "CMT_WH_BUILDUP", contract_id: "CTO", shift_pattern: "SC_CORE_04-0", staff_no: "391963", name: "ALVIN, ESCUSA", job_code: "COA" },
  { id: "15", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-2", staff_no: "399883", name: "JAMSHAD MAJEED, CHALIYATH", job_code: "CHS" },
  { id: "16", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_2NI-2", staff_no: "399916", name: "RENATO, LIGAYA", job_code: "COA" },
  { id: "17", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_2NI-0", staff_no: "401648", name: "ZAHID, JANG", job_code: "COA" },
  { id: "18", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_2DX-2", staff_no: "401783", name: "MUHAMMAD, JAMIL", job_code: "COA" },
  { id: "19", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-2", staff_no: "409272", name: "JOSIAH, FERNANDES", job_code: "CHS" },
  { id: "20", employee_group: "CMT_WH_BUILDUP", contract_id: "BUILD-UP", shift_pattern: "SC_2NI-2", staff_no: "410186", name: "MAMOON, ILYAS", job_code: "COA" },
  { id: "21", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-3", staff_no: "416437", name: "ROOSEVELT, DSOUZA", job_code: "CHS" },
  { id: "22", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_CORE_04-3", staff_no: "416445", name: "HARLEY JOYCE, ENRIQUEZ", job_code: "COA" },
  { id: "23", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_CORE_04-3", staff_no: "416793", name: "VINCENT, PEREA", job_code: "COA" },
  { id: "24", employee_group: "CMT_WH_BUILDUP", contract_id: "CTO", shift_pattern: "SC_CORE_04-3", staff_no: "418664", name: "MARK, BERTUMEN", job_code: "COA" },
  { id: "25", employee_group: "CMT_WH_BUILDUP", contract_id: "US- BUILD UP", shift_pattern: "SC_CORE_04-3", staff_no: "423044", name: "BILAL, HUSSAIN", job_code: "COA" },
  { id: "26", employee_group: "CMT_WH_BUILDUP", contract_id: "CTO", shift_pattern: "SC_CORE_04-2", staff_no: "423919", name: "WAQAS, KHAN", job_code: "COA" },
  { id: "27", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_CORE_04-1", staff_no: "425610", name: "SURESH, ACHARYA", job_code: "COA" },
  { id: "28", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_2DX-2", staff_no: "426917", name: "MANOJ, PILIPPU MANDADIGE", job_code: "COA" },
  { id: "29", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_2XP-0", staff_no: "426937", name: "NIRAJ, SHAKYA", job_code: "COA" },
  { id: "30", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_CORE_04-0", staff_no: "427204", name: "MUHAMMAD, NASEER", job_code: "COA" },
  { id: "31", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_CORE_04-1", staff_no: "428762", name: "ROLANDO, TAMAYO", job_code: "COA" },
  { id: "32", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_CORE_04-2", staff_no: "428764", name: "LITTO, AMBOOKEN", job_code: "COA" },
  { id: "33", employee_group: "CMT_WH_BUILDUP", contract_id: "CHASER", shift_pattern: "SC_CORE_04-2", staff_no: "430661", name: "MUHAMMED, POYIKKARA", job_code: "COA" },
  { id: "34", employee_group: "CMT_WH_BUILDUP", contract_id: "BEY - BUILD UP", shift_pattern: "SC_CORE_04-3", staff_no: "431191", name: "SYAM, KUMARI", job_code: "COA" },
  { id: "35", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-1", staff_no: "432198", name: "RAJITH, RAJAN", job_code: "CHS" },
  { id: "36", employee_group: "CMT_WH_BUILDUP", contract_id: "US- BUILD UP", shift_pattern: "SC_CORE_04-2", staff_no: "432856", name: "SAVISH, KOIRALA", job_code: "COA" },
  { id: "37", employee_group: "CMT_WH_BUILDUP", contract_id: "US- BUILD UP", shift_pattern: "SC_CORE_04-0", staff_no: "433740", name: "MANU, VARGHESE", job_code: "COA" },
  { id: "38", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_CORE_04-2", staff_no: "433747", name: "GEORGE, OKECH", job_code: "COA" },
  { id: "39", employee_group: "CMT_WH_BUILDUP", contract_id: "US- BUILD UP", shift_pattern: "SC_CORE_04-0", staff_no: "433752", name: "JITHIN, CHAKKATTIL", job_code: "COA" },
  { id: "40", employee_group: "CMT_WH_BUILDUP", contract_id: "BUILD-UP", shift_pattern: "SC_2DX-2", staff_no: "433757", name: "SANA, ULLAH", job_code: "COA" },
  { id: "41", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_2XP-1", staff_no: "434671", name: "ERIC, MANALO", job_code: "COA" },
  { id: "42", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-3", staff_no: "434675", name: "RAHUL KRISHNAN, KRISHNAN KUTTY NAIR RAJAMMA", job_code: "CHS" },
  { id: "43", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_2NI-0", staff_no: "435773", name: "ALEXEEV, LIPIO", job_code: "COA" },
  { id: "44", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_CORE_04-1", staff_no: "436073", name: "ALIFUDEEN, ABDUL", job_code: "COA" },
  { id: "45", employee_group: "CMT_WH_BUILDUP", contract_id: "FINE SECTOR", shift_pattern: "SC_CORE_04-3", staff_no: "437449", name: "SOHAN, GHIMIRE", job_code: "COA" },
  { id: "46", employee_group: "CMT_WH_BUILDUP", contract_id: "BEY - BUILD UP", shift_pattern: "SC_CORE_04-2", staff_no: "437813", name: "ANEESH, MOHAMED", job_code: "COA" },
  { id: "47", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-2", staff_no: "438051", name: "ANOOP, LEELADHARAN", job_code: "CHS" },
  { id: "48", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-0", staff_no: "438384", name: "RANJIT, RAJGOPAL", job_code: "CHS" },
  { id: "49", employee_group: "CMT_WH_BUILDUP", contract_id: "CHASER", shift_pattern: "SC_CORE_04-3", staff_no: "439111", name: "DAVID, THOMAS", job_code: "COA" },
  { id: "50", employee_group: "CMT_WH_BUILDUP", contract_id: "SUPERVISORS", shift_pattern: "SC_CORE_04-3", staff_no: "439371", name: "KHALIQ, QURESHI", job_code: "CHS" },
]

const contractOptions = [
  "All",
  "BUILD-UP",
  "BEY - BUILD UP",
  "CHASER",
  "CTO",
  "FINE SECTOR",
  "SUPERVISORS",
  "US- BUILD UP",
]

const shiftPatternOptions = [
  "All",
  "SC_2DX-0",
  "SC_2DX-2",
  "SC_2NI-0",
  "SC_2NI-2",
  "SC_2XP-0",
  "SC_2XP-1",
  "SC_CORE_04-0",
  "SC_CORE_04-1",
  "SC_CORE_04-2",
  "SC_CORE_04-3",
]

const jobCodeOptions = ["All", "COA", "CHS"]

export default function SettingsBuildupStaffList() {
  const [staffData, setStaffData] = useState<StaffMember[]>(initialStaffData)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: "asc" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<StaffMember | null>(null)
  const [filters, setFilters] = useState({
    contract_id: "All",
    shift_pattern: "All",
    job_code: "All",
  })
  const [showFilters, setShowFilters] = useState(false)

  // Sort and filter data
  const processedData = useMemo(() => {
    let result = [...staffData]

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.staff_no.includes(query) ||
          item.contract_id.toLowerCase().includes(query) ||
          item.shift_pattern.toLowerCase().includes(query)
      )
    }

    // Apply filters
    if (filters.contract_id !== "All") {
      result = result.filter((item) => item.contract_id === filters.contract_id)
    }
    if (filters.shift_pattern !== "All") {
      result = result.filter((item) => item.shift_pattern === filters.shift_pattern)
    }
    if (filters.job_code !== "All") {
      result = result.filter((item) => item.job_code === filters.job_code)
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key!]
        const bVal = b[sortConfig.key!]
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }

    return result
  }, [staffData, searchQuery, sortConfig, filters])

  const handleSort = (key: keyof StaffMember) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleEdit = (staff: StaffMember) => {
    setEditingId(staff.id)
    setEditingData({ ...staff })
  }

  const handleSaveEdit = () => {
    if (editingData) {
      setStaffData((prev) =>
        prev.map((item) => (item.id === editingData.id ? editingData : item))
      )
      setEditingId(null)
      setEditingData(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingData(null)
  }

  const handleDelete = (id: string) => {
    setStaffData((prev) => prev.filter((item) => item.id !== id))
  }

  const handleAddNew = () => {
    const newId = (Math.max(...staffData.map((s) => parseInt(s.id))) + 1).toString()
    const newStaff: StaffMember = {
      id: newId,
      employee_group: "CMT_WH_BUILDUP",
      contract_id: "BUILD-UP",
      shift_pattern: "SC_CORE_04-0",
      staff_no: "",
      name: "",
      job_code: "COA",
    }
    setStaffData((prev) => [newStaff, ...prev])
    setEditingId(newId)
    setEditingData(newStaff)
  }

  const SortIcon = ({ columnKey }: { columnKey: keyof StaffMember }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronDown className="w-3 h-3 text-white/50 opacity-0 group-hover:opacity-100" />
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-3 h-3 text-white" />
    ) : (
      <ChevronDown className="w-3 h-3 text-white" />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Build-up Staff List</h1>
          <p className="text-sm text-gray-500 mt-1">Manage warehouse build-up staff assignments</p>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, staff no, contract..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-gray-100" : ""}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>

              {/* Add New */}
              <Button
                onClick={handleAddNew}
                className="bg-[#D71A21] hover:bg-[#b81419] text-white"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Staff
              </Button>
            </div>
          </div>

          {/* Filters Row */}
          {showFilters && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Contract:</span>
                <Select
                  value={filters.contract_id}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, contract_id: value }))}
                >
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contractOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Shift:</span>
                <Select
                  value={filters.shift_pattern}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, shift_pattern: value }))}
                >
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftPatternOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Job Code:</span>
                <Select
                  value={filters.job_code}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, job_code: value }))}
                >
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {jobCodeOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ contract_id: "All", shift_pattern: "All", job_code: "All" })}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6 mb-4 px-2">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{processedData.length}</span> of{" "}
            <span className="font-semibold text-gray-900">{staffData.length}</span> staff members
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-sm text-gray-600">
                COA: {staffData.filter((s) => s.job_code === "COA").length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-sm text-gray-600">
                CHS: {staffData.filter((s) => s.job_code === "CHS").length}
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#D71A21] text-white">
                  <th
                    className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider cursor-pointer group"
                    onClick={() => handleSort("staff_no")}
                  >
                    <div className="flex items-center gap-1">
                      Staff No
                      <SortIcon columnKey="staff_no" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider cursor-pointer group"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <SortIcon columnKey="name" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider cursor-pointer group"
                    onClick={() => handleSort("contract_id")}
                  >
                    <div className="flex items-center gap-1">
                      Contract ID
                      <SortIcon columnKey="contract_id" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider cursor-pointer group"
                    onClick={() => handleSort("shift_pattern")}
                  >
                    <div className="flex items-center gap-1">
                      Shift Pattern
                      <SortIcon columnKey="shift_pattern" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider cursor-pointer group"
                    onClick={() => handleSort("job_code")}
                  >
                    <div className="flex items-center gap-1">
                      Job Code
                      <SortIcon columnKey="job_code" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processedData.map((staff, index) => (
                  <tr
                    key={staff.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    {editingId === staff.id && editingData ? (
                      <>
                        <td className="px-4 py-2">
                          <Input
                            value={editingData.staff_no}
                            onChange={(e) =>
                              setEditingData({ ...editingData, staff_no: e.target.value })
                            }
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={editingData.name}
                            onChange={(e) =>
                              setEditingData({ ...editingData, name: e.target.value })
                            }
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Select
                            value={editingData.contract_id}
                            onValueChange={(value) =>
                              setEditingData({ ...editingData, contract_id: value })
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {contractOptions.filter((o) => o !== "All").map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2">
                          <Select
                            value={editingData.shift_pattern}
                            onValueChange={(value) =>
                              setEditingData({ ...editingData, shift_pattern: value })
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {shiftPatternOptions.filter((o) => o !== "All").map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2">
                          <Select
                            value={editingData.job_code}
                            onValueChange={(value) =>
                              setEditingData({ ...editingData, job_code: value })
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {jobCodeOptions.filter((o) => o !== "All").map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleSaveEdit}
                              className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                            {staff.staff_no}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {staff.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{staff.contract_id}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 font-mono">
                            {staff.shift_pattern}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              staff.job_code === "CHS"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {staff.job_code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(staff)}
                              className="h-7 w-7 p-0 text-gray-500 hover:text-[#D71A21] hover:bg-red-50"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(staff.id)}
                              className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

