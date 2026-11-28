import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const namespaceYaml = `apiVersion: v1
kind: Namespace
metadata:
  name: shop
  labels:
    team: commerce
    environment: production
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: shop
  labels:
    app.kubernetes.io/name: shop-api
    app.kubernetes.io/part-of: shop
  annotations:
    owner: team-commerce
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: shop-api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: shop-api
        app.kubernetes.io/version: "1.5.0"
    spec:
      containers:
        - name: api
          image: registry.local/shop-api:1.5.0
          ports:
            - containerPort: 8080`

const namespaceCommands = `# ساخت namespace و دیدن فهرست آن‌ها
kubectl create namespace shop
kubectl get namespaces

# تنظیم namespace پیش‌فرض برای context فعلی
kubectl config set-context --current --namespace=shop

# دیدن منابع فقط در یک namespace یا در همه آن‌ها
kubectl get pods -n shop
kubectl get pods -A

# اعمال فایل بالا
kubectl apply -f shop-namespace.yaml`

const labelCommands = `# انتخاب با برابری ساده
kubectl get pods -n shop -l app.kubernetes.io/name=shop-api

# انتخاب مجموعه‌ای: مقدار یکی از دو گزینه باشد
kubectl get pods -n shop -l 'environment in (production,staging)'

# انتخاب مجموعه‌ای: برچسب tier مقدار cache نداشته باشد
kubectl get pods -n shop -l 'tier!=cache'

# دیدن برچسب‌ها و annotationهای یک منبع
kubectl get deployment shop-api -n shop --show-labels
kubectl describe deployment shop-api -n shop

# افزودن یا تغییر برچسب و annotation
kubectl label deployment/shop-api -n shop tier=api
kubectl annotate deployment/shop-api -n shop owner=team-commerce --overwrite`

const selectorYaml = `spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: shop-api
    matchExpressions:
      - key: environment
        operator: In
        values:
          - production
          - staging
      - key: tier
        operator: NotIn
        values:
          - cache`

export function KubernetesNamespacesLabelsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا پاد و <Ltr>Deployment</Ltr> را در یک فضای ساده ساختیم. اما در
        یک کلاستر واقعی چند تیم، چند محیط و ده‌ها سرویس کنار هم زندگی می‌کنند.
        کوبرنتیز برای جدا کردن این فضاها از <strong>Namespace</strong> و برای
        پیدا کردن و گروه‌بندی منابع از <strong>Label</strong> و{' '}
        <strong>Selector</strong> استفاده می‌کند. در این درس پلتفرم فروشگاه را
        به namespace مستقل <Ltr>shop</Ltr> منتقل می‌کنیم و می‌بینیم چرا برچسب‌ها
        کلید اتصال اجزای کوبرنتیز هستند.
      </p>

      <h2>Namespace چیست و چه چیزی را جدا می‌کند؟</h2>
      <p>
        <Ltr>Namespace</Ltr> یک محدوده منطقی برای نام منابع است. وقتی می‌گویید{' '}
        <Ltr>kubectl get pods -n shop</Ltr>، فقط پادهای همان namespace را
        می‌بینید. نام منابع در هر namespace باید یکتا باشد، اما دو namespace
        می‌توانند هر دو یک <Ltr>Deployment</Ltr> به نام <Ltr>shop-api</Ltr>
        داشته باشند. کلاستر به‌طور پیش‌فرض چند namespace آماده دارد:
      </p>
      <ul>
        <li>
          <strong><Ltr>default</Ltr>:</strong> جایی که منابع بدون namespace در
          آن ساخته می‌شوند.
        </li>
        <li>
          <strong><Ltr>kube-system</Ltr>:</strong> اجزای خود کلاستر مثل{' '}
          <Ltr>CoreDNS</Ltr> و <Ltr>kube-proxy</Ltr>.
        </li>
        <li>
          <strong><Ltr>kube-public</Ltr> و <Ltr>kube-node-lease</Ltr>:</strong>{' '}
          namespaceهای سیستمی که معمولاً دست نمی‌زنید.
        </li>
      </ul>
      <p>
        برای پلتفرم فروشگاه یک namespace اختصاصی می‌سازیم و همه منابع را داخل
        آن می‌گذاریم:
      </p>
      <CodeBlock code={namespaceYaml} language="yaml" filename="shop-namespace.yaml" />
      <CodeBlock code={namespaceCommands} language="bash" filename="bash" />
      <Callout variant="info" title="Namespace جداسازی شبکه نیست">
        دو پاد در دو namespace مختلف همچنان می‌توانند با <Ltr>IP</Ltr> یا نام
        سرویس کامل به هم وصل شوند، مگر اینکه <Ltr>NetworkPolicy</Ltr> جلوی آن
        را بگیرد. <Ltr>Namespace</Ltr> فقط نام‌ها، دسترسی‌ها و سهمیه‌ها را جدا
        می‌کند.
      </Callout>

      <h2>Label، Selector و Annotation: سه ابزار با سه نقش</h2>
      <p>
        <Ltr>Label</Ltr> یک جفت کلید و مقدار کوتاه است که برای انتخاب منابع به
        کار می‌رود. <Ltr>Selector</Ltr> یک شرط روی برچسب‌هاست و می‌گوید «کدام
        منابع را می‌خواهم». <Ltr>Annotation</Ltr> هم جفت کلید و مقدار است، اما
        برای انتخاب استفاده نمی‌شود و جای اطلاعات تکمیلی است. تفاوت این دو را
        جدی بگیرید:
      </p>
      <table>
        <thead>
          <tr>
            <th>ویژگی</th>
            <th><Ltr>Label</Ltr></th>
            <th><Ltr>Annotation</Ltr></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>کاربرد اصلی</td>
            <td>انتخاب و گروه‌بندی منابع</td>
            <td>ثبت متادیتای غیرقابل‌جست‌وجو</td>
          </tr>
          <tr>
            <td>پشتیبانی در selector</td>
            <td>بله</td>
            <td>خیر</td>
          </tr>
          <tr>
            <td>محدودیت اندازه</td>
            <td>کلید و مقدار کوتاه (حداکثر ۶۳ کاراکتر برای بخش نام)</td>
            <td>مجموع تا حدود ۲۵۶ کیلوبایت</td>
          </tr>
          <tr>
            <td>مثال در فروشگاه</td>
            <td><Ltr>app.kubernetes.io/name=shop-api</Ltr></td>
            <td><Ltr>owner=team-commerce</Ltr></td>
          </tr>
        </tbody>
      </table>
      <p>
        در فایل قبلی، برچسب‌ها هم روی خود <Ltr>Deployment</Ltr> و هم روی قالب
        پاد آمده‌اند. برچسب روی <Ltr>metadata</Ltr> خود Deployment برای
        گروه‌بندی و ابزارهاست؛ برچسب داخل <Ltr>template.metadata</Ltr> همان
        چیزی است که <Ltr>selector</Ltr> پیدا می‌کند. اگر این دو را قاطی کنید،
        Deployment پادهایش را پیدا نمی‌کند.
      </p>

      <h2>انتخاب با برچسب در عمل</h2>
      <p>
        ساده‌ترین selector برابری است: <Ltr>key=value</Ltr>. اما کوبرنتیز
        selectorهای مجموعه‌ای هم دارد که با <Ltr>in</Ltr>، <Ltr>notin</Ltr> و{' '}
        <Ltr>exists</Ltr> کار می‌کنند:
      </p>
      <CodeBlock code={labelCommands} language="bash" filename="bash" />
      <p>
        همین منطق در manifest هم قابل استفاده است. <Ltr>matchLabels</Ltr> برای
        شرط‌های ساده و <Ltr>matchExpressions</Ltr> برای شرط‌های مجموعه‌ای است:
      </p>
      <CodeBlock code={selectorYaml} language="yaml" filename="selector.yaml" />
      <p>
        نکته مهم این است که <Ltr>selector</Ltr> یک <Ltr>Deployment</Ltr> پس از
        ساخت قابل تغییر نیست. اگر برچسب پادها را دستی عوض کنید، پاد از دید
        Deployment خارج می‌شود و کنترلر یک پاد جدید می‌سازد. برچسب‌ها را بخشی از
        قرارداد پایدار بدانید، نه چیزی که هر روز تغییر می‌کند.
      </p>

      <h2>برچسب‌گذاری استاندارد: پیشوند و نام</h2>
      <p>
        کلید برچسب می‌تواند یک پیشوند دامنه اختیاری داشته باشد؛ مثل{' '}
        <Ltr>app.kubernetes.io/name</Ltr>. پیشوند مالکیت را نشان می‌دهد و از
        تداخل تیم‌ها جلوگیری می‌کند. مجموعه برچسب‌های پیشنهادی کوبرنتیز برای
        برنامه‌ها این‌هاست:
      </p>
      <ul>
        <li>
          <Ltr>app.kubernetes.io/name</Ltr>: نام برنامه، مثل <Ltr>shop-api</Ltr>.
        </li>
        <li>
          <Ltr>app.kubernetes.io/instance</Ltr>: نمونه مشخص، مثل{' '}
          <Ltr>shop-api-prod</Ltr>.
        </li>
        <li>
          <Ltr>app.kubernetes.io/version</Ltr>: نسخه قابل خواندن، مثل{' '}
          <Ltr>1.5.0</Ltr>.
        </li>
        <li>
          <Ltr>app.kubernetes.io/part-of</Ltr>: سیستم بزرگ‌تر، مثل{' '}
          <Ltr>shop</Ltr>.
        </li>
        <li>
          <Ltr>app.kubernetes.io/managed-by</Ltr>: ابزار مدیریت، مثل{' '}
          <Ltr>helm</Ltr>.
        </li>
      </ul>
      <p>
        این نام‌ها را حفظ نکنید؛ اما اگر از یک قرارداد ثابت استفاده کنید،
        ابزارهایی مثل <Ltr>Prometheus</Ltr>، <Ltr>ArgoCD</Ltr> و داشبوردها
        می‌توانند بدون تنظیم اضافه منابع را بشناسند.
      </p>

      <h2>Annotation برای چه چیزی خوب است؟</h2>
      <p>
        هر اطلاعاتی که برای انتخاب منابع لازم نیست، جای‌اش annotation است:
      </p>
      <ul>
        <li>
          مالک و تیم پشتیبان: <Ltr>owner=team-commerce</Ltr>.
        </li>
        <li>
          تنظیمات ابزارها: <Ltr>prometheus.io/scrape=true</Ltr> یا تنظیمات{' '}
          <Ltr>Ingress</Ltr>.
        </li>
        <li>
          توضیح تغییر: <Ltr>change-cause=increase-timeout</Ltr>.
        </li>
        <li>
          آخرین manifest اعمال‌شده: <Ltr>kubectl.kubernetes.io/last-applied-configuration</Ltr>.
        </li>
      </ul>
      <p>
        ابزارها annotationها را می‌خوانند، اما خود کوبرنتیز بر اساس آن‌ها تصمیم
        نمی‌گیرد. اگر می‌خواهید چیزی روی انتخاب اثر بگذارد، باید label باشد.
      </p>

      <DeepDive title="جزئیات فنی: مرزهای namespace و قواعد برچسب">
        <DeepDiveSection title="چه منابعی namespace دارند؟">
          <p>
            بیشتر منابع مثل <Ltr>Pod</Ltr>، <Ltr>Deployment</Ltr>،{' '}
            <Ltr>Service</Ltr> و <Ltr>ConfigMap</Ltr> داخل namespace هستند. اما
            منابع کلاستری مثل <Ltr>Node</Ltr>، <Ltr>PersistentVolume</Ltr>،{' '}
            <Ltr>ClusterRole</Ltr> و <Ltr>StorageClass</Ltr> خارج از namespace
            تعریف می‌شوند. به همین دلیل <Ltr>kubectl get nodes -n shop</Ltr>{' '}
            همان فهرست همه نودها را می‌دهد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="نام سرویس بین namespaceها">
          <p>
            یک سرویس در namespace <Ltr>shop</Ltr> با نام <Ltr>shop-db</Ltr> از
            همان namespace با نام کوتاه <Ltr>shop-db</Ltr> قابل دسترسی است. از
            namespace دیگر باید نام کامل‌تر{' '}
            <Ltr>shop-db.shop.svc.cluster.local</Ltr> را به کار ببرید. این نام
            کامل را در <Ltr>ConfigMap</Ltr> بنویسید تا وابستگی پنهان نسازید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="قواعد کلید برچسب">
          <p>
            بخش نام کلید حداکثر ۶۳ کاراکتر و شامل حروف کوچک، رقم، خط تیره،
            نقطه و زیرخط است. پیشوند اختیاری باید یک نام DNS معتبر باشد. مقدار
            هم حداکثر ۶۳ کاراکتر است و می‌تواند خالی باشد. برچسب با مقدار
            خالی معتبر است، اما برای انتخاب باید با <Ltr>exists</Ltr> یا{' '}
            <Ltr>key=</Ltr> کار کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="حذف namespace">
          <p>
            حذف یک namespace همه منابع داخلش را پاک می‌کند و برگشت‌پذیر نیست.
            این حذف تا وقتی کنترلرها finalizerهایشان را بردارند در وضعیت{' '}
            <Ltr>Terminating</Ltr> می‌ماند. اگر namespace گیر کرده، به‌جای حذف
            finalizerها ابتدا منبعی را پیدا کنید که کنترلرش از کار افتاده است.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="namespace را مرز امنیتی ندانید">
        namespace به‌تنهایی ترافیک شبکه را محدود نمی‌کند. برای جداسازی واقعی به{' '}
        <Ltr>NetworkPolicy</Ltr>، <Ltr>RBAC</Ltr> و در صورت نیاز کلاسترهای جدا
        نیاز دارید.
      </Callout>
      <Callout variant="warning" title="برچسب را روی template فراموش نکنید">
        اگر برچسب را فقط روی <Ltr>metadata</Ltr> خود Deployment بگذارید و داخل{' '}
        <Ltr>template</Ltr> نگذارید، پادها آن برچسب را ندارند و{' '}
        <Ltr>selector</Ltr> هیچ پادی پیدا نمی‌کند.
      </Callout>
      <Callout variant="danger" title="برچسب‌های پرتغییر نسازید">
        برچسب‌هایی مثل شناسه درخواست یا زمان آخرین استقرار را روی پاد نگذارید.
        هر تغییر برچسب می‌تواند پاد را از مجموعه کنترلر یا سرویس خارج کند. این
        اطلاعات جای‌شان annotation است.
      </Callout>
      <Callout variant="warning" title="همه چیز را در default نگذارید">
        اگر همه تیم‌ها در <Ltr>default</Ltr> کار کنند، نام‌ها تصادم می‌کنند،
        سهمیه‌گذاری سخت می‌شود و حذف اشتباهی یک منبع می‌تواند سرویس دیگری را
        بشکند. از ابتدا namespace و قرارداد برچسب را مشخص کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <p>
        <Ltr>Namespace</Ltr> فضای نام، دسترسی و سهمیه را جدا می‌کند، اما شبکه را
        ایزوله نمی‌کند. <Ltr>Label</Ltr> و <Ltr>Selector</Ltr> زنجیره اتصال
        منابع را می‌سازند و <Ltr>Annotation</Ltr> جای اطلاعات غیرقابل‌جست‌وجوست.
        قاعده عملی ساده است: هر چیزی که کوبرنتیز یا ابزار باید با آن منبع را
        پیدا کند label است، و هر چیز دیگر annotation. در درس بعدی همین
        namespace فروشگاه را با <Ltr>ConfigMap</Ltr> و <Ltr>Secret</Ltr> برای
        پیکربندی و اطلاعات حساس آماده می‌کنیم.
      </p>
    </>
  )
}
