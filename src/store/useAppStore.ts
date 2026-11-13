import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

export interface AppStore {
  completedLessons: string[]
  bookmarks: string[]
  notes: Record<string, string>
  theme: Theme
  lastVisitedLesson: string | null

  toggleLessonComplete: (lessonId: string) => void
  markLessonComplete: (lessonId: string) => void
  toggleBookmark: (lessonId: string) => void
  setLessonNote: (lessonId: string, note: string) => void
  deleteLessonNote: (lessonId: string) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setLastVisitedLesson: (lessonId: string) => void
  importData: (data: unknown) => void
  resetAllData: () => void
}

export type PersistedAppState = Pick<
  AppStore,
  'completedLessons' | 'bookmarks' | 'notes' | 'theme' | 'lastVisitedLesson'
>

export const STORAGE_KEY = 'kafka-tutorial-store'
export const STORE_VERSION = 3

const initialPersistedState: PersistedAppState = {
  completedLessons: [],
  bookmarks: [],
  notes: {},
  theme: 'light',
  lastVisitedLesson: null,
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string')))
}

function sanitizeNotes(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(value)) {
    if (typeof key === 'string' && typeof val === 'string') {
      const trimmed = val.trim()
      if (trimmed.length > 0) {
        result[key] = val
      }
    }
  }
  return result
}

function sanitizePersistedState(value: unknown): PersistedAppState {
  if (!value || typeof value !== 'object') return initialPersistedState
  const data = value as Partial<PersistedAppState>

  return {
    completedLessons: uniqueStrings(data.completedLessons),
    bookmarks: uniqueStrings(data.bookmarks),
    notes: sanitizeNotes(data.notes),
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

      setLessonNote: (lessonId, note) =>
        set((state) => {
          const trimmed = note.trim()
          if (trimmed.length === 0) {
            const { [lessonId]: _, ...rest } = state.notes
            return { notes: rest }
          }
          return {
            notes: {
              ...state.notes,
              [lessonId]: note,
            },
          }
        }),

      deleteLessonNote: (lessonId) =>
        set((state) => {
          const { [lessonId]: _, ...rest } = state.notes
          return { notes: rest }
        }),

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
        notes: state.notes,
        theme: state.theme,
        lastVisitedLesson: state.lastVisitedLesson,
      }),
      migrate: (persistedState) => sanitizePersistedState(persistedState),
    },
  ),
)
