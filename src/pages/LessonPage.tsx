import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  Clock,
  Home,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Callout } from '../components/ui/Callout'
import { Card, CardContent } from '../components/ui/Card'
import { Ltr } from '../components/ui/Ltr'
import { SampleLessonContent } from '../content/lessons/sampleLesson'
import {
  allLessons,
  findLessonBySlug,
  findSectionForLesson,
} from '../content/curriculum'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../utils/cn'
import { toPersianDigits } from '../utils/persianDigits'
import { NotFoundPage } from './NotFoundPage'

export function LessonPage() {
  const { slug } = useParams<{ slug: string }>()
  const lesson = slug ? findLessonBySlug(slug) : undefined
  const completedLessons = useAppStore((state) => state.completedLessons)
  const bookmarks = useAppStore((state) => state.bookmarks)
  const toggleLessonComplete = useAppStore((state) => state.toggleLessonComplete)
  const toggleBookmark = useAppStore((state) => state.toggleBookmark)
  const setLastVisitedLesson = useAppStore((state) => state.setLastVisitedLesson)

  useEffect(() => {
    if (lesson) setLastVisitedLesson(lesson.id)
  }, [lesson, setLastVisitedLesson])

  useEffect(() => {
    if (!lesson) return
    const previousTitle = document.title
    document.title = `${lesson.title} | آموزش Kafka`
    return () => {
      document.title = previousTitle
    }
  }, [lesson])

  if (!lesson) {
    return <NotFoundPage />
  }

  const section = findSectionForLesson(lesson)
  const isCompleted = completedLessons.includes(lesson.id)
  const isBookmarked = bookmarks.includes(lesson.id)
  const lessonIndex = allLessons.findIndex((item) => item.id === lesson.id)
  const previousLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : undefined
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < allLessons.length - 1
      ? allLessons[lessonIndex + 1]
      : undefined

  return (
    <div className="mx-auto max-w-4xl">
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
        {section && <span>{section.title}</span>}
        <span aria-hidden="true">/</span>
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
              <Badge variant="primary">درس نمونه</Badge>
              <Badge variant="neutral">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {toPersianDigits(lesson.readingTime)} دقیقه مطالعه
              </Badge>
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

        <div className="mt-6">
          {lesson.slug === 'sample-lesson' ? (
            <SampleLessonContent />
          ) : (
            <Card>
              <CardContent className="p-5">
                <Callout variant="info">
                  محتوای این درس در گام‌های بعدی اضافه می‌شود.
                </Callout>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="mt-8">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                وضعیت این درس
              </p>
              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                با تکمیل درس، پیشرفت شما در حافظه مرورگر ذخیره می‌شود. همیشه می‌توانید
                آن را لغو کنید.
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
