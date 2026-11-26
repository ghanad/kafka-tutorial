import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

interface BrokerState {
  id: number
  alive: boolean
  inIsr: boolean
  leo: number
}

type RequestStatus = 'ok' | 'blocked' | 'none'

interface SnapshotState {
  brokers: BrokerState[]
  minInsync: number
  request: RequestStatus
  requestNote: string
  committedCopies: number
  lost: boolean
  activeBroker: number | null
  counterfactual: boolean
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const CARD_X = [40, 330, 620]
const CARD_W = 240
const CARD_Y = 96
const CARD_H = 92

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    brokers: [
      { id: 1, alive: true, inIsr: true, leo: 13 },
      { id: 2, alive: true, inIsr: true, leo: 13 },
      { id: 3, alive: true, inIsr: true, leo: 13 },
    ],
    minInsync: 2,
    request: 'ok',
    requestNote: '3/3 ack',
    committedCopies: 3,
    lost: false,
    activeBroker: null,
    counterfactual: false,
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      وضعیت شروع: <Ltr>RF=3</Ltr>، <Ltr>acks=all</Ltr> و{' '}
      <Ltr>min.insync.replicas=2</Ltr>. هر سه بروکر در <Ltr>ISR</Ltr> هستند، پس
      هر رکورد commitشده سه کپی دارد. بودجه خرابی برای ادامه نوشتن:{' '}
      <Ltr>RF - min.insync = 3 - 2 = 1</Ltr> بروکر.
    </>,
  )

  push(
    <>
      بروکر ۳ از کار افتاد: <Ltr>ISR = {'{1,2}'}</Ltr>. اندازه <Ltr>ISR</Ltr>{' '}
      هنوز <Ltr>2 ≥ min.insync</Ltr> است، پس نوشتن با <Ltr>acks=all</Ltr> ادامه
      دارد و پرودیوسر تأیید <Ltr>2/2</Ltr> می‌گیرد. داده commitشده دو کپی دارد.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 13 },
        { id: 2, alive: true, inIsr: true, leo: 13 },
        { id: 3, alive: false, inIsr: false, leo: 13 },
      ],
      requestNote: '2/2 ack',
      committedCopies: 2,
      activeBroker: 3,
    },
  )

  push(
    <>
      بروکر ۲ هم از کار افتاد: <Ltr>ISR = {'{1}'}</Ltr> و{' '}
      <Ltr>|ISR| = 1 &lt; min.insync = 2</Ltr>. لیدر درخواست را با{' '}
      <Ltr>NOT_ENOUGH_REPLICAS</Ltr> رد می‌کند. هیچ رکورد جدیدی نوشته نمی‌شود،
      اما داده قبلی از دست نمی‌رود؛ فقط یک کپی دارد.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 13 },
        { id: 2, alive: false, inIsr: false, leo: 13 },
        { id: 3, alive: false, inIsr: false, leo: 13 },
      ],
      request: 'blocked',
      requestNote: 'ISR=1 < min.insync=2',
      committedCopies: 1,
      activeBroker: 2,
    },
  )

  push(
    <>
      بروکر ۳ برگشت و از لیدر کپی گرفت: <Ltr>ISR = {'{1,3}'}</Ltr>. حالا{' '}
      <Ltr>|ISR| = 2</Ltr> است و نوشتن دوباره ممکن می‌شود؛ پرودیوسر تأیید{' '}
      <Ltr>2/2</Ltr> می‌گیرد. داده commitشده دوباره دو کپی دارد.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 13 },
        { id: 2, alive: false, inIsr: false, leo: 13 },
        { id: 3, alive: true, inIsr: true, leo: 13 },
      ],
      request: 'ok',
      requestNote: '2/2 ack',
      committedCopies: 2,
      activeBroker: 3,
    },
  )

  push(
    <>
      بروکر ۲ هم برگشت: <Ltr>ISR = {'{1,2,3}'}</Ltr>. حاشیه امنیت کامل شد و هر
      رکورد commitشده سه کپی دارد. قانون: با <Ltr>acks=all</Ltr>، تا وقتی{' '}
      <Ltr>|ISR| ≥ min.insync.replicas</Ltr> باشد نوشتن ادامه دارد.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 13 },
        { id: 2, alive: true, inIsr: true, leo: 13 },
        { id: 3, alive: true, inIsr: true, leo: 13 },
      ],
      requestNote: '3/3 ack',
      committedCopies: 3,
      activeBroker: 2,
    },
  )

  push(
    <>
      <span className="font-bold">فرض جایگزین:</span> همین سناریو با{' '}
      <Ltr>min.insync.replicas=1</Ltr>. با مرگ بروکر ۳، <Ltr>ISR = {'{1,2}'}</Ltr>{' '}
      است و نوشتن ادامه دارد. رکوردهای جدید دو کپی دارند، اما بودجه خرابی برای
      ادامه نوشتن حالا <Ltr>3 - 1 = 2</Ltr> بروکر است.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 13 },
        { id: 2, alive: true, inIsr: true, leo: 13 },
        { id: 3, alive: false, inIsr: false, leo: 13 },
      ],
      minInsync: 1,
      request: 'ok',
      requestNote: '2/2 ack',
      committedCopies: 2,
      activeBroker: 3,
      counterfactual: true,
    },
  )

  push(
    <>
      بروکر ۲ هم رفت: <Ltr>ISR = {'{1}'}</Ltr>. چون{' '}
      <Ltr>min.insync.replicas=1</Ltr> است، لیدر بدون هیچ فالووری تأیید می‌کند:{' '}
      <Ltr>1/1 ack</Ltr>. رکوردهای جدید فقط یک کپی دارند و «commitشده» بودنشان
      به بقای همین یک بروکر بند است.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 13 },
        { id: 2, alive: false, inIsr: false, leo: 13 },
        { id: 3, alive: false, inIsr: false, leo: 13 },
      ],
      request: 'ok',
      requestNote: '1/1 ack',
      committedCopies: 1,
      activeBroker: 2,
      counterfactual: true,
    },
  )

  push(
    <>
      لیدر (بروکر ۱) هم از کار افتاد و هیچ نسخه‌ای در <Ltr>ISR</Ltr> نماند. با{' '}
      <Ltr>unclean.leader.election.enable=true</Ltr> بروکر ۳ که{' '}
      <Ltr>LEO = 10</Ltr> دارد لیدر می‌شود و رکوردهای{' '}
      <Ltr>offset 10..12</Ltr> که تأیید شده بودند از بین می‌روند. این بهای{' '}
      <Ltr>min.insync.replicas=1</Ltr> است.
    </>,
    {
      brokers: [
        { id: 1, alive: false, inIsr: false, leo: 13 },
        { id: 2, alive: false, inIsr: false, leo: 13 },
        { id: 3, alive: true, inIsr: true, leo: 10 },
      ],
      request: 'none',
      requestNote: 'no leader until election',
      committedCopies: 0,
      lost: true,
      activeBroker: 1,
      counterfactual: true,
    },
  )

  push(
    <>
      قانون کلی: با <Ltr>acks=all</Ltr>، <Ltr>min.insync.replicas</Ltr> هم
      بودجه خرابی برای نوشتن را تعیین می‌کند (<Ltr>RF - min.insync</Ltr> بروکر)
      و هم حداقل تعداد کپی داده commitشده را. مقدار ۲ یعنی تحمل یک خرابی بدون
      توقف نوشتن و بدون از دست رفتن داده؛ مقدار ۱ یعنی نوشتن پایدارتر است اما
      داده تأییدشده می‌تواند با مرگ لیدر از بین برود.
    </>,
    {
      request: 'none',
      requestNote: 'rule',
      lost: false,
      activeBroker: null,
    },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

function brokerClass(broker: BrokerState, active: boolean): string {
  if (!broker.alive) {
    return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/40 dark:stroke-rose-700'
  }
  if (broker.inIsr) {
    return active
      ? 'fill-emerald-100 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
      : 'fill-emerald-50 stroke-emerald-300 dark:fill-emerald-950/40 dark:stroke-emerald-700'
  }
  return 'fill-amber-50 stroke-amber-300 dark:fill-amber-950/40 dark:stroke-amber-700'
}

function requestBoxClass(status: RequestStatus): string {
  if (status === 'ok') {
    return 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/40 dark:stroke-emerald-700'
  }
  if (status === 'blocked') {
    return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/40 dark:stroke-rose-700'
  }
  return 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700'
}

function requestTextClass(status: RequestStatus): string {
  if (status === 'ok') return 'fill-emerald-700 dark:fill-emerald-300'
  if (status === 'blocked') return 'fill-rose-700 dark:fill-rose-300'
  return 'fill-slate-500 dark:fill-slate-400'
}

export function FailureBudgetExplainer() {
  const [step, setStep] = useState(0)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const isrCount = snapshot.brokers.filter((broker) => broker.inIsr).length
  const canWrite = isrCount >= snapshot.minInsync
  const budget = 3 - snapshot.minInsync

  function goTo(nextStep: number) {
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, nextStep)))
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            با چند خرابی، نوشتن متوقف می‌شود و داده از دست می‌رود؟
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
        {`payments / partition 0 · RF=3 · acks=all · min.insync.replicas=${snapshot.minInsync} · unclean.leader.election.enable=true`}
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
          variant="ghost"
          onClick={() => goTo(0)}
          startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          از اول
        </Button>
        {snapshot.counterfactual && (
          <Badge variant="warning" size="sm">
            فرض جایگزین
          </Badge>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="whitespace-nowrap tabular-nums">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </span>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step + 1}
          aria-label="پیشرفت توضیح بودجه خرابی"
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-300 motion-reduce:transition-none dark:bg-primary-400"
            style={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-3 min-h-[6.5rem] rounded-xl border border-slate-200 border-s-4 border-s-primary-500 bg-primary-50/60 p-3 text-primary-950 dark:border-slate-800 dark:border-s-primary-500 dark:bg-primary-950/30 dark:text-primary-100">
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
          viewBox="0 0 900 440"
          role="img"
          aria-label="سه بروکر پارتیشن، اندازه ISR، حداقل نسخه‌های همگام و نتیجه نوشتن با acks=all"
          className="h-auto w-full min-w-[760px]"
        >
          <rect
            x={16}
            y={16}
            width={868}
            height={58}
            rx={8}
            strokeWidth={1}
            className={
              canWrite
                ? 'fill-emerald-50/60 stroke-emerald-300 dark:fill-emerald-950/30 dark:stroke-emerald-800'
                : 'fill-rose-50/60 stroke-rose-300 dark:fill-rose-950/30 dark:stroke-rose-800'
            }
          />
          <text
            x={32}
            y={36}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-900 font-mono dark:fill-slate-100"
          >
            payments / partition 0
          </text>
          <text
            x={32}
            y={54}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`RF=3 · acks=all · |ISR|=${isrCount} · min.insync.replicas=${snapshot.minInsync} · budget=${budget}`}
          </text>
          <text
            x={868}
            y={36}
            textAnchor="end"
            fontSize={11}
            fontWeight={700}
            className={
              canWrite
                ? 'fill-emerald-700 dark:fill-emerald-300'
                : 'fill-rose-700 dark:fill-rose-300'
            }
          >
            {canWrite ? 'writes allowed' : 'writes blocked'}
          </text>
          <text
            x={868}
            y={54}
            textAnchor="end"
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            committed copies = {snapshot.committedCopies}
          </text>

          {snapshot.brokers.map((broker, index) => {
            const x = CARD_X[index]
            const active = snapshot.activeBroker === broker.id
            return (
              <g key={broker.id}>
                <rect
                  x={x}
                  y={CARD_Y}
                  width={CARD_W}
                  height={CARD_H}
                  rx={10}
                  strokeWidth={active ? 2.5 : 1}
                  className={`transition-colors duration-300 motion-reduce:transition-none ${brokerClass(
                    broker,
                    active,
                  )}`}
                />
                <text
                  x={x + 14}
                  y={CARD_Y + 24}
                  fontSize={12}
                  fontWeight={700}
                  className="fill-slate-900 font-mono dark:fill-slate-100"
                >
                  broker {broker.id}
                </text>
                <text
                  x={x + CARD_W - 14}
                  y={CARD_Y + 24}
                  textAnchor="end"
                  fontSize={9}
                  fontWeight={700}
                  className={
                    broker.alive
                      ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                      : 'fill-rose-700 font-mono dark:fill-rose-300'
                  }
                >
                  {broker.alive ? 'up' : 'down'}
                </text>
                <text
                  x={x + 14}
                  y={CARD_Y + 46}
                  fontSize={9.5}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  {broker.inIsr ? 'in ISR' : 'out of ISR'}
                </text>
                <text
                  x={x + 14}
                  y={CARD_Y + 66}
                  fontSize={9.5}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  {`LEO ${broker.leo}`}
                </text>
                <rect
                  x={x + 14}
                  y={CARD_Y + 74}
                  width={CARD_W - 28}
                  height={6}
                  rx={3}
                  className="fill-slate-200 dark:fill-slate-700"
                />
                <rect
                  x={x + 14}
                  y={CARD_Y + 74}
                  width={((CARD_W - 28) * Math.min(broker.leo, 13)) / 13}
                  height={6}
                  rx={3}
                  className={
                    broker.alive
                      ? 'fill-primary-500 dark:fill-primary-400'
                      : 'fill-rose-400 dark:fill-rose-600'
                  }
                />
              </g>
            )
          })}

          <rect
            x={40}
            y={220}
            width={220}
            height={86}
            rx={10}
            strokeWidth={1}
            className={requestBoxClass(snapshot.request)}
          />
          <text
            x={54}
            y={240}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            Produce · acks=all
          </text>
          <text
            x={54}
            y={260}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-900 font-mono dark:fill-slate-100"
          >
            offsets 10..12
          </text>
          <text
            x={54}
            y={282}
            fontSize={9.5}
            className={requestTextClass(snapshot.request)}
          >
            {snapshot.requestNote}
          </text>

          <line
            x1={260}
            y1={263}
            x2={330}
            y2={263}
            strokeDasharray="5 4"
            strokeWidth={canWrite ? 2 : 1.5}
            className={
              canWrite
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-rose-400 dark:stroke-rose-600'
            }
          />

          <rect
            x={330}
            y={220}
            width={240}
            height={86}
            rx={10}
            strokeWidth={1}
            className={
              canWrite
                ? 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/40 dark:stroke-emerald-700'
                : 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/40 dark:stroke-rose-700'
            }
          />
          <text
            x={450}
            y={242}
            textAnchor="middle"
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            write gate
          </text>
          <text
            x={450}
            y={264}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            className={
              canWrite
                ? 'fill-emerald-800 font-mono dark:fill-emerald-200'
                : 'fill-rose-800 font-mono dark:fill-rose-200'
            }
          >
            {`|ISR| ${isrCount} ${canWrite ? '>=' : '<'} ${snapshot.minInsync}`}
          </text>
          <text
            x={450}
            y={284}
            textAnchor="middle"
            fontSize={9.5}
            className={
              canWrite
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : 'fill-rose-700 font-mono dark:fill-rose-300'
            }
          >
            {canWrite ? 'OK' : 'NOT_ENOUGH_REPLICAS'}
          </text>

          <line
            x1={570}
            y1={263}
            x2={640}
            y2={263}
            strokeDasharray="5 4"
            strokeWidth={canWrite ? 2 : 1.5}
            className={
              canWrite
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-rose-400 dark:stroke-rose-600'
            }
          />

          <rect
            x={640}
            y={220}
            width={220}
            height={86}
            rx={10}
            strokeWidth={1}
            className={
              snapshot.lost
                ? 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/40 dark:stroke-rose-700'
                : 'fill-slate-50 stroke-slate-300 dark:fill-slate-950/40 dark:stroke-slate-700'
            }
          />
          <text
            x={654}
            y={240}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.lost ? 'committed data lost' : 'committed copies'}
          </text>
          {[0, 1, 2].map((dot) => (
            <circle
              key={dot}
              cx={662 + dot * 26}
              cy={266}
              r={9}
              strokeWidth={1}
              className={
                dot < snapshot.committedCopies
                  ? 'fill-emerald-400 stroke-emerald-600 dark:fill-emerald-500 dark:stroke-emerald-300'
                  : snapshot.lost
                    ? 'fill-rose-100 stroke-rose-400 dark:fill-rose-950 dark:stroke-rose-700'
                    : 'fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-600'
              }
            />
          ))}
          <text
            x={654}
            y={294}
            fontSize={9.5}
            className={
              snapshot.lost
                ? 'fill-rose-700 font-mono dark:fill-rose-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            {snapshot.lost
              ? 'offsets 10..12 gone'
              : `${snapshot.committedCopies} of 3 replicas`}
          </text>

          <text
            x={40}
            y={352}
            fontSize={10}
            fontWeight={700}
            className="fill-slate-700 font-mono dark:fill-slate-200"
          >
            {`failure budget while writing = RF - min.insync = 3 - ${snapshot.minInsync} = ${budget} broker`}
          </text>
          <text
            x={40}
            y={374}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`durability floor = min.insync.replicas = ${snapshot.minInsync} copies per committed record`}
          </text>
          <text
            x={860}
            y={352}
            textAnchor="end"
            fontSize={9.5}
            className={
              canWrite
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : 'fill-rose-700 font-mono dark:fill-rose-300'
            }
          >
            {canWrite ? 'producer gets ack' : 'producer retries'}
          </text>
          <text
            x={860}
            y={374}
            textAnchor="end"
            fontSize={9.5}
            className="fill-slate-400 font-mono dark:fill-slate-500"
          >
            {snapshot.lost ? 'unclean election path' : 'no data loss'}
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه ستون‌ها، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط یک پارتیشن و سه بروکر نمایش داده شده است.{' '}
        <Ltr>min.insync.replicas</Ltr> فقط با <Ltr>acks=all</Ltr> اعمال می‌شود؛
        با <Ltr>acks=1</Ltr> لیدر بدون توجه به اندازه <Ltr>ISR</Ltr> تأیید
        می‌کند. مسیر از دست رفتن داده در گام آخر فرض می‌کند{' '}
        <Ltr>unclean.leader.election.enable=true</Ltr> باشد.
      </p>
    </div>
  )
}
