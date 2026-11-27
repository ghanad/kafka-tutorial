import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const podYaml = `apiVersion: v1
kind: Pod
metadata:
  name: shop-api
  namespace: shop
  labels:
    app: shop-api
spec:
  restartPolicy: Always
  containers:
    - name: api
      image: registry.local/shop-api:1.4.0
      ports:
        - containerPort: 8080
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 10
      livenessProbe:
        httpGet:
          path: /health/live
          port: 8080
        initialDelaySeconds: 15
        periodSeconds: 20
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi`

const podCommands = `# ساخت پاد از فایل
kubectl apply -f shop-api-pod.yaml

# مشاهده وضعیت و رویدادهای پاد
kubectl get pod shop-api -n shop -o wide
kubectl describe pod shop-api -n shop

# دیدن لاگ کانتینر داخل پاد
kubectl logs shop-api -n shop

# اجرای یک شل داخل کانتینر برای بررسی شبکه
kubectl exec -it shop-api -n shop -- sh

# حذف پاد؛ در این درس پاد دستی است و دوباره ساخته نمی‌شود
kubectl delete pod shop-api -n shop`

const multiContainerYaml = `apiVersion: v1
kind: Pod
metadata:
  name: shop-api-with-proxy
  namespace: shop
spec:
  containers:
    # کانتینر اصلی برنامه
    - name: api
      image: registry.local/shop-api:1.4.0
      ports:
        - containerPort: 8080
    # کانتینر کمکی که فقط لاگ‌ها را به بیرون می‌فرستد
    - name: log-shipper
      image: registry.local/log-shipper:2.1.0
      volumeMounts:
        - name: app-logs
          mountPath: /var/log/app
  volumes:
    - name: app-logs
      emptyDir: {}`

export function KubernetesPodsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل دیدیم که کوبرنتیز وضعیت مطلوب را به واقعیت تبدیل می‌کند. اما
        واحد واقعی اجرا در کوبرنتیز کانتینر نیست؛ <strong>پاد</strong>{' '}
        (<Ltr>Pod</Ltr>) است. پاد کوچک‌ترین چیزی است که کوبرنتیز می‌سازد، مقیاس
        می‌دهد و حذف می‌کند. در این درس یک پاد برای <Ltr>shop-api</Ltr> می‌سازیم،
        چرخه عمرش را دنبال می‌کنیم و می‌بینیم چرا کانتینرها درون یک پاد مثل
        هم‌اتاقی‌های یک آپارتمان مشترک‌اند.
      </p>

      <h2>پاد چیست و چرا کانتینر تنها کافی نیست؟</h2>
      <p>
        یک پاد یک یا چند کانتینر است که <strong>همیشه با هم</strong> روی یک نود
        اجرا می‌شوند و منابع مشترک دارند. کوبرنتیز هرگز یک کانتینر را جداگانه
        زمان‌بندی نمی‌کند؛ همیشه یک پاد را روی یک نود می‌نشاند. این بسته‌بندی
        سه اشتراک مهم ایجاد می‌کند:
      </p>
      <ul>
        <li>
          <strong>شبکه مشترک:</strong> همه کانتینرهای یک پاد یک آدرس <Ltr>IP</Ltr>{' '}
          دارند و می‌توانند از طریق <Ltr>localhost</Ltr> با هم حرف بزنند.
        </li>
        <li>
          <strong>فضای ذخیره‌سازی مشترک:</strong> ولوم‌ها بین کانتینرهای همان پاد
          به اشتراک گذاشته می‌شوند.
        </li>
        <li>
          <strong>چرخه عمر مشترک:</strong> اگر پاد حذف یا جابه‌جا شود، همه
          کانتینرهایش با هم می‌روند و با هم برمی‌گردند.
        </li>
      </ul>
      <p>
        دقیقاً همین اشتراک است که پاد را از «مجموعه‌ای از کانتینرها» جدا می‌کند.
        دو کانتینر که باید پشت یک <Ltr>IP</Ltr> و روی یک دیسک کار کنند، در یک
        پاد قرار می‌گیرند.
      </p>

      <h2>یک پاد واقعی برای shop-api</h2>
      <p>
        ساده‌ترین حالت، یک پاد تک‌کانتینری است. فایل زیر پاد <Ltr>shop-api</Ltr>{' '}
        را با محدودیت منابع و دو probe تعریف می‌کند:
      </p>
      <CodeBlock code={podYaml} language="yaml" filename="shop-api-pod.yaml" />
      <p>
        پس از ساخت، با چند دستور می‌توانید وضعیت پاد، رویدادهایش و لاگ
        کانتینرش را ببینید:
      </p>
      <CodeBlock code={podCommands} language="bash" filename="bash" />

      <h2>الگوی چندکانتینری: هم‌اتاقی‌ها</h2>
      <p>
        گاهی یک کار کمکی باید در کنار برنامه اصلی و با همان شبکه اجرا شود؛
        مثلاً یک <Ltr>sidecar</Ltr> که فایل‌های لاگ را به سرور مرکزی می‌فرستد.
        در این حالت هر دو کانتینر در یک پاد می‌نشینند و یک ولوم مشترک دارند:
      </p>
      <CodeBlock
        code={multiContainerYaml}
        language="yaml"
        filename="shop-api-with-proxy.yaml"
      />
      <Callout variant="info" title="قانون ساده برای انتخاب">
        اگر دو کانتینر لازم است <strong>همیشه با هم</strong> زندگی کنند و به هم
        وابسته‌اند، یک پاد بسازید. اگر مستقل‌اند و باید جدا مقیاس شوند، هر کدام
        پاد خودش را داشته باشد.
      </Callout>

      <h2>چرخه عمر پاد: از Pending تا Failed</h2>
      <p>
        هر پاد یک <strong>فاز</strong> (<Ltr>phase</Ltr>) دارد که وضعیت کلی آن
        را نشان می‌دهد. این فاز را در ستون <Ltr>STATUS</Ltr> خروجی{' '}
        <Ltr>kubectl get pods</Ltr> می‌بینید:
      </p>
      <table>
        <thead>
          <tr>
            <th>فاز</th>
            <th>معنی</th>
            <th>مثال در سناریوی بازارک</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>Pending</Ltr></td>
            <td>پاد پذیرفته شده اما هنوز روی نود اجرا نشده است</td>
            <td>در حال کشیدن ایمیج <Ltr>shop-api:1.4.0</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>Running</Ltr></td>
            <td>پاد روی یک نود مستقر شده و حداقل یک کانتینر در حال اجراست</td>
            <td>سرور <Ltr>API</Ltr> به پورت ۸۰۸۰ گوش می‌دهد</td>
          </tr>
          <tr>
            <td><Ltr>Succeeded</Ltr></td>
            <td>همه کانتینرها با موفقیت تمام شدند</td>
            <td>یک <Ltr>Job</Ltr> گزارش شبانه که تمام شده است</td>
          </tr>
          <tr>
            <td><Ltr>Failed</Ltr></td>
            <td>حداقل یک کانتینر با خطا تمام شد</td>
            <td>اسکریپت مهاجرت دیتابیس با کد خروج غیرصفر</td>
          </tr>
          <tr>
            <td><Ltr>Unknown</Ltr></td>
            <td>ارتباط با نود میزبان قطع شده است</td>
            <td>نود از شبکه خارج شده است</td>
          </tr>
        </tbody>
      </table>
      <p>
        فاز فقط تصویر کلی است. جزئیات دقیق‌تر در <Ltr>kubectl describe pod</Ltr>{' '}
        و بخش <Ltr>Events</Ltr> دیده می‌شود؛ مثلاً «ایمیج پیدا نشد» یا «محدودیت
        حافظه رد شد».
      </p>

      <h2>restartPolicy: وقتی کانتینر می‌میرد چه می‌شود؟</h2>
      <p>
        هر پاد یک سیاست راه‌اندازی مجدد دارد. این سیاست تعیین می‌کند اگر
        کانتینری از پاد خارج شد، <Ltr>kubelet</Ltr> آن را دوباره اجرا کند یا نه:
      </p>
      <ul>
        <li>
          <strong><Ltr>Always</Ltr>:</strong> همیشه دوباره اجرا کن. پیش‌فرض است
          و برای سرویس‌های دائمی مثل <Ltr>shop-api</Ltr> مناسب است.
        </li>
        <li>
          <strong><Ltr>OnFailure</Ltr>:</strong> فقط اگر با خطا تمام شد دوباره
          اجرا کن. مناسب کارهای دسته‌ای.
        </li>
        <li>
          <strong><Ltr>Never</Ltr>:</strong> هرگز دوباره اجرا نکن. مناسب
          اسکریپت‌هایی که نتیجه‌شان باید یک‌بار ثبت شود.
        </li>
      </ul>
      <Callout variant="warning" title="restartPolicy فقط داخل همان پاد است">
        اگر خود پاد حذف شود، <Ltr>restartPolicy</Ltr> کاری نمی‌کند. جایگزینی
        پاد وظیفه کنترلر بالاتر مثل <Ltr>Deployment</Ltr> است. به همین دلیل در
        عمل کمتر پاد دستی می‌سازید.
      </Callout>

      <h2>probeها: چطور بفهمیم برنامه سالم است؟</h2>
      <p>
        «کانتینر در حال اجراست» با «برنامه آماده پاسخ‌دهی است» یکی نیست. کوبرنتیز
        سه نوع بررسی سلامت دارد:
      </p>
      <table>
        <thead>
          <tr>
            <th>probe</th>
            <th>پرسش</th>
            <th>واکنش کوبرنتیز</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>readinessProbe</Ltr></td>
            <td>آماده دریافت ترافیک است؟</td>
            <td>اگر نه، از <Ltr>Service</Ltr> خارج می‌شود</td>
          </tr>
          <tr>
            <td><Ltr>livenessProbe</Ltr></td>
            <td>هنوز زنده است یا قفل کرده؟</td>
            <td>اگر نه، کانتینر دوباره راه‌اندازی می‌شود</td>
          </tr>
          <tr>
            <td><Ltr>startupProbe</Ltr></td>
            <td>راه‌اندازی اولیه تمام شده؟</td>
            <td>تا موفق نشود، دو probe دیگر اجرا نمی‌شوند</td>
          </tr>
        </tbody>
      </table>
      <p>
        برای <Ltr>shop-api</Ltr> یک مسیر سبک مثل <Ltr>/health/ready</Ltr> کافی
        است که فقط اتصال به دیتابیس را بررسی کند، نه یک کوئری سنگین. اگر{' '}
        <Ltr>readinessProbe</Ltr> را به کوئری سنگین وصل کنید، هر بار کندی
        دیتابیس همه پادها را از چرخه ترافیک بیرون می‌اندازد.
      </p>

      <DeepDive title="جزئیات فنی: شبکه پاد و رفتار probeها">
        <DeepDiveSection title="چرا همه کانتینرها یک IP دارند؟">
          <p>
            هر پاد یک کانتینر زیرساختی نامرئی به نام <Ltr>pause</Ltr> دارد که
            فضای شبکه و <Ltr>IP</Ltr> را نگه می‌دارد. کانتینرهای اصلی به همین
            فضای شبکه وارد می‌شوند، پس پورت‌ها بین آن‌ها مشترک است و دو کانتینر
            نمی‌توانند همزمان روی یک پورت گوش دهند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="پارامترهای زمان‌بندی probe">
          <p>
            <Ltr>initialDelaySeconds</Ltr> صبر اولیه پیش از اولین بررسی است،{' '}
            <Ltr>periodSeconds</Ltr> فاصله بین بررسی‌ها، و{' '}
            <Ltr>failureThreshold</Ltr> تعداد شکست پیاپی که پیش از واکنش لازم
            است. برای برنامه‌ای که ۳۰ ثانیه طول می‌کشد بالا بیاید،{' '}
            <Ltr>startupProbe</Ltr> بهتر از بزرگ کردن کورکورانه{' '}
            <Ltr>initialDelaySeconds</Ltr> است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="محدودیت منابع و OOMKilled">
          <p>
            اگر کانتینر از <Ltr>limits.memory</Ltr> عبور کند، کرنل آن را با
            سیگنال <Ltr>OOMKilled</Ltr> می‌کشد و <Ltr>kubelet</Ltr> بسته به
            سیاست راه‌اندازی دوباره اجرایش می‌کند. مقدار <Ltr>requests</Ltr>{' '}
            برای زمان‌بندی استفاده می‌شود و <Ltr>limits</Ltr> سقف واقعی است.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="پاد دستی برای محیط واقعی نسازید">
        پاد یک شیء یک‌بارمصرف است. اگر پاد دستی بسازید و نودش از کار بیفتد،
        هیچ‌کس جای آن را پر نمی‌کند. برای سرویس‌های دائمی از <Ltr>Deployment</Ltr>{' '}
        استفاده کنید تا پادها همیشه بازسازی شوند.
      </Callout>
      <Callout variant="warning" title="همه چیز را در یک پاد نگذارید">
        پاد برای کانتینرهایی است که واقعاً به هم چسبیده‌اند. اگر <Ltr>API</Ltr>،
        دیتابیس و صف پیام را در یک پاد بگذارید، نمی‌توانید هر کدام را جدا مقیاس
        دهید و یک خطا همه را با هم می‌کشد.
      </Callout>
      <Callout variant="danger" title="probe را به منطق کسب‌وکار گره نزنید">
        <Ltr>livenessProbe</Ltr> فقط باید بگوید «فرآیند گیر نکرده است». اگر آن
        را به سلامت دیتابیس وصل کنید، قطعی موقت دیتابیس باعث ری‌استارت بی‌پایان
        همه پادها می‌شود.
      </Callout>

      <h2>جمع‌بندی</h2>
      <p>
        پاد کوچک‌ترین واحد اجرا در کوبرنتیز است: یک بسته از کانتینرهای هم‌مکان با
        شبکه و ولوم مشترک. فاز پاد تصویر کلی وضعیت را می‌دهد،{' '}
        <Ltr>restartPolicy</Ltr> رفتار هنگام مرگ کانتینر را تعیین می‌کند و
        probeها سلامت واقعی برنامه را می‌سنجند. در درس بعدی می‌بینیم چطور به‌جای
        ساختن پاد دستی، با <Ltr>Deployment</Ltr> آن‌ها را پایدار، مقیاس‌پذیر و
        قابل به‌روزرسانی نگه داریم.
      </p>
    </>
  )
}
