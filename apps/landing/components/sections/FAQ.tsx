'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import { GradientText } from '@/components/ui/GradientText'
import { Badge } from '@/components/ui/Badge'

const faqs = [
  {
    q: 'What voice models are supported?',
    a: "VoiceAI supports OpenAI's GPT-4o Realtime API and Google Gemini Live out of the box. Both provide sub-200ms voice latency with native interruption handling. You can switch providers per workspace or per session. We also support any OpenAI-compatible audio streaming endpoint.",
  },
  {
    q: 'How does BYOK (Bring Your Own Key) work?',
    a: "With BYOK, you provide your own OpenAI or Gemini API keys. VoiceAI stores them encrypted (AES-256) and uses them when routing your calls. You pay providers directly — VoiceAI takes zero token markup. Your keys are scoped to your workspace and never shared across tenants.",
  },
  {
    q: 'How is memory stored and secured?',
    a: "Memories are stored as text + embedding vectors in a dedicated pgvector database, isolated per workspace. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Enterprise plans get dedicated database instances. You can export or delete all memories at any time for GDPR compliance.",
  },
  {
    q: 'Can I use VoiceAI for enterprise or HIPAA use cases?',
    a: "Yes. Enterprise plans include HIPAA compliance mode, which enables PHI data controls, audit logging, access controls, and a Business Associate Agreement (BAA). We also support VPC deployment for full data residency. Workspace isolation ensures your data never touches other tenants.",
  },
  {
    q: 'How does the MCP integration framework work?',
    a: "VoiceAI implements the Model Context Protocol (MCP) for tool integrations. Each integration runs as an MCP server that the AI can call mid-conversation. Some tools (like Stripe, Salesforce) support an approval flow — the AI requests an action, you approve it in real-time or pre-authorize it. All tool calls are logged in the audit trail.",
  },
  {
    q: "What's the latency like?",
    a: "End-to-end latency (audio in → audio response out) is typically 150–250ms for OpenAI Realtime, and 180–280ms for Gemini Live, measured P50. P99 stays under 400ms. Network latency varies by region — we have edge nodes in US, EU, and AP. Memory retrieval and context injection add < 20ms overhead.",
  },
  {
    q: 'How does context injection work before a call?',
    a: "When you start a voice session, VoiceAI's Context Engine runs a semantic search over your memory store to find the most relevant memories for the upcoming conversation (based on recent context, user profile, and calendar). These memories, plus any pinned documents and active integration states, are bundled and injected as system context before the first audio token.",
  },
  {
    q: 'Can I self-host VoiceAI?',
    a: "Yes. Enterprise plans include full Docker/Kubernetes deployment packages and Helm charts. You'll need: PostgreSQL with pgvector, Redis for session state, an S3-compatible store for audio, and your own LLM API keys. We provide a Docker Compose quickstart and production Kubernetes manifests. Self-hosted instances get the same feature set as cloud.",
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="section-padding bg-[#080808] relative">
      <div className="absolute inset-0 bg-dot opacity-15" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="gradient" size="md" className="mb-4">FAQ</Badge>
          <h2 className="text-display-lg font-black text-zinc-50 mb-4">
            Common <GradientText>Questions</GradientText>
          </h2>
          <p className="text-lg text-zinc-400">
            Everything you need to know before building with VoiceAI.
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className={`rounded-xl border transition-colors duration-200 overflow-hidden ${
                open === idx
                  ? 'border-blue-500/30 bg-blue-500/3'
                  : 'border-zinc-800/80 bg-[#0d0d0d] hover:border-zinc-700/80'
              }`}
            >
              <button
                onClick={() => setOpen(open === idx ? null : idx)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className={`text-sm font-medium ${open === idx ? 'text-zinc-100' : 'text-zinc-300'}`}>
                  {faq.q}
                </span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                  open === idx ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-zinc-800 border border-zinc-700'
                }`}>
                  {open === idx
                    ? <Minus className="w-3 h-3 text-blue-400" />
                    : <Plus className="w-3 h-3 text-zinc-500" />
                  }
                </div>
              </button>

              <AnimatePresence initial={false}>
                {open === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    <div className="px-5 pb-5">
                      <div className="border-t border-zinc-800/60 pt-4">
                        <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-zinc-600 mt-10"
        >
          Still have questions?{' '}
          <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
            Talk to our team →
          </a>
        </motion.p>
      </div>
    </section>
  )
}
