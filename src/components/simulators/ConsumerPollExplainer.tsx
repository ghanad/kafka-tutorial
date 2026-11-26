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

type MessageId =
  | 'none'
  | 'poll1'
  | 'fetch1'
  | 'resp1'
  | 'records1'
  | 'empty'
  | 'produce'
  | 'resp2'
  | 'heartbeat'
  | 'process'
  | 'kicked'

interface SnapshotState {
  stage: Stage
  position: number
  logEnd: number
  fetchedStart: number | null
  fetchedEnd: number | null
  showPoll1: boolean
  showFetch1: boolean
  showResp1: boolean
  showRecords1: boolean
  showPoll2: boolean
  showFetch2: boolean
  showEmpty: boolean
  showResp2: boolean
  showProcess: boolean
  processLong: boolean
  showHeartbeat: boolean
  kicked: boolean
  active: MessageId
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const LOG_START = 1040
const LOG_OFFSETS = Array.from({ length: 7 }, (_, index) => LOG_START + index)
const FIRST_BATCH_END = 1043
const SECOND_BATCH_END = 1046

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    stage: 1,
    position: 1040,
    logEnd: FIRST_BATCH_END,
    fetchedStart: null,
    fetchedEnd: null,
    showPoll1: false,
    showFetch1: false,
    showResp1: false,
    showRecords1: false,
    showPoll2: false,
    showFetch2: false,
    showEmpty: false,
    showResp2: false,
    showProcess: false,
    processLong: false,
    showHeartbeat: false,
    kicked: false,
    active: 'none',
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      برنامه <Ltr>poll(Duration.ofMillis(500))</Ltr> را صدا می‌زند. مصرف‌کننده
      هنوز رکوردی در دست ندارد و <Ltr>position</Ltr> آن <Ltr>1040</Ltr> است؛ پس
      برای گرفتن داده درخواست می‌فرستد. Broker خودش هیچ چیزی push نمی‌کند.
    </>,
    { showPoll1: true, active: 'poll1' },
  )

  push(
    <>
      Consumer یک <Ltr>FetchRequest</Ltr> برای پارتیشن ۰ با{' '}
      <Ltr>position=1040</Ltr> به لیدر می‌فرستد. این همان لحظه‌ای است که مدل{' '}
      <Ltr>Pull</Ltr> معنا پیدا می‌کند: تا وقتی Consumer نپرسد، پاسخی در راه
      نیست.
    </>,
    { showFetch1: true, active: 'fetch1' },
  )

  push(
    <>
      Broker چهار رکورد موجود در لاگ، یعنی <Ltr>offset 1040..1043</Ltr> را
      برمی‌گرداند. اندازهٔ پاسخ با <Ltr>fetch.max.bytes</Ltr> و{' '}
      <Ltr>max.partition.fetch.bytes</Ltr> محدود است؛ کل لاگ یک‌جا نمی‌آید.
    </>,
    {
      showResp1: true,
      active: 'resp1',
      fetchedStart: 1040,
      fetchedEnd: FIRST_BATCH_END,
    },
  )

  push(
    <>
      <Ltr>poll</Ltr> یک <Ltr>ConsumerRecords</Ltr> با ۴ رکورد برمی‌گرداند.
      برنامه آن‌ها را پردازش می‌کند و <Ltr>position</Ltr> در حافظه به{' '}
      <Ltr>1044</Ltr> می‌رسد. این عدد هنوز commit نشده است؛ تفاوتش با committed
      offset در درس Offset آمده است.
    </>,
    {
      showRecords1: true,
      showProcess: true,
      active: 'records1',
      position: 1044,
    },
  )

  push(
    <>
      بلافاصله دوباره <Ltr>poll</Ltr> می‌زنیم. رکورد جدیدی نیست، پس Broker
      درخواست را تا <Ltr>fetch.max.wait.ms</Ltr> (پیش‌فرض ۵۰۰ میلی‌ثانیه) نگه
      می‌دارد و بعد پاسخ خالی می‌دهد. <Ltr>poll</Ltr> خالی طبیعی است و حلقه را
      نمی‌شکند.
    </>,
    {
      showPoll2: true,
      showFetch2: true,
      showEmpty: true,
      active: 'empty',
    },
  )

  push(
    <>
      Producer سه رکورد تازه در <Ltr>offset 1044..1046</Ltr> می‌نویسد. تا{' '}
      <Ltr>poll</Ltr> بعدی، Consumer از وجود آن‌ها بی‌خبر است؛ همین فاصله،
      تفاوت اصلی Pull با Push است.
    </>,
    {
      logEnd: SECOND_BATCH_END,
      fetchedStart: null,
      fetchedEnd: null,
      active: 'produce',
    },
  )

  push(
    <>
      <Ltr>poll</Ltr> بعدی سه رکورد تازه را می‌گیرد و <Ltr>position</Ltr> به{' '}
      <Ltr>1047</Ltr> می‌رسد. حتی اگر هزار رکورد آماده باشد، در هر بار حداکثر{' '}
      <Ltr>max.poll.records</Ltr> (پیش‌فرض ۵۰۰) رکورد برمی‌گردد.
    </>,
    {
      showEmpty: false,
      showResp2: true,
      active: 'resp2',
      fetchedStart: 1044,
      fetchedEnd: SECOND_BATCH_END,
      position: 1047,
    },
  )

  push(
    <>
      قاعده: Consumer سرعتش را خودش تعیین می‌کند. اگر کند باشد، داده در لاگ
      منتظر می‌ماند و lag بالا می‌رود؛ اگر تند باشد، عقب نمی‌ماند. Broker فقط
      نگه‌دارندهٔ لاگ است و هیچ‌کس را مجبور به خواندن نمی‌کند.
    </>,
    { active: 'none' },
  )

  push(
    <>
      در پس‌زمینه، یک thread جدا هر <Ltr>heartbeat.interval.ms</Ltr> (پیش‌فرض ۳
      ثانیه) heartbeat به Group Coordinator می‌فرستد. تا وقتی heartbeat می‌رسد،
      Consumer زنده حساب می‌شود، حتی اگر <Ltr>poll</Ltr> در حال انتظار باشد.
    </>,
    {
      stage: 2,
      showHeartbeat: true,
      showPoll2: false,
      showFetch2: false,
      showEmpty: false,
      showResp2: false,
      showProcess: false,
      active: 'heartbeat',
    },
  )

  push(
    <>
      اگر پردازش یک دسته بیشتر از <Ltr>max.poll.interval.ms</Ltr> (پیش‌فرض ۵
      دقیقه) طول بکشد، Coordinator حتی با رسیدن heartbeatها Consumer را از گروه
      حذف می‌کند؛ چون در حلقهٔ <Ltr>poll</Ltr> پیشرفتی نمی‌بیند.
    </>,
    {
      showProcess: true,
      processLong: true,
      active: 'process',
    },
  )

  push(
    <>
      Consumer از گروه بیرون می‌افتد و پارتیشن‌هایش بین بقیه پخش می‌شود. در
      بازگشت، از آخرین offset commitشده ادامه می‌دهد و ممکن است همان دسته را
      دوباره پردازش کند.
    </>,
    { kicked: true, active: 'kicked' },
  )

  push(
    <>
      نتیجه: heartbeat زنده‌بودن را ثابت می‌کند، نه پیشرفت را. پردازش سنگین را به
      thread دیگری بسپارید، <Ltr>max.poll.records</Ltr> را کم کنید یا{' '}
      <Ltr>max.poll.interval.ms</Ltr> را آگاهانه بالا ببرید؛ وگرنه حلقهٔ
      rebalance تکرار می‌شود.
    </>,
    { active: 'none', showProcess: true, processLong: true, kicked: true },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const X = { app: 90, consumer: 290, broker: 490, coord: 665 }
const ROW = {
  poll1: 72,
  fetch1: 104,
  resp1: 136,
  records1: 168,
  heartbeat: 214,
  poll2: 262,
  fetch2: 294,
  empty: 326,
}

const CELL_W = 56
const CELL_GAP = 8
const LOG_X = 210

function cellX(index: number): number {
  return LOG_X + index * (CELL_W + CELL_GAP)
}

function lineClass(active: boolean): string {
  return active
    ? 'stroke-primary-500 dark:stroke-primary-400'
    : 'stroke-slate-400 dark:stroke-slate-500'
}

function markerFor(active: boolean): string {
  return active ? 'url(#poll-arrow-active)' : 'url(#poll-arrow)'
}

type CellMark = 'fetched' | 'consumed' | 'available' | 'unwritten'

function boxClass(mark: CellMark): string {
  switch (mark) {
    case 'fetched':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    case 'consumed':
      return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
    case 'available':
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
    case 'unwritten':
      return 'fill-slate-100 stroke-slate-300 dark:fill-slate-800/60 dark:stroke-slate-700'
  }
}

export function ConsumerPollExplainer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1800)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const autoPlaying = playing && !isLast
  const fetchedLabel =
    snapshot.fetchedStart === null
      ? '—'
      : `${snapshot.fetchedStart}..${snapshot.fetchedEnd}`

  const positionIndex = snapshot.position - LOG_START
  const positionX =
    positionIndex >= LOG_OFFSETS.length
      ? cellX(LOG_OFFSETS.length) - CELL_GAP / 2
      : cellX(positionIndex) - CELL_GAP / 2

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
            یک دور کامل poll چه چیزهایی را جابه‌جا می‌کند؟
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
          ۱ · حلقه poll
        </div>
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors motion-reduce:transition-none ${
            snapshot.stage === 2
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          ۲ · heartbeat و مهلت‌ها
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
          viewBox="0 0 720 450"
          role="img"
          aria-label="نمودار توالی حلقه poll؛ درخواست Fetch از مصرف‌کننده به بروکر، بازگشت رکوردها، heartbeat و حذف مصرف‌کننده از گروه"
          className="h-auto w-full min-w-[620px]"
        >
          <defs>
            <marker
              id="poll-arrow"
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
              id="poll-arrow-active"
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
            <marker
              id="poll-arrow-empty"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                className="fill-amber-500 dark:fill-amber-400"
              />
            </marker>
          </defs>

          {[
            { x: X.app, label: 'حلقه poll' },
            { x: X.consumer, label: 'Consumer' },
            { x: X.broker, label: 'Broker · partition 0' },
            { x: X.coord, label: 'Group Coordinator' },
          ].map((actor) => (
            <g key={actor.label}>
              <text
                x={actor.x}
                y={24}
                textAnchor="middle"
                fontSize={12.5}
                fontWeight={600}
                className="fill-slate-900 dark:fill-slate-100"
              >
                {actor.label}
              </text>
              <line
                x1={actor.x}
                y1={40}
                x2={actor.x}
                y2={340}
                strokeDasharray="4 4"
                strokeWidth={1}
                className="stroke-slate-300 dark:stroke-slate-700"
              />
            </g>
          ))}

          {/* poll 1: app -> consumer */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.showPoll1 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.app + 8}
              y1={ROW.poll1}
              x2={X.consumer - 12}
              y2={ROW.poll1}
              strokeWidth={snapshot.active === 'poll1' ? 2.5 : 1.2}
              markerEnd={markerFor(snapshot.active === 'poll1')}
              className={`transition-colors duration-500 motion-reduce:transition-none ${lineClass(
                snapshot.active === 'poll1',
              )}`}
            />
            <text
              x={(X.app + X.consumer) / 2}
              y={ROW.poll1 - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-slate-700 font-mono dark:fill-slate-300"
            >
              poll(500ms)
            </text>
          </g>

          {/* fetch 1: consumer -> broker */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.showFetch1 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.consumer + 8}
              y1={ROW.fetch1}
              x2={X.broker - 12}
              y2={ROW.fetch1}
              strokeWidth={snapshot.active === 'fetch1' ? 2.5 : 1.2}
              markerEnd={markerFor(snapshot.active === 'fetch1')}
              className={`transition-colors duration-500 motion-reduce:transition-none ${lineClass(
                snapshot.active === 'fetch1',
              )}`}
            />
            <text
              x={(X.consumer + X.broker) / 2}
              y={ROW.fetch1 - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-slate-700 font-mono dark:fill-slate-300"
            >
              FetchRequest · position 1040
            </text>
          </g>

          {/* response 1: broker -> consumer */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.showResp1 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.broker - 8}
              y1={ROW.resp1}
              x2={X.consumer + 12}
              y2={ROW.resp1}
              strokeWidth={snapshot.active === 'resp1' ? 2.5 : 1.2}
              markerEnd={markerFor(snapshot.active === 'resp1')}
              className={`transition-colors duration-500 motion-reduce:transition-none ${
                snapshot.active === 'resp1'
                  ? 'stroke-emerald-500 dark:stroke-emerald-400'
                  : 'stroke-slate-400 dark:stroke-slate-500'
              }`}
            />
            <text
              x={(X.consumer + X.broker) / 2}
              y={ROW.resp1 - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-emerald-700 font-mono dark:fill-emerald-300"
            >
              FetchResponse · 1040..1043
            </text>
          </g>

          {/* records 1: consumer -> app */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.showRecords1 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.consumer - 8}
              y1={ROW.records1}
              x2={X.app + 12}
              y2={ROW.records1}
              strokeWidth={snapshot.active === 'records1' ? 2.5 : 1.2}
              markerEnd={markerFor(snapshot.active === 'records1')}
              className={`transition-colors duration-500 motion-reduce:transition-none ${
                snapshot.active === 'records1'
                  ? 'stroke-emerald-500 dark:stroke-emerald-400'
                  : 'stroke-slate-400 dark:stroke-slate-500'
              }`}
            />
            <text
              x={(X.app + X.consumer) / 2}
              y={ROW.records1 - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-emerald-700 dark:fill-emerald-300"
            >
              ConsumerRecords (4)
            </text>
          </g>

          {/* process bar on app lane */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.showProcess ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <rect
              x={X.app - 6}
              y={184}
              width={12}
              height={snapshot.processLong ? 130 : 56}
              rx={3}
              strokeWidth={1}
              className={`transition-colors duration-500 motion-reduce:transition-none ${
                snapshot.kicked
                  ? 'fill-rose-100 stroke-rose-500 dark:fill-rose-950/60 dark:stroke-rose-500'
                  : snapshot.processLong
                    ? 'fill-amber-100 stroke-amber-500 dark:fill-amber-950/60 dark:stroke-amber-500'
                    : 'fill-primary-100 stroke-primary-400 dark:fill-primary-950/60 dark:stroke-primary-500'
              }`}
            />
            <text
              x={X.app - 20}
              y={snapshot.processLong ? 250 : 212}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              transform={`rotate(-90 ${X.app - 20} ${
                snapshot.processLong ? 250 : 212
              })`}
              className={
                snapshot.kicked
                  ? 'fill-rose-700 dark:fill-rose-300'
                  : snapshot.processLong
                    ? 'fill-amber-700 dark:fill-amber-300'
                    : 'fill-primary-700 dark:fill-primary-300'
              }
            >
              {snapshot.processLong ? 'پردازش طولانی' : 'پردازش'}
            </text>
          </g>

          {/* heartbeat: consumer -> coordinator */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.showHeartbeat ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.consumer + 8}
              y1={ROW.heartbeat}
              x2={X.coord - 12}
              y2={ROW.heartbeat}
              strokeDasharray="5 4"
              strokeWidth={snapshot.active === 'heartbeat' ? 2.5 : 1.2}
              markerEnd={markerFor(snapshot.active === 'heartbeat')}
              className={`transition-colors duration-500 motion-reduce:transition-none ${lineClass(
                snapshot.active === 'heartbeat',
              )}`}
            />
            <text
              x={(X.consumer + X.coord) / 2}
              y={ROW.heartbeat - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-slate-700 font-mono dark:fill-slate-300"
            >
              heartbeat · 3s
            </text>
          </g>

          {/* poll 2: app -> consumer */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.showPoll2 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.app + 8}
              y1={ROW.poll2}
              x2={X.consumer - 12}
              y2={ROW.poll2}
              strokeWidth={1.2}
              markerEnd={markerFor(false)}
              className={lineClass(false)}
            />
            <text
              x={(X.app + X.consumer) / 2}
              y={ROW.poll2 - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-slate-700 font-mono dark:fill-slate-300"
            >
              poll(500ms)
            </text>
          </g>

          {/* fetch 2: consumer -> broker */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.showFetch2 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.consumer + 8}
              y1={ROW.fetch2}
              x2={X.broker - 12}
              y2={ROW.fetch2}
              strokeWidth={1.2}
              markerEnd={markerFor(false)}
              className={lineClass(false)}
            />
            <text
              x={(X.consumer + X.broker) / 2}
              y={ROW.fetch2 - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-slate-700 font-mono dark:fill-slate-300"
            >
              FetchRequest · position 1044
            </text>
          </g>

          {/* empty response */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.showEmpty ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.broker - 8}
              y1={ROW.empty}
              x2={X.consumer + 12}
              y2={ROW.empty}
              strokeDasharray="5 4"
              strokeWidth={snapshot.active === 'empty' ? 2.5 : 1.2}
              markerEnd={
                snapshot.active === 'empty'
                  ? 'url(#poll-arrow-empty)'
                  : markerFor(false)
              }
              className={`transition-colors duration-500 motion-reduce:transition-none ${
                snapshot.active === 'empty'
                  ? 'stroke-amber-500 dark:stroke-amber-400'
                  : 'stroke-slate-400 dark:stroke-slate-500'
              }`}
            />
            <text
              x={(X.consumer + X.broker) / 2}
              y={ROW.empty - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-amber-700 dark:fill-amber-300"
            >
              empty after 500ms
            </text>
          </g>

          {/* records response 2 */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.showResp2 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.broker - 8}
              y1={ROW.empty}
              x2={X.consumer + 12}
              y2={ROW.empty}
              strokeWidth={snapshot.active === 'resp2' ? 2.5 : 1.2}
              markerEnd={markerFor(snapshot.active === 'resp2')}
              className={`transition-colors duration-500 motion-reduce:transition-none ${
                snapshot.active === 'resp2'
                  ? 'stroke-emerald-500 dark:stroke-emerald-400'
                  : 'stroke-slate-400 dark:stroke-slate-500'
              }`}
            />
            <text
              x={(X.consumer + X.broker) / 2}
              y={ROW.empty - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-emerald-700 font-mono dark:fill-emerald-300"
            >
              FetchResponse · 1044..1046
            </text>
          </g>

          {/* kicked marker */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.kicked ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <circle
              cx={X.coord}
              cy={ROW.heartbeat}
              r={11}
              className="fill-rose-50 stroke-rose-500 dark:fill-rose-950/60 dark:stroke-rose-500"
              strokeWidth={1.5}
            />
            <path
              d={`M ${X.coord - 5} ${ROW.heartbeat - 5} L ${X.coord + 5} ${
                ROW.heartbeat + 5
              } M ${X.coord + 5} ${ROW.heartbeat - 5} L ${X.coord - 5} ${
                ROW.heartbeat + 5
              }`}
              className="stroke-rose-600 dark:stroke-rose-300"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <text
              x={(X.consumer + X.coord) / 2}
              y={ROW.heartbeat + 20}
              textAnchor="middle"
              fontSize={11}
              className="fill-rose-700 dark:fill-rose-300"
            >
              حذف از گروه
            </text>
          </g>

          {/* partition log panel */}
          <text
            x={LOG_X}
            y={362}
            fontSize={11}
            className="fill-slate-500 dark:fill-slate-400"
          >
            partition 0 · log
          </text>
          <text
            x={20}
            y={374}
            fontSize={12}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            position = {snapshot.position}
          </text>
          <text
            x={20}
            y={394}
            fontSize={11}
            className="fill-slate-600 font-mono dark:fill-slate-300"
          >
            last batch = {fetchedLabel}
          </text>

          {LOG_OFFSETS.map((offset, index) => {
            const isFetched =
              snapshot.fetchedStart !== null &&
              offset >= snapshot.fetchedStart &&
              offset <= (snapshot.fetchedEnd ?? snapshot.fetchedStart)
            const isNew = snapshot.active === 'produce' && offset > FIRST_BATCH_END
            const mark: CellMark =
              isFetched || isNew
                ? 'fetched'
                : offset < snapshot.position
                  ? 'consumed'
                  : offset <= snapshot.logEnd
                    ? 'available'
                    : 'unwritten'
            const x = cellX(index)

            return (
              <g key={`log-${offset}`}>
                <rect
                  x={x}
                  y={370}
                  width={CELL_W}
                  height={32}
                  rx={4}
                  strokeWidth={1}
                  strokeDasharray={mark === 'unwritten' ? '4 3' : undefined}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                    mark,
                  )}`}
                />
                <text
                  x={x + CELL_W / 2}
                  y={391}
                  textAnchor="middle"
                  fontSize={11}
                  className="fill-slate-800 font-mono dark:fill-slate-200"
                >
                  {offset}
                </text>
              </g>
            )
          })}

          <path
            d={`M ${positionX - 6} 412 L ${positionX + 6} 412 L ${positionX} 404 Z`}
            className="fill-emerald-500 dark:fill-emerald-400"
          />
          <text
            x={positionX}
            y={428}
            textAnchor="middle"
            fontSize={10}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            position
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، زمان‌ها و تعداد رکوردها کوچک شده‌اند؛ منطق همان چیزی است که
        کافکا اجرا می‌کند: مصرف‌کننده با{' '}
        <span dir="ltr" className="font-mono">poll</span> داده را می‌کشد، بروکر
        فقط به <span dir="ltr" className="font-mono">FetchRequest</span> پاسخ
        می‌دهد و heartbeat در thread جداگانه ارسال می‌شود.
      </p>
    </div>
  )
}
