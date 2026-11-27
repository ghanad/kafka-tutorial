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
import { MinInsyncReplicasContent } from './minInsyncReplicas'
import { LeaderElectionContent } from './leaderElection'
import { FailureRecoveryContent } from './failureRecovery'
import { DurabilityDesignContent } from './durabilityDesign'
import { ConsumerLagContent } from './consumerLag'
import { ConsumerAssignmentContent } from './consumerAssignment'
import { CliToolsContent } from './cliTools'
import { DockerThreeNodeContent } from './dockerThreeNode'
import { TopicManagementContent } from './topicManagement'
import { PartitionReassignmentContent } from './partitionReassignment'
import { KafkaUiToolsContent } from './kafkaUiTools'
import { KafkaConnectContent } from './kafkaConnect'
import { SchemaRegistryContent } from './schemaRegistry'
import { KafkaStreamsContent } from './kafkaStreams'
import { SecurityContent } from './security'
import { MonitoringContent } from './monitoring'
import { TuningCapacityContent } from './tuningCapacity'
import { TroubleshootingContent } from './troubleshooting'
import { UpgradesMirrorMakerContent } from './upgradesMirrorMaker'
import { ArchitecturePatternsContent } from './architecturePatterns'
import { TopicDesignContent } from './topicDesign'
import { InterviewQuestionsContent } from './interviewQuestions'
import { NextStepsContent } from './nextSteps'

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
  'consumer-lag': {
    Content: ConsumerLagContent,
  },
  'consumer-assignment': {
    Content: ConsumerAssignmentContent,
  },
  'replication-isr': {
    Content: ReplicationIsrContent,
  },
  'min-insync-replicas': {
    Content: MinInsyncReplicasContent,
  },
  'leader-election': {
    Content: LeaderElectionContent,
  },
  'failure-recovery': {
    Content: FailureRecoveryContent,
  },
  'durability-design': {
    Content: DurabilityDesignContent,
  },
  'cli-tools': {
    Content: CliToolsContent,
  },
  'docker-three-node': {
    Content: DockerThreeNodeContent,
  },
  'topic-management': {
    Content: TopicManagementContent,
  },
  'partition-reassignment': {
    Content: PartitionReassignmentContent,
  },
  'kafka-ui-tools': {
    Content: KafkaUiToolsContent,
  },
  'kafka-connect': {
    Content: KafkaConnectContent,
  },
  'schema-registry': {
    Content: SchemaRegistryContent,
  },
  'kafka-streams': {
    Content: KafkaStreamsContent,
  },
  security: {
    Content: SecurityContent,
  },
  monitoring: {
    Content: MonitoringContent,
  },
  'tuning-capacity': {
    Content: TuningCapacityContent,
  },
  troubleshooting: {
    Content: TroubleshootingContent,
  },
  'upgrades-mirrormaker': {
    Content: UpgradesMirrorMakerContent,
  },
  'architecture-patterns': {
    Content: ArchitecturePatternsContent,
  },
  'topic-design': {
    Content: TopicDesignContent,
  },
  'interview-questions': {
    Content: InterviewQuestionsContent,
  },
  'next-steps': {
    Content: NextStepsContent,
  },
}

export function getLessonContent(slug: string): LessonContent | undefined {
  return lessonContents[slug]
}
