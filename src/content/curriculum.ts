export type LessonStatus = 'published' | 'planned'

export interface LessonMeta {
  id: string
  slug: string
  title: string
  description: string
  readingTime: number
  sectionId: string
  status: LessonStatus
}

export interface CourseSection {
  id: string
  title: string
  description: string
  lessons: LessonMeta[]
}

export const sections: CourseSection[] = [
  {
    id: 'introduction',
    title: 'مقدمه و مفاهیم پایه',
    description:
      'Kafka چیست، چه مشکلی را حل می‌کند و مفاهیم بنیادی مانند Topic، Partition و Offset چگونه کنار هم قرار می‌گیرند.',
    lessons: [
      {
        id: 'what-is-kafka',
        slug: 'what-is-kafka',
        title: 'Kafka چیست و چه مشکلی را حل می‌کند؟',
        description:
          'کافکا را با داستان کلاس، تشبیه دفترچه جادویی، شبیه‌ساز زنده و شکل‌های متحرک مثل یک کودک ۸ ساله درک کنید.',
        readingTime: 6,
        sectionId: 'introduction',
        status: 'published',
      },
      {
        id: 'kafka-use-cases',
        slug: 'kafka-use-cases',
        title: 'کاربردهای واقعی Kafka',
        description:
          'از فروشگاه‌های آنلاین و تاکسی‌های اینترنتی تا کشف تقلب بانکی و CDC؛ کافکا کجا واقعاً معجزه می‌کند؟',
        readingTime: 6,
        sectionId: 'introduction',
        status: 'published',
      },
      {
        id: 'key-terms',
        slug: 'key-terms',
        title: 'مفاهیم کلیدی: Event، Topic، Partition و Offset',
        description:
          'کالبدشکافی پیام، نحوه توزیع کلیدها در پارتیشن‌ها و نقش حیاتی آفست‌ها به همراه شبیه‌ساز زنده.',
        readingTime: 7,
        sectionId: 'introduction',
        status: 'published',
      },
      {
        id: 'docker-kraft-setup',
        slug: 'docker-kraft-setup',
        title: 'نصب سریع با Docker Compose و KRaft',
        description:
          'راه‌اندازی خوشه‌کافکا در حالت مدرن KRaft بدون نیاز به ZooKeeper به همراه ترمینال تعاملی درون مرورگر.',
        readingTime: 8,
        sectionId: 'introduction',
        status: 'published',
      },
    ],
  },
  {
    id: 'architecture',
    title: 'معماری و درون Kafka',
    description:
      'ساختار Log، Segmentها، Retention، Brokerها، Controller و نحوه توزیع Leader و Follower.',
    lessons: [
      {
        id: 'topics-partitions',
        slug: 'topics-partitions',
        title: 'Topicها و Partitionها',
        description:
          'چرا Topic به Partition تقسیم می‌شود، مقیاس‌پذیری چگونه به دست می‌آید و ترتیب پیام‌ها کجا تضمین می‌شود.',
        readingTime: 10,
        sectionId: 'architecture',
        status: 'published',
      },
      {
        id: 'log-segments',
        slug: 'log-segments',
        title: 'Log و Segmentها در دیسک',
        description:
          'ساختار append-only، فایل‌های .log و .index و .timeindex و اینکه Kafka چگونه روی دیسک می‌نویسد.',
        readingTime: 9,
        sectionId: 'architecture',
        status: 'published',
      },
      {
        id: 'retention-compaction',
        slug: 'retention-compaction',
        title: 'Retention و Log Compaction',
        description:
          'حذف داده‌های قدیمی، تفاوت retention بر اساس زمان و اندازه، و نگه‌داشتن آخرین مقدار هر Key.',
        readingTime: 9,
        sectionId: 'architecture',
        status: 'published',
      },
      {
        id: 'brokers-controller-kraft',
        slug: 'brokers-controller-kraft',
        title: 'Brokerها، Controller و KRaft',
        description:
          'نقش Broker و Controller، تفاوت معماری KRaft با دوره ZooKeeper و انتخاب کنترلر در خوشه.',
        readingTime: 10,
        sectionId: 'architecture',
        status: 'planned',
      },
      {
        id: 'leader-follower',
        slug: 'leader-follower',
        title: 'Leader و Follower در هر Partition',
        description:
          'چرا هر Partition یک Leader دارد، Followerها چگونه همگام می‌شوند و خواندن از کجا انجام می‌شود.',
        readingTime: 8,
        sectionId: 'architecture',
        status: 'planned',
      },
    ],
  },
  {
    id: 'producer',
    title: 'Producer',
    description:
      'ارسال پیام، Partitioning، سطوح acks، Batching، فشرده‌سازی، Retry و Producerهای Idempotent.',
    lessons: [
      {
        id: 'producer-basics',
        slug: 'producer-basics',
        title: 'ارسال رکورد: Sync و Async',
        description:
          'مسیر یک رکورد از فراخوانی send تا رسیدن به Broker، تفاوت ارسال همگام و ناهمگام و نقش Callback.',
        readingTime: 9,
        sectionId: 'producer',
        status: 'planned',
      },
      {
        id: 'producer-partitioner',
        slug: 'producer-partitioner',
        title: 'Partitioner و نقش Key',
        description:
          'چگونه hash(key) و استراتژی‌های Round-Robin و Sticky تعیین می‌کنند پیام در کدام Partition بنشیند.',
        readingTime: 8,
        sectionId: 'producer',
        status: 'planned',
      },
      {
        id: 'producer-acks',
        slug: 'producer-acks',
        title: 'تنظیم acks و دوام پیام',
        description:
          'سه سطح acks=0، acks=1 و acks=all؛ چه چیزی قربانی می‌شود و چه زمانی هر کدام را انتخاب کنیم.',
        readingTime: 9,
        sectionId: 'producer',
        status: 'planned',
      },
      {
        id: 'producer-batching',
        slug: 'producer-batching',
        title: 'Batching و Compression',
        description:
          'اثر linger.ms، batch.size و compression.type بر توان عملیاتی، تأخیر و مصرف پهنای باند.',
        readingTime: 9,
        sectionId: 'producer',
        status: 'planned',
      },
      {
        id: 'producer-idempotence',
        slug: 'producer-idempotence',
        title: 'Retry، Idempotence و Exactly-Once',
        description:
          'چرا Retry ساده می‌تواند پیام تکراری بسازد و enable.idempotence چگونه دقیقاً یک‌بار نوشتن را تضمین می‌کند.',
        readingTime: 10,
        sectionId: 'producer',
        status: 'planned',
      },
      {
        id: 'producer-transactions',
        slug: 'producer-transactions',
        title: 'Transactionها در Producer',
        description:
          'نوشتن اتمیک روی چند Partition، read_committed، Transaction ID و مسیر رسیدن به exactly-once.',
        readingTime: 9,
        sectionId: 'producer',
        status: 'planned',
      },
    ],
  },
  {
    id: 'consumer',
    title: 'Consumer و Consumer Groups',
    description:
      'حلقه Poll، گروه‌های مصرف‌کننده، Rebalance، Offset، Semanticهای تحویل و مدیریت Lag.',
    lessons: [
      {
        id: 'consumer-poll-loop',
        slug: 'consumer-poll-loop',
        title: 'مدل Pull و حلقه Poll',
        description:
          'چرا Consumer خودش داده را Pull می‌کند، حلقه poll چگونه کار می‌کند و heartbeat چه نقشی دارد.',
        readingTime: 8,
        sectionId: 'consumer',
        status: 'planned',
      },
      {
        id: 'consumer-groups',
        slug: 'consumer-groups',
        title: 'Consumer Groupها و Rebalance',
        description:
          'چگونه Consumerها کار را بین خود تقسیم می‌کنند و وقتی عضوی اضافه یا حذف می‌شود چه اتفاقی می‌افتد.',
        readingTime: 10,
        sectionId: 'consumer',
        status: 'planned',
      },
      {
        id: 'consumer-offsets',
        slug: 'consumer-offsets',
        title: 'Offset، Commit و __consumer_offsets',
        description:
          'تفاوت position و committed offset، commit خودکار و دستی و اینکه Kafka پیشرفت گروه را کجا ذخیره می‌کند.',
        readingTime: 9,
        sectionId: 'consumer',
        status: 'planned',
      },
      {
        id: 'consumer-delivery-semantics',
        slug: 'consumer-delivery-semantics',
        title: 'Semanticهای تحویل: at-most-once تا exactly-once',
        description:
          'پیام ممکن است گم شود یا تکراری برسد؛ بسته به ترتیب پردازش و commit چه تضمینی داریم.',
        readingTime: 9,
        sectionId: 'consumer',
        status: 'planned',
      },
      {
        id: 'consumer-lag',
        slug: 'consumer-lag',
        title: 'Consumer Lag و مدیریت آن',
        description:
          'Lag چگونه اندازه‌گیری می‌شود، چه زمانی خطرناک است و چه راه‌هایی برای کاهش آن وجود دارد.',
        readingTime: 8,
        sectionId: 'consumer',
        status: 'planned',
      },
      {
        id: 'consumer-assignment',
        slug: 'consumer-assignment',
        title: 'استراتژی‌های تخصیص Partition',
        description:
          'Range، RoundRobin، Sticky و Cooperative Sticky؛ تفاوت‌ها، هزینه Rebalance و انتخاب درست.',
        readingTime: 9,
        sectionId: 'consumer',
        status: 'planned',
      },
    ],
  },
  {
    id: 'reliability',
    title: 'Replication و اطمینان‌پذیری',
    description:
      'Replication Factor، ISR، High Watermark، min.insync.replicas و سناریوهای از کار افتادن Broker.',
    lessons: [
      {
        id: 'replication-isr',
        slug: 'replication-isr',
        title: 'Replication Factor، ISR و High Watermark',
        description:
          'هر Partition روی چند Broker تکرار می‌شود، ISR چیست و High Watermark چرا برای Consumer مهم است.',
        readingTime: 10,
        sectionId: 'reliability',
        status: 'planned',
      },
      {
        id: 'min-insync-replicas',
        slug: 'min-insync-replicas',
        title: 'ترکیب min.insync.replicas و acks=all',
        description:
          'چگونه این دو تنظیم با هم تعیین می‌کنند چند Broker می‌تواند از کار بیفتد بدون از دست رفتن داده.',
        readingTime: 9,
        sectionId: 'reliability',
        status: 'planned',
      },
      {
        id: 'leader-election',
        slug: 'leader-election',
        title: 'Leader Election و Unclean Leader Election',
        description:
          'وقتی Leader از دست می‌رود چه کسی جای او را می‌گیرد و unclean election چه بهایی دارد.',
        readingTime: 9,
        sectionId: 'reliability',
        status: 'planned',
      },
      {
        id: 'failure-recovery',
        slug: 'failure-recovery',
        title: 'سناریوهای خرابی و بازیابی',
        description:
          'مرگ Broker، قطع شبکه، از دست رفتن دیسک و بازگشت گره؛ رفتار خوشه را مرحله‌به‌مرحله ببینید.',
        readingTime: 10,
        sectionId: 'reliability',
        status: 'planned',
      },
      {
        id: 'durability-design',
        slug: 'durability-design',
        title: 'طراحی برای دوام بالا',
        description:
          'ترکیب پیشنهادی RF، acks، min.insync.replicas و نظارت، برای سیستمی که داده را جدی می‌گیرد.',
        readingTime: 9,
        sectionId: 'reliability',
        status: 'planned',
      },
    ],
  },
  {
    id: 'practice',
    title: 'Kafka در عمل',
    description:
      'ابزارهای CLI، اجرای یک خوشه سه‌گانه KRaft با Docker Compose و مدیریت Topicها در محیط واقعی.',
    lessons: [
      {
        id: 'cli-tools',
        slug: 'cli-tools',
        title: 'ابزارهای خط فرمان Kafka',
        description:
          'kafka-topics.sh، kafka-console-producer.sh، kafka-console-consumer.sh و kafka-consumer-groups.sh در عمل.',
        readingTime: 10,
        sectionId: 'practice',
        status: 'planned',
      },
      {
        id: 'docker-three-node',
        slug: 'docker-three-node',
        title: 'خوشه سه‌گانه KRaft با Docker Compose',
        description:
          'یک فایل Docker Compose کامل برای سه Broker، سه Controller و ذخیره‌سازی پایدار.',
        readingTime: 9,
        sectionId: 'practice',
        status: 'planned',
      },
      {
        id: 'topic-management',
        slug: 'topic-management',
        title: 'مدیریت Topicها',
        description:
          'ساخت، توصیف، تغییر تعداد Partition و حذف Topic؛ همراه با نکات امنیتی و اثر هر تغییر.',
        readingTime: 9,
        sectionId: 'practice',
        status: 'planned',
      },
      {
        id: 'partition-reassignment',
        slug: 'partition-reassignment',
        title: 'Reassignment و Rebalance خوشه',
        description:
          'جابه‌جایی Partitionها بین Brokerها، فایل‌های reassignment و کاهش ریسک در خوشه زنده.',
        readingTime: 8,
        sectionId: 'practice',
        status: 'planned',
      },
      {
        id: 'kafka-ui-tools',
        slug: 'kafka-ui-tools',
        title: 'ابزارهای UI مانند Kafka UI و AKHQ',
        description:
          'چه زمانی رابط گرافیکی کمک می‌کند، چه چیزهایی را باید با احتیاط انجام داد و جایگزین‌های سبک.',
        readingTime: 7,
        sectionId: 'practice',
        status: 'planned',
      },
    ],
  },
  {
    id: 'ecosystem',
    title: 'اکوسیستم Kafka',
    description:
      'Kafka Connect، Schema Registry، Kafka Streams و طراحی جریان داده در معماری‌های مدرن.',
    lessons: [
      {
        id: 'kafka-connect',
        slug: 'kafka-connect',
        title: 'Kafka Connect',
        description:
          'Source و Sink Connector، Worker و Task، Converter، SMT و یک نمونه CDC با Debezium.',
        readingTime: 10,
        sectionId: 'ecosystem',
        status: 'planned',
      },
      {
        id: 'schema-registry',
        slug: 'schema-registry',
        title: 'Schema Registry',
        description:
          'Avro، Protobuf و JSON Schema؛ حالت‌های سازگاری backward، forward و full و مدیریت تغییر schema.',
        readingTime: 10,
        sectionId: 'ecosystem',
        status: 'planned',
      },
      {
        id: 'kafka-streams',
        slug: 'kafka-streams',
        title: 'Kafka Streams',
        description:
          'KStream، KTable، windowing و state store؛ و مقایسه Kafka Streams با Flink و ksqlDB.',
        readingTime: 10,
        sectionId: 'ecosystem',
        status: 'planned',
      },
    ],
  },
  {
    id: 'operations',
    title: 'امنیت، پایش و عملیات',
    description:
      'SSL/TLS، SASL، ACL، متریک‌های کلیدی، مانیتورینگ، عیب‌یابی و ارتقای خوشه.',
    lessons: [
      {
        id: 'security',
        slug: 'security',
        title: 'امنیت: SSL/TLS، SASL و ACL',
        description:
          'رمزنگاری ارتباط، احراز هویت با PLAIN، SCRAM و OAUTHBEARER و کنترل دسترسی به منابع.',
        readingTime: 11,
        sectionId: 'operations',
        status: 'planned',
      },
      {
        id: 'monitoring',
        slug: 'monitoring',
        title: 'مانیتورینگ و متریک‌های کلیدی',
        description:
          'JMX، متریک‌های UnderReplicatedPartitions و ActiveControllerCount، تأخیر درخواست‌ها و Consumer Lag.',
        readingTime: 10,
        sectionId: 'operations',
        status: 'planned',
      },
      {
        id: 'tuning-capacity',
        slug: 'tuning-capacity',
        title: 'Tuning و Capacity Planning',
        description:
          'پهنای باند دیسک، حافظه Page Cache، تعداد Partition و برآورد ظرفیت برای بار واقعی.',
        readingTime: 9,
        sectionId: 'operations',
        status: 'planned',
      },
      {
        id: 'troubleshooting',
        slug: 'troubleshooting',
        title: 'عیب‌یابی مشکلات رایج',
        description:
          'Rebalance مداوم، Lag بالا، پر شدن دیسک و توزیع نامتعادل Leader؛ از نشانه تا راه‌حل.',
        readingTime: 10,
        sectionId: 'operations',
        status: 'planned',
      },
      {
        id: 'upgrades-mirrormaker',
        slug: 'upgrades-mirrormaker',
        title: 'Rolling Upgrade و MirrorMaker 2',
        description:
          'ارتقای خوشه بدون قطعی و تکرار داده بین چند دیتاسنتر با MirrorMaker 2.',
        readingTime: 9,
        sectionId: 'operations',
        status: 'planned',
      },
    ],
  },
  {
    id: 'patterns',
    title: 'الگوها و جمع‌بندی',
    description:
      'Event Sourcing، CQRS، Outbox، Saga، طراحی Topic و مقایسه Kafka با گزینه‌های دیگر.',
    lessons: [
      {
        id: 'architecture-patterns',
        slug: 'architecture-patterns',
        title: 'الگوهای معماری با Kafka',
        description:
          'Event Sourcing، CQRS، Outbox، Saga، Dead Letter Queue و Retry Topic با مثال‌های عملی.',
        readingTime: 10,
        sectionId: 'patterns',
        status: 'planned',
      },
      {
        id: 'topic-design',
        slug: 'topic-design',
        title: 'طراحی Topic، Partition و Key',
        description:
          'قواعد نام‌گذاری، انتخاب تعداد Partition و Key مناسب برای ترتیب، مقیاس و نگهداری آسان.',
        readingTime: 9,
        sectionId: 'patterns',
        status: 'planned',
      },
      {
        id: 'kafka-vs-alternatives',
        slug: 'kafka-vs-alternatives',
        title: 'Kafka در برابر RabbitMQ، Pulsar و Redis Streams',
        description:
          'مقایسه مدل‌ها، نقاط قوت و ضعف و اینکه برای هر مسئله کدام گزینه منطقی‌تر است.',
        readingTime: 9,
        sectionId: 'patterns',
        status: 'planned',
      },
      {
        id: 'interview-questions',
        slug: 'interview-questions',
        title: 'سوالات پرتکرار مصاحبه Kafka',
        description:
          'پرسش‌های رایج مصاحبه‌های فنی همراه با پاسخ کوتاه و اشاره به درس مرتبط.',
        readingTime: 8,
        sectionId: 'patterns',
        status: 'planned',
      },
      {
        id: 'next-steps',
        slug: 'next-steps',
        title: 'گام‌های بعدی',
        description:
          'پس از این دوره چه بخوانیم، چه چیزی بسازیم و چگونه دانش Kafka را در پروژه واقعی به کار ببریم.',
        readingTime: 6,
        sectionId: 'patterns',
        status: 'planned',
      },
    ],
  },
]

export const allLessons: LessonMeta[] = sections.flatMap((section) => section.lessons)

export const publishedLessons: LessonMeta[] = allLessons.filter(
  (lesson) => lesson.status === 'published',
)

export function findLessonBySlug(slug: string): LessonMeta | undefined {
  return allLessons.find((lesson) => lesson.slug === slug)
}

export function findLessonById(id: string): LessonMeta | undefined {
  return allLessons.find((lesson) => lesson.id === id)
}

export function findSectionById(id: string): CourseSection | undefined {
  return sections.find((section) => section.id === id)
}

export function findSectionForLesson(lesson: LessonMeta): CourseSection | undefined {
  return findSectionById(lesson.sectionId)
}

export function areAllLessonsCompleted(completedLessons: string[]): boolean {
  if (publishedLessons.length === 0) return false
  const completed = new Set(completedLessons)
  return publishedLessons.every((lesson) => completed.has(lesson.id))
}
