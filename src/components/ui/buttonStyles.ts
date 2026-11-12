import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white shadow-soft hover:bg-primary-700 dark:bg-primary-500 dark:text-slate-950 dark:hover:bg-primary-400',
  secondary:
    'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-950/60 dark:text-primary-200 dark:hover:bg-primary-900',
  outline:
    'border border-slate-300 bg-white/70 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:text-white',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3 text-xs',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-12 gap-2.5 px-6 text-base',
  icon: 'h-10 w-10 p-0',
}

interface ButtonClassOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonClassOptions = {}): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-primary-400 dark:focus-visible:ring-offset-slate-950 [&_svg]:shrink-0',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )
}
