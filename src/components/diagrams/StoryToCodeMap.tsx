import { Sparkles } from 'lucide-react'
import { Ltr } from '../ui/Ltr'

interface MappingItem {
  storyEmoji: string
  storyTitle: string
  storyDesc: string
  kafkaTerm: string
  kafkaRole: string
}

const MAPPINGS: MappingItem[] = [
  {
    storyEmoji: '👦🏻✍️',
    storyTitle: 'علی (نویسنده یادداشت)',
    storyDesc: 'هر وقت اتفاقی می‌افتد، یک خط در دفترچه می‌نویسد و می‌رود.',
    kafkaTerm: 'Producer',
    kafkaRole: 'برنامه‌ای که داده و رویداد جدید تولید می‌کند (مثلاً ثبت سفارش).',
  },
  {
    storyEmoji: '📒✨',
    storyTitle: 'دفترچه جادویی کلاس',
    storyDesc: 'هیچ خطی در آن پاک نمی‌شود؛ فقط به انتهایش خط جدید اضافه می‌شود.',
    kafkaTerm: 'Topic / Partition Log',
    kafkaRole: 'جریان پایدار و مرتب از رویدادها که روی دیسک ذخیره می‌شود.',
  },
  {
    storyEmoji: '🔢',
    storyTitle: 'شماره هر خط دفترچه',
    storyDesc: 'خط شماره ۰، خط شماره ۱، خط شماره ۲ و همین‌طور تا آخر.',
    kafkaTerm: 'Offset',
    kafkaRole: 'شناسه عددی یکتا و ترتیبی برای هر پیام در یک پارتیشن.',
  },
  {
    storyEmoji: '🔖',
    storyTitle: 'نشانک رنگی هر دانش‌آموز',
    storyDesc: 'هر بچه کاغذ چسبانش را روی خطی می‌گذارد که تا آنجا خوانده است.',
    kafkaTerm: 'Consumer Offset',
    kafkaRole: 'جایگاهی که سرویس خواننده تا آنجا پیام‌ها را پردازش کرده است.',
  },
  {
    storyEmoji: '👧🏼👦🏽',
    storyTitle: 'بچه‌های کلاس (خواننده‌ها)',
    storyDesc: 'هرکس با سرعت خودش می‌خواند؛ یکی تند، یکی کند، یکی از اول.',
    kafkaTerm: 'Consumer / Consumer Group',
    kafkaRole: 'سرویس‌هایی که رویدادها را مستقل از هم دریافت و پردازش می‌کنند.',
  },
  {
    storyEmoji: '📚📚',
    storyTitle: 'چند دفترچه برای درس‌های مختلف',
    storyDesc: 'برای اینکه صف نشود، دفترچه را به چند بخش موازی تقسیم می‌کنیم.',
    kafkaTerm: 'Partition',
    kafkaRole: 'تقسیم بار داده بین چند کانال موازی برای افزایش توان و سرعت پردازش.',
  },
]

export function StoryToCodeMap() {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-primary-50/20 p-5 shadow-soft dark:border-slate-800 dark:from-slate-900/90 dark:via-slate-950 dark:to-primary-950/20">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
            واژه‌نامه تطبیقی: داستان کلاس در برابر اصطلاحات فنی Kafka
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            با یک نگاه ببینید هر شخصیت داستان در دنیای برنامه‌نویسی چه نام دارد:
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MAPPINGS.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90"
          >
            <div>
              {/* Story Header */}
              <div className="flex items-center gap-2">
                <span className="text-2xl">{item.storyEmoji}</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  {item.storyTitle}
                </span>
              </div>
              <p className="mt-2 text-[11.5px] leading-5 text-slate-600 dark:text-slate-400">
                {item.storyDesc}
              </p>
            </div>

            {/* Real World Technical match */}
            <div className="mt-3 rounded-lg border border-primary-100 bg-primary-50/60 p-2.5 dark:border-primary-900/50 dark:bg-primary-950/40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary-700 dark:text-primary-400">
                  در کافکا:
                </span>
                <span className="rounded bg-primary-600 px-1.5 py-0.5 text-[10px] font-black text-white dark:bg-primary-500">
                  <Ltr>{item.kafkaTerm}</Ltr>
                </span>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-4 text-primary-900 dark:text-primary-200">
                {item.kafkaRole}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
