'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { GradientText } from '@/components/ui/GradientText'
import { Badge } from '@/components/ui/Badge'

const testimonials = [
  {
    quote: 'The memory system is incredible. Our enterprise sales reps use it for customer calls — the AI remembers every preference, objection, and follow-up from previous conversations. Close rate up 23%.',
    name: 'Sarah K.',
    role: 'VP Sales',
    company: 'TechFlow',
    initials: 'SK',
    avatarColor: 'from-blue-500 to-blue-700',
    metric: '+23% close rate',
    metricColor: 'text-emerald-400',
  },
  {
    quote: 'Switched from a custom voice stack to VoiceAI in a weekend. The BYOK support meant zero migration headache, and the MCP integrations saved us 3 months of integration work.',
    name: 'Marcus T.',
    role: 'CTO',
    company: 'BuildFast',
    initials: 'MT',
    avatarColor: 'from-purple-500 to-purple-700',
    metric: '3 months saved',
    metricColor: 'text-blue-400',
  },
  {
    quote: 'We use VoiceAI for our medical intake system. The post-call memory extraction structures patient notes automatically. HIPAA compliance mode + workspace isolation made it production-ready.',
    name: 'Dr. Priya R.',
    role: 'Product Lead',
    company: 'HealthSync',
    initials: 'PR',
    avatarColor: 'from-emerald-500 to-emerald-700',
    metric: 'HIPAA compliant',
    metricColor: 'text-purple-400',
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="section-padding bg-[#080808] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-dot opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="gradient" size="md" className="mb-4">Customer Stories</Badge>
          <h2 className="text-display-lg font-black text-zinc-50 mb-4">
            Loved by <GradientText>Builders</GradientText>
          </h2>
          <p className="text-lg text-zinc-400 max-w-lg mx-auto">
            From early-stage startups to enterprise teams — here's what they're building with VoiceAI.
          </p>
        </motion.div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.12 }}
              whileHover={{ y: -4 }}
              className="relative flex flex-col rounded-2xl bg-[#0d0d0d] border border-zinc-800/80 p-6 overflow-hidden group"
            >
              {/* Gradient top border */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

              {/* Stars */}
              <div className="flex items-center gap-1 mb-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-sm text-zinc-300 leading-relaxed mb-6 flex-1">
                "{t.quote}"
              </blockquote>

              {/* Metric badge */}
              <div className="mb-5">
                <span className={`text-xs font-bold font-mono ${t.metricColor} bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800`}>
                  ↑ {t.metric}
                </span>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/60">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarColor} flex items-center justify-center shrink-0`}>
                  <span className="text-xs font-bold text-white">{t.initials}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.role}, {t.company}</p>
                </div>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/3 group-hover:to-purple-500/3 transition-all duration-500 pointer-events-none rounded-2xl" />
            </motion.div>
          ))}
        </div>

        {/* Social proof bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-center"
        >
          {[
            { value: '1,000+', label: 'developers' },
            { value: '50M+', label: 'voice tokens/day' },
            { value: '4.9/5', label: 'average rating' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-black text-zinc-100">{item.value}</span>
              <span className="text-xs text-zinc-600">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
