import { useState } from 'react'
import { ExplainerFrame, boxClass } from './ExplainerFrame'

interface Snapshot {
  caption: string
  cmVersion: string
  env: string[]
  files: string[]
  highlight: 'cm' | 'env' | 'volume' | 'stale' | null
}

const SNAPSHOTS: Snapshot[] = [
  {
    caption:
      'ConfigMap با نام shop-config ساخته می‌شود و سه کلید دارد: DB_HOST، DB_PORT و LOG_LEVEL. خود ConfigMap هیچ Podی را تغییر نمی‌دهد؛ فقط داده را جدا از image نگه می‌دارد.',
    cmVersion: 'v1',
    env: [],
    files: [],
    highlight: 'cm',
  },
  {
    caption:
      'با envFrom، همه کلیدها به‌صورت متغیر محیطی به کانتینر تزریق می‌شوند. این کار برای تنظیمات ساده راحت است، اما نام کلیدها باید با نام متغیرهای برنامه یکی باشد.',
    cmVersion: 'v1',
    env: ['DB_HOST=db.shop.svc', 'DB_PORT=5432', 'LOG_LEVEL=info'],
    files: [],
    highlight: 'env',
  },
  {
    caption:
      'برای یک کلید خاص می‌توان از valueFrom و configMapKeyRef استفاده کرد. مزیتش این است که فقط همان کلید را می‌گیرید و بقیه ConfigMap به کانتینر نشت نمی‌کند.',
    cmVersion: 'v1',
    env: ['DB_HOST=db.shop.svc', 'DB_PORT=5432', 'LOG_LEVEL=info'],
    files: [],
    highlight: 'env',
  },
  {
    caption:
      'حالت سوم، mount کردن ConfigMap به‌عنوان volume است. هر کلید به یک فایل تبدیل می‌شود: /etc/shop/DB_HOST و دو فایل دیگر. برنامه فایل‌ها را می‌خواند، نه متغیر محیطی.',
    cmVersion: 'v1',
    env: ['DB_HOST=db.shop.svc', 'DB_PORT=5432', 'LOG_LEVEL=info'],
    files: ['DB_HOST', 'DB_PORT', 'LOG_LEVEL'],
    highlight: 'volume',
  },
  {
    caption:
      'حالا LOG_LEVEL در ConfigMap به debug تغییر می‌کند. فایل mount‌شده پس از چند ثانیه به‌روز می‌شود (kubelet دوره‌ای همگام می‌کند)، اما متغیر محیطی LOG_LEVEL داخل کانتینر همان info می‌ماند.',
    cmVersion: 'v2',
    env: ['DB_HOST=db.shop.svc', 'DB_PORT=5432', 'LOG_LEVEL=info'],
    files: ['DB_HOST', 'DB_PORT', 'LOG_LEVEL=debug'],
    highlight: 'stale',
  },
  {
    caption:
      'قاعده کلی: متغیرهای محیطی فقط هنگام شروع کانتینر خوانده می‌شوند؛ برای دیدن مقدار جدید باید Pod بازسازی شود. فایل‌های volume به‌روز می‌شوند، ولی برنامه باید تغییر فایل را خودش دوباره بخواند.',
    cmVersion: 'v2',
    env: ['DB_HOST=db.shop.svc', 'DB_PORT=5432', 'LOG_LEVEL=info'],
    files: ['DB_HOST', 'DB_PORT', 'LOG_LEVEL=debug'],
    highlight: 'stale',
  },
]

export function ConfigInjectionExplainer() {
  const [step, setStep] = useState(0)
  const snapshot = SNAPSHOTS[step]

  return (
    <ExplainerFrame
      title="ConfigMap چطور به کانتینر می‌رسد و کدام راه به‌روز می‌شود؟"
      step={step}
      total={SNAPSHOTS.length}
      caption={snapshot.caption}
      onPrev={() => setStep((current) => Math.max(0, current - 1))}
      onNext={() => setStep((current) => Math.min(SNAPSHOTS.length - 1, current + 1))}
      onReset={() => setStep(0)}
      figureLabel="ConfigMap و Pod؛ تزریق به‌صورت متغیر محیطی و فایل volume و اثر تغییر مقدار"
      viewBox="0 0 680 320"
      minWidth={600}
      context={<span>ConfigMap: shop-config · Pod: shop-api · mountPath: /etc/shop</span>}
      footnote="مقدارها کوچک شده‌اند اما رفتار همان است: env در زمان شروع کانتینر snapshot می‌شود و volume به‌روزرسانی دوره‌ای دارد."
    >
      <rect
        x={30}
        y={60}
        width={190}
        height={150}
        rx={10}
        strokeWidth={1.5}
        className={boxClass(snapshot.highlight === 'cm' ? 'active' : 'idle')}
      />
      <text x={125} y={84} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
        ConfigMap
      </text>
      <text x={125} y={104} textAnchor="middle" fontSize={10} className="fill-slate-500 font-mono dark:fill-slate-400">
        {snapshot.cmVersion}
      </text>
      {['DB_HOST', 'DB_PORT', 'LOG_LEVEL'].map((key, index) => (
        <text key={key} x={48} y={128 + index * 22} fontSize={11} className="fill-slate-700 font-mono dark:fill-slate-200">
          {key}
        </text>
      ))}

      <rect
        x={430}
        y={40}
        width={220}
        height={240}
        rx={10}
        strokeWidth={1.5}
        className={boxClass('idle')}
      />
      <text x={540} y={64} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
        Pod shop-api
      </text>

      <rect
        x={448}
        y={78}
        width={184}
        height={92}
        rx={6}
        strokeWidth={1.2}
        className={boxClass(snapshot.highlight === 'env' ? 'active' : 'muted')}
      />
      <text x={540} y={96} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">
        env
      </text>
      {snapshot.env.map((line, index) => (
        <text key={line} x={458} y={114 + index * 18} fontSize={10} className="fill-slate-700 font-mono dark:fill-slate-200">
          {line}
        </text>
      ))}
      {snapshot.env.length === 0 ? (
        <text x={540} y={126} textAnchor="middle" fontSize={10} className="fill-slate-400 dark:fill-slate-500">
          خالی
        </text>
      ) : null}

      <rect
        x={448}
        y={184}
        width={184}
        height={80}
        rx={6}
        strokeWidth={1.2}
        className={boxClass(snapshot.highlight === 'volume' || snapshot.highlight === 'stale' ? 'active' : 'muted')}
      />
      <text x={540} y={202} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">
        /etc/shop
      </text>
      {snapshot.files.map((line, index) => {
        const changed = snapshot.highlight === 'stale' && line.includes('debug')
        return (
          <text
            key={line}
            x={458}
            y={220 + index * 16}
            fontSize={10}
            className={
              changed
                ? 'fill-amber-600 font-mono dark:fill-amber-400'
                : 'fill-slate-700 font-mono dark:fill-slate-200'
            }
          >
            {line}
          </text>
        )
      })}
      {snapshot.files.length === 0 ? (
        <text x={540} y={228} textAnchor="middle" fontSize={10} className="fill-slate-400 dark:fill-slate-500">
          mount نشده
        </text>
      ) : null}

      <path
        d="M220 120 C320 120 330 120 430 120"
        fill="none"
        strokeDasharray="4 3"
        strokeWidth={snapshot.highlight === 'env' ? 2.5 : 1.2}
        className={snapshot.highlight === 'env' ? 'stroke-primary-500 dark:stroke-primary-400' : 'stroke-slate-300 dark:stroke-slate-700'}
      />
      <path
        d="M220 200 C320 200 330 220 430 220"
        fill="none"
        strokeDasharray="4 3"
        strokeWidth={snapshot.highlight === 'volume' || snapshot.highlight === 'stale' ? 2.5 : 1.2}
        className={snapshot.highlight === 'volume' || snapshot.highlight === 'stale' ? 'stroke-primary-500 dark:stroke-primary-400' : 'stroke-slate-300 dark:stroke-slate-700'}
      />
      <text x={325} y={112} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">
        envFrom / valueFrom
      </text>
      <text x={325} y={212} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">
        volumeMount
      </text>
    </ExplainerFrame>
  )
}
