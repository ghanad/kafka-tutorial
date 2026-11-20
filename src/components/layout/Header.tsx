import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  Menu,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Sun,
  Type,
  X,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useLessonSearch } from '../../hooks/useLessonSearch'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/persianDigits'
import { getProgressPercent } from '../../utils/progress'
import { buttonClasses } from '../ui/buttonStyles'
import { FontSettingsModal } from '../ui/FontSettingsModal'
import { KafkaLogo } from '../ui/KafkaLogo'
import { Ltr } from '../ui/Ltr'
import { ProgressBar } from '../ui/ProgressBar'

interface HeaderProps {
  onOpenSidebar: () => void
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const completedLessons = useAppStore((state) => state.completedLessons)
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleSidebarCollapsed = useAppStore((state) => state.toggleSidebarCollapsed)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [fontModalOpen, setFontModalOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const results = useLessonSearch(query)
  const progressPercent = getProgressPercent(completedLessons)
  const showResults = searchOpen && query.trim() !== ''

  useEffect(() => {
    if (!searchOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSearchOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [searchOpen])

  function openFirstResult() {
    const firstResult = results[0]
    if (!firstResult) return
    setQuery('')
    setSearchOpen(false)
    navigate(`/lessons/${firstResult.slug}`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="باز کردن فهرست درس‌ها"
          className={buttonClasses({ variant: 'ghost', size: 'icon', className: 'lg:hidden' })}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          aria-expanded={!sidebarCollapsed}
          aria-controls="course-sidebar"
          aria-label={
            sidebarCollapsed ? 'نمایش فهرست دوره' : 'پنهان کردن فهرست دوره برای مطالعه متمرکز'
          }
          title={sidebarCollapsed ? 'نمایش فهرست دوره' : 'پنهان کردن فهرست دوره'}
          className={cn(
            buttonClasses({ variant: 'ghost', size: 'icon' }),
            'hidden border border-slate-200 lg:inline-flex dark:border-slate-800',
          )}
        >
          {sidebarCollapsed ? (
            <PanelRightOpen className="h-5 w-5" aria-hidden="true" />
          ) : (
            <PanelRightClose className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-none"
          aria-label="صفحه اصلی آموزش Kafka"
        >
          <KafkaLogo className="h-9 w-9 shrink-0" />
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-extrabold text-slate-900 dark:text-white">
              آموزش <Ltr>Kafka</Ltr>
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              از صفر تا تولید
            </span>
          </span>
        </Link>

        <div ref={searchRef} className="relative mx-auto w-full max-w-md">
          <label htmlFor="lesson-search" className="sr-only">
            جستجوی درس
          </label>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="lesson-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') openFirstResult()
            }}
            placeholder="جستجوی درس…"
            autoComplete="off"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100/70 ps-9 pe-9 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:border-primary-500 dark:focus:bg-slate-900 [&::-webkit-search-cancel-button]:hidden"
          />
          {query !== '' && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSearchOpen(false)
              }}
              aria-label="پاک کردن جستجو"
              className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}

          {showResults && (
            <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {results.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto p-1.5" aria-label="نتایج جستجو">
                  {results.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        to={`/lessons/${lesson.slug}`}
                        onClick={() => {
                          setQuery('')
                          setSearchOpen(false)
                        }}
                        className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <BookOpen
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary-500"
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                            {lesson.title}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {lesson.description}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-5 text-center text-sm text-slate-500 dark:text-slate-400">
                  درسی با این عبارت پیدا نشد.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className="hidden items-center gap-2 md:flex"
            title={`پیشرفت دوره: ${toPersianDigits(progressPercent)} درصد`}
          >
            <ProgressBar value={progressPercent} className="w-24" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {toPersianDigits(progressPercent)}٪
            </span>
          </div>

          <NavLink
            to="/progress"
            aria-label="پیشرفت من"
            title="پیشرفت من"
            className={({ isActive }) =>
              cn(
                buttonClasses({
                  variant: 'ghost',
                  size: 'icon',
                  className: 'border border-slate-200 dark:border-slate-800',
                }),
                isActive &&
                  'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-200',
              )
            }
          >
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </NavLink>

          <button
            type="button"
            onClick={() => setFontModalOpen(true)}
            aria-label="تنظیمات قلم و خوانایی"
            title="تنظیمات قلم و خوانایی"
            className={cn(
              buttonClasses({ variant: 'ghost', size: 'icon' }),
              'border border-slate-200 dark:border-slate-800',
            )}
          >
            <Type className="h-5 w-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'روشن کردن تم' : 'تاریک کردن تم'}
            title={theme === 'dark' ? 'روشن کردن تم' : 'تاریک کردن تم'}
            className={cn(
              buttonClasses({ variant: 'ghost', size: 'icon' }),
              'border border-slate-200 dark:border-slate-800',
            )}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="h-5 w-5 text-primary-600" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <FontSettingsModal
        open={fontModalOpen}
        onClose={() => setFontModalOpen(false)}
      />
    </header>
  )
}
