import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string, formatStr = 'MMM d, yyyy') {
  return format(parseISO(dateString), formatStr)
}

export function formatRelativeTime(dateString: string) {
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true })
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M tokens`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K tokens`
  return `${n} tokens`
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function maskApiKey(key: string): string {
  if (key.length < 8) return '****'
  return `${key.slice(0, 6)}...${key.slice(-4)}`
}

export function getImportanceColor(importance: number): string {
  if (importance >= 0.8) return 'text-red-400'
  if (importance >= 0.6) return 'text-orange-400'
  if (importance >= 0.4) return 'text-yellow-400'
  return 'text-green-400'
}

export function getImportanceLabel(importance: number): string {
  if (importance >= 0.8) return 'Critical'
  if (importance >= 0.6) return 'High'
  if (importance >= 0.4) return 'Medium'
  return 'Low'
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    preference: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    fact: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    task: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    relationship: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    business: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    issue: 'bg-red-500/20 text-red-400 border-red-500/30',
    pattern: 'bg-green-500/20 text-green-400 border-green-500/30',
    other: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  }
  return colors[category] || colors.other
}

export function getSentimentColor(sentiment: string): string {
  const colors: Record<string, string> = {
    positive: 'text-green-400',
    neutral: 'text-zinc-400',
    negative: 'text-red-400',
    mixed: 'text-yellow-400',
  }
  return colors[sentiment] || 'text-zinc-400'
}

export function getProviderColor(provider: string): string {
  return provider === 'openai' ? 'text-green-400' : 'text-blue-400'
}

export function getProviderLabel(provider: string): string {
  return provider === 'openai' ? 'OpenAI' : 'Gemini'
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
