'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    dot: 'bg-green-400',
    models: [
      { value: 'gpt-4o-realtime-preview', label: 'GPT-4o Realtime' },
      { value: 'gpt-4o-mini-realtime-preview', label: 'GPT-4o Mini Realtime' },
    ],
    requiresEndpoint: false,
  },
  azure_openai: {
    label: 'Azure OpenAI',
    dot: 'bg-blue-400',
    models: [
      { value: 'gpt-4o-realtime', label: 'GPT-4o Realtime (Azure)' },
      { value: 'gpt-4o-mini-realtime', label: 'GPT-4o Mini Realtime (Azure)' },
    ],
    requiresEndpoint: true,
  },
  gemini: {
    label: 'Google Gemini',
    dot: 'bg-purple-400',
    models: [
      { value: 'gemini-2.0-flash-live', label: 'Gemini 2.0 Flash Live' },
      { value: 'gemini-1.5-flash-live', label: 'Gemini 1.5 Flash Live' },
    ],
    requiresEndpoint: false,
  },
} as const

export type ProviderKey = keyof typeof PROVIDERS

interface ProviderSelectorProps {
  provider: ProviderKey
  model: string
  azureEndpoint?: string
  onProviderChange: (provider: ProviderKey) => void
  onModelChange: (model: string) => void
  onAzureEndpointChange?: (endpoint: string) => void
  disabled?: boolean
  className?: string
}

export function ProviderSelector({
  provider,
  model,
  azureEndpoint = '',
  onProviderChange,
  onModelChange,
  onAzureEndpointChange,
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
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-2 gap-3">
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
                    <div className={cn('h-1.5 w-1.5 rounded-full', p.dot)} />
                    {p.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Model / Deployment</Label>
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

      {provider === 'azure_openai' && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Azure Endpoint</Label>
          <Input
            placeholder="https://your-resource.openai.azure.com"
            value={azureEndpoint}
            onChange={(e) => onAzureEndpointChange?.(e.target.value)}
            disabled={disabled}
            className="h-9 bg-secondary border-secondary text-sm font-mono"
          />
        </div>
      )}
    </div>
  )
}
