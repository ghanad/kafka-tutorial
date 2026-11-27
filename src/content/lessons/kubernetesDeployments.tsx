import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const deploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: shop
spec:
  replicas: 4
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      # حداکثر یک پاد اضافه در طول به‌روزرسانی
      maxSurge: 1
      # حداکثر یک پاد کمتر از تعداد مطلوب
      maxUnavailable: 1
  selector:
    matchLabels:
      app: shop-api
  template:
    metadata:
      labels:
        app: shop-api
        version: "1.4.0"
    spec:
      containers:
        - name: api
          image: registry.local/shop-api:1.4.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            periodSeconds: 5`

const rolloutCommands = `# اعمال نسخه جدید؛ فقط ایمیج را عوض می‌کنیم
kubectl set image deployment/shop-api \\
  api=registry.local/shop-api:1.5.0 -n shop

# دنبال کردن به‌روزرسانی تا پایان
kubectl rollout status deployment/shop-api -n shop

# دیدن تاریخچه نسخه‌ها
kubectl rollout history deployment/shop-api -n shop

# بازگشت به نسخه قبلی
kubectl rollout undo deployment/shop-api -n shop

# بازگشت به یک revision مشخص
kubectl rollout undo deployment/shop-api -n shop --to-revision=2`

const scaleCommands = `# افزایش ظرفیت از ۴ به ۱۰ پاد
kubectl scale deployment/shop-api --replicas=10 -n shop

# بررسی نتیجه
kubectl get deployment shop-api -n shop
kubectl get pods -n shop -l app=shop-api

# دیدن ReplicaSetهایی که Deployment ساخته است
kubectl get replicaset -n shop -l app=shop-api`

const pauseResumeCommands = `# توقف موقت rollout برای بررسی دستی وضعیت
kubectl rollout pause deployment/shop-api -n shop

# ادامه دادن rollout متوقف‌شده
kubectl rollout resume deployment/shop-api -n shop

# دیدن وضعیت دقیق rollout
kubectl describe deployment shop-api -n shop`

export function KubernetesDeploymentsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس پاد دیدیم که یک پاد دستی شکننده است: اگر حذف شود، کسی جایش را پر
        نمی‌کند. حالا وقت آن است که لایه‌ای بالاتر برویم. <Ltr>Deployment</Ltr>{' '}
        همان چیزی است که <Ltr>shop-api</Ltr> را همیشه در تعداد مشخصی پاد نگه
        می‌دارد، بدون قطعی به نسخه جدید می‌برد و در صورت مشکل یک دستور آن را
        برمی‌گرداند.
      </p>

      <h2>Deployment، ReplicaSet و پاد: سه لایه روی هم</h2>
      <p>
        رابطه این سه شیء سلسله‌مراتبی است. <Ltr>Deployment</Ltr> یک{' '}
        <Ltr>ReplicaSet</Ltr> می‌سازد، و <Ltr>ReplicaSet</Ltr> مسئول نگه‌داشتن
        تعداد مشخصی پاد است:
      </p>
      <ul>
        <li>
          <strong><Ltr>Deployment</Ltr>:</strong> نسخه‌ها، به‌روزرسانی تدریجی و
          بازگشت را مدیریت می‌کند.
        </li>
        <li>
          <strong><Ltr>ReplicaSet</Ltr>:</strong> فقط یک کار دارد؛ تعداد پادهای
          هم‌برچسب را با عدد مطلوب برابر نگه می‌دارد.
        </li>
        <li>
          <strong><Ltr>Pod</Ltr>:</strong> واحد واقعی اجرا که در درس قبل ساختیم.
        </li>
      </ul>
      <p>
        هر بار ایمیج را عوض کنید، <Ltr>Deployment</Ltr> یک <Ltr>ReplicaSet</Ltr>{' '}
        تازه می‌سازد و پادهای قدیمی را آرام‌آرام با پادهای جدید جایگزین می‌کند.
        <Ltr>ReplicaSet</Ltr> قدیمی حذف نمی‌شود تا امکان بازگشت وجود داشته باشد.
      </p>

      <h2>labels و selector: Deployment چطور پادهایش را پیدا می‌کند؟</h2>
      <p>
        <Ltr>Deployment</Ltr> پادها را با برچسب پیدا می‌کند، نه با نام. در فایل
        زیر <Ltr>selector.matchLabels</Ltr> می‌گوید «پادهایی که برچسب{' '}
        <Ltr>app: shop-api</Ltr> دارند مال من هستند» و <Ltr>template</Ltr> همان
        برچسب را روی پادهای تازه می‌گذارد. این دو باید دقیقاً هم‌خوان باشند،
        وگرنه Deployment هیچ پادی پیدا نمی‌کند.
      </p>
      <CodeBlock code={deploymentYaml} language="yaml" filename="shop-api-deployment.yaml" />
      <Callout variant="info" title="چرا برچسب و نه نام؟">
        نام پادها تصادفی و متغیر است؛ مثلاً{' '}
        <Ltr>shop-api-6d9f7c8b5d-4kx2p</Ltr>. برچسب پایدار است و به{' '}
        <Ltr>Service</Ltr> هم اجازه می‌دهد همان مجموعه پادها را پیدا کند. به
        همین دلیل برچسب‌ها در کوبرنتیز نقش کلید اتصال را بازی می‌کنند.
      </Callout>

      <h2>به‌روزرسانی تدریجی: جایگزینی بدون قطعی</h2>
      <p>
        استراتژی پیش‌فرض <Ltr>RollingUpdate</Ltr> است. کوبرنتیز چند پاد جدید
        بالا می‌آورد، منتظر می‌ماند <Ltr>readinessProbe</Ltr> آن‌ها سبز شود،
        بعد پادهای قدیمی را یکی‌یکی پایین می‌آورد. دو پارامتر این روند را کنترل
        می‌کنند:
      </p>
      <table>
        <thead>
          <tr>
            <th>پارامتر</th>
            <th>معنی</th>
            <th>در سناریوی ۴ پاد</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>maxSurge</Ltr></td>
            <td>چند پاد بیشتر از تعداد مطلوب مجاز است</td>
            <td>حداکثر ۵ پاد همزمان</td>
          </tr>
          <tr>
            <td><Ltr>maxUnavailable</Ltr></td>
            <td>چند پاد کمتر از تعداد مطلوب مجاز است</td>
            <td>حداقل ۳ پاد آماده در هر لحظه</td>
          </tr>
        </tbody>
      </table>
      <p>
        حالا نسخه <Ltr>1.4.0</Ltr> را با <Ltr>1.5.0</Ltr> عوض می‌کنیم و روند
        را دنبال می‌کنیم:
      </p>
      <CodeBlock code={rolloutCommands} language="bash" filename="bash" />
      <Callout variant="tip" title="readinessProbe ستون فقرات rollout است">
        اگر <Ltr>readinessProbe</Ltr> نداشته باشید، کوبرنتیز پاد جدید را به‌محض
        اجرا شدن «آماده» فرض می‌کند و ممکن است پیش از بالا آمدن کامل، ترافیک را
        به آن بفرستد. بدون probe، به‌روزرسانی تدریجی فقط یک آرزو است.
      </Callout>

      <h2>Recreate یا RollingUpdate؟</h2>
      <p>
        <Ltr>Deployment</Ltr> دو استراتژی دارد. انتخاب اشتباه می‌تواند یا باعث
        قطعی شود یا دو نسخه ناسازگار را همزمان اجرا کند:
      </p>
      <table>
        <thead>
          <tr>
            <th>استراتژی</th>
            <th>رفتار</th>
            <th>کِی مناسب است؟</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>RollingUpdate</Ltr></td>
            <td>پادها پله‌پله جایگزین می‌شوند؛ دو نسخه همزمان دیده می‌شود</td>
            <td>سرویس‌های بدون قطعی با سازگاری نسخه‌ها</td>
          </tr>
          <tr>
            <td><Ltr>Recreate</Ltr></td>
            <td>همه پادهای قدیمی اول حذف می‌شوند، بعد پادهای جدید می‌آیند</td>
            <td>وقتی دو نسخه نباید همزمان اجرا شوند</td>
          </tr>
        </tbody>
      </table>
      <p>
        برای <Ltr>shop-api</Ltr> که یک <Ltr>API</Ltr> بدون حالت است،{' '}
        <Ltr>RollingUpdate</Ltr> انتخاب درست است. اما اگر مهاجرت دیتابیس دارید
        که فقط با نسخه جدید سازگار است، ممکن است لحظه‌ای دو نسخه همزمان ترافیک
        بگیرند و مشکل بسازند؛ در چنین حالتی یا مهاجرت سازگار با هر دو نسخه
        بنویسید یا از <Ltr>Recreate</Ltr> استفاده کنید.
      </p>

      <h2>مقیاس‌دهی: یک عدد، چند پاد</h2>
      <p>
        افزایش ظرفیت فقط تغییر <Ltr>replicas</Ltr> است. <Ltr>Deployment</Ltr>{' '}
        فوراً پادهای اضافه را می‌سازد و <Ltr>ReplicaSet</Ltr> تعداد را نگه
        می‌دارد:
      </p>
      <CodeBlock code={scaleCommands} language="bash" filename="bash" />
      <p>
        در محیط واقعی معمولاً به‌جای دستور دستی از <Ltr>HorizontalPodAutoscaler</Ltr>{' '}
        استفاده می‌شود که بر اساس مصرف <Ltr>CPU</Ltr> یا معیارهای دیگر تعداد
        replicaها را خودش تنظیم می‌کند. اما حتی در آن حالت هم پایه کار همان
        عدد <Ltr>replicas</Ltr> است.
      </p>

      <h2>کنترل دستی rollout</h2>
      <p>
        گاهی می‌خواهید به‌روزرسانی را وسط راه متوقف کنید تا وضعیت را بررسی
        کنید. <Ltr>pause</Ltr> و <Ltr>resume</Ltr> برای همین‌اند:
      </p>
      <CodeBlock code={pauseResumeCommands} language="bash" filename="bash" />

      <DeepDive title="جزئیات فنی: revisionها و hash در ReplicaSet">
        <DeepDiveSection title="نام ReplicaSet از کجا می‌آید؟">
          <p>
            <Ltr>Deployment</Ltr> از روی قالب پاد یک هش محاسبه می‌کند و آن را
            به نام <Ltr>ReplicaSet</Ltr> می‌چسباند؛ مثلاً{' '}
            <Ltr>shop-api-6d9f7c8b5d</Ltr>. هر تغییر در قالب پاد، هش تازه و
            در نتیجه <Ltr>ReplicaSet</Ltr> تازه می‌سازد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="revisionHistoryLimit">
          <p>
            هر <Ltr>ReplicaSet</Ltr> قدیمی یک revision برای بازگشت است.{' '}
            <Ltr>revisionHistoryLimit</Ltr> تعیین می‌کند چند revision نگه داشته
            شود؛ پیش‌فرض ۱۰ است. اگر آن را صفر کنید، امکان{' '}
            <Ltr>rollout undo</Ltr> را از دست می‌دهید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا undo فوراً جادو نمی‌کند؟">
          <p>
            <Ltr>undo</Ltr> قالب پاد نسخه قبلی را دوباره اعمال می‌کند، اما
            همچنان از همان مسیر <Ltr>RollingUpdate</Ltr> عبور می‌کند. یعنی
            بازگشت هم پله‌پله است و به <Ltr>readinessProbe</Ltr> وابسته است.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="selector و template باید هم‌خوان باشند">
        اگر برچسب <Ltr>template</Ltr> با <Ltr>selector.matchLabels</Ltr> یکی
        نباشد، <Ltr>Deployment</Ltr> پادهایش را پیدا نمی‌کند و مدام پاد جدید
        می‌سازد یا خطای اعتبارسنجی می‌دهد. این برچسب‌ها را با دقت و یکسان نگه
        دارید.
      </Callout>
      <Callout variant="warning" title="تگ latest را در محیط واقعی استفاده نکنید">
        اگر ایمیج را با تگ <Ltr>latest</Ltr> بگذارید، <Ltr>rollout undo</Ltr> و
        تشخیص نسخه بی‌معنا می‌شود؛ چون همه پادها همان تگ مبهم را دارند. از تگ
        نسخه‌دار مثل <Ltr>shop-api:1.5.0</Ltr> استفاده کنید.
      </Callout>
      <Callout variant="danger" title="پاد دستی نسازید و انتظار مدیریت داشته باشید">
        پادی که خودتان با <Ltr>kubectl run</Ltr> ساخته‌اید تحت کنترل{' '}
        <Ltr>Deployment</Ltr> نیست. اگر می‌خواهید کوبرنتیز آن را بازسازی، مقیاس
        و به‌روزرسانی کند، باید از ابتدا از طریق <Ltr>Deployment</Ltr> ساخته
        شود.
      </Callout>

      <h2>جمع‌بندی</h2>
      <p>
        <Ltr>Deployment</Ltr> لایه‌ای است که پادها را پایدار و قابل مدیریت
        می‌کند: با <Ltr>ReplicaSet</Ltr> تعداد را نگه می‌دارد، با{' '}
        <Ltr>RollingUpdate</Ltr> بدون قطعی نسخه عوض می‌کند و با{' '}
        <Ltr>rollout undo</Ltr> به عقب برمی‌گردد. برچسب‌ها این زنجیره را به هم
        وصل می‌کنند و <Ltr>readinessProbe</Ltr> تضمین می‌کند پاد تازه فقط وقتی
        ترافیک بگیرد که واقعاً آماده است.
      </p>
    </>
  )
}
