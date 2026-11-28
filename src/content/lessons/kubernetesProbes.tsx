import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const probesYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: shop
spec:
  replicas: 3
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
          ports:
            - containerPort: 8080
          startupProbe:
            httpGet:
              path: /health/live
              port: 8080
            periodSeconds: 5
            failureThreshold: 24
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 2
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3`

const probeTypesYaml = `# بررسی با اجرای دستور داخل کانتینر
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - test -f /tmp/healthy
  periodSeconds: 10

# بررسی باز بودن پورت TCP
readinessProbe:
  tcpSocket:
    port: 8080
  periodSeconds: 5

# بررسی gRPC (نیازمند پشتیبانی runtime)
startupProbe:
  grpc:
    port: 9090
  periodSeconds: 5
  failureThreshold: 20`

const commands = `# دیدن وضعیت آمادگی و ری‌استارت‌ها
kubectl get pods -n shop
kubectl get deployment shop-api -n shop

# دیدن رویدادهای probe و دلیل ری‌استارت
kubectl describe pod -n shop -l app.kubernetes.io/name=shop-api

# دیدن لاگ کانتینر پیش از ری‌استارت قبلی
kubectl logs -n shop deployment/shop-api --previous

# بررسی endpointهای سرویس؛ پادهای ناآماده اینجا نیستند
kubectl get endpoints shop-api -n shop`

export function KubernetesProbesContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        «کانتینر در حال اجراست» با «برنامه آماده پاسخ‌دهی است» یکی نیست. یک
        فرآیند می‌تواند بالا باشد اما هنوز به دیتابیس وصل نشده باشد، یا برعکس،
        زنده باشد اما در بن‌بست گیر کرده باشد. کوبرنتیز با سه probe این سه پرسش
        را از هم جدا می‌کند: آیا تازه شروع شده؟ آیا آماده ترافیک است؟ آیا هنوز
        زنده است؟ در این درس probeهای <Ltr>shop-api</Ltr> را طوری تنظیم می‌کنیم
        که نه ترافیک زودهنگام بگیرد و نه با یک کندی موقت بی‌پایان ری‌استارت شود.
      </p>

      <h2>سه probe، سه پرسش متفاوت</h2>
      <p>
        هر probe یک بررسی دوره‌ای است که <Ltr>kubelet</Ltr> اجرا می‌کند. تفاوت
        آن‌ها در واکنش کوبرنتیز به شکست است، نه در نحوه بررسی:
      </p>
      <table>
        <thead>
          <tr>
            <th>probe</th>
            <th>پرسش</th>
            <th>واکنش به شکست</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>startupProbe</Ltr></td>
            <td>راه‌اندازی اولیه تمام شده است؟</td>
            <td>تا موفق نشود، دو probe دیگر اجرا نمی‌شوند؛ پس از اتمام بودجه، کانتینر ری‌استارت می‌شود</td>
          </tr>
          <tr>
            <td><Ltr>readinessProbe</Ltr></td>
            <td>آماده دریافت ترافیک است؟</td>
            <td>پاد از endpointهای <Ltr>Service</Ltr> خارج می‌شود، اما کانتینر ری‌استارت نمی‌شود</td>
          </tr>
          <tr>
            <td><Ltr>livenessProbe</Ltr></td>
            <td>فرآیند هنوز زنده است یا قفل کرده؟</td>
            <td>کانتینر کشته و بر اساس <Ltr>restartPolicy</Ltr> دوباره اجرا می‌شود</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="info" title="probe وضعیت پاد را عوض نمی‌کند">
        نتیجه probe فاز پاد را تغییر نمی‌دهد. پاد همچنان <Ltr>Running</Ltr>{' '}
        می‌ماند، اما ستون <Ltr>READY</Ltr> ممکن است <Ltr>0/1</Ltr> شود و پاد از
        سرویس حذف شود. برای دیدن دلیل دقیق، به رویدادهای{' '}
        <Ltr>kubectl describe</Ltr> نگاه کنید.
      </Callout>

      <h2>یک تنظیم واقعی برای shop-api</h2>
      <p>
        فرض کنید <Ltr>shop-api</Ltr> یک سرویس <Ltr>JVM</Ltr> است که در حالت
        سرد حدود ۴۰ ثانیه طول می‌کشد بالا بیاید. فایل زیر سه probe را با
        بودجه‌های متفاوت تعریف می‌کند:
      </p>
      <CodeBlock code={probesYaml} language="yaml" filename="shop-api-probes.yaml" />
      <p>
        <Ltr>startupProbe</Ltr> هر ۵ ثانیه و حداکثر ۲۴ بار تلاش می‌کند؛ یعنی
        حدود ۱۲۰ ثانیه فرصت راه‌اندازی. تا وقتی این probe سبز نشود،{' '}
        <Ltr>livenessProbe</Ltr> اجرا نمی‌شود. به همین دلیل لازم نیست{' '}
        <Ltr>initialDelaySeconds</Ltr> را کورکورانه بزرگ کنیم.
      </p>
      <p>
        <Ltr>readinessProbe</Ltr> هر ۵ ثانیه آمادگی را می‌سنجد و با دو شکست
        پیاپی پاد را از ترافیک بیرون می‌آورد. <Ltr>livenessProbe</Ltr> آرام‌تر
        است: هر ۱۰ ثانیه و با آستانه سه شکست. این تفاوت عمدی است؛ یک کندی موقت
        نباید فوراً کانتینر را بکشد.
      </p>

      <h2>پارامترهای زمان‌بندی probe</h2>
      <p>
        هر probe مجموعه‌ای از پارامترهای زمانی دارد. مقدار پیش‌فرض‌ها برای
        سرویس‌های سبک مناسب است، اما برای برنامه‌های سنگین باید آگاهانه تنظیم
        شوند:
      </p>
      <table>
        <thead>
          <tr>
            <th>پارامتر</th>
            <th>پیش‌فرض</th>
            <th>معنی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>initialDelaySeconds</Ltr></td>
            <td>۰</td>
            <td>صبر پیش از اولین بررسی</td>
          </tr>
          <tr>
            <td><Ltr>periodSeconds</Ltr></td>
            <td>۱۰</td>
            <td>فاصله بین بررسی‌ها</td>
          </tr>
          <tr>
            <td><Ltr>timeoutSeconds</Ltr></td>
            <td>۱</td>
            <td>حداکثر زمان انتظار برای پاسخ یک بررسی</td>
          </tr>
          <tr>
            <td><Ltr>failureThreshold</Ltr></td>
            <td>۳</td>
            <td>تعداد شکست پیاپی پیش از واکنش</td>
          </tr>
          <tr>
            <td><Ltr>successThreshold</Ltr></td>
            <td>۱</td>
            <td>تعداد موفقیت پیاپی برای بازگشت به وضعیت سالم</td>
          </tr>
        </tbody>
      </table>
      <p>
        برای <Ltr>livenessProbe</Ltr> و <Ltr>startupProbe</Ltr> مقدار{' '}
        <Ltr>successThreshold</Ltr> باید ۱ بماند. برای{' '}
        <Ltr>readinessProbe</Ltr> می‌توانید آن را بیشتر کنید تا پاد پس از یک
        موفقیت اتفاقی زودتر از موعد ترافیک نگیرد.
      </p>

      <h2>انواع بررسی: HTTP، TCP، exec و gRPC</h2>
      <p>
        probe فقط یک پرسش است؛ روش پرسیدن می‌تواند متفاوت باشد. متداول‌ترین
        گزینه <Ltr>httpGet</Ltr> است که کد وضعیت بین ۲۰۰ و ۳۹۹ را موفق می‌داند.
        گزینه‌های دیگر برای برنامه‌هایی هستند که endpoint HTTP ندارند:
      </p>
      <CodeBlock code={probeTypesYaml} language="yaml" filename="probe-types.yaml" />
      <ul>
        <li>
          <strong><Ltr>exec</Ltr>:</strong> یک دستور داخل کانتینر اجرا می‌کند و
          کد خروج صفر را موفق می‌داند.
        </li>
        <li>
          <strong><Ltr>tcpSocket</Ltr>:</strong> فقط باز بودن پورت را بررسی
          می‌کند؛ درباره سلامت برنامه چیزی نمی‌گوید.
        </li>
        <li>
          <strong><Ltr>grpc</Ltr>:</strong> از پروتکل health استاندارد gRPC
          استفاده می‌کند و به پشتیبانی runtime وابسته است.
        </li>
      </ul>

      <h2>سناریو: وقتی probeها درست تنظیم نشده‌اند</h2>
      <p>
        تصور کنید <Ltr>livenessProbe</Ltr> را با <Ltr>initialDelaySeconds: 10</Ltr>{' '}
        و بدون <Ltr>startupProbe</Ltr> تنظیم کرده‌اید، اما برنامه ۴۰ ثانیه طول
        می‌کشد بالا بیاید. کوبرنتیز در ثانیه ۱۰ بررسی می‌کند، شکست می‌خورد، پس
        از سه تلاش کانتینر را می‌کشد. پاد وارد چرخه{' '}
        <Ltr>CrashLoopBackOff</Ltr> می‌شود و هیچ‌وقت فرصت کامل شدن راه‌اندازی
        را پیدا نمی‌کند. راه‌حل درست، <Ltr>startupProbe</Ltr> با بودجه کافی است،
        نه بزرگ کردن بی‌پایان تأخیر اولیه.
      </p>
      <p>
        سناریوی دوم: دیتابیس ده ثانیه قطع می‌شود. اگر{' '}
        <Ltr>livenessProbe</Ltr> به سلامت دیتابیس وصل باشد، همه پادها همزمان
        ری‌استارت می‌شوند و قطعی بدتر می‌شود. <Ltr>livenessProbe</Ltr> فقط باید
        بگوید «فرآیند گیر نکرده است». وابستگی‌ها جای{' '}
        <Ltr>readinessProbe</Ltr> هستند تا پاد موقتاً از ترافیک خارج شود.
      </p>
      <CodeBlock code={commands} language="bash" filename="bash" />

      <h2>readiness و rollout: چرا probe ستون فقرات است</h2>
      <p>
        در <Ltr>Deployment</Ltr>، پاد جدید تنها وقتی ترافیک می‌گیرد که{' '}
        <Ltr>readinessProbe</Ltr> سبز شود. همین مکانیزم باعث می‌شود{' '}
        <Ltr>RollingUpdate</Ltr> واقعاً بدون قطعی باشد. اگر readiness نداشته
        باشید، کوبرنتیز پاد را به‌محض اجرا شدن آماده فرض می‌کند و ممکن است
        درخواست‌ها پیش از آماده شدن برنامه به آن برسند.
      </p>
      <p>
        همچنین هنگام حذف پاد، کوبرنتیز ابتدا آن را از endpointها خارج می‌کند و
        سپس سیگنال توقف می‌فرستد. برنامه باید سیگنال را بگیرد، درخواست‌های در
        جریان را تمام کند و بعد خارج شود. readiness فقط بخشی از این داستان است؛
        همکاری برنامه با چرخه خاتمه هم لازم است.
      </p>

      <DeepDive title="جزئیات فنی: اجرای probe و لبه‌های ظریف">
        <DeepDiveSection title="چه کسی probe را اجرا می‌کند؟">
          <p>
            <Ltr>kubelet</Ltr> روی هر نود probe را اجرا می‌کند، نه API Server.
            بنابراین probeهای <Ltr>httpGet</Ltr> از دید نود به پاد می‌رسند و
            به <Ltr>Service</Ltr> یا مسیر شبکه بیرونی وابسته نیستند. برای{' '}
            <Ltr>exec</Ltr>، دستور داخل همان کانتینر اجرا می‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا liveness نباید به وابستگی وصل شود؟">
          <p>
            liveness برای تشخیص بن‌بست داخلی فرآیند است. اگر آن را به دیتابیس،
            صف یا سرویس بیرونی وصل کنید، قطعی آن وابستگی به ری‌استارت همه
            پادها تبدیل می‌شود. این پدیده گاهی «cascading failure» نامیده
            می‌شود و در سناریوی فروشگاه می‌تواند کل API را از کار بیندازد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="timeout و failureThreshold چطور ترکیب می‌شوند؟">
          <p>
            اگر <Ltr>timeoutSeconds: 2</Ltr> و <Ltr>failureThreshold: 3</Ltr>{' '}
            باشد، یک پاسخ کندتر از دو ثانیه شکست حساب می‌شود و سه شکست پیاپی
            لازم است تا واکنش رخ دهد. زمان تقریبی تشخیص با{' '}
            <Ltr>periodSeconds</Ltr> و timeout قابل محاسبه است؛ مقدارها را بر
            اساس <Ltr>SLO</Ltr> سرویس انتخاب کنید، نه با حدس.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="graceful shutdown">
          <p>
            پس از دریافت سیگنال <Ltr>SIGTERM</Ltr>، برنامه تا{' '}
            <Ltr>terminationGracePeriodSeconds</Ltr> فرصت دارد. اگر probe
            readiness را در این بازه شکست‌خورده کنید، ترافیک زودتر قطع می‌شود.
            سپس باید درخواست‌های در جریان را تمام و اتصال‌ها را ببندید؛ در غیر
            این صورت <Ltr>SIGKILL</Ltr> می‌رسد.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="یک endpoint برای هر سه probe">
        اگر liveness و readiness هر دو یک مسیر سنگین را بررسی کنند، کندی موقت
        دیتابیس باعث ری‌استارت همه پادها می‌شود. مسیر liveness باید سبک و
        مستقل از وابستگی‌ها باشد.
      </Callout>
      <Callout variant="warning" title="تأخیر اولیه را جای startupProbe نگذارید">
        بزرگ کردن <Ltr>initialDelaySeconds</Ltr> فقط شروع را کند می‌کند و برای
        همه پادها ثابت است. <Ltr>startupProbe</Ltr> بودجه دقیق راه‌اندازی
        می‌دهد و پس از موفقیت، بررسی عادی را شروع می‌کند.
      </Callout>
      <Callout variant="danger" title="timeout را خیلی کوتاه نگذارید">
        یک ثانیه برای برنامه‌ای که زیر بار پاسخش دو ثانیه است، probe را به
        شکست کاذب می‌کشاند. مقدار را با اندازه‌گیری واقعی تعیین کنید، نه با
        پیش‌فرض.
      </Callout>
      <Callout variant="warning" title="probe با عوارض جانبی نسازید">
        probe باید فقط بخواند و بررسی کند. اگر endpoint مربوط به probe نوشتن،
        ارسال پیام یا تغییر وضعیت انجام دهد، هر بررسی دوره‌ای یک اثر ناخواسته
        می‌سازد.
      </Callout>

      <h2>جمع‌بندی</h2>
      <p>
        <Ltr>startupProbe</Ltr> راه‌اندازی کند را مدیریت می‌کند،{' '}
        <Ltr>readinessProbe</Ltr> ترافیک را فقط به پاد آماده می‌فرستد و{' '}
        <Ltr>livenessProbe</Ltr> بن‌بست داخلی را با ری‌استارت درمان می‌کند.
        probeها را بر اساس رفتار واقعی برنامه و با بودجه زمانی مشخص تنظیم
        کنید؛ نه با پیش‌فرض‌های کورکورانه. در درس بعدی می‌بینیم چطور منابع{' '}
        <Ltr>CPU</Ltr> و حافظه را تعریف کنیم تا پادها نه گرسنه بمانند و نه
        یکدیگر را از کار بیندازند.
      </p>
    </>
  )
}
