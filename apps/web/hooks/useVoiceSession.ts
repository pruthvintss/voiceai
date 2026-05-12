'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useCallStore } from '@/store/callStore'
import { useAuthStore } from '@/store/authStore'
import { conversationsApi } from '@/lib/api'
import { AudioCapture, AudioPlayback } from '@/lib/audio'
import { VoiceWebSocketClient } from '@/lib/websocket'
import type {
  CallConfig,
  TranscriptTurn,
  ServerMessage,
} from '@/types'
import { generateId } from '@/lib/utils'

export function useVoiceSession() {
  const callStore = useCallStore()
  const { tokens } = useAuthStore()

  const wsClientRef = useRef<VoiceWebSocketClient | null>(null)
  const audioCaptureRef = useRef<AudioCapture | null>(null)
  const audioPlaybackRef = useRef<AudioPlayback | null>(null)
  const partialTurnsRef = useRef<Map<string, TranscriptTurn>>(new Map())

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupCall()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cleanupCall = useCallback(() => {
    audioCaptureRef.current?.stop()
    audioCaptureRef.current = null

    audioPlaybackRef.current?.stop()
    audioPlaybackRef.current = null

    wsClientRef.current?.destroy()
    wsClientRef.current = null

    partialTurnsRef.current.clear()
  }, [])

  const handleServerMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case 'session_ready': {
          callStore.setInjectedContext(message.context)
          callStore.setStatus('ready')
          break
        }

        case 'transcript_partial': {
          // User partial transcript
          const existing = partialTurnsRef.current.get(message.turnId)
          if (existing) {
            callStore.updateTranscriptTurn(message.turnId, { content: message.text })
          } else {
            const turn: TranscriptTurn = {
              id: message.turnId,
              conversationId: callStore.conversationId || '',
              role: 'user',
              content: message.text,
              timestamp: new Date().toISOString(),
              isFinal: false,
            }
            partialTurnsRef.current.set(message.turnId, turn)
            callStore.addTranscriptTurn(turn)
          }
          break
        }

        case 'transcript_final': {
          callStore.updateTranscriptTurn(message.turnId, {
            content: message.text,
            isFinal: true,
          })
          partialTurnsRef.current.delete(message.turnId)
          break
        }

        case 'agent_transcript_partial': {
          const existing = partialTurnsRef.current.get(message.turnId)
          if (existing) {
            callStore.updateTranscriptTurn(message.turnId, { content: message.text })
          } else {
            const turn: TranscriptTurn = {
              id: message.turnId,
              conversationId: callStore.conversationId || '',
              role: 'assistant',
              content: message.text,
              timestamp: new Date().toISOString(),
              isFinal: false,
            }
            partialTurnsRef.current.set(message.turnId, turn)
            callStore.addTranscriptTurn(turn)
          }
          break
        }

        case 'agent_transcript_final': {
          callStore.updateTranscriptTurn(message.turnId, {
            content: message.text,
            isFinal: true,
          })
          partialTurnsRef.current.delete(message.turnId)
          break
        }

        case 'audio_chunk': {
          audioPlaybackRef.current?.playChunk(message.data, message.format)
          break
        }

        case 'tool_call': {
          callStore.setActiveTool(message.toolCall)
          // Add tool call turn to transcript
          const toolTurn: TranscriptTurn = {
            id: generateId(),
            conversationId: callStore.conversationId || '',
            role: 'tool',
            content: `Calling ${message.toolCall.name}...`,
            timestamp: new Date().toISOString(),
            isFinal: true,
            toolCall: message.toolCall,
          }
          callStore.addTranscriptTurn(toolTurn)
          break
        }

        case 'tool_result': {
          callStore.addToolToHistory(callStore.activeTool!)
          break
        }

        case 'turn_start': {
          if (message.speaker === 'agent') {
            callStore.setAgentSpeaking(true)
            callStore.setUserSpeaking(false)
          } else {
            callStore.setUserSpeaking(true)
            callStore.setAgentSpeaking(false)
          }
          break
        }

        case 'turn_end': {
          if (message.speaker === 'agent') {
            callStore.setAgentSpeaking(false)
          } else {
            callStore.setUserSpeaking(false)
          }
          break
        }

        case 'latency': {
          callStore.setLatency(message.ms)
          break
        }

        case 'error': {
          callStore.setError(message.message)
          callStore.setStatus('error')
          break
        }

        case 'session_ended': {
          callStore.setStatus('ended')
          cleanupCall()
          break
        }

        case 'pong': {
          // Handled by WebSocket client
          break
        }
      }
    },
    [callStore, cleanupCall]
  )

  const startCall = useCallback(
    async (config: CallConfig) => {
      try {
        callStore.reset()
        callStore.setStatus('connecting')
        callStore.setProvider(config.provider)
        callStore.setModel(config.model)

        // Initialize session via HTTP
        const token = tokens?.accessToken || localStorage.getItem('access_token') || ''
        const { sessionId, conversationId, context } = await conversationsApi.initiate(config)

        callStore.setSessionId(sessionId)
        callStore.setConversationId(conversationId)
        callStore.setInjectedContext(context)

        // Initialize audio playback
        const playback = new AudioPlayback()
        await playback.initialize()
        audioPlaybackRef.current = playback

        // Connect WebSocket
        const wsClient = new VoiceWebSocketClient()
        await wsClient.connect(sessionId, token)
        wsClientRef.current = wsClient

        const removeMessageHandler = wsClient.onMessage(handleServerMessage)
        wsClient.onClose(() => {
          callStore.setStatus('ended')
          cleanupCall()
        })

        // Start audio capture
        const capture = new AudioCapture()
        await capture.start({
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        })

        capture.setOnChunk((data, sequence) => {
          wsClient.sendAudioChunk(data, sequence)
        })

        audioCaptureRef.current = capture
        callStore.setStatus('active')

        return removeMessageHandler
      } catch (err) {
        callStore.setError(err instanceof Error ? err.message : 'Failed to start call')
        callStore.setStatus('error')
        cleanupCall()
        throw err
      }
    },
    [tokens, callStore, handleServerMessage, cleanupCall]
  )

  const endCall = useCallback(() => {
    callStore.setStatus('ended')
    wsClientRef.current?.endSession()
    audioCaptureRef.current?.stop()
    audioPlaybackRef.current?.stop()

    setTimeout(() => {
      cleanupCall()
    }, 1000)
  }, [callStore, cleanupCall])

  const toggleMute = useCallback(() => {
    const newMuted = !callStore.isMuted
    callStore.setMuted(newMuted)
    if (newMuted) {
      audioCaptureRef.current?.mute()
    } else {
      audioCaptureRef.current?.unmute()
    }
  }, [callStore])

  const interrupt = useCallback(() => {
    wsClientRef.current?.sendInterrupt()
    audioPlaybackRef.current?.interrupt()
    callStore.setAgentSpeaking(false)
  }, [callStore])

  return {
    status: callStore.status,
    transcript: callStore.transcript,
    isMuted: callStore.isMuted,
    isAgentSpeaking: callStore.isAgentSpeaking,
    isUserSpeaking: callStore.isUserSpeaking,
    latency: callStore.latency,
    activeTool: callStore.activeTool,
    toolHistory: callStore.toolHistory,
    conversationId: callStore.conversationId,
    injectedContext: callStore.injectedContext,
    error: callStore.error,
    provider: callStore.provider,
    model: callStore.model,
    startCall,
    endCall,
    toggleMute,
    interrupt,
  }
}
