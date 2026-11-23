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
const LOG_X = 250
const LANE_TOPS = [120, 210, 300] as const
const CONSUMER_Y = 392

type Mark = 'new' | 'pending' | 'commit' | 'lost'
type RequestStatus = 'ok' | 'waiting' | 'fail'

interface RequestState {
  offsets: string
  status: RequestStatus
  note: string
}

interface SnapshotState {
  leos: [number, number, number]
  inIsr: [boolean, boolean, boolean]
  dead: [boolean, boolean, boolean]
  leaderIndex: number | null
  hw: number
  minInsync: number
  request: RequestState | null
  activeBrokers: number[]
  activeOffsets: number[]
  activeMark: Mark
  lostOffsets: number[]
  hwChanged: boolean
  isrChanged: number[]
  leaderChanged: number | null
  counterfactual: boolean
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    leos: [10, 10, 10],
    inIsr: [true, true, true],
    dead: [false, false, false],
    leaderIndex: 0,
    hw: 10,
    minInsync: 1,
    request: null,
    activeBrokers: [],
    activeOffsets: [],
    activeMark: 'new',
    lostOffsets: [],
    hwChanged: false,
    isrChanged: [],
    leaderChanged: null,
    counterfactual: false,
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      وضعیت شروع: هر سه نسخه تا <Ltr>offset 9</Ltr> را دارند؛ <Ltr>LEO</Ltr>{' '}
      هر سه <Ltr>10</Ltr>، <Ltr>ISR = {'{1,2,3}'}</Ltr> و{' '}
      <Ltr>HW = min(10, 10, 10) = 10</Ltr>. مصرف‌کننده <Ltr>offset 0..9</Ltr> را
      می‌بیند و هر رکورد commitشده روی سه نسخه است. در این سناریو{' '}
      <Ltr>min.insync.replicas=1</Ltr> تنظیم شده است.
    </>,
  )

  push(
    <>
      بروکر 2 و بروکر 3 از <Ltr>Fetch</Ltr> کردن باز ماندند و پس از <Ltr>30s</Ltr>{' '}
      از <Ltr>ISR</Ltr> خارج شدند: <Ltr>ISR = {'{1}'}</Ltr>. حالا{' '}
      <Ltr>HW = min(10) = 10</Ltr> است؛ چون لیدر روی <Ltr>10</Ltr> بود،{' '}
      <Ltr>HW</Ltr> جابه‌جا نمی‌شود. اما دیگر هیچ فالووری در <Ltr>ISR</Ltr> نیست
      که عقب‌ماندگی <Ltr>HW</Ltr> را محدود کند.
    </>,
    {
      inIsr: [true, false, false],
      isrChanged: [1, 2],
    },
  )

  push(
    <>
      پرودیوسر سه رکورد <Ltr>offset 10</Ltr> تا <Ltr>12</Ltr> را با{' '}
      <Ltr>acks=all</Ltr> فرستاد. <Ltr>|ISR| = 1</Ltr> و{' '}
      <Ltr>min.insync.replicas = 1</Ltr> است، پس لیدر بدون انتظار برای هیچ
      فالووری تأیید می‌کند: <Ltr>HW = min(13) = 13</Ltr> می‌شود و مصرف‌کننده همین
      سه رکورد را می‌بیند. اما هر سه فقط یک کپی دارند.
    </>,
    {
      leos: [13, 10, 10],
      hw: 13,
      request: { offsets: '10..12', status: 'ok', note: '1/1 ack' },
      activeBrokers: [0],
      activeOffsets: [10, 11, 12],
      activeMark: 'commit',
      hwChanged: true,
    },
  )

  push(
    <>
      بروکر 1 از کار افتاد و هیچ نسخه‌ای از <Ltr>ISR</Ltr> زنده نماند. چون{' '}
      <Ltr>unclean.leader.election.enable=true</Ltr> است، کنترلر بروکر 2 را که{' '}
      <Ltr>LEO</Ltr> آن <Ltr>10</Ltr> است لیدر می‌کند و{' '}
      <Ltr>ISR = {'{2}'}</Ltr> می‌شود. <Ltr>HW</Ltr> لیدر جدید از{' '}
      <Ltr>LEO</Ltr> خودش شروع می‌شود: <Ltr>10</Ltr>.
    </>,
    {
      inIsr: [false, true, false],
      dead: [true, false, false],
      leaderIndex: 1,
      hw: 10,
      request: null,
      activeBrokers: [],
      activeOffsets: [],
      hwChanged: true,
      isrChanged: [0, 1],
      leaderChanged: 1,
    },
  )

  push(
    <>
      لاگ بروکر 2 تا <Ltr>offset 9</Ltr> است؛ رکوردهای <Ltr>10</Ltr> تا{' '}
      <Ltr>12</Ltr> که با <Ltr>acks=all</Ltr> تأیید شده بودند دیگر وجود ندارند.
      مصرف‌کننده‌ای که آن‌ها را خوانده بود حالا لاگ کوتاه‌تری می‌بیند. این همان
      ناسازگاری است که <Ltr>HW</Ltr> می‌خواست جلویش را بگیرد: مرز commit باید
      روی نسخه‌هایی باشد که بعد از خرابی هم می‌مانند.
    </>,
    {
      lostOffsets: [10, 11, 12],
      hwChanged: false,
    },
  )

  push(
    <>
      <span className="font-bold">فرض جایگزین:</span> همان لحظه با{' '}
      <Ltr>min.insync.replicas=2</Ltr>. لیدر درخواست را با{' '}
      <Ltr>NOT_ENOUGH_REPLICAS</Ltr> رد می‌کند، چون <Ltr>|ISR| = 1 &lt; 2</Ltr>.
      هیچ رکوردی نوشته و تأیید نمی‌شود، <Ltr>HW</Ltr> روی <Ltr>10</Ltr> می‌ماند و
      داده تأییدشده‌ای از دست نمی‌رود؛ فقط نوشتن تا برگشت یک فالوور متوقف
      می‌شود.
    </>,
    {
      leos: [10, 10, 10],
      inIsr: [true, false, false],
      dead: [false, false, false],
      leaderIndex: 0,
      hw: 10,
      minInsync: 2,
      request: {
        offsets: '10..12',
        status: 'fail',
        note: 'NOT_ENOUGH_REPLICAS',
      },
      activeBrokers: [],
      activeOffsets: [],
      lostOffsets: [],
      hwChanged: false,
      isrChanged: [],
      leaderChanged: null,
      counterfactual: true,
    },
  )

  push(
    <>
      بروکر 2 دوباره همگام شد و به <Ltr>ISR</Ltr> برگشت:{' '}
      <Ltr>ISR = {'{1,2}'}</Ltr>. حالا <Ltr>|ISR| = 2 ≥ 2</Ltr> است و همان سه
      رکورد با <Ltr>acks=all</Ltr>{' '}
      نوشته می‌شوند؛ <Ltr>HW</Ltr> به <Ltr>13</Ltr> می‌رسد و این بار هر رکورد
      commitشده دو کپی دارد.
    </>,
    {
      leos: [13, 13, 10],
      inIsr: [true, true, false],
      hw: 13,
      request: { offsets: '10..12', status: 'ok', note: '2/2 ack' },
      activeBrokers: [0, 1],
      activeOffsets: [10, 11, 12],
      activeMark: 'commit',
      hwChanged: true,
      isrChanged: [1],
    },
  )

  push(
    <>
      قانون: <Ltr>HW</Ltr> کمترین <Ltr>LEO</Ltr> بین <Ltr>ISR</Ltr> است، پس با
      کوچک شدن <Ltr>ISR</Ltr> می‌تواند یک‌باره جلو برود. «commitشده» فقط به اندازه
      اعضای فعلی <Ltr>ISR</Ltr> پشتیبان دارد؛ <Ltr>min.insync.replicas=2</Ltr>{' '}
      جلوی جلو رفتن <Ltr>HW</Ltr> را تا وقتی دو نسخه همگام‌اند می‌گیرد و مرگ یک
      بروکر داده تأییدشده را نمی‌برد.
    </>,
    {
      request: null,
      activeBrokers: [],
      activeOffsets: [],
      hwChanged: false,
    },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

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

export function HwDurabilityExplainer() {
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
  const leaderLeo =
    snapshot.leaderIndex === null ? 0 : snapshot.leos[snapshot.leaderIndex]
  const hwX = LOG_X + snapshot.hw * CELL_W
  const hwLabelX = Math.max(
    LOG_X + 24,
    Math.min(hwX, LOG_X + CELL_COUNT * CELL_W - 24),
  )
  const leaderLeoX = LOG_X + leaderLeo * CELL_W
  const lostStart = snapshot.lostOffsets[0]
  const lostEnd = snapshot.lostOffsets[snapshot.lostOffsets.length - 1]
  const lostWidth =
    snapshot.lostOffsets.length > 0
      ? (lostEnd + 1) * CELL_W - snapshot.hw * CELL_W
      : 0

  const requestStatus = snapshot.request?.status ?? null
  const statusText =
    requestStatus === 'ok'
      ? `write accepted · ${snapshot.request?.note}`
      : requestStatus === 'fail'
        ? `write rejected · ${snapshot.request?.note}`
        : requestStatus === 'waiting'
          ? `write waiting · ${snapshot.request?.note}`
          : 'no produce request in this step'

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            «commitشده» یعنی چند کپی، و چرا کوچک شدن ISR داده را از بین می‌برد؟
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {snapshot.counterfactual && (
            <Badge variant="warning">فرض جایگزین</Badge>
          )}
          <Badge variant="primary">
            گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
          </Badge>
        </div>
      </div>

      <div
        dir="ltr"
        className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300"
      >
        {`orders / partition 0 · RF=3 · acks=all · min.insync.replicas=${snapshot.minInsync} · unclean.leader.election.enable=true`}
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
          viewBox="0 0 900 470"
          role="img"
          aria-label="نمای سه نسخه پارتیشن، کوچک شدن ISR، جهش High Watermark و از دست رفتن رکوردهای تأییدشده"
          className="h-auto w-full min-w-[760px]"
        >
          <rect
            x={16}
            y={16}
            width={210}
            height={64}
            rx={8}
            strokeWidth={1}
            className={requestBoxClass(requestStatus)}
          />
          <text
            x={28}
            y={34}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            Produce · acks=all
          </text>
          <text
            x={28}
            y={52}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-900 font-mono dark:fill-slate-100"
          >
            {snapshot.request ? `offsets ${snapshot.request.offsets}` : '—'}
          </text>
          <text
            x={28}
            y={68}
            fontSize={8.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.request?.note ?? 'no request in this step'}
          </text>
          <text
            x={214}
            y={52}
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

          <rect
            x={250}
            y={16}
            width={634}
            height={64}
            rx={8}
            strokeWidth={1}
            className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700"
          />
          <text
            x={266}
            y={34}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`ISR = ${isrLabel} · |ISR| = ${isrIds.length} · min.insync.replicas = ${snapshot.minInsync}`}
          </text>
          <text
            x={266}
            y={58}
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
            y={74}
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

          {LANE_TOPS.map((laneTop, brokerIndex) => {
            const leo = snapshot.leos[brokerIndex]
            const leoX = LOG_X + leo * CELL_W
            const isDead = snapshot.dead[brokerIndex]
            const isLeader = snapshot.leaderIndex === brokerIndex
            const inIsr = snapshot.inIsr[brokerIndex]
            const changed =
              snapshot.isrChanged.includes(brokerIndex) ||
              snapshot.leaderChanged === brokerIndex
            const lag = leaderLeo - leo

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

                <rect
                  x={16}
                  y={laneTop + 28}
                  width={84}
                  height={18}
                  rx={9}
                  strokeWidth={changed ? 2.5 : 1}
                  className={
                    isDead
                      ? 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/50 dark:stroke-rose-600'
                      : inIsr
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
                    isDead
                      ? 'fill-rose-700 dark:fill-rose-300'
                      : inIsr
                        ? 'fill-emerald-700 dark:fill-emerald-300'
                        : 'fill-amber-700 dark:fill-amber-300'
                  }
                >
                  {isDead ? 'dead' : inIsr ? 'in ISR' : 'out of ISR'}
                </text>

                <text
                  x={16}
                  y={laneTop + 62}
                  fontSize={9}
                  className={
                    isDead
                      ? 'fill-rose-600 font-mono dark:fill-rose-400'
                      : lag > 0
                        ? 'fill-amber-700 font-mono dark:fill-amber-300'
                        : 'fill-slate-400 font-mono dark:fill-slate-500'
                  }
                >
                  {isDead
                    ? 'crashed'
                    : isLeader
                      ? 'reference'
                      : lag > 0
                        ? `lag ${lag}`
                        : 'caught up'}
                </text>

                {Array.from({ length: CELL_COUNT }, (_, offset) => {
                  const present = offset < leo
                  const committed = offset < snapshot.hw
                  const isLost =
                    present && snapshot.lostOffsets.includes(offset)
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

                {isDead && snapshot.lostOffsets.length > 0 && (
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
            y1={100}
            x2={hwX}
            y2={CONSUMER_Y + 16}
            strokeDasharray="4 3"
            strokeWidth={snapshot.hwChanged ? 2.5 : 1.5}
            className="stroke-emerald-500 dark:stroke-emerald-400"
          />
          <rect
            x={hwLabelX - 24}
            y={102}
            width={48}
            height={16}
            rx={4}
            strokeWidth={1}
            className="fill-white stroke-emerald-300 dark:fill-slate-900 dark:stroke-emerald-700"
          />
          <text
            x={hwLabelX}
            y={113}
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

          {snapshot.lostOffsets.length > 0 ? (
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
            y={452}
            fontSize={12}
            fontWeight={700}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            HW = {snapshot.hw}
          </text>
          <text
            x={96}
            y={452}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.hw > 0
              ? `consumer reads offsets 0..${snapshot.hw - 1}`
              : 'consumer reads nothing'}
          </text>
          <text
            x={884}
            y={452}
            textAnchor="end"
            fontSize={9.5}
            className={
              snapshot.lostOffsets.length > 0
                ? 'fill-rose-700 font-mono dark:fill-rose-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            {snapshot.lostOffsets.length > 0
              ? `lost offsets ${lostStart}..${lostEnd}`
              : `ISR = ${isrLabel}`}
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه ستون‌ها، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط ۱۶ آفست اول و زمان‌های گردشده نمایش داده شده‌اند. منطق
        دقیقاً همان است که کافکا اجرا می‌کند: <Ltr>HW</Ltr> کمترین <Ltr>LEO</Ltr>{' '}
        بین اعضای <Ltr>ISR</Ltr> است، با <Ltr>acks=all</Ltr> نوشتن تا وقتی{' '}
        <Ltr>|ISR|</Ltr> کمتر از <Ltr>min.insync.replicas</Ltr> نشود ادامه دارد،
        و انتخاب لیدر از نسخه‌های خارج از <Ltr>ISR</Ltr> فقط با{' '}
        <Ltr>unclean.leader.election.enable=true</Ltr> ممکن است.
      </p>
    </div>
  )
}
