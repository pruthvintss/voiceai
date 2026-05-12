'use client'

import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { ToolUsageDataPoint } from '@/types'

interface ToolUsageChartProps {
  data: ToolUsageDataPoint[] | undefined
  isLoading: boolean
}

const CustomTooltip = ({ active, payload }: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
}) => {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-[#111111] p-3 shadow-xl text-xs">
      <p className="font-medium">{payload[0].value} calls</p>
    </div>
  )
}

export function ToolUsageChart({ data, isLoading }: ToolUsageChartProps) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No tool usage data
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 8)
  const max = sorted[0]?.count || 1

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 0, right: 5, bottom: 0, left: 60 }}
        barSize={12}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#71717a' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="tool"
          tick={{ fontSize: 11, fill: '#71717a' }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {sorted.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`rgba(59, 130, 246, ${0.3 + (entry.count / max) * 0.7})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
