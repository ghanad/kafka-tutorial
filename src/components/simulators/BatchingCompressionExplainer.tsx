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

type ActiveStep =
  | 'none'
  | 'buffer'
  | 'linger'
  | 'seal'
  | 'compress'
  | 'request'
  | 'store'
  | 'ack'
  | 'consume'

interface SnapshotState {
  records: number
  rawBytes: number
  lingerElapsed: number
  sealed: boolean
  compressed: boolean
  compressedBytes: number
  requested: boolean
  stored: boolean
  acked: boolean
  consumed: boolean
  phase: string
  active: ActiveStep
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const BATCH_SIZE = 16384
const LINGER_MS = 5
const COMPRESSED_BYTES = 320

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    records: 0,
    rawBytes: 0,
    lingerElapsed: 0,
    sealed: false,
    compressed: false,
    compressedBytes: 0,
    requested: false,
    stored: false,
    acked: false,
    consumed: false,
    phase: 'شروع',
    active: 'none',
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      وضعیت شروع: تاپیک <Ltr>orders</Ltr>، پارتیشن <Ltr>0</Ltr>. بچ خالی است و{' '}
      <Ltr>Sender</Ltr> منتظر است. سه تنظیم این صحنه را می‌سازند:{' '}
      <Ltr>batch.size=16384</Ltr>، <Ltr>linger.ms=5</Ltr> و{' '}
      <Ltr>compression.type=lz4</Ltr>.
    </>,
  )

  push(
    <>
      رکورد اول با کلید <Ltr>order-1042</Ltr> می‌رسد (۳۰۰ بایت).{' '}
      <Ltr>send()</Ltr> آن را در بافر پارتیشن <Ltr>0</Ltr> می‌گذارد و برمی‌گردد.
      از همین لحظه ساعت <Ltr>linger.ms</Ltr> شروع به شمارش می‌کند.
    </>,
    {
      records: 1,
      rawBytes: 300,
      phase: 'پر شدن بچ',
      active: 'buffer',
    },
  )

  push(
    <>
      دو رکورد دیگر در ۲ میلی‌ثانیه می‌رسند: <Ltr>order-1043</Ltr> و{' '}
      <Ltr>order-1044</Ltr>. بچ حالا سه رکورد و ۹۰۰ بایت است. هنوز ۳
      میلی‌ثانیه از مهلت <Ltr>linger</Ltr> باقی مانده و{' '}
      <Ltr>batch.size</Ltr> هم پر نشده است.
    </>,
    {
      records: 3,
      rawBytes: 900,
      lingerElapsed: 2,
      active: 'linger',
    },
  )

  push(
    <>
      <Ltr>linger.ms=5</Ltr> تمام می‌شود. بچ فقط ۹۰۰ بایت از{' '}
      <Ltr>16384</Ltr> بایت است، اما <Ltr>Sender</Ltr> صبر نمی‌کند: بچ را
      می‌بندد. اگر{' '}
      <Ltr>linger.ms</Ltr> صفر بود، بچ فقط وقتی بسته می‌شد که همان لحظه رکورد
      دیگری در صف باشد.
    </>,
    {
      lingerElapsed: 5,
      sealed: true,
      phase: 'بستن بچ',
      active: 'seal',
    },
  )

  push(
    <>
      حالا کل بچ فشرده می‌شود: ۹۰۰ بایت به ۳۲۰ بایت می‌رسد (حدود ۶۴٪ کمتر).
      این کار روی Producer و قبل از ارسال انجام می‌شود؛ هزینه‌اش کمی CPU است و
      سودش هم شبکه و هم دیسک.
    </>,
    {
      compressed: true,
      compressedBytes: COMPRESSED_BYTES,
      phase: 'فشرده‌سازی',
      active: 'compress',
    },
  )

  push(
    <>
      یک <Ltr>ProduceRequest</Ltr> با همین یک بچ فشرده به لیدر می‌رود. بدون بچ،
      سه درخواست جدا لازم بود: سه رفت‌وبرگشت، سه هدر درخواست و سه تأیید.
    </>,
    {
      requested: true,
      phase: 'ارسال',
      active: 'request',
    },
  )

  push(
    <>
      بروکر بچ فشرده را همان‌طور که هست در لاگ می‌نویسد و به هر رکورد{' '}
      <Ltr>offset</Ltr> می‌دهد: <Ltr>1042</Ltr>، <Ltr>1043</Ltr> و{' '}
      <Ltr>1044</Ltr>. فشرده‌سازی واحد ذخیره را کوچک می‌کند، اما تعداد رکوردها
      و <Ltr>offset</Ltr>ها را تغییر نمی‌دهد.
    </>,
    {
      stored: true,
      phase: 'نوشتن روی دیسک',
      active: 'store',
    },
  )

  push(
    <>
      یک <Ltr>ack</Ltr> برای کل بچ برمی‌گردد و هر سه <Ltr>Future</Ltr> کامل
      می‌شوند. هزینهٔ شبکه و تأیید بین سه رکورد تقسیم شد؛ این همان سود اصلی بچ
      است.
    </>,
    {
      acked: true,
      phase: 'تأیید',
      active: 'ack',
    },
  )

  push(
    <>
      مصرف‌کننده بچ فشرده را می‌خواند و در سمت خودش باز می‌کند: سه رکورد با
      همان <Ltr>offset</Ltr>ها. شبکه و دیسک کمتر شد، اما CPU مصرف‌کننده کمی
      بیشتر شد.
    </>,
    {
      consumed: true,
      phase: 'خواندن',
      active: 'consume',
    },
  )

  push(
    <>
      قانون: <Ltr>batch.size</Ltr> سقف حجم و <Ltr>linger.ms</Ltr> سقف زمان
      انتظار است؛ هر کدام زودتر برسد بچ بسته می‌شود. فشرده‌سازی روی کل بچ انجام
      می‌شود، پس بچ بزرگ‌تر نسبت بهتری می‌دهد و هزینه‌اش CPU است.
    </>,
    {
      phase: 'قانون',
      active: 'none',
    },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const RECORD_KEYS = ['order-1042', 'order-1043', 'order-1044']
const RECORD_SIZE = 300

function panelClass(active: boolean): string {
  return active
    ? 'fill-primary-50/50 stroke-primary-400 dark:fill-primary-950/25 dark:stroke-primary-700'
    : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
}

function recordClass(present: boolean, active: boolean): string {
  if (!present) {
    return 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
  }
  if (active) {
    return 'fill-primary-100 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
  }
  return 'fill-primary-50 stroke-primary-300 dark:fill-primary-950/40 dark:stroke-primary-700'
}

function arrowClass(active: boolean): string {
  return active
    ? 'stroke-primary-500 dark:stroke-primary-400'
    : 'stroke-slate-400 dark:stroke-slate-500'
}

function markerFor(active: boolean): string {
  return active ? 'url(#batch-arrow-active)' : 'url(#batch-arrow)'
}

export function BatchingCompressionExplainer() {
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

  const fillRatio = Math.min(1, snapshot.rawBytes / BATCH_SIZE)
  const lingerRatio = Math.min(1, snapshot.lingerElapsed / LINGER_MS)
  const compressionRatio = snapshot.compressed
    ? Math.round((1 - snapshot.compressedBytes / snapshot.rawBytes) * 100)
    : 0
  const batchLabel = snapshot.sealed ? 'sealed' : 'open'

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            یک بچ چطور ساخته می‌شود و فشرده‌سازی چه چیزی را کم می‌کند؟
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
        {`orders / partition 0 · batch.size=${BATCH_SIZE} · linger.ms=${LINGER_MS} · compression.type=lz4`}
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
          viewBox="0 0 900 480"
          role="img"
          aria-label="نمودار ساخت بچ در بافر Producer، فشرده‌سازی بچ، ارسال یک درخواست به بروکر، نوشتن با offsetهای جدا و باز کردن بچ در مصرف‌کننده"
          className="h-auto w-full min-w-[760px]"
        >
          <defs>
            <marker
              id="batch-arrow"
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
              id="batch-arrow-active"
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
            x={16}
            y={20}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-900 dark:fill-slate-100"
          >
            Producer
          </text>
          <text
            x={600}
            y={20}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-900 dark:fill-slate-100"
          >
            Broker
          </text>

          {/* Producer buffer panel */}
          <rect
            x={16}
            y={34}
            width={300}
            height={254}
            rx={10}
            strokeWidth={1}
            className={panelClass(
              snapshot.active === 'buffer' ||
                snapshot.active === 'linger' ||
                snapshot.active === 'seal',
            )}
          />
          <text
            x={28}
            y={54}
            fontSize={10.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            RecordAccumulator · partition 0
          </text>

          <text
            x={32}
            y={76}
            fontSize={9}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`batch · ${batchLabel}`}
          </text>
          <rect
            x={32}
            y={82}
            width={268}
            height={96}
            rx={8}
            strokeWidth={snapshot.active === 'seal' ? 2 : 1}
            strokeDasharray={snapshot.sealed ? undefined : '5 3'}
            className={
              snapshot.sealed
                ? 'fill-primary-50/60 stroke-primary-400 dark:fill-primary-950/30 dark:stroke-primary-600'
                : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
            }
          />

          {RECORD_KEYS.map((key, index) => {
            const present = index < snapshot.records
            const active =
              present &&
              (snapshot.active === 'buffer' || snapshot.active === 'linger')
            return (
              <g key={key}>
                <rect
                  x={42 + index * 86}
                  y={96}
                  width={76}
                  height={52}
                  rx={6}
                  strokeWidth={active ? 2 : 1}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${recordClass(
                    present,
                    active,
                  )}`}
                />
                <text
                  x={80 + index * 86}
                  y={118}
                  textAnchor="middle"
                  fontSize={8.5}
                  className={
                    present
                      ? 'fill-slate-800 font-mono dark:fill-slate-100'
                      : 'fill-slate-300 font-mono dark:fill-slate-700'
                  }
                >
                  {present ? key : '—'}
                </text>
                <text
                  x={80 + index * 86}
                  y={134}
                  textAnchor="middle"
                  fontSize={8}
                  className={
                    present
                      ? 'fill-slate-500 font-mono dark:fill-slate-400'
                      : 'fill-slate-300 font-mono dark:fill-slate-700'
                  }
                >
                  {present ? `${RECORD_SIZE} B` : 'empty'}
                </text>
              </g>
            )
          })}

          <text
            x={32}
            y={196}
            fontSize={8.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`batch fill · ${snapshot.rawBytes} B / ${BATCH_SIZE} B`}
          </text>
          <rect
            x={32}
            y={200}
            width={268}
            height={7}
            rx={3.5}
            strokeWidth={1}
            className="fill-slate-200 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-700"
          />
          <rect
            x={32}
            y={200}
            width={
              snapshot.rawBytes > 0 ? Math.max(4, fillRatio * 268) : 0
            }
            height={7}
            rx={3.5}
            strokeWidth={0}
            className="fill-primary-500 transition-all duration-500 motion-reduce:transition-none dark:fill-primary-400"
          />

          <text
            x={32}
            y={226}
            fontSize={8.5}
            className={
              snapshot.lingerElapsed > 0
                ? 'fill-amber-700 font-mono dark:fill-amber-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            {`linger · ${snapshot.lingerElapsed} / ${LINGER_MS} ms`}
          </text>
          <rect
            x={32}
            y={230}
            width={268}
            height={7}
            rx={3.5}
            strokeWidth={1}
            className="fill-slate-200 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-700"
          />
          <rect
            x={32}
            y={230}
            width={Math.max(0, lingerRatio * 268)}
            height={7}
            rx={3.5}
            strokeWidth={0}
            className={
              snapshot.lingerElapsed >= LINGER_MS
                ? 'fill-amber-500 transition-all duration-500 motion-reduce:transition-none dark:fill-amber-400'
                : 'fill-amber-400 transition-all duration-500 motion-reduce:transition-none dark:fill-amber-500'
            }
          />
          <text
            x={32}
            y={262}
            fontSize={8.5}
            className={
              snapshot.sealed
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : 'fill-slate-400 font-mono dark:fill-slate-500'
            }
          >
            {snapshot.sealed
              ? 'batch sealed by linger.ms'
              : 'waiting for batch.size or linger.ms'}
          </text>

          {/* batch -> compression */}
          <line
            x1={318}
            y1={137}
            x2={348}
            y2={137}
            strokeWidth={snapshot.active === 'compress' ? 2.5 : 1.2}
            markerEnd={markerFor(snapshot.active === 'compress')}
            className={`transition-colors duration-500 motion-reduce:transition-none ${arrowClass(
              snapshot.active === 'compress',
            )}`}
          />

          {/* Compression panel */}
          <rect
            x={352}
            y={82}
            width={196}
            height={150}
            rx={10}
            strokeWidth={snapshot.active === 'compress' ? 2 : 1}
            className={panelClass(snapshot.active === 'compress')}
          />
          <text
            x={364}
            y={102}
            fontSize={9.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            compression.type=lz4
          </text>

          <rect
            x={364}
            y={114}
            width={82}
            height={46}
            rx={6}
            strokeWidth={1}
            className="fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-600"
          />
          <text
            x={405}
            y={134}
            textAnchor="middle"
            fontSize={8.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            uncompressed
          </text>
          <text
            x={405}
            y={150}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            className="fill-slate-800 font-mono dark:fill-slate-100"
          >
            {snapshot.rawBytes > 0 ? `${snapshot.rawBytes} B` : '—'}
          </text>

          <line
            x1={450}
            y1={137}
            x2={478}
            y2={137}
            strokeWidth={snapshot.compressed ? 2.2 : 1.2}
            strokeDasharray={snapshot.compressed ? undefined : '4 3'}
            markerEnd={markerFor(snapshot.active === 'compress')}
            className={arrowClass(snapshot.active === 'compress')}
          />

          <rect
            x={482}
            y={114}
            width={54}
            height={46}
            rx={6}
            strokeWidth={1}
            strokeDasharray={snapshot.compressed ? undefined : '4 3'}
            className={
              snapshot.compressed
                ? 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/40 dark:stroke-emerald-600'
                : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
            }
          />
          <text
            x={509}
            y={134}
            textAnchor="middle"
            fontSize={8}
            className={
              snapshot.compressed
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : 'fill-slate-400 font-mono dark:fill-slate-500'
            }
          >
            lz4
          </text>
          <text
            x={509}
            y={150}
            textAnchor="middle"
            fontSize={10.5}
            fontWeight={700}
            className={
              snapshot.compressed
                ? 'fill-emerald-800 font-mono dark:fill-emerald-200'
                : 'fill-slate-300 font-mono dark:fill-slate-700'
            }
          >
            {snapshot.compressed ? `${snapshot.compressedBytes} B` : '?'}
          </text>

          <text
            x={450}
            y={186}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            className={
              snapshot.compressed
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : 'fill-slate-400 font-mono dark:fill-slate-500'
            }
          >
            {snapshot.compressed ? `-${compressionRatio}%` : '—'}
          </text>
          <text
            x={450}
            y={206}
            textAnchor="middle"
            fontSize={8}
            className="fill-amber-700 dark:fill-amber-300"
          >
            CPU ↑ · network ↓
          </text>

          {/* Request / ack arrows */}
          <line
            x1={316}
            y1={300}
            x2={600}
            y2={300}
            strokeWidth={snapshot.active === 'request' ? 2.5 : 1.2}
            strokeDasharray={snapshot.requested ? undefined : '5 4'}
            markerEnd={markerFor(snapshot.active === 'request')}
            className={`transition-colors duration-500 motion-reduce:transition-none ${arrowClass(
              snapshot.active === 'request',
            )}`}
          />
          <text
            x={458}
            y={316}
            textAnchor="middle"
            fontSize={9.5}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            ProduceRequest · 1 batch · 3 records
          </text>

          <line
            x1={600}
            y1={330}
            x2={316}
            y2={330}
            strokeWidth={snapshot.active === 'ack' ? 2.5 : 1.2}
            strokeDasharray={snapshot.acked ? undefined : '5 4'}
            markerEnd={markerFor(snapshot.active === 'ack')}
            className={`transition-colors duration-500 motion-reduce:transition-none ${arrowClass(
              snapshot.active === 'ack',
            )}`}
          />
          <text
            x={458}
            y={346}
            textAnchor="middle"
            fontSize={9.5}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            ack · 1 response
          </text>

          {/* Broker panel */}
          <rect
            x={600}
            y={34}
            width={284}
            height={254}
            rx={10}
            strokeWidth={1}
            className={panelClass(snapshot.active === 'store')}
          />
          <text
            x={612}
            y={54}
            fontSize={10.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            Broker · leader · log
          </text>

          {RECORD_KEYS.map((key, index) => {
            const stored = snapshot.stored
            const active = stored && snapshot.active === 'store'
            return (
              <g key={`broker-${key}`}>
                <rect
                  x={612}
                  y={68 + index * 38}
                  width={260}
                  height={30}
                  rx={6}
                  strokeWidth={active ? 2 : 1}
                  strokeDasharray={stored ? undefined : '4 3'}
                  className={
                    stored
                      ? 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/40 dark:stroke-emerald-600'
                      : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
                  }
                />
                <text
                  x={624}
                  y={88 + index * 38}
                  fontSize={9}
                  fontWeight={700}
                  className={
                    stored
                      ? 'fill-emerald-800 font-mono dark:fill-emerald-200'
                      : 'fill-slate-300 font-mono dark:fill-slate-700'
                  }
                >
                  {stored ? `offset ${1042 + index}` : '—'}
                </text>
                <text
                  x={860}
                  y={88 + index * 38}
                  textAnchor="end"
                  fontSize={8.5}
                  className={
                    stored
                      ? 'fill-slate-600 font-mono dark:fill-slate-300'
                      : 'fill-slate-300 font-mono dark:fill-slate-700'
                  }
                >
                  {stored ? key : 'empty'}
                </text>
              </g>
            )
          })}

          <text
            x={612}
            y={200}
            fontSize={8.5}
            className={
              snapshot.stored
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : 'fill-slate-400 font-mono dark:fill-slate-500'
            }
          >
            {snapshot.stored
              ? `stored as one compressed batch · ${snapshot.compressedBytes} B`
              : 'nothing written yet'}
          </text>
          <text
            x={612}
            y={220}
            fontSize={8.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            offsets are per record, not per batch
          </text>
          <text
            x={612}
            y={240}
            fontSize={8.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`batch bytes on disk: ${snapshot.stored ? snapshot.compressedBytes : 0} B`}
          </text>

          {/* Fetch arrow to consumer */}
          <line
            x1={742}
            y1={288}
            x2={742}
            y2={356}
            strokeWidth={snapshot.active === 'consume' ? 2.5 : 1.2}
            strokeDasharray={snapshot.consumed ? undefined : '5 4'}
            markerEnd={markerFor(snapshot.active === 'consume')}
            className={`transition-colors duration-500 motion-reduce:transition-none ${arrowClass(
              snapshot.active === 'consume',
            )}`}
          />
          <text
            x={750}
            y={326}
            fontSize={9}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            Fetch
          </text>

          {/* Consumer panel */}
          <rect
            x={600}
            y={356}
            width={284}
            height={108}
            rx={10}
            strokeWidth={1}
            className={panelClass(snapshot.active === 'consume')}
          />
          <text
            x={612}
            y={376}
            fontSize={10.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            Consumer
          </text>

          <rect
            x={612}
            y={386}
            width={112}
            height={40}
            rx={6}
            strokeWidth={1}
            strokeDasharray={snapshot.consumed ? undefined : '4 3'}
            className={
              snapshot.consumed
                ? 'fill-primary-50 stroke-primary-400 dark:fill-primary-950/40 dark:stroke-primary-600'
                : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
            }
          />
          <text
            x={668}
            y={402}
            textAnchor="middle"
            fontSize={8.5}
            className={
              snapshot.consumed
                ? 'fill-primary-700 font-mono dark:fill-primary-300'
                : 'fill-slate-300 font-mono dark:fill-slate-700'
            }
          >
            decompress
          </text>
          <text
            x={668}
            y={416}
            textAnchor="middle"
            fontSize={8}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.consumed ? `${snapshot.compressedBytes} B → ${snapshot.rawBytes} B` : '—'}
          </text>

          <line
            x1={730}
            y1={406}
            x2={752}
            y2={406}
            strokeWidth={snapshot.consumed ? 2 : 1.2}
            strokeDasharray={snapshot.consumed ? undefined : '4 3'}
            markerEnd={markerFor(false)}
            className={arrowClass(false)}
          />

          <rect
            x={756}
            y={386}
            width={116}
            height={40}
            rx={6}
            strokeWidth={1}
            strokeDasharray={snapshot.consumed ? undefined : '4 3'}
            className={
              snapshot.consumed
                ? 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/40 dark:stroke-emerald-600'
                : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
            }
          />
          <text
            x={814}
            y={402}
            textAnchor="middle"
            fontSize={8.5}
            className={
              snapshot.consumed
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : 'fill-slate-300 font-mono dark:fill-slate-700'
            }
          >
            3 records
          </text>
          <text
            x={814}
            y={416}
            textAnchor="middle"
            fontSize={8}
            className={
              snapshot.consumed
                ? 'fill-slate-600 font-mono dark:fill-slate-300'
                : 'fill-slate-300 font-mono dark:fill-slate-700'
            }
          >
            {snapshot.consumed ? 'offsets 1042..1044' : '—'}
          </text>

          {/* Request-count comparison */}
          <rect
            x={16}
            y={310}
            width={300}
            height={150}
            rx={10}
            strokeWidth={1}
            className={panelClass(snapshot.active === 'request')}
          />
          <text
            x={28}
            y={330}
            fontSize={9.5}
            fontWeight={700}
            className="fill-slate-700 dark:fill-slate-300"
          >
            درخواست‌ها برای همین سه رکورد
          </text>

          <text
            x={28}
            y={362}
            fontSize={9}
            className={
              snapshot.requested
                ? 'fill-emerald-700 dark:fill-emerald-300'
                : 'fill-slate-500 dark:fill-slate-400'
            }
          >
            با بچ
          </text>
          <rect
            x={92}
            y={346}
            width={96}
            height={24}
            rx={5}
            strokeWidth={1}
            className={
              snapshot.requested
                ? 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/40 dark:stroke-emerald-600'
                : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
            }
          />
          <text
            x={140}
            y={362}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            className={
              snapshot.requested
                ? 'fill-emerald-800 font-mono dark:fill-emerald-200'
                : 'fill-slate-300 font-mono dark:fill-slate-700'
            }
          >
            ۱ درخواست
          </text>

          <text
            x={28}
            y={398}
            fontSize={9}
            className="fill-slate-500 dark:fill-slate-400"
          >
            بدون بچ
          </text>
          {[0, 1, 2].map((index) => (
            <g key={`request-compare-${index}`}>
              <rect
                x={92 + index * 34}
                y={382}
                width={28}
                height={24}
                rx={5}
                strokeWidth={1}
                className="fill-amber-50 stroke-amber-300 dark:fill-amber-950/40 dark:stroke-amber-700"
              />
              <text
                x={106 + index * 34}
                y={398}
                textAnchor="middle"
                fontSize={9}
                className="fill-amber-800 font-mono dark:fill-amber-200"
              >
                {toPersianDigits(index + 1)}
              </text>
            </g>
          ))}
          <text
            x={28}
            y={430}
            fontSize={8.5}
            className="fill-slate-500 dark:fill-slate-400"
          >
            یک درخواست در برابر سه درخواست
          </text>
          <text
            x={28}
            y={446}
            fontSize={8.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            same records · fewer round-trips
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، اندازه‌ها و زمان‌ها ساده شده‌اند: سه رکورد ۳۰۰ بایتی،{' '}
        <Ltr>batch.size=16384</Ltr>، <Ltr>linger.ms=5</Ltr> و{' '}
        <Ltr>compression.type=lz4</Ltr>. منطق همان است که Kafka اجرا می‌کند:
        بچ با رسیدن حجم یا پایان <Ltr>linger.ms</Ltr> بسته می‌شود، کل بچ فشرده
        می‌شود، بروکر آن را به‌صورت فشرده ذخیره می‌کند و هر رکورد{' '}
        <Ltr>offset</Ltr> جداگانه می‌گیرد.
      </p>
    </div>
  )
}
