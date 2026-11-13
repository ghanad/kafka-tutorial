import { useState } from 'react'
import {
  CalendarClock,
  Database,
  HardDrive,
  Scissors,
  Trash2,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

const SEGMENT_CAPACITY = 4
const RECORD_SIZE_KB = 120
const VALUE_POOL = [
  'ایجاد سفارش',
  'پرداخت موفق',
  'تایید انبار',
  'ارسال شد',
  'تحویل مشتری',
]

interface RetentionRecord {
  offset: number
  key: string
  value: string
  createdDay: number
}

function createRecords(): RetentionRecord[] {
  return Array.from({ length: 20 }, (_, index) => ({
    offset: index,
    key: `order-${1000 + index}`,
    value: VALUE_POOL[index % VALUE_POOL.length],
    createdDay: index,
  }))
}

const RECORDS = createRecords()

export function RetentionSimulator() {
  const [currentDay, setCurrentDay] = useState(14)
  const [retentionDays, setRetentionDays] = useState(5)

  const isExpired = (record: RetentionRecord) =>
    currentDay - record.createdDay > retentionDays

  const segmentCount = Math.ceil(RECORDS.length / SEGMENT_CAPACITY)
  const segments = Array.from({ length: segmentCount }, (_, index) => {
    const baseOffset = index * SEGMENT_CAPACITY
    const records = RECORDS.filter(
      (record) =>
        record.offset >= baseOffset && record.offset < baseOffset + SEGMENT_CAPACITY,
    )
    const isActive = index === segmentCount - 1
    const allExpired = records.every(isExpired)
    return {
      baseOffset,
      records,
      isActive,
      allExpired,
      deleted: allExpired && !isActive,
    }
  })

  const deletedRecords = segments
    .filter((segment) => segment.deleted)
    .flatMap((segment) => segment.records)
  const remainingRecords = RECORDS.filter(
    (record) => !deletedRecords.some((deleted) => deleted.offset === record.offset),
  )
  const expiredRecords = RECORDS.filter(isExpired)
  const logStartOffset =
    segments.find((segment) => !segment.deleted)?.baseOffset ?? RECORDS.length

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            شبیه‌ساز زنده Retention
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            حذف فقط در سطح سگمنت انجام می‌شود
          </h3>
        </div>
        <Badge variant="primary">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          log start offset: {toPersianDigits(logStartOffset)}
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <span className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <span>سیاست نگهداری (روز)</span>
            <span className="rounded bg-primary-100 px-1.5 py-0.5 font-mono text-primary-700 dark:bg-primary-950 dark:text-primary-200">
              {toPersianDigits(retentionDays)}d
            </span>
          </span>
          <input
            type="range"
            min={1}
            max={14}
            value={retentionDays}
            onChange={(event) => setRetentionDays(Number(event.target.value))}
            className="mt-2 w-full accent-primary-600"
            aria-label="مدت نگهداری به روز"
          />
        </label>

        <label className="block rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <span className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <span>زمان فعلی (روز)</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              day {toPersianDigits(currentDay)}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={30}
            value={currentDay}
            onChange={(event) => setCurrentDay(Number(event.target.value))}
            className="mt-2 w-full accent-primary-600"
            aria-label="زمان فعلی به روز"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">کل رکوردها</p>
          <p className="font-mono text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(RECORDS.length)}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-900/60 dark:bg-amber-950/20">
          <p className="text-[10px] text-amber-700 dark:text-amber-300">رکورد منقضی</p>
          <p className="font-mono text-lg font-black text-amber-800 dark:text-amber-200">
            {toPersianDigits(expiredRecords.length)}
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2 dark:border-rose-900/60 dark:bg-rose-950/20">
          <p className="text-[10px] text-rose-700 dark:text-rose-300">واقعاً حذف‌شده</p>
          <p className="font-mono text-lg font-black text-rose-800 dark:text-rose-200">
            {toPersianDigits(deletedRecords.length)}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <p className="text-[10px] text-emerald-700 dark:text-emerald-300">حجم باقی‌مانده</p>
          <p className="font-mono text-lg font-black text-emerald-800 dark:text-emerald-200">
            {toPersianDigits(((remainingRecords.length * RECORD_SIZE_KB) / 1024).toFixed(1))} MB
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {segments.map((segment) => (
          <div
            key={segment.baseOffset}
            className={`rounded-xl border-2 p-2.5 ${
              segment.deleted
                ? 'border-rose-200 bg-rose-50/40 opacity-70 dark:border-rose-900/60 dark:bg-rose-950/20'
                : segment.isActive
                  ? 'border-primary-300 bg-primary-50/40 dark:border-primary-800 dark:bg-primary-950/20'
                  : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <Database className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                segment {String(segment.baseOffset).padStart(20, '0')}
              </span>
              {segment.isActive ? (
                <Badge variant="success">سگمنت فعال؛ هرگز حذف نمی‌شود</Badge>
              ) : segment.deleted ? (
                <Badge variant="danger">حذف کامل سگمنت</Badge>
              ) : (
                <Badge variant="warning">دارای رکورد منقضی؛ ولی نگه داشته می‌شود</Badge>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {segment.records.map((record) => {
                const expired = isExpired(record)
                return (
                  <span
                    key={record.offset}
                    className={`inline-flex flex-col rounded-lg border px-2 py-1 text-[10px] ${
                      expired
                        ? 'border-amber-300 bg-amber-100/70 text-amber-900 line-through decoration-amber-500 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-mono font-bold">
                      #{toPersianDigits(record.offset)}
                    </span>
                    <span className="font-mono text-[9px] opacity-70">
                      {record.key}
                    </span>
                    <span className="text-[9px] opacity-80">
                      روز {toPersianDigits(record.createdDay)}
                    </span>
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-xs leading-6 text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
        <p className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            رکوردهای قدیمی‌تر از {toPersianDigits(retentionDays)} روز منقضی‌اند، اما
            کافکا فقط سگمنت‌هایی را حذف می‌کند که <strong>تمام رکوردهایشان</strong>{' '}
            منقضی شده باشد. به همین دلیل {toPersianDigits(expiredRecords.length)}{' '}
            رکورد منقضی داریم ولی فقط {toPersianDigits(deletedRecords.length)} رکورد
            واقعاً حذف شده است.
          </span>
        </p>
        <p className="mt-2 flex items-start gap-2 border-t border-primary-200/60 pt-2 dark:border-primary-900/60">
          <Scissors className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            برای همان {toPersianDigits(deletedRecords.length)} رکورد حذف‌شده،{' '}
            {toPersianDigits(
              ((deletedRecords.length * RECORD_SIZE_KB) / 1024).toFixed(1),
            )}{' '}
            مگابایت دیسک آزاد می‌شود؛ نقطه شروع لاگ (<Ltr>log start offset</Ltr>)
            به {toPersianDigits(logStartOffset)} می‌رسد و آفست‌ها بازنویسی نمی‌شوند.
          </span>
        </p>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
        <HardDrive className="h-3 w-3" aria-hidden="true" />
        هر رکورد نمادین {toPersianDigits(RECORD_SIZE_KB)} کیلوبایت در نظر گرفته شده است.
      </p>
    </div>
  )
}
