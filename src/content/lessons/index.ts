import type { LessonContent } from './types'
import { WhatIsKafkaContent } from './whatIsKafka'
import { KafkaUseCasesContent } from './kafkaUseCases'
import { KeyTermsContent } from './keyTerms'

export const lessonContents: Record<string, LessonContent> = {
  'what-is-kafka': {
    Content: WhatIsKafkaContent,
  },
  'kafka-use-cases': {
    Content: KafkaUseCasesContent,
  },
  'key-terms': {
    Content: KeyTermsContent,
  },
}

export function getLessonContent(slug: string): LessonContent | undefined {
  return lessonContents[slug]
}
