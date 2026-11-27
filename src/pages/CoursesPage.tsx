import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { buttonClasses } from '../components/ui/buttonStyles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Ltr } from '../components/ui/Ltr'
import { ProgressBar } from '../components/ui/ProgressBar'
import { getCourseIcon } from '../components/ui/courseIcons'
import {
  allLessons,
  courses,
  findLessonById,
  getCoursePath,
  getCourseProgressPath,
  getCoursePublishedLessons,
  getLessonPath,
  publishedLessons,
} from '../content/courses'
import { siteConfig } from '../content/site'
import { useAppStore } from '../store/useAppStore'
import { toPersianDigits } from '../utils/persianDigits'
import { getCourseProgress, getProgressPercent } from '../utils/progress'

export function CoursesPage() {
  const completedLessons = useAppStore((state) => state.completedLessons)
  const lastVisitedLessonId = useAppStore((state) => state.lastVisitedLesson)
  const lastLesson = lastVisitedLessonId ? findLessonById(lastVisitedLessonId) : undefined
  const lastCourse = lastLesson
    ? courses.find((course) => course.id === lastLesson.courseId)
    : undefined
  const continueTarget =
    lastCourse && lastLesson?.status === 'published'
      ? { course: lastCourse, lesson: lastLesson }
      : undefined
  const overallProgress = getProgressPercent(completedLessons)

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${siteConfig.name} | ${siteConfig.tagline}`
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl">
      <section className="surface-grid relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/50 sm:p-8 lg:p-10">
        <div
          className="pointer-events-none absolute -start-24 -top-24 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 -end-20 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative max-w-3xl">
          <Badge variant="primary" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {siteConfig.tagline}
          </Badge>

          <h1 className="mt-4 text-3xl font-extrabold leading-[1.4] text-slate-900 dark:text-white sm:text-4xl xl:text-[2.9rem]">
            {siteConfig.name}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600 dark:text-slate-300 sm:text-base">
            {siteConfig.description} هر دوره مسیر مستقل خودش را دارد و همه درس‌ها
            فارسی، تعاملی و کاملاً آفلاین هستند.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {continueTarget ? (
              <Link
                to={getLessonPath(continueTarget.course, continueTarget.lesson)}
                className={buttonClasses({ size: 'lg' })}
              >
                ادامه یادگیری
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : courses[0] ? (
              <Link
                to={getCoursePath(courses[0])}
                className={buttonClasses({ size: 'lg' })}
              >
                شروع یادگیری
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
            <Link
              to="/progress"
              className={buttonClasses({ variant: 'outline', size: 'lg' })}
            >
              پیشرفت من
            </Link>
          </div>

          {continueTarget && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              آخرین درس باز‌شده: <span className="font-bold">{continueTarget.lesson.title}</span>{' '}
              در دوره {continueTarget.course.shortTitle}
            </p>
          )}

          <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
            {[
              { value: toPersianDigits(courses.length), label: 'دوره' },
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

          {completedLessons.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>
                شما {toPersianDigits(completedLessons.length)} درس را تکمیل کرده‌اید و
                پیشرفت کلی {toPersianDigits(overallProgress)}٪ است.
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="courses-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <Badge variant="neutral">دوره‌ها</Badge>
            <h2
              id="courses-title"
              className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white"
            >
              مسیر یادگیری خود را انتخاب کنید
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              هر دوره ساختار مستقل دارد و پیشرفت آن جداگانه محاسبه می‌شود.
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {toPersianDigits(allLessons.length)} درس ثبت‌شده در{' '}
            {toPersianDigits(courses.length)} دوره
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => {
            const Icon = getCourseIcon(course.icon)
            const published = getCoursePublishedLessons(course)
            const progress = getCourseProgress(course, completedLessons)
            const courseContinue =
              continueTarget?.course.id === course.id ? continueTarget.lesson : undefined

            return (
              <Card key={course.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-200">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <Badge variant="neutral" size="sm">
                      {course.level}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">{course.title}</CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>

                <CardContent className="mt-auto space-y-4">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      {toPersianDigits(course.sections.length)} فصل
                    </span>
                    <span>
                      {toPersianDigits(published.length)} درس آماده
                    </span>
                    <span className="font-bold text-primary-700 dark:text-primary-300">
                      {toPersianDigits(progress.percent)}٪
                    </span>
                  </div>
                  <ProgressBar
                    value={progress.percent}
                    label={`پیشرفت ${course.shortTitle}`}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={getCoursePath(course)}
                      className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                    >
                      ورود به دوره
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    {courseContinue && (
                      <Link
                        to={getLessonPath(course, courseContinue)}
                        className={buttonClasses({ variant: 'outline', size: 'sm' })}
                      >
                        ادامه: {courseContinue.title}
                      </Link>
                    )}
                    <Link
                      to={getCourseProgressPath(course)}
                      className={buttonClasses({ variant: 'ghost', size: 'sm' })}
                    >
                      پیشرفت دوره
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <p className="mt-10 text-center text-xs leading-6 text-slate-500 dark:text-slate-400">
        <Ltr>{siteConfig.name}</Ltr> — همه داده‌ها فقط در همین مرورگر نگهداری می‌شوند.
      </p>
    </div>
  )
}
