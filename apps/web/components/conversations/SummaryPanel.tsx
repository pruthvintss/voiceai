'use client'

import React from 'react'
import { CheckSquare, Square, AlertCircle, User, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, getSentimentColor } from '@/lib/utils'
import type { ConversationSummary } from '@/types'

interface SummaryPanelProps {
  summary: ConversationSummary
}

export function SummaryPanel({ summary }: SummaryPanelProps) {
  return (
    <div className="space-y-6 p-4">
      {/* Overview */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
          Overview
        </h3>
        <p className="text-sm leading-relaxed text-foreground">{summary.overview}</p>
      </div>

      {/* Sentiment */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Sentiment:</span>
        <Badge
          variant="outline"
          className={cn('text-xs', getSentimentColor(summary.sentiment))}
        >
          {summary.sentiment}
        </Badge>
      </div>

      {/* Key Points */}
      {summary.keyPoints.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            Key Points
          </h3>
          <ul className="space-y-2">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {summary.actionItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            Action Items
          </h3>
          <ul className="space-y-2">
            {summary.actionItems.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                {item.completed ? (
                  <CheckSquare className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                  {item.text}
                </span>
                {item.dueDate && (
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {item.dueDate}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Open Loops */}
      {summary.openLoops.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            Open Loops
          </h3>
          <ul className="space-y-2">
            {summary.openLoops.map((loop, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                {loop}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Entities */}
      {summary.entities.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            Entities Mentioned
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.entities.map((entity, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs">
                {entity.type === 'person' ? (
                  <User className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                )}
                <span>{entity.name}</span>
                <span className="text-muted-foreground capitalize">({entity.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topics */}
      {summary.topics.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.topics.map((topic, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
