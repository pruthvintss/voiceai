import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://voiceai.dev'),
  title: 'VoiceAI — Realtime AI Voice with Persistent Memory',
  description:
    'The only voice AI platform with persistent memory, real-time tool integration, and enterprise-grade security. Powered by OpenAI Realtime API and Google Gemini Live.',
  keywords: [
    'voice AI',
    'realtime AI',
    'OpenAI Realtime',
    'Gemini Live',
    'persistent memory',
    'MCP integrations',
    'BYOK',
    'enterprise voice AI',
  ],
  authors: [{ name: 'VoiceAI' }],
  openGraph: {
    title: 'VoiceAI — Realtime AI Voice with Persistent Memory',
    description:
      'The only voice AI platform with persistent memory, real-time tool integration, and enterprise-grade security.',
    url: 'https://voiceai.dev',
    siteName: 'VoiceAI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VoiceAI Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoiceAI — Realtime AI Voice with Persistent Memory',
    description:
      'The only voice AI platform with persistent memory, real-time tool integration, and enterprise-grade security.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#050505',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#050505] text-zinc-100 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
