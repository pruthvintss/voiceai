'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'blue' | 'purple' | 'green' | 'yellow' | 'red' | 'gray' | 'gradient'
  size?: 'sm' | 'md'
  dot?: boolean
}

const variantClasses: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  red: 'bg-red-500/10 text-red-400 border border-red-500/20',
  gray: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  gradient: 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-300 border border-blue-500/20',
}

const dotColors: Record<string, string> = {
  blue: 'bg-blue-400',
  purple: 'bg-purple-400',
  green: 'bg-emerald-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
  gray: 'bg-zinc-400',
  gradient: 'bg-blue-400',
}

export function Badge({
  children,
  className,
  variant = 'blue',
  size = 'sm',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' && 'px-2.5 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            dotColors[variant],
            variant === 'green' && 'animate-pulse'
          )}
        />
      )}
      {children}
    </span>
  )
}
