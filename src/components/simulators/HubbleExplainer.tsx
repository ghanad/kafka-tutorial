import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

type Mark = 'acc' | 'done' | 'idle'

interface BoxDef {
  x: number
  y: number
  w: number
  h: number
  title: string
  sub: string
}

const NODES: Record<string, BoxDef> = {
  podWeb: { x: 20, y: 30, w: 150, h: 50, title: 'Pod web', sub: 'node-2' },
  ebpf2: { x: 20, y: 120, w: 150, h: 56, title: 'eBPF', sub: 'verdict + event' },
  hubble2: { x: 20, y: 210, w: 150, h: 50, title: 'Hubble agent', sub: 'node-2' },
  podShop: { x: 220, y: 30, w: 150, h: 50, title: 'Pod shop-api', sub: 'node-1' },
  ebpf1: { x: 220, y: 120, w: 150, h: 56, title: 'eBPF', sub: 'verdict + event' },
  hubble1: { x: 220, y: 210, w: 150, h: 50, title: 'Hubble agent', sub: 'node-1' },
  relay: { x: 430, y: 120, w: 150, h: 56, title: 'Hubble Relay', sub: 'aggregate' },
  ui: { x: 430, y: 30, w: 150, h: 50, title: 'Hubble UI', sub: 'service map' },
  cli: { x: 430, y: 210, w: 150, h: 50, title: 'hubble CLI', sub: 'observe flows' },
}

const EDGES: Record<string, string> = {
  'podWeb-ebpf2': 'M95 80 V120',
  'ebpf2-hubble2': 'M95 176 V210',
  'podShop-ebpf1': 'M295 80 V120',
  'ebpf1-hubble1': 'M295 176 V210',
  'hubble2-relay': 'M170 235 H430 V160',
  'hubble1-relay': 'M370 235 H430 V176',
  'relay-ui': 'M505 120 V80',
  'relay-cli': 'M505 176 V210',
}

interface Step {
  caption: ReactNode
  active: string | null
  done: string[]
  edge: string | null
}

const STEPS: Step[] = [
  {
    active: 'podWeb',
    done: [],
    edge: null,
    caption: (
      <>
        <Ltr>Pod web</Ltr> روی <Ltr>node-2</Ltr> درخواستی به{' '}
        <Ltr>shop-api</Ltr> روی <Ltr>node-1</Ltr> می‌فرستد. Hubble از ابتدا در
        مسیر داده دخالتی ندارد؛ فقط تصمیم‌های eBPF را می‌خواند.
      </>
    ),
  },
  {
    active: 'ebpf2',
    done: ['podWeb'],
    edge: 'podWeb-ebpf2',
    caption: (
      <>
        eBPF روی نود مبدأ سیاست خروج را بررسی می‌کند و هم‌زمان یک{' '}
        <Ltr>flow event</Ltr> تولید می‌کند: identity مبدأ، مقصد، پورت و نتیجه.
        تولید رویداد هزینهٔ ناچیزی دارد چون همان‌جاست که تصمیم گرفته شد.
      </>
    ),
  },
  {
    active: 'hubble2',
    done: ['podWeb', 'ebpf2'],
    edge: 'ebpf2-hubble2',
    caption: (
      <>
        <Ltr>Hubble agent</Ltr> روی همان نود رویداد را از حلقهٔ هسته می‌خواند و
        آن را به یک رکورد ساخت‌یافته تبدیل می‌کند: چه کسی، با چه کسی، روی چه
        پورتی و با چه نتیجه‌ای.
      </>
    ),
  },
  {
    active: 'ebpf1',
    done: ['podWeb', 'ebpf2', 'hubble2'],
    edge: 'podShop-ebpf1',
    caption: (
      <>
        بسته به <Ltr>node-1</Ltr> می‌رسد. eBPF مقصد سیاست ورود را بررسی می‌کند و
        یک رویداد دیگر تولید می‌کند. حالا دو نود دربارهٔ همان جریان گزارش دارند.
      </>
    ),
  },
  {
    active: 'hubble1',
    done: ['podWeb', 'ebpf2', 'hubble2', 'ebpf1'],
    edge: 'ebpf1-hubble1',
    caption: (
      <>
        <Ltr>Hubble agent</Ltr> نود مقصد هم رویداد خودش را می‌فرستد. اگر سیاست
        ورود رد کرده بود، همین رویداد با نتیجهٔ <Ltr>DENIED</Ltr> ثبت می‌شد؛
        چیزی که در لاگ‌های معمولی برنامه دیده نمی‌شود.
      </>
    ),
  },
  {
    active: 'relay',
    done: ['podWeb', 'ebpf2', 'hubble2', 'ebpf1', 'hubble1'],
    edge: 'hubble2-relay',
    caption: (
      <>
        <Ltr>Hubble Relay</Ltr> رویدادهای همهٔ نودها را جمع می‌کند. بدون Relay،
        هر نود تصویر ناقصی از کلاستر داشت. Relay یک نمای واحد از کل جریان‌ها
        می‌سازد.
      </>
    ),
  },
  {
    active: 'ui',
    done: ['podWeb', 'ebpf2', 'hubble2', 'ebpf1', 'hubble1', 'relay'],
    edge: 'relay-ui',
    caption: (
      <>
        در <Ltr>Hubble UI</Ltr> می‌توانید نقشهٔ سرویس‌ها را ببینید: کدام سرویس با
        کدام صحبت می‌کند، چه حجمی رد و بدل می‌شود و کدام مسیرها رد شده‌اند. این
        نقشه از همان رویدادهای datapath ساخته می‌شود.
      </>
    ),
  },
  {
    active: 'cli',
    done: ['podWeb', 'ebpf2', 'hubble2', 'ebpf1', 'hubble1', 'relay'],
    edge: 'relay-cli',
    caption: (
      <>
        از <Ltr>CLI</Ltr> هم می‌توان با فیلترهای دقیق جریان‌ها را دید، مثلاً فقط
        جریان‌های ردشده. قاعدهٔ کلی: Hubble مشاهده‌پذیری را از همان نقطهٔ تصمیم
        می‌گیرد و مسیر داده را تغییر نمی‌دهد.
      </>
    ),
  },
]

function boxClass(mark: Mark): string {
  switch (mark) {
    case 'acc':
      return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
    case 'done':
      return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/50 dark:stroke-emerald-600'
    default:
      return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
}

function Box({ def, mark }: { def: BoxDef; mark: Mark }) {
  const centerY = def.y + def.h / 2
  return (
    <g>
      <rect
        x={def.x}
        y={def.y}
        width={def.w}
        height={def.h}
        rx={8}
        strokeWidth={mark === 'acc' ? 2 : 1.2}
        className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(mark)}`}
      />
      <text
        x={def.x + def.w / 2}
        y={centerY - 3}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        className="fill-slate-900 dark:fill-slate-100"
      >
        {def.title}
      </text>
      <text
        x={def.x + def.w / 2}
        y={centerY + 14}
        textAnchor="middle"
        fontSize={10}
        className="fill-slate-500 font-mono dark:fill-slate-400"
      >
        {def.sub}
      </text>
    </g>
  )
}

export function HubbleExplainer() {
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1

  const markFor = (id: string): Mark => {
    if (step.active === id) return 'acc'
    if (step.done.includes(id)) return 'done'
    return 'idle'
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2.5 dark:border-slate-800">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-[15px] font-extrabold leading-6 text-slate-900 dark:text-white">
            Hubble چطور از تصمیم‌های datapath یک تصویر واحد می‌سازد؟
          </h3>
        </div>
        <Badge variant="primary" size="sm" className="mt-0.5 shrink-0">
          گام {toPersianDigits(stepIndex + 1)} از {toPersianDigits(STEPS.length)}
        </Badge>
      </div>

      <div
        dir="ltr"
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-start font-mono text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400"
      >
        <span>
          flow:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            web → shop-api:8080
          </span>
        </span>
        <span>
          verdict:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">ALLOWED</span>
        </span>
        <span>
          scope:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">cluster</span>
        </span>
      </div>

      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label="پیشرفت توضیح Hubble"
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-300 motion-reduce:transition-none dark:bg-primary-400"
            style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
            disabled={stepIndex === 0}
            startIcon={<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            گام قبل
          </Button>
          <Button
            size="sm"
            onClick={() =>
              setStepIndex((current) => Math.min(current + 1, STEPS.length - 1))
            }
            disabled={isLast}
            startIcon={<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            گام بعد
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStepIndex(0)}
            startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            از اول
          </Button>
          <span className="ms-auto text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            گام {toPersianDigits(stepIndex + 1)} از {toPersianDigits(STEPS.length)}
          </span>
        </div>
      </div>

      <div
        aria-live="polite"
        className="mt-2.5 rounded-xl border border-slate-200 border-s-4 border-s-primary-500 bg-white p-3 dark:border-slate-800 dark:border-s-primary-400"
      >
        <p className="mb-1 text-[10px] font-black text-primary-700 dark:text-primary-300">
          توضیح این گام
        </p>
        <p className="m-0 text-[13px] leading-7 text-slate-700 dark:text-slate-300">
          {step.caption}
        </p>
      </div>

      <div
        dir="ltr"
        className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-800 dark:bg-slate-950/40"
      >
        <svg
          viewBox="0 0 600 280"
          role="img"
          aria-label="نمودار جمع‌آوری رویدادهای eBPF توسط Hubble agent و Relay و نمایش در UI و CLI"
          className="h-auto w-full min-w-[540px]"
        >
          <text x={20} y={18} fontSize={10} className="fill-slate-400 dark:fill-slate-500">
            node-2
          </text>
          <text x={220} y={18} fontSize={10} className="fill-slate-400 dark:fill-slate-500">
            node-1
          </text>

          {Object.entries(EDGES).map(([id, d]) => {
            const active = step.edge === id
            return (
              <path
                key={id}
                d={d}
                fill="none"
                strokeDasharray={active ? undefined : '4 3'}
                strokeWidth={active ? 2.5 : 1.2}
                className={
                  active
                    ? 'stroke-primary-500 dark:stroke-primary-400'
                    : 'stroke-slate-300 dark:stroke-slate-700'
                }
              />
            )
          })}

          {Object.entries(NODES).map(([id, def]) => (
            <Box key={id} def={def} mark={markFor(id)} />
          ))}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه اجزا، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط دو نود و یک جریان نشان داده شده است؛ منطق همان چیزی است
        که Hubble اجرا می‌کند: رویداد از eBPF، جمع‌آوری محلی و تجمیع با Relay برای
        UI و CLI.
      </p>
    </div>
  )
}
