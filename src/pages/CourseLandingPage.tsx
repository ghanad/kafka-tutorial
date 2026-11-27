import { createElement, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  ListChecks,
  MousePointerClick,
  Network,
  Puzzle,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  WifiOff,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { HeroDiagram } from '../components/diagrams/HeroDiagram'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Ltr } from '../components/ui/Ltr'
import { getCourseIcon } from '../components/ui/courseIcons'
import {
  findLessonById,
  getCourseLessons,
  getCourseProgressPath,
  getCoursePublishedLessons,
  getLessonPath,
} from '../content/courses'
import type { Course } from '../content/courses'
import { siteConfig } from '../content/site'
import { useAppStore } from '../store/useAppStore'
import { toPersianDigits } from '../utils/persianDigits'
import { getCourseProgress, getSectionProgress } from '../utils/progress'

const sectionIcons: Record<string, LucideIcon> = {
  introduction: BookOpen,
  architecture: Layers,
  producer: Send,
  consumer: Users,
  reliability: ShieldCheck,
  practice: Terminal,
  ecosystem: Network,
  operations: Activity,
  patterns: Puzzle,
  'k8s-basics': BookOpen,
  'k8s-workloads': Layers,
  'k8s-operations': Activity,
}

const features = [
  {
    icon: GraduationCap,
    title: 'مسیر پیوسته از پایه تا کار واقعی',
    description:
      'هر دوره از مفاهیم پایه شروع می‌شود و تا طراحی، عملیات و رفع مشکل در محیط واقعی پیش می‌رود.',
  },
  {
    icon: MousePointerClick,
    title: 'یادگیری با نمودار و شبیه‌ساز',
    description:
      'به‌جای خواندن صرف، رفتار سیستم را گام‌به‌گام می‌بینید و سناریوهای خرابی را تعاملی تجربه می‌کنید.',
  },
  {
    icon: WifiOff,
    title: 'کاملاً در مرورگر شما',
    description:
      'پیشرفت و نشانک‌ها فقط در حافظه مرورگر ذخیره می‌شوند؛ بدون سرور و بدون نیاز به اینترنت.',
  },
]

function CourseOverviewCard({ course }: { course: Course }) {
  const Icon = getCourseIcon(course.icon)
  const publishedLessons = getCoursePublishedLessons(course)

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <span className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-200">
          {createElement(Icon, { className: 'h-5 w-5', 'aria-hidden': true })}
        </span>
        <CardTitle>{course.title}</CardTitle>
        <CardDescription>{course.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <dt className="text-[10px] text-slate-500 dark:text-slate-400">فصل</dt>
            <dd className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-white">
              {toPersianDigits(course.sections.length)}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <dt className="text-[10px] text-slate-500 dark:text-slate-400">درس آماده</dt>
            <dd className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-white">
              {toPersianDigits(publishedLessons.length)}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <dt className="text-[10px] text-slate-500 dark:text-slate-400">سطح</dt>
            <dd className="mt-0.5 text-xs font-extrabold text-slate-900 dark:text-white">
              {course.level}
            </dd>
          </div>
        </dl>

        <ul className="space-y-2">
          {course.sections.slice(0, 4).map((section, index) => (
            <li
              key={section.id}
              className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary-100 text-[10px] font-extrabold text-primary-700 dark:bg-primary-950 dark:text-primary-200">
                {toPersianDigits(index + 1)}
              </span>
              <span className="truncate">{section.title}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function CourseLandingPage({ course }: { course: Course }) {
  const roadmapRef = useRef<HTMLElement>(null)
  const lastVisitedLessonId = useAppStore((state) => state.lastVisitedLesson)
  const completedLessons = useAppStore((state) => state.completedLessons)
  const courseLessons = getCourseLessons(course)
  const publishedLessons = getCoursePublishedLessons(course)
  const lastLesson = lastVisitedLessonId ? findLessonById(lastVisitedLessonId) : undefined
  const continueLesson =
    lastLesson?.courseId === course.id && lastLesson.status === 'published'
      ? lastLesson
      : undefined
  const targetLesson = continueLesson ?? publishedLessons[0]
  const isContinue = Boolean(continueLesson)
  const progress = getCourseProgress(course, completedLessons)

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${course.title} | ${siteConfig.name}`
    return () => {
      document.title = previousTitle
    }
  }, [course.title])

  function scrollToRoadmap() {
    roadmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto max-w-6xl">
      <nav
        aria-label="مسیر صفحه"
        className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
      >
        <Link
          to="/"
          className="transition-colors hover:text-primary-600 dark:hover:text-primary-300"
        >
          همه دوره‌ها
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {course.shortTitle}
        </span>
      </nav>

      <section className="surface-grid relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/50 sm:p-8 lg:p-10">
        <div
          className="pointer-events-none absolute -start-24 -top-24 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 -end-20 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Badge variant="primary" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {course.level} • تعاملی و کاملاً آفلاین
            </Badge>

            <h1 className="mt-4 text-3xl font-extrabold leading-[1.4] text-slate-900 dark:text-white sm:text-4xl xl:text-[2.9rem]">
              <Ltr className="bg-gradient-to-l from-primary-600 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
                {course.shortTitle}
              </Ltr>{' '}
              را {course.level} یاد بگیرید
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-8 text-slate-600 dark:text-slate-300 sm:text-base">
              {course.longDescription}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {targetLesson && (
                <Link
                  to={getLessonPath(course, targetLesson)}
                  className={buttonClasses({ size: 'lg' })}
                >
                  {isContinue ? 'ادامه یادگیری' : 'شروع یادگیری'}
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
              <Button variant="outline" size="lg" onClick={scrollToRoadmap}>
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                مشاهده سرفصل‌ها
              </Button>
              <Link
                to={getCourseProgressPath(course)}
                className={buttonClasses({ variant: 'ghost', size: 'lg' })}
              >
                پیشرفت این دوره
              </Link>
            </div>

            {continueLesson && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                آخرین درس باز‌شده: <span className="font-bold">{continueLesson.title}</span>
              </p>
            )}

            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {[
                { value: toPersianDigits(course.sections.length), label: 'فصل آموزشی' },
                { value: toPersianDigits(publishedLessons.length), label: 'درس آماده' },
                { value: '۱۰۰٪', label: 'بدون اینترنت' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-3 text-center dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <p className="text-lg font-extrabold text-primary-700 dark:text-primary-200">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {progress.completed > 0 && (
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>
                  شما {toPersianDigits(progress.completed)} درس از این دوره را تکمیل
                  کرده‌اید و پیشرفت دوره {toPersianDigits(progress.percent)}٪ است.
                </span>
              </div>
            )}
          </div>

          {course.id === 'kafka' ? <HeroDiagram /> : <CourseOverviewCard course={course} />}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="why-title">
        <div className="mb-5 max-w-2xl">
          <Badge variant="neutral">چرا این پلتفرم؟</Badge>
          <h2 id="why-title" className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            یادگیری بدون حفظ کردن
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
            تمرکز این دوره بر ساختن شهود درست از رفتار سیستم است؛ اینکه هر جزء چه
            کاری می‌کند، چه زمانی خراب می‌شود و چطور می‌توان سیستمی قابل اتکا طراحی کرد.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <span className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-200">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      <section
        ref={roadmapRef}
        id="roadmap"
        className="mt-12 scroll-mt-24"
        aria-labelledby="roadmap-title"
      >
        <div className="mb-6 max-w-2xl">
          <Badge variant="neutral">نقشه راه</Badge>
          <h2
            id="roadmap-title"
            className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white"
          >
            مسیر یادگیری در {toPersianDigits(course.sections.length)} فصل
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
            هر فصل روی فصل قبل ساخته می‌شود. درس‌هایی که هنوز منتشر نشده‌اند با
            برچسب «به‌زودی» مشخص شده‌اند و در گام‌های بعدی تکمیل می‌شوند.
          </p>
        </div>

        <div className="relative">
          <div
            className="absolute bottom-4 start-5 top-4 w-px bg-gradient-to-b from-primary-500 via-fuchsia-500 to-emerald-500 opacity-50"
            aria-hidden="true"
          />
          <ol className="space-y-4">
            {course.sections.map((section, index) => {
              const Icon = sectionIcons[section.id] ?? BookOpen
              const sectionProgress = getSectionProgress(section, completedLessons)
              const firstLesson = section.lessons.find(
                (lesson) => lesson.status === 'published',
              )
              const isComplete =
                sectionProgress.published > 0 &&
                sectionProgress.completed === sectionProgress.published

              return (
                <li key={section.id} className="relative flex gap-4">
                  <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-primary-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-primary-300">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>

                  <Card className="min-w-0 flex-1">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            فصل {toPersianDigits(index + 1)}
                          </span>
                          {sectionProgress.published === 0 ? (
                            <Badge variant="neutral" size="sm">
                              به‌زودی
                            </Badge>
                          ) : isComplete ? (
                            <Badge variant="success" size="sm">
                              تکمیل شده
                            </Badge>
                          ) : (
                            <Badge variant="primary" size="sm">
                              در دسترس
                            </Badge>
                          )}
                        </div>

                        <h3 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                          {section.title}
                        </h3>
                        <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                          {section.description}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                        {sectionProgress.published > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {toPersianDigits(sectionProgress.published)} درس آماده
                          </span>
                        )}
                        {firstLesson && (
                          <Link
                            to={getLessonPath(course, firstLesson)}
                            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                          >
                            ورود به فصل
                            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {targetLesson && (
        <section className="mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-900 p-6 text-white shadow-glow sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold sm:text-2xl">
                {isContinue ? 'از همان‌جا که بودید ادامه دهید' : 'آماده شروع هستید؟'}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-primary-100">
                {isContinue
                  ? 'پیشرفت شما در همین مرورگر ذخیره شده است. درس بعدی را باز کنید و مسیر را ادامه دهید.'
                  : `با اولین درس ${course.shortTitle} شروع کنید و بعد به سراغ مفاهیم اصلی بروید.`}
              </p>
            </div>
            <Link
              to={getLessonPath(course, targetLesson)}
              className={buttonClasses({
                variant: 'outline',
                size: 'lg',
                className:
                  'border-white/30 bg-white text-primary-700 hover:bg-primary-50 dark:border-white/30 dark:bg-white dark:text-primary-700 dark:hover:bg-primary-50',
              })}
            >
              {isContinue ? 'ادامه یادگیری' : 'شروع یادگیری'}
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
        {toPersianDigits(courseLessons.length)} درس در {toPersianDigits(course.sections.length)}{' '}
        فصل برای دوره {course.shortTitle} ثبت شده است.
      </p>
    </div>
  )
}
