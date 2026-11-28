import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { HubbleExplainer } from '../../components/simulators/HubbleExplainer'

const installHubble = `# فعال کردن Hubble در Helm
helm upgrade cilium cilium/cilium --namespace kube-system \\
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

# جریان بین دو Pod مشخص
hubble observe --from-pod shop/web --to-pod shop/shop-api

# خروجی JSON برای پردازش
hubble observe --namespace shop -o json`

const metrics = `# متریک‌های Prometheus مربوط به Hubble
kubectl -n kube-system port-forward svc/hubble-metrics 9965:9965

# نمونه‌ای از متریک‌ها
curl -s localhost:9965/metrics | grep hubble

# دسترسی به UI
cilium hubble ui`

export function CiliumHubbleContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        وقتی شبکه به مشکل می‌خورد، اولین سؤال این است: «چه کسی با چه کسی صحبت
        کرد و چه اتفاقی افتاد؟» لاگ‌های برنامه فقط بخشی از پاسخ را می‌دهند؛
        بسته‌هایی که در datapath رد شده‌اند هیچ‌وقت به برنامه نمی‌رسند. Hubble
        این شکاف را پر می‌کند. این درس نشان می‌دهد Hubble چطور جریان‌ها را
        می‌بیند، چه متریک‌هایی می‌دهد و چطور از UI و CLI آن استفاده کنید.
      </p>

      <h2>۱. Hubble چیست و چه چیزی را می‌بیند؟</h2>
      <p>
        Hubble مشاهده‌پذیری را از همان نقطهٔ تصمیم eBPF می‌گیرد. هر بار که
        datapath تصمیمی دربارهٔ یک بسته می‌گیرد، می‌تواند یک{' '}
        <Ltr>flow event</Ltr> تولید کند: identity مبدأ و مقصد، پورت، پروتکل،
        نتیجه (مجاز یا رد) و در لایهٔ ۷ جزئیات HTTP. این رویدادها در نود جمع
        می‌شوند و <Ltr>Relay</Ltr> آن‌ها را به یک نمای واحد تبدیل می‌کند.
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

      <h2>۲. مسیر یک رویداد از eBPF تا UI</h2>
      <p>
        در توضیح تعاملی زیر یک درخواست از <Ltr>Pod web</Ltr> به{' '}
        <Ltr>Pod shop-api</Ltr> را دنبال می‌کنیم و می‌بینیم رویداد چطور از هر دو
        نود جمع می‌شود. به گام ۵ دقت کنید؛ همان‌جا معلوم می‌شود چرا رویداد
        ردشده هم دیده می‌شود، حتی اگر برنامه هیچ لاگی نداشته باشد.
      </p>

      <HubbleExplainer />

      <h2>۳. نصب و فعال‌سازی</h2>
      <p>
        Hubble معمولاً همراه با Cilium نصب می‌شود، اما Relay و UI باید صریحاً
        فعال شوند. بعد از فعال‌سازی، وضعیت را بررسی کنید تا مطمئن شوید همهٔ
        اجزا بالا آمده‌اند.
      </p>
      <CodeBlock code={installHubble} language="bash" filename="install-hubble.sh" />

      <h2>۴. مشاهدهٔ جریان‌ها با CLI</h2>
      <p>
        <Ltr>hubble observe</Ltr> پرکاربردترین ابزار روزمره است. با فیلترها
        می‌توانید فقط جریان‌های یک namespace، یک Pod یا یک نتیجهٔ خاص را ببینید.
        این کار عیب‌یابی را از «حدس زدن» به «دیدن» تبدیل می‌کند.
      </p>
      <CodeBlock code={observeFlows} language="bash" filename="observe-flows.sh" />
      <Callout variant="tip" title="شروع از نتیجهٔ رد">
        وقتی چیزی کار نمی‌کند، اول <Ltr>--verdict DENIED</Ltr> را ببینید. اگر
        سیاستی ترافیک را رد کرده باشد، همان‌جا با دلیل مشخص می‌شود و لازم نیست
        ساعت‌ها لاگ برنامه را زیر و رو کنید.
      </Callout>

      <h2>۵. متریک‌ها و UI</h2>
      <p>
        Hubble متریک‌های Prometheus هم منتشر می‌کند: تعداد جریان‌ها، نرخ رد،
        تأخیر و حجم ترافیک. این متریک‌ها را می‌توانید در Grafana پایش کنید. UI
        هم نقشهٔ سرویس‌ها را به‌صورت بصری نشان می‌دهد.
      </p>
      <CodeBlock code={metrics} language="bash" filename="metrics-ui.sh" />

      <h2>۶. لایهٔ ۷ در Hubble</h2>
      <p>
        اگر سیاست L7 فعال باشد، Hubble می‌تواند جزئیات HTTP را هم نشان دهد:
        متد، مسیر و کد پاسخ. این کار برای عیب‌یابی سرویس‌هایی که در لایهٔ شبکه
        سالم‌اند اما در لایهٔ کاربرد خطا می‌دهند بسیار مفید است.
      </p>

      <DeepDive title="جزئیات: حلقهٔ رویداد، نمونه‌برداری و حجم داده">
        <DeepDiveSection title="ringbuf و رویدادها">
          <p>
            برنامه‌های eBPF رویدادها را در یک <Ltr>ringbuf</Ltr> می‌نویسند و
            Hubble agent آن‌ها را می‌خواند. این ساختار سریع است و با حجم بالای
            رویداد هم قابل مدیریت می‌ماند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="کنترل حجم داده">
          <p>
            در کلاسترهای پرترافیک، تولید همهٔ رویدادها می‌تواند سنگین باشد. با
            فیلتر و نمونه‌برداری می‌توانید فقط جریان‌های مهم را نگه دارید. برای
            عیب‌یابی موقت، فیلتر دقیق بهتر از جمع‌آوری همه‌چیز است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Hubble و Tetragon">
          <p>
            Hubble رویدادهای شبکه و Tetragon رویدادهای runtime را می‌دهند. با
            هم می‌توانید یک زنجیرهٔ حمله را ببینید: فرایند مشکوک اجرا شد و سپس
            به یک آدرس بیرونی وصل شد. این همبستگی ارزش زیادی در تحلیل حادثه دارد.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="فراموش کردن Relay">
        اگر Relay فعال نباشد، هر نود فقط رویدادهای خودش را دارد و نمای کلاستری
        ندارید. برای عیب‌یابی بین‌نودی، Relay ضروری است.
      </Callout>
      <Callout variant="warning" title="انتظار دیدن همهٔ بسته‌ها">
        Hubble رویدادهای تصمیم را می‌بیند، نه محتوای کامل بسته. برای تحلیل عمیق
        محتوا به ابزار دیگری نیاز دارید.
      </Callout>
      <Callout variant="danger" title="جمع‌آوری بی‌فیلتر">
        همهٔ رویدادها را نگه ندارید. حجم داده زیاد می‌شود و هزینهٔ ذخیره و
        پردازش بالا می‌رود. فیلتر را از ابتدا طراحی کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>Hubble رویدادهای datapath را از eBPF می‌خواند.</li>
        <li>Relay نمای واحد کلاستری می‌سازد.</li>
        <li>CLI فیلتر دقیق و UI نقشهٔ بصری می‌دهد.</li>
        <li>رویدادهای ردشده مهم‌ترین ابزار عیب‌یابی‌اند.</li>
        <li>Hubble مسیر داده را تغییر نمی‌دهد؛ فقط مشاهده می‌کند.</li>
      </ul>
      <p>
        حالا می‌توانیم ببینیم داخل کلاستر چه می‌گذرد. در فصل بعد به سراغ اتصال
        کلاستر به دنیای بیرون می‌رویم: BGP، Gateway API، Service Mesh و
        ClusterMesh.
      </p>
    </>
  )
}
