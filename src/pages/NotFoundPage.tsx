import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import { buttonClasses } from '../components/ui/buttonStyles'
import { SiteLogo } from '../components/ui/SiteLogo'
import {
  findCourseForLesson,
  getLessonPath,
  publishedLessons,
} from '../content/courses'
import { siteConfig } from '../content/site'

export function NotFoundPage() {
  const firstLesson = publishedLessons[0]
  const firstCourse = firstLesson ? findCourseForLesson(firstLesson) : undefined

  useEffect(() => {
    const previousTitle = document.title
    document.title = `صفحه پیدا نشد | ${siteConfig.name}`
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-12 text-center sm:py-20">
      <SiteLogo className="h-14 w-14" />

      <p className="mt-6 text-6xl font-extrabold tracking-tight text-primary-600 dark:text-primary-300">
        ۴۰۴
      </p>

      <h1 className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
        این صفحه پیدا نشد
      </h1>

      <p className="mt-3 max-w-md text-sm leading-8 text-slate-600 dark:text-slate-300">
        آدرسی که باز کرده‌اید وجود ندارد یا درس موردنظر هنوز منتشر نشده است. می‌توانید
        به صفحه اصلی برگردید و از نقشه راه ادامه دهید.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className={buttonClasses({ size: 'md' })}>
          <Compass className="h-4 w-4" aria-hidden="true" />
          بازگشت به همه دوره‌ها
        </Link>
        {firstLesson && firstCourse && (
          <Link
            to={getLessonPath(firstCourse, firstLesson)}
            className={buttonClasses({ variant: 'outline', size: 'md' })}
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            رفتن به درس نمونه
          </Link>
        )}
      </div>
    </div>
  )
}
