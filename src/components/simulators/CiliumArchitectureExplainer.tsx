import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Ltr } from '../ui/Ltr'
import { toPersianDigits } from '../../utils/persianDigits'

type Mark = 'acc' | 'done' | 'idle'

interface NodeDef {
  x: number
  y: number
  w: number
  h: number
  title: string
  sub: string
}

const NODES: Record<string, NodeDef> = {
  api: { x: 90, y: 40, w: 160, h: 52, title: 'kube-apiserver', sub: 'منبع حقیقت' },
  operator: { x: 300, y: 40, w: 160, h: 52, title: 'Cilium Operator', sub: 'کارهای کلاستری' },
  relay: { x: 520, y: 40, w: 160, h: 52, title: 'Hubble Relay', sub: 'تجمیع جریان‌ها' },
  agent2: { x: 90, y: 140, w: 160, h: 52, title: 'Cilium Agent', sub: 'node-2' },
  agent1: { x: 300, y: 140, w: 160, h: 52, title: 'Cilium Agent', sub: 'node-1' },
  envoy: { x: 520, y: 140, w: 160, h: 52, title: 'Envoy', sub: 'L7 proxy · node-1' },
  ebpf2: { x: 90, y: 240, w: 160, h: 52, title: 'eBPF datapath', sub: 'node-2' },
  ebpf1: { x: 300, y: 240, w: 160, h: 52, title: 'eBPF datapath', sub: 'node-1' },
  podWeb: { x: 90, y: 340, w: 160, h: 52, title: 'Pod web', sub: '10.0.2.7 · node-2' },
  podShop: { x: 300, y: 340, w: 160, h: 52, title: 'Pod shop-api', sub: '10.0.1.5 · node-1' },
}

const EDGES: Record<string, string> = {
  'api-operator': 'M250 66 H300',
  'api-agent2': 'M170 92 V140',
  'api-agent1': 'M170 92 C170 118 380 116 380 140',
  'agent2-ebpf2': 'M170 192 V240',
  'agent1-ebpf1': 'M380 192 V240',
  'ebpf2-ebpf1': 'M250 266 H300',
  'ebpf1-envoy': 'M460 266 C490 266 490 166 520 166',
  'ebpf1-podShop': 'M380 292 V340',
  'podWeb-ebpf2': 'M170 340 V292',
  'ebpf2-relay': 'M250 266 H270 V110 H600 V92',
}

const LANES: { y: number; label: string }[] = [
  { y: 66, label: 'کنترل‌پلین' },
  { y: 166, label: 'Agent هر نود' },
  { y: 266, label: 'Datapath' },
  { y: 366, label: 'Podها' },
]

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
        یک <Ltr>Deployment</Ltr> تازه، Podی با نام <Ltr>shop-api</Ltr> و label{' '}
        <Ltr className="font-mono">app=shop-api</Ltr> می‌سازد. Scheduler آن را روی{' '}
        <Ltr>node-1</Ltr> می‌نشاند و <Ltr>kube-apiserver</Ltr> این وضعیت را
        به‌عنوان منبع حقیقت ذخیره می‌کند. تا اینجا هیچ برنامه eBPFای نوشته نشده
        است.
      </>
    ),
  },
  {
    active: 'agent1',
    done: ['api'],
    edge: 'api-agent1',
    caption: (
      <>
        <Ltr>Cilium Agent</Ltr> روی <Ltr>node-1</Ltr> به‌طور مداوم apiserver را
        watch می‌کند. به محض دیدن Pod تازه می‌فهمد این Pod روی نود خودش است و باید
        آن را به یک endpoint تبدیل کند. Agent روی نودهای دیگر کاری با این Pod
        ندارند.
      </>
    ),
  },
  {
    active: 'agent1',
    done: ['api'],
    edge: 'api-agent1',
    caption: (
      <>
        Agent از استخر IPAM یک آدرس به endpoint می‌دهد (
        <Ltr className="font-mono">10.0.1.5</Ltr>) و از labelها یک identity
        می‌سازد (<Ltr className="font-mono">12345</Ltr>). از این به بعد datapath
        به‌جای IP، بر اساس identity تصمیم امنیتی می‌گیرد؛ چون IP عوض می‌شود ولی
        identity پایدار می‌ماند.
      </>
    ),
  },
  {
    active: 'operator',
    done: ['api', 'agent1'],
    edge: 'api-operator',
    caption: (
      <>
        <Ltr>Cilium Operator</Ltr> یک نسخه در کل کلاستر است و کارهای کلاستری را
        انجام می‌دهد: نگه‌داشتن <Ltr>CiliumIdentity</Ltr>ها، جمع‌آوری identityهای
        بی‌استفاده، مدیریت استخرهای IPAM و CRDها. Operator بسته‌ها را پردازش
        نمی‌کند؛ فقط وضعیت مشترک را هماهنگ می‌کند.
      </>
    ),
  },
  {
    active: 'ebpf1',
    done: ['api', 'agent1', 'operator'],
    edge: 'agent1-ebpf1',
    caption: (
      <>
        Agent برنامه‌های eBPF مربوط به این endpoint را کامپایل و در هسته بارگذاری
        می‌کند و mapها را پر می‌کند: endpoint map می‌گوید{' '}
        <Ltr className="font-mono">10.0.1.5</Ltr> کدام identity را دارد. از این
        لحظه datapath آماده است.
      </>
    ),
  },
  {
    active: 'agent1',
    done: ['api', 'operator', 'ebpf1'],
    edge: 'api-agent1',
    caption: (
      <>
        یک <Ltr>CiliumNetworkPolicy</Ltr> اضافه می‌شود: فقط{' '}
        <Ltr className="font-mono">app=web</Ltr> اجازه دارد به{' '}
        <Ltr className="font-mono">app=shop-api</Ltr> روی پورت{' '}
        <Ltr className="font-mono">8080</Ltr> وصل شود. Agent این سیاست را به
        ورودی‌های policy map تبدیل می‌کند؛ خود Kubernetes هیچ‌وقت بسته‌ها را فیلتر
        نمی‌کند.
      </>
    ),
  },
  {
    active: 'ebpf2',
    done: ['api', 'agent1', 'operator', 'ebpf1', 'agent2'],
    edge: 'podWeb-ebpf2',
    caption: (
      <>
        Pod <Ltr>web</Ltr> روی <Ltr>node-2</Ltr> بسته‌ای به مقصد{' '}
        <Ltr>shop-api</Ltr> می‌فرستد. برنامه eBPF روی veth این Pod، identity مبدأ
        را از map می‌خواند و سیاست خروج را بررسی می‌کند؛ نتیجه مجاز است.
      </>
    ),
  },
  {
    active: 'ebpf1',
    done: ['api', 'agent1', 'operator', 'agent2', 'ebpf2'],
    edge: 'ebpf2-ebpf1',
    caption: (
      <>
        بسته از شبکه به <Ltr>node-1</Ltr> می‌رسد. eBPF روی این نود سیاست ورود را
        برای identity مقصد بررسی می‌کند و چون <Ltr className="font-mono">app=web</Ltr>{' '}
        مجاز است، بسته را نگه نمی‌دارد.
      </>
    ),
  },
  {
    active: 'envoy',
    done: ['api', 'agent1', 'operator', 'agent2', 'ebpf2', 'ebpf1'],
    edge: 'ebpf1-envoy',
    caption: (
      <>
        اگر سیاست یک قاعده L7 داشته باشد (مثلاً فقط{' '}
        <Ltr className="font-mono">GET /api</Ltr>)، eBPF بسته را به{' '}
        <Ltr>Envoy</Ltr> روی همان نود redirect می‌کند تا HTTP بررسی شود. برای
        سیاست‌های L3/L4، Envoy اصلاً در مسیر نیست.
      </>
    ),
  },
  {
    active: 'podShop',
    done: ['api', 'agent1', 'operator', 'agent2', 'ebpf2', 'ebpf1'],
    edge: 'ebpf1-podShop',
    caption: (
      <>
        بسته به سوکت Pod <Ltr>shop-api</Ltr> تحویل داده می‌شود. کل این مسیر در
        هسته و بدون رفت‌وبرگشت به فضای کاربر انجام شد؛ فقط قاعده L7 یک استثناست.
      </>
    ),
  },
  {
    active: 'relay',
    done: ['api', 'agent1', 'operator', 'agent2', 'ebpf2', 'ebpf1', 'envoy', 'podShop'],
    edge: 'ebpf2-relay',
    caption: (
      <>
        هر تصمیم datapath یک flow event تولید می‌کند. <Ltr>Hubble</Ltr> این
        رویدادها را از eBPF می‌خواند و <Ltr>Relay</Ltr> آن‌ها را برای UI و CLI جمع
        می‌کند تا ببینید چه کسی با چه کسی حرف زده و کدام سیاست اجازه یا رد کرده
        است.
      </>
    ),
  },
  {
    active: null,
    done: ['api', 'agent1', 'operator', 'agent2', 'ebpf2', 'ebpf1', 'envoy', 'podShop', 'relay'],
    edge: null,
    caption: (
      <>
        جمع‌بندی: apiserver منبع حقیقت است، Operator وضعیت کلاستری را هماهنگ
        می‌کند، Agent روی هر نود برنامه‌ها و mapها را می‌سازد، و eBPF بسته‌ها را
        در هسته پردازش می‌کند. Envoy و Hubble مسیر اصلی داده را تغییر نمی‌دهند؛
        فقط لایه L7 و مشاهده‌پذیری را اضافه می‌کنند.
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

function NodeBox({ id, mark }: { id: string; mark: Mark }) {
  const node = NODES[id]
  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={8}
        strokeWidth={mark === 'acc' ? 2 : 1.2}
        className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(mark)}`}
      />
      <text
        x={node.x + node.w / 2}
        y={node.y + 22}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        className="fill-slate-900 dark:fill-slate-100"
      >
        {node.title}
      </text>
      <text
        x={node.x + node.w / 2}
        y={node.y + 40}
        textAnchor="middle"
        fontSize={10}
        className="fill-slate-500 font-mono dark:fill-slate-400"
      >
        {node.sub}
      </text>
    </g>
  )
}

export function CiliumArchitectureExplainer() {
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
            یک تغییر از API Server تا datapath چطور می‌رسد؟
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
          cluster:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">shop</span>
        </span>
        <span>
          pod:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">shop-api</span>
        </span>
        <span>
          node:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">node-1</span>
        </span>
        <span>
          policy:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            web → shop-api:8080
          </span>
        </span>
      </div>

      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label="پیشرفت توضیح معماری"
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
          viewBox="0 0 700 400"
          role="img"
          aria-label="نمودار اجزای Cilium از apiserver و Operator تا Agent و eBPF و Hubble"
          className="h-auto w-full min-w-[620px]"
        >
          {LANES.map((lane) => (
            <text
              key={lane.label}
              x={82}
              y={lane.y + 4}
              textAnchor="end"
              fontSize={9.5}
              className="fill-slate-400 dark:fill-slate-500"
            >
              {lane.label}
            </text>
          ))}

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

          {Object.keys(NODES).map((id) => (
            <NodeBox key={id} id={id} mark={markFor(id)} />
          ))}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه اجزا، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط یک Pod و یک سیاست نشان داده شده و مسیر شبکه ساده شده
        است؛ منطق همان چیزی است که Cilium اجرا می‌کند: کنترل‌پلین فقط datapath را
        برنامه‌ریزی می‌کند و پردازش بسته‌ها در هسته انجام می‌شود.
      </p>
    </div>
  )
}
