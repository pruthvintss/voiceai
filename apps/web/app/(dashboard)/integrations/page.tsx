'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  Puzzle,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { integrationsApi } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import type { Integration } from '@/types'

const STATUS_ICONS = {
  connected: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  disconnected: <XCircle className="h-4 w-4 text-zinc-500" />,
  error: <XCircle className="h-4 w-4 text-red-400" />,
  pending: <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />,
}

const CATEGORY_COLORS: Record<string, string> = {
  communication: 'bg-blue-500/10 text-blue-400',
  productivity: 'bg-green-500/10 text-green-400',
  crm: 'bg-purple-500/10 text-purple-400',
  calendar: 'bg-orange-500/10 text-orange-400',
  storage: 'bg-cyan-500/10 text-cyan-400',
  other: 'bg-zinc-500/10 text-zinc-400',
}

interface ConnectDialogProps {
  integration: Integration | null
  open: boolean
  onClose: () => void
  onConnect: (id: string, config: Record<string, unknown>) => void
  isLoading: boolean
}

function ConnectDialog({ integration, open, onClose, onConnect, isLoading }: ConnectDialogProps) {
  const [apiKey, setApiKey] = useState('')
  const [webhook, setWebhook] = useState('')

  if (!integration) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {integration.name}</DialogTitle>
          <DialogDescription>
            Configure the connection for {integration.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>API Key / Access Token</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
            />
          </div>
          {integration.category === 'communication' && (
            <div className="space-y-1.5">
              <Label>Webhook URL (optional)</Label>
              <Input
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder="https://your-webhook.com/path"
              />
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onConnect(integration.id, { apiKey, webhook })}
            disabled={!apiKey || isLoading}
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting...</>
            ) : (
              'Connect'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function IntegrationsPage() {
  const [connectingTo, setConnectingTo] = useState<Integration | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.list(),
  })

  const connectMutation = useMutation({
    mutationFn: ({ id, config }: { id: string; config: Record<string, unknown> }) =>
      integrationsApi.connect(id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      setConnectingTo(null)
      toast({ title: 'Integration connected', variant: 'success' })
    },
    onError: () => {
      toast({ title: 'Failed to connect', variant: 'destructive' })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      toast({ title: 'Integration disconnected' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      settings,
    }: {
      id: string
      settings: { requiresApproval?: boolean }
    }) => integrationsApi.updateSettings(id, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
  })

  const connected = integrations?.filter((i) => i.status === 'connected') || []
  const available = integrations?.filter((i) => i.status !== 'connected') || []

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect external tools to use during voice calls
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Connected */}
          {connected.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Connected ({connected.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {connected.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onDisconnect={() => disconnectMutation.mutate(integration.id)}
                    onUpdateSettings={(settings) =>
                      updateMutation.mutate({ id: integration.id, settings })
                    }
                    isDisconnecting={disconnectMutation.isPending}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Available */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Available Integrations
            </h2>
            {available.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-border">
                <Puzzle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm">All integrations are connected</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {available.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onConnect={() => setConnectingTo(integration)}
                    isConnecting={connectMutation.isPending && connectingTo?.id === integration.id}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <ConnectDialog
        integration={connectingTo}
        open={!!connectingTo}
        onClose={() => setConnectingTo(null)}
        onConnect={(id, config) => connectMutation.mutate({ id, config })}
        isLoading={connectMutation.isPending}
      />
    </div>
  )
}

interface IntegrationCardProps {
  integration: Integration
  onConnect?: () => void
  onDisconnect?: () => void
  onUpdateSettings?: (settings: { requiresApproval?: boolean }) => void
  isConnecting?: boolean
  isDisconnecting?: boolean
}

function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onUpdateSettings,
  isConnecting,
  isDisconnecting,
}: IntegrationCardProps) {
  const isConnected = integration.status === 'connected'

  return (
    <Card className="border-border hover:border-border/80 transition-colors">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-lg">
              {integration.icon}
            </div>
            <div>
              <p className="text-sm font-medium">{integration.name}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[integration.category] || CATEGORY_COLORS.other}`}>
                {integration.category}
              </span>
            </div>
          </div>
          {STATUS_ICONS[integration.status]}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {integration.description}
        </p>

        {/* Tools list */}
        {integration.tools.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {integration.tools.slice(0, 3).map((tool) => (
              <Badge key={tool.name} variant="secondary" className="text-xs">
                {tool.name}
              </Badge>
            ))}
            {integration.tools.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{integration.tools.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Settings (when connected) */}
        {isConnected && onUpdateSettings && (
          <div className="flex items-center justify-between border-t border-border pt-2">
            <Label className="text-xs text-muted-foreground">Require approval</Label>
            <Switch
              checked={integration.requiresApproval}
              onCheckedChange={(checked) => onUpdateSettings({ requiresApproval: checked })}
              aria-label="Require approval for tool calls"
            />
          </div>
        )}

        {/* Action */}
        <div className="pt-1">
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-red-400 hover:border-red-500/30"
              onClick={onDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'Disconnect'
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full text-xs"
              onClick={onConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Connecting...</>
              ) : (
                'Connect'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
