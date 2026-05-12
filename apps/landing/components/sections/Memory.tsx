'use client'

import { motion } from 'framer-motion'
import { Brain, Check, Search, Sparkles } from 'lucide-react'
import { GradientText } from '@/components/ui/GradientText'
import { Badge } from '@/components/ui/Badge'

const categories = [
  { label: 'preferences', color: 'blue' },
  { label: 'facts', color: 'green' },
  { label: 'tasks', color: 'yellow' },
  { label: 'relationships', color: 'purple' },
  { label: 'business', color: 'blue' },
  { label: 'issues', color: 'red' },
  { label: 'patterns', color: 'purple' },
] as const

const memories = [
  {
    content: 'Prefers Slack over email for urgent communication',
    category: 'preferences' as const,
    importance: 0.92,
    source: 'Call on Apr 12, 2025',
    date: '2 days ago',
  },
  {
    content: 'Team uses 2-week sprints, next planning is Friday',
    category: 'business' as const,
    importance: 0.87,
    source: 'Call on Apr 10, 2025',
    date: '4 days ago',
  },
  {
    content: 'CEO is Priya, reports to board monthly, Q2 target is $2.4M ARR',
    category: 'facts' as const,
    importance: 0.95,
    source: 'Call on Apr 8, 2025',
    date: '6 days ago',
  },
]

const searchDemo = {
  query: '"What does the user prefer for communication?"',
  results: [
    { score: '0.94', text: 'Prefers Slack over email for urgent communication' },
    { score: '0.87', text: 'Async-first communication style, hates back-to-back meetings' },
    { score: '0.79', text: 'Uses voice notes for brainstorming, not text docs' },
  ],
}

const catColorMap: Record<string, string> = {
  preferences: 'blue',
  facts: 'green',
  tasks: 'yellow',
  relationships: 'purple',
  business: 'blue',
  issues: 'red',
  patterns: 'purple',
}

export function Memory() {
  return (
    <section id="memory" className="section-padding bg-[#050505] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.06] rounded-full"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="purple" size="md" className="mb-6">
              <Brain className="w-3.5 h-3.5" /> Memory System
            </Badge>
            <h2 className="text-display-md font-black text-zinc-50 mb-6 leading-tight">
              Your AI That{' '}
              <GradientText from="#8b5cf6" to="#3b82f6">
                Actually Remembers
              </GradientText>
            </h2>
            <p className="text-base text-zinc-400 leading-relaxed mb-8">
              Every conversation is automatically processed to extract memories — facts, preferences, tasks, and relationships. These are stored as semantic vectors and retrieved before every call, so your AI always has full context.
            </p>

            {/* Features list */}
            <ul className="space-y-3 mb-8">
              {[
                'Automatic extraction after every call',
                'Deduplication with semantic similarity',
                'Importance scoring (0.0 – 1.0)',
                'GDPR-compliant deletion on request',
                'Cross-session continuity and recall',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-blue-400" />
                  </div>
                  <span className="text-sm text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>

            {/* Category badges */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-600 uppercase tracking-wider">Memory categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge key={cat.label} variant={cat.color as any} size="sm">
                    {cat.label}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Memory UI mock */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            {/* Memory cards */}
            <div className="rounded-2xl bg-[#0d0d0d] border border-zinc-800/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-zinc-400">Memory Store</span>
                </div>
                <span className="text-xs text-zinc-600">2,341 memories</span>
              </div>
              <div className="p-4 space-y-3">
                {memories.map((mem, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                    className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-xs text-zinc-300 leading-snug flex-1">{mem.content}</p>
                      <Badge variant={catColorMap[mem.category] as any} size="sm">{mem.category}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-zinc-600">importance</span>
                          <span className="text-[10px] font-mono text-zinc-500">{mem.importance}</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${mem.importance * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-700 shrink-0">{mem.date}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Semantic search demo */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="rounded-2xl bg-[#0d0d0d] border border-zinc-800/80 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-zinc-400">Semantic Search</span>
              </div>
              <div className="p-4">
                <div className="mb-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-blue-300">
                  {searchDemo.query}
                </div>
                <div className="space-y-2">
                  {searchDemo.results.map((r, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-emerald-400 shrink-0">↳ {r.score}</span>
                      <p className="text-xs text-zinc-400 leading-snug">{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
