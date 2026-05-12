'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const pageTitles: Record<string, string> = {
  '/call': 'Voice Call',
  '/conversations': 'Conversations',
  '/memory': 'Memory Explorer',
  '/integrations': 'Integrations',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
  '/settings/api-keys': 'API Keys',
  '/settings/workspace': 'Workspace',
  '/dashboard': 'Dashboard',
}

export function Header() {
  const pathname = usePathname()
  const { user } = useAuth()

  const getTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname.endsWith(path)) return title
    }
    return 'Dashboard'
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-[#0a0a0a] px-6">
      <div>
        <h1 className="text-lg font-semibold">{getTitle()}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 w-56 h-9 bg-secondary border-secondary text-sm"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>

        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src={user?.avatar} />
          <AvatarFallback className="text-xs bg-primary/20 text-primary">
            {user?.name?.slice(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
