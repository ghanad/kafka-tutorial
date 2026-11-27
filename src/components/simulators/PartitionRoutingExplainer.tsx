import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { toPersianDigits } from '../../utils/persianDigits'

interface RouteRecord {
  key: string | null
  value: string
  partition: number
  offset: number
  hash: number | null
}

const RECORDS: RouteRecord[] = [
  { key: 'customer-101', value: 'سفارش ۱۲', partition: 0, offset: 0, hash: 9 },
  { key: 'customer-102', value: 'سفارش ۱۵', partition: 1, offset: 0, hash: 7 },
  { key: 'customer-101', value: 'پرداخت ۱۲', partition: 0, offset: 1, hash: 9 },
  { key: 'customer-550', value: 'ورود به حساب', partition: 2, offset: 0, hash: 8 },
  { key: null, value: 'رویداد بدون کلید', partition: 1, offset: 1, hash: null },
]

interface Snapshot {
  visible: number
  active: number
  totalPartitions: number
  caveat: boolean
  caption: string
}

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: Snapshot = {
    visible: 0,
    active: -1,
    totalPartitions: 3,
    caveat: false,
    caption: '',
  }

  const push = (caption: string, patch: Partial<Snapshot> = {}) => {
    state = { ...state, active: -1, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    'تاپیک orders سه پارتیشن دارد. هر پارتیشن یک لاگ مستقل است و آفست‌هایش از صفر شروع می‌شوند.',
  )
  push(
    'رکورد با کلید customer-101 می‌رسد. hash(key) = 9 و 9 % 3 = 0، پس در partition 0 با offset 0 نوشته می‌شود.',
    { visible: 1, active: 0 },
  )
  push(
    'کلید customer-102 هش 7 می‌دهد و 7 % 3 = 1؛ رکورد در partition 1 با offset 0 می‌نشیند.',
    { visible: 2, active: 1 },
  )
  push(
    'دوباره customer-101 می‌آید. همان هش 9 و همان partition 0، این بار با offset 1. کلید یکسان یعنی ترتیب این مشتری حفظ می‌شود.',
    { visible: 3, active: 2 },
  )
  push(
    'کلید customer-550 هش 8 می‌دهد و 8 % 3 = 2؛ رکورد در partition 2 با offset 0 نوشته می‌شود.',
    { visible: 4, active: 3 },
  )
  push(
    'این رکورد کلید ندارد (null). کافکا با پارتیشن‌بندی چسبنده (sticky) آن را به partition 1 می‌فرستد و بعد جابه‌جا می‌کند؛ برای پیام بدون کلید، ترتیب بین پارتیشن‌ها تضمین نمی‌شود.',
    { visible: 5, active: 4 },
  )
  push(
    'اگر تعداد پارتیشن‌ها را به 4 برسانیم، همان کلید customer-101 با هش 9 به 9 % 4 = 1 می‌رود. یعنی کلید ثابت، پارتیشن عوض می‌کند و ترتیبش می‌شکند؛ پس تعداد پارتیشن را از ابتدا درست انتخاب کنید.',
    { totalPartitions: 4, caveat: true },
  )
  push(
    'قانون کلی: کلید یکسان همیشه به یک پارتیشن می‌رود و ترتیب فقط داخل همان پارتیشن تضمین است. تغییر تعداد پارتیشن‌ها این نگاشت را عوض می‌کند.',
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const LANE_TOP = (lane: number) => 96 + lane * 84
const LANE_CENTER = (lane: number) => LANE_TOP(lane) + 36

function recordBoxClass(active: boolean): string {
  return active
    ? 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
}

export function PartitionRoutingExplainer() {
  const [step, setStep] = useState(0)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const activeRecord = snapshot.active >= 0 ? RECORDS[snapshot.active] : null

  const goTo = (next: number) => {
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, next)))
  }

  const visibleRecords = RECORDS.slice(0, snapshot.visible)
  const activeLane = activeRecord ? activeRecord.partition : -1

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            کلید پیام چطور پارتیشن مقصد را تعیین می‌کند؟
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
          partitions:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            3
          </span>
        </span>
        <span>
          partitioner:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            murmur2(key) % n
          </span>
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
          viewBox="0 0 720 360"
          role="img"
          aria-label="نمای سه پارتیشن و مسیریابی رکوردها با هش کلید؛ کلید یکسان به پارتیشن یکسان می‌رود"
          className="h-auto w-full min-w-[620px]"
        >
          <defs>
            <marker
              id="routing-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" className="fill-primary-500" />
            </marker>
          </defs>

          {/* Computation strip */}
          <rect
            x={10}
            y={8}
            width={700}
            height={60}
            rx={10}
            strokeWidth={1.2}
            className={
              snapshot.caveat
                ? 'fill-amber-50 stroke-amber-400 dark:fill-amber-950/40 dark:stroke-amber-500'
                : 'fill-primary-50/70 stroke-primary-300 dark:fill-primary-950/40 dark:stroke-primary-700'
            }
          />
          {activeRecord ? (
            <>
              <text x={26} y={32} fontSize={11} className="fill-slate-500 font-mono dark:fill-slate-400">
                key
              </text>
              <text x={26} y={52} fontSize={12} fontWeight={700} className="fill-slate-900 font-mono dark:fill-white">
                {activeRecord.key ?? 'null'}
              </text>
              {activeRecord.hash === null ? (
                <text x={220} y={42} fontSize={12} className="fill-slate-700 dark:fill-slate-200">
                  sticky partitioner → partition {activeRecord.partition}
                </text>
              ) : (
                <>
                  <text x={220} y={32} fontSize={11} className="fill-slate-500 font-mono dark:fill-slate-400">
                    hash(key) = {activeRecord.hash}
                  </text>
                  <text x={220} y={52} fontSize={12} fontWeight={700} className="fill-slate-900 font-mono dark:fill-white">
                    {activeRecord.hash} % {snapshot.totalPartitions} ={' '}
                    {activeRecord.hash % snapshot.totalPartitions}
                  </text>
                  <text x={470} y={42} fontSize={12} fontWeight={700} className="fill-primary-700 dark:fill-primary-300">
                    → partition {activeRecord.partition}
                  </text>
                </>
              )}
            </>
          ) : snapshot.caveat ? (
            <>
              <text x={26} y={32} fontSize={11} className="fill-slate-500 font-mono dark:fill-slate-400">
                key
              </text>
              <text x={26} y={52} fontSize={12} fontWeight={700} className="fill-slate-900 font-mono dark:fill-white">
                customer-101
              </text>
              <text x={220} y={32} fontSize={11} className="fill-slate-500 font-mono dark:fill-slate-400">
                hash(key) = 9
              </text>
              <text x={220} y={52} fontSize={12} fontWeight={700} className="fill-amber-700 font-mono dark:fill-amber-300">
                9 % 4 = 1
              </text>
              <text x={470} y={42} fontSize={12} fontWeight={700} className="fill-amber-700 dark:fill-amber-300">
                → partition 1 (تغییر کرد!)
              </text>
            </>
          ) : (
            <text x={26} y={42} fontSize={12} className="fill-slate-700 font-mono dark:fill-slate-200">
              partition = hash(key) % {snapshot.totalPartitions}
            </text>
          )}

          {/* Connector from computation to active lane */}
          {activeLane >= 0 ? (
            <path
              d={`M 100 68 L 100 ${LANE_CENTER(activeLane)}`}
              fill="none"
              strokeDasharray="4 3"
              strokeWidth={2}
              markerEnd="url(#routing-arrow)"
              className="stroke-primary-500 dark:stroke-primary-400"
            />
          ) : null}

          {/* Partition lanes */}
          {[0, 1, 2].map((lane) => {
            const laneRecords = visibleRecords.filter((record) => record.partition === lane)
            const isActiveLane = lane === activeLane
            return (
              <g key={lane}>
                <rect
                  x={10}
                  y={LANE_TOP(lane)}
                  width={700}
                  height={72}
                  rx={10}
                  strokeWidth={isActiveLane ? 2 : 1}
                  className={`transition-colors duration-300 motion-reduce:transition-none ${
                    isActiveLane
                      ? 'fill-primary-50/40 stroke-primary-400 dark:fill-primary-950/20 dark:stroke-primary-500'
                      : 'fill-slate-50/60 stroke-slate-200 dark:fill-slate-950/40 dark:stroke-slate-800'
                  }`}
                />
                <text
                  x={22}
                  y={LANE_CENTER(lane) + 4}
                  fontSize={11}
                  fontWeight={700}
                  className="fill-slate-700 font-mono dark:fill-slate-200"
                >
                  partition {lane}
                </text>

                {laneRecords.map((record, index) => {
                  const isActive = activeRecord === record
                  const x = 112 + index * 158
                  return (
                    <g key={`${record.key}-${record.offset}`}>
                      <rect
                        x={x}
                        y={LANE_TOP(lane) + 8}
                        width={150}
                        height={56}
                        rx={8}
                        strokeWidth={isActive ? 2 : 1}
                        className={`transition-colors duration-300 motion-reduce:transition-none ${recordBoxClass(isActive)}`}
                      />
                      <text
                        x={x + 10}
                        y={LANE_TOP(lane) + 26}
                        fontSize={10}
                        className="fill-slate-500 font-mono dark:fill-slate-400"
                      >
                        offset {record.offset} · {record.key ?? 'null'}
                      </text>
                      <text
                        x={x + 10}
                        y={LANE_TOP(lane) + 46}
                        fontSize={11}
                        fontWeight={600}
                        className="fill-slate-800 dark:fill-slate-100"
                      >
                        {record.value}
                      </text>
                    </g>
                  )
                })}

                {laneRecords.length === 0 ? (
                  <text
                    x={112}
                    y={LANE_CENTER(lane) + 4}
                    fontSize={11}
                    className="fill-slate-400 dark:fill-slate-500"
                  >
                    هنوز رکوردی ندارد
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، مقدار هش و تعداد رکوردها ساده شده‌اند؛ منطق همان چیزی است که
        کافکا اجرا می‌کند: پارتیشن با هش کلید انتخاب می‌شود، کلید یکسان به یک
        پارتیشن می‌رود، و پیام بدون کلید با پارتیشن‌بندی چسبنده پخش می‌شود.
      </p>
    </div>
  )
}
