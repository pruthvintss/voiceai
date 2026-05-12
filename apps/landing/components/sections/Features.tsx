'use client'

import { motion } from 'framer-motion'
import { Mic, Brain, Package, Wrench, Key, FileText, ChevronRight } from 'lucide-react'
import { GradientText } from '@/components/ui/GradientText'
import { Badge } from '@/components/ui/Badge'
import { WaveformAnimation } from '@/components/animations/WaveformAnimation'

function MemoryCardMock() {
  const memories = [
    { text: 'Prefers async communication over meetings', category: 'preferences', score: 0.94 },
    { text: 'CTO at BuildFast since 2021, team of 12 engineers', category: 'facts', score: 0.89 },
    { text: 'Follow up on Q2 roadmap proposal', category: 'tasks', score: 0.78 },
  ]
  const catColors: Record<string, string> = {
    preferences: 'blue', facts: 'green', tasks: 'yellow',
  }
  return (
    <div className="space-y-2">
      {memories.map((m, i) => (
        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-300 leading-snug">{m.text}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant={catColors[m.category] as any} size="sm">{m.category}</Badge>
              <span className="text-[10px] text-zinc-600">score: {m.score}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="w-8 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${m.score * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ContextBundleMock() {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Pre-call context bundle</div>
      {[
        { type: 'memory', count: 5, label: 'Relevant memories' },
        { type: 'doc', count: 2, label: 'Related documents' },
        { type: 'tool', count: 3, label: 'Active integrations' },
      ].map((item, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
          <span className="text-xs text-zinc-400">{item.label}</span>
          <span className="text-xs font-mono text-blue-400">{item.count} loaded</span>
        </div>
      ))}
      <div className="mt-2 p-2 rounded-lg bg-blue-500/8 border border-blue-500/15">
        <p className="text-[10px] text-blue-400 font-mono">→ injecting 4,200 tokens of context</p>
      </div>
    </div>
  )
}

function MCPToolsMock() {
  const tools = [
    { name: 'Gmail', icon: '📧', color: 'bg-red-500/10 border-red-500/20' },
    { name: 'Slack', icon: '💬', color: 'bg-purple-500/10 border-purple-500/20' },
    { name: 'Calendar', icon: '📅', color: 'bg-blue-500/10 border-blue-500/20' },
    { name: 'Jira', icon: '🎯', color: 'bg-blue-600/10 border-blue-600/20' },
    { name: 'CRM', icon: '💼', color: 'bg-emerald-500/10 border-emerald-500/20' },
    { name: 'GitHub', icon: '⚡', color: 'bg-zinc-500/10 border-zinc-500/20' },
  ]
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {tools.map((tool) => (
        <div
          key={tool.name}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${tool.color} hover:scale-105 transition-transform cursor-default`}
        >
          <span className="text-base">{tool.icon}</span>
          <span className="text-[10px] text-zinc-400 font-medium">{tool.name}</span>
        </div>
      ))}
    </div>
  )
}

function BYOKMock() {
  return (
    <div className="space-y-2">
      {[
        { provider: 'OpenAI', key: 'sk-proj-••••••••••••••••••••••TQ', active: true },
        { provider: 'Google Gemini', key: 'AIza••••••••••••••••••••••••••', active: false },
      ].map((item) => (
        <div key={item.provider} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
          <div className={`w-2 h-2 rounded-full ${item.active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-300">{item.provider}</p>
            <p className="text-[10px] font-mono text-zinc-600 truncate">{item.key}</p>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
            {item.active ? 'Active' : 'Standby'}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-zinc-800 text-zinc-600 cursor-pointer hover:border-zinc-700 transition-colors">
        <span className="text-sm">+</span>
        <span className="text-xs">Add provider key</span>
      </div>
    </div>
  )
}

function PostCallMock() {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Post-call output</div>
      <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 font-mono text-[10px] leading-relaxed">
        <span className="text-zinc-600">{'{'}</span><br />
        <span className="text-zinc-500 ml-2">"summary":</span> <span className="text-emerald-400 ml-1">"Discussed Q2 roadmap..."</span><span className="text-zinc-600">,</span><br />
        <span className="text-zinc-500 ml-2">"action_items":</span> <span className="text-blue-400 ml-1">["Follow up with Sarah", "Review PRD"]</span><span className="text-zinc-600">,</span><br />
        <span className="text-zinc-500 ml-2">"memories_saved":</span> <span className="text-purple-400 ml-1">4</span><span className="text-zinc-600">,</span><br />
        <span className="text-zinc-500 ml-2">"duration":</span> <span className="text-amber-400 ml-1">"12m 43s"</span><br />
        <span className="text-zinc-600">{'}'}</span>
      </div>
    </div>
  )
}

const features = [
  {
    id: 'voice',
    icon: Mic,
    title: 'Realtime Voice',
    description: 'Sub-200ms latency with OpenAI Realtime API and Google Gemini Live. Switch providers mid-conversation without dropping the session.',
    span: 'md:col-span-2',
    badge: { label: 'Live', variant: 'green' as const },
    mock: null,
    waveform: true,
  },
  {
    id: 'memory',
    icon: Brain,
    title: 'Persistent Memory',
    description: 'Semantic search over conversation history. The AI recalls relevant facts, preferences, and context from every past interaction.',
    span: 'md:col-span-1',
    badge: { label: 'pgvector', variant: 'purple' as const },
    mock: <MemoryCardMock />,
  },
  {
    id: 'context',
    icon: Package,
    title: 'Context Injection',
    description: 'Before each call, VoiceAI bundles your memories, documents, and integration state into the context window automatically.',
    span: 'md:col-span-1',
    badge: { label: 'Auto', variant: 'blue' as const },
    mock: <ContextBundleMock />,
  },
  {
    id: 'mcp',
    icon: Wrench,
    title: 'MCP Tools',
    description: 'Connect Gmail, Slack, Calendar, Jira, CRM, and more. The AI can take action mid-conversation.',
    span: 'md:col-span-1',
    badge: { label: '12+ integrations', variant: 'blue' as const },
    mock: <MCPToolsMock />,
  },
  {
    id: 'byok',
    icon: Key,
    title: 'BYOK Support',
    description: 'Bring your own OpenAI or Gemini API keys. Zero margin on tokens — pay providers directly at cost.',
    span: 'md:col-span-2',
    badge: { label: 'Your keys', variant: 'yellow' as const },
    mock: <BYOKMock />,
  },
  {
    id: 'postcall',
    icon: FileText,
    title: 'Post-Call AI',
    description: 'Every call generates summaries, action items, and extracts memories automatically. Nothing falls through the cracks.',
    span: 'md:col-span-1',
    badge: { label: 'Auto-extract', variant: 'purple' as const },
    mock: <PostCallMock />,
  },
]

export function Features() {
  return (
    <section id="features" className="section-padding bg-[#050505] relative">
      <div className="absolute inset-0 bg-dot opacity-30" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="gradient" size="md" className="mb-4">Platform Features</Badge>
          <h2 className="text-display-lg font-black text-zinc-50 mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            A complete platform for building intelligent voice applications — from raw audio to structured memory.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className={`bento-card relative rounded-2xl border border-zinc-800/80 bg-[#0d0d0d] overflow-hidden group ${feature.span}`}
              >
                {/* Gradient top border */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

                <div className="p-6">
                  {/* Icon + title row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/10 border border-blue-500/15">
                        <Icon className="w-5 h-5 text-blue-400" />
                      </div>
                      <h3 className="text-base font-bold text-zinc-100">{feature.title}</h3>
                    </div>
                    <Badge variant={feature.badge.variant} size="sm">{feature.badge.label}</Badge>
                  </div>

                  <p className="text-sm text-zinc-500 leading-relaxed mb-4">{feature.description}</p>

                  {/* Waveform for voice card */}
                  {feature.waveform && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-zinc-600">Live · GPT-4o Realtime</span>
                        <span className="ml-auto text-xs text-zinc-700">187ms</span>
                      </div>
                      <WaveformAnimation variant="active" bars={60} height={52} className="w-full" />
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Badge variant="blue" size="sm">OpenAI Realtime</Badge>
                          <Badge variant="gray" size="sm">Gemini Live</Badge>
                        </div>
                        <span className="text-xs text-zinc-700 font-mono">PCM 24kHz</span>
                      </div>
                    </div>
                  )}

                  {/* Mocked UI */}
                  {feature.mock && (
                    <div className="mt-2">
                      {feature.mock}
                    </div>
                  )}
                </div>

                {/* Hover glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/3 group-hover:to-purple-500/3 transition-all duration-500 pointer-events-none rounded-2xl" />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
