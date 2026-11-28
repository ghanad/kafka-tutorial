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
  api: { x: 240, y: 20, w: 180, h: 50, title: 'kube-apiserver', sub: 'CiliumNetworkPolicy' },
  agent: { x: 240, y: 110, w: 180, h: 50, title: 'Cilium Agent', sub: 'translate policy' },
  policyMap: { x: 240, y: 200, w: 180, h: 56, title: 'policy map', sub: 'identity → verdict' },
  ebpf: { x: 240, y: 300, w: 180, h: 50, title: 'eBPF datapath', sub: 'enforce' },
  podWeb: { x: 30, y: 300, w: 160, h: 50, title: 'Pod web', sub: 'app=web' },
  podOther: { x: 30, y: 200, w: 160, h: 50, title: 'Pod other', sub: 'app=other' },
  podShop: { x: 470, y: 300, w: 160, h: 50, title: 'Pod shop-api', sub: 'app=shop-api' },
  envoy: { x: 470, y: 200, w: 160, h: 50, title: 'Envoy', sub: 'L7 · GET /api' },
}

const EDGES: Record<string, string> = {
  'api-agent': 'M330 70 V110',
  'agent-policyMap': 'M330 160 V200',
  'policyMap-ebpf': 'M330 256 V300',
  'podWeb-ebpf': 'M190 325 H240',
  'podOther-ebpf': 'M190 225 H240 V300',
  'ebpf-podShop': 'M420 325 H470',
  'ebpf-envoy': 'M420 325 H445 V225 H470',
}

interface Step {
  caption: ReactNode
  active: string | null
  done: string[]
  edge: string | null
}

const STEPS: Step[] = [
  {
    active: 'api',
    done: [],
    edge: null,
    caption: (
      <>
        یک <Ltr>CiliumNetworkPolicy</Ltr> اعمال می‌شود: فقط{' '}
        <Ltr className="font-mono">app=web</Ltr> اجازه دارد به{' '}
        <Ltr className="font-mono">app=shop-api</Ltr> روی پورت{' '}
        <Ltr className="font-mono">8080</Ltr> وصل شود. apiserver فقط شیء را ذخیره
        می‌کند و خودش هیچ بسته‌ای را فیلتر نمی‌کند.
      </>
    ),
  },
  {
    active: 'agent',
    done: ['api'],
    edge: 'api-agent',
    caption: (
      <>
        Agent سیاست را watch می‌کند و آن را به زبان datapath ترجمه می‌کند: انتخاب
        Podها بر اساس label، و تبدیل آن‌ها به identity. سیاست به IP گره نمی‌خورد.
      </>
    ),
  },
  {
    active: 'policyMap',
    done: ['api', 'agent'],
    edge: 'agent-policyMap',
    caption: (
      <>
        نتیجه در <Ltr>policy map</Ltr> نوشته می‌شود: برای identity مقصد{' '}
        <Ltr>shop-api</Ltr>، فقط identity مبدأ <Ltr>web</Ltr> روی پورت{' '}
        <Ltr className="font-mono">8080</Ltr> مجاز است. بقیه به‌طور پیش‌فرض رد
        می‌شوند.
      </>
    ),
  },
  {
    active: 'ebpf',
    done: ['api', 'agent', 'policyMap'],
    edge: 'policyMap-ebpf',
    caption: (
      <>
        برنامهٔ eBPF روی veth مقصد این map را می‌خواند. از این لحظه هر بسته‌ای که
        به <Ltr>shop-api</Ltr> برسد، قبل از تحویل به Pod بررسی می‌شود.
      </>
    ),
  },
  {
    active: 'podWeb',
    done: ['api', 'agent', 'policyMap', 'ebpf'],
    edge: 'podWeb-ebpf',
    caption: (
      <>
        <Ltr>Pod web</Ltr> بسته‌ای می‌فرستد. eBPF identity مبدأ را{' '}
        <Ltr>web</Ltr> تشخیص می‌دهد و چون در policy map مجاز است، بسته ادامه
        می‌دهد.
      </>
    ),
  },
  {
    active: 'podOther',
    done: ['api', 'agent', 'policyMap', 'ebpf', 'podWeb'],
    edge: 'podOther-ebpf',
    caption: (
      <>
        <Ltr>Pod other</Ltr> با همان پورت تلاش می‌کند. identity مبدأ{' '}
        <Ltr>other</Ltr> در map مجاز نیست، پس بسته drop می‌شود. حتی اگر اتصال TCP
        از سمت مبدأ برقرار شود، هیچ بسته‌ای به Pod نمی‌رسد.
      </>
    ),
  },
  {
    active: 'envoy',
    done: ['api', 'agent', 'policyMap', 'ebpf', 'podWeb'],
    edge: 'ebpf-envoy',
    caption: (
      <>
        اگر سیاست یک قاعدهٔ L7 داشته باشد (مثلاً فقط{' '}
        <Ltr className="font-mono">GET /api</Ltr>)، eBPF بسته را به{' '}
        <Ltr>Envoy</Ltr> روی همان نود هدایت می‌کند تا درخواست HTTP بررسی شود.
        برای سیاست L3/L4، Envoy در مسیر نیست.
      </>
    ),
  },
  {
    active: 'podShop',
    done: ['api', 'agent', 'policyMap', 'ebpf', 'podWeb', 'envoy'],
    edge: 'ebpf-podShop',
    caption: (
      <>
        درخواست مجاز به <Ltr>shop-api</Ltr> می‌رسد. قاعدهٔ کلی: Cilium سیاست را
        به identity و map تبدیل می‌کند و اجرای آن در هسته و نزدیک Pod انجام
        می‌شود، نه در یک پروکسی مرکزی.
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

export function NetworkPolicyExplainer() {
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
            یک CiliumNetworkPolicy چطور به تصمیم مجاز یا رد تبدیل می‌شود؟
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
          from:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">app=web</span>
        </span>
        <span>
          to:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">app=shop-api</span>
        </span>
        <span>
          port:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">8080</span>
        </span>
        <span>
          l7:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">GET /api</span>
        </span>
      </div>

      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label="پیشرفت توضیح سیاست شبکه"
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
          viewBox="0 0 660 360"
          role="img"
          aria-label="نمودار تبدیل CiliumNetworkPolicy به policy map و اجرای آن در datapath"
          className="h-auto w-full min-w-[580px]"
        >
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
        برای خوانایی فقط یک سیاست و دو منبع نشان داده شده است؛ منطق همان چیزی است
        که Cilium اجرا می‌کند: ترجمهٔ سیاست به identity و map، سپس اجرا در هسته و
        بررسی L7 با Envoy فقط در صورت وجود قاعدهٔ لایهٔ کاربرد.
      </p>
    </div>
  )
}
