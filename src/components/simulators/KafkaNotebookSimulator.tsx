import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Send,
  RotateCcw,
  BookOpen,
  Bookmark,
  CheckCircle,
  Moon,
  Sun,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { toPersianDigits } from '../../utils/persianDigits'

interface LogMessage {
  offset: number
  text: string
  time: string
  color: string
}

const INITIAL_MESSAGES: LogMessage[] = [
  { offset: 0, text: 'سفارش یک جفت کفش ثبت شد', time: '۱۰:۰۰', color: 'border-blue-400 bg-blue-50/70 dark:bg-blue-950/40' },
  { offset: 1, text: 'پرداخت بانکی با موفقیت انجام شد', time: '۱۰:۰۱', color: 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40' },
  { offset: 2, text: 'بسته در انبار بسته‌بندی شد', time: '۱۰:۰۵', color: 'border-purple-400 bg-purple-50/70 dark:bg-purple-950/40' },
]

const QUICK_IDEAS = [
  'پیک بسته را برای ارسال تحویل گرفت',
  'بسته به شهر مقصد رسید',
  'بسته تحویل خریدار شد',
  'مشتری به خرید امتیاز داد',
]

export function KafkaNotebookSimulator() {
  const shouldReduceMotion = useReducedMotion()
  const [messages, setMessages] = useState<LogMessage[]>(INITIAL_MESSAGES)
  const [inputText, setInputText] = useState('')
  const [saraOffset, setSaraOffset] = useState<number>(2) // Sara is caught up to line 2
  const [rezaOffset, setRezaOffset] = useState<number>(1) // Reza is at line 1
  const [rezaSleeping, setRezaSleeping] = useState<boolean>(false)
  const [lastActionLog, setLastActionLog] = useState<string>(
    'دفترچه آماده است! یک پیام جدید بنویسید یا ببینید بچه‌ها چطور با نشانک‌هایشان می‌خوانند.'
  )

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText.trim()
    if (!text) return

    const newOffset = messages.length
    const now = new Date()
    const timeStr = `${toPersianDigits(now.getHours())}:${toPersianDigits(
      now.getMinutes().toString().padStart(2, '0')
    )}`

    const colors = [
      'border-blue-400 bg-blue-50/70 dark:bg-blue-950/40',
      'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40',
      'border-purple-400 bg-purple-50/70 dark:bg-purple-950/40',
      'border-amber-400 bg-amber-50/70 dark:bg-amber-950/40',
      'border-rose-400 bg-rose-50/70 dark:bg-rose-950/40',
    ]

    const newMsg: LogMessage = {
      offset: newOffset,
      text,
      time: timeStr,
      color: colors[newOffset % colors.length],
    }

    setMessages((prev) => [...prev, newMsg])
    setInputText('')
    setLastActionLog(
      `علی پیام شماره #${toPersianDigits(
        newOffset
      )} را به انتهای دفترچه اضافه کرد. هیچ داده‌ای پاک نمی‌شود!`
    )
  }

  // Sara reads next line
  const handleSaraRead = () => {
    if (saraOffset < messages.length - 1) {
      const next = saraOffset + 1
      setSaraOffset(next)
      setLastActionLog(
        `سارا خط #${toPersianDigits(next)} («${messages[next].text}») را خواند و نشانکش را جلو برد.`
      )
    } else {
      setLastActionLog('سارا همه خط‌های دفترچه را خوانده است و منتظر پیام جدید است!')
    }
  }

  // Reza reads next line (if awake)
  const handleRezaRead = () => {
    if (rezaSleeping) {
      setLastActionLog('رضا خواب است! ابتدا او را بیدار کنید تا بتواند بخواند.')
      return
    }
    if (rezaOffset < messages.length - 1) {
      const next = rezaOffset + 1
      setRezaOffset(next)
      setLastActionLog(
        `رضا خط #${toPersianDigits(next)} («${messages[next].text}») را خواند و نشانکش را جلو برد.`
      )
    } else {
      setLastActionLog('رضا به انتهای دفترچه رسیده است!')
    }
  }

  // Replay (Time Machine)
  const handleReplay = (reader: 'sara' | 'reza') => {
    if (reader === 'sara') {
      setSaraOffset(-1)
      setLastActionLog('ماشین زمان فعال شد! سارا نشانکش را به اول دفترچه برگرداند تا همه چیز را از اول بخواند.')
    } else {
      setRezaOffset(-1)
      setLastActionLog('ماشین زمان فعال شد! رضا نشانکش را به اول دفترچه برگرداند تا رویدادها را دوباره مرور کند.')
    }
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-primary-200 bg-white p-5 shadow-soft dark:border-primary-900/60 dark:bg-slate-900">
      {/* Simulator Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="m-0 text-lg font-black text-slate-900 dark:text-white">
              آزمایشگاه زنده: بازی با دفترچه جادویی کافکا
            </h3>
            <p className="m-0 text-xs text-slate-500 dark:text-slate-400">
              خودتان پیام بنویسید، نشانک‌ها را جابه‌جا کنید و ببینید هیچ چیز در کافکا پاک نمی‌شود!
            </p>
          </div>
        </div>

        <Badge variant="primary">تعاملی و زنده</Badge>
      </div>

      {/* Main 3-Column Interactive Layout */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left Column: Ali (Producer) */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👦🏻✍️</span>
              <div>
                <h4 className="text-sm font-black text-primary-950 dark:text-primary-100">
                  علی (تولیدکننده / Producer)
                </h4>
                <p className="text-[11px] text-primary-700 dark:text-primary-400">
                  فقط روی دفترچه می‌نویسد و اصلاً کاری به بچه‌ها ندارد!
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor="producer-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                متن پیام جدید برای نوشتن در دفترچه:
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="producer-input"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="مثلاً: سفارش جدید ثبت شد..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <Button
                  size="sm"
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim()}
                  startIcon={<Send className="h-3.5 w-3.5" />}
                >
                  بنویس
                </Button>
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="mt-3">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                ایده‌های آماده برای پیام بعدی:
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {QUICK_IDEAS.map((idea, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(idea)}
                    className="rounded-md border border-primary-200 bg-white px-2 py-1 text-[10px] font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-800 dark:bg-slate-800 dark:text-primary-300"
                  >
                    + {idea}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Micro Story helper */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
            💡 <strong>چرا این شگفت‌انگیز است؟</strong>
            <br />
            علی برای این که خبر بدهد، لازم نیست معطل باز شدن مغازه، بیدار شدن رضا یا حضور سارا شود.
            او پیام را در کافکا می‌نویسد و بلافاصله به کار بعدی خود می‌رسد.
          </div>
        </div>

        {/* Center Column: The Magical Notebook (The Log / Topic) */}
        <div className="lg:col-span-4">
          <div className="flex h-full flex-col rounded-xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/30 p-4 shadow-sm dark:border-amber-600/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950">
            {/* Notebook Ring Header */}
            <div className="flex items-center justify-between border-b border-amber-200 pb-2 dark:border-amber-900/50">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-black text-amber-950 dark:text-amber-200">
                  دفترچه جادویی (Kafka Log)
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                موضوع: سفارشات ({toPersianDigits(messages.length)} رویداد)
              </span>
            </div>

            {/* Notebook Pages / Lines List */}
            <div className="mt-3 flex-1 space-y-2 overflow-y-auto max-h-[380px] pe-1">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isSaraHere = saraOffset === msg.offset
                  const isRezaHere = rezaOffset === msg.offset

                  return (
                    <motion.div
                      key={msg.offset}
                      initial={shouldReduceMotion ? false : { opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`relative rounded-lg border-2 p-2.5 transition-all ${msg.color}`}
                    >
                      {/* Line Number / Offset Badge */}
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 rounded bg-slate-900/10 px-1.5 py-0.5 font-mono text-[11px] font-black text-slate-800 dark:bg-white/10 dark:text-slate-200">
                          خط #{toPersianDigits(msg.offset)}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {msg.time}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-bold leading-5 text-slate-800 dark:text-slate-100">
                        {msg.text}
                      </p>

                      {/* Attached Bookmarks (Offset Pointers) */}
                      <div className="mt-2 flex flex-wrap gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        {isSaraHere && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-xs">
                            <Bookmark className="h-2.5 w-2.5" />
                            نشانک سارا اینجاست
                          </span>
                        )}
                        {isRezaHere && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-xs">
                            <Bookmark className="h-2.5 w-2.5" />
                            نشانک رضا اینجاست
                          </span>
                        )}
                        {!isSaraHere && !isRezaHere && (
                          <span className="text-[9px] text-slate-400">بدون نشانک در حال حاضر</span>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            <div className="mt-3 border-t border-dashed border-amber-300 pt-2 text-center text-[10px] font-bold text-amber-800 dark:text-amber-400">
              📌 قانون طلایی: فقط به ته دفترچه اضافه می‌شود (Append-Only)
            </div>
          </div>
        </div>

        {/* Right Column: Consumers with Bookmarks */}
        <div className="space-y-4 lg:col-span-4">
          {/* Consumer 1: Sara */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👧🏼</span>
                <div>
                  <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-100">
                    سارا (سرویس انبار)
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    موقعیت نشانک: {saraOffset >= 0 ? `خط #${toPersianDigits(saraOffset)}` : 'ابتدای دفترچه'}
                  </span>
                </div>
              </div>
              <Badge variant="success">فعال</Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaraRead}
                disabled={saraOffset >= messages.length - 1}
                startIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                خواندن خط بعدی
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReplay('sara')}
                title="نشانک را به اول دفترچه برمی‌گرداند"
                startIcon={<RotateCcw className="h-3 w-3" />}
              >
                ماشین زمان (بازپخش)
              </Button>
            </div>
          </div>

          {/* Consumer 2: Reza (Can go to sleep/fail) */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/40 dark:bg-purple-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{rezaSleeping ? '😴' : '👦🏽'}</span>
                <div>
                  <h4 className="text-sm font-black text-purple-950 dark:text-purple-100">
                    رضا (سرویس پیامک)
                  </h4>
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400">
                    موقعیت نشانک: {rezaOffset >= 0 ? `خط #${toPersianDigits(rezaOffset)}` : 'ابتدای دفترچه'}
                  </span>
                </div>
              </div>
              <Badge variant={rezaSleeping ? 'danger' : 'neutral'}>
                {rezaSleeping ? 'خوابیده (قطعی سرویس)' : 'بیدار و آنلاین'}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={rezaSleeping ? 'outline' : 'secondary'}
                onClick={() => {
                  const newState = !rezaSleeping
                  setRezaSleeping(newState)
                  setLastActionLog(
                    newState
                      ? 'رضا به خواب رفت! (شبیه‌سازی خرابی سرور). پیام‌ها در کافکا امن می‌مانند.'
                      : 'رضا بیدار شد! او دقیقاً از نشانک قبلی خود شروع به خواندن می‌کند.'
                  )
                }}
                startIcon={
                  rezaSleeping ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5" />
                }
              >
                {rezaSleeping ? 'بیدار کردن رضا' : 'خواباندن رضا (قطعی)'}
              </Button>

              <Button
                size="sm"
                variant="primary"
                onClick={handleRezaRead}
                disabled={rezaSleeping || rezaOffset >= messages.length - 1}
                startIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                خواندن خط بعدی
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Event Log Banner */}
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50/60 p-3.5 text-xs text-primary-950 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-100">
        <CheckCircle className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
        <div className="flex-1">
          <span className="font-extrabold">رویداد زنده: </span>
          <span>{lastActionLog}</span>
        </div>
      </div>
    </div>
  )
}
