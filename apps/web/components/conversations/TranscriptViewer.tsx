'use client'

import React from 'react'
import { Bot, User, Wrench } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { TranscriptTurn } from '@/types'

interface TranscriptViewerProps {
  turns: TranscriptTurn[]
  isLoading?: boolean
}

export function TranscriptViewer({ turns, isLoading }: TranscriptViewerProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn('flex gap-3', i % 2 === 0 ? '' : 'flex-row-reverse')}>
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <Skeleton className={cn('h-16 rounded-2xl', i % 2 === 0 ? 'w-2/3' : 'w-1/2')} />
          </div>
        ))}
      </div>
    )
  }

  if (turns.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No transcript available
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {turns.map((turn) => (
        <div
          key={turn.id}
          className={cn('flex gap-3', turn.role === 'user' ? 'flex-row-reverse' : '')}
        >
          {/* Avatar */}
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5',
              turn.role === 'user'
                ? 'bg-green-500/20 text-green-400'
                : turn.role === 'tool'
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-blue-500/20 text-blue-400'
            )}
          >
            {turn.role === 'user' ? (
              <User className="h-3.5 w-3.5" />
            ) : turn.role === 'tool' ? (
              <Wrench className="h-3.5 w-3.5" />
            ) : (
              <Bot className="h-3.5 w-3.5" />
            )}
          </div>

          {/* Bubble */}
          <div
            className={cn(
              'max-w-[75%] rounded-2xl px-4 py-3',
              turn.role === 'user'
                ? 'bg-green-500/10 border border-green-500/20'
                : turn.role === 'tool'
                ? 'bg-orange-500/10 border border-orange-500/20'
                : 'bg-blue-500/10 border border-blue-500/20'
            )}
          >
            {turn.toolCall && (
              <div className="mb-2">
                <Badge
                  variant="outline"
                  className="text-xs border-orange-500/30 text-orange-400"
                >
                  <Wrench className="h-2.5 w-2.5 mr-1" />
                  {turn.toolCall.name}
                </Badge>
              </div>
            )}
            <p className="text-sm leading-relaxed">{turn.content}</p>
            <p className="mt-1.5 text-xs opacity-40">
              {formatDate(turn.timestamp, 'h:mm:ss a')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
