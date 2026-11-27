import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { toPersianDigits } from '../../utils/persianDigits'

const YAML_LINES = [
  'apiVersion: apps/v1',
  'kind: Deployment',
  'metadata:',
  '  name: shop-api',
  '  namespace: shop',
  '  labels:',
  '    app: shop-api',
  'spec:',
  '  replicas: 3',
  '  selector:',
  '    matchLabels:',
  '      app: shop-api',
  '  template:',
  '    metadata:',
  '      labels:',
  '        app: shop-api',
  '    spec:',
  '      containers:',
  '        - name: api',
  '          image: registry.local/shop-api:1.4.0',
  '          ports:',
  '            - containerPort: 8080',
  '          resources:',
  '            requests: { cpu: 250m, memory: 256Mi }',
  '            limits: { cpu: 500m, memory: 512Mi }',
]

interface Group {
  start: number
  end: number
  label: string
}

const GROUPS: Group[] = [
  { start: 0, end: 1, label: 'نوع و نسخه API' },
  { start: 2, end: 4, label: 'هویت: نام و namespace' },
  { start: 5, end: 6, label: 'برچسب‌ها برای انتخاب' },
  { start: 7, end: 8, label: 'وضعیت مطلوب: تعداد نسخه' },
  { start: 9, end: 11, label: 'انتخاب پادهای متعلق' },
  { start: 12, end: 19, label: 'قالب پاد و ایمیج' },
  { start: 20, end: 24, label: 'پورت و سهم منابع' },
]

const LINE_Y = (row: number) => 34 + row * 17

const PIPELINE = [
  { title: 'kubectl apply', sub: 'desired state' },
  { title: 'API Server', sub: 'authn · authz' },
  { title: 'etcd', sub: 'persist' },
  { title: 'kubectl get', sub: 'read' },
  { title: 'kubectl describe', sub: 'events' },
  { title: 'kubectl edit', sub: 'update' },
]

const PIPELINE_COMMANDS = [
  '$ kubectl apply -f shop-api-deployment.yaml',
  'POST /apis/apps/v1/namespaces/shop/deployments',
  'PUT /registry/apps/deployments/shop/shop-api',
  '$ kubectl get deployments,pods -n shop',
  '$ kubectl describe pod shop-api-6d9f7c8b5d-4kx2p -n shop',
  '$ kubectl edit deployment/shop-api -n shop',
]

const PIPELINE_OUTPUT: string[][] = [
  ['deployment.apps/shop-api created', 'resourceVersion: "184220"'],
  [
    'authentication: user=ali',
    'authorization: allowed (edit deployments)',
    'admission: defaulting + validation',
    'status: 201 Created',
  ],
  [
    'key: /registry/apps/deployments/shop/shop-api',
    'resourceVersion: 184223',
    'watch event → controller-manager',
  ],
  [
    'NAME       READY   UP-TO-DATE   AVAILABLE   AGE',
    'shop-api   3/3     3            3           42s',
    '',
    'NAME                        READY   STATUS    NODE',
    'shop-api-6d9f7c8b5d-4kx2p   1/1     Running   worker-1',
  ],
  [
    'Events:',
    '  Normal  ScalingReplicaSet  Scaled up replica set ...',
    '  Normal  Scheduled          Assigned to worker-1',
    '  Normal  Pulled             Image already present',
    '  Normal  Started            Started container api',
  ],
  [
    'deployment.apps/shop-api edited',
    'resourceVersion: 184230 → 184231',
    'rollout: 3 old pods → 3 new pods (rolling)',
  ],
]

interface Snapshot {
  stage: 1 | 2
  caption: string
}

const SNAPSHOTS: Snapshot[] = [
  {
    stage: 1,
    caption:
      'هر مانیفست با apiVersion و kind شروع می‌شود. این دو با هم می‌گویند شیء از چه نوعی است و کدام نسخه API آن را می‌شناسد؛ اینجا Deployment از گروه apps/v1.',
  },
  {
    stage: 1,
    caption:
      'metadata هویت شیء را می‌سازد: name و namespace. نام در هر namespace یکتاست؛ دو Deployment هم‌نام در دو namespace مختلف مجازند.',
  },
  {
    stage: 1,
    caption:
      'labels برچسب‌های کلید-مقدار برای انتخاب‌اند. app: shop-api بعداً به selector و Service کمک می‌کند پادهای درست را پیدا کنند.',
  },
  {
    stage: 1,
    caption:
      'spec وضعیت مطلوب است. replicas: 3 یعنی همیشه سه پاد از این قالب باید در حال اجرا باشند؛ اگر یکی حذف شود، کنترلر جای آن را پر می‌کند.',
  },
  {
    stage: 1,
    caption:
      'selector.matchLabels می‌گوید این Deployment کدام پادها را مدیریت می‌کند. این برچسب باید با برچسب داخل template بخواند، وگرنه Deployment پادهای خودش را پیدا نمی‌کند.',
  },
  {
    stage: 1,
    caption:
      'template قالب پاد است: metadata.labels همان برچسب selector را دارد و spec.containers نام کانتینر و ایمیج را تعریف می‌کند. هر پاد از روی همین قالب ساخته می‌شود.',
  },
  {
    stage: 1,
    caption:
      'هر کانتینر پورت و منابعش را اعلام می‌کند. requests برای زمان‌بندی و limits سقف واقعی است؛ containerPort فقط مستندسازی است و به‌تنهایی ترافیک را باز نمی‌کند.',
  },
  {
    stage: 2,
    caption:
      'kubectl فایل را به apiserver می‌فرستد. سرور ابتدا احراز هویت و مجوزدهی می‌کند، سپس پیش‌فرض‌ها و اعتبارسنجی را اعمال می‌کند.',
  },
  {
    stage: 2,
    caption:
      'apiserver شیء را در etcd می‌نویسد و resourceVersion می‌دهد. از این لحظه کنترلرها می‌توانند تغییر را از طریق watch ببینند.',
  },
  {
    stage: 2,
    caption:
      'kubectl get از apiserver می‌خواند و ستون‌های خلاصه را نشان می‌دهد. get وضعیت مطلوب و واقعی را کنار هم می‌آورد تا اختلاف را ببینید.',
  },
  {
    stage: 2,
    caption:
      'kubectl describe جزئیات و Events را نشان می‌دهد؛ وقتی پاد بالا نمی‌آید یا ایمیج کشیده نمی‌شود، اولین جایی است که باید نگاه کنید.',
  },
  {
    stage: 2,
    caption:
      'kubectl edit یک نسخه جدید از شیء را ذخیره می‌کند. resourceVersion عوض می‌شود و Deployment یک rolling update شروع می‌کند.',
  },
  {
    stage: 2,
    caption:
      'kubectl delete شیء را حذف می‌کند. با حذف Deployment، ReplicaSet و پادهایش هم از طریق ownerReferences پاک می‌شوند.',
  },
]

const TOTAL_STEPS = SNAPSHOTS.length

function groupActiveClass(active: boolean): string {
  return active
    ? 'fill-primary-50/80 stroke-primary-400 dark:fill-primary-950/50 dark:stroke-primary-600'
    : 'fill-transparent stroke-transparent'
}

function pipelineBoxClass(index: number, activeIndex: number): string {
  if (index === activeIndex) {
    return 'fill-primary-50 stroke-primary-500 dark:fill-primary-950/60 dark:stroke-primary-400'
  }
  if (index < activeIndex) {
    return 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-950/50 dark:stroke-emerald-600'
  }
  return 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
}

function pipelineTextClass(index: number, activeIndex: number): string {
  if (index === activeIndex) return 'fill-primary-900 dark:fill-primary-100'
  if (index < activeIndex) return 'fill-emerald-900 dark:fill-emerald-100'
  return 'fill-slate-700 dark:fill-slate-300'
}

export function ManifestAnatomyExplainer() {
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

  const activeGroup = snapshot.stage === 1 ? step : -1
  const activePipeline = snapshot.stage === 2 ? step - GROUPS.length : -1

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            توضیح تعاملی گام‌به‌گام
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            هر بخش از یک مانیفست چه کاری می‌کند؟
          </h3>
        </div>
        <Badge variant="primary">
          گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL_STEPS)}
        </Badge>
      </div>

      <div className="mt-4 flex gap-2">
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors ${
            snapshot.stage === 1
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          ۱ · ساختار مانیفست
        </div>
        <div
          className={`flex-1 rounded-lg border px-2 py-2 text-center text-[13px] transition-colors ${
            snapshot.stage === 2
              ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          ۲ · چرخه kubectl
        </div>
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
        {snapshot.stage === 1 ? (
          <svg
            viewBox="0 0 720 500"
            role="img"
            aria-label="ساختار فایل مانیفست Deployment؛ بخش‌های apiVersion، kind، metadata، labels، spec، selector، template و resources"
            className="h-auto w-full min-w-[560px]"
          >
            {GROUPS.map((group, index) => {
              const top = LINE_Y(group.start) - 13
              const height = (group.end - group.start + 1) * 17 + 6
              const mid = (LINE_Y(group.start) + LINE_Y(group.end)) / 2
              const active = index === activeGroup

              return (
                <g key={`group-${index}`}>
                  <rect
                    x={12}
                    y={top}
                    width={404}
                    height={height}
                    rx={6}
                    strokeWidth={1}
                    className={`transition-colors duration-500 motion-reduce:transition-none ${groupActiveClass(
                      active,
                    )}`}
                  />
                  <path
                    d={`M416 ${mid} L444 ${mid}`}
                    fill="none"
                    strokeDasharray="4 3"
                    strokeWidth={active ? 2 : 1}
                    className={`transition-colors duration-500 motion-reduce:transition-none ${
                      active
                        ? 'stroke-primary-500 dark:stroke-primary-400'
                        : 'stroke-slate-300 dark:stroke-slate-700'
                    }`}
                  />
                  <rect
                    x={444}
                    y={mid - 15}
                    width={258}
                    height={30}
                    rx={6}
                    strokeWidth={1}
                    className={`transition-colors duration-500 motion-reduce:transition-none ${
                      active
                        ? 'fill-primary-50 stroke-primary-400 dark:fill-primary-950/60 dark:stroke-primary-600'
                        : 'fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800'
                    }`}
                  />
                  <text
                    x={573}
                    y={mid + 4}
                    textAnchor="middle"
                    fontSize={12}
                    className={`transition-colors duration-500 motion-reduce:transition-none ${
                      active
                        ? 'fill-primary-900 dark:fill-primary-100'
                        : 'fill-slate-600 dark:fill-slate-400'
                    }`}
                  >
                    {group.label}
                  </text>
                </g>
              )
            })}

            {YAML_LINES.map((line, row) => {
              const inActive =
                activeGroup >= 0 &&
                row >= GROUPS[activeGroup].start &&
                row <= GROUPS[activeGroup].end

              return (
                <text
                  key={`line-${row}`}
                  x={26}
                  y={LINE_Y(row)}
                  fontSize={12}
                  xmlSpace="preserve"
                  style={{ whiteSpace: 'pre' }}
                  className={`font-mono transition-colors duration-500 motion-reduce:transition-none ${
                    inActive
                      ? 'fill-primary-800 dark:fill-primary-200'
                      : 'fill-slate-700 dark:fill-slate-300'
                  }`}
                >
                  {line}
                </text>
              )
            })}
          </svg>
        ) : (
          <svg
            viewBox="0 0 720 310"
            role="img"
            aria-label="چرخه kubectl از apply و apiserver و etcd تا get، describe و edit"
            className="h-auto w-full min-w-[600px]"
          >
            {PIPELINE.map((item, index) => {
              const x = 18 + index * 116
              const active = index === activePipeline
              const done = index < activePipeline

              return (
                <g key={`pipe-${index}`}>
                  {index > 0 && (
                    <path
                      d={`M${x - 12} 76 L${x} 76`}
                      fill="none"
                      strokeWidth={active ? 2 : 1}
                      className={`transition-colors duration-500 motion-reduce:transition-none ${
                        active
                          ? 'stroke-primary-500 dark:stroke-primary-400'
                          : done
                            ? 'stroke-emerald-400 dark:stroke-emerald-600'
                          : 'stroke-slate-300 dark:stroke-slate-700'
                      }`}
                    />
                  )}
                  <rect
                    x={x}
                    y={50}
                    width={104}
                    height={52}
                    rx={8}
                    strokeWidth={1}
                    className={`transition-colors duration-500 motion-reduce:transition-none ${pipelineBoxClass(
                      index,
                      activePipeline,
                    )}`}
                  />
                  <text
                    x={x + 52}
                    y={72}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    className={`font-mono transition-colors duration-500 motion-reduce:transition-none ${pipelineTextClass(
                      index,
                      activePipeline,
                    )}`}
                  >
                    {item.title}
                  </text>
                  <text
                    x={x + 52}
                    y={89}
                    textAnchor="middle"
                    fontSize={9}
                    className="fill-slate-500 dark:fill-slate-400"
                  >
                    {item.sub}
                  </text>
                </g>
              )
            })}

            <text
              x={18}
              y={130}
              fontSize={11}
              className="fill-primary-700 font-mono dark:fill-primary-300"
            >
              {PIPELINE_COMMANDS[Math.max(activePipeline, 0)]}
            </text>

            <rect
              x={18}
              y={144}
              width={684}
              height={150}
              rx={8}
              className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-800"
              strokeWidth={1}
            />
            {PIPELINE_OUTPUT[Math.max(activePipeline, 0)].map((line, index) => (
              <text
                key={`out-${index}`}
                x={34}
                y={170 + index * 22}
                fontSize={11}
                xmlSpace="preserve"
                style={{ whiteSpace: 'pre' }}
                className="fill-slate-700 font-mono dark:fill-slate-300"
              >
                {line}
              </text>
            ))}
          </svg>
        )}
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
        برای دیدن کل نمودار، آن را افقی بکشید.
      </p>

      <p className="mt-3 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        فایل و خروجی‌ها برای خوانایی کوتاه شده‌اند؛ فیلدها و رفتار دقیقاً همان چیزی
        است که kube-apiserver و kubectl واقعی اعمال می‌کنند.
      </p>
    </div>
  )
}
