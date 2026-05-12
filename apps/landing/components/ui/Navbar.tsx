'use client'

import { useState, useEffect } from 'react'
import { Menu, X, Zap, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Integrations', href: '#integrations' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '#docs' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-[#050505]/80 backdrop-blur-xl border-b border-zinc-800/60 shadow-[0_1px_0_rgba(255,255,255,0.03)]'
            : 'bg-transparent'
        )}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-glow-blue group-hover:shadow-glow-blue-lg transition-shadow duration-300">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="gradient-text">Voice</span>
              <span className="text-zinc-100">AI</span>
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-white/5 transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors duration-200"
            >
              Sign in
            </a>
            <a
              href="#cta"
              className="relative inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              }}
            >
              <span className="relative z-10 text-white">Get Started Free</span>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200" />
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-all"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
      </header>

      {/* Mobile menu */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden transition-all duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        {/* Panel */}
        <div
          className={cn(
            'absolute top-16 left-0 right-0 bg-[#0a0a0a] border-b border-zinc-800 p-4 transition-all duration-300',
            mobileOpen ? 'translate-y-0' : '-translate-y-4'
          )}
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-zinc-300 hover:text-white rounded-lg hover:bg-white/5 transition-all text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-col gap-2">
              <a href="#" className="px-4 py-3 text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                Sign in
              </a>
              <a
                href="#cta"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-center text-sm font-medium rounded-lg text-white"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
              >
                Get Started Free
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
