import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ChangeEvent } from 'react'
import {
  BarChart3,
  Bookmark,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  GraduationCap,
  PencilLine,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Type,
  Upload,
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Callout } from '../components/ui/Callout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { FontSettingsPanel } from '../components/ui/FontSettingsPanel'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Tabs } from '../components/ui/Tabs'
import {
  findLessonById,
  publishedLessons,
  sections,
} from '../content/curriculum'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../utils/cn'
import { previewQuote } from '../utils/inlineNoteAnchor'
import {
  backupFileName,
  buildExportJson,
  downloadTextFile,
  extractImportedState,
} from '../utils/dataTransfer'
import { toPersianDigits } from '../utils/persianDigits'
import { getCompletedLessonCount, getProgressPercent } from '../utils/progress'

interface StatusMessage {
  type: 'success' | 'error'
  text: string
}

const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const reportTimestamp = new Date()

export function ProgressPage() {
  const completedLessons = useAppStore((state) => state.completedLessons)
  const bookmarks = useAppStore((state) => state.bookmarks)
  const notes = useAppStore((state) => state.notes)
  const inlineNotes = useAppStore((state) => state.inlineNotes)
  const importData = useAppStore((state) => state.importData)
  const resetAllData = useAppStore((state) => state.resetAllData)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<StatusMessage | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'پیشرفت من | آموزش Kafka'
    return () => {
      document.title = previousTitle
    }
  }, [])

  const completedSet = new Set(completedLessons)
  const completed = publishedLessons.filter((lesson) => completedSet.has(lesson.id))
  const bookmarkedLessons = bookmarks
    .map((id) => findLessonById(id))
    .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson))

  const notedLessons = publishedLessons
    .map((lesson) => ({
      lesson,
      note: (notes[lesson.id] ?? '').trim(),
      anchors: inlineNotes[lesson.id] ?? [],
    }))
    .filter((item) => item.note.length > 0 || item.anchors.length > 0)

  const progressPercent = getProgressPercent(completedLessons)
  const completedCount = getCompletedLessonCount(completedLessons)

  function showMessage(type: StatusMessage['type'], text: string) {
    setMessage({ type, text })
  }

  function handleExport() {
    try {
      downloadTextFile(backupFileName(), buildExportJson())
      showMessage('success', 'فایل پشتیبان ساخته و دانلود شد.')
    } catch {
      showMessage('error', 'ساخت فایل پشتیبان ناموفق بود. دوباره تلاش کنید.')
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const importedState = extractImportedState(text)
      importData(importedState)
      setConfirmWipe(false)
      showMessage('success', 'داده‌های پیشرفت با موفقیت وارد شد.')
    } catch (error) {
      showMessage(
        'error',
        error instanceof Error ? error.message : 'خواندن فایل ناموفق بود.',
      )
    }
  }

  function handleWipe() {
    resetAllData()
    setConfirmWipe(false)
    showMessage('success', 'همه داده‌های ذخیره‌شده پاک شد.')
  }

  const emptyState = (text: string) => (
    <Callout variant="info">{text}</Callout>
  )

  return (
    <div className="mx-auto max-w-5xl">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900/70 sm:p-8">
        <div
          className="pointer-events-none absolute -end-16 -top-20 h-52 w-52 rounded-full bg-primary-500/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <Badge variant="primary">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            پنل شخصی
          </Badge>
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
            پیشرفت من
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-8 text-slate-600 dark:text-slate-300">
            همه داده‌های این صفحه فقط در حافظه همین مرورگر نگه‌داری می‌شوند. می‌توانید
            از آن‌ها نسخه پشتیبان بگیرید، در مرورگر دیگری وارد کنید یا کاملاً پاک
            کنید.
          </p>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                پیشرفت کل دوره
              </span>
              <span className="font-extrabold text-primary-700 dark:text-primary-300">
                {toPersianDigits(progressPercent)}٪
              </span>
            </div>
            <ProgressBar value={progressPercent} label="پیشرفت کل دوره" />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {toPersianDigits(completedCount)} از {toPersianDigits(publishedLessons.length)} درس
              منتشرشده تکمیل شده است.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            icon: CheckCircle2,
            label: 'درس تکمیل‌شده',
            value: toPersianDigits(completedCount),
            tone: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            icon: Bookmark,
            label: 'نشانک',
            value: toPersianDigits(bookmarkedLessons.length),
            tone: 'text-primary-600 dark:text-primary-300',
          },
          {
            icon: FileText,
            label: 'یادداشت',
            value: toPersianDigits(notedLessons.length),
            tone: 'text-indigo-600 dark:text-indigo-400',
          },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <Icon className={cn('h-5 w-5', stat.tone)} aria-hidden="true" />
                <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <section className="mt-6" aria-labelledby="section-progress-title">
        <Card>
          <CardHeader className="border-b border-slate-200/80 dark:border-slate-800">
            <CardTitle id="section-progress-title">پیشرفت فصل‌ها</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            {sections.map((section) => {
              const published = section.lessons.filter(
                (lesson) => lesson.status === 'published',
              )
              const done = published.filter((lesson) => completedSet.has(lesson.id)).length
              const percent = published.length > 0 ? Math.round((done / published.length) * 100) : 0

              return (
                <div key={section.id}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {section.title}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {published.length > 0
                        ? `${toPersianDigits(done)}/${toPersianDigits(published.length)}`
                        : 'به‌زودی'}
                    </span>
                  </div>
                  <ProgressBar
                    value={percent}
                    label={`پیشرفت ${section.title}`}
                    className="[&>div:first-child]:h-1.5"
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6" aria-labelledby="details-title">
        <h2 id="details-title" className="sr-only">
          جزئیات پیشرفت
        </h2>
        <Tabs
          ariaLabel="جزئیات پیشرفت"
          items={[
            {
              id: 'completed',
              label: `تکمیل‌شده‌ها (${toPersianDigits(completed.length)})`,
              content:
                completed.length > 0 ? (
                  <ul className="space-y-2">
                    {completed.map((lesson) => (
                      <li key={lesson.id}>
                        <Link
                          to={`/lessons/${lesson.slug}`}
                          className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50/40 dark:border-slate-800 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
                        >
                          <CheckCircle2
                            className="h-5 w-5 shrink-0 text-emerald-500"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                            {lesson.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {toPersianDigits(lesson.readingTime)} دقیقه
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  emptyState('هنوز درسی را تکمیل نکرده‌اید. از صفحه اصلی شروع کنید.')
                ),
            },
            {
              id: 'bookmarks',
              label: `نشانک‌ها (${toPersianDigits(bookmarkedLessons.length)})`,
              content:
                bookmarkedLessons.length > 0 ? (
                  <ul className="space-y-2">
                    {bookmarkedLessons.map((lesson) => (
                      <li key={lesson.id}>
                        <Link
                          to={`/lessons/${lesson.slug}`}
                          className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50/40 dark:border-slate-800 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
                        >
                          <Bookmark
                            className="h-5 w-5 shrink-0 fill-current text-primary-500"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                            {lesson.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  emptyState('هنوز نشانکی اضافه نکرده‌اید. در هر درس می‌توانید نشانک بگذارید.')
                ),
            },
            {
              id: 'notes',
              label: `یادداشت‌ها (${toPersianDigits(notedLessons.length)})`,
              content:
                notedLessons.length > 0 ? (
                  <ul className="space-y-3">
                    {notedLessons.map(({ lesson, note, anchors }) => (
                      <li key={lesson.id}>
                        <Link
                          to={`/lessons/${lesson.slug}`}
                          className="group block rounded-xl border border-slate-200/80 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/40 dark:border-slate-800 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <FileText
                                className="h-4 w-4 shrink-0 text-indigo-500"
                                aria-hidden="true"
                              />
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {lesson.title}
                              </span>
                            </div>
                            <span className="shrink-0 text-[11px] text-slate-400">
                              {toPersianDigits(lesson.readingTime)} دقیقه
                            </span>
                          </div>
                          {note && (
                            <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                              {note}
                            </p>
                          )}
                          {anchors.length > 0 && (
                            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-6 text-amber-700 dark:text-amber-300">
                              <PencilLine
                                className="mt-1 h-3.5 w-3.5 shrink-0"
                                aria-hidden="true"
                              />
                              <span className="line-clamp-2">
                                {toPersianDigits(anchors.length)} یادداشت روی متن: «
                                {previewQuote(anchors[anchors.length - 1].anchor.quote, 70)}»
                              </span>
                            </p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  emptyState('هنوز برای هیچ درسی یادداشتی ثبت نکرده‌اید. در صفحه هر درس، متن یا پاراگراف موردنظر را انتخاب کنید و همان‌جا یادداشت بگذارید.')
                ),
            },
          ]}
        />
      </section>

      <section className="mt-6" aria-labelledby="typography-settings-title">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <CardTitle id="typography-settings-title">شخصی‌سازی قلم و خوانایی</CardTitle>
              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                اندازه قلم، نوع فونت و فاصله خطوط متن درس‌ها را مطابق سلیقه خود تنظیم کنید.
              </p>
            </div>
            <Type className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <CardContent className="p-5">
            <FontSettingsPanel />
          </CardContent>
        </Card>
      </section>

      <section className="mt-6" aria-labelledby="backup-title">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <CardTitle id="backup-title">پشتیبان‌گیری و بازیابی</CardTitle>
              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                داده‌ها را به‌صورت یک فایل <span dir="ltr">JSON</span> دانلود کنید یا
                فایل قبلی را وارد کنید.
              </p>
            </div>
            <FileJson className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>

          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleExport}
                startIcon={<Download className="h-4 w-4" aria-hidden="true" />}
              >
                گرفتن پشتیبان JSON
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImport}
                aria-label="انتخاب فایل پشتیبان برای وارد کردن"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                startIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
              >
                وارد کردن فایل پشتیبان
              </Button>

              {!confirmWipe ? (
                <Button
                  variant="danger"
                  onClick={() => setConfirmWipe(true)}
                  startIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                >
                  پاک کردن همه داده‌ها
                </Button>
              ) : (
                <span className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-2 dark:border-rose-900/70 dark:bg-rose-950/40">
                  <ShieldAlert
                    className="h-4 w-4 text-rose-600 dark:text-rose-400"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium text-rose-800 dark:text-rose-200">
                    مطمئنید؟ این کار قابل بازگشت نیست.
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleWipe}
                    startIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                  >
                    بله، پاک کن
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmWipe(false)}
                    startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                  >
                    انصراف
                  </Button>
                </span>
              )}
            </div>

            {message && (
              <div className="mt-4">
                <Callout variant={message.type === 'success' ? 'tip' : 'danger'}>
                  {message.text}
                </Callout>
              </div>
            )}

            <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              آخرین به‌روزرسانی این گزارش: {dateFormatter.format(reportTimestamp)}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
