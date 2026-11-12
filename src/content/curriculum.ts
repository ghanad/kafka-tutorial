export interface LessonMeta {
  id: string
  slug: string
  title: string
  description: string
  readingTime: number
  sectionId: string
}

export interface CourseSection {
  id: string
  title: string
  description: string
  lessons: LessonMeta[]
}

const sampleLesson: LessonMeta = {
  id: 'sample-lesson',
  slug: 'sample-lesson',
  title: 'درس نمونه: آشنایی با Apache Kafka',
  description:
    'یک درس کوتاه برای آشنایی با ساختار سایت، اجزای رابط کاربری و ذخیره‌سازی پیشرفت در مرورگر.',
  readingTime: 3,
  sectionId: 'introduction',
}

export const sections: CourseSection[] = [
  {
    id: 'introduction',
    title: 'مقدمه و مفاهیم پایه',
    description:
      'Kafka چیست، چه مشکلی را حل می‌کند و مفاهیم بنیادی مانند Topic، Partition و Offset چگونه کنار هم قرار می‌گیرند.',
    lessons: [sampleLesson],
  },
  {
    id: 'architecture',
    title: 'معماری و درون Kafka',
    description:
      'ساختار Log، Segmentها، Retention، Brokerها، Controller و نحوه توزیع Leader و Follower.',
    lessons: [],
  },
  {
    id: 'producer',
    title: 'Producer',
    description:
      'ارسال پیام، Partitioning، سطوح acks، Batching، فشرده‌سازی، Retry و Producerهای Idempotent.',
    lessons: [],
  },
  {
    id: 'consumer',
    title: 'Consumer و Consumer Groups',
    description:
      'حلقه Poll، گروه‌های مصرف‌کننده، Rebalance، Offset، Semanticهای تحویل و مدیریت Lag.',
    lessons: [],
  },
  {
    id: 'reliability',
    title: 'Replication و اطمینان‌پذیری',
    description:
      'Replication Factor، ISR، High Watermark، min.insync.replicas و سناریوهای از کار افتادن Broker.',
    lessons: [],
  },
  {
    id: 'practice',
    title: 'Kafka در عمل',
    description:
      'ابزارهای CLI، اجرای یک خوشه سه‌گانه KRaft با Docker Compose و مدیریت Topicها در محیط واقعی.',
    lessons: [],
  },
  {
    id: 'ecosystem',
    title: 'اکوسیستم Kafka',
    description:
      'Kafka Connect، Schema Registry، Kafka Streams و طراحی جریان داده در معماری‌های مدرن.',
    lessons: [],
  },
  {
    id: 'operations',
    title: 'امنیت، پایش و عملیات',
    description:
      'SSL/TLS، SASL، ACL، متریک‌های کلیدی، مانیتورینگ، عیب‌یابی و ارتقای خوشه.',
    lessons: [],
  },
  {
    id: 'patterns',
    title: 'الگوها و جمع‌بندی',
    description:
      'Event Sourcing، CQRS، Outbox، Saga، طراحی Topic و مقایسه Kafka با گزینه‌های دیگر.',
    lessons: [],
  },
]

export const allLessons: LessonMeta[] = sections.flatMap((section) => section.lessons)

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
  if (allLessons.length === 0) return false
  const completed = new Set(completedLessons)
  return allLessons.every((lesson) => completed.has(lesson.id))
}
