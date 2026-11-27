import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { RequestPathExplainer } from '../../components/simulators/RequestPathExplainer'

const deploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: shop
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shop-api
  template:
    metadata:
      labels:
        app: shop-api
    spec:
      containers:
        - name: api
          image: registry.local/shop-api:1.4.0
          ports:
            - containerPort: 8080`

const traceCommands = `# ۱. آیا شیء Deployment ساخته شد؟
kubectl get deployment shop-api -n shop -o wide

# ۲. ReplicaSet و پادهای تحت مالکیت آن
kubectl get replicaset,pods -n shop -l app=shop-api -o wide

# ۳. اگر پاد Pending مانده، رویدادهای scheduler را ببینید
kubectl describe pod shop-api-6d9f7c8b5d-4kx2p -n shop

# ۴. رویدادهای کل namespace به ترتیب زمان
kubectl get events -n shop --sort-by=.lastTimestamp

# ۵. لاگ کانتینر و وضعیت restart
kubectl logs shop-api-6d9f7c8b5d-4kx2p -n shop
kubectl get pod shop-api-6d9f7c8b5d-4kx2p -n shop \\
  -o jsonpath='{.status.containerStatuses[*].restartCount}'`

const ownershipOutput = `$ kubectl get pod shop-api-6d9f7c8b5d-4kx2p -n shop \\
    -o jsonpath='{.metadata.ownerReferences[0].kind}/{.metadata.ownerReferences[0].name}'
ReplicaSet/shop-api-6d9f7c8b5d

$ kubectl get replicaset shop-api-6d9f7c8b5d -n shop \\
    -o jsonpath='{.metadata.ownerReferences[0].kind}/{.metadata.ownerReferences[0].name}'
Deployment/shop-api`

export function KubernetesRequestPathContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در دو درس قبل اجزای کلاستر را شناختیم و دیدیم که کوبرنتیز وضعیت مطلوب را
        به واقعیت تبدیل می‌کند. اما این تبدیل در یک لحظه اتفاق نمی‌افتد؛ یک زنجیره
        از رویدادهاست که هر کدام یک شیء را تغییر می‌دهد. در این درس همان سناریوی
        بازارک را ادامه می‌دهیم: فایل <Ltr>shop-api-deployment.yaml</Ltr> با{' '}
        <Ltr>replicas: 3</Ltr> را اجرا می‌کنیم و قدم‌به‌قدم می‌بینیم چطور از یک
        فایل روی لپ‌تاپ شما به سه کانتینر در حال اجرا روی دو نود می‌رسیم. اگر
        بدانید هر گام کدام جزء را درگیر می‌کند، عیب‌یابی هم بسیار ساده‌تر می‌شود.
      </p>

      <h2>یک درخواست، سه پرسش</h2>
      <p>
        وقتی <Ltr>kubectl apply</Ltr> را اجرا می‌کنید، در واقع سه پرسش پشت سر هم
        پاسخ داده می‌شود:
      </p>
      <ul>
        <li>
          <strong>چه چیزی باید وجود داشته باشد؟</strong> این را شما در{' '}
          <Ltr>spec</Ltr> نوشته‌اید: یک <Ltr>Deployment</Ltr> با سه نسخه.
        </li>
        <li>
          <strong>چه کسی این خواسته را ثبت و هماهنگ می‌کند؟</strong> این کار{' '}
          <Ltr>kube-apiserver</Ltr> و <Ltr>etcd</Ltr> است.
        </li>
        <li>
          <strong>چه کسی آن را واقعی می‌کند؟</strong> کنترلرها،{' '}
          <Ltr>kube-scheduler</Ltr> و در نهایت <Ltr>kubelet</Ltr> و{' '}
          <Ltr>container runtime</Ltr> روی نودها.
        </li>
      </ul>
      <p>
        نکتهٔ کلیدی این است که هیچ‌کدام از این اجزا دستور مستقیم به دیگری نمی‌دهد.
        همه فقط وضعیت را در <Ltr>etcd</Ltr> می‌خوانند و تغییر می‌دهند، و همهٔ این
        خواندن و نوشتن از دروازهٔ <Ltr>kube-apiserver</Ltr> عبور می‌کند.
      </p>

      <h2>مانیفستی که مسیر را شروع می‌کند</h2>
      <p>
        برای این درس همین مانیفست کوتاه کافی است. بقیهٔ فیلدها مثل probe و منابع
        را در درس‌های بعدی اضافه می‌کنیم تا تمرکز روی مسیر درخواست بماند:
      </p>
      <CodeBlock
        code={deploymentYaml}
        language="yaml"
        filename="shop-api-deployment.yaml"
      />

      <h2>مسیر گام‌به‌گام یک درخواست</h2>
      <p>
        در توضیح تعاملی زیر، هر گام یک رویداد واقعی است: یک نوشتن در{' '}
        <Ltr>etcd</Ltr>، یک تصمیم زمان‌بندی یا یک گزارش وضعیت. رنگ{' '}
        <strong>primary</strong> نشان می‌دهد همین حالا کدام جزء فعال است و رنگ{' '}
        <strong>emerald</strong> یعنی آن گام با موفقیت تمام شده. به گام{' '}
        <strong>۴</strong> دقت کنید: پادها ساخته شده‌اند اما هنوز{' '}
        <Ltr>Pending</Ltr> هستند؛ این همان جایی است که اکثر افراد فکر می‌کنند
        کلاستر خراب است، در حالی که فقط scheduler هنوز تصمیم نگرفته است.
      </p>
      <RequestPathExplainer />

      <h2>هر جزء چه چیزی را تغییر می‌دهد؟</h2>
      <p>
        اگر این جدول را به خاطر بسپارید، هنگام عیب‌یابی می‌دانید سراغ کدام جزء و
        کدام شیء بروید:
      </p>
      <table>
        <thead>
          <tr>
            <th>جزء</th>
            <th>چه چیزی را می‌خواند</th>
            <th>چه چیزی را می‌نویسد</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>kubectl</Ltr></td>
            <td>فایل محلی و پاسخ API</td>
            <td>درخواست HTTP به <Ltr>kube-apiserver</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>kube-apiserver</Ltr></td>
            <td>درخواست، قواعد مجوز و وضعیت فعلی</td>
            <td>اشیاء در <Ltr>etcd</Ltr> و پاسخ به کلاینت</td>
          </tr>
          <tr>
            <td><Ltr>kube-controller-manager</Ltr></td>
            <td>تغییرات <Ltr>Deployment</Ltr> و <Ltr>ReplicaSet</Ltr></td>
            <td>ساخت <Ltr>ReplicaSet</Ltr> و <Ltr>Pod</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>kube-scheduler</Ltr></td>
            <td>پادهای بدون <Ltr>nodeName</Ltr> و منابع نودها</td>
            <td>فیلد <Ltr>spec.nodeName</Ltr> پاد</td>
          </tr>
          <tr>
            <td><Ltr>kubelet</Ltr></td>
            <td>پادهای تخصیص‌یافته به نود خودش</td>
            <td>وضعیت کانتینر و پاد</td>
          </tr>
          <tr>
            <td><Ltr>containerd</Ltr></td>
            <td>دستور اجرای کانتینر از <Ltr>kubelet</Ltr></td>
            <td>ایمیج و فرآیند در حال اجرا</td>
          </tr>
          <tr>
            <td><Ltr>kube-proxy</Ltr></td>
            <td><Ltr>Service</Ltr> و <Ltr>Endpoints</Ltr></td>
            <td>قواعد <Ltr>iptables</Ltr> یا <Ltr>IPVS</Ltr> روی نود</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="info" title="مالکیت پادها زنجیره‌ای است">
        هر پاد یک <Ltr>ownerReference</Ltr> به <Ltr>ReplicaSet</Ltr> دارد و هر{' '}
        <Ltr>ReplicaSet</Ltr> به <Ltr>Deployment</Ltr>. به همین دلیل حذف{' '}
        <Ltr>Deployment</Ltr> کل زنجیره را با خودش می‌برد. می‌توانید این زنجیره را
        با <Ltr>jsonpath</Ltr> ببینید:
      </Callout>
      <CodeBlock code={ownershipOutput} language="bash" filename="bash" />

      <h2>وقتی مسیر جایی گیر می‌کند</h2>
      <p>
        هر گام از این مسیر می‌تواند شکست بخورد و نشانهٔ آن در یک شیء یا رویداد
        مشخص دیده می‌شود. این جدول کوتاه، نقشهٔ عیب‌یابی شماست:
      </p>
      <table>
        <thead>
          <tr>
            <th>نشانه</th>
            <th>گام شکسته</th>
            <th>اولین جای بررسی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>هیچ <Ltr>Deployment</Ltr> ساخته نمی‌شود</td>
            <td>درخواست رد شده است</td>
            <td>خطای <Ltr>kubectl</Ltr> و رویداد <Ltr>admission</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>ReplicaSet</Ltr> ساخته شده اما پاد نیست</td>
            <td>کنترلر ReplicaSet</td>
            <td><Ltr>kubectl describe replicaset</Ltr></td>
          </tr>
          <tr>
            <td>پاد در <Ltr>Pending</Ltr> مانده است</td>
            <td><Ltr>scheduler</Ltr> نودی پیدا نکرده</td>
            <td>رویداد <Ltr>FailedScheduling</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>ImagePullBackOff</Ltr></td>
            <td><Ltr>kubelet</Ltr> یا <Ltr>containerd</Ltr></td>
            <td>نام ایمیج، دسترسی registry و <Ltr>imagePullSecrets</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>CrashLoopBackOff</Ltr></td>
            <td>خود برنامه</td>
            <td><Ltr>kubectl logs</Ltr> و <Ltr>restartCount</Ltr></td>
          </tr>
          <tr>
            <td>پاد <Ltr>Running</Ltr> است اما ترافیک نمی‌رسد</td>
            <td><Ltr>readinessProbe</Ltr> یا <Ltr>Service</Ltr></td>
            <td><Ltr>Endpoints</Ltr> و <Ltr>selector</Ltr></td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={traceCommands} language="bash" filename="bash" />

      <DeepDive title="پشت صحنه: watch، resourceVersion و همزمانی">
        <DeepDiveSection title="watch به‌جای polling">
          <p>
            اجزای کنترل‌پلین هر چند ثانیه یک‌بار وضعیت را نمی‌پرسند. آن‌ها یک
            اتصال <Ltr>watch</Ltr> به <Ltr>kube-apiserver</Ltr> باز می‌کنند و
            جریان تغییرات را دریافت می‌کنند. این کار واکنش را سریع و بار روی API
            را کم می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="resourceVersion و به‌روزرسانی خوش‌بینانه">
          <p>
            هر شیء یک <Ltr>resourceVersion</Ltr> دارد. وقتی می‌خواهید شیئی را
            تغییر دهید، نسخه‌ای که خوانده‌اید همراه درخواست می‌رود. اگر کس دیگری
            در این فاصله آن را تغییر داده باشد، سرور درخواست شما را با خطای
            <Ltr>Conflict</Ltr> رد می‌کند تا تغییر او را بازنویسی نکنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="admission webhook">
          <p>
            پیش از ذخیره شدن شیء، <Ltr>admission</Ltr> می‌تواند آن را تغییر دهد
            (mutating) یا رد کند (validating). محدودیت‌هایی مثل{' '}
            <Ltr>ResourceQuota</Ltr>، تزریق sidecar و سیاست‌های امنیتی معمولاً
            همین‌جا اعمال می‌شوند، نه در کنترلرها.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا scheduler پاد را اجرا نمی‌کند؟">
          <p>
            <Ltr>kube-scheduler</Ltr> فقط یک فیلد را می‌نویسد:{' '}
            <Ltr>spec.nodeName</Ltr>. این جداسازی عمدی است تا تصمیم‌گیری و اجرا
            مستقل مقیاس شوند. اگر scheduler از کار بیفتد، پادهای در حال اجرا
            ادامه می‌دهند اما پاد جدید جایی نمی‌گیرد.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="Pending همیشه خرابی نیست">
        وقتی پاد تازه ساخته می‌شود، چند ثانیه <Ltr>Pending</Ltr> می‌ماند. این
        طبیعی است. فقط اگر بیش از حد طول کشید یا رویداد{' '}
        <Ltr>FailedScheduling</Ltr> دیدید، مشکل زمان‌بندی دارید.
      </Callout>
      <Callout variant="warning" title="Running به معنی آماده نیست">
        <Ltr>Running</Ltr> فقط می‌گوید کانتینر اجرا شده است. تا وقتی{' '}
        <Ltr>readinessProbe</Ltr> موفق نشود، پاد در <Ltr>Endpoints</Ltr> سرویس
        قرار نمی‌گیرد و ترافیک نمی‌گیرد.
      </Callout>
      <Callout variant="danger" title="kubectl apply را با kubectl create اشتباه نگیرید">
        <Ltr>create</Ltr> فقط یک‌بار شیء را می‌سازد و در اجرای بعدی خطا می‌دهد.{' '}
        <Ltr>apply</Ltr> وضعیت مطلوب را با وضعیت فعلی مقایسه و به‌روزرسانی
        می‌کند؛ همین رفتار آن را برای فایل‌های نسخه‌بندی‌شده مناسب می‌کند.
      </Callout>

      <h2>جمع‌بندی</h2>
      <p>
        یک <Ltr>kubectl apply</Ltr> فقط یک درخواست HTTP است که{' '}
        <Ltr>kube-apiserver</Ltr> آن را اعتبارسنجی و در <Ltr>etcd</Ltr> ثبت
        می‌کند. از آن لحظه، کنترلرها شیءهای پایین‌دست را می‌سازند،{' '}
        <Ltr>scheduler</Ltr> هر پاد را به یک نود می‌بندد و <Ltr>kubelet</Ltr> با
        کمک <Ltr>containerd</Ltr> آن را اجرا می‌کند. در درس بعد سراغ خود ابزار
        می‌رویم: ساختار <Ltr>YAML</Ltr>، فیلدهای ثابت هر مانیفست و دستورهای{' '}
        <Ltr>kubectl</Ltr> که در این مسیر بیشترین استفاده را دارند.
      </p>
    </>
  )
}
