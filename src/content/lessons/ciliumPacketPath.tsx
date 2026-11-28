import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { PacketPathExplainer } from '../../components/simulators/PacketPathExplainer'

const endpointInspect = `# endpointهای یک نود و identity هر کدام
cilium endpoint list

# جزئیات یک endpoint: veth، identity، سیاست‌های اعمال‌شده
cilium endpoint get 1234

# mapهای datapath که برنامه‌های eBPF از آن‌ها می‌خوانند
cilium bpf endpoint list
cilium bpf policy get 1234`

const traceCommands = `# مسیر بسته بین دو Pod را با Hubble ببینید
hubble observe --from-pod shop/web --to-pod shop/shop-api

# فقط جریان‌های ردشده
hubble observe --verdict DENIED

# بررسی وضعیت datapath روی این نود
cilium status --verbose
cilium monitor --type drop`

export function CiliumPacketPathContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در فصل قبل دیدیم که Cilium بسته‌ها را با eBPF در هسته پردازش می‌کند. اما
        «پردازش» دقیقاً یعنی چه؟ یک بسته از لحظه‌ای که از سوکت <Ltr>Pod web</Ltr>{' '}
        خارج می‌شود تا وقتی به سوکت <Ltr>Pod shop-api</Ltr> می‌رسد، از چند نقطه
        عبور می‌کند و در هر نقطه چه تصمیمی گرفته می‌شود؟ این درس همان مسیر را
        گام‌به‌گام دنبال می‌کند تا بعداً بدانید هر مشکل شبکه را کجا جست‌وجو کنید.
      </p>

      <h2>۱. datapath چیست؟</h2>
      <p>
        <Ltr>datapath</Ltr> مجموعه‌ای از نقاطی است که یک بسته در مسیر حرکت خود طی
        می‌کند و در هر نقطه تصمیمی دربارهٔ آن گرفته می‌شود: اجازه یا رد، مسیریابی
        به کدام نود، و تحویل به کدام Pod. در Cilium این تصمیم‌ها با برنامه‌های
        eBPF گرفته می‌شوند، نه با زنجیره‌های طولانی <Ltr>iptables</Ltr>.
      </p>
      <p>
        نکتهٔ مهم این است که datapath روی <strong>هر نود</strong> مستقل است. نودی
        که بسته را می‌فرستد و نودی که بسته را دریافت می‌کند، هر کدام بخشی از تصمیم
        را می‌گیرند. به همین دلیل یک بسته ممکن است دو بار بررسی سیاست شود: یک‌بار
        در خروج مبدأ و یک‌بار در ورود مقصد.
      </p>

      <h2>۲. veth و hookهای tc</h2>
      <p>
        هر Pod یک جفت <Ltr>veth</Ltr> دارد: یک سر داخل namespace خود Pod و یک سر
        روی نود. Cilium برنامه‌های eBPF را روی همین vethها و در hookهای{' '}
        <Ltr>tc</Ltr> وصل می‌کند. یعنی بسته دقیقاً در همان نقطه‌ای بررسی می‌شود که
        از Pod خارج یا وارد می‌شود.
      </p>
      <table>
        <thead>
          <tr>
            <th>نقطه</th>
            <th>جهت</th>
            <th>تصمیم اصلی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>veth مبدأ</td>
            <td>خروج از Pod</td>
            <td>identity مبدأ، سیاست خروج، انتخاب مسیر</td>
          </tr>
          <tr>
            <td>interface نود</td>
            <td>ورود از شبکه</td>
            <td>تشخیص مقصد محلی یا عبوری، کپسوله‌برداری</td>
          </tr>
          <tr>
            <td>veth مقصد</td>
            <td>ورود به Pod</td>
            <td>سیاست ورود، تحویل به سوکت</td>
          </tr>
        </tbody>
      </table>

      <h2>۳. مسیر گام‌به‌گام یک بسته</h2>
      <p>
        در توضیح تعاملی زیر یک بستهٔ مشخص را از <Ltr>Pod web</Ltr> روی{' '}
        <Ltr>node-2</Ltr> به <Ltr>Pod shop-api</Ltr> روی <Ltr>node-1</Ltr> دنبال
        می‌کنیم. به گام‌های ۲ و ۶ دقت کنید؛ همان‌جا دو بررسی سیاست رخ می‌دهد و
        تفاوت مسیر خروج و ورود روشن می‌شود.
      </p>

      <PacketPathExplainer />

      <h2>۴. identity، نه IP</h2>
      <p>
        در هر دو نقطه، تصمیم امنیتی بر اساس <Ltr>identity</Ltr> گرفته می‌شود.
        identity از labelهای Pod ساخته می‌شود و در map نگه داشته می‌شود. چرا این
        مهم است؟ چون IP یک Pod با ری‌استارت عوض می‌شود، اما labelهای آن معمولاً
        ثابت می‌مانند. سیاستی که به identity اشاره می‌کند، بعد از بازسازی Pod هم
        درست کار می‌کند.
      </p>
      <Callout variant="info" title="دو map کلیدی">
        <Ltr>endpoint map</Ltr> می‌گوید هر IP به کدام endpoint و identity تعلق
        دارد. <Ltr>policy map</Ltr> می‌گوید کدام identity اجازهٔ رسیدن به کدام
        identity روی کدام پورت را دارد. datapath فقط در همین دو map جست‌وجو می‌کند.
      </Callout>

      <h2>۵. مسیریابی: native یا overlay</h2>
      <p>
        بعد از اجازهٔ سیاست، datapath باید بسته را به مقصد برساند. اگر مقصد روی
        همان نود باشد، بسته محلی تحویل می‌شود. اگر روی نود دیگری باشد، انتخاب
        حالت routing وارد می‌شود:
      </p>
      <ul>
        <li>
          <strong>Native routing:</strong> بسته با IP اصلی Pod روی شبکهٔ زیرساخت
          می‌رود؛ شبکه باید مسیر بازه‌های Pod را بداند (مثلاً با BGP).
        </li>
        <li>
          <strong>Overlay:</strong> بسته داخل تونل <Ltr>VXLAN</Ltr> یا{' '}
          <Ltr>Geneve</Ltr> کپسوله می‌شود؛ شبکهٔ زیرساخت فقط باید IP نودها را
          بداند.
        </li>
      </ul>
      <p>
        این انتخاب در درس بعد با جزئیات بررسی می‌شود. برای این درس کافی است بدانید
        که سیاست امنیتی در هر دو حالت یکی است و فقط شکل رساندن بسته تفاوت دارد.
      </p>

      <h2>۶. connection tracking</h2>
      <p>
        Cilium برای هر اتصال یک رکورد در <Ltr>conntrack</Ltr> نگه می‌دارد. بستهٔ
        اول یک اتصال کامل از سیاست عبور می‌کند؛ بسته‌های بعدی همان اتصال از
        مسیر سریع‌تری می‌روند. این کار هم کارایی را بالا می‌برد و هم اجازه می‌دهد
        بسته‌های پاسخ به‌درستی برگردند، بدون اینکه یک قاعدهٔ جداگانه برای جهت
        برگشت بنویسید.
      </p>
      <Callout variant="warning" title="conntrack و تغییر سیاست">
        اگر سیاست را تغییر دهید، اتصال‌های موجود ممکن است تا مدتی با وضعیت قبلی
        ادامه پیدا کنند. برای اعمال فوری، گاهی باید اتصال را قطع کرد یا منتظر
        انقضای رکورد ماند.
      </Callout>

      <h2>۷. لایهٔ ۷ کجا وارد می‌شود؟</h2>
      <p>
        تا اینجا همه‌چیز در لایهٔ ۳ و ۴ بود. اگر سیاستی بگویید «فقط{' '}
        <Ltr className="font-mono">GET /api</Ltr> مجاز است»، eBPF باید درخواست
        HTTP را بفهمد. اینجا بسته به <Ltr>Envoy</Ltr> روی همان نود هدایت می‌شود و
        بعد از بررسی به مقصد می‌رود. برای سیاست‌های L3/L4، Envoy اصلاً در مسیر
        نیست.
      </p>

      <h2>۸. دیدن مسیر در عمل</h2>
      <p>
        برای اینکه ببینید datapath چه می‌داند، از این دستورها استفاده کنید:
      </p>
      <CodeBlock code={endpointInspect} language="bash" filename="inspect-datapath.sh" />
      <CodeBlock code={traceCommands} language="bash" filename="trace-flows.sh" />

      <DeepDive title="جزئیات: چرا دو بار بررسی سیاست و چه زمانی بسته drop می‌شود؟">
        <DeepDiveSection title="چرا خروج و ورود جدا هستند؟">
          <p>
            سیاست خروج می‌گوید یک Pod اجازهٔ شروع ارتباط با چه کسی را دارد. سیاست
            ورود می‌گوید چه کسی اجازهٔ رسیدن به یک Pod را دارد. این دو دیدگاه
            متفاوت‌اند: ممکن است Pod مبدأ اجازهٔ خروج داشته باشد اما Pod مقصد
            اجازهٔ ورود از آن مبدأ را نداشته باشد. در این حالت بسته در نود مقصد
            drop می‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="بسته کجا گم می‌شود؟">
          <p>
            اگر بسته در مسیر خروج مجاز و در مسیر ورود رد شود، از دید مبدأ ممکن است
            اتصال برقرار به نظر برسد اما پاسخ نرسد. برای همین هنگام عیب‌یابی باید
            هم سیاست مبدأ و هم مقصد را بررسی کنید. ابزار <Ltr>cilium monitor</Ltr>{' '}
            و Hubble دقیقاً نشان می‌دهند بسته در کدام نود و به چه دلیل drop شده
            است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="redirect به Envoy چه هزینه‌ای دارد؟">
          <p>
            برای سیاست L7، بسته از datapath به یک پروکسی فضای کاربری هدایت می‌شود.
            این کار برای درک HTTP لازم است اما تأخیر و مصرف منابع بیشتری از مسیر
            خالص L3/L4 دارد. پس فقط وقتی از سیاست L7 استفاده کنید که واقعاً به
            آن نیاز دارید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="فرض اینکه فقط سیاست ورود مهم است">
        سیاست خروج هم وجود دارد. اگر Pod مبدأ اجازهٔ خروج نداشته باشد، بسته حتی به
        شبکه نمی‌رسد. هنگام عیب‌یابی هر دو جهت را بررسی کنید.
      </Callout>
      <Callout variant="warning" title="انتظار عبور همه‌چیز از Envoy">
        برای L3/L4 خبری از Envoy نیست. اگر فقط لاگ‌های Envoy را ببینید، بخش بزرگی
        از ترافیک را از دست می‌دهید. برای دیدن همهٔ جریان‌ها از Hubble استفاده
        کنید.
      </Callout>
      <Callout variant="danger" title="تکیه بر IP در عیب‌یابی">
        IP Podها با ری‌استارت عوض می‌شود. اگر به‌جای identity روی IP تمرکز کنید،
        ممکن است سیاستی که درست کار می‌کند را خراب ببینید. همیشه identity و label
        را بررسی کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>datapath مجموعه نقاط تصمیم‌گیری بسته در مسیر حرکت آن است.</li>
        <li>هر Pod یک veth دارد و برنامه‌های tc روی همان نقطه اجرا می‌شوند.</li>
        <li>سیاست هم در خروج مبدأ و هم در ورود مقصد بررسی می‌شود.</li>
        <li>تصمیم‌ها بر اساس identity گرفته می‌شوند، نه IP.</li>
        <li>Envoy فقط برای سیاست L7 وارد مسیر می‌شود.</li>
      </ul>
      <p>
        حالا که مسیر بسته را می‌شناسیم، در درس بعد به دو انتخاب بنیادی می‌پردازیم:
        Podها چطور IP می‌گیرند و بسته بین نودها با native routing یا overlay
        جابه‌جا می‌شود.
      </p>
    </>
  )
}
