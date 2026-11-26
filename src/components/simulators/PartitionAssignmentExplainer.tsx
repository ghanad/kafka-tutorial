import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

interface ScenarioRecord {
  id: string
  key: string | null
  value: string
  partition: number
  hash: number | null
  positiveHash: number | null
}

interface PlacedRecord extends ScenarioRecord {
  offset: number
}

type Mode = 'keyed' | 'unkeyed' | 'rule'

interface Snapshot {
  records: PlacedRecord[]
  activeId: string | null
  current: ScenarioRecord | null
  caption: ReactNode
  mode: Mode
}

const SCENARIO: ScenarioRecord[] = [
  {
    id: 'r1',
    key: 'order-1001',
    value: 'created',
    partition: 0,
    hash: 297523878,
    positiveHash: 297523878,
  },
  {
    id: 'r2',
    key: 'order-1001',
    value: 'paid',
    partition: 0,
    hash: 297523878,
    positiveHash: 297523878,
  },
  {
    id: 'r3',
    key: 'order-1001',
    value: 'shipped',
    partition: 0,
    hash: 297523878,
    positiveHash: 297523878,
  },
  {
    id: 'r4',
    key: 'order-1002',
    value: 'created',
    partition: 0,
    hash: -809665508,
    positiveHash: 1337818140,
  },
  {
    id: 'r5',
    key: 'order-1003',
    value: 'created',
    partition: 1,
    hash: 664887688,
    positiveHash: 664887688,
  },
  {
    id: 'r6',
    key: 'order-1009',
    value: 'created',
    partition: 2,
    hash: -768667395,
    positiveHash: 1378816253,
  },
  {
    id: 'r7',
    key: null,
    value: 'page-view',
    partition: 1,
    hash: null,
    positiveHash: null,
  },
  {
    id: 'r8',
    key: null,
    value: 'page-view',
    partition: 1,
    hash: null,
    positiveHash: null,
  },
  {
    id: 'r9',
    key: null,
    value: 'page-view',
    partition: 2,
    hash: null,
    positiveHash: null,
  },
]

const CAPTIONS: Record<string, ReactNode> = {
  r1: (
    <>
      رکورد اول با کلید <Ltr className="font-mono">order-1001</Ltr> می‌رسد.
      Producer بایت‌های کلید را هش می‌کند و{' '}
      <Ltr className="font-mono">297523878 % 3 = 0</Ltr> به دست می‌آید، پس
      پارتیشن ۰ انتخاب می‌شود. رکورد هنوز در بافر است و به بروکر نرفته است.
    </>
  ),
  r2: (
    <>
      همان کلید دوباره می‌آید. هش تغییر نمی‌کند، پس رکورد{' '}
      <Ltr className="font-mono">paid</Ltr> هم به پارتیشن ۰ می‌رود و{' '}
      <Ltr className="font-mono">offset 1</Ltr> می‌گیرد. همین موضوع باعث می‌شود{' '}
      <Ltr className="font-mono">created</Ltr> و <Ltr className="font-mono">paid</Ltr>{' '}
      یک سفارش با ترتیب درست دیده شوند.
    </>
  ),
  r3: (
    <>
      رکورد سوم هم با همان کلید به پارتیشن ۰ می‌رود و{' '}
      <Ltr className="font-mono">offset 2</Ltr> می‌گیرد. تا وقتی بایت‌های کلید و
      تعداد پارتیشن‌ها عوض نشوند، این نگاشت پایدار می‌ماند.
    </>
  ),
  r4: (
    <>
      کلید <Ltr className="font-mono">order-1002</Ltr> است، اما هش آن منفی است.
      Kafka بیت علامت را پاک می‌کند و به{' '}
      <Ltr className="font-mono">1337818140</Ltr> می‌رسد؛ باقیماندهٔ تقسیم بر ۳
      هم صفر است. دو کلید متفاوت می‌توانند در یک پارتیشن بنشینند؛ هش توزیع
      تقریبی می‌دهد، نه یکتایی.
    </>
  ),
  r5: (
    <>
      <Ltr className="font-mono">order-1003</Ltr> به پارتیشن ۱ می‌رود و{' '}
      <Ltr className="font-mono">offset 0</Ltr> می‌گیرد. آفست‌ها سراسری نیستند:
      پارتیشن ۱ از صفر شروع می‌کند، در حالی که پارتیشن ۰ تا{' '}
      <Ltr className="font-mono">offset 3</Ltr> جلو رفته است.
    </>
  ),
  r6: (
    <>
      <Ltr className="font-mono">order-1009</Ltr> به پارتیشن ۲ می‌رود. حالا
      توزیع ۴، ۱ و ۱ است؛ با این تعداد کم کلید نمی‌توان انتظار تعادل داشت.
      یکنواختی هش در هزاران کلید معنا پیدا می‌کند، نه در چهار کلید.
    </>
  ),
  r7: (
    <>
      این رکورد کلید ندارد. Producer هیچ هشی حساب نمی‌کند و پارتیشن Sticky فعلی
      را انتخاب می‌کند که در این اجرا پارتیشن ۱ است. انتخاب اولیهٔ Sticky تصادفی
      است؛ چیزی که مهم است، ماندن روی همان پارتیشن تا بسته شدن بچ است.
    </>
  ),
  r8: (
    <>
      رکورد دوم بدون کلید هم به پارتیشن ۱ می‌رود و{' '}
      <Ltr className="font-mono">offset 2</Ltr> می‌گیرد. این بار ترتیب تصادفاً
      حفظ شد، اما هیچ تضمینی برای آن نیست؛ اگر بچ زودتر بسته می‌شد، همین رکورد
      می‌توانست به پارتیشن دیگری برود.
    </>
  ),
  r9: (
    <>
      در این سناریوی ساده‌شده بچ پارتیشن ۱ پس از سه رکورد بسته می‌شود، بنابراین
      Sticky به پارتیشن دیگری می‌رود و رکورد سوم بدون کلید به پارتیشن ۲ می‌رسد.
      این چرخش در سطح بچ است، نه در سطح رکورد؛ در واقعیت آستانهٔ آن حدود{' '}
      <Ltr className="font-mono">batch.size</Ltr> بایت است.
    </>
  ),
}

const RULE_CAPTION: ReactNode = (
  <>
    قاعدهٔ کلی: کلید مسیر را قطعی می‌کند و نبود کلید آن را به بچ می‌سپارد. اگر
    ترتیب یک موجودیت مهم است، کلید آن موجودیت را بفرستید؛ اگر فقط توزیع بار مهم
    است، بدون کلید بفرستید. پارتیشن صریح هم از هر دو بالاتر است و پارتیشن‌ر را
    کاملاً دور می‌زند.
  </>
)

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  const placed: PlacedRecord[] = []
  const nextOffset = [0, 0, 0]

  for (const record of SCENARIO) {
    const offset = nextOffset[record.partition]++
    placed.push({ ...record, offset })
    snapshots.push({
      records: [...placed],
      activeId: record.id,
      current: record,
      caption: CAPTIONS[record.id],
      mode: record.key === null ? 'unkeyed' : 'keyed',
    })
  }

  snapshots.push({
    records: [...placed],
    activeId: null,
    current: null,
    caption: RULE_CAPTION,
    mode: 'rule',
  })

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const LANES = [
  { partition: 0, y: 56 },
  { partition: 1, y: 164 },
  { partition: 2, y: 272 },
]

const LANE_X = 252
const LANE_W = 512
const LANE_H = 84
const RECORD_X = 300
const RECORD_W = 84
const RECORD_H = 56
const RECORD_GAP = 6

function laneCenter(y: number): number {
  return y + LANE_H / 2
}

function recordX(index: number): number {
  return RECORD_X + index * (RECORD_W + RECORD_GAP)
}

export function PartitionAssignmentExplainer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1800)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const autoPlaying = playing && !isLast

  useEffect(() => {
    if (!autoPlaying) return
    const timer = window.setTimeout(
      () => setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1)),
      speed,
    )
    return () => window.clearTimeout(timer)
  }, [autoPlaying, step, speed])

  function goTo(nextStep: number) {
    setPlaying(false)
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, nextStep)))
  }

  function toggleAutoPlay() {
    if (autoPlaying) {
      setPlaying(false)
      return
    }
    if (isLast) setStep(0)
    setPlaying(true)
  }

  const activeRecord = snapshot.records.find(
    (record) => record.id === snapshot.activeId,
  )
  const activeLane = LANES.find(
    (lane) => lane.partition === activeRecord?.partition,
  )

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            یک کلید چگونه پارتیشن را انتخاب می‌کند و بدون کلید چه اتفاقی می‌افتد؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </Badge>
      </div>

      <div
        dir="ltr"
        className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300"
      >
        <span>topic=orders</span>
        <span>partitions=3</span>
        <span>batch.size=16384</span>
        <span className="text-slate-400 dark:text-slate-500">
          key.serializer=StringSerializer
        </span>
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
          variant="outline"
          onClick={toggleAutoPlay}
          startIcon={
            autoPlaying ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )
          }
        >
          {autoPlaying ? 'توقف' : 'اجرای خودکار'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => goTo(0)}
          startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          از اول
        </Button>
        <label className="ms-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          سرعت
          <select
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value={2800}>آهسته</option>
            <option value={1800}>متوسط</option>
            <option value={900}>سریع</option>
          </select>
        </label>
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
            className="absolute h-1.5 rounded-full bg-primary-500 dark:bg-primary-400"
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

      <div className="mt-3 min-h-[6.5rem] rounded-xl border border-primary-100 border-s-4 border-s-primary-500 bg-primary-50/70 p-3 text-primary-950 dark:border-primary-900/60 dark:border-s-primary-400 dark:bg-primary-950/40 dark:text-primary-100">
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
          viewBox="0 0 780 400"
          role="img"
          aria-label="نمودار تخصیص رکوردها به سه پارتیشن تاپیک orders؛ رکوردهای کلیددار با هش murmur2 و رکوردهای بدون کلید با پارتیشن Sticky توزیع می‌شوند"
          className="h-auto w-full min-w-[680px]"
        >
          <defs>
            <marker
              id="partition-arrow-active"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                className="fill-primary-500 dark:fill-primary-400"
              />
            </marker>
          </defs>

          {/* Producer panel */}
          <rect
            x={16}
            y={48}
            width={212}
            height={316}
            rx={12}
            className="fill-slate-50 stroke-slate-200 dark:fill-slate-950/50 dark:stroke-slate-800"
            strokeWidth={1}
          />
          <text
            x={122}
            y={70}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            className="fill-slate-700 dark:fill-slate-200"
          >
            Producer
          </text>

          <rect
            x={30}
            y={82}
            width={184}
            height={64}
            rx={8}
            className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700"
            strokeWidth={1}
          />
          <text
            x={40}
            y={98}
            fontSize={8.5}
            className="fill-slate-400 dark:fill-slate-500"
          >
            record
          </text>
          {snapshot.current ? (
            <>
              <text
                x={40}
                y={117}
                fontSize={10}
                fontWeight={600}
                className="fill-slate-600 font-mono dark:fill-slate-300"
              >
                key: {snapshot.current.key ?? 'null'}
              </text>
              <text
                x={40}
                y={134}
                fontSize={10}
                fontWeight={700}
                className="fill-slate-900 dark:fill-slate-100"
              >
                value: {snapshot.current.value}
              </text>
            </>
          ) : (
            <text
              x={40}
              y={120}
              fontSize={10}
              fontWeight={700}
              className="fill-slate-700 dark:fill-slate-200"
            >
              قاعدهٔ کلی
            </text>
          )}

          <rect
            x={30}
            y={158}
            width={184}
            height={140}
            rx={8}
            className={`transition-colors motion-reduce:transition-none ${
              snapshot.mode === 'rule'
                ? 'fill-slate-100 stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
                : 'fill-primary-50 stroke-primary-300 dark:fill-primary-950/40 dark:stroke-primary-800'
            }`}
            strokeWidth={1}
          />
          <text
            x={40}
            y={176}
            fontSize={8.5}
            className="fill-slate-400 dark:fill-slate-500"
          >
            partition decision
          </text>

          {snapshot.mode === 'keyed' && snapshot.current && (
            <>
              <text
                x={40}
                y={196}
                fontSize={9.5}
                className="fill-slate-700 font-mono dark:fill-slate-300"
              >
                murmur2(key)
              </text>
              <text
                x={40}
                y={213}
                fontSize={9.5}
                className="fill-slate-700 font-mono dark:fill-slate-300"
              >
                = {snapshot.current.hash}
              </text>
              {snapshot.current.hash !== null &&
                snapshot.current.hash < 0 && (
                  <>
                    <text
                      x={40}
                      y={230}
                      fontSize={9.5}
                      className="fill-slate-700 font-mono dark:fill-slate-300"
                    >
                      &amp; 0x7fffffff
                    </text>
                    <text
                      x={40}
                      y={247}
                      fontSize={9.5}
                      className="fill-slate-700 font-mono dark:fill-slate-300"
                    >
                      = {snapshot.current.positiveHash}
                    </text>
                  </>
                )}
              <text
                x={40}
                y={
                  snapshot.current.hash !== null && snapshot.current.hash < 0
                    ? 264
                    : 230
                }
                fontSize={9.5}
                className="fill-slate-700 font-mono dark:fill-slate-300"
              >
                % 3 = {snapshot.current.partition}
              </text>
              <text
                x={40}
                y={
                  snapshot.current.hash !== null && snapshot.current.hash < 0
                    ? 284
                    : 252
                }
                fontSize={10.5}
                fontWeight={700}
                className="fill-primary-700 font-mono dark:fill-primary-300"
              >
                → partition {snapshot.current.partition}
              </text>
            </>
          )}

          {snapshot.mode === 'unkeyed' && snapshot.current && (
            <>
              <text
                x={40}
                y={198}
                fontSize={10}
                fontWeight={600}
                className="fill-amber-700 font-mono dark:fill-amber-300"
              >
                key = null
              </text>
              <text
                x={40}
                y={222}
                fontSize={9.5}
                className="fill-slate-600 dark:fill-slate-400"
              >
                no hash
              </text>
              <text
                x={40}
                y={246}
                fontSize={9.5}
                className="fill-slate-700 font-mono dark:fill-slate-300"
              >
                sticky batch
              </text>
              <text
                x={40}
                y={272}
                fontSize={10.5}
                fontWeight={700}
                className="fill-primary-700 font-mono dark:fill-primary-300"
              >
                → partition {snapshot.current.partition}
              </text>
            </>
          )}

          {snapshot.mode === 'rule' && (
            <>
              <text
                x={40}
                y={200}
                fontSize={9.5}
                className="fill-slate-700 font-mono dark:fill-slate-300"
              >
                key ≠ null → hash
              </text>
              <text
                x={40}
                y={224}
                fontSize={9.5}
                className="fill-slate-700 font-mono dark:fill-slate-300"
              >
                key = null → sticky
              </text>
              <text
                x={40}
                y={248}
                fontSize={9.5}
                className="fill-slate-700 font-mono dark:fill-slate-300"
              >
                explicit → as given
              </text>
            </>
          )}

          <text
            x={122}
            y={330}
            textAnchor="middle"
            fontSize={8.5}
            className="fill-slate-400 dark:fill-slate-500"
          >
            before RecordAccumulator
          </text>

          {/* Connector from producer to the active lane */}
          {activeLane && (
            <polyline
              points={`228,228 240,228 240,${laneCenter(
                activeLane.y,
              )} 252,${laneCenter(activeLane.y)}`}
              fill="none"
              strokeWidth={2.2}
              strokeDasharray="4 4"
              markerEnd="url(#partition-arrow-active)"
              className="stroke-primary-500 transition-colors motion-reduce:transition-none dark:stroke-primary-400"
            />
          )}

          {/* Partition lanes */}
          {LANES.map((lane) => {
            const laneRecords = snapshot.records.filter(
              (record) => record.partition === lane.partition,
            )
            const isActiveLane = activeLane?.partition === lane.partition

            return (
              <g key={lane.partition}>
                <rect
                  x={LANE_X}
                  y={lane.y}
                  width={LANE_W}
                  height={LANE_H}
                  rx={10}
                  strokeWidth={isActiveLane ? 1.6 : 1}
                  className={`transition-colors motion-reduce:transition-none ${
                    isActiveLane
                      ? 'fill-primary-50/50 stroke-primary-300 dark:fill-primary-950/30 dark:stroke-primary-700'
                      : 'fill-slate-50/60 stroke-slate-200 dark:fill-slate-950/40 dark:stroke-slate-800'
                  }`}
                />
                <line
                  x1={292}
                  y1={lane.y + 10}
                  x2={292}
                  y2={lane.y + LANE_H - 10}
                  strokeWidth={1}
                  className="stroke-slate-200 dark:stroke-slate-800"
                />
                <text
                  x={LANE_X + 14}
                  y={lane.y + 30}
                  fontSize={13}
                  fontWeight={700}
                  className="fill-slate-700 font-mono dark:fill-slate-200"
                >
                  P{lane.partition}
                </text>
                <text
                  x={LANE_X + 14}
                  y={lane.y + 48}
                  fontSize={9.5}
                  className="fill-slate-400 font-mono dark:fill-slate-500"
                >
                  {laneRecords.length} rec
                </text>

                {laneRecords.map((record, index) => {
                  const isActive = record.id === snapshot.activeId
                  const x = recordX(index)
                  const y = lane.y + 14

                  return (
                    <g key={record.id}>
                      <rect
                        x={x}
                        y={y}
                        width={RECORD_W}
                        height={RECORD_H}
                        rx={6}
                        strokeWidth={isActive ? 2 : 1}
                        strokeDasharray={record.key === null ? '3 2' : undefined}
                        className={`transition-colors motion-reduce:transition-none ${
                          isActive
                            ? 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
                            : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
                        }`}
                      />
                      <text
                        x={x + 7}
                        y={y + 14}
                        fontSize={8.5}
                        className="fill-slate-400 font-mono dark:fill-slate-500"
                      >
                        offset {record.offset}
                      </text>
                      <text
                        x={x + 7}
                        y={y + 31}
                        fontSize={9.5}
                        fontWeight={600}
                        className={`font-mono ${
                          record.key === null
                            ? 'fill-amber-700 dark:fill-amber-300'
                            : 'fill-slate-600 dark:fill-slate-300'
                        }`}
                      >
                        {record.key ?? 'null'}
                      </text>
                      <text
                        x={x + 7}
                        y={y + 46}
                        fontSize={10}
                        fontWeight={700}
                        className="fill-slate-900 dark:fill-slate-100"
                      >
                        {record.value}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، اندازهٔ رکوردها و آستانهٔ بسته شدن بچ کوچک شده‌اند؛ هش‌ها با
        همان <span dir="ltr" className="font-mono">murmur2</span> کافکا و تعداد
        پارتیشن واقعی محاسبه شده‌اند.
      </p>
    </div>
  )
}
