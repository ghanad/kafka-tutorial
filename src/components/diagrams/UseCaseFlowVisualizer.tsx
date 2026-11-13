import { useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import {
  ShoppingCart,
  Car,
  ShieldAlert,
  Database,
  Sparkles,
  Activity,
  Layers,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { toPersianDigits } from '../../utils/persianDigits'

interface UseCaseData {
  id: string
  title: string
  icon: typeof ShoppingCart
  badge: string
  producer: { title: string; subtitle: string; icon: string }
  topic: { name: string; partitions: number; rate: string }
  consumers: { name: string; role: string; icon: string; speed: string }[]
  story: string
  whyKafka: string
}

const USE_CASES: UseCaseData[] = [
  {
    id: 'ecommerce',
    title: 'فروشگاه اینترنتی (سفارشات)',
    icon: ShoppingCart,
    badge: 'ارتباط میکروسرویس‌ها',
    producer: {
      title: 'سرویس سبد و تسویه‌حساب',
      subtitle: 'order-checkout-service',
      icon: '🛒',
    },
    topic: {
      name: 'orders.v1',
      partitions: 6,
      rate: '۵۰۰ سفارش در ثانیه در جشنواره',
    },
    consumers: [
      { name: 'سرویس انبارداری', role: 'کسر آنی موجودی از قفسه‌ها', icon: '📦', speed: 'آنی (زیر ۱۰ میلی‌ثانیه)' },
      { name: 'درگاه پرداخت و صدور فاکتور', role: 'ثبت سند مالی و ارتباط با بانک', icon: '💳', speed: 'آنی' },
      { name: 'سامانه اعلان و پیامک', role: 'ارسال SMS کد پیگیری به مشتری', icon: '📱', speed: 'ناهمگام (با تأخیر مجاز)' },
      { name: 'دریاچه داده تحلیلی (Data Lake)', role: 'هوش تجاری و پیشنهاد کالاهای مشابه', icon: '📊', speed: 'دسته‌ای (Batch)' },
    ],
    story:
      'در زمان تخفیف‌های بزرگ (مانند بلک‌فرایدی)، صدها هزار نفر همزمان خرید می‌کنند. اگر سرویس سفارش بخواهد مستقیم با پیامک یا انبار تماس بگیرد، سایت از دسترس خارج می‌شود. با کافکا، سفارش در میلی‌ثانیه ثبت می‌شود و بقیه سرویس‌ها سر فرصت کارشان را انجام می‌دهند.',
    whyKafka:
      'تحمل بار ناگهانی (بافر)، تضمین ثبت سفارش حتی در صورت قطعی پنل پیامک، و اضافه کردن آسان سرویس‌های جدید بدون تغییر در کدهای قدیمی.',
  },
  {
    id: 'rideshare',
    title: 'تاکسی اینترنتی (موقعیت مکانی)',
    icon: Car,
    badge: 'جریان داده زنده (Streaming)',
    producer: {
      title: 'اپلیکیشن رانندگان',
      subtitle: 'driver-gps-stream',
      icon: '🚗',
    },
    topic: {
      name: 'driver.locations.gps',
      partitions: 32,
      rate: '۱۵۰٬۰۰۰ پینگ موقعیت در هر ثانیه',
    },
    consumers: [
      { name: 'نقشه و نمایش به مسافران', role: 'دیدن خودروهای اطراف روی نقشه', icon: '🗺️', speed: 'زیر ۵۰ میلی‌ثانیه' },
      { name: 'سیستم قیمت‌گذاری پویا', role: 'محاسبه طرح ترافیک و شلوغی منطقه', icon: '📈', speed: 'تحلیل در لحظه' },
      { name: 'محاسبه کرایه و کیلومترشمار', role: 'محاسبه مسافت طی شده در سفر', icon: '⏱️', speed: 'در پایان هر قطعه سفر' },
      { name: 'مدل‌سازی ترافیک شهری', role: 'آموزش هوش مصنوعی برای تخمین زمان سفر', icon: '🧠', speed: 'خط لوله داده حجیم' },
    ],
    story:
      'صدها هزار راننده هر ۳ ثانیه مختصات جغرافیایی (GPS) خود را مخابره می‌کنند. این حجم عظیم از داده هرگز نباید در پایگاه‌داده معمولی مانند MySQL نوشته شود، چون دیتابیس قفل می‌شود. کافکا این اقیانوس داده را روی دیسک دریافت و بین پردازنده‌ها تقسیم می‌کند.',
    whyKafka:
      'توان پذیرش صدها هزار رکورد در ثانیه با تأخیر کمتر از چند میلی‌ثانیه و امکان توزیع بار روی ۳۲ پارتیشن موازی.',
  },
  {
    id: 'banking',
    title: 'سیستم بانکی (کشف تقلب و لاگ)',
    icon: ShieldAlert,
    badge: 'امنیت و قابلیت اطمینان بالا',
    producer: {
      title: 'سوئیچ کارت و خودپردازها',
      subtitle: 'card-payment-gateway',
      icon: '🏧',
    },
    topic: {
      name: 'banking.transactions.v2',
      partitions: 12,
      rate: '۵٬۰۰۰ تراکنش کارتخوان در ثانیه',
    },
    consumers: [
      { name: 'موتور آنی کشف تقلب (Fraud)', role: 'بررسی رفتارهای مشکوک (مثلاً خرید در دو شهر دور طی ۵ دقیقه)', icon: '🚨', speed: 'زیر ۵ میلی‌ثانیه' },
      { name: 'سیستم کسر مانده حساب (Core Banking)', role: 'کاهش موجودی و تراکنش اتمیک', icon: '🏦', speed: 'بسیار حساس و پایدار' },
      { name: 'سامانه اطلاع‌رسانی پیامکی', role: 'ارسال فوری پیامک برداشت', icon: '📩', speed: 'آنی' },
      { name: 'آرشیو قانونی بازرسی (Audit)', role: 'ذخیره مادام‌العمر برای گزارش‌های بانک مرکزی', icon: '📁', speed: 'پایدار و غیرقابل حذف' },
    ],
    story:
      'در تراکنش‌های بانکی، گم شدن حتی یک رکورد فاجعه است. کافکا با ضریب تکثیر (Replication) داده‌ها را روی ۳ سرور مختلف ذخیره می‌کند تا حتی اگر یک دیتاسنتر آتش بگیرد، سوابق تراکنش حفظ شوند.',
    whyKafka:
      'تضمین عدم از دست رفتن داده (Zero Data Loss با acks=all)، ترتیب دقیق رویدادهای هر کارت، و قابلیت بازپخش برای حسابرسی.',
  },
  {
    id: 'cdc',
    title: 'همگام‌سازی دیتابیس (CDC)',
    icon: Database,
    badge: 'یکپارچه‌سازی دیتابیس‌ها',
    producer: {
      title: 'کانکتور دیتابیس (Debezium)',
      subtitle: 'postgres-wal-cdc',
      icon: '🐘',
    },
    topic: {
      name: 'cdc.postgres.customers',
      partitions: 4,
      rate: 'تمام تغییرات جدول مشتریان (Insert/Update)',
    },
    consumers: [
      { name: 'موتور جستجوی Elasticsearch', role: 'به‌روزرسانی ایندکس جستجوی آنی سایت', icon: '🔍', speed: 'تقریباً آنی (Near Real-time)' },
      { name: 'حافظه موقت Redis Cache', role: 'باطل کردن کش داده‌های تغییر یافته', icon: '⚡', speed: 'آنی' },
      { name: 'انبار داده تحلیلی (BigQuery / ClickHouse)', role: 'همگام‌سازی داده‌ها برای داشبوردهای مدیریتی', icon: '📊', speed: 'دسته‌ای هر چند دقیقه' },
    ],
    story:
      'وقتی کاربر آدرس خود را در پروفایل تغییر می‌دهد، این تغییر باید همزمان در دیتابیس اصلی، موتور جستجوی سایت و کش Redis اعمال شود. کانکتورهای کافکا لاگ تراکنش پایگاه داده (WAL) را می‌خوانند و بدون اینکه به برنامه دست بزنید، تغییرات را به بقیه سیستم‌ها می‌رسانند.',
    whyKafka:
      'معماری Change Data Capture بدون ایجاد بار اضافی روی دیتابیس اصلی و جلوگیری از ناهماهنگی بین منابع داده مختلف.',
  },
]

export function UseCaseFlowVisualizer() {
  const [selectedId, setSelectedId] = useState<string>('ecommerce')
  const shouldReduceMotion = useReducedMotion()
  const showMotion = !shouldReduceMotion

  const current = USE_CASES.find((u) => u.id === selectedId) || USE_CASES[0]

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            نمایشگر تعاملی معماری در دنیای واقعی
          </span>
          <h3 className="m-0 text-lg font-extrabold text-slate-900 dark:text-white">
            کافکا در صنایع مختلف چطور جریان داده را مدیریت می‌کند؟
          </h3>
        </div>
        <Badge variant="primary">
          <Activity className="h-3 w-3 me-1" />
          ۴ سناریوی صنعتی
        </Badge>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {USE_CASES.map((uc) => {
          const Icon = uc.icon
          const isSelected = uc.id === selectedId
          return (
            <button
              key={uc.id}
              onClick={() => setSelectedId(uc.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20 dark:bg-primary-500'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{uc.title}</span>
            </button>
          )
        })}
      </div>

      {/* Active Scenario Canvas */}
      <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-primary-50/20 p-4 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-primary-950/20">
        {/* Animated Visual Flow SVG */}
        <div className="overflow-x-auto">
          <svg
            viewBox="0 0 720 280"
            className="min-w-[640px] w-full select-none"
            role="img"
            aria-label={`نمودار جریان داده در سناریوی ${current.title}`}
          >
            <defs>
              <marker
                id="flow-arrow"
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

            {/* Left Box: Producer */}
            <g transform="translate(20, 95)">
              <rect
                width="160"
                height="90"
                rx="14"
                className="fill-blue-50 stroke-blue-300 dark:fill-blue-950/70 dark:stroke-blue-700"
                strokeWidth="1.5"
              />
              <text x="80" y="32" textAnchor="middle" className="text-2xl">
                {current.producer.icon}
              </text>
              <text
                x="80"
                y="54"
                textAnchor="middle"
                className="fill-slate-900 text-[11px] font-black dark:fill-white"
              >
                {current.producer.title}
              </text>
              <text
                x="80"
                y="72"
                textAnchor="middle"
                className="fill-blue-700 font-mono text-[9px] dark:fill-blue-300"
              >
                {current.producer.subtitle}
              </text>
            </g>

            {/* Pipe Producer -> Kafka */}
            <path
              d="M 180 140 L 250 140"
              className="fill-none stroke-primary-400 dark:stroke-primary-600"
              strokeWidth="3"
              markerEnd="url(#flow-arrow)"
            />

            {/* Center Box: KAFKA TOPIC CLUSTER */}
            <g transform="translate(250, 40)">
              <rect
                width="190"
                height="200"
                rx="16"
                className="fill-amber-50/90 stroke-amber-400 shadow-sm dark:fill-slate-900 dark:stroke-amber-500"
                strokeWidth="2"
              />
              <text
                x="95"
                y="28"
                textAnchor="middle"
                className="fill-amber-950 text-[12px] font-black dark:fill-amber-100"
              >
                ⚡ خوشه‌کافکا (Topic)
              </text>
              <text
                x="95"
                y="46"
                textAnchor="middle"
                className="fill-amber-800 font-mono text-[10.5px] font-bold dark:fill-amber-300"
              >
                {current.topic.name}
              </text>

              {/* Partitions representation inside topic */}
              <g transform="translate(15, 60)">
                <rect
                  width="160"
                  height="34"
                  rx="6"
                  className="fill-white stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700"
                />
                <text
                  x="12"
                  y="21"
                  className="fill-primary-600 font-mono text-[10px] font-black dark:fill-primary-400"
                >
                  P-0
                </text>
                <text
                  x="45"
                  y="21"
                  className="fill-slate-600 text-[9px] dark:fill-slate-300"
                >
                  رویدادهای کلید A
                </text>
              </g>

              <g transform="translate(15, 102)">
                <rect
                  width="160"
                  height="34"
                  rx="6"
                  className="fill-white stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700"
                />
                <text
                  x="12"
                  y="21"
                  className="fill-primary-600 font-mono text-[10px] font-black dark:fill-primary-400"
                >
                  P-1
                </text>
                <text
                  x="45"
                  y="21"
                  className="fill-slate-600 text-[9px] dark:fill-slate-300"
                >
                  رویدادهای کلید B
                </text>
              </g>

              <g transform="translate(15, 144)">
                <rect
                  width="160"
                  height="34"
                  rx="6"
                  className="fill-white stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700"
                />
                <text
                  x="12"
                  y="21"
                  className="fill-primary-600 font-mono text-[10px] font-black dark:fill-primary-400"
                >
                  P-N
                </text>
                <text
                  x="45"
                  y="21"
                  className="fill-slate-600 text-[9px] dark:fill-slate-300"
                >
                  مجموع: {toPersianDigits(current.topic.partitions)} پارتیشن موازی
                </text>
              </g>

              <text
                x="95"
                y="190"
                textAnchor="middle"
                className="fill-slate-500 text-[8.5px] font-bold dark:fill-slate-400"
              >
                نرخ ورودی: {current.topic.rate}
              </text>
            </g>

            {/* Pipes from Kafka to 4 Consumers */}
            <path
              d="M 440 85 C 475 70, 485 55, 505 50"
              className="fill-none stroke-emerald-400 dark:stroke-emerald-600"
              strokeWidth="2"
              markerEnd="url(#flow-arrow)"
            />
            <path
              d="M 440 115 C 475 110, 485 105, 505 105"
              className="fill-none stroke-emerald-400 dark:stroke-emerald-600"
              strokeWidth="2"
              markerEnd="url(#flow-arrow)"
            />
            <path
              d="M 440 155 C 475 160, 485 165, 505 165"
              className="fill-none stroke-emerald-400 dark:stroke-emerald-600"
              strokeWidth="2"
              markerEnd="url(#flow-arrow)"
            />
            <path
              d="M 440 185 C 475 200, 485 220, 505 225"
              className="fill-none stroke-emerald-400 dark:stroke-emerald-600"
              strokeWidth="2"
              markerEnd="url(#flow-arrow)"
            />

            {/* Animated Dots flowing */}
            {showMotion && (
              <g>
                <circle r="4.5" className="fill-primary-500">
                  <animateMotion
                    dur="1.5s"
                    repeatCount="indefinite"
                    path="M 180 140 L 250 140"
                  />
                </circle>
                <circle r="3.5" className="fill-emerald-500">
                  <animateMotion
                    dur="1.6s"
                    begin="0.2s"
                    repeatCount="indefinite"
                    path="M 440 85 C 475 70, 485 55, 505 50"
                  />
                </circle>
                <circle r="3.5" className="fill-emerald-500">
                  <animateMotion
                    dur="1.8s"
                    begin="0.5s"
                    repeatCount="indefinite"
                    path="M 440 115 C 475 110, 485 105, 505 105"
                  />
                </circle>
                <circle r="3.5" className="fill-emerald-500">
                  <animateMotion
                    dur="2s"
                    begin="0.8s"
                    repeatCount="indefinite"
                    path="M 440 155 C 475 160, 485 165, 505 165"
                  />
                </circle>
                <circle r="3.5" className="fill-emerald-500">
                  <animateMotion
                    dur="2.2s"
                    begin="1.1s"
                    repeatCount="indefinite"
                    path="M 440 185 C 475 200, 485 220, 505 225"
                  />
                </circle>
              </g>
            )}

            {/* Right: Consumers */}
            {current.consumers.slice(0, 4).map((c, i) => {
              const yPos = 25 + i * 58
              return (
                <g key={c.name} transform={`translate(510, ${yPos})`}>
                  <rect
                    width="190"
                    height="50"
                    rx="10"
                    className="fill-emerald-50/80 stroke-emerald-300 dark:fill-emerald-950/60 dark:stroke-emerald-800"
                    strokeWidth="1.2"
                  />
                  <text x="22" y="26" className="text-base">
                    {c.icon}
                  </text>
                  <text
                    x="45"
                    y="22"
                    className="fill-slate-900 text-[10.5px] font-black dark:fill-white"
                  >
                    {c.name}
                  </text>
                  <text
                    x="45"
                    y="38"
                    className="fill-emerald-800 text-[9px] font-medium dark:fill-emerald-300"
                  >
                    {c.role} ({c.speed})
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Story & Technical Breakdown */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2 text-xs">
          <div className="rounded-xl border border-slate-200 bg-white p-4 leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-amber-500" />
              داستان این سناریو در واقعیت:
            </span>
            <p className="mt-2 leading-6">{current.story}</p>
          </div>

          <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4 leading-6 text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/30 dark:text-primary-100">
            <span className="flex items-center gap-1.5 font-black text-primary-900 dark:text-primary-300">
              <Layers className="h-4 w-4" />
              چرا در این سناریو کافکا بهترین انتخاب است؟
            </span>
            <p className="mt-2 leading-6">{current.whyKafka}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
