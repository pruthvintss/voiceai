import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserSettings } from '@/types'

interface SettingsState {
  settings: UserSettings
  sidebarCollapsed: boolean
  updateSettings: (updates: Partial<UserSettings>) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  notifications: {
    callSummaryEmail: true,
    memoriesWeeklyDigest: false,
    toolErrors: true,
  },
  preferredProvider: 'openai',
  preferredModel: 'gpt-4o-realtime-preview',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      sidebarCollapsed: false,

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
)
