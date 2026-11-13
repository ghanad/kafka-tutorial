import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Send,
  Hash,
  Layers,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { Badge } from '../ui/Badge'
import { toPersianDigits } from '../../utils/persianDigits'

interface SimulatedRecord {
  id: string
  key: string
  value: string
  partition: number
  offset: number
  timestamp: string
}

// Simple deterministic hash for demo
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const PRESET_KEYS = ['customer-101', 'customer-102', 'customer-550', 'null (بدون کلید)']

export function PartitionRoutingSimulator() {
  const shouldReduceMotion = useReducedMotion()
  const [selectedKey, setSelectedKey] = useState<string>('customer-101')
  const [customKey, setCustomKey] = useState<string>('')
  const [recordValue, setRecordValue] = useState<string>('خرید کفش ورزشی')
  const [roundRobinIdx, setRoundRobinIdx] = useState<number>(0)

  // 3 Partitions with initial records
  const [records, setRecords] = useState<SimulatedRecord[]>([
    { id: '1', key: 'customer-101', value: 'سفارش ۱۲', partition: 0, offset: 0, timestamp: '۱۰:۰۰' },
    { id: '2', key: 'customer-102', value: 'سفارش ۱۵', partition: 1, offset: 0, timestamp: '۱۰:۰۱' },
    { id: '3', key: 'customer-101', value: 'پرداخت ۱۲', partition: 0, offset: 1, timestamp: '۱۰:۰۲' },
    { id: '4', key: 'customer-550', value: 'ورود به حساب', partition: 2, offset: 0, timestamp: '۱۰:۰۳' },
  ])

  const [lastRouteInfo, setLastRouteInfo] = useState<string>(
    'یک کلید انتخاب کنید یا بنویسید و پیام را بفرستید تا ببینید هش کلید چطور پارتیشن مقصد را مشخص می‌کند.'
  )

  const activeKey = customKey.trim() ? customKey.trim() : selectedKey

  const handleSend = () => {
    if (!recordValue.trim()) return

    const isNullKey = activeKey.startsWith('null')
    let targetPartition = 0

    if (isNullKey) {
      targetPartition = roundRobinIdx % 3
      setRoundRobinIdx((prev) => prev + 1)
    } else {
      // Deterministic Murmur-like hash modulo 3 partitions
      targetPartition = simpleHash(activeKey) % 3
    }

    const currentOffsetInPartition = records.filter((r) => r.partition === targetPartition).length
    const now = new Date()
    const timeStr = `${toPersianDigits(now.getHours())}:${toPersianDigits(
      now.getMinutes().toString().padStart(2, '0')
    )}`

    const newRecord: SimulatedRecord = {
      id: Math.random().toString(36).substring(2, 7),
      key: isNullKey ? 'null' : activeKey,
      value: recordValue.trim(),
      partition: targetPartition,
      offset: currentOffsetInPartition,
      timestamp: timeStr,
    }

    setRecords((prev) => [...prev, newRecord])

    if (isNullKey) {
      setLastRouteInfo(
        `پیام بدون کلید (null) بود، بنابراین به روش چرخشی (Round-Robin) به پارتیشن #${toPersianDigits(
          targetPartition
        )} با آفست ${toPersianDigits(currentOffsetInPartition)} فرستاده شد.`
      )
    } else {
      setLastRouteInfo(
        `کلید «${activeKey}» هش شد و به پارتیشن #${toPersianDigits(
          targetPartition
        )} هدایت شد. تمام پیام‌های آینده با همین کلید حتماً به همین پارتیشن می‌روند!`
      )
    }
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            شبیه‌ساز زنده پارتیشن‌بندی
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            نقش کلید (<Ltr>Key</Ltr>) در تعیین پارتیشن و تضمین ترتیب رویدادها
          </h3>
        </div>
        <Badge variant="primary">
          <Hash className="h-3.5 w-3.5 me-1" />
          <Ltr>hash(Key) % Partitions</Ltr>
        </Badge>
      </div>

      {/* Simulator Body */}
      <div className="mt-5 grid gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
            <h4 className="text-xs font-black text-primary-950 dark:text-primary-100">
              ۱. انتخاب یا نوشتن کلید پیام (<Ltr>Message Key</Ltr>)
            </h4>

            {/* Preset Key Buttons */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setSelectedKey(k)
                    setCustomKey('')
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all ${
                    activeKey === k && !customKey
                      ? 'bg-primary-600 text-white shadow-xs dark:bg-primary-500'
                      : 'border border-primary-200 bg-white text-slate-700 hover:bg-primary-50 dark:border-primary-800 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <label htmlFor="custom-key-input" className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                یا کلید دلخواه بنویسید:
              </label>
              <input
                id="custom-key-input"
                type="text"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="مثلاً: user-999 یا order-44"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="record-value-input" className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                ۲. متن یا بدنه پیام (<Ltr>Value</Ltr>):
              </label>
              <input
                id="record-value-input"
                type="text"
                value={recordValue}
                onChange={(e) => setRecordValue(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-4">
              <Button
                size="sm"
                variant="primary"
                onClick={handleSend}
                className="w-full"
                startIcon={<Send className="h-3.5 w-3.5" />}
              >
                ارسال پیام و مشاهده مسیریابی
              </Button>
            </div>
          </div>

          {/* Educational Note */}
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
            <Info className="h-4 w-4 shrink-0 text-primary-500 mt-0.5" />
            <span>
              <strong>قانون طلایی:</strong> اگر ۱۰ پیام با کلید <code className="font-mono text-primary-600">customer-101</code> بفرستید،
              هر ۱۰ پیام دقیقاً وارد همان پارتیشن می‌شوند و ترتیب زمانی آن‌ها ۱۰۰٪ تضمین می‌شود.
            </span>
          </div>
        </div>

        {/* 3 Partitions Display Column */}
        <div className="space-y-3 lg:col-span-7">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
              <Layers className="h-4 w-4 text-amber-500" />
              وضعیت ۳ پارتیشن تاپیک <Ltr className="font-mono text-primary-600">orders</Ltr>:
            </span>
            <span className="text-[11px] text-slate-400">ظرفیت توزیع افقی</span>
          </div>

          {/* Partitions 0, 1, 2 */}
          {[0, 1, 2].map((pNum) => {
            const pRecords = records.filter((r) => r.partition === pNum)
            const colors = [
              'border-blue-300 bg-blue-50/30 dark:border-blue-900/60 dark:bg-blue-950/20',
              'border-emerald-300 bg-emerald-50/30 dark:border-emerald-900/60 dark:bg-emerald-950/20',
              'border-purple-300 bg-purple-50/30 dark:border-purple-900/60 dark:bg-purple-950/20',
            ]

            return (
              <div
                key={pNum}
                className={`rounded-xl border-2 p-3 transition-all ${colors[pNum]}`}
              >
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-white dark:bg-slate-100 dark:text-slate-900">
                      پارتیشن #{toPersianDigits(pNum)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      ({toPersianDigits(pRecords.length)} پیام)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    آخرین آفست: {toPersianDigits(pRecords.length > 0 ? pRecords.length - 1 : 0)}
                  </span>
                </div>

                {/* Horizontal log tape of records */}
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  <AnimatePresence initial={false}>
                    {pRecords.map((rec) => (
                      <motion.div
                        key={rec.id}
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex shrink-0 flex-col justify-between rounded-lg border border-slate-300 bg-white p-2 shadow-2xs dark:border-slate-700 dark:bg-slate-800 min-w-[130px]"
                      >
                        <div className="flex items-center justify-between text-[9.5px]">
                          <span className="rounded bg-primary-100 px-1 font-mono font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                            Offset {toPersianDigits(rec.offset)}
                          </span>
                          <span className="text-slate-400">{rec.timestamp}</span>
                        </div>
                        <div className="mt-1 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">
                          🔑 {rec.key}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-900 dark:text-white truncate">
                          {rec.value}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {pRecords.length === 0 && (
                    <div className="py-2 text-[11px] text-slate-400 italic">
                      هنوز پیامی در این پارتیشن ثبت نشده است.
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Live Routing Result Banner */}
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-xs text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
        <div>
          <span className="font-extrabold">نتیجه مسیردهی: </span>
          <span>{lastRouteInfo}</span>
        </div>
      </div>
    </div>
  )
}
