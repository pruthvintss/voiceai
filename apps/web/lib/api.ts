import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'
import type {
  User,
  Workspace,
  Conversation,
  TranscriptTurn,
  Memory,
  MemorySearchResult,
  ApiKey,
  CreateApiKeyRequest,
  Integration,
  ToolActivityLog,
  AnalyticsStats,
  CallVolumeDataPoint,
  SentimentDataPoint,
  ToolUsageDataPoint,
  MemoryGrowthDataPoint,
  PaginatedResponse,
  AuthTokens,
  CallConfig,
  ContextBundle,
  MemoryCategory,
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================================
// Axios instance setup
// ============================================================

const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: inject JWT token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get('access_token') || localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 and refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else if (token) {
      resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = Cookies.get('refresh_token') || localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
          refreshToken,
        })
        const { accessToken } = response.data

        Cookies.set('access_token', accessToken, { expires: 1, secure: true, sameSite: 'strict' })
        localStorage.setItem('access_token', accessToken)

        processQueue(null, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        Cookies.remove('access_token')
        Cookies.remove('refresh_token')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ============================================================
// Auth API
// ============================================================

export const authApi = {
  login: async (email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  register: async (
    name: string,
    email: string,
    password: string,
    workspaceName: string
  ): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await api.post('/auth/register', { name, email, password, workspaceName })
    return response.data
  },

  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  me: async (): Promise<User> => {
    const response = await api.get('/auth/me')
    return response.data
  },
}

// ============================================================
// Conversations API
// ============================================================

export const conversationsApi = {
  list: async (params?: {
    page?: number
    pageSize?: number
    search?: string
  }): Promise<PaginatedResponse<Conversation>> => {
    const response = await api.get('/conversations', { params })
    return response.data
  },

  get: async (id: string): Promise<Conversation> => {
    const response = await api.get(`/conversations/${id}`)
    return response.data
  },

  getTranscript: async (id: string): Promise<TranscriptTurn[]> => {
    const response = await api.get(`/conversations/${id}/transcript`)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/conversations/${id}`)
  },

  initiate: async (config: CallConfig): Promise<{ sessionId: string; conversationId: string; context: ContextBundle }> => {
    const response = await api.post('/conversations/initiate', config)
    return response.data
  },
}

// ============================================================
// Memories API
// ============================================================

export const memoriesApi = {
  list: async (params?: {
    page?: number
    pageSize?: number
    category?: MemoryCategory
    search?: string
    minImportance?: number
  }): Promise<PaginatedResponse<Memory>> => {
    const response = await api.get('/memories', { params })
    return response.data
  },

  search: async (query: string, limit = 20): Promise<MemorySearchResult[]> => {
    const response = await api.post('/memories/search', { query, limit })
    return response.data
  },

  get: async (id: string): Promise<Memory> => {
    const response = await api.get(`/memories/${id}`)
    return response.data
  },

  create: async (data: {
    content: string
    category: MemoryCategory
    importance: number
    tags?: string[]
  }): Promise<Memory> => {
    const response = await api.post('/memories', data)
    return response.data
  },

  update: async (
    id: string,
    data: {
      content?: string
      category?: MemoryCategory
      importance?: number
      tags?: string[]
    }
  ): Promise<Memory> => {
    const response = await api.patch(`/memories/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/memories/${id}`)
  },

  bulkDelete: async (ids: string[]): Promise<void> => {
    await api.post('/memories/bulk-delete', { ids })
  },
}

// ============================================================
// API Keys API
// ============================================================

export const apiKeysApi = {
  list: async (): Promise<ApiKey[]> => {
    const response = await api.get('/api-keys')
    return response.data
  },

  create: async (data: CreateApiKeyRequest): Promise<ApiKey> => {
    const response = await api.post('/api-keys', data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api-keys/${id}`)
  },

  validate: async (id: string): Promise<{ valid: boolean; error?: string }> => {
    const response = await api.post(`/api-keys/${id}/validate`)
    return response.data
  },

  setDefault: async (id: string): Promise<void> => {
    await api.post(`/api-keys/${id}/set-default`)
  },
}

// ============================================================
// Integrations API
// ============================================================

export const integrationsApi = {
  list: async (): Promise<Integration[]> => {
    const response = await api.get('/integrations')
    return response.data
  },

  connect: async (id: string, config: Record<string, unknown>): Promise<Integration> => {
    const response = await api.post(`/integrations/${id}/connect`, config)
    return response.data
  },

  disconnect: async (id: string): Promise<void> => {
    await api.post(`/integrations/${id}/disconnect`)
  },

  updateSettings: async (id: string, settings: { requiresApproval?: boolean; enabledTools?: string[] }): Promise<Integration> => {
    const response = await api.patch(`/integrations/${id}`, settings)
    return response.data
  },

  getActivityLog: async (params?: {
    page?: number
    pageSize?: number
    integrationId?: string
  }): Promise<PaginatedResponse<ToolActivityLog>> => {
    const response = await api.get('/integrations/activity', { params })
    return response.data
  },
}

// ============================================================
// Analytics API
// ============================================================

export const analyticsApi = {
  getStats: async (): Promise<AnalyticsStats> => {
    const response = await api.get('/analytics/stats')
    return response.data
  },

  getCallVolume: async (days = 30): Promise<CallVolumeDataPoint[]> => {
    const response = await api.get('/analytics/call-volume', { params: { days } })
    return response.data
  },

  getSentiment: async (): Promise<SentimentDataPoint[]> => {
    const response = await api.get('/analytics/sentiment')
    return response.data
  },

  getToolUsage: async (): Promise<ToolUsageDataPoint[]> => {
    const response = await api.get('/analytics/tool-usage')
    return response.data
  },

  getMemoryGrowth: async (days = 30): Promise<MemoryGrowthDataPoint[]> => {
    const response = await api.get('/analytics/memory-growth', { params: { days } })
    return response.data
  },
}

// ============================================================
// Workspace API
// ============================================================

export const workspaceApi = {
  get: async (): Promise<Workspace> => {
    const response = await api.get('/workspace')
    return response.data
  },

  update: async (data: Partial<Workspace>): Promise<Workspace> => {
    const response = await api.patch('/workspace', data)
    return response.data
  },

  getMembers: async (): Promise<{ id: string; userId: string; role: string; user: User; joinedAt: string }[]> => {
    const response = await api.get('/workspace/members')
    return response.data
  },

  inviteMember: async (email: string, role: string): Promise<void> => {
    await api.post('/workspace/members/invite', { email, role })
  },

  removeMember: async (memberId: string): Promise<void> => {
    await api.delete(`/workspace/members/${memberId}`)
  },
}

export default api
