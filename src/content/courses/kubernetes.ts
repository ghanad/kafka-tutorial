import type { Course, CourseSectionInput } from './types'

const kubernetesSectionsInput: CourseSectionInput[] = [
  {
    id: 'k8s-basics',
    title: 'مبانی',
    description:
      'کانتینر و نیاز به orchestration، معماری کلاستر و اولین قدم‌ها با kubectl و YAML.',
    lessons: [
      {
        id: 'k8s-what-is-kubernetes',
        slug: 'k8s-what-is-kubernetes',
        title: 'Kubernetes چیست و چه مشکلی را حل می‌کند؟',
        description:
          'چرا اجرای دستی کانتینر جواب نمی‌دهد، orchestrator چه کاری می‌کند و Kubernetes چه فرقی با Docker و گزینه‌های دیگر دارد.',
        readingTime: 14,
        sectionId: 'k8s-basics',
        status: 'published',
      },
      {
        id: 'k8s-cluster-anatomy',
        slug: 'k8s-cluster-anatomy',
        title: 'کالبدشکافی کلاستر: Control Plane و Node',
        description:
          'نقش API Server، etcd، Scheduler، Controller Manager و kubelet؛ و اجزای یک کلاستر چگونه کنار هم قرار می‌گیرند.',
        readingTime: 10,
        sectionId: 'k8s-basics',
        status: 'published',
      },
      {
        id: 'k8s-request-path',
        slug: 'k8s-request-path',
        title: 'مسیر یک درخواست: از kubectl apply تا اجرای Pod',
        description:
          'سفر یک manifest از API Server و etcd تا Scheduler، kubelet و container runtime؛ با مثال گام‌به‌گام.',
        readingTime: 10,
        sectionId: 'k8s-basics',
        status: 'published',
      },
      {
        id: 'k8s-kubectl-yaml',
        slug: 'k8s-kubectl-yaml',
        title: 'آشنایی با kubectl و YAML',
        description:
          'ساختار manifest، فیلدهای apiVersion، kind، metadata و spec و دستورهای پرکاربرد kubectl برای مشاهده و ویرایش منابع.',
        readingTime: 9,
        sectionId: 'k8s-basics',
        status: 'published',
      },
    ],
  },
  {
    id: 'k8s-workloads',
    title: 'اشیاء اصلی',
    description:
      'Pod، Deployment، پیکربندی، probeها، منابع و انواع بارکاری؛ واحدهای اصلی اجرای برنامه.',
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
        id: 'k8s-namespaces-labels',
        slug: 'k8s-namespaces-labels',
        title: 'Namespace، Label، Selector و Annotation',
        description:
          'جداسازی منطقی منابع، انتخاب گروهی با label و selector و تفاوت annotation با label در عمل.',
        readingTime: 8,
        sectionId: 'k8s-workloads',
        status: 'published',
      },
      {
        id: 'k8s-configmaps-secrets',
        slug: 'k8s-configmaps-secrets',
        title: 'ConfigMap و Secret',
        description:
          'جداسازی پیکربندی از image، تزریق متغیر محیطی و محدودیت‌های امنیتی Secret.',
        readingTime: 8,
        sectionId: 'k8s-workloads',
        status: 'published',
      },
      {
        id: 'k8s-probes',
        slug: 'k8s-probes',
        title: 'Probes: liveness، readiness و startup',
        description:
          'تفاوت سه نوع probe، اثر هرکدام بر restart و ارسال ترافیک، و تنظیم درست آستانه‌ها.',
        readingTime: 9,
        sectionId: 'k8s-workloads',
        status: 'published',
      },
      {
        id: 'k8s-resources-qos',
        slug: 'k8s-resources-qos',
        title: 'Resource Requests/Limits، QoS و سهمیه‌ها',
        description:
          'چطور requests و limits روی زمان‌بندی و OOM اثر می‌گذارند، کلاس‌های QoS و کنترل با LimitRange و ResourceQuota.',
        readingTime: 10,
        sectionId: 'k8s-workloads',
        status: 'published',
      },
      {
        id: 'k8s-workload-types',
        slug: 'k8s-workload-types',
        title: 'StatefulSet، DaemonSet، Job و CronJob',
        description:
          'چه زمانی هر نوع بارکاری را انتخاب کنیم و هرکدام چه تضمین‌هایی برای هویت، ترتیب و اجرا می‌دهند.',
        readingTime: 11,
        sectionId: 'k8s-workloads',
        status: 'published',
      },
    ],
  },
  {
    id: 'k8s-scheduling',
    title: 'زمان‌بندی و جایگذاری Pod',
    description:
      'Scheduler چگونه تصمیم می‌گیرد و چطور جای Pod را با affinity، taint و topology کنترل کنیم.',
    lessons: [
      {
        id: 'k8s-scheduler',
        slug: 'k8s-scheduler',
        title: 'Scheduler چگونه تصمیم می‌گیرد',
        description:
          'مراحل filter و score، معیارهای انتخاب node و اثر requests بر نتیجه زمان‌بندی.',
        readingTime: 9,
        sectionId: 'k8s-scheduling',
        status: 'planned',
      },
      {
        id: 'k8s-affinity',
        slug: 'k8s-affinity',
        title: 'nodeSelector، Affinity و Anti-affinity',
        description:
          'کنترل جای‌گذاری با برچسب node، قواعد الزامی و ترجیحی و پخش Podها روی گره‌ها.',
        readingTime: 9,
        sectionId: 'k8s-scheduling',
        status: 'planned',
      },
      {
        id: 'k8s-taints-tolerations',
        slug: 'k8s-taints-tolerations',
        title: 'Taint و Toleration',
        description:
          'چطور nodeها Podهای ناخواسته را دفع می‌کنند و ترکیب taint با affinity در عمل.',
        readingTime: 8,
        sectionId: 'k8s-scheduling',
        status: 'planned',
      },
      {
        id: 'k8s-topology-pdb',
        slug: 'k8s-topology-pdb',
        title: 'Topology Spread و PodDisruptionBudget',
        description:
          'پخش متوازن Pod در zoneها و گره‌ها و محافظت از دسترس‌پذیری هنگام تخلیه node.',
        readingTime: 9,
        sectionId: 'k8s-scheduling',
        status: 'planned',
      },
    ],
  },
  {
    id: 'k8s-networking',
    title: 'شبکه',
    description:
      'مدل شبکه Pod، CNI، Service، DNS، Ingress و سیاست‌های شبکه؛ قلب دوره.',
    lessons: [
      {
        id: 'k8s-network-model',
        slug: 'k8s-network-model',
        title: 'مدل شبکه: هر Pod یک IP',
        description:
          'چرا هر Pod آدرس مستقل دارد، ارتباط Pod به Pod و انتظاراتی که Kubernetes از شبکه دارد.',
        readingTime: 8,
        sectionId: 'k8s-networking',
        status: 'planned',
      },
      {
        id: 'k8s-cni',
        slug: 'k8s-cni',
        title: 'CNI چیست و چه نقشی در ساخت Pod دارد؟',
        description:
          'نقش plugin شبکه در تخصیص IP و اتصال Pod، و گام‌های اجرا هنگام ساخته‌شدن sandbox.',
        readingTime: 9,
        sectionId: 'k8s-networking',
        status: 'planned',
      },
      {
        id: 'k8s-services',
        slug: 'k8s-services',
        title: 'Service و دسترسی به برنامه‌ها',
        description:
          'ClusterIP، NodePort، LoadBalancer و Headless؛ چرا IP پادها پایدار نیست و Service چه کاری انجام می‌دهد.',
        readingTime: 9,
        sectionId: 'k8s-networking',
        status: 'planned',
      },
      {
        id: 'k8s-kube-proxy',
        slug: 'k8s-kube-proxy',
        title: 'kube-proxy: حالت‌های iptables و IPVS',
        description:
          'چطور قواعد forwarding برای Service ساخته می‌شود و تفاوت و کارایی iptables با IPVS.',
        readingTime: 9,
        sectionId: 'k8s-networking',
        status: 'planned',
      },
      {
        id: 'k8s-cni-vs-kube-proxy',
        slug: 'k8s-cni-vs-kube-proxy',
        title: 'CNI در برابر kube-proxy: تفاوت وظایف',
        description:
          'کدام لایه IP می‌دهد، کدام لایه ترافیک Service را هدایت می‌کند و مرز مسئولیت هرکدام کجاست.',
        readingTime: 8,
        sectionId: 'k8s-networking',
        status: 'planned',
      },
      {
        id: 'k8s-cni-comparison',
        slug: 'k8s-cni-comparison',
        title: 'مقایسه Flannel، Calico و Cilium',
        description:
          'تفاوت مدل داده، سیاست شبکه و کارایی این سه CNI و معیارهای انتخاب در محیط عملیاتی.',
        readingTime: 10,
        sectionId: 'k8s-networking',
        status: 'planned',
      },
      {
        id: 'k8s-coredns',
        slug: 'k8s-coredns',
        title: 'CoreDNS و Service Discovery',
        description:
          'چطور نام سرویس به IP حل می‌شود، ساختار رکوردها و عیب‌یابی رایج DNS در کلاستر.',
        readingTime: 8,
        sectionId: 'k8s-networking',
        status: 'planned',
      },
      {
        id: 'k8s-ingress-gateway',
        slug: 'k8s-ingress-gateway',
        title: 'Ingress و Gateway API',
        description:
          'مسیریابی HTTP از بیرون کلاستر، تفاوت Ingress با Gateway API و نقش controller.',
        readingTime: 10,
        sectionId: 'k8s-networking',
        status: 'planned',
      },
      {
        id: 'k8s-network-policy',
        slug: 'k8s-network-policy',
        title: 'NetworkPolicy پایه',
        description:
          'محدودسازی ترافیک Pod به Pod با سیاست‌های L3/L4 و نکات مهم پیش‌فرض‌ها.',
        readingTime: 9,
        sectionId: 'k8s-networking',
        status: 'planned',
      },
    ],
  },
  {
    id: 'k8s-cilium',
    title: 'Cilium (مقدماتی)',
    description:
      'چرا eBPF، نصب Cilium، جایگزینی kube-proxy، مشاهده ترافیک با Hubble و سیاست شبکه.',
    lessons: [
      {
        id: 'k8s-cilium-ebpf',
        slug: 'k8s-cilium-ebpf',
        title: 'چرا Cilium؟ مفهوم eBPF',
        description:
          'eBPF چیست، چرا datapath مبتنی بر هسته سریع‌تر است و Cilium چه چیزی را ساده‌تر می‌کند.',
        readingTime: 9,
        sectionId: 'k8s-cilium',
        status: 'published',
      },
      {
        id: 'k8s-cilium-install',
        slug: 'k8s-cilium-install',
        title: 'نصب و فعال‌سازی Cilium',
        description:
          'نصب با Helm، انتخاب حالت شبکه و نکات استقرار روی کلاسترهای واقعی مثل RKE2.',
        readingTime: 9,
        sectionId: 'k8s-cilium',
        status: 'published',
      },
      {
        id: 'k8s-cilium-kube-proxy',
        slug: 'k8s-cilium-kube-proxy',
        title: 'جایگزینی kube-proxy با Cilium',
        description:
          'چطور Cilium نقش kube-proxy را برمی‌دارد و چه تنظیماتی برای این حالت لازم است.',
        readingTime: 8,
        sectionId: 'k8s-cilium',
        status: 'published',
      },
      {
        id: 'k8s-cilium-hubble',
        slug: 'k8s-cilium-hubble',
        title: 'Hubble برای مشاهده ترافیک',
        description:
          'دیدن جریان‌های شبکه، متریک‌ها و عیب‌یابی ارتباط سرویس‌ها با Hubble.',
        readingTime: 8,
        sectionId: 'k8s-cilium',
        status: 'published',
      },
      {
        id: 'k8s-cilium-policy',
        slug: 'k8s-cilium-policy',
        title: 'NetworkPolicy با Cilium',
        description:
          'سیاست‌های L3/L4 و L7 با CiliumNetworkPolicy و تفاوت آن با NetworkPolicy استاندارد.',
        readingTime: 9,
        sectionId: 'k8s-cilium',
        status: 'published',
      },
    ],
  },
  {
    id: 'k8s-storage',
    title: 'ذخیره‌سازی',
    description:
      'Volume، PV و PVC، تخصیص پویا و نقش CSI در اتصال ذخیره‌سازی پایدار.',
    lessons: [
      {
        id: 'k8s-volumes-pv-pvc',
        slug: 'k8s-volumes-pv-pvc',
        title: 'Volume، PV و PVC',
        description:
          'چرخه عمر volume، تفاوت PV و PVC و اتصال ذخیره‌سازی پایدار به Pod.',
        readingTime: 9,
        sectionId: 'k8s-storage',
        status: 'planned',
      },
      {
        id: 'k8s-storageclass',
        slug: 'k8s-storageclass',
        title: 'StorageClass و Dynamic Provisioning',
        description:
          'تخصیص خودکار volume، پارامترهای StorageClass و سیاست آزادسازی (reclaim policy).',
        readingTime: 8,
        sectionId: 'k8s-storage',
        status: 'planned',
      },
      {
        id: 'k8s-csi',
        slug: 'k8s-csi',
        title: 'CSI چیست',
        description:
          'نقش Container Storage Interface، درایورها و چگونگی اتصال ذخیره‌سازی بیرونی به Kubernetes.',
        readingTime: 8,
        sectionId: 'k8s-storage',
        status: 'planned',
      },
    ],
  },
  {
    id: 'k8s-security',
    title: 'امنیت',
    description:
      'RBAC، امنیت Pod و مدیریت عملی Secret.',
    lessons: [
      {
        id: 'k8s-rbac',
        slug: 'k8s-rbac',
        title: 'RBAC و ServiceAccount',
        description:
          'Role، ClusterRole، Binding و هویت Pod برای دسترسی کنترل‌شده به API.',
        readingTime: 9,
        sectionId: 'k8s-security',
        status: 'planned',
      },
      {
        id: 'k8s-security-context',
        slug: 'k8s-security-context',
        title: 'SecurityContext و Pod Security Standards',
        description:
          'کنترل کاربر، capability و فایل‌سیستم Pod و سه سطح Pod Security Standards.',
        readingTime: 9,
        sectionId: 'k8s-security',
        status: 'planned',
      },
      {
        id: 'k8s-secret-management',
        slug: 'k8s-secret-management',
        title: 'مدیریت Secret در عمل',
        description:
          'محدودیت‌های Secret پیش‌فرض و راهکارهای امن‌تر برای نگهداری و تزریق اطلاعات حساس.',
        readingTime: 8,
        sectionId: 'k8s-security',
        status: 'planned',
      },
    ],
  },
  {
    id: 'k8s-helm-gitops',
    title: 'Helm و GitOps',
    description:
      'بسته‌بندی، سفارشی‌سازی و استقرار اعلانی با Helm، Kustomize و ArgoCD.',
    lessons: [
      {
        id: 'k8s-helm',
        slug: 'k8s-helm',
        title: 'Helm: Chart، Values و Release',
        description:
          'ساختار chart، مدیریت values و چرخه release برای استقرار تکرارپذیر.',
        readingTime: 9,
        sectionId: 'k8s-helm-gitops',
        status: 'planned',
      },
      {
        id: 'k8s-kustomize',
        slug: 'k8s-kustomize',
        title: 'Kustomize',
        description:
          'سفارشی‌سازی manifest بدون template، overlayها و مقایسه با Helm.',
        readingTime: 8,
        sectionId: 'k8s-helm-gitops',
        status: 'planned',
      },
      {
        id: 'k8s-gitops-argocd',
        slug: 'k8s-gitops-argocd',
        title: 'GitOps و ArgoCD',
        description:
          'استقرار اعلانی از Git، همگام‌سازی خودکار و مدیریت drift با ArgoCD.',
        readingTime: 9,
        sectionId: 'k8s-helm-gitops',
        status: 'planned',
      },
    ],
  },
  {
    id: 'k8s-operations',
    title: 'عملیات روزمره',
    description:
      'مشاهده‌پذیری، مقیاس‌پذیری، پشتیبان‌گیری، ارتقا و عیب‌یابی کلاستر.',
    lessons: [
      {
        id: 'k8s-observability',
        slug: 'k8s-observability',
        title: 'مانیتورینگ و لاگ',
        description:
          'kubectl logs، metrics-server، رویدادهای کلاستر و طراحی هشدار برای سرویس‌های حیاتی.',
        readingTime: 9,
        sectionId: 'k8s-operations',
        status: 'planned',
      },
      {
        id: 'k8s-scaling',
        slug: 'k8s-scaling',
        title: 'Autoscaling: HPA، VPA و Cluster Autoscaler',
        description:
          'تفاوت مقیاس افقی، عمودی و مقیاس گره؛ پیش‌نیازها و نکات تنظیم هر سه در عمل.',
        readingTime: 9,
        sectionId: 'k8s-operations',
        status: 'planned',
      },
      {
        id: 'k8s-backup-restore',
        slug: 'k8s-backup-restore',
        title: 'Backup و Restore (etcd)',
        description:
          'پشتیبان‌گیری از etcd، بازیابی کلاستر و نکات ایمنی snapshot.',
        readingTime: 9,
        sectionId: 'k8s-operations',
        status: 'planned',
      },
      {
        id: 'k8s-cluster-upgrade',
        slug: 'k8s-cluster-upgrade',
        title: 'ارتقای کلاستر',
        description:
          'ترتیب ارتقای control plane و nodeها، نسخه‌های پشتیبانی‌شده و کاهش ریسک قطعی.',
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
    'از Pod و Deployment تا شبکه، Cilium، ذخیره‌سازی، امنیت و عملیات؛ یک مسیر عملی برای اجرای برنامه روی Kubernetes.',
  longDescription:
    'یک مسیر فارسی و تعاملی برای یادگیری Kubernetes در نه فصل: مبانی و معماری، اشیاء اصلی، زمان‌بندی، شبکه و CNI، مقدمه‌ای بر Cilium، ذخیره‌سازی، امنیت، Helm و GitOps و در نهایت عملیات روزمره. تمرکز این دوره روی درک رفتار کلاستر و دستورهای واقعی kubectl است، نه حفظ کردن فهرست منابع.',
  level: 'از پایه تا عملیات',
  icon: 'kubernetes',
  sections: kubernetesSectionsInput.map((section) => ({
    ...section,
    lessons: section.lessons.map((lesson) => ({ ...lesson, courseId: 'kubernetes' })),
  })),
}
