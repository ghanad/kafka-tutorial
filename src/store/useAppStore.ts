import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

export interface AppStore {
  completedLessons: string[]
  quizScores: Record<string, number>
  bookmarks: string[]
  notes: Record<string, string>
  theme: Theme
  lastVisitedLesson: string | null

  toggleLessonComplete: (lessonId: string) => void
  markLessonComplete: (lessonId: string) => void
  setQuizScore: (lessonId: string, score: number) => void
  toggleBookmark: (lessonId: string) => void
  setNote: (lessonId: string, note: string) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setLastVisitedLesson: (lessonId: string) => void
  resetAllData: () => void
}

type PersistedAppState = Pick<
  AppStore,
  'completedLessons' | 'quizScores' | 'bookmarks' | 'notes' | 'theme' | 'lastVisitedLesson'
>

export const STORAGE_KEY = 'kafka-tutorial-store'
export const STORE_VERSION = 1

const initialPersistedState: PersistedAppState = {
  completedLessons: [],
  quizScores: {},
  bookmarks: [],
  notes: {},
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
    quizScores:
      data.quizScores && typeof data.quizScores === 'object' ? { ...data.quizScores } : {},
    bookmarks: uniqueStrings(data.bookmarks),
    notes: data.notes && typeof data.notes === 'object' ? { ...data.notes } : {},
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

      setQuizScore: (lessonId, score) =>
        set((state) => {
          const clamped = Math.max(0, Math.min(100, Math.round(score)))
          return {
            quizScores: {
              ...state.quizScores,
              [lessonId]: Math.max(clamped, state.quizScores[lessonId] ?? 0),
            },
          }
        }),

      toggleBookmark: (lessonId) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(lessonId)
            ? state.bookmarks.filter((id) => id !== lessonId)
            : [...state.bookmarks, lessonId],
        })),

      setNote: (lessonId, note) =>
        set((state) => {
          const notes = { ...state.notes }
          if (note.trim() === '') {
            delete notes[lessonId]
          } else {
            notes[lessonId] = note
          }
          return { notes }
        }),

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      setLastVisitedLesson: (lessonId) => set({ lastVisitedLesson: lessonId }),

      resetAllData: () => set({ ...initialPersistedState }),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedAppState => ({
        completedLessons: state.completedLessons,
        quizScores: state.quizScores,
        bookmarks: state.bookmarks,
        notes: state.notes,
        theme: state.theme,
        lastVisitedLesson: state.lastVisitedLesson,
      }),
      migrate: (persistedState, version) => {
        if (version < STORE_VERSION) {
          return sanitizePersistedState(persistedState)
        }
        return sanitizePersistedState(persistedState)
      },
    },
  ),
)
