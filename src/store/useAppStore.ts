import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

export interface AppStore {
  completedLessons: string[]
  bookmarks: string[]
  theme: Theme
  lastVisitedLesson: string | null

  toggleLessonComplete: (lessonId: string) => void
  markLessonComplete: (lessonId: string) => void
  toggleBookmark: (lessonId: string) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setLastVisitedLesson: (lessonId: string) => void
  importData: (data: unknown) => void
  resetAllData: () => void
}

export type PersistedAppState = Pick<
  AppStore,
  'completedLessons' | 'bookmarks' | 'theme' | 'lastVisitedLesson'
>

export const STORAGE_KEY = 'kafka-tutorial-store'
export const STORE_VERSION = 2

const initialPersistedState: PersistedAppState = {
  completedLessons: [],
  bookmarks: [],
  theme: 'light',
  lastVisitedLesson: null,
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string')))
}

function sanitizePersistedState(value: unknown): PersistedAppState {
  if (!value || typeof value !== 'object') return initialPersistedState
  const data = value as Partial<PersistedAppState>

  return {
    completedLessons: uniqueStrings(data.completedLessons),
    bookmarks: uniqueStrings(data.bookmarks),
    theme: data.theme === 'dark' ? 'dark' : 'light',
    lastVisitedLesson:
      typeof data.lastVisitedLesson === 'string' ? data.lastVisitedLesson : null,
  }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialPersistedState,

      toggleLessonComplete: (lessonId) =>
        set((state) => ({
          completedLessons: state.completedLessons.includes(lessonId)
            ? state.completedLessons.filter((id) => id !== lessonId)
            : [...state.completedLessons, lessonId],
        })),

      markLessonComplete: (lessonId) =>
        set((state) => ({
          completedLessons: state.completedLessons.includes(lessonId)
            ? state.completedLessons
            : [...state.completedLessons, lessonId],
        })),

      toggleBookmark: (lessonId) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(lessonId)
            ? state.bookmarks.filter((id) => id !== lessonId)
            : [...state.bookmarks, lessonId],
        })),

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      setLastVisitedLesson: (lessonId) => set({ lastVisitedLesson: lessonId }),

      importData: (data) => set({ ...sanitizePersistedState(data) }),

      resetAllData: () => set({ ...initialPersistedState }),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedAppState => ({
        completedLessons: state.completedLessons,
        bookmarks: state.bookmarks,
        theme: state.theme,
        lastVisitedLesson: state.lastVisitedLesson,
      }),
      migrate: (persistedState) => sanitizePersistedState(persistedState),
    },
  ),
)
