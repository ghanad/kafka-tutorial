import { useState } from 'react'
import { ExplainerFrame, boxClass } from './ExplainerFrame'

interface Snapshot {
  caption: string
  nodeUsed: number
  podState: 'pending' | 'running' | 'oom'
  qos: 'Guaranteed' | 'Burstable' | 'BestEffort'
  memory: string
  highlight: 'request' | 'limit' | 'oom' | 'qos'
}

const NODE_CAPACITY = 8

const SNAPSHOTS: Snapshot[] = [
  {
    caption:
      'Pod برای shop-api درخواست ۱ هسته CPU و ۵۱۲Mi حافظه دارد. Scheduler فقط requests را می‌بیند؛ limits در زمان زمان‌بندی نقشی ندارند. اگر مجموع requests از ظرفیت نود بیشتر شود، Pod در Pending می‌ماند.',
    nodeUsed: 5,
    podState: 'pending',
    qos: 'Burstable',
    memory: '512Mi / 1Gi',
    highlight: 'request',
  },
  {
    caption:
      'نود ظرفیت کافی دارد، پس Pod زمان‌بندی و اجرا می‌شود. تا وقتی مصرف زیر سقف است، همه چیز عادی است. requests سهم تضمین‌شده و limits سقف سخت است.',
    nodeUsed: 6,
    podState: 'running',
    qos: 'Burstable',
    memory: '700Mi / 1Gi',
    highlight: 'limit',
  },
  {
    caption:
      'برنامه دچار نشتی حافظه می‌شود و از limit یعنی ۱Gi عبور می‌کند. کرنل کانتینر را با OOMKilled می‌کشد؛ CPU چنین رفتاری ندارد و فقط throttle می‌شود.',
    nodeUsed: 6,
    podState: 'oom',
    qos: 'Burstable',
    memory: '1Gi / 1Gi',
    highlight: 'oom',
  },
  {
    caption:
      'اگر requests و limits هر دو برابر باشند، Pod کلاس Guaranteed می‌گیرد و آخرین کاندید تخلیه زیر فشار است. اگر هیچ‌کدام تعیین نشوند، BestEffort است و اول از همه قربانی می‌شود.',
    nodeUsed: 6,
    podState: 'running',
    qos: 'Guaranteed',
    memory: '512Mi / 512Mi',
    highlight: 'qos',
  },
  {
    caption:
      'قاعده عملی: برای سرویس‌های حیاتی requests را واقع‌بینانه بگذارید و limit حافظه را کمی بالاتر از اوج مصرف. limit برابر با request برای حافظه، Pod را Guaranteed می‌کند اما اگر برنامه نوسان دارد، OOM می‌گیرد.',
    nodeUsed: 6,
    podState: 'running',
    qos: 'Guaranteed',
    memory: '480Mi / 512Mi',
    highlight: 'qos',
  },
]

export function QoSExplainer() {
  const [step, setStep] = useState(0)
  const snapshot = SNAPSHOTS[step]

  return (
    <ExplainerFrame
      title="requests و limits چطور روی زمان‌بندی، OOM و کلاس QoS اثر می‌گذارند؟"
      step={step}
      total={SNAPSHOTS.length}
      caption={snapshot.caption}
      onPrev={() => setStep((current) => Math.max(0, current - 1))}
      onNext={() => setStep((current) => Math.min(SNAPSHOTS.length - 1, current + 1))}
      onReset={() => setStep(0)}
      figureLabel="نود با ظرفیت CPU و Pod با requests و limits و وضعیت OOM و کلاس QoS"
      viewBox="0 0 680 300"
      minWidth={580}
      context={<span>node: 8 CPU · Pod shop-api: requests 1 CPU / 512Mi · limits 1 CPU / 1Gi</span>}
      footnote="نمودار فقط CPU را در نوار ظرفیت نشان می‌دهد؛ رفتار حافظه و OOM در کادر Pod آمده است."
    >
      <text x={30} y={28} fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
        Node worker-1
      </text>
      <rect x={30} y={44} width={400} height={22} rx={6} className="fill-slate-200 dark:fill-slate-800" />
      <rect
        x={30}
        y={44}
        width={(snapshot.nodeUsed / NODE_CAPACITY) * 400}
        height={22}
        rx={6}
        className="fill-slate-400 transition-[width] duration-500 motion-reduce:transition-none dark:fill-slate-500"
      />
      <text x={230} y={60} textAnchor="middle" fontSize={10} className="fill-white font-mono dark:fill-slate-900">
        requests: {snapshot.nodeUsed} / {NODE_CAPACITY} CPU
      </text>

      <rect
        x={30}
        y={96}
        width={400}
        height={170}
        rx={10}
        strokeWidth={1.5}
        className={boxClass(snapshot.podState === 'oom' ? 'bad' : snapshot.podState === 'running' ? 'active' : 'warn')}
      />
      <text x={50} y={122} fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
        Pod shop-api
      </text>
      <text x={50} y={146} fontSize={11} className="fill-slate-600 dark:fill-slate-300">
        وضعیت: {snapshot.podState === 'oom' ? 'OOMKilled' : snapshot.podState === 'running' ? 'Running' : 'Pending'}
      </text>
      <text x={50} y={168} fontSize={11} className="fill-slate-600 font-mono dark:fill-slate-300">
        memory: {snapshot.memory}
      </text>
      <text x={50} y={190} fontSize={11} className="fill-slate-600 dark:fill-slate-300">
        QoS: {snapshot.qos}
      </text>
      <rect x={50} y={206} width={360} height={14} rx={7} className="fill-slate-200 dark:fill-slate-800" />
      <rect
        x={50}
        y={206}
        width={snapshot.podState === 'oom' ? 360 : snapshot.memory.startsWith('700') ? 252 : 180}
        height={14}
        rx={7}
        className={
          snapshot.podState === 'oom'
            ? 'fill-rose-500 dark:fill-rose-400'
            : 'fill-emerald-500 dark:fill-emerald-400'
        }
      />
      <text x={50} y={240} fontSize={10} className="fill-slate-500 dark:fill-slate-400">
        limit = 1Gi
      </text>

      <rect x={470} y={96} width={180} height={170} rx={10} strokeWidth={1.5} className={boxClass('idle')} />
      <text x={560} y={122} textAnchor="middle" fontSize={12} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
        ترتیب تخلیه
      </text>
      {['BestEffort', 'Burstable', 'Guaranteed'].map((name, index) => (
        <text
          key={name}
          x={560}
          y={152 + index * 26}
          textAnchor="middle"
          fontSize={11}
          className={
            snapshot.qos === name
              ? 'fill-primary-600 font-bold dark:fill-primary-300'
              : 'fill-slate-600 dark:fill-slate-300'
          }
        >
          {index + 1}. {name}
        </text>
      ))}
      <text x={560} y={244} textAnchor="middle" fontSize={9} className="fill-slate-400 dark:fill-slate-500">
        اول → آخر
      </text>
    </ExplainerFrame>
  )
}
