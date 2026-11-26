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
  | 'start'
  | 'sendA'
  | 'storeA'
  | 'retryA'
  | 'dedupe'
  | 'sendB'
  | 'restart'
  | 'duplicate'
  | 'transaction'
  | 'rule'

interface LogRecord {
  offset: number
  key: string
  duplicate?: boolean
  ghost?: boolean
  transactional?: boolean
}

interface ProducerStateEntry {
  pid: number
  epoch: number
  lastSeq: number
  current: boolean
}

type DupCheck = 'idle' | 'new' | 'pending' | 'seen' | 'mismatch' | 'fenced'

type Tone = 'idle' | 'primary' | 'amber' | 'emerald' | 'rose'

interface SnapshotState {
  records: LogRecord[]
  pid: number
  epoch: number
  seq: number
  acked: boolean
  ackLost: boolean
  retried: boolean
  duplicateDetected: boolean
  restarted: boolean
  consumerVisible: number[]
  phase: string
  active: ActiveStep
  inFlight: 'none' | 'A' | 'B'
  retryCount: number
  ghostVisible: boolean
  transactional: boolean
  readCommitted: boolean
  producerStates: ProducerStateEntry[]
  dupCheck: DupCheck
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const BASE_OFFSET = 1042
const LOG_OFFSETS = [1042, 1043, 1044, 1045, 1046, 1047] as const
const KEY_BY_OFFSET: Record<number, string> = {
  1042: 'order-1042',
  1043: 'order-1043',
  1044: 'order-1044',
  1045: 'order-1045',
  1046: 'order-1044',
  1047: 'order-1045',
}

const GHOST_RECORDS: LogRecord[] = [
  { offset: 1044, key: 'order-1042', duplicate: true, ghost: true },
  { offset: 1045, key: 'order-1043', duplicate: true, ghost: true },
]

const PRODUCE_ACTIVE: ActiveStep[] = [
  'sendA',
  'retryA',
  'dedupe',
  'sendB',
  'duplicate',
  'transaction',
]
const FETCH_ACTIVE: ActiveStep[] = ['sendB', 'duplicate', 'transaction']
const PRODUCER_ACTIVE: ActiveStep[] = ['start', 'sendA', 'retryA', 'restart']
const BROKER_ACTIVE: ActiveStep[] = [
  'storeA',
  'dedupe',
  'sendB',
  'duplicate',
  'transaction',
]

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    records: [],
    pid: 7001,
    epoch: 0,
    seq: 0,
    acked: false,
    ackLost: false,
    retried: false,
    duplicateDetected: false,
    restarted: false,
    consumerVisible: [],
    phase: 'شروع',
    active: 'start',
    inFlight: 'none',
    retryCount: 0,
    ghostVisible: false,
    transactional: false,
    readCommitted: false,
    producerStates: [],
    dupCheck: 'idle',
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      وضعیت شروع: تاپیک <Ltr>orders</Ltr>، پارتیشن <Ltr>0</Ltr>. لاگ تا{' '}
      <Ltr>offset 1041</Ltr> پر شده و <Ltr>HW=1042</Ltr> است.{' '}
      <Ltr>Producer</Ltr> با <Ltr>PID=7001</Ltr> و <Ltr>epoch=0</Ltr> آماده
      است؛ <Ltr>enable.idempotence=true</Ltr> و <Ltr>acks=all</Ltr>. حافظهٔ{' '}
      <Ltr>Producer State</Ltr> روی بروکر خالی است.
    </>,
  )

  push(
    <>
      بچ <Ltr>A</Ltr> با دو رکورد (<Ltr>order-1042</Ltr> و{' '}
      <Ltr>order-1043</Ltr>) و <Ltr>sequence number</Ltr> صفر به لیدر فرستاده
      می‌شود. <Ltr>Producer</Ltr> تا رسیدن <Ltr>ack</Ltr> منتظر می‌ماند.
    </>,
    {
      inFlight: 'A',
      phase: 'ارسال بچ A',
      active: 'sendA',
    },
  )

  push(
    <>
      بروکر بچ را در <Ltr>offset</Ltr>های <Ltr>1042</Ltr> و <Ltr>1043</Ltr>{' '}
      می‌نویسد و در <Ltr>Producer State</Ltr> ثبت می‌کند: <Ltr>PID=7001</Ltr>،{' '}
      <Ltr>epoch=0</Ltr>، آخرین <Ltr>seq=0</Ltr>. اما <Ltr>ack</Ltr> در شبکه
      گم می‌شود.
    </>,
    {
      records: [
        { offset: 1042, key: KEY_BY_OFFSET[1042] },
        { offset: 1043, key: KEY_BY_OFFSET[1043] },
      ],
      ackLost: true,
      consumerVisible: [1042, 1043],
      producerStates: [{ pid: 7001, epoch: 0, lastSeq: 0, current: true }],
      dupCheck: 'new',
      phase: 'گم شدن ack',
      active: 'storeA',
    },
  )

  push(
    <>
      <Ltr>Producer</Ltr> نمی‌داند نوشته شده یا نه. بعد از{' '}
      <Ltr>retry.backoff.ms</Ltr> همان بچ را با همان <Ltr>seq=0</Ltr> دوباره
      می‌فرستد؛ <Ltr>seq</Ltr> عوض نمی‌شود چون بچ جدیدی ساخته نشده.
    </>,
    {
      retried: true,
      retryCount: 1,
      dupCheck: 'pending',
      phase: 'تلاش دوباره',
      active: 'retryA',
    },
  )

  push(
    <>
      بروکر <Ltr>PID</Ltr> و <Ltr>seq</Ltr> را با حافظهٔ خودش مقایسه می‌کند:{' '}
      <Ltr>seq=0</Ltr> قبلاً دیده شده. بچ دوباره نوشته نمی‌شود و همان{' '}
      <Ltr>ack</Ltr> قبلی برمی‌گردد. بدون <Ltr>idempotence</Ltr> این‌جا
      رکوردهای تکراری با <Ltr>offset</Ltr>های <Ltr>1044</Ltr> و{' '}
      <Ltr>1045</Ltr> نوشته می‌شدند.
    </>,
    {
      acked: true,
      ackLost: false,
      inFlight: 'none',
      duplicateDetected: true,
      ghostVisible: true,
      dupCheck: 'seen',
      phase: 'تشخیص تکراری',
      active: 'dedupe',
    },
  )

  push(
    <>
      <Ltr>Producer</Ltr> با خیال راحت <Ltr>seq</Ltr> را به <Ltr>1</Ltr>{' '}
      می‌برد و بچ <Ltr>B</Ltr> را می‌فرستد: <Ltr>offset</Ltr>های{' '}
      <Ltr>1044</Ltr> و <Ltr>1045</Ltr>. مصرف‌کننده چهار رکورد یکتا می‌بیند.
    </>,
    {
      records: [
        { offset: 1042, key: KEY_BY_OFFSET[1042] },
        { offset: 1043, key: KEY_BY_OFFSET[1043] },
        { offset: 1044, key: KEY_BY_OFFSET[1044] },
        { offset: 1045, key: KEY_BY_OFFSET[1045] },
      ],
      seq: 1,
      inFlight: 'none',
      retried: false,
      retryCount: 1,
      consumerVisible: [1042, 1043, 1044, 1045],
      producerStates: [{ pid: 7001, epoch: 0, lastSeq: 1, current: true }],
      dupCheck: 'new',
      phase: 'بچ B',
      active: 'sendB',
    },
  )

  push(
    <>
      <Ltr>Producer</Ltr> کرش می‌کند و بالا می‌آید. <Ltr>PID</Ltr> جدید{' '}
      <Ltr>7002</Ltr> صادر می‌شود و شمارندهٔ <Ltr>seq</Ltr> از صفر شروع
      می‌شود. حافظهٔ <Ltr>Producer State</Ltr> برای <Ltr>PID</Ltr> قدیمی هنوز
      روی بروکر است.
    </>,
    {
      pid: 7002,
      epoch: 0,
      seq: 0,
      restarted: true,
      retried: false,
      retryCount: 0,
      dupCheck: 'idle',
      phase: 'ری‌استارت',
      active: 'restart',
    },
  )

  push(
    <>
      همان رکوردهای منطقی دوباره فرستاده می‌شوند، اما این بار با{' '}
      <Ltr>PID=7002</Ltr> و <Ltr>seq=0</Ltr>. بروکر <Ltr>Producer</Ltr> جدیدی
      می‌بیند و می‌نویسد: <Ltr>offset</Ltr>های <Ltr>1046</Ltr> و{' '}
      <Ltr>1047</Ltr>. <Ltr>idempotence</Ltr> فقط در یک نشست کار می‌کند.
    </>,
    {
      records: [
        { offset: 1042, key: KEY_BY_OFFSET[1042] },
        { offset: 1043, key: KEY_BY_OFFSET[1043] },
        { offset: 1044, key: KEY_BY_OFFSET[1044] },
        { offset: 1045, key: KEY_BY_OFFSET[1045] },
        { offset: 1046, key: KEY_BY_OFFSET[1046], duplicate: true },
        { offset: 1047, key: KEY_BY_OFFSET[1047], duplicate: true },
      ],
      consumerVisible: [1042, 1043, 1044, 1045, 1046, 1047],
      producerStates: [
        { pid: 7001, epoch: 0, lastSeq: 1, current: false },
        { pid: 7002, epoch: 0, lastSeq: 0, current: true },
      ],
      dupCheck: 'mismatch',
      phase: 'نشست جدید',
      active: 'duplicate',
    },
  )

  push(
    <>
      با <Ltr>Transaction</Ltr> و <Ltr>transactional.id</Ltr> ثابت، بعد از{' '}
      <Ltr>restart</Ltr> همان <Ltr>PID</Ltr> با <Ltr>epoch</Ltr> بالاتر
      برمی‌گردد و نشست قبلی <Ltr>fence</Ltr> می‌شود. مهم‌تر اینکه آفست ورودی و
      رکورد خروجی در یک تراکنش <Ltr>commit</Ltr> می‌شوند، پس ورودیِ{' '}
      <Ltr>commit</Ltr>شده دوباره پردازش نمی‌شود.
    </>,
    {
      records: state.records.map((record) =>
        record.duplicate ? record : { ...record, transactional: true },
      ),
      pid: 7001,
      epoch: 1,
      seq: 0,
      transactional: true,
      readCommitted: true,
      consumerVisible: [1042, 1043, 1044, 1045],
      producerStates: [
        { pid: 7001, epoch: 0, lastSeq: 1, current: false },
        { pid: 7001, epoch: 1, lastSeq: 0, current: true },
      ],
      dupCheck: 'fenced',
      phase: 'تراکنش',
      active: 'transaction',
    },
  )

  push(
    <>
      قانون: <Ltr>idempotence</Ltr> تکراری‌شدن نوشتن در یک نشست{' '}
      <Ltr>Producer</Ltr> و یک پارتیشن را حل می‌کند؛ <Ltr>exactly-once</Ltr>{' '}
      سرتاسری به <Ltr>Transaction</Ltr>، آفست اتمیک و{' '}
      <Ltr>sink idempotent</Ltr> نیاز دارد.
    </>,
    {
      phase: 'قانون',
      active: 'rule',
    },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

function activeOffsetsFor(active: ActiveStep): number[] {
  switch (active) {
    case 'storeA':
      return [1042, 1043]
    case 'sendB':
      return [1044, 1045]
    case 'duplicate':
      return [1046, 1047]
    case 'transaction':
      return [1042, 1043, 1044, 1045]
    default:
      return []
  }
}

function panelClass(active: boolean): string {
  return active
    ? 'fill-primary-50/50 stroke-primary-400 dark:fill-primary-950/25 dark:stroke-primary-700'
    : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
}

function rosePanelClass(active: boolean): string {
  return active
    ? 'fill-rose-50/60 stroke-rose-400 dark:fill-rose-950/25 dark:stroke-rose-700'
    : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
}

function producerStatePanelClass(active: ActiveStep): string {
  switch (active) {
    case 'storeA':
    case 'dedupe':
      return 'fill-primary-50/60 stroke-primary-400 dark:fill-primary-950/25 dark:stroke-primary-700'
    case 'restart':
      return 'fill-amber-50/60 stroke-amber-400 dark:fill-amber-950/25 dark:stroke-amber-700'
    case 'duplicate':
      return 'fill-rose-50/60 stroke-rose-400 dark:fill-rose-950/25 dark:stroke-rose-700'
    case 'transaction':
      return 'fill-emerald-50/60 stroke-emerald-400 dark:fill-emerald-950/25 dark:stroke-emerald-700'
    default:
      return 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
  }
}

function logRowClass(record: LogRecord | undefined, active: boolean): string {
  if (!record) {
    return 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
  }
  if (record.duplicate) {
    return active
      ? 'fill-rose-100 stroke-rose-500 dark:fill-rose-950/60 dark:stroke-rose-400'
      : 'fill-rose-50 stroke-rose-300 dark:fill-rose-950/40 dark:stroke-rose-700'
  }
  if (record.transactional) {
    return active
      ? 'fill-emerald-100 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-400'
      : 'fill-emerald-50 stroke-emerald-300 dark:fill-emerald-950/40 dark:stroke-emerald-700'
  }
  if (active) {
    return 'fill-primary-100 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
  }
  return 'fill-emerald-50 stroke-emerald-300 dark:fill-emerald-950/40 dark:stroke-emerald-700'
}

function rowTextClass(record: LogRecord | undefined, active: boolean): string {
  if (!record) return 'fill-slate-300 dark:fill-slate-700'
  if (record.duplicate) return 'fill-rose-800 dark:fill-rose-200'
  if (record.transactional) return 'fill-emerald-800 dark:fill-emerald-200'
  if (active) return 'fill-primary-800 dark:fill-primary-200'
  return 'fill-slate-800 dark:fill-slate-100'
}

function rowLabel(record: LogRecord | undefined, aborted: boolean): string {
  if (!record) return 'empty'
  if (record.duplicate) return aborted ? 'aborted' : 'duplicate'
  if (record.transactional) return 'txn'
  return 'unique'
}

function rowLabelClass(record: LogRecord | undefined, active: boolean): string {
  if (!record) return 'fill-slate-300 dark:fill-slate-700'
  if (record.duplicate) return 'fill-rose-700 dark:fill-rose-300'
  if (record.transactional) return 'fill-emerald-700 dark:fill-emerald-300'
  if (active) return 'fill-primary-700 dark:fill-primary-300'
  return 'fill-emerald-700 dark:fill-emerald-300'
}

function toneTextClass(tone: Tone): string {
  switch (tone) {
    case 'primary':
      return 'fill-primary-700 dark:fill-primary-300'
    case 'amber':
      return 'fill-amber-700 dark:fill-amber-300'
    case 'emerald':
      return 'fill-emerald-700 dark:fill-emerald-300'
    case 'rose':
      return 'fill-rose-700 dark:fill-rose-300'
    default:
      return 'fill-slate-400 dark:fill-slate-500'
  }
}

function producerStatusFor(snapshot: SnapshotState): {
  label: string
  tone: Tone
} {
  switch (snapshot.active) {
    case 'start':
      return { label: 'idle · ready', tone: 'idle' }
    case 'sendA':
      return { label: 'waiting for ack', tone: 'amber' }
    case 'storeA':
      return { label: 'ack lost · outcome unknown', tone: 'amber' }
    case 'retryA':
      return { label: 'retrying · same seq 0', tone: 'amber' }
    case 'dedupe':
      return { label: 'acked · safe to continue', tone: 'emerald' }
    case 'sendB':
      return { label: 'acked · seq → 1', tone: 'emerald' }
    case 'restart':
      return { label: 'restarted · new PID 7002', tone: 'amber' }
    case 'duplicate':
      return { label: 'acked · duplicate written', tone: 'rose' }
    case 'transaction':
      return { label: 'transactional · fenced old session', tone: 'emerald' }
    case 'rule':
      return { label: 'transactional · exactly-once', tone: 'emerald' }
    default:
      return { label: 'idle', tone: 'idle' }
  }
}

function dupCheckText(snapshot: SnapshotState): string {
  switch (snapshot.dupCheck) {
    case 'new':
      return `dup check: seq ${snapshot.seq} new → append`
    case 'pending':
      return `dup check: seq ${snapshot.seq} incoming`
    case 'seen':
      return 'dup check: seq 0 already seen → drop'
    case 'mismatch':
      return 'dup check: new PID → no match → append'
    case 'fenced':
      return 'dup check: epoch 1 > 0 → old session fenced'
    default:
      return 'dup check: — (no state)'
  }
}

function dupCheckTone(dupCheck: DupCheck): Tone {
  switch (dupCheck) {
    case 'new':
      return 'primary'
    case 'pending':
      return 'amber'
    case 'seen':
    case 'fenced':
      return 'emerald'
    case 'mismatch':
      return 'rose'
    default:
      return 'idle'
  }
}

function produceLabel(active: ActiveStep): string {
  switch (active) {
    case 'sendA':
    case 'storeA':
      return 'ProduceRequest · batch A · seq 0'
    case 'retryA':
    case 'dedupe':
      return 'ProduceRequest · retry · seq 0'
    case 'sendB':
      return 'ProduceRequest · batch B · seq 1'
    case 'duplicate':
      return 'ProduceRequest · PID 7002 · seq 0'
    case 'transaction':
      return 'ProduceRequest · txn · PID 7001 · epoch 1'
    case 'rule':
      return 'ProduceRequest · txn'
    default:
      return 'no request yet'
  }
}

function ackLabel(snapshot: SnapshotState): string {
  if (snapshot.active === 'start' || snapshot.active === 'restart') {
    return 'no ack yet'
  }
  if (snapshot.ackLost) return 'ack lost in network'
  if (snapshot.acked) return 'ack returned'
  return 'waiting for ack'
}

function ackStrokeClass(snapshot: SnapshotState): string {
  if (snapshot.ackLost) return 'stroke-amber-500 dark:stroke-amber-400'
  if (snapshot.acked) return 'stroke-emerald-500 dark:stroke-emerald-400'
  return 'stroke-slate-400 dark:stroke-slate-500'
}

function arrowClass(active: boolean): string {
  return active
    ? 'stroke-primary-500 dark:stroke-primary-400'
    : 'stroke-slate-400 dark:stroke-slate-500'
}

function markerFor(active: boolean): string {
  return active ? 'url(#retry-arrow-active)' : 'url(#retry-arrow)'
}

export function RetryIdempotenceExplainer() {
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

  const recordByOffset = new Map(
    snapshot.records.map((record) => [record.offset, record]),
  )
  const activeOffsets = activeOffsetsFor(snapshot.active)
  const produceActive = PRODUCE_ACTIVE.includes(snapshot.active)
  const fetchActive = FETCH_ACTIVE.includes(snapshot.active)
  const producerActive = PRODUCER_ACTIVE.includes(snapshot.active)
  const brokerActive = BROKER_ACTIVE.includes(snapshot.active)
  const hw = BASE_OFFSET + snapshot.records.length
  const visibleRecords = snapshot.consumerVisible.flatMap((offset) => {
    const record = recordByOffset.get(offset)
    return record ? [record] : []
  })
  const duplicateCount = visibleRecords.filter(
    (record) => record.duplicate,
  ).length
  const uniqueCount = new Set(visibleRecords.map((record) => record.key)).size
  const visibleLabel =
    snapshot.consumerVisible.length > 0
      ? `${snapshot.consumerVisible[0]}..${snapshot.consumerVisible[snapshot.consumerVisible.length - 1]}`
      : '—'
  const nextOffset =
    snapshot.consumerVisible.length > 0
      ? snapshot.consumerVisible[snapshot.consumerVisible.length - 1] + 1
      : BASE_OFFSET
  const producerStatus = producerStatusFor(snapshot)
  const duplicateTone: Tone = duplicateCount > 0 ? 'rose' : 'emerald'

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            چرا یک Retry ساده رکورد تکراری می‌سازد و idempotence کجا جلوی آن را
            می‌گیرد؟
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
        {'orders / partition 0 · acks=all · enable.idempotence=true · max.in.flight=5'}
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
          aria-label="نمودار Producer با PID و seq، ارسال بچ به بروکر، گم شدن ack، تشخیص تکراری با Producer State، ری‌استارت با PID جدید، نوشتن تکراری و مقایسه با Producer تراکنشی و read_committed"
          className="h-auto w-full min-w-[760px]"
        >
          <defs>
            <marker
              id="retry-arrow"
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
              id="retry-arrow-active"
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
            x={560}
            y={20}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-900 dark:fill-slate-100"
          >
            Broker
          </text>

          {/* Producer panel */}
          <rect
            x={16}
            y={34}
            width={300}
            height={170}
            rx={10}
            strokeWidth={1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${panelClass(
              producerActive,
            )}`}
          />
          <text
            x={28}
            y={54}
            fontSize={10}
            fontWeight={700}
            className="fill-slate-900 font-mono dark:fill-slate-100"
          >
            {`PID=${snapshot.pid} · epoch=${snapshot.epoch}`}
          </text>
          <text
            x={28}
            y={72}
            fontSize={8.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`seq=${snapshot.seq} · max.in.flight=5`}
          </text>
          <text
            x={28}
            y={92}
            fontSize={8.5}
            className={
              snapshot.inFlight === 'none'
                ? 'fill-slate-400 font-mono dark:fill-slate-500'
                : 'fill-primary-700 font-mono dark:fill-primary-300'
            }
          >
            {snapshot.inFlight === 'none'
              ? 'in-flight: —'
              : `in-flight: batch ${snapshot.inFlight} · 2 records`}
          </text>
          <text
            x={28}
            y={110}
            fontSize={8.5}
            className={
              snapshot.retryCount > 0
                ? 'fill-amber-700 font-mono dark:fill-amber-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            {`retry count: ${snapshot.retryCount}${snapshot.retried ? ' · same seq' : ''}`}
          </text>
          <text
            x={28}
            y={128}
            fontSize={8.5}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            enable.idempotence=true
          </text>
          <text
            x={28}
            y={150}
            fontSize={9}
            fontWeight={700}
            className={`font-mono ${toneTextClass(producerStatus.tone)}`}
          >
            {producerStatus.label}
          </text>
          <text
            x={28}
            y={168}
            fontSize={8}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.transactional
              ? 'transactional.id=orders-tx'
              : 'transactional.id=—'}
          </text>
          <text
            x={28}
            y={186}
            fontSize={8}
            className={
              snapshot.restarted
                ? 'fill-amber-700 font-mono dark:fill-amber-300'
                : 'fill-slate-400 font-mono dark:fill-slate-500'
            }
          >
            {snapshot.restarted ? 'session: restarted' : 'session: stable'}
          </text>

          {/* Produce request / ack connectors */}
          <line
            x1={316}
            y1={110}
            x2={560}
            y2={110}
            strokeWidth={produceActive ? 2.5 : 1.2}
            strokeDasharray="5 4"
            markerEnd={markerFor(produceActive)}
            className={`transition-colors duration-500 motion-reduce:transition-none ${arrowClass(
              produceActive,
            )}`}
          />
          <text
            x={438}
            y={100}
            textAnchor="middle"
            fontSize={8.5}
            className={
              produceActive
                ? 'fill-primary-700 font-mono dark:fill-primary-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            {produceLabel(snapshot.active)}
          </text>

          <line
            x1={560}
            y1={140}
            x2={316}
            y2={140}
            strokeWidth={snapshot.acked || snapshot.ackLost ? 2.2 : 1.2}
            strokeDasharray="5 4"
            markerEnd={markerFor(snapshot.acked)}
            className={`transition-colors duration-500 motion-reduce:transition-none ${ackStrokeClass(
              snapshot,
            )}`}
          />
          <text
            x={438}
            y={158}
            textAnchor="middle"
            fontSize={8.5}
            className={
              snapshot.ackLost
                ? 'fill-amber-700 font-mono dark:fill-amber-300'
                : snapshot.acked
                  ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                  : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            {ackLabel(snapshot)}
          </text>

          {/* Broker log panel */}
          <rect
            x={560}
            y={34}
            width={324}
            height={300}
            rx={10}
            strokeWidth={1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${panelClass(
              brokerActive,
            )}`}
          />
          <text
            x={572}
            y={54}
            fontSize={10.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            leader · log · partition 0
          </text>
          <text
            x={872}
            y={54}
            textAnchor="end"
            fontSize={8.5}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            {`HW = ${hw}`}
          </text>

          {LOG_OFFSETS.map((offset, index) => {
            const record = recordByOffset.get(offset)
            const active = activeOffsets.includes(offset)
            const rowY = 64 + index * 27
            return (
              <g key={`log-${offset}`}>
                <rect
                  x={572}
                  y={rowY}
                  width={300}
                  height={24}
                  rx={5}
                  strokeWidth={active ? 2 : 1}
                  strokeDasharray={record ? undefined : '4 3'}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${logRowClass(
                    record,
                    active,
                  )}`}
                />
                <text
                  x={584}
                  y={rowY + 16}
                  fontSize={8.5}
                  fontWeight={700}
                  className={`font-mono ${rowTextClass(record, active)}`}
                >
                  {record ? `offset ${offset}` : 'offset —'}
                </text>
                <text
                  x={676}
                  y={rowY + 16}
                  fontSize={8.5}
                  className={`font-mono ${rowTextClass(record, active)}`}
                >
                  {record ? record.key : '—'}
                </text>
                <text
                  x={860}
                  y={rowY + 16}
                  textAnchor="end"
                  fontSize={7.5}
                  className={`font-mono ${rowLabelClass(record, active)}`}
                >
                  {rowLabel(record, snapshot.transactional)}
                </text>
              </g>
            )
          })}

          {/* Transaction marker row */}
          {snapshot.transactional && (
            <g>
              <rect
                x={572}
                y={229}
                width={300}
                height={16}
                rx={5}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                className="fill-emerald-50/70 stroke-emerald-400 dark:fill-emerald-950/30 dark:stroke-emerald-600"
              />
              <text
                x={584}
                y={240}
                fontSize={7.5}
                fontWeight={700}
                className="fill-emerald-800 font-mono dark:fill-emerald-200"
              >
                txn marker · commit · input offset + output atomic
              </text>
            </g>
          )}

          {/* Producer State sub-panel */}
          <rect
            x={572}
            y={252}
            width={300}
            height={72}
            rx={8}
            strokeWidth={1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${producerStatePanelClass(
              snapshot.active,
            )}`}
          />
          <text
            x={584}
            y={268}
            fontSize={8.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            Producer State
          </text>
          {snapshot.duplicateDetected && snapshot.active === 'dedupe' && (
            <text
              x={860}
              y={268}
              textAnchor="end"
              fontSize={7.5}
              className="fill-emerald-700 font-mono dark:fill-emerald-300"
            >
              duplicate dropped
            </text>
          )}
          {snapshot.producerStates.length === 0 ? (
            <text
              x={584}
              y={283}
              fontSize={8}
              className="fill-slate-400 font-mono dark:fill-slate-500"
            >
              empty
            </text>
          ) : (
            snapshot.producerStates.map((entry, index) => (
              <text
                key={`state-${entry.pid}-${index}`}
                x={584}
                y={283 + index * 14}
                fontSize={8}
                className={
                  entry.current
                    ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                    : 'fill-slate-400 font-mono dark:fill-slate-500'
                }
              >
                {`PID=${entry.pid} · epoch=${entry.epoch} · last seq=${entry.lastSeq}${entry.current ? '' : ' (stale)'}`}
              </text>
            ))
          )}
          <text
            x={584}
            y={315}
            fontSize={7.5}
            className={`font-mono ${toneTextClass(dupCheckTone(snapshot.dupCheck))}`}
          >
            {dupCheckText(snapshot)}
          </text>

          {/* Fetch arrow to consumer */}
          <line
            x1={722}
            y1={334}
            x2={722}
            y2={400}
            strokeWidth={fetchActive ? 2.5 : 1.2}
            strokeDasharray="5 4"
            markerEnd={markerFor(fetchActive)}
            className={`transition-colors duration-500 motion-reduce:transition-none ${arrowClass(
              fetchActive,
            )}`}
          />
          <text
            x={730}
            y={362}
            fontSize={9}
            className={
              fetchActive
                ? 'fill-primary-700 font-mono dark:fill-primary-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            Fetch
          </text>

          {/* Consumer panel */}
          <rect
            x={560}
            y={400}
            width={324}
            height={84}
            rx={10}
            strokeWidth={1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${panelClass(
              fetchActive,
            )}`}
          />
          <text
            x={572}
            y={418}
            fontSize={10.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            Consumer
          </text>
          <text
            x={872}
            y={418}
            textAnchor="end"
            fontSize={8}
            className={
              snapshot.readCommitted
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : 'fill-slate-400 font-mono dark:fill-slate-500'
            }
          >
            {snapshot.readCommitted ? 'read_committed' : 'read_uncommitted'}
          </text>
          <text
            x={572}
            y={438}
            fontSize={8.5}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            {`visible: ${visibleLabel}`}
          </text>
          <text
            x={572}
            y={456}
            fontSize={8.5}
            className={`font-mono ${toneTextClass(duplicateTone)}`}
          >
            {`unique: ${uniqueCount} · duplicates: ${duplicateCount}`}
          </text>
          <text
            x={572}
            y={474}
            fontSize={8}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`next offset: ${nextOffset}`}
          </text>

          {/* Without-idempotence comparison panel */}
          <rect
            x={16}
            y={240}
            width={300}
            height={244}
            rx={10}
            strokeWidth={1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${rosePanelClass(
              snapshot.ghostVisible,
            )}`}
          />
          <text
            x={292}
            y={260}
            fontSize={10.5}
            fontWeight={700}
            textAnchor="start"
            direction="rtl"
            className={
              snapshot.ghostVisible
                ? 'fill-rose-700 dark:fill-rose-300'
                : 'fill-slate-700 dark:fill-slate-300'
            }
          >
            بدون idempotence
          </text>
          <text
            x={28}
            y={278}
            fontSize={8}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            same retry · no protection
          </text>

          {GHOST_RECORDS.map((ghost, index) => {
            const ghostY = 292 + index * 32
            const visible = snapshot.ghostVisible
            return (
              <g key={`ghost-${ghost.offset}`}>
                <rect
                  x={28}
                  y={ghostY}
                  width={276}
                  height={26}
                  rx={6}
                  strokeWidth={visible ? 1.5 : 1}
                  strokeDasharray="5 3"
                  className={
                    visible
                      ? 'fill-rose-50/70 stroke-rose-400 dark:fill-rose-950/30 dark:stroke-rose-600'
                      : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
                  }
                />
                <text
                  x={40}
                  y={ghostY + 17}
                  fontSize={8.5}
                  fontWeight={700}
                  className={
                    visible
                      ? 'fill-rose-800 font-mono dark:fill-rose-200'
                      : 'fill-slate-300 font-mono dark:fill-slate-700'
                  }
                >
                  {visible ? `offset ${ghost.offset}` : 'offset —'}
                </text>
                <text
                  x={130}
                  y={ghostY + 17}
                  fontSize={8.5}
                  className={
                    visible
                      ? 'fill-rose-700 font-mono dark:fill-rose-300'
                      : 'fill-slate-300 font-mono dark:fill-slate-700'
                  }
                >
                  {visible ? ghost.key : '—'}
                </text>
                <text
                  x={292}
                  y={ghostY + 17}
                  textAnchor="end"
                  fontSize={7.5}
                  className={
                    visible
                      ? 'fill-rose-700 font-mono dark:fill-rose-300'
                      : 'fill-slate-300 font-mono dark:fill-slate-700'
                  }
                >
                  {visible ? 'dup' : '—'}
                </text>
              </g>
            )
          })}

          <text
            x={28}
            y={372}
            fontSize={8.5}
            fontWeight={700}
            className={
              snapshot.ghostVisible
                ? 'fill-rose-700 dark:fill-rose-300'
                : 'fill-slate-400 dark:fill-slate-500'
            }
          >
            {snapshot.ghostVisible
              ? 'نتیجه: ۲ رکورد تکراری'
              : 'without protection: retry appends again'}
          </text>
          <text
            x={28}
            y={392}
            fontSize={8}
            className={
              snapshot.ghostVisible
                ? 'fill-rose-700 font-mono dark:fill-rose-300'
                : 'fill-slate-400 font-mono dark:fill-slate-500'
            }
          >
            {snapshot.ghostVisible
              ? 'consumer: 6 records · 2 duplicates'
              : 'consumer: ?'}
          </text>
          <text
            x={28}
            y={412}
            fontSize={8}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            with idempotence: 4 records · 0 duplicates
          </text>
          <text
            x={28}
            y={438}
            fontSize={8}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            same seq 0 accepted again
          </text>
          <text
            x={28}
            y={458}
            fontSize={8}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            idempotence · one session only
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، لاگ از <Ltr>offset 1042</Ltr> نمایش داده شده و فقط دو بچ
        دو رکوردی نشان داده می‌شود؛ در واقعیت هر بچ می‌تواند رکوردهای بیشتری
        داشته باشد. منطق همان است که Kafka اجرا می‌کند:{' '}
        <Ltr>enable.idempotence=true</Ltr> به هر بچ یک{' '}
        <Ltr>sequence number</Ltr> می‌دهد، بروکر با{' '}
        <Ltr>PID + epoch + seq</Ltr> تکراری‌ها را حذف می‌کند،{' '}
        <Ltr>max.in.flight=5</Ltr> با <Ltr>idempotence</Ltr> ترتیب را حفظ
        می‌کند، و <Ltr>exactly-once</Ltr> سرتاسری فقط با{' '}
        <Ltr>Transaction</Ltr> و <Ltr>read_committed</Ltr> به دست می‌آید.
      </p>
    </div>
  )
}
