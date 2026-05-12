'use client'

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, User, Wrench } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { TranscriptTurn } from '@/types'

interface TranscriptPanelProps {
  turns: TranscriptTurn[]
  className?: string
}

export function TranscriptPanel({ turns, className }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns])

  if (turns.length === 0) {
    return (
      <div className={cn('flex items-center justify-center text-muted-foreground text-sm', className)}>
        Transcript will appear here...
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-3 overflow-y-auto px-4 py-3 scrollbar-hide', className)}>
      <AnimatePresence initial={false}>
        {turns.map((turn) => (
          <motion.div
            key={turn.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex gap-3',
              turn.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
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

            {/* Content bubble */}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5',
                turn.role === 'user'
                  ? 'bg-green-500/10 border border-green-500/20 text-right'
                  : turn.role === 'tool'
                  ? 'bg-orange-500/10 border border-orange-500/20'
                  : 'bg-blue-500/10 border border-blue-500/20'
              )}
            >
              {turn.role === 'tool' && turn.toolCall && (
                <p className="text-xs text-orange-400 font-medium mb-1">
                  Tool: {turn.toolCall.name}
                </p>
              )}
              <p
                className={cn(
                  'text-sm leading-relaxed',
                  !turn.isFinal && 'opacity-70'
                )}
              >
                {turn.content}
                {!turn.isFinal && (
                  <span className="inline-block ml-1 animate-pulse">▊</span>
                )}
              </p>
              <p className={cn(
                'text-xs mt-1 opacity-40',
                turn.role === 'user' ? 'text-right' : ''
              )}>
                {formatRelativeTime(turn.timestamp)}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  )
}
