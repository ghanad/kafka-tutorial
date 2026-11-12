import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/persianDigits'
import type { QuizQuestion } from '../../content/lessons/types'
import { getQuestionOptions } from '../../content/lessons/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'

interface QuizProps {
  lessonId: string
  questions: QuizQuestion[]
}

function scoreMessage(score: number): string {
  if (score === 100) return 'عالی! همه پاسخ‌ها درست بود.'
  if (score >= 75) return 'خیلی خوب بود؛ فقط چند نکته مانده است.'
  if (score >= 50) return 'پایه خوبی دارید، اما مرور این درس را از دست ندهید.'
  return 'بهتر است درس را یک بار دیگر بخوانید و بعد دوباره تلاش کنید.'
}

export function Quiz({ lessonId, questions }: QuizProps) {
  const shouldReduceMotion = useReducedMotion()
  const bestScore = useAppStore((state) => state.quizScores[lessonId] ?? 0)
  const setQuizScore = useAppStore((state) => state.setQuizScore)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)

  const total = questions.length
  const question = questions[currentIndex]
  const options = useMemo(
    () => (question ? getQuestionOptions(question) : []),
    [question],
  )

  if (total === 0) return null

  const isCorrect = selectedIndex !== null && selectedIndex === question.correctIndex
  const isLastQuestion = currentIndex === total - 1
  const finalScore = Math.round((correctCount / total) * 100)

  function handleReveal() {
    if (selectedIndex === null) return
    setRevealed(true)
    if (selectedIndex === question.correctIndex) {
      setCorrectCount((count) => count + 1)
    }
  }

  function handleNext() {
    if (!isLastQuestion) {
      setCurrentIndex((index) => index + 1)
      setSelectedIndex(null)
      setRevealed(false)
      return
    }

    setFinished(true)
    setQuizScore(lessonId, finalScore)
  }

  function handleRetry() {
    setCurrentIndex(0)
    setSelectedIndex(null)
    setRevealed(false)
    setCorrectCount(0)
    setFinished(false)
  }

  function scrollToLessonStart() {
    document.getElementById('lesson-content-start')?.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <section aria-labelledby="quiz-title" className="mt-10 scroll-mt-24" id="quiz">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-200">
              <CircleHelp className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="quiz-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                آزمون پایان درس
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {toPersianDigits(total)} سؤال کوتاه برای تثبیت مفاهیم
              </p>
            </div>
          </div>

          {bestScore > 0 && (
            <Badge variant="success">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              بهترین امتیاز: {toPersianDigits(bestScore)}٪
            </Badge>
          )}
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {finished ? (
            <div className="text-center">
              <span
                className={cn(
                  'mx-auto flex h-16 w-16 items-center justify-center rounded-full',
                  finalScore >= 75
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
                )}
              >
                <Trophy className="h-8 w-8" aria-hidden="true" />
              </span>

              <h3 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">
                امتیاز شما: {toPersianDigits(finalScore)}٪
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {scoreMessage(finalScore)}
              </p>

              <div className="mx-auto mt-5 max-w-sm">
                <ProgressBar
                  value={finalScore}
                  label="امتیاز آزمون"
                  showValue
                  className="justify-center"
                />
              </div>

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {toPersianDigits(correctCount)} پاسخ درست از {toPersianDigits(total)} سؤال
                {bestScore > 0 && (
                  <span>
                    {' '}
                    · بهترین امتیاز شما {toPersianDigits(bestScore)}٪ است
                  </span>
                )}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={handleRetry}
                  startIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                >
                  تلاش دوباره
                </Button>
                <Button
                  variant="outline"
                  onClick={scrollToLessonStart}
                  startIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                >
                  مرور درس
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  سؤال {toPersianDigits(currentIndex + 1)} از {toPersianDigits(total)}
                </span>
                <span className="flex items-center gap-1">
                  پاسخ درست: {toPersianDigits(correctCount)}
                </span>
              </div>
              <ProgressBar
                value={((currentIndex + (revealed ? 1 : 0)) / total) * 100}
                label="پیشرفت آزمون"
                className="mb-5"
              />

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={question.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-base font-bold leading-8 text-slate-900 dark:text-white">
                    {question.prompt}
                  </p>

                  <div
                    role="radiogroup"
                    aria-label={question.prompt}
                    className="mt-4 space-y-2.5"
                  >
                    {options.map((option, index) => {
                      const isSelected = selectedIndex === index
                      const showCorrect = revealed && index === question.correctIndex
                      const showWrong = revealed && isSelected && !isCorrect

                      return (
                        <label
                          key={option}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition-colors',
                            !revealed &&
                              isSelected &&
                              'border-primary-400 bg-primary-50/70 dark:border-primary-600 dark:bg-primary-950/40',
                            !revealed &&
                              !isSelected &&
                              'border-slate-200 hover:border-primary-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-primary-700 dark:hover:bg-slate-800/50',
                            showCorrect &&
                              'border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/40',
                            showWrong &&
                              'border-rose-300 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/40',
                            revealed && !showCorrect && !showWrong && 'opacity-70',
                          )}
                        >
                          <input
                            type="radio"
                            name={`quiz-${lessonId}-${question.id}`}
                            value={index}
                            checked={isSelected}
                            disabled={revealed}
                            onChange={() => setSelectedIndex(index)}
                            className="mt-1 h-4 w-4 shrink-0 accent-primary-600 dark:accent-primary-400"
                          />
                          <span className="min-w-0 flex-1 leading-7 text-slate-700 dark:text-slate-200">
                            {option}
                          </span>
                          {showCorrect && (
                            <CheckCircle2
                              className="mt-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                              aria-label="پاسخ درست"
                            />
                          )}
                          {showWrong && (
                            <XCircle
                              className="mt-1 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
                              aria-label="پاسخ نادرست"
                            />
                          )}
                        </label>
                      )
                    })}
                  </div>

                  {revealed && (
                    <div className="mt-4">
                      <Callout variant={isCorrect ? 'tip' : 'danger'}>
                        {question.explanation}
                      </Callout>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  پاسخ درست را انتخاب کنید و سپس بررسی کنید.
                </span>

                {revealed ? (
                  <Button
                    onClick={handleNext}
                    endIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                  >
                    {isLastQuestion ? 'پایان آزمون' : 'سؤال بعدی'}
                  </Button>
                ) : (
                  <Button onClick={handleReveal} disabled={selectedIndex === null}>
                    بررسی پاسخ
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
