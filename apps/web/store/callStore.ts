import { create } from 'zustand'
import type { CallStatus, TranscriptTurn, ToolCall, ContextBundle } from '@/types'

interface CallState {
  status: CallStatus
  conversationId: string | null
  sessionId: string | null
  transcript: TranscriptTurn[]
  activeTool: ToolCall | null
  toolHistory: ToolCall[]
  isAgentSpeaking: boolean
  isUserSpeaking: boolean
  isMuted: boolean
  latency: number
  injectedContext: ContextBundle | null
  provider: 'openai' | 'gemini'
  model: string
  error: string | null
  startedAt: string | null

  // Actions
  setStatus: (status: CallStatus) => void
  setConversationId: (id: string | null) => void
  setSessionId: (id: string | null) => void
  addTranscriptTurn: (turn: TranscriptTurn) => void
  updateTranscriptTurn: (id: string, updates: Partial<TranscriptTurn>) => void
  setActiveTool: (tool: ToolCall | null) => void
  addToolToHistory: (tool: ToolCall) => void
  setAgentSpeaking: (speaking: boolean) => void
  setUserSpeaking: (speaking: boolean) => void
  setMuted: (muted: boolean) => void
  setLatency: (latency: number) => void
  setInjectedContext: (context: ContextBundle | null) => void
  setProvider: (provider: 'openai' | 'gemini') => void
  setModel: (model: string) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  status: 'idle' as CallStatus,
  conversationId: null,
  sessionId: null,
  transcript: [] as TranscriptTurn[],
  activeTool: null,
  toolHistory: [] as ToolCall[],
  isAgentSpeaking: false,
  isUserSpeaking: false,
  isMuted: false,
  latency: 0,
  injectedContext: null,
  provider: 'openai' as const,
  model: 'gpt-4o-realtime-preview',
  error: null,
  startedAt: null,
}

export const useCallStore = create<CallState>((set) => ({
  ...initialState,

  setStatus: (status) =>
    set((state) => ({
      status,
      startedAt: status === 'active' && !state.startedAt ? new Date().toISOString() : state.startedAt,
    })),

  setConversationId: (id) => set({ conversationId: id }),
  setSessionId: (id) => set({ sessionId: id }),

  addTranscriptTurn: (turn) =>
    set((state) => ({
      transcript: [...state.transcript, turn],
    })),

  updateTranscriptTurn: (id, updates) =>
    set((state) => ({
      transcript: state.transcript.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  setActiveTool: (tool) => set({ activeTool: tool }),

  addToolToHistory: (tool) =>
    set((state) => ({
      toolHistory: [...state.toolHistory, tool],
      activeTool: null,
    })),

  setAgentSpeaking: (speaking) => set({ isAgentSpeaking: speaking }),
  setUserSpeaking: (speaking) => set({ isUserSpeaking: speaking }),
  setMuted: (muted) => set({ isMuted: muted }),
  setLatency: (latency) => set({ latency }),
  setInjectedContext: (context) => set({ injectedContext: context }),
  setProvider: (provider) => set({ provider }),
  setModel: (model) => set({ model }),
  setError: (error) => set({ error }),

  reset: () => set(initialState),
}))
