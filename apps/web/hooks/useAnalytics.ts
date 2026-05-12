'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api'

export function useAnalyticsStats() {
  return useQuery({
    queryKey: ['analytics-stats'],
    queryFn: () => analyticsApi.getStats(),
    staleTime: 60000,
    refetchInterval: 300000, // Refresh every 5 minutes
  })
}

export function useCallVolume(days = 30) {
  return useQuery({
    queryKey: ['call-volume', days],
    queryFn: () => analyticsApi.getCallVolume(days),
    staleTime: 300000,
  })
}

export function useSentimentData() {
  return useQuery({
    queryKey: ['sentiment-data'],
    queryFn: () => analyticsApi.getSentiment(),
    staleTime: 300000,
  })
}

export function useToolUsageData() {
  return useQuery({
    queryKey: ['tool-usage'],
    queryFn: () => analyticsApi.getToolUsage(),
    staleTime: 300000,
  })
}

export function useMemoryGrowth(days = 30) {
  return useQuery({
    queryKey: ['memory-growth', days],
    queryFn: () => analyticsApi.getMemoryGrowth(days),
    staleTime: 300000,
  })
}
