import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { toPersianDigits } from '../../utils/persianDigits'

type Mark = 'ok' | 'acc' | 'idle'

interface Snapshot {
  caption: string
  tableRows: number
  topicRows: number
  indexRows: number
  tableHi: number | null
  topicHi: number | null
  indexHi: number | null
  smtHi: boolean
  sourceActive: boolean
  sinkActive: boolean
}

const TABLE = [
  { id: '1', name: 'A' },
  { id: '2', name: 'B' },
  { id: '3', name: 'C' },
]

const TOPIC = [
  { offset: '0', key: '1', op: 'c' },
  { offset: '1', key: '2', op: 'c' },
  { offset: '2', key: '3', op: 'u' },
]

const INDEX = [
  { id: '1', name: 'A' },
  { id: '2', name: 'B' },
  { id: '3', name: 'C' },
]

const SNAPSHOTS: Snapshot[] = [
  {
    caption:
      'اتصال Source با حالت snapshot شروع می‌شود. جدول orders سه ردیف دارد، تاپیک pg.orders خالی است و ایندکس مقصد هم خالی است.',
    tableRows: 0,
    topicRows: 0,
    indexRows: 0,
    tableHi: null,
    topicHi: null,
    indexHi: null,
    smtHi: false,
    sourceActive: true,
    sinkActive: false,
  },
  {
    caption:
      'ردیف id=1 از جدول خوانده شد. Debezium آن را به یک رکورد CDC با پاکت before/after تبدیل کرد؛ چون رکورد جدید است، before خالی و after پر است.',
    tableRows: 1,
    topicRows: 0,
    indexRows: 0,
    tableHi: 0,
    topicHi: null,
    indexHi: null,
    smtHi: false,
    sourceActive: true,
    sinkActive: false,
  },
  {
    caption:
      'SMT با نام unwrap پاکت را باز کرد و فقط after را نگه داشت؛ رکورد تخت {id:1,...} آماده نوشتن در کافکا شد.',
    tableRows: 1,
    topicRows: 0,
    indexRows: 0,
    tableHi: null,
    topicHi: null,
    indexHi: null,
    smtHi: true,
    sourceActive: true,
    sinkActive: false,
  },
  {
    caption:
      'رکورد در تاپیک pg.orders پارتیشن 0 با offset 0 نوشته شد. تاپیک حالا یک رکورد دارد.',
    tableRows: 1,
    topicRows: 1,
    indexRows: 0,
    tableHi: null,
    topicHi: 0,
    indexHi: null,
    smtHi: false,
    sourceActive: true,
    sinkActive: false,
  },
  {
    caption:
      'ردیف id=2 هم خوانده و با offset 1 نوشته شد. Source connector موقعیت خودش را جدا نگه می‌دارد، نه در آفست تاپیک.',
    tableRows: 2,
    topicRows: 2,
    indexRows: 0,
    tableHi: 1,
    topicHi: 1,
    indexHi: null,
    smtHi: false,
    sourceActive: true,
    sinkActive: false,
  },
  {
    caption:
      'ردیف id=3 به‌روزرسانی شد. این بار پاکت CDC هم before و هم after دارد؛ SMT فقط after را عبور می‌دهد.',
    tableRows: 3,
    topicRows: 2,
    indexRows: 0,
    tableHi: 2,
    topicHi: null,
    indexHi: null,
    smtHi: true,
    sourceActive: true,
    sinkActive: false,
  },
  {
    caption:
      'رکورد به‌روزرسانی با offset 2 نوشته شد. تاپیک سه رکورد دارد و ترتیب تغییرات حفظ شده است.',
    tableRows: 3,
    topicRows: 3,
    indexRows: 0,
    tableHi: null,
    topicHi: 2,
    indexHi: null,
    smtHi: false,
    sourceActive: true,
    sinkActive: false,
  },
  {
    caption:
      'Sink connector از offset 0 می‌خواند و سند id=1 را در ایندکس مقصد می‌نویسد.',
    tableRows: 3,
    topicRows: 3,
    indexRows: 1,
    tableHi: null,
    topicHi: 0,
    indexHi: 0,
    smtHi: false,
    sourceActive: false,
    sinkActive: true,
  },
  {
    caption:
      'offset 1 خوانده شد و سند id=2 نوشته شد. Sink هم مثل هر consumer دیگری با گروه خودش پیشرفت را ذخیره می‌کند.',
    tableRows: 3,
    topicRows: 3,
    indexRows: 2,
    tableHi: null,
    topicHi: 1,
    indexHi: 1,
    smtHi: false,
    sourceActive: false,
    sinkActive: true,
  },
  {
    caption:
      'offset 2 خوانده شد و سند id=3 به‌روزرسانی شد. ایندکس مقصد حالا با جدول منبع همگام است.',
    tableRows: 3,
    topicRows: 3,
    indexRows: 3,
    tableHi: null,
    topicHi: 2,
    indexHi: 2,
    smtHi: false,
    sourceActive: false,
    sinkActive: true,
  },
  {
    caption:
      'قاعده کلی: Connect فقط داده را جابه‌جا می‌کند؛ هر connector آفست خودش را دارد، SMT روی هر رکورد مستقل اجرا می‌شود و هیچ منطق تجمیعی در کار نیست.',
    tableRows: 3,
    topicRows: 3,
    indexRows: 3,
    tableHi: null,
    topicHi: null,
    indexHi: null,
    smtHi: false,
    sourceActive: false,
    sinkActive: false,
  },
]

const TOTAL_STEPS = SNAPSHOTS.length

function boxClass(mark: Mark): string {
  switch (mark) {
    case 'ok':
      return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
    case 'acc':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    default:
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

function panelMark(visible: boolean, active: boolean): Mark {
  if (!visible) return 'idle'
  return active ? 'acc' : 'ok'
}

export function ConnectPipelineExplainer() {
  const [step, setStep] = useState(0)
  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1

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
            یک تغییر در دیتابیس چطور به ایندکس مقصد می‌رسد؟
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
        <span>source: pg-orders</span>
        <span>topic: pg.orders / p0</span>
        <span>sink: search-orders</span>
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
          viewBox="0 0 720 330"
          role="img"
          aria-label="مسیر یک تغییر از جدول دیتابیس به تاپیک کافکا و سپس ایندکس مقصد در یک خط لوله Kafka Connect"
          className="h-auto w-full min-w-[600px]"
        >
          <text x={114} y={30} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            PostgreSQL · orders
          </text>
          <text x={360} y={30} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            Kafka · pg.orders
          </text>
          <text x={606} y={30} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            Search · orders
          </text>

          <rect x={16} y={48} width={196} height={252} rx={12} className="fill-transparent stroke-slate-200 dark:stroke-slate-800" />
          <rect x={262} y={48} width={196} height={252} rx={12} className="fill-transparent stroke-slate-200 dark:stroke-slate-800" />
          <rect x={508} y={48} width={196} height={252} rx={12} className="fill-transparent stroke-slate-200 dark:stroke-slate-800" />

          {TABLE.map((row, index) => {
            const visible = index < snapshot.tableRows
            const mark = panelMark(visible, snapshot.tableHi === index)
            return (
              <g key={row.id}>
                <rect x={28} y={70 + index * 62} width={172} height={46} rx={8} className={boxClass(mark)} />
                <text x={44} y={99 + index * 62} fontSize={11} className="fill-slate-500 dark:fill-slate-400">
                  id
                </text>
                <text x={66} y={99 + index * 62} fontSize={13} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
                  {visible ? row.id : '—'}
                </text>
                <text x={120} y={99 + index * 62} fontSize={11} className="fill-slate-500 dark:fill-slate-400">
                  name
                </text>
                <text x={158} y={99 + index * 62} fontSize={13} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
                  {visible ? row.name : '—'}
                </text>
              </g>
            )
          })}

          {TOPIC.map((row, index) => {
            const visible = index < snapshot.topicRows
            const mark = panelMark(visible, snapshot.topicHi === index)
            return (
              <g key={row.offset}>
                <rect x={274} y={70 + index * 62} width={172} height={46} rx={8} className={boxClass(mark)} />
                <text x={290} y={99 + index * 62} fontSize={11} className="fill-slate-500 dark:fill-slate-400">
                  offset
                </text>
                <text x={330} y={99 + index * 62} fontSize={13} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
                  {visible ? row.offset : '—'}
                </text>
                <text x={370} y={99 + index * 62} fontSize={11} className="fill-slate-500 dark:fill-slate-400">
                  key
                </text>
                <text x={398} y={99 + index * 62} fontSize={13} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
                  {visible ? row.key : '—'}
                </text>
                <text x={424} y={99 + index * 62} fontSize={11} className="fill-slate-500 dark:fill-slate-400">
                  {visible ? `op:${row.op}` : ''}
                </text>
              </g>
            )
          })}

          {INDEX.map((row, index) => {
            const visible = index < snapshot.indexRows
            const mark = panelMark(visible, snapshot.indexHi === index)
            return (
              <g key={row.id}>
                <rect x={520} y={70 + index * 62} width={172} height={46} rx={8} className={boxClass(mark)} />
                <text x={536} y={99 + index * 62} fontSize={11} className="fill-slate-500 dark:fill-slate-400">
                  doc
                </text>
                <text x={560} y={99 + index * 62} fontSize={13} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
                  {visible ? row.id : '—'}
                </text>
                <text x={612} y={99 + index * 62} fontSize={11} className="fill-slate-500 dark:fill-slate-400">
                  name
                </text>
                <text x={650} y={99 + index * 62} fontSize={13} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
                  {visible ? row.name : '—'}
                </text>
              </g>
            )
          })}

          <line
            x1={212}
            y1={93}
            x2={262}
            y2={93}
            strokeDasharray="5 4"
            strokeWidth={snapshot.sourceActive ? 2.5 : 1.5}
            className={snapshot.sourceActive ? 'stroke-primary-500 dark:stroke-primary-400' : 'stroke-slate-300 dark:stroke-slate-600'}
          />
          <line
            x1={458}
            y1={93}
            x2={508}
            y2={93}
            strokeDasharray="5 4"
            strokeWidth={snapshot.sinkActive ? 2.5 : 1.5}
            className={snapshot.sinkActive ? 'stroke-primary-500 dark:stroke-primary-400' : 'stroke-slate-300 dark:stroke-slate-600'}
          />

          <rect
            x={210}
            y={110}
            width={54}
            height={22}
            rx={6}
            className={snapshot.smtHi ? boxClass('acc') : boxClass('idle')}
          />
          <text x={237} y={125} textAnchor="middle" fontSize={10} fontWeight={700} className="fill-slate-700 dark:fill-slate-200">
            SMT
          </text>

          <text x={237} y={160} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            source
          </text>
          <text x={483} y={160} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            sink
          </text>
        </svg>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
        نمودار را افقی بکشید. مقادیر کوچک‌سازی شده‌اند؛ منطق با رفتار واقعی Kafka Connect یکی است.
      </p>
    </div>
  )
}
