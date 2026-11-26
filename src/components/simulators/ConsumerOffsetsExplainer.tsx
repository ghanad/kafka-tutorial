import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
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
import { toPersianDigits } from '../../utils/persianDigits'

type Stage = 1 | 2

type Highlight =
  | 'start'
  | 'fetch'
  | 'process'
  | 'commit'
  | 'crash'
  | 'restart'
  | 'auto'
  | 'auto-risk'
  | 'async'
  | 'explicit'
  | 'rule'
  | null

interface SnapshotState {
  stage: Stage
  position: number
  committed: number
  storeOffsets: number[]
  processedUpTo: number | null
  crashed: boolean
  reprocessFrom: number | null
  reprocessTo: number | null
  autoCommit: boolean
  highlight: Highlight
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const LOG_START = 1040
const RECORDS = Array.from({ length: 7 }, (_, index) => LOG_START + index)

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    stage: 1,
    position: 1040,
    committed: 1040,
    storeOffsets: [1040],
    processedUpTo: null,
    crashed: false,
    reprocessFrom: null,
    reprocessTo: null,
    autoCommit: false,
    highlight: 'start',
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      مصرف‌کننده در گروه <Ltr>billing</Ltr> تازه بالا آمده است. آخرین offset
      ذخیره‌شده برای <Ltr>orders/0</Ltr> برابر <Ltr>1040</Ltr> است، پس هم
      committed offset و هم <Ltr>position</Ltr> از <Ltr>1040</Ltr> شروع
      می‌شوند. هنوز هیچ رکوردی خوانده نشده.
    </>,
  )

  push(
    <>
      <Ltr>poll</Ltr> چهار رکورد <Ltr>1040..1043</Ltr> را برمی‌گرداند.{' '}
      <Ltr>position</Ltr> در حافظه فوراً به <Ltr>1044</Ltr> می‌رسد، اما committed
      offset هنوز <Ltr>1040</Ltr> است؛ هنوز چیزی در{' '}
      <Ltr>__consumer_offsets</Ltr> نوشته نشده.
    </>,
    { position: 1044, highlight: 'fetch' },
  )

  push(
    <>
      برنامه رکوردها را پردازش می‌کند. حالا رکوردهای <Ltr>1040..1043</Ltr>{' '}
      پردازش‌شده‌اند، ولی اگر همین لحظه پروسه بمیرد، کافکا فقط <Ltr>1040</Ltr>{' '}
      را به یاد دارد و دوباره از همان‌جا می‌خواند.
    </>,
    { processedUpTo: 1043, highlight: 'process' },
  )

  push(
    <>
      <Ltr>commitSync()</Ltr> صدا زده می‌شود. کافکا یک رکورد به{' '}
      <Ltr>__consumer_offsets</Ltr> اضافه می‌کند:{' '}
      <Ltr>group=billing</Ltr>، <Ltr>topic=orders</Ltr>،{' '}
      <Ltr>partition=0</Ltr>، <Ltr>offset=1044</Ltr>. این عدد «offset بعدی برای
      خواندن» است، نه آخرین رکورد خوانده‌شده.
    </>,
    {
      committed: 1044,
      storeOffsets: [1040, 1044],
      highlight: 'commit',
    },
  )

  push(
    <>
      <Ltr>poll</Ltr> بعدی رکوردهای <Ltr>1044..1046</Ltr> را می‌گیرد و{' '}
      <Ltr>position</Ltr> به <Ltr>1047</Ltr> می‌رسد. committed offset همچنان{' '}
      <Ltr>1044</Ltr> است؛ فاصلهٔ این دو، همان پیشرفتی است که هنوز پایدار نشده.
    </>,
    { position: 1047, processedUpTo: 1043, highlight: 'fetch' },
  )

  push(
    <>
      پروسه قبل از commit بعدی کرش می‌کند. <Ltr>position=1047</Ltr> فقط در حافظه
      بود و از بین می‌رود؛ تنها چیزی که می‌ماند{' '}
      <Ltr>committed=1044</Ltr> در <Ltr>__consumer_offsets</Ltr> است.
    </>,
    {
      position: 1044,
      crashed: true,
      reprocessFrom: 1044,
      reprocessTo: 1046,
      highlight: 'crash',
    },
  )

  push(
    <>
      مصرف‌کننده دوباره بالا می‌آید و <Ltr>position</Ltr> را از committed offset
      می‌سازد: <Ltr>1044</Ltr>. رکوردهای <Ltr>1044..1046</Ltr> دوباره خوانده و
      پردازش می‌شوند. این همان <Ltr>at-least-once</Ltr> است: حداقل یک‌بار، شاید
      بیشتر.
    </>,
    { crashed: false, highlight: 'restart' },
  )

  push(
    <>
      حالا سراغ commit خودکار می‌رویم. با <Ltr>enable.auto.commit=true</Ltr>،
      کافکا هر <Ltr>auto.commit.interval.ms</Ltr> (پیش‌فرض ۵ ثانیه) خودش commit
      می‌کند و این کار معمولاً در ابتدای <Ltr>poll</Ltr> بعدی انجام می‌شود.
    </>,
    {
      stage: 2,
      position: 1047,
      committed: 1047,
      storeOffsets: [1040, 1044, 1047],
      processedUpTo: 1046,
      reprocessFrom: null,
      reprocessTo: null,
      autoCommit: true,
      highlight: 'auto',
    },
  )

  push(
    <>
      خطر commit خودکار همین‌جاست: اگر بین commit و پایان پردازش، پروسه بمیرد،
      رکوردهای نیمه‌پردازش‌شده دوباره خوانده نمی‌شوند و از دست می‌روند. این
      رفتار <Ltr>at-most-once</Ltr> است.
    </>,
    { highlight: 'auto-risk' },
  )

  push(
    <>
      <Ltr>commitAsync()</Ltr> منتظر پاسخ بروکر نمی‌ماند و سریع‌تر است، ولی خودش
      retry نمی‌کند. برای commit دوره‌ای مناسب است؛ برای commit نهایی قبل از
      خروج از <Ltr>commitSync</Ltr> استفاده کنید.
    </>,
    { highlight: 'async' },
  )

  push(
    <>
      می‌توانید offset مشخصی را commit کنید، مثلاً فقط تا جایی که واقعاً پردازش
      شده. این کار وقتی مفید است که یک دسته را بخشی‌بخشی پردازش می‌کنید و
      نمی‌خواهید کل دسته دوباره خوانده شود.
    </>,
    { highlight: 'explicit' },
  )

  push(
    <>
      قاعده: committed offset «نقطهٔ شروع دفعهٔ بعد» است. <Ltr>position</Ltr> در
      حافظه جلو می‌رود، ولی فقط commit آن را پایدار می‌کند؛ هر چه دیرتر commit
      کنید، احتمال پردازش تکراری بیشتر و احتمال از دست رفتن کمتر می‌شود.
    </>,
    { highlight: 'rule' },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const LOG_X = 16
const LOG_W = 240
const CONSUMER_X = 300
const CONSUMER_W = 170
const STORE_X = 514
const STORE_W = 250

const ROW_Y = (row: number) => 72 + row * 32
const STORE_Y = (slot: number) => 72 + slot * 30

type Mark = 'idle' | 'fetched' | 'processed' | 'committed' | 'reprocessed'

function boxClass(mark: Mark): string {
  switch (mark) {
    case 'committed':
    case 'processed':
      return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
    case 'fetched':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    case 'reprocessed':
      return 'fill-amber-50 stroke-amber-400 dark:fill-amber-950/50 dark:stroke-amber-500'
    default:
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

function recordMark(offset: number, snapshot: Snapshot): Mark {
  if (
    snapshot.reprocessFrom !== null &&
    snapshot.reprocessTo !== null &&
    offset >= snapshot.reprocessFrom &&
    offset <= snapshot.reprocessTo
  ) {
    return 'reprocessed'
  }
  if (offset < snapshot.committed) return 'committed'
  if (offset < snapshot.position) {
    if (snapshot.processedUpTo !== null && offset <= snapshot.processedUpTo) {
      return 'processed'
    }
    return 'fetched'
  }
  return 'idle'
}

export function ConsumerOffsetsExplainer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1800)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const autoPlaying = playing && !isLast

  const fetchActive = snapshot.highlight === 'fetch' || snapshot.highlight === 'restart'
  const commitActive =
    snapshot.highlight === 'commit' ||
    snapshot.highlight === 'auto' ||
    snapshot.highlight === 'async' ||
    snapshot.highlight === 'explicit'

  const positionIndex = snapshot.position - LOG_START
  const positionY =
    positionIndex >= RECORDS.length
      ? ROW_Y(RECORDS.length - 1) + 26 + 6
      : ROW_Y(positionIndex) + 13

  const commitIndex = snapshot.committed - LOG_START
  const commitLineY =
    commitIndex >= RECORDS.length
      ? ROW_Y(RECORDS.length - 1) + 26 + 4
      : ROW_Y(commitIndex) - 3

  const latestStoreY =
    snapshot.storeOffsets.length > 0
      ? STORE_Y(snapshot.storeOffsets.length - 1) + 12
      : 84

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
            position و committed offset چه تفاوتی دارند؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </Badge>
      </div>

      <div className="mt-4 flex gap-2">
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors motion-reduce:transition-none ${
            snapshot.stage === 1
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          ۱ · پیشرفت و commit
        </div>
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors motion-reduce:transition-none ${
            snapshot.stage === 2
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          ۲ · خودکار در برابر دستی
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
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
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
          viewBox="0 0 780 360"
          role="img"
          aria-label="نمای لاگ پارتیشن، وضعیت مصرف‌کننده و رکوردهای commit در __consumer_offsets؛ حرکت position و ذخیرهٔ committed offset"
          className="h-auto w-full min-w-[700px]"
        >
          <defs>
            <marker
              id="offsets-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                className="fill-slate-400 dark:fill-slate-500"
              />
            </marker>
            <marker
              id="offsets-arrow-active"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                className="fill-primary-500 dark:fill-primary-400"
              />
            </marker>
          </defs>

          <text
            x={LOG_X + LOG_W / 2}
            y={22}
            textAnchor="middle"
            fontSize={13}
            fontWeight={600}
            className="fill-slate-900 dark:fill-slate-100"
          >
            orders · partition 0
          </text>
          <text
            x={CONSUMER_X + CONSUMER_W / 2}
            y={22}
            textAnchor="middle"
            fontSize={13}
            fontWeight={600}
            className="fill-slate-900 dark:fill-slate-100"
          >
            Consumer · billing
          </text>
          <text
            x={STORE_X + STORE_W / 2}
            y={22}
            textAnchor="middle"
            fontSize={13}
            fontWeight={600}
            className="fill-slate-900 dark:fill-slate-100"
          >
            __consumer_offsets
          </text>
          <text
            x={STORE_X + STORE_W / 2}
            y={40}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            key = billing / orders / 0
          </text>
          <text
            x={LOG_X + LOG_W / 2}
            y={40}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-500 dark:fill-slate-400"
          >
            offset
          </text>

          {/* records */}
          {RECORDS.map((offset, row) => {
            const y = ROW_Y(row)
            const mark = recordMark(offset, snapshot)
            return (
              <g key={`record-${offset}`}>
                <rect
                  x={LOG_X}
                  y={y}
                  width={LOG_W}
                  height={26}
                  rx={4}
                  strokeWidth={1}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                    mark,
                  )}`}
                />
                <text
                  x={LOG_X + LOG_W / 2}
                  y={y + 17}
                  textAnchor="middle"
                  fontSize={12}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {offset}
                </text>
              </g>
            )
          })}

          {/* committed boundary */}
          <line
            x1={LOG_X}
            y1={commitLineY}
            x2={LOG_X + LOG_W}
            y2={commitLineY}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            className="stroke-emerald-500 dark:stroke-emerald-400"
          />
          <text
            x={LOG_X + LOG_W}
            y={commitLineY - 4}
            textAnchor="end"
            fontSize={9}
            className="fill-emerald-700 dark:fill-emerald-300"
          >
            committed = {snapshot.committed}
          </text>

          {/* position cursor */}
          <path
            d={`M ${LOG_X - 10} ${positionY - 5} L ${LOG_X} ${positionY} L ${
              LOG_X - 10
            } ${positionY + 5} Z`}
            className="fill-primary-500 dark:fill-primary-400"
          />

          {/* consumer state */}
          <g>
            <rect
              x={CONSUMER_X}
              y={92}
              width={CONSUMER_W}
              height={52}
              rx={6}
              strokeWidth={1.5}
              className="fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400"
            />
            <text
              x={CONSUMER_X + 10}
              y={110}
              fontSize={9.5}
              className="fill-primary-700 dark:fill-primary-300"
            >
              position (in memory)
            </text>
            <text
              x={CONSUMER_X + CONSUMER_W / 2}
              y={134}
              textAnchor="middle"
              fontSize={16}
              fontWeight={600}
              className="fill-primary-900 font-mono dark:fill-primary-100"
            >
              {snapshot.position}
            </text>
          </g>
          <g>
            <rect
              x={CONSUMER_X}
              y={168}
              width={CONSUMER_W}
              height={52}
              rx={6}
              strokeWidth={1.5}
              className="fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500"
            />
            <text
              x={CONSUMER_X + 10}
              y={186}
              fontSize={9.5}
              className="fill-emerald-700 dark:fill-emerald-300"
            >
              committed (persisted)
            </text>
            <text
              x={CONSUMER_X + CONSUMER_W / 2}
              y={210}
              textAnchor="middle"
              fontSize={16}
              fontWeight={600}
              className="fill-emerald-900 font-mono dark:fill-emerald-100"
            >
              {snapshot.committed}
            </text>
          </g>
          <text
            x={CONSUMER_X + CONSUMER_W / 2}
            y={244}
            textAnchor="middle"
            fontSize={9.5}
            className="fill-slate-500 dark:fill-slate-400"
          >
            {snapshot.autoCommit ? 'auto.commit = true' : 'auto.commit = false'}
          </text>

          {/* store entries */}
          {snapshot.storeOffsets.map((value, slot) => {
            const y = STORE_Y(slot)
            const isLatest = slot === snapshot.storeOffsets.length - 1
            return (
              <g key={`store-${slot}-${value}`}>
                <rect
                  x={STORE_X}
                  y={y}
                  width={STORE_W}
                  height={24}
                  rx={4}
                  strokeWidth={1}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                    isLatest ? 'committed' : 'idle',
                  )}`}
                />
                <text
                  x={STORE_X + 16}
                  y={y + 16}
                  fontSize={10}
                  className="fill-slate-500 dark:fill-slate-400"
                >
                  offset
                </text>
                <text
                  x={STORE_X + STORE_W - 16}
                  y={y + 16}
                  textAnchor="end"
                  fontSize={12}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {value}
                </text>
              </g>
            )
          })}

          {/* fetch connector */}
          <line
            x1={LOG_X + LOG_W + 4}
            y1={118}
            x2={CONSUMER_X - 6}
            y2={118}
            strokeDasharray="4 3"
            strokeWidth={fetchActive ? 2.5 : 1}
            markerEnd={
              fetchActive ? 'url(#offsets-arrow-active)' : 'url(#offsets-arrow)'
            }
            className={`transition-colors duration-500 motion-reduce:transition-none ${
              fetchActive
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-slate-300 dark:stroke-slate-600'
            }`}
          />

          {/* commit connector */}
          <line
            x1={CONSUMER_X + CONSUMER_W + 4}
            y1={194}
            x2={STORE_X - 6}
            y2={latestStoreY}
            strokeDasharray="4 3"
            strokeWidth={commitActive ? 2.5 : 1}
            markerEnd={
              commitActive ? 'url(#offsets-arrow-active)' : 'url(#offsets-arrow)'
            }
            className={`transition-colors duration-500 motion-reduce:transition-none ${
              commitActive
                ? 'stroke-emerald-500 dark:stroke-emerald-400'
                : 'stroke-slate-300 dark:stroke-slate-600'
            }`}
          />
          <text
            x={(CONSUMER_X + CONSUMER_W + STORE_X) / 2}
            y={186}
            textAnchor="middle"
            fontSize={9}
            className={
              commitActive
                ? 'fill-emerald-700 dark:fill-emerald-300'
                : 'fill-slate-400 dark:fill-slate-500'
            }
          >
            commit
          </text>

          {/* crash marker */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.crashed ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <circle
              cx={CONSUMER_X + CONSUMER_W / 2}
              cy={118}
              r={12}
              className="fill-rose-50 stroke-rose-500 dark:fill-rose-950/60 dark:stroke-rose-500"
              strokeWidth={1.5}
            />
            <path
              d={`M ${CONSUMER_X + CONSUMER_W / 2 - 5} 113 L ${
                CONSUMER_X + CONSUMER_W / 2 + 5
              } 123 M ${CONSUMER_X + CONSUMER_W / 2 + 5} 113 L ${
                CONSUMER_X + CONSUMER_W / 2 - 5
              } 123`}
              className="stroke-rose-600 dark:stroke-rose-300"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن هر سه ستون، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، تعداد رکوردها و offsetها کوچک شده‌اند؛ منطق همان است که
        کافکا اجرا می‌کند: <Ltr>position</Ltr> در حافظه جلو می‌رود،{' '}
        <Ltr>commit</Ltr> مقدار «offset بعدی» را در{' '}
        <Ltr>__consumer_offsets</Ltr> پایدار می‌کند و ری‌استارت از همان عدد
        ادامه می‌دهد.
      </p>
    </div>
  )
}
