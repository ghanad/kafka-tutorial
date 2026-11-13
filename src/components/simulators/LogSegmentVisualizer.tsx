import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Clock,
  Database,
  FileText,
  ListPlus,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

const SEGMENT_CAPACITY = 4
const INDEX_INTERVAL = 2

const INITIAL_ITEMS = [
  { key: 'order-1001', value: 'ایجاد سفارش' },
  { key: 'order-1002', value: 'پرداخت موفق' },
  { key: 'order-1001', value: 'تایید انبار' },
  { key: 'order-1003', value: 'لغو سفارش' },
  { key: 'order-1002', value: 'ارسال شد' },
  { key: 'order-1004', value: 'ثبت مرجوعی' },
]

interface SegmentRecord {
  offset: number
  key: string
  value: string
  sizeBytes: number
  timestamp: number
}

interface IndexEntry {
  offset: number
  position: number
  timestamp: number
}

interface Segment {
  id: number
  baseOffset: number
  records: SegmentRecord[]
  isActive: boolean
  sizeBytes: number
  indexEntries: IndexEntry[]
}

function sizeForOffset(offset: number): number {
  return 1180 + ((offset * 7) % 5) * 240
}

function timestampForOffset(offset: number): number {
  return 1715600000000 + offset * 4000
}

function buildRecord(offset: number, key: string, value: string): SegmentRecord {
  return {
    offset,
    key,
    value,
    sizeBytes: sizeForOffset(offset),
    timestamp: timestampForOffset(offset),
  }
}

function createInitialRecords(): SegmentRecord[] {
  return INITIAL_ITEMS.map((item, index) =>
    buildRecord(index, item.key, item.value),
  )
}

function buildSegments(records: SegmentRecord[]): Segment[] {
  const count = Math.max(1, Math.ceil(records.length / SEGMENT_CAPACITY))

  return Array.from({ length: count }, (_, index) => {
    const baseOffset = index * SEGMENT_CAPACITY
    const segmentRecords = records.filter(
      (record) =>
        record.offset >= baseOffset && record.offset < baseOffset + SEGMENT_CAPACITY,
    )

    let runningPosition = 0
    const indexEntries: IndexEntry[] = []

    segmentRecords.forEach((record, localIndex) => {
      if (localIndex % INDEX_INTERVAL === 0) {
        indexEntries.push({
          offset: record.offset,
          position: runningPosition,
          timestamp: record.timestamp,
        })
      }
      runningPosition += record.sizeBytes
    })

    return {
      id: index,
      baseOffset,
      records: segmentRecords,
      isActive: index === count - 1,
      sizeBytes: runningPosition,
      indexEntries,
    }
  })
}

function formatTimestamp(timestamp: number): string {
  const seconds = Math.floor((timestamp - 1715600000000) / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

const APPEND_POOL = [
  { key: 'order-1005', value: 'ثبت سفارش جدید' },
  { key: 'order-1003', value: 'بازگشت به انبار' },
  { key: 'order-1006', value: 'پرداخت ناموفق' },
  { key: 'order-1004', value: 'تایید مرجوعی' },
  { key: 'order-1007', value: 'ارسال با پیک' },
  { key: 'order-1002', value: 'تحویل به مشتری' },
]

export function LogSegmentVisualizer() {
  const shouldReduceMotion = useReducedMotion()
  const [records, setRecords] = useState<SegmentRecord[]>(createInitialRecords)
  const [selectedOffset, setSelectedOffset] = useState<number | null>(5)
  const [status, setStatus] = useState(
    'روی هر رکورد کلیک کنید تا ببینید کافکا چطور با ایندکس، جای آن را پیدا می‌کند.',
  )

  const segments = buildSegments(records)
  const activeSegment = segments[segments.length - 1]
  const totalBytes = records.reduce((sum, record) => sum + record.sizeBytes, 0)

  const selectedSegment = segments.find((segment) =>
    segment.records.some((record) => record.offset === selectedOffset),
  )

  const lookup = (() => {
    if (!selectedSegment || selectedOffset === null) return null
    const entry =
      [...selectedSegment.indexEntries]
        .reverse()
        .find((item) => item.offset <= selectedOffset) ??
      selectedSegment.indexEntries[0]
    if (!entry) return null

    const scanned = selectedSegment.records.filter(
      (record) => record.offset >= entry.offset && record.offset <= selectedOffset,
    ).length

    return { entry, scanned }
  })()

  function appendRecords(count: number) {
    const startOffset = records.length
    const added = Array.from({ length: count }, (_, index) => {
      const poolItem = APPEND_POOL[(startOffset + index) % APPEND_POOL.length]
      return buildRecord(startOffset + index, poolItem.key, poolItem.value)
    })

    const nextRecords = [...records, ...added]
    const previousSegments = Math.max(1, Math.ceil(records.length / SEGMENT_CAPACITY))
    const nextSegments = Math.max(1, Math.ceil(nextRecords.length / SEGMENT_CAPACITY))
    setRecords(nextRecords)
    setSelectedOffset(added[added.length - 1].offset)

    setStatus(
      nextSegments > previousSegments
        ? `سگمنت فعال پر شد؛ یک سگمنت تازه با آفست پایه ${toPersianDigits(
            (nextSegments - 1) * SEGMENT_CAPACITY,
          )} ساخته شد و نوشتن روی آن ادامه پیدا کرد.`
        : `${toPersianDigits(count)} رکورد در انتهای سگمنت فعال نوشته شد؛ آفست‌ها از ${toPersianDigits(
            added[0].offset,
          )} تا ${toPersianDigits(added[added.length - 1].offset)} ادامه یافتند.`,
    )
  }

  function reset() {
    setRecords(createInitialRecords())
    setSelectedOffset(5)
    setStatus('وضعیت به دو سگمنت اولیه برگشت.')
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            شبیه‌ساز زنده ذخیره‌سازی روی دیسک
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            یک پارتیشن، چند سگمنت، سه فایل
          </h3>
        </div>
        <Badge variant="primary">
          <Database className="h-3.5 w-3.5" aria-hidden="true" />
          حجم کل: {toPersianDigits((totalBytes / 1024).toFixed(1))} کیلوبایت
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => appendRecords(1)}
          startIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          افزودن یک رکورد
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => appendRecords(3)}
          startIcon={<ListPlus className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          افزودن ۳ رکورد
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={reset}
          startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          بازنشانی
        </Button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          هر سگمنت نمادین دقیقاً {toPersianDigits(SEGMENT_CAPACITY)} رکورد جا می‌دهد.
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={`rounded-xl border-2 p-3 transition-colors ${
              segment.isActive
                ? 'border-primary-300 bg-primary-50/40 dark:border-primary-800 dark:bg-primary-950/20'
                : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-white dark:bg-slate-100 dark:text-slate-900">
                  <Ltr>
                    {String(segment.baseOffset).padStart(20, '0')}
                  </Ltr>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  آفست پایه {toPersianDigits(segment.baseOffset)}
                </span>
                {segment.isActive && <Badge variant="success">سگمنت فعال</Badge>}
                {!segment.isActive && <Badge variant="neutral">بسته‌شده</Badge>}
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                {toPersianDigits(segment.records.length)} record
              </span>
            </div>

            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              <AnimatePresence initial={false}>
                {segment.records.map((record) => {
                  const isSelected = record.offset === selectedOffset
                  return (
                    <motion.button
                      key={record.offset}
                      type="button"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        setSelectedOffset(record.offset)
                        setStatus(
                          `آفست ${toPersianDigits(record.offset)} انتخاب شد؛ مسیر خواندن آن را در پایین ببینید.`,
                        )
                      }}
                      aria-pressed={isSelected}
                      className={`flex min-w-[8.5rem] shrink-0 flex-col rounded-lg border p-2 text-start transition-colors ${
                        isSelected
                          ? 'border-primary-500 bg-white ring-2 ring-primary-300 dark:bg-slate-900 dark:ring-primary-700'
                          : 'border-slate-300 bg-white hover:border-primary-300 dark:border-slate-700 dark:bg-slate-900'
                      }`}
                    >
                      <span className="flex items-center justify-between font-mono text-[9px] font-bold text-primary-700 dark:text-primary-300">
                        offset {toPersianDigits(record.offset)}
                        <span className="text-slate-400">
                          {formatTimestamp(record.timestamp)}
                        </span>
                      </span>
                      <span className="mt-1 truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {record.key}
                      </span>
                      <span className="mt-0.5 truncate text-[11px] font-bold text-slate-900 dark:text-white">
                        {record.value}
                      </span>
                      <span className="mt-0.5 font-mono text-[9px] text-slate-400">
                        {toPersianDigits(record.sizeBytes)} byte
                      </span>
                    </motion.button>
                  )
                })}
              </AnimatePresence>

              {segment.records.length === 0 && (
                <span className="self-center text-[11px] italic text-slate-400">
                  سگمنت خالی؛ آماده نوشتن
                </span>
              )}
            </div>

            <div className="mt-2 grid gap-1.5 text-[10px] sm:grid-cols-3">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                <FileText className="h-3.5 w-3.5 shrink-0 text-primary-500" aria-hidden="true" />
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  <Ltr>.log</Ltr>
                </span>
                <span className="ms-auto text-slate-400">
                  {toPersianDigits((segment.sizeBytes / 1024).toFixed(1))} KB
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                <Search className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  <Ltr>.index</Ltr>
                </span>
                <span className="ms-auto text-slate-400">
                  {toPersianDigits(segment.indexEntries.length)} entry
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  <Ltr>.timeindex</Ltr>
                </span>
                <span className="ms-auto text-slate-400">
                  {toPersianDigits(segment.indexEntries.length)} entry
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
        <p className="flex items-center gap-1.5 text-[11px] font-black text-slate-800 dark:text-slate-200">
          <Search className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
          مسیر خواندن آفست {selectedOffset === null ? '—' : toPersianDigits(selectedOffset)}
        </p>

        {lookup && selectedSegment ? (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              {selectedSegment.indexEntries.map((entry) => {
                const isUsed = entry.offset === lookup.entry.offset
                return (
                  <span
                    key={`${entry.offset}-${entry.position}`}
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono ${
                      isUsed
                        ? 'border-emerald-400 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    offset {entry.offset} <span className="opacity-50">→</span> pos{' '}
                    {entry.position}
                  </span>
                )
              })}
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-[11px] leading-6 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
              کافکا با <strong>جست‌وجوی دودویی</strong> روی <Ltr>.index</Ltr> نزدیک‌ترین
              ورودی با آفست کوچک‌تر یا مساوی را پیدا می‌کند: آفست{' '}
              <strong>{toPersianDigits(lookup.entry.offset)}</strong> در موقعیت بایتی{' '}
              <strong>{toPersianDigits(lookup.entry.position)}</strong>. سپس از همان‌جا
              حداکثر <strong>{toPersianDigits(lookup.scanned)}</strong> رکورد را خطی
              می‌خواند تا به آفست {toPersianDigits(selectedOffset ?? 0)} برسد؛ نه از
              اول کل سگمنت.
            </div>

            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {selectedSegment.indexEntries.map((entry) => (
                <span
                  key={`time-${entry.offset}`}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {entry.timestamp} <span className="opacity-50">→</span> {entry.offset}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-slate-400">رکوردی برای بررسی انتخاب نشده است.</p>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-xs leading-6 text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
        <strong>وضعیت: </strong>
        {status}
      </div>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        در کافکا ورودی‌های ایندکس بر اساس بایت نوشته می‌شوند، نه شماره رکورد؛ اینجا
        برای سادگی موقعیت بایتی تقریبی نمایش داده شده است. سگمنت فعال (
        <Ltr>{String(activeSegment.baseOffset).padStart(20, '0')}</Ltr>) همیشه آخرین
        سگمنت پارتیشن است.
      </p>
    </div>
  )
}
