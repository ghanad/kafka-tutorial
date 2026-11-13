import { useState } from 'react'
import { Combine, KeyRound, Scissors, Skull } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

const RECORD_SIZE_KB = 120

interface CompactableRecord {
  offset: number
  key: string
  value: string | null
}

const RECORDS: CompactableRecord[] = [
  { offset: 0, key: 'order-1', value: 'CREATED' },
  { offset: 1, key: 'order-2', value: 'CREATED' },
  { offset: 2, key: 'order-1', value: 'PAID' },
  { offset: 3, key: 'order-3', value: 'CREATED' },
  { offset: 4, key: 'order-2', value: null },
  { offset: 5, key: 'order-1', value: 'PAID' },
  { offset: 6, key: 'order-4', value: 'CREATED' },
  { offset: 7, key: 'order-4', value: 'CANCELLED' },
  { offset: 8, key: 'order-5', value: 'CREATED' },
  { offset: 9, key: 'order-1', value: 'SHIPPED' },
  { offset: 10, key: 'order-3', value: null },
  { offset: 11, key: 'order-4', value: 'CANCELLED' },
]

function computeCompacted(tombstonesExpired: boolean): CompactableRecord[] {
  const lastByKey = new Map<string, CompactableRecord>()
  for (const record of RECORDS) {
    lastByKey.set(record.key, record)
  }

  return Array.from(lastByKey.values())
    .filter((record) => !(tombstonesExpired && record.value === null))
    .sort((a, b) => a.offset - b.offset)
}

export function CompactionSimulator() {
  const [enabled, setEnabled] = useState(false)
  const [tombstonesExpired, setTombstonesExpired] = useState(false)

  const compacted = enabled ? computeCompacted(tombstonesExpired) : RECORDS
  const keptOffsets = new Set(compacted.map((record) => record.offset))
  const removed = RECORDS.filter((record) => !keptOffsets.has(record.offset))
  const reclaimedKb = removed.length * RECORD_SIZE_KB

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            شبیه‌ساز زنده Log Compaction
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            آخرین مقدار هر کلید باقی می‌ماند
          </h3>
        </div>
        <Badge variant={enabled ? 'success' : 'neutral'}>
          <Combine className="h-3.5 w-3.5" aria-hidden="true" />
          {enabled ? 'Compaction فعال' : 'بدون Compaction'}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={enabled ? 'secondary' : 'primary'}
          onClick={() => setEnabled((value) => !value)}
          startIcon={<Scissors className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          {enabled ? 'خاموش کردن Compaction' : 'اجرای Compaction'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEnabled(true)
            setTombstonesExpired((value) => !value)
          }}
          startIcon={<Skull className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          {tombstonesExpired
            ? 'بازگرداندن Tombstoneها'
            : 'گذشتن delete.retention.ms'}
        </Button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          <Ltr>cleanup.policy=compact</Ltr>
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              لاگ اصلی (قبل از پاک‌سازی)
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {toPersianDigits(RECORDS.length)} record
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {RECORDS.map((record) => {
              const isRemoved = enabled && !keptOffsets.has(record.offset)
              return (
                <div
                  key={record.offset}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[10px] ${
                    isRemoved
                      ? 'border-rose-200 bg-rose-50/60 text-rose-800 line-through decoration-rose-400 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
                      : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <span className="w-10 shrink-0 font-mono text-slate-400">
                    #{toPersianDigits(record.offset)}
                  </span>
                  <span className="w-16 shrink-0 truncate font-mono font-bold">
                    {record.key}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {record.value ?? 'null (Tombstone)'}
                  </span>
                  {isRemoved && (
                    <span className="shrink-0 rounded bg-rose-200 px-1 text-[9px] font-bold text-rose-800 no-underline dark:bg-rose-900 dark:text-rose-200">
                      حذف
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2 dark:border-emerald-900/60">
            <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
              {enabled ? 'نتیجه Compaction' : 'برای دیدن نتیجه، Compaction را روشن کنید'}
            </span>
            <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
              {toPersianDigits(compacted.length)} record
            </span>
          </div>

          <div className="mt-2 space-y-1">
            {!enabled && (
              <p className="py-6 text-center text-[11px] leading-6 text-emerald-800 dark:text-emerald-200">
                دکمه «اجرای Compaction» را بزنید تا ببینید کدام رکوردها حذف
                می‌شوند و آخرین مقدار هر کلید چطور باقی می‌ماند.
              </p>
            )}
            {enabled &&
              compacted.map((record) => (
              <div
                key={record.offset}
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-[10px] dark:border-emerald-900/60 dark:bg-slate-900"
              >
                <span className="w-10 shrink-0 font-mono text-slate-400">
                  #{toPersianDigits(record.offset)}
                </span>
                <span className="w-16 shrink-0 truncate font-mono font-bold text-slate-800 dark:text-slate-200">
                  {record.key}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">
                  {record.value ?? 'null (Tombstone)'}
                </span>
                {record.value === null && (
                  <span className="shrink-0 rounded bg-slate-200 px-1 text-[9px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    پاک‌شدن کلید
                  </span>
                )}
              </div>
            ))}
            {enabled && compacted.length === 0 && (
              <p className="py-3 text-center text-[10px] text-emerald-700 dark:text-emerald-300">
                همه رکوردها Tombstone بودند و پس از انقضا حذف شدند.
              </p>
            )}
          </div>

          {enabled && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-white/70 p-2 text-[10px] leading-5 text-emerald-900 dark:border-emerald-900/60 dark:bg-slate-900/60 dark:text-emerald-100">
              <p className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {toPersianDigits(removed.length)} رکورد حذف شد و{' '}
                {toPersianDigits((reclaimedKb / 1024).toFixed(1))} مگابایت آزاد شد.
              </p>
              <p className="mt-1 text-emerald-800/80 dark:text-emerald-200/80">
                آفست رکوردهای باقی‌مانده تغییر نمی‌کند؛ ۹ همان ۹ باقی می‌ماند. فقط
                جای خالی رکوردهای حذف‌شده در لاگ می‌ماند.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
        <strong className="text-slate-800 dark:text-slate-200">نکته:</strong>{' '}
        <Ltr>delete.retention.ms</Ltr> تعیین می‌کند Tombstoneها (رکورد با مقدار{' '}
        <Ltr>null</Ltr>) چه مدت بمانند. تا وقتی Tombstone نمانده، مصرف‌کننده‌ای که
        از ابتدا می‌خواند ممکن است مقدار قدیمی کلید را ببیند و آن را زنده فرض کند.
      </div>
    </div>
  )
}
