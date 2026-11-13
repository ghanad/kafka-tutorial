import { useState } from 'react'
import { Terminal, Play, RotateCcw, Copy, Check } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface CommandAction {
  id: string
  label: string
  cmd: string
  output: string[]
}

const COMMANDS: CommandAction[] = [
  {
    id: 'up',
    label: '۱. اجرای خوشه با داکر',
    cmd: 'docker compose up -d',
    output: [
      '[+] Running 2/2',
      ' ✔ Network kafka-net        Created                                           0.1s',
      ' ✔ Container kafka-broker-1 Started                                           0.5s',
      '',
      'خوشه Kafka در حالت مدرن KRaft (بدون ZooKeeper) با پورت 9092 بالا آمد! ✅',
    ],
  },
  {
    id: 'create-topic',
    label: '۲. ساخت تاپیک با ۳ پارتیشن',
    cmd: 'docker exec -it kafka-broker-1 kafka-topics.sh --bootstrap-server localhost:9092 --create --topic orders --partitions 3 --replication-factor 1',
    output: [
      'Created topic orders.',
      '',
      'تاپیک orders با موفقیت با ۳ پارتیشن مستقل ایجاد شد.',
    ],
  },
  {
    id: 'describe-topic',
    label: '۳. مشاهده مشخصات تاپیک',
    cmd: 'docker exec -it kafka-broker-1 kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic orders',
    output: [
      'Topic: orders\tTopicId: 4mF7g8_gT3aZ_891kL0pqw\tPartitionCount: 3\tReplicationFactor: 1\tConfigs: min.insync.replicas=1',
      '\tTopic: orders\tPartition: 0\tLeader: 1\tReplicas: 1\tIsr: 1',
      '\tTopic: orders\tPartition: 1\tLeader: 1\tReplicas: 1\tIsr: 1',
      '\tTopic: orders\tPartition: 2\tLeader: 1\tReplicas: 1\tIsr: 1',
    ],
  },
  {
    id: 'produce',
    label: '۴. ارسال پیام به تاپیک',
    cmd: 'docker exec -it kafka-broker-1 kafka-console-producer.sh --bootstrap-server localhost:9092 --topic orders',
    output: [
      '>{"orderId": 1001, "item": "کفش ورزشی", "price": 450000}',
      '>{"orderId": 1002, "item": "تی‌شرت", "price": 180000}',
      '',
      '۲ رکورد با موفقیت در تاپیک orders نوشته شدند.',
    ],
  },
  {
    id: 'consume',
    label: '۵. خواندن پیام‌ها از ابتدا',
    cmd: 'docker exec -it kafka-broker-1 kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic orders --from-beginning',
    output: [
      '{"orderId": 1001, "item": "کفش ورزشی", "price": 450000}',
      '{"orderId": 1002, "item": "تی‌شرت", "price": 180000}',
      '^CProcessed a total of 2 messages',
    ],
  },
  {
    id: 'groups',
    label: '۶. بررسی وضعیت کانسیومر گروپ',
    cmd: 'docker exec -it kafka-broker-1 kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group order-processors',
    output: [
      'GROUP            TOPIC           PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG             CONSUMER-ID     HOST            CLIENT-ID',
      'order-processors orders          0          1               1               0               client-1-7f8a   /172.18.0.1     client-1',
      'order-processors orders          1          1               1               0               client-2-3a9b   /172.18.0.1     client-2',
      'order-processors orders          2          0               0               0               client-2-3a9b   /172.18.0.1     client-2',
      '',
      'تمام پیام‌ها با موفقیت خوانده شده‌اند و تاخیر (LAG) صفر است! 🚀',
    ],
  },
]

export function KafkaTerminalSimulator() {
  const [history, setHistory] = useState<string[]>([
    'خوش آمدید! ترمینال شبیه‌سازی‌شده محیط Docker و Kafka آماده است.',
    'از دکمه‌های زیر برای اجرای گام‌به‌گام دستورات استفاده کنید:',
  ])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleRunCommand = (cmdItem: CommandAction) => {
    setHistory((prev) => [
      ...prev,
      `$ ${cmdItem.cmd}`,
      ...cmdItem.output,
      '',
    ])
  }

  const handleClear = () => {
    setHistory(['ترمینال پاکسازی شد. دستور جدیدی انتخاب کنید.'])
  }

  const handleCopy = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-soft">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="ms-2 flex items-center gap-1.5 font-mono text-xs font-bold text-slate-300">
            <Terminal className="h-3.5 w-3.5 text-primary-400" />
            bash — kafka@docker-local:~
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral">KRaft Mode</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClear}
            className="border-slate-700 text-[11px] text-slate-300 hover:bg-slate-800"
            startIcon={<RotateCcw className="h-3 w-3" />}
          >
            پاک کردن
          </Button>
        </div>
      </div>

      {/* Terminal Screen */}
      <div
        className="max-h-72 overflow-y-auto p-4 font-mono text-xs leading-6 text-slate-200 select-text"
        dir="ltr"
      >
        {history.map((line, idx) => {
          if (line.startsWith('$')) {
            return (
              <div key={idx} className="font-bold text-primary-400">
                {line}
              </div>
            )
          }
          if (line.includes('Created') || line.includes('Started') || line.includes('موفقیت') || line.includes('✔')) {
            return (
              <div key={idx} className="text-emerald-400">
                {line}
              </div>
            )
          }
          return (
            <div key={idx} className="text-slate-300">
              {line}
            </div>
          )
        })}
      </div>

      {/* Interactive Command Runner Tray */}
      <div className="border-t border-slate-800 bg-slate-900/60 p-3.5" dir="rtl">
        <span className="text-[11px] font-bold text-slate-400">
          برای اجرای خودکار هر دستور در ترمینال، روی آن کلیک کنید:
        </span>

        <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {COMMANDS.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-850 p-2 text-xs transition-colors hover:border-primary-500/50"
            >
              <button
                onClick={() => handleRunCommand(item)}
                className="flex items-center gap-2 text-start font-bold text-slate-200 hover:text-primary-400 flex-1 truncate"
              >
                <Play className="h-3 w-3 shrink-0 text-primary-400" />
                <span className="truncate">{item.label}</span>
              </button>

              <button
                onClick={() => handleCopy(item.cmd, item.id)}
                title="کپی کردن متن دستور"
                className="ms-2 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white shrink-0"
              >
                {copiedId === item.id ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
