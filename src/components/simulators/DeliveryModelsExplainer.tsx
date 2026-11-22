import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

type Mark = 'ok' | 'acc' | 'no'

interface Snapshot {
  headerActive: boolean
  activeLane: number
  kafkaWritten: boolean
  kafkaRead: boolean
  rabbitQueued: boolean
  rabbitAcked: boolean
  rabbitReading: boolean
  rabbitSecond: boolean
  pulsarWritten: boolean
  pulsarAcked: boolean
  redisWritten: boolean
  redisAcked: boolean
  caption: ReactNode
}

const BASE_STATE: Omit<Snapshot, 'caption'> = {
  headerActive: false,
  activeLane: -1,
  kafkaWritten: false,
  kafkaRead: false,
  rabbitQueued: false,
  rabbitAcked: false,
  rabbitReading: false,
  rabbitSecond: false,
  pulsarWritten: false,
  pulsarAcked: false,
  redisWritten: false,
  redisAcked: false,
}

function buildSnapshots(): Snapshot[] {
  const snapshots: Snapshot[] = []
  let state = BASE_STATE

  const push = (
    caption: ReactNode,
    patch: Partial<Omit<Snapshot, 'caption'>> = {},
  ) => {
    state = { ...state, ...patch }
    snapshots.push({ ...state, caption })
  }

  push(
    <>
      سرویس سفارش رویداد <Ltr>order-1042</Ltr> را می‌سازد. هنوز هیچ سیستمی آن را
      نگه نداشته است؛ در گام‌های بعد همین یک رویداد را به چهار ابزار می‌دهیم و
      می‌بینیم هر کدام با آن چه می‌کند.
    </>,
    { headerActive: true },
  )

  push(
    <>
      کافکا رکورد را در انتهای پارتیشن ۰ می‌نویسد و <Ltr>offset 0</Ltr> می‌گیرد.
      رکورد روی دیسک می‌نشیند و تا پایان بازه نگهداری همان‌جا می‌ماند.
    </>,
    { activeLane: 0, kafkaWritten: true },
  )

  push(
    <>
      گروه <Ltr>billing</Ltr> رکورد را می‌خواند و <Ltr>offset</Ltr> خودش را به ۱
      می‌برد. دقت کنید که رکورد در لاگ دست‌نخورده مانده است.
    </>,
    { activeLane: 0, kafkaWritten: true, kafkaRead: true },
  )

  push(
    <>
      گروه <Ltr>shipping</Ltr> هم مستقل همان رکورد را می‌خواند. اگر فردا گروه
      سومی اضافه شود، می‌تواند از <Ltr>offset 0</Ltr> شروع کند و کل تاریخچه را
      ببیند؛ چیزی برای بار دوم پرداخت نمی‌شود.
    </>,
    { activeLane: 0, kafkaWritten: true, kafkaRead: true },
  )

  push(
    <>
      حالا همان رویداد را به <Ltr>RabbitMQ</Ltr> می‌دهیم: پیام به{' '}
      <Ltr>exchange</Ltr> می‌رود و <Ltr>routing key</Ltr> آن را به صف{' '}
      <Ltr>warehouse</Ltr> می‌رساند.
    </>,
    { activeLane: 1, rabbitQueued: true },
  )

  push(
    <>
      مصرف‌کننده انبار پیام را می‌خواند و پس از پردازش <Ltr>ack</Ltr> می‌کند. تا
      این لحظه پیام همچنان در صف است و اگر مصرف‌کننده بمیرد، دوباره تحویل داده
      می‌شود.
    </>,
    { activeLane: 1, rabbitQueued: true, rabbitReading: true },
  )

  push(
    <>
      با <Ltr>ack</Ltr>، پیام از صف حذف می‌شود. این حذف، تفاوت بنیادی با کافکاست:
      صف برای تحویل ساخته شده است، نه برای نگهداری تاریخچه.
    </>,
    { activeLane: 1, rabbitQueued: true, rabbitAcked: true },
  )

  push(
    <>
      مصرف‌کننده دومی که دیر رسیده، صف را خالی می‌بیند. در کافکا همین رویداد برای
      هر تعداد گروه مستقل قابل خواندن بود؛ در صف، پیام بعد از تأیید وجود ندارد.
    </>,
    { activeLane: 1, rabbitQueued: true, rabbitAcked: true, rabbitSecond: true },
  )

  push(
    <>
      <Ltr>Pulsar</Ltr> رکورد را در تاپیک می‌نویسد و داده روی{' '}
      <Ltr>BookKeeper</Ltr> می‌نشیند. <Ltr>cursor</Ltr> اشتراک هنوز روی ۰ است.
    </>,
    { activeLane: 2, pulsarWritten: true },
  )

  push(
    <>
      اشتراک <Ltr>Shared</Ltr> پیام را به یکی از مصرف‌کننده‌ها می‌دهد و{' '}
      <Ltr>ack</Ltr> می‌کند؛ <Ltr>cursor</Ltr> جلو می‌رود اما رکورد در لاگ
      می‌ماند. یعنی روی یک تاپیک هم می‌توان رفتار صف داشت و هم تاریخچه نگه داشت.
    </>,
    { activeLane: 2, pulsarWritten: true, pulsarAcked: true },
  )

  push(
    <>
      <Ltr>Redis Streams</Ltr> با <Ltr>XADD</Ltr> رکورد را با شناسه{' '}
      <Ltr>1700000000000-0</Ltr> اضافه می‌کند. داده در حافظه است و با{' '}
      <Ltr>MAXLEN</Ltr> کوتاه می‌شود.
    </>,
    { activeLane: 3, redisWritten: true },
  )

  push(
    <>
      گروه مصرف‌کننده با <Ltr>XREADGROUP</Ltr> می‌خواند و با <Ltr>XACK</Ltr>{' '}
      تأیید می‌کند؛ پیام تا زمانی که <Ltr>MAXLEN</Ltr> آن را کوتاه نکند در جریان
      می‌ماند.
    </>,
    { activeLane: 3, redisWritten: true, redisAcked: true },
  )

  push(
    <>
      جمع‌بندی: کافکا و <Ltr>Pulsar</Ltr> رویداد را برای خوانندگان بعدی نگه
      می‌دارند، <Ltr>RabbitMQ</Ltr> بعد از تأیید حذفش می‌کند و{' '}
      <Ltr>Redis Streams</Ltr> تا سقف حافظه نگهش می‌دارد. انتخاب درست به این
      بستگی دارد که بعد از تحویل، به تاریخچه نیاز دارید یا نه.
    </>,
    { activeLane: -1 },
  )

  return snapshots
}

const SNAPSHOTS = buildSnapshots()
const TOTAL_STEPS = SNAPSHOTS.length

const laneTop = (index: number) => 52 + index * 100

function boxClass(mark: Mark): string {
  switch (mark) {
    case 'ok':
      return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
    case 'acc':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    case 'no':
      return 'fill-rose-50 stroke-rose-400 dark:fill-rose-950/60 dark:stroke-rose-500'
  }
}

function statusClass(mark: Mark): string {
  switch (mark) {
    case 'ok':
      return 'fill-emerald-600 dark:fill-emerald-400'
    case 'acc':
      return 'fill-primary-600 dark:fill-primary-400'
    case 'no':
      return 'fill-rose-600 dark:fill-rose-400'
  }
}

interface LaneProps {
  index: number
  title: string
  subtitle: string
  active: boolean
  dim: boolean
  storageLabel: string
  chip: { text: string; meta?: string; mark: Mark } | null
  storageStatus: { text: string; mark: Mark } | null
  consumerLabel: string
  consumerStatus: string
  consumerMark: Mark | null
  cursor?: number
}

function Lane({
  index,
  title,
  subtitle,
  active,
  dim,
  storageLabel,
  chip,
  storageStatus,
  consumerLabel,
  consumerStatus,
  consumerMark,
  cursor,
}: LaneProps) {
  const top = laneTop(index)

  return (
    <g
      className={
        dim
          ? 'opacity-60 transition-opacity duration-300 motion-reduce:transition-none'
          : 'opacity-100'
      }
    >
      <rect
        x={8}
        y={top}
        width={684}
        height={92}
        rx={12}
        className={
          active
            ? 'fill-primary-50/70 stroke-primary-300 dark:fill-primary-950/30 dark:stroke-primary-700'
            : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
        }
      />
      <text
        x={22}
        y={top + 26}
        fontSize={13}
        fontWeight={700}
        className="fill-slate-900 dark:fill-slate-100"
      >
        {title}
      </text>
      <text
        x={22}
        y={top + 44}
        fontSize={10}
        className="fill-slate-500 dark:fill-slate-400"
      >
        {subtitle}
      </text>

      <rect
        x={130}
        y={top + 16}
        width={330}
        height={60}
        rx={10}
        className="fill-slate-50 stroke-slate-200 dark:fill-slate-950/40 dark:stroke-slate-800"
      />
      <text
        x={142}
        y={top + 30}
        fontSize={9.5}
        className="fill-slate-500 dark:fill-slate-400"
      >
        {storageLabel}
      </text>

      {chip ? (
        <>
          <rect
            x={142}
            y={top + 36}
            width={150}
            height={30}
            rx={8}
            className={boxClass(chip.mark)}
          />
          <text
            x={217}
            y={top + 55}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-900 font-mono dark:fill-slate-100"
          >
            {chip.text}
          </text>
          {chip.meta ? (
            <text
              x={300}
              y={top + 55}
              fontSize={9}
              className="fill-slate-500 font-mono dark:fill-slate-400"
            >
              {chip.meta}
            </text>
          ) : null}
        </>
      ) : null}

      {storageStatus ? (
        <text
          x={448}
          y={top + 55}
          textAnchor="end"
          fontSize={10}
          fontWeight={700}
          className={statusClass(storageStatus.mark)}
        >
          {storageStatus.text}
        </text>
      ) : null}

      {cursor !== undefined ? (
        <polygon
          points={`${cursor},${top + 70} ${cursor - 6},${top + 76} ${cursor + 6},${top + 76}`}
          className="fill-primary-500 dark:fill-primary-400"
        />
      ) : null}

      <line
        x1={462}
        y1={top + 46}
        x2={504}
        y2={top + 46}
        strokeDasharray="4 4"
        className="stroke-slate-300 dark:stroke-slate-700"
      />
      <polygon
        points={`504,${top + 46} 496,${top + 42} 496,${top + 50}`}
        className="fill-slate-400 dark:fill-slate-600"
      />

      <rect
        x={510}
        y={top + 16}
        width={170}
        height={60}
        rx={10}
        className={
          consumerMark
            ? boxClass(consumerMark)
            : 'fill-slate-50 stroke-slate-200 dark:fill-slate-950/40 dark:stroke-slate-800'
        }
      />
      <text
        x={595}
        y={top + 38}
        textAnchor="middle"
        fontSize={10}
        className="fill-slate-700 dark:fill-slate-300"
      >
        {consumerLabel}
      </text>
      <text
        x={595}
        y={top + 56}
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
        className={
          consumerMark
            ? statusClass(consumerMark)
            : 'fill-slate-400 dark:fill-slate-500'
        }
      >
        {consumerStatus}
      </text>
    </g>
  )
}

export function DeliveryModelsExplainer() {
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

  const kafkaChip = snapshot.kafkaWritten
    ? { text: 'order-1042', meta: 'offset 0', mark: 'ok' as Mark }
    : null

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            همان یک رویداد در چهار سیستم چه سرنوشتی پیدا می‌کند؟
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
          viewBox="0 0 700 452"
          role="img"
          aria-label="مقایسه گام‌به‌گام سرنوشت یک رویداد در کافکا، RabbitMQ، Pulsar و Redis Streams"
          className="h-auto w-full min-w-[620px]"
        >
          <g
            className={
              snapshot.headerActive
                ? 'opacity-100'
                : 'opacity-50 transition-opacity duration-300 motion-reduce:transition-none'
            }
          >
            <rect
              x={250}
              y={6}
              width={200}
              height={36}
              rx={10}
              className="fill-primary-50 stroke-primary-300 dark:fill-primary-950/40 dark:stroke-primary-700"
            />
            <text
              x={350}
              y={20}
              textAnchor="middle"
              fontSize={8.5}
              className="fill-primary-700 dark:fill-primary-300"
            >
              رویداد تولیدشده
            </text>
            <text
              x={350}
              y={34}
              textAnchor="middle"
              fontSize={11}
              className="fill-slate-900 font-mono dark:fill-slate-100"
            >
              order-1042
            </text>
          </g>

          <Lane
            index={0}
            title="کافکا"
            subtitle="لاگ توزیع‌شده"
            active={snapshot.activeLane === 0}
            dim={snapshot.activeLane !== -1 && snapshot.activeLane !== 0}
            storageLabel="پارتیشن ۰"
            chip={kafkaChip}
            storageStatus={
              snapshot.kafkaWritten ? { text: 'ماند', mark: 'ok' } : null
            }
            consumerLabel="دو گروه مستقل"
            consumerStatus={snapshot.kafkaRead ? 'خواندند' : '—'}
            consumerMark={snapshot.kafkaRead ? 'ok' : null}
          />

          <Lane
            index={1}
            title="RabbitMQ"
            subtitle="صف کار"
            active={snapshot.activeLane === 1}
            dim={snapshot.activeLane !== -1 && snapshot.activeLane !== 1}
            storageLabel="صف انبار"
            chip={
              snapshot.rabbitQueued && !snapshot.rabbitAcked
                ? { text: 'order-1042', mark: 'acc' }
                : null
            }
            storageStatus={
              snapshot.rabbitAcked
                ? { text: 'حذف شد', mark: 'no' }
                : snapshot.rabbitQueued
                  ? { text: 'در صف', mark: 'acc' }
                  : null
            }
            consumerLabel={
              snapshot.rabbitSecond ? 'مصرف‌کننده دوم' : 'مصرف‌کننده انبار'
            }
            consumerStatus={
              snapshot.rabbitSecond
                ? 'چیزی ندید'
                : snapshot.rabbitAcked
                  ? 'تأیید کرد'
                  : snapshot.rabbitReading
                    ? 'در حال پردازش'
                    : '—'
            }
            consumerMark={
              snapshot.rabbitSecond
                ? 'no'
                : snapshot.rabbitAcked
                  ? 'ok'
                  : snapshot.rabbitReading
                    ? 'acc'
                    : null
            }
          />

          <Lane
            index={2}
            title="Pulsar"
            subtitle="ذخیره‌سازی جدا"
            active={snapshot.activeLane === 2}
            dim={snapshot.activeLane !== -1 && snapshot.activeLane !== 2}
            storageLabel="تاپیک"
            chip={
              snapshot.pulsarWritten
                ? { text: 'order-1042', meta: 'offset 0', mark: 'ok' }
                : null
            }
            storageStatus={
              snapshot.pulsarWritten ? { text: 'ماند', mark: 'ok' } : null
            }
            consumerLabel="اشتراک"
            consumerStatus={snapshot.pulsarAcked ? 'تأیید کرد' : '—'}
            consumerMark={snapshot.pulsarAcked ? 'ok' : null}
            cursor={
              snapshot.pulsarWritten
                ? snapshot.pulsarAcked
                  ? 300
                  : 217
                : undefined
            }
          />

          <Lane
            index={3}
            title="Redis Streams"
            subtitle="جریان درون‌حافظه"
            active={snapshot.activeLane === 3}
            dim={snapshot.activeLane !== -1 && snapshot.activeLane !== 3}
            storageLabel="جریان سفارش‌ها"
            chip={
              snapshot.redisWritten
                ? {
                    text: 'order-1042',
                    meta: '1700000000000-0',
                    mark: 'ok',
                  }
                : null
            }
            storageStatus={
              snapshot.redisWritten ? { text: 'ماند', mark: 'ok' } : null
            }
            consumerLabel="گروه مصرف‌کننده"
            consumerStatus={snapshot.redisAcked ? 'تأیید کرد' : '—'}
            consumerMark={snapshot.redisAcked ? 'ok' : null}
          />
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی، در هر سیستم فقط یک رویداد و یک جایگاه نشان داده شده است؛
        منطق دقیقاً همان رفتار واقعی است: نگه‌داشتن رکورد در لاگ، حذف پیام پس از{' '}
        <Ltr>ack</Ltr>، جابه‌جایی <Ltr>cursor</Ltr> اشتراک و پیام معلق گروه
        مصرف‌کننده.
      </p>
    </div>
  )
}
