import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

type Role = 'leader' | 'follower' | 'none'
type Phase = 'failure' | 'recovery' | 'rule'

interface BrokerState {
  id: number
  alive: boolean
  inIsr: boolean
  leo: number
  role: Role
  note: string
}

interface SnapshotState {
  brokers: BrokerState[]
  hw: number
  underReplicated: number
  offline: number
  event: string
  eventDetail: string
  activeBroker: number | null
  phase: Phase
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const CARD_X = [40, 330, 620]
const CARD_W = 240
const CARD_Y = 96
const CARD_H = 104
const OFFSET_COUNT = 16
const CELL_W = 50
const STRIP_X = 40
const STRIP_Y = 322

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    brokers: [
      { id: 1, alive: true, inIsr: true, leo: 12, role: 'leader', note: 'in ISR' },
      { id: 2, alive: true, inIsr: true, leo: 12, role: 'follower', note: 'in ISR' },
      { id: 3, alive: true, inIsr: true, leo: 12, role: 'follower', note: 'in ISR' },
    ],
    hw: 12,
    underReplicated: 0,
    offline: 0,
    event: 'healthy',
    eventDetail: 'ISR={1,2,3} · HW=12',
    activeBroker: null,
    phase: 'failure',
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      وضعیت سالم: هر سه بروکر زنده و در <Ltr>ISR</Ltr> هستند،{' '}
      <Ltr>HW = LEO = 12</Ltr> و پارتیشن <Ltr>Under-Replicated</Ltr> نیست.
      مصرف‌کننده <Ltr>offset 0..11</Ltr> را می‌بیند.
    </>,
  )

  push(
    <>
      یک قطع شبکه کوتاه باعث می‌شود بروکر ۳ از لیدر <Ltr>Fetch</Ltr> نکند. هنوز
      کمتر از <Ltr>replica.lag.time.max.ms</Ltr> (۳۰ ثانیه) گذشته، پس بروکر ۳
      هنوز در <Ltr>ISR</Ltr> است و نوشتن بدون مشکل ادامه دارد.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 12, role: 'leader', note: 'in ISR' },
        { id: 2, alive: true, inIsr: true, leo: 12, role: 'follower', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 12, role: 'follower', note: 'fetch stalled' },
      ],
      event: 'network blip',
      eventDetail: 'broker 3 stops fetching · 0s/30s',
      activeBroker: 3,
    },
  )

  push(
    <>
      زمان از ۳۰ ثانیه گذشت و بروکر ۳ از <Ltr>ISR</Ltr> خارج شد:{' '}
      <Ltr>ISR = {'{1,2}'}</Ltr>. پارتیشن <Ltr>Under-Replicated</Ltr> است اما
      چون <Ltr>|ISR| = 2 ≥ min.insync = 2</Ltr>، نوشتن با{' '}
      <Ltr>acks=all</Ltr> ادامه دارد.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 12, role: 'leader', note: 'in ISR' },
        { id: 2, alive: true, inIsr: true, leo: 12, role: 'follower', note: 'in ISR' },
        { id: 3, alive: true, inIsr: false, leo: 12, role: 'follower', note: 'out of ISR' },
      ],
      underReplicated: 1,
      event: 'ISR shrink',
      eventDetail: 'broker 3 out of ISR · writes continue',
      activeBroker: 3,
    },
  )

  push(
    <>
      دو رکورد جدید <Ltr>offset 12</Ltr> و <Ltr>13</Ltr> نوشته می‌شوند. لیدر و
      بروکر ۲ به <Ltr>LEO = 14</Ltr> می‌رسند و <Ltr>HW</Ltr> هم <Ltr>14</Ltr>{' '}
      می‌شود. بروکر ۳ هنوز روی <Ltr>12</Ltr> است و این رکوردها را ندارد.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 14, role: 'leader', note: 'in ISR' },
        { id: 2, alive: true, inIsr: true, leo: 14, role: 'follower', note: 'in ISR' },
        { id: 3, alive: true, inIsr: false, leo: 12, role: 'follower', note: 'out of ISR' },
      ],
      hw: 14,
      event: 'writes continue',
      eventDetail: 'offsets 12..13 written · 2/2 ack',
      activeBroker: 1,
    },
  )

  push(
    <>
      شبکه بروکر ۳ برمی‌گردد. از لیدر <Ltr>Fetch</Ltr> می‌کند، <Ltr>offset 12</Ltr>{' '}
      و <Ltr>13</Ltr> را می‌گیرد و به <Ltr>LEO = 14</Ltr> می‌رسد. چون دوباره در
      بازه مجاز همگام شده، به <Ltr>ISR</Ltr> برمی‌گردد:{' '}
      <Ltr>ISR = {'{1,2,3}'}</Ltr>. پارتیشن دوباره سالم است.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 14, role: 'leader', note: 'in ISR' },
        { id: 2, alive: true, inIsr: true, leo: 14, role: 'follower', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 14, role: 'follower', note: 'caught up' },
      ],
      underReplicated: 0,
      event: 'rejoin ISR',
      eventDetail: 'broker 3 fetched 12..13 · ISR={1,2,3}',
      activeBroker: 3,
    },
  )

  push(
    <>
      این بار خرابی سخت‌تر است: دیسک بروکر ۱ (لیدر) از کار افتاد. کنترلر بروکر ۲
      را لیدر می‌کند: <Ltr>ISR = {'{2,3}'}</Ltr>. داده commitشده{' '}
      <Ltr>offset 0..13</Ltr> روی دو نسخه باقی‌مانده هست، پس چیزی از دست نمی‌رود.
    </>,
    {
      brokers: [
        { id: 1, alive: false, inIsr: false, leo: 14, role: 'none', note: 'disk failure' },
        { id: 2, alive: true, inIsr: true, leo: 14, role: 'leader', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 14, role: 'follower', note: 'in ISR' },
      ],
      underReplicated: 1,
      event: 'leader failover',
      eventDetail: 'controller elected broker 2 · ISR={2,3}',
      activeBroker: 1,
      phase: 'recovery',
    },
  )

  push(
    <>
      کلاینت‌ها متادیتای جدید را می‌گیرند و به بروکر ۲ وصل می‌شوند. نوشتن ادامه
      دارد: <Ltr>offset 14</Ltr> و <Ltr>15</Ltr> نوشته می‌شوند، <Ltr>LEO</Ltr>{' '}
      لیدر و بروکر ۳ به <Ltr>16</Ltr> و <Ltr>HW</Ltr> به <Ltr>16</Ltr> می‌رسد.
    </>,
    {
      brokers: [
        { id: 1, alive: false, inIsr: false, leo: 14, role: 'none', note: 'disk failure' },
        { id: 2, alive: true, inIsr: true, leo: 16, role: 'leader', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 16, role: 'follower', note: 'in ISR' },
      ],
      hw: 16,
      event: 'clients retry',
      eventDetail: 'offsets 14..15 written · 2/2 ack',
      activeBroker: 2,
      phase: 'recovery',
    },
  )

  push(
    <>
      بروکر ۱ با دیسک خالی جایگزین می‌شود و به‌عنوان فالوور بالا می‌آید. لاگ
      محلی ندارد، پس کپی‌برداری از صفر شروع می‌شود، نه فقط از انتهای لاگ. این
      همان تفاوت بازیابی گذرا و خرابی دائمی دیسک است.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: false, leo: 0, role: 'follower', note: 'full bootstrap' },
        { id: 2, alive: true, inIsr: true, leo: 16, role: 'leader', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 16, role: 'follower', note: 'in ISR' },
      ],
      underReplicated: 1,
      event: 'replacement broker',
      eventDetail: 'broker 1 empty disk · fetching from offset 0',
      activeBroker: 1,
      phase: 'recovery',
    },
  )

  push(
    <>
      بروکر ۱ به <Ltr>LEO = 16</Ltr> رسید و دوباره عضو <Ltr>ISR</Ltr> شد:{' '}
      <Ltr>ISR = {'{2,3,1}'}</Ltr>. پارتیشن دوباره سه نسخه همگام دارد. لیدری
      همچنان روی بروکر ۲ است؛ برگرداندن آن به Preferred Leader تصمیم جداگانه‌ای
      برای تعادل بار است.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 16, role: 'follower', note: 'caught up' },
        { id: 2, alive: true, inIsr: true, leo: 16, role: 'leader', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 16, role: 'follower', note: 'in ISR' },
      ],
      underReplicated: 0,
      event: 'recovered',
      eventDetail: 'ISR={2,3,1} · preferred leader not restored',
      activeBroker: 1,
      phase: 'recovery',
    },
  )

  push(
    <>
      قانون کلی: خرابی گذرا با <Ltr>ISR</Ltr> و <Ltr>Fetch</Ltr> خودبه‌خود درمان
      می‌شود؛ خرابی دائمی دیسک به بروکر جایگزین و کپی‌برداری کامل نیاز دارد.
      در هر دو حالت، <Ltr>UnderReplicatedPartitions</Ltr> و{' '}
      <Ltr>OfflinePartitionsCount</Ltr> را پایش کنید و تا برگشت <Ltr>ISR</Ltr>{' '}
      حاشیه امنیت را کم‌شده بدانید.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 16, role: 'follower', note: 'in ISR' },
        { id: 2, alive: true, inIsr: true, leo: 16, role: 'leader', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 16, role: 'follower', note: 'in ISR' },
      ],
      event: 'rule',
      eventDetail: 'transient → self-heal · disk loss → replace + reassign',
      activeBroker: null,
      phase: 'rule',
    },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

function cardClass(broker: BrokerState, active: boolean): string {
  if (!broker.alive) {
    return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/40 dark:stroke-rose-700'
  }
  if (broker.role === 'leader') {
    return active
      ? 'fill-primary-100 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
      : 'fill-primary-50 stroke-primary-300 dark:fill-primary-950/40 dark:stroke-primary-700'
  }
  if (broker.inIsr) {
    return 'fill-emerald-50 stroke-emerald-300 dark:fill-emerald-950/40 dark:stroke-emerald-700'
  }
  return 'fill-amber-50 stroke-amber-300 dark:fill-amber-950/40 dark:stroke-amber-700'
}

function roleText(broker: BrokerState): string {
  if (!broker.alive) return 'DOWN'
  if (broker.role === 'leader') return 'LEADER'
  if (broker.role === 'follower') return 'FOLLOWER'
  return 'NO REPLICA'
}

function roleTextClass(broker: BrokerState): string {
  if (!broker.alive) return 'fill-rose-700 dark:fill-rose-300'
  if (broker.role === 'leader') return 'fill-primary-700 dark:fill-primary-300'
  if (broker.role === 'follower') return 'fill-emerald-700 dark:fill-emerald-300'
  return 'fill-slate-500 dark:fill-slate-400'
}

export function FailureRecoveryExplainer() {
  const [step, setStep] = useState(0)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const isr = snapshot.brokers.filter((broker) => broker.inIsr).map((broker) => broker.id)
  const leaderLeo = Math.max(...snapshot.brokers.map((broker) => broker.leo))

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
            از قطع شبکه تا خرابی دیسک، خوشه چطور خودش را بازیابی می‌کند؟
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
        {`orders / partition 0 · RF=3 · acks=all · min.insync.replicas=2 · replica.lag.time.max.ms=30000`}
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
        {snapshot.phase === 'recovery' && (
          <Badge variant="success" size="sm">
            بازیابی
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
          aria-label="پیشرفت توضیح خرابی و بازیابی"
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
          aria-label="وضعیت سه بروکر در طول یک خرابی گذرا و یک خرابی دیسک، با LEO و High Watermark"
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
              snapshot.underReplicated === 0 && snapshot.offline === 0
                ? 'fill-emerald-50/60 stroke-emerald-300 dark:fill-emerald-950/30 dark:stroke-emerald-800'
                : 'fill-amber-50/60 stroke-amber-300 dark:fill-amber-950/30 dark:stroke-amber-800'
            }
          />
          <text
            x={32}
            y={36}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-900 font-mono dark:fill-slate-100"
          >
            orders / partition 0
          </text>
          <text
            x={32}
            y={54}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`RF=3 · ISR={${isr.join(',')}} · HW=${snapshot.hw} · LEO=${leaderLeo}`}
          </text>
          <text
            x={868}
            y={36}
            textAnchor="end"
            fontSize={10}
            fontWeight={700}
            className={
              snapshot.underReplicated === 0
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : 'fill-amber-700 font-mono dark:fill-amber-300'
            }
          >
            {`under-replicated=${snapshot.underReplicated}`}
          </text>
          <text
            x={868}
            y={54}
            textAnchor="end"
            fontSize={9.5}
            className={
              snapshot.offline === 0
                ? 'fill-slate-500 font-mono dark:fill-slate-400'
                : 'fill-rose-700 font-mono dark:fill-rose-300'
            }
          >
            {`offline=${snapshot.offline}`}
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
                  className={`transition-colors duration-300 motion-reduce:transition-none ${cardClass(
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
                  className={roleTextClass(broker)}
                >
                  {roleText(broker)}
                </text>
                <text
                  x={x + 14}
                  y={CARD_Y + 48}
                  fontSize={9.5}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  {`LEO ${broker.leo} · ${broker.inIsr ? 'in ISR' : 'out of ISR'}`}
                </text>
                <text
                  x={x + 14}
                  y={CARD_Y + 68}
                  fontSize={9}
                  className={
                    broker.alive
                      ? 'fill-slate-500 font-mono dark:fill-slate-400'
                      : 'fill-rose-700 font-mono dark:fill-rose-300'
                  }
                >
                  {broker.note}
                </text>
                <rect
                  x={x + 14}
                  y={CARD_Y + 80}
                  width={CARD_W - 28}
                  height={8}
                  rx={4}
                  className="fill-slate-200 dark:fill-slate-700"
                />
                <rect
                  x={x + 14}
                  y={CARD_Y + 80}
                  width={((CARD_W - 28) * Math.min(broker.leo, OFFSET_COUNT)) / OFFSET_COUNT}
                  height={8}
                  rx={4}
                  className={`transition-[width] duration-500 motion-reduce:transition-none ${
                    broker.alive
                      ? broker.inIsr
                        ? 'fill-emerald-500 dark:fill-emerald-400'
                        : 'fill-amber-500 dark:fill-amber-400'
                      : 'fill-rose-400 dark:fill-rose-600'
                  }`}
                />
                {!broker.alive && (
                  <>
                    <line
                      x1={x + 10}
                      y1={CARD_Y + 10}
                      x2={x + CARD_W - 10}
                      y2={CARD_Y + CARD_H - 10}
                      strokeWidth={1.5}
                      className="stroke-rose-400 dark:stroke-rose-600"
                    />
                    <line
                      x1={x + CARD_W - 10}
                      y1={CARD_Y + 10}
                      x2={x + 10}
                      y2={CARD_Y + CARD_H - 10}
                      strokeWidth={1.5}
                      className="stroke-rose-400 dark:stroke-rose-600"
                    />
                  </>
                )}
              </g>
            )
          })}

          <rect
            x={40}
            y={226}
            width={820}
            height={64}
            rx={10}
            strokeWidth={1}
            className={
              snapshot.phase === 'rule'
                ? 'fill-primary-50 stroke-primary-300 dark:fill-primary-950/40 dark:stroke-primary-700'
                : snapshot.phase === 'recovery'
                  ? 'fill-emerald-50/70 stroke-emerald-300 dark:fill-emerald-950/30 dark:stroke-emerald-800'
                  : 'fill-amber-50/70 stroke-amber-300 dark:fill-amber-950/30 dark:stroke-amber-800'
            }
          />
          <text
            x={56}
            y={246}
            fontSize={9}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            current event
          </text>
          <text
            x={56}
            y={266}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-900 font-mono dark:fill-slate-100"
          >
            {snapshot.event}
          </text>
          <text
            x={56}
            y={282}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.eventDetail}
          </text>

          <text
            x={STRIP_X}
            y={STRIP_Y - 8}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            log offsets · committed &lt; HW={snapshot.hw} · pending ≥ HW
          </text>
          {Array.from({ length: OFFSET_COUNT }, (_, offset) => (
            <g key={offset}>
              <rect
                x={STRIP_X + offset * CELL_W}
                y={STRIP_Y}
                width={CELL_W - 3}
                height={34}
                rx={4}
                strokeWidth={1}
                className={
                  offset < snapshot.hw
                    ? 'fill-emerald-100 stroke-emerald-400 dark:fill-emerald-950/60 dark:stroke-emerald-700'
                    : 'fill-amber-50 stroke-amber-300 dark:fill-amber-950/40 dark:stroke-amber-700'
                }
              />
              <text
                x={STRIP_X + offset * CELL_W + (CELL_W - 3) / 2}
                y={STRIP_Y + 22}
                textAnchor="middle"
                fontSize={9}
                className="fill-slate-700 font-mono dark:fill-slate-200"
              >
                {offset}
              </text>
            </g>
          ))}
          <line
            x1={STRIP_X + snapshot.hw * CELL_W}
            y1={STRIP_Y - 4}
            x2={STRIP_X + snapshot.hw * CELL_W}
            y2={STRIP_Y + 40}
            strokeWidth={2}
            className="stroke-emerald-500 dark:stroke-emerald-400"
          />
          <text
            x={STRIP_X}
            y={STRIP_Y + 56}
            fontSize={9}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            consumer reads 0..{Math.max(snapshot.hw - 1, 0)}
          </text>
          <text
            x={860}
            y={STRIP_Y + 56}
            textAnchor="end"
            fontSize={9}
            className="fill-slate-400 font-mono dark:fill-slate-500"
          >
            {snapshot.underReplicated > 0
              ? 'a follower is behind the leader'
              : 'all replicas in sync'}
          </text>

          <text
            x={40}
            y={424}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            transient failure → ISR shrink → fetch → rejoin
          </text>
          <text
            x={860}
            y={424}
            textAnchor="end"
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            permanent disk loss → replacement broker → full bootstrap
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه ستون‌ها، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط یک پارتیشن و ۱۶ آفست اول نمایش داده شده است. زمان‌ها
        گرد شده‌اند و سناریو فرض می‌کند <Ltr>min.insync.replicas=2</Ltr> و{' '}
        <Ltr>unclean.leader.election.enable=false</Ltr> باشد؛ منطق{' '}
        <Ltr>ISR</Ltr>، <Ltr>HW</Ltr> و کپی‌برداری همان رفتار واقعی کافکاست.
      </p>
    </div>
  )
}
