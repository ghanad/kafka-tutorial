import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { ManifestAnatomyExplainer } from '../../components/simulators/ManifestAnatomyExplainer'

const minimalManifest = `apiVersion: v1
kind: Pod
metadata:
  name: hello
  namespace: shop
  labels:
    app: hello
spec:
  containers:
    - name: web
      image: registry.local/hello:1.0.0
      ports:
        - containerPort: 8080`

const everydayCommands = `# ساخت یا به‌روزرسانی از فایل
kubectl apply -f shop-api-deployment.yaml

# اعمال همه فایل‌های یک پوشه
kubectl apply -f manifests/

# دیدن منابع یک namespace
kubectl get pods,deployments,services -n shop

# خروجی کامل به شکل YAML برای بازبینی فیلدها
kubectl get deployment shop-api -n shop -o yaml

# جزئیات و رویدادهای یک پاد
kubectl describe pod shop-api-6d9f7c8b5d-4kx2p -n shop

# لاگ و اجرای دستور داخل کانتینر
kubectl logs shop-api-6d9f7c8b5d-4kx2p -n shop
kubectl exec -it shop-api-6d9f7c8b5d-4kx2p -n shop -- sh

# حذف همان چیزی که از فایل ساخته شد
kubectl delete -f shop-api-deployment.yaml`

const safeCommands = `# فقط اعتبارسنجی سمت کلاینت
kubectl apply -f shop-api-deployment.yaml --dry-run=client

# اعتبارسنجی و admission سمت سرور، بدون ذخیره
kubectl apply -f shop-api-deployment.yaml --dry-run=server

# دیدن تفاوت فایل با وضعیت فعلی کلاستر
kubectl diff -f shop-api-deployment.yaml

# دیدن نسخه‌های قبلی و بازگشت
kubectl rollout history deployment/shop-api -n shop
kubectl rollout undo deployment/shop-api -n shop`

const explainCommands = `# چه گروه‌ها و نسخه‌هایی در این کلاستر هست؟
kubectl api-resources | head -20
kubectl api-versions | grep apps

# مستندات فیلدهای یک نوع منبع، مستقیم از خود کلاستر
kubectl explain deployment.spec
kubectl explain pod.spec.containers.resources

# دیدن نام فیلدها به‌صورت درختی
kubectl explain deployment --recursive | head -40`

export function KubernetesKubectlYamlContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا مسیر یک درخواست را دیدیم، اما ابزار روزمرهٔ شما{' '}
        <Ltr>kubectl</Ltr> و زبان نوشتن خواسته‌ها <Ltr>YAML</Ltr> است. اگر این
        دو را خوب بشناسید، بیشتر خطاهای کوبرنتیز را پیش از رسیدن به کلاستر
        می‌گیرید. در این درس با همان مانیفست <Ltr>shop-api</Ltr> جلو می‌رویم:
        ابتدا ساختار ثابت هر مانیفست را می‌شکنیم، بعد می‌بینیم هر دستور{' '}
        <Ltr>kubectl</Ltr> کدام بخش از این ساختار را می‌خواند یا تغییر می‌دهد.
      </p>

      <h2>چهار کلید ثابت در هر مانیفست</h2>
      <p>
        تقریباً هر منبع کوبرنتیز، از یک <Ltr>Pod</Ltr> ساده تا یک{' '}
        <Ltr>Deployment</Ltr>، همین چهار بخش را دارد. فقط محتوای{' '}
        <Ltr>spec</Ltr> عوض می‌شود:
      </p>
      <table>
        <thead>
          <tr>
            <th>کلید</th>
            <th>پرسش پاسخ‌داده‌شده</th>
            <th>نمونه</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>apiVersion</Ltr></td>
            <td>این نوع منبع در کدام نسخه API تعریف شده است؟</td>
            <td><Ltr>apps/v1</Ltr> برای <Ltr>Deployment</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>kind</Ltr></td>
            <td>چه نوع شیئی است؟</td>
            <td><Ltr>Deployment</Ltr>، <Ltr>Pod</Ltr>، <Ltr>Service</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>metadata</Ltr></td>
            <td>هویت و برچسب‌های شیء چیست؟</td>
            <td><Ltr>name</Ltr>، <Ltr>namespace</Ltr>، <Ltr>labels</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>spec</Ltr></td>
            <td>وضعیت مطلوب شیء چیست؟</td>
            <td><Ltr>replicas</Ltr>، <Ltr>template</Ltr>، <Ltr>selector</Ltr></td>
          </tr>
        </tbody>
      </table>
      <p>
        یک <Ltr>Pod</Ltr> ساده هم دقیقاً همین شکل را دارد؛ فقط{' '}
        <Ltr>apiVersion</Ltr> آن <Ltr>v1</Ltr> است و <Ltr>spec</Ltr> مستقیم
        کانتینرها را تعریف می‌کند:
      </p>
      <CodeBlock code={minimalManifest} language="yaml" filename="hello-pod.yaml" />

      <h2>مانیفست را خط‌به‌خط بخوانیم</h2>
      <p>
        در توضیح تعاملی زیر، هر گام یک بخش از مانیفست را روشن می‌کند و می‌گوید
        آن بخش چه اثری روی کلاستر دارد. مرحلهٔ دوم همان فایل را در چرخهٔ{' '}
        <Ltr>kubectl</Ltr> دنبال می‌کند: از <Ltr>apply</Ltr> تا{' '}
        <Ltr>describe</Ltr> و <Ltr>edit</Ltr>. به گام <strong>۵</strong> دقت
        کنید؛ بیشترین خطای مانیفست از ناسازگاری <Ltr>selector</Ltr> با برچسب
        داخل <Ltr>template</Ltr> می‌آید.
      </p>
      <ManifestAnatomyExplainer />

      <h2>kubectl: مشاهده، تغییر و حذف</h2>
      <p>
        دستورهای <Ltr>kubectl</Ltr> را می‌توان بر اساس کاری که می‌کنند دسته‌بندی
        کرد. این جدول، هستهٔ کار روزمره است:
      </p>
      <table>
        <thead>
          <tr>
            <th>دسته</th>
            <th>دستور</th>
            <th>کاربرد</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ساخت و به‌روزرسانی</td>
            <td><Ltr>apply -f</Ltr></td>
            <td>اعمال وضعیت مطلوب از فایل؛ امن برای اجرای تکراری</td>
          </tr>
          <tr>
            <td>مشاهدهٔ خلاصه</td>
            <td><Ltr>get</Ltr></td>
            <td>فهرست منابع با ستون‌های کوتاه؛ <Ltr>-o wide</Ltr> جزئیات بیشتر</td>
          </tr>
          <tr>
            <td>مشاهدهٔ جزئیات</td>
            <td><Ltr>describe</Ltr></td>
            <td>وضعیت کامل و <Ltr>Events</Ltr>؛ اولین ابزار عیب‌یابی</td>
          </tr>
          <tr>
            <td>خروجی ساختاریافته</td>
            <td><Ltr>get -o yaml/json</Ltr></td>
            <td>دیدن فیلدهای واقعی شیء پس از پیش‌فرض‌گذاری سرور</td>
          </tr>
          <tr>
            <td>ویرایش سریع</td>
            <td><Ltr>edit</Ltr></td>
            <td>باز کردن شیء در ویرایشگر و ذخیرهٔ نسخهٔ جدید</td>
          </tr>
          <tr>
            <td>حذف</td>
            <td><Ltr>delete -f</Ltr></td>
            <td>حذف همان منابعی که در فایل تعریف شده‌اند</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={everydayCommands} language="bash" filename="bash" />

      <h2>پیش از تغییر، نتیجه را ببینید</h2>
      <p>
        دو دستور <Ltr>dry-run</Ltr> و <Ltr>diff</Ltr> جلوی بسیاری از اشتباه‌ها را
        می‌گیرند. <Ltr>--dry-run=client</Ltr> فقط ساختار فایل را بررسی می‌کند،
        اما <Ltr>--dry-run=server</Ltr> همان مسیر واقعی{' '}
        <Ltr>kube-apiserver</Ltr> را بدون ذخیره طی می‌کند؛ پس{' '}
        <Ltr>admission</Ltr> و <Ltr>ResourceQuota</Ltr> هم اعمال می‌شوند:
      </p>
      <CodeBlock code={safeCommands} language="bash" filename="bash" />
      <Callout variant="tip" title="diff را قبل از apply عادت کنید">
        در محیط واقعی، <Ltr>kubectl diff -f</Ltr> دقیقاً نشان می‌دهد{' '}
        <Ltr>apply</Ltr> چه فیلدهایی را عوض می‌کند. این کار از تغییر ناخواستهٔ
        تنظیمات دستی جلوگیری می‌کند.
      </Callout>

      <h2>YAML: قواعدی که بیشترین خطا را می‌سازند</h2>
      <ul>
        <li>
          <strong>تورفتگی با فاصله، نه tab:</strong> <Ltr>YAML</Ltr> با{' '}
          <Ltr>tab</Ltr> خطا می‌دهد. دو فاصله برای هر سطح رایج‌ترین قرارداد است.
        </li>
        <li>
          <strong>حساسیت به حروف:</strong> <Ltr>kind: deployment</Ltr> با{' '}
          <Ltr>Deployment</Ltr> یکی نیست. نام نوع منبع همیشه با حرف بزرگ شروع
          می‌شود.
        </li>
        <li>
          <strong>رشته و عدد:</strong> <Ltr>replicas: "3"</Ltr> رشته است و
          اعتبارسنجی آن را رد می‌کند؛ عدد را بدون کوتیشن بنویسید.
        </li>
        <li>
          <strong>چند سند در یک فایل:</strong> با <Ltr>---</Ltr> می‌توانید چند
          منبع را در یک فایل بگذارید و با یک <Ltr>apply</Ltr> همه را اعمال کنید.
        </li>
        <li>
          <strong>کلیدهای ناشناخته:</strong> فیلد اشتباه‌تایپ‌شده معمولاً با خطای
          اعتبارسنجی رد می‌شود؛ اگر رد نشد، ممکن است بی‌اثر نادیده گرفته شود.
        </li>
      </ul>

      <h2>apply، create یا replace؟</h2>
      <table>
        <thead>
          <tr>
            <th>دستور</th>
            <th>رفتار</th>
            <th>چه زمانی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>apply</Ltr></td>
            <td>ایجاد یا به‌روزرسانی بر اساس فایل</td>
            <td>حالت پیش‌فرض کار با مانیفست‌های نسخه‌بندی‌شده</td>
          </tr>
          <tr>
            <td><Ltr>create</Ltr></td>
            <td>فقط ایجاد؛ اگر وجود داشته باشد خطا می‌دهد</td>
            <td>ساخت اولیه یا اسکریپت‌های یک‌بارمصرف</td>
          </tr>
          <tr>
            <td><Ltr>replace</Ltr></td>
            <td>کل شیء را با فایل جدید جایگزین می‌کند</td>
            <td>وقتی می‌خواهید فیلدهای حذف‌شده هم پاک شوند</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="warning" title="apply فیلد حذف‌شده را همیشه پاک نمی‌کند">
        اگر فیلدی را از فایل حذف کنید، <Ltr>apply</Ltr> کلاینت‌ساید ممکن است آن
        را در کلاستر باقی بگذارد. برای مدیریت دقیق مالکیت فیلدها از{' '}
        <Ltr>--server-side</Ltr> استفاده کنید یا با <Ltr>diff</Ltr> نتیجه را
        ببینید.
      </Callout>

      <DeepDive title="پشت صحنه: کشف API و مستندات زندهٔ کلاستر">
        <DeepDiveSection title="apiVersion از کجا می‌آید؟">
          <p>
            هر منبع در یک گروه API زندگی می‌کند: <Ltr>v1</Ltr> برای منابع هسته
            مثل <Ltr>Pod</Ltr> و <Ltr>Service</Ltr>، <Ltr>apps/v1</Ltr> برای{' '}
            <Ltr>Deployment</Ltr> و <Ltr>StatefulSet</Ltr>، و{' '}
            <Ltr>networking.k8s.io/v1</Ltr> برای <Ltr>Ingress</Ltr>. نسخهٔ درست
            را همیشه از خود کلاستر بپرسید، نه از یک نمونهٔ اینترنتی.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="kubectl explain">
          <p>
            <Ltr>kubectl explain</Ltr> مستندات فیلدها را از{' '}
            <Ltr>kube-apiserver</Ltr> می‌خواند، پس دقیقاً همان نسخه‌ای را می‌بینید
            که کلاستر شما پشتیبانی می‌کند. این بهترین راه برای پیدا کردن نام درست
            یک فیلد است.
          </p>
          <CodeBlock code={explainCommands} language="bash" filename="bash" />
        </DeepDiveSection>
        <DeepDiveSection title="server-side apply">
          <p>
            در <Ltr>server-side apply</Ltr>، خود سرور مالکیت هر فیلد را نگه
            می‌دارد. اگر دو ابزار یک فیلد را تغییر دهند، تعارض صریح گزارش می‌شود
            و فیلدهای حذف‌شده درست پاک می‌شوند. برای GitOps و چند اپراتور، این
            حالت قابل پیش‌بینی‌تر است.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="selector و labels باید یکی باشند">
        اگر <Ltr>spec.selector.matchLabels</Ltr> با{' '}
        <Ltr>spec.template.metadata.labels</Ltr> نخواند، <Ltr>Deployment</Ltr>{' '}
        هیچ پادی را مال خود نمی‌داند و ممکن است پادهای دیگر را هم به اشتباه
        مدیریت کند. این خطا در اعتبارسنجی همیشه گرفته نمی‌شود.
      </Callout>
      <Callout variant="warning" title="namespace را در دستور جا نیندازید">
        اگر <Ltr>-n shop</Ltr> را فراموش کنید، <Ltr>kubectl</Ltr> در namespace
        پیش‌فرض (<Ltr>default</Ltr>) کار می‌کند و ممکن است فکر کنید منبع ساخته
        نشده است. namespace را یا در مانیفست یا در دستور مشخص کنید.
      </Callout>
      <Callout variant="danger" title="edit راه مدیریت طولانی‌مدت نیست">
        <Ltr>kubectl edit</Ltr> برای تغییر سریع عالی است، اما تغییر آن در فایل
        ذخیره نمی‌شود. اگر بعداً <Ltr>apply</Ltr> کنید، ممکن است ویرایش دستی از
        بین برود. منبع حقیقت باید همان مانیفست نسخه‌بندی‌شده باشد.
      </Callout>

      <h2>جمع‌بندی</h2>
      <p>
        هر مانیفست چهار بخش ثابت دارد: <Ltr>apiVersion</Ltr>، <Ltr>kind</Ltr>،{' '}
        <Ltr>metadata</Ltr> و <Ltr>spec</Ltr>. <Ltr>kubectl</Ltr> این فایل را به
        درخواست API تبدیل می‌کند و دستورهای <Ltr>get</Ltr>، <Ltr>describe</Ltr> و{' '}
        <Ltr>diff</Ltr> همان وضعیت را برمی‌گردانند. با <Ltr>dry-run</Ltr> و{' '}
        <Ltr>diff</Ltr> پیش از تغییر، و با <Ltr>kubectl explain</Ltr> هنگام
        نوشتن فیلدها، بیشتر خطاها را قبل از رسیدن به کلاستر می‌گیرید. در فصل بعد
        سراغ اشیاء اصلی می‌رویم و از <Ltr>Pod</Ltr> شروع می‌کنیم.
      </p>
    </>
  )
}
