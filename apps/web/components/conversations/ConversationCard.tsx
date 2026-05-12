'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, MessageSquare, Wrench, Trash2, ChevronRight } from 'lucide-react'
import { cn, formatDate, formatDuration, getProviderColor, getProviderLabel, getSentimentColor, truncate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Conversation } from '@/types'

interface ConversationCardProps {
  conversation: Conversation
  onDelete?: (id: string) => void
}

export function ConversationCard({ conversation, onDelete }: ConversationCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="group rounded-lg border border-border bg-card p-4 hover:border-border/80 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <Link href={`/conversations/${conversation.id}`} className="block group/link">
            <h3 className="font-medium text-sm text-foreground group-hover/link:text-primary transition-colors truncate mb-1">
              {conversation.title || 'Untitled conversation'}
            </h3>
          </Link>

          {/* Summary snippet */}
          {conversation.summary?.overview && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
              {conversation.summary.overview}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDate(conversation.startedAt)}</span>

            {conversation.durationSeconds && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(conversation.durationSeconds)}
              </span>
            )}

            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {conversation.turnCount} turns
            </span>

            {conversation.analytics?.toolCallCount ? (
              <span className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {conversation.analytics.toolCallCount} tools
              </span>
            ) : null}
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn('text-xs', getProviderColor(conversation.provider))}
            >
              {getProviderLabel(conversation.provider)}
            </Badge>

            {conversation.summary?.sentiment && (
              <Badge
                variant="outline"
                className={cn('text-xs', getSentimentColor(conversation.summary.sentiment))}
              >
                {conversation.summary.sentiment}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-400"
                onClick={(e) => {
                  e.preventDefault()
                  onDelete(conversation.id)
                }}
                aria-label="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Link href={`/conversations/${conversation.id}`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
