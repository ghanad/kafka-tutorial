import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const nodesOutput = `$ kubectl get nodes
NAME       STATUS   ROLES           AGE   VERSION
cp-1       Ready    control-plane   21d   v1.31.2
worker-1   Ready    <none>          21d   v1.31.2
worker-2   Ready    <none>          21d   v1.31.2`

const podsOutput = `$ kubectl get pods -n shop -o wide
NAME                        READY   STATUS    NODE
shop-api-6d9f7c8b5d-4kx2p   1/1     Running   worker-1
shop-api-6d9f7c8b5d-7mnpq   1/1     Running   worker-2
shop-api-6d9f7c8b5d-t9wzr   1/1     Running   worker-1`

export function KubernetesClusterAnatomyContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل دیدیم چرا به یک <Ltr>orchestrator</Ltr> نیاز داریم و کوبرنتیز
        چه جایگاهی میان گزینه‌های دیگر دارد. حالا وقت آن است که در کلاستر را باز
        کنیم. همان سناریوی «بازارک» را ادامه می‌دهیم: سه نسخه از{' '}
        <Ltr>shop-api</Ltr> روی یک کلاستر کوچک با یک کنترل‌پلین و دو نود کارگر.
        هدف این درس این است که بدانید هر جزء چه مسئولیتی دارد و یک درخواست{' '}
        <Ltr>kubectl apply</Ltr> چطور از یک فایل <Ltr>YAML</Ltr> به پاد در حال
        اجرا تبدیل می‌شود.
      </p>

      <h2>دو نیمهٔ کلاستر</h2>
      <p>
        هر کلاستر کوبرنتیز از دو بخش تشکیل می‌شود. <strong>کنترل‌پلین</strong>{' '}
        (<Ltr>Control Plane</Ltr>) مغز کلاستر است: وضعیت را نگه می‌دارد، تصمیم
        می‌گیرد و تغییرات را هماهنگ می‌کند. <strong>نودها</strong>{' '}
        (<Ltr>Nodes</Ltr>) ماشین‌هایی هستند که کانتینرهای واقعی روی آن‌ها اجرا
        می‌شوند. در یک محیط توسعه ممکن است همهٔ این اجزا روی یک ماشین باشند، اما
        در محیط واقعی جدا از هم‌اند.
      </p>
      <table>
        <thead>
          <tr>
            <th>بخش</th>
            <th>نقش کلی</th>
            <th>اجزای اصلی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>کنترل‌پلین</td>
            <td>نگه‌داری وضعیت، تصمیم‌گیری و هماهنگی</td>
            <td><Ltr>kube-apiserver</Ltr>، <Ltr>etcd</Ltr>، <Ltr>kube-scheduler</Ltr>، <Ltr>kube-controller-manager</Ltr></td>
          </tr>
          <tr>
            <td>نود</td>
            <td>اجرای پادها و گزارش وضعیت آن‌ها</td>
            <td><Ltr>kubelet</Ltr>، <Ltr>kube-proxy</Ltr>، <Ltr>container runtime</Ltr></td>
          </tr>
        </tbody>
      </table>

      <h2>کنترل‌پلین: مغز کلاستر</h2>
      <p>
        هیچ جزئی از کنترل‌پلین مستقیماً با دیگری حرف نمی‌زند؛ همه از طریق{' '}
        <Ltr>kube-apiserver</Ltr> با وضعیت کلاستر تعامل می‌کنند. این اجزا روی
        کنترل‌پلین اجرا می‌شوند:
      </p>
      <table>
        <thead>
          <tr>
            <th>جزء</th>
            <th>مسئولیت</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>kube-apiserver</Ltr></td>
            <td>دروازهٔ واحد همهٔ درخواست‌ها؛ احراز هویت، مجوزدهی و اعتبارسنجی اینجا انجام می‌شود</td>
          </tr>
          <tr>
            <td><Ltr>etcd</Ltr></td>
            <td>پایگاه‌دادهٔ کلید-مقدار که وضعیت کل کلاستر را نگه می‌دارد؛ تنها منبع حقیقت</td>
          </tr>
          <tr>
            <td><Ltr>kube-scheduler</Ltr></td>
            <td>انتخاب نودی که پاد تازه باید روی آن اجرا شود، بر اساس منابع و قوانین</td>
          </tr>
          <tr>
            <td><Ltr>kube-controller-manager</Ltr></td>
            <td>اجرای حلقه‌های آشتی؛ مثلاً نگه‌داشتن تعداد پادهای یک <Ltr>Deployment</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>cloud-controller-manager</Ltr></td>
            <td>اتصال کلاستر به سرویس‌های ابری مثل متعادل‌کننده بار و دیسک؛ در کلاسترهای محلی لازم نیست</td>
          </tr>
        </tbody>
      </table>
      <p>
        نکتهٔ مهم این است که <Ltr>kube-scheduler</Ltr> فقط تصمیم می‌گیرد؛ پاد را
        اجرا نمی‌کند. تصمیمش را به <Ltr>kube-apiserver</Ltr> گزارش می‌کند و آن
        گزارش در <Ltr>etcd</Ltr> ذخیره می‌شود. اجرای واقعی کار نود است.
      </p>

      <h2>نودها: جایی که کار واقعی انجام می‌شود</h2>
      <p>
        هر نود یک عامل اصلی و چند جزء کمکی دارد. نودها با کنترل‌پلین فقط از طریق{' '}
        <Ltr>kube-apiserver</Ltr> صحبت می‌کنند:
      </p>
      <table>
        <thead>
          <tr>
            <th>جزء</th>
            <th>مسئولیت</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>kubelet</Ltr></td>
            <td>عامل روی هر نود؛ پادهای تخصیص‌یافته را می‌سازد و وضعیتشان را گزارش می‌دهد</td>
          </tr>
          <tr>
            <td><Ltr>container runtime</Ltr></td>
            <td>موتور واقعی اجرای کانتینر، معمولاً <Ltr>containerd</Ltr>؛ ایمیج را می‌کشد و فرآیند را اجرا می‌کند</td>
          </tr>
          <tr>
            <td><Ltr>kube-proxy</Ltr></td>
            <td>برنامه‌ریزی قواعد شبکه روی نود تا ترافیک <Ltr>Service</Ltr> به پادهای درست برسد</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={nodesOutput} language="bash" filename="bash" />
      <p>
        با <Ltr>kubectl get nodes</Ltr> می‌بینید کدام ماشین کنترل‌پلین است و کدام
        نود کارگر. اگر پادها را با ستون <Ltr>NODE</Ltr> ببینید، معلوم می‌شود
        هر کدام کجا نشسته‌اند:
      </p>
      <CodeBlock code={podsOutput} language="bash" filename="bash" />
      <p>
        در این نمونه دو پاد روی <Ltr>worker-1</Ltr> و یک پاد روی{' '}
        <Ltr>worker-2</Ltr> است. اگر <Ltr>worker-1</Ltr> از کار بیفتد، کنترلرها
        متوجه می‌شوند و پادهای از دست رفته را جایگزین می‌کنند؛ این همان حلقه
        آشتی درس قبل است.
      </p>

      <h2>یک درخواست از kubectl تا اجرای پاد</h2>
      <p>
        بیایید همان <Ltr>shop-api-deployment.yaml</Ltr> را دوباره اجرا کنیم و
        ببینیم چه اتفاقی می‌افتد. این مسیر قلب کار کوبرنتیز است:
      </p>
      <ol>
        <li>
          <Ltr>kubectl</Ltr> فایل را به <Ltr>kube-apiserver</Ltr> می‌فرستد.
          سرور درخواست را احراز هویت، مجوزدهی و اعتبارسنجی می‌کند و شیء{' '}
          <Ltr>Deployment</Ltr> را در <Ltr>etcd</Ltr> ذخیره می‌کند.
        </li>
        <li>
          <Ltr>kube-controller-manager</Ltr> می‌بیند یک <Ltr>Deployment</Ltr> با
          سه نسخه وجود دارد اما هیچ پادی نیست. یک <Ltr>ReplicaSet</Ltr> می‌سازد
          و کنترلر آن سه شیء <Ltr>Pod</Ltr> ایجاد می‌کند. این پادها فعلاً در
          وضعیت <Ltr>Pending</Ltr> هستند و نودی ندارند.
        </li>
        <li>
          <Ltr>kube-scheduler</Ltr> پادهای بدون نود را می‌بیند، منابع و قوانین
          هر نود را می‌سنجد و برای هر پاد یک نود انتخاب می‌کند. این تصمیم از
          طریق <Ltr>kube-apiserver</Ltr> ثبت می‌شود.
        </li>
        <li>
          <Ltr>kubelet</Ltr> روی نود انتخاب‌شده می‌بیند پادی به او تخصیص یافته
          است. از <Ltr>containerd</Ltr> می‌خواهد ایمیج{' '}
          <Ltr>registry.local/shop-api:1.4.0</Ltr> را بکشد و کانتینر را اجرا
          کند.
        </li>
        <li>
          <Ltr>kubelet</Ltr> وضعیت پاد را به <Ltr>kube-apiserver</Ltr> گزارش
          می‌دهد و آن وضعیت در <Ltr>etcd</Ltr> به‌روز می‌شود. حالا پاد در وضعیت{' '}
          <Ltr>Running</Ltr> است.
        </li>
        <li>
          <Ltr>kube-proxy</Ltr> روی نودها قواعد شبکه را تنظیم می‌کند تا ترافیک
          <Ltr>Service</Ltr> به این پادها برسد. از این لحظه، کاربران بازارک
          می‌توانند به <Ltr>shop-api</Ltr> متصل شوند.
        </li>
      </ol>
      <Callout variant="info" title="همه از یک دروازه عبور می‌کنند">
        حتی خود <Ltr>kubelet</Ltr> و <Ltr>kube-scheduler</Ltr> هم با{' '}
        <Ltr>etcd</Ltr> مستقیم حرف نمی‌زنند. همه از <Ltr>kube-apiserver</Ltr>{' '}
        می‌خوانند و می‌نویسند. به همین دلیل است که می‌توانید بدون دست زدن به
        اجزای داخلی، با <Ltr>kubectl</Ltr> یا یک <Ltr>operator</Ltr> همان
        وضعیت را ببینید و تغییر دهید.
      </Callout>

      <h2>چرا API Server تنها دروازه است؟</h2>
      <p>
        این طراحی یک انتخاب عمدی است و چند فایدهٔ مستقیم دارد:
      </p>
      <ul>
        <li>
          <strong>یک منبع حقیقت:</strong> همهٔ اجزا یک تصویر واحد از وضعیت
          می‌بینند و لازم نیست وضعیت را بین خودشان همگام کنند.
        </li>
        <li>
          <strong>اعتبارسنجی متمرکز:</strong> احراز هویت، مجوزدهی و{' '}
          <Ltr>admission webhook</Ltr>ها در یک نقطه اعمال می‌شوند.
        </li>
        <li>
          <strong>مکانیزم watch:</strong> اجزا به‌جای نظرسنجی دوره‌ای، تغییرات
          را به‌صورت جریان دریافت می‌کنند؛ این کار واکنش سریع و بار کمتری دارد.
        </li>
        <li>
          <strong>کنترل همزمانی:</strong> هر شیء یک <Ltr>resourceVersion</Ltr>{' '}
          دارد؛ اگر دو نفر هم‌زمان تغییر بدهند، یکی از تغییرها رد می‌شود تا
          وضعیت خراب نشود.
        </li>
      </ul>

      <DeepDive title="پشت صحنه: etcd و کنترل‌پلین با دسترس‌پذیری بالا">
        <DeepDiveSection title="etcd و اکثریت">
          <p>
            <Ltr>etcd</Ltr> یک پایگاه‌دادهٔ توزیع‌شده است و برای نوشتن به
            اکثریت اعضا (<Ltr>quorum</Ltr>) نیاز دارد. با سه عضو، تحمل یک خرابی
            دارید؛ با پنج عضو، تحمل دو خرابی. اگر اکثریت از دست برود، کلاستر
            می‌تواند وضعیت فعلی را بخواند اما تغییر جدیدی ثبت نمی‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چند نسخه از apiserver">
          <p>
            <Ltr>kube-apiserver</Ltr> وضعیت را در خودش نگه نمی‌دارد؛ می‌توان
            چند نسخه از آن را پشت یک متعادل‌کننده بار گذاشت. هر نسخه با همان{' '}
            <Ltr>etcd</Ltr> حرف می‌زند و نتیجه یکسان است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="انتخاب رهبر">
          <p>
            <Ltr>kube-scheduler</Ltr> و <Ltr>kube-controller-manager</Ltr>{' '}
            معمولاً چند نسخه دارند اما فقط یکی فعال است. بقیه در حالت آماده‌به‌کار
            می‌مانند و با از دست رفتن رهبر، یکی از آن‌ها کار را ادامه می‌دهد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="اگر کنترل‌پلین از کار بیفتد">
          <p>
            پادهای در حال اجرا و <Ltr>kubelet</Ltr>ها به کار خود ادامه می‌دهند،
            چون کانتینرها از قبل اجرا شده‌اند. اما تا وقتی کنترل‌پلین برنگردد
            نمی‌توانید تغییر جدیدی اعمال کنید، پاد تازه زمان‌بندی کنید یا وضعیت
            را از طریق <Ltr>kubectl</Ltr> ببینید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="روی کنترل‌پلین بارکاری اجرا نکنید">
        کنترل‌پلین باید پایدار بماند. در کلاسترهای مدیریت‌شده معمولاً{' '}
        <Ltr>taint</Ltr> می‌خورد تا پادهای معمولی روی آن زمان‌بندی نشوند. اگر
        کنترل‌پلین با بارکاری رقابت کند، ممکن است کل کلاستر کند یا ناپایدار شود.
      </Callout>
      <Callout variant="warning" title="از etcd بکاپ بگیرید">
        <Ltr>etcd</Ltr> تنها منبع حقیقت است. اگر آن را از دست بدهید، تعریف
        همهٔ منابع را از دست می‌دهید. در محیط واقعی بکاپ دوره‌ای و آزمایش
        بازیابی، بخشی از عملیات روزمره است.
      </Callout>
      <Callout variant="danger" title="kube-proxy جای Ingress نیست">
        <Ltr>kube-proxy</Ltr> ترافیک <Ltr>Service</Ltr> را در سطح شبکهٔ نود
        مسیریابی می‌کند. ترجمهٔ نام دامنه، <Ltr>TLS</Ltr> و مسیریابی بر اساس
        مسیر <Ltr>HTTP</Ltr> کار <Ltr>Ingress</Ltr> یا <Ltr>Gateway API</Ltr>{' '}
        است؛ این دو لایه را با هم اشتباه نگیرید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <p>
        کنترل‌پلین وضعیت را در <Ltr>etcd</Ltr> نگه می‌دارد، از طریق{' '}
        <Ltr>kube-apiserver</Ltr> در دسترس است، با <Ltr>kube-scheduler</Ltr>{' '}
        تصمیم می‌گیرد و با <Ltr>kube-controller-manager</Ltr> اختلاف وضعیت را
        می‌بندد. نودها با <Ltr>kubelet</Ltr> پادها را اجرا می‌کنند، با{' '}
        <Ltr>container runtime</Ltr> کانتینر می‌سازند و با <Ltr>kube-proxy</Ltr>{' '}
        شبکه را آماده می‌کنند. در درس بعد سراغ کوچک‌ترین واحد اجرا می‌رویم: پاد،
        و می‌بینیم یک پاد چطور شبکه و فضای ذخیره‌سازی مشترک بین کانتینرها را
        فراهم می‌کند.
      </p>
    </>
  )
}
