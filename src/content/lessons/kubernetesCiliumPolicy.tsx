import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { NetworkPolicyExplainer } from '../../components/simulators/NetworkPolicyExplainer'

const l3l4Policy = `apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: shop-api-ingress
  namespace: shop
spec:
  endpointSelector:
    matchLabels:
      app: shop-api
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: web
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP`

const l7Policy = `apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: shop-api-l7
  namespace: shop
spec:
  endpointSelector:
    matchLabels:
      app: shop-api
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: web
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: GET
                path: /api`

const egressPolicy = `apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: shop-api-egress
  namespace: shop
spec:
  endpointSelector:
    matchLabels:
      app: shop-api
  egress:
    # اجازهٔ پرس‌وجوی DNS فقط برای دامنه‌های داخلی
    - toEndpoints:
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
          rules:
            dns:
              - matchPattern: "*.shop.svc.cluster.local"
    # اجازهٔ اتصال به سرویس پرداخت
    - toEndpoints:
        - matchLabels:
            app: payments
      toPorts:
        - ports:
            - port: "8443"
              protocol: TCP`

const applyCommands = `# اعمال سیاست
kubectl apply -f shop-api-ingress.yaml

# دیدن سیاست‌های Cilium در namespace
kubectl get cnp -n shop

# دیدن سیاست‌های ترجمه‌شده در datapath
cilium policy get

# دیدن endpointها و سیاست‌های گره‌خورده
cilium endpoint list

# دیدن جریان‌های ردشده
hubble observe --namespace shop --verdict DENIED`

export function KubernetesCiliumPolicyContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا Cilium را نصب کردیم، سرویس‌ها را در datapath دیدیم و با Hubble
        رفتار شبکه را مشاهده کردیم. حالا وقت کنترل است: چه کسی اجازه دارد با
        <Ltr>shop-api</Ltr> حرف بزند؟ در این درس <Ltr>NetworkPolicy</Ltr> استاندارد
        کوبرنتیز را با <Ltr>CiliumNetworkPolicy</Ltr> مقایسه می‌کنیم، یک سیاست
        L3/L4 و یک سیاست L7 می‌نویسیم و می‌بینیم سیاست چطور به تصمیم datapath
        تبدیل می‌شود.
      </p>

      <h2>NetworkPolicy استاندارد چه کاری می‌کند؟</h2>
      <p>
        کوبرنتیز یک منبع <Ltr>NetworkPolicy</Ltr> دارد که در لایهٔ ۳ و ۴ کار
        می‌کند: انتخاب پادها بر اساس label و اجازهٔ ورود یا خروج بر اساس پاد،
        namespace یا CIDR. اگر فقط به همین نیاز دارید، همین منبع کافی است و Cilium
        آن را پشتیبانی می‌کند.
      </p>
      <p>
        اما وقتی بخواهید قاعده‌ای در لایهٔ ۷ بنویسید، مثلاً فقط{' '}
        <Ltr className="font-mono">GET /api</Ltr> را اجازه دهید، یا انتخابگرهای
        پیشرفته‌تری مثل دامنهٔ DNS و identity بخواهید،{' '}
        <Ltr>CiliumNetworkPolicy</Ltr> وارد می‌شود.
      </p>
      <table>
        <thead>
          <tr>
            <th>قابلیت</th>
            <th>NetworkPolicy استاندارد</th>
            <th>CiliumNetworkPolicy</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>لایهٔ ۳ و ۴</td>
            <td>بله</td>
            <td>بله</td>
          </tr>
          <tr>
            <td>قواعد لایهٔ ۷ مثل HTTP</td>
            <td>خیر</td>
            <td>بله</td>
          </tr>
          <tr>
            <td>انتخاب بر اساس دامنهٔ DNS</td>
            <td>خیر</td>
            <td>بله</td>
          </tr>
          <tr>
            <td>سیاست خروج پیشرفته</td>
            <td>محدود</td>
            <td>بله</td>
          </tr>
          <tr>
            <td>انتخاب بر اساس identity</td>
            <td>غیرمستقیم</td>
            <td>بله</td>
          </tr>
        </tbody>
      </table>

      <h2>مدل «همه‌چیز رد، مگر آنچه مجاز است»</h2>
      <p>
        وقتی اولین سیاست را روی یک مجموعهٔ پاد اعمال می‌کنید، رفتار پیش‌فرض آن
        مجموعه عوض می‌شود: هر ترافیکی که صریحاً مجاز نشده باشد رد می‌شود. این
        همان مدل امنیتی درست است، اما اگر آن را فراموش کنید، بعد از اعمال سیاست
        ممکن است سرویس‌هایی که قبلاً کار می‌کردند از دسترس خارج شوند.
      </p>
      <Callout variant="warning" title="سیاست، نه فیلتر اضافه">
        NetworkPolicy یک لیست «چیزهایی که باید بلاک شوند» نیست. وقتی سیاستی روی
        یک پاد اعمال می‌شود، آن پاد وارد حالت default deny می‌شود و فقط مسیرهای
        مجاز باقی می‌مانند.
      </Callout>

      <h2>یک سیاست L3/L4 برای shop-api</h2>
      <p>
        فرض کنید فقط پادهای دارای برچسب <Ltr>app: web</Ltr> اجازه دارند روی پورت
        ۸۰۸۰ به <Ltr>shop-api</Ltr> وصل شوند. این سیاست را با{' '}
        <Ltr>CiliumNetworkPolicy</Ltr> می‌نویسیم:
      </p>
      <CodeBlock code={l3l4Policy} language="yaml" filename="shop-api-ingress.yaml" />
      <p>
        <Ltr>endpointSelector</Ltr> می‌گوید این سیاست روی کدام پادها اعمال شود و{' '}
        <Ltr>fromEndpoints</Ltr> می‌گوید چه کسی مجاز است. بقیهٔ ترافیک ورودی به
        این پاد رد می‌شود.
      </p>

      <h2>یک سیاست L7: فقط GET /api</h2>
      <p>
        حالا محدودیت را یک لایه بالاتر می‌بریم: حتی <Ltr>web</Ltr> هم فقط اجازه
        دارد <Ltr className="font-mono">GET /api</Ltr> بفرستد. این کار به Envoy
        نیاز دارد، چون تصمیم در لایهٔ HTTP گرفته می‌شود:
      </p>
      <CodeBlock code={l7Policy} language="yaml" filename="shop-api-l7.yaml" />
      <Callout variant="info" title="L7 یعنی پروکسی در مسیر">
        برای سیاست L7، Cilium از Envoy استفاده می‌کند. این یعنی بسته از یک پروکسی
        عبور می‌کند و کمی سربار دارد. برای قواعد سادهٔ L3/L4 از L7 استفاده نکنید.
      </Callout>

      <h2>مسیر سیاست تا datapath</h2>
      <p>
        در توضیح تعاملی زیر می‌بینیم یک <Ltr>CiliumNetworkPolicy</Ltr> چطور از
        apiserver خوانده می‌شود، به identity و map تبدیل می‌شود و در نهایت یک
        درخواست مجاز یا رد می‌شود. به گام‌های ترجمه دقت کنید؛ همان‌جاست که label
        به identity و سیاست به lookup تبدیل می‌شود.
      </p>

      <NetworkPolicyExplainer />

      <h2>سیاست خروج و DNS</h2>
      <p>
        تا اینجا فقط ورود را محدود کردیم. در محیط واقعی، پادها باید بتوانند DNS
        بپرسند و فقط به سرویس‌های لازم وصل شوند. سیاست خروج زیر اجازه می‌دهد{' '}
        <Ltr>shop-api</Ltr> فقط دامنه‌های داخلی را resolve کند و به سرویس پرداخت
        وصل شود:
      </p>
      <CodeBlock code={egressPolicy} language="yaml" filename="shop-api-egress.yaml" />
      <Callout variant="danger" title="فراموش کردن DNS">
        اگر سیاست خروج اعمال کنید و DNS را مجاز نکنید، برنامه با خطای resolve
        متوقف می‌شود. این یکی از رایج‌ترین دلایل خرابی بعد از اعمال سیاست است.
      </Callout>

      <h2>اعمال و بررسی</h2>
      <p>
        بعد از نوشتن سیاست، آن را اعمال کنید و از سه زاویه بررسی کنید: منبع سیاست،
        ترجمهٔ آن در datapath و جریان‌های واقعی:
      </p>
      <CodeBlock code={applyCommands} language="bash" filename="apply-policy.sh" />
      <p>
        اگر Hubble جریان‌های <Ltr>DENIED</Ltr> نشان می‌دهد، اول labelها و
        namespace را بررسی کنید. بیشتر خطاهای سیاست از یک برچسب اشتباه یا یک
        قاعدهٔ DNS فراموش‌شده می‌آید.
      </p>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="ناهماهنگی label">
        اگر <Ltr>matchLabels</Ltr> با برچسب واقعی پاد یکی نباشد، سیاست روی پاد
        اعمال نمی‌شود یا ترافیک مجاز را رد می‌کند. برچسب‌ها را با{' '}
        <Ltr>kubectl get pod --show-labels</Ltr> بررسی کنید.
      </Callout>
      <Callout variant="warning" title="فراموش کردن namespace">
        انتخابگرها به namespace حساس‌اند. اگر پاد مبدأ در namespace دیگری است،
        باید با <Ltr>io.kubernetes.pod.namespace</Ltr> آن را مشخص کنید.
      </Callout>
      <Callout variant="danger" title="فعال کردن L7 بدون Envoy">
        سیاست L7 بدون پروکسی Envoy اجرا نمی‌شود. اگر Envoy در دسترس نباشد،
        سیاست یا اعمال نمی‌شود یا رفتار غیرمنتظره می‌دهد.
      </Callout>
      <Callout variant="warning" title="انتظار مجاز بودن همهٔ ترافیک">
        بعد از اعمال اولین سیاست، همه‌چیز به‌جز مسیرهای مجاز رد می‌شود. این
        رفتار عمدی است، نه باگ.
      </Callout>

      <DeepDive title="جزئیات: identity، policy map و پروکسی L7">
        <DeepDiveSection title="label چطور به identity تبدیل می‌شود؟">
          <p>
            Cilium مجموعهٔ برچسب‌های مؤثر یک پاد را به یک identity عددی تبدیل
            می‌کند. سیاست‌ها روی identity اعمال می‌شوند، نه روی IP. به همین دلیل
            با تغییر IP پاد، سیاست همچنان درست کار می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="policy map چیست؟">
          <p>
            Agent سیاست‌ها را به mapهای eBPF ترجمه می‌کند. برنامهٔ datapath در
            لحظهٔ عبور بسته، با یک lookup تصمیم می‌گیرد. این تصمیم به تعداد
            سیاست‌ها وابسته نیست و با رشد کلاستر کند نمی‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="L7 چطور اجرا می‌شود؟">
          <p>
            برای قواعد HTTP، ترافیک به Envoy هدایت می‌شود. Envoy درخواست را
            بررسی می‌کند و سپس به پاد مقصد می‌فرستد. این لایه انعطاف زیادی می‌دهد،
            اما هزینهٔ پروکسی و پیچیدگی بیشتری هم دارد.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>NetworkPolicy استاندارد برای L3/L4 کافی است.</li>
        <li>CiliumNetworkPolicy قواعد L7، DNS و egress پیشرفته می‌دهد.</li>
        <li>اولین سیاست، پاد را به حالت default deny می‌برد.</li>
        <li>label و namespace را دقیق بررسی کنید.</li>
        <li>سیاست L7 به Envoy وابسته است.</li>
      </ul>
      <p>
        حالا هم شبکه را می‌بینیم و هم کنترل می‌کنیم. این نقطهٔ خوبی برای پایان
        بخش Cilium مقدماتی است؛ از اینجا می‌توانید سراغ مباحث پیشرفته‌تر مثل
        رمزنگاری، Gateway API و ClusterMesh بروید.
      </p>
    </>
  )
}
