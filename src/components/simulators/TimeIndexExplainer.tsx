import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'

const BASE_OFFSET = 1000
const INDEX_INTERVAL = 4096
const TARGET_TS = 27_000
const BASE_TS = 10 * 60 * 60 * 1000

interface Rec {
  offset: number
  /** میلی‌ثانیه بعد از ۱۰:۰۰:۰۰ */
  ts: number
  size: number
}

/**
 * برخلاف ایندکس آفست که کلیدش آفست است، اینجا کلید زمان است.
 * رکورد offset 1005 عمداً timestamp قدیمی‌تری دارد تا رفتار
 * CreateTime و منطق «بزرگ‌ترین timestamp تا اینجا» دیده شود.
 */
const RECORDS: Rec[] = [
  { offset: 1000, ts: 0, size: 900 },
  { offset: 1001, ts: 4_000, size: 1_300 },
  { offset: 1002, ts: 9_000, size: 1_100 },
  { offset: 1003, ts: 14_000, size: 1_500 },
  { offset: 1004, ts: 19_000, size: 1_000 },
  { offset: 1005, ts: 2_000, size: 1_200 },
  { offset: 1006, ts: 23_000, size: 1_400 },
  { offset: 1007, ts: 31_000, size: 900 },
  { offset: 1008, ts: 36_000, size: 1_300 },
  { offset: 1009, ts: 41_000, size: 1_100 },
]

const POSITIONS: number[] = []
{
  let position = 0
  for (const rec of RECORDS) {
    POSITIONS.push(position)
    position += rec.size
  }
}

const MAX_SO_FAR: { ts: number; offset: number }[] = []
{
  let max = -1
  let maxOffset = BASE_OFFSET
  for (const rec of RECORDS) {
    if (rec.ts > max) {
      max = rec.ts
      maxOffset = rec.offset
    }
    MAX_SO_FAR.push({ ts: max, offset: maxOffset })
  }
}

const ENTRY_ROWS: number[] = []
const BYTES_SINCE_ENTRY: number[] = []
{
  let since = 0
  RECORDS.forEach((rec, row) => {
    if (since > INDEX_INTERVAL) {
      ENTRY_ROWS.push(row)
      since = 0
    }
    since += rec.size
    BYTES_SINCE_ENTRY.push(since)
  })
}

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

function fa(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)])
}

function clock(ts: number): string {
  const totalSeconds = Math.floor((BASE_TS + ts) / 1000)
  const hours = Math.floor(totalSeconds / 3600) % 24
  const minutes = Math.floor(totalSeconds / 60) % 60
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

type Mark = 'ok' | 'acc' | 'no' | 'skip' | 'warn'

interface SnapshotState {
  stage: 1 | 2
  rows: number
  tEntries: number
  iEntries: number
  counter: number
  log: Record<number, Mark>
  dim: number[]
  tMark: Record<number, Mark>
  iMark: Record<number, Mark>
  tArrow: number | null
  iArrow: number | null
  cursor: number | null
  q: number
}

interface Snapshot extends SnapshotState {
  caption: string
}

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    stage: 1,
    rows: 0,
    tEntries: 0,
    iEntries: 0,
    counter: 0,
    log: {},
    dim: [],
    tMark: {},
    iMark: {},
    tArrow: null,
    iArrow: null,
    cursor: null,
    q: 0,
  }

  const warnRows: number[] = []
  let entryRow: number | null = null

  const logMarks = (): Record<number, Mark> => {
    const marks: Record<number, Mark> = {}
    for (const row of warnRows) marks[row] = 'warn'
    if (entryRow !== null) marks[entryRow] = 'acc'
    return marks
  }

  const push = (caption: string, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    `سگمنت تازه با baseOffset = ${fa(BASE_OFFSET)} باز شده است. فایل \u200e.log\u200e خالی است و \u200e.timeindex\u200e هم خالی. حالا رکوردها را یکی‌یکی می‌نویسیم و می‌بینیم ایندکس زمانی کجا ساخته می‌شود.`,
  )

  let tEntries = 0
  let iEntries = 0

  RECORDS.forEach((rec, row) => {
    const previousCounter = row === 0 ? 0 : BYTES_SINCE_ENTRY[row - 1]
    const isEntryRow = ENTRY_ROWS.includes(row)
    const isOutOfOrder = row > 0 && rec.ts < MAX_SO_FAR[row - 1].ts
    entryRow = null

    push(
      `رکورد offset ${fa(rec.offset)} با timestamp ${fa(clock(rec.ts))} در position ${fa(POSITIONS[row])} نوشته شد (${fa(rec.size)} بایت).`,
      {
        rows: row + 1,
        counter: previousCounter,
        log: logMarks(),
        cursor: row,
        tArrow: null,
        iArrow: null,
      },
    )

    if (isEntryRow) {
      const max = MAX_SO_FAR[row]
      tEntries += 1
      iEntries += 1
      entryRow = row
      push(
        `از آخرین ورودی ایندکس ${fa(previousCounter)} بایت گذشته؛ بیشتر از ${fa(INDEX_INTERVAL)} بایت. پس کافکا هم‌زمان دو ورودی می‌سازد: \u200e.index\u200e با (relative ${fa(row)} → position ${fa(POSITIONS[row])}) و \u200e.timeindex\u200e با (timestamp ${fa(clock(max.ts))} → relative ${fa(max.offset - BASE_OFFSET)}). این timestamp بزرگ‌ترین مقدار دیده‌شده تا این آفست است؛ در این گام اتفاقاً با timestamp رکورد فعلی یکی است، اما در گام بعد می‌بینید که همیشه این‌طور نیست.`,
        {
          tEntries,
          iEntries,
          counter: BYTES_SINCE_ENTRY[row],
          cursor: null,
          log: logMarks(),
          tArrow: tEntries - 1,
          iArrow: iEntries - 1,
        },
      )
    } else if (isOutOfOrder) {
      warnRows.push(row)
      push(
        `این رکورد «عقب‌گرد» دارد: timestamp آن ${fa(clock(rec.ts))} است، یعنی قدیمی‌تر از رکورد قبلی. با CreateTime (پیش‌فرض) ساعت تولیدکننده‌ها هماهنگ نیست و پیام می‌تواند دیر برسد. چون این timestamp از بزرگ‌ترین مقدار قبلی (${fa(clock(MAX_SO_FAR[row - 1].ts))}) بزرگ‌تر نیست، حتی اگر نوبت ساخت ورودی هم برسد، در \u200e.timeindex\u200e ثبت نمی‌شود؛ به همین دلیل زمان‌های داخل این فایل همیشه صعودی می‌مانند.`,
        { log: logMarks(), cursor: row },
      )
    }
  })

  push(
    `حالا مصرف‌کننده آفست نمی‌خواهد؛ زمان می‌خواهد: «اولین رکوردی که timestamp آن ${fa(clock(TARGET_TS))} یا بیشتر است کدام است؟» این همان چیزی است که \u200eoffsetsForTimes\u200e از بروکر می‌پرسد.`,
    { stage: 2, q: 1, log: {}, dim: [], tMark: {}, iMark: {}, tArrow: null, iArrow: null, cursor: null },
  )

  push(
    `گام اول انتخاب سگمنت است: اولین سگمنتی که بزرگ‌ترین timestamp آن از هدف بزرگ‌تر یا مساوی است. گام دوم جست‌وجوی دودویی در \u200e.timeindex\u200e همان سگمنت. ورودی (${fa(clock(36_000))} → ${fa(8)}) از هدف بزرگ‌تر است، پس نمی‌تواند نقطه شروع باشد و کنار گذاشته می‌شود؛ چون دنبال بزرگ‌ترین ورودی با timestamp کوچک‌تر یا مساوی هدف هستیم، ورودی قبلی انتخاب می‌شود.`,
    { tMark: { 1: 'no' } },
  )

  push(
    `بزرگ‌ترین ورودی باقی‌مانده (${fa(clock(19_000))} → ${fa(4)}) از هدف کوچک‌تر است و انتخاب می‌شود. این ورودی می‌گوید بزرگ‌ترین timestamp قبل از آفست ${fa(1004)} برابر ${fa(clock(19_000))} است؛ پس هیچ رکوردی قبل از ${fa(1004)} نمی‌تواند timestamp بزرگ‌تر یا مساوی ${fa(clock(TARGET_TS))} داشته باشد. نقطه شروع اسکن = آفست ${fa(1004)}.`,
    { tMark: { 0: 'ok', 1: 'no' }, tArrow: 0, q: 2 },
  )

  push(
    `حالا \u200e.index\u200e وارد می‌شود: آفست ${fa(1004)} (relative ${fa(4)}) در position ${fa(4800)} است. دو ایندکس دست‌به‌دست هم می‌دهند: یکی زمان را به آفست تبدیل می‌کند، دیگری آفست را به موقعیت فیزیکی.`,
    { iMark: { 0: 'ok' }, iArrow: 0, dim: [0, 1, 2, 3], q: 3, cursor: 4 },
  )

  push(
    `از position ${fa(4800)} می‌پریم؛ رکوردهای قبل از آن هرگز خوانده نمی‌شوند. از اینجا کافکا هدر هر batch را می‌خواند. batch اول بزرگ‌ترین timestamp‌اش ${fa(clock(19_000))} است که از هدف کوچک‌تر است، پس کل batch یک‌جا رد می‌شود.`,
    { log: { 4: 'skip' }, cursor: 5 },
  )

  push(
    `batch بعدی هم رد می‌شود: offset ${fa(1005)} با timestamp ${fa(clock(2_000))}. همین رکورد نشان می‌دهد ترتیب timestamp در فایل لاگ تضمین‌شده نیست؛ کافکا به‌جای حدس زدن، اسکن می‌کند.`,
    { log: { 4: 'skip', 5: 'warn' }, cursor: 6 },
  )

  push(
    `offset ${fa(1006)} با timestamp ${fa(clock(23_000))} هنوز از هدف کوچک‌تر است → رد می‌شود.`,
    { log: { 4: 'skip', 5: 'warn', 6: 'skip' }, cursor: 7 },
  )

  push(
    `offset ${fa(1007)}: بزرگ‌ترین timestamp این batch برابر ${fa(clock(31_000))} و از هدف بزرگ‌تر است. اینجا کافکا متوقف نمی‌شود؛ داخل رکوردهای همین batch می‌رود تا دقیقاً اولین رکورد واجد شرط را پیدا کند.`,
    { log: { 4: 'skip', 5: 'warn', 6: 'skip', 7: 'acc' }, cursor: 7, q: 4 },
  )

  push(
    `پاسخ: آفست ${fa(1007)} با timestamp ${fa(clock(31_000))}؛ اولین رکورد در ترتیب آفست که timestamp آن بزرگ‌تر یا مساوی هدف است. مصرف‌کننده با همین آفست \u200eseek\u200e می‌کند و بقیه لاگ را نمی‌خواند.`,
    {
      q: 5,
      cursor: null,
      dim: [0, 1, 2, 3, 8, 9],
      log: { 4: 'skip', 5: 'warn', 6: 'skip', 7: 'ok' },
    },
  )

  push(
    `جمع‌بندی: با ${fa(tEntries)} ورودی \u200e.timeindex\u200e (هر کدام ${fa(12)} بایت) و ${fa(iEntries)} ورودی \u200e.index\u200e، فقط ${fa(4)} هدر batch خوانده شد و تنها رکوردهای یک batch باز شد؛ نه تمام ${fa(RECORDS.length)} رکورد.`,
    {
      q: 5,
      cursor: null,
      dim: [0, 1, 2, 3, 8, 9],
      log: { 4: 'skip', 5: 'warn', 6: 'skip', 7: 'ok' },
    },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const T_X = 10
const T_W = 232
const I_X = 286
const I_W = 180
const LOG_X = 494
const LOG_W = 286

const SLOT_Y = (slot: number) => 42 + slot * 38
const ROW_Y = (row: number) => 42 + row * 30

function boxClass(mark?: Mark): string {
  switch (mark) {
    case 'ok':
      return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
    case 'acc':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    case 'no':
      return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/60 dark:stroke-rose-500'
    case 'skip':
      return 'fill-slate-100 stroke-slate-300 dark:fill-slate-950 dark:stroke-slate-700'
    case 'warn':
      return 'fill-amber-50 stroke-amber-400 dark:fill-amber-950/50 dark:stroke-amber-500'
    default:
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

export function TimeIndexExplainer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1800)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const autoPlaying = playing && !isLast

  useEffect(() => {
    if (!autoPlaying) return
    const timer = window.setTimeout(
      () => setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1)),
      speed,
    )
    return () => window.clearTimeout(timer)
  }, [autoPlaying, step, speed])

  function goTo(nextStep: number) {
    setPlaying(false)
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, nextStep)))
  }

  function toggleAutoPlay() {
    if (autoPlaying) {
      setPlaying(false)
      return
    }
    if (isLast) setStep(0)
    setPlaying(true)
  }

  const lastRecord = snapshot.rows > 0 ? RECORDS[snapshot.rows - 1] : null
  const maxLine = snapshot.rows > 0 ? MAX_SO_FAR[snapshot.rows - 1] : null

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            .timeindex چطور از یک timestamp به یک آفست می‌رسد؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {step + 1} از {TOTAL_STEPS}
        </Badge>
      </div>

      <div className="mt-4 flex gap-2">
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors ${
            snapshot.stage === 1
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          1 · نوشتن و ساختن ایندکس زمانی
        </div>
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors ${
            snapshot.stage === 2
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          2 · جست‌وجو بر اساس timestamp
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
          startIcon={<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          گام قبلی
        </Button>
        <Button
          size="sm"
          onClick={() => goTo(step + 1)}
          disabled={isLast}
          startIcon={<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          گام بعدی
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={toggleAutoPlay}
          startIcon={
            autoPlaying ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )
          }
        >
          {autoPlaying ? 'توقف' : 'اجرای خودکار'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => goTo(0)}
          startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          از اول
        </Button>
        <label className="ms-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          سرعت
          <select
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value={2800}>آهسته</option>
            <option value={1800}>متوسط</option>
            <option value={900}>سریع</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="whitespace-nowrap tabular-nums">
          گام {step + 1} از {TOTAL_STEPS}
        </span>
        <div className="relative flex h-6 w-full items-center">
          <div
            className="absolute inset-x-0 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"
            aria-hidden="true"
          />
          <div
            className="absolute h-1.5 rounded-full bg-primary-500 dark:bg-primary-400"
            style={{
              insetInlineStart: 0,
              width: `${(step / (TOTAL_STEPS - 1)) * 100}%`,
            }}
            aria-hidden="true"
          />
          <input
            type="range"
            min={0}
            max={TOTAL_STEPS - 1}
            step={1}
            value={step}
            onChange={(event) => goTo(Number(event.target.value))}
            aria-label="انتخاب گام توضیح"
            className="relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-primary-600 dark:[&::-moz-range-thumb]:border-slate-900 dark:[&::-moz-range-thumb]:bg-primary-400 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary-600 [&::-webkit-slider-thumb]:shadow-md dark:[&::-webkit-slider-thumb]:border-slate-900 dark:[&::-webkit-slider-thumb]:bg-primary-400"
          />
        </div>
      </div>

      <div className="mt-3 min-h-[7rem] rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
        <p className="mb-1 text-[10px] font-black text-primary-700 dark:text-primary-300">
          توضیح این گام
        </p>
        <p aria-live="polite" className="m-0 text-sm leading-7">
          {snapshot.caption}
        </p>
      </div>

      <div
        dir="ltr"
        className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-800 dark:bg-slate-950/40"
      >
        <svg
          viewBox="0 0 800 348"
          role="img"
          aria-label="نمای فایل لاگ، ایندکس آفست و ایندکس زمان؛ ساخت ایندکس زمانی و جست‌وجوی یک timestamp"
          className="h-auto w-full min-w-[700px]"
        >
          <text
            x={126}
            y={15}
            textAnchor="middle"
            fontSize={14}
            fontWeight={600}
            className="fill-slate-900 dark:fill-slate-100"
          >
            .timeindex
          </text>
          <text
            x={376}
            y={15}
            textAnchor="middle"
            fontSize={14}
            fontWeight={600}
            className="fill-slate-900 dark:fill-slate-100"
          >
            .index
          </text>
          <text
            x={637}
            y={15}
            textAnchor="middle"
            fontSize={14}
            fontWeight={600}
            className="fill-slate-900 dark:fill-slate-100"
          >
            .log
          </text>

          <text
            x={86}
            y={34}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-500 dark:fill-slate-400"
          >
            timestamp
          </text>
          <text
            x={204}
            y={34}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-500 dark:fill-slate-400"
          >
            rel offset
          </text>
          <text
            x={326}
            y={34}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-500 dark:fill-slate-400"
          >
            rel offset
          </text>
          <text
            x={430}
            y={34}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-500 dark:fill-slate-400"
          >
            position
          </text>
          <text
            x={524}
            y={34}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-500 dark:fill-slate-400"
          >
            position
          </text>
          <text
            x={574}
            y={34}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-500 dark:fill-slate-400"
          >
            offset
          </text>
          <text
            x={640}
            y={34}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-500 dark:fill-slate-400"
          >
            timestamp
          </text>

          {ENTRY_ROWS.map((_, slot) => {
            const y = SLOT_Y(slot) + 17
            const visible = slot < snapshot.tEntries
            const active = snapshot.tArrow === slot

            return (
              <g
                key={`t-arrow-${slot}`}
                className={`transition-opacity duration-500 motion-reduce:transition-none ${
                  visible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <line
                  x1={244}
                  y1={y}
                  x2={278}
                  y2={y}
                  strokeDasharray="4 3"
                  strokeWidth={active ? 2.5 : 1}
                  className={
                    active
                      ? 'stroke-primary-500 dark:stroke-primary-400'
                      : 'stroke-slate-300 dark:stroke-slate-600'
                  }
                />
                <path
                  d={`M276 ${y - 4} L283 ${y} L276 ${y + 4} Z`}
                  className={
                    active
                      ? 'fill-primary-500 dark:fill-primary-400'
                      : 'fill-slate-300 dark:fill-slate-600'
                  }
                />
              </g>
            )
          })}

          {ENTRY_ROWS.map((row, slot) => {
            const y1 = SLOT_Y(slot) + 17
            const y2 = ROW_Y(row) + 13
            const visible = slot < snapshot.iEntries
            const active = snapshot.iArrow === slot

            return (
              <g
                key={`i-arrow-${slot}`}
                className={`transition-opacity duration-500 motion-reduce:transition-none ${
                  visible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <path
                  d={`M468 ${y1} C479 ${y1} 479 ${y2} 490 ${y2}`}
                  fill="none"
                  strokeDasharray="4 3"
                  strokeWidth={active ? 2.5 : 1}
                  className={
                    active
                      ? 'stroke-primary-500 dark:stroke-primary-400'
                      : 'stroke-slate-300 dark:stroke-slate-600'
                  }
                />
                <path
                  d={`M486 ${y2 - 4} L492 ${y2} L486 ${y2 + 4} Z`}
                  className={
                    active
                      ? 'fill-primary-500 dark:fill-primary-400'
                      : 'fill-slate-300 dark:fill-slate-600'
                  }
                />
              </g>
            )
          })}

          {ENTRY_ROWS.map((_, slot) => {
            const y = SLOT_Y(slot)
            const visible = slot < snapshot.tEntries
            const mark = snapshot.tMark[slot]

            return (
              <g
                key={`t-entry-${slot}`}
                className={`transition-opacity duration-500 motion-reduce:transition-none ${
                  visible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <rect
                  x={T_X}
                  y={y}
                  width={T_W}
                  height={34}
                  rx={5}
                  strokeWidth={1}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                    mark,
                  )}`}
                />
                <text
                  x={86}
                  y={y + 22}
                  textAnchor="middle"
                  fontSize={12}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {clock(MAX_SO_FAR[ENTRY_ROWS[slot]].ts)}
                </text>
                <text
                  x={204}
                  y={y + 22}
                  textAnchor="middle"
                  fontSize={12}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {ENTRY_ROWS[slot]}
                </text>
              </g>
            )
          })}

          {ENTRY_ROWS.map((row, slot) => {
            const y = SLOT_Y(slot)
            const visible = slot < snapshot.iEntries
            const mark = snapshot.iMark[slot]

            return (
              <g
                key={`i-entry-${slot}`}
                className={`transition-opacity duration-500 motion-reduce:transition-none ${
                  visible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <rect
                  x={I_X}
                  y={y}
                  width={I_W}
                  height={34}
                  rx={5}
                  strokeWidth={1}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                    mark,
                  )}`}
                />
                <text
                  x={326}
                  y={y + 22}
                  textAnchor="middle"
                  fontSize={12}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {row}
                </text>
                <text
                  x={430}
                  y={y + 22}
                  textAnchor="middle"
                  fontSize={12}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {POSITIONS[row]}
                </text>
              </g>
            )
          })}

          {RECORDS.map((rec, row) => {
            const y = ROW_Y(row)
            const visible = row < snapshot.rows
            const opacity = visible
              ? snapshot.dim.includes(row)
                ? 'opacity-30'
                : 'opacity-100'
              : 'opacity-0'
            const isEntry = ENTRY_ROWS.includes(row)
            const isTarget = row === 7

            return (
              <g
                key={`record-${row}`}
                className={`transition-opacity duration-500 motion-reduce:transition-none ${opacity}`}
              >
                <rect
                  x={LOG_X}
                  y={y}
                  width={LOG_W}
                  height={26}
                  rx={4}
                  strokeWidth={isTarget ? 1.5 : 1}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                    snapshot.log[row] ??
                    (isEntry && snapshot.stage === 1 ? 'acc' : undefined),
                  )}`}
                />
                <text
                  x={524}
                  y={y + 17}
                  textAnchor="middle"
                  fontSize={11}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {POSITIONS[row]}
                </text>
                <text
                  x={574}
                  y={y + 17}
                  textAnchor="middle"
                  fontSize={11}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {rec.offset}
                </text>
                <text
                  x={640}
                  y={y + 17}
                  textAnchor="middle"
                  fontSize={11}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {clock(rec.ts)}
                </text>
                <rect
                  x={700}
                  y={y + 7}
                  width={rec.size / 22}
                  height={12}
                  rx={2}
                  className="fill-slate-300 dark:fill-slate-600"
                />
              </g>
            )
          })}

          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.cursor === null ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <path
              d={`M786 ${ROW_Y(snapshot.cursor ?? 0) + 8} L779 ${
                ROW_Y(snapshot.cursor ?? 0) + 13
              } L786 ${ROW_Y(snapshot.cursor ?? 0) + 18} Z`}
              className="fill-primary-500"
            />
          </g>

          {snapshot.stage === 1 && (
            <>
              <text
                x={126}
                y={136}
                textAnchor="middle"
                fontSize={10}
                className="fill-slate-500 dark:fill-slate-400"
              >
                بایت از آخرین ورودی
              </text>
              <rect
                x={T_X}
                y={144}
                width={T_W}
                height={9}
                rx={4.5}
                className="fill-slate-200 dark:fill-slate-800"
              />
              <rect
                x={T_X}
                y={144}
                width={Math.min(snapshot.counter / INDEX_INTERVAL, 1) * T_W}
                height={9}
                rx={4.5}
                className="fill-primary-500 transition-[width] duration-500 motion-reduce:transition-none"
              />
              <text
                x={126}
                y={173}
                textAnchor="middle"
                fontSize={11}
                className="fill-slate-800 font-mono dark:fill-slate-200"
              >
                {snapshot.counter} / {INDEX_INTERVAL}
              </text>
              <text
                x={238}
                y={200}
                textAnchor="middle"
                fontSize={10}
                className="fill-slate-500 dark:fill-slate-400"
              >
                بزرگ‌ترین timestamp تا اینجا
              </text>
              <text
                x={238}
                y={221}
                textAnchor="middle"
                fontSize={12}
                className="fill-slate-800 font-mono dark:fill-slate-200"
              >
                {maxLine
                  ? `${clock(maxLine.ts)} → offset ${maxLine.offset}`
                  : '—'}
              </text>
              <text
                x={238}
                y={258}
                textAnchor="middle"
                fontSize={11}
                className="fill-slate-700 dark:fill-slate-300"
              >
                timeindex entries: {snapshot.tEntries} / records:{' '}
                {snapshot.rows}
              </text>
              <text
                x={238}
                y={280}
                textAnchor="middle"
                fontSize={11}
                className="fill-slate-500 dark:fill-slate-400"
              >
                entry = 12 bytes (8 timestamp + 4 rel offset)
              </text>
              {lastRecord && (
                <text
                  x={238}
                  y={302}
                  textAnchor="middle"
                  fontSize={11}
                  className="fill-slate-400 dark:fill-slate-500"
                >
                  last append: offset {lastRecord.offset} @ {clock(lastRecord.ts)}
                </text>
              )}
            </>
          )}

          {snapshot.q > 0 && (
            <>
              <rect
                x={T_X}
                y={130}
                width={456}
                height={208}
                rx={10}
                fill="none"
                strokeDasharray="5 4"
                className="stroke-primary-300 dark:stroke-primary-800"
              />
              <text
                x={24}
                y={152}
                fontSize={9.5}
                className="fill-primary-700 dark:fill-primary-300"
              >
                QUERY · ListOffsets
              </text>
              <text
                x={24}
                y={180}
                fontSize={12}
                className="fill-slate-800 font-mono dark:fill-slate-200"
              >
                offsetsForTimes(ts = {clock(TARGET_TS)})
              </text>
              <g
                className={`transition-opacity duration-500 motion-reduce:transition-none ${
                  snapshot.q > 1 ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <text
                  x={24}
                  y={208}
                  fontSize={12}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  timeIndex.lookup → (10:00:19, rel 4)
                </text>
              </g>
              <g
                className={`transition-opacity duration-500 motion-reduce:transition-none ${
                  snapshot.q > 2 ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <text
                  x={24}
                  y={236}
                  fontSize={12}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  offsetIndex.lookup(1004) → pos 4800
                </text>
              </g>
              <g
                className={`transition-opacity duration-500 motion-reduce:transition-none ${
                  snapshot.q > 3 ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <text
                  x={24}
                  y={264}
                  fontSize={12}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  scan batches from pos 4800 → skip &lt; 10:00:27
                </text>
              </g>
              <g
                className={`transition-opacity duration-500 motion-reduce:transition-none ${
                  snapshot.q > 4 ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <rect
                  x={20}
                  y={284}
                  width={436}
                  height={34}
                  rx={7}
                  className="fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/50 dark:stroke-emerald-600"
                />
                <text
                  x={32}
                  y={306}
                  fontSize={12}
                  fontWeight={600}
                  className="fill-emerald-900 font-mono dark:fill-emerald-200"
                >
                  ANSWER → offset 1007 @ 10:00:31
                </text>
              </g>
            </>
          )}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن هر سه ستون، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، هر ردیف یک <Ltr>Record Batch</Ltr> تک‌رکوردی در نظر گرفته
        شده و اندازه‌ها کوچک شده‌اند؛ منطق دقیقاً همان است که کافکا اجرا می‌کند: هر
        ۴۰۹۶ بایت یک جفت ورودی برای <Ltr>.index</Ltr> و{' '}
        <Ltr>.timeindex</Ltr>، جست‌وجوی دودویی روی زمان، و اسکن هدر batchها.
      </p>
    </div>
  )
}
