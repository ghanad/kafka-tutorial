import { useEffect, useId } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Circle,
  Clock,
  FileText,
  Home,
  X,
} from 'lucide-react'
import { allLessons, publishedLessons, sections } from '../../content/curriculum'
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
  const shouldReduceMotion = useReducedMotion()
  const sectionPanelId = useId()
  const { pathname } = useLocation()
  const completedLessons = useAppStore((state) => state.completedLessons)
  const notes = useAppStore((state) => state.notes)
  const inlineNotes = useAppStore((state) => state.inlineNotes)
  const collapsedSections = useAppStore((state) => state.collapsedSections)
  const toggleSectionCollapsed = useAppStore((state) => state.toggleSectionCollapsed)
  const setCollapsedSections = useAppStore((state) => state.setCollapsedSections)
  const completedSet = new Set(completedLessons)
  const collapsedSet = new Set(collapsedSections)
  const completedCount = getCompletedLessonCount(completedLessons)
  const progressPercent = getProgressPercent(completedLessons)
  const allCollapsed = sections.every((section) => collapsedSet.has(section.id))

  const activeSlug = pathname.startsWith('/lessons/')
    ? decodeURIComponent(pathname.slice('/lessons/'.length))
    : null
  const activeSection = activeSlug
    ? sections.find((section) => section.lessons.some((lesson) => lesson.slug === activeSlug))
    : undefined
  const activeLesson = activeSection?.lessons.find((lesson) => lesson.slug === activeSlug)

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
            {toPersianDigits(completedCount)} از {toPersianDigits(publishedLessons.length)} درس
            منتشرشده تکمیل شده است
          </p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="فصل‌ها و درس‌ها">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">فصل‌ها</span>
          <button
            type="button"
            onClick={() =>
              setCollapsedSections(allCollapsed ? [] : sections.map((section) => section.id))
            }
            aria-label={allCollapsed ? 'باز کردن همه فصل‌ها' : 'بستن همه فصل‌ها'}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
          >
            {allCollapsed ? (
              <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {allCollapsed ? 'باز کردن همه' : 'بستن همه'}
          </button>
        </div>

        <ol className="space-y-2">
          {sections.map((section, index) => {
            const sectionProgress = getSectionProgress(section, completedLessons)
            const isCollapsed = collapsedSet.has(section.id)
            const isActiveSection = section.id === activeSection?.id
            const panelId = `${sectionPanelId}-${section.id}`

            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => toggleSectionCollapsed(section.id)}
                  aria-expanded={!isCollapsed}
                  aria-controls={isCollapsed ? undefined : panelId}
                  aria-current={isActiveSection ? 'location' : undefined}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-xl px-1 py-1 text-start transition-colors',
                    isActiveSection
                      ? 'bg-primary-50/80 dark:bg-primary-950/40'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold',
                      isActiveSection
                        ? 'bg-primary-600 text-white dark:bg-primary-500 dark:text-slate-950'
                        : 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-200',
                    )}
                  >
                    {toPersianDigits(index + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-xs font-extrabold leading-6',
                          isActiveSection
                            ? 'text-primary-700 dark:text-primary-200'
                            : 'text-slate-700 dark:text-slate-200',
                        )}
                      >
                        {section.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {sectionProgress.published > 0 ? (
                          <span className="text-[10px] font-medium text-slate-400">
                            {toPersianDigits(sectionProgress.completed)}/
                            {toPersianDigits(sectionProgress.published)}
                          </span>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            به‌زودی
                          </Badge>
                        )}
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-slate-400 transition-transform duration-200',
                            isCollapsed && 'rotate-90',
                          )}
                          aria-hidden="true"
                        />
                      </span>
                    </span>
                  </span>
                </button>

                {isCollapsed && isActiveSection && activeLesson && (
                  <NavLink
                    to={`/lessons/${activeLesson.slug}`}
                    onClick={onNavigate}
                    title={activeLesson.title}
                    className="ms-8 me-1 mt-1 flex items-center gap-1.5 rounded-lg bg-primary-50 px-2 py-1.5 text-[11px] font-bold text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-950/60 dark:text-primary-200 dark:hover:bg-primary-950"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500 dark:bg-primary-300"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">{activeLesson.title}</span>
                    <span className="sr-only">در حال مطالعه</span>
                  </NavLink>
                )}

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      key="panel"
                      id={panelId}
                      initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <ul className="mt-1.5 space-y-0.5 border-s border-slate-200 ps-2 dark:border-slate-800">
                        {section.lessons.map((lesson) => {
                          const isCompleted = completedSet.has(lesson.id)

                          if (lesson.status === 'planned') {
                            return (
                              <li key={lesson.id}>
                                <div className="flex items-start gap-2 rounded-lg px-2 py-2 text-xs text-slate-400 dark:text-slate-500">
                                  <Clock
                                    className="mt-0.5 h-4 w-4 shrink-0 opacity-70"
                                    aria-hidden="true"
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block leading-5">{lesson.title}</span>
                                    <Badge variant="neutral" size="sm" className="mt-1">
                                      به‌زودی
                                    </Badge>
                                  </span>
                                </div>
                              </li>
                            )
                          }

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
                                      <span className="mt-0.5 flex items-center justify-between gap-1 text-[10px] font-normal text-slate-400">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" aria-hidden="true" />
                                          {toPersianDigits(lesson.readingTime)} دقیقه
                                        </span>
                                        {(Boolean(notes[lesson.id]?.trim()) ||
                                          Boolean(inlineNotes[lesson.id]?.length)) && (
                                          <span
                                            className="flex items-center gap-0.5 text-primary-600 dark:text-primary-400"
                                            title="دارای یادداشت شخصی"
                                          >
                                            <FileText className="h-3 w-3" aria-hidden="true" />
                                            <span>یادداشت</span>
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                          )
                        })}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="shrink-0 space-y-1 border-t border-slate-200/70 p-3 dark:border-slate-800">
        <Link
          to="/progress"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
        >
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          پیشرفت من
        </Link>
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
