import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from './Badge'
import { cn } from '../../utils/cn'

interface DeepDiveProps {
  title: string
  children: ReactNode
  badge?: string
  open?: boolean
  className?: string
}

/**
 * بلوک محتوای اختیاری و عمیق.
 *
 * از عنصر بومی `details` استفاده می‌کند تا بدون جاوااسکریپت هم کار کند.
 * عنوان به صورت `h3` رندر می‌شود تا در فهرست مطالب درس دیده شود؛ اما
 * زیربخش‌ها با `h4` (کامپوننت DeepDiveSection) می‌آیند و وارد فهرست نمی‌شوند.
 */
export function DeepDive({
  title,
  children,
  badge = 'عمیق',
  open = false,
  className,
}: DeepDiveProps) {
  return (
    <details
      open={open}
      className={cn(
        'group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40',
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-start transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/50 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="!mt-0 !text-base font-extrabold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <Badge variant="warning" size="sm" className="shrink-0">
            {badge}
          </Badge>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-6 border-t border-slate-200 px-4 pb-6 pt-5 dark:border-slate-800 sm:px-5">
        {children}
      </div>
    </details>
  )
}

interface DeepDiveSectionProps {
  title: string
  children: ReactNode
}

/**
 * زیربخش داخل DeepDive. از `h4` استفاده می‌کند تا فهرست مطالب درس شلوغ نشود.
 */
export function DeepDiveSection({ title, children }: DeepDiveSectionProps) {
  return (
    <section className="space-y-4">
      <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
        <span className="h-4 w-1 shrink-0 rounded-full bg-primary-500" aria-hidden="true" />
        {title}
      </h4>
      {children}
    </section>
  )
}
