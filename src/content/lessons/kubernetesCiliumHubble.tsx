import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { HubbleExplainer } from '../../components/simulators/HubbleExplainer'

const enableHubble = `# فعال کردن Hubble همراه با Relay و UI
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --reuse-values \\
  --set hubble.enabled=true \\
  --set hubble.relay.enabled=true \\
  --set hubble.ui.enabled=true

# بررسی وضعیت
cilium status | grep -i hubble
kubectl -n kube-system get pods -l k8s-app=hubble-relay`

const observeFlows = `# جریان‌های یک namespace
hubble observe --namespace shop

# فقط جریان‌های ردشده
hubble observe --verdict DENIED

# جریان بین دو پاد مشخص
hubble observe --from-pod shop/web --to-pod shop/shop-api

# خروجی JSON برای پردازش
hubble observe --namespace shop -o json`

const hubbleUi = `# باز کردن UI از طریق port-forward
cilium hubble ui

# یا دستی
kubectl -n kube-system port-forward svc/hubble-ui 12000:80

# متریک‌های Prometheus
kubectl -n kube-system port-forward svc/hubble-metrics 9965:9965
curl -s localhost:9965/metrics | grep hubble`

export function KubernetesCiliumHubbleContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        وقتی یک سرویس در کوبرنتیز کار نمی‌کند، لاگ برنامه همیشه کافی نیست؛
        بسته‌هایی که در datapath رد شده‌اند هیچ‌وقت به برنامه نمی‌رسند. Hubble
        همین شکاف را پر می‌کند و جریان‌های شبکه را از همان نقطهٔ تصمیم eBPF
        می‌خواند. در این درس Hubble را فعال می‌کنیم، جریان‌ها را با CLI می‌بینیم
        و از UI و متریک‌ها استفاده می‌کنیم.
      </p>

      <h2>Hubble چیست و چه چیزی را می‌بیند؟</h2>
      <p>
        Hubble مشاهده‌پذیری را از datapath می‌گیرد. هر بار که Cilium دربارهٔ یک
        بسته تصمیم می‌گیرد، می‌تواند یک <Ltr>flow event</Ltr> تولید کند: identity
        مبدأ و مقصد، پورت، پروتکل، نتیجهٔ مجاز یا رد و در لایهٔ ۷ جزئیات HTTP.
        این رویدادها روی هر نود جمع می‌شوند و Relay آن‌ها را به یک نمای واحد
        تبدیل می‌کند.
      </p>
      <table>
        <thead>
          <tr>
            <th>جزء</th>
            <th>نقش</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>Hubble agent</Ltr>
            </td>
            <td>روی هر نود، رویدادهای eBPF را می‌خواند</td>
          </tr>
          <tr>
            <td>
              <Ltr>Hubble Relay</Ltr>
            </td>
            <td>رویدادهای همهٔ نودها را جمع و توزیع می‌کند</td>
          </tr>
          <tr>
            <td>
              <Ltr>Hubble UI</Ltr>
            </td>
            <td>نقشهٔ سرویس‌ها و جست‌وجوی جریان‌ها</td>
          </tr>
          <tr>
            <td>
              <Ltr>hubble CLI</Ltr>
            </td>
            <td>فیلتر دقیق جریان‌ها از ترمینال</td>
          </tr>
        </tbody>
      </table>

      <h2>مسیر یک رویداد از eBPF تا UI</h2>
      <p>
        در توضیح تعاملی زیر یک درخواست از <Ltr>Pod web</Ltr> به{' '}
        <Ltr>Pod shop-api</Ltr> را دنبال می‌کنیم. به گام‌های میانی دقت کنید؛
        همان‌جا معلوم می‌شود چرا یک جریان ردشده هم دیده می‌شود، حتی اگر برنامه
        هیچ لاگی نداشته باشد.
      </p>

      <HubbleExplainer />

      <h2>فعال‌سازی Hubble</h2>
      <p>
        Hubble معمولاً همراه Cilium نصب می‌شود، اما Relay و UI باید صریحاً فعال
        شوند. بعد از فعال‌سازی، وضعیت Relay را بررسی کنید:
      </p>
      <CodeBlock code={enableHubble} language="bash" filename="enable-hubble.sh" />
      <Callout variant="warning" title="Relay را فراموش نکنید">
        بدون Relay، هر نود فقط رویدادهای خودش را دارد و نمای کلاستری ندارید.
        برای عیب‌یابی بین‌نودی، Relay ضروری است.
      </Callout>

      <h2>دیدن جریان‌ها با CLI</h2>
      <p>
        <Ltr>hubble observe</Ltr> پرکاربردترین ابزار روزمره است. با فیلترها
        می‌توانید فقط جریان‌های یک namespace، یک پاد یا یک نتیجهٔ خاص را ببینید.
        برای شروع عیب‌یابی، همیشه از جریان‌های ردشده شروع کنید:
      </p>
      <CodeBlock code={observeFlows} language="bash" filename="observe-flows.sh" />
      <Callout variant="tip" title="اول DENIED را ببینید">
        اگر سیاستی ترافیک را رد کرده باشد، <Ltr>--verdict DENIED</Ltr> در چند
        ثانیه نشان می‌دهد چه چیزی و از کجا رد شده است. این کار از ساعت‌ها جست‌وجو
        در لاگ برنامه جلوگیری می‌کند.
      </Callout>

      <h2>UI و متریک‌ها</h2>
      <p>
        Hubble UI نقشهٔ سرویس‌ها را به‌صورت بصری نشان می‌دهد و برای درک سریع
        ارتباط بین سرویس‌ها مفید است. Hubble همچنین متریک‌های Prometheus منتشر
        می‌کند که می‌توانید در Grafana پایش کنید:
      </p>
      <CodeBlock code={hubbleUi} language="bash" filename="hubble-ui.sh" />

      <h2>لایهٔ ۷ در Hubble</h2>
      <p>
        اگر سیاست L7 فعال باشد، Hubble می‌تواند جزئیات HTTP را هم نشان دهد: متد،
        مسیر و کد پاسخ. این کار برای سرویس‌هایی که در لایهٔ شبکه سالم‌اند اما در
        لایهٔ کاربرد خطا می‌دهند بسیار مفید است.
      </p>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="انتظار دیدن محتوای بسته">
        Hubble رویدادهای تصمیم را می‌بیند، نه محتوای کامل بسته. برای تحلیل عمیق
        محتوا به ابزار دیگری نیاز دارید.
      </Callout>
      <Callout variant="warning" title="جمع‌آوری بی‌فیلتر">
        در کلاستر پرترافیک، تولید و نگه‌داری همهٔ رویدادها سنگین است. از فیلتر
        namespace، پاد یا verdict استفاده کنید.
      </Callout>
      <Callout variant="warning" title="فراموش کردن فعال‌سازی UI">
        Relay بدون UI هم کار می‌کند، اما اگر UI را می‌خواهید باید{' '}
        <Ltr>hubble.ui.enabled=true</Ltr> را جداگانه تنظیم کنید.
      </Callout>

      <DeepDive title="جزئیات: ringbuf، لایهٔ ۷ و ارتباط با Tetragon">
        <DeepDiveSection title="رویدادها کجا نگه‌داری می‌شوند؟">
          <p>
            برنامه‌های eBPF رویدادها را در یک <Ltr>ringbuf</Ltr> می‌نویسند و
            Hubble agent آن‌ها را می‌خواند. این ساختار برای حجم بالای رویداد
            طراحی شده و از رفت‌وبرگشت اضافه جلوگیری می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چه زمانی لایهٔ ۷ دیده می‌شود؟">
          <p>
            فقط وقتی سیاست L7 یا پروکسی Envoy در مسیر باشد. برای ترافیک L3/L4،
            Hubble همان اطلاعات شبکه را می‌دهد و محتوای HTTP را تفسیر نمی‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Hubble و Tetragon">
          <p>
            Hubble رویدادهای شبکه و Tetragon رویدادهای runtime را می‌دهند. با هم
            می‌توانید زنجیرهٔ یک حادثه را ببینید: یک فرایند مشکوک اجرا شده و سپس
            به یک آدرس بیرونی وصل شده است.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>Hubble رویدادهای datapath را از eBPF می‌خواند.</li>
        <li>Relay نمای واحد کلاستری می‌سازد.</li>
        <li>CLI فیلتر دقیق و UI نقشهٔ بصری می‌دهد.</li>
        <li>جریان‌های ردشده مهم‌ترین ابزار عیب‌یابی‌اند.</li>
        <li>Hubble مسیر داده را تغییر نمی‌دهد؛ فقط مشاهده می‌کند.</li>
      </ul>
      <p>
        حالا می‌توانیم ببینیم چه کسی با چه کسی حرف می‌زند. در درس بعد همین
        مشاهده‌پذیری را به سیاست تبدیل می‌کنیم: چه کسی اجازه دارد با چه کسی حرف
        بزند.
      </p>
    </>
  )
}
