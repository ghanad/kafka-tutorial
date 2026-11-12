import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/persianDigits'

interface ProgressBarProps {
  value: number
  className?: string
  label?: string
  showValue?: boolean
}

export function ProgressBar({
  value,
  className,
  label = 'پیشرفت دوره',
  showValue = false,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
      >
        <div
          className="h-full rounded-full bg-gradient-to-l from-primary-500 to-fuchsia-500 transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showValue && (
        <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">
          {toPersianDigits(clamped)}٪
        </span>
      )}
    </div>
  )
}
