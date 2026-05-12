'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Edit2, Trash2, ExternalLink, Star } from 'lucide-react'
import { cn, getCategoryColor, formatRelativeTime, getImportanceColor, getImportanceLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Memory } from '@/types'

interface MemoryCardProps {
  memory: Memory
  onEdit: (memory: Memory) => void
  onDelete: (id: string) => void
  isSelected?: boolean
  onSelect?: (id: string) => void
}

export function MemoryCard({
  memory,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
}: MemoryCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -1 }}
      className={cn(
        'relative rounded-lg border bg-card p-4 transition-colors cursor-pointer group',
        isSelected
          ? 'border-primary/50 bg-primary/5'
          : 'border-border hover:border-border/80'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect?.(memory.id)}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div
          className={cn(
            'absolute top-3 left-3 h-4 w-4 rounded border transition-all',
            isSelected
              ? 'bg-primary border-primary'
              : 'border-border opacity-0 group-hover:opacity-100'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(memory.id)
          }}
        >
          {isSelected && (
            <svg viewBox="0 0 12 12" className="h-full w-full text-white p-0.5">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      )}

      <div className={cn('flex flex-col gap-3', onSelect && 'pl-2')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <Badge className={cn('text-xs shrink-0', getCategoryColor(memory.category))}>
            {memory.category}
          </Badge>

          <div className="flex items-center gap-1 shrink-0">
            {/* Importance stars */}
            <div
              className={cn('flex items-center gap-0.5 text-xs', getImportanceColor(memory.importance))}
              title={`Importance: ${getImportanceLabel(memory.importance)} (${Math.round(memory.importance * 100)}%)`}
            >
              <Star className="h-3 w-3 fill-current" />
              <span>{Math.round(memory.importance * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-foreground leading-relaxed line-clamp-3">
          {memory.content}
        </p>

        {/* Tags */}
        {memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {memory.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {memory.tags.length > 4 && (
              <span className="text-xs text-muted-foreground">+{memory.tags.length - 4}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatRelativeTime(memory.createdAt)}</span>
            {memory.sourceConversation && (
              <>
                <span>•</span>
                <a
                  href={`/conversations/${memory.sourceConversationId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  <span>From conversation</span>
                </a>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div
            className={cn(
              'flex items-center gap-1 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(memory)
              }}
              aria-label="Edit memory"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(memory.id)
              }}
              aria-label="Delete memory"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
