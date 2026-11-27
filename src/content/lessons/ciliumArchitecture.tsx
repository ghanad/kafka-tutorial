import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { CiliumArchitectureExplainer } from '../../components/simulators/CiliumArchitectureExplainer'

const inspectComponents = `# اجزای اصلی Cilium در کلاستر
kubectl -n kube-system get daemonset cilium
kubectl -n kube-system get deployment cilium-operator
kubectl -n kube-system get pods -l k8s-app=cilium -o wide

# سلامت کلی و وضعیت datapath
cilium status

# endpointها روی همین نود و identity هر کدام
cilium endpoint list
cilium identity list | head`

const whereRuns = `# Agent روی هر نود یک نسخه دارد (DaemonSet)
kubectl -n kube-system get pods -l k8s-app=cilium \\
  -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName

# Operator معمولاً یک یا دو نسخه دارد و به نود خاصی وابسته نیست
kubectl -n kube-system get pods -l name=cilium-operator \\
  -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName`

export function CiliumArchitectureContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        فرض کنید در کلاستر فروشگاه، یک Pod تازه با نام <Ltr>shop-api</Ltr> بالا
        می‌آید و می‌خواهید فقط سرویس <Ltr>web</Ltr> به آن دسترسی داشته باشد. چه
        کسی این اجازه را اعمال می‌کند؟ کدام جزء آن را می‌بیند، کدام جزء آن را به
        قاعده تبدیل می‌کند و بسته‌ها کجا بررسی می‌شوند؟ این درس نقشهٔ اجزای Cilium
        را می‌سازد تا در درس‌های بعدی بدانید هر رفتار را کجا دنبال کنید.
      </p>

      <h2>۱. Cilium چه چیزی را جایگزین می‌کند؟</h2>
      <p>
        در یک کلاستر معمولی، شبکهٔ Podها و سیاست‌های امنیتی معمولاً بین چند جزء
        پخش می‌شوند: یک <Ltr>CNI</Ltr> برای دادن IP، <Ltr>kube-proxy</Ltr> برای
        سرویس‌ها، و شاید یک ابزار جداگانه برای سیاست شبکه. Cilium این لایه‌ها را
        با یک datapath مبتنی بر <Ltr>eBPF</Ltr> یکپارچه می‌کند. یعنی همان برنامه‌ای
        که بسته را در هسته پردازش می‌کند، هم مسیریابی و هم سیاست را می‌داند.
      </p>
      <p>
        مزیت اصلی این یکپارچگی، <strong>کوتاه‌شدن مسیر بسته</strong> است. به‌جای
        عبور از زنجیره‌های <Ltr>iptables</Ltr> و چند پروکسی، یک برنامهٔ eBPF روی
        نقطهٔ ورود بسته تصمیم می‌گیرد و آن را به مقصد هدایت می‌کند. اما این تصمیم
        باید از جایی برنامه‌ریزی شود؛ همان جایی که اجزای Cilium وارد می‌شوند.
      </p>

      <h2>۲. چهار جزء اصلی</h2>
      <table>
        <thead>
          <tr>
            <th>جزء</th>
            <th>کجا اجرا می‌شود</th>
            <th>مسئولیت اصلی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>Cilium Agent</Ltr>
            </td>
            <td>روی هر نود، به‌صورت DaemonSet</td>
            <td>
              تبدیل Pod به endpoint، تخصیص IP، ساخت برنامه‌ها و mapهای eBPF، و
              اجرای سیاست‌ها روی همان نود
            </td>
          </tr>
          <tr>
            <td>
              <Ltr>Cilium Operator</Ltr>
            </td>
            <td>یک یا چند نسخه در کنترل‌پلین</td>
            <td>
              کارهای کلاستری: مدیریت استخرهای IPAM، جمع‌آوری identityهای
              بی‌استفاده، CRDها و برخی یکپارچه‌سازی‌ها
            </td>
          </tr>
          <tr>
            <td>
              <Ltr>Envoy</Ltr>
            </td>
            <td>روی نودها، فقط وقتی لازم باشد</td>
            <td>
              بررسی سیاست‌های لایهٔ ۷ مثل مسیر و متد HTTP؛ برای L3/L4 در مسیر نیست
            </td>
          </tr>
          <tr>
            <td>
              <Ltr>Hubble</Ltr>
            </td>
            <td>Agent روی هر نود + Relay در کنترل‌پلین</td>
            <td>
              خواندن و تجمیع جریان‌های شبکه برای مشاهده‌پذیری، عیب‌یابی و UI
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        نکتهٔ کلیدی این است که <strong>فقط Agent بسته‌ها را لمس می‌کند</strong>.
        Operator و apiserver وضعیت را هماهنگ می‌کنند، اما هیچ بسته‌ای از آن‌ها
        عبور نمی‌کند. Hubble هم فقط ناظر است و مسیر داده را تغییر نمی‌دهد.
      </p>

      <h2>۳. مسیر یک تغییر: از apiserver تا datapath</h2>
      <p>
        در توضیح تعاملی زیر یک سناریوی مشخص را گام‌به‌گام دنبال می‌کنیم: یک Pod
        با نام <Ltr>shop-api</Ltr> روی <Ltr>node-1</Ltr> ساخته می‌شود و یک سیاست
        اجازهٔ دسترسی از <Ltr>web</Ltr> را می‌گیرد. ببینید هر جزء در کدام گام وارد
        می‌شود و چه چیزی را تغییر می‌دهد. به‌ویژه به گام‌های ۵ و ۶ دقت کنید؛ همان
        جایی که وضعیت به برنامه و map تبدیل می‌شود.
      </p>

      <CiliumArchitectureExplainer />

      <h2>۴. Agent دقیقاً چه می‌کند؟</h2>
      <p>
        Agent قلب Cilium روی هر نود است. کارش را می‌توان در چهار گام خلاصه کرد:
      </p>
      <ul>
        <li>
          <strong>Watch کردن apiserver:</strong> تغییر Podها، سرویس‌ها و
          سیاست‌ها را می‌بیند.
        </li>
        <li>
          <strong>ساختن endpoint:</strong> برای هر Pod یک endpoint می‌سازد و از
          استخر IPAM به آن IP می‌دهد.
        </li>
        <li>
          <strong>تعیین identity:</strong> از labelها یک identity می‌سازد. تصمیم
          امنیتی بر اساس identity است، نه IP؛ چون IPها با ری‌استارت عوض می‌شوند.
        </li>
        <li>
          <strong>برنامه‌ریزی datapath:</strong> برنامه‌های eBPF را بارگذاری
          می‌کند و mapها را با endpointها و قواعد سیاست پر می‌کند.
        </li>
      </ul>
      <p>
        به همین دلیل است که Agent باید روی <em>هر</em> نود باشد. هر نود datapath
        مستقل خودش را دارد و باید قواعد مربوط به Podهای همان نود را بداند. اگر
        Agent یک نود از کار بیفتد، Podهای آن نود مسیر و سیاست درست را از دست
        می‌دهند.
      </p>

      <h2>۵. Operator چه کاری را فقط یک‌بار انجام می‌دهد؟</h2>
      <p>
        بعضی کارها ذاتاً کلاستری‌اند و نباید در هر نود تکرار شوند. مثلاً وقتی
        استخر IPAM را تقسیم می‌کنید، باید یک تصمیم مرکزی بگیرد که کدام بازه به
        کدام نود برسد. یا وقتی Podی حذف می‌شود، باید مطمئن شود identity بی‌استفاده
        در نهایت جمع‌آوری می‌شود. این‌ها وظیفهٔ <Ltr>Operator</Ltr> است.
      </p>
      <Callout variant="info" title="Operator جایگزین Agent نیست">
        Operator برنامهٔ eBPF بارگذاری نمی‌کند و بسته‌ای را فیلتر نمی‌کند. اگر
        Operator موقتاً از کار بیفتد، ترافیک موجود معمولاً ادامه می‌یابد؛ اما
        کارهای کلاستری مثل تخصیص IP جدید یا جمع‌آوری identity به تأخیر می‌افتد.
      </Callout>

      <h2>۶. Envoy کجا وارد می‌شود؟</h2>
      <p>
        برای سیاست‌های لایهٔ ۳ و ۴ (آدرس و پورت)، eBPF به‌تنهایی کافی است و
        Envoy اصلاً در مسیر بسته نیست. اما اگر بخواهید مثلاً فقط{' '}
        <Ltr className="font-mono">GET /api</Ltr> را مجاز کنید، باید درخواست HTTP
        را بفهمید. اینجا eBPF بسته را به <Ltr>Envoy</Ltr> روی همان نود هدایت
        می‌کند تا درخواست بررسی شود و سپس ادامه دهد.
      </p>
      <p>
        پس Envoy یک پروکسی همیشه‌حاضر نیست؛ یک ابزار اختیاری برای لایهٔ ۷ است.
        این تفاوت مهم است، چون خیلی‌ها تصور می‌کنند همهٔ ترافیک Cilium از Envoy
        می‌گذرد و بعد از دیدن تأخیر کم شگفت‌زده می‌شوند.
      </p>

      <h2>۷. Hubble چه چیزی را می‌بیند؟</h2>
      <p>
        چون تصمیم‌ها داخل eBPF گرفته می‌شوند، همان‌جا می‌توان رویداد تولید کرد.
        Hubble این رویدادها را می‌خواند: چه کسی با چه کسی صحبت کرد، کدام سیاست
        اجازه داد یا رد کرد، و در لایهٔ ۷ چه پاسخی برگشت. <Ltr>Relay</Ltr> این
        داده‌ها را از نودها جمع می‌کند تا در CLI یا UI یک تصویر واحد ببینید.
      </p>

      <h2>۸. یک نگاه به استقرار واقعی</h2>
      <p>
        اگر می‌خواهید مطمئن شوید اجزا درست بالا آمده‌اند، این دستورها را بزنید.
        به تفاوت <Ltr>DaemonSet</Ltr> برای Agent و <Ltr>Deployment</Ltr> برای
        Operator دقت کنید.
      </p>
      <CodeBlock code={inspectComponents} language="bash" filename="inspect-cilium.sh" />
      <CodeBlock code={whereRuns} language="bash" filename="where-runs.sh" />

      <DeepDive title="چرا Agent روی هر نود و Operator در کنترل‌پلین است؟">
        <DeepDiveSection title="مرز داده و کنترل">
          <p>
            هر بسته‌ای که بین Podها جابه‌جا می‌شود، لزوماً از نودی عبور می‌کند که
            Pod مبدأ یا مقصد روی آن است. پس تصمیم امنیتی باید همان‌جا و در سریع‌ترین
            نقطه گرفته شود. Agent را روی هر نود می‌گذاریم تا این تصمیم محلی باشد و
            به یک سرویس مرکزی وابسته نباشد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا بعضی کارها مرکزی‌اند؟">
          <p>
            تخصیص بازهٔ IP به نودها، جمع‌آوری identityهای بی‌استفاده و مدیریت CRDها
            به یک نمای کلی از کلاستر نیاز دارند. اگر هر Agent خودش این تصمیم‌ها را
            می‌گرفت، هماهنگی سخت می‌شد. Operator دقیقاً برای همین کارهای «یک‌بار در
            کل کلاستر» است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="endpoint و identity چه تفاوتی دارند؟">
          <p>
            endpoint نمایندهٔ یک Pod در datapath است و به یک آدرس شبکه گره خورده.
            identity برچسب پایدار امنیتی است که از labelها می‌آید. یک سیاست
            می‌تواند به identity اشاره کند، پس با عوض شدن IP یا ساخته شدن Pod جدید
            با همان labelها، سیاست همچنان درست کار می‌کند.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="انتظار پردازش ترافیک از Operator">
        Operator یک کنترلر است، نه پروکسی. اگر Operator در دسترس نباشد، بسته‌ها
        همچنان در datapath پردازش می‌شوند. مشکل اصلی، به‌تعویق‌افتادن کارهای
        کلاستری است.
      </Callout>
      <Callout variant="warning" title="فراموش کردن Agent روی یک نود">
        اگر Agent روی نودی اجرا نشود یا خراب باشد، Podهای آن نود endpoint و سیاست
        درست ندارند. همیشه تعداد Podهای Agent را با تعداد نودهای آماده مقایسه
        کنید.
      </Callout>
      <Callout variant="danger" title="فرض اینکه همه‌چیز از Envoy می‌گذرد">
        برای سیاست‌های L3/L4، Envoy در مسیر نیست. اگر برای عیب‌یابی فقط لاگ‌های
        Envoy را ببینید، ممکن است بخش بزرگی از ترافیک را از دست بدهید. برای دیدن
        همهٔ جریان‌ها از Hubble استفاده کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>apiserver منبع حقیقت است؛ همهٔ اجزا وضعیت را از آن می‌خوانند.</li>
        <li>Agent روی هر نود، Pod را به endpoint و identity تبدیل می‌کند.</li>
        <li>Operator کارهای کلاستری را هماهنگ می‌کند و بسته‌ای را لمس نمی‌کند.</li>
        <li>eBPF بسته‌ها را در هسته پردازش می‌کند؛ Envoy فقط برای L7 است.</li>
        <li>Hubble رویدادهای datapath را برای مشاهده‌پذیری جمع می‌کند.</li>
      </ul>
      <p>
        حالا که نقشهٔ اجزا روشن است، در درس بعد به پایین‌ترین لایه می‌رویم: eBPF
        دقیقاً چیست، چطور در هسته بارگذاری می‌شود و چرا این‌قدر سریع است. بدون
        درک eBPF، رفتار datapath برایتان جادو به نظر می‌رسد.
      </p>
    </>
  )
}
