'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, PhoneOff, Volume2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface CallControlsProps {
  isMuted: boolean
  onToggleMute: () => void
  onEndCall: () => void
  onInterrupt: () => void
  isAgentSpeaking: boolean
  disabled?: boolean
  className?: string
}

export function CallControls({
  isMuted,
  onToggleMute,
  onEndCall,
  onInterrupt,
  isAgentSpeaking,
  disabled,
  className,
}: CallControlsProps) {
  return (
    <div className={cn('flex items-center justify-center gap-4', className)}>
      {/* Interrupt button — only shown when agent is speaking */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: isAgentSpeaking ? 1 : 0.3,
          scale: isAgentSpeaking ? 1 : 0.9,
        }}
        transition={{ duration: 0.2 }}
      >
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300"
          onClick={onInterrupt}
          disabled={!isAgentSpeaking || disabled}
          title="Interrupt AI"
          aria-label="Interrupt AI response"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Mute toggle */}
      <Button
        variant={isMuted ? 'destructive' : 'outline'}
        size="icon"
        className={cn(
          'h-14 w-14 rounded-full transition-all duration-200',
          isMuted
            ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
            : 'border-zinc-600 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700'
        )}
        onClick={onToggleMute}
        disabled={disabled}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>

      {/* End call */}
      <motion.div whileTap={{ scale: 0.95 }}>
        <Button
          variant="destructive"
          size="icon"
          className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
          onClick={onEndCall}
          disabled={disabled}
          aria-label="End call"
          title="End call"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Speaker / volume indicator */}
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary/50 text-muted-foreground">
        <Volume2 className="h-4 w-4" />
      </div>
    </div>
  )
}
