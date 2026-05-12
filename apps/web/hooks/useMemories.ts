'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { memoriesApi } from '@/lib/api'
import type { Memory, MemoryCategory } from '@/types'

export function useMemories(params?: {
  page?: number
  pageSize?: number
  category?: MemoryCategory
  search?: string
  minImportance?: number
}) {
  return useQuery({
    queryKey: ['memories', params],
    queryFn: () => memoriesApi.list(params),
    staleTime: 30000,
  })
}

export function useMemoriesInfinite(params?: {
  pageSize?: number
  category?: MemoryCategory
  search?: string
}) {
  return useInfiniteQuery({
    queryKey: ['memories-infinite', params],
    queryFn: ({ pageParam = 1 }) =>
      memoriesApi.list({ ...params, page: pageParam as number, pageSize: params?.pageSize || 20 }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 30000,
  })
}

export function useMemory(id: string) {
  return useQuery({
    queryKey: ['memory', id],
    queryFn: () => memoriesApi.get(id),
    enabled: !!id,
  })
}

export function useSearchMemories(query: string) {
  return useQuery({
    queryKey: ['memories-search', query],
    queryFn: () => memoriesApi.search(query),
    enabled: query.length > 2,
    staleTime: 10000,
  })
}

export function useUpdateMemory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Memory> }) =>
      memoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] })
      queryClient.invalidateQueries({ queryKey: ['memories-infinite'] })
    },
  })
}

export function useDeleteMemory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => memoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] })
      queryClient.invalidateQueries({ queryKey: ['memories-infinite'] })
    },
  })
}

export function useBulkDeleteMemories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => memoriesApi.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] })
      queryClient.invalidateQueries({ queryKey: ['memories-infinite'] })
    },
  })
}

export function useCreateMemory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      content: string
      category: MemoryCategory
      importance: number
      tags?: string[]
    }) => memoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] })
      queryClient.invalidateQueries({ queryKey: ['memories-infinite'] })
    },
  })
}
