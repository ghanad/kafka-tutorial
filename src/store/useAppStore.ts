import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type FontFamily = 'vazirmatn' | 'vazirmatn-ui' | 'system' | 'serif'
export type LineHeight = 'compact' | 'normal' | 'relaxed'

export interface NoteAnchor {
  /** Exact text of the selection, kept in the same raw form as the DOM text index. */
  quote: string
  /** A short slice of text right before the quote, used to disambiguate matches. */
  prefix: string
  /** A short slice of text right after the quote, used to disambiguate matches. */
  suffix: string
  /** Character offset where the quote started, captured at selection time. */
  startOffset?: number
}

export interface InlineNote {
  id: string
  body: string
  anchor: NoteAnchor
  createdAt: number
  updatedAt: number
}

export const NOTE_QUOTE_MAX_LENGTH = 2000
export const NOTE_CONTEXT_MAX_LENGTH = 120

export interface AppStore {
  completedLessons: string[]
  bookmarks: string[]
  notes: Record<string, string>
  inlineNotes: Record<string, InlineNote[]>
  theme: Theme
  lastVisitedLesson: string | null
  fontSize: FontSize
  fontFamily: FontFamily
  lineHeight: LineHeight
  /** Section ids whose lesson list is collapsed in the sidebar. */
  collapsedSections: string[]
  /** Hides the course lesson list (right column) on wide screens. */
  sidebarCollapsed: boolean
  /** Hides the in-lesson table of contents (left column). */
  tocCollapsed: boolean

  toggleLessonComplete: (lessonId: string) => void
  markLessonComplete: (lessonId: string) => void
  toggleBookmark: (lessonId: string) => void
  setLessonNote: (lessonId: string, note: string) => void
  deleteLessonNote: (lessonId: string) => void
  addInlineNote: (lessonId: string, anchor: NoteAnchor, body: string) => string
  updateInlineNote: (lessonId: string, noteId: string, body: string) => void
  deleteInlineNote: (lessonId: string, noteId: string) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setFontSize: (fontSize: FontSize) => void
  setFontFamily: (fontFamily: FontFamily) => void
  setLineHeight: (lineHeight: LineHeight) => void
  stepFontSize: (direction: 'increase' | 'decrease') => void
  resetFontSettings: () => void
  toggleSectionCollapsed: (sectionId: string) => void
  setCollapsedSections: (sectionIds: string[]) => void
  toggleSidebarCollapsed: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleTocCollapsed: () => void
  setTocCollapsed: (collapsed: boolean) => void
  setLastVisitedLesson: (lessonId: string) => void
  importData: (data: unknown) => void
  resetAllData: () => void
}

export type PersistedAppState = Pick<
  AppStore,
  | 'completedLessons'
  | 'bookmarks'
  | 'notes'
  | 'inlineNotes'
  | 'theme'
  | 'lastVisitedLesson'
  | 'fontSize'
  | 'fontFamily'
  | 'lineHeight'
  | 'collapsedSections'
  | 'sidebarCollapsed'
  | 'tocCollapsed'
>

export const STORAGE_KEY = 'kafka-tutorial-store'
export const STORE_VERSION = 7

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
  inlineNotes: {},
  theme: 'light',
  lastVisitedLesson: null,
  fontSize: 'md',
  fontFamily: 'vazirmatn',
  lineHeight: 'normal',
  collapsedSections: [],
  sidebarCollapsed: false,
  tocCollapsed: false,
}

function createInlineNoteId(): string {
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
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

function sanitizeAnchor(value: unknown): NoteAnchor | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Partial<NoteAnchor>
  if (typeof data.quote !== 'string') return null

  const quote = data.quote
  if (quote.trim().length === 0 || quote.length > NOTE_QUOTE_MAX_LENGTH) return null

  const startOffset =
    typeof data.startOffset === 'number' &&
    Number.isFinite(data.startOffset) &&
    data.startOffset >= 0
      ? Math.floor(data.startOffset)
      : undefined

  return {
    quote,
    prefix: typeof data.prefix === 'string' ? data.prefix.slice(0, NOTE_CONTEXT_MAX_LENGTH) : '',
    suffix: typeof data.suffix === 'string' ? data.suffix.slice(0, NOTE_CONTEXT_MAX_LENGTH) : '',
    startOffset,
  }
}

function sanitizeInlineNotes(value: unknown): Record<string, InlineNote[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, InlineNote[]> = {}

  for (const [lessonId, list] of Object.entries(value)) {
    if (!Array.isArray(list)) continue

    const notes: InlineNote[] = []
    const usedIds = new Set<string>()

    for (const raw of list) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
      const data = raw as Partial<InlineNote>
      const anchor = sanitizeAnchor(data.anchor)
      const body = typeof data.body === 'string' ? data.body.trim() : ''
      if (!anchor || body.length === 0) continue

      let id = typeof data.id === 'string' && data.id.length > 0 ? data.id : createInlineNoteId()
      if (usedIds.has(id)) id = createInlineNoteId()
      usedIds.add(id)

      const createdAt =
        typeof data.createdAt === 'number' && Number.isFinite(data.createdAt)
          ? data.createdAt
          : Date.now()
      const updatedAt =
        typeof data.updatedAt === 'number' && Number.isFinite(data.updatedAt)
          ? data.updatedAt
          : createdAt

      notes.push({ id, body, anchor, createdAt, updatedAt })
    }

    if (notes.length > 0) {
      result[lessonId] = notes
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
    inlineNotes: sanitizeInlineNotes(data.inlineNotes),
    theme: data.theme === 'dark' ? 'dark' : 'light',
    lastVisitedLesson:
      typeof data.lastVisitedLesson === 'string' ? data.lastVisitedLesson : null,
    fontSize: sanitizeFontSize(data.fontSize),
    fontFamily: sanitizeFontFamily(data.fontFamily),
    lineHeight: sanitizeLineHeight(data.lineHeight),
    collapsedSections: uniqueStrings(data.collapsedSections),
    sidebarCollapsed: data.sidebarCollapsed === true,
    tocCollapsed: data.tocCollapsed === true,
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

      addInlineNote: (lessonId, anchor, body) => {
        const text = body.trim()
        if (text.length === 0) return ''
        if (anchor.quote.trim().length === 0) return ''

        const now = Date.now()
        const note: InlineNote = {
          id: createInlineNoteId(),
          body: text,
          anchor,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          inlineNotes: {
            ...state.inlineNotes,
            [lessonId]: [...(state.inlineNotes[lessonId] ?? []), note],
          },
        }))

        return note.id
      },

      updateInlineNote: (lessonId, noteId, body) => {
        const text = body.trim()
        if (text.length === 0) return

        set((state) => {
          const list = state.inlineNotes[lessonId]
          if (!list || !list.some((note) => note.id === noteId)) return state

          return {
            inlineNotes: {
              ...state.inlineNotes,
              [lessonId]: list.map((note) =>
                note.id === noteId ? { ...note, body: text, updatedAt: Date.now() } : note,
              ),
            },
          }
        })
      },

      deleteInlineNote: (lessonId, noteId) =>
        set((state) => {
          const list = state.inlineNotes[lessonId]
          if (!list) return state

          const nextList = list.filter((note) => note.id !== noteId)
          if (nextList.length === list.length) return state

          const nextInlineNotes = { ...state.inlineNotes }
          if (nextList.length > 0) {
            nextInlineNotes[lessonId] = nextList
          } else {
            delete nextInlineNotes[lessonId]
          }

          return { inlineNotes: nextInlineNotes }
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

      toggleSectionCollapsed: (sectionId) =>
        set((state) => ({
          collapsedSections: state.collapsedSections.includes(sectionId)
            ? state.collapsedSections.filter((id) => id !== sectionId)
            : [...state.collapsedSections, sectionId],
        })),

      setCollapsedSections: (sectionIds) =>
        set({ collapsedSections: uniqueStrings(sectionIds) }),

      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      toggleTocCollapsed: () => set((state) => ({ tocCollapsed: !state.tocCollapsed })),

      setTocCollapsed: (collapsed) => set({ tocCollapsed: collapsed }),

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
        inlineNotes: state.inlineNotes,
        theme: state.theme,
        lastVisitedLesson: state.lastVisitedLesson,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        lineHeight: state.lineHeight,
        collapsedSections: state.collapsedSections,
        sidebarCollapsed: state.sidebarCollapsed,
        tocCollapsed: state.tocCollapsed,
      }),
      migrate: (persistedState) => sanitizePersistedState(persistedState),
    },
  ),
)
