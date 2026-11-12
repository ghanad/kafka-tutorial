import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface AccordionItem {
  id: string
  title: string
  content: ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  allowMultiple?: boolean
  defaultOpenIds?: string[]
  className?: string
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  className,
}: AccordionProps) {
  const baseId = useId()
  const shouldReduceMotion = useReducedMotion()
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds)

  function toggle(itemId: string) {
    if (allowMultiple) {
      setOpenIds((current) =>
        current.includes(itemId)
          ? current.filter((id) => id !== itemId)
          : [...current, itemId],
      )
      return
    }

    setOpenIds((current) => (current.includes(itemId) ? [] : [itemId]))
  }

  return (
    <div
      className={cn(
        'divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/70',
        className,
      )}
    >
      {items.map((item) => {
        const isOpen = openIds.includes(item.id)
        const panelId = `${baseId}-panel-${item.id}`
        const buttonId = `${baseId}-button-${item.id}`

        return (
          <div key={item.id}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-start text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/50 sm:px-5"
              >
                <span>{item.title}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:px-5">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
