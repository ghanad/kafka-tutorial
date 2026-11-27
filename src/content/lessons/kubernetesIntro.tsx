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
  # وضعیت مطلوب: همیشه دقیقاً ۳ نسخه از این برنامه در حال اجرا باشد
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
            - containerPort: 8080
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi`

const applyCommands = `# ارسال وضعیت مطلوب به کلاستر
kubectl apply -f shop-api-deployment.yaml

# دیدن اینکه کلاستر واقعاً چند پاد اجرا کرده است
kubectl get pods -n shop -l app=shop-api

# خروجی نمونه
NAME                        READY   STATUS    RESTARTS   AGE
shop-api-6d9f7c8b5d-4kx2p   1/1     Running   0          42s
shop-api-6d9f7c8b5d-7mnpq   1/1     Running   0          42s
shop-api-6d9f7c8b5d-t9wzr   1/1     Running   0          42s`

const deletePodCommand = `# یک پاد را عمداً حذف کنید تا ببینید کلاستر خودش جای آن را پر می‌کند
kubectl delete pod shop-api-6d9f7c8b5d-4kx2p -n shop

# چند ثانیه بعد دوباره نگاه کنید؛ یک پاد تازه با نام جدید ساخته شده است
kubectl get pods -n shop -l app=shop-api`

export function KubernetesIntroContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        <Ltr>Kubernetes</Ltr> یک سیستم متن‌باز برای اجرا و مدیریت کانتینرها در
        مقیاس است. اگر تا امروز برنامه‌ها را با <Ltr>docker run</Ltr> روی یک
        سرور بالا می‌آوردید، این درس نشان می‌دهد چرا با بزرگ‌تر شدن سیستم این
        روش کافی نیست و کوبرنتیز چه لایه‌ای روی <Ltr>Docker</Ltr> اضافه می‌کند.
        همه مثال‌ها حول یک سناریوی ثابت می‌چرخند: <Ltr>API</Ltr> یک فروشگاه
        اینترنتی به نام «بازارک» با نام <Ltr>shop-api</Ltr>.
      </p>

      <h2>چرا اجرای دستی کانتینر کافی نیست؟</h2>
      <p>
        فرض کنید <Ltr>shop-api</Ltr> را با یک دستور ساده روی سرور اجرا کرده‌اید.
        تا وقتی ترافیک کم است همه‌چیز خوب پیش می‌رود. اما به‌محض اینکه فروشگاه
        بزرگ می‌شود، چهار مشکل پشت سر هم ظاهر می‌شوند:
      </p>
      <ul>
        <li>
          <strong>مقیاس‌پذیری دستی:</strong> برای سه برابر کردن ظرفیت باید سه
          بار دستور را تایپ کنید و خودتان تصمیم بگیرید که کدام نسخه روی کدام
          سرور برود.
        </li>
        <li>
          <strong>بازیابی دستی:</strong> اگر کانتینر کرش کند، هیچ‌کس آن را دوباره
          بالا نمی‌آورد مگر اینکه یک اسکریپت جداگانه بنویسید.
        </li>
        <li>
          <strong>کشف سرویس:</strong> وقتی سه نسخه از برنامه دارید، ترافیک
          ورودی باید بین آن‌ها تقسیم شود؛ آدرس ثابت و متعادل‌کننده بار از کجا
          می‌آید؟
        </li>
        <li>
          <strong>به‌روزرسانی بدون قطعی:</strong> جایگزینی نسخه قدیم با نسخه
          جدید باید پله‌پله و بدون قطع شدن سرویس انجام شود.
        </li>
      </ul>
      <p>
        کوبرنتیز دقیقاً برای حل همین چهار مسئله ساخته شده است. تفاوت اصلی در
        مدل کار با آن است: شما به کوبرنتیز نمی‌گویید «این دستور را اجرا کن»،
        بلکه می‌گویید «من این وضعیت را می‌خواهم».
      </p>

      <h2>وضعیت مطلوب و حلقه آشتی</h2>
      <p>
        در کوبرنتیز همه‌چیز حول یک ایده ساده می‌چرخد: شما <strong>وضعیت
        مطلوب</strong> (<Ltr>Desired State</Ltr>) را در یک فایل <Ltr>YAML</Ltr>{' '}
        می‌نویسید و کلاستر دائماً تلاش می‌کند وضعیت واقعی را با آن یکی کند. به
        این تلاش مداوم <strong>حلقه آشتی</strong> (<Ltr>Reconciliation
        Loop</Ltr>) می‌گویند.
      </p>
      <p>
        برای <Ltr>shop-api</Ltr> کافی است بنویسید «همیشه سه نسخه در حال اجرا
        باشد»:
      </p>
      <CodeBlock code={deploymentYaml} language="yaml" filename="shop-api-deployment.yaml" />
      <p>
        حالا کلاستر این فایل را به‌عنوان قانون می‌پذیرد. اگر یکی از سه پاد
        (<Ltr>Pod</Ltr>) از بین برود، کنترلر بلافاصله یکی جدید می‌سازد؛ چون
        وضعیت واقعی از وضعیت مطلوب فاصله گرفته است. خودتان می‌توانید این رفتار
        را ببینید:
      </p>
      <CodeBlock code={applyCommands} language="bash" filename="bash" />
      <CodeBlock code={deletePodCommand} language="bash" filename="bash" />
      <Callout variant="tip" title="تفاوت بنیادی با اسکریپت">
        اسکریپت یک‌بار اجرا می‌شود و تمام. کوبرنتیز یک حلقه دائمی است: هر لحظه
        وضعیت واقعی را با وضعیت مطلوب مقایسه می‌کند و اختلاف را می‌بندد. به همین
        دلیل است که می‌توانید یک پاد را حذف کنید و سرویس همچنان زنده بماند.
      </Callout>

      <h2>کالبدشناسی یک کلاستر</h2>
      <p>
        هر کلاستر کوبرنتیز از دو بخش تشکیل می‌شود: <strong>کنترل‌پلین</strong>{' '}
        (<Ltr>Control Plane</Ltr>) که تصمیم می‌گیرد و <strong>نودها</strong>{' '}
        (<Ltr>Nodes</Ltr>) که برنامه‌ها را اجرا می‌کنند. در یک محیط توسعه ممکن
        است همه این اجزا روی یک ماشین باشند، اما در محیط واقعی جدا از هم‌اند.
      </p>
      <table>
        <thead>
          <tr>
            <th>بخش</th>
            <th>جزء</th>
            <th>مسئولیت</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>کنترل‌پلین</td>
            <td><Ltr>kube-apiserver</Ltr></td>
            <td>دروازه واحد همه درخواست‌ها؛ هر تغییر از اینجا عبور می‌کند</td>
          </tr>
          <tr>
            <td>کنترل‌پلین</td>
            <td><Ltr>etcd</Ltr></td>
            <td>پایگاه‌داده کلید-مقدار که وضعیت کل کلاستر را نگه می‌دارد</td>
          </tr>
          <tr>
            <td>کنترل‌پلین</td>
            <td><Ltr>kube-scheduler</Ltr></td>
            <td>انتخاب نودی که پاد تازه باید روی آن اجرا شود</td>
          </tr>
          <tr>
            <td>کنترل‌پلین</td>
            <td><Ltr>kube-controller-manager</Ltr></td>
            <td>اجرای حلقه‌های آشتی؛ مثلاً نگه‌داشتن تعداد پادها</td>
          </tr>
          <tr>
            <td>نود</td>
            <td><Ltr>kubelet</Ltr></td>
            <td>عامل روی هر نود که پادها را می‌سازد و وضعیتشان را گزارش می‌دهد</td>
          </tr>
          <tr>
            <td>نود</td>
            <td><Ltr>kube-proxy</Ltr></td>
            <td>مسیریابی ترافیک شبکه به پادهای درست</td>
          </tr>
          <tr>
            <td>نود</td>
            <td><Ltr>container runtime</Ltr></td>
            <td>موتور واقعی اجرای کانتینر، معمولاً <Ltr>containerd</Ltr></td>
          </tr>
        </tbody>
      </table>

      <DeepDive title="پشت صحنه: یک درخواست از kubectl تا اجرای پاد">
        <DeepDiveSection title="مسیر درخواست">
          <p>
            وقتی <Ltr>kubectl apply</Ltr> را اجرا می‌کنید، درخواست ابتدا به{' '}
            <Ltr>kube-apiserver</Ltr> می‌رسد. سرور آن را اعتبارسنجی می‌کند و
            نسخه نهایی را در <Ltr>etcd</Ltr> ذخیره می‌کند. از این لحظه، بقیه
            اجزا با تماشای تغییرات متوجه ماجرا می‌شوند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="کنترلر و ساخت پاد">
          <p>
            <Ltr>kube-controller-manager</Ltr> می‌بیند که یک <Ltr>Deployment</Ltr>{' '}
            با سه نسخه وجود دارد اما هیچ پادی نیست، پس سه شیء <Ltr>Pod</Ltr>{' '}
            می‌سازد. این پادها فعلاً «معلق» هستند و نودی ندارند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="زمان‌بندی و اجرا">
          <p>
            <Ltr>kube-scheduler</Ltr> برای هر پاد یک نود مناسب انتخاب می‌کند و
            آن را به آن نود نسبت می‌دهد. سپس <Ltr>kubelet</Ltr> روی همان نود
            از <Ltr>containerd</Ltr> می‌خواهد ایمیج را بکشد و کانتینر را اجرا
            کند. در تمام این مسیر، وضعیت هر شیء در <Ltr>etcd</Ltr> به‌روز
            می‌شود.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>چرا فقط Docker کافی نیست؟</h2>
      <p>
        <Ltr>Docker</Ltr> کانتینر می‌سازد و اجرا می‌کند، اما درباره این‌که کدام
        کانتینر روی کدام سرور باشد، اگر یکی مرد چه شود یا ترافیک چطور تقسیم
        شود تصمیمی نمی‌گیرد. کوبرنتیز همان لایه orchestration روی runtime است:
      </p>
      <table>
        <thead>
          <tr>
            <th>نیاز</th>
            <th>فقط <Ltr>Docker</Ltr></th>
            <th><Ltr>Kubernetes</Ltr></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>اجرای کانتینر</td>
            <td>بله</td>
            <td>بله، از طریق runtime مثل <Ltr>containerd</Ltr></td>
          </tr>
          <tr>
            <td>بازیابی خودکار پس از خطا</td>
            <td>با <Ltr>restart policy</Ltr> محدود و محلی</td>
            <td>در سطح کلاستر و برای همه نودها</td>
          </tr>
          <tr>
            <td>توزیع روی چند سرور</td>
            <td>خیر (مگر با ابزار جانبی)</td>
            <td>بله، با <Ltr>scheduler</Ltr></td>
          </tr>
          <tr>
            <td>متعادل‌سازی بار و کشف سرویس</td>
            <td>خیر</td>
            <td>بله، با <Ltr>Service</Ltr></td>
          </tr>
          <tr>
            <td>به‌روزرسانی تدریجی و بازگشت</td>
            <td>دستی</td>
            <td>با <Ltr>Deployment</Ltr> و <Ltr>rollout</Ltr></td>
          </tr>
        </tbody>
      </table>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="کوبرنتیز جایگزین Docker نیست">
        این دو رقیب نیستند. کوبرنتیز کانتینرها را خودش نمی‌سازد؛ از یک{' '}
        <Ltr>container runtime</Ltr> مثل <Ltr>containerd</Ltr> استفاده می‌کند.
        ایمیج‌ها همان ایمیج‌های <Ltr>Docker</Ltr> هستند.
      </Callout>
      <Callout variant="warning" title="کلاستر کوچک هم هزینه دارد">
        کنترل‌پلین خودش حافظه و منابع مصرف می‌کند. برای یک برنامه کوچک روی یک
        سرور، شاید <Ltr>Docker Compose</Ltr> ساده‌تر و ارزان‌تر باشد. کوبرنتیز
        وقتی می‌ارزد که چند سرویس، چند نود و نیاز به پایداری خودکار داشته باشید.
      </Callout>
      <Callout variant="danger" title="دستور kubectl جای فایل مانیفست را نمی‌گیرد">
        ساختن منابع با <Ltr>kubectl run</Ltr> یا <Ltr>kubectl create</Ltr> برای
        آزمایش خوب است، اما در عمل باید وضعیت مطلوب را در فایل نگه دارید تا
        قابل بازبینی، نسخه‌بندی و تکرار باشد.
      </Callout>

      <h2>جمع‌بندی</h2>
      <p>
        کوبرنتیز یک لایه orchestration است که وضعیت مطلوب شما را می‌پذیرد و با
        حلقه آشتی آن را واقعی نگه می‌دارد. کنترل‌پلین تصمیم می‌گیرد و نودها
        اجرا می‌کنند. در درس بعدی سراغ کوچک‌ترین واحد اجرا می‌رویم: پاد، و
        می‌بینیم یک پاد چطور شبکه و فضای ذخیره‌سازی مشترک بین کانتینرها را
        فراهم می‌کند.
      </p>
    </>
  )
}
