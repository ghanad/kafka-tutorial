import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { toPersianDigits } from '../../utils/persianDigits'

type Mark = 'ok' | 'acc' | 'no' | 'idle'

interface Snapshot {
  caption: string
  sourceRead: number
  sourceHi: number | null
  droppedHi: number | null
  storeA: number
  storeB: number
  storeHi: 'A' | 'B' | null
  outRows: number
  outHi: number | null
  changelogHi: boolean
}

const SOURCE = [
  { key: 'customer-A', status: 'paid', amount: '120' },
  { key: 'customer-B', status: 'unpaid', amount: '80' },
  { key: 'customer-A', status: 'paid', amount: '200' },
  { key: 'customer-B', status: 'paid', amount: '50' },
]

const OUTPUT = [
  { offset: '0', key: 'customer-A', count: '1' },
  { offset: '1', key: 'customer-A', count: '2' },
  { offset: '2', key: 'customer-B', count: '1' },
]

const SNAPSHOTS: Snapshot[] = [
  {
    caption:
      'تاپولوژی آماده است: یک KStream روی orders، فیلتر paid، گروه‌بندی بر اساس Key و شمارش در یک state store. هنوز هیچ رکوردی پردازش نشده است.',
    sourceRead: 0,
    sourceHi: null,
    droppedHi: null,
    storeA: 0,
    storeB: 0,
    storeHi: null,
    outRows: 0,
    outHi: null,
    changelogHi: false,
  },
  {
    caption:
      'رکورد اول خوانده شد: key=customer-A و status=paid. شرط فیلتر برقرار است، پس رکورد وارد مرحله بعد می‌شود.',
    sourceRead: 1,
    sourceHi: 0,
    droppedHi: null,
    storeA: 0,
    storeB: 0,
    storeHi: null,
    outRows: 0,
    outHi: null,
    changelogHi: false,
  },
  {
    caption:
      'groupByKey رکورد را به customer-A نسبت داد و count مقدار قبلی (صفر) را یکی زیاد کرد. در state store حالا customer-A برابر 1 است.',
    sourceRead: 1,
    sourceHi: null,
    droppedHi: null,
    storeA: 1,
    storeB: 0,
    storeHi: 'A',
    outRows: 0,
    outHi: null,
    changelogHi: false,
  },
  {
    caption:
      'KTable تغییر را منتشر کرد: رکورد customer-A با مقدار 1 در تاپیک خروجی با offset 0 نوشته شد.',
    sourceRead: 1,
    sourceHi: null,
    droppedHi: null,
    storeA: 1,
    storeB: 0,
    storeHi: null,
    outRows: 1,
    outHi: 0,
    changelogHi: false,
  },
  {
    caption:
      'رکورد دوم status=unpaid دارد. فیلتر آن را رد می‌کند؛ نه state store تغییر می‌کند و نه چیزی به خروجی می‌رود.',
    sourceRead: 2,
    sourceHi: 1,
    droppedHi: 1,
    storeA: 1,
    storeB: 0,
    storeHi: null,
    outRows: 1,
    outHi: null,
    changelogHi: false,
  },
  {
    caption:
      'رکورد سوم paid و متعلق به customer-A است. شمارنده از 1 به 2 می‌رسد؛ مقدار قبلی از state store خوانده شد، نه از تاپیک.',
    sourceRead: 3,
    sourceHi: 2,
    droppedHi: 1,
    storeA: 2,
    storeB: 0,
    storeHi: 'A',
    outRows: 1,
    outHi: null,
    changelogHi: false,
  },
  {
    caption:
      'به‌روزرسانی customer-A=2 با offset 1 در تاپیک خروجی نوشته شد. هر تغییر state یک رکورد جدید در خروجی می‌سازد.',
    sourceRead: 3,
    sourceHi: null,
    droppedHi: 1,
    storeA: 2,
    storeB: 0,
    storeHi: null,
    outRows: 2,
    outHi: 1,
    changelogHi: false,
  },
  {
    caption:
      'رکورد چهارم paid و متعلق به customer-B است. اولین بار است که این Key دیده می‌شود، پس شمارنده از صفر به 1 می‌رسد.',
    sourceRead: 4,
    sourceHi: 3,
    droppedHi: 1,
    storeA: 2,
    storeB: 1,
    storeHi: 'B',
    outRows: 2,
    outHi: null,
    changelogHi: false,
  },
  {
    caption:
      'رکورد customer-B=1 با offset 2 نوشته شد. تاپیک خروجی حالا سه به‌روزرسانی دارد و آخرین مقدار هر Key وضعیت فعلی را نشان می‌دهد.',
    sourceRead: 4,
    sourceHi: null,
    droppedHi: 1,
    storeA: 2,
    storeB: 1,
    storeHi: null,
    outRows: 3,
    outHi: 2,
    changelogHi: false,
  },
  {
    caption:
      'اگر برنامه از کار بیفتد، state store از تاپیک changelog بازسازی می‌شود. شمارنده‌ها از دست نمی‌روند و پردازش از همان آفست ادامه پیدا می‌کند.',
    sourceRead: 4,
    sourceHi: null,
    droppedHi: 1,
    storeA: 2,
    storeB: 1,
    storeHi: null,
    outRows: 3,
    outHi: null,
    changelogHi: true,
  },
  {
    caption:
      'قاعده کلی: KStream هر رویداد را جدا می‌بیند و KTable آخرین مقدار هر Key را نگه می‌دارد؛ state محلی با changelog بادوام می‌شود و خروجی هم یک تاپیک معمولی کافکاست.',
    sourceRead: 4,
    sourceHi: null,
    droppedHi: 1,
    storeA: 2,
    storeB: 1,
    storeHi: null,
    outRows: 3,
    outHi: null,
    changelogHi: false,
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

export function StreamsTopologyExplainer() {
  const [step, setStep] = useState(0)
  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1

  function goTo(nextStep: number) {
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, nextStep)))
  }

  function sourceMark(index: number): Mark {
    if (index >= snapshot.sourceRead) return 'idle'
    if (snapshot.droppedHi === index) return 'no'
    if (snapshot.sourceHi === index) return 'acc'
    return 'ok'
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            KStream و KTable یک رکورد را چطور پردازش می‌کنند؟
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
        <span>source: orders / p0</span>
        <span>topology: filter(paid).groupByKey().count()</span>
        <span>sink: paid-counts</span>
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
          viewBox="0 0 720 340"
          role="img"
          aria-label="پردازش رکوردهای تاپیک orders با KStream، شمارش در state store و نوشتن به تاپیک خروجی"
          className="h-auto w-full min-w-[620px]"
        >
          <text x={110} y={28} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            orders · KStream
          </text>
          <text x={360} y={28} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            state store · counts
          </text>
          <text x={610} y={28} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            paid-counts · output
          </text>

          <rect x={16} y={48} width={188} height={270} rx={12} className="fill-transparent stroke-slate-200 dark:stroke-slate-800" />
          <rect x={266} y={48} width={188} height={270} rx={12} className="fill-transparent stroke-slate-200 dark:stroke-slate-800" />
          <rect x={516} y={48} width={188} height={270} rx={12} className="fill-transparent stroke-slate-200 dark:stroke-slate-800" />

          {SOURCE.map((row, index) => {
            const visible = index < snapshot.sourceRead
            return (
              <g key={index}>
                <rect x={28} y={66 + index * 60} width={164} height={46} rx={8} className={boxClass(sourceMark(index))} />
                <text x={40} y={84 + index * 60} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
                  key
                </text>
                <text x={40} y={100 + index * 60} fontSize={11} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
                  {visible ? row.key : '—'}
                </text>
                <text x={132} y={84 + index * 60} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
                  status
                </text>
                <text x={132} y={100 + index * 60} fontSize={11} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
                  {visible ? row.status : '—'}
                </text>
              </g>
            )
          })}

          <rect x={278} y={66} width={164} height={46} rx={8} className={boxClass(snapshot.storeHi === 'A' ? 'acc' : snapshot.storeA > 0 ? 'ok' : 'idle')} />
          <text x={290} y={84} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            key
          </text>
          <text x={290} y={100} fontSize={11} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
            customer-A
          </text>
          <text x={396} y={84} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            count
          </text>
          <text x={404} y={100} fontSize={12} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            {snapshot.storeA}
          </text>

          <rect x={278} y={126} width={164} height={46} rx={8} className={boxClass(snapshot.storeHi === 'B' ? 'acc' : snapshot.storeB > 0 ? 'ok' : 'idle')} />
          <text x={290} y={144} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            key
          </text>
          <text x={290} y={160} fontSize={11} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
            customer-B
          </text>
          <text x={396} y={144} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
            count
          </text>
          <text x={404} y={160} fontSize={12} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
            {snapshot.storeB}
          </text>

          <rect
            x={292}
            y={196}
            width={136}
            height={30}
            rx={6}
            className={boxClass(snapshot.changelogHi ? 'acc' : 'idle')}
          />
          <text x={360} y={215} textAnchor="middle" fontSize={10} fontWeight={600} className="fill-slate-700 dark:fill-slate-200">
            changelog topic
          </text>
          <text x={360} y={246} textAnchor="middle" fontSize={9} className="fill-slate-500 dark:fill-slate-400">
            state backed by log
          </text>

          {OUTPUT.map((row, index) => {
            const visible = index < snapshot.outRows
            const mark: Mark = !visible ? 'idle' : snapshot.outHi === index ? 'acc' : 'ok'
            return (
              <g key={row.offset}>
                <rect x={528} y={66 + index * 60} width={164} height={46} rx={8} className={boxClass(mark)} />
                <text x={540} y={84 + index * 60} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
                  offset {visible ? row.offset : '—'}
                </text>
                <text x={540} y={100 + index * 60} fontSize={11} fontWeight={600} className="fill-slate-900 dark:fill-slate-100">
                  {visible ? row.key : '—'}
                </text>
                <text x={632} y={84 + index * 60} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
                  count
                </text>
                <text x={640} y={100 + index * 60} fontSize={12} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
                  {visible ? row.count : '—'}
                </text>
              </g>
            )
          })}

          <line
            x1={204}
            y1={89}
            x2={266}
            y2={89}
            strokeDasharray="5 4"
            strokeWidth={snapshot.sourceHi !== null || snapshot.storeHi !== null ? 2.5 : 1.5}
            className={snapshot.sourceHi !== null || snapshot.storeHi !== null ? 'stroke-primary-500 dark:stroke-primary-400' : 'stroke-slate-300 dark:stroke-slate-600'}
          />
          <line
            x1={454}
            y1={89}
            x2={516}
            y2={89}
            strokeDasharray="5 4"
            strokeWidth={snapshot.outHi !== null ? 2.5 : 1.5}
            className={snapshot.outHi !== null ? 'stroke-primary-500 dark:stroke-primary-400' : 'stroke-slate-300 dark:stroke-slate-600'}
          />

          <text x={235} y={74} textAnchor="middle" fontSize={9} className="fill-slate-500 dark:fill-slate-400">
            filter + count
          </text>
          <text x={485} y={74} textAnchor="middle" fontSize={9} className="fill-slate-500 dark:fill-slate-400">
            emit
          </text>
        </svg>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
        نمودار را افقی بکشید. مقدارها کوچک‌سازی شده‌اند؛ منطق با رفتار واقعی Kafka Streams یکی است.
      </p>
    </div>
  )
}
