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
  operator: { x: 240, y: 20, w: 170, h: 50, title: 'Cilium Operator', sub: 'CIDR per node' },
  pool: { x: 30, y: 110, w: 170, h: 56, title: 'IPAM pool', sub: '10.0.1.0/24' },
  agent: { x: 30, y: 200, w: 170, h: 56, title: 'Agent node-1', sub: 'allocate .5' },
  podA: { x: 30, y: 290, w: 170, h: 50, title: 'Pod A', sub: '10.0.1.5' },
  route: { x: 240, y: 200, w: 170, h: 56, title: 'Route table', sub: '10.0.2.0/24 → node-2' },
  underlay: { x: 240, y: 290, w: 170, h: 50, title: 'Underlay', sub: 'native / VXLAN' },
  node2: { x: 450, y: 200, w: 170, h: 56, title: 'node-2', sub: 'decap / route' },
  podB: { x: 450, y: 290, w: 170, h: 50, title: 'Pod B', sub: '10.0.2.9' },
}

const EDGES: Record<string, string> = {
  'operator-pool': 'M240 70 V110 H200',
  'pool-agent': 'M115 166 V200',
  'agent-podA': 'M115 256 V290',
  'podA-route': 'M200 315 H240 V256',
  'route-underlay': 'M325 256 V290',
  'underlay-node2': 'M410 315 H450 V256',
  'node2-podB': 'M535 256 V290',
}

interface Step {
  caption: ReactNode
  active: string | null
  done: string[]
  edge: string | null
}

const STEPS: Step[] = [
  {
    active: 'podA',
    done: [],
    edge: null,
    caption: (
      <>
        یک Pod روی <Ltr>node-1</Ltr> زمان‌بندی می‌شود. هنوز آدرسی ندارد؛ Cilium
        باید برایش یک endpoint بسازد و IP بدهد.
      </>
    ),
  },
  {
    active: 'operator',
    done: ['podA'],
    edge: 'operator-pool',
    caption: (
      <>
        <Ltr>Cilium Operator</Ltr> بازهٔ <Ltr className="font-mono">10.0.1.0/24</Ltr>{' '}
        را به <Ltr>node-1</Ltr> اختصاص می‌دهد. این تقسیم مرکزی است تا هر نود فقط
        از بازهٔ خودش IP بدهد و آدرس‌ها تکراری نشوند.
      </>
    ),
  },
  {
    active: 'pool',
    done: ['podA', 'operator'],
    edge: 'operator-pool',
    caption: (
      <>
        Agent استخر محلی نود را می‌بیند. در حالت <Ltr>cluster-pool</Ltr> همین
        CIDR به نود تعلق دارد؛ در حالت <Ltr>kubernetes</Ltr> بازه از PodCIDR
        خود Kubernetes گرفته می‌شود.
      </>
    ),
  },
  {
    active: 'agent',
    done: ['podA', 'operator', 'pool'],
    edge: 'pool-agent',
    caption: (
      <>
        Agent آدرس <Ltr className="font-mono">10.0.1.5</Ltr> را از استخر برمی‌دارد
        و به endpoint این Pod می‌دهد. از این لحظه Pod یک آدرس یکتا در کل کلاستر
        دارد.
      </>
    ),
  },
  {
    active: 'podA',
    done: ['operator', 'pool', 'agent'],
    edge: 'agent-podA',
    caption: (
      <>
        Pod A بسته‌ای به مقصد <Ltr className="font-mono">10.0.2.9</Ltr> (Pod B روی{' '}
        <Ltr>node-2</Ltr>) می‌فرستد. مقصد در بازهٔ محلی نیست، پس باید مسیریابی
        بین‌نودی انجام شود.
      </>
    ),
  },
  {
    active: 'route',
    done: ['operator', 'pool', 'agent', 'podA'],
    edge: 'podA-route',
    caption: (
      <>
        جدول مسیریابی نود می‌گوید بازهٔ <Ltr className="font-mono">10.0.2.0/24</Ltr>{' '}
        از طریق <Ltr>node-2</Ltr> قابل دسترسی است. در <Ltr>native routing</Ltr>{' '}
        این مسیرها با BGP یا routeهای دستی در شبکهٔ زیرساخت هم منتشر می‌شوند.
      </>
    ),
  },
  {
    active: 'underlay',
    done: ['operator', 'pool', 'agent', 'podA', 'route'],
    edge: 'route-underlay',
    caption: (
      <>
        در <Ltr>native routing</Ltr> بسته با IP اصلی Podها روی شبکهٔ زیرساخت
        می‌رود. در حالت overlay، بسته داخل یک تونل{' '}
        <Ltr>VXLAN</Ltr> یا <Ltr>Geneve</Ltr> کپسوله می‌شود تا شبکهٔ زیرساخت لازم
        نباشد مسیرهای Pod را بداند.
      </>
    ),
  },
  {
    active: 'node2',
    done: ['operator', 'pool', 'agent', 'podA', 'route', 'underlay'],
    edge: 'underlay-node2',
    caption: (
      <>
        <Ltr>node-2</Ltr> بسته را می‌گیرد. اگر overlay بود، کپسوله‌برداری می‌شود؛
        سپس جدول مسیر محلی آن را به veth مربوط به <Ltr className="font-mono">10.0.2.9</Ltr>{' '}
        می‌رساند.
      </>
    ),
  },
  {
    active: 'podB',
    done: ['operator', 'pool', 'agent', 'podA', 'route', 'underlay', 'node2'],
    edge: 'node2-podB',
    caption: (
      <>
        بسته به Pod B تحویل داده می‌شود. قاعدهٔ کلی: IPAM آدرس یکتا می‌دهد و حالت
        routing فقط نحوهٔ رساندن بسته بین نودها را تعیین می‌کند؛ سیاست امنیتی در
        هر دو حالت یکی است.
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

export function IpamRoutingExplainer() {
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
            یک Pod چطور IP می‌گیرد و بسته‌اش بین نودها چطور مسیریابی می‌شود؟
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
          ipam:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">cluster-pool</span>
        </span>
        <span>
          node-1:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">10.0.1.0/24</span>
        </span>
        <span>
          node-2:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">10.0.2.0/24</span>
        </span>
        <span>
          routing:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">native</span>
        </span>
      </div>

      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label="پیشرفت توضیح IPAM و routing"
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
          viewBox="0 0 650 360"
          role="img"
          aria-label="نمودار تخصیص IP با IPAM و مسیریابی بسته بین دو نود"
          className="h-auto w-full min-w-[560px]"
        >
          <text x={30} y={18} fontSize={10} className="fill-slate-400 dark:fill-slate-500">
            node-1
          </text>
          <text x={450} y={18} fontSize={10} className="fill-slate-400 dark:fill-slate-500">
            node-2
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
        برای خوانایی فقط دو نود و یک Pod در هر نود نشان داده شده است؛ منطق همان
        چیزی است که Cilium اجرا می‌کند: تخصیص CIDR به نود، گرفتن IP از استخر محلی
        و مسیریابی بسته با توجه به حالت routing.
      </p>
    </div>
  )
}
