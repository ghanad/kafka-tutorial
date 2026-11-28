import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const replaceConfig = `# نصب Cilium با جایگزینی کامل kube-proxy
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --reuse-values \\
  --set kubeProxyReplacement=true \\
  --set k8sServiceHost=10.0.0.10 \\
  --set k8sServicePort=6443

# قبل از حذف kube-proxy، وضعیت را بررسی کنید
cilium status | grep -i kube-proxy`

const removeKubeProxy = `# فقط بعد از سالم بودن Cilium
kubectl -n kube-system delete daemonset kube-proxy

# بررسی این‌که دیگر پاد kube-proxy وجود ندارد
kubectl -n kube-system get pods -l k8s-app=kube-proxy

# روی کلاسترهای RKE2، به‌جای حذف دستی، در config.yaml خاموش کنید
# disable-kube-proxy: true`

const inspectServices = `# سرویس‌ها و backendهایی که Cilium می‌شناسد
cilium service list

# جزئیات یک سرویس: VIP، پورت و endpointها
cilium service get 1

# جدول تعادل بار در datapath
cilium bpf lb list

# آزمون سریع یک سرویس از داخل کلاستر
kubectl -n shop run curl-test --rm -it --image=curlimages/curl -- \\
  curl -s http://shop-api.shop.svc.cluster.local:8080/health/ready`

const maglevConfig = `# فعال کردن Maglev برای توزیع پایدار
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --reuse-values \\
  --set loadBalancer.algorithm=maglev \\
  --set maglev.tableSize=251 \\
  --set maglev.hashSeed=42`

export function KubernetesCiliumKubeProxyContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در کلاسترهای معمولی، <Ltr>kube-proxy</Ltr> مسئول پیاده‌سازی سرویس‌هاست:
        بسته‌ای که به <Ltr>ClusterIP</Ltr> می‌رود را به یکی از پادهای backend
        می‌رساند. Cilium می‌تواند همین کار را داخل datapath eBPF انجام دهد و
        kube-proxy را کامل حذف کند. در این درس می‌بینیم این جایگزینی چه معنایی
        دارد، چه ترتیبی برای حذف kube-proxy امن است و چطور نتیجه را بررسی کنیم.
      </p>

      <h2>kube-proxy چه کاری می‌کند؟</h2>
      <p>
        وقتی یک پاد به آدرس یک <Ltr>Service</Ltr> وصل می‌شود، در واقع به یک IP
        مجازی وصل می‌شود که به هیچ پاد مشخصی تعلق ندارد. کسی باید این بسته را به
        یکی از پادهای آماده برساند. kube-proxy این کار را با نوشتن قاعده در
        iptables یا IPVS انجام می‌دهد.
      </p>
      <table>
        <thead>
          <tr>
            <th>مرحله</th>
            <th>کار kube-proxy</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>دیدن سرویس</td>
            <td>از apiserver، <Ltr>Service</Ltr> و <Ltr>EndpointSlice</Ltr> را می‌خواند</td>
          </tr>
          <tr>
            <td>ساخت قاعده</td>
            <td>برای هر سرویس، قاعدهٔ تبدیل VIP به backend می‌نویسد</td>
          </tr>
          <tr>
            <td>انتخاب backend</td>
            <td>با random یا round-robin ساده یکی را انتخاب می‌کند</td>
          </tr>
          <tr>
            <td>به‌روزرسانی</td>
            <td>با تغییر endpointها، قاعده‌ها را دوباره می‌نویسد</td>
          </tr>
        </tbody>
      </table>
      <p>
        مشکل اصلی مقیاس است: با رشد تعداد سرویس‌ها و endpointها، زنجیرهٔ قاعده‌ها
        طولانی‌تر می‌شود و هر تغییر باید بخش بزرگی از آن را بازنویسی کند. Cilium
        همین تصمیم را با lookup در map می‌گیرد.
      </p>

      <h2>سه حالت جایگزینی</h2>
      <p>
        Cilium چند سطح جایگزینی دارد. انتخاب اشتباه این سطح، یکی از رایج‌ترین
        دلایل خرابی سرویس‌ها بعد از نصب است:
      </p>
      <table>
        <thead>
          <tr>
            <th>حالت</th>
            <th>معنی</th>
            <th>کاربرد</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>disabled</Ltr>
            </td>
            <td>kube-proxy همهٔ کار سرویس را انجام می‌دهد</td>
            <td>نصب ساده و بدون تغییر رفتار</td>
          </tr>
          <tr>
            <td>
              <Ltr>partial</Ltr>
            </td>
            <td>بخشی از نقش‌ها به Cilium می‌رسد و kube-proxy می‌ماند</td>
            <td>مهاجرت تدریجی یا محدودیت کرنل</td>
          </tr>
          <tr>
            <td>
              <Ltr>strict</Ltr>
            </td>
            <td>همهٔ تعادل بار سرویس در Cilium انجام می‌شود</td>
            <td>حذف کامل kube-proxy</td>
          </tr>
        </tbody>
      </table>
      <p>
        در نسخه‌های جدید Cilium، مقدار <Ltr>kubeProxyReplacement=true</Ltr> یعنی
        جایگزینی کامل. در نسخه‌های قدیمی‌تر ممکن است مقدار{' '}
        <Ltr>strict</Ltr> را ببینید. مستندات نسخهٔ خودتان را بررسی کنید.
      </p>

      <h2>پیش از حذف kube-proxy</h2>
      <p>
        اول Cilium را با جایگزینی کامل نصب یا به‌روزرسانی کنید. در این حالت Cilium
        باید بداند apiserver کجاست تا سرویس‌ها و endpointها را ببیند. بعد از
        به‌روزرسانی، وضعیت را تأیید کنید:
      </p>
      <CodeBlock code={replaceConfig} language="bash" filename="replace-kube-proxy.sh" />
      <Callout variant="warning" title="ترتیب مهم است">
        هیچ‌وقت اول kube-proxy را حذف نکنید و بعد امیدوار باشید Cilium جایش را
        پر کند. در فاصلهٔ بین این دو مرحله، سرویس‌ها از کار می‌افتند و ممکن است
        کلاستر به apiserver هم دسترسی نداشته باشد.
      </Callout>

      <h2>حذف kube-proxy</h2>
      <p>
        وقتی <Ltr>cilium status</Ltr> نشان داد جایگزینی کامل فعال است، می‌توانید
        DaemonSet مربوط به kube-proxy را حذف کنید. روی توزیع‌هایی مثل RKE2 بهتر
        است از ابتدا در تنظیمات کلاستر خاموش شود:
      </p>
      <CodeBlock code={removeKubeProxy} language="bash" filename="remove-kube-proxy.sh" />
      <p>
        در برخی توزیع‌ها قواعد قدیمی iptables بعد از حذف DaemonSet باقی می‌مانند.
        اگر رفتار سرویس‌ها عجیب بود، با ری‌استارت کنترل‌شدهٔ نود یا پاکسازی
        قاعده‌های قدیمی، وضعیت را تمیز کنید. این کار را در محیط آزمایشی تمرین
        کنید.
      </p>

      <h2>بررسی نتیجه</h2>
      <p>
        بعد از حذف kube-proxy باید سرویس‌ها همچنان کار کنند. سه چیز را بررسی
        کنید: وضعیت Cilium، جدول سرویس‌ها و یک درخواست واقعی به یک سرویس:
      </p>
      <CodeBlock code={inspectServices} language="bash" filename="inspect-services.sh" />
      <p>
        اگر <Ltr>cilium service list</Ltr> سرویس‌ها را نشان می‌دهد اما درخواست
        کار نمی‌کند، مشکل را در سیاست شبکه، DNS یا مسیر برگشت جست‌وجو کنید؛ نه
        لزوماً در جایگزینی kube-proxy.
      </p>

      <h2>Maglev و DSR</h2>
      <p>
        Cilium علاوه بر جایگزینی، دو قابلیت مهم برای تعادل بار دارد. اول{' '}
        <Ltr>Maglev</Ltr> که توزیع پایدارتری می‌دهد: با تغییر کوچک در backendها،
        بیشتر اتصال‌ها به همان backend قبلی می‌مانند. دوم{' '}
        <Ltr>Direct Server Return</Ltr> یا <Ltr>DSR</Ltr> که اجازه می‌دهد پاسخ
        مستقیماً از نود backend به کلاینت برگردد و بار مسیر برگشت از نود مبدأ
        برداشته شود.
      </p>
      <CodeBlock code={maglevConfig} language="bash" filename="maglev.sh" />
      <Callout variant="info" title="DSR به شبکهٔ زیرساخت حساس است">
        DSR مسیر پاسخ را تغییر می‌دهد. اگر شبکه بستهٔ پاسخ با IP مجازی سرویس را
        درست مسیریابی نکند، اتصال‌ها نیمه‌کاره می‌مانند. قبل از فعال‌سازی، آن را
        در محیط آزمایشی امتحان کنید.
      </Callout>

      <h2>socket-level load balancing</h2>
      <p>
        وقتی برنامه‌ای روی همان نود به یک سرویس وصل می‌شود، Cilium می‌تواند
        تعادل بار را در لحظهٔ <Ltr>connect</Ltr> و در سطح سوکت انجام دهد. در این
        حالت بسته لازم نیست مسیر شبکه‌ای کامل را طی کند و تأخیر کمتری دارد. این
        قابلیت برای ترافیک محلی همان نود بسیار مؤثر است.
      </p>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="حذف kube-proxy قبل از آماده شدن Cilium">
        این رایج‌ترین خطاست. اول وضعیت جایگزینی را تأیید کنید، بعد kube-proxy را
        حذف کنید.
      </Callout>
      <Callout variant="danger" title="فراموش کردن k8sServiceHost">
        برای جایگزینی کامل، Cilium باید apiserver را پیدا کند. آدرس اشتباه یا
        غیرقابل‌دسترس، Agent را از کنترل‌پلین جدا می‌کند.
      </Callout>
      <Callout variant="warning" title="باقی ماندن قاعده‌های قدیمی">
        اگر قواعد iptables قبلی پاک نشوند، ممکن است بسته‌ها قبل از رسیدن به
        datapath Cilium به مسیر اشتباه بروند. وضعیت نود را بعد از حذف kube-proxy
        بررسی کنید.
      </Callout>
      <Callout variant="warning" title="انتظار عملکرد یکسان با partial">
        در حالت <Ltr>partial</Ltr> هنوز kube-proxy بخشی از کار را انجام می‌دهد.
        اگر هدف حذف کامل است، باید به <Ltr>strict</Ltr> بروید و سلامت آن را
        تأیید کنید.
      </Callout>

      <DeepDive title="جزئیات: Maglev، DSR و تفاوت با IPVS">
        <DeepDiveSection title="Maglev چطور توزیع را پایدار می‌کند؟">
          <p>
            Maglev از یک جدول هش با اندازهٔ ثابت استفاده می‌کند. با اضافه یا حذف
            یک backend، تنها بخشی از جدول تغییر می‌کند؛ بنابراین بیشتر اتصال‌ها
            به همان backend قبلی می‌مانند. این پایداری برای سرویس‌های stateful
            مهم است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="DSR دقیقاً چه چیزی را عوض می‌کند؟">
          <p>
            در حالت عادی، پاسخ از مسیر نود مبدأ برمی‌گردد. در DSR، نود backend
            بستهٔ پاسخ را با IP مجازی سرویس مستقیماً به کلاینت می‌فرستد. نتیجه
            کاهش بار و تأخیر مسیر برگشت است، اما نیاز به مسیریابی درست شبکه دارد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="پس IPVS چه می‌شود؟">
          <p>
            IPVS از iptables سریع‌تر است چون از جدول هش استفاده می‌کند، اما هنوز
            یک جزء جدا و وابسته به kube-proxy است. Cilium نه‌فقط سریع‌تر است،
            بلکه سیاست، مسیریابی و تعادل بار را در یک datapath یکپارچه می‌کند.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>kube-proxy سرویس‌ها را با قاعده‌های iptables یا IPVS پیاده می‌کند.</li>
        <li>Cilium همین کار را با lookup در map انجام می‌دهد.</li>
        <li>برای حذف kube-proxy باید جایگزینی کامل فعال و سالم باشد.</li>
        <li>Maglev توزیع پایدار و DSR مسیر پاسخ کوتاه‌تر می‌دهد.</li>
        <li>ترتیب نصب، بررسی و حذف را هرگز برعکس نکنید.</li>
      </ul>
      <p>
        حالا سرویس‌ها در datapath Cilium پیاده می‌شوند. در درس بعد می‌بینیم چطور
        با Hubble رفتار همین سرویس‌ها را مشاهده و عیب‌یابی کنیم.
      </p>
    </>
  )
}
