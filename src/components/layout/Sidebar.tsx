import { useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Circle, Clock, Home, X } from 'lucide-react'
import { allLessons, sections } from '../../content/curriculum'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/persianDigits'
import {
  getCompletedLessonCount,
  getProgressPercent,
  getSectionProgress,
} from '../../utils/progress'
import { Badge } from '../ui/Badge'
import { ProgressBar } from '../ui/ProgressBar'

interface SidebarBodyProps {
  onNavigate?: () => void
}

function SidebarBody({ onNavigate }: SidebarBodyProps) {
  const completedLessons = useAppStore((state) => state.completedLessons)
  const completedSet = new Set(completedLessons)
  const completedCount = getCompletedLessonCount(completedLessons)
  const progressPercent = getProgressPercent(completedLessons)

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-slate-200/70 p-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">فهرست دوره</h2>
          <Badge variant="neutral" size="sm">
            {toPersianDigits(allLessons.length)} درس
          </Badge>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-300">پیشرفت شما</span>
            <span className="font-extrabold text-primary-700 dark:text-primary-300">
              {toPersianDigits(progressPercent)}٪
            </span>
          </div>
          <ProgressBar value={progressPercent} label="پیشرفت کل دوره" />
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {toPersianDigits(completedCount)} از {toPersianDigits(allLessons.length)} درس تکمیل
            شده است
          </p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="فصل‌ها و درس‌ها">
        <ol className="space-y-4">
          {sections.map((section, index) => {
            const sectionProgress = getSectionProgress(section, completedLessons)

            return (
              <li key={section.id}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-[11px] font-extrabold text-primary-700 dark:bg-primary-950 dark:text-primary-200">
                    {toPersianDigits(index + 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-extrabold leading-6 text-slate-700 dark:text-slate-200">
                        {section.title}
                      </h3>
                      {sectionProgress.total > 0 ? (
                        <span className="shrink-0 text-[10px] font-medium text-slate-400">
                          {toPersianDigits(sectionProgress.completed)}/
                          {toPersianDigits(sectionProgress.total)}
                        </span>
                      ) : (
                        <Badge variant="neutral" size="sm" className="shrink-0">
                          به‌زودی
                        </Badge>
                      )}
                    </div>

                    {sectionProgress.total > 0 ? (
                      <ul className="mt-1.5 space-y-0.5 border-s border-slate-200 ps-2 dark:border-slate-800">
                        {section.lessons.map((lesson) => {
                          const isCompleted = completedSet.has(lesson.id)

                          return (
                            <li key={lesson.id}>
                              <NavLink
                                to={`/lessons/${lesson.slug}`}
                                onClick={onNavigate}
                                className={({ isActive }) =>
                                  cn(
                                    'group flex items-start gap-2 rounded-lg px-2 py-2 text-xs transition-colors',
                                    isActive
                                      ? 'bg-primary-50 font-bold text-primary-700 dark:bg-primary-950/60 dark:text-primary-200'
                                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70',
                                  )
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isCompleted ? (
                                      <CheckCircle2
                                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                                        aria-label="تکمیل شده"
                                      />
                                    ) : (
                                      <Circle
                                        className={cn(
                                          'mt-0.5 h-4 w-4 shrink-0',
                                          isActive
                                            ? 'text-primary-500'
                                            : 'text-slate-300 dark:text-slate-600',
                                        )}
                                        aria-hidden="true"
                                      />
                                    )}
                                    <span className="min-w-0 flex-1">
                                      <span className="block leading-5">{lesson.title}</span>
                                      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-normal text-slate-400">
                                        <Clock className="h-3 w-3" aria-hidden="true" />
                                        {toPersianDigits(lesson.readingTime)} دقیقه
                                      </span>
                                    </span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="mt-1.5 text-[11px] leading-5 text-slate-400 dark:text-slate-500">
                        درس‌های این فصل به‌زودی اضافه می‌شوند.
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="shrink-0 border-t border-slate-200/70 p-3 dark:border-slate-800">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          صفحه اصلی دوره
        </Link>
      </div>
    </div>
  )
}

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!mobileOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileOpen, onClose])

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-e border-slate-200/70 lg:block dark:border-slate-800">
        <div className="sticky top-16 h-[calc(100vh-4rem)]">
          <SidebarBody />
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div key="sidebar-drawer" className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden="true"
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="فهرست درس‌ها"
              initial={shouldReduceMotion ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-y-0 start-0 flex w-[88%] max-w-sm flex-col border-e border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200/70 p-3 dark:border-slate-800">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  منوی دوره
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="بستن فهرست درس‌ها"
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <SidebarBody onNavigate={onClose} />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
