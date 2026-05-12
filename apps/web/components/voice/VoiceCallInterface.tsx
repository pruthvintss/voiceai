'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Bot,
  User,
  ChevronRight,
  Clock,
} from 'lucide-react'
import { AudioVisualizer } from './AudioVisualizer'
import { TranscriptPanel } from './TranscriptPanel'
import { CallControls } from './CallControls'
import { ToolActivityPanel } from './ToolActivityPanel'
import { ContextPreview } from './ContextPreview'
import { LatencyIndicator } from './LatencyIndicator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatDuration, getProviderLabel } from '@/lib/utils'
import type { CallStatus, TranscriptTurn, ToolCall, ContextBundle } from '@/types'
import { AudioCapture, AudioPlayback } from '@/lib/audio'

interface VoiceCallInterfaceProps {
  status: CallStatus
  transcript: TranscriptTurn[]
  isMuted: boolean
  isAgentSpeaking: boolean
  isUserSpeaking: boolean
  latency: number
  activeTool: ToolCall | null
  toolHistory: ToolCall[]
  injectedContext: ContextBundle | null
  provider: 'openai' | 'gemini'
  model: string
  onToggleMute: () => void
  onEndCall: () => void
  onInterrupt: () => void
  onClose?: () => void
}

export function VoiceCallInterface({
  status,
  transcript,
  isMuted,
  isAgentSpeaking,
  isUserSpeaking,
  latency,
  activeTool,
  toolHistory,
  injectedContext,
  provider,
  model,
  onToggleMute,
  onEndCall,
  onInterrupt,
  onClose,
}: VoiceCallInterfaceProps) {
  const [showContext, setShowContext] = useState(false)
  const [showTranscript, setShowTranscript] = useState(true)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [userVolume, setUserVolume] = useState(0)
  const [agentVolume, setAgentVolume] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCaptureRef = useRef<AudioCapture | null>(null)
  const audioPlaybackRef = useRef<AudioPlayback | null>(null)

  // Timer
  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1)
      }, 1000)
    } else if (status === 'ended' || status === 'error') {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  const getSpeakingLabel = () => {
    if (status === 'connecting') return 'Connecting...'
    if (status === 'ready') return 'Ready'
    if (isMuted) return 'Muted'
    if (isAgentSpeaking) return 'AI is speaking'
    if (isUserSpeaking) return 'You are speaking'
    if (status === 'active') return 'Listening...'
    if (status === 'ended') return 'Call ended'
    return ''
  }

  const getSpeakingColor = () => {
    if (status === 'connecting') return 'text-zinc-400'
    if (isMuted) return 'text-red-400'
    if (isAgentSpeaking) return 'text-blue-400'
    if (isUserSpeaking) return 'text-green-400'
    return 'text-muted-foreground'
  }

  const isActive = status === 'active' || status === 'ready'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
    >
      <div className="relative flex h-full w-full max-w-6xl flex-col md:flex-row overflow-hidden">

        {/* Close button (if not in a full-page context) */}
        {onClose && status === 'ended' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        )}

        {/* Left / Main area */}
        <div className="flex flex-1 flex-col items-center justify-between py-8 px-6">

          {/* Top bar */}
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  provider === 'openai'
                    ? 'border-green-500/30 text-green-400'
                    : 'border-blue-500/30 text-blue-400'
                )}
              >
                {getProviderLabel(provider)}
              </Badge>
              <span className="text-xs text-muted-foreground">{model}</span>
            </div>

            <div className="flex items-center gap-4">
              <LatencyIndicator latencyMs={latency} />

              {status === 'active' && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono">{formatDuration(elapsedSeconds)}</span>
                </div>
              )}

              {/* Status badge */}
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  status === 'active' ? 'bg-green-500/10 text-green-400' :
                  status === 'connecting' ? 'bg-yellow-500/10 text-yellow-400' :
                  status === 'ended' ? 'bg-zinc-500/10 text-zinc-400' :
                  status === 'error' ? 'bg-red-500/10 text-red-400' :
                  'bg-blue-500/10 text-blue-400'
                )}
              >
                <div
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    status === 'active' ? 'bg-green-400 animate-pulse' :
                    status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                    status === 'ended' ? 'bg-zinc-400' :
                    status === 'error' ? 'bg-red-400' :
                    'bg-blue-400'
                  )}
                />
                {status}
              </div>
            </div>
          </div>

          {/* Center: Visualizer */}
          <div className="flex flex-col items-center gap-6 my-auto">
            {/* Visualizer container */}
            <div className="relative">
              {/* Outer glow ring */}
              <div
                className={cn(
                  'absolute inset-0 rounded-full transition-all duration-500',
                  isAgentSpeaking ? 'shadow-[0_0_60px_20px_rgba(59,130,246,0.15)]' :
                  isUserSpeaking ? 'shadow-[0_0_60px_20px_rgba(34,197,94,0.15)]' :
                  'shadow-none'
                )}
              />

              <div className="h-48 w-48 md:h-64 md:w-64 relative">
                <AudioVisualizer
                  isUserSpeaking={isUserSpeaking && !isMuted}
                  isAgentSpeaking={isAgentSpeaking}
                  userVolume={userVolume}
                  agentVolume={agentVolume}
                  status={status}
                />
              </div>
            </div>

            {/* Speaking indicator */}
            <motion.p
              key={getSpeakingLabel()}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('text-sm font-medium', getSpeakingColor())}
            >
              {getSpeakingLabel()}
            </motion.p>

            {/* Speaker indicators */}
            <div className="flex items-center gap-6 text-xs">
              <div className={cn(
                'flex items-center gap-1.5 transition-opacity',
                isUserSpeaking && !isMuted ? 'opacity-100' : 'opacity-30'
              )}>
                <User className="h-3 w-3 text-green-400" />
                <span className="text-green-400">You</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className={cn(
                'flex items-center gap-1.5 transition-opacity',
                isAgentSpeaking ? 'opacity-100' : 'opacity-30'
              )}>
                <Bot className="h-3 w-3 text-blue-400" />
                <span className="text-blue-400">AI</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full space-y-4">
            {/* Tool activity */}
            <AnimatePresence>
              {(activeTool || toolHistory.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <ToolActivityPanel
                    activeTool={activeTool}
                    toolHistory={toolHistory}
                    className="max-w-sm mx-auto"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <CallControls
              isMuted={isMuted}
              onToggleMute={onToggleMute}
              onEndCall={onEndCall}
              onInterrupt={onInterrupt}
              isAgentSpeaking={isAgentSpeaking}
              disabled={status === 'connecting' || status === 'ended'}
            />
          </div>
        </div>

        {/* Right panel: Transcript + Context */}
        <div className="flex w-full md:w-96 flex-col border-t md:border-t-0 md:border-l border-border bg-[#0a0a0a]/80 max-h-64 md:max-h-full">

          {/* Panel tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setShowTranscript(true)}
              className={cn(
                'flex-1 py-3 text-xs font-medium transition-colors',
                showTranscript ? 'text-foreground border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Transcript
            </button>
            <button
              onClick={() => setShowTranscript(false)}
              className={cn(
                'flex-1 py-3 text-xs font-medium transition-colors',
                !showTranscript ? 'text-foreground border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Context
            </button>
          </div>

          {/* Transcript panel */}
          <AnimatePresence mode="wait">
            {showTranscript ? (
              <motion.div
                key="transcript"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-hidden"
              >
                <TranscriptPanel
                  turns={transcript}
                  className="h-full"
                />
              </motion.div>
            ) : (
              <motion.div
                key="context"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto p-4"
              >
                <ContextPreview context={injectedContext} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
