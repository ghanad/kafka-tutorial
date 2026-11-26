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
  | 'start'
  | 'init'
  | 'begin'
  | 'sendP0'
  | 'sendP1'
  | 'offsets'
  | 'commit'
  | 'abortSend'
  | 'abort'
  | 'lso'
  | 'fence'
  | 'rule'

type TxnState = 'none' | 'ready' | 'open' | 'committed' | 'aborted'

type RowKind = 'data' | 'commit-marker' | 'abort-marker'
type RowState = 'committed' | 'pending' | 'aborted'

interface LogRow {
  offset: number
  key?: string
  kind: RowKind
  state: RowState
  txn?: number
}

type Tone = 'idle' | 'primary' | 'amber' | 'emerald' | 'rose'

interface SnapshotState {
  pid: number | null
  epoch: number | null
  txnState: TxnState
  stagedOffset: number | null
  committedOffset: number
  p0Rows: LogRow[]
  p1Rows: LogRow[]
  p0Lso: number
  p0Hw: number
  p1Lso: number
  p1Hw: number
  fenced: boolean
  active: ActiveStep
  phase: string
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const BASE_P0: LogRow[] = [
  { offset: 118, key: 'ledger-118', kind: 'data', state: 'committed' },
  { offset: 119, key: 'ledger-119', kind: 'data', state: 'committed' },
]

const BASE_P1: LogRow[] = [
  { offset: 86, key: 'ledger-86', kind: 'data', state: 'committed' },
  { offset: 87, key: 'ledger-87', kind: 'data', state: 'committed' },
]

const PRODUCER_ACTIVE: ActiveStep[] = [
  'start',
  'init',
  'begin',
  'sendP0',
  'sendP1',
  'offsets',
  'commit',
  'abortSend',
  'abort',
  'lso',
  'fence',
  'rule',
]
const BROKER_ACTIVE: ActiveStep[] = [
  'init',
  'sendP0',
  'sendP1',
  'offsets',
  'commit',
  'abortSend',
  'abort',
  'lso',
  'fence',
]
const RC_ACTIVE: ActiveStep[] = ['commit', 'abort', 'lso', 'fence', 'rule']
const RU_ACTIVE: ActiveStep[] = [
  'sendP0',
  'sendP1',
  'abortSend',
  'abort',
  'lso',
  'fence',
]

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    pid: null,
    epoch: null,
    txnState: 'none',
    stagedOffset: null,
    committedOffset: 42,
    p0Rows: BASE_P0,
    p1Rows: BASE_P1,
    p0Lso: 120,
    p0Hw: 120,
    p1Lso: 88,
    p1Hw: 88,
    fenced: false,
    active: 'start',
    phase: 'شروع',
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      وضعیت شروع: تاپیک ورودی <Ltr>payments</Ltr> با یک پارتیشن (<Ltr>p0</Ltr>) و
      تاپیک خروجی <Ltr>ledger</Ltr> با دو پارتیشن (<Ltr>p0</Ltr> و{' '}
      <Ltr>p1</Ltr>). گروه مصرف‌کنندهٔ <Ltr>ledger-app</Ltr> آفست{' '}
      <Ltr>42</Ltr> را commit کرده، یعنی رکورد بعدی که باید بخواند{' '}
      <Ltr>payments/p0</Ltr> آفست <Ltr>42</Ltr> است. <Ltr>Producer</Ltr> هنوز{' '}
      <Ltr>initTransactions</Ltr> صدا نزده و هیچ <Ltr>PID</Ltr> ندارد.
      مصرف‌کنندهٔ <Ltr>read_committed</Ltr> از <Ltr>ledger</Ltr> فقط رکوردهای{' '}
      <Ltr>118</Ltr> و <Ltr>119</Ltr> در <Ltr>p0</Ltr> و <Ltr>86</Ltr> و{' '}
      <Ltr>87</Ltr> در <Ltr>p1</Ltr> را می‌بیند.
    </>,
  )

  push(
    <>
      <Ltr>initTransactions</Ltr> یک <Ltr>InitProducerId</Ltr> به{' '}
      <Ltr>Transaction Coordinator</Ltr> می‌فرستد. Coordinator شناسهٔ پایدار{' '}
      <Ltr>ledger-app-1</Ltr> را به <Ltr>PID=9001</Ltr> و <Ltr>epoch=0</Ltr>{' '}
      نگاشت می‌کند. اگر نسخهٔ قدیمی‌تری از همین برنامه با همین{' '}
      <Ltr>transactional.id</Ltr> زنده باشد، <Ltr>epoch</Ltr> یکی بالا می‌رود و
      نسخهٔ قدیمی <Ltr>fence</Ltr> می‌شود. هنوز رکوردی نوشته نشده و{' '}
      <Ltr>LSO</Ltr> هر پارتیشن تغییری نکرده است.
    </>,
    {
      pid: 9001,
      epoch: 0,
      txnState: 'ready',
      active: 'init',
      phase: 'initTransactions',
    },
  )

  push(
    <>
      <Ltr>beginTransaction</Ltr> فقط وضعیت محلی <Ltr>Producer</Ltr> را باز
      می‌کند؛ در Coordinator هم تراکنش باز ثبت می‌شود. هنوز رکوردی نوشته نشده،
      پس <Ltr>LSO</Ltr> در <Ltr>p0</Ltr> روی <Ltr>120</Ltr> و در <Ltr>p1</Ltr>{' '}
      روی <Ltr>88</Ltr> است. هیچ مصرف‌کننده‌ای چیزی از این تراکنش نمی‌بیند.
    </>,
    {
      txnState: 'open',
      active: 'begin',
      phase: 'تراکنش باز',
    },
  )

  push(
    <>
      اولین <Ltr>ProduceRequest</Ltr> به <Ltr>ledger/p0</Ltr> می‌رود: رکورد{' '}
      <Ltr>ledger-120</Ltr> در آفست <Ltr>120</Ltr> نوشته می‌شود و به‌عنوان بخشی
      از تراکنش باز علامت می‌خورد. <Ltr>HW</Ltr> به <Ltr>121</Ltr> می‌رسد، اما{' '}
      <Ltr>LSO</Ltr> روی <Ltr>120</Ltr> قفل می‌شود. مصرف‌کنندهٔ{' '}
      <Ltr>read_committed</Ltr> هنوز فقط <Ltr>118</Ltr> و <Ltr>119</Ltr> را
      می‌بیند؛ <Ltr>read_uncommitted</Ltr> رکورد <Ltr>120</Ltr> را هم می‌بیند.
    </>,
    {
      p0Rows: [
        ...BASE_P0,
        { offset: 120, key: 'ledger-120', kind: 'data', state: 'pending', txn: 1 },
      ],
      p0Lso: 120,
      p0Hw: 121,
      active: 'sendP0',
      phase: 'ارسال به p0',
    },
  )

  push(
    <>
      دومین رکورد به <Ltr>ledger/p1</Ltr> می‌رود: <Ltr>ledger-88</Ltr> در آفست{' '}
      <Ltr>88</Ltr>. حالا تراکنش روی دو پارتیشن باز است و <Ltr>LSO</Ltr> هر دو
      پارتیشن قفل شده. اتمیک بودن یعنی همین دو نوشتن فقط با هم{' '}
      <Ltr>commit</Ltr> یا با هم <Ltr>abort</Ltr> می‌شوند؛ هرگز یکی بدون
      دیگری.
    </>,
    {
      p1Rows: [
        ...BASE_P1,
        { offset: 88, key: 'ledger-88', kind: 'data', state: 'pending', txn: 1 },
      ],
      p1Lso: 88,
      p1Hw: 89,
      active: 'sendP1',
      phase: 'ارسال به p1',
    },
  )

  push(
    <>
      <Ltr>sendOffsetsToTransaction</Ltr> آفست ورودی را هم وارد تراکنش می‌کند:
      Producer یک <Ltr>AddOffsetsToTxn</Ltr> به{' '}
      <Ltr>Transaction Coordinator</Ltr> و یک <Ltr>TxnOffsetCommit</Ltr> به{' '}
      <Ltr>Group Coordinator</Ltr> گروه <Ltr>ledger-app</Ltr> می‌فرستد؛ آفست
      بعدی <Ltr>43</Ltr> برای <Ltr>payments/p0</Ltr> در{' '}
      <Ltr>__consumer_offsets</Ltr> به‌صورت <Ltr>pending</Ltr> ثبت می‌شود. این
      commit هنوز نهایی نیست؛ اگر تراکنش <Ltr>abort</Ltr> شود، آفست گروه روی{' '}
      <Ltr>42</Ltr> می‌ماند و رکورد ورودی دوباره پردازش می‌شود.
    </>,
    {
      stagedOffset: 43,
      active: 'offsets',
      phase: 'آفست ورودی',
    },
  )

  push(
    <>
      <Ltr>commitTransaction</Ltr> یک <Ltr>EndTxn(commit)</Ltr> می‌فرستد.
      Coordinator روی هر دو پارتیشن مارکر <Ltr>commit</Ltr> می‌نویسد (آفست‌های{' '}
      <Ltr>121</Ltr> و <Ltr>89</Ltr>)، <Ltr>LSO</Ltr> آزاد می‌شود و آفست{' '}
      <Ltr>43</Ltr> گروه هم‌زمان commit می‌شود. حالا <Ltr>read_committed</Ltr>{' '}
      رکوردهای <Ltr>120</Ltr> و <Ltr>88</Ltr> را می‌بیند و موقعیت مصرف‌کننده از{' '}
      <Ltr>42</Ltr> به <Ltr>43</Ltr> می‌رسد. همهٔ این‌ها یک واحد اتمیک است.
    </>,
    {
      p0Rows: [
        ...BASE_P0,
        { offset: 120, key: 'ledger-120', kind: 'data', state: 'committed', txn: 1 },
        { offset: 121, kind: 'commit-marker', state: 'committed', txn: 1 },
      ],
      p1Rows: [
        ...BASE_P1,
        { offset: 88, key: 'ledger-88', kind: 'data', state: 'committed', txn: 1 },
        { offset: 89, kind: 'commit-marker', state: 'committed', txn: 1 },
      ],
      p0Lso: 122,
      p0Hw: 122,
      p1Lso: 90,
      p1Hw: 90,
      committedOffset: 43,
      stagedOffset: null,
      txnState: 'committed',
      active: 'commit',
      phase: 'commit',
    },
  )

  push(
    <>
      سناریوی دوم: تراکنش بعدی شروع می‌شود و رکوردهای <Ltr>ledger-122</Ltr> در{' '}
      <Ltr>p0</Ltr> و <Ltr>ledger-90</Ltr> در <Ltr>p1</Ltr> را می‌نویسد، اما
      این بار پردازش خطا می‌دهد و آفست <Ltr>44</Ltr> هم فقط به‌صورت{' '}
      <Ltr>pending</Ltr> در نظر گرفته می‌شود. تا وقتی <Ltr>abort</Ltr> نشده،
      این رکوردها <Ltr>pending</Ltr> هستند و <Ltr>LSO</Ltr> دوباره قفل می‌شود.
    </>,
    {
      p0Rows: [
        ...state.p0Rows,
        { offset: 122, key: 'ledger-122', kind: 'data', state: 'pending', txn: 2 },
      ],
      p1Rows: [
        ...state.p1Rows,
        { offset: 90, key: 'ledger-90', kind: 'data', state: 'pending', txn: 2 },
      ],
      p0Lso: 122,
      p0Hw: 123,
      p1Lso: 90,
      p1Hw: 91,
      stagedOffset: 44,
      txnState: 'open',
      active: 'abortSend',
      phase: 'تراکنش دوم',
    },
  )

  push(
    <>
      <Ltr>abortTransaction</Ltr> یک <Ltr>EndTxn(abort)</Ltr> می‌فرستد و مارکر{' '}
      <Ltr>abort</Ltr> در آفست‌های <Ltr>123</Ltr> و <Ltr>91</Ltr> نوشته می‌شود.
      رکوردهای <Ltr>122</Ltr> و <Ltr>90</Ltr> برای همیشه <Ltr>aborted</Ltr>{' '}
      می‌مانند: <Ltr>read_committed</Ltr> آن‌ها را نادیده می‌گیرد و آفست گروه هم
      دست‌نخورده روی <Ltr>43</Ltr> می‌ماند. <Ltr>read_uncommitted</Ltr> اما
      آن‌ها را می‌بیند؛ دقیقاً همین‌جاست که تفاوت <Ltr>isolation.level</Ltr>{' '}
      مهم می‌شود.
    </>,
    {
      p0Rows: [
        ...state.p0Rows.map((row) =>
          row.offset === 122 ? { ...row, state: 'aborted' as const } : row,
        ),
        { offset: 123, kind: 'abort-marker', state: 'aborted', txn: 2 },
      ],
      p1Rows: [
        ...state.p1Rows.map((row) =>
          row.offset === 90 ? { ...row, state: 'aborted' as const } : row,
        ),
        { offset: 91, kind: 'abort-marker', state: 'aborted', txn: 2 },
      ],
      p0Lso: 124,
      p0Hw: 124,
      p1Lso: 92,
      p1Hw: 92,
      stagedOffset: null,
      txnState: 'aborted',
      active: 'abort',
      phase: 'abort',
    },
  )

  push(
    <>
      خطر اصلی: تراکنش سوم رکورد <Ltr>ledger-124</Ltr> را در <Ltr>p0</Ltr>{' '}
      می‌نویسد و باز می‌ماند (برنامه قبل از فرستادن <Ltr>EndTxn</Ltr> گیر کرده
      یا مرده). <Ltr>LSO</Ltr> روی <Ltr>124</Ltr> قفل می‌شود. حتی تراکنش
      دیگری که با <Ltr>Producer</Ltr> دوم (<Ltr>PID=9002</Ltr>) رکورد{' '}
      <Ltr>ledger-125</Ltr> را commit می‌کند (مارکر <Ltr>126</Ltr>) دیده
      نمی‌شود، چون <Ltr>read_committed</Ltr> نمی‌تواند از <Ltr>LSO</Ltr>{' '}
      جلوتر برود. یک تراکنش فراموش‌شده می‌تواند مصرف یک پارتیشن را متوقف کند.
    </>,
    {
      p0Rows: [
        ...state.p0Rows,
        { offset: 124, key: 'ledger-124', kind: 'data', state: 'pending', txn: 3 },
        { offset: 125, key: 'ledger-125', kind: 'data', state: 'committed', txn: 4 },
        { offset: 126, kind: 'commit-marker', state: 'committed', txn: 4 },
      ],
      p0Lso: 124,
      p0Hw: 127,
      txnState: 'open',
      active: 'lso',
      phase: 'LSO قفل‌شده',
    },
  )

  push(
    <>
      راه نجات: نمونهٔ جدید برنامه با همان <Ltr>transactional.id</Ltr> بالا
      می‌آید و <Ltr>initTransactions</Ltr> می‌زند. Coordinator{' '}
      <Ltr>epoch</Ltr> را به <Ltr>1</Ltr> می‌برد، نمونهٔ قدیمی را{' '}
      <Ltr>fence</Ltr> می‌کند و تراکنش بازش را <Ltr>abort</Ltr> می‌کند (مارکر{' '}
      <Ltr>127</Ltr>). <Ltr>LSO</Ltr> به <Ltr>128</Ltr> می‌رسد و{' '}
      <Ltr>read_committed</Ltr> حالا رکورد <Ltr>125</Ltr> را هم می‌بیند.
    </>,
    {
      p0Rows: [
        ...state.p0Rows.map((row) =>
          row.offset === 124 ? { ...row, state: 'aborted' as const } : row,
        ),
        { offset: 127, kind: 'abort-marker', state: 'aborted', txn: 3 },
      ],
      p0Lso: 128,
      p0Hw: 128,
      pid: 9001,
      epoch: 1,
      txnState: 'aborted',
      fenced: true,
      active: 'fence',
      phase: 'fencing',
    },
  )

  push(
    <>
      قانون: تراکنش، نوشتن روی چند پارتیشن و commit آفست ورودی را به یک واحد
      اتمیک تبدیل می‌کند. <Ltr>read_committed</Ltr> فقط دادهٔ تراکنش‌های
      commit‌شده را می‌بیند و <Ltr>LSO</Ltr> مرز آن است. برای{' '}
      <Ltr>exactly-once</Ltr> سرتاسری، <Ltr>Producer</Ltr> تراکنشی و مصرف‌کنندهٔ{' '}
      <Ltr>read_committed</Ltr> لازم است؛ و اگر مقصد بیرونی دارید، آن مقصد هم
      باید <Ltr>idempotent</Ltr> باشد.
    </>,
    {
      txnState: 'ready',
      active: 'rule',
      phase: 'قانون',
    },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

function activeOffsetsFor(active: ActiveStep): number[] {
  switch (active) {
    case 'sendP0':
      return [120]
    case 'sendP1':
      return [88]
    case 'commit':
      return [120, 121, 88, 89]
    case 'abortSend':
      return [122, 90]
    case 'abort':
      return [122, 123, 90, 91]
    case 'lso':
      return [124, 125, 126]
    case 'fence':
      return [124, 125, 127]
    default:
      return []
  }
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

function panelClass(active: boolean): string {
  return active
    ? 'fill-primary-50/40 stroke-primary-400 dark:fill-primary-950/25 dark:stroke-primary-700'
    : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
}

function rowTone(row: LogRow): 'emerald' | 'amber' | 'rose' {
  if (row.kind === 'commit-marker') return 'emerald'
  if (row.kind === 'abort-marker') return 'rose'
  if (row.state === 'pending') return 'amber'
  if (row.state === 'aborted') return 'rose'
  return 'emerald'
}

function rowRectClass(row: LogRow, active: boolean): string {
  const base = 'transition-colors duration-500 motion-reduce:transition-none'
  const tone = rowTone(row)
  if (active) {
    switch (tone) {
      case 'emerald':
        return `${base} fill-emerald-100 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-400`
      case 'amber':
        return `${base} fill-amber-100 stroke-amber-500 dark:fill-amber-950/60 dark:stroke-amber-400`
      default:
        return `${base} fill-rose-100 stroke-rose-500 dark:fill-rose-950/60 dark:stroke-rose-400`
    }
  }
  switch (tone) {
    case 'emerald':
      return `${base} fill-emerald-50/50 stroke-emerald-200 dark:fill-emerald-950/25 dark:stroke-emerald-900`
    case 'amber':
      return `${base} fill-amber-50/50 stroke-amber-200 dark:fill-amber-950/25 dark:stroke-amber-900`
    default:
      return `${base} fill-rose-50/50 stroke-rose-200 dark:fill-rose-950/25 dark:stroke-rose-900`
  }
}

function rowTextClass(row: LogRow, active: boolean): string {
  const tone = rowTone(row)
  return `font-mono ${toneTextClass(tone)}${active ? '' : ' opacity-70'}`
}

function txnStateLabel(state: TxnState): string {
  switch (state) {
    case 'ready':
      return 'ready (initialized)'
    case 'open':
      return 'open'
    case 'committed':
      return 'committed'
    case 'aborted':
      return 'aborted'
    default:
      return '— (not initialized)'
  }
}

function txnStateTone(state: TxnState): Tone {
  switch (state) {
    case 'ready':
    case 'committed':
      return 'emerald'
    case 'open':
      return 'amber'
    case 'aborted':
      return 'rose'
    default:
      return 'idle'
  }
}

function lastCallFor(active: ActiveStep): string {
  switch (active) {
    case 'init':
    case 'fence':
      return 'initTransactions()'
    case 'begin':
      return 'beginTransaction()'
    case 'sendP0':
      return 'send(ledger, p0)'
    case 'sendP1':
      return 'send(ledger, p1)'
    case 'offsets':
      return 'sendOffsetsToTransaction()'
    case 'commit':
      return 'commitTransaction()'
    case 'abortSend':
      return 'send(ledger, p0/p1)'
    case 'abort':
      return 'abortTransaction()'
    case 'lso':
      return 'send(ledger, p0)'
    default:
      return '—'
  }
}

function producerStatusFor(snapshot: SnapshotState): {
  label: string
  tone: Tone
} {
  switch (snapshot.active) {
    case 'start':
      return { label: 'idle · no PID yet', tone: 'idle' }
    case 'init':
      return { label: 'initialized · PID 9001 · epoch 0', tone: 'emerald' }
    case 'begin':
      return { label: 'transaction open', tone: 'primary' }
    case 'sendP0':
      return { label: 'open · 1 pending partition', tone: 'amber' }
    case 'sendP1':
      return { label: 'open · 2 pending partitions', tone: 'amber' }
    case 'offsets':
      return { label: 'open · input offset staged', tone: 'amber' }
    case 'commit':
      return { label: 'committed · atomic', tone: 'emerald' }
    case 'abortSend':
      return { label: 'open · 2 pending records', tone: 'amber' }
    case 'abort':
      return { label: 'aborted · nothing applied', tone: 'rose' }
    case 'lso':
      return { label: 'open · LSO pinned at 124', tone: 'amber' }
    case 'fence':
      return { label: 'fenced old epoch · txn aborted', tone: 'emerald' }
    default:
      return { label: 'transactional · exactly-once path', tone: 'emerald' }
  }
}

function coordinatorLine(snapshot: SnapshotState): {
  label: string
  tone: Tone
} {
  switch (snapshot.active) {
    case 'start':
      return { label: 'txn state: — (no transactional.id registered)', tone: 'idle' }
    case 'init':
      return { label: 'InitProducerId → PID 9001 · epoch 0', tone: 'emerald' }
    case 'begin':
      return { label: 'txn open · no records yet', tone: 'primary' }
    case 'sendP0':
      return { label: 'txn open · 1 pending partition', tone: 'amber' }
    case 'sendP1':
      return { label: 'txn open · 2 pending partitions', tone: 'amber' }
    case 'offsets':
      return { label: 'AddOffsetsToTxn registered · group ledger-app', tone: 'amber' }
    case 'commit':
      return { label: 'EndTxn(commit) → 2 commit markers · offset 43 applied', tone: 'emerald' }
    case 'abortSend':
      return { label: 'txn open · 2 pending records · offset 44 staged', tone: 'amber' }
    case 'abort':
      return { label: 'EndTxn(abort) → 2 abort markers · offset stays 43', tone: 'rose' }
    case 'lso':
      return {
        label: 'txn3 open · LSO pinned · txn4 (PID 9002) committed behind it',
        tone: 'amber',
      }
    case 'fence':
      return { label: 'epoch 1 · txn3 aborted by coordinator', tone: 'emerald' }
    default:
      return { label: 'atomic: records + offsets or nothing', tone: 'emerald' }
  }
}

function groupCoordinatorLine(snapshot: SnapshotState): {
  label: string
  detail: string
  tone: Tone
} {
  switch (snapshot.active) {
    case 'offsets':
      return {
        label: 'pending offset commit · payments/p0 → 43',
        detail: 'stored as pending in __consumer_offsets',
        tone: 'amber',
      }
    case 'commit':
      return {
        label: 'offset 43 committed atomically',
        detail: 'materialized together with the txn commit',
        tone: 'emerald',
      }
    case 'abortSend':
      return {
        label: 'pending offset commit · payments/p0 → 44',
        detail: 'staged with txn2 in __consumer_offsets',
        tone: 'amber',
      }
    case 'abort':
      return {
        label: 'offset 43 unchanged · pending 44 discarded',
        detail: 'abort rolled back the offset too',
        tone: 'rose',
      }
    case 'lso':
    case 'fence':
      return {
        label: 'offset 43 committed · no pending commit',
        detail: 'group offset stable across the open txn',
        tone: 'emerald',
      }
    case 'rule':
      return {
        label: 'records + offsets commit together',
        detail: 'one atomic unit, or nothing at all',
        tone: 'emerald',
      }
    default:
      return {
        label: `no pending offset commit · group offset ${snapshot.committedOffset}`,
        detail: 'offsets are written only inside a transaction',
        tone: 'idle',
      }
  }
}

function formatOffsets(offsets: number[]): string {
  return offsets.length > 0 ? offsets.join(', ') : '—'
}

export function TransactionExplainer() {
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

  const activeOffsets = activeOffsetsFor(snapshot.active)
  const producerActive = PRODUCER_ACTIVE.includes(snapshot.active)
  const brokerActive = BROKER_ACTIVE.includes(snapshot.active)
  const rcActive = RC_ACTIVE.includes(snapshot.active)
  const ruActive = RU_ACTIVE.includes(snapshot.active)
  const producerStatus = producerStatusFor(snapshot)
  const coordinator = coordinatorLine(snapshot)
  const groupCoordinator = groupCoordinatorLine(snapshot)

  const committedP0 = snapshot.p0Rows
    .filter(
      (row) =>
        row.kind === 'data' &&
        row.state === 'committed' &&
        row.offset < snapshot.p0Lso,
    )
    .map((row) => row.offset)
  const committedP1 = snapshot.p1Rows
    .filter(
      (row) =>
        row.kind === 'data' &&
        row.state === 'committed' &&
        row.offset < snapshot.p1Lso,
    )
    .map((row) => row.offset)
  const allP0 = snapshot.p0Rows
    .filter((row) => row.kind === 'data')
    .map((row) => row.offset)
  const allP1 = snapshot.p1Rows
    .filter((row) => row.kind === 'data')
    .map((row) => row.offset)
  const consumerBlocked = snapshot.p0Lso < snapshot.p0Hw
  const p1Blocked = snapshot.p1Lso < snapshot.p1Hw

  function renderRows(rows: LogRow[], startY: number) {
    return rows.map((row, index) => {
      const y = startY + index * 17
      const active = activeOffsets.includes(row.offset)
      const isMarker = row.kind !== 'data'
      return (
        <g key={`${row.offset}-${row.kind}`}>
          <rect
            x={364}
            y={y}
            width={282}
            height={15}
            rx={4}
            strokeWidth={active ? 2 : 1}
            strokeDasharray={isMarker ? '4 2' : undefined}
            className={rowRectClass(row, active)}
          />
          <text
            x={376}
            y={y + 11}
            fontSize={7.5}
            fontWeight={700}
            className={rowTextClass(row, active)}
          >
            {`offset ${row.offset}`}
          </text>
          <text
            x={462}
            y={y + 11}
            fontSize={7.5}
            className={rowTextClass(row, active)}
          >
            {row.kind === 'data'
              ? row.key
              : row.kind === 'commit-marker'
                ? `commit marker · txn ${row.txn}`
                : `abort marker · txn ${row.txn}`}
          </text>
          <text
            x={634}
            y={y + 11}
            textAnchor="end"
            fontSize={7}
            className={rowTextClass(row, active)}
          >
            {row.kind === 'data' ? row.state : 'marker'}
          </text>
        </g>
      )
    })
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            تراکنش چطور چند نوشتن و آفست ورودی را یک واحد اتمیک می‌کند؟
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
        {
          'payments/p0 → ledger/p0 + ledger/p1 · transactional.id=ledger-app-1 · acks=all · isolation.level=read_committed'
        }
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
          viewBox="0 0 1000 720"
          role="img"
          aria-label="نمودار Producer تراکنشی، Transaction Coordinator و Group Coordinator، لاگ دو پارتیشن ledger با مارکرهای commit و abort، و مقایسهٔ دادهٔ قابل مشاهده برای مصرف‌کنندهٔ read_committed و read_uncommitted"
          className="h-auto w-full min-w-[820px]"
        >
          <defs>
            <marker
              id="txn-arrow"
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
              id="txn-arrow-active"
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
            x={346}
            y={20}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-900 dark:fill-slate-100"
          >
            Broker
          </text>
          <text
            x={706}
            y={20}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-900 dark:fill-slate-100"
          >
            Consumers
          </text>

          {/* Producer panel */}
          <rect
            x={10}
            y={30}
            width={270}
            height={280}
            rx={10}
            strokeWidth={1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${panelClass(
              producerActive,
            )}`}
          />
          <text
            x={24}
            y={52}
            fontSize={10.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            transactional producer
          </text>
          <text
            x={24}
            y={72}
            fontSize={8}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            transactional.id=ledger-app-1
          </text>
          <text
            x={24}
            y={90}
            fontSize={8.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            {`PID=${snapshot.pid ?? '—'} · epoch=${snapshot.epoch ?? '—'}`}
          </text>
          <text
            x={24}
            y={110}
            fontSize={9}
            fontWeight={700}
            className={toneTextClass(txnStateTone(snapshot.txnState))}
          >
            {`txn state: ${txnStateLabel(snapshot.txnState)}`}
          </text>
          <text
            x={24}
            y={130}
            fontSize={8}
            className={
              snapshot.stagedOffset === null
                ? 'fill-slate-400 font-mono dark:fill-slate-500'
                : 'fill-amber-700 font-mono dark:fill-amber-300'
            }
          >
            {`staged input offset: ${snapshot.stagedOffset ?? '—'}`}
          </text>
          <text
            x={24}
            y={150}
            fontSize={8}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`last call: ${lastCallFor(snapshot.active)}`}
          </text>
          <text
            x={24}
            y={178}
            fontSize={9}
            fontWeight={700}
            className={toneTextClass(producerStatus.tone)}
          >
            {producerStatus.label}
          </text>
          <text
            x={24}
            y={202}
            fontSize={7.5}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            acks=all · enable.idempotence=true
          </text>
          <text
            x={24}
            y={220}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            max.in.flight=5 · retries&gt;0
          </text>
          <text
            x={24}
            y={238}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            transaction.timeout.ms=60000
          </text>
          <text
            x={24}
            y={262}
            fontSize={8}
            className={
              snapshot.fenced
                ? 'fill-amber-700 font-mono dark:fill-amber-300'
                : 'fill-slate-400 font-mono dark:fill-slate-500'
            }
          >
            {snapshot.fenced
              ? 'old session fenced · epoch bumped'
              : 'session: stable'}
          </text>
          <text
            x={24}
            y={284}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.committedOffset === 43
              ? 'group offset: 42 → 43 (atomic)'
              : 'group offset: 42'}
          </text>

          {/* Producer → group coordinator arrow (offsets) */}
          <polyline
            points="280,120 290,120 290,650 352,650"
            fill="none"
            strokeWidth={
              snapshot.active === 'offsets' ||
              snapshot.active === 'commit' ||
              snapshot.active === 'abort'
                ? 2.5
                : 1.2
            }
            strokeDasharray="5 4"
            markerEnd={
              snapshot.active === 'offsets' ||
              snapshot.active === 'commit' ||
              snapshot.active === 'abort'
                ? 'url(#txn-arrow-active)'
                : 'url(#txn-arrow)'
            }
            className={
              snapshot.active === 'offsets' ||
              snapshot.active === 'commit' ||
              snapshot.active === 'abort'
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-slate-400 dark:stroke-slate-500'
            }
          />
          <text
            x={294}
            y={112}
            fontSize={6.5}
            className={
              snapshot.active === 'offsets' ||
              snapshot.active === 'commit' ||
              snapshot.active === 'abort'
                ? 'fill-primary-700 font-mono dark:fill-primary-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            AddOffsets
          </text>

          {/* Producer → ledger p0 arrow */}
          <line
            x1={280}
            y1={170}
            x2={352}
            y2={210}
            strokeWidth={
              snapshot.active === 'sendP0' || snapshot.active === 'commit' ? 2.5 : 1.2
            }
            strokeDasharray="5 4"
            markerEnd={
              snapshot.active === 'sendP0' || snapshot.active === 'commit'
                ? 'url(#txn-arrow-active)'
                : 'url(#txn-arrow)'
            }
            className={
              snapshot.active === 'sendP0' || snapshot.active === 'commit'
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-slate-400 dark:stroke-slate-500'
            }
          />
          <text
            x={316}
            y={182}
            textAnchor="middle"
            fontSize={7}
            className={
              snapshot.active === 'sendP0' || snapshot.active === 'commit'
                ? 'fill-primary-700 font-mono dark:fill-primary-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            Produce p0
          </text>

          {/* Producer → ledger p1 arrow */}
          <polyline
            points="280,240 320,240 320,440 352,440"
            fill="none"
            strokeWidth={
              snapshot.active === 'sendP1' || snapshot.active === 'commit' ? 2.5 : 1.2
            }
            strokeDasharray="5 4"
            markerEnd={
              snapshot.active === 'sendP1' || snapshot.active === 'commit'
                ? 'url(#txn-arrow-active)'
                : 'url(#txn-arrow)'
            }
            className={
              snapshot.active === 'sendP1' || snapshot.active === 'commit'
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-slate-400 dark:stroke-slate-500'
            }
          />
          <text
            x={286}
            y={360}
            textAnchor="end"
            fontSize={7}
            className={
              snapshot.active === 'sendP1' || snapshot.active === 'commit'
                ? 'fill-primary-700 font-mono dark:fill-primary-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            Produce p1
          </text>

          {/* Producer → coordinator arrow */}
          <polyline
            points="280,290 330,290 330,580 352,580"
            fill="none"
            strokeWidth={
              snapshot.active === 'init' ||
              snapshot.active === 'begin' ||
              snapshot.active === 'commit' ||
              snapshot.active === 'abort' ||
              snapshot.active === 'fence'
                ? 2.5
                : 1.2
            }
            strokeDasharray="5 4"
            markerEnd={
              snapshot.active === 'init' ||
              snapshot.active === 'begin' ||
              snapshot.active === 'commit' ||
              snapshot.active === 'abort' ||
              snapshot.active === 'fence'
                ? 'url(#txn-arrow-active)'
                : 'url(#txn-arrow)'
            }
            className={
              snapshot.active === 'init' ||
              snapshot.active === 'begin' ||
              snapshot.active === 'commit' ||
              snapshot.active === 'abort' ||
              snapshot.active === 'fence'
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-slate-400 dark:stroke-slate-500'
            }
          />
          <text
            x={286}
            y={596}
            textAnchor="end"
            fontSize={7}
            className={
              snapshot.active === 'commit' || snapshot.active === 'abort'
                ? 'fill-primary-700 font-mono dark:fill-primary-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            EndTxn
          </text>

          {/* Broker panel */}
          <rect
            x={340}
            y={30}
            width={330}
            height={660}
            rx={10}
            strokeWidth={1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${panelClass(
              brokerActive,
            )}`}
          />

          {/* payments p0 log */}
          <rect
            x={352}
            y={62}
            width={306}
            height={92}
            rx={8}
            strokeWidth={1}
            className="fill-slate-50/70 stroke-slate-200 dark:fill-slate-950/30 dark:stroke-slate-800"
          />
          <text
            x={364}
            y={78}
            fontSize={8.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            payments / p0 · input
          </text>
          {[
            { offset: 42, key: 'payment-42' },
            { offset: 43, key: 'payment-43' },
          ].map((row, index) => {
            const y = 86 + index * 18
            const isCommitted = row.offset < snapshot.committedOffset
            const isNext = row.offset === snapshot.committedOffset
            return (
              <g key={`payment-${row.offset}`}>
                <rect
                  x={364}
                  y={y}
                  width={282}
                  height={16}
                  rx={4}
                  strokeWidth={1}
                  className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800"
                />
                <text
                  x={376}
                  y={y + 11}
                  fontSize={7.5}
                  fontWeight={700}
                  className="fill-slate-700 font-mono dark:fill-slate-300"
                >
                  {`offset ${row.offset}`}
                </text>
                <text
                  x={462}
                  y={y + 11}
                  fontSize={7.5}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  {row.key}
                </text>
                <text
                  x={634}
                  y={y + 11}
                  textAnchor="end"
                  fontSize={7}
                  className={
                    isCommitted
                      ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                      : 'fill-slate-400 font-mono dark:fill-slate-500'
                  }
                >
                  {isCommitted ? 'consumed' : isNext ? 'next' : 'unread'}
                </text>
              </g>
            )
          })}
          <text
            x={364}
            y={140}
            fontSize={7.5}
            className={
              snapshot.active === 'offsets' || snapshot.active === 'commit'
                ? 'fill-primary-700 font-mono dark:fill-primary-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            {`group committed offset: ${snapshot.committedOffset}`}
          </text>

          {/* ledger p0 log */}
          <rect
            x={352}
            y={164}
            width={306}
            height={222}
            rx={8}
            strokeWidth={1}
            className="fill-slate-50/70 stroke-slate-200 dark:fill-slate-950/30 dark:stroke-slate-800"
          />
          <text
            x={364}
            y={180}
            fontSize={8.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            ledger / p0 · output
          </text>
          <text
            x={646}
            y={180}
            textAnchor="end"
            fontSize={7.5}
            className={
              consumerBlocked
                ? 'fill-amber-700 font-mono dark:fill-amber-300'
                : 'fill-emerald-700 font-mono dark:fill-emerald-300'
            }
          >
            {`LSO=${snapshot.p0Lso} · HW=${snapshot.p0Hw}`}
          </text>
          {renderRows(snapshot.p0Rows, 188)}

          {/* ledger p1 log */}
          <rect
            x={352}
            y={396}
            width={306}
            height={150}
            rx={8}
            strokeWidth={1}
            className="fill-slate-50/70 stroke-slate-200 dark:fill-slate-950/30 dark:stroke-slate-800"
          />
          <text
            x={364}
            y={412}
            fontSize={8.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            ledger / p1 · output
          </text>
          <text
            x={646}
            y={412}
            textAnchor="end"
            fontSize={7.5}
            className={
              p1Blocked
                ? 'fill-amber-700 font-mono dark:fill-amber-300'
                : 'fill-emerald-700 font-mono dark:fill-emerald-300'
            }
          >
            {`LSO=${snapshot.p1Lso} · HW=${snapshot.p1Hw}`}
          </text>
          {renderRows(snapshot.p1Rows, 420)}

          {/* Transaction coordinator */}
          <rect
            x={352}
            y={556}
            width={306}
            height={54}
            rx={8}
            strokeWidth={1}
            className={
              snapshot.active === 'init' ||
              snapshot.active === 'begin' ||
              snapshot.active === 'offsets' ||
              snapshot.active === 'commit' ||
              snapshot.active === 'abort' ||
              snapshot.active === 'fence'
                ? 'fill-primary-50/60 stroke-primary-400 dark:fill-primary-950/25 dark:stroke-primary-700'
                : 'fill-slate-50/70 stroke-slate-200 dark:fill-slate-950/30 dark:stroke-slate-800'
            }
          />
          <text
            x={364}
            y={572}
            fontSize={8.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            Transaction Coordinator · __transaction_state
          </text>
          <text
            x={364}
            y={590}
            fontSize={7.5}
            className={toneTextClass(coordinator.tone)}
          >
            {coordinator.label}
          </text>
          <text
            x={364}
            y={603}
            fontSize={7}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`txn id: ledger-app-1 · PID ${snapshot.pid ?? '—'} · epoch ${snapshot.epoch ?? '—'}`}
          </text>

          {/* Group coordinator · offsets */}
          <rect
            x={352}
            y={620}
            width={306}
            height={62}
            rx={8}
            strokeWidth={1}
            className={
              snapshot.active === 'offsets' ||
              snapshot.active === 'commit' ||
              snapshot.active === 'abort'
                ? 'fill-primary-50/60 stroke-primary-400 dark:fill-primary-950/25 dark:stroke-primary-700'
                : 'fill-slate-50/70 stroke-slate-200 dark:fill-slate-950/30 dark:stroke-slate-800'
            }
          />
          <text
            x={364}
            y={636}
            fontSize={8.5}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            Group Coordinator · __consumer_offsets
          </text>
          <text
            x={364}
            y={654}
            fontSize={7.5}
            className={toneTextClass(groupCoordinator.tone)}
          >
            {groupCoordinator.label}
          </text>
          <text
            x={364}
            y={668}
            fontSize={7}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {groupCoordinator.detail}
          </text>

          {/* Broker → read_committed arrow */}
          <line
            x1={670}
            y1={190}
            x2={712}
            y2={190}
            strokeWidth={rcActive ? 2.5 : 1.2}
            strokeDasharray="5 4"
            markerEnd={rcActive ? 'url(#txn-arrow-active)' : 'url(#txn-arrow)'}
            className={
              rcActive
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-slate-400 dark:stroke-slate-500'
            }
          />
          <text
            x={691}
            y={182}
            textAnchor="middle"
            fontSize={7}
            className={
              rcActive
                ? 'fill-primary-700 font-mono dark:fill-primary-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            Fetch
          </text>

          {/* Broker → read_uncommitted arrow */}
          <line
            x1={670}
            y1={450}
            x2={712}
            y2={450}
            strokeWidth={ruActive ? 2.5 : 1.2}
            strokeDasharray="5 4"
            markerEnd={ruActive ? 'url(#txn-arrow-active)' : 'url(#txn-arrow)'}
            className={
              ruActive
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-slate-400 dark:stroke-slate-500'
            }
          />
          <text
            x={691}
            y={442}
            textAnchor="middle"
            fontSize={7}
            className={
              ruActive
                ? 'fill-primary-700 font-mono dark:fill-primary-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            Fetch
          </text>

          {/* Consumer read_committed panel */}
          <rect
            x={700}
            y={30}
            width={290}
            height={660}
            rx={10}
            strokeWidth={1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${panelClass(
              rcActive,
            )}`}
          />
          <rect
            x={712}
            y={62}
            width={266}
            height={270}
            rx={8}
            strokeWidth={1}
            className={
              rcActive
                ? 'fill-emerald-50/40 stroke-emerald-300 dark:fill-emerald-950/20 dark:stroke-emerald-800'
                : 'fill-slate-50/70 stroke-slate-200 dark:fill-slate-950/30 dark:stroke-slate-800'
            }
          />
          <text
            x={724}
            y={80}
            fontSize={9}
            fontWeight={700}
            className="fill-emerald-800 dark:fill-emerald-200"
          >
            Consumer A · read_committed
          </text>
          <text
            x={724}
            y={98}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            group=ledger-app · isolation.level=read_committed
          </text>
          <text
            x={724}
            y={116}
            fontSize={7.5}
            className="fill-slate-600 font-mono dark:fill-slate-300"
          >
            {`group committed offset: ${snapshot.committedOffset}`}
          </text>
          <line
            x1={724}
            y1={126}
            x2={966}
            y2={126}
            strokeWidth={1}
            className="stroke-slate-200 dark:stroke-slate-800"
          />
          <text
            x={724}
            y={146}
            fontSize={7.5}
            fontWeight={700}
            className="fill-slate-600 dark:fill-slate-300"
          >
            ledger/p0 visible
          </text>
          <text
            x={724}
            y={162}
            fontSize={8}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            {formatOffsets(committedP0)}
          </text>
          <text
            x={724}
            y={184}
            fontSize={7.5}
            fontWeight={700}
            className="fill-slate-600 dark:fill-slate-300"
          >
            ledger/p1 visible
          </text>
          <text
            x={724}
            y={200}
            fontSize={8}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            {formatOffsets(committedP1)}
          </text>
          <text
            x={724}
            y={226}
            fontSize={7.5}
            className={
              consumerBlocked
                ? 'fill-amber-700 font-mono dark:fill-amber-300'
                : 'fill-emerald-700 font-mono dark:fill-emerald-300'
            }
          >
            {consumerBlocked
              ? `position ≤ LSO p0 = ${snapshot.p0Lso} · blocked`
              : `position ≤ LSO p0 = ${snapshot.p0Lso} · free`}
          </text>
          <text
            x={724}
            y={250}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            pending & aborted records skipped
          </text>
          <text
            x={724}
            y={270}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            markers are not returned to the app
          </text>
          <text
            x={724}
            y={300}
            fontSize={7.5}
            fontWeight={700}
            className="fill-emerald-700 dark:fill-emerald-300"
          >
            only committed transactions
          </text>

          {/* Consumer read_uncommitted panel */}
          <rect
            x={712}
            y={342}
            width={266}
            height={340}
            rx={8}
            strokeWidth={1}
            className={
              ruActive
                ? 'fill-amber-50/40 stroke-amber-300 dark:fill-amber-950/20 dark:stroke-amber-800'
                : 'fill-slate-50/70 stroke-slate-200 dark:fill-slate-950/30 dark:stroke-slate-800'
            }
          />
          <text
            x={724}
            y={360}
            fontSize={9}
            fontWeight={700}
            className="fill-amber-800 dark:fill-amber-200"
          >
            Consumer B · read_uncommitted
          </text>
          <text
            x={724}
            y={378}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            same data · isolation.level=read_uncommitted
          </text>
          <text
            x={724}
            y={398}
            fontSize={7.5}
            fontWeight={700}
            className="fill-slate-600 dark:fill-slate-300"
          >
            ledger/p0 (all data records)
          </text>
          <text
            x={724}
            y={414}
            fontSize={8}
            className="fill-amber-700 font-mono dark:fill-amber-300"
          >
            {formatOffsets(allP0)}
          </text>
          <text
            x={724}
            y={436}
            fontSize={7.5}
            fontWeight={700}
            className="fill-slate-600 dark:fill-slate-300"
          >
            ledger/p1 (all data records)
          </text>
          <text
            x={724}
            y={452}
            fontSize={8}
            className="fill-amber-700 font-mono dark:fill-amber-300"
          >
            {formatOffsets(allP1)}
          </text>
          <text
            x={724}
            y={478}
            fontSize={7.5}
            className="fill-amber-700 font-mono dark:fill-amber-300"
          >
            pending & aborted records visible
          </text>
          <text
            x={724}
            y={500}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            may read data that is later rolled back
          </text>
          <text
            x={724}
            y={526}
            fontSize={7.5}
            fontWeight={700}
            className="fill-amber-700 dark:fill-amber-300"
          >
            not safe for exactly-once
          </text>
          <text
            x={724}
            y={552}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`ledger/p0 LSO=${snapshot.p0Lso} · HW=${snapshot.p0Hw}`}
          </text>
          <text
            x={724}
            y={572}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`ledger/p1 LSO=${snapshot.p1Lso} · HW=${snapshot.p1Hw}`}
          </text>
          <line
            x1={724}
            y1={590}
            x2={966}
            y2={590}
            strokeWidth={1}
            className="stroke-slate-200 dark:stroke-slate-800"
          />
          <text
            x={724}
            y={610}
            fontSize={7.5}
            fontWeight={700}
            className="fill-slate-600 dark:fill-slate-300"
          >
            same log · different isolation.level
          </text>
          <text
            x={724}
            y={630}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            aborted data stays in the log until retention
          </text>
          <text
            x={724}
            y={650}
            fontSize={7.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            read_committed never returns it
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط چند رکورد و دو پارتیشن نمایش داده شده و مارکرهای{' '}
        <Ltr>commit</Ltr> و <Ltr>abort</Ltr> هر کدام یک آفست جدا گرفته‌اند (در
        Kafka واقعی هم همین‌طور است). منطق همان است که Kafka اجرا می‌کند:{' '}
        <Ltr>initTransactions</Ltr> یک <Ltr>PID</Ltr> پایدار می‌سازد،{' '}
        <Ltr>commitTransaction</Ltr> مارکرها را در همهٔ پارتیشن‌ها می‌نویسد،{' '}
        <Ltr>LSO</Ltr> مرز دید <Ltr>read_committed</Ltr> است و{' '}
        <Ltr>sendOffsetsToTransaction</Ltr> آفست ورودی را در همان تراکنش
        commit می‌کند.
      </p>
    </div>
  )
}
