import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

type Stage = 'amo' | 'alo' | 'eo'
type Mark = 'idle' | 'acc' | 'ok' | 'no' | 'dup' | 'pending'

const OFFSETS = [1040, 1041, 1042] as const
const NEXT_OFFSET = 1043

interface SnapshotState {
  stage: Stage
  attempt: 1 | 2
  committed: number
  activeOffset: number | null
  status: 'poll' | 'processing' | 'committed' | 'crashed' | 'restarted' | 'done'
  records: Record<number, Mark>
  output: Record<number, Mark>
  txOpen: boolean
  caption: ReactNode
}

const EMPTY_RECORDS: Record<number, Mark> = {
  1040: 'idle',
  1041: 'idle',
  1042: 'idle',
}

const EMPTY_OUTPUT: Record<number, Mark> = {
  1040: 'idle',
  1041: 'idle',
  1042: 'idle',
}

function buildSnapshots(stage: Stage): SnapshotState[] {
  const snapshots: SnapshotState[] = []
  let state: Omit<SnapshotState, 'caption'> = {
    stage,
    attempt: 1,
    committed: 1040,
    activeOffset: null,
    status: 'poll',
    records: { ...EMPTY_RECORDS },
    output: { ...EMPTY_OUTPUT },
    txOpen: false,
  }

  const push = (
    caption: ReactNode,
    patch: Partial<Omit<SnapshotState, 'caption'>> = {},
  ) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  if (stage === 'amo') {
    push(
      <>
        پارتیشن ۰ سه رکورد <Ltr>1040</Ltr> تا <Ltr>1042</Ltr> دارد و committed
        offset گروه روی <Ltr>1040</Ltr> است. مصرف‌کننده <Ltr>poll</Ltr> می‌زند و
        هر سه رکورد را در یک دسته می‌گیرد.
      </>,
    )
    push(
      <>
        در حالت <Ltr>at-most-once</Ltr> اول آفست <Ltr>1043</Ltr> commit می‌شود و
        بعد پردازش شروع می‌شود. از دید کافکا این سه رکورد «تحویل‌شده» حساب
        می‌شوند، حتی اگر هنوز هیچ کاری روی آن‌ها انجام نشده باشد.
      </>,
      { committed: NEXT_OFFSET, status: 'committed' },
    )
    push(
      <>
        رکورد <Ltr>1040</Ltr> پردازش می‌شود و اثرش ثبت می‌شود.
      </>,
      {
        status: 'processing',
        activeOffset: 1040,
        records: { ...state.records, 1040: 'ok' },
      },
    )
    push(
      <>
        رکورد <Ltr>1041</Ltr> هم پردازش می‌شود. تا اینجا هر رکورد فقط یک‌بار
        دیده شده است.
      </>,
      {
        activeOffset: 1041,
        records: { ...state.records, 1041: 'ok' },
      },
    )
    push(
      <>
        پیش از رسیدن به <Ltr>1042</Ltr> پروسه از کار می‌افتد. committed offset
        همان <Ltr>1043</Ltr> مانده است؛ یعنی کافکا فکر می‌کند همه‌چیز تحویل داده
        شده.
      </>,
      { status: 'crashed', activeOffset: null },
    )
    push(
      <>
        پس از restart، مصرف‌کننده از <Ltr>1043</Ltr> می‌خواند و رکورد جدیدی
        نمی‌بیند. رکورد <Ltr>1042</Ltr> هرگز پردازش نشد و برای همیشه گم شد.
      </>,
      {
        status: 'done',
        records: { ...state.records, 1042: 'no' },
      },
    )
    push(
      <>
        قاعده: commit قبل از پردازش، تحویل حداکثر یک‌بار می‌دهد. هیچ رکوردی دو
        بار پردازش نمی‌شود، اما هر رکوردی که پیش از commit نیمه‌کاره بماند از
        دست می‌رود.
      </>,
    )
  }

  if (stage === 'alo') {
    push(
      <>
        همان شروع: committed offset روی <Ltr>1040</Ltr> است و یک{' '}
        <Ltr>poll</Ltr> سه رکورد <Ltr>1040</Ltr> تا <Ltr>1042</Ltr> را برمی‌گرداند.
      </>,
    )
    push(
      <>
        این بار ترتیب برعکس است: اول پردازش، بعد commit. committed offset هنوز{' '}
        <Ltr>1040</Ltr> است و هیچ رکوردی از دید کافکا تحویل‌شده نیست.
      </>,
      { status: 'processing', activeOffset: 1040 },
    )
    push(
      <>
        رکورد <Ltr>1040</Ltr> پردازش و اثرش ثبت می‌شود.
      </>,
      { records: { ...state.records, 1040: 'ok' } },
    )
    push(
      <>
        رکورد <Ltr>1041</Ltr> هم پردازش می‌شود.
      </>,
      {
        activeOffset: 1041,
        records: { ...state.records, 1041: 'ok' },
      },
    )
    push(
      <>
        پیش از پردازش <Ltr>1042</Ltr> و پیش از هر commit، پروسه از کار می‌افتد.
        چون آفست commit نشده، کافکا هنوز نقطهٔ شروع را <Ltr>1040</Ltr> می‌داند.
      </>,
      { status: 'crashed', activeOffset: null },
    )
    push(
      <>
        پس از restart، مصرف‌کننده از <Ltr>1040</Ltr> دوباره{' '}
        <Ltr>poll</Ltr> می‌زند و همان سه رکورد را دوباره می‌گیرد. هیچ داده‌ای گم
        نشده است.
      </>,
      {
        status: 'restarted',
        attempt: 2,
        records: { ...EMPTY_RECORDS },
      },
    )
    push(
      <>
        رکوردهای <Ltr>1040</Ltr> و <Ltr>1041</Ltr> دوباره پردازش می‌شوند؛ این
        بار اثرشان تکراری است. رکورد <Ltr>1042</Ltr> برای اولین بار دیده می‌شود.
      </>,
      {
        status: 'processing',
        activeOffset: 1042,
        records: { 1040: 'dup', 1041: 'dup', 1042: 'ok' },
      },
    )
    push(
      <>
        آفست <Ltr>1043</Ltr> commit می‌شود. نتیجه: هیچ رکوردی گم نشد، اما دو
        رکورد دو بار پردازش شدند.
      </>,
      { status: 'done', committed: NEXT_OFFSET, activeOffset: null },
    )
    push(
      <>
        قاعده: پردازش قبل از commit، تحویل حداقل یک‌بار می‌دهد. تضمین گم‌نشدن
        داده را می‌گیرید، به بهای احتمال تکرار.
      </>,
    )
  }

  if (stage === 'eo') {
    push(
      <>
        همان شروع: committed offset روی <Ltr>1040</Ltr> است و{' '}
        <Ltr>poll</Ltr> سه رکورد <Ltr>1040</Ltr> تا <Ltr>1042</Ltr> را می‌دهد.
        این بار مصرف‌کننده یک Producer تراکنشی هم دارد.
      </>,
    )
    push(
      <>
        تراکنش باز می‌شود و رکورد <Ltr>1040</Ltr> پردازش می‌شود. خروجی آن در
        تاپیک مقصد نوشته می‌شود، اما هنوز «معلق» است و خواننده‌های{' '}
        <Ltr>read_committed</Ltr> آن را نمی‌بینند.
      </>,
      {
        status: 'processing',
        activeOffset: 1040,
        txOpen: true,
        records: { ...state.records, 1040: 'ok' },
        output: { ...state.output, 1040: 'pending' },
      },
    )
    push(
      <>
        رکورد <Ltr>1041</Ltr> هم پردازش و خروجی‌اش معلق نوشته می‌شود. آفست‌های
        ورودی هنوز commit نشده‌اند.
      </>,
      {
        activeOffset: 1041,
        records: { ...state.records, 1041: 'ok' },
        output: { ...state.output, 1041: 'pending' },
      },
    )
    push(
      <>
        پیش از رسیدن به <Ltr>1042</Ltr> پروسه از کار می‌افتد. تراکنش باز مانده
        است.
      </>,
      { status: 'crashed', activeOffset: null },
    )
    push(
      <>
        بروکر تراکنش را <Ltr>abort</Ltr> می‌کند: خروجی‌های معلق دور ریخته
        می‌شوند و committed offset همان <Ltr>1040</Ltr> می‌ماند. پس نه اثر
        نیمه‌کاره‌ای بیرون می‌رود و نه آفست جلو می‌رود.
      </>,
      {
        txOpen: false,
        records: { ...EMPTY_RECORDS },
        output: { 1040: 'no', 1041: 'no', 1042: 'idle' },
      },
    )
    push(
      <>
        پس از restart، مصرف‌کننده از <Ltr>1040</Ltr> دوباره می‌خواند و هر سه
        رکورد را در تلاش دوم پردازش می‌کند.
      </>,
      {
        status: 'restarted',
        attempt: 2,
        txOpen: true,
        activeOffset: 1042,
        records: { 1040: 'ok', 1041: 'ok', 1042: 'ok' },
        output: { 1040: 'pending', 1041: 'pending', 1042: 'pending' },
      },
    )
    push(
      <>
        این بار خروجی‌ها و آفست ورودی <Ltr>1043</Ltr> در یک تراکنش commit
        می‌شوند. یا هر دو با هم ثبت می‌شوند یا هیچ‌کدام.
      </>,
      {
        status: 'committed',
        committed: NEXT_OFFSET,
        txOpen: false,
        output: { 1040: 'ok', 1041: 'ok', 1042: 'ok' },
      },
    )
    push(
      <>
        مصرف‌کنندهٔ پایین‌دستی با <Ltr>read_committed</Ltr> فقط خروجی نهایی را
        می‌بیند: هر رکورد دقیقاً یک خروجی، بدون گم‌شدن و بدون تکرار.
      </>,
      { status: 'done', activeOffset: null },
    )
    push(
      <>
        قاعده: <Ltr>exactly-once</Ltr> یعنی نوشتن خروجی و commit آفست به‌صورت
        اتمیک. این تضمین از تنظیم یک پرچم روی Consumer به دست نمی‌آید؛ به
        Producer تراکنشی و خواندن با <Ltr>read_committed</Ltr> هم نیاز دارد.
      </>,
    )
  }

  return snapshots
}

const STAGE_SNAPSHOTS: Record<Stage, SnapshotState[]> = {
  amo: buildSnapshots('amo'),
  alo: buildSnapshots('alo'),
  eo: buildSnapshots('eo'),
}

const STAGE_LABELS: Record<Stage, string> = {
  amo: 'at-most-once',
  alo: 'at-least-once',
  eo: 'exactly-once',
}

const BOX_X = (index: number) => 40 + index * 106
const RECORD_Y = 52
const OUTPUT_Y = 268

function boxClass(mark: Mark): string {
  switch (mark) {
    case 'ok':
      return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
    case 'acc':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    case 'no':
      return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/60 dark:stroke-rose-500'
    case 'dup':
      return 'fill-amber-50 stroke-amber-500 dark:fill-amber-950/60 dark:stroke-amber-500'
    case 'pending':
      return 'fill-amber-50 stroke-amber-400 dark:fill-amber-950/50 dark:stroke-amber-500'
    default:
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

function recordLabel(mark: Mark): string {
  switch (mark) {
    case 'ok':
      return 'پردازش شد'
    case 'acc':
      return 'در حال پردازش'
    case 'no':
      return 'گم شد'
    case 'dup':
      return 'تکراری'
    case 'pending':
      return 'معلق'
    default:
      return 'دست‌نخورده'
  }
}

function outputLabel(mark: Mark): string {
  switch (mark) {
    case 'ok':
      return 'commit شد'
    case 'no':
      return 'abort شد'
    case 'pending':
      return 'معلق'
    default:
      return '—'
  }
}

function statusText(snapshot: SnapshotState): string {
  switch (snapshot.status) {
    case 'poll':
      return 'poll: دسته را گرفت'
    case 'processing':
      return snapshot.activeOffset
        ? `در حال پردازش ${snapshot.activeOffset}`
        : 'در حال پردازش'
    case 'committed':
      return 'آفست را commit کرد'
    case 'crashed':
      return 'پروسه از کار افتاد'
    case 'restarted':
      return 'تلاش دوم از committed offset'
    case 'done':
      return 'پایان'
  }
}

export function DeliverySemanticsExplainer() {
  const [stage, setStage] = useState<Stage>('amo')
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

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            اگر مصرف‌کننده وسط کار از کار بیفتد، هر semantic چه سرنوشتی برای
            رکوردها رقم می‌زند؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(totalSteps)}
        </Badge>
      </div>

      <div
        role="group"
        aria-label="انتخاب semantic تحویل"
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
          viewBox="0 0 700 330"
          role="img"
          aria-label="یک پارتیشن با سه رکورد، مصرف‌کننده و committed offset؛ نتیجهٔ برخورد با crash در سه semantic تحویل"
          className="h-auto w-full min-w-[600px]"
        >
          <text
            x={40}
            y={36}
            fontSize={11}
            fontWeight={700}
            className="fill-slate-600 dark:fill-slate-300"
          >
            لاگ پارتیشن ۰
          </text>

          {OFFSETS.map((offset, index) => {
            const mark = snapshot.records[offset]
            return (
              <g key={`record-${offset}`}>
                <rect
                  x={BOX_X(index)}
                  y={RECORD_Y}
                  width={92}
                  height={46}
                  rx={8}
                  strokeWidth={1}
                  strokeDasharray={mark === 'pending' ? '4 3' : undefined}
                  className={`transition-colors duration-300 motion-reduce:transition-none ${boxClass(
                    mark,
                  )}`}
                />
                <text
                  x={BOX_X(index) + 46}
                  y={RECORD_Y + 20}
                  textAnchor="middle"
                  fontSize={12}
                  className="fill-slate-900 font-mono dark:fill-slate-100"
                >
                  {offset}
                </text>
                <text
                  x={BOX_X(index) + 46}
                  y={RECORD_Y + 36}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-slate-500 dark:fill-slate-400"
                >
                  {recordLabel(mark)}
                </text>
              </g>
            )
          })}

          <line
            x1={360}
            y1={RECORD_Y + 23}
            x2={424}
            y2={RECORD_Y + 23}
            strokeDasharray="4 4"
            className="stroke-slate-300 dark:stroke-slate-600"
          />
          <polygon
            points={`424,${RECORD_Y + 23} 416,${RECORD_Y + 19} 416,${RECORD_Y + 27}`}
            className="fill-slate-400 dark:fill-slate-500"
          />

          <rect
            x={430}
            y={40}
            width={160}
            height={84}
            rx={10}
            className={
              snapshot.status === 'crashed'
                ? 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/50 dark:stroke-rose-500'
                : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
            }
          />
          <text
            x={510}
            y={62}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            className="fill-slate-900 dark:fill-slate-100"
          >
            مصرف‌کننده
          </text>
          <text
            x={510}
            y={82}
            textAnchor="middle"
            fontSize={9.5}
            className="fill-slate-500 dark:fill-slate-400"
          >
            تلاش {toPersianDigits(snapshot.attempt)}
          </text>
          <text
            x={510}
            y={102}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            className={
              snapshot.status === 'crashed'
                ? 'fill-rose-600 dark:fill-rose-400'
                : 'fill-primary-700 dark:fill-primary-300'
            }
          >
            {statusText(snapshot)}
          </text>

          <rect
            x={430}
            y={146}
            width={160}
            height={46}
            rx={8}
            className="fill-slate-50 stroke-slate-300 dark:fill-slate-950/40 dark:stroke-slate-700"
          />
          <text
            x={510}
            y={164}
            textAnchor="middle"
            fontSize={9}
            className="fill-slate-500 dark:fill-slate-400"
          >
            committed offset
          </text>
          <text
            x={510}
            y={182}
            textAnchor="middle"
            fontSize={14}
            className="fill-slate-900 font-mono dark:fill-slate-100"
          >
            {snapshot.committed}
          </text>

          <text
            x={40}
            y={246}
            fontSize={11}
            fontWeight={700}
            className="fill-slate-600 dark:fill-slate-300"
          >
            خروجی تراکنشی
          </text>

          {snapshot.stage === 'eo' ? (
            <>
              <path
                d="M510 192 L510 291 L352 291"
                fill="none"
                strokeDasharray="4 4"
                className={
                  snapshot.txOpen
                    ? 'stroke-primary-500 dark:stroke-primary-400'
                    : 'stroke-slate-300 dark:stroke-slate-600'
                }
                strokeWidth={snapshot.txOpen ? 2 : 1}
              />
              <polygon
                points="352,291 360,287 360,295"
                className={
                  snapshot.txOpen
                    ? 'fill-primary-500 dark:fill-primary-400'
                    : 'fill-slate-400 dark:fill-slate-500'
                }
              />
              {OFFSETS.map((offset, index) => {
                const mark = snapshot.output[offset]
                return (
                  <g key={`output-${offset}`}>
                    <rect
                      x={BOX_X(index)}
                      y={OUTPUT_Y}
                      width={92}
                      height={44}
                      rx={8}
                      strokeWidth={1}
                      strokeDasharray={mark === 'pending' ? '4 3' : undefined}
                      className={`transition-colors duration-300 motion-reduce:transition-none ${boxClass(
                        mark,
                      )}`}
                    />
                    <text
                      x={BOX_X(index) + 46}
                      y={OUTPUT_Y + 19}
                      textAnchor="middle"
                      fontSize={12}
                      className="fill-slate-900 font-mono dark:fill-slate-100"
                    >
                      {offset}
                    </text>
                    <text
                      x={BOX_X(index) + 46}
                      y={OUTPUT_Y + 34}
                      textAnchor="middle"
                      fontSize={9}
                      className="fill-slate-500 dark:fill-slate-400"
                    >
                      {outputLabel(mark)}
                    </text>
                  </g>
                )
              })}
            </>
          ) : (
            <text
              x={40}
              y={290}
              fontSize={10}
              className="fill-slate-400 dark:fill-slate-500"
            >
              در این حالت خروجی کافکایی و تراکنشی نداریم؛ اثر پردازش بیرون از
              کافکاست.
            </text>
          )}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط یک پارتیشن و سه رکورد نشان داده شده است؛ منطق دقیقاً
        همان چیزی است که کافکا انجام می‌دهد: commit آفست، تحویل دوباره پس از
        restart و اتمیک بودن تراکنش.
      </p>
    </div>
  )
}
