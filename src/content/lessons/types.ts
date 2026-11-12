import type { ComponentType } from 'react'

export type QuizQuestionType = 'multiple-choice' | 'true-false'

export interface QuizQuestion {
  id: string
  type: QuizQuestionType
  prompt: string
  options?: string[]
  correctIndex: number
  explanation: string
}

export interface LessonContent {
  Content: ComponentType
  quiz: QuizQuestion[]
}

export const TRUE_FALSE_OPTIONS = ['درست', 'نادرست'] as const

export function getQuestionOptions(question: QuizQuestion): string[] {
  if (question.type === 'true-false') return [...TRUE_FALSE_OPTIONS]
  return question.options ?? []
}
