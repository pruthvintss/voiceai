'use client'

import type { ClientMessage, ServerMessage } from '@/types'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

type MessageHandler = (message: ServerMessage) => void
type CloseHandler = () => void
type ErrorHandler = (error: Event) => void

export class VoiceWebSocketClient {
  private ws: WebSocket | null = null
  private sessionId: string | null = null
  private token: string | null = null
  private messageHandlers: MessageHandler[] = []
  private closeHandlers: CloseHandler[] = []
  private errorHandlers: ErrorHandler[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private lastPongTime = 0
  private isIntentionalClose = false

  async connect(sessionId: string, token: string): Promise<void> {
    this.sessionId = sessionId
    this.token = token
    this.isIntentionalClose = false

    return new Promise((resolve, reject) => {
      try {
        const url = `${WS_URL}/ws/voice/${sessionId}?token=${encodeURIComponent(token)}`
        this.ws = new WebSocket(url)

        const onOpenTimeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'))
          this.ws?.close()
        }, 10000)

        this.ws.onopen = () => {
          clearTimeout(onOpenTimeout)
          this.reconnectAttempts = 0
          this.reconnectDelay = 1000
          this.startPing()
          resolve()
        }

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const message: ServerMessage = JSON.parse(event.data as string)
            this.messageHandlers.forEach((handler) => handler(message))
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err)
          }
        }

        this.ws.onclose = (event) => {
          this.stopPing()
          if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          } else {
            this.closeHandlers.forEach((handler) => handler())
          }
        }

        this.ws.onerror = (event) => {
          this.errorHandlers.forEach((handler) => handler(event))
          if (this.reconnectAttempts === 0) {
            reject(new Error('WebSocket connection failed'))
          }
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    setTimeout(() => {
      if (this.sessionId && this.token && !this.isIntentionalClose) {
        this.connect(this.sessionId, this.token).catch(console.error)
      }
    }, delay)
  }

  private startPing(): void {
    this.lastPongTime = Date.now()
    this.pingInterval = setInterval(() => {
      if (Date.now() - this.lastPongTime > 30000) {
        console.warn('WebSocket ping timeout, closing connection')
        this.ws?.close()
        return
      }
      this.send({ type: 'ping', timestamp: Date.now() })
    }, 10000)
  }

  private stopPing(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  sendAudioChunk(data: string, sequence: number): void {
    this.send({ type: 'audio_chunk', data, sequence })
  }

  sendEndAudio(): void {
    this.send({ type: 'end_audio' })
  }

  sendInterrupt(): void {
    this.send({ type: 'interrupt' })
  }

  sendToolResponse(toolCallId: string, result: unknown): void {
    this.send({ type: 'tool_response', toolCallId, result })
  }

  endSession(): void {
    this.isIntentionalClose = true
    this.stopPing()
    this.send({ type: 'end_session' })
    setTimeout(() => {
      this.ws?.close(1000, 'Session ended')
    }, 500)
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler)
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler)
    }
  }

  onClose(handler: CloseHandler): () => void {
    this.closeHandlers.push(handler)
    return () => {
      this.closeHandlers = this.closeHandlers.filter((h) => h !== handler)
    }
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler)
    return () => {
      this.errorHandlers = this.errorHandlers.filter((h) => h !== handler)
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }

  destroy(): void {
    this.isIntentionalClose = true
    this.stopPing()
    this.messageHandlers = []
    this.closeHandlers = []
    this.errorHandlers = []
    this.ws?.close(1000, 'Client destroyed')
    this.ws = null
  }
}
