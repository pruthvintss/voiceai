'use client'

import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { SentimentDataPoint } from '@/types'

interface SentimentChartProps {
  data: SentimentDataPoint[] | undefined
  isLoading: boolean
}

const COLORS = {
  positive: '#22c55e',
  neutral: '#71717a',
  negative: '#ef4444',
  mixed: '#eab308',
}

const CustomTooltip = ({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: SentimentDataPoint }>
}) => {
  if (!active || !payload?.length) return null
  const entry = payload[0]

  return (
    <div className="rounded-lg border border-border bg-[#111111] p-3 shadow-xl text-xs">
      <p className="font-medium">{entry.name}</p>
      <p className="text-muted-foreground">{entry.value}% of calls</p>
    </div>
  )
}

export function SentimentChart({ data, isLoading }: SentimentChartProps) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={192}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || COLORS[entry.name as keyof typeof COLORS] || '#71717a'}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs text-muted-foreground capitalize">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
