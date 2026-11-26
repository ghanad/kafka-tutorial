import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

type RackId = 'rack-a' | 'rack-b' | 'rack-c'
type Role = 'leader' | 'follower' | 'none'

interface BrokerState {
  id: number
  rack: RackId
  role: Role
  alive: boolean
  inIsr: boolean
  leo: number
}

interface SnapshotState {
  brokers: BrokerState[]
  hw: number
  rackDown: RackId | null
  partitionState: 'online' | 'offline'
  activeBroker: number | null
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const RACKS: RackId[] = ['rack-a', 'rack-b', 'rack-c']
const RACK_X: Record<RackId, number> = {
  'rack-a': 40,
  'rack-b': 330,
  'rack-c': 620,
}
const RACK_W = 240
const RACK_TOP = 96
const RACK_H = 300
const BROKER_H = 64
const BROKER_GAP = 12

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    brokers: [
      { id: 1, rack: 'rack-a', role: 'leader', alive: true, inIsr: true, leo: 10 },
      { id: 2, rack: 'rack-b', role: 'follower', alive: true, inIsr: true, leo: 10 },
      { id: 3, rack: 'rack-c', role: 'follower', alive: true, inIsr: true, leo: 10 },
    ],
    hw: 10,
    rackDown: null,
    partitionState: 'online',
    activeBroker: null,
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      وضعیت شروع: <Ltr>RF=3</Ltr> و سه بروکر، هر کدام در یک rack جدا. کافکا هر
      نسخه را در یک rack می‌گذارد تا خرابی یک rack همه کپی‌ها را نبرد. بروکر ۱
      لیدر است، <Ltr>ISR = {'{1,2,3}'}</Ltr> و <Ltr>HW = 10</Ltr>.
    </>,
  )

  push(
    <>
      rack-a از دست رفت و بروکر ۱ با آن خاموش شد. تا وقتی کنترلر خرابی را تشخیص
      دهد و لیدر جدید انتخاب کند، پارتیشن موقتاً لیدر ندارد؛ پرودیوسر خطا
      می‌گیرد و دوباره تلاش می‌کند. <Ltr>HW</Ltr> همچنان <Ltr>10</Ltr> است، چون
      داده commitشده روی دو نسخه دیگر هم هست.
    </>,
    {
      brokers: [
        { id: 1, rack: 'rack-a', role: 'none', alive: false, inIsr: false, leo: 10 },
        { id: 2, rack: 'rack-b', role: 'follower', alive: true, inIsr: true, leo: 10 },
        { id: 3, rack: 'rack-c', role: 'follower', alive: true, inIsr: true, leo: 10 },
      ],
      rackDown: 'rack-a',
      partitionState: 'offline',
    },
  )

  push(
    <>
      کنترلر بروکر ۲ را که اولین نسخه زنده در <Ltr>ISR</Ltr> است لیدر می‌کند:{' '}
      <Ltr>ISR = {'{2,3}'}</Ltr>. پارتیشن دوباره آنلاین است و نوشتن با{' '}
      <Ltr>acks=all</Ltr> و <Ltr>min.insync.replicas=2</Ltr> ادامه پیدا می‌کند.
      هیچ رکورد commitشده‌ای از دست نرفت، چون هر دو نسخه باقی‌مانده تا{' '}
      <Ltr>offset 9</Ltr> را داشتند.
    </>,
    {
      brokers: [
        { id: 1, rack: 'rack-a', role: 'none', alive: false, inIsr: false, leo: 10 },
        { id: 2, rack: 'rack-b', role: 'leader', alive: true, inIsr: true, leo: 10 },
        { id: 3, rack: 'rack-c', role: 'follower', alive: true, inIsr: true, leo: 10 },
      ],
      partitionState: 'online',
      activeBroker: 2,
    },
  )

  push(
    <>
      rack-a برمی‌گردد. بروکر ۱ که از <Ltr>ISR</Ltr> بیرون افتاده بود، اول لاگ
      خود را تا <Ltr>HW</Ltr> کوتاه می‌کند و بعد از لیدر جدید کپی می‌گیرد. وقتی
      به انتهای لاگ لیدر رسید، دوباره عضو <Ltr>ISR</Ltr> می‌شود:{' '}
      <Ltr>ISR = {'{2,3,1}'}</Ltr>. تحمل خرابی یک rack دوباره کامل شد.
    </>,
    {
      brokers: [
        { id: 1, rack: 'rack-a', role: 'follower', alive: true, inIsr: true, leo: 10 },
        { id: 2, rack: 'rack-b', role: 'leader', alive: true, inIsr: true, leo: 10 },
        { id: 3, rack: 'rack-c', role: 'follower', alive: true, inIsr: true, leo: 10 },
      ],
      rackDown: null,
      activeBroker: 1,
    },
  )

  push(
    <>
      بروکر ۴ به rack-a اضافه شد. برای <Ltr>RF=3</Ltr> در سه rack، کافکا همچنان
      یک نسخه در هر rack نگه می‌دارد؛ پس بروکر ۴ نسخه‌ای از این پارتیشن نمی‌گیرد
      و فقط پارتیشن‌های دیگر را میزبانی می‌کند. افزودن بروکر به یک rack موجود،
      تحمل خرابی rack را بیشتر نمی‌کند.
    </>,
    {
      brokers: [
        { id: 1, rack: 'rack-a', role: 'follower', alive: true, inIsr: true, leo: 10 },
        { id: 2, rack: 'rack-b', role: 'leader', alive: true, inIsr: true, leo: 10 },
        { id: 3, rack: 'rack-c', role: 'follower', alive: true, inIsr: true, leo: 10 },
        { id: 4, rack: 'rack-a', role: 'none', alive: true, inIsr: false, leo: 0 },
      ],
      activeBroker: 4,
    },
  )

  push(
    <>
      <span className="font-bold">فرض جایگزین:</span> اگر <Ltr>broker.rack</Ltr>{' '}
      درست تنظیم نشده باشد و هر سه بروکر خود را در rack-a معرفی کنند، کافکا فکر
      می‌کند چیدمان بهینه است و هر سه نسخه را همان‌جا می‌گذارد. حالا خرابی
      rack-a یعنی از دست رفتن همه نسخه‌ها و آفلاین شدن پارتیشن.
    </>,
    {
      brokers: [
        { id: 1, rack: 'rack-a', role: 'none', alive: false, inIsr: false, leo: 10 },
        { id: 2, rack: 'rack-a', role: 'none', alive: false, inIsr: false, leo: 10 },
        { id: 3, rack: 'rack-a', role: 'none', alive: false, inIsr: false, leo: 10 },
      ],
      rackDown: 'rack-a',
      partitionState: 'offline',
      activeBroker: null,
    },
  )

  push(
    <>
      قانون کلی: <Ltr>RF=3</Ltr> روی سه rack یعنی تحمل خرابی یک rack.{' '}
      <Ltr>RF=4</Ltr> روی سه rack هم فقط یک rack را تحمل می‌کند، چون دو نسخه در
      یک rack مشترک‌اند. برای تحمل دو rack با سه rack فیزیکی به <Ltr>RF=5</Ltr>{' '}
      نیاز دارید تا بعد از حذف دو rack هنوز یک نسخه زنده بماند. چیدمان آگاه از
      rack فقط وقتی کار می‌کند که <Ltr>broker.rack</Ltr> برای همه بروکرها درست
      تنظیم شده باشد.
    </>,
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

function brokerBoxClass(broker: BrokerState, active: boolean): string {
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

function roleLabel(broker: BrokerState): string {
  if (!broker.alive) return 'down'
  if (broker.role === 'leader') return 'LEADER'
  if (broker.role === 'follower') return 'FOLLOWER'
  return 'no replica'
}

function roleClass(broker: BrokerState): string {
  if (!broker.alive) return 'fill-rose-700 dark:fill-rose-300'
  if (broker.role === 'leader') return 'fill-primary-700 dark:fill-primary-300'
  if (broker.role === 'follower') return 'fill-emerald-700 dark:fill-emerald-300'
  return 'fill-slate-500 dark:fill-slate-400'
}

export function RackAwarenessExplainer() {
  const [step, setStep] = useState(0)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const online = snapshot.partitionState === 'online'

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
            چیدمان آگاه از rack چطور یک خرابی دیتاسنتر را تحمل می‌کند؟
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
        {`orders / partition 0 · RF=3 · acks=all · min.insync.replicas=2 · broker.rack=rack-a|rack-b|rack-c`}
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
          aria-label="پیشرفت توضیح چیدمان rack"
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
          viewBox="0 0 900 430"
          role="img"
          aria-label="چیدمان سه نسخه پارتیشن روی سه rack، خرابی یک rack و انتخاب لیدر جدید"
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
              online
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
            orders / partition 0
          </text>
          <text
            x={32}
            y={54}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {`RF=3 · HW=${snapshot.hw} · ISR={${snapshot.brokers
              .filter((broker) => broker.inIsr)
              .map((broker) => broker.id)
              .join(',')}}`}
          </text>
          <text
            x={868}
            y={36}
            textAnchor="end"
            fontSize={11}
            fontWeight={700}
            className={
              online
                ? 'fill-emerald-700 dark:fill-emerald-300'
                : 'fill-rose-700 dark:fill-rose-300'
            }
          >
            {online ? 'partition online' : 'partition offline'}
          </text>
          <text
            x={868}
            y={54}
            textAnchor="end"
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.rackDown ? `${snapshot.rackDown} down` : 'all racks up'}
          </text>

          {RACKS.map((rack) => {
            const rackBrokers = snapshot.brokers.filter((broker) => broker.rack === rack)
            const isDown = snapshot.rackDown === rack
            return (
              <g key={rack}>
                <rect
                  x={RACK_X[rack]}
                  y={RACK_TOP}
                  width={RACK_W}
                  height={RACK_H}
                  rx={10}
                  strokeWidth={isDown ? 2 : 1}
                  strokeDasharray={isDown ? '6 4' : undefined}
                  className={
                    isDown
                      ? 'fill-rose-50/40 stroke-rose-400 dark:fill-rose-950/20 dark:stroke-rose-700'
                      : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
                  }
                />
                <text
                  x={RACK_X[rack] + 14}
                  y={RACK_TOP + 22}
                  fontSize={11}
                  fontWeight={700}
                  className={
                    isDown
                      ? 'fill-rose-700 font-mono dark:fill-rose-300'
                      : 'fill-slate-600 font-mono dark:fill-slate-300'
                  }
                >
                  {rack}
                </text>
                <text
                  x={RACK_X[rack] + RACK_W - 14}
                  y={RACK_TOP + 22}
                  textAnchor="end"
                  fontSize={9}
                  className="fill-slate-400 font-mono dark:fill-slate-500"
                >
                  {isDown ? 'rack down' : `${rackBrokers.length} broker`}
                </text>

                {rackBrokers.length === 0 && (
                  <text
                    x={RACK_X[rack] + RACK_W / 2}
                    y={RACK_TOP + RACK_H / 2}
                    textAnchor="middle"
                    fontSize={10}
                    className="fill-slate-400 font-mono dark:fill-slate-500"
                  >
                    no replica
                  </text>
                )}

                {rackBrokers.map((broker, index) => {
                  const boxX = RACK_X[rack] + 14
                  const boxY = RACK_TOP + 38 + index * (BROKER_H + BROKER_GAP)
                  const active = snapshot.activeBroker === broker.id
                  return (
                    <g key={broker.id}>
                      <rect
                        x={boxX}
                        y={boxY}
                        width={RACK_W - 28}
                        height={BROKER_H}
                        rx={8}
                        strokeWidth={active ? 2.5 : 1}
                        className={`transition-colors duration-300 motion-reduce:transition-none ${brokerBoxClass(
                          broker,
                          active,
                        )}`}
                      />
                      <text
                        x={boxX + 12}
                        y={boxY + 21}
                        fontSize={12}
                        fontWeight={700}
                        className="fill-slate-900 font-mono dark:fill-slate-100"
                      >
                        broker {broker.id}
                      </text>
                      <text
                        x={boxX + RACK_W - 40}
                        y={boxY + 21}
                        textAnchor="end"
                        fontSize={8.5}
                        fontWeight={700}
                        className={roleClass(broker)}
                      >
                        {roleLabel(broker)}
                      </text>
                      <text
                        x={boxX + 12}
                        y={boxY + 38}
                        fontSize={9}
                        className="fill-slate-500 font-mono dark:fill-slate-400"
                      >
                        {broker.role === 'none' ? 'no log' : `LEO ${broker.leo}`}
                      </text>
                      <text
                        x={boxX + 12}
                        y={boxY + 54}
                        fontSize={9}
                        className={
                          broker.inIsr
                            ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                            : 'fill-amber-700 font-mono dark:fill-amber-300'
                        }
                      >
                        {broker.inIsr ? 'in ISR' : 'out of ISR'}
                      </text>
                      {!broker.alive && (
                        <>
                          <line
                            x1={boxX + 10}
                            y1={boxY + 10}
                            x2={boxX + RACK_W - 38}
                            y2={boxY + BROKER_H - 10}
                            strokeWidth={1.5}
                            className="stroke-rose-400 dark:stroke-rose-600"
                          />
                          <line
                            x1={boxX + RACK_W - 38}
                            y1={boxY + 10}
                            x2={boxX + 10}
                            y2={boxY + BROKER_H - 10}
                            strokeWidth={1.5}
                            className="stroke-rose-400 dark:stroke-rose-600"
                          />
                        </>
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}

          <text
            x={40}
            y={420}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            rack-aware placement: one replica per rack when RF=3
          </text>
          <text
            x={860}
            y={420}
            textAnchor="end"
            fontSize={9.5}
            className={
              online
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : 'fill-rose-700 font-mono dark:fill-rose-300'
            }
          >
            {online ? 'writes allowed' : 'writes blocked'}
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه ستون‌ها، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط یک پارتیشن نمایش داده شده است. کافکا نسخه‌ها را با
        <Ltr> broker.rack</Ltr> می‌شناسد و تا حد امکان آن‌ها را روی rackهای
        مختلف پخش می‌کند؛ منطق انتخاب لیدر و <Ltr>ISR</Ltr> همان است که در
        کافکا اجرا می‌شود.
      </p>
    </div>
  )
}
