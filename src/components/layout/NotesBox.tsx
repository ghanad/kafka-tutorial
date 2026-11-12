import { useEffect, useRef, useState } from 'react'
import { Check, Eraser, NotebookPen, Save } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { toPersianDigits } from '../../utils/persianDigits'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'

interface NotesBoxProps {
  lessonId: string
}

export function NotesBox({ lessonId }: NotesBoxProps) {
  const setNote = useAppStore((state) => state.setNote)
  const [value, setValue] = useState(() => useAppStore.getState().notes[lessonId] ?? '')
  const [saved, setSaved] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current)
    }
  }, [])

  function showSaved() {
    setSaved(true)
    if (timer.current !== undefined) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setSaved(false), 2200)
  }

  function handleSave() {
    setNote(lessonId, value)
    showSaved()
  }

  function handleClear() {
    setValue('')
    setNote(lessonId, '')
    showSaved()
  }

  return (
    <section aria-labelledby="notes-title" className="mt-10">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
              <NotebookPen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="notes-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                یادداشت شخصی
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                فقط در همین مرورگر ذخیره می‌شود و همراه درس نمایش داده می‌شود.
              </p>
            </div>
          </div>

          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" aria-hidden="true" />
              ذخیره شد
            </span>
          )}
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <label htmlFor={`lesson-note-${lessonId}`} className="sr-only">
            یادداشت این درس
          </label>
          <textarea
            id={`lesson-note-${lessonId}`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => {
              if (value !== (useAppStore.getState().notes[lessonId] ?? '')) handleSave()
            }}
            rows={5}
            placeholder="نکته‌ها، سؤال‌ها یا خلاصه خودتان از این درس را اینجا بنویسید…"
            className="w-full resize-y rounded-xl border border-slate-200 bg-white/80 p-3 text-sm leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:border-primary-500"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {toPersianDigits(value.length)} کاراکتر
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {value !== '' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  startIcon={<Eraser className="h-4 w-4" aria-hidden="true" />}
                >
                  پاک کردن
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                startIcon={<Save className="h-4 w-4" aria-hidden="true" />}
              >
                ذخیره یادداشت
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
