'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsCards } from '@/components/analytics/StatsCards'
import { CallVolumeChart } from '@/components/analytics/CallVolumeChart'
import { SentimentChart } from '@/components/analytics/SentimentChart'
import { ToolUsageChart } from '@/components/analytics/ToolUsageChart'
import {
  useAnalyticsStats,
  useCallVolume,
  useSentimentData,
  useToolUsageData,
  useMemoryGrowth,
} from '@/hooks/useAnalytics'
import { useConversations } from '@/hooks/useConversations'
import { ConversationCard } from '@/components/conversations/ConversationCard'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30')

  const { data: stats, isLoading: statsLoading } = useAnalyticsStats()
  const { data: callVolume, isLoading: cvLoading } = useCallVolume(Number(period))
  const { data: sentiment, isLoading: sentLoading } = useSentimentData()
  const { data: toolUsage, isLoading: toolLoading } = useToolUsageData()
  const { data: memoryGrowth, isLoading: memLoading } = useMemoryGrowth(Number(period))
  const { data: recentConvs, isLoading: convsLoading } = useConversations({
    page: 1,
    pageSize: 5,
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your voice AI usage and performance
          </p>
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['7', '30', '90'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} isLoading={statsLoading} />

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Call volume */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Call Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CallVolumeChart data={callVolume} isLoading={cvLoading} />
          </CardContent>
        </Card>

        {/* Sentiment distribution */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sentiment Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SentimentChart data={sentiment} isLoading={sentLoading} />
          </CardContent>
        </Card>

        {/* Tool usage */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Most Used Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ToolUsageChart data={toolUsage} isLoading={toolLoading} />
          </CardContent>
        </Card>

        {/* Memory growth */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Memory Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {memLoading ? (
              <Skeleton className="h-48 w-full rounded-lg" />
            ) : memoryGrowth && memoryGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={192}>
                <AreaChart
                  data={memoryGrowth.map((d) => ({
                    ...d,
                    date: format(parseISO(d.date), 'MMM d'),
                  }))}
                  margin={{ top: 5, right: 5, bottom: 0, left: -20 }}
                >
                  <defs>
                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#71717a' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#71717a' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111111',
                      border: '1px solid #222222',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total memories"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#memGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent conversations table */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {convsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentConvs?.data.map((conv) => (
                <ConversationCard key={conv.id} conversation={conv} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
