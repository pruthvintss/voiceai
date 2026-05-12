'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolCall } from '@/types'

interface ToolActivityPanelProps {
  activeTool: ToolCall | null
  toolHistory: ToolCall[]
  className?: string
}

export function ToolActivityPanel({
  activeTool,
  toolHistory,
  className,
}: ToolActivityPanelProps) {
  const recentHistory = toolHistory.slice(-3)

  if (!activeTool && toolHistory.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Wrench className="h-3 w-3" />
        <span>Tool Activity</span>
      </div>

      <AnimatePresence>
        {activeTool && (
          <motion.div
            key={activeTool.id}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2 rounded-md bg-orange-500/10 border border-orange-500/20 px-3 py-2"
          >
            <Loader2 className="h-3.5 w-3.5 text-orange-400 animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-orange-400 truncate">{activeTool.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                Running...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {recentHistory.map((tool) => (
        <motion.div
          key={tool.id}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 0.6, y: 0 }}
          className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5"
        >
          {tool.status === 'error' ? (
            <XCircle className="h-3 w-3 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
          )}
          <p className="text-xs text-muted-foreground truncate">{tool.name}</p>
        </motion.div>
      ))}
    </div>
  )
}
