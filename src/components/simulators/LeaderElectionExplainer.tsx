import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

type Role = 'leader' | 'follower' | 'none'

interface BrokerState {
  id: number
  alive: boolean
  inIsr: boolean
  leo: number
  role: Role
  note: string
}

type Counterfactual = 'none' | 'unclean-off' | 'unclean-on'

interface SnapshotState {
  brokers: BrokerState[]
  hw: number
  leader: number | null
  controllerActive: boolean
  electionNote: string
  clientTarget: number | null
  lostOffsets: number[]
  counterfactual: Counterfactual
}

interface Snapshot extends SnapshotState {
  caption: ReactNode
}

const AR = [1, 2, 3]
const CARD_X = [40, 330, 620]
const CARD_W = 240
const CARD_Y = 176
const CARD_H = 100
const OFFSET_COUNT = 14
const CELL_W = 38
const STRIP_X = 300
const STRIP_Y = 300

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: SnapshotState = {
    brokers: [
      { id: 1, alive: true, inIsr: true, leo: 12, role: 'leader', note: 'in ISR' },
      { id: 2, alive: true, inIsr: true, leo: 12, role: 'follower', note: 'in ISR' },
      { id: 3, alive: true, inIsr: true, leo: 12, role: 'follower', note: 'in ISR' },
    ],
    hw: 12,
    leader: 1,
    controllerActive: false,
    electionNote: 'no election needed',
    clientTarget: 1,
    lostOffsets: [],
    counterfactual: 'none',
  }

  const push = (caption: ReactNode, patch: Partial<SnapshotState> = {}) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      وضعیت شروع: <Ltr>AR = [1,2,3]</Ltr>، <Ltr>ISR = {'{1,2,3}'}</Ltr> و بروکر ۱
      لیدر است. هر سه نسخه تا <Ltr>offset 11</Ltr> را دارند، پس{' '}
      <Ltr>LEO = 12</Ltr> و <Ltr>HW = 12</Ltr>. مصرف‌کننده{' '}
      <Ltr>offset 0..11</Ltr> را می‌بیند.
    </>,
  )

  push(
    <>
      بروکر ۱ از کار افتاد. قبل از مرگ، رکوردهای <Ltr>offset 12</Ltr> و{' '}
      <Ltr>13</Ltr> را نوشته بود اما فالوورها هنوز آن‌ها را نگرفته بودند؛ پس{' '}
      <Ltr>LEO = 14</Ltr> اما <Ltr>HW</Ltr> روی <Ltr>12</Ltr> مانده است. کنترلر
      بعد از پایان مهلت نشست، خرابی را تشخیص می‌دهد.
    </>,
    {
      brokers: [
        { id: 1, alive: false, inIsr: false, leo: 14, role: 'none', note: 'down' },
        { id: 2, alive: true, inIsr: true, leo: 12, role: 'follower', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 12, role: 'follower', note: 'in ISR' },
      ],
      leader: null,
      controllerActive: true,
      electionNote: 'detected leader failure',
      clientTarget: null,
    },
  )

  push(
    <>
      کنترلر فهرست <Ltr>AR</Ltr> را به ترتیب می‌گردد و اولین نسخه‌ای را که زنده و
      عضو <Ltr>ISR</Ltr> است لیدر می‌کند: بروکر ۲. <Ltr>ISR = {'{2,3}'}</Ltr> و
      <Ltr>HW</Ltr> همچنان <Ltr>12</Ltr> است. رکوردهای commitنشده{' '}
      <Ltr>offset 12..13</Ltr> بروکر ۱ در محاسبه نمی‌آیند.
    </>,
    {
      brokers: [
        { id: 1, alive: false, inIsr: false, leo: 14, role: 'none', note: 'down' },
        { id: 2, alive: true, inIsr: true, leo: 12, role: 'leader', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 12, role: 'follower', note: 'in ISR' },
      ],
      leader: 2,
      controllerActive: false,
      electionNote: 'elected broker 2',
      clientTarget: 2,
    },
  )

  push(
    <>
      کلاینت‌ها متادیتای جدید را می‌گیرند و به لیدر جدید وصل می‌شوند. نوشتن
      ادامه پیدا می‌کند: دو رکورد جدید <Ltr>offset 12</Ltr> و <Ltr>13</Ltr> را
      می‌گیرند، <Ltr>LEO</Ltr> بروکر ۲ و ۳ به <Ltr>14</Ltr> می‌رسد و{' '}
      <Ltr>HW</Ltr> هم <Ltr>14</Ltr> می‌شود. رکوردهای قدیمی بروکر ۱ هرگز
      commit نشده بودند.
    </>,
    {
      brokers: [
        { id: 1, alive: false, inIsr: false, leo: 14, role: 'none', note: 'down' },
        { id: 2, alive: true, inIsr: true, leo: 14, role: 'leader', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 14, role: 'follower', note: 'in ISR' },
      ],
      hw: 14,
      electionNote: 'clients retry to broker 2',
      clientTarget: 2,
    },
  )

  push(
    <>
      بروکر ۱ برمی‌گردد و می‌بیند <Ltr>offset 12</Ltr> و <Ltr>13</Ltr> محلی‌اش با
      لیدر جدید فرق دارند. با <Ltr>Leader Epoch</Ltr> نقطه واگرایی را پیدا می‌کند،
      لاگ را تا <Ltr>offset 12</Ltr> کوتاه می‌کند و بعد نسخه‌های جدید را از لیدر
      می‌گیرد.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: false, leo: 12, role: 'follower', note: 'truncating' },
        { id: 2, alive: true, inIsr: true, leo: 14, role: 'leader', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 14, role: 'follower', note: 'in ISR' },
      ],
      electionNote: 'broker 1 catches up',
      clientTarget: 2,
    },
  )

  push(
    <>
      بروکر ۱ به <Ltr>LEO = 14</Ltr> رسید و دوباره عضو <Ltr>ISR</Ltr> شد:{' '}
      <Ltr>ISR = {'{2,3,1}'}</Ltr>. حالا سه نسخه دوباره همگام‌اند. اما لیدر
      همچنان بروکر ۲ است؛ بازگشت بروکر ۱ به‌تنهایی لیدری را برنمی‌گرداند.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 14, role: 'follower', note: 'in ISR' },
        { id: 2, alive: true, inIsr: true, leo: 14, role: 'leader', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 14, role: 'follower', note: 'in ISR' },
      ],
      electionNote: 'ISR restored',
      clientTarget: 2,
    },
  )

  push(
    <>
      <Ltr>Preferred Leader</Ltr> همان اولین نسخه در <Ltr>AR</Ltr> است. با{' '}
      <Ltr>auto.leader.rebalance.enable=true</Ltr> یا اجرای دستی{' '}
      <Ltr>kafka-leader-election.sh</Ltr>، رهبری به بروکر ۱ برمی‌گردد تا بار
      لیدری بین بروکرها متعادل بماند. این کار اختیاری است و به داده کاری ندارد.
    </>,
    {
      brokers: [
        { id: 1, alive: true, inIsr: true, leo: 14, role: 'leader', note: 'in ISR' },
        { id: 2, alive: true, inIsr: true, leo: 14, role: 'follower', note: 'in ISR' },
        { id: 3, alive: true, inIsr: true, leo: 14, role: 'follower', note: 'in ISR' },
      ],
      leader: 1,
      electionNote: 'preferred leader restored',
      clientTarget: 1,
    },
  )

  push(
    <>
      <span className="font-bold">فرض جایگزین:</span> بروکر ۱ و ۲ (اعضای{' '}
      <Ltr>ISR</Ltr>) از کار افتادند و فقط بروکر ۳ زنده است، اما{' '}
      <Ltr>LEO = 10</Ltr> دارد و خارج از <Ltr>ISR</Ltr> است. با{' '}
      <Ltr>unclean.leader.election.enable=false</Ltr> هیچ نسخه واجد شرطی وجود
      ندارد؛ پارتیشن آفلاین می‌ماند تا یک نسخه برگردد.
    </>,
    {
      brokers: [
        { id: 1, alive: false, inIsr: false, leo: 14, role: 'none', note: 'down' },
        { id: 2, alive: false, inIsr: false, leo: 14, role: 'none', note: 'down' },
        { id: 3, alive: true, inIsr: false, leo: 10, role: 'none', note: 'out of ISR' },
      ],
      hw: 10,
      leader: null,
      controllerActive: true,
      electionNote: 'ISR empty · unclean disabled',
      clientTarget: null,
      counterfactual: 'unclean-off',
    },
  )

  push(
    <>
      همان لحظه با <Ltr>unclean.leader.election.enable=true</Ltr>: کنترلر بروکر ۳
      را لیدر می‌کند تا پارتیشن دوباره در دسترس شود. اما <Ltr>HW</Ltr> از{' '}
      <Ltr>14</Ltr> به <Ltr>10</Ltr> برمی‌گردد و رکوردهای{' '}
      <Ltr>offset 10..13</Ltr> که commitشده بودند از بین می‌روند. دسترس‌پذیری
      به قیمت ناسازگاری داده.
    </>,
    {
      brokers: [
        { id: 1, alive: false, inIsr: false, leo: 14, role: 'none', note: 'down' },
        { id: 2, alive: false, inIsr: false, leo: 14, role: 'none', note: 'down' },
        { id: 3, alive: true, inIsr: true, leo: 10, role: 'leader', note: 'unclean leader' },
      ],
      hw: 10,
      leader: 3,
      controllerActive: false,
      electionNote: 'unclean election: broker 3',
      clientTarget: 3,
      lostOffsets: [10, 11, 12, 13],
      counterfactual: 'unclean-on',
    },
  )

  push(
    <>
      قانون: لیدر جدید همیشه از بین نسخه‌های <Ltr>ISR</Ltr> و به ترتیب{' '}
      <Ltr>AR</Ltr> انتخاب می‌شود. <Ltr>Unclean Leader Election</Ltr> فقط وقتی
      معنا دارد که <Ltr>ISR</Ltr> خالی باشد؛ آن هم به قیمت از دست رفتن داده
      commitشده و برگشت <Ltr>HW</Ltr>. مقدار پیش‌فرض مدرن{' '}
      <Ltr>false</Ltr> است و تغییرش باید آگاهانه باشد.
    </>,
    {
      leader: null,
      controllerActive: false,
      electionNote: 'rule',
      clientTarget: null,
      lostOffsets: [],
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
  return 'NO LEADER'
}

function roleTextClass(broker: BrokerState): string {
  if (!broker.alive) return 'fill-rose-700 dark:fill-rose-300'
  if (broker.role === 'leader') return 'fill-primary-700 dark:fill-primary-300'
  if (broker.role === 'follower') return 'fill-emerald-700 dark:fill-emerald-300'
  return 'fill-amber-700 dark:fill-amber-300'
}

function cellClass(offset: number, hw: number, lost: boolean): string {
  if (lost) {
    return 'fill-rose-100 stroke-rose-400 dark:fill-rose-950/60 dark:stroke-rose-700'
  }
  if (offset < hw) {
    return 'fill-emerald-100 stroke-emerald-400 dark:fill-emerald-950/60 dark:stroke-emerald-700'
  }
  return 'fill-amber-50 stroke-amber-300 dark:fill-amber-950/40 dark:stroke-amber-700'
}

export function LeaderElectionExplainer() {
  const [step, setStep] = useState(0)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const isr = snapshot.brokers.filter((broker) => broker.inIsr).map((broker) => broker.id)

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
            وقتی لیدر می‌میرد، چه کسی جای او را می‌گیرد؟
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
        {`orders / partition 0 · RF=3 · AR=[${AR.join(',')}] · ISR={${isr.join(',')}} · leader=${
          snapshot.leader ?? 'none'
        } · HW=${snapshot.hw}`}
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
        {snapshot.counterfactual !== 'none' && (
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
          aria-label="پیشرفت توضیح انتخاب لیدر"
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
          viewBox="0 0 900 460"
          role="img"
          aria-label="انتخاب لیدر جدید از ISR، کوتاه‌سازی لاگ بروکر برگشته و مقایسه unclean leader election"
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
              snapshot.leader
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
            {`AR=[${AR.join(',')}] · ISR={${isr.join(',')}} · leader=${
              snapshot.leader ?? 'none'
            } · HW=${snapshot.hw}`}
          </text>
          <text
            x={868}
            y={36}
            textAnchor="end"
            fontSize={11}
            fontWeight={700}
            className={
              snapshot.leader
                ? 'fill-emerald-700 dark:fill-emerald-300'
                : 'fill-rose-700 dark:fill-rose-300'
            }
          >
            {snapshot.leader ? 'partition online' : 'partition offline'}
          </text>
          <text
            x={868}
            y={54}
            textAnchor="end"
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            {snapshot.counterfactual === 'none' ? 'clean election' : 'unclean scenario'}
          </text>

          <rect
            x={330}
            y={96}
            width={240}
            height={60}
            rx={10}
            strokeWidth={snapshot.controllerActive ? 2.5 : 1}
            className={
              snapshot.controllerActive
                ? 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/40 dark:stroke-primary-400'
                : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
            }
          />
          <text
            x={450}
            y={118}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            className="fill-slate-900 dark:fill-slate-100"
          >
            controller (KRaft)
          </text>
          <text
            x={450}
            y={138}
            textAnchor="middle"
            fontSize={9}
            className={
              snapshot.controllerActive
                ? 'fill-primary-700 font-mono dark:fill-primary-300'
                : 'fill-slate-500 font-mono dark:fill-slate-400'
            }
          >
            {snapshot.electionNote}
          </text>

          {snapshot.brokers.map((broker, index) => {
            const x = CARD_X[index]
            const active = snapshot.clientTarget === broker.id
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
                  y={CARD_Y + 70}
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
                  height={6}
                  rx={3}
                  className="fill-slate-200 dark:fill-slate-700"
                />
                <rect
                  x={x + 14}
                  y={CARD_Y + 80}
                  width={((CARD_W - 28) * Math.min(broker.leo, OFFSET_COUNT)) / OFFSET_COUNT}
                  height={6}
                  rx={3}
                  className={
                    broker.alive
                      ? 'fill-primary-500 dark:fill-primary-400'
                      : 'fill-rose-400 dark:fill-rose-600'
                  }
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
            y={STRIP_Y}
            width={220}
            height={76}
            rx={10}
            strokeWidth={1}
            className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800"
          />
          <text
            x={54}
            y={STRIP_Y + 20}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            clients
          </text>
          <text
            x={54}
            y={STRIP_Y + 42}
            fontSize={11}
            fontWeight={700}
            className={
              snapshot.clientTarget
                ? 'fill-emerald-700 font-mono dark:fill-emerald-300'
                : 'fill-rose-700 font-mono dark:fill-rose-300'
            }
          >
            {snapshot.clientTarget ? `→ broker ${snapshot.clientTarget}` : 'retrying…'}
          </text>
          <text
            x={54}
            y={STRIP_Y + 62}
            fontSize={9}
            className="fill-slate-400 font-mono dark:fill-slate-500"
          >
            metadata refresh
          </text>

          <text
            x={STRIP_X}
            y={STRIP_Y - 8}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            log offsets · HW={snapshot.hw}
          </text>
          {Array.from({ length: OFFSET_COUNT }, (_, offset) => {
            const lost = snapshot.lostOffsets.includes(offset)
            return (
              <g key={offset}>
                <rect
                  x={STRIP_X + offset * CELL_W}
                  y={STRIP_Y}
                  width={CELL_W - 3}
                  height={34}
                  rx={4}
                  strokeWidth={1}
                  className={`transition-colors duration-300 motion-reduce:transition-none ${cellClass(
                    offset,
                    snapshot.hw,
                    lost,
                  )}`}
                />
                <text
                  x={STRIP_X + offset * CELL_W + (CELL_W - 3) / 2}
                  y={STRIP_Y + 22}
                  textAnchor="middle"
                  fontSize={9}
                  className={`font-mono ${
                    lost
                      ? 'fill-rose-700 dark:fill-rose-300'
                      : 'fill-slate-700 dark:fill-slate-200'
                  }`}
                >
                  {offset}
                </text>
              </g>
            )
          })}
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
            y={STRIP_Y + 58}
            fontSize={9}
            className="fill-emerald-700 font-mono dark:fill-emerald-300"
          >
            committed 0..{Math.max(snapshot.hw - 1, 0)}
          </text>
          <text
            x={STRIP_X + OFFSET_COUNT * CELL_W}
            y={STRIP_Y + 58}
            textAnchor="end"
            fontSize={9}
            className={
              snapshot.lostOffsets.length > 0
                ? 'fill-rose-700 font-mono dark:fill-rose-300'
                : 'fill-amber-700 font-mono dark:fill-amber-300'
            }
          >
            {snapshot.lostOffsets.length > 0
              ? `lost ${snapshot.lostOffsets[0]}..${
                  snapshot.lostOffsets[snapshot.lostOffsets.length - 1]
                }`
              : 'uncommitted tail'}
          </text>

          <text
            x={40}
            y={430}
            fontSize={9.5}
            className="fill-slate-500 font-mono dark:fill-slate-400"
          >
            new leader = first alive replica in AR that is also in ISR
          </text>
          <text
            x={860}
            y={430}
            textAnchor="end"
            fontSize={9.5}
            className={
              snapshot.counterfactual === 'unclean-on'
                ? 'fill-rose-700 font-mono dark:fill-rose-300'
                : 'fill-slate-400 font-mono dark:fill-slate-500'
            }
          >
            {snapshot.counterfactual === 'unclean-on'
              ? 'unclean election → data loss'
              : 'clean election keeps committed data'}
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه ستون‌ها، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط یک پارتیشن و ۱۴ آفست اول نمایش داده شده است. انتخاب
        لیدر، کوتاه‌سازی با <Ltr>Leader Epoch</Ltr> و برگشت <Ltr>HW</Ltr> در
        <Ltr> Unclean Leader Election</Ltr> همان رفتار واقعی کافکاست؛ زمان‌ها
        گرد شده‌اند.
      </p>
    </div>
  )
}
