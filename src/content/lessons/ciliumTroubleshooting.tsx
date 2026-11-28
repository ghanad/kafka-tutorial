import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const healthChecks = `# سلامت کلی Cilium و اجزا
cilium status
cilium status --verbose

# Podهای Agent و Operator
kubectl -n kube-system get pods -l k8s-app=cilium -o wide
kubectl -n kube-system get pods -l name=cilium-operator

# لاگ Agent روی یک نود
kubectl -n kube-system logs ds/cilium --tail=100`

const datapathDebug = `# بسته‌های dropشده و دلیل آن‌ها
cilium monitor --type drop

# جریان‌های زنده
cilium monitor --type trace

# وضعیت endpointها و سیاست‌ها
cilium endpoint list
cilium policy get

# جریان‌های ردشده با Hubble
hubble observe --verdict DENIED --last 50`

const sysdumpCommand = `# جمع‌آوری اطلاعات کامل برای پشتیبانی
cilium sysdump

# بررسی مصرف منابع و کارایی
cilium status --verbose | grep -i -E 'cpu|memory'
kubectl top pods -n kube-system -l k8s-app=cilium`

const tuningConfig = `# تنظیمات مؤثر بر کارایی
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --set bpf.datapathMode=netkit \\
  --set bpf.masquerade=true \\
  --set kubeProxyReplacement=true \\
  --set loadBalancer.algorithm=maglev

# بررسی حالت datapath و ویژگی‌های فعال
cilium status --verbose | grep -i datapath`

export function CiliumTroubleshootingContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در محیط عملیاتی، Cilium بخشی از مسیر حیاتی شبکه است. وقتی چیزی کار نمی‌کند،
        باید بدانید از کجا شروع کنید و کدام ابزار را کجا به کار ببرید. این درس یک
        نقشهٔ عیب‌یابی می‌دهد: از سلامت اجزا تا datapath و سیاست، و در پایان
        تنظیماتی که بر کارایی اثر دارند.
      </p>

      <h2>۱. از بالا به پایین شروع کنید</h2>
      <p>
        عیب‌یابی شبکه را همیشه از لایهٔ بالاتر شروع کنید. اول مطمئن شوید اجزای
        Cilium سالم‌اند، بعد به datapath و سیاست بروید. اگر Agent روی نودی بالا
        نیامده باشد، هیچ مقدار بررسی سیاست کمکی نمی‌کند.
      </p>
      <table>
        <thead>
          <tr>
            <th>لایه</th>
            <th>سؤال</th>
            <th>ابزار</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>اجزا</td>
            <td>Agent و Operator سالم‌اند؟</td>
            <td>
              <Ltr>cilium status</Ltr>
            </td>
          </tr>
          <tr>
            <td>endpoint</td>
            <td>Podها endpoint دارند؟</td>
            <td>
              <Ltr>cilium endpoint list</Ltr>
            </td>
          </tr>
          <tr>
            <td>سیاست</td>
            <td>چه چیزی مجاز یا رد شده؟</td>
            <td>
              <Ltr>hubble observe</Ltr>
            </td>
          </tr>
          <tr>
            <td>datapath</td>
            <td>بسته کجا drop می‌شود؟</td>
            <td>
              <Ltr>cilium monitor</Ltr>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>۲. بررسی سلامت</h2>
      <p>
        اولین دستور همیشه <Ltr>cilium status</Ltr> است. این دستور وضعیت Agent،
        Operator، Hubble و datapath را خلاصه می‌کند. اگر همه‌چیز سبز است، مشکل
        احتمالاً در سیاست یا مسیریابی است، نه در اجزا.
      </p>
      <CodeBlock code={healthChecks} language="bash" filename="health.sh" />
      <Callout variant="tip" title="تعداد Agent را با نودها مقایسه کنید">
        اگر تعداد Podهای Agent کمتر از تعداد نودهای آماده باشد، Podهای آن نود
        بدون endpoint و سیاست می‌مانند. این یکی از رایج‌ترین دلایل مشکلات شبکه است.
      </Callout>

      <h2>۳. عیب‌یابی datapath</h2>
      <p>
        <Ltr>cilium monitor</Ltr> بسته‌ها را همان‌طور که از datapath عبور می‌کنند
        نشان می‌دهد. با <Ltr>--type drop</Ltr> فقط بسته‌های ردشده و دلیلشان را
        می‌بینید. این دقیق‌ترین ابزار برای فهمیدن اینکه چرا یک بسته به مقصد
        نمی‌رسد است.
      </p>
      <CodeBlock code={datapathDebug} language="bash" filename="datapath-debug.sh" />

      <h2>۴. مشکلات رایج و نشانه‌ها</h2>
      <table>
        <thead>
          <tr>
            <th>نشانه</th>
            <th>احتمال</th>
            <th>بررسی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Pod در Pending می‌ماند</td>
            <td>استخر IPAM خالی یا Agent خراب</td>
            <td>
              <Ltr>cilium ipam show</Ltr>
            </td>
          </tr>
          <tr>
            <td>اتصال برقرار می‌شود اما پاسخ نمی‌آید</td>
            <td>سیاست ورود مقصد یا MTU</td>
            <td>
              <Ltr>hubble observe --verdict DENIED</Ltr>
            </td>
          </tr>
          <tr>
            <td>فقط بعضی سرویس‌ها کار می‌کنند</td>
            <td>سیاست L7 یا انتخاب‌گر اشتباه</td>
            <td>
              <Ltr>cilium policy get</Ltr>
            </td>
          </tr>
          <tr>
            <td>دانلود بزرگ قطع می‌شود</td>
            <td>MTU در overlay یا رمزنگاری</td>
            <td>بررسی MTU و بسته‌های بزرگ</td>
          </tr>
          <tr>
            <td>DNS کار نمی‌کند</td>
            <td>سیاست خروج DNS یا CoreDNS</td>
            <td>مشاهدهٔ جریان‌های DNS در Hubble</td>
          </tr>
        </tbody>
      </table>

      <h2>۵. جمع‌آوری اطلاعات برای پشتیبانی</h2>
      <p>
        وقتی مشکل پیچیده است، <Ltr>cilium sysdump</Ltr> همهٔ اطلاعات لازم را در
        یک بسته جمع می‌کند: تنظیمات، وضعیت، لاگ‌ها و mapها. این کار اشتراک‌گذاری
        با تیم پشتیبانی را ساده می‌کند.
      </p>
      <CodeBlock code={sysdumpCommand} language="bash" filename="sysdump.sh" />

      <h2>۶. تیونینگ کارایی</h2>
      <p>
        کارایی Cilium به انتخاب‌های datapath بستگی دارد. سه تنظیم بیشترین اثر را
        دارند: جایگزینی kube-proxy، حالت datapath و الگوریتم تعادل بار. قبل از
        تغییر، کارایی فعلی را اندازه بگیرید تا بدانید بهبود واقعی است یا نه.
      </p>
      <CodeBlock code={tuningConfig} language="bash" filename="tuning.sh" />
      <ul>
        <li>
          <strong>kube-proxy replacement:</strong> حذف زنجیره‌های iptables و
          تصمیم‌گیری در map.
        </li>
        <li>
          <strong>netkit / XDP:</strong> مسیر بستهٔ کوتاه‌تر برای ترافیک ورودی.
        </li>
        <li>
          <strong>Maglev:</strong> توزیع پایدارتر و مقیاس‌پذیرتر.
        </li>
        <li>
          <strong>masquerade:</strong> مدیریت NAT برای ترافیک خروجی.
        </li>
      </ul>

      <DeepDive title="جزئیات: conntrack، mapهای پر و اندازه‌گیری کارایی">
        <DeepDiveSection title="جدول conntrack پر می‌شود">
          <p>
            اگر تعداد اتصال‌ها از ظرفیت conntrack بیشتر شود، اتصال‌های جدید رد
            می‌شوند. اندازهٔ جدول و مدت نگه‌داری رکوردها را با الگوی ترافیک خود
            تنظیم کنید. علائم معمولاً به‌صورت خطاهای پراکنده در اتصال‌های جدید
            دیده می‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="mapهای eBPF و سقف آن‌ها">
          <p>
            بعضی mapها اندازهٔ ثابت دارند. اگر تعداد endpointها یا سیاست‌ها از
            ظرفیت بیشتر شود، ممکن است خطا ببینید. اندازهٔ mapها را با رشد کلاستر
            هماهنگ کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چطور بهبود را اندازه بگیریم؟">
          <p>
            قبل و بعد از تغییر، معیارهای یکسان را بسنجید: throughput، latency،
            نرخ drop و مصرف CPU. تغییر تنظیمات بدون اندازه‌گیری می‌تواند کارایی را
            بدتر کند، نه بهتر.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="شروع از datapath بدون بررسی اجزا">
        اگر Agent یا Operator خراب است، بررسی بسته‌ها بی‌فایده است. همیشه از
        سلامت کلی شروع کنید.
      </Callout>
      <Callout variant="warning" title="تغییر چند تنظیم هم‌زمان">
        اگر چند تنظیم را با هم عوض کنید، نمی‌فهمید کدام مؤثر بوده. هر بار یک
        تغییر بدهید و اندازه بگیرید.
      </Callout>
      <Callout variant="danger" title="نادیده گرفتن لاگ‌های Agent">
        بسیاری از مشکلات در لاگ Agent نشانه دارند: خطای بارگذاری برنامه، خطای
        verifier یا مشکل map. قبل از حدس زدن، لاگ را بخوانید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>عیب‌یابی را از سلامت اجزا شروع کنید، نه از datapath.</li>
        <li>cilium status و cilium monitor دقیق‌ترین ابزارها هستند.</li>
        <li>Hubble جریان‌های ردشده را با دلیل نشان می‌دهد.</li>
        <li>MTU، conntrack و ظرفیت mapها را جدی بگیرید.</li>
        <li>هر تغییر کارایی را با معیار اندازه بگیرید.</li>
      </ul>
      <p>
        این درس پایان مسیر Cilium است. حالا از eBPF و datapath تا امنیت،
        مشاهده‌پذیری، اتصال چند کلاستر و عملیات، تصویری کامل دارید. قدم بعدی،
        تمرین در یک کلاستر آزمایشی و ساختن سیاست‌ها و مسیرهای واقعی است.
      </p>
    </>
  )
}
