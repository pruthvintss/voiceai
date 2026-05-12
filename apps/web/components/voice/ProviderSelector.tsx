'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    models: [
      { value: 'gpt-4o-realtime-preview', label: 'GPT-4o Realtime' },
      { value: 'gpt-4o-mini-realtime-preview', label: 'GPT-4o Mini Realtime' },
    ],
  },
  gemini: {
    label: 'Google Gemini',
    models: [
      { value: 'gemini-2.0-flash-live', label: 'Gemini 2.0 Flash Live' },
      { value: 'gemini-1.5-flash-live', label: 'Gemini 1.5 Flash Live' },
    ],
  },
} as const

type ProviderKey = keyof typeof PROVIDERS

interface ProviderSelectorProps {
  provider: ProviderKey
  model: string
  onProviderChange: (provider: ProviderKey) => void
  onModelChange: (model: string) => void
  disabled?: boolean
  className?: string
}

export function ProviderSelector({
  provider,
  model,
  onProviderChange,
  onModelChange,
  disabled,
  className,
}: ProviderSelectorProps) {
  const currentProvider = PROVIDERS[provider]

  const handleProviderChange = (value: string) => {
    const newProvider = value as ProviderKey
    onProviderChange(newProvider)
    onModelChange(PROVIDERS[newProvider].models[0].value)
  }

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Provider</Label>
        <Select value={provider} onValueChange={handleProviderChange} disabled={disabled}>
          <SelectTrigger className="h-9 bg-secondary border-secondary text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PROVIDERS).map(([key, p]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      key === 'openai' ? 'bg-green-400' : 'bg-blue-400'
                    )}
                  />
                  {p.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Model</Label>
        <Select value={model} onValueChange={onModelChange} disabled={disabled}>
          <SelectTrigger className="h-9 bg-secondary border-secondary text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currentProvider.models.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
