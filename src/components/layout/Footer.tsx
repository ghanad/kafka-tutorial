import { Link } from 'react-router-dom'
import { allLessons } from '../../content/curriculum'
import { KafkaLogo } from '../ui/KafkaLogo'
import { Ltr } from '../ui/Ltr'

export function Footer() {
  const sampleLesson = allLessons[0]

  return (
    <footer className="mt-auto border-t border-slate-200/70 bg-white/60 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <KafkaLogo className="h-8 w-8 shrink-0" />
          <div>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
              آموزش تعاملی <Ltr>Apache Kafka</Ltr>
            </p>
            <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
              محتوا و پیشرفت شما فقط در همین مرورگر ذخیره می‌شود؛ بدون سرور و بدون
              نیاز به اینترنت.
            </p>
          </div>
        </div>

        <nav aria-label="پیوندهای پاورقی" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            to="/"
            className="text-xs font-medium text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-300"
          >
            صفحه اصلی
          </Link>
          {sampleLesson && (
            <Link
              to={`/lessons/${sampleLesson.slug}`}
              className="text-xs font-medium text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-300"
            >
              درس نمونه
            </Link>
          )}
          <span className="text-xs text-slate-400 dark:text-slate-500">
            ساخته‌شده با <Ltr>React</Ltr> و <Ltr>Tailwind CSS</Ltr>
          </span>
        </nav>
      </div>
    </footer>
  )
}
