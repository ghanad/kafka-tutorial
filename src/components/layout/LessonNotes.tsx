import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, FileText, LocateFixed, PencilLine, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { InlineNote } from '../../store/useAppStore'
import { copyTextToClipboard } from '../../utils/clipboard'
import { cn } from '../../utils/cn'
import { previewQuote } from '../../utils/inlineNoteAnchor'
import { toPersianDigits } from '../../utils/persianDigits'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

interface LessonNotesProps {
  lessonId: string
  className?: string
  onOpenInlineNote?: (noteId: string) => void
}

const NO_INLINE_NOTES: InlineNote[] = []

export const LessonNotes = forwardRef<HTMLTextAreaElement, LessonNotesProps>(
  function LessonNotes({ lessonId, className, onOpenInlineNote }, ref) {
    const savedNote = useAppStore((state) => state.notes[lessonId] ?? '')
    const inlineNotes = useAppStore((state) => state.inlineNotes[lessonId] ?? NO_INLINE_NOTES)
    const setLessonNote = useAppStore((state) => state.setLessonNote)
    const deleteLessonNote = useAppStore((state) => state.deleteLessonNote)
    const deleteInlineNote = useAppStore((state) => state.deleteInlineNote)

    const [value, setValue] = useState(savedNote)
    const [isCopied, setIsCopied] = useState(false)
    const [isSaved, setIsSaved] = useState(true)
    const valueRef = useRef(value)
    const savedRef = useRef(savedNote)
    const copyTimerRef = useRef<number | undefined>(undefined)

    const sortedInlineNotes = useMemo(
      () => [...inlineNotes].sort((a, b) => b.createdAt - a.createdAt),
      [inlineNotes],
    )

    // Sync state when lessonId changes
    useEffect(() => {
      setValue(savedNote)
      valueRef.current = savedNote
      savedRef.current = savedNote
      setIsSaved(true)
    }, [lessonId, savedNote])

    const flushPendingNote = useCallback(() => {
      const text = valueRef.current
      if (text === savedRef.current) return
      savedRef.current = text
      setLessonNote(lessonId, text)
    }, [lessonId, setLessonNote])

    // Persist the last keystrokes even when the reader navigates away mid-debounce.
    useEffect(() => {
      return () => flushPendingNote()
    }, [flushPendingNote])

    useEffect(() => {
      return () => {
        if (copyTimerRef.current !== undefined) window.clearTimeout(copyTimerRef.current)
      }
    }, [])

    // Auto-save debounced
    useEffect(() => {
      if (value === savedNote) {
        setIsSaved(true)
        return
      }

      setIsSaved(false)
      const timer = setTimeout(() => {
        savedRef.current = value
        setLessonNote(lessonId, value)
        setIsSaved(true)
      }, 400)

      return () => clearTimeout(timer)
    }, [value, lessonId, savedNote, setLessonNote])

    async function handleCopy() {
      if (!value.trim()) return
      try {
        await copyTextToClipboard(value)
        setIsCopied(true)
        if (copyTimerRef.current !== undefined) window.clearTimeout(copyTimerRef.current)
        copyTimerRef.current = window.setTimeout(() => setIsCopied(false), 2000)
      } catch {
        setIsCopied(false)
      }
    }

    function handleDelete() {
      if (window.confirm('آیا مطمئن هستید که می‌خواهید یادداشت این درس را حذف کنید؟')) {
        deleteLessonNote(lessonId)
        valueRef.current = ''
        savedRef.current = ''
        setValue('')
        setIsSaved(true)
      }
    }

    function handleDeleteInline(noteId: string) {
      if (window.confirm('این یادداشت حذف شود؟')) {
        deleteInlineNote(lessonId, noteId)
      }
    }

    const hasContent = value.trim().length > 0
    const hasInlineNotes = sortedInlineNotes.length > 0

    return (
      <Card id="lesson-notes" className={cn('scroll-mt-24', className)}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-base font-bold">یادداشت‌های من برای این درس</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                هر جمله یا پاراگراف را انتخاب کنید تا همان‌جا یادداشت بگذارید؛ همه‌چیز در حافظه
                مرورگر شما می‌ماند.
              </p>
            </div>
          </div>

          {hasInlineNotes && (
            <Badge variant="warning" size="sm">
              {toPersianDigits(sortedInlineNotes.length)} یادداشت روی متن
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-5">
          <section aria-labelledby="inline-notes-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <PencilLine
                  className="h-4 w-4 text-amber-500 dark:text-amber-400"
                  aria-hidden="true"
                />
                <h4
                  id="inline-notes-title"
                  className="text-sm font-bold text-slate-900 dark:text-white"
                >
                  یادداشت‌های روی متن
                </h4>
              </div>
              {hasInlineNotes && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  روی نشانگر زرد کنار متن کلیک کنید تا همان‌جا باز شود.
                </span>
              )}
            </div>

            {hasInlineNotes ? (
              <ul className="mt-3 space-y-2.5">
                {sortedInlineNotes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenInlineNote?.(note.id)}
                      className="block w-full text-start"
                      title="نمایش این یادداشت در متن درس"
                      aria-label={`نمایش یادداشت متن «${previewQuote(note.anchor.quote, 80)}» در متن درس`}
                    >
                      <span
                        dir="auto"
                        className="line-clamp-2 text-xs leading-6 text-amber-900/85 dark:text-amber-200/85"
                      >
                        «{previewQuote(note.anchor.quote, 160)}»
                      </span>
                    </button>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">
                      {note.body}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenInlineNote?.(note.id)}
                        className="inline-flex min-h-6 items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100/60 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-900/30 dark:hover:text-amber-100"
                      >
                        <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
                        نمایش در متن
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteInline(note.id)}
                        className="inline-flex min-h-6 items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        aria-label="حذف این یادداشت"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        حذف
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 p-3 text-xs leading-6 text-amber-900/80 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200/80">
                هنوز یادداشتی روی متن نگذاشته‌اید. یک جمله، خط یا پاراگراف از درس را انتخاب
                کنید و روی دکمه «یادداشت» بزنید تا دقیقاً همان‌جا شروع به نوشتن کنید.
              </p>
            )}
          </section>

          <section
            aria-labelledby="lesson-note-title"
            className="border-t border-slate-200/80 pt-4 dark:border-slate-800"
          >
            <div className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <h4
                  id="lesson-note-title"
                  className="text-sm font-bold text-slate-900 dark:text-white"
                >
                  یادداشت کلی این درس
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  خلاصه، پرسش‌ها یا نکات کلی خود از این درس را اینجا بنویسید.
                </p>
              </div>

              {hasContent && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    startIcon={
                      isCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )
                    }
                  >
                    {isCopied ? 'کپی شد' : 'کپی'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    startIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                  >
                    حذف
                  </Button>
                </div>
              )}
            </div>

            <div className="relative mt-3">
              <textarea
                ref={ref}
                id="lesson-note-textarea"
                value={value}
                onChange={(e) => {
                  valueRef.current = e.target.value
                  setValue(e.target.value)
                }}
                placeholder="نکات مهم، پرسش‌ها یا خلاصه شخصی خود از این درس را اینجا بنویسید..."
                rows={4}
                aria-label="یادداشت کلی برای این درس"
                className={cn(
                  'w-full resize-y rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-start text-sm leading-relaxed text-slate-800 transition-colors',
                  'placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                  'dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-primary-500 dark:focus:bg-slate-900',
                )}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5">
                {hasContent && isSaved ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                    <span className="text-emerald-600 dark:text-emerald-400">ذخیره شد</span>
                  </>
                ) : hasContent && !isSaved ? (
                  <span>در حال ذخیره...</span>
                ) : (
                  <span>ذخیره خودکار هم‌زمان با تایپ فعال است.</span>
                )}
              </span>

              {hasContent && <span>{toPersianDigits(value.length)} کاراکتر</span>}
            </div>
          </section>
        </CardContent>
      </Card>
    )
  },
)
