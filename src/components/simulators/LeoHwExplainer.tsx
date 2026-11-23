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
const MIN_INSYNC = 2

type Mark = 'new' | 'pending' | 'commit'
type RequestStatus = 'ok' | 'waiting' | 'fail'

interface RequestState {
  offsets: string
  status: RequestStatus
  note: string
}

interface SnapshotState {
  leos: [number, number, number]
  hw: number
  request: RequestState | null
  activeBrokers: number[]
  activeOffsets: number[]
  activeMark: Mark
  hwChanged: boolean
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    leos: [11, 9, 7],
    hw: 7,
    request: null,
    activeBrokers: [],
    activeOffsets: [],
    activeMark: 'new',
    hwChanged: false,
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      وضعیت شروع: لیدر تا <Ltr>offset 10</Ltr> را نوشته، پس <Ltr>LEO</Ltr> آن{' '}
      <Ltr>11</Ltr> است. فالوورها به ترتیب <Ltr>9</Ltr> و <Ltr>7</Ltr> عقب‌اند و
      هر سه در <Ltr>ISR</Ltr> هستند. پس <Ltr>HW = min(11, 9, 7) = 7</Ltr> است و
      مصرف‌کننده فقط <Ltr>offset 0..6</Ltr> را می‌بیند.
    </>,
  )

  push(
    <>
      بروکر 3 دو رکورد بعدی را با <Ltr>Fetch</Ltr> گرفت و <Ltr>LEO</Ltr> آن از{' '}
      <Ltr>7</Ltr> به <Ltr>9</Ltr> رسید. کمترین <Ltr>LEO</Ltr> بین اعضای{' '}
      <Ltr>ISR</Ltr> حالا <Ltr>9</Ltr> است، پس <Ltr>HW</Ltr> یک قدم جلو رفت و{' '}
      <Ltr>offset 7</Ltr> و <Ltr>8</Ltr> برای مصرف‌کننده قابل خواندن شدند.
    </>,
    {
      leos: [11, 9, 9],
      hw: 9,
      activeBrokers: [2],
      activeOffsets: [7, 8],
      activeMark: 'new',
      hwChanged: true,
    },
  )

  push(
    <>
      بروکر 2 و بروکر 3 هر دو دو رکورد باقی‌مانده را گرفتند؛ <Ltr>LEO</Ltr> هر سه{' '}
      <Ltr>11</Ltr> شد و <Ltr>HW</Ltr> به <Ltr>11</Ltr> رسید. حالا مصرف‌کننده{' '}
      <Ltr>offset 0..10</Ltr> را می‌بیند. تا وقتی همه اعضای <Ltr>ISR</Ltr> به
      انتهای لاگ لیدر برسند، هر رکورد روی سه نسخه است.
    </>,
    {
      leos: [11, 11, 11],
      hw: 11,
      activeBrokers: [1, 2],
      activeOffsets: [9, 10],
      activeMark: 'new',
      hwChanged: true,
    },
  )

  push(
    <>
      پرودیوسر یک دسته سه‌رکوردی (<Ltr>offset 11</Ltr> تا <Ltr>13</Ltr>) با{' '}
      <Ltr>acks=all</Ltr> فرستاد. لیدر هر سه را نوشت و <Ltr>LEO</Ltr> آن{' '}
      <Ltr>14</Ltr> شد. فالوورها هنوز چیزی نگرفته‌اند، پس{' '}
      <Ltr>HW = min(14, 11, 11) = 11</Ltr> می‌ماند: رکوردهای جدید برای
      مصرف‌کننده نامرئی‌اند و پرودیوسر منتظر <Ltr>ack</Ltr> آن‌هاست.
    </>,
    {
      leos: [14, 11, 11],
      hw: 11,
      request: {
        offsets: '11..13',
        status: 'waiting',
        note: 'acks=all · waiting for ISR',
      },
      activeBrokers: [0],
      activeOffsets: [11, 12, 13],
      activeMark: 'pending',
      hwChanged: false,
    },
  )

  push(
    <>
      بروکر 2 هر سه رکورد را گرفت و <Ltr>LEO</Ltr> آن <Ltr>14</Ltr> شد. اما بروکر
      3 هنوز روی <Ltr>11</Ltr> است، پس <Ltr>min(14, 14, 11)</Ltr> همان{' '}
      <Ltr>11</Ltr> می‌ماند و <Ltr>HW</Ltr> تکان نمی‌خورد. دو نسخه از سه نسخه
      داده را دارند، اما داده هنوز commitشده نیست.
    </>,
    {
      leos: [14, 14, 11],
      activeBrokers: [1],
      activeOffsets: [11, 12, 13],
      activeMark: 'new',
    },
  )

  push(
    <>
      بروکر 3 هم هر سه رکورد را گرفت؛ <Ltr>LEO</Ltr> هر سه <Ltr>14</Ltr> شد،{' '}
      <Ltr>HW</Ltr> به <Ltr>14</Ltr> رسید و پرودیوسر <Ltr>ack</Ltr> کامل گرفت.{' '}
      <Ltr>offset 11</Ltr> تا <Ltr>13</Ltr> حالا روی هر سه نسخه‌اند و مصرف‌کننده
      آن‌ها را می‌بیند.
    </>,
    {
      leos: [14, 14, 14],
      hw: 14,
      request: { offsets: '11..13', status: 'ok', note: '3/3 ack' },
      activeBrokers: [2],
      activeOffsets: [11, 12, 13],
      activeMark: 'commit',
      hwChanged: true,
    },
  )

  push(
    <>
      قانون کلی: <Ltr>LEO</Ltr> آفست بعدی هر نسخه است و <Ltr>HW</Ltr> کمترین{' '}
      <Ltr>LEO</Ltr> بین اعضای <Ltr>ISR</Ltr>. مصرف‌کننده فقط آفست‌های کوچک‌تر از{' '}
      <Ltr>HW</Ltr> را می‌بیند. نوشتن روی لیدر به‌تنهایی <Ltr>HW</Ltr> را جلو
      نمی‌برد؛ تا وقتی کندترین عضو <Ltr>ISR</Ltr> نرسد، <Ltr>HW</Ltr> همان‌جا
      می‌ماند.
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

function cellTextClass(present: boolean, committed: boolean): string {
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

export function LeoHwExplainer() {
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

  const leaderLeo = snapshot.leos[0]
  const hwX = LOG_X + snapshot.hw * CELL_W
  const leaderLeoX = LOG_X + leaderLeo * CELL_W
  const hwLabelX = Math.max(
    LOG_X + 24,
    Math.min(hwX, LOG_X + CELL_COUNT * CELL_W - 24),
  )
  const invisibleWidth = Math.max(0, leaderLeoX - hwX)

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            LEO و High Watermark چطور محاسبه می‌شوند و مصرف‌کننده تا کجا می‌بیند؟
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
        {`orders / partition 0 · RF=3 · acks=all · min.insync.replicas=${MIN_INSYNC} · ISR={1,2,3}`}
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
          aria-label="نمای سه نسخه پارتیشن با LEO هر نسخه، High Watermark و بازه‌ای که مصرف‌کننده می‌بیند"
          className="h-auto w-full min-w-[760px]"
        >
          <rect
            x={16}
            y={16}
            width={210}
            height={64}
            rx={8}
            strokeWidth={1}
            className={requestBoxClass(snapshot.request?.status ?? null)}
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
            {`ISR = {1,2,3} · min.insync.replicas = ${MIN_INSYNC} · HW = min(LEO in ISR)`}
          </text>
          <text
            x={266}
            y={58}
            fontSize={13}
            fontWeight={700}
            className="fill-slate-900 font-mono dark:fill-slate-100"
          >
            {'HW = min('}
            {snapshot.leos.map((leo, index) => (
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
            fontSize={9.5}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            {snapshot.hw > 0
              ? `consumer reads offsets 0..${snapshot.hw - 1}`
              : 'consumer reads nothing'}
          </text>

          {LANE_TOPS.map((laneTop, brokerIndex) => {
            const leo = snapshot.leos[brokerIndex]
            const leoX = LOG_X + leo * CELL_W
            const lag = leaderLeo - leo

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
                  strokeWidth={1}
                  className="fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/50 dark:stroke-emerald-600"
                />
                <text
                  x={58}
                  y={laneTop + 41}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  className="fill-emerald-700 dark:fill-emerald-300"
                >
                  in ISR
                </text>

                <text
                  x={16}
                  y={laneTop + 62}
                  fontSize={9}
                  className={
                    lag > 0
                      ? 'fill-amber-700 font-mono dark:fill-amber-300'
                      : 'fill-slate-400 font-mono dark:fill-slate-500'
                  }
                >
                  {brokerIndex === 0
                    ? 'reference'
                    : lag > 0
                      ? `lag ${lag}`
                      : 'in sync'}
                </text>

                {Array.from({ length: CELL_COUNT }, (_, offset) => {
                  const present = offset < leo
                  const committed = offset < snapshot.hw
                  const isActive =
                    present &&
                    snapshot.activeBrokers.includes(brokerIndex) &&
                    snapshot.activeOffsets.includes(offset)
                  const mark = isActive ? snapshot.activeMark : undefined

                  return (
                    <g key={`cell-${brokerIndex}-${offset}`}>
                      <rect
                        x={LOG_X + offset * CELL_W}
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
                        x={LOG_X + offset * CELL_W + (CELL_W - 2) / 2}
                        y={laneTop + 37}
                        textAnchor="middle"
                        fontSize={9}
                        className={`font-mono ${cellTextClass(present, committed)}`}
                      >
                        {offset}
                      </text>
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

          {invisibleWidth > 0 && (
            <>
              <rect
                x={hwX}
                y={CONSUMER_Y}
                width={invisibleWidth}
                height={16}
                rx={4}
                strokeWidth={1}
                strokeDasharray="4 3"
                className="fill-amber-50/70 stroke-amber-400 dark:fill-amber-950/30 dark:stroke-amber-600"
              />
              {invisibleWidth > 90 && (
                <text
                  x={hwX + invisibleWidth / 2}
                  y={CONSUMER_Y + 12}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-amber-700 font-mono dark:fill-amber-300"
                >
                  invisible
                </text>
              )}
            </>
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
          <text x={96} y={452} fontSize={9.5} className="fill-slate-500 font-mono dark:fill-slate-400">
            {snapshot.hw > 0
              ? `consumer reads offsets 0..${snapshot.hw - 1}`
              : 'consumer reads nothing'}
          </text>
          <text
            x={884}
            y={452}
            textAnchor="end"
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            ISR = {'{1,2,3}'}
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه ستون‌ها، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط ۱۶ آفست اول نمایش داده شده‌اند. منطق دقیقاً همان است که
        کافکا اجرا می‌کند: <Ltr>LEO</Ltr> آفست بعدی هر نسخه است، <Ltr>HW</Ltr>{' '}
        کمترین <Ltr>LEO</Ltr> بین اعضای <Ltr>ISR</Ltr> است و مصرف‌کننده فقط
        آفست‌های کوچک‌تر از <Ltr>HW</Ltr> را می‌خواند.
      </p>
    </div>
  )
}
