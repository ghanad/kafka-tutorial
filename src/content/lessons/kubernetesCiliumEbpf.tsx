import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { EbpfLifecycleExplainer } from '../../components/simulators/EbpfLifecycleExplainer'

const inspectCilium = `# اجزای Cilium که در کلاستر اجرا می‌شوند
kubectl -n kube-system get pods -l k8s-app=cilium -o wide
kubectl -n kube-system get daemonset cilium

# وضعیت datapath و برنامه‌های eBPF
cilium status
cilium bpf prog list

# نگاه سطح پایین‌تر با bpftool
sudo bpftool prog show
sudo bpftool map show`

const simpleHook = `SEC("tc")
int cilium_like_filter(struct __sk_buff *skb) {
  __u32 src = skb->remote_ip4;

  /* تصمیم بر اساس identity، نه فقط IP */
  if (!allowed_source(src))
    return TC_ACT_SHOT;

  return TC_ACT_OK;
}`

export function KubernetesCiliumEbpfContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا شبکهٔ کوبرنتیز را با یک <Ltr>CNI</Ltr> معمولی و{' '}
        <Ltr>kube-proxy</Ltr> دیدیم. آن مدل کار می‌کند، اما با رشد کلاستر چند
        لایهٔ جدا و زنجیره‌های طولانی <Ltr>iptables</Ltr> می‌سازد. Cilium همین
        لایه‌ها را با یک datapath مبتنی بر <Ltr>eBPF</Ltr> یکپارچه می‌کند. در این
        درس اول می‌فهمیم eBPF چیست و چرا این تغییر آن‌قدر مهم است؛ بعد در درس‌های
        بعدی Cilium را نصب و استفاده می‌کنیم.
      </p>

      <h2>چرا یک CNI معمولی کافی نیست؟</h2>
      <p>
        در یک کلاستر ساده، چند مسئلهٔ جدا داریم: دادن IP به پادها، مسیریابی بین
        نودها، پیاده‌سازی <Ltr>Service</Ltr>ها و اعمال سیاست شبکه. هر کدام از این
        مسئله‌ها معمولاً با یک جزء جدا حل می‌شود. نتیجه این است که بسته برای رسیدن
        به مقصد از چند نقطه و چند زنجیرهٔ قاعده عبور می‌کند.
      </p>
      <p>
        این جدایی سه هزینه دارد: عیب‌یابی سخت می‌شود، با رشد تعداد سرویس‌ها
        به‌روزرسانی قاعده‌ها سنگین می‌شود و برای دیدن این‌که چه کسی با چه کسی حرف
        زده، باید چند ابزار مختلف را کنار هم بگذارید. Cilium می‌خواهد این‌ها را
        در یک نقطه جمع کند.
      </p>

      <h2>eBPF در یک جمله چیست؟</h2>
      <p>
        <Ltr>eBPF</Ltr> یک ماشین مجازی کوچک و ایمن داخل کرنل است که اجازه می‌دهد
        برنامه‌های کوتاه را در نقاط مشخصی از مسیر پردازش بسته اجرا کنید. این
        برنامه‌ها با زبانی شبیه C نوشته می‌شوند، به بایت‌کد کامپایل می‌شوند، توسط
        کرنل بررسی می‌شوند و سپس روی همان رویداد اجرا می‌شوند.
      </p>
      <p>
        تفاوت مهم با ماژول کرنل این است که eBPF نمی‌تواند هر کاری بکند. کرنل قبل
        از اجرا مطمئن می‌شود برنامه به حافظهٔ غیرمجاز دست نمی‌زند و همیشه پایان
        می‌یابد. همین محدودیت است که آن را قابل‌اعتماد می‌کند.
      </p>

      <h2>چرخهٔ عمر یک برنامه eBPF</h2>
      <p>
        در توضیح تعاملی زیر یک برنامهٔ ساده را از کد C تا اجرا روی hook دنبال
        می‌کنیم. به دو گام دقت کنید: گام <Ltr>Verifier</Ltr> که امنیت را تضمین
        می‌کند و گام <Ltr>JIT</Ltr> که بایت‌کد را به کد ماشین بومی تبدیل می‌کند.
        همین دو گام هستند که eBPF را هم ایمن و هم سریع می‌کنند.
      </p>

      <EbpfLifecycleExplainer />

      <h2>Cilium از eBPF کجا استفاده می‌کند؟</h2>
      <p>
        Cilium یک برنامهٔ eBPF واحد نیست؛ مجموعه‌ای از برنامه‌ها و mapهاست که روی
        نقاط مختلف datapath نصب می‌شوند. هر نقطه برای یک نوع تصمیم انتخاب شده است:
      </p>
      <table>
        <thead>
          <tr>
            <th>نقطهٔ اجرا</th>
            <th>کاربرد در Cilium</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>tc</Ltr> روی <Ltr>veth</Ltr>
            </td>
            <td>بررسی سیاست ورود و خروج، مسیریابی و تبدیل سرویس</td>
          </tr>
          <tr>
            <td>
              <Ltr>XDP</Ltr>
            </td>
            <td>پردازش سریع بسته‌های ورودی در درایور کارت شبکه</td>
          </tr>
          <tr>
            <td>
              <Ltr>socket</Ltr>
            </td>
            <td>تعادل بار در سطح سوکت برای ترافیک محلی همان نود</td>
          </tr>
          <tr>
            <td>
              <Ltr>kprobe</Ltr>
            </td>
            <td>مشاهده و اعمال سیاست روی رفتار فرایندها در Tetragon</td>
          </tr>
        </tbody>
      </table>
      <p>
        تصمیم‌ها از روی <Ltr>map</Ltr>ها گرفته می‌شوند. map یک حافظهٔ مشترک بین
        کرنل و Agent است؛ Agent آن را با وضعیت کلاستر پر می‌کند و برنامهٔ eBPF در
        لحظهٔ عبور بسته از آن می‌خواند. به همین دلیل با رشد تعداد قاعده‌ها، زمان
        تصمیم تقریباً ثابت می‌ماند.
      </p>

      <h2>eBPF چه چیزی را عوض می‌کند؟</h2>
      <table>
        <thead>
          <tr>
            <th>معیار</th>
            <th>مدل سنتی با iptables</th>
            <th>مدل Cilium با eBPF</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>نحوهٔ تصمیم</td>
            <td>پیمایش زنجیره‌ای قاعده‌ها</td>
            <td>lookup در map</td>
          </tr>
          <tr>
            <td>با رشد سرویس‌ها</td>
            <td>کندتر می‌شود</td>
            <td>تقریباً ثابت می‌ماند</td>
          </tr>
          <tr>
            <td>لایه‌های جدا</td>
            <td>CNI، kube-proxy و ابزار سیاست جدا</td>
            <td>یک datapath یکپارچه</td>
          </tr>
          <tr>
            <td>مشاهده‌پذیری</td>
            <td>پراکنده و محدود</td>
            <td>رویداد مستقیم از نقطهٔ تصمیم</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="info" title="eBPF فقط بخشی از ماجراست">
        Cilium فقط یک برنامهٔ eBPF نیست. Agent، Operator، CRDها و API کوبرنتیز هم
        لازم‌اند تا وضعیت کلاستر به mapها و برنامه‌های درست تبدیل شود. eBPF موتور
        datapath است، نه کل سیستم.
      </Callout>

      <h2>یک برنامهٔ سادهٔ شبیه Cilium</h2>
      <p>
        برای درک بهتر، به یک فیلتر کوچک نگاه کنید. این برنامه روی hook مربوط به{' '}
        <Ltr>tc</Ltr> اجرا می‌شود و بسته را بر اساس منبعش رد یا عبور می‌دهد. Cilium
        همین ایده را با mapها، identityها و سیاست‌های بسیار کامل‌تر پیاده می‌کند:
      </p>
      <CodeBlock code={simpleHook} language="c" filename="filter.c" />
      <p>
        در کلاستر واقعی، برای دیدن برنامه‌ها و mapهای Cilium می‌توانید از{' '}
        <Ltr>cilium</Ltr> و <Ltr>bpftool</Ltr> استفاده کنید:
      </p>
      <CodeBlock code={inspectCilium} language="bash" filename="inspect-ebpf.sh" />

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="کرنل قدیمی">
        همهٔ قابلیت‌های Cilium روی هر کرنلی کار نمی‌کنند. برای جایگزینی کامل
        kube-proxy و برخی ویژگی‌های پیشرفته به کرنل نسبتاً جدید نیاز دارید. قبل از
        نصب، نسخهٔ کرنل نودها را بررسی کنید.
      </Callout>
      <Callout variant="warning" title="انتظار جایگزینی API کوبرنتیز">
        eBPF جای Kubernetes API را نمی‌گیرد. شما همچنان با <Ltr>Pod</Ltr>،{' '}
        <Ltr>Service</Ltr> و <Ltr>NetworkPolicy</Ltr> کار می‌کنید؛ Cilium آن‌ها را
        به datapath تبدیل می‌کند.
      </Callout>
      <Callout variant="danger" title="اشتباه گرفتن eBPF با Cilium">
        eBPF یک فناوری کرنل است و Cilium یکی از کاربران آن. ابزارهای دیگری هم از
        eBPF استفاده می‌کنند. وقتی می‌گوییم «Cilium سریع است»، منظورمان ترکیب eBPF
        با طراحی datapath و mapهای آن است.
      </Callout>

      <DeepDive title="جزئیات: hookها، mapها و محدودیت‌های کرنل">
        <DeepDiveSection title="انواع hook">
          <p>
            <Ltr>tc</Ltr> برای بسته‌های شبکه، <Ltr>XDP</Ltr> برای پردازش زودهنگام
            در درایور، <Ltr>kprobe</Ltr> و <Ltr>tracepoint</Ltr> برای رویدادهای
            کرنل و <Ltr>socket</Ltr> برای عملیات سوکت. Cilium برای هر نیاز نقطهٔ
            مناسب را انتخاب می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="mapها چگونه به‌روز می‌شوند؟">
          <p>
            Agent وضعیت را از apiserver می‌خواند و mapها را به‌روز می‌کند. برنامهٔ
            eBPF هیچ‌وقت مستقیم با apiserver حرف نمی‌زند؛ فقط از map می‌خواند.
            همین جدایی باعث می‌شود datapath سریع و کنترل‌پلین قابل مدیریت بماند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Verifier چه چیزی را رد می‌کند؟">
          <p>
            دسترسی به حافظهٔ نامعتبر، حلقهٔ بی‌پایان، خواندن از pointerهای
            تأییدنشده و برنامه‌های بیش از حد بزرگ. اگر برنامه رد شود، بارگذاری
            شکست می‌خورد و کرنل اجرای آن را آغاز نمی‌کند.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>eBPF برنامه‌های کوچک و ایمن را داخل کرنل اجرا می‌کند.</li>
        <li>Verifier امنیت و JIT سرعت اجرا را تأمین می‌کنند.</li>
        <li>Cilium با eBPF سیاست، مسیریابی و تعادل بار را یکپارچه می‌کند.</li>
        <li>mapها حافظهٔ مشترک Agent و datapath هستند.</li>
        <li>eBPF موتور است؛ Cilium کل سیستم شامل کنترل‌پلین و CRDهاست.</li>
      </ul>
      <p>
        حالا که می‌دانیم Cilium چطور کار می‌کند، در درس بعد آن را روی یک کلاستر
        واقعی نصب می‌کنیم و می‌بینیم هر جزء کجا بالا می‌آید.
      </p>
    </>
  )
}
