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
type ConsumerId = 'c1' | 'c2' | 'c3'
type Active = 'none' | 'join' | 'assign' | 'crash'

interface SnapshotState {
  stage: Stage
  present: Record<ConsumerId, boolean>
  assignment: Record<ConsumerId, number[]>
  rebalancing: boolean
  crashed: ConsumerId | null
  active: Active
  newCells: string[]
  lostCells: string[]
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const CONSUMERS: { id: ConsumerId; label: string }[] = [
  { id: 'c1', label: 'C1' },
  { id: 'c2', label: 'C2' },
  { id: 'c3', label: 'C3' },
]

const PARTITIONS = [0, 1, 2, 3]

function cellKey(consumer: ConsumerId, partition: number): string {
  return `${consumer}-${partition}`
}

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    stage: 1,
    present: { c1: true, c2: false, c3: false },
    assignment: { c1: [0, 1, 2, 3], c2: [], c3: [] },
    rebalancing: false,
    crashed: null,
    active: 'none',
    newCells: [],
    lostCells: [],
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      گروه <Ltr>billing</Ltr> فقط یک عضو دارد: <Ltr>C1</Ltr>. چون هر پارتیشن
      باید دقیقاً یک مصرف‌کننده در گروه داشته باشد، هر ۴ پارتیشن تاپیک{' '}
      <Ltr>orders</Ltr> به <Ltr>C1</Ltr> می‌رسد.
    </>,
    { active: 'assign' },
  )

  push(
    <>
      <Ltr>C2</Ltr> با همان <Ltr>group.id</Ltr> به گروه می‌پیوندد. Group
      Coordinator یک <Ltr>JoinGroup</Ltr> می‌گیرد و rebalance را شروع می‌کند. در
      rebalance ساده (eager) همهٔ اعضا ابتدا همهٔ پارتیشن‌ها را رها می‌کنند؛ پس
      تا پایان آن هیچ رکوردی مصرف نمی‌شود.
    </>,
    {
      present: { c1: true, c2: true, c3: false },
      rebalancing: true,
      active: 'join',
      newCells: [],
      lostCells: [],
    },
  )

  push(
    <>
      Coordinator یکی از اعضا را Leader می‌کند و Leader با استراتژی تخصیص، ۴
      پارتیشن را بین ۲ عضو تقسیم می‌کند: <Ltr>C1</Ltr> دو پارتیشن اول و{' '}
      <Ltr>C2</Ltr> دو پارتیشن بعدی.
    </>,
    {
      assignment: { c1: [0, 1], c2: [2, 3], c3: [] },
      active: 'assign',
      newCells: [cellKey('c2', 2), cellKey('c2', 3)],
      lostCells: [cellKey('c1', 2), cellKey('c1', 3)],
    },
  )

  push(
    <>
      نتیجه در <Ltr>SyncGroup</Ltr> به همه اعلام می‌شود. حالا <Ltr>C1</Ltr> روی{' '}
      <Ltr>P0</Ltr> و <Ltr>P1</Ltr> و <Ltr>C2</Ltr> روی <Ltr>P2</Ltr> و{' '}
      <Ltr>P3</Ltr> کار می‌کند و مصرف از سر گرفته می‌شود.
    </>,
    {
      rebalancing: false,
      active: 'none',
      newCells: [],
      lostCells: [],
    },
  )

  push(
    <>
      حالا <Ltr>C3</Ltr> هم می‌پیوندد. دوباره rebalance آغاز می‌شود و تخصیص
      فعلی تا محاسبهٔ جدید معلق می‌ماند.
    </>,
    {
      stage: 2,
      present: { c1: true, c2: true, c3: true },
      rebalancing: true,
      active: 'join',
    },
  )

  push(
    <>
      با ۴ پارتیشن و ۳ عضو، تخصیص برابر نیست: <Ltr>C1</Ltr> دو پارتیشن می‌گیرد و{' '}
      <Ltr>C2</Ltr> و <Ltr>C3</Ltr> هر کدام یکی. اگر عضو چهارم اضافه شود هر کدام
      یک پارتیشن می‌گیرند؛ عضو پنجم بی‌پارتیشن می‌ماند.
    </>,
    {
      assignment: { c1: [0, 1], c2: [2], c3: [3] },
      rebalancing: false,
      active: 'assign',
      newCells: [cellKey('c3', 3)],
      lostCells: [cellKey('c2', 3)],
    },
  )

  push(
    <>
      <Ltr>C2</Ltr> از کار می‌افتد و heartbeat نمی‌فرستد. Coordinator تا{' '}
      <Ltr>session.timeout.ms</Ltr> (پیش‌فرض ۴۵ ثانیه) صبر می‌کند؛ در این مدت
      پارتیشن‌های <Ltr>C2</Ltr> هنوز به او نسبت داده شده‌اند ولی مصرف نمی‌شوند.
    </>,
    {
      crashed: 'c2',
      active: 'crash',
      newCells: [],
      lostCells: [],
    },
  )

  push(
    <>
      مهلت تمام می‌شود و Coordinator <Ltr>C2</Ltr> را حذف می‌کند. یک rebalance
      دیگر شروع می‌شود و همهٔ تخصیص‌ها رها می‌شوند.
    </>,
    {
      present: { c1: true, c2: false, c3: true },
      crashed: null,
      rebalancing: true,
      active: 'crash',
    },
  )

  push(
    <>
      پارتیشن‌های <Ltr>C2</Ltr> بین اعضای باقی‌مانده پخش می‌شوند: <Ltr>C1</Ltr>{' '}
      همان دو پارتیشن را نگه می‌دارد و <Ltr>C3</Ltr> حالا <Ltr>P2</Ltr> و{' '}
      <Ltr>P3</Ltr> را می‌گیرد.
    </>,
    {
      assignment: { c1: [0, 1], c2: [], c3: [2, 3] },
      rebalancing: false,
      active: 'assign',
      newCells: [cellKey('c3', 2)],
      lostCells: [],
    },
  )

  push(
    <>
      قاعده: تعداد مصرف‌کننده‌های فعال در یک گروه سقف موازی‌سازی است، ولی هر
      پارتیشن فقط به یک عضو می‌رسد. هر تغییر در اعضا یک rebalance می‌سازد که
      برای مدتی مصرف را متوقف می‌کند؛ به همین دلیل هم مقیاس‌پذیری می‌دهد و هم
      هزینه دارد.
    </>,
    { active: 'none' },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const ROW_Y = (index: number) => 92 + index * 66
const COL_X = (index: number) => 150 + index * 140
const CELL_W = 120
const CELL_H = 50

type CellMark = 'owned' | 'new' | 'lost' | 'revoked' | 'idle'

function cellClass(mark: CellMark): string {
  switch (mark) {
    case 'owned':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    case 'new':
      return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
    case 'lost':
      return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/60 dark:stroke-rose-500'
    case 'revoked':
      return 'fill-slate-100 stroke-slate-300 dark:fill-slate-800/60 dark:stroke-slate-700'
    default:
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

export function RebalanceExplainer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1800)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const autoPlaying = playing && !isLast
  const memberCount = CONSUMERS.filter(
    (consumer) => snapshot.present[consumer.id],
  ).length

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

  function markFor(consumer: ConsumerId, partition: number): CellMark {
    const key = cellKey(consumer, partition)
    if (snapshot.lostCells.includes(key)) return 'lost'
    if (!snapshot.present[consumer]) return 'idle'
    if (snapshot.newCells.includes(key)) return 'new'
    if (snapshot.rebalancing) return 'revoked'
    if (!snapshot.assignment[consumer].includes(partition)) return 'idle'
    return 'owned'
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            وقتی عضوی به گروه اضافه یا از آن حذف می‌شود چه اتفاقی می‌افتد؟
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
          ۱ · پیوستن عضو جدید
        </div>
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors motion-reduce:transition-none ${
            snapshot.stage === 2
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          ۲ · خروج عضو
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
          viewBox="0 0 720 300"
          role="img"
          aria-label="نمودار تخصیص پارتیشن‌های تاپیک orders به مصرف‌کننده‌های گروه billing در طول یک rebalance"
          className="h-auto w-full min-w-[600px]"
        >
          <text
            x={20}
            y={26}
            fontSize={12}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            group.id = billing
          </text>
          <text
            x={20}
            y={44}
            fontSize={12}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            topic = orders · partitions = 4
          </text>
          <text
            x={700}
            y={26}
            textAnchor="end"
            fontSize={12}
            className="fill-slate-500 dark:fill-slate-400"
          >
            اعضا: {toPersianDigits(memberCount)}
          </text>

          {snapshot.rebalancing ? (
            <g>
              <rect
                x={430}
                y={14}
                width={160}
                height={26}
                rx={13}
                className="fill-amber-50 stroke-amber-400 dark:fill-amber-950/60 dark:stroke-amber-500"
                strokeWidth={1}
              />
              <text
                x={510}
                y={31}
                textAnchor="middle"
                fontSize={11}
                className="fill-amber-700 dark:fill-amber-300"
              >
                Rebalance در جریان
              </text>
            </g>
          ) : null}

          {PARTITIONS.map((partition, index) => (
            <text
              key={`head-${partition}`}
              x={COL_X(index) + CELL_W / 2}
              y={72}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              className="fill-slate-700 font-mono dark:fill-slate-300"
            >
              P{partition}
            </text>
          ))}

          {CONSUMERS.map((consumer, rowIndex) => {
            const y = ROW_Y(rowIndex)
            const isPresent = snapshot.present[consumer.id]
            const isCrashed = snapshot.crashed === consumer.id
            const isJoining =
              snapshot.active === 'join' && isPresent && snapshot.rebalancing
            const labelClass = isCrashed
              ? 'fill-rose-50 stroke-rose-500 dark:fill-rose-950/60 dark:stroke-rose-500'
              : isPresent
                ? 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
                : 'fill-slate-50 stroke-slate-200 dark:fill-slate-900/50 dark:stroke-slate-800'
            const textClass = isPresent
              ? 'fill-slate-900 dark:fill-slate-100'
              : 'fill-slate-400 dark:fill-slate-600'

            return (
              <g
                key={consumer.id}
                className={`transition-opacity duration-500 motion-reduce:transition-none ${
                  isPresent || isCrashed ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <rect
                  x={20}
                  y={y}
                  width={110}
                  height={CELL_H}
                  rx={6}
                  strokeWidth={isJoining ? 2 : 1}
                  className={`${labelClass} ${
                    isJoining
                      ? 'stroke-primary-500 dark:stroke-primary-400'
                      : ''
                  }`}
                />
                <text
                  x={75}
                  y={y + 22}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={600}
                  className={`font-mono ${textClass}`}
                >
                  {consumer.label}
                </text>
                <text
                  x={75}
                  y={y + 39}
                  textAnchor="middle"
                  fontSize={10}
                  className={
                    isCrashed
                      ? 'fill-rose-700 dark:fill-rose-300'
                      : isPresent
                        ? 'fill-slate-500 dark:fill-slate-400'
                        : 'fill-slate-400 dark:fill-slate-600'
                  }
                >
                  {isCrashed
                    ? 'heartbeat قطع'
                    : isPresent
                      ? 'عضو گروه'
                      : 'خارج از گروه'}
                </text>

                {PARTITIONS.map((partition, colIndex) => {
                  const mark = markFor(consumer.id, partition)
                  const owned = mark === 'owned' || mark === 'new'

                  return (
                    <g key={`${consumer.id}-${partition}`}>
                      <rect
                        x={COL_X(colIndex)}
                        y={y}
                        width={CELL_W}
                        height={CELL_H}
                        rx={6}
                        strokeWidth={mark === 'new' ? 2 : 1}
                        strokeDasharray={mark === 'lost' ? '5 4' : undefined}
                        className={`transition-colors duration-500 motion-reduce:transition-none ${cellClass(
                          mark,
                        )}`}
                      />
                      {owned ? (
                        <text
                          x={COL_X(colIndex) + CELL_W / 2}
                          y={y + 30}
                          textAnchor="middle"
                          fontSize={14}
                          className="fill-emerald-700 dark:fill-emerald-300"
                        >
                          ✓
                        </text>
                      ) : null}
                      {mark === 'lost' ? (
                        <text
                          x={COL_X(colIndex) + CELL_W / 2}
                          y={y + 30}
                          textAnchor="middle"
                          fontSize={11}
                          className="fill-rose-700 dark:fill-rose-300"
                        >
                          رها شد
                        </text>
                      ) : null}
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، تعداد اعضا و پارتیشن‌ها کوچک شده‌اند؛ منطق همان چیزی است که
        کافکا اجرا می‌کند: هر پارتیشن در یک گروه فقط به یک عضو می‌رسد و هر تغییر
        در عضویت یک rebalance می‌سازد.
      </p>
    </div>
  )
}
