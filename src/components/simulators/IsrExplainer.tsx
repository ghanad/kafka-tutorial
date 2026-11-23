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

const MIN_INSYNC = 2
const LAG_MS = 30_000
const LAG_SECONDS = LAG_MS / 1000
const CELL_COUNT = 20
const CELL_W = 28
const LOG_X = 270
const LANE_TOPS = [130, 230, 330] as const

type Mark = 'active' | 'commit' | 'fetch'
type RequestStatus = 'ok' | 'waiting' | 'fail'

interface RequestState {
  offset: number
  status: RequestStatus
  note: string
}

interface SnapshotState {
  leos: [number, number, number]
  inIsr: [boolean, boolean, boolean]
  elapsed: [number | null, number | null, number | null]
  hw: number
  request: RequestState | null
  activeBrokers: number[]
  activeOffsets: number[]
  activeMark: Mark
  hwChanged: boolean
  isrChanged: number | null
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    leos: [10, 10, 10],
    inIsr: [true, true, true],
    elapsed: [null, 0, 0],
    hw: 10,
    request: null,
    activeBrokers: [],
    activeOffsets: [],
    activeMark: 'active',
    hwChanged: false,
    isrChanged: null,
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      وضعیت شروع: هر سه نسخه تا <Ltr>offset 9</Ltr> را دارند، پس <Ltr>LEO</Ltr>{' '}
      هر سه <Ltr>10</Ltr> است. <Ltr>ISR = {'{1,2,3}'}</Ltr> و چون همه همگام‌اند،{' '}
      <Ltr>HW = 10</Ltr> است؛ مصرف‌کننده <Ltr>offset 0..9</Ltr> را می‌بیند.
    </>,
  )

  push(
    <>
      رکورد <Ltr>offset 10</Ltr> با <Ltr>acks=all</Ltr> نوشته شد. هر دو فالوور در
      همان <Ltr>Fetch</Ltr> بعدی آن را گرفتند؛ <Ltr>LEO</Ltr> هر سه{' '}
      <Ltr>11</Ltr> شد و <Ltr>HW</Ltr> به <Ltr>11</Ltr> رسید. تا وقتی همه اعضای{' '}
      <Ltr>ISR</Ltr> عقب نیفتاده‌اند، هر رکورد روی سه نسخه است.
    </>,
    {
      leos: [11, 11, 11],
      hw: 11,
      elapsed: [null, 0, 0],
      request: { offset: 10, status: 'ok', note: '3/3 ack' },
      activeBrokers: [0, 1, 2],
      activeOffsets: [10],
      activeMark: 'active',
      hwChanged: true,
    },
  )

  push(
    <>
      پرودیوسر یک دسته دو رکوردی با <Ltr>offset 11</Ltr> و <Ltr>12</Ltr> و{' '}
      <Ltr>acks=all</Ltr> می‌فرستد. لیدر هر دو را می‌نویسد و بروکر 2 هم در{' '}
      <Ltr>Fetch</Ltr> بعدی هر دو را می‌گیرد؛ <Ltr>LEO</Ltr> آن‌ها{' '}
      <Ltr>13</Ltr> می‌شود. بروکر 3 کند شده و هنوز روی <Ltr>11</Ltr> است. فقط{' '}
      <Ltr>12s</Ltr> از آخرین همگام‌سازی گذشته، پس هنوز در <Ltr>ISR</Ltr> است؛{' '}
      <Ltr>HW</Ltr> روی <Ltr>11</Ltr> می‌ماند و پرودیوسر منتظر{' '}
      <Ltr>ack</Ltr> بروکر 3 است.
    </>,
    {
      leos: [13, 13, 11],
      hw: 11,
      elapsed: [null, 0, 12],
      request: {
        offset: 11,
        status: 'waiting',
        note: 'waiting for broker 3',
      },
      activeBrokers: [0, 1],
      activeOffsets: [11, 12],
      activeMark: 'active',
      hwChanged: false,
    },
  )

  push(
    <>
      <Ltr>24s</Ltr> گذشته و هنوز زیر آستانه <Ltr>30s</Ltr> هستیم. بروکر 3
      همچنان روی <Ltr>LEO = 11</Ltr> است، پس <Ltr>ISR</Ltr> بدون تغییر می‌ماند و{' '}
      <Ltr>HW</Ltr> روی <Ltr>11</Ltr> قفل است. داده‌های <Ltr>offset 11</Ltr> و{' '}
      <Ltr>12</Ltr> روی لیدر و بروکر 2 هستند، اما چون بروکر 3 هنوز عضو{' '}
      <Ltr>ISR</Ltr> است، مصرف‌کننده آن‌ها را نمی‌بیند.
    </>,
    {
      leos: [13, 13, 11],
      hw: 11,
      elapsed: [null, 0, 24],
      request: {
        offset: 11,
        status: 'waiting',
        note: 'waiting for broker 3',
      },
      activeBrokers: [],
      activeOffsets: [],
      hwChanged: false,
    },
  )

  push(
    <>
      زمان از <Ltr>30s</Ltr> گذشت. کافکا در بررسی دوره‌ای، بروکر 3 را از{' '}
      <Ltr>ISR</Ltr> خارج می‌کند: <Ltr>ISR = {'{1,2}'}</Ltr>. حالا{' '}
      <Ltr>HW</Ltr> کمترین <Ltr>LEO</Ltr> بین اعضای <Ltr>ISR</Ltr> است، پس از{' '}
      <Ltr>11</Ltr> به <Ltr>13</Ltr> می‌پرد؛ <Ltr>offset 11</Ltr> و{' '}
      <Ltr>12</Ltr> برای مصرف‌کننده قابل خواندن می‌شوند. پرودیوسر هم دیگر منتظر{' '}
      <Ltr>ack</Ltr> بروکر 3 نمی‌ماند و درخواستش کامل می‌شود.
    </>,
    {
      leos: [13, 13, 11],
      inIsr: [true, true, false],
      hw: 13,
      elapsed: [null, 0, 31],
      request: {
        offset: 11,
        status: 'ok',
        note: '2/2 ack after ISR shrink',
      },
      activeBrokers: [0, 1],
      activeOffsets: [11, 12],
      activeMark: 'commit',
      hwChanged: true,
      isrChanged: 2,
    },
  )

  push(
    <>
      رکورد <Ltr>offset 13</Ltr> با <Ltr>acks=all</Ltr> می‌رسد. <Ltr>ISR</Ltr>{' '}
      دو عضو دارد و <Ltr>min.insync.replicas=2</Ltr> است، پس نوشتن موفق می‌شود:
      لیدر و بروکر 2 به <Ltr>LEO = 14</Ltr> می‌رسند و <Ltr>HW</Ltr> به{' '}
      <Ltr>14</Ltr> می‌رسد. بروکر 3 خارج از <Ltr>ISR</Ltr> است و در این محاسبه
      شمرده نمی‌شود.
    </>,
    {
      leos: [14, 14, 11],
      hw: 14,
      elapsed: [null, 0, 31],
      request: { offset: 13, status: 'ok', note: '2/2 ack' },
      activeBrokers: [0, 1],
      activeOffsets: [13],
      activeMark: 'active',
      hwChanged: true,
      isrChanged: null,
    },
  )

  push(
    <>
      این بار بروکر 2 از <Ltr>Fetch</Ltr> کردن باز می‌ماند. <Ltr>31s</Ltr> از
      آخرین همگام‌سازی آن گذشته، پس از <Ltr>ISR</Ltr> خارج می‌شود:{' '}
      <Ltr>ISR = {'{1}'}</Ltr>. <Ltr>HW</Ltr> برابر <Ltr>LEO</Ltr> لیدر یعنی{' '}
      <Ltr>14</Ltr> می‌ماند، اما حالا فقط یک نسخه در <Ltr>ISR</Ltr> است.
    </>,
    {
      leos: [14, 14, 11],
      inIsr: [true, false, false],
      hw: 14,
      elapsed: [null, 31, 31],
      request: null,
      activeBrokers: [],
      activeOffsets: [],
      hwChanged: false,
      isrChanged: 1,
    },
  )

  push(
    <>
      پرودیوسر رکورد <Ltr>offset 14</Ltr> را با <Ltr>acks=all</Ltr> می‌فرستد.
      لیدر می‌بیند <Ltr>|ISR| = 1</Ltr> و <Ltr>min.insync.replicas=2</Ltr> است،
      پس درخواست را با <Ltr>NOT_ENOUGH_REPLICAS</Ltr> رد می‌کند. <Ltr>LEO</Ltr>{' '}
      لیدر روی <Ltr>14</Ltr> می‌ماند و هیچ رکورد جدیدی نوشته نمی‌شود؛ داده از دست
      نمی‌رود، اما نوشتن متوقف است.
    </>,
    {
      leos: [14, 14, 11],
      inIsr: [true, false, false],
      hw: 14,
      elapsed: [null, 35, 35],
      request: {
        offset: 14,
        status: 'fail',
        note: 'ISR=1 < min.insync=2',
      },
      activeBrokers: [],
      activeOffsets: [],
      hwChanged: false,
      isrChanged: null,
    },
  )

  push(
    <>
      بروکر 3 که از <Ltr>ISR</Ltr> خارج شده بود، دوباره از لیدر <Ltr>Fetch</Ltr>{' '}
      می‌کند و <Ltr>offset 11</Ltr> تا <Ltr>13</Ltr> را می‌گیرد. <Ltr>LEO</Ltr>{' '}
      آن به <Ltr>14</Ltr> می‌رسد و چون در بازه <Ltr>30s</Ltr> به انتهای لاگ لیدر
      رسیده، به <Ltr>ISR</Ltr> برمی‌گردد: <Ltr>ISR = {'{1,3}'}</Ltr>.{' '}
      <Ltr>HW</Ltr> همچنان <Ltr>14</Ltr> است.
    </>,
    {
      leos: [14, 14, 14],
      inIsr: [true, false, true],
      hw: 14,
      elapsed: [null, 40, 0],
      request: null,
      activeBrokers: [2],
      activeOffsets: [11, 12, 13],
      activeMark: 'fetch',
      hwChanged: false,
      isrChanged: 2,
    },
  )

  push(
    <>
      حالا <Ltr>ISR</Ltr> دو عضو دارد و نوشتن دوباره ممکن است. رکورد{' '}
      <Ltr>offset 14</Ltr> با <Ltr>acks=all</Ltr> نوشته می‌شود: لیدر و بروکر 3
      به <Ltr>LEO = 15</Ltr> می‌رسند و <Ltr>HW</Ltr> به <Ltr>15</Ltr> می‌رسد.
      بروکر 2 هنوز خارج از <Ltr>ISR</Ltr> است و داده جدید را ندارد.
    </>,
    {
      leos: [15, 14, 15],
      inIsr: [true, false, true],
      hw: 15,
      elapsed: [null, 45, 0],
      request: { offset: 14, status: 'ok', note: '2/2 ack' },
      activeBrokers: [0, 2],
      activeOffsets: [14],
      activeMark: 'active',
      hwChanged: true,
      isrChanged: null,
    },
  )

  push(
    <>
      بروکر 2 هم به <Ltr>15</Ltr> می‌رسد و به <Ltr>ISR</Ltr> برمی‌گردد:{' '}
      <Ltr>ISR = {'{1,2,3}'}</Ltr>. قانون کلی: عضویت در <Ltr>ISR</Ltr> با زمان
      از آخرین همگام‌سازی سنجیده می‌شود، نه با تعداد پیام؛ خروج یک فالوور کند،{' '}
      <Ltr>ISR</Ltr> را کوچک می‌کند و می‌تواند <Ltr>HW</Ltr> را جلو ببرد. اگر{' '}
      <Ltr>|ISR|</Ltr> زیر <Ltr>min.insync.replicas</Ltr> برود، نوشتن با{' '}
      <Ltr>acks=all</Ltr> متوقف می‌شود.
    </>,
    {
      leos: [15, 15, 15],
      inIsr: [true, true, true],
      hw: 15,
      elapsed: [null, 0, 0],
      request: null,
      activeBrokers: [1],
      activeOffsets: [14],
      activeMark: 'fetch',
      hwChanged: false,
      isrChanged: 1,
    },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

function cellClass(mark: Mark | undefined, present: boolean): string {
  if (mark === 'active') {
    return 'fill-primary-100 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
  }
  if (mark === 'commit' || mark === 'fetch') {
    return 'fill-emerald-100 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
  }
  return present
    ? 'fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-600'
    : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
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

export function IsrExplainer() {
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
  const isrLabel = `{${isrIds.join(',')}}`
  const isrOk = isrIds.length >= MIN_INSYNC
  const leaderLeo = snapshot.leos[0]
  const hwX = LOG_X + snapshot.hw * CELL_W
  const leaderLeoX = LOG_X + leaderLeo * CELL_W
  const committedWidth = Math.max(0, hwX - LOG_X)
  const uncommittedWidth = Math.max(0, leaderLeoX - hwX)
  const hwLabelX = Math.max(
    LOG_X + 22,
    Math.min(hwX, LOG_X + CELL_COUNT * CELL_W - 22),
  )

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            ISR چطور کوچک و بزرگ می‌شود و چه زمانی نوشتن متوقف می‌شود؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </Badge>
      </div>

      <div
        dir="ltr"
        className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300"
      >
        {`orders / partition 0 · RF=3 · acks=all · min.insync.replicas=${MIN_INSYNC} · replica.lag.time.max.ms=${LAG_MS} · request.timeout.ms=60000`}
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
          viewBox="0 0 900 470"
          role="img"
          aria-label="نمای سه نسخه پارتیشن، وضعیت ISR، LEO و High Watermark در طول زمان"
          className="h-auto w-full min-w-[760px]"
        >
          <rect
            x={16}
            y={16}
            width={234}
            height={58}
            rx={8}
            strokeWidth={1}
            className={requestBoxClass(snapshot.request?.status ?? null)}
          />
          <text
            x={28}
            y={32}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            Produce · acks=all
          </text>
          <text
            x={28}
            y={49}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-900 font-mono dark:fill-slate-100"
          >
            {snapshot.request ? `offset ${snapshot.request.offset}` : '—'}
          </text>
          <text
            x={238}
            y={49}
            textAnchor="end"
            fontSize={9.5}
            fontWeight={700}
            className={requestStatusClass(snapshot.request?.status ?? null)}
          >
            {snapshot.request
              ? snapshot.request.status === 'ok'
                ? 'OK'
                : snapshot.request.status === 'waiting'
                  ? 'WAIT'
                  : 'FAIL'
              : '—'}
          </text>
          <text
            x={28}
            y={65}
            fontSize={8.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.request?.note ?? 'no request in this step'}
          </text>

          <rect
            x={270}
            y={16}
            width={560}
            height={58}
            rx={8}
            strokeWidth={1}
            className={
              isrOk
                ? 'fill-emerald-50/60 stroke-emerald-300 dark:fill-emerald-950/30 dark:stroke-emerald-800'
                : 'fill-amber-50/60 stroke-amber-300 dark:fill-amber-950/30 dark:stroke-amber-800'
            }
          />
          <text
            x={286}
            y={38}
            fontSize={13}
            fontWeight={700}
            className={`font-mono ${
              isrOk
                ? 'fill-emerald-800 dark:fill-emerald-200'
                : 'fill-amber-800 dark:fill-amber-200'
            }`}
          >
            ISR = {isrLabel}
          </text>
          <text
            x={814}
            y={38}
            textAnchor="end"
            fontSize={10}
            fontWeight={700}
            className={
              isrOk
                ? 'fill-emerald-700 dark:fill-emerald-300'
                : 'fill-amber-700 dark:fill-amber-300'
            }
          >
            {isrOk ? 'ISR >= min.insync' : 'ISR < min.insync'}
          </text>
          <text
            x={286}
            y={56}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            |ISR| = {isrIds.length} · min.insync.replicas = {MIN_INSYNC} · HW ={' '}
            {snapshot.hw}
          </text>

          {committedWidth > 0 && (
            <>
              <line
                x1={LOG_X}
                y1={96}
                x2={hwX}
                y2={96}
                strokeWidth={3}
                className="stroke-emerald-500 dark:stroke-emerald-400"
              />
              {committedWidth > 60 && (
                <text
                  x={LOG_X + committedWidth / 2}
                  y={88}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-emerald-700 dark:fill-emerald-300"
                >
                  committed
                </text>
              )}
            </>
          )}
          {uncommittedWidth > 0 && (
            <>
              <line
                x1={hwX}
                y1={96}
                x2={leaderLeoX}
                y2={96}
                strokeWidth={3}
                className="stroke-amber-500 dark:stroke-amber-400"
              />
              {uncommittedWidth > 40 && (
                <text
                  x={hwX + uncommittedWidth / 2}
                  y={88}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-amber-700 dark:fill-amber-300"
                >
                  pending
                </text>
              )}
            </>
          )}

          {LANE_TOPS.map((laneTop, brokerIndex) => {
            const leo = snapshot.leos[brokerIndex]
            const inIsr = snapshot.inIsr[brokerIndex]
            const elapsed = snapshot.elapsed[brokerIndex]
            const leoX = LOG_X + leo * CELL_W
            const gaugeWidth = Math.min((elapsed ?? 0) / LAG_SECONDS, 1) * 200

            return (
              <g key={`lane-${brokerIndex}`}>
                <text
                  x={16}
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
                      brokerIndex === 0
                        ? 'fill-primary-600 dark:fill-primary-400'
                        : 'fill-slate-500 dark:fill-slate-400'
                    }
                  >
                    {' · '}
                    {brokerIndex === 0 ? 'Leader' : 'Follower'}
                  </tspan>
                </text>

                <rect
                  x={16}
                  y={laneTop + 28}
                  width={84}
                  height={18}
                  rx={9}
                  strokeWidth={snapshot.isrChanged === brokerIndex ? 2.5 : 1}
                  className={
                    inIsr
                      ? 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/50 dark:stroke-emerald-600'
                      : 'fill-amber-50 stroke-amber-400 dark:fill-amber-950/50 dark:stroke-amber-600'
                  }
                />
                <text
                  x={58}
                  y={laneTop + 41}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  className={
                    inIsr
                      ? 'fill-emerald-700 dark:fill-emerald-300'
                      : 'fill-amber-700 dark:fill-amber-300'
                  }
                >
                  {inIsr ? 'in ISR' : 'out of ISR'}
                </text>

                {brokerIndex > 0 ? (
                  <>
                    <text
                      x={16}
                      y={laneTop + 60}
                      fontSize={9}
                      className="fill-slate-500 font-mono dark:fill-slate-400"
                    >
                      last fetch {elapsed ?? 0}s / {LAG_SECONDS}s
                    </text>
                    <rect
                      x={16}
                      y={laneTop + 66}
                      width={200}
                      height={6}
                      rx={3}
                      className="fill-slate-200 dark:fill-slate-700"
                    />
                    <rect
                      x={16}
                      y={laneTop + 66}
                      width={gaugeWidth}
                      height={6}
                      rx={3}
                      className={`transition-[width] duration-500 motion-reduce:transition-none ${
                        inIsr
                          ? 'fill-primary-500 dark:fill-primary-400'
                          : 'fill-amber-500 dark:fill-amber-400'
                      }`}
                    />
                  </>
                ) : (
                  <text
                    x={16}
                    y={laneTop + 66}
                    fontSize={9}
                    className="fill-slate-400 font-mono dark:fill-slate-500"
                  >
                    reference
                  </text>
                )}

                <g
                  className={`transition-opacity duration-500 motion-reduce:transition-none ${
                    inIsr ? 'opacity-100' : 'opacity-55'
                  }`}
                >
                  {Array.from({ length: CELL_COUNT }, (_, offset) => {
                    const present = offset < leo
                    const isActive =
                      present &&
                      snapshot.activeBrokers.includes(brokerIndex) &&
                      snapshot.activeOffsets.includes(offset)
                    const mark = isActive ? snapshot.activeMark : undefined

                    return (
                      <g key={`cell-${brokerIndex}-${offset}`}>
                        <rect
                          x={LOG_X + offset * CELL_W}
                          y={laneTop + 22}
                          width={CELL_W - 2}
                          height={30}
                          rx={4}
                          strokeWidth={1}
                          className={`transition-colors duration-500 motion-reduce:transition-none ${cellClass(
                            mark,
                            present,
                          )}`}
                        />
                        <text
                          x={LOG_X + offset * CELL_W + (CELL_W - 2) / 2}
                          y={laneTop + 41}
                          textAnchor="middle"
                          fontSize={9}
                          className={`font-mono ${
                            present
                              ? 'fill-slate-800 dark:fill-slate-100'
                              : 'fill-slate-300 dark:fill-slate-700'
                          }`}
                        >
                          {offset}
                        </text>
                      </g>
                    )
                  })}

                </g>
                <line
                  x1={leoX}
                  y1={laneTop + 18}
                  x2={leoX}
                  y2={laneTop + 56}
                  strokeWidth={1.5}
                  className="stroke-slate-400 dark:stroke-slate-500"
                />
                <text
                  x={leoX + 4}
                  y={laneTop + 14}
                  textAnchor="start"
                  fontSize={9}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  LEO {leo}
                </text>
              </g>
            )
          })}

          <line
            x1={hwX}
            y1={96}
            x2={hwX}
            y2={416}
            strokeDasharray="4 3"
            strokeWidth={snapshot.hwChanged ? 2.5 : 1.5}
            className="stroke-emerald-500 dark:stroke-emerald-400"
          />
          <rect
            x={hwLabelX - 22}
            y={100}
            width={44}
            height={16}
            rx={4}
            strokeWidth={1}
            className="fill-white stroke-emerald-300 dark:fill-slate-900 dark:stroke-emerald-700"
          />
          <text
            x={hwLabelX}
            y={111}
            textAnchor="middle"
            fontSize={9}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            HW {snapshot.hw}
          </text>

          <text
            x={16}
            y={440}
            fontSize={12}
            fontWeight={700}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            HW = {snapshot.hw}
          </text>
          <text
            x={96}
            y={440}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.hw > 0
              ? `consumer reads offsets 0..${snapshot.hw - 1}`
              : 'consumer reads nothing'}
          </text>
          <text
            x={884}
            y={440}
            textAnchor="end"
            fontSize={9.5}
            className={`font-mono ${
              isrOk
                ? 'fill-emerald-700 dark:fill-emerald-300'
                : 'fill-amber-700 dark:fill-amber-300'
            }`}
          >
            ISR = {isrLabel}
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه ستون‌ها، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، فقط ۲۰ آفست اول و زمان‌های گردشده نمایش داده شده‌اند. منطق
        دقیقاً همان است که کافکا اجرا می‌کند: فالووری که در بازه{' '}
        <Ltr>replica.lag.time.max.ms</Ltr> به <Ltr>LEO</Ltr> لیدر نرسد از{' '}
        <Ltr>ISR</Ltr> خارج می‌شود، <Ltr>HW</Ltr> کمترین <Ltr>LEO</Ltr> بین{' '}
        <Ltr>ISR</Ltr> است، و با <Ltr>acks=all</Ltr> نوشتن تا وقتی{' '}
        <Ltr>|ISR|</Ltr> کمتر از <Ltr>min.insync.replicas</Ltr> نشود ادامه
        دارد. برای اینکه انتظار پرودیوسر در گام‌های ۳ و ۴ دیده شود،{' '}
        <Ltr>request.timeout.ms</Ltr> بزرگ‌تر از ۳۰ ثانیه فرض شده است.
      </p>
    </div>
  )
}
