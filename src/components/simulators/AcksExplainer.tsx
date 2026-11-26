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

const CELL_COUNT = 16
const CELL_W = 32
const LOG_X = 330
const LANE_TOPS = [150, 240, 330] as const
const CONSUMER_Y = 430

type Mark = 'new' | 'pending' | 'commit' | 'lost'
type ProducerStatus =
  | 'idle'
  | 'sent'
  | 'returned'
  | 'acked'
  | 'waiting'
  | 'lost'
  | 'retrying'
  | 'durable'
type RequestStatus = 'ok' | 'waiting' | 'fail'

interface ProducerState {
  id: string
  acks: string
  status: ProducerStatus
  detail: string
  note: string
}

interface RequestState {
  offsets: string
  status: RequestStatus
  note: string
}

interface SnapshotState {
  leos: [number, number, number]
  inIsr: [boolean, boolean, boolean]
  dead: [boolean, boolean, boolean]
  leaderIndex: number
  hw: number
  minInsync: number
  producers: ProducerState[]
  activeBrokers: number[]
  activeOffsets: number[]
  activeMark: Mark
  lostOffsets: number[]
  hwChanged: boolean
  isrChanged: number[]
  leaderChanged: number | null
  phase: string
  request: RequestState | null
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

function producer(
  id: string,
  acks: string,
  status: ProducerStatus,
  detail: string,
  note: string,
): ProducerState {
  return { id, acks, status, detail, note }
}

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    leos: [10, 10, 10],
    inIsr: [true, true, true],
    dead: [false, false, false],
    leaderIndex: 0,
    hw: 10,
    minInsync: 2,
    producers: [
      producer('Producer A', 'acks=0', 'idle', 'offset = —', 'fire-and-forget'),
      producer('Producer B', 'acks=1', 'idle', 'offset = —', 'leader-only ack'),
      producer('Producer C', 'acks=all', 'idle', 'offset = —', 'waits for ISR'),
    ],
    activeBrokers: [],
    activeOffsets: [],
    activeMark: 'new',
    lostOffsets: [],
    hwChanged: false,
    isrChanged: [],
    leaderChanged: null,
    phase: 'شروع',
    request: null,
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      وضعیت شروع: تاپیک <Ltr>orders</Ltr>، پارتیشن <Ltr>0</Ltr> و{' '}
      <Ltr>RF=3</Ltr>. هر سه نسخه تا <Ltr>offset 9</Ltr> را دارند (
      <Ltr>LEO = 10</Ltr>)، <Ltr>ISR = {'{1,2,3}'}</Ltr> و{' '}
      <Ltr>HW = 10</Ltr> است. <Ltr>min.insync.replicas=2</Ltr> تنظیم شده. سه
      Producer با سه تنظیم <Ltr>acks</Ltr> متفاوت آماده‌اند رکورد بعدی را
      بفرستند.
    </>,
  )

  push(
    <>
      هر سه رکورد به سمت لیدر (بروکر 1) رفتند. Producer A با <Ltr>acks=0</Ltr>{' '}
      اصلاً منتظر نوشتن نمی‌ماند: به محض تحویل به سوکت، <Ltr>Future</Ltr> با{' '}
      <Ltr>offset = -1</Ltr> کامل می‌شود. Producer B منتظر تأیید لیدر است و
      Producer C منتظر تأیید همه اعضای <Ltr>ISR</Ltr>.
    </>,
    {
      phase: 'ارسال',
      producers: [
        producer('Producer A', 'acks=0', 'returned', 'offset = -1', 'did not wait'),
        producer('Producer B', 'acks=1', 'sent', 'in flight', 'waiting for leader'),
        producer('Producer C', 'acks=all', 'sent', 'in flight', 'waiting for ISR'),
      ],
      request: {
        offsets: '10..12',
        status: 'waiting',
        note: 'acks=0 returned · B and C waiting',
      },
    },
  )

  push(
    <>
      لیدر هر سه رکورد را در لاگ خودش نوشت: <Ltr>LEO</Ltr> از <Ltr>10</Ltr> به{' '}
      <Ltr>13</Ltr> رسید. Producer B همین لحظه تأیید می‌گیرد (
      <Ltr>offset = 11</Ltr>)، چون <Ltr>acks=1</Ltr> فقط نوشتن لیدر را
      می‌خواهد. Producer C هنوز منتظر است، چون فالوورها هنوز هیچ‌کدام از این سه
      رکورد را نگرفته‌اند و <Ltr>HW</Ltr> روی <Ltr>10</Ltr> مانده است.
    </>,
    {
      leos: [13, 10, 10],
      activeBrokers: [0],
      activeOffsets: [10, 11, 12],
      activeMark: 'new',
      producers: [
        producer('Producer A', 'acks=0', 'returned', 'offset = -1', 'did not wait'),
        producer('Producer B', 'acks=1', 'acked', 'offset = 11', 'leader confirmed'),
        producer('Producer C', 'acks=all', 'waiting', 'no ack yet', 'offset 12 uncommitted'),
      ],
      request: {
        offsets: '10..12',
        status: 'waiting',
        note: 'leader wrote · acks=1 returned',
      },
    },
  )

  push(
    <>
      بروکر 1 قبل از اینکه فالوورها رکوردهای <Ltr>10</Ltr> تا <Ltr>12</Ltr> را
      بگیرند از کار افتاد. کنترلر بروکر 2 را که <Ltr>LEO = 10</Ltr> دارد لیدر
      می‌کند و <Ltr>ISR = {'{2,3}'}</Ltr> می‌شود. Producer C هنوز تأییدی
      نگرفته؛ درخواستش شکست خورده و می‌تواند دوباره بفرستد.
    </>,
    {
      phase: 'خرابی لیدر',
      dead: [true, false, false],
      inIsr: [false, true, true],
      leaderIndex: 1,
      isrChanged: [0],
      leaderChanged: 1,
      producers: [
        producer('Producer A', 'acks=0', 'returned', 'offset = -1', 'did not wait'),
        producer('Producer B', 'acks=1', 'acked', 'offset = 11', 'leader confirmed'),
        producer('Producer C', 'acks=all', 'retrying', 'no ack', 'safe to resend'),
      ],
      request: {
        offsets: '10..12',
        status: 'fail',
        note: 'leader died before followers fetched',
      },
    },
  )

  push(
    <>
      رکوردهای <Ltr>10</Ltr> تا <Ltr>12</Ltr> فقط روی لیدر مرده بودند و از بین
      رفتند. Producer A و B فکر می‌کنند ارسال موفق بوده — A حتی{' '}
      <Ltr>offset</Ltr> نگرفته و B <Ltr>offset = 11</Ltr> گرفته — اما
      مصرف‌کننده هیچ‌وقت این رکوردها را نمی‌بیند. این همان تفاوت «تأیید شد» و
      «دوام آورد» است.
    </>,
    {
      phase: 'از دست رفتن داده',
      lostOffsets: [10, 11, 12],
      producers: [
        producer('Producer A', 'acks=0', 'lost', 'offset = -1', 'never waited'),
        producer('Producer B', 'acks=1', 'lost', 'acked offset = 11', 'ack did not mean durable'),
        producer('Producer C', 'acks=all', 'retrying', 'no ack', 'safe to resend'),
      ],
      request: null,
    },
  )

  push(
    <>
      Producer C رکوردش را دوباره می‌فرستد، این بار به لیدر جدید (بروکر 2). چون
      تأییدی نگرفته بود، این تکرار یک <Ltr>retry</Ltr> امن است؛ برخلاف A و B که
      نمی‌دانند رکوردشان از بین رفته. رکورد C روی لیدر جدید{' '}
      <Ltr>offset = 10</Ltr> می‌گیرد.
    </>,
    {
      phase: 'بازیابی',
      producers: [
        producer('Producer A', 'acks=0', 'lost', 'offset = -1', 'never waited'),
        producer('Producer B', 'acks=1', 'lost', 'acked offset = 11', 'ack did not mean durable'),
        producer('Producer C', 'acks=all', 'retrying', 'resending', 'to broker 2'),
      ],
      request: {
        offsets: '10',
        status: 'waiting',
        note: 'retry to new leader',
      },
    },
  )

  push(
    <>
      لیدر جدید رکورد را نوشت و <Ltr>LEO</Ltr> آن <Ltr>11</Ltr> شد. با{' '}
      <Ltr>acks=all</Ltr>، لیدر تا وقتی همه اعضای <Ltr>ISR</Ltr> (بروکر 2 و 3)
      این <Ltr>offset</Ltr> را ننوشته‌اند تأیید نمی‌دهد. پس Producer C همچنان
      منتظر است و <Ltr>HW</Ltr> روی <Ltr>10</Ltr> مانده.
    </>,
    {
      leos: [13, 11, 10],
      activeBrokers: [1],
      activeOffsets: [10],
      activeMark: 'new',
      producers: [
        producer('Producer A', 'acks=0', 'lost', 'offset = -1', 'never waited'),
        producer('Producer B', 'acks=1', 'lost', 'acked offset = 11', 'ack did not mean durable'),
        producer('Producer C', 'acks=all', 'waiting', 'offset = 10', 'waiting for follower'),
      ],
      request: {
        offsets: '10',
        status: 'waiting',
        note: 'leader wrote · waiting for ISR',
      },
    },
  )

  push(
    <>
      بروکر 3 هم رکورد را گرفت: <Ltr>LEO</Ltr> هر دو عضو <Ltr>ISR</Ltr> برابر{' '}
      <Ltr>11</Ltr> شد، پس <Ltr>HW</Ltr> به <Ltr>11</Ltr> رسید و رکورد
      commitشده است. حالا Producer C تأیید می‌گیرد (<Ltr>offset = 10</Ltr>) و
      مصرف‌کننده می‌تواند رکورد را بخواند. این رکورد دو کپی دارد.
    </>,
    {
      leos: [13, 11, 11],
      hw: 11,
      hwChanged: true,
      activeBrokers: [1, 2],
      activeOffsets: [10],
      activeMark: 'commit',
      producers: [
        producer('Producer A', 'acks=0', 'lost', 'offset = -1', 'never waited'),
        producer('Producer B', 'acks=1', 'lost', 'acked offset = 11', 'ack did not mean durable'),
        producer('Producer C', 'acks=all', 'acked', 'offset = 10', '2 copies · committed'),
      ],
      request: {
        offsets: '10',
        status: 'ok',
        note: '2/2 acks · offset committed',
      },
    },
  )

  push(
    <>
      حالا بروکر 2 هم از کار می‌افتد. بروکر 3 که رکورد را دارد لیدر می‌شود و{' '}
      <Ltr>HW</Ltr> همچنان <Ltr>11</Ltr> است؛ رکورد Producer C روی نسخه زنده
      باقی مانده. اگر همین اتفاق برای A یا B افتاده بود، رکوردی برای بازیابی
      وجود نداشت.
    </>,
    {
      phase: 'خرابی دوباره',
      dead: [true, true, false],
      inIsr: [false, false, true],
      leaderIndex: 2,
      isrChanged: [1],
      leaderChanged: 2,
      activeBrokers: [],
      activeOffsets: [],
      producers: [
        producer('Producer A', 'acks=0', 'lost', 'offset = -1', 'never waited'),
        producer('Producer B', 'acks=1', 'lost', 'acked offset = 11', 'ack did not mean durable'),
        producer('Producer C', 'acks=all', 'durable', 'offset = 10', 'survives on broker 3'),
      ],
      request: null,
    },
  )

  push(
    <>
      قانون: <Ltr>acks</Ltr> تعیین می‌کند Producer قبل از موفقیت منتظر چند کپی
      بماند. <Ltr>acks=0</Ltr> هیچ تأییدی نمی‌خواهد، <Ltr>acks=1</Ltr> فقط
      لیدر را می‌خواهد و <Ltr>acks=all</Ltr> همه اعضای <Ltr>ISR</Ltr> را.
      دوام واقعی از ترکیب <Ltr>acks=all</Ltr>،{' '}
      <Ltr>min.insync.replicas=2</Ltr> و <Ltr>RF=3</Ltr> می‌آید؛{' '}
      <Ltr>acks=all</Ltr> با <Ltr>min.insync.replicas=1</Ltr> هم می‌تواند به
      یک کپی بسنده کند.
    </>,
    {
      phase: 'قانون',
      request: null,
    },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const STATUS_LABEL: Record<ProducerStatus, string> = {
  idle: 'idle',
  sent: 'in flight',
  returned: 'returned',
  acked: 'acked',
  waiting: 'waiting',
  lost: 'record lost',
  retrying: 'retrying',
  durable: 'durable',
}

function producerCardClass(status: ProducerStatus): string {
  switch (status) {
    case 'sent':
    case 'returned':
      return 'fill-primary-50 stroke-primary-400 dark:fill-primary-950/40 dark:stroke-primary-700'
    case 'acked':
    case 'durable':
      return 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/40 dark:stroke-emerald-700'
    case 'waiting':
    case 'retrying':
      return 'fill-amber-50 stroke-amber-400 dark:fill-amber-950/40 dark:stroke-amber-700'
    case 'lost':
      return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/40 dark:stroke-rose-700'
    default:
      return 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

function producerStatusClass(status: ProducerStatus): string {
  switch (status) {
    case 'sent':
    case 'returned':
      return 'fill-primary-700 dark:fill-primary-300'
    case 'acked':
    case 'durable':
      return 'fill-emerald-700 dark:fill-emerald-300'
    case 'waiting':
    case 'retrying':
      return 'fill-amber-700 dark:fill-amber-300'
    case 'lost':
      return 'fill-rose-700 dark:fill-rose-300'
    default:
      return 'fill-slate-400 dark:fill-slate-500'
  }
}

function cellClass(
  mark: Mark | undefined,
  present: boolean,
  committed: boolean,
): string {
  if (mark === 'lost') {
    return 'fill-rose-100 stroke-rose-500 dark:fill-rose-950/60 dark:stroke-rose-500'
  }
  if (mark === 'pending') {
    return 'fill-amber-100 stroke-amber-500 dark:fill-amber-950/60 dark:stroke-amber-500'
  }
  if (mark === 'new') {
    return 'fill-primary-100 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
  }
  if (mark === 'commit') {
    return 'fill-emerald-100 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
  }
  if (!present) {
    return 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
  }
  if (!committed) {
    return 'fill-amber-50 stroke-amber-300 dark:fill-amber-950/40 dark:stroke-amber-700'
  }
  return 'fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-600'
}

function cellTextClass(
  present: boolean,
  committed: boolean,
  lost: boolean,
): string {
  if (lost) return 'fill-rose-800 dark:fill-rose-200'
  if (!present) return 'fill-slate-300 dark:fill-slate-700'
  if (!committed) return 'fill-amber-800 dark:fill-amber-200'
  return 'fill-slate-800 dark:fill-slate-100'
}

function requestBoxClass(status: RequestStatus | null): string {
  switch (status) {
    case 'ok':
      return 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/40 dark:stroke-emerald-700'
    case 'waiting':
      return 'fill-amber-50 stroke-amber-400 dark:fill-amber-950/40 dark:stroke-amber-700'
    case 'fail':
      return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/40 dark:stroke-rose-700'
    default:
      return 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

function requestStatusClass(status: RequestStatus | null): string {
  switch (status) {
    case 'ok':
      return 'fill-emerald-700 dark:fill-emerald-300'
    case 'waiting':
      return 'fill-amber-700 dark:fill-amber-300'
    case 'fail':
      return 'fill-rose-700 dark:fill-rose-300'
    default:
      return 'fill-slate-400 dark:fill-slate-500'
  }
}

export function AcksExplainer() {
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

  const isrIds = snapshot.inIsr.flatMap((inIsr, index) =>
    inIsr ? [index + 1] : [],
  )
  const isrLeos = snapshot.inIsr.flatMap((inIsr, index) =>
    inIsr ? [snapshot.leos[index]] : [],
  )
  const isrLabel = `{${isrIds.join(',')}}`
  const leaderLeo = snapshot.leos[snapshot.leaderIndex]
  const hwX = LOG_X + snapshot.hw * CELL_W
  const leaderLeoX = LOG_X + leaderLeo * CELL_W
  const lostStart = snapshot.lostOffsets[0] ?? 0
  const lostEnd =
    snapshot.lostOffsets[snapshot.lostOffsets.length - 1] ?? 0
  const lostWidth =
    snapshot.lostOffsets.length > 0
      ? (lostEnd + 1) * CELL_W - snapshot.hw * CELL_W
      : 0
  const showLostRegion =
    snapshot.lostOffsets.length > 0 &&
    snapshot.hw === 10 &&
    snapshot.request?.status !== 'waiting'

  const requestStatus = snapshot.request?.status ?? null
  const statusText = snapshot.request
    ? `Produce ${snapshot.request.offsets} · ${snapshot.request.note}`
    : 'no produce request in this step'

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            وقتی لیدر بعد از تأیید می‌میرد، کدام رکورد باقی می‌ماند؟
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{snapshot.phase}</Badge>
          <Badge variant="primary">
            گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
          </Badge>
        </div>
      </div>

      <div
        dir="ltr"
        className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300"
      >
        {`orders / partition 0 · RF=3 · min.insync.replicas=${snapshot.minInsync} · leader=broker ${snapshot.leaderIndex + 1}`}
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

      <div className="mt-3 min-h-[7rem] rounded-xl border border-s-4 border-primary-100 border-s-primary-500 bg-primary-50/70 p-3 text-primary-950 dark:border-primary-900/60 dark:border-s-primary-400 dark:bg-primary-950/40 dark:text-primary-100">
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
          viewBox="0 0 900 500"
          role="img"
          aria-label="نمای سه Producer با سطوح مختلف acks، نوشتن روی لیدر، خرابی لیدر، از دست رفتن رکوردها و بازیابی با acks=all"
          className="h-auto w-full min-w-[760px]"
        >
          <rect
            x={250}
            y={16}
            width={634}
            height={92}
            rx={8}
            strokeWidth={1}
            className={requestBoxClass(requestStatus)}
          />
          <text
            x={266}
            y={36}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`ISR = ${isrLabel} · |ISR| = ${isrIds.length} · min.insync.replicas = ${snapshot.minInsync}`}
          </text>
          <text
            x={266}
            y={62}
            fontSize={13}
            fontWeight={700}
            className="fill-slate-900 font-mono dark:fill-slate-100"
          >
            {'HW = min('}
            {isrLeos.map((leo, index) => (
              <tspan
                key={`formula-leo-${index}`}
                className={
                  leo === snapshot.hw
                    ? 'fill-emerald-700 font-black dark:fill-emerald-300'
                    : 'fill-slate-500 dark:fill-slate-400'
                }
              >
                {index > 0 ? `, ${leo}` : `${leo}`}
              </tspan>
            ))}
            {') = '}
            <tspan className="fill-emerald-700 dark:fill-emerald-300">
              {snapshot.hw}
            </tspan>
          </text>
          <text
            x={266}
            y={86}
            fontSize={9}
            className={
              requestStatus === 'ok'
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : requestStatus === 'fail'
                  ? 'fill-rose-700 font-mono dark:fill-rose-300'
                  : requestStatus === 'waiting'
                    ? 'fill-amber-700 font-mono dark:fill-amber-300'
                    : 'fill-slate-400 font-mono dark:fill-slate-500'
            }
          >
            {statusText}
          </text>
          <text
            x={868}
            y={36}
            textAnchor="end"
            fontSize={9.5}
            fontWeight={700}
            className={requestStatusClass(requestStatus)}
          >
            {requestStatus === 'ok'
              ? 'OK'
              : requestStatus === 'waiting'
                ? 'WAIT'
                : requestStatus === 'fail'
                  ? 'FAIL'
                  : '—'}
          </text>

          {snapshot.producers.map((item, index) => {
            const cardY = 20 + index * 108
            return (
              <g key={item.id}>
                <rect
                  x={16}
                  y={cardY}
                  width={218}
                  height={96}
                  rx={10}
                  strokeWidth={1}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${producerCardClass(
                    item.status,
                  )}`}
                />
                <text
                  x={28}
                  y={cardY + 22}
                  fontSize={12}
                  fontWeight={700}
                  className="fill-slate-900 dark:fill-slate-100"
                >
                  {item.id}
                </text>
                <text
                  x={222}
                  y={cardY + 22}
                  textAnchor="end"
                  fontSize={10}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  {item.acks}
                </text>
                <text
                  x={28}
                  y={cardY + 46}
                  fontSize={10.5}
                  fontWeight={700}
                  className={`font-mono ${producerStatusClass(item.status)}`}
                >
                  {STATUS_LABEL[item.status]}
                </text>
                <text
                  x={28}
                  y={cardY + 64}
                  fontSize={9.5}
                  className="fill-slate-700 font-mono dark:fill-slate-300"
                >
                  {item.detail}
                </text>
                <text
                  x={28}
                  y={cardY + 82}
                  fontSize={8.5}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  {item.note}
                </text>
              </g>
            )
          })}

          {LANE_TOPS.map((laneTop, brokerIndex) => {
            const leo = snapshot.leos[brokerIndex]
            const leoX = LOG_X + leo * CELL_W
            const isDead = snapshot.dead[brokerIndex]
            const isLeader = snapshot.leaderIndex === brokerIndex
            const inIsr = snapshot.inIsr[brokerIndex]
            const changed =
              snapshot.isrChanged.includes(brokerIndex) ||
              snapshot.leaderChanged === brokerIndex

            return (
              <g key={`lane-${brokerIndex}`}>
                {isDead && (
                  <rect
                    x={LOG_X - 6}
                    y={laneTop + 8}
                    width={CELL_COUNT * CELL_W + 12}
                    height={52}
                    rx={8}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    className="fill-rose-50/40 stroke-rose-300 dark:fill-rose-950/20 dark:stroke-rose-800"
                  />
                )}

                <text
                  x={250}
                  y={laneTop + 20}
                  fontSize={13}
                  fontWeight={700}
                  className="fill-slate-900 dark:fill-slate-100"
                >
                  Broker {brokerIndex + 1}
                  <tspan
                    fontSize={10}
                    fontWeight={500}
                    className={
                      isDead
                        ? 'fill-rose-600 dark:fill-rose-400'
                        : isLeader
                          ? 'fill-primary-600 dark:fill-primary-400'
                          : 'fill-slate-500 dark:fill-slate-400'
                    }
                  >
                    {' · '}
                    {isDead ? 'dead' : isLeader ? 'Leader' : 'Follower'}
                  </tspan>
                </text>

                <text
                  x={250}
                  y={laneTop + 38}
                  fontSize={9}
                  fontWeight={changed ? 800 : 700}
                  className={
                    isDead
                      ? 'fill-rose-700 dark:fill-rose-300'
                      : inIsr
                        ? 'fill-emerald-700 dark:fill-emerald-300'
                        : 'fill-amber-700 dark:fill-amber-300'
                  }
                >
                  {isDead ? 'crashed' : inIsr ? 'in ISR' : 'out of ISR'}
                </text>

                <text
                  x={250}
                  y={laneTop + 54}
                  fontSize={9}
                  className="fill-slate-400 font-mono dark:fill-slate-500"
                >
                  {isDead && brokerIndex === 0
                    ? `lost ${snapshot.lostOffsets.length} records`
                    : isLeader
                      ? 'reference log'
                      : 'replica'}
                </text>

                {Array.from({ length: CELL_COUNT }, (_, offset) => {
                  const present = offset < leo
                  const committed = offset < snapshot.hw
                  const isLost =
                    brokerIndex === 0 &&
                    present &&
                    snapshot.lostOffsets.includes(offset)
                  const isActive =
                    present &&
                    snapshot.activeBrokers.includes(brokerIndex) &&
                    snapshot.activeOffsets.includes(offset)
                  const mark = isLost
                    ? 'lost'
                    : isActive
                      ? snapshot.activeMark
                      : undefined
                  const cellX = LOG_X + offset * CELL_W

                  return (
                    <g key={`cell-${brokerIndex}-${offset}`}>
                      <rect
                        x={cellX}
                        y={laneTop + 18}
                        width={CELL_W - 2}
                        height={30}
                        rx={4}
                        strokeWidth={1}
                        className={`transition-colors duration-500 motion-reduce:transition-none ${cellClass(
                          mark,
                          present,
                          committed,
                        )}`}
                      />
                      <text
                        x={cellX + (CELL_W - 2) / 2}
                        y={laneTop + 37}
                        textAnchor="middle"
                        fontSize={9}
                        className={`font-mono ${cellTextClass(
                          present,
                          committed,
                          isLost,
                        )}`}
                      >
                        {offset}
                      </text>
                      {isLost && (
                        <>
                          <line
                            x1={cellX + 5}
                            y1={laneTop + 23}
                            x2={cellX + CELL_W - 7}
                            y2={laneTop + 43}
                            strokeWidth={1.5}
                            className="stroke-rose-500 dark:stroke-rose-400"
                          />
                          <line
                            x1={cellX + CELL_W - 7}
                            y1={laneTop + 23}
                            x2={cellX + 5}
                            y2={laneTop + 43}
                            strokeWidth={1.5}
                            className="stroke-rose-500 dark:stroke-rose-400"
                          />
                        </>
                      )}
                    </g>
                  )
                })}

                <line
                  x1={leoX}
                  y1={laneTop + 14}
                  x2={leoX}
                  y2={laneTop + 52}
                  strokeWidth={1.5}
                  className="stroke-slate-400 dark:stroke-slate-500"
                />
                <text
                  x={leoX + 4}
                  y={laneTop + 12}
                  textAnchor="start"
                  fontSize={9}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  LEO {leo}
                </text>

                {isDead &&
                  brokerIndex === 0 &&
                  snapshot.lostOffsets.length > 0 && (
                  <text
                    x={LOG_X + lostStart * CELL_W}
                    y={laneTop + 64}
                    fontSize={9}
                    fontWeight={700}
                    className="fill-rose-600 font-mono dark:fill-rose-400"
                  >
                    {`offsets ${lostStart}..${lostEnd} lost`}
                  </text>
                )}
              </g>
            )
          })}

          <line
            x1={hwX}
            y1={124}
            x2={hwX}
            y2={CONSUMER_Y + 16}
            strokeDasharray="4 3"
            strokeWidth={snapshot.hwChanged ? 2.5 : 1.5}
            className="stroke-emerald-500 dark:stroke-emerald-400"
          />
          <rect
            x={Math.max(LOG_X + 24, Math.min(hwX, LOG_X + CELL_COUNT * CELL_W - 24)) - 24}
            y={126}
            width={48}
            height={16}
            rx={4}
            strokeWidth={1}
            className="fill-white stroke-emerald-300 dark:fill-slate-900 dark:stroke-emerald-700"
          />
          <text
            x={Math.max(LOG_X + 24, Math.min(hwX, LOG_X + CELL_COUNT * CELL_W - 24))}
            y={137}
            textAnchor="middle"
            fontSize={9}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            HW {snapshot.hw}
          </text>

          <text
            x={16}
            y={CONSUMER_Y + 12}
            fontSize={13}
            fontWeight={700}
            className="fill-slate-900 dark:fill-slate-100"
          >
            Consumer
          </text>
          <text
            x={16}
            y={CONSUMER_Y + 28}
            fontSize={9}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            read position
          </text>

          <rect
            x={LOG_X}
            y={CONSUMER_Y}
            width={Math.max(0, hwX - LOG_X)}
            height={16}
            rx={4}
            strokeWidth={1}
            className="fill-emerald-100 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500"
          />
          <text
            x={LOG_X + 6}
            y={CONSUMER_Y + 12}
            fontSize={9}
            className="fill-emerald-800 font-mono dark:fill-emerald-200"
          >
            {snapshot.hw > 0 ? `reads 0..${snapshot.hw - 1}` : 'reads nothing'}
          </text>

          {showLostRegion ? (
            <>
              <rect
                x={hwX}
                y={CONSUMER_Y}
                width={lostWidth}
                height={16}
                rx={4}
                strokeWidth={1}
                strokeDasharray="4 3"
                className="fill-rose-50/70 stroke-rose-400 dark:fill-rose-950/30 dark:stroke-rose-600"
              />
              {lostWidth > 90 && (
                <text
                  x={hwX + lostWidth / 2}
                  y={CONSUMER_Y + 12}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-rose-700 font-mono dark:fill-rose-300"
                >
                  lost
                </text>
              )}
            </>
          ) : (
            leaderLeoX > hwX && (
              <>
                <rect
                  x={hwX}
                  y={CONSUMER_Y}
                  width={leaderLeoX - hwX}
                  height={16}
                  rx={4}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  className="fill-amber-50/70 stroke-amber-400 dark:fill-amber-950/30 dark:stroke-amber-600"
                />
                {leaderLeoX - hwX > 90 && (
                  <text
                    x={hwX + (leaderLeoX - hwX) / 2}
                    y={CONSUMER_Y + 12}
                    textAnchor="middle"
                    fontSize={9}
                    className="fill-amber-700 font-mono dark:fill-amber-300"
                  >
                    invisible
                  </text>
                )}
              </>
            )
          )}

          <text
            x={16}
            y={474}
            fontSize={12}
            fontWeight={700}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            HW = {snapshot.hw}
          </text>
          <text
            x={96}
            y={474}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.hw > 0
              ? `consumer reads offsets 0..${snapshot.hw - 1}`
              : 'consumer reads nothing'}
          </text>
          <text
            x={884}
            y={474}
            textAnchor="end"
            fontSize={9.5}
            className={
              showLostRegion
                ? 'fill-rose-700 font-mono dark:fill-rose-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            {showLostRegion
              ? `lost offsets ${lostStart}..${lostEnd}`
              : `ISR = ${isrLabel}`}
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه ستون‌ها، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط ۱۶ آفست اول نمایش داده شده است. منطق همان است که کافکا
        اجرا می‌کند: <Ltr>acks=0</Ltr> بدون انتظار برمی‌گردد و{' '}
        <Ltr>offset = -1</Ltr> می‌دهد، <Ltr>acks=1</Ltr> فقط تأیید لیدر را
        می‌خواهد و <Ltr>acks=all</Ltr> تا نوشته شدن روی همه اعضای{' '}
        <Ltr>ISR</Ltr> صبر می‌کند؛ <Ltr>HW</Ltr> هم کمترین <Ltr>LEO</Ltr> بین
        اعضای <Ltr>ISR</Ltr> است.
      </p>
    </div>
  )
}
