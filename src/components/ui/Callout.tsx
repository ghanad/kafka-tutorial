import type { ReactNode } from 'react'
import { Info, Lightbulb, OctagonAlert, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

export type CalloutVariant = 'info' | 'tip' | 'warning' | 'danger'

interface CalloutStyle {
  icon: LucideIcon
  title: string
  container: string
  iconColor: string
}

const styles: Record<CalloutVariant, CalloutStyle> = {
  info: {
    icon: Info,
    title: 'نکته',
    container:
      'border-sky-200 bg-sky-50/80 text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-100',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  tip: {
    icon: Lightbulb,
    title: 'تجربه کاربردی',
    container:
      'border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    icon: TriangleAlert,
    title: 'هشدار',
    container:
      'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    icon: OctagonAlert,
    title: 'اشتباه رایج',
    container:
      'border-rose-200 bg-rose-50/80 text-rose-950 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-100',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
}

interface CalloutProps {
  variant?: CalloutVariant
  title?: string
  children: ReactNode
  className?: string
}

export function Callout({ variant = 'info', title, children, className }: CalloutProps) {
  const style = styles[variant]
  const Icon = style.icon

  return (
    <div
      role="note"
      className={cn('flex gap-3 rounded-2xl border p-4 sm:p-5', style.container, className)}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.iconColor)} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-bold">{title ?? style.title}</p>
        <div className="text-sm leading-7">{children}</div>
      </div>
    </div>
  )
}
