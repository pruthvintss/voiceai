'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Zap, Building2, Sparkles } from 'lucide-react'
import { GradientText } from '@/components/ui/GradientText'
import { Badge } from '@/components/ui/Badge'

const tiers = [
  {
    id: 'starter',
    icon: Zap,
    name: 'Starter',
    price: { monthly: 0, annual: 0 },
    description: 'Perfect for individual developers and side projects.',
    badge: null,
    cta: 'Start for Free',
    ctaStyle: 'border border-zinc-700 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/50',
    features: [
      { text: '100 voice calls per month', available: true },
      { text: '500 memories per workspace', available: true },
      { text: '2 MCP integrations', available: true },
      { text: 'Community support', available: true },
      { text: 'Post-call summaries', available: true },
      { text: 'BYOK support', available: false },
      { text: 'Priority support', available: false },
      { text: 'SSO / SAML', available: false },
    ],
    highlight: false,
  },
  {
    id: 'pro',
    icon: Sparkles,
    name: 'Pro',
    price: { monthly: 49, annual: 39 },
    description: 'For teams and power users who need the full platform.',
    badge: 'Most Popular',
    cta: 'Get Started',
    ctaStyle: 'text-white',
    features: [
      { text: 'Unlimited voice calls', available: true },
      { text: 'Unlimited memories', available: true },
      { text: 'All 12+ MCP integrations', available: true },
      { text: 'BYOK (OpenAI + Gemini)', available: true },
      { text: 'Priority support', available: true },
      { text: 'Post-call AI processing', available: true },
      { text: 'Workspace analytics', available: true },
      { text: 'SSO / SAML', available: false },
    ],
    highlight: true,
  },
  {
    id: 'enterprise',
    icon: Building2,
    name: 'Enterprise',
    price: { monthly: null, annual: null },
    description: 'Custom contracts, dedicated infrastructure, SLA guarantees.',
    badge: null,
    cta: 'Contact Sales',
    ctaStyle: 'border border-zinc-700 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/50',
    features: [
      { text: 'Everything in Pro', available: true },
      { text: 'SSO / SAML / SCIM', available: true },
      { text: 'RBAC + custom roles', available: true },
      { text: 'Full audit logs', available: true },
      { text: 'SLA (99.9% uptime)', available: true },
      { text: 'Dedicated support', available: true },
      { text: 'On-prem / VPC deployment', available: true },
      { text: 'HIPAA / GDPR DPA', available: true },
    ],
    highlight: false,
  },
]

export function Pricing() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="section-padding bg-[#050505] relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="gradient" size="md" className="mb-4">Pricing</Badge>
          <h2 className="text-display-lg font-black text-zinc-50 mb-4">
            Simple, <GradientText>Transparent</GradientText> Pricing
          </h2>
          <p className="text-lg text-zinc-400 max-w-lg mx-auto mb-8">
            Start free, scale as you grow. All plans include persistent memory and post-call processing.
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!annual ? 'text-zinc-200' : 'text-zinc-500'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                annual ? 'bg-blue-600' : 'bg-zinc-700'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                annual ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className={`text-sm flex items-center gap-1.5 ${annual ? 'text-zinc-200' : 'text-zinc-500'}`}>
              Annual
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                -20%
              </span>
            </span>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier, idx) => {
            const Icon = tier.icon
            const price = annual ? tier.price.annual : tier.price.monthly
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  tier.highlight
                    ? 'bg-gradient-to-b from-blue-950/40 to-purple-950/20 border border-blue-500/40'
                    : 'bg-[#0d0d0d] border border-zinc-800/80'
                }`}
              >
                {/* Gradient top border for highlight */}
                {tier.highlight && (
                  <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                )}

                {/* Badge */}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                      {tier.badge}
                    </div>
                  </div>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl ${tier.highlight ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-zinc-800 border border-zinc-700'}`}>
                    <Icon className={`w-4 h-4 ${tier.highlight ? 'text-blue-400' : 'text-zinc-400'}`} />
                  </div>
                  <h3 className="text-base font-bold text-zinc-100">{tier.name}</h3>
                </div>

                {/* Price */}
                <div className="mb-4">
                  {price === null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-zinc-50">Custom</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-zinc-50">${price}</span>
                      <span className="text-zinc-600 text-sm">/mo</span>
                      {annual && price > 0 && (
                        <span className="text-xs text-zinc-600 ml-1">billed annually</span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-zinc-600 mt-1.5">{tier.description}</p>
                </div>

                {/* CTA */}
                <a
                  href="#cta"
                  className={`w-full py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 mb-6 block ${
                    tier.highlight
                      ? `${tier.ctaStyle}`
                      : `${tier.ctaStyle}`
                  }`}
                  style={tier.highlight ? { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' } : undefined}
                >
                  {tier.cta}
                </a>

                {/* Divider */}
                <div className="border-t border-zinc-800/60 mb-5" />

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature.text} className={`flex items-start gap-3 ${!feature.available ? 'opacity-35' : ''}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        feature.available
                          ? tier.highlight ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-zinc-800 border border-zinc-700'
                          : 'bg-zinc-900 border border-zinc-800'
                      }`}>
                        <Check className={`w-2.5 h-2.5 ${feature.available ? (tier.highlight ? 'text-blue-400' : 'text-zinc-400') : 'text-zinc-700'}`} />
                      </div>
                      <span className={`text-xs leading-snug ${feature.available ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-zinc-700 mt-8"
        >
          All prices in USD. Tokens billed at provider cost (no markup). Cancel anytime.
        </motion.p>
      </div>
    </section>
  )
}
