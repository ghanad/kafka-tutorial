import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const statefulSetYaml = `apiVersion: v1
kind: Service
metadata:
  name: shop-db
  namespace: shop
spec:
  clusterIP: None
  selector:
    app: shop-db
  ports:
    - port: 5432
      targetPort: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: shop-db
  namespace: shop
spec:
  serviceName: shop-db
  replicas: 3
  selector:
    matchLabels:
      app: shop-db
  template:
    metadata:
      labels:
        app: shop-db
    spec:
      containers:
        - name: postgres
          image: registry.local/postgres:16
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast
        resources:
          requests:
            storage: 20Gi`

const daemonSetYaml = `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      tolerations:
        - operator: Exists
      containers:
        - name: node-exporter
          image: registry.local/node-exporter:v1.8.0
          ports:
            - containerPort: 9100`

const jobYaml = `apiVersion: batch/v1
kind: Job
metadata:
  name: shop-report
  namespace: shop
spec:
  completions: 3
  parallelism: 2
  backoffLimit: 4
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: report
          image: registry.local/shop-report:2.0.0
          command:
            - /app/report
            - --date
            - "2026-11-28"`

const cronJobYaml = `apiVersion: batch/v1
kind: CronJob
metadata:
  name: shop-nightly-report
  namespace: shop
spec:
  schedule: "0 2 * * *"
  timeZone: "Asia/Tehran"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 600
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: report
              image: registry.local/shop-report:2.0.0`

const commands = `# دیدن پادهای StatefulSet و نام‌های پایدار
kubectl get pods -n shop -l app=shop-db

# دیدن PVCهایی که برای هر replica ساخته شده‌اند
kubectl get pvc -n shop

# دیدن DaemonSet روی نودها
kubectl get daemonset -n monitoring
kubectl get pods -n monitoring -l app=node-exporter -o wide

# دنبال کردن Job تا پایان
kubectl get job shop-report -n shop
kubectl logs -n shop -l job-name=shop-report --tail=50

# دیدن CronJob و تاریخچه اجراها
kubectl get cronjob shop-nightly-report -n shop
kubectl get jobs -n shop`

export function KubernetesWorkloadTypesContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        <Ltr>Deployment</Ltr> برای سرویس‌های بدون حالت عالی است، اما همه
        بارکاری‌ها شبیه <Ltr>shop-api</Ltr> نیستند. دیتابیس به هویت پایدار و
        دیسک اختصاصی نیاز دارد، عامل مانیتورینگ باید روی هر نود اجرا شود و
        گزارش شبانه یک کار تمام‌شدنی است. کوبرنتیز برای هر الگو یک کنترلر
        جداگانه دارد: <Ltr>StatefulSet</Ltr>، <Ltr>DaemonSet</Ltr>،{' '}
        <Ltr>Job</Ltr> و <Ltr>CronJob</Ltr>. در این درس معیار انتخاب هر کدام را
        می‌بینیم و برای فروشگاه یک نمونه واقعی از هر چهار مورد می‌سازیم.
      </p>

      <h2>انتخاب کنترلر: یک جدول تصمیم</h2>
      <p>
        پیش از نوشتن manifest، به این پرسش‌ها پاسخ دهید: برنامه دائمی است یا
        تمام‌شدنی؟ هویت پایدار لازم دارد یا نه؟ باید روی همه نودها اجرا شود یا
        فقط چند نسخه کافی است؟
      </p>
      <table>
        <thead>
          <tr>
            <th>کنترلر</th>
            <th>الگوی مناسب</th>
            <th>تضمین کلیدی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>Deployment</Ltr></td>
            <td>API، وب، worker بدون حالت</td>
            <td>تعداد replica و به‌روزرسانی تدریجی</td>
          </tr>
          <tr>
            <td><Ltr>StatefulSet</Ltr></td>
            <td>دیتابیس، صف، سیستم توزیع‌شده</td>
            <td>نام، شبکه و دیسک پایدار برای هر replica</td>
          </tr>
          <tr>
            <td><Ltr>DaemonSet</Ltr></td>
            <td>عامل لاگ، مانیتورینگ، شبکه</td>
            <td>یک پاد روی هر نود واجد شرایط</td>
          </tr>
          <tr>
            <td><Ltr>Job</Ltr></td>
            <td>مهاجرت، پردازش دسته‌ای، گزارش</td>
            <td>اجرای موفق تا پایان و توقف</td>
          </tr>
          <tr>
            <td><Ltr>CronJob</Ltr></td>
            <td>گزارش شبانه، پاک‌سازی دوره‌ای</td>
            <td>ساخت Job طبق زمان‌بندی</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="info" title="قاعده ساده">
        اگر برنامه «همیشه باید بماند» از <Ltr>Deployment</Ltr> یا{' '}
        <Ltr>StatefulSet</Ltr> استفاده کنید. اگر «باید تمام شود» از{' '}
        <Ltr>Job</Ltr> و اگر «هر نود باید یک نسخه داشته باشد» از{' '}
        <Ltr>DaemonSet</Ltr>.
      </Callout>

      <h2>StatefulSet: هویت پایدار برای دیتابیس</h2>
      <p>
        در <Ltr>Deployment</Ltr> نام پادها تصادفی است و هر پاد می‌تواند جای
        دیگری را بگیرد. برای <Ltr>shop-db</Ltr> این کافی نیست؛ نود اول باید
        همیشه <Ltr>shop-db-0</Ltr> باشد، دیسک خودش را داشته باشد و پیش از
        <Ltr>shop-db-1</Ltr> بالا بیاید. <Ltr>StatefulSet</Ltr> دقیقاً همین
        قرارداد را می‌دهد:
      </p>
      <CodeBlock code={statefulSetYaml} language="yaml" filename="shop-db-statefulset.yaml" />
      <p>
        سه نکته در این فایل کلیدی است. اول، <Ltr>serviceName</Ltr> به یک{' '}
        <Ltr>Service</Ltr> بدون <Ltr>clusterIP</Ltr> اشاره می‌کند که به آن{' '}
        <Ltr>Headless Service</Ltr> می‌گویند. دوم، نام پادها ترتیبی و پایدار
        است: <Ltr>shop-db-0</Ltr>، <Ltr>shop-db-1</Ltr> و{' '}
        <Ltr>shop-db-2</Ltr>. سوم، <Ltr>volumeClaimTemplates</Ltr> برای هر
        replica یک <Ltr>PVC</Ltr> جدا می‌سازد.
      </p>
      <p>
        هر پاد نام DNS پایدار خودش را دارد؛ مثلاً{' '}
        <Ltr>shop-db-0.shop-db.shop.svc.cluster.local</Ltr>. این نام برای
        پیکربندی خوشه دیتابیس حیاتی است. ساخت و حذف پادها به‌صورت پیش‌فرض
        ترتیبی است: <Ltr>shop-db-1</Ltr> تا <Ltr>shop-db-0</Ltr> آماده نشود
        ساخته نمی‌شود.
      </p>
      <Callout variant="warning" title="StatefulSet جای دیتابیس مدیریت‌شده نیست">
        StatefulSet هویت و دیسک می‌دهد، اما backup، failover، ارتقای نسخه و
        بازیابی را خودکار نمی‌کند. اگر تیم شما تجربه عملیات دیتابیس ندارد،
        دیتابیس مدیریت‌شده گزینه کم‌ریسک‌تری است.
      </Callout>

      <h2>DaemonSet: یک نسخه روی هر نود</h2>
      <p>
        عامل‌هایی مثل <Ltr>node-exporter</Ltr> باید روی هر نود اجرا شوند تا
        متریک همان نود را جمع کنند. <Ltr>DaemonSet</Ltr> به‌جای تعداد replica،
        تعداد نودهای واجد شرایط را ملاک می‌گذارد:
      </p>
      <CodeBlock code={daemonSetYaml} language="yaml" filename="node-exporter-daemonset.yaml" />
      <p>
        در این مثال <Ltr>tolerations</Ltr> با <Ltr>operator: Exists</Ltr> باعث
        می‌شود پاد روی نودهای control plane هم اجرا شود؛ چون آن نودها معمولاً
        taint دارند. بدون این toleration، ممکن است بخشی از نودها بدون عامل
        مانیتورینگ بمانند.
      </p>
      <p>
        <Ltr>DaemonSet</Ltr> هنگام اضافه شدن نود جدید خودش پاد می‌سازد و هنگام
        حذف نود، پاد را پاک می‌کند. به‌روزرسانی آن هم تدریجی است و با{' '}
        <Ltr>maxUnavailable</Ltr> کنترل می‌شود.
      </p>

      <h2>Job: کاری که باید تمام شود</h2>
      <p>
        یک <Ltr>Deployment</Ltr> همیشه پاد را زنده نگه می‌دارد؛ برای گزارش
        شبانه این اشتباه است. <Ltr>Job</Ltr> پاد می‌سازد تا کار تمام شود و بعد
        متوقف می‌شود. با <Ltr>completions</Ltr> تعداد اجرای موفق و با{' '}
        <Ltr>parallelism</Ltr> تعداد اجرای همزمان را کنترل می‌کنید:
      </p>
      <CodeBlock code={jobYaml} language="yaml" filename="shop-report-job.yaml" />
      <p>
        این Job سه اجرای موفق می‌خواهد و حداکثر دو اجرا را همزمان می‌پذیرد.
        اگر یک پاد شکست بخورد، تا <Ltr>backoffLimit</Ltr> بار دیگر تلاش
        می‌شود. <Ltr>ttlSecondsAfterFinished</Ltr> باعث می‌شود Job و پادهای
        تمام‌شده پس از یک ساعت پاک شوند تا تاریخچه کلاستر بی‌نهایت رشد نکند.
      </p>
      <p>
        در <Ltr>Job</Ltr> مقدار <Ltr>restartPolicy</Ltr> فقط می‌تواند{' '}
        <Ltr>Never</Ltr> یا <Ltr>OnFailure</Ltr> باشد. <Ltr>Always</Ltr> برای
        Job معنا ندارد، چون هدف پایان یافتن کار است.
      </p>

      <h2>CronJob: Job زمان‌بندی‌شده</h2>
      <p>
        <Ltr>CronJob</Ltr> یک <Ltr>Job</Ltr> را طبق عبارت cron می‌سازد. برای
        گزارش شبانه فروشگاه، هر شب ساعت ۲ بامداد به وقت تهران:
      </p>
      <CodeBlock code={cronJobYaml} language="yaml" filename="shop-nightly-report-cronjob.yaml" />
      <p>
        <Ltr>concurrencyPolicy: Forbid</Ltr> جلوی اجرای همزمان دو گزارش را
        می‌گیرد. اگر اجرای قبلی طول بکشد، اجرای جدید رد می‌شود. گزینه‌های دیگر{' '}
        <Ltr>Allow</Ltr> (پیش‌فرض) و <Ltr>Replace</Ltr> هستند.{' '}
        <Ltr>startingDeadlineSeconds</Ltr> تعیین می‌کند اگر کنترلر دیر بیدار
        شد، تا چه مدت عقب‌افتادگی را جبران کند.
      </p>
      <p>
        بدون <Ltr>timeZone</Ltr>، زمان‌بندی بر اساس <Ltr>UTC</Ltr> است. برای
        تیمی که ساعت ۲ تهران انتظار دارد، این تفاوت سه‌ونیم ساعت است و می‌تواند
        گزارش را در ساعت اشتباه اجرا کند.
      </p>
      <CodeBlock code={commands} language="bash" filename="bash" />

      <h2>کدام کنترلر را انتخاب نکنیم؟</h2>
      <p>
        انتخاب اشتباه معمولاً از یک فرض ساده می‌آید: «همه چیز را با Deployment
        می‌سازم». این کار برای دیتابیس هویت پایدار نمی‌دهد و برای گزارش شبانه
        پاد را بی‌پایان زنده نگه می‌دارد. از طرف دیگر، استفاده از{' '}
        <Ltr>StatefulSet</Ltr> برای یک API بدون حالت، پیچیدگی بی‌دلیل اضافه
        می‌کند: نام‌های ترتیبی، PVCهای بی‌استفاده و rollout کندتر.
      </p>
      <ul>
        <li>سرویس بدون حالت با نیاز به مقیاس افقی: <Ltr>Deployment</Ltr>.</li>
        <li>دیتابیس یا سیستم با هویت پایدار: <Ltr>StatefulSet</Ltr>.</li>
        <li>عامل سطح نود: <Ltr>DaemonSet</Ltr>.</li>
        <li>کار یک‌باره یا دسته‌ای: <Ltr>Job</Ltr>.</li>
        <li>کار تکرارشونده طبق زمان: <Ltr>CronJob</Ltr>.</li>
      </ul>

      <DeepDive title="جزئیات فنی: هویت، PVC و رفتار کنترلرها">
        <DeepDiveSection title="نام و DNS پایدار در StatefulSet">
          <p>
            نام پاد از <Ltr>statefulSetName-ordinal</Ltr> ساخته می‌شود و پس از
            بازسازی هم همان می‌ماند. <Ltr>Headless Service</Ltr> رکورد DNS برای
            هر پاد می‌سازد. اگر <Ltr>serviceName</Ltr> اشتباه باشد، پادها
            ساخته می‌شوند اما نام DNS پایدار ندارند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="PVC و کاهش replica">
          <p>
            با کاهش replica، پاد حذف می‌شود اما <Ltr>PVC</Ltr> مربوط به آن
            باقی می‌ماند. این رفتار عمدی است تا داده از دست نرود. پاک‌سازی
            PVCها وظیفه شماست و باید با احتیاط انجام شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="podManagementPolicy">
          <p>
            پیش‌فرض <Ltr>OrderedReady</Ltr> است: ساخت و حذف ترتیبی. با{' '}
            <Ltr>Parallel</Ltr> همه پادها همزمان ساخته می‌شوند. برای دیتابیسی
            که به ترتیب bootstrap وابسته است، OrderedReady را نگه دارید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Job و CronJob: سیاست شکست و تاریخچه">
          <p>
            <Ltr>backoffLimit</Ltr> تعداد تلاش مجدد کل Job است، نه هر پاد.
            <Ltr>activeDeadlineSeconds</Ltr> سقف زمان اجرا را می‌بندد. در{' '}
            <Ltr>CronJob</Ltr>، <Ltr>successfulJobsHistoryLimit</Ltr> و{' '}
            <Ltr>failedJobsHistoryLimit</Ltr> تعداد Jobهای نگه‌داشته‌شده را
            محدود می‌کنند. بدون این‌ها، تاریخچه می‌تواند به‌سرعت رشد کند.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="StatefulSet بدون Headless Service">
        اگر <Ltr>serviceName</Ltr> به سرویسی اشاره کند که <Ltr>clusterIP: None</Ltr>{' '}
        ندارد، هویت شبکه‌ای پایدار آن‌طور که انتظار دارید کار نمی‌کند. سرویس
        headless بخشی از قرارداد StatefulSet است.
      </Callout>
      <Callout variant="warning" title="DaemonSet بدون toleration">
        اگر نودهای control plane taint داشته باشند، DaemonSet بدون toleration
        روی آن‌ها اجرا نمی‌شود. نتیجه، شکاف در مانیتورینگ یا لاگ است که تا
        زمان حادثه دیده نمی‌شود.
      </Callout>
      <Callout variant="danger" title="restartPolicy اشتباه در Job">
        استفاده از <Ltr>Always</Ltr> در قالب Job معتبر نیست. برای Job از{' '}
        <Ltr>Never</Ltr> یا <Ltr>OnFailure</Ltr> استفاده کنید.
      </Callout>
      <Callout variant="warning" title="CronJob بدون کنترل همزمانی">
        اگر اجرای گزارش طول بکشد و <Ltr>concurrencyPolicy</Ltr> را تنظیم
        نکنید، چند اجرا روی هم می‌افتند و ممکن است داده تکراری بسازند یا منبع
        را اشباع کنند.
      </Callout>

      <h2>جمع‌بندی</h2>
      <p>
        <Ltr>Deployment</Ltr> برای سرویس‌های بدون حالت، <Ltr>StatefulSet</Ltr>{' '}
        برای هویت و دیسک پایدار، <Ltr>DaemonSet</Ltr> برای یک نسخه روی هر نود،{' '}
        <Ltr>Job</Ltr> برای کار تمام‌شدنی و <Ltr>CronJob</Ltr> برای تکرار
        زمان‌بندی‌شده. انتخاب درست کنترلر، نیمی از پایداری است؛ نیم دیگر به
        منابع، probe و پیکربندی درست وابسته است. با این درس، فصل «اشیاء اصلی»
        کامل می‌شود و در فصل بعد سراغ زمان‌بندی و جای‌گذاری پادها می‌رویم.
      </p>
    </>
  )
}
