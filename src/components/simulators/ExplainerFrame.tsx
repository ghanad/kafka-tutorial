import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { toPersianDigits } from '../../utils/persianDigits'
import { cn } from '../../utils/cn'

interface StageTab {
  label: string
  active: boolean
}

interface ExplainerFrameProps {
  title: string
  eyebrow?: string
  step: number
  total: number
  caption: string
  onPrev: () => void
  onNext: () => void
  onReset: () => void
  children: ReactNode
  context?: ReactNode
  stages?: StageTab[]
  footnote?: string
  figureLabel: string
  viewBox?: string
  minWidth?: number
}

/**
 * قاب مشترک توضیح‌های تعاملی گام‌به‌گام.
 *
 * ساختار کارت، سربرگ، کنترل‌ها، نوار پیشرفت، پنل توضیح و قاب نمودار را
 * یک‌جا می‌سازد تا هر explainer فقط روی داده‌های گام و شکل SVG تمرکز کند.
 */
export function ExplainerFrame({
  title,
  eyebrow = 'توضیح تعاملی گام‌به‌گام',
  step,
  total,
  caption,
  onPrev,
  onNext,
  onReset,
  children,
  context,
  stages,
  footnote,
  figureLabel,
  viewBox = '0 0 680 380',
  minWidth = 560,
}: ExplainerFrameProps) {
  const isFirst = step === 0
  const isLast = step === total - 1

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            {eyebrow}
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            {title}
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(total)}
        </Badge>
      </div>

      {context ? (
        <div
          dir="ltr"
          className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300"
        >
          {context}
        </div>
      ) : null}

      {stages && stages.length > 0 ? (
        <div className="mt-4 flex gap-2">
          {stages.map((stage) => (
            <div
              key={stage.label}
              className={cn(
                'flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors motion-reduce:transition-none',
                stage.active
                  ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
                  : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400',
              )}
            >
              {stage.label}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onPrev}
          disabled={isFirst}
          startIcon={<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          گام قبل
        </Button>
        <Button
          size="sm"
          onClick={onNext}
          disabled={isLast}
          startIcon={<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          گام بعد
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onReset}
          startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          از اول
        </Button>
        <span className="ms-auto whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(total)}
        </span>
      </div>

      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
        aria-label="پیشرفت گام‌های توضیح"
      >
        <div
          className="h-full rounded-full bg-primary-500 transition-[width] duration-500 motion-reduce:transition-none dark:bg-primary-400"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>

      <div className="mt-3 min-h-[6.5rem] rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
        <p className="mb-1 text-[10px] font-black text-primary-700 dark:text-primary-300">
          توضیح این گام
        </p>
        <p aria-live="polite" className="m-0 text-sm leading-7">
          {caption}
        </p>
      </div>

      <div
        dir="ltr"
        className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-800 dark:bg-slate-950/40"
      >
        <svg
          viewBox={viewBox}
          role="img"
          aria-label={figureLabel}
          className="h-auto w-full"
          style={{ minWidth }}
        >
          {children}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه اجزا، نمودار را افقی بکشید.
      </p>

      {footnote ? (
        <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
          {footnote}
        </p>
      ) : null}
    </div>
  )
}

export type Mark = 'idle' | 'active' | 'ok' | 'warn' | 'bad' | 'muted'

export function boxClass(mark: Mark = 'idle'): string {
  switch (mark) {
    case 'active':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    case 'ok':
      return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
    case 'warn':
      return 'fill-amber-50 stroke-amber-500 dark:fill-amber-950/60 dark:stroke-amber-500'
    case 'bad':
      return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/60 dark:stroke-rose-500'
    case 'muted':
      return 'fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-700'
    default:
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

export function edgeClass(active: boolean): string {
  return active
    ? 'stroke-primary-500 dark:stroke-primary-400'
    : 'stroke-slate-300 dark:stroke-slate-700'
}
