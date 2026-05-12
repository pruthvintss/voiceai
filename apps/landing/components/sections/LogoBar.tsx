'use client'

import { motion } from 'framer-motion'

const logos = [
  { name: 'Acme Corp', style: 'font-black tracking-tight text-lg' },
  { name: 'TechFlow', style: 'font-light tracking-widest text-sm uppercase' },
  { name: 'BuildFast', style: 'font-bold italic text-base' },
  { name: 'DataSync', style: 'font-semibold tracking-tight text-lg' },
  { name: 'CloudOps', style: 'font-medium tracking-wide text-sm' },
  { name: 'NeuralBase', style: 'font-black text-xl tracking-tighter' },
]

export function LogoBar() {
  return (
    <section className="py-14 border-y border-zinc-900 bg-[#080808] relative overflow-hidden">
      {/* Gradient masks on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#080808] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#080808] to-transparent pointer-events-none" />

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center text-xs font-medium text-zinc-600 uppercase tracking-widest mb-8"
      >
        Trusted by engineering teams at
      </motion.p>

      {/* Scrolling logo strip */}
      <div className="relative overflow-hidden">
        <div
          className="flex items-center gap-16 animate-scroll-x"
          style={{ width: 'max-content' }}
        >
          {/* Duplicate for seamless loop */}
          {[...logos, ...logos].map((logo, i) => (
            <div
              key={i}
              className={`text-zinc-500 opacity-40 hover:opacity-70 transition-opacity cursor-default select-none shrink-0 ${logo.style}`}
            >
              {logo.name}
            </div>
          ))}
        </div>
      </div>

      {/* Subtle bottom glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
    </section>
  )
}
