import type { LessonContent } from './types'
import { WhatIsKafkaContent } from './whatIsKafka'
import { KafkaUseCasesContent } from './kafkaUseCases'
import { KeyTermsContent } from './keyTerms'
import { DockerKraftSetupContent } from './dockerKraftSetup'
import { TopicsPartitionsContent } from './topicsPartitions'
import { LogSegmentsContent } from './logSegments'
import { RetentionCompactionContent } from './retentionCompaction'
import { BrokersControllerKraftContent } from './brokersControllerKraft'
import { LeaderFollowerContent } from './leaderFollower'
import { ProducerBasicsContent } from './producerBasics'
import { ProducerPartitionerContent } from './producerPartitioner'
import { ProducerAcksContent } from './producerAcks'
import { KafkaVsAlternativesContent } from './kafkaVsAlternatives'

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
  'brokers-controller-kraft': {
    Content: BrokersControllerKraftContent,
  },
  'leader-follower': {
    Content: LeaderFollowerContent,
  },
  'producer-basics': {
    Content: ProducerBasicsContent,
  },
  'producer-partitioner': {
    Content: ProducerPartitionerContent,
  },
  'producer-acks': {
    Content: ProducerAcksContent,
  },
  'kafka-vs-alternatives': {
    Content: KafkaVsAlternativesContent,
  },
}

export function getLessonContent(slug: string): LessonContent | undefined {
  return lessonContents[slug]
}
