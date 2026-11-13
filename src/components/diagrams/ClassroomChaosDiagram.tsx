import { useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Shuffle, Sparkles } from 'lucide-react'
import { Button } from '../ui/Button'

export function ClassroomChaosDiagram() {
  const [mode, setMode] = useState<'chaos' | 'kafka'>('chaos')
  const shouldReduceMotion = useReducedMotion()
  const showMotion = !shouldReduceMotion

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-soft dark:border-slate-800 dark:from-slate-900/90 dark:to-slate-950">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            تصویر متحرک مقایسه‌ای
          </span>
          <h4 className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-white">
            {mode === 'chaos'
              ? 'روش سنتی: تار عنکبوت و هرج‌ومرج در کلاس'
              : 'روش کافکا: آرامش و نظم با دفترچه جادویی مرکزی'}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={mode === 'chaos' ? 'primary' : 'outline'}
            onClick={() => setMode('chaos')}
            startIcon={<Shuffle className="h-4 w-4" />}
          >
            بدون کافکا (تار عنکبوت)
          </Button>
          <Button
            size="sm"
            variant={mode === 'kafka' ? 'primary' : 'outline'}
            onClick={() => setMode('kafka')}
            startIcon={<Sparkles className="h-4 w-4" />}
          >
            با کافکا (دفترچه جادویی)
          </Button>
        </div>
      </div>

      {/* SVG Diagram Canvas */}
      <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-200/70 bg-white p-3 dark:border-slate-800/80 dark:bg-slate-950/60">
        <svg
          viewBox="0 0 680 340"
          className="h-auto w-full select-none"
          role="img"
          aria-label={
            mode === 'chaos'
              ? 'نمودار اتصالات مستقیم و درهم‌تنیده بین سرویس‌ها'
              : 'نمودار اتصالات منظم سرویس‌ها به دفترچه مرکزی کافکا'
          }
        >
          <defs>
            <linearGradient id="grid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.03" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
            </linearGradient>
            <marker
              id="arrow-red"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" className="fill-rose-400 dark:fill-rose-500" />
            </marker>
            <marker
              id="arrow-green"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" className="fill-emerald-400 dark:fill-emerald-500" />
            </marker>
            <filter id="glow-kafka" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="680" height="340" rx="12" fill="url(#grid-grad)" />

          {mode === 'chaos' ? (
            /* CHAOS MODE: Spaghetti lines */
            <g>
              {/* Criss-cross wires */}
              <g
                className="fill-none stroke-rose-300 dark:stroke-rose-800/80"
                strokeWidth="2"
                strokeDasharray="4 4"
              >
                {/* Ali (120, 80) to others */}
                <path d="M 170 85 C 260 70, 360 70, 500 85" markerEnd="url(#arrow-red)" />
                <path d="M 160 115 C 230 180, 290 190, 480 250" markerEnd="url(#arrow-red)" />
                <path d="M 120 125 C 110 180, 130 200, 160 230" markerEnd="url(#arrow-red)" />

                {/* Reza (160, 260) to Sara (530, 85) */}
                <path d="M 220 260 C 320 230, 410 160, 490 105" markerEnd="url(#arrow-red)" />

                {/* Maryam (530, 260) to Sara (530, 85) */}
                <path d="M 540 220 C 545 180, 545 150, 540 120" markerEnd="url(#arrow-red)" />
                {/* Reza to Maryam */}
                <path d="M 230 270 C 320 280, 420 280, 480 270" markerEnd="url(#arrow-red)" />
              </g>

              {/* Animated chaos dots flying along lines */}
              {showMotion && (
                <g>
                  <circle r="4.5" className="fill-rose-500">
                    <animateMotion
                      dur="2.8s"
                      repeatCount="indefinite"
                      path="M 170 85 C 260 70, 360 70, 500 85"
                    />
                  </circle>
                  <circle r="4.5" className="fill-amber-500">
                    <animateMotion
                      dur="3.4s"
                      begin="0.5s"
                      repeatCount="indefinite"
                      path="M 160 115 C 230 180, 290 190, 480 250"
                    />
                  </circle>
                  <circle r="4" className="fill-rose-400">
                    <animateMotion
                      dur="2.5s"
                      begin="1.2s"
                      repeatCount="indefinite"
                      path="M 220 260 C 320 230, 410 160, 490 105"
                    />
                  </circle>
                  <circle r="4" className="fill-red-600">
                    <animateMotion
                      dur="3s"
                      begin="0.8s"
                      repeatCount="indefinite"
                      path="M 540 220 C 545 180, 545 150, 540 120"
                    />
                  </circle>
                </g>
              )}

              {/* Central Chaos warning sign */}
              <g transform="translate(300, 140)">
                <rect
                  x="-75"
                  y="-26"
                  width="150"
                  height="52"
                  rx="10"
                  className="fill-rose-50/95 stroke-rose-300 dark:fill-rose-950/80 dark:stroke-rose-800"
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="-4"
                  textAnchor="middle"
                  className="fill-rose-700 text-[12px] font-extrabold dark:fill-rose-300"
                >
                  ⚡ تار عنکبوت شکننده
                </text>
                <text
                  x="0"
                  y="14"
                  textAnchor="middle"
                  className="fill-rose-600 text-[9.5px] dark:fill-rose-400"
                >
                  اگر یک نفر قطع شود، بقیه می‌مانند!
                </text>
              </g>

              {/* Kids / Services Nodes */}
              {/* Node 1: Ali (Producer) */}
              <g transform="translate(60, 50)">
                <rect
                  width="120"
                  height="72"
                  rx="12"
                  className="fill-primary-50 stroke-primary-300 dark:fill-primary-950/70 dark:stroke-primary-700"
                  strokeWidth="1.5"
                />
                <text x="60" y="28" textAnchor="middle" className="text-xl">
                  👦🏻
                </text>
                <text
                  x="60"
                  y="46"
                  textAnchor="middle"
                  className="fill-slate-900 text-[11px] font-extrabold dark:fill-white"
                >
                  علی (ثبت سفارش)
                </text>
                <text
                  x="60"
                  y="60"
                  textAnchor="middle"
                  className="fill-primary-600 text-[9px] dark:fill-primary-400"
                >
                  خسته از خبر دادن به همه!
                </text>
              </g>

              {/* Node 2: Sara (Consumer) */}
              <g transform="translate(500, 50)">
                <rect
                  width="120"
                  height="72"
                  rx="12"
                  className="fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-700"
                  strokeWidth="1.5"
                />
                <text x="60" y="28" textAnchor="middle" className="text-xl">
                  👧🏼
                </text>
                <text
                  x="60"
                  y="46"
                  textAnchor="middle"
                  className="fill-slate-900 text-[11px] font-extrabold dark:fill-white"
                >
                  سارا (سرویس انبار)
                </text>
                <text
                  x="60"
                  y="60"
                  textAnchor="middle"
                  className="fill-rose-600 text-[9px] dark:fill-rose-400"
                >
                  امروز غایب است! (پیام سوخت)
                </text>
              </g>

              {/* Node 3: Reza (Consumer) */}
              <g transform="translate(110, 225)">
                <rect
                  width="120"
                  height="72"
                  rx="12"
                  className="fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-700"
                  strokeWidth="1.5"
                />
                <text x="60" y="28" textAnchor="middle" className="text-xl">
                  👦🏽
                </text>
                <text
                  x="60"
                  y="46"
                  textAnchor="middle"
                  className="fill-slate-900 text-[11px] font-extrabold dark:fill-white"
                >
                  رضا (ارسال پیامک)
                </text>
                <text
                  x="60"
                  y="60"
                  textAnchor="middle"
                  className="fill-amber-600 text-[9px] dark:fill-amber-400"
                >
                  سرعتش خیلی کم است!
                </text>
              </g>

              {/* Node 4: Maryam (Consumer) */}
              <g transform="translate(480, 225)">
                <rect
                  width="120"
                  height="72"
                  rx="12"
                  className="fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-700"
                  strokeWidth="1.5"
                />
                <text x="60" y="28" textAnchor="middle" className="text-xl">
                  👧🏻
                </text>
                <text
                  x="60"
                  y="46"
                  textAnchor="middle"
                  className="fill-slate-900 text-[11px] font-extrabold dark:fill-white"
                >
                  مریم (حسابداری)
                </text>
                <text
                  x="60"
                  y="60"
                  textAnchor="middle"
                  className="fill-slate-500 text-[9px] dark:fill-slate-400"
                >
                  نمی‌داند کدام پیام مال کیست!
                </text>
              </g>
            </g>
          ) : (
            /* KAFKA MODE: Central Notebook Log */
            <g>
              {/* Producer to Kafka pipe */}
              <path
                d="M 180 170 L 260 170"
                className="fill-none stroke-primary-400 dark:stroke-primary-500"
                strokeWidth="3"
                markerEnd="url(#arrow-green)"
              />

              {/* Kafka to Consumers pipes */}
              <path
                d="M 420 140 C 470 120, 480 95, 510 85"
                className="fill-none stroke-emerald-400 dark:stroke-emerald-500"
                strokeWidth="2.5"
                markerEnd="url(#arrow-green)"
              />
              <path
                d="M 420 170 L 510 170"
                className="fill-none stroke-emerald-400 dark:stroke-emerald-500"
                strokeWidth="2.5"
                markerEnd="url(#arrow-green)"
              />
              <path
                d="M 420 200 C 470 220, 480 245, 510 255"
                className="fill-none stroke-emerald-400 dark:stroke-emerald-500"
                strokeWidth="2.5"
                markerEnd="url(#arrow-green)"
              />

              {/* Animated smooth flowing message dots */}
              {showMotion && (
                <g>
                  {/* Ali to Kafka */}
                  <circle r="5" className="fill-primary-500">
                    <animateMotion
                      dur="1.5s"
                      repeatCount="indefinite"
                      path="M 180 170 L 260 170"
                    />
                  </circle>
                  {/* Kafka to Sara */}
                  <circle r="4.5" className="fill-emerald-500">
                    <animateMotion
                      dur="1.8s"
                      begin="0.2s"
                      repeatCount="indefinite"
                      path="M 420 140 C 470 120, 480 95, 510 85"
                    />
                  </circle>
                  {/* Kafka to Reza */}
                  <circle r="4.5" className="fill-emerald-500">
                    <animateMotion
                      dur="2.2s"
                      begin="0.7s"
                      repeatCount="indefinite"
                      path="M 420 170 L 510 170"
                    />
                  </circle>
                  {/* Kafka to Maryam */}
                  <circle r="4.5" className="fill-emerald-500">
                    <animateMotion
                      dur="2s"
                      begin="1.1s"
                      repeatCount="indefinite"
                      path="M 420 200 C 470 220, 480 245, 510 255"
                    />
                  </circle>
                </g>
              )}

              {/* Left: Ali Producer */}
              <g transform="translate(40, 125)">
                <rect
                  width="140"
                  height="90"
                  rx="14"
                  className="fill-primary-50 stroke-primary-400 dark:fill-primary-950/80 dark:stroke-primary-600"
                  strokeWidth="2"
                />
                <text x="70" y="32" textAnchor="middle" className="text-2xl">
                  👦🏻✍️
                </text>
                <text
                  x="70"
                  y="54"
                  textAnchor="middle"
                  className="fill-slate-900 text-[12px] font-extrabold dark:fill-white"
                >
                  علی (تولیدکننده)
                </text>
                <text
                  x="70"
                  y="72"
                  textAnchor="middle"
                  className="fill-primary-700 text-[10px] font-bold dark:fill-primary-300"
                >
                  فقط روی دفترچه می‌نویسد!
                </text>
              </g>

              {/* Center: THE MAGIC KAFKA NOTEBOOK */}
              <g transform="translate(265, 45)">
                <rect
                  width="155"
                  height="250"
                  rx="16"
                  className="fill-amber-50 stroke-amber-400 shadow-md dark:fill-slate-900 dark:stroke-amber-500"
                  strokeWidth="2"
                />
                {/* Notebook spine / rings */}
                <g className="fill-amber-300 dark:fill-amber-600">
                  <circle cx="12" cy="40" r="5" />
                  <circle cx="12" cy="90" r="5" />
                  <circle cx="12" cy="140" r="5" />
                  <circle cx="12" cy="190" r="5" />
                </g>

                <text
                  x="85"
                  y="30"
                  textAnchor="middle"
                  className="fill-amber-900 text-[12px] font-extrabold dark:fill-amber-200"
                >
                  📒 دفترچه جادویی
                </text>
                <text
                  x="85"
                  y="46"
                  textAnchor="middle"
                  className="fill-amber-700 text-[10px] font-bold dark:fill-amber-400"
                >
                  Apache Kafka (لاگ)
                </text>

                {/* Numbered Log Lines */}
                <g transform="translate(28, 60)">
                  <rect
                    width="115"
                    height="32"
                    rx="6"
                    className="fill-white stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700"
                  />
                  <text
                    x="10"
                    y="20"
                    className="fill-primary-600 text-[10px] font-extrabold dark:fill-primary-400"
                  >
                    #۰
                  </text>
                  <text
                    x="30"
                    y="20"
                    className="fill-slate-700 text-[9px] font-medium dark:fill-slate-200"
                  >
                    سفارش ثبت شد
                  </text>
                </g>

                <g transform="translate(28, 100)">
                  <rect
                    width="115"
                    height="32"
                    rx="6"
                    className="fill-white stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700"
                  />
                  <text
                    x="10"
                    y="20"
                    className="fill-primary-600 text-[10px] font-extrabold dark:fill-primary-400"
                  >
                    #۱
                  </text>
                  <text
                    x="30"
                    y="20"
                    className="fill-slate-700 text-[9px] font-medium dark:fill-slate-200"
                  >
                    پرداخت تایید شد
                  </text>
                </g>

                <g transform="translate(28, 140)">
                  <rect
                    width="115"
                    height="32"
                    rx="6"
                    className="fill-white stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700"
                  />
                  <text
                    x="10"
                    y="20"
                    className="fill-primary-600 text-[10px] font-extrabold dark:fill-primary-400"
                  >
                    #۲
                  </text>
                  <text
                    x="30"
                    y="20"
                    className="fill-slate-700 text-[9px] font-medium dark:fill-slate-200"
                  >
                    بسته بندی شد
                  </text>
                </g>

                <g transform="translate(28, 180)">
                  <rect
                    width="115"
                    height="32"
                    rx="6"
                    strokeDasharray="3 3"
                    className="fill-primary-50/50 stroke-primary-300 dark:fill-primary-950/40 dark:stroke-primary-700"
                  />
                  <text
                    x="10"
                    y="20"
                    className="fill-primary-500 text-[10px] font-extrabold dark:fill-primary-400"
                  >
                    #۳
                  </text>
                  <text
                    x="32"
                    y="20"
                    className="fill-primary-600 text-[9px] font-bold dark:fill-primary-300"
                  >
                    + خط جدید...
                  </text>
                </g>

                <text
                  x="85"
                  y="235"
                  textAnchor="middle"
                  className="fill-slate-500 text-[8.5px] font-bold dark:fill-slate-400"
                >
                  ⚡ ضدآب و دائمی (روی دیسک)
                </text>
              </g>

              {/* Right: Consumers with bookmarks */}
              {/* Sara */}
              <g transform="translate(515, 50)">
                <rect
                  width="135"
                  height="65"
                  rx="12"
                  className="fill-emerald-50 stroke-emerald-300 dark:fill-emerald-950/70 dark:stroke-emerald-700"
                  strokeWidth="1.5"
                />
                <text x="24" y="28" className="text-lg">
                  👧🏼
                </text>
                <text
                  x="50"
                  y="26"
                  className="fill-slate-900 text-[11px] font-extrabold dark:fill-white"
                >
                  سارا (انبار)
                </text>
                <text
                  x="50"
                  y="46"
                  className="fill-emerald-700 text-[9.5px] font-bold dark:fill-emerald-300"
                >
                  🔖 نشانک: خط ۲
                </text>
              </g>

              {/* Reza */}
              <g transform="translate(515, 137)">
                <rect
                  width="135"
                  height="65"
                  rx="12"
                  className="fill-emerald-50 stroke-emerald-300 dark:fill-emerald-950/70 dark:stroke-emerald-700"
                  strokeWidth="1.5"
                />
                <text x="24" y="28" className="text-lg">
                  👦🏽
                </text>
                <text
                  x="50"
                  y="26"
                  className="fill-slate-900 text-[11px] font-extrabold dark:fill-white"
                >
                  رضا (پیامک)
                </text>
                <text
                  x="50"
                  y="46"
                  className="fill-emerald-700 text-[9.5px] font-bold dark:fill-emerald-300"
                >
                  🔖 نشانک: خط ۱
                </text>
              </g>

              {/* Maryam */}
              <g transform="translate(515, 224)">
                <rect
                  width="135"
                  height="65"
                  rx="12"
                  className="fill-emerald-50 stroke-emerald-300 dark:fill-emerald-950/70 dark:stroke-emerald-700"
                  strokeWidth="1.5"
                />
                <text x="24" y="28" className="text-lg">
                  👧🏻
                </text>
                <text
                  x="50"
                  y="26"
                  className="fill-slate-900 text-[11px] font-extrabold dark:fill-white"
                >
                  مریم (گزارشات)
                </text>
                <text
                  x="50"
                  y="46"
                  className="fill-emerald-700 text-[9.5px] font-bold dark:fill-emerald-300"
                >
                  🔖 نشانک: خط ۰
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Explanatory banner */}
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-100 p-3 text-xs leading-6 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
        {mode === 'chaos' ? (
          <>
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
            <span>
              <strong>دردسر سیستم‌های قدیمی:</strong> علی برای گفتن یک خبر ساده، باید خودش به تک‌تک
              میزها برود. اگر سارا بیمار و غایب باشد، خبر گم می‌شود! اگر رضا سرش شلوغ باشد، علی پشت
              میز او معطل می‌ماند.
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <span>
              <strong>معجزه کافکا:</strong> علی فقط در دفترچه می‌نویسد و به کارش می‌رسد. هر کدام از
              بچه‌ها نشانک شخصی خودشان را دارند؛ حتی اگر سارا ۲ روز غایب باشد، هر وقت برگردد از خط ۲
              ادامه می‌دهد!
            </span>
          </>
        )}
      </div>
    </div>
  )
}
