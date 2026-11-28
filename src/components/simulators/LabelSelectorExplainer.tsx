import { useState } from 'react'
import { ExplainerFrame, boxClass } from './ExplainerFrame'

interface PodDef {
  id: string
  app: string
  env: string
  tier: string
}

const PODS: PodDef[] = [
  { id: 'web-1', app: 'web', env: 'prod', tier: 'frontend' },
  { id: 'api-1', app: 'api', env: 'prod', tier: 'backend' },
  { id: 'api-2', app: 'api', env: 'dev', tier: 'backend' },
  { id: 'worker-1', app: 'worker', env: 'prod', tier: 'backend' },
  { id: 'api-3', app: 'api', env: 'prod', tier: 'backend' },
]

interface Snapshot {
  caption: string
  expression: string
  match: string[]
}

const SNAPSHOTS: Snapshot[] = [
  {
    caption:
      'در namespace فروشگاه پنج Pod داریم و هیچ selectori اعمال نشده است. برچسب‌ها فقط داده‌اند؛ تا وقتی کسی آن‌ها را انتخاب نکند، هیچ گروهی شکل نمی‌گیرد.',
    expression: '(بدون selector)',
    match: [],
  },
  {
    caption:
      'اولین شرط env=prod اضافه می‌شود. چهار Pod از پنج Pod این برچسب را دارند؛ api-2 که در محیط dev است کنار می‌رود.',
    expression: 'env=prod',
    match: ['web-1', 'api-1', 'worker-1', 'api-3'],
  },
  {
    caption:
      'شرط دوم tier=backend اضافه می‌شود. شرط‌های داخل یک selector با AND ترکیب می‌شوند، پس web-1 که frontend است حذف می‌شود.',
    expression: 'env=prod,tier=backend',
    match: ['api-1', 'worker-1', 'api-3'],
  },
  {
    caption:
      'شرط سوم app=api اضافه می‌شود. حالا فقط دو Pod باقی می‌مانند: api-1 و api-3. worker-1 با اینکه prod و backend است، app متفاوتی دارد.',
    expression: 'env=prod,tier=backend,app=api',
    match: ['api-1', 'api-3'],
  },
  {
    caption:
      'قاعده مهم: selector فقط داخل همان namespace جست‌وجو می‌کند. اگر در namespace دیگری Podی با همین برچسب‌ها باشد، این Service یا Deployment آن را نمی‌بیند. برای انتخاب چند مقدار از یک کلید از عملگر in استفاده کنید: env in (prod,staging).',
    expression: 'env=prod,tier=backend,app=api  ·  namespace=shop',
    match: ['api-1', 'api-3'],
  },
]

const COL_X = [30, 160, 290, 420, 550]
const ROW_Y = 150

export function LabelSelectorExplainer() {
  const [step, setStep] = useState(0)
  const snapshot = SNAPSHOTS[step]
  const matched = new Set(snapshot.match)

  return (
    <ExplainerFrame
      title="یک label selector دقیقاً کدام Podها را انتخاب می‌کند؟"
      step={step}
      total={SNAPSHOTS.length}
      caption={snapshot.caption}
      onPrev={() => setStep((current) => Math.max(0, current - 1))}
      onNext={() => setStep((current) => Math.min(SNAPSHOTS.length - 1, current + 1))}
      onReset={() => setStep(0)}
      figureLabel="پنج Pod با برچسب‌های app، env و tier و نتیجه اعمال تدریجی یک selector"
      viewBox="0 0 680 300"
      minWidth={600}
      context={
        <span>
          namespace: shop · selector: <span className="text-primary-600 dark:text-primary-300">{snapshot.expression}</span>
        </span>
      }
      footnote="برچسب‌ها و ترتیب Podها ثابت‌اند تا نتیجه هر گام قابل مقایسه باشد؛ منطق همان AND شدن شرط‌های selector و محدود بودن آن به یک namespace است."
    >
      <text x={340} y={26} textAnchor="middle" fontSize={13} className="fill-slate-500 dark:fill-slate-400">
        Podهای namespace فروشگاه
      </text>

      {PODS.map((pod, index) => {
        const isMatch = matched.has(pod.id)
        const hasSelector = snapshot.match.length > 0
        const mark = isMatch ? 'ok' : hasSelector ? 'muted' : 'idle'
        const x = COL_X[index]

        return (
          <g
            key={pod.id}
            className="transition-opacity duration-500 motion-reduce:transition-none"
            opacity={isMatch || !hasSelector ? 1 : 0.55}
          >
            <rect x={x} y={ROW_Y} width={110} height={96} rx={8} strokeWidth={1.5} className={boxClass(mark)} />
            <text x={x + 55} y={ROW_Y + 22} textAnchor="middle" fontSize={12} fontWeight={700} className="fill-slate-900 dark:fill-slate-100">
              {pod.id}
            </text>
            <text x={x + 12} y={ROW_Y + 44} fontSize={10} className="fill-slate-600 font-mono dark:fill-slate-300">
              app={pod.app}
            </text>
            <text x={x + 12} y={ROW_Y + 60} fontSize={10} className="fill-slate-600 font-mono dark:fill-slate-300">
              env={pod.env}
            </text>
            <text x={x + 12} y={ROW_Y + 76} fontSize={10} className="fill-slate-600 font-mono dark:fill-slate-300">
              tier={pod.tier}
            </text>
            {isMatch ? (
              <text x={x + 55} y={ROW_Y + 90} textAnchor="middle" fontSize={9} className="fill-emerald-600 dark:fill-emerald-400">
                انتخاب شد
              </text>
            ) : null}
          </g>
        )
      })}

      <text x={340} y={282} textAnchor="middle" fontSize={11} className="fill-slate-500 dark:fill-slate-400">
        {snapshot.match.length > 0
          ? `${snapshot.match.length} Pod با selector هم‌خوان است`
          : 'هنوز هیچ Podی انتخاب نشده است'}
      </text>
    </ExplainerFrame>
  )
}
