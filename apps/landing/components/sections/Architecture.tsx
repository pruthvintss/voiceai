'use client'

import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, Server, Shield, Zap, Clock } from 'lucide-react'
import { GradientText } from '@/components/ui/GradientText'
import { Badge } from '@/components/ui/Badge'
import { CodeBlock } from '@/components/ui/CodeBlock'

const codeLines = [
  { text: '// Client sends audio chunks', type: 'comment' as const },
  { text: "ws.send({ type: 'audio.chunk', data: base64PCM, sequence: 1 })", type: 'plain' as const },
  { text: '', type: 'plain' as const },
  { text: '// Server streams back transcript + tool calls + audio', type: 'comment' as const },
  { text: "// { type: 'transcript.partial', text: 'Schedule a...', role: 'user' }", type: 'dim' as const },
  { text: "// { type: 'tool.call', tool_name: 'calendar.create_event', args: {...} }", type: 'dim' as const },
  { text: "// { type: 'audio.response', data: base64PCM, sequence: 1 }", type: 'dim' as const },
  { text: '', type: 'plain' as const },
  { text: 'ws.on(\'message\', (event) => {', type: 'plain' as const },
  { text: '  const msg = JSON.parse(event.data)', type: 'plain' as const },
  { text: '  if (msg.type === \'audio.response\') {', type: 'plain' as const },
  { text: '    audioPlayer.play(msg.data) // < 200ms end-to-end', type: 'comment' as const },
  { text: '  }', type: 'plain' as const },
  { text: '})', type: 'plain' as const },
]

const archLayers = [
  {
    id: 'client',
    label: 'Browser / Client',
    sub: 'WebRTC + WebSocket',
    color: 'border-blue-500/30 bg-blue-500/5',
    badge: 'Client',
  },
  {
    id: 'gateway',
    label: 'Realtime Gateway',
    sub: 'WebSocket · TLS 1.3 · Sub-10ms routing',
    color: 'border-blue-400/25 bg-blue-400/5',
    badge: 'Edge',
  },
  {
    id: 'orchestrator',
    label: 'Session Orchestrator',
    sub: 'State management · Context injection · Routing',
    color: 'border-purple-500/25 bg-purple-500/5',
    badge: 'Core',
    side: {
      label: 'Context Engine → Memory Store (pgvector)',
      color: 'border-purple-400/20 bg-purple-400/4 text-purple-400',
    },
  },
  {
    id: 'llm',
    label: 'LLM Runtime',
    sub: 'OpenAI Realtime API · Google Gemini Live',
    color: 'border-blue-500/25 bg-blue-500/5',
    badge: 'AI',
  },
  {
    id: 'mcp',
    label: 'MCP Tool Layer',
    sub: 'Tool execution · Approval flows · Audit log',
    color: 'border-emerald-500/25 bg-emerald-500/5',
    badge: 'Tools',
    side: {
      label: 'Gmail · Slack · Calendar · CRM · Jira...',
      color: 'border-emerald-400/20 bg-emerald-400/4 text-emerald-400',
    },
  },
  {
    id: 'workers',
    label: 'Background Workers',
    sub: 'Post-call processing · Async reasoning',
    color: 'border-amber-500/25 bg-amber-500/5',
    badge: 'Async',
    side: {
      label: 'Summarization · Memory Extraction · Analytics',
      color: 'border-amber-400/20 bg-amber-400/4 text-amber-400',
    },
  },
]

const stats = [
  { value: '< 200ms', label: 'End-to-end latency', icon: Clock },
  { value: '99.9%', label: 'Uptime SLA', icon: Server },
  { value: 'SOC 2', label: 'Type II Certified', icon: Shield },
  { value: 'GDPR', label: 'Compliant', icon: Zap },
]

export function Architecture() {
  return (
    <section id="architecture" className="section-padding bg-[#050505] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="gradient" size="md" className="mb-4">
            <Server className="w-3.5 h-3.5" /> System Architecture
          </Badge>
          <h2 className="text-display-lg font-black text-zinc-50 mb-4">
            Built for <GradientText>Scale</GradientText>
          </h2>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            A production-hardened architecture processing millions of voice tokens per day, with enterprise isolation and observability built in.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Architecture diagram */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-1"
          >
            {archLayers.map((layer, idx) => (
              <div key={layer.id}>
                <div className="flex items-stretch gap-3">
                  {/* Main box */}
                  <div className={`flex-1 rounded-xl border px-4 py-3 ${layer.color}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">{layer.label}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">{layer.sub}</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-zinc-600 bg-zinc-800/50 border border-zinc-700/50">
                        {layer.badge}
                      </span>
                    </div>
                  </div>

                  {/* Side connection */}
                  {layer.side && (
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3 text-zinc-700 shrink-0" />
                      <div className={`rounded-lg border px-2 py-2 text-[10px] font-medium leading-snug max-w-[130px] ${layer.side.color}`}>
                        {layer.side.label}
                      </div>
                    </div>
                  )}
                </div>

                {/* Connector arrow */}
                {idx < archLayers.length - 1 && (
                  <div className="flex justify-start pl-[calc(50%-8px)] py-0.5">
                    <ArrowDown className="w-3 h-3 text-zinc-700" />
                  </div>
                )}
              </div>
            ))}
          </motion.div>

          {/* Code block */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-base font-bold text-zinc-200 mb-2">WebSocket Protocol</h3>
              <p className="text-sm text-zinc-500 mb-4">
                Bidirectional streaming over a single WebSocket connection. Audio, transcripts, tool calls, and responses all flow through the same socket.
              </p>
            </div>
            <CodeBlock
              code={codeLines}
              language="typescript"
              filename="voice-client.ts"
              showLineNumbers
            />

            {/* Technical details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Audio format', value: 'PCM 16-bit · 24kHz' },
                { label: 'Transport', value: 'WSS · TLS 1.3' },
                { label: 'Encoding', value: 'Base64 chunks' },
                { label: 'Backpressure', value: 'Sequence numbers' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{item.label}</p>
                  <p className="text-xs font-mono text-zinc-300 mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.value}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.4 + idx * 0.1 }}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-2xl font-black text-zinc-50 mb-1">{stat.value}</p>
                <p className="text-xs text-zinc-600">{stat.label}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
