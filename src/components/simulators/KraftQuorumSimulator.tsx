import { useState } from 'react'
import {
  Activity,
  Crown,
  Power,
  RotateCcw,
  Server,
  ShieldCheck,
  Plus,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'

interface ControllerNode {
  id: number
  alive: boolean
  log: number
}

const INITIAL_NODES: ControllerNode[] = [
  { id: 1, alive: true, log: 5 },
  { id: 2, alive: true, log: 5 },
  { id: 3, alive: true, log: 5 },
]

const QUORUM = Math.floor(INITIAL_NODES.length / 2) + 1
const LOG_SLOTS = 8

export function KraftQuorumSimulator() {
  const [nodes, setNodes] = useState<ControllerNode[]>(INITIAL_NODES)
  const [leaderId, setLeaderId] = useState<number | null>(1)
  const [committed, setCommitted] = useState(5)
  const [epoch, setEpoch] = useState(1)
  const [status, setStatus] = useState(
    'کنترلر فعال یک رکورد متادیتا می‌نویسد؛ وقتی اکثریت نودها آن را تأیید کنند، commit می‌شود.',
  )

  const aliveNodes = nodes.filter((node) => node.alive)
  const hasQuorum = aliveNodes.length >= QUORUM
  const maxLog = Math.max(...nodes.map((node) => node.log))

  function appendMetadata() {
    if (!leaderId || !hasQuorum) {
      setStatus(
        'بدون اکثریت نودهای زنده، هیچ رکورد متادیتای جدیدی commit نمی‌شود؛ خوشه فقط می‌تواند بخواند.',
      )
      return
    }

    const nextLog = Math.max(...aliveNodes.map((node) => node.log)) + 1
    setNodes(
      nodes.map((node) => (node.alive ? { ...node, log: nextLog } : node)),
    )
    setCommitted(nextLog)
    setStatus(
      `رکورد متادیتا (مثلاً «ایجاد تاپیک orders») در لاگ کنترلر نوشته شد و با تأیید ${QUORUM} نود از ${nodes.length} نود، در ایندکس ${nextLog} commit شد.`,
    )
  }

  function killLeader() {
    if (!leaderId) {
      setStatus('کنترلر فعالی وجود ندارد که خاموش شود.')
      return
    }

    const failedId = leaderId
    const nextNodes = nodes.map((node) =>
      node.id === failedId ? { ...node, alive: false } : node,
    )
    const nextAlive = nextNodes.filter((node) => node.alive)

    if (nextAlive.length < QUORUM) {
      setNodes(nextNodes)
      setLeaderId(null)
      setEpoch((value) => value + 1)
      setStatus(
        `کنترلر ${failedId} خاموش شد و فقط ${nextAlive.length} نود زنده ماند؛ اکثریت از دست رفت و خوشه نمی‌تواند کنترلر جدید انتخاب کند.`,
      )
      return
    }

    const nextLeader = nextAlive.reduce((best, node) =>
      node.log > best.log ? node : best,
    )
    setNodes(nextNodes)
    setLeaderId(nextLeader.id)
    setEpoch((value) => value + 1)
    setStatus(
      `کنترلر ${failedId} خاموش شد. نودها با رأی اکثریت، کنترلر ${nextLeader.id} را با لاگ به‌روزتر انتخاب کردند؛ epoch به ${epoch + 1} رسید.`,
    )
  }

  function recoverNode() {
    const deadNode = nodes.find((node) => !node.alive)
    if (!deadNode) {
      setStatus('همه نودها روشن‌اند؛ نودی برای بازیابی وجود ندارد.')
      return
    }

    const leaderNode = nodes.find((node) => node.id === leaderId)
    const nextNodes = nodes.map((node) =>
      node.id === deadNode.id
        ? { ...node, alive: true, log: leaderNode ? leaderNode.log : node.log }
        : node,
    )
    const nextAlive = nextNodes.filter((node) => node.alive)
    const nextLeader =
      leaderId ??
      nextAlive.reduce((best, node) => (node.log > best.log ? node : best)).id

    setNodes(nextNodes)
    setLeaderId(nextLeader)
    setStatus(
      `کنترلر ${deadNode.id} دوباره روشن شد و لاگ خود را تا ایندکس ${leaderNode ? leaderNode.log : deadNode.log} از کنترلر فعال همگام کرد.`,
    )
  }

  function reset() {
    setNodes(INITIAL_NODES)
    setLeaderId(1)
    setCommitted(5)
    setEpoch(1)
    setStatus('وضعیت خوشه به حالت اولیه برگشت: هر سه نود روشن و کنترلر 1 فعال است.')
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            شبیه‌ساز زنده KRaft Quorum
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            اکثریت باید همیشه برنده باشد
          </h3>
        </div>
        <Badge variant={hasQuorum ? 'success' : 'danger'}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Quorum: {aliveNodes.length} از {nodes.length} (نیاز: {QUORUM})
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={appendMetadata}
          startIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          ثبت متادیتای جدید
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={killLeader}
          disabled={!leaderId}
          startIcon={<Power className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          خاموش کردن کنترلر فعال
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={recoverNode}
          disabled={aliveNodes.length === nodes.length}
          startIcon={<Activity className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          روشن کردن نود خاموش
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

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {nodes.map((node) => {
          const isLeader = node.id === leaderId
          return (
            <div
              key={node.id}
              className={`rounded-xl border-2 p-3 transition-colors ${
                !node.alive
                  ? 'border-slate-200 bg-slate-100/60 opacity-60 dark:border-slate-800 dark:bg-slate-950/40'
                  : isLeader
                    ? 'border-primary-400 bg-primary-50/50 dark:border-primary-700 dark:bg-primary-950/30'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                  <Server className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  Controller {node.id}
                </span>
                {isLeader ? (
                  <Badge variant="primary">
                    <Crown className="h-3 w-3" aria-hidden="true" />
                    فعال
                  </Badge>
                ) : node.alive ? (
                  <Badge variant="neutral">فالوور</Badge>
                ) : (
                  <Badge variant="danger">خاموش</Badge>
                )}
              </div>

              <div className="mt-2 flex items-end gap-0.5" aria-hidden="true">
                {Array.from({ length: LOG_SLOTS }, (_, index) => {
                  const entryIndex = index + 1
                  const filled = entryIndex <= node.log
                  const isCommitted = filled && entryIndex <= committed
                  return (
                    <span
                      key={entryIndex}
                      className={`h-5 flex-1 rounded-sm ${
                        isCommitted
                          ? 'bg-primary-500 dark:bg-primary-400'
                          : filled
                            ? 'bg-amber-400 dark:bg-amber-500'
                            : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  )
                })}
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                log entries: {node.log} / commit: {committed}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-2 text-center sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Commit Index</p>
          <p className="font-mono text-lg font-black text-slate-900 dark:text-white">
            {committed}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Epoch کنترلر</p>
          <p className="font-mono text-lg font-black text-slate-900 dark:text-white">
            {epoch}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">بلندترین لاگ</p>
          <p className="font-mono text-lg font-black text-slate-900 dark:text-white">
            {maxLog}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-xs leading-6 text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
        <strong>وضعیت: </strong>
        {status}
      </div>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        با <Ltr>3</Ltr> کنترلر، quorum برابر <Ltr>2</Ltr> است: یعنی خوشه با یک نود
        خراب هم زنده می‌ماند، اما با دو نود خراب متوقف می‌شود.
      </p>
    </div>
  )
}
