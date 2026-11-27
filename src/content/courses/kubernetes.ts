import type { Course, CourseSectionInput } from './types'

const kubernetesSectionsInput: CourseSectionInput[] = [
  {
    id: 'k8s-basics',
    title: 'مفاهیم پایه Kubernetes',
    description:
      'Kubernetes چیست، چه مشکلی را حل می‌کند و اجزای یک کلاستر چگونه کنار هم قرار می‌گیرند.',
    lessons: [
      {
        id: 'k8s-what-is-kubernetes',
        slug: 'k8s-what-is-kubernetes',
        title: 'Kubernetes چیست و چه مشکلی را حل می‌کند؟',
        description:
          'از حالت مطلوب و حلقه reconciliation تا تفاوت control plane و node؛ با یک سناریوی واقعی و مثال‌های kubectl.',
        readingTime: 9,
        sectionId: 'k8s-basics',
        status: 'published',
      },
      {
        id: 'k8s-why-not-docker',
        slug: 'k8s-why-not-docker',
        title: 'چرا Docker کافی نیست؟',
        description:
          'تفاوت اجرای یک container با ادارهٔ صدها container روی چند سرور، و جایگاه orchestrator.',
        readingTime: 7,
        sectionId: 'k8s-basics',
        status: 'planned',
      },
      {
        id: 'k8s-cluster-anatomy',
        slug: 'k8s-cluster-anatomy',
        title: 'کالبدشکافی کلاستر: Control Plane و Node',
        description:
          'نقش API Server، etcd، Scheduler، Controller Manager و kubelet در یک کلاستر.',
        readingTime: 8,
        sectionId: 'k8s-basics',
        status: 'planned',
      },
    ],
  },
  {
    id: 'k8s-workloads',
    title: 'بارکاری و استقرار',
    description:
      'Pod، Deployment، Service و پیکربندی؛ واحدهای اصلی اجرای برنامه در Kubernetes.',
    lessons: [
      {
        id: 'k8s-pods',
        slug: 'k8s-pods',
        title: 'Pod: کوچک‌ترین واحد اجرا',
        description:
          'چرا Kubernetes به‌جای container از Pod استفاده می‌کند، چرخه عمر Pod و probeها چگونه کار می‌کنند.',
        readingTime: 9,
        sectionId: 'k8s-workloads',
        status: 'published',
      },
      {
        id: 'k8s-deployments',
        slug: 'k8s-deployments',
        title: 'Deployment و به‌روزرسانی بدون قطعی',
        description:
          'رابطه Deployment، ReplicaSet و Pod؛ rolling update، rollback و مقیاس‌پذیری با مثال عملی.',
        readingTime: 10,
        sectionId: 'k8s-workloads',
        status: 'published',
      },
      {
        id: 'k8s-services',
        slug: 'k8s-services',
        title: 'Service و دسترسی به برنامه‌ها',
        description:
          'ClusterIP، NodePort و LoadBalancer؛ چرا IP پادها پایدار نیست و Service چه کاری انجام می‌دهد.',
        readingTime: 9,
        sectionId: 'k8s-workloads',
        status: 'planned',
      },
      {
        id: 'k8s-configmaps-secrets',
        slug: 'k8s-configmaps-secrets',
        title: 'ConfigMap و Secret',
        description:
          'جداسازی پیکربندی از image، تزریق متغیر محیطی و محدودیت‌های امنیتی Secret.',
        readingTime: 8,
        sectionId: 'k8s-workloads',
        status: 'planned',
      },
    ],
  },
  {
    id: 'k8s-operations',
    title: 'عملیات و عیب‌یابی',
    description:
      'مقیاس‌پذیری، مشاهده‌پذیری و رفع مشکلات رایج کلاستر و بارکاری.',
    lessons: [
      {
        id: 'k8s-scaling',
        slug: 'k8s-scaling',
        title: 'مقیاس‌پذیری دستی و خودکار',
        description:
          'HorizontalPodAutoscaler، منابع درخواستی و محدودیت‌ها، و تفاوت scale کردن با بهینه‌سازی.',
        readingTime: 9,
        sectionId: 'k8s-operations',
        status: 'planned',
      },
      {
        id: 'k8s-observability',
        slug: 'k8s-observability',
        title: 'مشاهده‌پذیری: لاگ، متریک و رویداد',
        description:
          'kubectl logs، metrics-server، رویدادهای کلاستر و طراحی هشدار برای سرویس‌های حیاتی.',
        readingTime: 9,
        sectionId: 'k8s-operations',
        status: 'planned',
      },
      {
        id: 'k8s-troubleshooting',
        slug: 'k8s-troubleshooting',
        title: 'عیب‌یابی مشکلات رایج',
        description:
          'CrashLoopBackOff، ImagePullBackOff، Pending و OOMKilled؛ از نشانه تا راه‌حل.',
        readingTime: 10,
        sectionId: 'k8s-operations',
        status: 'planned',
      },
    ],
  },
]

export const kubernetesCourse: Course = {
  id: 'kubernetes',
  slug: 'kubernetes',
  title: 'آموزش عملی Kubernetes',
  shortTitle: 'Kubernetes',
  description:
    'از Pod و Deployment تا مقیاس‌پذیری و عیب‌یابی؛ یک مسیر عملی برای اجرای برنامه روی Kubernetes.',
  longDescription:
    'یک مسیر فارسی و تعاملی برای یادگیری Kubernetes از مفاهیم پایه تا استقرار، مقیاس‌پذیری و عیب‌یابی. تمرکز این دوره روی درک رفتار کلاستر و دستورهای واقعی kubectl است، نه حفظ کردن فهرست منابع.',
  level: 'از پایه تا عملیات',
  icon: 'kubernetes',
  sections: kubernetesSectionsInput.map((section) => ({
    ...section,
    lessons: section.lessons.map((lesson) => ({ ...lesson, courseId: 'kubernetes' })),
  })),
}
