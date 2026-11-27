import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { toPersianDigits } from '../../utils/persianDigits'

type Mark = 'ok' | 'acc' | 'no' | 'idle'

interface Snapshot {
  caption: string
  txOpen: boolean
  orderRow: boolean
  outboxRow: boolean
  outboxStatus: 'none' | 'unpublished' | 'published'
  relayState: 'idle' | 'reading' | 'publishing' | 'done'
  topicRecord: boolean
  readModel: boolean
  crashed: boolean
}

const SNAPSHOTS: Snapshot[] = [
  {
    caption:
      'سرویس سفارش درخواست ثبت order-1042 را دریافت کرده است. هنوز چیزی در دیتابیس یا کافکا نوشته نشده؛ فقط یک قصد برای ثبت داریم.',
    txOpen: false,
    orderRow: false,
    outboxRow: false,
    outboxStatus: 'none',
    relayState: 'idle',
    topicRecord: false,
    readModel: false,
    crashed: false,
  },
  {
    caption:
      'سرویس یک تراکنش دیتابیس باز می‌کند. هر نوشته‌ای تا COMMIT برای بقیه نامرئی است و اگر خطایی رخ دهد کامل برمی‌گردد.',
    txOpen: true,
    orderRow: false,
    outboxRow: false,
    outboxStatus: 'none',
    relayState: 'idle',
    topicRecord: false,
    readModel: false,
    crashed: false,
  },
  {
    caption:
      'ردیف سفارش در جدول orders نوشته می‌شود: order-1042 با وضعیت created. این نوشته هنوز commit نشده است.',
    txOpen: true,
    orderRow: true,
    outboxRow: false,
    outboxStatus: 'none',
    relayState: 'idle',
    topicRecord: false,
    readModel: false,
    crashed: false,
  },
  {
    caption:
      'در همان تراکنش، یک ردیف هم در جدول outbox نوشته می‌شود که رویداد OrderCreated را در خود دارد. اینجا ترفند اصلی شکل می‌گیرد.',
    txOpen: true,
    orderRow: true,
    outboxRow: true,
    outboxStatus: 'unpublished',
    relayState: 'idle',
    topicRecord: false,
    readModel: false,
    crashed: false,
  },
  {
    caption:
      'COMMIT اجرا می‌شود. سفارش و ردیف outbox با هم و اتمیک پایدار می‌شوند؛ یا هر دو هستند یا هیچ‌کدام. نوشتن دوگانه حذف شد.',
    txOpen: false,
    orderRow: true,
    outboxRow: true,
    outboxStatus: 'unpublished',
    relayState: 'idle',
    topicRecord: false,
    readModel: false,
    crashed: false,
  },
  {
    caption:
      'یک فرایند relay جدا (مثلاً Debezium یا یک poller) ردیف‌های منتشرنشده outbox را می‌خواند و ردیف order-1042 را برمی‌دارد.',
    txOpen: false,
    orderRow: true,
    outboxRow: true,
    outboxStatus: 'unpublished',
    relayState: 'reading',
    topicRecord: false,
    readModel: false,
    crashed: false,
  },
  {
    caption:
      'relay رویداد را به تاپیک orders.events می‌فرستد و کافکا آن را با offset 0 می‌نویسد.',
    txOpen: false,
    orderRow: true,
    outboxRow: true,
    outboxStatus: 'unpublished',
    relayState: 'publishing',
    topicRecord: true,
    readModel: false,
    crashed: false,
  },
  {
    caption:
      'پس از تأیید کافکا، relay ردیف outbox را published علامت می‌زند. اگر این علامت‌گذاری دیر شود، رویداد دوباره فرستاده می‌شود.',
    txOpen: false,
    orderRow: true,
    outboxRow: true,
    outboxStatus: 'published',
    relayState: 'done',
    topicRecord: true,
    readModel: false,
    crashed: false,
  },
  {
    caption:
      'مصرف‌کننده رویداد OrderCreated را می‌خواند و مدل خواندنی (read model) را به‌روز می‌کند؛ حالا order-1042 در نمای سفارش‌ها دیده می‌شود.',
    txOpen: false,
    orderRow: true,
    outboxRow: true,
    outboxStatus: 'published',
    relayState: 'done',
    topicRecord: true,
    readModel: true,
    crashed: false,
  },
  {
    caption:
      'اگر relay بین publish و علامت‌گذاری از کار بیفتد، ردیف منتشرنشده می‌ماند و بعد از راه‌اندازی دوباره فرستاده می‌شود. نتیجه تحویل at-least-once است، نه گم‌شدن.',
    txOpen: false,
    orderRow: true,
    outboxRow: true,
    outboxStatus: 'unpublished',
    relayState: 'idle',
    topicRecord: true,
    readModel: true,
    crashed: true,
  },
  {
    caption:
      'چون ممکن است یک رویداد دوبار برسد، مصرف‌کننده باید idempotent باشد: با کلید یکتا یا upsert، پردازش دوباره همان نتیجه را بدهد.',
    txOpen: false,
    orderRow: true,
    outboxRow: true,
    outboxStatus: 'published',
    relayState: 'done',
    topicRecord: true,
    readModel: true,
    crashed: false,
  },
  {
    caption:
      'قاعده کلی: نوشتن در دیتابیس و انتشار رویداد را در یک تراکنش با outbox همراه کنید و انتشار را به یک relay بسپارید؛ این مطمئن‌ترین راه پرهیز از نوشتن دوگانه است.',
    txOpen: false,
    orderRow: true,
    outboxRow: true,
    outboxStatus: 'published',
    relayState: 'done',
    topicRecord: true,
    readModel: true,
    crashed: false,
  },
]

const TOTAL_STEPS = SNAPSHOTS.length

function boxClass(mark: Mark): string {
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

export function OutboxPatternExplainer() {
  const [step, setStep] = useState(0)
  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1

  function goTo(nextStep: number) {
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, nextStep)))
  }

  const orderMark: Mark = snapshot.orderRow ? 'ok' : snapshot.txOpen ? 'acc' : 'idle'
  const outboxMark: Mark = !snapshot.outboxRow
    ? snapshot.txOpen
      ? 'acc'
      : 'idle'
    : snapshot.outboxStatus === 'published'
      ? 'ok'
      : 'acc'
  const relayMark: Mark = snapshot.crashed
    ? 'no'
    : snapshot.relayState === 'idle'
      ? 'idle'
      : 'acc'
  const topicMark: Mark = snapshot.topicRecord ? 'ok' : 'idle'
  const readMark: Mark = snapshot.readModel ? 'ok' : 'idle'

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            الگوی Outbox چطور نوشتن دوگانه را حذف می‌کند؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </Badge>
      </div>

      <div
        dir="ltr"
        className="mt-4 flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-[12px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300"
      >
        <span>service: orders</span>
        <span>db: orders_db</span>
        <span>topic: orders.events</span>
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
        <div className="relative flex h-6 w-full items-center">
          <div
            className="absolute inset-x-0 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"
            aria-hidden="true"
          />
          <div
            className="absolute h-1.5 rounded-full bg-primary-500 transition-[width] duration-300 motion-reduce:transition-none dark:bg-primary-400"
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
          viewBox="0 0 760 360"
          role="img"
          aria-label="نوشتن سفارش و ردیف outbox در یک تراکنش، انتشار رویداد به تاپیک orders.events توسط relay و به‌روزرسانی مدل خواندنی"
          className="h-auto w-full min-w-[680px]"
        >
          <text x={124} y={30} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            orders_db
          </text>
          <text x={328} y={30} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            relay
          </text>
          <text x={518} y={30} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            orders.events
          </text>
          <text x={700} y={30} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            read model
          </text>

          <rect x={12} y={44} width={224} height={300} rx={12} className="fill-transparent stroke-slate-200 dark:stroke-slate-800" />
          <rect x={268} y={44} width={120} height={300} rx={12} className="fill-transparent stroke-slate-200 dark:stroke-slate-800" />
          <rect x={420} y={44} width={196} height={300} rx={12} className="fill-transparent stroke-slate-200 dark:stroke-slate-800" />
          <rect x={648} y={44} width={100} height={300} rx={12} className="fill-transparent stroke-slate-200 dark:stroke-slate-800" />

          {snapshot.txOpen && (
            <rect
              x={22}
              y={70}
              width={204}
              height={214}
              rx={10}
              strokeDasharray="6 4"
              className="fill-transparent stroke-primary-400 dark:stroke-primary-500"
            />
          )}
          <text x={224} y={64} textAnchor="end" fontSize={9} className="fill-slate-500 dark:fill-slate-400">
            {snapshot.txOpen ? 'tx open' : snapshot.orderRow ? 'tx committed' : 'idle'}
          </text>

          <rect x={28} y={84} width={192} height={62} rx={8} className={boxClass(orderMark)} />
          <text x={40} y={102} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            orders
          </text>
          <text x={40} y={124} fontSize={11} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            {snapshot.orderRow ? 'order-1042 · created' : '—'}
          </text>

          <rect x={28} y={166} width={192} height={104} rx={8} className={boxClass(outboxMark)} />
          <text x={40} y={184} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            outbox
          </text>
          <text x={40} y={204} fontSize={11} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            {snapshot.outboxRow ? 'OrderCreated' : '—'}
          </text>
          <text x={40} y={224} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            order-1042
          </text>
          <text x={40} y={248} fontSize={10} fontWeight={600} className="fill-slate-700 dark:fill-slate-200">
            {snapshot.outboxStatus === 'none'
              ? '—'
              : snapshot.outboxStatus === 'unpublished'
                ? 'unpublished'
                : 'published'}
          </text>

          <rect x={282} y={104} width={92} height={78} rx={8} className={boxClass(relayMark)} />
          <text x={328} y={132} textAnchor="middle" fontSize={11} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            relay
          </text>
          <text x={328} y={152} textAnchor="middle" fontSize={9} className="fill-slate-600 dark:fill-slate-300">
            {snapshot.crashed
              ? 'crashed'
              : snapshot.relayState === 'idle'
                ? 'waiting'
                : snapshot.relayState === 'reading'
                  ? 'reading row'
                  : snapshot.relayState === 'publishing'
                    ? 'publishing'
                    : 'marked sent'}
          </text>

          <rect x={436} y={104} width={164} height={78} rx={8} className={boxClass(topicMark)} />
          <text x={448} y={122} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            offset 0
          </text>
          <text x={448} y={144} fontSize={11} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            {snapshot.topicRecord ? 'OrderCreated' : '—'}
          </text>
          <text x={448} y={164} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            order-1042
          </text>

          <rect x={660} y={104} width={76} height={78} rx={8} className={boxClass(readMark)} />
          <text x={698} y={132} textAnchor="middle" fontSize={10} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            orders
          </text>
          <text x={698} y={152} textAnchor="middle" fontSize={9} className="fill-slate-600 dark:fill-slate-300">
            {snapshot.readModel ? 'order-1042' : '—'}
          </text>

          <line
            x1={222}
            y1={218}
            x2={282}
            y2={150}
            strokeDasharray="5 4"
            strokeWidth={snapshot.relayState === 'reading' ? 2.5 : 1.5}
            className={
              snapshot.relayState === 'reading'
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-slate-300 dark:stroke-slate-600'
            }
          />
          <line
            x1={374}
            y1={143}
            x2={436}
            y2={143}
            strokeDasharray="5 4"
            strokeWidth={snapshot.relayState === 'publishing' ? 2.5 : 1.5}
            className={
              snapshot.relayState === 'publishing'
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-slate-300 dark:stroke-slate-600'
            }
          />
          <line
            x1={600}
            y1={143}
            x2={660}
            y2={143}
            strokeDasharray="5 4"
            strokeWidth={snapshot.readModel ? 2.5 : 1.5}
            className={
              snapshot.readModel
                ? 'stroke-primary-500 dark:stroke-primary-400'
                : 'stroke-slate-300 dark:stroke-slate-600'
            }
          />

          <text x={252} y={200} textAnchor="middle" fontSize={9} className="fill-slate-500 dark:fill-slate-400">
            poll
          </text>
          <text x={405} y={132} textAnchor="middle" fontSize={9} className="fill-slate-500 dark:fill-slate-400">
            send
          </text>
          <text x={630} y={132} textAnchor="middle" fontSize={9} className="fill-slate-500 dark:fill-slate-400">
            consume
          </text>
        </svg>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
        نمودار را افقی بکشید. یک سفارش و یک ردیف outbox نمایش داده شده‌اند؛ منطق با الگوی واقعی Outbox یکی است.
      </p>
    </div>
  )
}
