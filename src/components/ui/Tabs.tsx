import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface TabItem {
  id: string
  label: string
  content: ReactNode
}

interface TabsProps {
  items: TabItem[]
  defaultTabId?: string
  ariaLabel?: string
  className?: string
}

export function Tabs({ items, defaultTabId, ariaLabel = 'زبانه‌ها', className }: TabsProps) {
  const baseId = useId()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const fallbackId = items.find((item) => item.id === defaultTabId)?.id ?? items[0]?.id ?? ''
  const [activeId, setActiveId] = useState(fallbackId)

  if (items.length === 0) return null

  const activeItem = items.find((item) => item.id === activeId) ?? items[0]

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index

    if (event.key === 'ArrowLeft') {
      nextIndex = (index + 1) % items.length
    } else if (event.key === 'ArrowRight') {
      nextIndex = (index - 1 + items.length) % items.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = items.length - 1
    } else {
      return
    }

    event.preventDefault()
    setActiveId(items[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-soft dark:border-slate-800 dark:bg-slate-900/70',
        className,
      )}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50/70 p-1.5 dark:border-slate-800 dark:bg-slate-950/40"
      >
        {items.map((item, index) => {
          const isActive = item.id === activeItem.id
          return (
            <button
              key={item.id}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-800 dark:text-primary-200'
                  : 'text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeItem.id}`}
        aria-labelledby={`${baseId}-tab-${activeItem.id}`}
        tabIndex={0}
        className="p-4 sm:p-5"
      >
        {activeItem.content}
      </div>
    </div>
  )
}
