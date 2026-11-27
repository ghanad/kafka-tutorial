import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { toPersianDigits } from '../../utils/persianDigits'

interface Consumer {
  name: string
  role: string
}

const CONSUMERS: Consumer[] = [
  { name: 'سرویس انبار', role: 'کسر موجودی' },
  { name: 'پرداخت و فاکتور', role: 'ثبت سند مالی' },
  { name: 'سامانه پیامک', role: 'ارسال SMS' },
  { name: 'تحلیل دسته‌ای', role: 'Data Lake' },
]

type ConsumerStatus = 'idle' | 'read' | 'offline' | 'replay'

interface Snapshot {
  produced: boolean
  statuses: ConsumerStatus[]
  active: number
  caption: string
}

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: Snapshot = {
    produced: false,
    statuses: ['idle', 'idle', 'idle', 'idle'],
    active: -1,
    caption: '',
  }

  const push = (caption: string, patch: Partial<Snapshot> = {}) => {
    state = { ...state, active: -1, ...patch }
    snapshots.push({ ...state, caption, statuses: [...state.statuses] })
  }

  push('هنوز سفارشی ثبت نشده است. topic orders یک پارتیشن دارد و هیچ رکوردی در آن نیست.')
  push(
    'سرویس سفارش یک رکورد OrderCreated برای سفارش ۱۰۴۲ در topic orders، partition 0 و offset 0 می‌نویسد و بلافاصله به کاربر پاسخ می‌دهد.',
    { produced: true },
  )
  push(
    'سرویس انبار رکورد offset 0 را می‌خواند و موجودی را کم می‌کند. نشانک خودش را جلو می‌برد؛ رکورد برای بقیه باقی می‌ماند.',
    { statuses: ['read', 'idle', 'idle', 'idle'], active: 0 },
  )
  push(
    'سرویس پرداخت هم همان offset 0 را مستقل می‌خواند. دو مصرف‌کننده یک رکورد را بدون تداخل خواندند.',
    { statuses: ['read', 'read', 'idle', 'idle'], active: 1 },
  )
  push(
    'سامانه پیامک از دسترس خارج می‌شود. خرید کاربر شکست نمی‌خورد؛ رکورد روی دیسک منتظر می‌ماند.',
    { statuses: ['read', 'read', 'offline', 'idle'], active: 2 },
  )
  push(
    'پیامک دوباره بالا می‌آید و از نشانک خودش (offset 0) می‌خواند و SMS را می‌فرستد. تأخیر داشت، ولی داده گم نشد.',
    { statuses: ['read', 'read', 'read', 'idle'], active: 2 },
  )
  push(
    'سرویس تحلیل دسته‌ای ساعتی بعد همان رکورد را می‌خواند. هر مصرف‌کننده با سرعت خودش جلو می‌رود.',
    { statuses: ['read', 'read', 'read', 'read'], active: 3 },
  )
  push(
    'سرویس انبار برای بازسازی وضعیت، نشانکش را به offset 0 برمی‌گرداند و دوباره می‌خواند. بازپخش بدون تأثیر روی بقیه.',
    { statuses: ['replay', 'read', 'read', 'read'], active: 0 },
  )
  push(
    'قانون کلی: تولیدکننده فقط می‌نویسد و نمی‌داند چه کسی می‌خواند؛ هر مصرف‌کننده نشانک مستقل دارد؛ قطعی یا کندی یکی، بقیه را متوقف نمی‌کند.',
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const CONSUMER_TOP = (index: number) => 18 + index * 72

function consumerFill(status: ConsumerStatus): string {
  switch (status) {
    case 'read':
      return 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/40 dark:stroke-emerald-500'
    case 'offline':
      return 'fill-amber-50 stroke-amber-400 dark:fill-amber-950/40 dark:stroke-amber-500'
    case 'replay':
      return 'fill-primary-50 stroke-primary-400 dark:fill-primary-950/40 dark:stroke-primary-500'
    default:
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

function statusText(status: ConsumerStatus): string {
  switch (status) {
    case 'read':
      return 'خواند offset 0'
    case 'offline':
      return 'آفلاین (قطعی سرویس)'
    case 'replay':
      return 'بازپخش از offset 0'
    default:
      return 'منتظر'
  }
}

export function UseCaseFlowExplainer() {
  const [step, setStep] = useState(0)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1

  const goTo = (next: number) => {
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, next)))
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            یک سفارش چطور بدون وابستگی سرویس‌ها به همه می‌رسد؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </Badge>
      </div>

      <div
        dir="ltr"
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-start font-mono text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400"
      >
        <span>
          topic:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">orders</span>
        </span>
        <span>
          partition:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">0</span>
        </span>
        <span>
          event:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">OrderCreated</span>
        </span>
      </div>

      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step + 1}
          aria-label="پیشرفت توضیح تعاملی"
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-300 motion-reduce:transition-none dark:bg-primary-400"
            style={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
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
          <span className="ms-auto text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
          </span>
        </div>
      </div>

      <div
        aria-live="polite"
        className="mt-2.5 rounded-xl border border-slate-200 border-s-4 border-s-primary-500 bg-white p-3 dark:border-slate-800 dark:border-s-primary-400"
      >
        <p className="m-0 text-[13px] leading-7 text-slate-700 dark:text-slate-300">
          {snapshot.caption}
        </p>
      </div>

      <div
        dir="ltr"
        className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-800 dark:bg-slate-950/40"
      >
        <svg
          viewBox="0 0 720 320"
          role="img"
          aria-label="جریان یک سفارش از سرویس سفارش به تاپیک کافکا و سپس به چهار مصرف‌کننده مستقل"
          className="h-auto w-full min-w-[620px]"
        >
          <defs>
            <marker
              id="usecase-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" className="fill-slate-400 dark:fill-slate-500" />
            </marker>
          </defs>

          {/* Producer */}
          <g>
            <rect
              x={10}
              y={110}
              width={150}
              height={90}
              rx={12}
              className="fill-primary-50 stroke-primary-400 dark:fill-primary-950/40 dark:stroke-primary-500"
              strokeWidth={1.5}
            />
            <text x={85} y={140} textAnchor="middle" fontSize={12} fontWeight={700} className="fill-primary-900 dark:fill-primary-100">
              سرویس سفارش
            </text>
            <text x={85} y={158} textAnchor="middle" fontSize={10} className="fill-primary-700 font-mono dark:fill-primary-300">
              order-service
            </text>
            <text x={85} y={182} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">
              Producer
            </text>
          </g>

          <path
            d="M 160 155 L 206 155"
            fill="none"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            markerEnd="url(#usecase-arrow)"
            className="stroke-slate-400 dark:stroke-slate-500"
          />

          {/* Kafka topic */}
          <g>
            <rect
              x={210}
              y={50}
              width={170}
              height={210}
              rx={14}
              className="fill-amber-50/80 stroke-amber-400 dark:fill-slate-900 dark:stroke-amber-500"
              strokeWidth={1.8}
            />
            <text x={295} y={76} textAnchor="middle" fontSize={12} fontWeight={700} className="fill-amber-950 dark:fill-amber-100">
              topic: orders
            </text>
            <text x={295} y={94} textAnchor="middle" fontSize={10} className="fill-amber-800 font-mono dark:fill-amber-300">
              partition 0
            </text>
            <rect
              x={230}
              y={118}
              width={130}
              height={62}
              rx={8}
              className={
                snapshot.produced
                  ? 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
                  : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
              }
              strokeWidth={1.5}
            />
            {snapshot.produced ? (
              <>
                <text x={295} y={140} textAnchor="middle" fontSize={10} className="fill-slate-500 font-mono dark:fill-slate-400">
                  offset 0
                </text>
                <text x={295} y={160} textAnchor="middle" fontSize={11} fontWeight={700} className="fill-slate-800 dark:fill-slate-100">
                  OrderCreated ۱۰۴۲
                </text>
              </>
            ) : (
              <text x={295} y={152} textAnchor="middle" fontSize={11} className="fill-slate-400 dark:fill-slate-500">
                خالی
              </text>
            )}
            <text x={295} y={236} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">
              append-only log
            </text>
          </g>

          {/* Connectors Kafka → consumers */}
          {CONSUMERS.map((_, index) => {
            const y = CONSUMER_TOP(index) + 28
            const active = snapshot.active === index
            return (
              <path
                key={`connector-${index}`}
                d={`M 380 155 C 405 155 405 ${y} 428 ${y}`}
                fill="none"
                strokeDasharray="4 3"
                strokeWidth={active ? 2.5 : 1.2}
                className={
                  active
                    ? 'stroke-primary-500 dark:stroke-primary-400'
                    : 'stroke-slate-300 dark:stroke-slate-600'
                }
              />
            )
          })}

          {/* Consumers */}
          {CONSUMERS.map((consumer, index) => {
            const status = snapshot.statuses[index]
            const active = snapshot.active === index
            const y = CONSUMER_TOP(index)
            return (
              <g key={consumer.name}>
                <rect
                  x={430}
                  y={y}
                  width={280}
                  height={56}
                  rx={10}
                  strokeWidth={active ? 2 : 1.2}
                  className={`transition-colors duration-300 motion-reduce:transition-none ${consumerFill(status)}`}
                />
                <text x={446} y={y + 22} fontSize={12} fontWeight={700} className="fill-slate-900 dark:fill-white">
                  {consumer.name}
                </text>
                <text x={446} y={y + 40} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
                  {consumer.role}
                </text>
                <text
                  x={694}
                  y={y + 34}
                  textAnchor="end"
                  fontSize={10}
                  fontWeight={600}
                  className={
                    status === 'read'
                      ? 'fill-emerald-700 dark:fill-emerald-300'
                      : status === 'offline'
                        ? 'fill-amber-700 dark:fill-amber-300'
                        : status === 'replay'
                          ? 'fill-primary-700 dark:fill-primary-300'
                          : 'fill-slate-400 dark:fill-slate-500'
                  }
                >
                  {statusText(status)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، یک سفارش و چهار مصرف‌کننده نمایش داده شده است؛ منطق همان
        چیزی است که کافکا اجرا می‌کند: نوشتن مستقل از خواندن، نشانک جداگانه برای
        هر مصرف‌کننده، و بازپخش بدون حذف داده.
      </p>
    </div>
  )
}
