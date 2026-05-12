'use client'

import { motion } from 'framer-motion'
import { Zap, Shield, ChevronRight } from 'lucide-react'
import { GradientText } from '@/components/ui/GradientText'
import { Badge } from '@/components/ui/Badge'

const integrations = [
  { name: 'Gmail', icon: '📧', category: 'Communication', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/15', approved: true },
  { name: 'Slack', icon: '💬', category: 'Communication', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/15', approved: true },
  { name: 'Calendar', icon: '📅', category: 'Productivity', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/15', approved: true },
  { name: 'Salesforce', icon: '☁️', category: 'CRM', color: 'from-blue-400/20 to-blue-500/10', border: 'border-blue-400/15', approved: false },
  { name: 'Jira', icon: '🎯', category: 'Engineering', color: 'from-blue-600/20 to-blue-700/10', border: 'border-blue-600/15', approved: true },
  { name: 'Notion', icon: '📝', category: 'Docs', color: 'from-zinc-400/20 to-zinc-500/10', border: 'border-zinc-400/15', approved: true },
  { name: 'GitHub', icon: '⚡', category: 'Engineering', color: 'from-zinc-300/20 to-zinc-400/10', border: 'border-zinc-300/15', approved: true },
  { name: 'Linear', icon: '🔷', category: 'Engineering', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/15', approved: true },
  { name: 'HubSpot', icon: '🟠', category: 'CRM', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/15', approved: true },
  { name: 'Zoom', icon: '🎥', category: 'Meetings', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/15', approved: true },
  { name: 'Stripe', icon: '💳', category: 'Payments', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/15', approved: false },
  { name: 'Custom APIs', icon: '🔌', category: 'Any REST API', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/15', approved: true },
]

const toolCallDemo = [
  { type: 'user', text: 'Schedule a meeting with Sarah for tomorrow at 2pm' },
  { type: 'tool-call', tool: 'calendar.check_availability', status: 'Checking calendar...' },
  { type: 'tool-call', tool: 'calendar.create_event', status: 'Creating event...' },
  { type: 'ai', text: "Done! I've scheduled 'Meeting with Sarah' for tomorrow at 2:00 PM. I also added it to the shared team calendar." },
]

export function Integrations() {
  return (
    <section id="integrations" className="section-padding bg-[#080808] relative overflow-hidden">
      <div className="absolute inset-0 bg-dot opacity-25" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="gradient" size="md" className="mb-4">
            <Zap className="w-3.5 h-3.5" /> MCP Integrations
          </Badge>
          <h2 className="text-display-lg font-black text-zinc-50 mb-4">
            Connect Your{' '}
            <GradientText>Entire Stack</GradientText>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            VoiceAI's MCP framework connects to your tools. The AI can read emails, create tasks, check calendars, and update your CRM — all mid-conversation.
          </p>
        </motion.div>

        {/* Integration grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-16"
        >
          {integrations.map((integration, idx) => (
            <motion.div
              key={integration.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              whileHover={{ y: -3, scale: 1.03 }}
              className={`relative rounded-xl p-3 bg-gradient-to-br ${integration.color} border ${integration.border} cursor-default group`}
            >
              {!integration.approved && (
                <div className="absolute -top-2 -right-2 z-10">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                    <Shield className="w-2.5 h-2.5 text-amber-400" />
                    <span className="text-[8px] text-amber-400 font-medium">Approval</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center text-center gap-2">
                <span className="text-2xl">{integration.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{integration.name}</p>
                  <p className="text-[9px] text-zinc-600">{integration.category}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tool call demo */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="rounded-2xl bg-[#0d0d0d] border border-zinc-800/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-zinc-400">Live tool execution</span>
              </div>
              <Badge variant="blue" size="sm">GPT-4o Realtime</Badge>
            </div>
            <div className="p-4 space-y-3">
              {toolCallDemo.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.type === 'user' ? 8 : -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.12 }}
                >
                  {msg.type === 'user' && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-xl px-3.5 py-2.5 bg-blue-600/20 border border-blue-500/20">
                        <p className="text-xs text-zinc-200">{msg.text}</p>
                      </div>
                    </div>
                  )}
                  {msg.type === 'tool-call' && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-xl px-3 py-2 bg-zinc-900/60 border border-zinc-800 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-[10px] font-mono text-zinc-600">{msg.tool}</span>
                        <ChevronRight className="w-2.5 h-2.5 text-zinc-700" />
                        <span className="text-[10px] text-zinc-500">{msg.status}</span>
                      </div>
                    </div>
                  )}
                  {msg.type === 'ai' && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-xl px-3.5 py-2.5 bg-zinc-800/60 border border-zinc-700/40">
                        <p className="text-xs text-zinc-200 leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-zinc-700 mt-4">
            The AI took two sequential actions mid-conversation — no interruptions.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
