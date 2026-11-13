import { useState } from 'react'
import {
  Activity,
  Crown,
  Eye,
  Power,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

interface Replica {
  id: number
  alive: boolean
  lagging: boolean
  log: number[]
}

const INITIAL_REPLICAS: Replica[] = [
  { id: 1, alive: true, lagging: false, log: [0, 1, 2] },
  { id: 2, alive: true, lagging: false, log: [0, 1, 2] },
  { id: 3, alive: true, lagging: false, log: [0, 1, 2] },
]

export function ReplicationSimulator() {
  const [replicas, setReplicas] = useState<Replica[]>(INITIAL_REPLICAS)
  const [leaderId, setLeaderId] = useState<number | null>(1)
  const [nextOffset, setNextOffset] = useState(3)
  const [consumerOffset, setConsumerOffset] = useState(0)
  const [uncleanAllowed, setUncleanAllowed] = useState(false)
  const [status, setStatus] = useState(
    'یک رکورد تولید کنید و ببینید چطور روی لیدر و فالوورها تکرار می‌شود و High Watermark کجا می‌ایستد.',
  )

  const leaderReplica = replicas.find((replica) => replica.id === leaderId)
  const isrReplicas = replicas.filter((replica) => replica.alive && !replica.lagging)
  const isrIds = isrReplicas.map((replica) => replica.id)
  const highWatermark =
    leaderId !== null && isrReplicas.length > 0
      ? Math.min(...isrReplicas.map((replica) => replica.log.length))
      : 0
  const leaderLogLength = leaderReplica?.log.length ?? 0
  const committedRecords = leaderReplica
    ? leaderReplica.log.slice(0, highWatermark)
    : []

  function produceRecord() {
    if (!leaderReplica) {
      setStatus('پارتیشن لیدر ندارد؛ ابتدا یک بروکر را روشن کنید تا لیدر انتخاب شود.')
      return
    }
    if (isrReplicas.length === 0) {
      setStatus('هیچ نسخه‌ای در ISR نیست؛ نوشتن متوقف است.')
      return
    }

    const offset = nextOffset
    setReplicas(
      replicas.map((replica) => {
        if (!replica.alive) return replica
        if (replica.id !== leaderId && replica.lagging) return replica
        return { ...replica, log: [...replica.log, offset] }
      }),
    )
    setNextOffset(offset + 1)
    setStatus(
      `رکورد با آفست ${toPersianDigits(offset)} روی لیدر نوشته شد و به ${toPersianDigits(
        isrReplicas.length - 1,
      )} فالوور داخل ISR رسید؛ High Watermark به ${toPersianDigits(offset + 1)} رسید.`,
    )
  }

  function toggleLag(replicaId: number) {
    const target = replicas.find((replica) => replica.id === replicaId)
    if (!target) return
    if (replicaId === leaderId) {
      setStatus('لیدر را نمی‌توان از همگام‌سازی عقب انداخت؛ لیدر مرجع است.')
      return
    }
    if (!target.alive) {
      setStatus(`بروکر ${toPersianDigits(replicaId)} خاموش است؛ ابتدا آن را روشن کنید.`)
      return
    }

    if (!target.lagging) {
      setReplicas(
        replicas.map((replica) =>
          replica.id === replicaId ? { ...replica, lagging: true } : replica,
        ),
      )
      setStatus(
        `بروکر ${toPersianDigits(replicaId)} از همگام‌سازی عقب افتاد؛ پس از گذشت replica.lag.time.max.ms از ISR خارج می‌شود. تا آن زمان نوشتن با acks=all معطل می‌ماند.`,
      )
      return
    }

    if (!leaderReplica) {
      setStatus(
        'لیدری وجود ندارد؛ ابتدا یک بروکر را روشن کنید تا لیدر انتخاب شود، سپس این بروکر را همگام کنید.',
      )
      return
    }

    const leaderLog = leaderReplica.log
    setReplicas(
      replicas.map((replica) =>
        replica.id === replicaId
          ? { ...replica, lagging: false, log: [...leaderLog] }
          : replica,
      ),
    )
    setStatus(
      `بروکر ${toPersianDigits(replicaId)} رکوردهای عقب‌مانده را از لیدر گرفت، به ISR برگشت و High Watermark می‌تواند جلو برود.`,
    )
  }

  function killLeader() {
    if (!leaderReplica) {
      setStatus('لیدری وجود ندارد که خاموش شود.')
      return
    }

    const failedLeader = leaderReplica
    const survivors = replicas.map((replica) =>
      replica.id === leaderId ? { ...replica, alive: false } : replica,
    )
    const candidates = survivors.filter((replica) => replica.alive && !replica.lagging)

    if (candidates.length > 0) {
      const nextLeader = candidates.reduce((best, replica) =>
        replica.log.length > best.log.length ? replica : best,
      )
      setReplicas(survivors)
      setLeaderId(nextLeader.id)
      setStatus(
        `لیدر ${toPersianDigits(failedLeader.id)} خاموش شد. کنترلر از میان ISR، بروکر ${toPersianDigits(
          nextLeader.id,
        )} را با بیشترین لاگ به عنوان لیدر جدید انتخاب کرد؛ داده‌ای از بین نرفت.`,
      )
      return
    }

    const aliveReplicas = survivors.filter((replica) => replica.alive)
    if (!uncleanAllowed) {
      setReplicas(survivors)
      setLeaderId(null)
      setStatus(
        'هیچ نسخه سالمی در ISR نماند و Unclean Election غیرفعال است؛ پارتیشن آفلاین شد و تا بازگشت یک نسخه، نوشتن و خواندن ممکن نیست.',
      )
      return
    }

    if (aliveReplicas.length === 0) {
      setReplicas(survivors)
      setLeaderId(null)
      setStatus('همه بروکرها خاموش‌اند؛ پارتیشن کاملاً آفلاین است.')
      return
    }

    const nextLeader = aliveReplicas.reduce((best, replica) =>
      replica.log.length > best.log.length ? replica : best,
    )
    const lostRecords = failedLeader.log.length - nextLeader.log.length
    setReplicas(survivors)
    setLeaderId(nextLeader.id)
    setStatus(
      `Unclean Election فعال شد و بروکر ${toPersianDigits(
        nextLeader.id,
      )} بدون هماهنگی ISR لیدر شد.${
        lostRecords > 0
          ? ` ${toPersianDigits(lostRecords)} رکورد commitنشده از بین رفت!`
          : ''
      }`,
    )
  }

  function recoverBroker() {
    const deadReplica = replicas.find((replica) => !replica.alive)
    if (!deadReplica) {
      setStatus('همه بروکرها روشن‌اند؛ بروکری برای بازیابی وجود ندارد.')
      return
    }

    const leaderLog = leaderReplica?.log ?? deadReplica.log
    const recovered = replicas.map((replica) =>
      replica.id === deadReplica.id
        ? { ...replica, alive: true, lagging: false, log: [...leaderLog] }
        : replica,
    )

    if (!leaderId) {
      const aliveAfterRecovery = recovered.filter((replica) => replica.alive)
      const nextLeader = aliveAfterRecovery.reduce((best, replica) =>
        replica.log.length > best.log.length ? replica : best,
      )
      setReplicas(recovered)
      setLeaderId(nextLeader.id)
      setStatus(
        `بروکر ${toPersianDigits(
          deadReplica.id,
        )} روشن شد. چون پارتیشن لیدر نداشت، نسخه‌ای با بیشترین لاگ (بروکر ${toPersianDigits(
          nextLeader.id,
        )}) لیدر شد و نوشتن دوباره ممکن است. نسخه‌های عقب‌مانده باید از این لیدر همگام شوند.`,
      )
      return
    }

    setReplicas(recovered)
    setStatus(
      `بروکر ${toPersianDigits(deadReplica.id)} روشن شد، لاگ خود را تا آفست ${toPersianDigits(
        leaderLog.length,
      )} از لیدر همگام کرد و دوباره به ISR برگشت.`,
    )
  }

  function consumeCommitted() {
    if (!leaderReplica) {
      setStatus('پارتیشن لیدر ندارد؛ خواندن ممکن نیست.')
      return
    }
    if (highWatermark === 0) {
      setStatus('هنوز هیچ رکورد commitشده‌ای وجود ندارد.')
      return
    }

    setConsumerOffset(highWatermark)
    setStatus(
      `مصرف‌کننده فقط تا High Watermark می‌خواند: آفست‌های ${toPersianDigits(
        0,
      )} تا ${toPersianDigits(highWatermark - 1)} خوانده شدند. رکوردهای بالاتر از HW برای مصرف‌کننده نامرئی‌اند.`,
    )
  }

  function reset() {
    setReplicas(INITIAL_REPLICAS)
    setLeaderId(1)
    setNextOffset(3)
    setConsumerOffset(0)
    setUncleanAllowed(false)
    setStatus('وضعیت به ابتدا برگشت: سه نسخه همگام، لیدر ۱ و High Watermark برابر ۳.')
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            شبیه‌ساز زنده Replication
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            Leader، Follower، ISR و High Watermark
          </h3>
        </div>
        <Badge variant={isrIds.length >= 2 ? 'success' : 'warning'}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          ISR: {isrIds.length === 0 ? 'خالی' : isrIds.map((id) => toPersianDigits(id)).join('، ')}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={produceRecord}
          startIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          تولید رکورد
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={consumeCommitted}
          startIcon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          خواندن تا HW
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={killLeader}
          startIcon={<Power className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          خاموش کردن لیدر
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={recoverBroker}
          startIcon={<Activity className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          روشن کردن بروکر
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={reset}
          startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          بازنشانی
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setUncleanAllowed((value) => !value)}
          aria-pressed={uncleanAllowed}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
            uncleanAllowed
              ? 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
              : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
          Unclean Election: {uncleanAllowed ? 'مجاز' : 'غیرمجاز'}
        </button>
        <span className="text-[10px] text-slate-400">
          برای دیدن فاجعه، Unclean را روشن کنید، هر دو فالوور را کند کنید، یک رکورد
          دیگر تولید کنید و لیدر را خاموش کنید.
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {replicas.map((replica) => {
          const isLeader = replica.id === leaderId
          const inSync = replica.alive && !replica.lagging
          const lag = Math.max(0, leaderLogLength - replica.log.length)
          return (
            <div
              key={replica.id}
              className={`rounded-xl border-2 p-3 ${
                !replica.alive
                  ? 'border-slate-200 bg-slate-100/60 opacity-60 dark:border-slate-800 dark:bg-slate-950/40'
                  : isLeader
                    ? 'border-primary-400 bg-primary-50/50 dark:border-primary-700 dark:bg-primary-950/30'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  Broker {toPersianDigits(replica.id)}
                </span>
                {isLeader ? (
                  <Badge variant="primary">
                    <Crown className="h-3 w-3" aria-hidden="true" />
                    Leader
                  </Badge>
                ) : !replica.alive ? (
                  <Badge variant="danger">خاموش</Badge>
                ) : inSync ? (
                  <Badge variant="success">Follower / ISR</Badge>
                ) : (
                  <Badge variant="warning">خارج از ISR</Badge>
                )}
              </div>

              <div className="mt-2 flex min-h-[2.75rem] flex-wrap gap-1" aria-hidden="true">
                {replica.log.map((offset) => {
                  const isCommitted = offset < highWatermark
                  const isLeaderRecord = isLeader && offset >= highWatermark
                  return (
                    <span
                      key={offset}
                      className={`flex h-6 min-w-6 items-center justify-center rounded px-1 font-mono text-[9px] font-bold ${
                        isCommitted
                          ? 'bg-primary-600 text-white dark:bg-primary-500 dark:text-slate-950'
                          : isLeaderRecord
                            ? 'bg-amber-400 text-amber-950'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {toPersianDigits(offset)}
                    </span>
                  )
                })}
                {replica.log.length === 0 && (
                  <span className="text-[10px] italic text-slate-400">لاگ خالی</span>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-slate-500 dark:text-slate-400">
                <span>LEO: {toPersianDigits(replica.log.length)}</span>
                {!isLeader && replica.alive && (
                  <span className={lag > 0 ? 'font-bold text-amber-600 dark:text-amber-400' : ''}>
                    lag: {toPersianDigits(lag)}
                  </span>
                )}
              </div>

              {!isLeader && replica.alive && (
                <button
                  type="button"
                  onClick={() => toggleLag(replica.id)}
                  className={`mt-2 w-full rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors ${
                    replica.lagging
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                  }`}
                >
                  {replica.lagging ? 'همگام‌سازی و بازگشت به ISR' : 'کند کردن و خروج از ISR'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-2 text-center dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">High Watermark</p>
          <p className="font-mono text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(highWatermark)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-2 text-center dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">LEO لیدر</p>
          <p className="font-mono text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(leaderLogLength)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-2 text-center dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">رکوردهای قابل خواندن</p>
          <p className="font-mono text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(committedRecords.length)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-2 text-center dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">آفست مصرف‌کننده</p>
          <p className="font-mono text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(consumerOffset)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {committedRecords.map((offset) => (
          <span
            key={offset}
            className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-1.5 py-0.5 font-mono text-[10px] text-primary-800 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-200"
          >
            <Ltr>offset {offset}</Ltr>
          </span>
        ))}
        {committedRecords.length === 0 && (
          <span className="text-[10px] text-slate-400">رکورد commitشده‌ای برای نمایش نیست.</span>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-xs leading-6 text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
        <strong>وضعیت: </strong>
        {status}
      </div>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        رنگ آبی = رکورد commitشده (زیر HW)، رنگ کهربایی = رکورد روی لیدر که هنوز
        commit نشده است. مصرف‌کننده هرگز رکوردهای کهربایی را نمی‌بیند.
      </p>
    </div>
  )
}
