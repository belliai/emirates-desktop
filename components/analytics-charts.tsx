"use client"

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useFlights } from "@/lib/flight-context"

interface StatusStage {
  id: number
  label: string
  count: number
  avgTime: string
}

interface AnalyticsChartsProps {
  statusStages: StatusStage[]
}

export default function AnalyticsCharts({ statusStages }: AnalyticsChartsProps) {
  const { flights } = useFlights()

  const stageDataOverTime = [
    [35, 22, 38, 15, 30, 8, 12],
    [28, 35, 18, 32, 12, 25, 10],
    [40, 15, 35, 10, 28, 18, 8],
    [32, 28, 12, 35, 20, 10, 15],
    [38, 18, 40, 22, 15, 30, 9],
  ]

  const lineChartData = [
    { date: "10/1", stage1: 35, stage2: 28, stage3: 40, stage4: 32, stage5: 38 },
    { date: "10/2", stage1: 22, stage2: 35, stage3: 15, stage4: 28, stage5: 18 },
    { date: "10/3", stage1: 38, stage2: 18, stage3: 35, stage4: 12, stage5: 40 },
    { date: "10/4", stage1: 15, stage2: 32, stage3: 10, stage4: 35, stage5: 22 },
    { date: "10/5", stage1: 30, stage2: 12, stage3: 28, stage4: 20, stage5: 15 },
    { date: "10/6", stage1: 8, stage2: 25, stage3: 18, stage4: 10, stage5: 30 },
    { date: "10/7", stage1: 12, stage2: 10, stage3: 8, stage4: 15, stage5: 9 },
  ]

  const barChartData = [
    { date: "10/1", ulds: 135 },
    { date: "10/2", ulds: 125 },
    { date: "10/3", ulds: 145 },
    { date: "10/4", ulds: 165 },
    { date: "10/5", ulds: 155 },
    { date: "10/6", ulds: 140 },
    { date: "10/7", ulds: 150 },
  ]

  const stageColors = [
    "#FCA5A5", // Stage 1 - lightest
    "#F87171", // Stage 2
    "#DC2626", // Stage 3 - Emirates red
    "#B91C1C", // Stage 4
    "#8B1A1A", // Stage 5 - darkest
  ]

  return (
    <div className="grid grid-cols-2 gap-0.5 px-1.5 mb-1">
      {/* Minutes per Stage Chart */}
      <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
        <div className="mb-1.5">
          <h3 className="text-sm font-semibold text-gray-900 tracking-tight">minutes per stage</h3>
          <div className="w-10 h-0.5 bg-[#D71A21] mt-1"></div>
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 9 }}
                stroke="#9CA3AF"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                stroke="#9CA3AF"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(215, 26, 33, 0.3)',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                position={{ x: undefined, y: undefined }}
                allowEscapeViewBox={true}
              />
              <Legend 
                wrapperStyle={{ fontSize: '9px', paddingTop: '8px', pointerEvents: 'none' }}
                iconSize={12}
              />
              {statusStages.map((stage, index) => (
                <Line
                  key={stage.id}
                  type="monotone"
                  dataKey={`stage${stage.id}`}
                  stroke={stageColors[index]}
                  strokeWidth={3}
                  dot={{ fill: stageColors[index], r: 4 }}
                  activeDot={{ r: 6 }}
                  name={`${stage.id}) ${stage.label}`}
                  strokeDasharray={index % 2 === 0 ? "0" : "5 5"}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ULDs per Day Chart */}
      <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
        <div className="mb-1.5">
          <h3 className="text-sm font-semibold text-gray-900 tracking-tight">ULDs per day</h3>
          <div className="w-10 h-0.5 bg-[#D71A21] mt-1"></div>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                stroke="#9CA3AF"
              />
              <YAxis 
                domain={[0, 180]}
                ticks={[0, 60, 120, 180]}
                tick={{ fontSize: 10, fontWeight: 'bold' }}
                stroke="#9CA3AF"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(215, 26, 33, 0.3)',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                formatter={(value) => [`${value} ULDs`, 'ULDs']}
                position={{ x: undefined, y: undefined }}
                allowEscapeViewBox={true}
              />
              <Bar 
                dataKey="ulds" 
                fill="#D71A21"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
