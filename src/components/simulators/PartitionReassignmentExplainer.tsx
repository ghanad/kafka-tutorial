import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

type Mark = 'ok' | 'acc' | 'no'

interface Snapshot {
  broker4: boolean
  replicas: number[]
  leader: number
  isr: number[]
  copying: number | null
  phase: 'before' | 'plan' | 'moving' | 'done'
  planVisible: boolean
  verifyVisible: boolean
  caption: ReactNode
}

function buildSnapshots(): Snapshot[] {
  const base = {
    broker4: true,
    replicas: [1, 2, 3],
    leader: 1,
    isr: [1, 2, 3],
    copying: null,
    phase: 'before' as const,
    planVisible: false,
    verifyVisible: false,
  }

  return [
    {
      ...base,
      broker4: false,
      caption: (
        <>
          وضعیت شروع: پارتیشن <Ltr className="font-mono">orders-0</Ltr> سه replica
          دارد (<Ltr className="font-mono">[1, 2, 3]</Ltr>)، رهبر آن بروکر{' '}
          <Ltr className="font-mono">1</Ltr> است و هر سه در <Ltr>ISR</Ltr> هستند.
          بروکر <Ltr className="font-mono">4</Ltr> هنوز عضو خوشه نیست.
        </>
      ),
    },
    {
      ...base,
      caption: (
        <>
          بروکر <Ltr className="font-mono">4</Ltr> به خوشه اضافه شد. هنوز هیچ
          پارتیشنی روی آن نیست؛ برای همین باید reassignment اجرا کنیم تا داده از
          بروکرهای قدیمی به آن منتقل شود.
        </>
      ),
    },
    {
      ...base,
      phase: 'plan',
      planVisible: true,
      caption: (
        <>
          طرح reassignment ساخته شد: replicaهای <Ltr className="font-mono">orders-0</Ltr>{' '}
          از <Ltr className="font-mono">[1, 2, 3]</Ltr> به{' '}
          <Ltr className="font-mono">[2, 3, 4]</Ltr> تغییر می‌کنند. اولین عضو لیست،
          رهبر ترجیحی (<Ltr>preferred leader</Ltr>) است؛ پس بروکر{' '}
          <Ltr className="font-mono">2</Ltr> رهبر ترجیحی جدید می‌شود.
        </>
      ),
    },
    {
      ...base,
      phase: 'moving',
      copying: 4,
      planVisible: true,
      caption: (
        <>
          اجرای طرح با <Ltr>throttle</Ltr> شروع شد. بروکر{' '}
          <Ltr className="font-mono">4</Ltr> به‌عنوان follower از رهبر فعلی
          (بروکر <Ltr className="font-mono">1</Ltr>) داده را می‌گیرد. تا وقتی عقب
          است در <Ltr>ISR</Ltr> نیست و مجموعه replicaهای رسمی هنوز{' '}
          <Ltr className="font-mono">[1, 2, 3]</Ltr> است.
        </>
      ),
    },
    {
      ...base,
      phase: 'moving',
      copying: 4,
      isr: [1, 2, 3, 4],
      planVisible: true,
      caption: (
        <>
          بروکر <Ltr className="font-mono">4</Ltr> به آخرین آفست رهبر رسید و وارد{' '}
          <Ltr>ISR</Ltr> شد: <Ltr className="font-mono">[1, 2, 3, 4]</Ltr>. کافکا
          هنوز کپی را تمام‌شده اعلام نکرده؛ فقط می‌داند نسخه چهارم همگام است.
        </>
      ),
    },
    {
      ...base,
      phase: 'done',
      replicas: [2, 3, 4],
      leader: 2,
      isr: [2, 3, 4],
      planVisible: true,
      caption: (
        <>
          reassignment کامل شد: replicaها <Ltr className="font-mono">[2, 3, 4]</Ltr>{' '}
          شدند و بروکر <Ltr className="font-mono">1</Ltr> از مجموعه حذف شد. چون
          رهبر قبلی دیگر عضو مجموعه نیست، رهبری به بروکر{' '}
          <Ltr className="font-mono">2</Ltr> منتقل شد.
        </>
      ),
    },
    {
      ...base,
      phase: 'done',
      replicas: [2, 3, 4],
      leader: 2,
      isr: [2, 3, 4],
      planVisible: true,
      verifyVisible: true,
      caption: (
        <>
          با <Ltr className="font-mono">--verify</Ltr> وضعیت را می‌بینیم: هر
          پارتیشن <Ltr>Completed</Ltr> است. داده روی بروکر{' '}
          <Ltr className="font-mono">4</Ltr> هم وجود دارد و بروکر{' '}
          <Ltr className="font-mono">1</Ltr> دیگر replica این پارتیشن نیست.
        </>
      ),
    },
    {
      ...base,
      phase: 'done',
      replicas: [2, 3, 4],
      leader: 2,
      isr: [2, 3, 4],
      planVisible: true,
      verifyVisible: true,
      caption: (
        <>
          رهبر فعلی بروکر <Ltr className="font-mono">2</Ltr> است و اولین عضو
          replicaها هم <Ltr className="font-mono">2</Ltr> است؛ پس{' '}
          <Ltr>preferred leader election</Ltr> تغییری ایجاد نمی‌کند. اگر رهبر روی
          عضو دوم یا سوم بود، همین دستور آن را به عضو اول برمی‌گرداند.
        </>
      ),
    },
    {
      ...base,
      phase: 'done',
      replicas: [2, 3, 4],
      leader: 2,
      isr: [2, 3, 4],
      planVisible: true,
      verifyVisible: true,
      caption: (
        <>
          قاعده کلی: reassignment مجموعه replicaها را جابه‌جا می‌کند،{' '}
          <Ltr>throttle</Ltr> سرعت کپی را کنترل می‌کند، و{' '}
          <Ltr>preferred leader election</Ltr> فقط رهبری را به عضو اول لیست
          برمی‌گرداند. تا پایان کپی، <Ltr>ISR</Ltr> و ظرفیت بروکرها را زیر نظر
          بگیرید.
        </>
      ),
    },
  ]
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

function boxClass(mark?: Mark): string {
  switch (mark) {
    case 'ok':
      return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
    case 'acc':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    case 'no':
      return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/60 dark:stroke-rose-500'
    default:
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

function brokerMark(snapshot: Snapshot, broker: number): Mark | undefined {
  if (snapshot.copying === broker) return 'acc'
  if (snapshot.leader === broker) return 'acc'
  if (snapshot.isr.includes(broker)) return 'ok'
  if (snapshot.phase === 'done' && broker === 1) return 'no'
  return undefined
}

const BROKER_X = (index: number) => 16 + index * 160
const BROKER_WIDTH = 140
const BROKER_Y = 44
const BROKER_HEIGHT = 250

export function PartitionReassignmentExplainer() {
  const [step, setStep] = useState(0)
  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const brokers = snapshot.broker4 ? [1, 2, 3, 4] : [1, 2, 3]

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
            reassignment چطور یک پارتیشن را به بروکر تازه منتقل می‌کند؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
          startIcon={<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          گام قبل
        </Button>
        <Button
          size="sm"
          onClick={() => goTo(step + 1)}
          disabled={isLast}
          startIcon={<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          گام بعد
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
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step + 1}
          aria-label="پیشرفت توضیح reassignment"
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-300 motion-reduce:transition-none dark:bg-primary-400"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-3 min-h-[7rem] rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
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
          viewBox="0 0 660 360"
          role="img"
          aria-label="انتقال پارتیشن orders-0 از بروکرهای ۱، ۲ و ۳ به بروکرهای ۲، ۳ و ۴ همراه با وضعیت ISR"
          className="h-auto w-full min-w-[560px]"
        >
          <text
            x={330}
            y={22}
            textAnchor="middle"
            fontSize={13}
            fontWeight={600}
            className="fill-slate-700 dark:fill-slate-200"
          >
            orders-0 · replicas {`[${snapshot.replicas.join(', ')}]`}
          </text>

          {brokers.map((broker, index) => {
            const x = BROKER_X(index)
            const hasReplica = snapshot.replicas.includes(broker)
            const inIsr = snapshot.isr.includes(broker)
            const isLeader = snapshot.leader === broker
            const isCopying = snapshot.copying === broker
            const mark = brokerMark(snapshot, broker)

            return (
              <g key={broker}>
                <rect
                  x={x}
                  y={BROKER_Y}
                  width={BROKER_WIDTH}
                  height={BROKER_HEIGHT}
                  rx={8}
                  className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                    mark,
                  )}`}
                  strokeWidth={isLeader ? 2.5 : 1.2}
                />
                <text
                  x={x + BROKER_WIDTH / 2}
                  y={BROKER_Y + 22}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={700}
                  className="fill-slate-800 dark:fill-slate-100"
                >
                  Broker {broker}
                </text>

                {hasReplica ? (
                  <>
                    <rect
                      x={x + 14}
                      y={BROKER_Y + 38}
                      width={BROKER_WIDTH - 28}
                      height={34}
                      rx={5}
                      className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-600"
                      strokeWidth={1}
                    />
                    <text
                      x={x + BROKER_WIDTH / 2}
                      y={BROKER_Y + 60}
                      textAnchor="middle"
                      fontSize={11}
                      className="fill-slate-800 font-mono dark:fill-slate-200"
                    >
                      orders-0
                    </text>
                    <text
                      x={x + BROKER_WIDTH / 2}
                      y={BROKER_Y + 92}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      className={
                        isLeader
                          ? 'fill-primary-600 dark:fill-primary-300'
                          : 'fill-slate-500 dark:fill-slate-400'
                      }
                    >
                      {isLeader ? 'leader' : 'follower'}
                    </text>
                  </>
                ) : (
                  <text
                    x={x + BROKER_WIDTH / 2}
                    y={BROKER_Y + 60}
                    textAnchor="middle"
                    fontSize={11}
                    className="fill-slate-400 dark:fill-slate-500"
                  >
                    خالی
                  </text>
                )}

                {isCopying && (
                  <text
                    x={x + BROKER_WIDTH / 2}
                    y={BROKER_Y + 112}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={600}
                    className="fill-amber-600 dark:fill-amber-400"
                  >
                    copying…
                  </text>
                )}

                {inIsr && (
                  <>
                    <rect
                      x={x + 38}
                      y={BROKER_Y + 126}
                      width={64}
                      height={22}
                      rx={11}
                      className="fill-emerald-100 dark:fill-emerald-950/70"
                    />
                    <text
                      x={x + BROKER_WIDTH / 2}
                      y={BROKER_Y + 141}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={700}
                      className="fill-emerald-700 dark:fill-emerald-300"
                    >
                      in ISR
                    </text>
                  </>
                )}

                {snapshot.phase === 'done' && broker === 1 && (
                  <text
                    x={x + BROKER_WIDTH / 2}
                    y={BROKER_Y + 112}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={600}
                    className="fill-rose-600 dark:fill-rose-400"
                  >
                    removed
                  </text>
                )}
              </g>
            )
          })}

          {snapshot.copying !== null && (
            <g>
              <path
                d={`M${BROKER_X(0) + BROKER_WIDTH / 2} ${
                  BROKER_Y + BROKER_HEIGHT - 18
                } C${BROKER_X(0) + BROKER_WIDTH / 2} ${
                  BROKER_Y + BROKER_HEIGHT + 18
                } ${BROKER_X(3) + BROKER_WIDTH / 2} ${
                  BROKER_Y + BROKER_HEIGHT + 18
                } ${BROKER_X(3) + BROKER_WIDTH / 2} ${
                  BROKER_Y + BROKER_HEIGHT - 18
                }`}
                fill="none"
                strokeDasharray="5 4"
                strokeWidth={2}
                className="stroke-primary-500 dark:stroke-primary-400"
              />
              <text
                x={330}
                y={BROKER_Y + BROKER_HEIGHT + 34}
                textAnchor="middle"
                fontSize={10}
                className="fill-primary-600 dark:fill-primary-300"
              >
                fetch + throttle
              </text>
            </g>
          )}

          {snapshot.planVisible && (
            <g>
              <rect
                x={16}
                y={316}
                width={628}
                height={30}
                rx={6}
                className="fill-slate-100 stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700"
                strokeWidth={1}
              />
              <text
                x={30}
                y={336}
                fontSize={11}
                className="fill-slate-700 font-mono dark:fill-slate-200"
              >
                plan: replicas [2, 3, 4]
              </text>
              {snapshot.verifyVisible && (
                <text
                  x={630}
                  y={336}
                  textAnchor="end"
                  fontSize={11}
                  fontWeight={700}
                  className="fill-emerald-600 dark:fill-emerald-400"
                >
                  verify: Completed
                </text>
              )}
            </g>
          )}
        </svg>
      </div>

      <p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
        برای خوانایی، فقط یک پارتیشن و چهار بروکر نشان داده شده است. ترتیب مراحل،
        معنی <Ltr>ISR</Ltr> و رفتار <Ltr>throttle</Ltr> همان چیزی است که در
        reassignment واقعی کافکا رخ می‌دهد.
      </p>
    </div>
  )
}
