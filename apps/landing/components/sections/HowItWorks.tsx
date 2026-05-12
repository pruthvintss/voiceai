'use client'

import { motion } from 'framer-motion'
import { Settings, Mic, Sparkles } from 'lucide-react'
import { GradientText } from '@/components/ui/GradientText'
import { Badge } from '@/components/ui/Badge'

function ConfigureIllustration() {
  return (
    <div className="w-full max-w-xs mx-auto space-y-2">
      <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Workspace Settings</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60">
            <span className="text-xs text-zinc-400">OpenAI API Key</span>
            <span className="text-[10px] font-mono text-emerald-400">✓ Connected</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60">
            <span className="text-xs text-zinc-400">Gmail MCP</span>
            <span className="text-[10px] font-mono text-emerald-400">✓ Authorized</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60">
            <span className="text-xs text-zinc-400">Slack MCP</span>
            <span className="text-[10px] font-mono text-emerald-400">✓ Connected</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60 border border-dashed border-zinc-700">
            <span className="text-xs text-zinc-600">+ Add integration</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CallIllustration() {
  return (
    <div className="w-full max-w-xs mx-auto space-y-2">
      {/* Voice session UI mock */}
      <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-zinc-400">Active session</span>
          </div>
          <span className="text-xs font-mono text-zinc-600">04:23</span>
        </div>
        {/* Waveform bars */}
        <div className="flex items-end gap-1 h-8 justify-center">
          {[3, 5, 8, 6, 9, 7, 4, 8, 6, 9, 5, 7, 3, 6, 8, 7, 5, 9, 6, 4].map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-gradient-to-t from-blue-600 to-purple-500"
              style={{
                height: `${h * 10}%`,
                animation: `waveform ${0.5 + (i % 5) * 0.1}s ease-in-out ${i * 0.05}s infinite`,
                transformOrigin: 'bottom',
              }}
            />
          ))}
        </div>
        <div className="mt-3 p-2 rounded-lg bg-blue-500/8 border border-blue-500/15">
          <p className="text-[10px] text-blue-400 font-mono">→ 5 memories injected, 3 tools active</p>
        </div>
      </div>
    </div>
  )
}

function RememberIllustration() {
  return (
    <div className="w-full max-w-xs mx-auto space-y-2">
      <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Post-call processing</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/60">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-zinc-400">Summary generated</span>
            <span className="ml-auto text-[10px] text-zinc-600">done</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/60">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-zinc-400">4 memories extracted</span>
            <span className="ml-auto text-[10px] text-zinc-600">saved</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/60">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs text-zinc-400">Action items created</span>
            <span className="ml-auto text-[10px] text-zinc-600">2 tasks</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/60">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-xs text-zinc-400">Next session ready</span>
            <span className="ml-auto text-[10px] text-emerald-400">✓</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const steps = [
  {
    number: '01',
    icon: Settings,
    title: 'Configure',
    description: 'Add your API keys, connect MCP integrations, and set up your workspace in minutes. One-click authorization for all major tools.',
    detail: 'Supports OpenAI, Gemini, and any OpenAI-compatible provider.',
    illustration: <ConfigureIllustration />,
    color: 'blue',
  },
  {
    number: '02',
    icon: Mic,
    title: 'Call',
    description: "Start a voice session. VoiceAI automatically injects your memories and context, then connects your tools — you just talk.",
    detail: 'Sub-200ms latency. Works in browser, mobile, or via API.',
    illustration: <CallIllustration />,
    color: 'purple',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Remember',
    description: 'After every call, AI extracts memories, generates summaries, creates action items, and prepares full context for your next session.',
    detail: 'Fully automatic. Nothing to configure after setup.',
    illustration: <RememberIllustration />,
    color: 'blue',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding bg-[#080808] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-20" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <Badge variant="gradient" size="md" className="mb-4">Simple by design</Badge>
          <h2 className="text-display-lg font-black text-zinc-50 mb-4">
            How VoiceAI Works
          </h2>
          <p className="text-lg text-zinc-400 max-w-lg mx-auto">
            Three steps from sign-up to your first intelligent voice session.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line on desktop */}
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-px">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((step, idx) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.15 }}
                  className="flex flex-col items-center text-center"
                >
                  {/* Step number circle */}
                  <div className="relative mb-8">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center border border-zinc-700 bg-[#0d0d0d] relative z-10"
                      style={{
                        boxShadow: `0 0 30px rgba(59,130,246,0.2)`,
                      }}
                    >
                      <Icon className="w-6 h-6 text-blue-400" />
                    </div>
                    {/* Step number badge */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center z-20">
                      <span className="text-[10px] font-black text-white">{idx + 1}</span>
                    </div>
                    {/* Glow */}
                    <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-zinc-100 mb-3">{step.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed max-w-xs mb-2">{step.description}</p>
                  <p className="text-xs text-zinc-700 mb-8">{step.detail}</p>

                  {/* Illustration */}
                  <div className="w-full">
                    {step.illustration}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
