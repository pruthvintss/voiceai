'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mic2, MessageSquare, Brain, BarChart3, ArrowRight, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCards } from '@/components/analytics/StatsCards'
import { useAnalyticsStats } from '@/hooks/useAnalytics'
import { useConversations } from '@/hooks/useConversations'
import { ConversationCard } from '@/components/conversations/ConversationCard'
import { useAuthStore } from '@/store/authStore'
import { formatRelativeTime } from '@/lib/utils'

const quickActions = [
  {
    href: '/call',
    icon: Mic2,
    label: 'Start Voice Call',
    description: 'Begin a new realtime voice session',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    href: '/memory',
    icon: Brain,
    label: 'Browse Memory',
    description: 'Explore and manage your memories',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    href: '/conversations',
    icon: MessageSquare,
    label: 'View History',
    description: 'See past conversations and summaries',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
  },
  {
    href: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
    description: 'Track usage and performance metrics',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
  },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: stats, isLoading: statsLoading } = useAnalyticsStats()
  const { data: conversationsData, isLoading: convsLoading } = useConversations({ pageSize: 3 })

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">
            {greeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening with your Voice AI workspace
          </p>
        </div>

        <Button asChild size="lg" className="gap-2 hidden sm:flex">
          <Link href="/call">
            <Mic2 className="h-4 w-4" />
            Start Call
          </Link>
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StatsCards stats={stats} isLoading={statsLoading} />
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <Card className={`border hover:scale-[1.02] transition-transform cursor-pointer ${action.bg}`}>
                  <CardContent className="p-4">
                    <Icon className={`h-5 w-5 mb-2 ${action.color}`} />
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </motion.div>

      {/* Recent conversations */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recent Conversations
          </h2>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-muted-foreground">
            <Link href="/conversations">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {convsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : conversationsData?.data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Start your first voice call to get going
              </p>
              <Button asChild size="sm">
                <Link href="/call">
                  <Mic2 className="mr-2 h-3.5 w-3.5" />
                  Start Call
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {conversationsData?.data.map((conv) => (
              <ConversationCard key={conv.id} conversation={conv} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
