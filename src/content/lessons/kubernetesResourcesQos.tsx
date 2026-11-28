import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const resourcesYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: shop
spec:
  replicas: 4
  selector:
    matchLabels:
      app.kubernetes.io/name: shop-api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: shop-api
    spec:
      containers:
        - name: api
          image: registry.local/shop-api:1.5.0
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi`

const limitRangeYaml = `apiVersion: v1
kind: LimitRange
metadata:
  name: shop-defaults
  namespace: shop
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "2"
        memory: 2Gi`

const quotaYaml = `apiVersion: v1
kind: ResourceQuota
metadata:
  name: shop-quota
  namespace: shop
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
    count/deployments.apps: "10"`

const commands = `# دیدن مصرف واقعی (نیازمند metrics-server)
kubectl top pod -n shop
kubectl top node

# دیدن requests و limits در فهرست
kubectl get pods -n shop -o custom-columns=\\
NAME:.metadata.name,\\
CPU_REQ:.spec.containers[*].resources.requests.cpu,\\
MEM_REQ:.spec.containers[*].resources.requests.memory

# دیدن رویدادهای مربوط به سهمیه و تخلیه
kubectl describe resourcequota shop-quota -n shop
kubectl describe pod -n shop -l app.kubernetes.io/name=shop-api

# دیدن کلاس QoS یک پاد
kubectl get pod -n shop -l app.kubernetes.io/name=shop-api \\
  -o jsonpath='{range .items[*]}{.metadata.name}{"\\t"}{.status.qosClass}{"\\n"}{end}'`

export function KubernetesResourcesQosContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا پادها را ساختیم، پیکربندی دادیم و سلامت‌شان را سنجیدیم. اما
        هنوز نگفته‌ایم هر پاد چقدر <Ltr>CPU</Ltr> و حافظه می‌خواهد. بدون این
        عددها، زمان‌بند نمی‌داند پاد را کجا بگذارد و یک برنامه پرمصرف می‌تواند
        همسایه‌هایش را از کار بیندازد. در این درس <Ltr>requests</Ltr> و{' '}
        <Ltr>limits</Ltr> را برای <Ltr>shop-api</Ltr> تعریف می‌کنیم، کلاس‌های{' '}
        <Ltr>QoS</Ltr> را می‌شناسیم و با <Ltr>LimitRange</Ltr> و{' '}
        <Ltr>ResourceQuota</Ltr> سقف namespace را می‌بندیم.
      </p>

      <h2>requests و limits: دو عدد با دو کار متفاوت</h2>
      <p>
        هر کانتینر می‌تواند برای هر منبع دو مقدار داشته باشد. <strong>request</strong>{' '}
        چیزی است که زمان‌بند برای انتخاب نود در نظر می‌گیرد؛ یعنی «این پاد
        حداقل این مقدار را لازم دارد». <strong>limit</strong> سقف واقعی مصرف
        است؛ یعنی «بیشتر از این مقدار نگذار». این دو نقش را قاطی نکنید:
      </p>
      <table>
        <thead>
          <tr>
            <th>منبع</th>
            <th>اثر <Ltr>request</Ltr></th>
            <th>اثر <Ltr>limit</Ltr></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>CPU</Ltr></td>
            <td>زمان‌بند ظرفیت آزاد نود را بر اساس آن رزرو می‌کند</td>
            <td>مصرف بیش از سقف با throttle شدن محدود می‌شود</td>
          </tr>
          <tr>
            <td>حافظه</td>
            <td>زمان‌بند ظرفیت آزاد نود را بر اساس آن رزرو می‌کند</td>
            <td>عبور از سقف باعث <Ltr>OOMKilled</Ltr> می‌شود</td>
          </tr>
        </tbody>
      </table>
      <p>
        تفاوت رفتار <Ltr>CPU</Ltr> و حافظه مهم است. <Ltr>CPU</Ltr> منبعی
        قابل‌فشرده‌سازی است؛ اگر از limit عبور کند فقط کندتر می‌شود. حافظه
        قابل‌فشرده‌سازی نیست؛ اگر از limit عبور کند کرنل فرآیند را می‌کشد.
      </p>
      <CodeBlock code={resourcesYaml} language="yaml" filename="shop-api-resources.yaml" />
      <p>
        در این مثال هر پاد <Ltr>250m</Ltr> یعنی یک‌چهارم هسته رزرو می‌کند و
        حداکثر تا نصف هسته می‌تواند مصرف کند. برای حافظه، حداقل{' '}
        <Ltr>256Mi</Ltr> رزرو و سقف <Ltr>512Mi</Ltr> تعیین شده است. با چهار
        replica، مجموع requests برابر <Ltr>1 CPU</Ltr> و <Ltr>1Gi</Ltr> حافظه
        است.
      </p>

      <h2>واحدها: میلی‌کور و مبی‌بایت</h2>
      <p>
        <Ltr>CPU</Ltr> با واحد هسته یا میلی‌کور بیان می‌شود:{' '}
        <Ltr>1000m</Ltr> برابر یک هسته و <Ltr>250m</Ltr> برابر یک‌چهارم هسته
        است. برای حافظه دو خانواده واحد وجود دارد:
      </p>
      <ul>
        <li>
          <strong>دودویی:</strong> <Ltr>Mi</Ltr> و <Ltr>Gi</Ltr> که پایه ۲
          دارند؛ <Ltr>1Gi = 1024Mi</Ltr>.
        </li>
        <li>
          <strong>اعشاری:</strong> <Ltr>M</Ltr> و <Ltr>G</Ltr> که پایه ۱۰
          دارند؛ <Ltr>1G = 1000M</Ltr>.
        </li>
      </ul>
      <p>
        برای حافظه معمولاً <Ltr>Mi</Ltr> و <Ltr>Gi</Ltr> به کار می‌رود. اشتباه
        رایج، نوشتن <Ltr>memory: 512m</Ltr> است؛ <Ltr>m</Ltr> برای{' '}
        <Ltr>CPU</Ltr> معنا دارد و برای حافظه مقدار بسیار کوچکی است.
      </p>

      <h2>کلاس‌های QoS: کوبرنتیز هنگام فشار چه کسی را اول می‌کشد؟</h2>
      <p>
        کوبرنتیز بر اساس نسبت requests و limits هر پاد یک کلاس{' '}
        <Ltr>QoS</Ltr> تعیین می‌کند. این کلاس در زمان کمبود منابع نود تعیین
        می‌کند کدام پاد اول تخلیه شود:
      </p>
      <table>
        <thead>
          <tr>
            <th>کلاس</th>
            <th>شرط</th>
            <th>ترتیب تخلیه</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>Guaranteed</Ltr></td>
            <td>برای همه کانتینرها request و limit هر دو منبع برابر باشد</td>
            <td>آخرین گزینه</td>
          </tr>
          <tr>
            <td><Ltr>Burstable</Ltr></td>
            <td>حداقل یک request یا limit تعریف شده باشد، اما برابر نباشد</td>
            <td>پس از <Ltr>BestEffort</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>BestEffort</Ltr></td>
            <td>هیچ request یا limit تعریف نشده باشد</td>
            <td>اولین گزینه</td>
          </tr>
        </tbody>
      </table>
      <p>
        مثال ما <Ltr>Burstable</Ltr> است، چون request و limit برابر نیستند.
        این کلاس برای بیشتر سرویس‌های وب مناسب است: حداقل رزرو مشخص دارد، اما
        می‌تواند در پیک از ظرفیت بیشتر استفاده کند. <Ltr>Guaranteed</Ltr> برای
        بارهای حساس و قابل پیش‌بینی مناسب است، اما انعطاف کمتری دارد.
      </p>
      <Callout variant="warning" title="Guaranteed هم مصون نیست">
        کلاس <Ltr>Guaranteed</Ltr> فقط احتمال تخلیه را کم می‌کند. اگر نود
        حافظه‌اش واقعاً تمام شود، حتی پاد <Ltr>Guaranteed</Ltr> هم می‌تواند
        قربانی شود. QoS جایگزین ظرفیت کافی و مانیتورینگ نیست.
      </Callout>

      <h2>LimitRange: پیش‌فرض و سقف برای هر کانتینر</h2>
      <p>
        اگر تیم‌ها فراموش کنند resources تعریف کنند، پادهای{' '}
        <Ltr>BestEffort</Ltr> ساخته می‌شوند و برنامه‌ریزی ظرفیت غیرممکن
        می‌شود. <Ltr>LimitRange</Ltr> در سطح namespace مقدار پیش‌فرض و سقف
        تعیین می‌کند:
      </p>
      <CodeBlock code={limitRangeYaml} language="yaml" filename="shop-limitrange.yaml" />
      <p>
        با این تنظیم، کانتینری که resources نداشته باشد به‌طور خودکار{' '}
        <Ltr>100m</Ltr> و <Ltr>128Mi</Ltr> request و <Ltr>500m</Ltr> و{' '}
        <Ltr>512Mi</Ltr> limit می‌گیرد. همچنین هیچ کانتینری نمی‌تواند بیش از{' '}
        <Ltr>2 CPU</Ltr> یا <Ltr>2Gi</Ltr> حافظه درخواست کند.
      </p>

      <h2>ResourceQuota: سقف کل namespace</h2>
      <p>
        <Ltr>LimitRange</Ltr> سقف هر کانتینر را می‌بندد؛ <Ltr>ResourceQuota</Ltr>{' '}
        سقف مجموع namespace را. برای پلتفرم فروشگاه می‌خواهیم کل namespace از
        چهار هسته request و هشت گیگابایت حافظه بیشتر نشود:
      </p>
      <CodeBlock code={quotaYaml} language="yaml" filename="shop-quota.yaml" />
      <p>
        وقتی سهمیه فعال باشد، هر پاد جدید باید request و limit داشته باشد؛
        وگرنه API Server آن را رد می‌کند. اگر تیمی بخواهد پنجمین replica با
        همین مشخصات را بسازد، مجموع request از سقف عبور می‌کند و پاد ساخته
        نمی‌شود. این خطا در رویدادهای namespace دیده می‌شود.
      </p>
      <CodeBlock code={commands} language="bash" filename="bash" />

      <h2>محاسبه ظرفیت: یک مثال واقعی</h2>
      <p>
        فرض کنید نودی با ظرفیت قابل تخصیص <Ltr>2 CPU</Ltr> و <Ltr>4Gi</Ltr>{' '}
        داریم. هر پاد <Ltr>shop-api</Ltr> با request برابر <Ltr>250m</Ltr> و{' '}
        <Ltr>256Mi</Ltr> تعریف شده است. زمان‌بند بر اساس requests حساب می‌کند:
      </p>
      <ul>
        <li>
          از نظر <Ltr>CPU</Ltr>: حداکثر ۸ پاد در این نود جا می‌شود.
        </li>
        <li>
          از نظر حافظه: حداکثر ۱۶ پاد در این نود جا می‌شود.
        </li>
        <li>
          گلوگاه <Ltr>CPU</Ltr> است، پس سقف عملی ۸ پاد است.
        </li>
      </ul>
      <p>
        اما مصرف واقعی می‌تواند تا limit یعنی <Ltr>500m</Ltr> و <Ltr>512Mi</Ltr>{' '}
        بالا برود. اگر همه ۸ پاد همزمان به سقف برسند، <Ltr>CPU</Ltr> نود اشباع
        می‌شود و همه کند می‌شوند. به همین دلیل requests را از مصرف واقعی و
        limits را با فاصله معقول انتخاب کنید.
      </p>

      <DeepDive title="جزئیات فنی: cgroup، throttle و OOM">
        <DeepDiveSection title="CPU limit چطور اعمال می‌شود؟">
          <p>
            کوبرنتیز از <Ltr>cgroup</Ltr> استفاده می‌کند. limit برای{' '}
            <Ltr>CPU</Ltr> به سهمیه دوره‌ای <Ltr>CFS</Ltr> تبدیل می‌شود؛ اگر
            کانتینر در یک دوره بیشتر از سهمیه مصرف کند، تا دوره بعد throttle
            می‌شود. این throttle در متریک <Ltr>container_cpu_cfs_throttled_seconds_total</Ltr>{' '}
            دیده می‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="حافظه و OOM score">
          <p>
            limit حافظه سقف <Ltr>cgroup</Ltr> است. عبور از آن باعث{' '}
            <Ltr>OOMKilled</Ltr> می‌شود. کرنل برای انتخاب قربانی از{' '}
            <Ltr>oom_score_adj</Ltr> استفاده می‌کند که با کلاس QoS و مصرف
            نسبت به request تنظیم می‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="overcommit و requests">
          <p>
            مجموع requests پادهای یک نود از ظرفیت آن بیشتر نمی‌شود، اما مجموع
            limits می‌تواند بیشتر باشد. این یعنی ظرفیت اشتراکی؛ اگر همه پادها
            همزمان به limit برسند، فشار واقعی روی نود زیاد می‌شود. برنامه‌ریزی
            ظرفیت باید بر اساس مصرف واقعی و نه فقط requests باشد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="HPA و VPA">
          <p>
            <Ltr>HorizontalPodAutoscaler</Ltr> تعداد replica را بر اساس مصرف
            تنظیم می‌کند و به metrics-server وابسته است.{' '}
            <Ltr>VerticalPodAutoscaler</Ltr> مقدار requests و limits را پیشنهاد
            یا اصلاح می‌کند. هیچ‌کدام جای اندازه‌گیری اولیه و تعریف منابع
            معنادار را نمی‌گیرند.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="بدون requests پاد نسازید">
        پاد بدون request برای زمان‌بند «بی‌وزن» است و می‌تواند نود را پر کند.
        در فشار حافظه هم اولین قربانی است. حداقل یک request واقعی برای هر
        کانتینر تعریف کنید.
      </Callout>
      <Callout variant="warning" title="limit حافظه را خیلی کم نگذارید">
        اگر limit را نزدیک مصرف عادی بگذارید، یک جهش کوچک باعث{' '}
        <Ltr>OOMKilled</Ltr> و ری‌استارت می‌شود. limit را با حاشیه امن و بر
        اساس رفتار واقعی برنامه انتخاب کنید.
      </Callout>
      <Callout variant="danger" title="CPU limit را بی‌دلیل سخت نکنید">
        limit خیلی کم برای <Ltr>CPU</Ltr> باعث throttle شدید و افزایش تأخیر
        می‌شود، بدون اینکه کانتینر کشته شود. برای سرویس‌های حساس، throttle را
        در مانیتورینگ بررسی کنید.
      </Callout>
      <Callout variant="warning" title="همه جا request برابر limit نگذارید">
        این کار کلاس <Ltr>Guaranteed</Ltr> می‌دهد، اما ظرفیت را کم‌بازده
        می‌کند. فقط برای بارهایی که پیش‌بینی‌پذیری مهم‌تر از بهره‌وری است این
        کار را انجام دهید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <p>
        <Ltr>requests</Ltr> برای زمان‌بندی و رزرو ظرفیت است و <Ltr>limits</Ltr>{' '}
        سقف واقعی مصرف. <Ltr>CPU</Ltr> با throttle محدود می‌شود و حافظه با{' '}
        <Ltr>OOMKilled</Ltr>. کلاس <Ltr>QoS</Ltr> ترتیب تخلیه را تعیین می‌کند،{' '}
        <Ltr>LimitRange</Ltr> پیش‌فرض و سقف هر کانتینر را می‌سازد و{' '}
        <Ltr>ResourceQuota</Ltr> سقف کل namespace را. با این ابزارها می‌توانید
        مطمئن شوید یک تیم نمی‌تواند ظرفیت بقیه را بخورد. در درس بعدی سراغ
        انواع بارکاری می‌رویم: کِی <Ltr>Deployment</Ltr> کافی است و کِی به{' '}
        <Ltr>StatefulSet</Ltr>، <Ltr>DaemonSet</Ltr>، <Ltr>Job</Ltr> یا{' '}
        <Ltr>CronJob</Ltr> نیاز داریم.
      </p>
    </>
  )
}
