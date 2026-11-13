import { Minus, Plus, RotateCcw, Check } from 'lucide-react'
import { useTypography } from '../../hooks/useTypography'
import type { FontFamily, FontSize, LineHeight } from '../../store/useAppStore'
import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/persianDigits'
import { Button } from './Button'

interface FontOption {
  id: FontFamily
  title: string
  subtitle: string
  fontClass: string
}

const fontFamilies: FontOption[] = [
  {
    id: 'vazirmatn',
    title: 'وزیرمتن',
    subtitle: 'قلم استاندارد و مدرن وب فارسی',
    fontClass: 'font-family-vazirmatn',
  },
  {
    id: 'vazirmatn-ui',
    title: 'وزیرمتن رابط کاربری',
    subtitle: 'طراحی بهینه‌شده برای نمایشگرها',
    fontClass: 'font-family-vazirmatn-ui',
  },
  {
    id: 'system',
    title: 'سیستمی (تاهوما)',
    subtitle: 'قلم پیش‌فرض سیستم‌عامل و خوانایی آشنا',
    fontClass: 'font-family-system',
  },
  {
    id: 'serif',
    title: 'کتابی و سنتی',
    subtitle: 'قلم نسخ سنتی مناسب مقالات طولانی',
    fontClass: 'font-family-serif',
  },
]

interface SizeOption {
  id: FontSize
  label: string
  pixel: number
}

const fontSizes: SizeOption[] = [
  { id: 'sm', label: 'کوچک', pixel: 14 },
  { id: 'md', label: 'متوسط', pixel: 16 },
  { id: 'lg', label: 'بزرگ', pixel: 18 },
  { id: 'xl', label: 'خیلی بزرگ', pixel: 20 },
]

interface LineHeightOption {
  id: LineHeight
  label: string
  desc: string
}

const lineHeights: LineHeightOption[] = [
  { id: 'compact', label: 'فشرده', desc: 'سطرهای نزدیک‌تر' },
  { id: 'normal', label: 'استاندارد', desc: 'فاصله بهینه پیش‌فرض' },
  { id: 'relaxed', label: 'باز', desc: 'فاصله سطر بازتر و خواناتر' },
]

interface FontSettingsPanelProps {
  className?: string
  showPreview?: boolean
}

export function FontSettingsPanel({
  className,
  showPreview = true,
}: FontSettingsPanelProps) {
  const {
    fontSize,
    fontFamily,
    lineHeight,
    setFontSize,
    setFontFamily,
    setLineHeight,
    stepFontSize,
    resetFontSettings,
  } = useTypography()

  const currentSizeIndex = fontSizes.findIndex((s) => s.id === fontSize)
  const isDefault =
    fontSize === 'md' && fontFamily === 'vazirmatn' && lineHeight === 'normal'

  return (
    <div className={cn('space-y-6', className)}>
      {/* Font Size */}
      <section aria-labelledby="font-size-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3
            id="font-size-title"
            className="text-sm font-bold text-slate-900 dark:text-white"
          >
            اندازه قلم متن
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentSizeIndex === 0}
              onClick={() => stepFontSize('decrease')}
              aria-label="کوچک‌تر کردن اندازه قلم"
              title="کوچک‌تر کردن اندازه قلم"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="min-w-16 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
              {toPersianDigits(fontSizes[currentSizeIndex]?.pixel ?? 16)} پیکسل
            </span>
            <button
              type="button"
              disabled={currentSizeIndex === fontSizes.length - 1}
              onClick={() => stepFontSize('increase')}
              aria-label="بزرگ‌تر کردن اندازه قلم"
              title="بزرگ‌تر کردن اندازه قلم"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {fontSizes.map((size) => {
            const active = fontSize === size.id
            return (
              <button
                key={size.id}
                type="button"
                onClick={() => setFontSize(size.id)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border py-2.5 px-1 transition-all',
                  active
                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-400 dark:bg-primary-950/60 dark:text-primary-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/60',
                )}
              >
                <span className="text-xs font-bold">{size.label}</span>
                <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {toPersianDigits(size.pixel)}px
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Font Family */}
      <section aria-labelledby="font-family-title" className="space-y-3">
        <h3
          id="font-family-title"
          className="text-sm font-bold text-slate-900 dark:text-white"
        >
          نوع قلم (فونت)
        </h3>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {fontFamilies.map((font) => {
            const active = fontFamily === font.id
            return (
              <button
                key={font.id}
                type="button"
                onClick={() => setFontFamily(font.id)}
                className={cn(
                  'flex items-start justify-between rounded-xl border p-3 text-start transition-all',
                  active
                    ? 'border-primary-500 bg-primary-50/80 ring-1 ring-primary-500/50 dark:border-primary-400 dark:bg-primary-950/50 dark:ring-primary-400/50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-sm font-bold text-slate-900 dark:text-white',
                      font.fontClass,
                    )}
                  >
                    {font.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    {font.subtitle}
                  </span>
                </div>
                {active && (
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Line Height */}
      <section aria-labelledby="line-height-title" className="space-y-3">
        <h3
          id="line-height-title"
          className="text-sm font-bold text-slate-900 dark:text-white"
        >
          فاصله خطوط (ارتفاع سطر)
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {lineHeights.map((item) => {
            const active = lineHeight === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLineHeight(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border py-2.5 px-2 text-center transition-all',
                  active
                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-400 dark:bg-primary-950/60 dark:text-primary-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/60',
                )}
              >
                <span className="text-xs font-bold">{item.label}</span>
                <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {item.desc}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Live Preview */}
      {showPreview && (
        <section aria-labelledby="font-preview-title" className="space-y-2">
          <h4
            id="font-preview-title"
            className="text-xs font-semibold text-slate-500 dark:text-slate-400"
          >
            پیش‌نمایش زنده قلم و چیدمان
          </h4>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="lesson-prose !space-y-0 text-slate-800 dark:text-slate-200">
              آپاچی کافکا یک بستر توزیع‌شده برای ثبت رویدادها است که جریان‌های
              داده را به‌صورت بلادرنگ، با تحمل خطای بالا و توان عملیاتی فوق‌العاده پردازش
              می‌کند.
            </p>
          </div>
        </section>
      )}

      {/* Reset */}
      <div className="flex items-center justify-between border-t border-slate-200/80 pt-4 dark:border-slate-800">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          تنظیمات به‌طور خودکار در حافظه مرورگر ذخیره می‌شوند.
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isDefault}
          onClick={resetFontSettings}
          startIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          بازنشانی به پیش‌فرض
        </Button>
      </div>
    </div>
  )
}
