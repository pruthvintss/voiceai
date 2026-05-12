'use client'

import React from 'react'
import { Activity } from 'lucide-react'
import { cn, formatLatency } from '@/lib/utils'

interface LatencyIndicatorProps {
  latencyMs: number
  className?: string
}

export function LatencyIndicator({ latencyMs, className }: LatencyIndicatorProps) {
  const getColor = () => {
    if (latencyMs === 0) return 'text-muted-foreground'
    if (latencyMs < 300) return 'text-green-400'
    if (latencyMs < 700) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div
      className={cn('flex items-center gap-1.5 text-xs', getColor(), className)}
      title={`Response latency: ${latencyMs}ms`}
    >
      <Activity className="h-3 w-3" />
      <span className="font-mono">
        {latencyMs > 0 ? formatLatency(latencyMs) : '--'}
      </span>
    </div>
  )
}
