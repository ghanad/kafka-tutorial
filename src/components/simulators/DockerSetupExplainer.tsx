import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Terminal } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { toPersianDigits } from '../../utils/persianDigits'

interface TerminalStep {
  cmd: string
  output: string[]
  caption: string
}

const STEPS: TerminalStep[] = [
  {
    cmd: 'docker compose up -d',
    output: [
      '[+] Running 2/2',
      ' ✔ Network kafka-net        Created    0.1s',
      ' ✔ Container kafka-broker-1 Started    0.5s',
      'خوشه Kafka در حالت KRaft (بدون ZooKeeper) روی پورت 9092 بالا آمد.',
    ],
    caption:
      'با docker compose up -d دو کانتینر بالا می‌آیند: بروکر کافکا در حالت KRaft و Kafka UI روی پورت 8080. هیچ ZooKeeperای لازم نیست.',
  },
  {
    cmd: 'docker exec -it kafka-broker-1 kafka-topics.sh --bootstrap-server localhost:9092 --create --topic orders --partitions 3 --replication-factor 1',
    output: ['Created topic orders.'],
    caption:
      'تاپیک orders با ۳ پارتیشن و ضریب تکثیر ۱ ساخته می‌شود. خروجی Created topic orders یعنی تاپیک آماده نوشتن است.',
  },
  {
    cmd: 'docker exec -it kafka-broker-1 kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic orders',
    output: [
      'Topic: orders  PartitionCount: 3  ReplicationFactor: 1',
      '\tPartition: 0  Leader: 1  Replicas: 1  Isr: 1',
      '\tPartition: 1  Leader: 1  Replicas: 1  Isr: 1',
      '\tPartition: 2  Leader: 1  Replicas: 1  Isr: 1',
    ],
    caption:
      'با --describe سه پارتیشن و Leader/Replica/ISR هر کدام را می‌بینیم. چون تک‌بروکر است، همه نقش‌ها روی همان نود ۱ است.',
  },
  {
    cmd: 'docker exec -it kafka-broker-1 kafka-console-producer.sh --bootstrap-server localhost:9092 --topic orders',
    output: [
      '>{"orderId": 1001, "item": "کفش ورزشی", "price": 450000}',
      '>{"orderId": 1002, "item": "تی‌شرت", "price": 180000}',
      '۲ رکورد در تاپیک orders نوشته شد.',
    ],
    caption:
      'پرودیوسر تعاملی دو رکورد JSON می‌فرستد. هر خط یک رکورد در تاپیک است و با Ctrl+C از پرامپت خارج می‌شوید.',
  },
  {
    cmd: 'docker exec -it kafka-broker-1 kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic orders --from-beginning',
    output: [
      '{"orderId": 1001, "item": "کفش ورزشی", "price": 450000}',
      '{"orderId": 1002, "item": "تی‌شرت", "price": 180000}',
      '^C Processed a total of 2 messages',
    ],
    caption:
      'کانسیومر با --from-beginning از offset 0 می‌خواند و همان دو رکورد را چاپ می‌کند. خواندن، رکورد را حذف نمی‌کند.',
  },
  {
    cmd: 'docker exec -it kafka-broker-1 kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group order-processors',
    output: [
      'GROUP             TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG',
      'order-processors  orders  0          1               1               0',
      'order-processors  orders  1          1               1               0',
      'order-processors  orders  2          0               0               0',
      'همه پیام‌ها خوانده شده‌اند و LAG صفر است.',
    ],
    caption:
      'با kafka-consumer-groups.sh وضعیت گروه را می‌بینیم: CURRENT-OFFSET و LAG صفر یعنی همه پیام‌ها خوانده شده‌اند.',
  },
]

const TOTAL_STEPS = STEPS.length

function lineClass(line: string): string {
  if (
    line.includes('Created') ||
    line.includes('Started') ||
    line.includes('✔') ||
    line.includes('نوشته شد') ||
    line.includes('خوانده')
  ) {
    return 'text-emerald-400'
  }
  if (line.startsWith('>') || line.startsWith('{"')) {
    return 'text-slate-200'
  }
  return 'text-slate-300'
}

export function DockerSetupExplainer() {
  const [step, setStep] = useState(0)

  const isLast = step === TOTAL_STEPS - 1

  const goTo = (next: number) => {
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, next)))
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            شبیه‌ساز گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            از اجرای خوشه تا خواندن اولین پیام چه اتفاقی می‌افتد؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </Badge>
      </div>

      <div
        dir="ltr"
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-start font-mono text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400"
      >
        <span>
          image:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            apache/kafka:3.8.0
          </span>
        </span>
        <span>
          mode:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">KRaft</span>
        </span>
        <span>
          bootstrap:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            localhost:9092
          </span>
        </span>
      </div>

      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step + 1}
          aria-label="پیشرفت شبیه‌ساز"
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-300 motion-reduce:transition-none dark:bg-primary-400"
            style={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
            startIcon={<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            گام قبل
          </Button>
          <Button
            size="sm"
            onClick={() => goTo(step + 1)}
            disabled={isLast}
            startIcon={<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            گام بعد
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => goTo(0)}
            startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            از اول
          </Button>
          <span className="ms-auto text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
          </span>
        </div>
      </div>

      <div
        aria-live="polite"
        className="mt-2.5 rounded-xl border border-slate-200 border-s-4 border-s-primary-500 bg-white p-3 dark:border-slate-800 dark:border-s-primary-400"
      >
        <p className="m-0 text-[13px] leading-7 text-slate-700 dark:text-slate-300">
          {STEPS[step].caption}
        </p>
      </div>

      <div
        role="region"
        aria-label="ترمینال شبیه‌سازی‌شده؛ دستورها و خروجی گام‌های انجام‌شده"
        className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-soft"
      >
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="ms-2 flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-300">
            <Terminal className="h-3.5 w-3.5 text-primary-400" />
            bash — kafka@docker-local:~
          </span>
        </div>

        <div
          dir="ltr"
          className="max-h-72 overflow-y-auto p-4 text-start font-mono text-[11px] leading-6"
        >
          {STEPS.slice(0, step + 1).map((item, index) => (
            <div key={item.cmd} className="mb-3 last:mb-0">
              <div
                className={
                  index === step
                    ? 'font-bold text-primary-300'
                    : 'font-bold text-primary-500/70'
                }
              >
                $ {item.cmd}
              </div>
              {item.output.map((line, lineIndex) => (
                <div key={lineIndex} className={lineClass(line)}>
                  {line}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        خروجی‌ها شبیه‌سازی‌شده‌اند تا فقط ترتیب و نتیجه هر گام دیده شود؛ دستورها
        همان چیزی هستند که روی سیستم خودتان اجرا می‌کنید.
      </p>
    </div>
  )
}
