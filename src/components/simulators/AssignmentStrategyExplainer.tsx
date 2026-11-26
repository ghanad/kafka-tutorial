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

type Stage = 'range' | 'roundrobin' | 'sticky' | 'cooperative'
type Owner = 'c1' | 'c2' | 'c3' | 'c4' | null
type Mark = 'idle' | 'active' | 'moved' | 'revoked' | 'kept'
type PartitionId =
  | 'orders-0'
  | 'orders-1'
  | 'orders-2'
  | 'orders-3'
  | 'payments-0'
  | 'payments-1'

const PARTITIONS: PartitionId[] = [
  'orders-0',
  'orders-1',
  'orders-2',
  'orders-3',
  'payments-0',
  'payments-1',
]

const CONSUMERS = ['c1', 'c2', 'c3', 'c4'] as const

interface SnapshotState {
  owners: Record<PartitionId, Owner>
  marks: Record<PartitionId, Mark>
  present: Record<(typeof CONSUMERS)[number], boolean>
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const EMPTY_OWNERS: Record<PartitionId, Owner> = {
  'orders-0': null,
  'orders-1': null,
  'orders-2': null,
  'orders-3': null,
  'payments-0': null,
  'payments-1': null,
}

const EMPTY_MARKS: Record<PartitionId, Mark> = {
  'orders-0': 'idle',
  'orders-1': 'idle',
  'orders-2': 'idle',
  'orders-3': 'idle',
  'payments-0': 'idle',
  'payments-1': 'idle',
}

function buildSnapshots(stage: Stage): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    owners: { ...EMPTY_OWNERS },
    marks: { ...EMPTY_MARKS },
    present: { c1: true, c2: true, c3: true, c4: false },
  }

  const push = (
    caption: ReactNode,
    patch: Partial<SnapshotState> = {},
  ) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  if (stage === 'range') {
    push(
      <>
        دو تاپیک داریم: <Ltr>orders</Ltr> با ۴ پارتیشن و <Ltr>payments</Ltr> با ۲
        پارتیشن. سه مصرف‌کنندهٔ <Ltr>C1</Ltr> تا <Ltr>C3</Ltr> در یک گروه‌اند و
        هنوز هیچ پارتیشنی تخصیص نیافته است.
      </>,
    )
    push(
      <>
        <Ltr>Range</Ltr> هر تاپیک را جداگانه تقسیم می‌کند. برای{' '}
        <Ltr>orders</Ltr> سهم هر مصرف‌کننده{' '}
        <Ltr>ceil(4 / 3) = 2</Ltr> پارتیشن است: <Ltr>C1</Ltr> پارتیشن‌های{' '}
        <Ltr>0</Ltr> و <Ltr>1</Ltr>، <Ltr>C2</Ltr> پارتیشن‌های <Ltr>2</Ltr> و{' '}
        <Ltr>3</Ltr> و <Ltr>C3</Ltr> هیچ.
      </>,
      {
        owners: {
          ...state.owners,
          'orders-0': 'c1',
          'orders-1': 'c1',
          'orders-2': 'c2',
          'orders-3': 'c2',
        },
        marks: {
          ...state.marks,
          'orders-0': 'active',
          'orders-1': 'active',
          'orders-2': 'active',
          'orders-3': 'active',
        },
      },
    )
    push(
      <>
        حالا <Ltr>payments</Ltr> با ۲ پارتیشن و ۳ مصرف‌کننده: سهم هر کدام{' '}
        <Ltr>ceil(2 / 3) = 1</Ltr> است، پس <Ltr>C1</Ltr> پارتیشن <Ltr>0</Ltr> و{' '}
        <Ltr>C2</Ltr> پارتیشن <Ltr>1</Ltr> را می‌گیرد و <Ltr>C3</Ltr> باز هم
        بی‌کار می‌ماند.
      </>,
      {
        owners: {
          ...state.owners,
          'payments-0': 'c1',
          'payments-1': 'c2',
        },
        marks: {
          ...state.marks,
          'orders-0': 'kept',
          'orders-1': 'kept',
          'orders-2': 'kept',
          'orders-3': 'kept',
          'payments-0': 'active',
          'payments-1': 'active',
        },
      },
    )
    push(
      <>
        نتیجهٔ <Ltr>Range</Ltr>: <Ltr>C1</Ltr> سه پارتیشن، <Ltr>C2</Ltr> سه
        پارتیشن و <Ltr>C3</Ltr> صفر. تقسیم هر تاپیک به‌تنهایی منصفانه بود، ولی
        جمعشان نابرابر شد. قاعده: <Ltr>Range</Ltr> مرزهای هر تاپیک را جدا
        محاسبه می‌کند و بی‌کاری را بین تاپیک‌ها جبران نمی‌کند.
      </>,
      {
        marks: {
          ...EMPTY_MARKS,
          'orders-0': 'kept',
          'orders-1': 'kept',
          'orders-2': 'kept',
          'orders-3': 'kept',
          'payments-0': 'kept',
          'payments-1': 'kept',
        },
      },
    )
  }

  if (stage === 'roundrobin') {
    push(
      <>
        همان شش پارتیشن، ولی این بار <Ltr>RoundRobin</Ltr> همهٔ پارتیشن‌های همهٔ
        تاپیک‌ها را در یک صف مرتب می‌چیند و یکی‌یکی بین اعضا می‌گرداند.
      </>,
    )
    push(
      <>
        سه تخصیص اول: <Ltr>orders-0</Ltr> به <Ltr>C1</Ltr>،{' '}
        <Ltr>orders-1</Ltr> به <Ltr>C2</Ltr> و <Ltr>orders-2</Ltr> به{' '}
        <Ltr>C3</Ltr>.
      </>,
      {
        owners: {
          ...state.owners,
          'orders-0': 'c1',
          'orders-1': 'c2',
          'orders-2': 'c3',
        },
        marks: {
          ...state.marks,
          'orders-0': 'active',
          'orders-1': 'active',
          'orders-2': 'active',
        },
      },
    )
    push(
      <>
        ادامهٔ چرخه: <Ltr>orders-3</Ltr> به <Ltr>C1</Ltr>،{' '}
        <Ltr>payments-0</Ltr> به <Ltr>C2</Ltr> و <Ltr>payments-1</Ltr> به{' '}
        <Ltr>C3</Ltr>. حالا هر سه مصرف‌کننده دقیقاً دو پارتیشن دارند.
      </>,
      {
        owners: {
          ...state.owners,
          'orders-3': 'c1',
          'payments-0': 'c2',
          'payments-1': 'c3',
        },
        marks: {
          ...state.marks,
          'orders-0': 'kept',
          'orders-1': 'kept',
          'orders-2': 'kept',
          'orders-3': 'active',
          'payments-0': 'active',
          'payments-1': 'active',
        },
      },
    )
    push(
      <>
        نتیجهٔ <Ltr>RoundRobin</Ltr>: توزیع کاملاً یکنواخت. ولی ترتیب صف به
        ترکیب اعضا وابسته است؛ با ورود یا خروج یک عضو، تقریباً همهٔ تخصیص‌ها
        دوباره حساب می‌شوند و پارتیشن‌های زیادی جابه‌جا می‌شوند.
      </>,
    )
  }

  if (stage === 'sticky') {
    push(
      <>
        نقطهٔ شروع یک تخصیص متعادل است: <Ltr>C1</Ltr> پارتیشن‌های{' '}
        <Ltr>orders-0</Ltr> و <Ltr>orders-3</Ltr>، <Ltr>C2</Ltr> پارتیشن‌های{' '}
        <Ltr>orders-1</Ltr> و <Ltr>payments-0</Ltr> و <Ltr>C3</Ltr>{' '}
        پارتیشن‌های <Ltr>orders-2</Ltr> و <Ltr>payments-1</Ltr>.
      </>,
      {
        owners: {
          'orders-0': 'c1',
          'orders-1': 'c2',
          'orders-2': 'c3',
          'orders-3': 'c1',
          'payments-0': 'c2',
          'payments-1': 'c3',
        },
        marks: {
          'orders-0': 'kept',
          'orders-1': 'kept',
          'orders-2': 'kept',
          'orders-3': 'kept',
          'payments-0': 'kept',
          'payments-1': 'kept',
        },
      },
    )
    push(
      <>
        <Ltr>C3</Ltr> از گروه خارج می‌شود. دو پارتیشن <Ltr>orders-2</Ltr> و{' '}
        <Ltr>payments-1</Ltr> بی‌صاحب می‌شوند و تا پایان rebalance مصرف
        نمی‌شوند.
      </>,
      {
        owners: {
          ...state.owners,
          'orders-2': null,
          'payments-1': null,
        },
        marks: {
          ...state.marks,
          'orders-2': 'revoked',
          'payments-1': 'revoked',
        },
      },
    )
    push(
      <>
        <Ltr>Sticky</Ltr> تخصیص قبلی <Ltr>C1</Ltr> و <Ltr>C2</Ltr> را دست
        نمی‌زند و فقط دو پارتیشن آزاد را پخش می‌کند: <Ltr>orders-2</Ltr> به{' '}
        <Ltr>C1</Ltr> و <Ltr>payments-1</Ltr> به <Ltr>C2</Ltr>.
      </>,
      {
        owners: {
          ...state.owners,
          'orders-2': 'c1',
          'payments-1': 'c2',
        },
        marks: {
          ...state.marks,
          'orders-2': 'moved',
          'payments-1': 'moved',
        },
      },
    )
    push(
      <>
        نتیجهٔ <Ltr>Sticky</Ltr>: فقط ۲ پارتیشن از ۶ پارتیشن جابه‌جا شد. ولی
        پروتکل <Ltr>Sticky</Ltr> هنوز eager است؛ پیش از رسیدن به این تخصیص، همهٔ
        اعضا همهٔ پارتیشن‌ها را رها می‌کنند و برای مدتی مصرف متوقف می‌شود.
      </>,
    )
  }

  if (stage === 'cooperative') {
    push(
      <>
        همان تخصیص متعادل با سه مصرف‌کننده. این بار <Ltr>C4</Ltr> به گروه
        می‌پیوندد و استراتژی <Ltr>CooperativeSticky</Ltr> است.
      </>,
      {
        owners: {
          'orders-0': 'c1',
          'orders-1': 'c2',
          'orders-2': 'c3',
          'orders-3': 'c1',
          'payments-0': 'c2',
          'payments-1': 'c3',
        },
        marks: {
          'orders-0': 'kept',
          'orders-1': 'kept',
          'orders-2': 'kept',
          'orders-3': 'kept',
          'payments-0': 'kept',
          'payments-1': 'kept',
        },
        present: { c1: true, c2: true, c3: true, c4: true },
      },
    )
    push(
      <>
        هدف تخصیص جدید: برای رسیدن به تعادل، <Ltr>payments-0</Ltr> از{' '}
        <Ltr>C2</Ltr> و <Ltr>payments-1</Ltr> از <Ltr>C3</Ltr> باید به{' '}
        <Ltr>C4</Ltr> برسد. بقیهٔ پارتیشن‌ها جای خودشان می‌مانند.
      </>,
      {
        marks: {
          ...state.marks,
          'payments-0': 'moved',
          'payments-1': 'moved',
        },
      },
    )
    push(
      <>
        دور اول فقط پس‌گرفتن است: <Ltr>C2</Ltr> پارتیشن <Ltr>payments-0</Ltr> و{' '}
        <Ltr>C3</Ltr> پارتیشن <Ltr>payments-1</Ltr> را رها می‌کنند. این دو
        مصرف‌کننده بقیهٔ پارتیشن‌هایشان، یعنی <Ltr>orders-1</Ltr> و{' '}
        <Ltr>orders-2</Ltr>، را نگه می‌دارند و به مصرف ادامه می‌دهند.
      </>,
      {
        owners: {
          ...state.owners,
          'payments-0': null,
          'payments-1': null,
        },
        marks: {
          ...state.marks,
          'payments-0': 'revoked',
          'payments-1': 'revoked',
        },
      },
    )
    push(
      <>
        دور دوم تخصیص نهایی را می‌بندد: <Ltr>C4</Ltr> پارتیشن‌های{' '}
        <Ltr>payments-0</Ltr> و <Ltr>payments-1</Ltr> را می‌گیرد. بقیهٔ
        پارتیشن‌ها یک لحظه هم متوقف نشدند.
      </>,
      {
        owners: {
          ...state.owners,
          'payments-0': 'c4',
          'payments-1': 'c4',
        },
        marks: {
          ...state.marks,
          'payments-0': 'moved',
          'payments-1': 'moved',
        },
      },
    )
    push(
      <>
        نتیجهٔ <Ltr>CooperativeSticky</Ltr>: فقط صاحبان پارتیشن‌های متحرک برای
        لحظه‌ای متوقف شدند و گروه ممکن است به بیش از یک دور کوچک نیاز داشته باشد.
        قاعده: هرچه جابه‌جایی کمتر و پس‌گرفتن افزایشی‌تر باشد، توقف مصرف
        کوتاه‌تر است.
      </>,
    )
  }

  return snapshots
}

const STAGE_SNAPSHOTS: Record<Stage, Snapshot[]> = {
  range: buildSnapshots('range'),
  roundrobin: buildSnapshots('roundrobin'),
  sticky: buildSnapshots('sticky'),
  cooperative: buildSnapshots('cooperative'),
}

const STAGE_LABELS: Record<Stage, string> = {
  range: 'Range',
  roundrobin: 'RoundRobin',
  sticky: 'Sticky',
  cooperative: 'CooperativeSticky',
}

const CELL_W = 84
const CELL_H = 50
const GAP = 10

function cellX(index: number) {
  return 40 + index * (CELL_W + GAP)
}

function boxClass(mark: Mark): string {
  switch (mark) {
    case 'active':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    case 'moved':
      return 'fill-amber-50 stroke-amber-500 dark:fill-amber-950/60 dark:stroke-amber-500'
    case 'revoked':
      return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/60 dark:stroke-rose-500'
    case 'kept':
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
    default:
      return 'fill-slate-100 stroke-slate-300 dark:fill-slate-950/40 dark:stroke-slate-700'
  }
}

function ownerLabel(owner: Owner): string {
  return owner ? owner.toUpperCase() : '—'
}

export function AssignmentStrategyExplainer() {
  const [stage, setStage] = useState<Stage>('range')
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1800)

  const snapshots = STAGE_SNAPSHOTS[stage]
  const totalSteps = snapshots.length
  const snapshot = snapshots[step]
  const isLast = step === totalSteps - 1
  const autoPlaying = playing && !isLast

  useEffect(() => {
    if (!autoPlaying) return
    const timer = window.setTimeout(
      () => setStep((current) => Math.min(current + 1, totalSteps - 1)),
      speed,
    )
    return () => window.clearTimeout(timer)
  }, [autoPlaying, step, speed, totalSteps])

  function goTo(nextStep: number) {
    setPlaying(false)
    setStep(Math.max(0, Math.min(totalSteps - 1, nextStep)))
  }

  function selectStage(nextStage: Stage) {
    setPlaying(false)
    setStage(nextStage)
    setStep(0)
  }

  function toggleAutoPlay() {
    if (autoPlaying) {
      setPlaying(false)
      return
    }
    if (isLast) setStep(0)
    setPlaying(true)
  }

  const counts = CONSUMERS.map(
    (consumer) =>
      PARTITIONS.filter((id) => snapshot.owners[id] === consumer).length,
  )

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            هر استراتژی تخصیص، پارتیشن‌ها را چطور بین مصرف‌کننده‌ها تقسیم
            می‌کند؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(totalSteps)}
        </Badge>
      </div>

      <div
        role="group"
        aria-label="انتخاب استراتژی تخصیص"
        className="mt-4 flex flex-wrap gap-2"
      >
        {(Object.keys(STAGE_LABELS) as Stage[]).map((item) => {
          const active = item === stage
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => selectStage(item)}
              className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none ${
                active
                  ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {STAGE_LABELS[item]}
            </button>
          )
        })}
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
          گام {toPersianDigits(step + 1)} از {toPersianDigits(totalSteps)}
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
              width: `${(step / (totalSteps - 1)) * 100}%`,
            }}
            aria-hidden="true"
          />
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
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
          aria-label="تخصیص پارتیشن‌های دو تاپیک به مصرف‌کننده‌ها در استراتژی‌های Range، RoundRobin، Sticky و CooperativeSticky"
          className="h-auto w-full min-w-[620px]"
        >
          <text
            x={40}
            y={26}
            fontSize={11}
            fontWeight={700}
            className="fill-slate-600 dark:fill-slate-300"
          >
            orders (4 partitions)
          </text>
          {PARTITIONS.slice(0, 4).map((id, index) => {
            const owner = snapshot.owners[id]
            return (
              <g key={id}>
                <rect
                  x={cellX(index)}
                  y={36}
                  width={CELL_W}
                  height={CELL_H}
                  rx={8}
                  strokeWidth={1}
                  className={`transition-colors duration-300 motion-reduce:transition-none ${boxClass(
                    snapshot.marks[id],
                  )}`}
                />
                <text
                  x={cellX(index) + CELL_W / 2}
                  y={56}
                  textAnchor="middle"
                  fontSize={11}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  P{index}
                </text>
                <text
                  x={cellX(index) + CELL_W / 2}
                  y={74}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  className="fill-slate-900 font-mono dark:fill-slate-100"
                >
                  {ownerLabel(owner)}
                </text>
              </g>
            )
          })}

          <text
            x={40}
            y={122}
            fontSize={11}
            fontWeight={700}
            className="fill-slate-600 dark:fill-slate-300"
          >
            payments (2 partitions)
          </text>
          {PARTITIONS.slice(4).map((id, index) => {
            const owner = snapshot.owners[id]
            return (
              <g key={id}>
                <rect
                  x={cellX(index)}
                  y={132}
                  width={CELL_W}
                  height={CELL_H}
                  rx={8}
                  strokeWidth={1}
                  className={`transition-colors duration-300 motion-reduce:transition-none ${boxClass(
                    snapshot.marks[id],
                  )}`}
                />
                <text
                  x={cellX(index) + CELL_W / 2}
                  y={152}
                  textAnchor="middle"
                  fontSize={11}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  P{index}
                </text>
                <text
                  x={cellX(index) + CELL_W / 2}
                  y={170}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  className="fill-slate-900 font-mono dark:fill-slate-100"
                >
                  {ownerLabel(owner)}
                </text>
              </g>
            )
          })}

          <text
            x={40}
            y={218}
            fontSize={11}
            fontWeight={700}
            className="fill-slate-600 dark:fill-slate-300"
          >
            partitions per consumer
          </text>
          {CONSUMERS.map((consumer, index) => {
            const present = snapshot.present[consumer]
            return (
              <g
                key={consumer}
                className={`transition-opacity duration-300 motion-reduce:transition-none ${
                  present ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <text
                  x={40 + index * 120}
                  y={244}
                  fontSize={12}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  {consumer.toUpperCase()}
                </text>
                <text
                  x={40 + index * 120 + 34}
                  y={244}
                  fontSize={14}
                  fontWeight={700}
                  className={`font-mono ${
                    counts[index] === 0
                      ? 'fill-rose-500 dark:fill-rose-400'
                      : 'fill-slate-900 dark:fill-slate-100'
                  }`}
                >
                  {counts[index]}
                </text>
              </g>
            )
          })}

          <text
            x={40}
            y={278}
            fontSize={10}
            className="fill-slate-400 dark:fill-slate-500"
          >
            active = new assignment · amber = moved · rose = revoked · slate =
            unchanged
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط دو تاپیک و حداکثر چهار مصرف‌کننده نشان داده شده است؛
        ترتیب صف پارتیشن‌ها و محاسبهٔ سهم‌ها دقیقاً همان الگوریتم‌های assignor
        کافکاست.
      </p>
    </div>
  )
}
