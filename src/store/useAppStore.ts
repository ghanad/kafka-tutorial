import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type FontFamily = 'vazirmatn' | 'vazirmatn-ui' | 'system' | 'serif'
export type LineHeight = 'compact' | 'normal' | 'relaxed'

export interface AppStore {
  completedLessons: string[]
  bookmarks: string[]
  notes: Record<string, string>
  theme: Theme
  lastVisitedLesson: string | null
  fontSize: FontSize
  fontFamily: FontFamily
  lineHeight: LineHeight

  toggleLessonComplete: (lessonId: string) => void
  markLessonComplete: (lessonId: string) => void
  toggleBookmark: (lessonId: string) => void
  setLessonNote: (lessonId: string, note: string) => void
  deleteLessonNote: (lessonId: string) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setFontSize: (fontSize: FontSize) => void
  setFontFamily: (fontFamily: FontFamily) => void
  setLineHeight: (lineHeight: LineHeight) => void
  stepFontSize: (direction: 'increase' | 'decrease') => void
  resetFontSettings: () => void
  setLastVisitedLesson: (lessonId: string) => void
  importData: (data: unknown) => void
  resetAllData: () => void
}

export type PersistedAppState = Pick<
  AppStore,
  | 'completedLessons'
  | 'bookmarks'
  | 'notes'
  | 'theme'
  | 'lastVisitedLesson'
  | 'fontSize'
  | 'fontFamily'
  | 'lineHeight'
>

export const STORAGE_KEY = 'kafka-tutorial-store'
export const STORE_VERSION = 4

const fontSizes: FontSize[] = ['sm', 'md', 'lg', 'xl']

function stepSize(current: FontSize, direction: 'increase' | 'decrease'): FontSize {
  const index = fontSizes.indexOf(current)
  if (index === -1) return 'md'
  if (direction === 'increase') {
    return fontSizes[Math.min(fontSizes.length - 1, index + 1)]
  }
  return fontSizes[Math.max(0, index - 1)]
}

const initialPersistedState: PersistedAppState = {
  completedLessons: [],
  bookmarks: [],
  notes: {},
  theme: 'light',
  lastVisitedLesson: null,
  fontSize: 'md',
  fontFamily: 'vazirmatn',
  lineHeight: 'normal',
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

function sanitizeFontSize(value: unknown): FontSize {
  if (value === 'sm' || value === 'md' || value === 'lg' || value === 'xl') {
    return value
  }
  return 'md'
}

function sanitizeFontFamily(value: unknown): FontFamily {
  if (
    value === 'vazirmatn' ||
    value === 'vazirmatn-ui' ||
    value === 'system' ||
    value === 'serif'
  ) {
    return value
  }
  return 'vazirmatn'
}

function sanitizeLineHeight(value: unknown): LineHeight {
  if (value === 'compact' || value === 'normal' || value === 'relaxed') {
    return value
  }
  return 'normal'
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
    fontSize: sanitizeFontSize(data.fontSize),
    fontFamily: sanitizeFontFamily(data.fontFamily),
    lineHeight: sanitizeLineHeight(data.lineHeight),
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

      setFontSize: (fontSize) => set({ fontSize }),

      setFontFamily: (fontFamily) => set({ fontFamily }),

      setLineHeight: (lineHeight) => set({ lineHeight }),

      stepFontSize: (direction) =>
        set((state) => ({ fontSize: stepSize(state.fontSize, direction) })),

      resetFontSettings: () =>
        set({
          fontSize: 'md',
          fontFamily: 'vazirmatn',
          lineHeight: 'normal',
        }),

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
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        lineHeight: state.lineHeight,
      }),
      migrate: (persistedState) => sanitizePersistedState(persistedState),
    },
  ),
)
