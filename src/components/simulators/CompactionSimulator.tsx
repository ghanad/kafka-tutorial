import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import type { BadgeVariant } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/persianDigits'

const DAY_MS = 86_400_000
const SEGMENT_MS = 7 * DAY_MS
const TOMBSTONE_RETENTION_MS = DAY_MS

type StepOp = 'init' | 'append' | 'scan' | 'clean'

interface Step {
  at: string
  op: StepOp
  title: string
  body: ReactNode
  key?: string
  value?: string | null
}

interface DemoRecord {
  offset: number
  key: string
  value: string | null
  time: number
  obsolete: boolean
  holdUntil: number
}

interface DemoSegment {
  base: number
  records: DemoRecord[]
  closed: boolean
}

interface DemoState {
  segments: DemoSegment[]
  nextOffset: number
  newOffset: number
  now: number
  cleanedTo: number
}

const STEPS: Step[] = [
  {
    at: '2026-11-01T08:00',
    op: 'init',
    title: 'شروع: لاگ خالی',
    body: (
      <>
        هر رکورد یک <strong>کلید</strong> دارد (شناسه کاربر) و یک مقدار (پروفایل
        او). هدف Compaction این نیست که رکوردها با گذشت زمان پاک شوند؛ هدفش این
        است که برای هر کلید دست‌کم آخرین مقدار همیشه بماند. رنگ نوار بالای هر
        رکورد نشان‌دهنده کلید آن است.
      </>
    ),
  },
  {
    at: '2026-11-01T09:00',
    op: 'append',
    key: 'u1',
    value: 'Ali, Tehran',
    title: 'اولین رکورد',
    body: (
      <>
        کلید <Ltr className="font-mono">u1</Ltr> با مقدار «Ali, Tehran». آفست‌ها
        مثل قبل پشت‌سرهم می‌آیند و رکورد فقط به انتهای لاگ اضافه می‌شود.
      </>
    ),
  },
  {
    at: '2026-11-01T11:30',
    op: 'append',
    key: 'u2',
    value: 'Sara, Shiraz',
    title: 'کلید دوم',
    body: (
      <>
        کاربر <Ltr className="font-mono">u2</Ltr> هم ثبت می‌شود.
      </>
    ),
  },
  {
    at: '2026-11-02T15:00',
    op: 'append',
    key: 'u1',
    value: 'Ali, Karaj',
    title: 'مقدار u1 عوض می‌شود',
    body: (
      <>
        شهر <Ltr className="font-mono">u1</Ltr> تغییر کرد. رکورد قبلی{' '}
        <Ltr className="font-mono">u1</Ltr> (آفست ۰) پاک نمی‌شود؛ رکورد تازه فقط
        اضافه می‌شود. فعلاً هر دو در لاگ هستند و در پایین صفحه می‌بینید که
        مصرف‌کننده فقط آخرین مقدار را مهم می‌داند.
      </>
    ),
  },
  {
    at: '2026-11-04T10:00',
    op: 'append',
    key: 'u3',
    value: 'Reza, Tabriz',
    title: 'کاربر سوم',
    body: (
      <>
        کاربر <Ltr className="font-mono">u3</Ltr> ثبت می‌شود.
      </>
    ),
  },
  {
    at: '2026-11-05T08:20',
    op: 'append',
    key: 'u2',
    value: 'Sara, Isfahan',
    title: 'مقدار u2 عوض می‌شود',
    body: (
      <>
        مقدار تازه <Ltr className="font-mono">u2</Ltr> با آفست ۴ اضافه می‌شود.
      </>
    ),
  },
  {
    at: '2026-11-09T10:00',
    op: 'append',
    key: 'u3',
    value: null,
    title: 'Tombstone: حذف کاربر u3',
    body: (
      <>
        برای حذف یک کلید، رکوردی با همان کلید و مقدار <Ltr>null</Ltr> نوشته
        می‌شود (Tombstone). عمر سگمنت اول ۸ روز است و از <Ltr>segment.ms</Ltr>{' '}
        بیشتر، پس بسته می‌شود و سگمنت جدیدی با{' '}
        <Ltr className="font-mono">base offset</Ltr> ۵ ساخته می‌شود. نکته مهم:
        Compaction فقط روی سگمنت‌های <strong>بسته</strong> کار می‌کند.
      </>
    ),
  },
  {
    at: '2026-11-10T12:00',
    op: 'append',
    key: 'u4',
    value: 'Mina, Rasht',
    title: 'کاربر چهارم',
    body: <>رکورد در سگمنت فعال نوشته می‌شود.</>,
  },
  {
    at: '2026-11-11T09:30',
    op: 'append',
    key: 'u1',
    value: 'Ali, Mashhad',
    title: 'مقدار u1 دوباره عوض می‌شود',
    body: (
      <>
        حالا <Ltr className="font-mono">u1</Ltr> سه مقدار در لاگ دارد (آفست‌های ۰،
        ۲ و ۷).
      </>
    ),
  },
  {
    at: '2026-11-12T09:00',
    op: 'scan',
    title: 'Log Cleaner لاگ را اسکن می‌کند',
    body: (
      <>
        لاگ دو بخش دارد: <strong>clean</strong> (قبلاً فشرده شده) و{' '}
        <strong>dirty</strong> (هنوز نشده). الان سگمنت اول dirty است و نسبت dirty
        برابر ۱۰۰٪ است، یعنی از <Ltr>min.cleanable.dirty.ratio</Ltr> (۰.۵) بیشتر؛
        پس Log Cleaner کارش را شروع می‌کند. سگمنت فعال اسکن نمی‌شود. Cleaner یک{' '}
        <strong>offset map</strong> می‌سازد: آخرین آفست هر کلید در بخش dirty (
        <Ltr className="font-mono">u1→2</Ltr>، <Ltr className="font-mono">u2→4</Ltr>
        ، <Ltr className="font-mono">u3→3</Ltr>). رکوردهایی که آفست‌شان کمتر از
        این نقشه است منسوخ‌اند (کم‌رنگ).
      </>
    ),
  },
  {
    at: '2026-11-12T09:02',
    op: 'clean',
    title: 'سگمنت بازنویسی می‌شود',
    body: (
      <>
        رکوردهای ۰ و ۱ کنار گذاشته شدند.{' '}
        <strong>آفست رکوردهای باقی‌مانده تغییر نمی‌کند</strong>؛ فقط بین آن‌ها
        فاصله می‌افتد (۲، ۳، ۴). حالا این سگمنت در بخش clean است.
      </>
    ),
  },
  {
    at: '2026-11-17T08:00',
    op: 'append',
    key: 'u2',
    value: 'Sara, Yazd',
    title: 'سگمنت بسته می‌شود و رکورد جدید می‌آید',
    body: (
      <>
        سگمنت دوم (از ۲۰۲۶-۱۱-۰۹ ۱۰:۰۰) نزدیک ۸ روز عمر دارد و بسته می‌شود. رکورد
        آفست ۸ در سگمنت فعال جدید می‌نشیند.
      </>
    ),
  },
  {
    at: '2026-11-17T08:05',
    op: 'scan',
    title: 'Log Cleaner: عبور دوم',
    body: (
      <>
        بخش clean سه رکورد دارد (۲، ۳، ۴) و بخش dirty سه رکورد (۵، ۶، ۷). نسبت
        dirty برابر ۰.۵ است و به آستانه می‌رسد. offset map از بخش dirty:{' '}
        <Ltr className="font-mono">u3→5</Ltr>، <Ltr className="font-mono">u4→6</Ltr>
        ، <Ltr className="font-mono">u1→7</Ltr>. پس رکورد ۲ (
        <Ltr className="font-mono">u1</Ltr>) و رکورد ۳ (<Ltr className="font-mono">u3</Ltr>
        ) منسوخ‌اند. اما رکورد ۴ (<Ltr className="font-mono">u2</Ltr>) منسوخ نیست!
        مقدار تازه <Ltr className="font-mono">u2</Ltr> در آفست ۸ است ولی در سگمنت
        فعال می‌نشیند و اسکن نمی‌شود. Tombstone در آفست ۵ آخرین رکورد{' '}
        <Ltr className="font-mono">u3</Ltr> است و فعلاً می‌ماند.
      </>
    ),
  },
  {
    at: '2026-11-17T08:06',
    op: 'clean',
    title: 'بازنویسی و نگه‌داری Tombstone',
    body: (
      <>
        رکوردهای ۲ و ۳ حذف شدند. Tombstone (آفست ۵) هنوز مانده، چون مصرف‌کننده‌ای
        که عقب است باید بفهمد <Ltr className="font-mono">u3</Ltr> حذف شده است.
        کافکا آن را دست‌کم <Ltr>delete.retention.ms</Ltr> (۱ روز) بعد از اولین
        عبور Cleaner نگه می‌دارد، یعنی تا ۲۰۲۶-۱۱-۱۸ ۰۸:۰۶.
      </>
    ),
  },
  {
    at: '2026-11-20T14:00',
    op: 'append',
    key: 'u1',
    value: 'Ali, Qom',
    title: 'رکورد جدید',
    body: (
      <>
        <Ltr className="font-mono">u1</Ltr> مقدار تازه‌ای می‌گیرد (آفست ۹).
      </>
    ),
  },
  {
    at: '2026-11-22T10:00',
    op: 'append',
    key: 'u5',
    value: 'Omid, Ahvaz',
    title: 'کاربر پنجم',
    body: (
      <>
        کلید <Ltr className="font-mono">u5</Ltr> برای اولین بار می‌آید.
      </>
    ),
  },
  {
    at: '2026-11-24T07:00',
    op: 'append',
    key: 'u4',
    value: 'Mina, Tabriz',
    title: 'مقدار u4 عوض می‌شود',
    body: (
      <>
        مقدار تازه <Ltr className="font-mono">u4</Ltr> با آفست ۱۱ اضافه می‌شود.
      </>
    ),
  },
  {
    at: '2026-11-25T09:00',
    op: 'append',
    key: 'u2',
    value: 'Sara, Kerman',
    title: 'سگمنت فعال بسته می‌شود',
    body: (
      <>
        عمر سگمنت فعال از ۷ روز گذشت (از ۲۰۲۶-۱۱-۱۷ ۰۸:۰۰). بسته می‌شود و رکورد
        ۱۲ اولین رکورد سگمنت فعال تازه است.
      </>
    ),
  },
  {
    at: '2026-11-25T09:05',
    op: 'scan',
    title: 'Log Cleaner: عبور سوم',
    body: (
      <>
        بخش clean چهار رکورد دارد و بخش dirty چهار رکورد (۸ تا ۱۱). نسبت dirty
        برابر ۰.۵ است. offset map:{' '}
        <Ltr className="font-mono">u2→8</Ltr>، <Ltr className="font-mono">u1→9</Ltr>
        ، <Ltr className="font-mono">u5→10</Ltr>،{' '}
        <Ltr className="font-mono">u4→11</Ltr>. رکوردهای ۴، ۶ و ۷ منسوخ‌اند.
        Tombstone (آفست ۵) هم منسوخ می‌شود، چون زمان نگه‌داری‌اش (تا ۲۰۲۶-۱۱-۱۸)
        گذشته و رکورد جدیدتری برای <Ltr className="font-mono">u3</Ltr> نیست.
      </>
    ),
  },
  {
    at: '2026-11-25T09:06',
    op: 'clean',
    title: 'پایان: برای هر کلید یک مقدار',
    body: (
      <>
        سگمنت‌هایی که خالی شدند از بین رفتند و <Ltr className="font-mono">u3</Ltr>{' '}
        به‌کلی از لاگ ناپدید شد. برای <Ltr className="font-mono">u1</Ltr>،{' '}
        <Ltr className="font-mono">u4</Ltr> و <Ltr className="font-mono">u5</Ltr>{' '}
        فقط آخرین مقدار مانده است. <Ltr className="font-mono">u2</Ltr> دو رکورد
        دارد (۸ و ۱۲) چون رکورد ۱۲ در سگمنت فعال است؛ رکورد ۸ در عبور بعدی حذف
        می‌شود. خروجی برای مصرف‌کننده‌ای که از ابتدا بخواند، همان آخرین مقدار هر
        کلید است.
      </>
    ),
  },
]

const CONFIG: { key: string; value: string }[] = [
  { key: 'cleanup.policy', value: 'compact' },
  { key: 'min.cleanable.dirty.ratio', value: '0.5' },
  { key: 'delete.retention.ms', value: '1 day' },
  { key: 'segment.ms', value: '7 days' },
  { key: 'min.compaction.lag.ms', value: '0' },
]

const OP_LABELS: Record<StepOp, { label: string; variant: BadgeVariant }> = {
  init: { label: 'شروع', variant: 'neutral' },
  append: { label: 'نوشتن رکورد', variant: 'primary' },
  scan: { label: 'اسکن Log Cleaner', variant: 'warning' },
  clean: { label: 'بازنویسی سگمنت', variant: 'success' },
}

interface KeyTone {
  top: string
  text: string
  pill: string
}

const KEY_TONES: KeyTone[] = [
  {
    top: 'border-t-rose-400 dark:border-t-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    pill: 'border-rose-300 dark:border-rose-800',
  },
  {
    top: 'border-t-sky-400 dark:border-t-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    pill: 'border-sky-300 dark:border-sky-800',
  },
  {
    top: 'border-t-violet-400 dark:border-t-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    pill: 'border-violet-300 dark:border-violet-800',
  },
  {
    top: 'border-t-amber-400 dark:border-t-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    pill: 'border-amber-300 dark:border-amber-800',
  },
  {
    top: 'border-t-emerald-400 dark:border-t-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    pill: 'border-emerald-300 dark:border-emerald-800',
  },
]

function keyTone(key: string): KeyTone {
  const parsed = Number(key.replace(/\D/g, ''))
  const index = Number.isFinite(parsed) && parsed > 0 ? (parsed - 1) % KEY_TONES.length : 0
  return KEY_TONES[index]
}

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

function buildState(stepIndex: number): DemoState {
  const state: DemoState = {
    segments: [{ base: 0, records: [], closed: false }],
    nextOffset: 0,
    newOffset: -1,
    now: parseStamp(STEPS[0].at),
    cleanedTo: 0,
  }

  for (let index = 1; index <= stepIndex; index += 1) {
    const step = STEPS[index]
    state.now = parseStamp(step.at)
    state.newOffset = -1

    if (step.op === 'append') {
      let active = state.segments[state.segments.length - 1]
      const first = active.records[0]

      if (first && state.now - first.time >= SEGMENT_MS) {
        active.closed = true
        active = { base: state.nextOffset, records: [], closed: false }
        state.segments.push(active)
      }

      active.records.push({
        offset: state.nextOffset,
        key: step.key ?? '',
        value: step.value ?? null,
        time: state.now,
        obsolete: false,
        holdUntil: 0,
      })
      state.newOffset = state.nextOffset
      state.nextOffset += 1
      continue
    }

    for (const segment of state.segments) {
      for (const record of segment.records) {
        record.obsolete = false
      }
    }

    const latestByKey = new Map<string, number>()
    for (const segment of state.segments) {
      if (!segment.closed) continue
      for (const record of segment.records) {
        if (record.offset >= state.cleanedTo) {
          latestByKey.set(record.key, record.offset)
        }
      }
    }

    const isObsolete = (record: DemoRecord): boolean => {
      const latest = latestByKey.get(record.key)
      const isLatest = latest === undefined || record.offset >= latest
      const expiredTombstone =
        record.value === null && record.holdUntil > 0 && state.now > record.holdUntil
      return !isLatest || expiredTombstone
    }

    if ((step.op === 'scan' && index === stepIndex) || step.op === 'clean') {
      for (const segment of state.segments) {
        if (!segment.closed) continue
        for (const record of segment.records) {
          record.obsolete = isObsolete(record)
        }
      }
    }

    if (step.op === 'clean') {
      for (const segment of state.segments) {
        if (!segment.closed) continue
        segment.records = segment.records.filter((record) => !record.obsolete)
        for (const record of segment.records) {
          if (record.value === null && record.holdUntil === 0) {
            record.holdUntil = state.now + TOMBSTONE_RETENTION_MS
          }
        }
      }

      state.segments = state.segments.filter(
        (segment) => !segment.closed || segment.records.length > 0,
      )
      state.cleanedTo = state.segments[state.segments.length - 1].base
    }
  }

  return state
}

export function CompactionSimulator() {
  const [stepIndex, setStepIndex] = useState(0)

  const step = STEPS[stepIndex]
  const state = buildState(stepIndex)
  const isLast = stepIndex === STEPS.length - 1
  const op = OP_LABELS[step.op]

  let cleanRecords = 0
  let dirtyRecords = 0
  let totalRecords = 0

  for (const segment of state.segments) {
    totalRecords += segment.records.length
    if (!segment.closed) continue
    for (const record of segment.records) {
      if (record.offset < state.cleanedTo) cleanRecords += 1
      else dirtyRecords += 1
    }
  }

  const dirtyRatio =
    cleanRecords + dirtyRecords > 0
      ? (dirtyRecords / (cleanRecords + dirtyRecords)).toFixed(2)
      : null

  const latestByKey = new Map<string, DemoRecord>()
  for (const segment of state.segments) {
    for (const record of segment.records) {
      latestByKey.set(record.key, record)
    }
  }
  const keySummary = Array.from(latestByKey.entries()).sort(([a], [b]) =>
    a.localeCompare(b, 'en'),
  )

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2.5 dark:border-slate-800">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            شبیه‌ساز گام‌به‌گام
          </span>
          <h3 className="m-0 text-[15px] font-extrabold leading-6 text-slate-900 dark:text-white">
            Log Compaction: فقط آخرین مقدار هر کلید
          </h3>
        </div>
        <Badge variant="primary" size="sm" className="mt-0.5 shrink-0">
          گام {toPersianDigits(stepIndex + 1)} از {toPersianDigits(STEPS.length)}
        </Badge>
      </div>

      <div
        dir="ltr"
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-start font-mono text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400"
      >
        <span>
          topic:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">user-profiles</span>
        </span>
        <span>
          partition:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">0</span>
        </span>
        {CONFIG.map((item) => (
          <span key={item.key}>
            {item.key} ={' '}
            <span className="font-bold text-slate-700 dark:text-slate-200">{item.value}</span>
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
            style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
            disabled={stepIndex === 0}
            startIcon={<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            گام قبل
          </Button>
          <Button
            size="sm"
            onClick={() =>
              setStepIndex((current) => Math.min(current + 1, STEPS.length - 1))
            }
            disabled={isLast}
            startIcon={<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />}
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
            گام {toPersianDigits(stepIndex + 1)} از {toPersianDigits(STEPS.length)}
          </span>
        </div>
      </div>

      <div
        aria-live="polite"
        className="mt-2.5 rounded-xl border border-slate-200 border-s-4 border-s-primary-500 bg-white p-3 dark:border-slate-800 dark:border-s-primary-400"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            dir="ltr"
            className="font-mono text-[11px] text-primary-600 dark:text-primary-400"
          >
            {formatStamp(state.now)}
          </span>
          <Badge variant={op.variant} size="sm">
            {op.label}
          </Badge>
        </div>
        <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
          {step.title}
        </p>
        <p className="mt-1 text-[13px] leading-7 text-slate-700 dark:text-slate-300">
          {step.body}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
        <span>
          log-end-offset:{' '}
          <Ltr className="font-mono font-bold text-slate-800 dark:text-slate-100">
            {state.nextOffset}
          </Ltr>
        </span>
        <span>
          رکوردهای موجود:{' '}
          <span className="font-bold text-slate-800 dark:text-slate-100">
            {toPersianDigits(totalRecords)}
          </span>
        </span>
        <span>
          نسبت dirty:{' '}
          <Ltr className="font-mono font-bold text-slate-800 dark:text-slate-100">
            {dirtyRatio ?? '—'}
          </Ltr>
        </span>
        <span>
          سگمنت‌ها:{' '}
          <span className="font-bold text-slate-800 dark:text-slate-100">
            {toPersianDigits(state.segments.length)}
          </span>
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {state.segments.map((segment) => {
          const isActive = !segment.closed
          const isDirty =
            segment.closed &&
            segment.records.length > 0 &&
            segment.records[0].offset >= state.cleanedTo

          const containerClass = isActive
            ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/25'
            : isDirty
              ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/25'
              : 'border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-950/40'

          const badgeClass = isActive
            ? 'text-emerald-700 dark:text-emerald-300'
            : isDirty
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-slate-600 dark:text-slate-300'

          const badgeLabel = isActive
            ? 'سگمنت فعال (Compaction نمی‌شود)'
            : isDirty
              ? 'بسته، بخش dirty'
              : 'بسته، بخش clean'

          return (
            <div
              key={segment.base}
              className={`rounded-xl border-2 p-3 transition-colors duration-300 motion-reduce:transition-none ${containerClass}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs font-extrabold ${badgeClass}`}>{badgeLabel}</span>
                <span className="flex items-baseline gap-1.5">
                  <Ltr className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    {`${padOffset(segment.base)}.log`}
                  </Ltr>
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {segment.records.length === 0 ? (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    هنوز رکوردی ندارد
                  </span>
                ) : (
                  segment.records.map((record) => {
                    const tone = keyTone(record.key)
                    const isNew = record.offset === state.newOffset

                    return (
                      <span
                        key={record.offset}
                        dir="ltr"
                        className={cn(
                          'min-w-[104px] rounded-lg border border-slate-200 border-t-4 bg-white px-2 py-1 text-center text-[11px] leading-5 transition-colors duration-300 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900',
                          tone.top,
                          record.obsolete && 'border-dashed border-rose-300 opacity-60 dark:border-rose-800',
                          isNew &&
                            'ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-900',
                        )}
                      >
                        <span className="block font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          offset {record.offset}
                        </span>
                        <span
                          className={cn(
                            'block font-mono text-[12px] font-bold',
                            tone.text,
                            record.obsolete && 'line-through',
                          )}
                        >
                          {record.key}
                        </span>
                        <span
                          className={cn(
                            'block font-mono text-[11px]',
                            record.value === null
                              ? 'font-semibold text-rose-600 dark:text-rose-400'
                              : 'text-slate-700 dark:text-slate-200',
                            record.obsolete && 'line-through',
                          )}
                        >
                          {record.value === null ? 'null (tombstone)' : record.value}
                        </span>
                        <span className="block font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          {formatStamp(record.time).slice(5)}
                        </span>
                      </span>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
        <p className="m-0 text-xs font-extrabold text-slate-800 dark:text-slate-100">
          آنچه یک مصرف‌کننده برای هر کلید می‌بیند (آخرین مقدار)
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {keySummary.length === 0 ? (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              هنوز کلیدی در لاگ نیست.
            </span>
          ) : (
            keySummary.map(([key, record]) => {
              const tone = keyTone(key)
              const deleted = record.value === null

              return (
                <span
                  key={key}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-0.5 text-[11px] dark:bg-slate-900',
                    deleted ? 'border-dashed border-slate-300 dark:border-slate-700' : tone.pill,
                  )}
                >
                  <Ltr className={cn('font-mono font-bold', deleted ? 'text-slate-400 line-through dark:text-slate-500' : tone.text)}>
                    {key}
                  </Ltr>
                  <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
                    →
                  </span>
                  {deleted ? (
                    <span className="font-semibold text-rose-600 line-through dark:text-rose-400">
                      حذف‌شده
                    </span>
                  ) : (
                    <Ltr className="font-mono text-slate-700 dark:text-slate-200">
                      {record.value}
                    </Ltr>
                  )}
                </span>
              )
            })
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40" />
          سگمنت فعال
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40" />
          بخش dirty
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40" />
          بخش clean
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-dashed border-rose-300 bg-white dark:border-rose-800 dark:bg-slate-900" />
          منسوخ، در این عبور حذف می‌شود
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-amber-400 bg-white dark:bg-slate-900" />
          رکورد تازه
        </span>
      </div>

      <p className="mt-2.5 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        منطق همین چیزی است که کافکا اجرا می‌کند: بسته‌شدن سگمنت با{' '}
        <Ltr>segment.ms</Ltr>، پاک‌سازی فقط روی سگمنت‌های بسته، نگه‌داشتن آخرین
        مقدار هر کلید، و ماندن Tombstone تا پایان <Ltr>delete.retention.ms</Ltr>.
        آفست رکوردهای باقی‌مانده هم تغییر نمی‌کند.
      </p>
    </div>
  )
}
