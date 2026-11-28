import { lazy } from 'react'
import type { ComponentType } from 'react'
import type { LessonContent } from './types'

function lazyLesson<T extends Record<string, unknown>>(
  loader: () => Promise<T>,
  exportName: keyof T & string,
): ComponentType {
  return lazy(() =>
    loader().then((module) => ({ default: module[exportName] as ComponentType })),
  ) as unknown as ComponentType
}

export const lessonContents: Record<string, LessonContent> = {
  'what-is-kafka': {
    Content: lazyLesson(() => import('./whatIsKafka'), 'WhatIsKafkaContent'),
  },
  'kafka-use-cases': {
    Content: lazyLesson(() => import('./kafkaUseCases'), 'KafkaUseCasesContent'),
  },
  'key-terms': {
    Content: lazyLesson(() => import('./keyTerms'), 'KeyTermsContent'),
  },
  'docker-kraft-setup': {
    Content: lazyLesson(() => import('./dockerKraftSetup'), 'DockerKraftSetupContent'),
  },
  'topics-partitions': {
    Content: lazyLesson(() => import('./topicsPartitions'), 'TopicsPartitionsContent'),
  },
  'log-segments': {
    Content: lazyLesson(() => import('./logSegments'), 'LogSegmentsContent'),
  },
  'retention-compaction': {
    Content: lazyLesson(
      () => import('./retentionCompaction'),
      'RetentionCompactionContent',
    ),
  },
  'brokers-controller-kraft': {
    Content: lazyLesson(
      () => import('./brokersControllerKraft'),
      'BrokersControllerKraftContent',
    ),
  },
  'leader-follower': {
    Content: lazyLesson(() => import('./leaderFollower'), 'LeaderFollowerContent'),
  },
  'producer-basics': {
    Content: lazyLesson(() => import('./producerBasics'), 'ProducerBasicsContent'),
  },
  'producer-partitioner': {
    Content: lazyLesson(
      () => import('./producerPartitioner'),
      'ProducerPartitionerContent',
    ),
  },
  'producer-acks': {
    Content: lazyLesson(() => import('./producerAcks'), 'ProducerAcksContent'),
  },
  'producer-batching': {
    Content: lazyLesson(() => import('./producerBatching'), 'ProducerBatchingContent'),
  },
  'producer-idempotence': {
    Content: lazyLesson(
      () => import('./producerIdempotence'),
      'ProducerIdempotenceContent',
    ),
  },
  'producer-transactions': {
    Content: lazyLesson(
      () => import('./producerTransactions'),
      'ProducerTransactionsContent',
    ),
  },
  'kafka-vs-alternatives': {
    Content: lazyLesson(
      () => import('./kafkaVsAlternatives'),
      'KafkaVsAlternativesContent',
    ),
  },
  'consumer-poll-loop': {
    Content: lazyLesson(() => import('./consumerPollLoop'), 'ConsumerPollLoopContent'),
  },
  'consumer-groups': {
    Content: lazyLesson(() => import('./consumerGroups'), 'ConsumerGroupsContent'),
  },
  'consumer-offsets': {
    Content: lazyLesson(() => import('./consumerOffsets'), 'ConsumerOffsetsContent'),
  },
  'consumer-delivery-semantics': {
    Content: lazyLesson(
      () => import('./consumerDeliverySemantics'),
      'ConsumerDeliverySemanticsContent',
    ),
  },
  'consumer-lag': {
    Content: lazyLesson(() => import('./consumerLag'), 'ConsumerLagContent'),
  },
  'consumer-assignment': {
    Content: lazyLesson(
      () => import('./consumerAssignment'),
      'ConsumerAssignmentContent',
    ),
  },
  'replication-isr': {
    Content: lazyLesson(() => import('./replicationIsr'), 'ReplicationIsrContent'),
  },
  'min-insync-replicas': {
    Content: lazyLesson(
      () => import('./minInsyncReplicas'),
      'MinInsyncReplicasContent',
    ),
  },
  'leader-election': {
    Content: lazyLesson(() => import('./leaderElection'), 'LeaderElectionContent'),
  },
  'failure-recovery': {
    Content: lazyLesson(() => import('./failureRecovery'), 'FailureRecoveryContent'),
  },
  'durability-design': {
    Content: lazyLesson(() => import('./durabilityDesign'), 'DurabilityDesignContent'),
  },
  'cli-tools': {
    Content: lazyLesson(() => import('./cliTools'), 'CliToolsContent'),
  },
  'docker-three-node': {
    Content: lazyLesson(() => import('./dockerThreeNode'), 'DockerThreeNodeContent'),
  },
  'topic-management': {
    Content: lazyLesson(() => import('./topicManagement'), 'TopicManagementContent'),
  },
  'partition-reassignment': {
    Content: lazyLesson(
      () => import('./partitionReassignment'),
      'PartitionReassignmentContent',
    ),
  },
  'kafka-ui-tools': {
    Content: lazyLesson(() => import('./kafkaUiTools'), 'KafkaUiToolsContent'),
  },
  'kafka-connect': {
    Content: lazyLesson(() => import('./kafkaConnect'), 'KafkaConnectContent'),
  },
  'schema-registry': {
    Content: lazyLesson(() => import('./schemaRegistry'), 'SchemaRegistryContent'),
  },
  'kafka-streams': {
    Content: lazyLesson(() => import('./kafkaStreams'), 'KafkaStreamsContent'),
  },
  security: {
    Content: lazyLesson(() => import('./security'), 'SecurityContent'),
  },
  monitoring: {
    Content: lazyLesson(() => import('./monitoring'), 'MonitoringContent'),
  },
  'tuning-capacity': {
    Content: lazyLesson(() => import('./tuningCapacity'), 'TuningCapacityContent'),
  },
  troubleshooting: {
    Content: lazyLesson(() => import('./troubleshooting'), 'TroubleshootingContent'),
  },
  'upgrades-mirrormaker': {
    Content: lazyLesson(
      () => import('./upgradesMirrorMaker'),
      'UpgradesMirrorMakerContent',
    ),
  },
  'architecture-patterns': {
    Content: lazyLesson(
      () => import('./architecturePatterns'),
      'ArchitecturePatternsContent',
    ),
  },
  'topic-design': {
    Content: lazyLesson(() => import('./topicDesign'), 'TopicDesignContent'),
  },
  'interview-questions': {
    Content: lazyLesson(
      () => import('./interviewQuestions'),
      'InterviewQuestionsContent',
    ),
  },
  'next-steps': {
    Content: lazyLesson(() => import('./nextSteps'), 'NextStepsContent'),
  },
  'k8s-what-is-kubernetes': {
    Content: lazyLesson(() => import('./kubernetesIntro'), 'KubernetesIntroContent'),
  },
  'k8s-cluster-anatomy': {
    Content: lazyLesson(
      () => import('./kubernetesClusterAnatomy'),
      'KubernetesClusterAnatomyContent',
    ),
  },
  'k8s-request-path': {
    Content: lazyLesson(
      () => import('./kubernetesRequestPath'),
      'KubernetesRequestPathContent',
    ),
  },
  'k8s-kubectl-yaml': {
    Content: lazyLesson(
      () => import('./kubernetesKubectlYaml'),
      'KubernetesKubectlYamlContent',
    ),
  },
  'k8s-pods': {
    Content: lazyLesson(() => import('./kubernetesPods'), 'KubernetesPodsContent'),
  },
  'k8s-deployments': {
    Content: lazyLesson(
      () => import('./kubernetesDeployments'),
      'KubernetesDeploymentsContent',
    ),
  },
  'cilium-architecture': {
    Content: lazyLesson(
      () => import('./ciliumArchitecture'),
      'CiliumArchitectureContent',
    ),
  },
  'cilium-ebpf-basics': {
    Content: lazyLesson(
      () => import('./ciliumEbpfBasics'),
      'CiliumEbpfBasicsContent',
    ),
  },
  'cilium-packet-path': {
    Content: lazyLesson(
      () => import('./ciliumPacketPath'),
      'CiliumPacketPathContent',
    ),
  },
  'cilium-ipam-routing': {
    Content: lazyLesson(
      () => import('./ciliumIpamRouting'),
      'CiliumIpamRoutingContent',
    ),
  },
  'cilium-kube-proxy-replacement': {
    Content: lazyLesson(
      () => import('./ciliumKubeProxyReplacement'),
      'CiliumKubeProxyReplacementContent',
    ),
  },
  'cilium-network-policy': {
    Content: lazyLesson(
      () => import('./ciliumNetworkPolicy'),
      'CiliumNetworkPolicyContent',
    ),
  },
  'cilium-encryption': {
    Content: lazyLesson(
      () => import('./ciliumEncryption'),
      'CiliumEncryptionContent',
    ),
  },
  'cilium-tetragon': {
    Content: lazyLesson(() => import('./ciliumTetragon'), 'CiliumTetragonContent'),
  },
  'cilium-hubble': {
    Content: lazyLesson(() => import('./ciliumHubble'), 'CiliumHubbleContent'),
  },
  'cilium-bgp-lb': {
    Content: lazyLesson(() => import('./ciliumBgpLb'), 'CiliumBgpLbContent'),
  },
  'cilium-gateway-api': {
    Content: lazyLesson(
      () => import('./ciliumGatewayApi'),
      'CiliumGatewayApiContent',
    ),
  },
  'cilium-service-mesh': {
    Content: lazyLesson(
      () => import('./ciliumServiceMesh'),
      'CiliumServiceMeshContent',
    ),
  },
  'cilium-clustermesh': {
    Content: lazyLesson(
      () => import('./ciliumClustermesh'),
      'CiliumClustermeshContent',
    ),
  },
  'cilium-troubleshooting': {
    Content: lazyLesson(
      () => import('./ciliumTroubleshooting'),
      'CiliumTroubleshootingContent',
    ),
  },
}

export function getLessonContent(slug: string): LessonContent | undefined {
  return lessonContents[slug]
}
