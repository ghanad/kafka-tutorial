import type { LessonContent } from './types'
import { WhatIsKafkaContent } from './whatIsKafka'

export const lessonContents: Record<string, LessonContent> = {
  'what-is-kafka': {
    Content: WhatIsKafkaContent,
  },
}

export function getLessonContent(slug: string): LessonContent | undefined {
  return lessonContents[slug]
}
