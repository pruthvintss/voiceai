'use client'

import { cn } from '@/lib/utils'

interface WaveformAnimationProps {
  variant?: 'idle' | 'active'
  bars?: number
  className?: string
  height?: number
  color?: 'blue' | 'gradient' | 'white'
}

export function WaveformAnimation({
  variant = 'idle',
  bars = 48,
  className,
  height = 48,
  color = 'gradient',
}: WaveformAnimationProps) {
  // Predefined heights for natural-looking waveform
  const heights = [
    0.2, 0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 0.6, 0.4, 0.7, 0.9, 0.8, 0.5, 0.6, 0.8,
    0.7, 0.5, 0.9, 0.8, 0.6, 0.4, 0.7, 0.8, 0.9, 0.7, 0.5, 0.6, 0.8, 0.7, 0.9,
    0.8, 0.6, 0.5, 0.7, 0.9, 0.8, 0.6, 0.4, 0.7, 0.8, 0.9, 0.7, 0.5, 0.6, 0.8,
    0.6, 0.4, 0.3,
  ]

  const totalBars = Math.min(bars, heights.length)

  const getBarStyle = (i: number): React.CSSProperties => {
    const baseHeight = heights[i % heights.length]
    const duration = variant === 'active'
      ? 0.4 + (i % 7) * 0.08
      : 1.2 + (i % 9) * 0.15
    const delay = (i % 12) * (variant === 'active' ? 0.04 : 0.1)

    return {
      height: `${baseHeight * 100}%`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
      transformOrigin: 'center',
      animation: `waveform ${duration}s ease-in-out ${delay}s infinite`,
    }
  }

  const getBarColor = (i: number, total: number) => {
    if (color === 'white') return 'rgba(255,255,255,0.7)'
    if (color === 'blue') return 'rgb(59, 130, 246)'

    // Gradient from blue to purple
    const pct = i / total
    const r = Math.round(59 + (139 - 59) * pct)
    const g = Math.round(130 + (92 - 130) * pct)
    const b = Math.round(246 + (246 - 246) * pct)
    return `rgb(${r}, ${g}, ${b})`
  }

  return (
    <div
      className={cn('flex items-center gap-[2px]', className)}
      style={{ height: `${height}px` }}
    >
      {Array.from({ length: totalBars }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full flex-shrink-0"
          style={{
            ...getBarStyle(i),
            backgroundColor: getBarColor(i, totalBars),
            minHeight: '3px',
          }}
        />
      ))}
    </div>
  )
}
