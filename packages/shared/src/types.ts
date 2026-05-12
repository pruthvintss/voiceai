// Shared types between the Next.js frontend and any other TypeScript consumers.
// Python equivalents live in apps/api/app/schemas/.

// ─── Voice Call Types ─────────────────────────────────────────────────────────

export type CallStatus =
  | "idle"        // no call in progress
  | "connecting"  // WebSocket handshake + provider session init
  | "ready"       // connected, awaiting first audio
  | "active"      // audio flowing in both directions
  | "ending"      // user or server triggered end, draining
  | "ended";      // call complete, summary pending or done

export type Provider = "openai" | "gemini";

export type AudioEncoding = "pcm16" | "g711_ulaw" | "g711_alaw";

// ─── Memory Types ─────────────────────────────────────────────────────────────

export type MemoryCategory =
  | "preferences"   // how the user likes to work
  | "facts"         // factual info about the user or their context
  | "tasks"         // ongoing work items or commitments
  | "relationships" // people, teams, org chart
  | "business"      // company/product/domain knowledge
  | "issues"        // known problems or blockers
  | "patterns";     // observed behavioral patterns

export interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  importanceScore: number;         // 0.0–1.0
  createdAt: string;               // ISO 8601
  lastAccessedAt: string | null;
  sourceConversationId: string | null;
}

// ─── WebSocket Message Types ──────────────────────────────────────────────────

// Messages sent FROM the browser TO the server
export type ClientMessageType =
  | "session.start"    // initiate a new call session
  | "audio.chunk"      // raw audio data (base64 encoded)
  | "audio.end"        // signal end of user speech turn
  | "interrupt"        // user barged in / wants to interrupt the assistant
  | "tool.response"    // result of a tool the assistant called
  | "session.end";     // client-initiated call termination

// Messages sent FROM the server TO the browser
export type ServerMessageType =
  | "session.ready"        // server ready, session ID confirmed
  | "transcript.partial"   // interim ASR result
  | "transcript.final"     // final ASR result for a turn
  | "audio.response"       // assistant audio chunk (base64)
  | "tool.call"            // assistant wants to call an MCP tool
  | "agent.thinking"       // assistant is processing (shows typing indicator)
  | "agent.speaking"       // assistant audio playback started
  | "memory.injected"      // context memories injected before call
  | "session.ended"        // call ended (server-side)
  | "error";               // error payload

// ─── WebSocket Message Payloads ───────────────────────────────────────────────

export interface ClientMessage<T extends ClientMessageType = ClientMessageType> {
  type: T;
  sessionId?: string;
}

export interface SessionStartPayload extends ClientMessage<"session.start"> {
  provider: Provider;
  workspaceId: string;
  // Optional: override platform-level API key with user's own (BYOK)
  apiKey?: string;
  // Metadata injected into the session prompt
  context?: {
    timezone?: string;
    locale?: string;
  };
}

export interface AudioChunkPayload extends ClientMessage<"audio.chunk"> {
  audio: string;          // base64-encoded PCM16 at 24kHz mono
  sampleRate?: number;    // defaults to 24000
}

export interface ToolResponsePayload extends ClientMessage<"tool.response"> {
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface ServerMessage<T extends ServerMessageType = ServerMessageType> {
  type: T;
  sessionId: string;
  timestamp: string;  // ISO 8601
}

export interface SessionReadyPayload extends ServerMessage<"session.ready"> {
  provider: Provider;
  memoriesInjected: number;
}

export interface TranscriptPayload extends ServerMessage<"transcript.partial" | "transcript.final"> {
  speaker: "user" | "assistant";
  text: string;
  isFinal: boolean;
}

export interface AudioResponsePayload extends ServerMessage<"audio.response"> {
  audio: string;        // base64-encoded PCM16 at 24kHz mono
  sampleRate: number;
}

export interface ToolCallPayload extends ServerMessage<"tool.call"> {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ErrorPayload extends ServerMessage<"error"> {
  code: string;
  message: string;
  retryable: boolean;
}

// ─── Conversation Types ───────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  workspaceId: string;
  title: string | null;
  provider: Provider;
  status: "active" | "ended" | "failed";
  durationSeconds: number | null;
  messageCount: number;
  summary: string | null;
  startedAt: string;
  endedAt: string | null;
}

// ─── MCP Tool Types ───────────────────────────────────────────────────────────

export type MCPIntegration =
  | "gmail"
  | "slack"
  | "google_calendar"
  | "salesforce"
  | "hubspot"
  | "jira"
  | "linear"
  | "notion";

export interface MCPConnectionStatus {
  integration: MCPIntegration;
  connected: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

// ─── API Response Envelopes ───────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
