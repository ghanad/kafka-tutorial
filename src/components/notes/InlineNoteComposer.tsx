import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { Check, Loader2, PencilLine, Trash2, X } from 'lucide-react'
import { previewQuote } from '../../utils/inlineNoteAnchor'
import { Button } from '../ui/Button'

export type InlineNoteSaveStatus = 'idle' | 'saving' | 'saved' | 'empty'

interface InlineNoteComposerProps {
  quote: string
  value: string
  status: InlineNoteSaveStatus
  isExisting: boolean
  onChange: (value: string) => void
  onSave: () => void
  onClose: () => void
  onDelete: () => void
}

function statusLabel(status: InlineNoteSaveStatus, isExisting: boolean): string {
  if (status === 'saving') return 'در حال ذخیره...'
  if (status === 'saved') return 'ذخیره شد'
  if (status === 'empty') {
    return isExisting
      ? 'متن خالی است؛ نسخه قبلی حفظ می‌شود.'
      : 'برای ذخیره، متنی بنویسید.'
  }
  return 'ذخیره خودکار هم‌زمان با تایپ'
}

export function InlineNoteComposer({
  quote,
  value,
  status,
  isExisting,
  onChange,
  onSave,
  onClose,
  onDelete,
}: InlineNoteComposerProps) {
  const titleId = useId()
  const quoteId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isEmpty = value.trim().length === 0

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      if (!isEmpty) onSave()
    }
  }

  return (
    <div className="flex max-h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
            <PencilLine className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p
              id={titleId}
              className="text-sm font-bold text-slate-900 dark:text-white"
            >
              {isExisting ? 'ویرایش یادداشت' : 'یادداشت روی متن'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              این یادداشت به همین بخش از درس گره می‌خورد.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="بستن یادداشت"
          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p
        id={quoteId}
        dir="auto"
        className="mt-3 max-h-20 overflow-y-auto rounded-lg border-s-2 border-amber-400 bg-amber-50/70 px-3 py-2 text-xs leading-6 text-amber-900 dark:border-amber-500 dark:bg-amber-950/30 dark:text-amber-100"
      >
        «{previewQuote(quote, 180)}»
      </p>

      <label htmlFor={`${titleId}-textarea`} className="sr-only">
        متن یادداشت
      </label>
      <textarea
        ref={textareaRef}
        id={`${titleId}-textarea`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={4}
        aria-labelledby={titleId}
        aria-describedby={quoteId}
        placeholder="چرا این بخش برای شما مهم است؟ نکته، پرسش یا برداشت خودتان را اینجا بنویسید..."
        className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-start text-sm leading-relaxed text-slate-800 transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/25 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-500 dark:focus:bg-slate-950"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span
          className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500"
          aria-live="polite"
        >
          {status === 'saved' && (
            <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
          )}
          {status === 'saving' && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          )}
          <span
            className={
              status === 'saved'
                ? 'text-emerald-600 dark:text-emerald-400'
                : undefined
            }
          >
            {statusLabel(status, isExisting)}
          </span>
        </span>

        <div className="flex items-center gap-1.5">
          {isExisting && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
              startIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              حذف
            </Button>
          )}

          <Button
            size="sm"
            onClick={onSave}
            disabled={isEmpty}
            title="ذخیره و بستن (Ctrl/Cmd + Enter)"
            startIcon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            ذخیره
          </Button>
        </div>
      </div>
    </div>
  )
}
