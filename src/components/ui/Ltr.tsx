import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface LtrProps {
  children: ReactNode
  className?: string
}

export function Ltr({ children, className }: LtrProps) {
  return (
    <span dir="ltr" className={cn('inline-block align-baseline', className)}>
      {children}
    </span>
  )
}
