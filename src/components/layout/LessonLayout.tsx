import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  Clock,
  Home,
  ListTree,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import type { CourseSection, LessonMeta } from '../../content/curriculum'
import { sections } from '../../content/curriculum'
import type { LessonContent } from '../../content/lessons/types'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/persianDigits'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { Card, CardContent } from '../ui/Card'
import { Ltr } from '../ui/Ltr'
import { Quiz } from '../quiz/Quiz'
import { NotesBox } from './NotesBox'

interface TocItem {
  id: string
  text: string
  level: number
}

interface LessonLayoutProps {
  lesson: LessonMeta
  section?: CourseSection
  content?: LessonContent
  previousLesson?: LessonMeta
  nextLesson?: LessonMeta
}

export function LessonLayout({
  lesson,
  section,
  content,
  previousLesson,
  nextLesson,
}: LessonLayoutProps) {
  const shouldReduceMotion = useReducedMotion()
  const contentRef = useRef<HTMLDivElement>(null)
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const completedLessons = useAppStore((state) => state.completedLessons)
  const bookmarks = useAppStore((state) => state.bookmarks)
  const bestScore = useAppStore((state) => state.quizScores[lesson.id] ?? 0)
  const toggleLessonComplete = useAppStore((state) => state.toggleLessonComplete)
  const toggleBookmark = useAppStore((state) => state.toggleBookmark)

  const isCompleted = completedLessons.includes(lesson.id)
  const isBookmarked = bookmarks.includes(lesson.id)
  const sectionIndex = section ? sections.findIndex((item) => item.id === section.id) : -1

  useEffect(() => {
    const root = contentRef.current
    if (!root) {
      setToc([])
      return
    }

    const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>('h2, h3'))
    const items = headings
      .map((heading, index) => {
        if (!heading.id) {
          heading.id = `${lesson.slug}-heading-${index + 1}`
        }
        return {
          id: heading.id,
          text: heading.textContent?.trim() ?? '',
          level: heading.tagName === 'H2' ? 2 : 3,
        }
      })
      .filter((item) => item.text !== '')

    setToc(items)
    setActiveId(items[0]?.id ?? null)
  }, [lesson.slug, content])

  useEffect(() => {
    if (toc.length === 0) return

    const headingElements = toc
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null)

    let frame = 0

    function updateActiveHeading() {
      frame = 0
      const threshold = 130
      let currentId = headingElements[0]?.id ?? null

      for (const heading of headingElements) {
        if (heading.getBoundingClientRect().top <= threshold) {
          currentId = heading.id
        } else {
          break
        }
      }

      setActiveId(currentId)
    }

    function handleScroll() {
      if (frame === 0) frame = window.requestAnimationFrame(updateActiveHeading)
    }

    updateActiveHeading()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [toc])

  function jumpToHeading(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  const Content = content?.Content

  return (
    <div className="mx-auto max-w-6xl">
      <nav
        aria-label="مسیر صفحه"
        className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
      >
        <Link
          to="/"
          className="flex items-center gap-1 transition-colors hover:text-primary-600 dark:hover:text-primary-300"
        >
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          خانه
        </Link>
        <span aria-hidden="true">/</span>
        {section && (
          <>
            <span>{section.title}</span>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span className="font-semibold text-slate-700 dark:text-slate-200">{lesson.title}</span>
      </nav>

      <article>
        <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900/70 sm:p-8">
          <div
            className="pointer-events-none absolute -end-16 -top-20 h-52 w-52 rounded-full bg-primary-500/15 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              {sectionIndex >= 0 && <Badge variant="primary">فصل {toPersianDigits(sectionIndex + 1)}</Badge>}
              <Badge variant="neutral">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {toPersianDigits(lesson.readingTime)} دقیقه مطالعه
              </Badge>
              {bestScore > 0 && (
                <Badge variant="success">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  بهترین آزمون: {toPersianDigits(bestScore)}٪
                </Badge>
              )}
              {lesson.status === 'planned' && <Badge variant="neutral">به‌زودی</Badge>}
              {isCompleted && (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  تکمیل شده
                </Badge>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-extrabold leading-[1.5] text-slate-900 dark:text-white sm:text-3xl">
              {lesson.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-8 text-slate-600 dark:text-slate-300">
              {lesson.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                variant={isCompleted ? 'secondary' : 'primary'}
                onClick={() => toggleLessonComplete(lesson.id)}
                startIcon={
                  isCompleted ? (
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )
                }
              >
                {isCompleted ? 'لغو تکمیل درس' : 'تکمیل درس'}
              </Button>

              <Button
                variant="outline"
                onClick={() => toggleBookmark(lesson.id)}
                startIcon={
                  <Bookmark
                    className={cn('h-4 w-4', isBookmarked && 'fill-current')}
                    aria-hidden="true"
                  />
                }
              >
                {isBookmarked ? 'حذف نشانک' : 'افزودن نشانک'}
              </Button>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0 scroll-mt-24" id="lesson-content-start">
            {Content ? (
              <div ref={contentRef} className="lesson-prose">
                <Content />
              </div>
            ) : (
              <Card>
                <CardContent className="p-5 sm:p-6">
                  <Callout variant="info" title="این درس هنوز منتشر نشده است">
                    ساختار این درس در برنامه دوره ثبت شده و محتوای کامل آن در گام‌های
                    بعدی اضافه می‌شود. تا آن زمان می‌توانید از درس‌های منتشرشده
                    استفاده کنید.
                  </Callout>
                </CardContent>
              </Card>
            )}

            {content && <Quiz lessonId={lesson.id} questions={content.quiz} />}

            <NotesBox key={lesson.id} lessonId={lesson.id} />
          </div>

          <aside className="order-first xl:order-none">
            <div className="xl:sticky xl:top-20">
              <nav
                aria-label="فهرست مطالب درس"
                className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800">
                  <ListTree className="h-4 w-4 text-primary-500" aria-hidden="true" />
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    در این درس
                  </h2>
                </div>

                {toc.length > 0 ? (
                  <ol className="mt-3 space-y-1">
                    {toc.map((item) => {
                      const isActive = item.id === activeId
                      return (
                        <li key={item.id} className={cn(item.level === 3 && 'ps-3')}>
                          <button
                            type="button"
                            onClick={() => jumpToHeading(item.id)}
                            aria-current={isActive ? 'location' : undefined}
                            className={cn(
                              'w-full rounded-lg px-2 py-1.5 text-start text-xs leading-5 transition-colors',
                              isActive
                                ? 'bg-primary-50 font-bold text-primary-700 dark:bg-primary-950/60 dark:text-primary-200'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100',
                            )}
                          >
                            {item.text}
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
                    برای این درس هنوز فهرست مطالب ساخته نشده است.
                  </p>
                )}

                <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('quiz')?.scrollIntoView({
                        behavior: shouldReduceMotion ? 'auto' : 'smooth',
                        block: 'start',
                      })
                    }}
                    className="w-full rounded-lg bg-primary-50 px-2 py-2 text-start text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-950/60 dark:text-primary-200 dark:hover:bg-primary-900"
                  >
                    رفتن به آزمون درس
                  </button>
                </div>
              </nav>
            </div>
          </aside>
        </div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.3 }}
          className="mt-8"
        >
          <Card>
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">وضعیت این درس</p>
                <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                  با تکمیل درس، پیشرفت شما در حافظه مرورگر ذخیره می‌شود و در صفحه
                  «پیشرفت من» قابل مشاهده است.
                </p>
              </div>
              <Button
                variant={isCompleted ? 'outline' : 'primary'}
                size="sm"
                onClick={() => toggleLessonComplete(lesson.id)}
                startIcon={
                  isCompleted ? (
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )
                }
              >
                {isCompleted ? 'علامت‌گذاری به‌عنوان ناتمام' : 'علامت‌گذاری به‌عنوان تکمیل‌شده'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <nav aria-label="درس قبلی و بعدی" className="mt-6 grid gap-3 sm:grid-cols-2">
          {previousLesson ? (
            <Link
              to={`/lessons/${previousLesson.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/40 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
            >
              <ArrowRight
                className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  درس قبلی
                </span>
                <span className="mt-0.5 block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                  {previousLesson.title}
                </span>
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-4 opacity-60 dark:border-slate-800">
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                درس قبلی وجود ندارد
              </span>
            </div>
          )}

          {nextLesson ? (
            <Link
              to={`/lessons/${nextLesson.slug}`}
              className="group flex items-center justify-end gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-end transition-colors hover:border-primary-300 hover:bg-primary-50/40 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
            >
              <span className="min-w-0">
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  درس بعدی
                </span>
                <span className="mt-0.5 block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                  {nextLesson.title}
                </span>
              </span>
              <ArrowLeft
                className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          ) : (
            <div className="flex items-center justify-end gap-3 rounded-2xl border border-dashed border-slate-200 p-4 opacity-60 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                درس بعدی وجود ندارد
              </span>
              <ArrowLeft className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            </div>
          )}
        </nav>

        <p className="mt-8 text-center text-[11px] leading-6 text-slate-400 dark:text-slate-500">
          این درس بخشی از دوره <Ltr>Apache Kafka</Ltr> است. همه داده‌ها فقط در همین
          مرورگر نگهداری می‌شوند.
        </p>
      </article>
    </div>
  )
}
