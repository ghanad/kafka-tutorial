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

type Mode = 'async' | 'sync'
type MessageId =
  | 'none'
  | 'send'
  | 'buffer'
  | 'handoff'
  | 'request'
  | 'ack'
  | 'complete'

interface SnapshotState {
  mode: Mode
  sent: boolean
  buffered: boolean
  handed: boolean
  requested: boolean
  acked: boolean
  completed: boolean
  active: MessageId
  callerBlocked: boolean
  meta: boolean
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    mode: 'async',
    sent: false,
    buffered: false,
    handed: false,
    requested: false,
    acked: false,
    completed: false,
    active: 'none',
    callerBlocked: false,
    meta: false,
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      برنامه <Ltr>send(record)</Ltr> را صدا می‌زند. کافکا اول رکورد را سریالایز
      می‌کند و با کلید <Ltr>order-1042</Ltr> پارتیشن ۰ را انتخاب می‌کند. هنوز
      هیچ بایتی به شبکه نرفته است.
    </>,
    { sent: true, active: 'send' },
  )

  push(
    <>
      رکورد در <Ltr>RecordAccumulator</Ltr> و در صف پارتیشن ۰ می‌نشیند.{' '}
      <Ltr>send</Ltr> همان لحظه یک <Ltr>Future</Ltr> برمی‌گرداند؛ thread برنامه
      آزاد است و می‌تواند رکورد بعدی را بفرستد.
    </>,
    { buffered: true, active: 'buffer' },
  )

  push(
    <>
      وقتی بچ پر شد یا <Ltr>linger.ms</Ltr> تمام شد، <Ltr>Sender</Ltr> بچ را
      برمی‌دارد. این کار روی یک I/O thread جدا انجام می‌شود، نه روی thread برنامه.
    </>,
    { handed: true, active: 'handoff' },
  )

  push(
    <>
      <Ltr>Sender</Ltr> یک <Ltr>ProduceRequest</Ltr> به لیدر پارتیشن ۰ می‌فرستد.
      رکورد هنوز تأیید نشده است؛ فقط از بافر خارج شده و در راه است.
    </>,
    { requested: true, active: 'request' },
  )

  push(
    <>
      بروکر رکورد را در <Ltr>offset 1042</Ltr> می‌نویسد و <Ltr>ack</Ltr> برمی‌گرداند.
      با <Ltr>acks=all</Ltr> این تأیید بعد از نوشته‌شدن روی نسخه‌های همگام
      می‌رسد.
    </>,
    { acked: true, active: 'ack' },
  )

  push(
    <>
      <Ltr>Future</Ltr> کامل می‌شود و callback روی همان I/O thread اجرا می‌شود:{' '}
      <Ltr>partition=0</Ltr> و <Ltr>offset=1042</Ltr>. در تمام این مدت thread
      برنامه آزاد بود.
    </>,
    { completed: true, active: 'complete', meta: true },
  )

  push(
    <>
      حالا همان کار را همگام انجام می‌دهیم: <Ltr>send(record).get()</Ltr>. این بار
      thread برنامه تا کامل شدن <Ltr>Future</Ltr> بلوکه می‌شود.
    </>,
    {
      mode: 'sync',
      sent: true,
      buffered: false,
      handed: false,
      requested: false,
      acked: false,
      completed: false,
      active: 'send',
      callerBlocked: true,
      meta: false,
    },
  )

  push(
    <>
      رکورد در بافر می‌نشیند، اما برنامه نمی‌تواند رکورد بعدی را بفرستد؛ چون هنوز
      داخل <Ltr>get()</Ltr> منتظر است. بافر می‌تواند رکوردهای threadهای دیگر را
      جمع کند، ولی همین thread یک رکورد در پرواز دارد.
    </>,
    { buffered: true, active: 'buffer' },
  )

  push(
    <>
      <Ltr>Sender</Ltr> بچ را به لیدر می‌فرستد. برنامه همچنان بلوکه است و هیچ
      رکورد جدیدی از این thread به بافر اضافه نمی‌شود.
    </>,
    { handed: true, requested: true, active: 'request' },
  )

  push(
    <>
      <Ltr>ack</Ltr> می‌رسد و رکورد دوم در <Ltr>offset 1043</Ltr> نوشته شده است.
      تا رسیدن این تأیید، thread برنامه کاری جز انتظار نداشت.
    </>,
    { acked: true, active: 'ack' },
  )

  push(
    <>
      <Ltr>get()</Ltr> متادیتا را برمی‌گرداند و بلوکه شدن تمام می‌شود. برای هر
      رکورد یک رفت‌وبرگشت کامل داده‌ایم؛ توان عملیاتی این thread به حدود{' '}
      <Ltr>1 / RTT</Ltr> محدود می‌شود.
    </>,
    { completed: true, active: 'complete', callerBlocked: false, meta: true },
  )

  push(
    <>
      قاعده کلی: <Ltr>send</Ltr> همیشه ناهمگام است؛ <Ltr>get()</Ltr> فقط آن را
      همگام نشان می‌دهد. ناهمگام با callback هم خطا را می‌گیرد و هم اجازه می‌دهد
      بچ ساخته شود؛ همگام سادگی و کنترل می‌دهد، به قیمت انتظار.
    </>,
    { active: 'none', callerBlocked: false, completed: true, meta: true },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const X = { caller: 100, acc: 280, io: 460, broker: 640 }
const MSG_Y = {
  send: 82,
  handoff: 172,
  request: 218,
  ack: 264,
  complete: 310,
}

function lineClass(active: boolean): string {
  return active
    ? 'stroke-primary-500 dark:stroke-primary-400'
    : 'stroke-slate-400 dark:stroke-slate-500'
}

function markerFor(active: boolean): string {
  return active ? 'url(#producer-arrow-active)' : 'url(#producer-arrow)'
}

export function ProducerSendExplainer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1800)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const autoPlaying = playing && !isLast
  const ackOffset = snapshot.mode === 'async' ? 1042 : 1043

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
            یک رکورد در مسیر ناهمگام و همگام چه زمانی برمی‌گردد؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </Badge>
      </div>

      <div className="mt-4 flex gap-2">
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors motion-reduce:transition-none ${
            snapshot.mode === 'async'
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          ۱ · ناهمگام (Async)
        </div>
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors motion-reduce:transition-none ${
            snapshot.mode === 'sync'
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          ۲ · همگام (Sync)
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
          viewBox="0 0 720 360"
          role="img"
          aria-label="نمودار توالی ارسال رکورد؛ مقایسه مسیر ناهمگام و همگام بین thread برنامه، بافر، I/O thread و بروکر"
          className="h-auto w-full min-w-[600px]"
        >
          <defs>
            <marker
              id="producer-arrow"
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
              id="producer-arrow-active"
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

          {[
            { x: X.caller, label: 'Thread برنامه' },
            { x: X.acc, label: 'RecordAccumulator' },
            { x: X.io, label: 'I/O Thread' },
            { x: X.broker, label: 'Broker (leader)' },
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

          {/* Caller activation: short bars for async, one long bar for sync */}
          {snapshot.mode === 'async' ? (
            <>
              <rect
                x={X.caller - 6}
                y={68}
                width={12}
                height={34}
                rx={3}
                className="fill-primary-100 stroke-primary-400 dark:fill-primary-950/60 dark:stroke-primary-500"
                strokeWidth={1}
              />
              <rect
                x={X.caller - 6}
                y={296}
                width={12}
                height={34}
                rx={3}
                className="fill-primary-100 stroke-primary-400 dark:fill-primary-950/60 dark:stroke-primary-500"
                strokeWidth={1}
              />
            </>
          ) : (
            <rect
              x={X.caller - 6}
              y={68}
              width={12}
              height={272}
              rx={3}
              className={`transition-colors duration-500 motion-reduce:transition-none ${
                snapshot.callerBlocked
                  ? 'fill-amber-100 stroke-amber-500 dark:fill-amber-950/60 dark:stroke-amber-500'
                  : 'fill-emerald-100 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
              }`}
              strokeWidth={1}
            />
          )}

          {snapshot.mode === 'sync' && snapshot.callerBlocked && (
            <text
              x={78}
              y={204}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              transform="rotate(-90 78 204)"
              className="fill-amber-700 dark:fill-amber-300"
            >
              بلوکه
            </text>
          )}

          {/* Accumulator activation and batch box */}
          <rect
            x={X.acc - 6}
            y={104}
            width={12}
            height={44}
            rx={3}
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.buffered ? 'opacity-100' : 'opacity-0'
            } fill-primary-100 stroke-primary-400 dark:fill-primary-950/60 dark:stroke-primary-500`}
            strokeWidth={1}
          />
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.buffered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <rect
              x={X.acc + 14}
              y={108}
              width={150}
              height={34}
              rx={5}
              strokeWidth={snapshot.active === 'buffer' ? 2 : 1}
              className={`transition-colors duration-500 motion-reduce:transition-none ${
                snapshot.active === 'buffer'
                  ? 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
                  : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
              }`}
            />
            <text
              x={X.acc + 89}
              y={123}
              textAnchor="middle"
              fontSize={10.5}
              className="fill-slate-800 font-mono dark:fill-slate-200"
            >
              batch · partition 0
            </text>
            <text
              x={X.acc + 89}
              y={136}
              textAnchor="middle"
              fontSize={10}
              className="fill-slate-500 dark:fill-slate-400"
            >
              3 records
            </text>
          </g>

          {/* I/O thread activation */}
          <rect
            x={X.io - 6}
            y={158}
            width={12}
            height={124}
            rx={3}
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.handed ? 'opacity-100' : 'opacity-0'
            } fill-primary-100 stroke-primary-400 dark:fill-primary-950/60 dark:stroke-primary-500`}
            strokeWidth={1}
          />

          {/* Broker activation */}
          <rect
            x={X.broker - 6}
            y={206}
            width={12}
            height={72}
            rx={3}
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.requested ? 'opacity-100' : 'opacity-0'
            } fill-primary-100 stroke-primary-400 dark:fill-primary-950/60 dark:stroke-primary-500`}
            strokeWidth={1}
          />

          {/* send: caller -> accumulator */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.sent ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.caller + 8}
              y1={MSG_Y.send}
              x2={X.acc - 12}
              y2={MSG_Y.send}
              strokeWidth={snapshot.active === 'send' ? 2.5 : 1.2}
              markerEnd={markerFor(snapshot.active === 'send')}
              className={`transition-colors duration-500 motion-reduce:transition-none ${lineClass(
                snapshot.active === 'send',
              )}`}
            />
            <text
              x={(X.caller + X.acc) / 2}
              y={MSG_Y.send - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-slate-700 font-mono dark:fill-slate-300"
            >
              send(record)
            </text>
          </g>

          {/* handoff: accumulator -> I/O thread */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.handed ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.acc + 8}
              y1={MSG_Y.handoff}
              x2={X.io - 12}
              y2={MSG_Y.handoff}
              strokeWidth={snapshot.active === 'handoff' ? 2.5 : 1.2}
              markerEnd={markerFor(snapshot.active === 'handoff')}
              className={`transition-colors duration-500 motion-reduce:transition-none ${lineClass(
                snapshot.active === 'handoff',
              )}`}
            />
            <text
              x={(X.acc + X.io) / 2}
              y={MSG_Y.handoff - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-slate-700 dark:fill-slate-300"
            >
              batch آماده
            </text>
          </g>

          {/* request: I/O thread -> broker */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.requested ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.io + 8}
              y1={MSG_Y.request}
              x2={X.broker - 12}
              y2={MSG_Y.request}
              strokeWidth={snapshot.active === 'request' ? 2.5 : 1.2}
              markerEnd={markerFor(snapshot.active === 'request')}
              className={`transition-colors duration-500 motion-reduce:transition-none ${lineClass(
                snapshot.active === 'request',
              )}`}
            />
            <text
              x={(X.io + X.broker) / 2}
              y={MSG_Y.request - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-slate-700 font-mono dark:fill-slate-300"
            >
              ProduceRequest
            </text>
          </g>

          {/* ack: broker -> I/O thread */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.acked ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.broker - 8}
              y1={MSG_Y.ack}
              x2={X.io + 12}
              y2={MSG_Y.ack}
              strokeWidth={snapshot.active === 'ack' ? 2.5 : 1.2}
              markerEnd={markerFor(snapshot.active === 'ack')}
              className={`transition-colors duration-500 motion-reduce:transition-none ${lineClass(
                snapshot.active === 'ack',
              )}`}
            />
            <text
              x={(X.io + X.broker) / 2}
              y={MSG_Y.ack - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-slate-700 font-mono dark:fill-slate-300"
            >
              ack · offset {ackOffset}
            </text>
          </g>

          {/* complete: I/O thread -> caller */}
          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.completed ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <line
              x1={X.io - 8}
              y1={MSG_Y.complete}
              x2={X.caller + 12}
              y2={MSG_Y.complete}
              strokeWidth={snapshot.active === 'complete' ? 2.5 : 1.2}
              markerEnd={markerFor(snapshot.active === 'complete')}
              className={`transition-colors duration-500 motion-reduce:transition-none ${lineClass(
                snapshot.active === 'complete',
              )}`}
            />
            <text
              x={(X.caller + X.io) / 2}
              y={MSG_Y.complete - 7}
              textAnchor="middle"
              fontSize={11}
              className="fill-slate-700 dark:fill-slate-300"
            >
              Future کامل شد / callback
            </text>
          </g>

          <g
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              snapshot.meta ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <text
              x={(X.caller + X.io) / 2}
              y={MSG_Y.complete + 18}
              textAnchor="middle"
              fontSize={11}
              className="fill-emerald-700 font-mono dark:fill-emerald-300"
            >
              partition=0 · offset={ackOffset}
            </text>
          </g>

          <text
            x={X.caller}
            y={356}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-400 dark:fill-slate-500"
          >
            زمان →
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، زمان‌بندی و تعداد رکوردهای بچ ساده شده‌اند؛ منطق همان چیزی
        است که کافکا اجرا می‌کند: <span dir="ltr" className="font-mono">send</span>{' '}
        رکورد را در بافر می‌گذارد و برمی‌گردد، و{' '}
        <span dir="ltr" className="font-mono">get()</span> فقط تا کامل شدن همان{' '}
        <span dir="ltr" className="font-mono">Future</span> منتظر می‌ماند.
      </p>
    </div>
  )
}
