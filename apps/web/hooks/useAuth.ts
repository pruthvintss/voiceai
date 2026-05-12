'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/lib/api'

export function useAuth() {
  const { user, tokens, isAuthenticated, isLoading, login, logout, setLoading, setUser } = useAuthStore()
  const router = useRouter()

  // Validate stored token on mount
  useEffect(() => {
    const validateAuth = async () => {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

      if (!storedToken && !isAuthenticated) {
        setLoading(false)
        return
      }

      if (isAuthenticated && user) {
        setLoading(false)
        return
      }

      try {
        const currentUser = await authApi.me()
        setUser(currentUser)
        setLoading(false)
      } catch {
        logout()
        setLoading(false)
      }
    }

    validateAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password)
      login(result.user, result.tokens)
      router.push('/dashboard')
    },
    [login, router]
  )

  const handleRegister = useCallback(
    async (name: string, email: string, password: string, workspaceName: string) => {
      const result = await authApi.register(name, email, password, workspaceName)
      login(result.user, result.tokens)
      router.push('/dashboard')
    },
    [login, router]
  )

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore logout errors
    } finally {
      logout()
      router.push('/login')
    }
  }, [logout, router])

  return {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  }
}
