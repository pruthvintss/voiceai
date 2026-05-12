import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'VoiceAI — Realtime Voice AI Platform',
    template: '%s | VoiceAI',
  },
  description: 'Production-grade realtime voice AI with memory, integrations, and analytics.',
  keywords: ['voice AI', 'realtime', 'OpenAI', 'Gemini', 'memory'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
