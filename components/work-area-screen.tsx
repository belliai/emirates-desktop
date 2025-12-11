"use client"

import { useState } from "react"
import { ArrowLeft, Clock } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type WorkArea = "GCR" | "PER" | "PIL"

interface WorkAreaScreenProps {
  workArea: WorkArea
  onBack: () => void
}

// Work area data structure matching situational awareness
const workAreaDataByShift = {
  "0600-0900": {
    overall: {
      GCR: { total: 85, remaining: 45, completed: 40 },
      PER: { total: 62, remaining: 28, completed: 34 },
      PIL: { total: 48, remaining: 22, completed: 26 },
    },
    E75: {
      GCR: { total: 35, remaining: 18, completed: 17 },
      PER: { total: 25, remaining: 12, completed: 13 },
      PIL: { total: 20, remaining: 9, completed: 11 },
    },
    L22: {
      GCR: { total: 28, remaining: 15, completed: 13 },
      PER: { total: 20, remaining: 8, completed: 12 },
      PIL: { total: 15, remaining: 7, completed: 8 },
    },
  },
  "0901-1259": {
    overall: {
      GCR: { total: 92, remaining: 38, completed: 54 },
      PER: { total: 68, remaining: 25, completed: 43 },
      PIL: { total: 52, remaining: 18, completed: 34 },
    },
    E75: {
      GCR: { total: 38, remaining: 15, completed: 23 },
      PER: { total: 28, remaining: 10, completed: 18 },
      PIL: { total: 22, remaining: 8, completed: 14 },
    },
    L22: {
      GCR: { total: 30, remaining: 12, completed: 18 },
      PER: { total: 22, remaining: 8, completed: 14 },
      PIL: { total: 18, remaining: 6, completed: 12 },
    },
  },
}

export default function WorkAreaScreen({ workArea, onBack }: WorkAreaScreenProps) {
  const [selectedShift, setSelectedShift] = useState<"0600-0900" | "0901-1259">("0600-0900")
  const [workAreaFilter, setWorkAreaFilter] = useState<"overall" | "sortByWorkArea">("overall")
  const [selectedWorkArea, setSelectedWorkArea] = useState<string>("E75")

  const currentShiftData = workAreaDataByShift[selectedShift]
  const currentWorkAreaData = currentShiftData[workAreaFilter === "overall" ? "overall" : (selectedWorkArea as keyof typeof currentShiftData)] || currentShiftData.overall
  
  const data = currentWorkAreaData[workArea]
  const completed = data.completed
  const remaining = data.remaining
  const total = data.total
  const efficiency = total > 0 ? ((completed / total) * 100).toFixed(1) : "0"
  const maxBarValue = 100

  const totalPercentage = (total / maxBarValue) * 100
  const completedPercentage = (completed / total) * 100
  const remainingPercentage = (remaining / total) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{workArea} Work Area</h1>
        </div>
      </div>

      <div className="p-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-0 mb-0 bg-white border border-gray-200 divide-x divide-gray-200 mb-4">
          <div className="p-2.5">
            <p className="text-[10px] text-gray-600 mb-0.5 leading-tight">Total ULDs</p>
            <p className="text-xl font-bold text-gray-900 leading-tight">{total}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Across all areas</p>
          </div>
          <div className="p-2.5">
            <p className="text-[10px] text-gray-600 mb-0.5 leading-tight">Completed</p>
            <p className="text-xl font-bold text-green-600 leading-tight">{completed}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{efficiency}% completion rate</p>
          </div>
          <div className="p-2.5">
            <p className="text-[10px] text-gray-600 mb-0.5 leading-tight">Remaining</p>
            <p className="text-xl font-bold text-amber-600 leading-tight">{remaining}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Pending completion</p>
          </div>
          <div className="p-2.5">
            <p className="text-[10px] text-gray-600 mb-0.5 leading-tight">Shift</p>
            <p className="text-lg font-bold text-gray-900 leading-tight">{selectedShift}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Current selection</p>
          </div>
        </div>

        {/* Workload Section */}
        <div className="bg-white border-x border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Workload</h3>
            
            {/* Filters */}
            <div className="flex gap-2 items-center">
              <Select
                value={selectedShift}
                onValueChange={(value) => setSelectedShift(value as "0600-0900" | "0901-1259")}
              >
                <SelectTrigger className="h-7 w-[120px] text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  <SelectValue>{selectedShift}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0600-0900">0600-0900</SelectItem>
                  <SelectItem value="0901-1259">0901-1259</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={workAreaFilter}
                onValueChange={(value) => {
                  setWorkAreaFilter(value as "overall" | "sortByWorkArea")
                  if (value === "overall") {
                    setSelectedWorkArea("E75")
                  }
                }}
              >
                <SelectTrigger className="h-7 w-[130px] text-xs">
                  <SelectValue>
                    {workAreaFilter === "overall" ? "Overall" : "Sort by work area"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall</SelectItem>
                  <SelectItem value="sortByWorkArea">Sort by work area</SelectItem>
                </SelectContent>
              </Select>
              {workAreaFilter === "sortByWorkArea" && (
                <Select value={selectedWorkArea} onValueChange={setSelectedWorkArea}>
                  <SelectTrigger className="h-7 w-[70px] text-xs">
                    <SelectValue>{selectedWorkArea}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E75">E75</SelectItem>
                    <SelectItem value="L22">L22</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Work Area Bar */}
          <div className="border-b border-gray-100 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 text-xs font-semibold text-gray-900">{workArea}</div>
                <div className="text-[10px] text-gray-500">
                  Efficiency: <span className="font-semibold text-gray-900">{efficiency}%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500">Total</div>
                <div className="text-sm font-bold text-gray-900">{total}</div>
              </div>
            </div>
            
            <div className="flex-1 relative">
              <div className="w-full bg-gray-200 rounded-full h-7 relative overflow-hidden">
                {/* Bar container with width based on total out of 100 */}
                <div
                  className="absolute left-0 top-0 h-7 flex transition-all duration-300"
                  style={{ width: `${totalPercentage}%` }}
                >
                  {/* Completed portion (red) */}
                  <div
                    className="bg-[#DC2626] h-7 flex items-center justify-start px-3"
                    style={{ width: `${completedPercentage}%` }}
                  >
                    <span className="text-white text-xs font-semibold">{completed}</span>
                  </div>
                  {/* Remaining portion (pink) */}
                  <div
                    className="h-7 flex items-center justify-end px-3"
                    style={{ width: `${remainingPercentage}%`, backgroundColor: "rgba(220, 38, 38, 0.4)" }}
                  >
                    <span className="text-white text-xs font-semibold">{remaining}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

