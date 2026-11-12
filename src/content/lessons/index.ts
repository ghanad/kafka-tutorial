import type { LessonContent } from './types'
import { WhatIsKafkaContent } from './whatIsKafka'
import { whatIsKafkaQuiz } from './whatIsKafkaQuiz'

export const lessonContents: Record<string, LessonContent> = {
  'what-is-kafka': {
    Content: WhatIsKafkaContent,
    quiz: whatIsKafkaQuiz,
  },
}

export function getLessonContent(slug: string): LessonContent | undefined {
  return lessonContents[slug]
}
