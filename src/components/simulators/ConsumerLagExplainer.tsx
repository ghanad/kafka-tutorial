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

type PartitionId = 'p0' | 'p1' | 'p2'

interface PartitionState {
  leo: number
  committed: number
}

interface SnapshotState {
  partitions: Record<PartitionId, PartitionState>
  active: PartitionId | null
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const PARTITIONS: PartitionId[] = ['p0', 'p1', 'p2']
const DOMAIN_MIN = 900
const DOMAIN_MAX = 1500
const BAR_X = 80
const BAR_W = 340

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    partitions: {
      p0: { leo: 1050, committed: 1050 },
      p1: { leo: 980, committed: 980 },
      p2: { leo: 1120, committed: 1120 },
    },
    active: null,
  }

  const push = (
    caption: ReactNode,
    patch: Partial<SnapshotState> = {},
  ) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      تاپیک <Ltr>orders</Ltr> سه پارتیشن دارد و مصرف‌کننده‌ها به انتهای هر سه
      رسیده‌اند: برای هر پارتیشن <Ltr>LEO</Ltr> و committed offset برابر است،
      پس lag صفر است.
    </>,
  )
  push(
    <>
      تولیدکننده ۲۰۰ رکورد به پارتیشن <Ltr>P0</Ltr> می‌نویسد. <Ltr>LEO</Ltr> از{' '}
      <Ltr>1050</Ltr> به <Ltr>1250</Ltr> می‌رسد ولی committed offset همان{' '}
      <Ltr>1050</Ltr> است؛ lag این پارتیشن <Ltr>200</Ltr> می‌شود.
    </>,
    {
      active: 'p0',
      partitions: {
        ...state.partitions,
        p0: { leo: 1250, committed: 1050 },
      },
    },
  )
  push(
    <>
      ۱۰۰ رکورد هم به <Ltr>P1</Ltr> می‌رسد. lag آن <Ltr>100</Ltr> است و مجموع
      lag گروه به <Ltr>300</Ltr> می‌رسد. توجه کنید که lag هر پارتیشن جدا حساب
      می‌شود و بعد جمع می‌شود.
    </>,
    {
      active: 'p1',
      partitions: {
        ...state.partitions,
        p1: { leo: 1080, committed: 980 },
      },
    },
  )
  push(
    <>
      مصرف‌کننده ۱۵۰ رکورد از <Ltr>P0</Ltr> را پردازش و commit می‌کند. committed
      offset به <Ltr>1200</Ltr> می‌رسد و lag همان پارتیشن به <Ltr>50</Ltr>{' '}
      کاهش می‌یابد؛ مجموع lag حالا <Ltr>150</Ltr> است.
    </>,
    {
      active: 'p0',
      partitions: {
        ...state.partitions,
        p0: { leo: 1250, committed: 1200 },
      },
    },
  )
  push(
    <>
      مصرف‌کننده بقیهٔ <Ltr>P0</Ltr> و همهٔ <Ltr>P1</Ltr> را پردازش می‌کند.
      committed offset هر دو به <Ltr>LEO</Ltr> می‌رسد و مجموع lag صفر می‌شود؛
      یعنی گروه دوباره به انتهای لاگ رسیده است.
    </>,
    {
      active: null,
      partitions: {
        ...state.partitions,
        p0: { leo: 1250, committed: 1250 },
        p1: { leo: 1080, committed: 1080 },
      },
    },
  )
  push(
    <>
      حالا یکی از مصرف‌کننده‌ها کند شده است؛ مثلاً دیتابیس پایین‌دستی پاسخ نمی‌دهد
      و هر دسته طولانی می‌شود. در همین فاصله ۳۰۰ رکورد به <Ltr>P2</Ltr> می‌رسد و
      lag آن به <Ltr>300</Ltr> می‌رود.
    </>,
    {
      active: 'p2',
      partitions: {
        ...state.partitions,
        p2: { leo: 1420, committed: 1120 },
      },
    },
  )
  push(
    <>
      چون بین دو <Ltr>poll</Ltr> بیش از <Ltr>max.poll.interval.ms</Ltr> گذشته،
      گروه مصرف‌کنندهٔ کند را بیرون می‌اندازد و rebalance می‌زند. <Ltr>P2</Ltr>{' '}
      به یک مصرف‌کنندهٔ سالم می‌رسد؛ آفست‌ها هنوز همان‌جا هستند.
    </>,
    { active: 'p2' },
  )
  push(
    <>
      مصرف‌کنندهٔ جدید هر ۳۰۰ رکورد را پردازش و commit می‌کند. committed offset به{' '}
      <Ltr>1420</Ltr> می‌رسد و lag کل گروه دوباره صفر می‌شود.
    </>,
    {
      active: 'p2',
      partitions: {
        ...state.partitions,
        p2: { leo: 1420, committed: 1420 },
      },
    },
  )
  push(
    <>
      قاعده: <Ltr>lag = LEO − committed offset</Ltr> برای هر پارتیشن، و lag گروه
      مجموع همین مقادیر است. lag موقت طبیعی است؛ lag پایدار یعنی نرخ مصرف از نرخ
      تولید عقب‌تر است و باید ظرفیت یا سرعت پردازش را بالا برد.
    </>,
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

function barX(value: number) {
  const ratio = (value - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)
  return BAR_X + Math.max(0, Math.min(1, ratio)) * BAR_W
}

function lagOf(partition: PartitionState) {
  return partition.leo - partition.committed
}

export function ConsumerLagExplainer() {
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

  const totalLag = PARTITIONS.reduce(
    (sum, id) => sum + lagOf(snapshot.partitions[id]),
    0,
  )

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            Consumer Lag چطور ساخته می‌شود و چطور دوباره صفر می‌شود؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </Badge>
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

      <div className="mt-3 min-h-[6.5rem] rounded-xl border border-primary-100 border-s-4 border-s-primary-500 bg-primary-50/70 p-3 text-primary-950 dark:border-primary-900/60 dark:border-s-primary-400 dark:bg-primary-950/40 dark:text-primary-100">
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
          viewBox="0 0 700 300"
          role="img"
          aria-label="سه پارتیشن تاپیک orders با LEO، committed offset و lag هر پارتیشن و مجموع lag گروه"
          className="h-auto w-full min-w-[600px]"
        >
          <text
            x={BAR_X}
            y={28}
            fontSize={10}
            className="fill-slate-500 dark:fill-slate-400"
          >
            committed
          </text>
          <text
            x={BAR_X + BAR_W}
            y={28}
            textAnchor="end"
            fontSize={10}
            className="fill-slate-500 dark:fill-slate-400"
          >
            LEO
          </text>

          {PARTITIONS.map((id, index) => {
            const partition = snapshot.partitions[id]
            const lag = lagOf(partition)
            const y = 56 + index * 62
            const active = snapshot.active === id
            return (
              <g key={id}>
                <text
                  x={20}
                  y={y + 13}
                  fontSize={12}
                  fontWeight={700}
                  className="fill-slate-700 font-mono dark:fill-slate-200"
                >
                  {id.toUpperCase()}
                </text>
                <rect
                  x={BAR_X}
                  y={y}
                  width={BAR_W}
                  height={16}
                  rx={8}
                  className="fill-slate-200 dark:fill-slate-800"
                />
                <rect
                  x={barX(partition.committed)}
                  y={y}
                  width={Math.max(0, barX(partition.leo) - barX(partition.committed))}
                  height={16}
                  rx={8}
                  className={`transition-all duration-500 motion-reduce:transition-none ${
                    lag > 0
                      ? 'fill-amber-400 dark:fill-amber-500'
                      : 'fill-emerald-500 dark:fill-emerald-400'
                  }`}
                />
                <line
                  x1={barX(partition.committed)}
                  y1={y - 4}
                  x2={barX(partition.committed)}
                  y2={y + 20}
                  strokeWidth={2}
                  className="stroke-slate-600 dark:stroke-slate-300"
                />
                <line
                  x1={barX(partition.leo)}
                  y1={y - 4}
                  x2={barX(partition.leo)}
                  y2={y + 20}
                  strokeWidth={2}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${
                    active
                      ? 'stroke-primary-500 dark:stroke-primary-400'
                      : 'stroke-slate-400 dark:stroke-slate-500'
                  }`}
                />
                <text
                  x={450}
                  y={y + 7}
                  fontSize={11}
                  className="fill-slate-700 font-mono dark:fill-slate-300"
                >
                  LEO {partition.leo}
                </text>
                <text
                  x={450}
                  y={y + 21}
                  fontSize={11}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  C {partition.committed}
                </text>
                <text
                  x={585}
                  y={y + 14}
                  fontSize={12}
                  fontWeight={700}
                  className={`font-mono ${
                    lag > 0
                      ? 'fill-amber-600 dark:fill-amber-400'
                      : 'fill-emerald-600 dark:fill-emerald-400'
                  }`}
                >
                  lag {lag}
                </text>
              </g>
            )
          })}

          <line
            x1={20}
            y1={248}
            x2={680}
            y2={248}
            className="stroke-slate-200 dark:stroke-slate-800"
          />
          <text
            x={20}
            y={272}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-700 dark:fill-slate-200"
          >
            total lag
          </text>
          <text
            x={95}
            y={272}
            fontSize={14}
            fontWeight={700}
            className={`font-mono ${
              totalLag > 0
                ? 'fill-amber-600 dark:fill-amber-400'
                : 'fill-emerald-600 dark:fill-emerald-400'
            }`}
          >
            {totalLag}
          </text>
          <text
            x={450}
            y={272}
            fontSize={10}
            className="fill-slate-400 dark:fill-slate-500"
          >
            lag = LEO − committed
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط سه پارتیشن و چند گام از یک سناریوی ثابت نشان داده شده
        است؛ محاسبهٔ lag دقیقاً همان چیزی است که{' '}
        <span dir="ltr" className="font-mono">
          kafka-consumer-groups.sh
        </span>{' '}
        گزارش می‌کند.
      </p>
    </div>
  )
}
