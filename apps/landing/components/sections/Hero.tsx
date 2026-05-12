'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Play, Mic, Brain, Cpu, Clock } from 'lucide-react'
import { AnimatedOrb } from '@/components/ui/AnimatedOrb'
import { WaveformAnimation } from '@/components/animations/WaveformAnimation'
import { GradientText } from '@/components/ui/GradientText'
import { Badge } from '@/components/ui/Badge'

const floatingCards = [
  {
    id: 'memory',
    icon: Brain,
    title: 'Memory retrieved',
    value: '3 relevant items',
    sub: 'similarity > 0.85',
    color: 'blue',
    position: 'top-[12%] left-[4%] lg:left-[6%]',
    delay: 0,
    floatClass: 'animate-float',
  },
  {
    id: 'tool',
    icon: Cpu,
    title: 'Tool executing',
    value: 'Creating calendar event...',
    sub: 'calendar.create_event',
    color: 'purple',
    position: 'top-[12%] right-[4%] lg:right-[6%]',
    delay: 1.5,
    floatClass: 'animate-float-delayed',
  },
  {
    id: 'latency',
    icon: Clock,
    title: 'Latency',
    value: '187ms',
    sub: 'P99 < 250ms',
    color: 'green',
    position: 'bottom-[22%] left-[4%] lg:left-[6%]',
    delay: 0.8,
    floatClass: 'animate-float-slow',
  },
  {
    id: 'provider',
    icon: Mic,
    title: 'Provider',
    value: 'GPT-4o Realtime',
    sub: 'Switch to Gemini Live →',
    color: 'yellow',
    position: 'bottom-[22%] right-[4%] lg:right-[6%]',
    delay: 2.2,
    floatClass: 'animate-float',
  },
]

const colorMap = {
  blue: {
    icon: 'text-blue-400 bg-blue-500/10',
    border: 'border-blue-500/20',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.1)]',
    dot: 'bg-blue-400',
  },
  purple: {
    icon: 'text-purple-400 bg-purple-500/10',
    border: 'border-purple-500/20',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.1)]',
    dot: 'bg-purple-400',
  },
  green: {
    icon: 'text-emerald-400 bg-emerald-500/10',
    border: 'border-emerald-500/20',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    dot: 'bg-emerald-400 animate-pulse',
  },
  yellow: {
    icon: 'text-amber-400 bg-amber-500/10',
    border: 'border-amber-500/20',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]',
    dot: 'bg-amber-400',
  },
}

const transcript = [
  { role: 'user', text: "What's on my calendar tomorrow?" },
  { role: 'ai', text: "Based on your previous preferences, I know you like to block mornings for deep work. Tomorrow you have a team standup at 10am — same as every Tuesday. Want me to check if Sarah is free in the afternoon?", memory: true },
  { role: 'user', text: "Yes, schedule 30 minutes with Sarah at 3pm" },
  { role: 'ai', text: "Done! Created 'Sync with Sarah' at 3:00–3:30 PM. I added your usual Zoom link and tagged it as a 1:1. I also remembered she prefers shorter meetings, so I kept it to 30 min.", tool: 'calendar.create_event' },
]

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#050505]">
      {/* Background effects */}
      <div className="absolute inset-0">
        {/* Radial gradient center glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(139,92,246,0.15) 40%, transparent 70%)',
          }}
        />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-40" />
        {/* Noise */}
        <div className="absolute inset-0 noise-overlay opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/25 bg-blue-500/8 backdrop-blur-sm">
            <span className="text-lg">✨</span>
            <span className="text-sm font-medium text-blue-300">Now with Gemini Live support</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
          </div>
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-black leading-[1.04] tracking-[-0.03em] text-zinc-50 mb-6">
            AI That Listens,{' '}
            <GradientText animated className="block sm:inline">
              Remembers,
            </GradientText>{' '}
            <span className="block sm:inline text-zinc-100">and Acts</span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          The only voice AI platform with persistent memory, real-time tool integration, and enterprise-grade security. Your AI assistant that actually knows you.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6"
        >
          <a
            href="#cta"
            className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
          >
            <span className="relative z-10">Start Building Free</span>
            <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200" />
          </a>
          <a
            href="#how-it-works"
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-100 hover:bg-white/3 transition-all duration-200"
          >
            <Play className="w-4 h-4 fill-current" />
            View Demo
          </a>
        </motion.div>

        {/* Trust signals */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-sm text-zinc-600"
        >
          No credit card required · 14-day free trial · BYOK supported
        </motion.p>

        {/* Hero visual — orb + floating cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative mt-16 mx-auto"
          style={{ height: '480px', maxWidth: '700px' }}
        >
          {/* Orb centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatedOrb size="lg" />
          </div>

          {/* Floating cards */}
          {floatingCards.map((card) => {
            const Icon = card.icon
            const colors = colorMap[card.color as keyof typeof colorMap]
            return (
              <div
                key={card.id}
                className={`absolute ${card.position} ${card.floatClass} hidden sm:block`}
                style={{ animationDelay: `${card.delay}s` }}
              >
                <div className={`glass-card rounded-xl p-3 border ${colors.border} ${colors.glow} min-w-[160px] max-w-[200px]`}>
                  <div className="flex items-start gap-2">
                    <div className={`p-1.5 rounded-lg ${colors.icon} shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{card.title}</p>
                      <p className="text-xs text-zinc-200 font-semibold mt-0.5 leading-snug">{card.value}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{card.sub}</p>
                    </div>
                  </div>
                  <div className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                </div>
              </div>
            )
          })}
        </motion.div>

        {/* Conversation transcript */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mt-12 max-w-2xl mx-auto"
        >
          <div className="glass-card rounded-2xl border border-zinc-800/80 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-zinc-500 font-medium">Live conversation · GPT-4o Realtime</span>
              </div>
              <WaveformAnimation variant="active" bars={24} height={20} />
            </div>

            {/* Messages */}
            <div className="p-4 space-y-3">
              {transcript.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1.1 + i * 0.15 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-blue-600/20 border border-blue-500/20 text-zinc-200'
                        : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-200'
                    }`}
                  >
                    {msg.memory && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Brain className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] text-purple-400 font-medium">Memory context injected</span>
                      </div>
                    )}
                    {msg.tool && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Cpu className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] text-blue-400 font-mono">{msg.tool}</span>
                      </div>
                    )}
                    <p className="text-xs leading-relaxed">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
              {/* Typing indicator */}
              <div className="flex items-center gap-2 pl-1">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-zinc-600"
                      style={{
                        animation: `waveform 1s ease-in-out ${i * 0.2}s infinite`,
                        transformOrigin: 'center',
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-zinc-600">VoiceAI is thinking...</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
