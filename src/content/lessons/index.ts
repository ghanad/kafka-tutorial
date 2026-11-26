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
import { ProducerBatchingContent } from './producerBatching'
import { ProducerIdempotenceContent } from './producerIdempotence'
import { ProducerTransactionsContent } from './producerTransactions'
import { KafkaVsAlternativesContent } from './kafkaVsAlternatives'
import { ConsumerPollLoopContent } from './consumerPollLoop'
import { ConsumerGroupsContent } from './consumerGroups'
import { ConsumerOffsetsContent } from './consumerOffsets'
import { ConsumerDeliverySemanticsContent } from './consumerDeliverySemantics'
import { ReplicationIsrContent } from './replicationIsr'

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
  'producer-batching': {
    Content: ProducerBatchingContent,
  },
  'producer-idempotence': {
    Content: ProducerIdempotenceContent,
  },
  'producer-transactions': {
    Content: ProducerTransactionsContent,
  },
  'kafka-vs-alternatives': {
    Content: KafkaVsAlternativesContent,
  },
  'consumer-poll-loop': {
    Content: ConsumerPollLoopContent,
  },
  'consumer-groups': {
    Content: ConsumerGroupsContent,
  },
  'consumer-offsets': {
    Content: ConsumerOffsetsContent,
  },
  'consumer-delivery-semantics': {
    Content: ConsumerDeliverySemanticsContent,
  },
  'replication-isr': {
    Content: ReplicationIsrContent,
  },
}

export function getLessonContent(slug: string): LessonContent | undefined {
  return lessonContents[slug]
}
