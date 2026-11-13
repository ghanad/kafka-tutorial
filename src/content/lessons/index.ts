import type { LessonContent } from './types'
import { WhatIsKafkaContent } from './whatIsKafka'
import { KafkaUseCasesContent } from './kafkaUseCases'
import { KeyTermsContent } from './keyTerms'
import { DockerKraftSetupContent } from './dockerKraftSetup'
import { TopicsPartitionsContent } from './topicsPartitions'
import { LogSegmentsContent } from './logSegments'
import { RetentionCompactionContent } from './retentionCompaction'

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
  'docker-kraft-setup': {
    Content: DockerKraftSetupContent,
  },
  'topics-partitions': {
    Content: TopicsPartitionsContent,
  },
  'log-segments': {
    Content: LogSegmentsContent,
  },
  'retention-compaction': {
    Content: RetentionCompactionContent,
  },
}

export function getLessonContent(slug: string): LessonContent | undefined {
  return lessonContents[slug]
}
