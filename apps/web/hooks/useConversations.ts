'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationsApi } from '@/lib/api'

export function useConversations(params?: {
  page?: number
  pageSize?: number
  search?: string
}) {
  return useQuery({
    queryKey: ['conversations', params],
    queryFn: () => conversationsApi.list(params),
    staleTime: 30000,
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => conversationsApi.get(id),
    enabled: !!id,
  })
}

export function useConversationTranscript(id: string) {
  return useQuery({
    queryKey: ['conversation-transcript', id],
    queryFn: () => conversationsApi.getTranscript(id),
    enabled: !!id,
    staleTime: 60000,
  })
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => conversationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
