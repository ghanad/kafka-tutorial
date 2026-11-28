import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const configMapYaml = `apiVersion: v1
kind: ConfigMap
metadata:
  name: shop-api-config
  namespace: shop
data:
  APP_MODE: production
  LOG_LEVEL: info
  HTTP_TIMEOUT: "3s"
  feature-flags.json: |
    {
      "newCheckout": true,
      "maxCartItems": 20
    }`

const secretYaml = `apiVersion: v1
kind: Secret
metadata:
  name: shop-db
  namespace: shop
type: Opaque
stringData:
  DB_HOST: shop-db.shop.svc.cluster.local
  DB_USER: shop_app
  DB_PASSWORD: change-me-in-a-real-cluster`

const deploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: shop
spec:
  replicas: 2
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
          envFrom:
            - configMapRef:
                name: shop-api-config
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: shop-db
                  key: DB_PASSWORD
          volumeMounts:
            - name: config-files
              mountPath: /etc/shop
              readOnly: true
      volumes:
        - name: config-files
          configMap:
            name: shop-api-config
            items:
              - key: feature-flags.json
                path: feature-flags.json`

const commands = `# ساخت ConfigMap از مقادیر مستقیم
kubectl create configmap shop-api-config \\
  --from-literal=APP_MODE=production \\
  --from-literal=LOG_LEVEL=info -n shop

# ساخت ConfigMap از یک فایل پیکربندی
kubectl create configmap nginx-config \\
  --from-file=nginx.conf -n shop

# دیدن محتوای ConfigMap
kubectl get configmap shop-api-config -n shop -o yaml

# ساخت Secret از فایل یا literal
kubectl create secret generic shop-db \\
  --from-literal=DB_PASSWORD=change-me -n shop

# دیدن کلیدهای Secret بدون نمایش مقدار
kubectl describe secret shop-db -n shop

# رمزگشایی یک کلید برای بررسی
kubectl get secret shop-db -n shop \\
  -o jsonpath='{.data.DB_PASSWORD}' | base64 -d

# اعمال دوباره پیکربندی و ری‌استارت پادها
kubectl apply -f shop-api.yaml
kubectl rollout restart deployment/shop-api -n shop`

export function KubernetesConfigmapsSecretsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        ایمیج <Ltr>shop-api</Ltr> نباید برای هر محیط دوباره ساخته شود. پیکربندی
        محیط، مثل آدرس دیتابیس و سطح لاگ، باید از ایمیج جدا باشد. کوبرنتیز این
        جداسازی را با <strong>ConfigMap</strong> برای داده‌های غیرحساس و{' '}
        <strong>Secret</strong> برای اطلاعات حساس انجام می‌دهد. در این درس
        پیکربندی فروشگاه را از ایمیج بیرون می‌کشیم و می‌بینیم کدام روش تزریق،
        کِی به‌روز می‌شود و کجا باید مراقب امنیت بود.
      </p>

      <h2>چرا پیکربندی نباید داخل ایمیج باشد؟</h2>
      <p>
        اگر آدرس دیتابیس و رمز عبور را داخل ایمیج بگذارید، برای تغییر یک مقدار
        باید ایمیج جدید بسازید، تست کنید و منتشر کنید. بدتر اینکه همان ایمیج
        بین محیط توسعه و تولید مشترک نیست. با جدا کردن پیکربندی:
      </p>
      <ul>
        <li>یک ایمیج در همه محیط‌ها استفاده می‌شود.</li>
        <li>تغییر پیکربندی نیازی به ساخت ایمیج ندارد.</li>
        <li>دسترسی به اطلاعات حساس جدا از دسترسی به کد کنترل می‌شود.</li>
        <li>مقدارها در Git و manifest قابل بازبینی هستند.</li>
      </ul>
      <p>
        این همان اصل جداسازی پیکربندی از کد است. اما ConfigMap و Secret فقط
        نگه‌دارنده داده‌اند؛ تزریق آن‌ها به کانتینر کار <Ltr>kubelet</Ltr> است.
      </p>

      <h2>ConfigMap: پیکربندی غیرحساس</h2>
      <p>
        <Ltr>ConfigMap</Ltr> یک شیء namespaceدار است که داده را به‌صورت جفت
        کلید و مقدار نگه می‌دارد. مقدار می‌تواند یک خط ساده یا کل محتوای یک فایل
        باشد:
      </p>
      <CodeBlock code={configMapYaml} language="yaml" filename="shop-api-config.yaml" />
      <p>
        کلیدها باید با الگوی نام معتبر سازگار باشند. برای فایل‌هایی مثل{' '}
        <Ltr>feature-flags.json</Ltr> که نقطه دارند، از کلید درست استفاده کنید
        و هنگام mount شدن نام فایل را با <Ltr>items</Ltr> تعیین کنید.
      </p>

      <h2>Secret: همان ساختار، با حساسیت بیشتر</h2>
      <p>
        <Ltr>Secret</Ltr> از نظر ساختار شبیه ConfigMap است، اما برای داده‌های
        حساس طراحی شده و ابزارها و سیاست‌های امنیتی با آن متفاوت رفتار می‌کنند.
        فیلد <Ltr>stringData</Ltr> مقدار را به‌صورت متن ساده می‌گیرد و API Server
        آن را به <Ltr>data</Ltr> و کدگذاری <Ltr>base64</Ltr> تبدیل می‌کند:
      </p>
      <CodeBlock code={secretYaml} language="yaml" filename="shop-db-secret.yaml" />
      <Callout variant="danger" title="base64 رمزنگاری نیست">
        هر کسی که به Secret دسترسی خواندن داشته باشد می‌تواند مقدار را با{' '}
        <Ltr>base64 -d</Ltr> بخواند. <Ltr>base64</Ltr> فقط نمایش را تغییر
        می‌دهد. امنیت واقعی از <Ltr>RBAC</Ltr>، رمزنگاری <Ltr>etcd</Ltr> و
        مدیریت خارجی Secret می‌آید.
      </Callout>

      <h2>سه راه تزریق: متغیر محیطی، envFrom و فایل</h2>
      <p>
        ConfigMap و Secret را می‌توان به سه شکل به کانتینر رساند. انتخاب اشتباه
        باعث می‌شود تغییر پیکربندی به پاد نرسد یا فایل‌ها جای اشتباه بنشینند:
      </p>
      <table>
        <thead>
          <tr>
            <th>روش</th>
            <th>نحو</th>
            <th>رفتار به‌روزرسانی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>متغیر محیطی تک</td>
            <td><Ltr>valueFrom.secretKeyRef</Ltr></td>
            <td>فقط با ساخت پاد جدید عوض می‌شود</td>
          </tr>
          <tr>
            <td>همه کلیدها به‌عنوان env</td>
            <td><Ltr>envFrom.configMapRef</Ltr></td>
            <td>فقط با ساخت پاد جدید عوض می‌شود</td>
          </tr>
          <tr>
            <td>mount به‌صورت فایل</td>
            <td><Ltr>volumes.configMap</Ltr></td>
            <td>پس از چند ده ثانیه در پاد زنده به‌روز می‌شود</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={deploymentYaml} language="yaml" filename="shop-api-deployment.yaml" />
      <p>
        در این مثال، <Ltr>APP_MODE</Ltr> و <Ltr>LOG_LEVEL</Ltr> به‌عنوان متغیر
        محیطی تزریق می‌شوند، رمز دیتابیس از Secret خوانده می‌شود و فقط فایل{' '}
        <Ltr>feature-flags.json</Ltr> روی دیسک mount می‌شود. اگر کلید{' '}
        <Ltr>DB_PASSWORD</Ltr> در Secret نباشد، پاد در وضعیت{' '}
        <Ltr>CreateContainerConfigError</Ltr> گیر می‌کند.
      </p>
      <CodeBlock code={commands} language="bash" filename="bash" />

      <h2>تغییر پیکربندی چطور به پاد می‌رسد؟</h2>
      <p>
        این بخش منبع بیشترین سردرگمی است. وقتی ConfigMap یا Secret را ویرایش
        می‌کنید:
      </p>
      <ul>
        <li>
          <strong>متغیرهای محیطی تغییر نمی‌کنند.</strong> فرآیند داخل کانتینر
          مقدار اولیه را نگه می‌دارد. برای اعمال، پاد باید دوباره ساخته شود.
        </li>
        <li>
          <strong>فایل‌های mount شده به‌مرور به‌روز می‌شوند.</strong>{' '}
          <Ltr>kubelet</Ltr> دوره‌ای فایل را همگام می‌کند؛ معمولاً کمتر از یک
          دقیقه. برنامه باید تغییر فایل را بخواند، نه اینکه تنها یک‌بار در
          استارت بخواند.
        </li>
        <li>
          <strong><Ltr>subPath</Ltr> به‌روز نمی‌شود.</strong> اگر فایل را با{' '}
          <Ltr>subPath</Ltr> mount کنید، نسخه اولیه تا حذف پاد باقی می‌ماند.
        </li>
      </ul>
      <Callout variant="tip" title="الگوی امن برای اعمال تغییر">
        پیکربندی را در Git نگه دارید، با <Ltr>kubectl apply</Ltr> اعمال کنید و
        سپس با <Ltr>kubectl rollout restart</Ltr> پادها را دوباره بسازید. این
        کار قطعی تدریجی و قابل بازگشت می‌دهد و همه پادها را همگام می‌کند.
      </Callout>

      <h2>Secret در عمل: از base64 تا مدیریت واقعی</h2>
      <p>
        Secret پیش‌فرض کوبرنتیز یک ابزار ساده است، نه یک گاوصندوق کامل. برای
        استفاده جدی این موارد را رعایت کنید:
      </p>
      <ul>
        <li>
          دسترسی خواندن Secretها را با <Ltr>RBAC</Ltr> محدود کنید؛ نه همه
          ServiceAccountها باید بتوانند همه Secretها را بخوانند.
        </li>
        <li>
          رمزنگاری <Ltr>etcd</Ltr> را در سطح کلاستر فعال کنید تا داده در دیسک
          رمزنگاری شود.
        </li>
        <li>
          Secret خام را در Git نگذارید. از <Ltr>Sealed Secrets</Ltr>،{' '}
          <Ltr>External Secrets Operator</Ltr> یا <Ltr>Vault</Ltr> استفاده
          کنید.
        </li>
        <li>
          Secret را در لاگ چاپ نکنید و از <Ltr>kubectl describe</Ltr> برای دیدن
          کلیدها استفاده کنید، نه مقدارها.
        </li>
      </ul>
      <p>
        برای فایل‌های حساس مثل کلید TLS، نوع Secret را مناسب انتخاب کنید؛ مثلاً{' '}
        <Ltr>kubernetes.io/tls</Ltr> با کلیدهای <Ltr>tls.crt</Ltr> و{' '}
        <Ltr>tls.key</Ltr>. نوع درست به کنترلرها کمک می‌کند فیلدها را درست
        بخوانند.
      </p>

      <DeepDive title="جزئیات فنی: محدودیت‌ها و رفتار volume">
        <DeepDiveSection title="الگوی کلیدهای envFrom">
          <p>
            در <Ltr>envFrom</Ltr> نام کلیدها به نام متغیر محیطی تبدیل می‌شود.
            کلیدهایی که کاراکتر غیرمجاز دارند نادیده گرفته می‌شوند و می‌توانید
            با <Ltr>prefix</Ltr> جلوی همه آن‌ها یک پیشوند بگذارید. برای کنترل
            دقیق‌تر، از <Ltr>env[].valueFrom</Ltr> استفاده کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="ConfigMap و Secret تغییرناپذیر">
          <p>
            با <Ltr>immutable: true</Ltr> می‌توانید ConfigMap یا Secret را
            تغییرناپذیر کنید. این کار از تغییر تصادفی جلوگیری می‌کند و در
            کلاسترهای بزرگ بار روی API Server را کم می‌کند. برای تغییر، باید
            شیء را حذف و با نام جدید بسازید؛ به همین دلیل نسخه را در نام بیاورید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="mount انتخابی با items">
          <p>
            بدون <Ltr>items</Ltr> همه کلیدهای ConfigMap به فایل تبدیل می‌شوند.
            با <Ltr>items</Ltr> فقط کلیدهای لازم را با نام و مسیر دلخواه mount
            می‌کنید. اگر <Ltr>optional: true</Ltr> بگذارید، نبودن ConfigMap
            مانع شروع پاد نمی‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="اندازه و نوع داده">
          <p>
            مجموع اندازه ConfigMap و Secret حدود یک مگابایت است. داده دودویی را
            در <Ltr>binaryData</Ltr> بگذارید. Secretهای بزرگ را به فایل یا
            سرویس خارجی منتقل کنید، نه اینکه چند مگابایت را در etcd نگه دارید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="Secret را رمزنگاری‌شده فرض نکنید">
        <Ltr>base64</Ltr> فقط کدگذاری است. بدون <Ltr>RBAC</Ltr> و رمزنگاری{' '}
        <Ltr>etcd</Ltr>، هر کسی با دسترسی مناسب می‌تواند مقدار را بخواند.
      </Callout>
      <Callout variant="warning" title="انتظار به‌روزرسانی env نداشته باشید">
        تغییر ConfigMap باعث تغییر متغیر محیطی پادهای در حال اجرا نمی‌شود. اگر
        مقدار را از env می‌خوانید، پس از تغییر پیکربندی پادها را دوباره بسازید.
      </Callout>
      <Callout variant="danger" title="پیکربندی را در ایمیج نپزید">
        اگر مقدار محیط را در <Ltr>Dockerfile</Ltr> یا کد hard-code کنید، همان
        مشکل قبلی برمی‌گردد: یک ایمیج برای هر محیط و نیاز به انتشار دوباره برای
        تغییر یک آدرس.
      </Callout>
      <Callout variant="warning" title="کلید گمشده را دست‌کم نگیرید">
        ارجاع به کلیدی که در ConfigMap یا Secret نیست، پاد را در{' '}
        <Ltr>CreateContainerConfigError</Ltr> نگه می‌دارد. نام کلیدها را در
        manifest و منبع دقیقاً یکسان نگه دارید و در CI بررسی کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <p>
        <Ltr>ConfigMap</Ltr> پیکربندی غیرحساس و <Ltr>Secret</Ltr> داده حساس را
        از ایمیج جدا می‌کنند. تزریق با متغیر محیطی ساده است اما به‌روزرسانی
        زنده ندارد؛ mount فایل به‌روز می‌شود اما برنامه باید تغییر را بخواند.
        Secret پیش‌فرض فقط یک نگه‌دارنده است و امنیت واقعی به <Ltr>RBAC</Ltr>،
        رمزنگاری <Ltr>etcd</Ltr> و مدیریت خارجی وابسته است. در درس بعدی
        می‌بینیم چطور با probeها تشخیص دهیم برنامه‌ای که این پیکربندی را
        گرفته، واقعاً سالم و آماده ترافیک است.
      </p>
    </>
  )
}
