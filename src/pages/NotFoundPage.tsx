import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import { buttonClasses } from '../components/ui/buttonStyles'
import { KafkaLogo } from '../components/ui/KafkaLogo'
import { allLessons } from '../content/curriculum'

export function NotFoundPage() {
  const firstLesson = allLessons[0]

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'صفحه پیدا نشد | آموزش Kafka'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-12 text-center sm:py-20">
      <KafkaLogo className="h-14 w-14" />

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
          بازگشت به صفحه اصلی
        </Link>
        {firstLesson && (
          <Link
            to={`/lessons/${firstLesson.slug}`}
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
