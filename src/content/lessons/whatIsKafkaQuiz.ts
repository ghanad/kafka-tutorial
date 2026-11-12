import type { QuizQuestion } from './types'

export const whatIsKafkaQuiz: QuizQuestion[] = [
  {
    id: 'what-is-kafka-purpose',
    type: 'multiple-choice',
    prompt: 'هدف اصلی Kafka در یک سیستم نرم‌افزاری چیست؟',
    options: [
      'جایگزینی کامل پایگاه داده رابطه‌ای',
      'ذخیره و انتقال قابل اتکای جریان رویدادها',
      'مدیریت فایل‌های استاتیک وب‌سایت',
      'اجرای کوئری‌های تحلیلی پیچیده',
    ],
    correctIndex: 1,
    explanation:
      'Kafka برای ذخیره و انتقال جریان رویدادها طراحی شده است. پایگاه داده رابطه‌ای، سرور فایل و موتور کوئری تحلیلی کارهای دیگری هستند و Kafka جایگزین آن‌ها نیست.',
  },
  {
    id: 'what-is-kafka-order',
    type: 'true-false',
    prompt: 'Kafka ترتیب پیام‌ها را در کل یک Topic به‌صورت سراسری تضمین می‌کند.',
    correctIndex: 1,
    explanation:
      'ترتیب فقط درون هر Partition تضمین می‌شود. بین Partitionهای یک Topic ترتیب سراسری وجود ندارد.',
  },
  {
    id: 'what-is-kafka-key',
    type: 'multiple-choice',
    prompt: 'در حالت پیش‌فرض، Kafka با Key پیام چگونه Partition مقصد را انتخاب می‌کند؟',
    options: [
      'همیشه Partition اول را انتخاب می‌کند',
      'به‌صورت تصادفی بین همه Partitionها',
      'با هش Key و تقسیم بر تعداد Partitionها',
      'بر اساس اندازه Value پیام',
    ],
    correctIndex: 2,
    explanation:
      'Partitioner پیش‌فرض از hash(key) استفاده می‌کند و باقی‌مانده تقسیم بر تعداد Partitionها را به‌عنوان شماره Partition انتخاب می‌کند. به همین دلیل یک Key ثابت همیشه به یک Partition ثابت می‌رود.',
  },
  {
    id: 'what-is-kafka-consumers',
    type: 'true-false',
    prompt: 'در Kafka چند Consumer Group مستقل می‌توانند یک Topic را هم‌زمان بخوانند.',
    correctIndex: 0,
    explanation:
      'بله. هر Consumer Group Offset مستقل خودش را دارد؛ بنابراین چند گروه می‌توانند یک Topic را مستقل از هم و بدون تداخل بخوانند.',
  },
]
