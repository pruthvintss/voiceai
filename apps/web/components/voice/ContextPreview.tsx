'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Brain, Cpu } from 'lucide-react'
import { cn, formatTokenCount, getCategoryColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ContextBundle } from '@/types'

interface ContextPreviewProps {
  context: ContextBundle | null
  className?: string
}

export function ContextPreview({ context, className }: ContextPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!context) return null

  return (
    <div className={cn('rounded-lg border border-border bg-secondary/30', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="font-medium">
            {context.memories.length} memories injected
          </span>
          <span className="text-muted-foreground text-xs">
            • {formatTokenCount(context.tokenCount)}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-3 pt-3 space-y-2">
              {/* System prompt preview */}
              {context.systemPrompt && (
                <div className="rounded-md bg-background/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Cpu className="h-3 w-3" />
                    <span>System prompt</span>
                  </div>
                  <p className="text-xs text-foreground/80 line-clamp-3 leading-relaxed">
                    {context.systemPrompt}
                  </p>
                </div>
              )}

              {/* Memories */}
              {context.memories.map((memory) => (
                <div
                  key={memory.id}
                  className="flex items-start gap-2 rounded-md bg-background/50 p-2.5"
                >
                  <Badge
                    className={cn('text-xs shrink-0 mt-0.5', getCategoryColor(memory.category))}
                  >
                    {memory.category}
                  </Badge>
                  <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">
                    {memory.content}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
