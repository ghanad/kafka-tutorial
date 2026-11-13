import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { CSSProperties, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { PencilLine } from 'lucide-react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useAppStore } from '../../store/useAppStore'
import type { InlineNote, NoteAnchor } from '../../store/useAppStore'
import { cn } from '../../utils/cn'
import {
  createNoteAnchor,
  findAnchorRange,
  getRangeAnchorRect,
  isSameAnchor,
  measureNoteHighlights,
  previewQuote,
} from '../../utils/inlineNoteAnchor'
import type { NoteHighlight } from '../../utils/inlineNoteAnchor'
import { InlineNoteComposer } from './InlineNoteComposer'
import type { InlineNoteSaveStatus } from './InlineNoteComposer'

export interface InlineNotesLayerHandle {
  openNote: (noteId: string) => void
}

interface InlineNotesLayerProps {
  lessonId: string
  contentRef: RefObject<HTMLDivElement>
}

interface DraftSelection {
  anchor: NoteAnchor
  rect: DOMRect
  existingId: string | null
}

interface EditorState {
  noteId: string | null
  anchor: NoteAnchor
  rect: DOMRect | null
}

const NO_INLINE_NOTES: InlineNote[] = []
const TOOLBAR_WIDTH = 168
const TOOLBAR_HEIGHT = 44
const TOOLBAR_MARGIN = 8

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function getToolbarStyle(rect: DOMRect): CSSProperties {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const above = rect.top - TOOLBAR_HEIGHT - TOOLBAR_MARGIN
  const below = rect.bottom + TOOLBAR_MARGIN
  const top =
    above >= TOOLBAR_MARGIN
      ? above
      : Math.min(below, viewportHeight - TOOLBAR_HEIGHT - TOOLBAR_MARGIN)

  return {
    top,
    left: clamp(
      rect.left + rect.width / 2 - TOOLBAR_WIDTH / 2,
      TOOLBAR_MARGIN,
      viewportWidth - TOOLBAR_WIDTH - TOOLBAR_MARGIN,
    ),
  }
}

function getComposerStyle(
  rect: DOMRect | null,
  isDesktop: boolean,
  keyboardInset: number,
): CSSProperties {
  if (!isDesktop) {
    const visibleHeight = Math.max(220, window.innerHeight - keyboardInset)
    return {
      left: 12,
      right: 12,
      bottom: 12 + keyboardInset,
      maxHeight: Math.max(
        220,
        Math.min(visibleHeight - 24, Math.round(window.innerHeight * 0.62)),
      ),
    }
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  if (!rect || rect.bottom < 32 || rect.top > viewportHeight - 32) {
    return {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(22rem, calc(100vw - 2rem))',
      maxHeight: '70vh',
    }
  }

  const width = Math.min(360, viewportWidth - 24)
  const left = clamp(
    rect.left + rect.width / 2 - width / 2,
    12,
    viewportWidth - width - 12,
  )
  const spaceAbove = Math.max(0, rect.top - 16)
  const spaceBelow = Math.max(0, viewportHeight - rect.bottom - 16)

  if (spaceAbove < 220 && spaceBelow < 220) {
    return {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width,
      maxHeight: '70vh',
    }
  }

  if (spaceAbove >= 280 || spaceAbove >= spaceBelow) {
    return {
      left,
      width,
      bottom: Math.max(12, viewportHeight - rect.top + 10),
      maxHeight: Math.max(180, Math.min(spaceAbove - 10, 420)),
    }
  }

  return {
    left,
    width,
    top: Math.min(rect.bottom + 10, viewportHeight - 120),
    maxHeight: Math.max(180, Math.min(spaceBelow - 10, 420)),
  }
}

function areHighlightsEqual(a: NoteHighlight[], b: NoteHighlight[]): boolean {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i += 1) {
    const left = a[i]
    const right = b[i]
    if (left.id !== right.id || left.rects.length !== right.rects.length) return false

    for (let j = 0; j < left.rects.length; j += 1) {
      const rectA = left.rects[j]
      const rectB = right.rects[j]
      if (
        Math.abs(rectA.top - rectB.top) > 0.5 ||
        Math.abs(rectA.left - rectB.left) > 0.5 ||
        Math.abs(rectA.width - rectB.width) > 0.5 ||
        Math.abs(rectA.height - rectB.height) > 0.5
      ) {
        return false
      }
    }

    if ((left.marker === null) !== (right.marker === null)) return false
    if (left.marker && right.marker) {
      if (
        Math.abs(left.marker.top - right.marker.top) > 0.5 ||
        Math.abs(left.marker.left - right.marker.left) > 0.5
      ) {
        return false
      }
    }
  }

  return true
}

export const InlineNotesLayer = forwardRef<InlineNotesLayerHandle, InlineNotesLayerProps>(
  function InlineNotesLayer({ lessonId, contentRef }, ref) {
    const notes = useAppStore((state) => state.inlineNotes[lessonId] ?? NO_INLINE_NOTES)
    const addInlineNote = useAppStore((state) => state.addInlineNote)
    const updateInlineNote = useAppStore((state) => state.updateInlineNote)
    const deleteInlineNote = useAppStore((state) => state.deleteInlineNote)
    const isDesktop = useMediaQuery('(min-width: 768px)')

    const [draft, setDraft] = useState<DraftSelection | null>(null)
    const [editor, setEditor] = useState<EditorState | null>(null)
    const [body, setBody] = useState('')
    const [saveStatus, setSaveStatus] = useState<InlineNoteSaveStatus>('idle')
    const [highlights, setHighlights] = useState<NoteHighlight[]>([])
    const [flashNoteId, setFlashNoteId] = useState<string | null>(null)
    const [keyboardInset, setKeyboardInset] = useState(0)
    const [, setViewportTick] = useState(0)

    const toolbarRef = useRef<HTMLDivElement>(null)
    const composerRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<EditorState | null>(null)
    const bodyRef = useRef('')
    const savedBodyRef = useRef('')
    const notesRef = useRef(notes)
    const flashTimerRef = useRef(0)
    const returnFocusRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
      notesRef.current = notes
    }, [notes])

    const getCurrentNotes = useCallback(
      () => useAppStore.getState().inlineNotes[lessonId] ?? NO_INLINE_NOTES,
      [lessonId],
    )

    const notesById = useMemo(
      () => new Map(notes.map((note) => [note.id, note])),
      [notes],
    )

    // Resolve anchors to highlight rectangles whenever notes or layout change.
    useEffect(() => {
      const container = contentRef.current
      if (!container || notes.length === 0) {
        setHighlights([])
        return
      }

      let timer = 0
      let disposed = false

      const measure = () => {
        if (disposed) return
        const node = contentRef.current
        if (!node) return

        const origin = node.parentElement ?? node
        const next = measureNoteHighlights(node, origin, notesRef.current)
        setHighlights((previous) =>
          areHighlightsEqual(previous, next) ? previous : next,
        )
      }

      const schedule = (delay = 90) => {
        window.clearTimeout(timer)
        timer = window.setTimeout(measure, delay)
      }

      const frame = window.requestAnimationFrame(measure)

      const resizeObserver = new ResizeObserver(() => schedule(60))
      resizeObserver.observe(container)

      const mutationObserver = new MutationObserver(() => schedule(140))
      mutationObserver.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
      })

      const handleResize = () => schedule(60)
      window.addEventListener('resize', handleResize)

      // Typography settings live on <html>; re-measure after they change.
      const settingsObserver = new MutationObserver(() => schedule(60))
      settingsObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-font-size', 'data-font-family', 'data-line-height', 'class'],
      })

      if (document.fonts) {
        document.fonts.ready.then(measure).catch(() => undefined)
      }

      return () => {
        disposed = true
        window.cancelAnimationFrame(frame)
        window.clearTimeout(timer)
        resizeObserver.disconnect()
        mutationObserver.disconnect()
        settingsObserver.disconnect()
        window.removeEventListener('resize', handleResize)
      }
    }, [contentRef, lessonId, notes])

    // Turn a finished text selection into a floating "add note" affordance.
    useEffect(() => {
      let timer = 0
      let pointerDown = false

      const updateDraft = () => {
        if (editorRef.current) return

        const root = contentRef.current
        const selection = window.getSelection()
        if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
          return
        }

        const range = selection.getRangeAt(0)
        const anchor = createNoteAnchor(root, range)
        if (!anchor) return

        const rect = getRangeAnchorRect(range)
        if (!rect) return

        const existing = notesRef.current.find((note) => isSameAnchor(note.anchor, anchor))

        setDraft({
          anchor,
          rect,
          existingId: existing?.id ?? null,
        })
      }

      const scheduleUpdate = () => {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => {
          if (pointerDown) return
          updateDraft()
        }, 160)
      }

      const handlePointerDown = () => {
        pointerDown = true
      }

      const handlePointerUp = () => {
        pointerDown = false
        scheduleUpdate()
      }

      const handlePointerCancel = () => {
        pointerDown = false
      }

      document.addEventListener('selectionchange', scheduleUpdate)
      document.addEventListener('pointerdown', handlePointerDown, true)
      document.addEventListener('pointerup', handlePointerUp, true)
      document.addEventListener('pointercancel', handlePointerCancel, true)

      return () => {
        document.removeEventListener('selectionchange', scheduleUpdate)
        document.removeEventListener('pointerdown', handlePointerDown, true)
        document.removeEventListener('pointerup', handlePointerUp, true)
        document.removeEventListener('pointercancel', handlePointerCancel, true)
        window.clearTimeout(timer)
      }
    }, [contentRef, lessonId])

    const persistDraftBody = useCallback(
      (keepEditing: boolean) => {
        const current = editorRef.current
        const text = bodyRef.current.trim()
        if (!current || text.length === 0 || text === savedBodyRef.current) return

        if (current.noteId) {
          updateInlineNote(lessonId, current.noteId, text)
        } else {
          const newNoteId = addInlineNote(lessonId, current.anchor, text)
          if (newNoteId && keepEditing) {
            const next = { ...current, noteId: newNoteId }
            editorRef.current = next
            setEditor(next)
          }
        }

        savedBodyRef.current = text
      },
      [addInlineNote, lessonId, updateInlineNote],
    )

    const closeEditor = useCallback(
      (restoreFocus = false) => {
        persistDraftBody(false)
        editorRef.current = null
        setEditor(null)
        bodyRef.current = ''
        setBody('')
        savedBodyRef.current = ''
        setSaveStatus('idle')

        const target = returnFocusRef.current
        returnFocusRef.current = null
        if (restoreFocus && target?.isConnected) {
          window.requestAnimationFrame(() => target.focus({ preventScroll: true }))
        }
      },
      [persistDraftBody],
    )

    // Flush pending text when the layer disappears or the lesson changes.
    useEffect(() => {
      return () => persistDraftBody(false)
    }, [persistDraftBody])

    useEffect(() => {
      setDraft(null)
      editorRef.current = null
      setEditor(null)
      bodyRef.current = ''
      setBody('')
      savedBodyRef.current = ''
      setSaveStatus('idle')
      setHighlights([])
    }, [lessonId])

    // Debounced autosave, so closing the popover never loses a note.
    useEffect(() => {
      if (!editor) return

      const text = body.trim()
      if (text.length === 0) {
        setSaveStatus(editor.noteId ? 'empty' : 'idle')
        return
      }
      if (text === savedBodyRef.current) {
        setSaveStatus('saved')
        return
      }

      setSaveStatus('saving')
      const timer = window.setTimeout(() => {
        persistDraftBody(true)
        setSaveStatus('saved')
      }, 450)

      return () => window.clearTimeout(timer)
    }, [body, editor, persistDraftBody])

    // Dismiss the floating toolbar when the page scrolls away from the selection.
    useEffect(() => {
      if (!draft) return

      const handleScroll = () => setDraft(null)
      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => window.removeEventListener('scroll', handleScroll)
    }, [draft])

    useEffect(() => {
      function handlePointerDown(event: PointerEvent) {
        const target = event.target as Node | null
        if (!target) return
        if (toolbarRef.current?.contains(target)) return
        if (composerRef.current?.contains(target)) return

        setDraft(null)
        if (editorRef.current) closeEditor()
      }

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key !== 'Escape' || event.defaultPrevented) return
        if (editorRef.current) closeEditor(true)
        else setDraft(null)
      }

      document.addEventListener('pointerdown', handlePointerDown)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }, [closeEditor])

    useEffect(() => {
      return () => window.clearTimeout(flashTimerRef.current)
    }, [])

    // Recompute the anchored composer position on window resize/rotation.
    useEffect(() => {
      if (!editor) return
      const handleResize = () => setViewportTick((tick) => tick + 1)
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [editor])

    // Keep the mobile composer above the on-screen keyboard (iOS keeps the
    // layout viewport at full height, so window.innerHeight alone is not enough).
    useEffect(() => {
      const viewport = window.visualViewport
      if (!viewport) return

      let frame = 0
      const update = () => {
        frame = 0
        const inset = Math.max(0, window.innerHeight - (viewport.height + viewport.offsetTop))
        setKeyboardInset((current) =>
          Math.abs(current - inset) < 1 ? current : Math.round(inset),
        )
      }
      const schedule = () => {
        if (!frame) frame = window.requestAnimationFrame(update)
      }

      schedule()
      viewport.addEventListener('resize', schedule)
      viewport.addEventListener('scroll', schedule)
      return () => {
        viewport.removeEventListener('resize', schedule)
        viewport.removeEventListener('scroll', schedule)
        if (frame) window.cancelAnimationFrame(frame)
      }
    }, [])

    const openEditor = useCallback(
      (next: EditorState, initialBody: string) => {
        const active = document.activeElement
        returnFocusRef.current =
          active instanceof HTMLElement && active !== document.body ? active : null

        // Defensive flush in case another note is switched without closing.
        persistDraftBody(false)

        editorRef.current = next
        setEditor(next)
        bodyRef.current = initialBody
        setBody(initialBody)
        savedBodyRef.current = initialBody.trim()
        setSaveStatus('idle')
        setDraft(null)
        window.getSelection()?.removeAllRanges()
      },
      [persistDraftBody],
    )

    const openNote = useCallback(
      (noteId: string) => {
        const note = getCurrentNotes().find((item) => item.id === noteId)
        const root = contentRef.current
        if (!note || !root) return

        const range = findAnchorRange(root, note.anchor)
        let rect: DOMRect | null = null

        if (range) {
          const anchorRect = getRangeAnchorRect(range)
          if (anchorRect) {
            const rootElement = document.documentElement
            const previousScrollBehavior = rootElement.style.scrollBehavior
            rootElement.style.scrollBehavior = 'auto'
            window.scrollBy(
              0,
              anchorRect.top + anchorRect.height / 2 - window.innerHeight / 2,
            )
            rootElement.style.scrollBehavior = previousScrollBehavior
            rect = getRangeAnchorRect(range)
          }
        }

        openEditor({ noteId: note.id, anchor: note.anchor, rect }, note.body)

        window.clearTimeout(flashTimerRef.current)
        setFlashNoteId(note.id)
        flashTimerRef.current = window.setTimeout(() => setFlashNoteId(null), 1800)
      },
      [contentRef, getCurrentNotes, openEditor],
    )

    useImperativeHandle(ref, () => ({ openNote }), [openNote])

    function startEditing() {
      if (!draft) return

      const existing = draft.existingId
        ? getCurrentNotes().find((note) => note.id === draft.existingId)
        : undefined

      openEditor(
        { noteId: existing?.id ?? null, anchor: draft.anchor, rect: draft.rect },
        existing?.body ?? '',
      )
    }

    function handleBodyChange(value: string) {
      bodyRef.current = value
      setBody(value)
    }

    function handleSave() {
      closeEditor(true)
    }

    function handleDelete() {
      const current = editorRef.current
      if (!current?.noteId) return
      if (!window.confirm('این یادداشت حذف شود؟')) return

      deleteInlineNote(lessonId, current.noteId)
      savedBodyRef.current = bodyRef.current.trim()
      closeEditor(true)
    }

    const editingId = editor?.noteId ?? null

    return (
      <>
        <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
          {highlights.map((highlight) => {
            const isActive = highlight.id === flashNoteId || highlight.id === editingId
            return (
              <span key={highlight.id}>
                {highlight.rects.map((rect, index) => (
                  <span
                    key={`${highlight.id}-${index}`}
                    className={cn(
                      'absolute rounded-[3px] transition-colors',
                      isActive
                        ? 'bg-amber-300/60 dark:bg-amber-400/30'
                        : 'bg-amber-300/40 dark:bg-amber-400/20',
                    )}
                    style={{
                      top: rect.top,
                      left: rect.left,
                      width: rect.width,
                      height: rect.height,
                    }}
                  />
                ))}
              </span>
            )
          })}
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          {highlights.map((highlight) => {
            if (!highlight.marker) return null
            const note = notesById.get(highlight.id)
            if (!note) return null

            return (
              <button
                key={highlight.id}
                type="button"
                onClick={() => openNote(highlight.id)}
                style={{ top: highlight.marker.top, left: highlight.marker.left }}
                className="group pointer-events-auto absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                aria-label={`ویرایش یادداشت: ${previewQuote(note.body, 60)}`}
                title={`یادداشت: ${previewQuote(note.body, 80)}`}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-amber-700 shadow-sm transition-colors group-hover:bg-amber-200 group-hover:text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:group-hover:bg-amber-900">
                  <PencilLine className="h-2.5 w-2.5" aria-hidden="true" />
                </span>
              </button>
            )
          })}
        </div>

        {draft &&
          createPortal(
            <div
              ref={toolbarRef}
              role="toolbar"
              aria-label="یادداشت روی متن انتخاب‌شده"
              style={getToolbarStyle(draft.rect)}
              className="fixed z-[70] rounded-2xl border border-slate-200/90 bg-white/95 p-1 shadow-soft backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
            >
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-amber-100 px-3 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
              >
                <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                {draft.existingId ? 'ویرایش یادداشت' : 'یادداشت'}
              </button>
            </div>,
            document.body,
          )}

        {editor &&
          createPortal(
            <div
              ref={composerRef}
              role="dialog"
              aria-modal="false"
              aria-label={editor.noteId ? 'ویرایش یادداشت روی متن' : 'یادداشت جدید روی متن'}
              style={getComposerStyle(editor.rect, isDesktop, keyboardInset)}
              className="fixed z-[70] overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
              <InlineNoteComposer
                quote={editor.anchor.quote}
                value={body}
                status={saveStatus}
                isExisting={editor.noteId !== null}
                onChange={handleBodyChange}
                onSave={handleSave}
                onClose={() => closeEditor(true)}
                onDelete={handleDelete}
              />
            </div>,
            document.body,
          )}
      </>
    )
  },
)
