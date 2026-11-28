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
  podWeb: { x: 20, y: 30, w: 150, h: 52, title: 'Pod web', sub: '10.0.2.7 · node-2' },
  vethEgress: { x: 20, y: 130, w: 150, h: 60, title: 'veth (egress)', sub: 'tc · identity' },
  route: { x: 230, y: 130, w: 160, h: 60, title: 'Routing', sub: 'native / overlay' },
  vethIngress: { x: 450, y: 130, w: 150, h: 60, title: 'veth (ingress)', sub: 'tc · policy' },
  podShop: { x: 450, y: 30, w: 150, h: 52, title: 'Pod shop-api', sub: '10.0.1.5 · node-1' },
  policy: { x: 230, y: 240, w: 160, h: 52, title: 'policy map', sub: 'web → shop-api:8080' },
}

const EDGES: Record<string, string> = {
  'podWeb-vethEgress': 'M95 82 V130',
  'vethEgress-route': 'M170 160 H230',
  'route-vethIngress': 'M390 160 H450',
  'vethIngress-podShop': 'M525 130 V82',
  'vethEgress-policy': 'M95 190 V240 H230',
  'policy-vethIngress': 'M390 266 H525 V190',
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
        Pod <Ltr>web</Ltr> روی <Ltr>node-2</Ltr> بسته‌ای به مقصد{' '}
        <Ltr className="font-mono">10.0.1.5:8080</Ltr> می‌فرستد. بسته از سوکت
        برنامه خارج و وارد هسته می‌شود؛ از این لحظه eBPF می‌تواند آن را ببیند.
      </>
    ),
  },
  {
    active: 'vethEgress',
    done: ['podWeb'],
    edge: 'podWeb-vethEgress',
    caption: (
      <>
        برنامهٔ <Ltr>tc</Ltr> روی veth خروجی اجرا می‌شود. ابتدا با lookup در
        endpoint map، identity مبدأ را پیدا می‌کند؛ اینجا{' '}
        <Ltr className="font-mono">app=web</Ltr> با identity مشخص.
      </>
    ),
  },
  {
    active: 'policy',
    done: ['podWeb', 'vethEgress'],
    edge: 'vethEgress-policy',
    caption: (
      <>
        سیاست خروج بررسی می‌شود: آیا این identity اجازهٔ صحبت با مقصد را دارد؟
        نتیجه مجاز است. اگر سیاست خروج وجود نداشته باشد، در حالت پیش‌فرض Cilium
        همه‌چیز مجاز است.
      </>
    ),
  },
  {
    active: 'route',
    done: ['podWeb', 'vethEgress', 'policy'],
    edge: 'vethEgress-route',
    caption: (
      <>
        datapath تصمیم مسیریابی می‌گیرد. مقصد روی نود دیگری است؛ در حالت{' '}
        <Ltr>native routing</Ltr> بسته مستقیم به شبکهٔ زیرساخت می‌رود و در حالت
        overlay داخل <Ltr>VXLAN/Geneve</Ltr> کپسوله می‌شود.
      </>
    ),
  },
  {
    active: 'route',
    done: ['podWeb', 'vethEgress', 'policy'],
    edge: 'route-vethIngress',
    caption: (
      <>
        بسته از شبکه به <Ltr>node-1</Ltr> می‌رسد. Cilium مقصد را از روی آدرس
        endpoint تشخیص می‌دهد و آن را به veth مربوط به Pod{' '}
        <Ltr>shop-api</Ltr> هدایت می‌کند.
      </>
    ),
  },
  {
    active: 'vethIngress',
    done: ['podWeb', 'vethEgress', 'policy', 'route'],
    edge: 'route-vethIngress',
    caption: (
      <>
        روی veth ورودی، برنامهٔ <Ltr>tc</Ltr> سیاست ورود را بررسی می‌کند. اینجا
        برخلاف مسیر خروج، مقصد اهمیت دارد: آیا identity مبدأ اجازه دارد به{' '}
        <Ltr className="font-mono">app=shop-api</Ltr> روی پورت{' '}
        <Ltr className="font-mono">8080</Ltr> برسد؟
      </>
    ),
  },
  {
    active: 'policy',
    done: ['podWeb', 'vethEgress', 'route', 'vethIngress'],
    edge: 'policy-vethIngress',
    caption: (
      <>
        lookup در policy map تأیید می‌کند که <Ltr>web</Ltr> مجاز است. اگر مجاز
        نبود، بسته همین‌جا drop می‌شد و هیچ بسته‌ای به Pod نمی‌رسید؛ حتی اگر
        اتصال TCP از سمت مبدأ برقرار شده باشد.
      </>
    ),
  },
  {
    active: 'podShop',
    done: ['podWeb', 'vethEgress', 'policy', 'route', 'vethIngress'],
    edge: 'vethIngress-podShop',
    caption: (
      <>
        بسته به سوکت <Ltr>shop-api</Ltr> تحویل داده می‌شود. کل مسیر در هسته انجام
        شد؛ هیچ پروکسی فضای کاربری در مسیر L3/L4 نبود.
      </>
    ),
  },
  {
    active: null,
    done: ['podWeb', 'vethEgress', 'policy', 'route', 'vethIngress', 'podShop'],
    edge: null,
    caption: (
      <>
        قاعدهٔ کلی: هر بسته در دو نقطه بررسی می‌شود، خروج از مبدأ و ورود به مقصد.
        تصمیم‌ها بر اساس identity گرفته می‌شوند، نه IP، تا با تغییر Podها پایدار
        بمانند.
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

export function PacketPathExplainer() {
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
            یک بسته از Pod مبدأ تا Pod مقصد چه مسیری را طی می‌کند؟
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
          src:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">web 10.0.2.7</span>
        </span>
        <span>
          dst:{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            shop-api 10.0.1.5:8080
          </span>
        </span>
        <span>
          mode:{' '}
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
          aria-label="پیشرفت توضیح مسیر بسته"
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
          viewBox="0 0 640 310"
          role="img"
          aria-label="نمودار مسیر بسته از veth خروجی و سیاست تا مسیریابی و veth ورودی و Pod مقصد"
          className="h-auto w-full min-w-[560px]"
        >
          <text x={20} y={22} fontSize={10} className="fill-slate-400 dark:fill-slate-500">
            node-2
          </text>
          <text x={450} y={22} fontSize={10} className="fill-slate-400 dark:fill-slate-500">
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
        برای خوانایی فقط یک بسته و یک سیاست نشان داده شده و مسیر شبکه ساده شده
        است؛ منطق همان چیزی است که Cilium اجرا می‌کند: بررسی خروج و ورود در هسته
        و تصمیم بر اساس identity.
      </p>
    </div>
  )
}
