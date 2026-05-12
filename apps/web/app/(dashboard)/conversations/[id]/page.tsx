'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Cpu, MessageSquare, BarChart3, Brain } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TranscriptViewer } from '@/components/conversations/TranscriptViewer'
import { SummaryPanel } from '@/components/conversations/SummaryPanel'
import { MemoryCard } from '@/components/memory/MemoryCard'
import { useConversation, useConversationTranscript } from '@/hooks/useConversations'
import { useMemories, useUpdateMemory, useDeleteMemory } from '@/hooks/useMemories'
import { MemoryEditDialog } from '@/components/memory/MemoryEditDialog'
import {
  formatDate,
  formatDuration,
  getProviderLabel,
  getProviderColor,
  cn,
} from '@/lib/utils'
import type { Memory } from '@/types'

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [editingMemory, setEditingMemory] = React.useState<Memory | null>(null)

  const { data: conversation, isLoading } = useConversation(id)
  const { data: transcript, isLoading: transcriptLoading } = useConversationTranscript(id)
  const { data: memoriesData } = useMemories({ search: id })
  const updateMemory = useUpdateMemory()
  const deleteMemory = useDeleteMemory()

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Conversation not found</p>
          <Button variant="ghost" asChild className="mt-3">
            <Link href="/conversations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to conversations
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground -ml-2">
          <Link href="/conversations">
            <ArrowLeft className="h-4 w-4" />
            Conversations
          </Link>
        </Button>

        <div>
          <h1 className="text-xl font-bold">
            {conversation.title || 'Untitled conversation'}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span>{formatDate(conversation.startedAt, 'MMMM d, yyyy h:mm a')}</span>

            {conversation.durationSeconds && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(conversation.durationSeconds)}
              </span>
            )}

            <Badge
              variant="outline"
              className={cn('text-xs', getProviderColor(conversation.provider))}
            >
              {getProviderLabel(conversation.provider)}
            </Badge>

            <Badge variant="secondary" className="text-xs font-mono">
              {conversation.model}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transcript">
        <TabsList className="bg-secondary">
          <TabsTrigger value="transcript" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-1.5 text-xs">
            <Cpu className="h-3.5 w-3.5" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="memories" className="gap-1.5 text-xs">
            <Brain className="h-3.5 w-3.5" />
            Memories
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Transcript */}
        <TabsContent value="transcript" className="mt-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <TranscriptViewer
              turns={transcript || []}
              isLoading={transcriptLoading}
            />
          </div>
        </TabsContent>

        {/* Summary */}
        <TabsContent value="summary" className="mt-4">
          {conversation.summary ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <SummaryPanel summary={conversation.summary} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-border">
              <Cpu className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No summary available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Summary is generated after the conversation ends
              </p>
            </div>
          )}
        </TabsContent>

        {/* Memories */}
        <TabsContent value="memories" className="mt-4">
          {!memoriesData?.data.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-border">
              <Brain className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No memories from this conversation</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {memoriesData.data.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onEdit={setEditingMemory}
                  onDelete={async (mid) => {
                    await deleteMemory.mutateAsync(mid)
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="mt-4">
          {conversation.analytics ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: 'Avg Response Time', value: `${conversation.analytics.avgResponseMs}ms` },
                { label: 'User Turns', value: conversation.analytics.userTurns },
                { label: 'AI Turns', value: conversation.analytics.agentTurns },
                { label: 'Tool Calls', value: conversation.analytics.toolCallCount },
                { label: 'Interruptions', value: conversation.analytics.interruptions },
                { label: 'Words Spoken', value: conversation.analytics.wordsSpoken },
              ].map(({ label, value }) => (
                <Card key={label} className="border-border">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-border">
              <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No analytics available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Memory edit dialog */}
      <MemoryEditDialog
        memory={editingMemory}
        open={!!editingMemory}
        onClose={() => setEditingMemory(null)}
        onSave={async (mid, data) => {
          await updateMemory.mutateAsync({ id: mid, data })
        }}
        isLoading={updateMemory.isPending}
      />
    </div>
  )
}
