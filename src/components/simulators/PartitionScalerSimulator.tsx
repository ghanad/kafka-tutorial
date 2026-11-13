import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Gauge,
  Hash,
  Layers,
  Send,
  TriangleAlert,
  Users,
  Zap,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

const PARTITION_OPTIONS = [1, 3, 6]
const KEY_POOL = ['customer-101', 'customer-102', 'order-77', 'user-9', 'device-42']
const VALUE_POOL = [
  'ثبت سفارش',
  'پرداخت موفق',
  'ورود کاربر',
  'ارسال بسته',
  'به‌روزرسانی آدرس',
]
const CONSUMER_OPTIONS = [1, 2, 3, 4, 6]

const PARTITION_STYLES = [
  {
    box: 'border-sky-300 bg-sky-50/40 dark:border-sky-900/60 dark:bg-sky-950/20',
    chip: 'border-sky-400/50 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200',
  },
  {
    box: 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20',
    chip: 'border-emerald-400/50 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  },
  {
    box: 'border-violet-300 bg-violet-50/40 dark:border-violet-900/60 dark:bg-violet-950/20',
    chip: 'border-violet-400/50 bg-violet-100 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200',
  },
  {
    box: 'border-amber-300 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20',
    chip: 'border-amber-400/50 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  },
  {
    box: 'border-rose-300 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/20',
    chip: 'border-rose-400/50 bg-rose-100 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200',
  },
  {
    box: 'border-cyan-300 bg-cyan-50/40 dark:border-cyan-900/60 dark:bg-cyan-950/20',
    chip: 'border-cyan-400/50 bg-cyan-100 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
  },
]

interface SimRecord {
  id: number
  key: string
  value: string
  partition: number
  offset: number
}

function hashKey(key: string): number {
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function partitionForKey(key: string, partitionCount: number): number {
  return hashKey(key) % partitionCount
}

function createInitialRecords(partitionCount: number): SimRecord[] {
  const items = KEY_POOL.slice(0, 4).map((key, index) => ({
    key,
    value: VALUE_POOL[index],
  }))
  const offsets = new Map<number, number>()

  return items.map((item, index) => {
    const partition = partitionForKey(item.key, partitionCount)
    const offset = offsets.get(partition) ?? 0
    offsets.set(partition, offset + 1)
    return {
      id: index + 1,
      key: item.key,
      value: item.value,
      partition,
      offset,
    }
  })
}

const INITIAL_PARTITIONS = 3

export function PartitionScalerSimulator() {
  const shouldReduceMotion = useReducedMotion()
  const [partitionCount, setPartitionCount] = useState(INITIAL_PARTITIONS)
  const [consumerCount, setConsumerCount] = useState(2)
  const [records, setRecords] = useState<SimRecord[]>(() =>
    createInitialRecords(INITIAL_PARTITIONS),
  )
  const [idCounter, setIdCounter] = useState(5)
  const [messageKey, setMessageKey] = useState('customer-101')
  const [messageValue, setMessageValue] = useState('ثبت سفارش')
  const [changedKeys, setChangedKeys] = useState<string[]>([])
  const [status, setStatus] = useState(
    'تعداد پارتیشن‌ها و مصرف‌کننده‌ها را تغییر دهید و پیام بفرستید تا تاثیر آن را روی موازی‌سازی و ترتیب ببینید.',
  )

  const throughput = partitionCount * 12
  const activeConsumers = Math.min(partitionCount, consumerCount)
  const idleConsumers = consumerCount - activeConsumers

  const mapping = useMemo(() => {
    const keys = Array.from(
      new Set([...KEY_POOL, messageKey.trim()].filter((key) => key.length > 0)),
    )
    return keys.map((key) => ({
      key,
      hash: hashKey(key),
      partition: partitionForKey(key, partitionCount),
    }))
  }, [partitionCount, messageKey])

  function appendRecords(items: Array<{ key: string; value: string }>) {
    const offsets = new Map<number, number>()
    for (const record of records) {
      offsets.set(record.partition, Math.max(offsets.get(record.partition) ?? 0, record.offset + 1))
    }

    let nextId = idCounter
    const created = items.map((item) => {
      const partition = partitionForKey(item.key, partitionCount)
      const offset = offsets.get(partition) ?? 0
      offsets.set(partition, offset + 1)
      const record: SimRecord = {
        id: nextId,
        key: item.key,
        value: item.value,
        partition,
        offset,
      }
      nextId += 1
      return record
    })

    setRecords([...records, ...created])
    setIdCounter(nextId)
    return created
  }

  function handleSend() {
    const key = messageKey.trim()
    if (!key) {
      setStatus('برای ارسال پیام، یک کلید بنویسید یا یکی از کلیدهای آماده را انتخاب کنید.')
      return
    }

    const value = messageValue.trim() || 'پیام بدون متن'
    const [created] = appendRecords([{ key, value }])
    setStatus(
      `کلید «${key}» با هش ${toPersianDigits(hashKey(key))} به پارتیشن #${toPersianDigits(
        created.partition,
      )} با آفست ${toPersianDigits(created.offset)} رفت. پیام‌های بعدی همین کلید همیشه همین پارتیشن را می‌گیرند.`,
    )
  }

  function handleBulkSend() {
    const items = Array.from({ length: 15 }, (_, index) => ({
      key: KEY_POOL[index % KEY_POOL.length],
      value: VALUE_POOL[index % VALUE_POOL.length],
    }))
    const created = appendRecords(items)
    const last = created[created.length - 1]
    setStatus(
      `۱۵ پیام روی ${toPersianDigits(partitionCount)} پارتیشن پخش شد؛ حداکثر ${toPersianDigits(
        activeConsumers,
      )} مصرف‌کننده همزمان درگیر می‌شوند. آخرین پیام در پارتیشن #${toPersianDigits(
        last.partition,
      )} نشست.`,
    )
  }

  function handlePartitionChange(nextCount: number) {
    if (nextCount === partitionCount) return

    const keysToCheck = Array.from(
      new Set([...KEY_POOL, messageKey.trim()].filter((key) => key.length > 0)),
    )
    const moved = keysToCheck.filter(
      (key) => partitionForKey(key, nextCount) !== partitionForKey(key, partitionCount),
    )

    setPartitionCount(nextCount)
    setChangedKeys(moved)
    setRecords([])
    setIdCounter(5)
    setStatus(
      moved.length > 0
        ? `تعداد پارتیشن‌ها به ${toPersianDigits(nextCount)} تغییر کرد و تاپیک از نو ساخته شد. ${toPersianDigits(
            moved.length,
          )} کلید حالا به پارتیشن دیگری می‌روند؛ ترتیب قبلی این کلیدها بین پیام‌های قدیمی و جدید شکسته می‌شود!`
        : `تعداد پارتیشن‌ها به ${toPersianDigits(nextCount)} تغییر کرد. این کلیدها خوش‌شانس بودند و پارتیشن‌شان عوض نشد.`,
    )
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            شبیه‌ساز زنده مقیاس‌پذیری
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            پارتیشن بیشتر، موازی‌سازی بیشتر
          </h3>
        </div>
        <Badge variant="primary">
          <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          توان نظری: {toPersianDigits(throughput)} مگابایت بر ثانیه
        </Badge>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
            <h4 className="text-xs font-black text-primary-950 dark:text-primary-100">
              ۱. تعداد پارتیشن‌های تاپیک
            </h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PARTITION_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={partitionCount === count}
                  onClick={() => handlePartitionChange(count)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    partitionCount === count
                      ? 'bg-primary-600 text-white dark:bg-primary-500'
                      : 'border border-primary-200 bg-white text-slate-700 hover:bg-primary-50 dark:border-primary-800 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {toPersianDigits(count)} پارتیشن
                </button>
              ))}
            </div>

            <h4 className="mt-4 text-xs font-black text-primary-950 dark:text-primary-100">
              ۲. تعداد مصرف‌کننده‌ها (<Ltr>Consumers</Ltr>)
            </h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CONSUMER_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={consumerCount === count}
                  onClick={() => setConsumerCount(count)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                    consumerCount === count
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {toPersianDigits(count)}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-white/80 p-2.5 text-[11px] leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" aria-hidden="true" />
              <span>
                {toPersianDigits(activeConsumers)} مصرف‌کننده فعالانه پارتیشن می‌گیرند
                {idleConsumers > 0
                  ? ` و ${toPersianDigits(idleConsumers)} مصرف‌کننده بیکار می‌مانند!`
                  : ' و هیچ مصرف‌کننده‌ای بیکار نمی‌ماند.'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
              ۳. ارسال پیام با کلید
            </h4>
            <label
              htmlFor="partition-key-input"
              className="mt-2 block text-[11px] font-bold text-slate-500 dark:text-slate-400"
            >
              کلید (<Ltr>Key</Ltr>)
            </label>
            <input
              id="partition-key-input"
              type="text"
              dir="ltr"
              value={messageKey}
              onChange={(event) => setMessageKey(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-start font-mono text-xs text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {KEY_POOL.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMessageKey(key)}
                  className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-slate-400 dark:hover:text-primary-300"
                >
                  {key}
                </button>
              ))}
            </div>

            <label
              htmlFor="partition-value-input"
              className="mt-3 block text-[11px] font-bold text-slate-500 dark:text-slate-400"
            >
              مقدار (<Ltr>Value</Ltr>)
            </label>
            <input
              id="partition-value-input"
              type="text"
              value={messageValue}
              onChange={(event) => setMessageValue(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                variant="primary"
                onClick={handleSend}
                className="w-full"
                startIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                ارسال پیام
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkSend}
                className="w-full"
                startIcon={<Zap className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                ارسال ۱۵ پیام
              </Button>
            </div>
          </div>

          {changedKeys.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong>هشدار ترتیب:</strong>{' '}
                {changedKeys.map((key, index) => (
                  <span key={key}>
                    {index > 0 && '، '}
                    <code className="font-mono">{key}</code>
                  </span>
                ))}{' '}
                حالا پارتیشن دیگری دارند. پیام‌های قدیمی در پارتیشن قبلی مانده‌اند و
                ترتیب این کلید دیگر یکپارچه نیست.
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
              <Layers className="h-4 w-4 text-amber-500" aria-hidden="true" />
              تاپیک <Ltr className="font-mono">orders</Ltr> با{' '}
              {toPersianDigits(partitionCount)} پارتیشن
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              offset از صفر و مستقل برای هر پارتیشن
            </span>
          </div>

          <div
            className={`grid gap-3 ${
              partitionCount > 3 ? 'sm:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {Array.from({ length: partitionCount }, (_, partition) => {
              const partitionRecords = records.filter(
                (record) => record.partition === partition,
              )
              const style = PARTITION_STYLES[partition % PARTITION_STYLES.length]
              const lastOffset = partitionRecords[partitionRecords.length - 1]?.offset

              return (
                <div key={partition} className={`rounded-xl border-2 p-3 ${style.box}`}>
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-white dark:bg-slate-100 dark:text-slate-900">
                        P{toPersianDigits(partition)}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {toPersianDigits(partitionRecords.length)} پیام
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      LEO: {lastOffset === undefined ? '—' : toPersianDigits(lastOffset + 1)}
                    </span>
                  </div>

                  <div className="mt-2 flex min-h-[3.5rem] gap-1.5 overflow-x-auto pb-1">
                    <AnimatePresence initial={false}>
                      {partitionRecords.map((record) => (
                        <motion.div
                          key={record.id}
                          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`flex min-w-[5.5rem] shrink-0 flex-col rounded-lg border p-1.5 ${style.chip}`}
                        >
                          <span className="font-mono text-[9px] font-bold opacity-80">
                            #{toPersianDigits(record.offset)}
                          </span>
                          <span className="mt-0.5 truncate font-mono text-[9px] opacity-70">
                            {record.key}
                          </span>
                          <span className="mt-0.5 truncate text-[10px] font-bold">
                            {record.value}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {partitionRecords.length === 0 && (
                      <span className="self-center text-[10px] italic text-slate-400">
                        خالی
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300">
              <Hash className="h-3.5 w-3.5 text-primary-500" aria-hidden="true" />
              جدول مسیریابی <Ltr>hash(key) % partitions</Ltr>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {mapping.map((item) => {
                const moved = changedKeys.includes(item.key)
                return (
                  <span
                    key={item.key}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[10px] ${
                      moved
                        ? 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {item.key}
                    <span className="opacity-50">→</span>
                    <strong>P{toPersianDigits(item.partition)}</strong>
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-xs leading-6 text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
        <strong>نتیجه: </strong>
        {status}
      </div>
    </div>
  )
}
