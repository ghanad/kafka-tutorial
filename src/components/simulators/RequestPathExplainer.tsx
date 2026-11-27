import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { toPersianDigits } from '../../utils/persianDigits'

type Comp =
  | 'kubectl'
  | 'apiserver'
  | 'etcd'
  | 'controller'
  | 'scheduler'
  | 'kubelet'
  | 'containerd'
  | 'proxy'

interface Snapshot {
  caption: string
  active: Comp[]
  done: Comp[]
  deployment: boolean
  replicaset: boolean
  pods: number
  scheduled: number
  running: number
  ready: number
  endpoints: number
}

const SNAPSHOTS: Snapshot[] = [
  {
    caption:
      'kubectl فایل shop-api-deployment.yaml را می‌خواند و یک درخواست POST به kube-apiserver می‌فرستد. هنوز هیچ شیئی در کلاستر ساخته نشده است.',
    active: ['kubectl', 'apiserver'],
    done: [],
    deployment: false,
    replicaset: false,
    pods: 0,
    scheduled: 0,
    running: 0,
    ready: 0,
    endpoints: 0,
  },
  {
    caption:
      'kube-apiserver درخواست را احراز هویت، مجوزدهی و اعتبارسنجی می‌کند. سپس شیء Deployment را در etcd می‌نویسد و یک resourceVersion برمی‌گرداند.',
    active: ['apiserver', 'etcd'],
    done: ['kubectl'],
    deployment: true,
    replicaset: false,
    pods: 0,
    scheduled: 0,
    running: 0,
    ready: 0,
    endpoints: 0,
  },
  {
    caption:
      'kube-controller-manager که تغییر Deployment را watch کرده، یک ReplicaSet با نام shop-api-6d9f7c8b5d می‌سازد. این ReplicaSet مالک پادها خواهد بود.',
    active: ['controller', 'apiserver', 'etcd'],
    done: ['kubectl'],
    deployment: true,
    replicaset: true,
    pods: 0,
    scheduled: 0,
    running: 0,
    ready: 0,
    endpoints: 0,
  },
  {
    caption:
      'کنترلر ReplicaSet سه شیء Pod می‌سازد. هر سه در فاز Pending هستند، چون هنوز هیچ نودی برایشان انتخاب نشده است.',
    active: ['controller', 'apiserver'],
    done: ['kubectl', 'etcd'],
    deployment: true,
    replicaset: true,
    pods: 3,
    scheduled: 0,
    running: 0,
    ready: 0,
    endpoints: 0,
  },
  {
    caption:
      'kube-scheduler پادهای بدون nodeName را می‌بیند. ابتدا نودها را filter می‌کند (منابع کافی؟ taint؟) و سپس با score بهترین نود را انتخاب می‌کند.',
    active: ['scheduler', 'apiserver'],
    done: ['kubectl', 'etcd', 'controller'],
    deployment: true,
    replicaset: true,
    pods: 3,
    scheduled: 0,
    running: 0,
    ready: 0,
    endpoints: 0,
  },
  {
    caption:
      'scheduler تصمیم می‌گیرد pod-1 روی worker-1 بنشیند و این تصمیم را از طریق apiserver در فیلد spec.nodeName ثبت می‌کند.',
    active: ['scheduler', 'apiserver', 'etcd'],
    done: ['kubectl', 'controller'],
    deployment: true,
    replicaset: true,
    pods: 3,
    scheduled: 1,
    running: 0,
    ready: 0,
    endpoints: 0,
  },
  {
    caption:
      'pod-2 روی worker-2 و pod-3 روی worker-1 قرار می‌گیرند. حالا هر سه پاد نود دارند، اما هنوز هیچ کانتینری اجرا نشده است.',
    active: ['scheduler', 'apiserver'],
    done: ['kubectl', 'etcd', 'controller'],
    deployment: true,
    replicaset: true,
    pods: 3,
    scheduled: 3,
    running: 0,
    ready: 0,
    endpoints: 0,
  },
  {
    caption:
      'kubelet روی worker-1 پاد تخصیص‌یافته را می‌بیند و از containerd می‌خواهد ایمیج registry.local/shop-api:1.4.0 را بکشد.',
    active: ['kubelet', 'containerd', 'apiserver'],
    done: ['kubectl', 'etcd', 'controller', 'scheduler'],
    deployment: true,
    replicaset: true,
    pods: 3,
    scheduled: 3,
    running: 0,
    ready: 0,
    endpoints: 0,
  },
  {
    caption:
      'ایمیج کشیده شد و کانتینر pod-1 اجرا شد. kubelet وضعیت Running را به apiserver گزارش می‌کند.',
    active: ['kubelet', 'containerd', 'apiserver'],
    done: ['kubectl', 'etcd', 'controller', 'scheduler'],
    deployment: true,
    replicaset: true,
    pods: 3,
    scheduled: 3,
    running: 1,
    ready: 0,
    endpoints: 0,
  },
  {
    caption:
      'دو پاد دیگر هم بالا آمدند. هر سه در فاز Running هستند، اما هنوز readinessProbe موفق نشده است.',
    active: ['kubelet', 'containerd'],
    done: ['kubectl', 'etcd', 'controller', 'scheduler', 'apiserver'],
    deployment: true,
    replicaset: true,
    pods: 3,
    scheduled: 3,
    running: 3,
    ready: 0,
    endpoints: 0,
  },
  {
    caption:
      'readinessProbe هر سه پاد موفق شد. Endpoints شیء Service با سه آدرس پر می‌شود؛ از این لحظه ترافیک می‌تواند به پادها برسد.',
    active: ['apiserver', 'etcd'],
    done: ['kubectl', 'controller', 'scheduler', 'kubelet', 'containerd'],
    deployment: true,
    replicaset: true,
    pods: 3,
    scheduled: 3,
    running: 3,
    ready: 3,
    endpoints: 3,
  },
  {
    caption:
      'kube-proxy روی نودها قواعد iptables را به‌روز می‌کند تا ترافیک ClusterIP سرویس shop-api بین سه پاد تقسیم شود. کل این مسیر فقط از apiserver عبور کرد و etcd منبع حقیقت ماند.',
    active: ['proxy', 'apiserver', 'etcd'],
    done: ['kubectl', 'controller', 'scheduler', 'kubelet', 'containerd'],
    deployment: true,
    replicaset: true,
    pods: 3,
    scheduled: 3,
    running: 3,
    ready: 3,
    endpoints: 3,
  },
]

const TOTAL_STEPS = SNAPSHOTS.length

function boxClass(active: boolean, done: boolean): string {
  if (active) {
    return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
  }
  if (done) {
    return 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/50 dark:stroke-emerald-600'
  }
  return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
}

function textClass(active: boolean, done: boolean): string {
  if (active) return 'fill-primary-900 dark:fill-primary-100'
  if (done) return 'fill-emerald-900 dark:fill-emerald-100'
  return 'fill-slate-700 dark:fill-slate-300'
}

function podClass(index: number, snapshot: Snapshot): string {
  if (index >= snapshot.pods) {
    return 'fill-slate-50 stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
  }
  if (index < snapshot.ready) {
    return 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
  }
  if (index < snapshot.running) {
    return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
  }
  if (index < snapshot.scheduled) {
    return 'fill-amber-50 stroke-amber-500 dark:fill-amber-950/60 dark:stroke-amber-500'
  }
  return 'fill-slate-100 stroke-slate-400 dark:fill-slate-800 dark:stroke-slate-500'
}

export function RequestPathExplainer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1800)

  const snapshot = SNAPSHOTS[step]
  const isLast = step === TOTAL_STEPS - 1
  const autoPlaying = playing && !isLast

  useEffect(() => {
    if (!autoPlaying) return
    const timer = window.setTimeout(
      () => setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1)),
      speed,
    )
    return () => window.clearTimeout(timer)
  }, [autoPlaying, step, speed])

  function goTo(nextStep: number) {
    setPlaying(false)
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, nextStep)))
  }

  function toggleAutoPlay() {
    if (autoPlaying) {
      setPlaying(false)
      return
    }
    if (isLast) setStep(0)
    setPlaying(true)
  }

  const isActive = (comp: Comp) => snapshot.active.includes(comp)
  const isDone = (comp: Comp) => snapshot.done.includes(comp)
  const nodeActive =
    isActive('kubelet') || isActive('containerd') || isActive('proxy')
  const nodeDone =
    isDone('kubelet') && isDone('containerd') && isDone('proxy')

  function edgeClass(state: 'active' | 'done' | 'idle'): string {
    if (state === 'active') return 'stroke-primary-500 dark:stroke-primary-400'
    if (state === 'done') return 'stroke-emerald-400 dark:stroke-emerald-600'
    return 'stroke-slate-300 dark:stroke-slate-700'
  }

  function edgeState(left: Comp[], right: Comp[]): 'active' | 'done' | 'idle' {
    if (left.some(isActive) && right.some(isActive)) return 'active'
    if (left.every(isDone) && right.every(isDone)) return 'done'
    return 'idle'
  }

  const kubectlEdge = edgeState(['kubectl'], ['apiserver'])
  const etcdEdge = edgeState(['apiserver'], ['etcd'])
  const controllerEdge = edgeState(['controller'], ['apiserver'])
  const schedulerEdge = edgeState(['scheduler'], ['apiserver'])
  const nodeEdge = edgeState(['kubelet', 'containerd', 'proxy'], ['apiserver'])

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            یک kubectl apply چطور به سه پاد در حال اجرا تبدیل می‌شود؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </Badge>
      </div>

      <div
        dir="ltr"
        className="mt-4 flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400"
      >
        <span>kubectl apply -f shop-api-deployment.yaml</span>
        <span>namespace=shop</span>
        <span>replicas=3</span>
        <span>image=registry.local/shop-api:1.4.0</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
          startIcon={<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          گام قبلی
        </Button>
        <Button
          size="sm"
          onClick={() => goTo(step + 1)}
          disabled={isLast}
          startIcon={<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          گام بعدی
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={toggleAutoPlay}
          startIcon={
            autoPlaying ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )
          }
        >
          {autoPlaying ? 'توقف' : 'اجرای خودکار'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => goTo(0)}
          startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          از اول
        </Button>
        <label className="ms-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          سرعت
          <select
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value={2800}>آهسته</option>
            <option value={1800}>متوسط</option>
            <option value={900}>سریع</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="whitespace-nowrap tabular-nums">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </span>
        <div className="relative flex h-6 w-full items-center">
          <div
            className="absolute inset-x-0 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"
            aria-hidden="true"
          />
          <div
            className="absolute h-1.5 rounded-full bg-primary-500 dark:bg-primary-400"
            style={{
              insetInlineStart: 0,
              width: `${(step / (TOTAL_STEPS - 1)) * 100}%`,
            }}
            aria-hidden="true"
          />
          <input
            type="range"
            min={0}
            max={TOTAL_STEPS - 1}
            step={1}
            value={step}
            onChange={(event) => goTo(Number(event.target.value))}
            aria-label="انتخاب گام توضیح"
            className="relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-primary-600 dark:[&::-moz-range-thumb]:border-slate-900 dark:[&::-moz-range-thumb]:bg-primary-400 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary-600 [&::-webkit-slider-thumb]:shadow-md dark:[&::-webkit-slider-thumb]:border-slate-900 dark:[&::-webkit-slider-thumb]:bg-primary-400"
          />
        </div>
      </div>

      <div className="mt-3 min-h-[6.5rem] rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
        <p className="mb-1 text-[10px] font-black text-primary-700 dark:text-primary-300">
          توضیح این گام
        </p>
        <p aria-live="polite" className="m-0 text-sm leading-7">
          {snapshot.caption}
        </p>
      </div>

      <div
        dir="ltr"
        className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-800 dark:bg-slate-950/40"
      >
        <svg
          viewBox="0 0 720 470"
          role="img"
          aria-label="مسیر یک درخواست kubectl apply از apiserver و etcd تا controller manager، scheduler، kubelet و کانتینر در حال اجرا"
          className="h-auto w-full min-w-[620px]"
        >
          <path
            d="M160 182 L250 182"
            fill="none"
            strokeDasharray="5 4"
            strokeWidth={kubectlEdge === 'active' ? 2.5 : 1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${edgeClass(
              kubectlEdge,
            )}`}
          />
          <path
            d="M350 74 L350 150"
            fill="none"
            strokeDasharray="5 4"
            strokeWidth={controllerEdge === 'active' ? 2.5 : 1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${edgeClass(
              controllerEdge,
            )}`}
          />
          <path
            d="M520 147 C485 147 485 182 450 182"
            fill="none"
            strokeDasharray="5 4"
            strokeWidth={schedulerEdge === 'active' ? 2.5 : 1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${edgeClass(
              schedulerEdge,
            )}`}
          />
          <path
            d="M520 270 C485 270 485 182 450 182"
            fill="none"
            strokeDasharray="5 4"
            strokeWidth={nodeEdge === 'active' ? 2.5 : 1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${edgeClass(
              nodeEdge,
            )}`}
          />
          <path
            d="M350 214 L350 300"
            fill="none"
            strokeDasharray="5 4"
            strokeWidth={etcdEdge === 'active' ? 2.5 : 1}
            className={`transition-colors duration-500 motion-reduce:transition-none ${edgeClass(
              etcdEdge,
            )}`}
          />

          <g>
            <rect
              x={250}
              y={20}
              width={200}
              height={54}
              rx={8}
              strokeWidth={1}
              className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                isActive('controller'),
                isDone('controller'),
              )}`}
            />
            <text
              x={350}
              y={43}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              className={`font-mono transition-colors duration-500 motion-reduce:transition-none ${textClass(
                isActive('controller'),
                isDone('controller'),
              )}`}
            >
              kube-controller-manager
            </text>
            <text
              x={350}
              y={61}
              textAnchor="middle"
              fontSize={10}
              className="fill-slate-500 dark:fill-slate-400"
            >
              reconciliation loops
            </text>
          </g>

          <g>
            <rect
              x={20}
              y={150}
              width={140}
              height={64}
              rx={8}
              strokeWidth={1}
              className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                isActive('kubectl'),
                isDone('kubectl'),
              )}`}
            />
            <text
              x={90}
              y={177}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              className={`font-mono transition-colors duration-500 motion-reduce:transition-none ${textClass(
                isActive('kubectl'),
                isDone('kubectl'),
              )}`}
            >
              kubectl
            </text>
            <text
              x={90}
              y={196}
              textAnchor="middle"
              fontSize={10}
              className="fill-slate-500 dark:fill-slate-400"
            >
              sends desired state
            </text>
          </g>

          <g>
            <rect
              x={250}
              y={150}
              width={200}
              height={64}
              rx={8}
              strokeWidth={1}
              className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                isActive('apiserver'),
                isDone('apiserver'),
              )}`}
            />
            <text
              x={350}
              y={177}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              className={`font-mono transition-colors duration-500 motion-reduce:transition-none ${textClass(
                isActive('apiserver'),
                isDone('apiserver'),
              )}`}
            >
              kube-apiserver
            </text>
            <text
              x={350}
              y={196}
              textAnchor="middle"
              fontSize={10}
              className="fill-slate-500 dark:fill-slate-400"
            >
              authn · authz · admission
            </text>
          </g>

          <g>
            <rect
              x={250}
              y={300}
              width={200}
              height={54}
              rx={8}
              strokeWidth={1}
              className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                isActive('etcd'),
                isDone('etcd'),
              )}`}
            />
            <text
              x={350}
              y={323}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              className={`font-mono transition-colors duration-500 motion-reduce:transition-none ${textClass(
                isActive('etcd'),
                isDone('etcd'),
              )}`}
            >
              etcd
            </text>
            <text
              x={350}
              y={341}
              textAnchor="middle"
              fontSize={10}
              className="fill-slate-500 dark:fill-slate-400"
            >
              source of truth
            </text>
          </g>

          <g>
            <rect
              x={520}
              y={110}
              width={180}
              height={54}
              rx={8}
              strokeWidth={1}
              className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                isActive('scheduler'),
                isDone('scheduler'),
              )}`}
            />
            <text
              x={610}
              y={133}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              className={`font-mono transition-colors duration-500 motion-reduce:transition-none ${textClass(
                isActive('scheduler'),
                isDone('scheduler'),
              )}`}
            >
              kube-scheduler
            </text>
            <text
              x={610}
              y={151}
              textAnchor="middle"
              fontSize={10}
              className="fill-slate-500 dark:fill-slate-400"
            >
              filter · score · bind
            </text>
          </g>

          <g>
            <rect
              x={520}
              y={196}
              width={180}
              height={164}
              rx={8}
              strokeWidth={1}
              className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                nodeActive,
                nodeDone,
              )}`}
            />
            <text
              x={610}
              y={216}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              className={`font-mono transition-colors duration-500 motion-reduce:transition-none ${textClass(
                nodeActive,
                nodeDone,
              )}`}
            >
              Node worker-1
            </text>

            <rect
              x={532}
              y={226}
              width={156}
              height={32}
              rx={6}
              strokeWidth={1}
              className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                isActive('kubelet'),
                isDone('kubelet'),
              )}`}
            />
            <text
              x={610}
              y={247}
              textAnchor="middle"
              fontSize={11}
              className={`font-mono transition-colors duration-500 motion-reduce:transition-none ${textClass(
                isActive('kubelet'),
                isDone('kubelet'),
              )}`}
            >
              kubelet
            </text>

            <rect
              x={532}
              y={264}
              width={156}
              height={32}
              rx={6}
              strokeWidth={1}
              className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                isActive('containerd'),
                isDone('containerd'),
              )}`}
            />
            <text
              x={610}
              y={285}
              textAnchor="middle"
              fontSize={11}
              className={`font-mono transition-colors duration-500 motion-reduce:transition-none ${textClass(
                isActive('containerd'),
                isDone('containerd'),
              )}`}
            >
              containerd
            </text>

            <rect
              x={532}
              y={302}
              width={156}
              height={32}
              rx={6}
              strokeWidth={1}
              className={`transition-colors duration-500 motion-reduce:transition-none ${boxClass(
                isActive('proxy'),
                isDone('proxy'),
              )}`}
            />
            <text
              x={610}
              y={323}
              textAnchor="middle"
              fontSize={11}
              className={`font-mono transition-colors duration-500 motion-reduce:transition-none ${textClass(
                isActive('proxy'),
                isDone('proxy'),
              )}`}
            >
              kube-proxy
            </text>
          </g>

          <text
            x={20}
            y={400}
            fontSize={11}
            className="fill-slate-500 dark:fill-slate-400"
          >
            pods
          </text>
          {[0, 1, 2].map((index) => (
            <g key={`pod-${index}`}>
              <rect
                x={70 + index * 90}
                y={384}
                width={80}
                height={28}
                rx={6}
                strokeWidth={1}
                className={`transition-colors duration-500 motion-reduce:transition-none ${podClass(
                  index,
                  snapshot,
                )}`}
              />
              <text
                x={110 + index * 90}
                y={402}
                textAnchor="middle"
                fontSize={11}
                className="fill-slate-700 font-mono dark:fill-slate-300"
              >
                pod-{index + 1}
              </text>
            </g>
          ))}

          <rect
            x={360}
            y={384}
            width={180}
            height={28}
            rx={6}
            strokeWidth={1}
            className={
              snapshot.endpoints > 0
                ? 'fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950/60 dark:stroke-emerald-500'
                : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
            }
          />
          <text
            x={450}
            y={402}
            textAnchor="middle"
            fontSize={11}
            className="fill-slate-700 font-mono dark:fill-slate-300"
          >
            svc/shop-api · ep {snapshot.endpoints}
          </text>

          <text
            x={20}
            y={440}
            fontSize={10}
            className="fill-slate-500 dark:fill-slate-400"
          >
            Deployment {snapshot.deployment ? 1 : 0} · ReplicaSet{' '}
            {snapshot.replicaset ? 1 : 0} · running {snapshot.running}/3 · ready{' '}
            {snapshot.ready}/3
          </text>
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن نود و سرویس، نمودار را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        برای خوانایی فقط یک نود و سه پاد نشان داده شده است؛ منطق همان چیزی است که
        کوبرنتیز اجرا می‌کند: هر تغییر از kube-apiserver عبور می‌کند و در etcd
        ثبت می‌شود، سپس کنترلرها و scheduler و kubelet آن را به واقعیت تبدیل
        می‌کنند.
      </p>
    </div>
  )
}
