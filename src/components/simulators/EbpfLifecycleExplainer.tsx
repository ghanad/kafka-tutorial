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

const LOAD_NODES: Record<string, BoxDef> = {
  source: { x: 20, y: 40, w: 200, h: 52, title: 'bpf_prog.c', sub: 'SEC("tc")' },
  clang: { x: 260, y: 40, w: 200, h: 52, title: 'clang -target bpf', sub: 'کامپایلر' },
  bytecode: { x: 500, y: 40, w: 200, h: 52, title: 'BPF bytecode', sub: 'فایل ELF' },
  verifier: { x: 500, y: 150, w: 200, h: 52, title: 'Verifier', sub: 'بررسی ایمنی' },
  jit: { x: 260, y: 150, w: 200, h: 52, title: 'JIT', sub: 'کد ماشین بومی' },
  hook: { x: 20, y: 150, w: 200, h: 52, title: 'tc hook', sub: 'روی veth' },
}

const LOAD_EDGES: Record<string, string> = {
  'source-clang': 'M220 66 H260',
  'clang-bytecode': 'M460 66 H500',
  'bytecode-verifier': 'M600 92 V150',
  'verifier-jit': 'M500 176 H460',
  'jit-hook': 'M260 176 H220',
}

const RUN_NODES: Record<string, BoxDef> = {
  podA: { x: 30, y: 30, w: 150, h: 52, title: 'Pod A', sub: '10.0.1.5' },
  podB: { x: 540, y: 30, w: 150, h: 52, title: 'Pod B', sub: '10.0.1.9' },
  vethA: { x: 30, y: 150, w: 150, h: 64, title: 'veth A', sub: 'tc egress' },
  vethB: { x: 540, y: 150, w: 150, h: 64, title: 'veth B', sub: 'tc ingress' },
  map: { x: 285, y: 150, w: 150, h: 64, title: 'BPF map', sub: 'identity / policy' },
}

const RUN_EDGES: Record<string, string> = {
  'podA-vethA': 'M105 82 V150',
  'vethA-map': 'M180 182 H285',
  'map-vethB': 'M435 182 H540',
  'vethB-podB': 'M615 150 V82',
  redirect: 'M180 205 C360 225 360 225 540 205',
}

interface Step {
  stage: 1 | 2
  caption: ReactNode
  active: string | null
  done: string[]
  edge: string | null
}

const STEPS: Step[] = [
  {
    stage: 1,
    active: 'source',
    done: [],
    edge: null,
    caption: (
      <>
        برنامه را در C می‌نویسیم و با <Ltr className="font-mono">SEC("tc")</Ltr>{' '}
        مشخص می‌کنیم که قرار است روی hook مربوط به tc اجرا شود. این همان زبانی است
        که Cilium برای datapath خودش استفاده می‌کند.
      </>
    ),
  },
  {
    stage: 1,
    active: 'clang',
    done: ['source'],
    edge: 'source-clang',
    caption: (
      <>
        <Ltr>clang</Ltr> با target <Ltr className="font-mono">bpf</Ltr> برنامه را
        کامپایل می‌کند. خروجی یک فایل ELF با دستورالعمل‌های بایت‌کدی eBPF است، نه
        کد ماشین معمولی.
      </>
    ),
  },
  {
    stage: 1,
    active: 'bytecode',
    done: ['source', 'clang'],
    edge: 'clang-bytecode',
    caption: (
      <>
        فایل ELF هم کد برنامه را دارد و هم تعریف mapها را. mapها حافظه مشترکی
        هستند که برنامه در هسته و Agent در فضای کاربر هر دو به آن دسترسی دارند.
      </>
    ),
  },
  {
    stage: 1,
    active: 'verifier',
    done: ['source', 'clang', 'bytecode'],
    edge: 'bytecode-verifier',
    caption: (
      <>
        Agent با فراخوانی <Ltr className="font-mono">bpf(BPF_PROG_LOAD)</Ltr> از
        کرنل می‌خواهد برنامه را بارگذاری کند. <Ltr>Verifier</Ltr> قبل از هر اجرا
        بررسی می‌کند که برنامه حافظه معتبر بخواند، حلقه بی‌پایان نداشته باشد و
        همیشه پایان یابد.
      </>
    ),
  },
  {
    stage: 1,
    active: 'jit',
    done: ['source', 'clang', 'bytecode', 'verifier'],
    edge: 'verifier-jit',
    caption: (
      <>
        اگر Verifier قبول کند، <Ltr>JIT</Ltr> بایت‌کد را به کد ماشین بومی همان CPU
        ترجمه می‌کند. به همین دلیل اجرای برنامه تقریباً به اندازه کد خود کرنل
        سریع است.
      </>
    ),
  },
  {
    stage: 1,
    active: 'hook',
    done: ['source', 'clang', 'bytecode', 'verifier', 'jit'],
    edge: 'jit-hook',
    caption: (
      <>
        برنامه به hook متصل می‌شود؛ اینجا <Ltr className="font-mono">tc ingress</Ltr>{' '}
        روی veth یک Pod. از این لحظه هر بسته‌ای که از این نقطه بگذرد، برنامه را
        اجرا می‌کند.
      </>
    ),
  },
  {
    stage: 2,
    active: 'podA',
    done: [],
    edge: 'podA-vethA',
    caption: (
      <>
        حالا فاز اجرا: <Ltr>Pod A</Ltr> بسته‌ای برای <Ltr>Pod B</Ltr> می‌فرستد.
        بسته از فضای کاربر خارج و وارد هسته می‌شود.
      </>
    ),
  },
  {
    stage: 2,
    active: 'vethA',
    done: ['podA'],
    edge: 'podA-vethA',
    caption: (
      <>
        روی veth خروجی، hook مربوط به tc اجرا می‌شود. برنامه eBPF درست همان‌جا، در
        بستر پردازش بسته و بدون <Ltr>context switch</Ltr> به فضای کاربر، اجرا
        می‌شود.
      </>
    ),
  },
  {
    stage: 2,
    active: 'map',
    done: ['podA', 'vethA'],
    edge: 'vethA-map',
    caption: (
      <>
        برنامه یک lookup در map انجام می‌دهد تا identity مبدأ را پیدا کند. چون map
        از نوع hash است، این lookup تقریباً{' '}
        <Ltr className="font-mono">O(1)</Ltr> است؛ نه یک زنجیره خطی از قاعده‌ها.
      </>
    ),
  },
  {
    stage: 2,
    active: 'map',
    done: ['podA', 'vethA'],
    edge: 'vethA-map',
    caption: (
      <>
        سپس policy map را بررسی می‌کند: آیا این identity اجازه دارد به identity
        مقصد برسد؟ نتیجه مجاز است و بسته ادامه می‌دهد. اگر مجاز نبود، همین‌جا drop
        می‌شد.
      </>
    ),
  },
  {
    stage: 2,
    active: 'vethB',
    done: ['podA', 'vethA', 'map'],
    edge: 'redirect',
    caption: (
      <>
        برنامه بسته را به veth مقصد redirect می‌کند. در سمت ورود هم برنامه tc اجرا
        می‌شود و سیاست ورود را دوباره بررسی می‌کند.
      </>
    ),
  },
  {
    stage: 2,
    active: 'podB',
    done: ['podA', 'vethA', 'map', 'vethB'],
    edge: 'vethB-podB',
    caption: (
      <>
        بسته به سوکت <Ltr>Pod B</Ltr> تحویل داده می‌شود. جمع‌بندی: eBPF برنامه‌ای
        است که در هسته و روی مسیر بسته اجرا می‌شود؛ سرعتش از اجرا در هسته، JIT و
        lookup در map می‌آید، نه از یک ترفند جادویی.
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

export function EbpfLifecycleExplainer() {
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1

  const markFor = (id: string): Mark => {
    if (step.active === id) return 'acc'
    if (step.done.includes(id)) return 'done'
    return 'idle'
  }

  const nodes = step.stage === 1 ? LOAD_NODES : RUN_NODES
  const edges = step.stage === 1 ? LOAD_EDGES : RUN_EDGES

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2.5 dark:border-slate-800">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-[15px] font-extrabold leading-6 text-slate-900 dark:text-white">
            یک برنامه eBPF چطور ساخته می‌شود و روی یک بسته اجرا می‌شود؟
          </h3>
        </div>
        <Badge variant="primary" size="sm" className="mt-0.5 shrink-0">
          گام {toPersianDigits(stepIndex + 1)} از {toPersianDigits(STEPS.length)}
        </Badge>
      </div>

      <div className="mt-4 flex gap-2">
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors motion-reduce:transition-none ${
            step.stage === 1
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          1 · ساخت و بارگذاری برنامه
        </div>
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors motion-reduce:transition-none ${
            step.stage === 2
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          2 · اجرا روی یک بسته
        </div>
      </div>

      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label="پیشرفت توضیح eBPF"
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
          viewBox="0 0 720 240"
          role="img"
          aria-label="نمودار چرخه ساخت و بارگذاری برنامه eBPF و اجرای آن روی یک بسته"
          className="h-auto w-full min-w-[600px]"
        >
          {step.stage === 2 && (
            <>
              <text
                x={25}
                y={22}
                fontSize={10}
                className="fill-slate-400 dark:fill-slate-500"
              >
                userspace
              </text>
              <rect
                x={15}
                y={128}
                width={690}
                height={100}
                rx={10}
                fill="none"
                strokeDasharray="5 4"
                className="stroke-slate-300 dark:stroke-slate-700"
              />
              <text
                x={25}
                y={144}
                fontSize={10}
                className="fill-slate-400 dark:fill-slate-500"
              >
                kernel space
              </text>
            </>
          )}

          {Object.entries(edges).map(([id, d]) => {
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

          {Object.entries(nodes).map(([id, def]) => (
            <Box key={id} def={def} mark={markFor(id)} />
          ))}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن همه اجزا، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط یک مسیر و یک جفت map نشان داده شده است؛ منطق همان چیزی است
        که Cilium و کرنل اجرا می‌کنند: کامپایل با <Ltr>clang</Ltr>، بررسی با{' '}
        <Ltr>Verifier</Ltr>، ترجمه با <Ltr>JIT</Ltr> و اجرا روی hookهای tc.
      </p>
    </div>
  )
}
