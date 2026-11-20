import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

const DAY_MS = 86_400_000
const SEGMENT_MS = 7 * DAY_MS
const RETENTION_MS = 7 * DAY_MS

type StepOp = 'init' | 'append' | 'check' | 'mark' | 'purge'

interface Step {
  at: string
  op: StepOp
  title: string
  body: ReactNode
}

interface DemoRecord {
  offset: number
  time: number
}

interface DemoSegment {
  base: number
  records: DemoRecord[]
  closed: boolean
  marked: boolean
}

interface DemoState {
  segments: DemoSegment[]
  nextOffset: number
  newOffset: number
  now: number
}

const SOURCE = 'orders-events'

const STEPS: Step[] = [
  {
    at: '2026-11-01T08:00',
    op: 'init',
    title: 'شروع: لاگ خالی',
    body: (
      <>
        پارتیشن تازه ساخته شده و فقط یک سگمنت فعال دارد. نام فایل آن، آفست اولین
        رکوردی است که قرار است در آن بنشیند: صفر. تنظیمات نوار بالا هم همان
        پیش‌فرض‌های خود کافکا هستند.
      </>
    ),
  },
  {
    at: '2026-11-01T09:00',
    op: 'append',
    title: 'اولین رکورد می‌رسد',
    body: (
      <>
        رکورد اول، آفست صفر می‌گیرد و timestamp آن همان لحظه ثبت می‌شود. از همین
        جا عمر سگمنت شروع می‌شود: <Ltr>segment.ms</Ltr> از زمان اولین رکوردِ
        سگمنت حساب می‌شود، نه از زمان ساخت فایل.
      </>
    ),
  },
  {
    at: '2026-11-01T14:30',
    op: 'append',
    title: 'رکورد دوم',
    body: (
      <>
        رکورد جدید همیشه به انتهای سگمنت فعال اضافه می‌شود و آفست بعدی را
        می‌گیرد. هیچ رکوردی ویرایش یا جابه‌جا نمی‌شود.
      </>
    ),
  },
  {
    at: '2026-11-03T10:15',
    op: 'append',
    title: 'رکورد سوم',
    body: (
      <>
        دو روز بعد رکورد دیگری می‌رسد. هنوز در همان سگمنت هستیم، چون عمر سگمنت
        (۲ روز) از <Ltr>segment.ms</Ltr> یعنی ۷ روز کمتر است.
      </>
    ),
  },
  {
    at: '2026-11-06T18:45',
    op: 'append',
    title: 'رکورد چهارم',
    body: (
      <>
        جدیدترین رکورد این سگمنت اکنون مربوط به{' '}
        <Ltr className="font-mono">2026-11-06 18:45</Ltr> است. همین رکورد تعیین
        می‌کند که کل سگمنت کِی مشمول حذف شود.
      </>
    ),
  },
  {
    at: '2026-11-10T09:30',
    op: 'append',
    title: 'سگمنت بسته می‌شود و سگمنت تازه ساخته می‌شود',
    body: (
      <>
        موقع نوشتن رکورد با آفست ۴، عمر سگمنت صفر به ۹ روز رسیده و از{' '}
        <Ltr>segment.ms</Ltr> (۷ روز) بیشتر است. کافکا آن را می‌بندد، یعنی از این
        به بعد چیزی به آن اضافه نمی‌شود، و سگمنت جدیدی با نام{' '}
        <Ltr className="font-mono">00000000000000000004.log</Ltr> می‌سازد. رکورد
        با آفست ۴ اولین رکورد آن است.
      </>
    ),
  },
  {
    at: '2026-11-11T12:00',
    op: 'append',
    title: 'رکورد ششم',
    body: (
      <>
        رکورد با آفست ۵ به سگمنت فعال جدید می‌رود. سگمنت قدیمی حالا بسته است و
        فقط خوانده می‌شود.
      </>
    ),
  },
  {
    at: '2026-11-12T09:00',
    op: 'check',
    title: 'Log Cleaner سر می‌زند: هنوز زود است',
    body: (
      <>
        کافکا به‌طور دوره‌ای سگمنت‌های بسته را بررسی می‌کند. جدیدترین رکورد سگمنت
        صفر حدود ۵ روز و ۱۴ ساعت قدمت دارد که از <Ltr>retention.ms</Ltr> کمتر است،
        پس چیزی حذف نمی‌شود. نکته مهم: رکوردهای آفست ۰ و ۱ الان ۱۱ روز قدمت
        دارند ولی هنوز اینجا هستند، چون retention برای هر رکورد جدا حساب نمی‌شود؛
        برای کل سگمنت و بر اساس جدیدترین رکوردش حساب می‌شود.
      </>
    ),
  },
  {
    at: '2026-11-13T18:50',
    op: 'mark',
    title: 'سگمنت صفر واجد شرایط حذف می‌شود',
    body: (
      <>
        حالا جدیدترین رکورد سگمنت صفر از ۷ روز قدیمی‌تر شده است. کل سگمنت، یعنی
        آفست‌های ۰ تا ۳، با هم برای حذف علامت می‌خورد و پسوند فایل‌هایش به{' '}
        <Ltr>.deleted</Ltr> تغییر می‌کند. این فایل‌ها هنوز روی دیسک هستند.
      </>
    ),
  },
  {
    at: '2026-11-13T18:51',
    op: 'purge',
    title: 'فایل‌ها واقعاً پاک می‌شوند',
    body: (
      <>
        بعد از <Ltr>file.delete.delay.ms</Ltr> (پیش‌فرض ۶۰ ثانیه) فایل‌ها از دیسک
        حذف می‌شوند و <Ltr>log-start-offset</Ltr> از ۰ به ۴ می‌رسد. مصرف‌کننده‌ای
        که آفستش کمتر از ۴ باشد حالا خطای <Ltr>OffsetOutOfRange</Ltr> می‌گیرد و
        طبق <Ltr>auto.offset.reset</Ltr> رفتار می‌کند.
      </>
    ),
  },
  {
    at: '2026-11-18T12:05',
    op: 'check',
    title: 'سگمنت فعال دست‌نخورده می‌ماند',
    body: (
      <>
        جدیدترین رکورد سگمنت ۴ الان ۷ روز و ۵ دقیقه قدمت دارد، یعنی از نظر زمانی
        مشمول حذف است. ولی این سگمنت هنوز <strong>فعال</strong> است و کافکا
        سگمنت فعال را هرگز حذف نمی‌کند.
      </>
    ),
  },
  {
    at: '2026-11-19T08:00',
    op: 'append',
    title: 'سگمنت فعال بسته می‌شود',
    body: (
      <>
        رکورد با آفست ۶ می‌رسد. عمر سگمنت ۴ از{' '}
        <Ltr className="font-mono">2026-11-10 09:30</Ltr> حدود ۹ روز است و از{' '}
        <Ltr>segment.ms</Ltr> بیشتر، پس بسته می‌شود و سگمنت{' '}
        <Ltr className="font-mono">00000000000000000006.log</Ltr> ساخته می‌شود.
        حالا سگمنت ۴ «بسته» است و می‌تواند حذف شود.
      </>
    ),
  },
  {
    at: '2026-11-19T08:05',
    op: 'mark',
    title: 'سگمنت ۴ علامت می‌خورد',
    body: (
      <>
        در بررسی بعدی Log Cleaner، جدیدترین رکورد سگمنت ۴ بیش از ۷ روز و ۲۰ ساعت
        قدمت دارد. آفست‌های ۴ و ۵ برای حذف علامت می‌خورند.
      </>
    ),
  },
  {
    at: '2026-11-19T08:06',
    op: 'purge',
    title: 'پایان: لاگ فقط سگمنت فعال را دارد',
    body: (
      <>
        فایل‌های سگمنت ۴ هم پاک شدند و <Ltr>log-start-offset</Ltr> به ۶ رسید.
        خلاصه: رکوردها فقط به انتها اضافه می‌شوند، سگمنت‌ها وقتی پر یا کهنه شوند
        بسته می‌شوند، و retention همیشه کل یک سگمنت بسته را بر اساس جدیدترین
        رکوردش حذف می‌کند.
      </>
    ),
  },
]

const CONFIG: { key: string; value: string }[] = [
  { key: 'retention.ms', value: '7 days' },
  { key: 'segment.ms', value: '7 days' },
  { key: 'segment.bytes', value: '1 GiB' },
  { key: 'log.retention.check.interval.ms', value: '5 min' },
]

function parseStamp(stamp: string): number {
  return Date.parse(`${stamp}:00Z`)
}

function formatStamp(ms: number): string {
  const iso = new Date(ms).toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
}

function padOffset(offset: number): string {
  return String(offset).padStart(20, '0')
}

function formatAge(ms: number): string {
  let minutes = Math.floor(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  minutes -= days * 1440
  const hours = Math.floor(minutes / 60)
  minutes -= hours * 60

  const parts: string[] = []
  if (days > 0) parts.push(`${toPersianDigits(days)} روز`)
  if (hours > 0) parts.push(`${toPersianDigits(hours)} ساعت`)
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${toPersianDigits(minutes)} دقیقه`)
  }
  return parts.join(' و ')
}

function buildState(stepIndex: number): DemoState {
  const state: DemoState = {
    segments: [{ base: 0, records: [], closed: false, marked: false }],
    nextOffset: 0,
    newOffset: -1,
    now: parseStamp(STEPS[0].at),
  }

  for (let index = 1; index <= stepIndex; index += 1) {
    const step = STEPS[index]
    state.now = parseStamp(step.at)

    if (step.op === 'append') {
      let active = state.segments[state.segments.length - 1]
      const first = active.records[0]

      if (first && state.now - first.time >= SEGMENT_MS) {
        active.closed = true
        active = {
          base: state.nextOffset,
          records: [],
          closed: false,
          marked: false,
        }
        state.segments.push(active)
      }

      active.records.push({ offset: state.nextOffset, time: state.now })
      state.newOffset = state.nextOffset
      state.nextOffset += 1
      continue
    }

    state.newOffset = -1

    if (step.op === 'mark') {
      for (const segment of state.segments) {
        const newest = segment.records[segment.records.length - 1]
        if (
          segment.closed &&
          newest &&
          state.now - newest.time > RETENTION_MS
        ) {
          segment.marked = true
        }
      }
    }

    if (step.op === 'purge') {
      state.segments = state.segments.filter((segment) => !segment.marked)
    }
  }

  return state
}

function recordClasses(
  state: 'active' | 'closed' | 'marked',
  isNew: boolean,
): string {
  const base =
    'relative min-w-[78px] rounded-md border bg-white px-2 py-1 text-center text-[11px] leading-5 transition-colors duration-300 motion-reduce:transition-none dark:bg-slate-900'
  const tone =
    state === 'active'
      ? 'border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-200'
      : state === 'marked'
        ? 'border-rose-300 text-rose-800 dark:border-rose-800 dark:text-rose-200'
        : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'

  return `${base} ${tone} ${isNew ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''}`
}

export function RetentionSimulator() {
  const [stepIndex, setStepIndex] = useState(0)

  const step = STEPS[stepIndex]
  const state = buildState(stepIndex)
  const isLast = stepIndex === STEPS.length - 1

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2.5 dark:border-slate-800">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            شبیه‌ساز گام‌به‌گام
          </span>
          <h3 className="m-0 text-[15px] font-extrabold leading-6 text-slate-900 dark:text-white">
            از اولین رکورد تا حذف اولین سگمنت
          </h3>
        </div>
        <Badge variant="primary" size="sm" className="mt-0.5 shrink-0">
          گام {toPersianDigits(stepIndex + 1)} از{' '}
          {toPersianDigits(STEPS.length)}
        </Badge>
      </div>

      <div
        dir="ltr"
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-start font-mono text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400"
      >
        <span>
          topic:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {SOURCE}
          </span>
        </span>
        <span>
          partition:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            0
          </span>
        </span>
        {CONFIG.map((item) => (
          <span key={item.key}>
            {item.key} ={' '}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {item.value}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label="پیشرفت شبیه‌ساز"
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-300 motion-reduce:transition-none dark:bg-primary-400"
            style={{
              width: `${(stepIndex / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
            disabled={stepIndex === 0}
            startIcon={
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            }
          >
            گام قبل
          </Button>
          <Button
            size="sm"
            onClick={() =>
              setStepIndex((current) =>
                Math.min(current + 1, STEPS.length - 1),
              )
            }
            disabled={isLast}
            startIcon={
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            }
          >
            گام بعد
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStepIndex(0)}
            startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            از اول
          </Button>
          <span className="ms-auto text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            گام {toPersianDigits(stepIndex + 1)} از{' '}
            {toPersianDigits(STEPS.length)}
          </span>
        </div>
      </div>

      <div
        aria-live="polite"
        className="mt-2.5 rounded-xl border border-slate-200 border-s-4 border-s-primary-500 bg-white p-3 dark:border-slate-800 dark:border-s-primary-400"
      >
        <p
          dir="ltr"
          className="m-0 text-start font-mono text-[11px] text-primary-600 dark:text-primary-400"
        >
          {formatStamp(state.now)}
        </p>
        <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
          {step.title}
        </p>
        <p className="mt-1 text-[13px] leading-7 text-slate-700 dark:text-slate-300">
          {step.body}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {state.segments.map((segment) => {
          const isActive = !segment.closed
          const newest = segment.records[segment.records.length - 1]
          const age = newest ? state.now - newest.time : 0
          const overdue = Boolean(newest) && age > RETENTION_MS
          const percentage = newest
            ? Math.min(100, (age / RETENTION_MS) * 100)
            : 0
          const tone: 'active' | 'closed' | 'marked' = isActive
            ? 'active'
            : segment.marked
              ? 'marked'
              : 'closed'

          const containerClass = isActive
            ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/25'
            : segment.marked
              ? 'border-dashed border-rose-300 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-950/25'
              : 'border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-950/40'

          const badgeClass = isActive
            ? 'text-emerald-700 dark:text-emerald-300'
            : segment.marked
              ? 'text-rose-700 dark:text-rose-300'
              : 'text-slate-600 dark:text-slate-300'

          const badgeLabel = isActive
            ? 'سگمنت فعال'
            : segment.marked
              ? 'علامت‌خورده برای حذف'
              : 'سگمنت بسته'

          const suffix = segment.marked ? '.deleted' : ''
          const base = padOffset(segment.base)

          return (
            <div
              key={segment.base}
              className={`rounded-xl border-2 p-3 transition-colors duration-300 motion-reduce:transition-none ${containerClass}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs font-extrabold ${badgeClass}`}>
                  {badgeLabel}
                </span>
                <span className="flex items-baseline gap-1.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  <span>base offset</span>
                  <Ltr className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {base}
                  </Ltr>
                </span>
              </div>

              <p
                dir="ltr"
                className="m-0 mt-1 text-start font-mono text-[10px] leading-5 text-slate-400 dark:text-slate-500"
              >
                <span className="opacity-70">files:</span>
                {` .log${suffix} · .index${suffix} · .timeindex${suffix}`}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {segment.records.length === 0 ? (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    هنوز رکوردی ندارد
                  </span>
                ) : (
                  segment.records.map((record) => (
                    <span
                      key={record.offset}
                      className={recordClasses(
                        tone,
                        record.offset === state.newOffset,
                      )}
                    >
                      <span
                        dir="ltr"
                        className="block font-mono text-[12px] font-bold"
                      >
                        offset {record.offset}
                      </span>
                      <span
                        dir="ltr"
                        className="block font-mono text-[10px] text-slate-500 dark:text-slate-400"
                      >
                        {formatStamp(record.time).slice(5)}
                      </span>
                    </span>
                  ))
                )}
              </div>

              {newest ? (
                <>
                  <p className="m-0 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    سن جدیدترین رکورد این سگمنت: {formatAge(age)} از{' '}
                    {toPersianDigits(7)} روز
                  </p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${
                        overdue
                          ? 'bg-rose-500'
                          : isActive
                            ? 'bg-emerald-500'
                            : 'bg-slate-400 dark:bg-slate-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {overdue && isActive ? (
                    <p className="m-0 mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      از ۷ روز گذشته، اما چون فعال است حذف نمی‌شود.
                    </p>
                  ) : null}
                  {overdue && segment.marked ? (
                    <p className="m-0 mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      از ۷ روز گذشته و در بررسی Log Cleaner علامت خورده است.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40" />
          سگمنت فعال
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40" />
          سگمنت بسته
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-dashed border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40" />
          علامت‌خورده برای حذف
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-amber-400 bg-white dark:bg-slate-900" />
          رکورد تازه
        </span>
      </div>

      <p className="mt-2.5 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، تعداد رکوردها و فاصله‌های زمانی کم گرفته شده‌اند؛ منطق همان
        چیزی است که کافکا اجرا می‌کند: بسته‌شدن سگمنت با{' '}
        <Ltr>segment.ms</Ltr>، بررسی دوره‌ای سگمنت‌های بسته، و حذف کل سگمنت بر
        اساس جدیدترین رکوردش.
      </p>
    </div>
  )
}
