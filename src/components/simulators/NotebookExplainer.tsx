import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { toPersianDigits } from '../../utils/persianDigits'

interface LogRecord {
  offset: number
  label: string
}

const RECORDS: LogRecord[] = [
  { offset: 0, label: 'سفارش ۱۰۴۲ ثبت شد' },
  { offset: 1, label: 'پرداخت ۱۰۴۲ تأیید شد' },
  { offset: 2, label: 'بسته‌بندی در انبار' },
  { offset: 3, label: 'تحویل به پیک' },
]

type ActiveReader = 'sara' | 'reza' | null

interface Snapshot {
  rows: number
  sara: number
  reza: number
  rezaOffline: boolean
  newRow: number
  active: ActiveReader
  replay: boolean
  caption: string
}

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state: Snapshot = {
    rows: 0,
    sara: -1,
    reza: -1,
    rezaOffline: false,
    newRow: -1,
    active: null,
    replay: false,
    caption: '',
  }

  const push = (caption: string, patch: Partial<Snapshot> = {}) => {
    state = { ...state, active: null, newRow: -1, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    'تاپیک orders یک پارتیشن دارد و لاگ خالی است. سارا و رضا هنوز چیزی نخوانده‌اند، پس نشانک هر دو قبل از اولین رکورد است.',
  )
  push(
    'علی (Producer) رکورد اول را می‌نویسد: offset 0. فقط به انتهای لاگ اضافه می‌شود و هیچ رکوردی ویرایش نمی‌شود.',
    { rows: 1, newRow: 0 },
  )
  push(
    'رکورد دوم هم به انتهای لاگ می‌رود و offset 1 می‌گیرد. هنوز هیچ مصرف‌کننده‌ای نخوانده است.',
    { rows: 2, newRow: 1 },
  )
  push(
    'سارا (سرویس انبار) رکورد offset 0 را می‌خواند و نشانکش را روی همان رکورد می‌گذارد. رکورد از لاگ حذف نمی‌شود.',
    { sara: 0, active: 'sara' },
  )
  push(
    'سارا رکورد offset 1 را هم می‌خواند و نشانکش جلو می‌رود. رضا هنوز چیزی نخوانده است.',
    { sara: 1, active: 'sara' },
  )
  push(
    'رکورد سوم نوشته می‌شود: offset 2. حالا سه رکورد در لاگ داریم و هر مصرف‌کننده مستقل جلو می‌رود.',
    { rows: 3, newRow: 2 },
  )
  push(
    'رضا (سرویس پیامک) از دسترس خارج می‌شود. این قطعی نه نوشتن علی را متوقف می‌کند و نه خواندن سارا را.',
    { rezaOffline: true },
  )
  push(
    'در همین حال رکورد چهارم هم نوشته می‌شود: offset 3. رضا خواب است، اما هیچ رکوردی گم نمی‌شود؛ همه روی دیسک می‌مانند.',
    { rows: 4, newRow: 3 },
  )
  push(
    'رضا دوباره بالا می‌آید و از نشانک قبلی خودش ادامه می‌دهد: اول offset 0. او از آخرین رکورد شروع نمی‌کند، از جایی که متوقف شده بود.',
    { rezaOffline: false, reza: 0, active: 'reza' },
  )
  push(
    'رضا بقیه رکوردها را هم به ترتیب می‌خواند تا به انتهای لاگ برسد. عقب‌ماندگی او فقط تأخیر است، نه داده گم‌شده.',
    { reza: 3, active: 'reza' },
  )
  push(
    'سارا تصمیم می‌گیرد وضعیت انبار را از صفر بازسازی کند و نشانکش را به قبل از اولین رکورد برمی‌گرداند. داده‌ها هنوز همان‌جا هستند.',
    { sara: -1, replay: true },
  )
  push(
    'سارا از offset 0 دوباره می‌خواند. قانون کلی: لاگ فقط append می‌شود، هر مصرف‌کننده نشانک مستقل دارد، و خواندن هرگز داده را حذف نمی‌کند.',
    { sara: 0, active: 'sara', replay: true },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const ROW_TOP = (row: number) => 40 + row * 60
const ROW_CENTER = (row: number) => ROW_TOP(row) + 23

function rowClass(isNew: boolean): string {
  return isNew
    ? 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
}

function consumerBoxClass(
  active: boolean,
  offline: boolean,
  hasRead: boolean,
): string {
  if (offline) return 'fill-amber-50 stroke-amber-400 dark:fill-amber-950/40 dark:stroke-amber-500'
  if (active) return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/50 dark:stroke-primary-400'
  if (hasRead) return 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/40 dark:stroke-emerald-500'
  return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
}

function bookmarkLabel(position: number): string {
  return position < 0 ? 'before first' : `offset ${position}`
}

export function NotebookExplainer() {
  const [step, setStep] = useState(0)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1

  const goTo = (next: number) => {
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, next)))
  }

  const saraStart = snapshot.sara >= 0 ? ROW_CENTER(snapshot.sara) : 34
  const rezaStart = snapshot.reza >= 0 ? ROW_CENTER(snapshot.reza) : 34

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            دفترچه کافکا چطور پیام‌ها را بدون گم‌شدن نگه می‌دارد؟
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
          consumers:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            inventory, sms
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
          viewBox="0 0 720 300"
          role="img"
          aria-label="نمای لاگ یک پارتیشن همراه با نشانک دو مصرف‌کننده؛ نوشتن رکوردها، خواندن مستقل و بازپخش"
          className="h-auto w-full min-w-[620px]"
        >
          <defs>
            <marker
              id="notebook-arrow"
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

          <text
            x={190}
            y={22}
            fontSize={12}
            fontWeight={700}
            className="fill-slate-700 dark:fill-slate-200"
          >
            topic: orders · partition 0
          </text>

          {/* Producer */}
          <g>
            <rect
              x={10}
              y={110}
              width={130}
              height={90}
              rx={12}
              className="fill-primary-50 stroke-primary-400 dark:fill-primary-950/40 dark:stroke-primary-500"
              strokeWidth={1.5}
            />
            <text
              x={75}
              y={138}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              className="fill-primary-900 dark:fill-primary-100"
            >
              علی
            </text>
            <text
              x={75}
              y={156}
              textAnchor="middle"
              fontSize={10}
              className="fill-primary-700 dark:fill-primary-300"
            >
              Producer
            </text>
            <text
              x={75}
              y={180}
              textAnchor="middle"
              fontSize={10}
              className="fill-slate-500 dark:fill-slate-400"
            >
              فقط append
            </text>
          </g>

          <path
            d="M 140 155 L 186 155"
            fill="none"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            markerEnd="url(#notebook-arrow)"
            className="stroke-slate-400 dark:stroke-slate-500"
          />

          {/* Log rows */}
          {RECORDS.map((record, row) => {
            const visible = row < snapshot.rows
            const isNew = row === snapshot.newRow
            return (
              <g
                key={record.offset}
                className={`transition-opacity duration-300 motion-reduce:transition-none ${
                  visible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <rect
                  x={190}
                  y={ROW_TOP(row)}
                  width={275}
                  height={46}
                  rx={8}
                  strokeWidth={isNew ? 2 : 1}
                  className={`transition-colors duration-300 motion-reduce:transition-none ${rowClass(isNew)}`}
                />
                <text
                  x={204}
                  y={ROW_CENTER(row) + 4}
                  fontSize={11}
                  className="fill-slate-500 font-mono dark:fill-slate-400"
                >
                  offset {record.offset}
                </text>
                <text
                  x={270}
                  y={ROW_CENTER(row) + 4}
                  fontSize={12}
                  fontWeight={600}
                  className="fill-slate-800 dark:fill-slate-100"
                >
                  {record.label}
                </text>
              </g>
            )
          })}

          {/* Consumers */}
          <g className="transition-colors duration-300 motion-reduce:transition-none">
            <path
              d={`M 465 ${saraStart} C 495 ${saraStart} 495 100 518 100`}
              fill="none"
              strokeDasharray="4 3"
              strokeWidth={snapshot.active === 'sara' ? 2.5 : 1.2}
              className={
                snapshot.active === 'sara'
                  ? 'stroke-primary-500 dark:stroke-primary-400'
                  : 'stroke-slate-300 dark:stroke-slate-600'
              }
            />
            <rect
              x={520}
              y={55}
              width={190}
              height={90}
              rx={12}
              strokeWidth={snapshot.active === 'sara' ? 2 : 1.2}
              className={`transition-colors duration-300 motion-reduce:transition-none ${consumerBoxClass(
                snapshot.active === 'sara',
                false,
                snapshot.sara >= 0,
              )}`}
            />
            <text
              x={536}
              y={82}
              fontSize={12}
              fontWeight={700}
              className="fill-slate-900 dark:fill-white"
            >
              سارا · انبار
            </text>
            <text
              x={536}
              y={102}
              fontSize={10}
              className="fill-slate-500 dark:fill-slate-400"
            >
              Consumer
            </text>
            <text
              x={536}
              y={128}
              fontSize={11}
              className="fill-slate-700 font-mono dark:fill-slate-200"
            >
              bookmark: {bookmarkLabel(snapshot.sara)}
            </text>
          </g>

          <g className="transition-colors duration-300 motion-reduce:transition-none">
            <path
              d={`M 465 ${rezaStart} C 495 ${rezaStart} 495 230 518 230`}
              fill="none"
              strokeDasharray="4 3"
              strokeWidth={snapshot.active === 'reza' ? 2.5 : 1.2}
              className={
                snapshot.active === 'reza'
                  ? 'stroke-primary-500 dark:stroke-primary-400'
                  : 'stroke-slate-300 dark:stroke-slate-600'
              }
            />
            <rect
              x={520}
              y={185}
              width={190}
              height={90}
              rx={12}
              strokeWidth={snapshot.active === 'reza' ? 2 : 1.2}
              className={`transition-colors duration-300 motion-reduce:transition-none ${consumerBoxClass(
                snapshot.active === 'reza',
                snapshot.rezaOffline,
                snapshot.reza >= 0,
              )}`}
            />
            <text
              x={536}
              y={212}
              fontSize={12}
              fontWeight={700}
              className="fill-slate-900 dark:fill-white"
            >
              رضا · پیامک
            </text>
            <text
              x={536}
              y={232}
              fontSize={10}
              className="fill-slate-500 dark:fill-slate-400"
            >
              Consumer
            </text>
            <text
              x={536}
              y={258}
              fontSize={11}
              className={
                snapshot.rezaOffline
                  ? 'fill-amber-700 font-bold dark:fill-amber-300'
                  : 'fill-slate-700 font-mono dark:fill-slate-200'
              }
            >
              {snapshot.rezaOffline
                ? 'offline (قطعی سرویس)'
                : `bookmark: ${bookmarkLabel(snapshot.reza)}`}
            </text>
          </g>

          {snapshot.replay ? (
            <text
              x={190}
              y={286}
              fontSize={11}
              className="fill-primary-600 font-bold dark:fill-primary-400"
            >
              replay: سارا نشانکش را عقب برده و دوباره از offset 0 می‌خواند
            </text>
          ) : null}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، تعداد رکوردها و مصرف‌کننده‌ها کم گرفته شده‌اند؛ منطق همان
        چیزی است که کافکا اجرا می‌کند: نوشتن فقط در انتهای لاگ، نشانک مستقل هر
        مصرف‌کننده، و امکان بازپخش بدون حذف داده.
      </p>
    </div>
  )
}
