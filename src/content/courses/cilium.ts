import type { Course, CourseSectionInput } from './types'

const ciliumSectionsInput: CourseSectionInput[] = [
  {
    id: 'cilium-foundations',
    title: 'مبانی و معماری',
    description:
      'اجزای اصلی Cilium چگونه کنار هم قرار می‌گیرند و eBPF چه چیزی را ممکن می‌کند.',
    lessons: [
      {
        id: 'cilium-architecture',
        slug: 'cilium-architecture',
        title: 'معماری Cilium: Agent، Operator، Envoy و Hubble',
        description:
          'نقش هر جزء در کلاستر، نحوه هماهنگی آن‌ها با Kubernetes و مسیر رسیدن یک تغییر از API Server تا datapath.',
        readingTime: 12,
        sectionId: 'cilium-foundations',
        status: 'published',
      },
      {
        id: 'cilium-ebpf-basics',
        slug: 'cilium-ebpf-basics',
        title: 'eBPF از پایه: چیست، چطور کار می‌کند، چرا سریع است',
        description:
          'eBPF چیست، برنامه‌ها چگونه در هسته بارگذاری و verified می‌شوند و چرا اجتناب از عبور از فضای کاربر سرعت را بالا می‌برد.',
        readingTime: 12,
        sectionId: 'cilium-foundations',
        status: 'published',
      },
    ],
  },
  {
    id: 'cilium-networking',
    title: 'Datapath و شبکه',
    description:
      'مسیر بسته در Cilium، تخصیص IP، حالت‌های Routing و جایگزینی kube-proxy.',
    lessons: [
      {
        id: 'cilium-packet-path',
        slug: 'cilium-packet-path',
        title: 'مسیر یک بسته در Cilium: datapath، endpointها و امنیت مبتنی بر identity',
        description:
          'یک بسته از ورود به interface تا رسیدن به Pod چه گام‌هایی را طی می‌کند و identity چگونه در datapath اعمال می‌شود.',
        readingTime: 11,
        sectionId: 'cilium-networking',
        status: 'published',
      },
      {
        id: 'cilium-ipam-routing',
        slug: 'cilium-ipam-routing',
        title: 'IPAM و حالت‌های Routing: Overlay با VXLAN/Geneve در برابر Native Routing',
        description:
          'تخصیص IP به endpointها و انتخاب میان overlay و native routing با توجه به توپولوژی شبکه و کارایی.',
        readingTime: 11,
        sectionId: 'cilium-networking',
        status: 'published',
      },
      {
        id: 'cilium-kube-proxy-replacement',
        slug: 'cilium-kube-proxy-replacement',
        title: 'جایگزینی کامل kube-proxy، Maglev و DSR',
        description:
          'چگونه Cilium نقش kube-proxy را برمی‌دارد، Maglev چه می‌کند و Direct Server Return چه تأثیری بر کارایی دارد.',
        readingTime: 10,
        sectionId: 'cilium-networking',
        status: 'published',
      },
    ],
  },
  {
    id: 'cilium-security',
    title: 'امنیت و سیاست شبکه',
    description:
      'سیاست‌های L3/L4/L7، رمزنگاری ترافیک و امنیت runtime با Tetragon.',
    lessons: [
      {
        id: 'cilium-network-policy',
        slug: 'cilium-network-policy',
        title: 'Network Policy در سطوح L3/L4/L7 و CiliumNetworkPolicy',
        description:
          'تفاوت سیاست‌های لایه شبکه و لایه کاربرد، نحو CiliumNetworkPolicy و نمونه‌های عملی محدودسازی ترافیک.',
        readingTime: 12,
        sectionId: 'cilium-security',
        status: 'published',
      },
      {
        id: 'cilium-encryption',
        slug: 'cilium-encryption',
        title: 'رمزنگاری ترافیک: WireGuard و IPsec',
        description:
          'رمزنگاری ترافیک بین nodeها با WireGuard و IPsec، تفاوت‌های عملیاتی و نکات کارایی.',
        readingTime: 9,
        sectionId: 'cilium-security',
        status: 'published',
      },
      {
        id: 'cilium-tetragon',
        slug: 'cilium-tetragon',
        title: 'Tetragon و امنیت runtime',
        description:
          'مشاهده و اعمال سیاست روی رفتار فرایندها در زمان اجرا با Tetragon و eBPF.',
        readingTime: 10,
        sectionId: 'cilium-security',
        status: 'published',
      },
    ],
  },
  {
    id: 'cilium-observability',
    title: 'مشاهده‌پذیری',
    description:
      'درک و پایش ترافیک شبکه با Hubble.',
    lessons: [
      {
        id: 'cilium-hubble',
        slug: 'cilium-hubble',
        title: 'Hubble: مشاهده‌پذیری، متریک و UI',
        description:
          'جریان‌های شبکه، متریک‌های Prometheus و رابط کاربری Hubble برای دیدن و عیب‌یابی رفتار سرویس‌ها.',
        readingTime: 10,
        sectionId: 'cilium-observability',
        status: 'published',
      },
    ],
  },
  {
    id: 'cilium-connectivity',
    title: 'دسترسی و اتصال',
    description:
      'BGP، توزیع IP بارمتقابل، Gateway API، Service Mesh و اتصال چند کلاستر.',
    lessons: [
      {
        id: 'cilium-bgp-lb',
        slug: 'cilium-bgp-lb',
        title: 'BGP و LoadBalancer IPAM / L2 Announcement',
        description:
          'اعلام مسیرها با BGP، تخصیص IP سرویس‌های LoadBalancer و اعلام لایه ۲ برای دسترسی از خارج کلاستر.',
        readingTime: 10,
        sectionId: 'cilium-connectivity',
        status: 'published',
      },
      {
        id: 'cilium-gateway-api',
        slug: 'cilium-gateway-api',
        title: 'Gateway API و Ingress با Cilium',
        description:
          'پیاده‌سازی Gateway API و Ingress با Cilium، تفاوت مدل‌ها و نمونه‌های پیکربندی.',
        readingTime: 10,
        sectionId: 'cilium-connectivity',
        status: 'published',
      },
      {
        id: 'cilium-service-mesh',
        slug: 'cilium-service-mesh',
        title: 'Service Mesh بدون sidecar',
        description:
          'چگونه Cilium با eBPF و Envoy یک mesh سبک بدون تزریق sidecar می‌سازد و چه محدودیت‌هایی دارد.',
        readingTime: 11,
        sectionId: 'cilium-connectivity',
        status: 'published',
      },
      {
        id: 'cilium-clustermesh',
        slug: 'cilium-clustermesh',
        title: 'ClusterMesh: اتصال چند کلاستر',
        description:
          'اتصال کلاسترهای مستقل، اشتراک سرویس‌ها و سیاست‌های امنیتی یکپارچه با ClusterMesh.',
        readingTime: 11,
        sectionId: 'cilium-connectivity',
        status: 'published',
      },
    ],
  },
  {
    id: 'cilium-operations',
    title: 'عملیات',
    description:
      'عیب‌یابی و بهبود کارایی در محیط عملیاتی.',
    lessons: [
      {
        id: 'cilium-troubleshooting',
        slug: 'cilium-troubleshooting',
        title: 'عیب‌یابی و تیونینگ کارایی',
        description:
          'ابزارهای عیب‌یابی Cilium، ریشه‌یابی مشکلات رایج datapath و تنظیمات مؤثر بر کارایی.',
        readingTime: 12,
        sectionId: 'cilium-operations',
        status: 'published',
      },
    ],
  },
]

export const ciliumCourse: Course = {
  id: 'cilium',
  slug: 'cilium',
  title: 'آموزش عملی Cilium',
  shortTitle: 'Cilium',
  description:
    'از eBPF و datapath تا امنیت، مشاهده‌پذیری و اتصال چند کلاستر؛ یک مسیر عملی برای Cilium.',
  longDescription:
    'یک مسیر فارسی برای یادگیری Cilium از پایه تا محیط عملیاتی: معماری و eBPF، مسیر بسته و حالت‌های شبکه، سیاست‌های امنیتی، رمزنگاری، Hubble، Gateway API، Service Mesh بدون sidecar و ClusterMesh. تمرکز این دوره روی درک رفتار واقعی datapath و پیکربندی درست است، نه حفظ کردن فهرست منابع.',
  level: 'از پایه تا عملیات',
  icon: 'cilium',
  sections: ciliumSectionsInput.map((section) => ({
    ...section,
    lessons: section.lessons.map((lesson) => ({ ...lesson, courseId: 'cilium' })),
  })),
}
