'use client'

import { cn } from '@/lib/utils'

interface GradientTextProps {
  children: React.ReactNode
  className?: string
  animated?: boolean
  from?: string
  to?: string
  via?: string
}

export function GradientText({
  children,
  className,
  animated = false,
  from = '#3b82f6',
  to = '#8b5cf6',
  via,
}: GradientTextProps) {
  const gradientStyle = via
    ? { backgroundImage: `linear-gradient(135deg, ${from}, ${via}, ${to})` }
    : { backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }

  return (
    <span
      className={cn(
        'inline-block bg-clip-text text-transparent',
        animated && 'animate-shimmer',
        className
      )}
      style={{
        ...gradientStyle,
        ...(animated && {
          backgroundSize: '200% auto',
          backgroundImage: `linear-gradient(135deg, #60a5fa, #818cf8, #a78bfa, #818cf8, #60a5fa)`,
        }),
      }}
    >
      {children}
    </span>
  )
}
