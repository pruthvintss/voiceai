'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Zap, Shield, Timer } from 'lucide-react'

export function CTA() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubmitted(true)
    }
  }

  return (
    <section id="cta" className="relative py-32 overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)',
        }}
      />

      {/* Noise overlay */}
      <div className="absolute inset-0 noise-overlay" />

      {/* Radial glow center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] opacity-30"
        style={{
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.4) 0%, rgba(139,92,246,0.2) 40%, transparent 70%)',
        }}
      />

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid opacity-20" />

      {/* Animated orb decorations */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10 animate-pulse-glow"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-10 animate-pulse-glow"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)', animationDelay: '1.5s' }} />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-6"
        >
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Available now · Invite-only beta</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-[-0.02em] mb-6"
        >
          Start Building the Future of{' '}
          <span
            className="inline-block"
            style={{
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Voice AI
          </span>
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-blue-100/60 mb-10 max-w-xl mx-auto"
        >
          Join 1,000+ developers and enterprises using VoiceAI to build intelligent voice applications that actually remember.
        </motion.p>

        {/* Email form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="flex-1 px-4 py-3.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-400/60 focus:bg-white/15 transition-all text-sm backdrop-blur-sm"
              />
              <button
                type="submit"
                className="relative px-6 py-3.5 rounded-xl font-semibold text-white text-sm overflow-hidden group whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Early Access
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 max-w-md mx-auto px-6 py-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-emerald-300">You're on the list!</p>
                <p className="text-xs text-emerald-400/60">We'll reach out within 24 hours.</p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-6"
        >
          {[
            { icon: Zap, text: 'Free to start' },
            { icon: Shield, text: 'No credit card' },
            { icon: Timer, text: 'Deploy in minutes' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-blue-400/70" />
                <span className="text-sm text-white/50">{item.text}</span>
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
