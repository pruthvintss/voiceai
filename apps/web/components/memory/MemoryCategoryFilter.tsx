'use client'

import React from 'react'
import { cn, getCategoryColor } from '@/lib/utils'
import type { MemoryCategory } from '@/types'

const CATEGORIES: Array<{ value: MemoryCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'preference', label: 'Preferences' },
  { value: 'fact', label: 'Facts' },
  { value: 'task', label: 'Tasks' },
  { value: 'relationship', label: 'Relationships' },
  { value: 'business', label: 'Business' },
  { value: 'issue', label: 'Issues' },
  { value: 'pattern', label: 'Patterns' },
  { value: 'other', label: 'Other' },
]

interface MemoryCategoryFilterProps {
  selected: MemoryCategory | 'all'
  onChange: (category: MemoryCategory | 'all') => void
  counts?: Partial<Record<MemoryCategory | 'all', number>>
  className?: string
}

export function MemoryCategoryFilter({
  selected,
  onChange,
  counts,
  className,
}: MemoryCategoryFilterProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {CATEGORIES.map(({ value, label }) => {
        const isSelected = selected === value
        const count = counts?.[value]

        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
              isSelected
                ? value === 'all'
                  ? 'border-primary bg-primary/20 text-primary'
                  : cn('border opacity-100', getCategoryColor(value))
                : 'border-border bg-secondary/50 text-muted-foreground hover:border-border/80 hover:text-foreground'
            )}
            aria-pressed={isSelected}
          >
            {label}
            {count !== undefined && (
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                isSelected ? 'bg-white/10' : 'bg-border/50'
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
