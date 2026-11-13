import { useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Flame, BookOpen, Check, X } from 'lucide-react'
import { Button } from '../ui/Button'

export function QueueVsKafkaDiagram() {
  const [tab, setTab] = useState<'queue' | 'kafka'>('queue')
  const shouldReduceMotion = useReducedMotion()
  const showMotion = !shouldReduceMotion

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            تفاوت اصلی به زبان ساده
          </span>
          <h4 className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-white">
            {tab === 'queue'
              ? 'صف پیام سنتی: پیام پس از خوانده شدن دود می‌شود و می‌سوزد!'
              : 'کافکا: مثل دفترچه بادوام روی دیسک می‌ماند و چند نفر مستقل می‌خوانند'}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={tab === 'queue' ? 'primary' : 'outline'}
            onClick={() => setTab('queue')}
            startIcon={<Flame className="h-4 w-4 text-rose-500" />}
          >
            صف سنتی (Queue)
          </Button>
          <Button
            size="sm"
            variant={tab === 'kafka' ? 'primary' : 'outline'}
            onClick={() => setTab('kafka')}
            startIcon={<BookOpen className="h-4 w-4 text-emerald-500" />}
          >
            کافکا (Log دائمی)
          </Button>
        </div>
      </div>

      {/* Visual Animation Box */}
      <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/70">
        <svg
          viewBox="0 0 660 260"
          className="h-auto w-full select-none"
          role="img"
          aria-label={
            tab === 'queue'
              ? 'انیمیشن حذف پیام بعد از مصرف در صف سنتی'
              : 'انیمیشن نگهداری پیام و چند نشانک مستقل در کافکا'
          }
        >
          <defs>
            <marker
              id="arrow-anim"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" className="fill-primary-500" />
            </marker>
          </defs>

          {tab === 'queue' ? (
            /* TRADITIONAL QUEUE: CONSUME AND DESTROY */
            <g>
              {/* Producer */}
              <g transform="translate(30, 85)">
                <rect
                  width="110"
                  height="75"
                  rx="10"
                  className="fill-white stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-700"
                  strokeWidth="1.5"
                />
                <text x="55" y="32" textAnchor="middle" className="text-xl">
                  👦🏻
                </text>
                <text
                  x="55"
                  y="52"
                  textAnchor="middle"
                  className="fill-slate-800 text-[11px] font-extrabold dark:fill-slate-200"
                >
                  تولیدکننده
                </text>
              </g>

              {/* Connecting pipe */}
              <path
                d="M 140 122 L 210 122"
                className="fill-none stroke-slate-300 dark:stroke-slate-700"
                strokeWidth="2.5"
                markerEnd="url(#arrow-anim)"
              />

              {/* The Queue (Pipe) */}
              <g transform="translate(210, 60)">
                <rect
                  width="220"
                  height="125"
                  rx="12"
                  className="fill-rose-50/70 stroke-rose-300 dark:fill-rose-950/30 dark:stroke-rose-800"
                  strokeWidth="1.5"
                />
                <text
                  x="110"
                  y="28"
                  textAnchor="middle"
                  className="fill-rose-900 text-[11px] font-black dark:fill-rose-200"
                >
                  صف سنتی (Queue)
                </text>
                <text
                  x="110"
                  y="44"
                  textAnchor="middle"
                  className="fill-rose-600 text-[9px] dark:fill-rose-400"
                >
                  پیام خوانده شود = برای همیشه پاک می‌شود!
                </text>

                {/* Messages inside queue */}
                <g transform="translate(20, 60)">
                  <rect
                    width="70"
                    height="38"
                    rx="6"
                    className="fill-white stroke-rose-300 dark:fill-slate-900 dark:stroke-rose-700"
                  />
                  <text
                    x="35"
                    y="23"
                    textAnchor="middle"
                    className="fill-rose-700 text-[10px] font-bold dark:fill-rose-300"
                  >
                    پیام ۱
                  </text>
                </g>
                <g transform="translate(100, 60)">
                  <rect
                    width="70"
                    height="38"
                    rx="6"
                    className="fill-white stroke-rose-300 dark:fill-slate-900 dark:stroke-rose-700"
                  />
                  <text
                    x="35"
                    y="23"
                    textAnchor="middle"
                    className="fill-rose-700 text-[10px] font-bold dark:fill-rose-300"
                  >
                    پیام ۲
                  </text>
                </g>
              </g>

              {/* Connecting pipe to consumer */}
              <path
                d="M 430 122 L 490 122"
                className="fill-none stroke-rose-300 dark:stroke-rose-700"
                strokeWidth="2.5"
                markerEnd="url(#arrow-anim)"
              />

              {/* Consumer 1 consumes and message vanishes */}
              <g transform="translate(500, 85)">
                <rect
                  width="130"
                  height="75"
                  rx="10"
                  className="fill-rose-100/60 stroke-rose-400 dark:fill-rose-950/60 dark:stroke-rose-700"
                  strokeWidth="1.5"
                />
                <text x="65" y="30" textAnchor="middle" className="text-xl">
                  👧🏼🍽️
                </text>
                <text
                  x="65"
                  y="48"
                  textAnchor="middle"
                  className="fill-slate-900 text-[10.5px] font-black dark:fill-white"
                >
                  مصرف‌کننده اول
                </text>
                <text
                  x="65"
                  y="63"
                  textAnchor="middle"
                  className="fill-rose-700 text-[9px] font-bold dark:fill-rose-300"
                >
                  پیام را خورد و تمام شد!
                </text>
              </g>

              {/* Flying fire / smoke particle */}
              {showMotion && (
                <g>
                  <circle r="4" className="fill-rose-500">
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path="M 380 122 C 430 122, 460 122, 500 122"
                    />
                  </circle>
                  <text x="445" y="105" className="text-sm">
                    🔥
                  </text>
                </g>
              )}

              {/* Sad 2nd Consumer */}
              <g transform="translate(500, 185)">
                <rect
                  width="130"
                  height="50"
                  rx="8"
                  className="fill-slate-100 stroke-slate-300 stroke-dashed dark:fill-slate-800/60 dark:stroke-slate-700"
                  strokeWidth="1.2"
                />
                <text
                  x="65"
                  y="24"
                  textAnchor="middle"
                  className="fill-slate-600 text-[10px] font-bold dark:fill-slate-400"
                >
                  مصرف‌کننده دوم (تیم هوش مصنوعی)
                </text>
                <text
                  x="65"
                  y="40"
                  textAnchor="middle"
                  className="fill-rose-600 text-[9px] dark:fill-rose-400"
                >
                  ❌ پیامی نمانده که بخواند!
                </text>
              </g>
            </g>
          ) : (
            /* KAFKA: APPEND-ONLY PERSISTENT LOG */
            <g>
              {/* Producer */}
              <g transform="translate(30, 85)">
                <rect
                  width="110"
                  height="75"
                  rx="10"
                  className="fill-white stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-700"
                  strokeWidth="1.5"
                />
                <text x="55" y="32" textAnchor="middle" className="text-xl">
                  👦🏻
                </text>
                <text
                  x="55"
                  y="52"
                  textAnchor="middle"
                  className="fill-slate-800 text-[11px] font-extrabold dark:fill-slate-200"
                >
                  تولیدکننده
                </text>
              </g>

              {/* Connecting pipe */}
              <path
                d="M 140 122 L 205 122"
                className="fill-none stroke-emerald-400 dark:stroke-emerald-600"
                strokeWidth="2.5"
                markerEnd="url(#arrow-anim)"
              />

              {/* Kafka Log */}
              <g transform="translate(205, 45)">
                <rect
                  width="230"
                  height="165"
                  rx="12"
                  className="fill-emerald-50/70 stroke-emerald-300 dark:fill-emerald-950/30 dark:stroke-emerald-800"
                  strokeWidth="1.5"
                />
                <text
                  x="115"
                  y="26"
                  textAnchor="middle"
                  className="fill-emerald-900 text-[11px] font-black dark:fill-emerald-200"
                >
                  کافکا (Log بادوام و ماندگار)
                </text>
                <text
                  x="115"
                  y="40"
                  textAnchor="middle"
                  className="fill-emerald-700 text-[9px] dark:fill-emerald-400"
                >
                  پیام‌ها روی دیسک ذخیره و نگهداری می‌شوند
                </text>

                {/* Permanent Messages */}
                <g transform="translate(18, 55)">
                  <rect
                    width="194"
                    height="28"
                    rx="5"
                    className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700"
                  />
                  <text
                    x="15"
                    y="18"
                    className="fill-primary-600 text-[9.5px] font-extrabold dark:fill-primary-400"
                  >
                    #۰: رویداد سفارش
                  </text>
                  <text
                    x="180"
                    y="18"
                    textAnchor="end"
                    className="fill-emerald-600 text-[8.5px] font-bold"
                  >
                    🔖 خوانده شد ولی پاک نشد!
                  </text>
                </g>
                <g transform="translate(18, 88)">
                  <rect
                    width="194"
                    height="28"
                    rx="5"
                    className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700"
                  />
                  <text
                    x="15"
                    y="18"
                    className="fill-primary-600 text-[9.5px] font-extrabold dark:fill-primary-400"
                  >
                    #۱: رویداد پرداخت
                  </text>
                  <text
                    x="180"
                    y="18"
                    textAnchor="end"
                    className="fill-emerald-600 text-[8.5px] font-bold"
                  >
                    🔖 ذخیره پایدار
                  </text>
                </g>
                <g transform="translate(18, 121)">
                  <rect
                    width="194"
                    height="28"
                    rx="5"
                    className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700"
                  />
                  <text
                    x="15"
                    y="18"
                    className="fill-primary-600 text-[9.5px] font-extrabold dark:fill-primary-400"
                  >
                    #۲: رویداد ارسال
                  </text>
                  <text
                    x="180"
                    y="18"
                    textAnchor="end"
                    className="fill-emerald-600 text-[8.5px] font-bold"
                  >
                    🔖 ذخیره پایدار
                  </text>
                </g>
              </g>

              {/* Connecting pipes to multiple consumers */}
              <path
                d="M 435 95 L 495 75"
                className="fill-none stroke-emerald-400 dark:stroke-emerald-600"
                strokeWidth="2"
                markerEnd="url(#arrow-anim)"
              />
              <path
                d="M 435 155 L 495 175"
                className="fill-none stroke-emerald-400 dark:stroke-emerald-600"
                strokeWidth="2"
                markerEnd="url(#arrow-anim)"
              />

              {/* Consumer 1 */}
              <g transform="translate(500, 45)">
                <rect
                  width="130"
                  height="65"
                  rx="10"
                  className="fill-emerald-100/70 stroke-emerald-400 dark:fill-emerald-950/60 dark:stroke-emerald-700"
                  strokeWidth="1.5"
                />
                <text x="22" y="28" className="text-base">
                  👧🏼
                </text>
                <text
                  x="48"
                  y="26"
                  className="fill-slate-900 text-[10px] font-black dark:fill-white"
                >
                  سرویس انبار
                </text>
                <text
                  x="48"
                  y="45"
                  className="fill-emerald-700 text-[8.5px] font-bold dark:fill-emerald-300"
                >
                  نشانک روی خط ۲
                </text>
              </g>

              {/* Consumer 2: Reads independently without conflict */}
              <g transform="translate(500, 145)">
                <rect
                  width="130"
                  height="65"
                  rx="10"
                  className="fill-purple-100/70 stroke-purple-400 dark:fill-purple-950/60 dark:stroke-purple-700"
                  strokeWidth="1.5"
                />
                <text x="22" y="28" className="text-base">
                  🤖
                </text>
                <text
                  x="48"
                  y="26"
                  className="fill-slate-900 text-[10px] font-black dark:fill-white"
                >
                  تیم هوش مصنوعی
                </text>
                <text
                  x="48"
                  y="45"
                  className="fill-purple-700 text-[8.5px] font-bold dark:fill-purple-300"
                >
                  کل پیام‌ها را دوباره خواند!
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Comparison Fact Grid */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <X className="h-3 w-3" />
          </div>
          <div>
            <strong className="text-slate-900 dark:text-white">صف سنتی (Queue):</strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 leading-5">
              مثل خوراکی است؛ وقتی یکی از بچه‌ها آن را تحویل گرفت، پیام پاک می‌شود. خواننده دوم دیگر
              هیچ دسترسی به آن ندارد و امکان بازپخش تاریخچه وجود ندارد.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <Check className="h-3 w-3" />
          </div>
          <div>
            <strong className="text-slate-900 dark:text-white">کافکا (Append-only Log):</strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 leading-5">
              مثل یک کتابخانه یا دفترچه رسمی است؛ رویدادها نوشته می‌شوند و دست‌نخورده باقی می‌مانند.
              ۱۰ سرویس مختلف در زمان‌های مختلف می‌توانند بیایند و از روی آن بخوانند.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
