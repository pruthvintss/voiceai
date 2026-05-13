// ============================================================
// Auth & User types
// ============================================================

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  updatedAt: string
  workspaceId: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: string
  updatedAt: string
  settings: WorkspaceSettings
}

export interface WorkspaceSettings {
  defaultProvider: 'openai' | 'azure_openai' | 'gemini'
  defaultModel: string
  retentionDays: number
  autoSummarize: boolean
  requireApprovalForTools: boolean
}

export interface WorkspaceMember {
  id: string
  userId: string
  workspaceId: string
  role: 'owner' | 'admin' | 'member'
  user: User
  joinedAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

// ============================================================
// Conversation types
// ============================================================

export type ConversationStatus = 'active' | 'ended' | 'error'

export interface Conversation {
  id: string
  workspaceId: string
  userId: string
  title: string
  status: ConversationStatus
  provider: 'openai' | 'azure_openai' | 'gemini'
  model: string
  startedAt: string
  endedAt?: string
  durationSeconds?: number
  turnCount: number
  summary?: ConversationSummary
  analytics?: ConversationAnalytics
}

export interface ConversationSummary {
  overview: string
  keyPoints: string[]
  actionItems: ActionItem[]
  openLoops: string[]
  entities: Entity[]
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  topics: string[]
}

export interface ActionItem {
  id: string
  text: string
  completed: boolean
  dueDate?: string
}

export interface Entity {
  name: string
  type: 'person' | 'organization' | 'place' | 'product' | 'event' | 'other'
}

export type TranscriptRole = 'user' | 'assistant' | 'tool'

export interface TranscriptTurn {
  id: string
  conversationId: string
  role: TranscriptRole
  content: string
  timestamp: string
  audioStart?: number
  audioEnd?: number
  toolCall?: ToolCall
  toolResult?: ToolResult
  isFinal: boolean
}

// ============================================================
// Memory types
// ============================================================

export type MemoryCategory =
  | 'preference'
  | 'fact'
  | 'task'
  | 'relationship'
  | 'business'
  | 'issue'
  | 'pattern'
  | 'other'

export interface Memory {
  id: string
  workspaceId: string
  userId: string
  content: string
  category: MemoryCategory
  importance: number // 0-1
  sourceConversationId?: string
  sourceConversation?: Pick<Conversation, 'id' | 'title' | 'startedAt'>
  embedding?: number[]
  tags: string[]
  createdAt: string
  updatedAt: string
  expiresAt?: string
}

export interface MemorySearchResult {
  memory: Memory
  score: number
}

// ============================================================
// API Key types
// ============================================================

export type ApiKeyProvider = 'openai' | 'azure_openai' | 'gemini'

export interface ApiKey {
  id: string
  workspaceId: string
  name: string
  provider: ApiKeyProvider
  maskedKey: string // e.g., "sk-...xxxx"
  isDefault: boolean
  isValid: boolean
  lastValidatedAt?: string
  createdAt: string
  usageStats: ApiKeyUsageStats
}

export interface ApiKeyUsageStats {
  totalRequests: number
  totalTokensInput: number
  totalTokensOutput: number
  lastUsedAt?: string
}

export interface CreateApiKeyRequest {
  name: string
  provider: ApiKeyProvider
  key: string
  setAsDefault: boolean
}

// ============================================================
// Tool & Integration types
// ============================================================

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  startedAt: string
  endedAt?: string
  status: 'pending' | 'running' | 'completed' | 'error'
}

export interface ToolResult {
  toolCallId: string
  result: unknown
  error?: string
  durationMs: number
}

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending'

export interface Integration {
  id: string
  name: string
  description: string
  icon: string
  category: 'communication' | 'productivity' | 'crm' | 'calendar' | 'storage' | 'other'
  status: IntegrationStatus
  tools: IntegrationTool[]
  config?: Record<string, unknown>
  connectedAt?: string
  requiresApproval: boolean
}

export interface IntegrationTool {
  name: string
  description: string
  enabled: boolean
}

export interface ToolActivityLog {
  id: string
  conversationId: string
  toolName: string
  integrationId: string
  status: 'success' | 'error'
  durationMs: number
  timestamp: string
}

// ============================================================
// Analytics types
// ============================================================

export interface AnalyticsStats {
  totalCalls: number
  totalMemories: number
  avgCallDurationSeconds: number
  totalToolsUsed: number
  callsThisWeek: number
  memoriesThisWeek: number
  callsChangePercent: number
  memoriesChangePercent: number
}

export interface CallVolumeDataPoint {
  date: string
  calls: number
  duration: number
}

export interface SentimentDataPoint {
  name: string
  value: number
  color: string
}

export interface ToolUsageDataPoint {
  tool: string
  count: number
}

export interface MemoryGrowthDataPoint {
  date: string
  total: number
  added: number
}

export interface ConversationAnalytics {
  avgResponseMs: number
  interruptions: number
  toolCallCount: number
  userTurns: number
  agentTurns: number
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  sentimentScore: number
  wordsSpoken: number
}

// ============================================================
// Voice session types
// ============================================================

export type CallStatus = 'idle' | 'connecting' | 'ready' | 'active' | 'ended' | 'error'

export interface CallConfig {
  provider: 'openai' | 'azure_openai' | 'gemini'
  model: string
  apiKeyId?: string
  injectMemory: boolean
  systemPromptOverride?: string
  tools: string[]
}

export interface ContextBundle {
  memories: Memory[]
  systemPrompt: string
  injectedAt: string
  tokenCount: number
}

export type CallProvider = 'openai' | 'azure_openai' | 'gemini'

// ============================================================
// WebSocket message types
// ============================================================

export type ClientMessageType =
  | 'audio_chunk'
  | 'end_audio'
  | 'interrupt'
  | 'tool_response'
  | 'end_session'
  | 'ping'

export type ServerMessageType =
  | 'session_created'
  | 'session_ready'
  | 'transcript_partial'
  | 'transcript_final'
  | 'agent_transcript_partial'
  | 'agent_transcript_final'
  | 'audio_chunk'
  | 'tool_call'
  | 'tool_result'
  | 'turn_start'
  | 'turn_end'
  | 'latency'
  | 'error'
  | 'session_ended'
  | 'pong'

export interface ClientAudioChunkMessage {
  type: 'audio_chunk'
  data: string // base64 PCM16
  sequence: number
}

export interface ClientEndAudioMessage {
  type: 'end_audio'
}

export interface ClientInterruptMessage {
  type: 'interrupt'
}

export interface ClientToolResponseMessage {
  type: 'tool_response'
  toolCallId: string
  result: unknown
}

export interface ClientEndSessionMessage {
  type: 'end_session'
}

export interface ClientPingMessage {
  type: 'ping'
  timestamp: number
}

export type ClientMessage =
  | ClientAudioChunkMessage
  | ClientEndAudioMessage
  | ClientInterruptMessage
  | ClientToolResponseMessage
  | ClientEndSessionMessage
  | ClientPingMessage

export interface ServerSessionCreatedMessage {
  type: 'session_created'
  sessionId: string
  conversationId: string
}

export interface ServerSessionReadyMessage {
  type: 'session_ready'
  context: ContextBundle
}

export interface ServerTranscriptMessage {
  type: 'transcript_partial' | 'transcript_final' | 'agent_transcript_partial' | 'agent_transcript_final'
  turnId: string
  text: string
  isFinal: boolean
}

export interface ServerAudioChunkMessage {
  type: 'audio_chunk'
  data: string // base64 encoded audio
  sequence: number
  format: 'pcm16' | 'mp3' | 'opus'
}

export interface ServerToolCallMessage {
  type: 'tool_call'
  toolCall: ToolCall
}

export interface ServerToolResultMessage {
  type: 'tool_result'
  toolResult: ToolResult
}

export interface ServerTurnMessage {
  type: 'turn_start' | 'turn_end'
  speaker: 'user' | 'agent'
  turnId: string
}

export interface ServerLatencyMessage {
  type: 'latency'
  ms: number
}

export interface ServerErrorMessage {
  type: 'error'
  code: string
  message: string
}

export interface ServerSessionEndedMessage {
  type: 'session_ended'
  conversationId: string
  durationSeconds: number
}

export interface ServerPongMessage {
  type: 'pong'
  timestamp: number
}

export type ServerMessage =
  | ServerSessionCreatedMessage
  | ServerSessionReadyMessage
  | ServerTranscriptMessage
  | ServerAudioChunkMessage
  | ServerToolCallMessage
  | ServerToolResultMessage
  | ServerTurnMessage
  | ServerLatencyMessage
  | ServerErrorMessage
  | ServerSessionEndedMessage
  | ServerPongMessage

// ============================================================
// Pagination & API response types
// ============================================================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// ============================================================
// Settings types
// ============================================================

export interface UserSettings {
  theme: 'dark' | 'light' | 'system'
  notifications: NotificationSettings
  audioInputDeviceId?: string
  audioOutputDeviceId?: string
  preferredProvider: 'openai' | 'azure_openai' | 'gemini'
  preferredModel: string
}

export interface NotificationSettings {
  callSummaryEmail: boolean
  memoriesWeeklyDigest: boolean
  toolErrors: boolean
}
