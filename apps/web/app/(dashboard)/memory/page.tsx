'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Plus, Trash2, SortAsc, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MemoryCard } from '@/components/memory/MemoryCard'
import { MemorySearch } from '@/components/memory/MemorySearch'
import { MemoryCategoryFilter } from '@/components/memory/MemoryCategoryFilter'
import { MemoryEditDialog } from '@/components/memory/MemoryEditDialog'
import {
  useMemories,
  useSearchMemories,
  useUpdateMemory,
  useDeleteMemory,
  useBulkDeleteMemories,
  useCreateMemory,
} from '@/hooks/useMemories'
import { useToast } from '@/hooks/useToast'
import type { Memory, MemoryCategory } from '@/types'

type SortKey = 'date' | 'importance'

export default function MemoryPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<MemoryCategory | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('date')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const PAGE_SIZE = 20
  const { toast } = useToast()

  const { data, isLoading } = useMemories({
    page,
    pageSize: PAGE_SIZE,
    category: category !== 'all' ? category : undefined,
    search: search.length <= 2 ? search : undefined,
  })

  const { data: searchResults, isLoading: isSearching } = useSearchMemories(
    search.length > 2 ? search : ''
  )

  const updateMemory = useUpdateMemory()
  const deleteMemory = useDeleteMemory()
  const bulkDelete = useBulkDeleteMemories()
  const createMemory = useCreateMemory()

  const displayedMemories =
    search.length > 2
      ? searchResults?.map((r) => r.memory) || []
      : data?.data || []

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (!confirm(`Delete ${ids.length} memories? This cannot be undone.`)) return
    try {
      await bulkDelete.mutateAsync(ids)
      setSelectedIds(new Set())
      toast({ title: `${ids.length} memories deleted`, variant: 'success' })
    } catch {
      toast({ title: 'Failed to delete memories', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this memory?')) return
    try {
      await deleteMemory.mutateAsync(id)
      toast({ title: 'Memory deleted' })
    } catch {
      toast({ title: 'Failed to delete memory', variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Memory Explorer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.total !== undefined
              ? `${data.total} memories stored`
              : 'Browse and manage your stored memories'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selectedIds.size}
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Memory
          </Button>
        </div>
      </div>

      {/* Search */}
      <MemorySearch
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        isSearching={isSearching}
        resultCount={search.length > 2 ? searchResults?.length : undefined}
      />

      {/* Category filter */}
      <MemoryCategoryFilter
        selected={category}
        onChange={(c) => {
          setCategory(c)
          setPage(1)
        }}
      />

      {/* Memory grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : displayedMemories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Brain className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">
            {search ? 'No memories match your search' : 'No memories yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {search
              ? 'Try a different search term or category'
              : 'Memories are extracted from your voice conversations'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {displayedMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onEdit={setEditingMemory}
                  onDelete={handleDelete}
                  isSelected={selectedIds.has(memory.id)}
                  onSelect={handleSelect}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination (only when not searching) */}
          {search.length <= 2 && data && data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit dialog */}
      <MemoryEditDialog
        memory={editingMemory}
        open={!!editingMemory}
        onClose={() => setEditingMemory(null)}
        onSave={async (id, data) => {
          await updateMemory.mutateAsync({ id, data })
          toast({ title: 'Memory updated' })
        }}
        isLoading={updateMemory.isPending}
      />

      {/* Create dialog */}
      <MemoryEditDialog
        memory={
          showCreate
            ? {
                id: '',
                workspaceId: '',
                userId: '',
                content: '',
                category: 'fact',
                importance: 0.5,
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : null
        }
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={async (_id, d) => {
          await createMemory.mutateAsync({
            content: d.content!,
            category: d.category!,
            importance: d.importance!,
            tags: d.tags,
          })
          setShowCreate(false)
          toast({ title: 'Memory created' })
        }}
        isLoading={createMemory.isPending}
      />
    </div>
  )
}
