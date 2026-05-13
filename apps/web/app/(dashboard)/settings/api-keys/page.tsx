'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiKeysApi } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { formatRelativeTime, formatNumber } from '@/lib/utils'
import type { ApiKeyProvider } from '@/types'

const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: 'OpenAI',
  azure_openai: 'Azure OpenAI',
  gemini: 'Google Gemini',
}

const PROVIDER_COLORS: Record<ApiKeyProvider, string> = {
  openai: 'text-green-400 border-green-500/30',
  azure_openai: 'text-blue-400 border-blue-500/30',
  gemini: 'text-purple-400 border-purple-500/30',
}

const addKeySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  provider: z.enum(['openai', 'azure_openai', 'gemini']),
  key: z.string().min(10, 'API key is required'),
  azureEndpoint: z.string().optional(),
  setAsDefault: z.boolean(),
}).refine(
  (d) => d.provider !== 'azure_openai' || (d.azureEndpoint && d.azureEndpoint.length > 0),
  { message: 'Azure endpoint is required for Azure OpenAI', path: ['azureEndpoint'] }
)

type AddKeyData = z.infer<typeof addKeySchema>

export default function ApiKeysPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiKeysApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (data: AddKeyData) =>
      apiKeysApi.create({
        name: data.name,
        provider: data.provider as ApiKeyProvider,
        key: data.provider === 'azure_openai'
          ? `${data.key}|||${data.azureEndpoint}`
          : data.key,
        setAsDefault: data.setAsDefault,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setAddDialogOpen(false)
      reset()
      toast({ title: 'API key added', variant: 'success' })
    },
    onError: () => {
      toast({ title: 'Failed to add API key', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast({ title: 'API key deleted' })
    },
  })

  const validateMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.validate(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      if (result.valid) {
        toast({ title: 'API key is valid', variant: 'success' })
      } else {
        toast({ title: 'API key is invalid', description: result.error, variant: 'destructive' })
      }
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast({ title: 'Default key updated' })
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddKeyData>({
    resolver: zodResolver(addKeySchema),
    defaultValues: { provider: 'openai', setAsDefault: false },
  })

  const selectedProvider = watch('provider')

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const keyPlaceholder = () => {
    if (selectedProvider === 'openai') return 'sk-...'
    if (selectedProvider === 'azure_openai') return 'Azure OpenAI API key'
    return 'AIza...'
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bring your own keys for OpenAI, Azure OpenAI, and Google Gemini
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Key
        </Button>
      </div>

      {/* Keys table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !keys?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Key className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No API keys configured</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Add your OpenAI, Azure OpenAI, or Gemini API key to get started
            </p>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              Add First Key
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-2">
                      {key.name}
                      {key.isDefault && (
                        <Badge variant="info" className="text-xs">default</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${PROVIDER_COLORS[key.provider as ApiKeyProvider] ?? ''}`}
                    >
                      {PROVIDER_LABELS[key.provider as ApiKeyProvider] ?? key.provider}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {showKeys.has(key.id)
                        ? key.maskedKey
                        : '••••••••' + key.maskedKey.slice(-4)}
                      <button
                        onClick={() => toggleShowKey(key.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {showKeys.has(key.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {key.isValid ? (
                      <div className="flex items-center gap-1 text-green-400 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" />Valid
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-400 text-xs">
                        <XCircle className="h-3.5 w-3.5" />Invalid
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatNumber(key.usageStats.totalRequests)} req
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRelativeTime(key.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-yellow-400"
                        onClick={() => setDefaultMutation.mutate(key.id)}
                        disabled={key.isDefault || setDefaultMutation.isPending}
                        title="Set as default"
                      >
                        <Star className={key.isDefault ? 'h-3.5 w-3.5 fill-yellow-400 text-yellow-400' : 'h-3.5 w-3.5'} />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-blue-400"
                        onClick={() => validateMutation.mutate(key.id)}
                        disabled={validateMutation.isPending}
                        title="Test key"
                      >
                        {validateMutation.isPending
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <CheckCircle2 className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-400"
                        onClick={() => { if (confirm('Delete this API key?')) deleteMutation.mutate(key.id) }}
                        title="Delete key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add key dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(o) => { if (!o) { setAddDialogOpen(false); reset() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add API Key</DialogTitle>
            <DialogDescription>Your API key is encrypted and stored securely</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="e.g., Production OpenAI" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={(v) => setValue('provider', v as AddKeyData['provider'])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="azure_openai">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        Azure OpenAI
                      </div>
                    </SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedProvider === 'azure_openai' && (
              <div className="space-y-1.5">
                <Label>Azure Endpoint</Label>
                <Input
                  placeholder="https://your-resource.openai.azure.com"
                  className="font-mono text-sm"
                  {...register('azureEndpoint')}
                />
                {errors.azureEndpoint && (
                  <p className="text-xs text-destructive">{errors.azureEndpoint.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Found in Azure Portal → your OpenAI resource → Keys and Endpoint
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input type="password" placeholder={keyPlaceholder()} {...register('key')} />
              {errors.key && <p className="text-xs text-destructive">{errors.key.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Set as default</Label>
                <p className="text-xs text-muted-foreground">Use this key for new calls</p>
              </div>
              <Switch
                checked={watch('setAsDefault')}
                onCheckedChange={(v) => setValue('setAsDefault', v)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => { setAddDialogOpen(false); reset() }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                  : 'Add Key'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
