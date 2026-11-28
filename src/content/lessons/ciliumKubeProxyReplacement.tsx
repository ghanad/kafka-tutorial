import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const replaceConfig = `# نصب Cilium با جایگزینی کامل kube-proxy
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --set kubeProxyReplacement=true \\
  --set k8sServiceHost=<API_SERVER_IP> \\
  --set k8sServicePort=6443

# بررسی اینکه kube-proxy واقعاً حذف شده و Cilium جای آن است
kubectl -n kube-system get ds kube-proxy
cilium status | grep -i kube-proxy`

const serviceInspect = `# سرویس‌ها و backendهایشان در datapath
cilium service list

# جزئیات یک سرویس: VIP، پورت و endpointها
cilium service get 1

# ببینید کدام سرویس‌ها با Maglev هش می‌شوند
cilium bpf lb list`

const maglevConfig = `# فعال کردن Maglev برای توزیع پایدار
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --set kubeProxyReplacement=true \\
  --set loadBalancer.algorithm=maglev \\
  --set maglev.tableSize=251 \\
  --set maglev.hashSeed=42`

export function CiliumKubeProxyReplacementContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در یک کلاستر معمولی، <Ltr>kube-proxy</Ltr> با زنجیره‌های{' '}
        <Ltr>iptables</Ltr> یا <Ltr>IPVS</Ltr> سرویس‌ها را پیاده می‌کند. با رشد
        تعداد سرویس‌ها، این زنجیره‌ها طولانی و به‌روزرسانی‌شان سنگین می‌شود. Cilium
        می‌تواند این نقش را کامل بردارد و تعادل بار سرویس را داخل همان datapath
        eBPF انجام دهد. این درس نشان می‌دهد این جایگزینی چه معنایی دارد،{' '}
        <Ltr>Maglev</Ltr> چیست و <Ltr>DSR</Ltr> چه تأثیری بر کارایی دارد.
      </p>

      <h2>۱. kube-proxy چه کاری می‌کند؟</h2>
      <p>
        وقتی یک Pod به آدرس یک <Ltr>Service</Ltr> وصل می‌شود، در واقع به یک IP
        مجازی (<Ltr>ClusterIP</Ltr>) وصل می‌شود که به هیچ Podی تعلق ندارد. کسی
        باید این بسته را به یکی از Podهای backend برساند. kube-proxy این کار را
        با نوشتن قاعده در هسته انجام می‌دهد. Cilium همان تصمیم را با lookup در
        map می‌گیرد.
      </p>
      <table>
        <thead>
          <tr>
            <th>معیار</th>
            <th>kube-proxy (iptables)</th>
            <th>جایگزینی با Cilium</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ساختار تصمیم</td>
            <td>زنجیرهٔ خطی قاعده‌ها</td>
            <td>lookup در map</td>
          </tr>
          <tr>
            <td>با رشد سرویس‌ها</td>
            <td>کندتر می‌شود</td>
            <td>تقریباً ثابت می‌ماند</td>
          </tr>
          <tr>
            <td>به‌روزرسانی</td>
            <td>بازنویسی زنجیره‌ها</td>
            <td>به‌روزرسانی map</td>
          </tr>
          <tr>
            <td>تعادل بار</td>
            <td>random یا round-robin ساده</td>
            <td>Maglev با توزیع پایدار</td>
          </tr>
          <tr>
            <td>حذف یک جزء</td>
            <td>kube-proxy جدا لازم است</td>
            <td>یک datapath یکپارچه</td>
          </tr>
        </tbody>
      </table>

      <h2>۲. جایگزینی کامل یعنی چه؟</h2>
      <p>
        Cilium سه سطح جایگزینی دارد: <Ltr>disabled</Ltr>، <Ltr>partial</Ltr> و{' '}
        <Ltr>strict</Ltr>. در حالت کامل، kube-proxy دیگر لازم نیست و می‌توانید آن
        را حذف کنید. در این حالت Cilium باید به apiserver دسترسی داشته باشد تا
        سرویس‌ها و endpointها را ببیند؛ به همین دلیل آدرس و پورت apiserver را در
        پیکربندی می‌دهید.
      </p>
      <Callout variant="warning" title="قبل از حذف kube-proxy">
        ابتدا Cilium را با جایگزینی کامل نصب و سلامت آن را تأیید کنید، سپس
        kube-proxy را حذف کنید. اگر ترتیب را برعکس کنید، سرویس‌ها در فاصلهٔ بین دو
        مرحله از کار می‌افتند.
      </Callout>

      <h2>۳. socket-level load balancing</h2>
      <p>
        یکی از مزیت‌های مهم Cilium این است که می‌تواند تعادل بار را در سطح سوکت
        انجام دهد. وقتی برنامه‌ای روی همان نود به یک سرویس وصل می‌شود، بسته اصلاً
        لازم نیست از مسیر شبکه‌ای کامل عبور کند؛ eBPF در لحظهٔ{' '}
        <Ltr>connect</Ltr> مقصد را انتخاب می‌کند. این کار تأخیر را کم و مسیر را
        کوتاه می‌کند.
      </p>

      <h2>۴. Maglev: توزیع پایدار</h2>
      <p>
        <Ltr>Maglev</Ltr> یک الگوریتم هش است که هر اتصال را به یک backend نسبت
        می‌دهد. مزیتش این است که با تغییر کوچک در مجموعهٔ backendها، بیشتر
        اتصال‌ها به همان backend قبلی می‌مانند. این پایداری برای سرویس‌های
        stateful یا کش‌دار مهم است، چون با هر تغییر کوچک همهٔ اتصال‌ها جابه‌جا
        نمی‌شوند.
      </p>
      <ul>
        <li>
          <strong>random:</strong> ساده اما با هر تغییر، توزیع کاملاً عوض می‌شود.
        </li>
        <li>
          <strong>maglev:</strong> توزیع پایدارتر و مناسب مقیاس بزرگ.
        </li>
      </ul>

      <h2>۵. DSR: پاسخ مستقیم از سرور</h2>
      <p>
        در حالت عادی، ترافیک برگشت از backend معمولاً از همان مسیری برمی‌گردد که
        رفته است؛ یعنی از نود مبدأ. <Ltr>Direct Server Return</Ltr> اجازه می‌دهد
        پاسخ مستقیماً از نود backend به کلاینت برگردد. نتیجه این است که نود مبدأ
        فقط ترافیک رفت را حمل می‌کند و بار مسیر برگشت روی آن نمی‌ماند.
      </p>
      <table>
        <thead>
          <tr>
            <th>حالت</th>
            <th>مسیر پاسخ</th>
            <th>مزیت</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>بدون DSR</td>
            <td>از نود مبدأ برمی‌گردد</td>
            <td>ساده و بدون نیاز به تنظیم شبکه</td>
          </tr>
          <tr>
            <td>با DSR</td>
            <td>مستقیم از نود backend</td>
            <td>کاهش بار و تأخیر مسیر برگشت</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="info" title="DSR و شبکهٔ زیرساخت">
        DSR به شبکه‌ای نیاز دارد که بستهٔ پاسخ با IP مجازی سرویس را به کلاینت
        برساند. در محیط‌های ساده ممکن است نیاز به تنظیم مسیر یا MTU داشته باشد.
      </Callout>

      <h2>۶. پیکربندی و بررسی</h2>
      <CodeBlock code={replaceConfig} language="bash" filename="replace-kube-proxy.sh" />
      <CodeBlock code={maglevConfig} language="bash" filename="maglev.sh" />
      <CodeBlock code={serviceInspect} language="bash" filename="inspect-services.sh" />

      <DeepDive title="جزئیات: XDP، IPVS و انتخاب حالت جایگزینی">
        <DeepDiveSection title="XDP چه چیزی اضافه می‌کند؟">
          <p>
            <Ltr>XDP</Ltr> برنامه‌های eBPF را در درایور کارت شبکه و قبل از ساخت
            ساختار بستهٔ کرنلی اجرا می‌کند. برای بارهای سنگین ورودی، این نقطه
            سریع‌ترین جای ممکن است. Cilium می‌تواند بخشی از تعادل بار و فیلتر
            ورودی را به XDP بسپارد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="پس IPVS چه می‌شود؟">
          <p>
            IPVS از iptables سریع‌تر است چون از جدول هش استفاده می‌کند، اما هنوز
            یک جزء جدا و وابسته به kube-proxy است. جایگزینی Cilium نه‌فقط سریع‌تر
            است، بلکه datapath را یکپارچه می‌کند: سیاست، مسیریابی و تعادل بار در
            یک لایه.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="partial در چه حالتی به کار می‌آید؟">
          <p>
            اگر شبکه یا نسخهٔ کرنل شما از جایگزینی کامل پشتیبانی نکند، می‌توانید
            حالت partial را انتخاب کنید. در این حالت Cilium بخشی از نقش‌ها را
            برمی‌دارد و kube-proxy برای بقیه می‌ماند. این گزینه برای مهاجرت تدریجی
            مناسب است، نه هدف نهایی.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="حذف kube-proxy قبل از آماده شدن Cilium">
        اگر Cilium هنوز جایگزینی کامل را فعال نکرده باشد و kube-proxy را حذف
        کنید، سرویس‌ها از کار می‌افتند. ابتدا وضعیت را با{' '}
        <Ltr>cilium status</Ltr> تأیید کنید.
      </Callout>
      <Callout variant="warning" title="فراموش کردن k8sServiceHost">
        برای جایگزینی کامل، Cilium باید apiserver را پیدا کند. اگر آدرس درست را
        ندهید، Agent نمی‌تواند سرویس‌ها را ببیند و کلاستر ناپایدار می‌شود.
      </Callout>
      <Callout variant="danger" title="فعال کردن DSR بدون بررسی شبکه">
        DSR مسیر پاسخ را تغییر می‌دهد. اگر شبکه بستهٔ پاسخ با IP مجازی را درست
        مسیریابی نکند، اتصال‌ها نیمه‌کاره می‌مانند. ابتدا در محیط آزمایشی
        امتحان کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>Cilium می‌تواند نقش kube-proxy را کامل بردارد.</li>
        <li>تعادل بار با lookup در map انجام می‌شود، نه پیمایش زنجیرهٔ قاعده‌ها.</li>
        <li>Maglev توزیع پایدارتری برای سرویس‌های مقیاس بزرگ می‌دهد.</li>
        <li>socket-level LB مسیر را برای ترافیک محلی کوتاه می‌کند.</li>
        <li>DSR بار مسیر برگشت را از نود مبدأ برمی‌دارد.</li>
      </ul>
      <p>
        حالا شبکه و سرویس‌ها را در datapath می‌شناسیم. در فصل بعد به سراغ امنیت
        می‌رویم: سیاست‌های L3/L4/L7، رمزنگاری ترافیک و امنیت runtime با Tetragon.
      </p>
    </>
  )
}
