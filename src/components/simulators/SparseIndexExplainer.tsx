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

const SEGMENT_SIZES = [
  1000, 1400, 900, 1300, 1100, 1500, 800, 1200, 1000, 1300, 900, 1100,
]
const BASE_OFFSET = 1000
const INDEX_INTERVAL = 4096
const TARGET_OFFSET = 1006
const RELATIVE_TARGET = TARGET_OFFSET - BASE_OFFSET

const POSITIONS: number[] = []
let runningPosition = 0
for (const size of SEGMENT_SIZES) {
  POSITIONS.push(runningPosition)
  runningPosition += size
}

interface IndexEntry {
  row: number
  slot: number
}

const INDEX_ENTRIES: IndexEntry[] = []
{
  let sinceLastEntry = 0
  SEGMENT_SIZES.forEach((size, row) => {
    if (sinceLastEntry > INDEX_INTERVAL) {
      INDEX_ENTRIES.push({ row, slot: INDEX_ENTRIES.length })
      sinceLastEntry = 0
    }
    sinceLastEntry += size
  })
}

type Mark = 'ok' | 'acc' | 'no'

interface SnapshotState {
  stage: 1 | 2
  rows: number
  entries: number
  counter: number
  hi: Record<number, Mark>
  dim: number[]
  eh: Record<number, Mark>
  lineHi: boolean
  q: number
}

interface Snapshot extends SnapshotState {
  caption: string
}

const FIRST_ENTRY = INDEX_ENTRIES[0]
const SECOND_ENTRY = INDEX_ENTRIES[1]

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    stage: 1,
    rows: 0,
    entries: 0,
    counter: 0,
    hi: {},
    dim: [],
    eh: {},
    lineHi: false,
    q: 0,
  }

  const push = (caption: string, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    'فایل \u200e.log\u200e خالی است و ایندکس هم خالی. رکوردها یکی‌یکی به انتهای \u200e.log\u200e اضافه می‌شوند.',
  )

  let sinceLastEntry = 0
  let entryCount = 0

  SEGMENT_SIZES.forEach((size, row) => {
    const offset = BASE_OFFSET + row
    const position = POSITIONS[row]
    const added = `رکورد offset ${offset} در position ${position} به انتهای \u200e.log\u200e اضافه شد (حجم ${size} بایت).`

    if (sinceLastEntry > INDEX_INTERVAL) {
      push(added, { rows: row + 1, counter: sinceLastEntry })
      push(
        `بیش از index.interval.bytes (${INDEX_INTERVAL} بایت) از آخرین ورودی گذشته، پس یک ورودی ساخته شد: relative offset = ${offset} − ${BASE_OFFSET} = ${row} همراه position ${position}. بقیه رکوردها ورودی ندارند و شمارنده از صفر شروع می‌شود.`,
        { entries: entryCount + 1, counter: size },
      )
      sinceLastEntry = size
      entryCount += 1
    } else {
      sinceLastEntry += size
      push(added, { rows: row + 1, counter: sinceLastEntry })
    }
  })

  push(
    `مصرف‌کننده رکورد offset ${TARGET_OFFSET} را می‌خواهد. ایندکس offsetها را نسبت به baseOffset نگه می‌دارد.`,
    { stage: 2, q: 1 },
  )
  push(
    `پس اول relative محاسبه می‌شود: ${TARGET_OFFSET} − ${BASE_OFFSET} = ${RELATIVE_TARGET}.`,
    { q: 2 },
  )
  push(
    `جست‌وجوی دودویی در \u200e.index\u200e: ورودی با relative ${SECOND_ENTRY.row} از هدف (${RELATIVE_TARGET}) بزرگ‌تر است، پس کنار می‌رود.`,
    { q: 3, eh: { [SECOND_ENTRY.slot]: 'no' } },
  )
  push(
    `ورودی با relative ${FIRST_ENTRY.row} کوچک‌تر یا مساوی ${RELATIVE_TARGET} است؛ یعنی بزرگ‌ترین ورودی کمتر یا مساوی هدف همین است.`,
    { eh: { [FIRST_ENTRY.slot]: 'ok' } },
  )
  push(
    `مستقیم به position ${POSITIONS[FIRST_ENTRY.row]} در \u200e.log\u200e می‌پریم. رکوردهای قبل از آن اصلاً خوانده نمی‌شوند.`,
    {
      lineHi: true,
      dim: [0, 1, 2, 3],
      hi: { [FIRST_ENTRY.row]: 'acc' },
    },
  )
  push(
    `اسکن ترتیبی: offset ${BASE_OFFSET + FIRST_ENTRY.row + 1} هنوز هدف نیست.`,
    {
      hi: {
        [FIRST_ENTRY.row]: 'acc',
        [FIRST_ENTRY.row + 1]: 'acc',
      },
    },
  )
  push(`رکورد offset ${TARGET_OFFSET} پیدا شد.`, {
    hi: {
      [FIRST_ENTRY.row]: 'acc',
      [FIRST_ENTRY.row + 1]: 'acc',
      [FIRST_ENTRY.row + 2]: 'ok',
    },
  })
  push(
    `نتیجه: ایندکس sparse است (فقط ${INDEX_ENTRIES.length} ورودی برای ${SEGMENT_SIZES.length} رکورد). یک جست‌وجوی دودویی روی ایندکس کوچک به‌علاوه اسکن چند رکورد کافی بود؛ هم حافظه کم می‌گیرد و هم سریع است.`,
    {
      dim: SEGMENT_SIZES.map((_, index) => index).filter(
        (index) =>
          index < FIRST_ENTRY.row || index > FIRST_ENTRY.row + 2,
      ),
    },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const ROW_Y = (row: number) => 46 + row * 28
const SLOT_Y = (slot: number) => 46 + slot * 40

function boxClass(mark?: Mark): string {
  switch (mark) {
    case 'ok':
      return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
    case 'acc':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    case 'no':
      return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/60 dark:stroke-rose-500'
    default:
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

export function SparseIndexExplainer() {
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

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            ایندکس متراکم چطور یک آفست را پیدا می‌کند؟
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
          1 · نوشتن و ساخته شدن ایندکس
        </div>
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors ${
            snapshot.stage === 2
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          2 · جست‌وجوی یک offset
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

      <div className="mt-3 min-h-[6.5rem] rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
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
          viewBox="0 0 680 400"
          role="img"
          aria-label="نمای فایل لاگ و ایندکس متراکم؛ نوشتن رکوردها و جست‌وجوی یک آفست"
          className="h-auto w-full min-w-[560px]"
        >
          <text
            x={515}
            y={16}
            textAnchor="middle"
            fontSize={15}
            fontWeight={500}
            className="fill-slate-900 dark:fill-slate-100"
          >
            .log
          </text>
          <text
            x={395}
            y={36}
            textAnchor="middle"
            fontSize={11}
            className="fill-slate-500 dark:fill-slate-400"
          >
            position
          </text>
          <text
            x={455}
            y={36}
            textAnchor="middle"
            fontSize={11}
            className="fill-slate-500 dark:fill-slate-400"
          >
            offset
          </text>
          <text
            x={570}
            y={36}
            textAnchor="middle"
            fontSize={11}
            className="fill-slate-500 dark:fill-slate-400"
          >
            size
          </text>

          <text
            x={160}
            y={16}
            textAnchor="middle"
            fontSize={15}
            fontWeight={500}
            className="fill-slate-900 dark:fill-slate-100"
          >
            .index
          </text>
          <text
            x={100}
            y={36}
            textAnchor="middle"
            fontSize={11}
            className="fill-slate-500 dark:fill-slate-400"
          >
            relative offset
          </text>
          <text
            x={230}
            y={36}
            textAnchor="middle"
            fontSize={11}
            className="fill-slate-500 dark:fill-slate-400"
          >
            position
          </text>

          {SEGMENT_SIZES.map((size, row) => {
            const y = ROW_Y(row)
            const visible = row < snapshot.rows
            const opacity = visible
              ? snapshot.dim.includes(row)
                ? 'opacity-30'
                : 'opacity-100'
              : 'opacity-0'

            return (
              <g
                key={`record-${row}`}
                className={`transition-opacity duration-500 motion-reduce:transition-none ${opacity}`}
              >
                <rect
                  x={370}
                  y={y}
                  width={290}
                  height={24}
                  rx={4}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                    snapshot.hi[row],
                  )}`}
                  strokeWidth={1}
                />
                <text
                  x={395}
                  y={y + 16}
                  textAnchor="middle"
                  fontSize={12}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {POSITIONS[row]}
                </text>
                <text
                  x={455}
                  y={y + 16}
                  textAnchor="middle"
                  fontSize={12}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {BASE_OFFSET + row}
                </text>
                <rect
                  x={495}
                  y={y + 6}
                  width={size / 10}
                  height={12}
                  rx={2}
                  className="fill-slate-400 dark:fill-slate-500"
                />
              </g>
            )
          })}

          {[0, 1, 2].map((slot) => (
            <rect
              key={`slot-${slot}`}
              x={20}
              y={SLOT_Y(slot)}
              width={280}
              height={32}
              rx={4}
              fill="none"
              strokeDasharray="4 3"
              className="stroke-slate-300 dark:stroke-slate-700"
              strokeWidth={1}
            />
          ))}

          {INDEX_ENTRIES.map((entry) => {
            const y = SLOT_Y(entry.slot)
            const visible = entry.slot < snapshot.entries
            const lineActive = entry.slot === 0 && snapshot.lineHi

            return (
              <g
                key={`entry-${entry.slot}`}
                className={`transition-opacity duration-500 motion-reduce:transition-none ${
                  visible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <path
                  d={`M300 ${y + 16} C335 ${y + 16} 335 ${
                    ROW_Y(entry.row) + 12
                  } 370 ${ROW_Y(entry.row) + 12}`}
                  fill="none"
                  strokeDasharray="4 3"
                  strokeWidth={lineActive ? 2.5 : 1}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${
                    lineActive
                      ? 'stroke-primary-500 dark:stroke-primary-400'
                      : 'stroke-slate-300 dark:stroke-slate-600'
                  }`}
                />
                <g>
                  <rect
                    x={20}
                    y={y}
                    width={280}
                    height={32}
                    rx={4}
                    strokeWidth={1}
                    className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                      snapshot.eh[entry.slot],
                    )}`}
                  />
                  <text
                    x={100}
                    y={y + 21}
                    textAnchor="middle"
                    fontSize={12}
                    className="fill-slate-800 font-mono dark:fill-slate-200"
                  >
                    {entry.row}
                  </text>
                  <text
                    x={230}
                    y={y + 21}
                    textAnchor="middle"
                    fontSize={12}
                    className="fill-slate-800 font-mono dark:fill-slate-200"
                  >
                    {POSITIONS[entry.row]}
                  </text>
                </g>
              </g>
            )
          })}

          <text
            x={160}
            y={182}
            textAnchor="middle"
            fontSize={11}
            className="fill-slate-500 dark:fill-slate-400"
          >
            بایت‌های نوشته‌شده از آخرین ورودی
          </text>
          <rect
            x={20}
            y={192}
            width={280}
            height={12}
            rx={6}
            className="fill-slate-200 dark:fill-slate-800"
          />
          <rect
            x={20}
            y={192}
            width={Math.min(snapshot.counter / INDEX_INTERVAL, 1) * 280}
            height={12}
            rx={6}
            className="fill-primary-500 transition-[width] duration-500 motion-reduce:transition-none"
          />
          <text
            x={160}
            y={224}
            textAnchor="middle"
            fontSize={12}
            className="fill-slate-800 font-mono dark:fill-slate-200"
          >
            {snapshot.counter} / {INDEX_INTERVAL}
          </text>
          <text
            x={160}
            y={256}
            textAnchor="middle"
            fontSize={13}
            className="fill-slate-800 dark:fill-slate-200"
          >
            baseOffset = {BASE_OFFSET}
          </text>
          <text
            x={160}
            y={276}
            textAnchor="middle"
            fontSize={11}
            className="fill-slate-500 dark:fill-slate-400"
          >
            هر ورودی = 8 بایت (4 + 4)
          </text>

          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.q > 0 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <text
              x={160}
              y={316}
              textAnchor="middle"
              fontSize={13}
              className="fill-slate-800 dark:fill-slate-200"
            >
              Fetch offset = {TARGET_OFFSET}
            </text>
          </g>
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.q > 1 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <text
              x={160}
              y={340}
              textAnchor="middle"
              fontSize={13}
              className="fill-slate-800 dark:fill-slate-200"
            >
              relative = {TARGET_OFFSET} − {BASE_OFFSET} ={' '}
              {RELATIVE_TARGET}
            </text>
          </g>
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.q > 2 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <text
              x={160}
              y={364}
              textAnchor="middle"
              fontSize={13}
              className="fill-slate-800 dark:fill-slate-200"
            >
              binary search → اسکن ترتیبی
            </text>
          </g>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن ستون <span dir="ltr" className="font-mono">.log</span>، نمودار
        را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، اندازه رکوردها و فاصله ورودی‌های ایندکس کوچک شده‌اند؛ منطق
        دقیقاً همان چیزی است که کافکا اجرا می‌کند: هر 4096 بایت یک ورودی، جست‌وجوی
        دودویی روی ایندکس، و اسکن کوتاه در فایل لاگ.
      </p>
    </div>
  )
}
