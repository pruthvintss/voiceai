'use client'

import React, { useState, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn, debounce } from '@/lib/utils'

interface MemorySearchProps {
  value: string
  onChange: (value: string) => void
  isSearching?: boolean
  resultCount?: number
  className?: string
}

export function MemorySearch({
  value,
  onChange,
  isSearching,
  resultCount,
  className,
}: MemorySearchProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {isSearching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </div>

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search memories semantically..."
        className="pl-10 pr-10 h-10 bg-secondary border-secondary"
        aria-label="Search memories"
      />

      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {value && !isSearching && resultCount !== undefined && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {resultCount} results
        </div>
      )}
    </div>
  )
}
