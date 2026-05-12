'use client'

import React from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Key, Building2, ChevronRight, User, Bell, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useToast } from '@/hooks/useToast'

const profileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

type ProfileData = z.infer<typeof profileSchema>

const settingsLinks = [
  {
    href: '/settings/api-keys',
    icon: Key,
    label: 'API Keys',
    description: 'Manage BYOK API keys for OpenAI and Gemini',
  },
  {
    href: '/settings/workspace',
    icon: Building2,
    label: 'Workspace',
    description: 'Configure workspace settings and members',
  },
]

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { settings, updateSettings } = useSettingsStore()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  })

  const onSubmit = async (_data: ProfileData) => {
    // In a real app, call user update API
    await new Promise((r) => setTimeout(r, 500))
    toast({ title: 'Profile updated', variant: 'success' })
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {settingsLinks.map(({ href, icon: Icon, label, description }) => (
          <Link key={href} href={href}>
            <Card className="border-border hover:border-primary/30 transition-colors cursor-pointer group">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Profile */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Saving...</>
              ) : (
                'Save changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notifications
          </CardTitle>
          <CardDescription>Choose what you get notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: 'callSummaryEmail' as const,
              label: 'Call summary emails',
              description: 'Get a summary emailed after each call',
            },
            {
              key: 'memoriesWeeklyDigest' as const,
              label: 'Weekly memory digest',
              description: 'Weekly summary of new memories',
            },
            {
              key: 'toolErrors' as const,
              label: 'Tool error alerts',
              description: 'Notify when tool calls fail',
            },
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={settings.notifications[key]}
                onCheckedChange={(checked) =>
                  updateSettings({
                    notifications: { ...settings.notifications, [key]: checked },
                  })
                }
                aria-label={label}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
