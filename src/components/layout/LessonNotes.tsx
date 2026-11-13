import { forwardRef, useEffect, useState } from 'react'
import { Check, Copy, FileText, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/persianDigits'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

interface LessonNotesProps {
  lessonId: string
  className?: string
}

export const LessonNotes = forwardRef<HTMLTextAreaElement, LessonNotesProps>(
  function LessonNotes({ lessonId, className }, ref) {
    const savedNote = useAppStore((state) => state.notes[lessonId] ?? '')
    const setLessonNote = useAppStore((state) => state.setLessonNote)
    const deleteLessonNote = useAppStore((state) => state.deleteLessonNote)

    const [value, setValue] = useState(savedNote)
    const [isCopied, setIsCopied] = useState(false)
    const [isSaved, setIsSaved] = useState(true)

    // Sync state when lessonId changes
    useEffect(() => {
      setValue(savedNote)
      setIsSaved(true)
    }, [lessonId, savedNote])

    // Auto-save debounced
    useEffect(() => {
      if (value === savedNote) {
        setIsSaved(true)
        return
      }

      setIsSaved(false)
      const timer = setTimeout(() => {
        setLessonNote(lessonId, value)
        setIsSaved(true)
      }, 400)

      return () => clearTimeout(timer)
    }, [value, lessonId, savedNote, setLessonNote])

    function handleCopy() {
      if (!value.trim()) return
      navigator.clipboard.writeText(value).then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      })
    }

    function handleDelete() {
      if (window.confirm('آیا مطمئن هستید که می‌خواهید یادداشت این درس را حذف کنید؟')) {
        deleteLessonNote(lessonId)
        setValue('')
        setIsSaved(true)
      }
    }

    const hasContent = value.trim().length > 0

    return (
      <Card id="lesson-notes" className={cn('scroll-mt-24', className)}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-base font-bold">یادداشت من برای این درس</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                یادداشت‌ها در حافظه مرورگر شما نگه‌داری می‌شوند و همیشه در دسترسند.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasContent && (
              <>
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
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="relative">
            <textarea
              ref={ref}
              id="lesson-note-textarea"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="نکات مهم، پرسش‌ها یا خلاصه شخصی خود از این درس را اینجا بنویسید..."
              rows={4}
              aria-label="یادداشت شخصی برای این درس"
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
                <span>ذخیره خودکار همزمان با تایپ فعال است.</span>
              )}
            </span>

            {hasContent && (
              <span>{toPersianDigits(value.length)} کاراکتر</span>
            )}
          </div>
        </CardContent>
      </Card>
    )
  },
)
