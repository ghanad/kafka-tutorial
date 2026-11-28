import { useState } from 'react'
import { ExplainerFrame, boxClass } from './ExplainerFrame'

interface Snapshot {
  caption: string
  time: string
  startup: 'pending' | 'ok'
  ready: boolean
  inEndpoints: boolean
  restarts: number
  note: string
}

const SNAPSHOTS: Snapshot[] = [
  {
    caption:
      'کانتینر تازه شروع شده و هنوز آماده نیست. startupProbe هر چند ثانیه اجرا می‌شود و تا موفق نشود، liveness و readiness اجرا نمی‌شوند؛ پس برنامه فرصت دارد بدون ری‌استارت بالا بیاید.',
    time: 't=0s',
    startup: 'pending',
    ready: false,
    inEndpoints: false,
    restarts: 0,
    note: 'startup در حال بررسی',
  },
  {
    caption:
      'startupProbe موفق شد. از این لحظه probeهای اصلی فعال می‌شوند. readiness هنوز سبز نشده، چون اتصال به دیتابیس کامل نشده است.',
    time: 't=12s',
    startup: 'ok',
    ready: false,
    inEndpoints: false,
    restarts: 0,
    note: 'startup ok',
  },
  {
    caption:
      'readinessProbe سبز می‌شود و Pod به endpointهای Service اضافه می‌شود. از این لحظه kube-proxy ترافیک را به آن می‌فرستد.',
    time: 't=20s',
    startup: 'ok',
    ready: true,
    inEndpoints: true,
    restarts: 0,
    note: 'ready · in endpoints',
  },
  {
    caption:
      'دیتابیس کند می‌شود و readiness شکست می‌خورد. Pod از endpointها خارج می‌شود اما کانتینر کشته نمی‌شود؛ فقط ترافیک جدید نمی‌گیرد. این دقیقاً کار درست است.',
    time: 't=48s',
    startup: 'ok',
    ready: false,
    inEndpoints: false,
    restarts: 0,
    note: 'not ready · removed',
  },
  {
    caption:
      'دیتابیس برمی‌گردد و readiness دوباره سبز می‌شود. Pod بدون هیچ ری‌استارتی به چرخه ترافیک برمی‌گردد؛ چون liveness هرگز شکست نخورد.',
    time: 't=70s',
    startup: 'ok',
    ready: true,
    inEndpoints: true,
    restarts: 0,
    note: 'recovered',
  },
  {
    caption:
      'این بار فرآیند اصلی قفل می‌کند و liveness شکست می‌خورد. kubelet کانتینر را می‌کشد و دوباره اجرا می‌کند؛ شمارنده restart یک می‌شود و چرخه از startup دوباره شروع می‌شود.',
    time: 't=95s',
    startup: 'pending',
    ready: false,
    inEndpoints: false,
    restarts: 1,
    note: 'restarted',
  },
]

const TIMES = ['0s', '12s', '20s', '48s', '70s', '95s']
const X = (index: number) => 70 + index * 100

export function ProbeLifecycleExplainer() {
  const [step, setStep] = useState(0)
  const snapshot = SNAPSHOTS[step]

  return (
    <ExplainerFrame
      title="readiness و liveness در طول عمر یک Pod چه تفاوتی دارند؟"
      step={step}
      total={SNAPSHOTS.length}
      caption={snapshot.caption}
      onPrev={() => setStep((current) => Math.max(0, current - 1))}
      onNext={() => setStep((current) => Math.min(SNAPSHOTS.length - 1, current + 1))}
      onReset={() => setStep(0)}
      figureLabel="خط زمان وضعیت startup، readiness و liveness یک Pod و عضویت آن در endpointها"
      viewBox="0 0 680 300"
      minWidth={620}
      context={<span>Pod: shop-api · startup: /health/startup · readiness: /health/ready · liveness: /health/live</span>}
      footnote="زمان‌ها برای خوانایی کوتاه شده‌اند؛ ترتیب رویدادها همان چیزی است که kubelet با probeها اجرا می‌کند."
    >
      <line x1={60} y1={90} x2={630} y2={90} strokeWidth={1.5} className="stroke-slate-300 dark:stroke-slate-700" />
      {TIMES.map((time, index) => (
        <g key={time}>
          <circle
            cx={X(index)}
            cy={90}
            r={index === step ? 8 : 5}
            strokeWidth={1.5}
            className={
              index === step
                ? 'fill-primary-500 stroke-primary-600 dark:fill-primary-400'
                : index < step
                  ? 'fill-slate-400 stroke-slate-500 dark:fill-slate-500'
                  : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700'
            }
          />
          <text x={X(index)} y={116} textAnchor="middle" fontSize={10} className="fill-slate-500 font-mono dark:fill-slate-400">
            {time}
          </text>
        </g>
      ))}

      <rect x={30} y={150} width={180} height={44} rx={8} strokeWidth={1.5} className={boxClass(snapshot.startup === 'ok' ? 'ok' : 'active')} />
      <text x={120} y={177} textAnchor="middle" fontSize={11} className="fill-slate-800 dark:fill-slate-200">
        startup: {snapshot.startup === 'ok' ? 'passed' : 'pending'}
      </text>

      <rect x={250} y={150} width={180} height={44} rx={8} strokeWidth={1.5} className={boxClass(snapshot.ready ? 'ok' : 'warn')} />
      <text x={340} y={177} textAnchor="middle" fontSize={11} className="fill-slate-800 dark:fill-slate-200">
        readiness: {snapshot.ready ? 'pass' : 'fail'}
      </text>

      <rect x={470} y={150} width={180} height={44} rx={8} strokeWidth={1.5} className={boxClass(snapshot.restarts > 0 ? 'bad' : 'ok')} />
      <text x={560} y={177} textAnchor="middle" fontSize={11} className="fill-slate-800 dark:fill-slate-200">
        restarts: {snapshot.restarts}
      </text>

      <rect
        x={200}
        y={220}
        width={280}
        height={44}
        rx={8}
        strokeWidth={1.5}
        className={boxClass(snapshot.inEndpoints ? 'ok' : 'muted')}
      />
      <text x={340} y={247} textAnchor="middle" fontSize={11} className="fill-slate-800 dark:fill-slate-200">
        {snapshot.inEndpoints ? 'در endpointهای Service' : 'خارج از endpointها'}
      </text>
    </ExplainerFrame>
  )
}
