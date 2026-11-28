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
  podWest: { x: 20, y: 30, w: 150, h: 50, title: 'Pod web', sub: 'cluster west' },
  agentWest: { x: 20, y: 120, w: 150, h: 56, title: 'Cilium Agent', sub: 'west' },
  cmWest: { x: 20, y: 210, w: 150, h: 50, title: 'clustermesh-apiserver', sub: 'west' },
  service: { x: 220, y: 120, w: 160, h: 56, title: 'Global Service', sub: 'shop-api' },
  identity: { x: 220, y: 210, w: 160, h: 50, title: 'Shared identity', sub: 'app=shop-api' },
  podEast: { x: 430, y: 30, w: 150, h: 50, title: 'Pod shop-api', sub: 'cluster east' },
  agentEast: { x: 430, y: 120, w: 150, h: 56, title: 'Cilium Agent', sub: 'east' },
  cmEast: { x: 430, y: 210, w: 150, h: 50, title: 'clustermesh-apiserver', sub: 'east' },
}

const EDGES: Record<string, string> = {
  'podWest-agentWest': 'M95 80 V120',
  'agentWest-cmWest': 'M95 176 V210',
  'podEast-agentEast': 'M505 80 V120',
  'agentEast-cmEast': 'M505 176 V210',
  'cmWest-cmEast': 'M170 235 H430',
  'agentWest-service': 'M170 148 H220',
  'service-agentEast': 'M380 148 H430',
  'cmWest-identity': 'M170 235 H195 V235 H220',
  'cmEast-identity': 'M430 235 H380',
}

interface Step {
  caption: ReactNode
  active: string | null
  done: string[]
  edge: string | null
}

const STEPS: Step[] = [
  {
    active: 'podWest',
    done: [],
    edge: null,
    caption: (
      <>
        دو کلاستر مستقل داریم: <Ltr>west</Ltr> و <Ltr>east</Ltr>. هر کدام Cilium
        جداگانه دارند و تا اینجا هیچ سرویسی بین آن‌ها مشترک نیست.
      </>
    ),
  },
  {
    active: 'cmWest',
    done: ['podWest'],
    edge: 'agentWest-cmWest',
    caption: (
      <>
        هر کلاستر یک <Ltr>clustermesh-apiserver</Ltr> دارد که Agentهای همان کلاستر
        به آن وصل می‌شوند. این جزء پل ارتباطی بین کلاسترهاست، نه یک پروکسی ترافیک.
      </>
    ),
  },
  {
    active: 'cmEast',
    done: ['podWest', 'cmWest'],
    edge: 'cmWest-cmEast',
    caption: (
      <>
        دو <Ltr>clustermesh-apiserver</Ltr> با TLS به هم وصل می‌شوند. از این لحظه
        هر کلاستر می‌تواند سرویس‌ها و identityهای کلاستر دیگر را ببیند.
      </>
    ),
  },
  {
    active: 'service',
    done: ['podWest', 'cmWest', 'cmEast'],
    edge: 'agentEast-service',
    caption: (
      <>
        سرویس <Ltr>shop-api</Ltr> در <Ltr>east</Ltr> با annotation مربوط به
        ClusterMesh به‌عنوان سرویس جهانی اعلام می‌شود. حالا در هر دو کلاستر
        قابل کشف است.
      </>
    ),
  },
  {
    active: 'identity',
    done: ['podWest', 'cmWest', 'cmEast', 'service'],
    edge: 'cmEast-identity',
    caption: (
      <>
        identityها بین کلاسترها به اشتراک گذاشته می‌شوند. یعنی{' '}
        <Ltr className="font-mono">app=shop-api</Ltr> در <Ltr>east</Ltr> همان
        identityای را دارد که سیاست در <Ltr>west</Ltr> انتظار دارد؛ پس سیاست
        یکسان کار می‌کند.
      </>
    ),
  },
  {
    active: 'podWest',
    done: ['cmWest', 'cmEast', 'service', 'identity'],
    edge: 'podWest-agentWest',
    caption: (
      <>
        <Ltr>Pod web</Ltr> در <Ltr>west</Ltr> نام سرویس{' '}
        <Ltr>shop-api</Ltr> را resolve می‌کند. DNS یا سرویس محلی، endpointهای
        کلاستر دیگر را هم برمی‌گرداند.
      </>
    ),
  },
  {
    active: 'agentWest',
    done: ['cmWest', 'cmEast', 'service', 'identity', 'podWest'],
    edge: 'agentWest-service',
    caption: (
      <>
        Agent در <Ltr>west</Ltr> از مسیر <Ltr>clustermesh-apiserver</Ltr> می‌داند
        که مقصد در <Ltr>east</Ltr> است. بسته از شبکهٔ بین کلاسترها عبور می‌کند؛
        Cilium آن را مثل یک endpoint دوردست هدایت می‌کند.
      </>
    ),
  },
  {
    active: 'podEast',
    done: ['cmWest', 'cmEast', 'service', 'identity', 'podWest', 'agentWest'],
    edge: 'service-agentEast',
    caption: (
      <>
        بسته به <Ltr>agentEast</Ltr> و سپس به Pod مقصد می‌رسد. سیاست و identity
        همان‌طور اعمال می‌شوند که در یک کلاستر واحد. قاعدهٔ کلی: ClusterMesh
        کشف سرویس و identity را به اشتراک می‌گذارد، نه datapath را.
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

export function ClustermeshExplainer() {
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
            ClusterMesh چطور دو کلاستر مستقل را به هم وصل می‌کند؟
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
          clusters:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">west, east</span>
        </span>
        <span>
          service:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">shop-api</span>
        </span>
        <span>
          mode:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">global</span>
        </span>
      </div>

      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label="پیشرفت توضیح ClusterMesh"
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
          aria-label="نمودار اتصال دو کلاستر با clustermesh-apiserver و اشتراک سرویس و identity"
          className="h-auto w-full min-w-[540px]"
        >
          <text x={20} y={18} fontSize={10} className="fill-slate-400 dark:fill-slate-500">
            cluster west
          </text>
          <text x={430} y={18} fontSize={10} className="fill-slate-400 dark:fill-slate-500">
            cluster east
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
        برای خوانایی فقط دو کلاستر و یک سرویس نشان داده شده و مسیر شبکه ساده شده
        است؛ منطق همان چیزی است که ClusterMesh اجرا می‌کند: اشتراک کشف سرویس و
        identity و اجرای سیاست در datapath هر کلاستر.
      </p>
    </div>
  )
}
