import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { toPersianDigits } from '../../utils/persianDigits'

type Mark = 'ok' | 'acc' | 'no' | 'idle'
type Mode = 'customerId' | 'orderId'

interface Snapshot {
  caption: string
  visibleCount: number
  mode: Mode
  hiPartition: number | null
  splitCustomer: boolean
}

interface Record {
  offset: string
  key: string
  customer: string
  customerPartition: number
  orderPartition: number
}

const RECORDS: Record[] = [
  { offset: '0', key: 'order-9001', customer: 'customer-101', customerPartition: 2, orderPartition: 0 },
  { offset: '1', key: 'order-9002', customer: 'customer-102', customerPartition: 5, orderPartition: 1 },
  { offset: '2', key: 'order-9003', customer: 'customer-101', customerPartition: 2, orderPartition: 2 },
  { offset: '3', key: 'order-9004', customer: 'customer-103', customerPartition: 0, orderPartition: 3 },
  { offset: '4', key: 'order-9005', customer: 'customer-101', customerPartition: 2, orderPartition: 4 },
  { offset: '5', key: 'order-9006', customer: 'customer-104', customerPartition: 3, orderPartition: 5 },
]

const PARTITION_COUNT = 6

const SNAPSHOTS: Snapshot[] = [
  {
    caption:
      'تاپیک orders.events با ۶ پارتیشن خالی است. می‌خواهیم Key را customerId بگذاریم تا رویدادهای هر مشتری ترتیب داشته باشند.',
    visibleCount: 0,
    mode: 'customerId',
    hiPartition: null,
    splitCustomer: false,
  },
  {
    caption:
      'رکورد اول customer-101 می‌رسد؛ hash(key) آن را به پارتیشن ۲ می‌فرستد و offset 0 همان‌جا نوشته می‌شود.',
    visibleCount: 1,
    mode: 'customerId',
    hiPartition: 2,
    splitCustomer: false,
  },
  {
    caption:
      'customer-102 به پارتیشن ۵ می‌رود. تا اینجا توزیع خوب به نظر می‌رسد و دو پارتیشن مختلف درگیر شده‌اند.',
    visibleCount: 2,
    mode: 'customerId',
    hiPartition: 5,
    splitCustomer: false,
  },
  {
    caption:
      'رکورد سوم هم از customer-101 است و دوباره به پارتیشن ۲ می‌رود. همین‌جا نشانه مشکل پیدا می‌شود.',
    visibleCount: 3,
    mode: 'customerId',
    hiPartition: 2,
    splitCustomer: false,
  },
  {
    caption:
      'customer-103 به پارتیشن ۰ و customer-104 به پارتیشن ۳ می‌رود. چهار پارتیشن از شش پارتیشن درگیر شده‌اند.',
    visibleCount: 5,
    mode: 'customerId',
    hiPartition: 0,
    splitCustomer: false,
  },
  {
    caption:
      'رکورد ششم هم customer-101 است. پارتیشن ۲ حالا ۳ رکورد دارد، در حالی که پارتیشن‌های ۱ و ۴ کاملاً خالی‌اند.',
    visibleCount: 6,
    mode: 'customerId',
    hiPartition: 2,
    splitCustomer: false,
  },
  {
    caption:
      'اگر سه مصرف‌کننده داشته باشیم، پارتیشن ۲ که سنگین‌ترین است فقط به یکی می‌رسد؛ بقیه کمتر کار می‌کنند. این همان hot partition است.',
    visibleCount: 6,
    mode: 'customerId',
    hiPartition: 2,
    splitCustomer: false,
  },
  {
    caption:
      'راه اول: Key را پرکارتینال‌تر کنید. با Key = orderId، hash هر سفارش را پخش می‌کند: شش رکورد روی شش پارتیشن می‌نشیند و هیچ پارتیشنی داغ نمی‌ماند.',
    visibleCount: 6,
    mode: 'orderId',
    hiPartition: null,
    splitCustomer: false,
  },
  {
    caption:
      'قیمت این تعادل: سه رکورد customer-101 حالا در پارتیشن‌های ۰، ۲ و ۴ هستند. ترتیب رویدادهای یک مشتری دیگر تضمین نمی‌شود.',
    visibleCount: 6,
    mode: 'orderId',
    hiPartition: null,
    splitCustomer: true,
  },
  {
    caption:
      'اگر ترتیب هر مشتری اجباری است، Key = customerId را نگه دارید و فشار را با تعداد پارتیشن بیشتر یا مسیر جداگانه برای کلیدهای داغ مدیریت کنید.',
    visibleCount: 6,
    mode: 'customerId',
    hiPartition: 2,
    splitCustomer: false,
  },
  {
    caption:
      'قاعده کلی: Key را بر اساس نیاز ترتیب انتخاب کنید، تعداد پارتیشن را بر اساس موازی‌سازی، و توزیع را با متریک هر پارتیشن بسنجید. تعداد پارتیشن را می‌توان افزایش داد، اما کاهش آن بدون بازسازی تاپیک ممکن نیست.',
    visibleCount: 6,
    mode: 'customerId',
    hiPartition: null,
    splitCustomer: false,
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
      return 'fill-amber-50 stroke-amber-500 dark:fill-amber-950/60 dark:stroke-amber-500'
    default:
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

export function TopicDesignExplainer() {
  const [step, setStep] = useState(0)
  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1

  function goTo(nextStep: number) {
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, nextStep)))
  }

  function partitionOf(record: Record): number {
    return snapshot.mode === 'customerId' ? record.customerPartition : record.orderPartition
  }

  const visibleRecords = RECORDS.slice(0, snapshot.visibleCount)
  const counts = Array.from({ length: PARTITION_COUNT }, (_, partition) =>
    visibleRecords.filter((record) => partitionOf(record) === partition).length,
  )

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            انتخاب Key چه اثری بر توزیع پارتیشن‌ها دارد؟
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
        <span>topic: orders.events</span>
        <span>partitions: 6</span>
        <span>key: {snapshot.mode === 'customerId' ? 'customerId' : 'orderId'}</span>
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
          viewBox="0 0 760 320"
          role="img"
          aria-label="توزیع شش رکورد روی شش پارتیشن تاپیک orders.events با Key برابر customerId و سپس orderId"
          className="h-auto w-full min-w-[680px]"
        >
          <text x={16} y={22} fontSize={11} fontWeight={700} className="fill-slate-700 dark:fill-slate-200">
            orders.events · {snapshot.mode === 'customerId' ? 'key = customerId' : 'key = orderId'}
          </text>

          {Array.from({ length: PARTITION_COUNT }, (_, partition) => {
            const x = 16 + partition * 122
            const records = visibleRecords.filter((record) => partitionOf(record) === partition)
            return (
              <g key={partition}>
                <rect x={x} y={38} width={110} height={252} rx={10} className="fill-transparent stroke-slate-200 dark:stroke-slate-800" />
                <text x={x + 55} y={58} textAnchor="middle" fontSize={11} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
                  p{partition}
                </text>
                <text x={x + 55} y={74} textAnchor="middle" fontSize={9} className="fill-slate-500 dark:fill-slate-400">
                  {counts[partition]} rec
                </text>
                {records.map((record, index) => {
                  const split =
                    snapshot.splitCustomer &&
                    record.customer === 'customer-101'
                  const chipMark: Mark = split ? 'no' : snapshot.hiPartition === partition ? 'acc' : 'ok'
                  return (
                    <g key={record.offset}>
                      <rect
                        x={x + 8}
                        y={88 + index * 46}
                        width={94}
                        height={38}
                        rx={7}
                        className={boxClass(chipMark)}
                      />
                      <text x={x + 16} y={103 + index * 46} fontSize={8} className="fill-slate-500 dark:fill-slate-400">
                        offset {record.offset}
                      </text>
                      <text x={x + 16} y={118 + index * 46} fontSize={9} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
                        {record.customer}
                      </text>
                    </g>
                  )
                })}
                {records.length === 0 && (
                  <text x={x + 55} y={110} textAnchor="middle" fontSize={9} className="fill-slate-400 dark:fill-slate-500">
                    empty
                  </text>
                )}
              </g>
            )
          })}

          {snapshot.mode === 'customerId' && counts[2] >= 3 && (
            <text x={16 + 2 * 122 + 55} y={306} textAnchor="middle" fontSize={9} fontWeight={700} className="fill-amber-600 dark:fill-amber-400">
              hot partition
            </text>
          )}
          {snapshot.splitCustomer && (
            <text x={380} y={306} textAnchor="middle" fontSize={9} fontWeight={700} className="fill-amber-600 dark:fill-amber-400">
              customer-101 split across p0, p2, p4
            </text>
          )}
        </svg>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
        نمودار را افقی بکشید. شش رکورد نمایش داده شده‌اند و hash واقعی ساده‌سازی شده است؛ منطق توزیع با Kafka یکی است.
      </p>
    </div>
  )
}
