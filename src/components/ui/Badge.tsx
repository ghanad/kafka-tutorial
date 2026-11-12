import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export type BadgeVariant = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'outline'
export type BadgeSize = 'sm' | 'md'

const variantClasses: Record<BadgeVariant, string> = {
  primary:
    'bg-primary-100 text-primary-700 dark:bg-primary-950/70 dark:text-primary-200',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  success:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
  outline:
    'border border-slate-300 bg-transparent text-slate-600 dark:border-slate-700 dark:text-slate-300',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
}

export function Badge({ variant = 'primary', size = 'md', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium leading-5',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
