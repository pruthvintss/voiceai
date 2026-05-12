'use client'

import React from 'react'
import { Phone, Brain, Clock, Wrench, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDuration, formatNumber } from '@/lib/utils'
import type { AnalyticsStats } from '@/types'

interface StatsCardsProps {
  stats: AnalyticsStats | undefined
  isLoading: boolean
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Calls',
      value: stats ? formatNumber(stats.totalCalls) : '—',
      icon: Phone,
      change: stats?.callsChangePercent,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Memories',
      value: stats ? formatNumber(stats.totalMemories) : '—',
      icon: Brain,
      change: stats?.memoriesChangePercent,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Avg Call Duration',
      value: stats ? formatDuration(Math.round(stats.avgCallDurationSeconds)) : '—',
      icon: Clock,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Tools Used',
      value: stats ? formatNumber(stats.totalToolsUsed) : '—',
      icon: Wrench,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        const isPositive = (card.change || 0) >= 0

        return (
          <Card key={card.label} className="border-border bg-card">
            <CardContent className="p-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ) : (
                <>
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg mb-3', card.bgColor)}>
                    <Icon className={cn('h-4 w-4', card.color)} />
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    {card.change !== undefined && (
                      <div
                        className={cn(
                          'flex items-center gap-0.5 text-xs',
                          isPositive ? 'text-green-400' : 'text-red-400'
                        )}
                      >
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{Math.abs(card.change)}%</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
