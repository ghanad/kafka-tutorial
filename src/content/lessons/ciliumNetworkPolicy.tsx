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

const applyCommands = `# اعمال و بررسی سیاست
kubectl apply -f shop-api-ingress.yaml
kubectl get cnp -n shop
cilium policy get

# ببینید کدام endpointها به این سیاست گره خورده‌اند
cilium endpoint list

# جریان‌های ردشده را ببینید
hubble observe --namespace shop --verdict DENIED`

export function CiliumNetworkPolicyContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در فصل شبکه دیدیم که Cilium هر Pod را به یک <Ltr>identity</Ltr> تبدیل
        می‌کند و سیاست را در datapath اعمال می‌کند. اما سیاست را چطور می‌نویسیم؟
        این درس تفاوت سیاست‌های لایهٔ شبکه و لایهٔ کاربرد را روشن می‌کند، نحو{' '}
        <Ltr>CiliumNetworkPolicy</Ltr> را نشان می‌دهد و با نمونه‌های عملی توضیح
        می‌دهد چطور ترافیک را محدود کنیم.
      </p>

      <h2>۱. Kubernetes NetworkPolicy کافی نیست؟</h2>
      <p>
        Kubernetes یک منبع <Ltr>NetworkPolicy</Ltr> استاندارد دارد که در لایهٔ ۳
        و ۴ کار می‌کند: انتخاب Podها بر اساس label و اجازهٔ ورود یا خروج بر اساس
        Pod، namespace یا CIDR. اگر فقط به همین نیاز دارید، همان منبع کافی است و
        Cilium آن را پشتیبانی می‌کند.
      </p>
      <p>
        اما وقتی بخواهید قاعده‌ای در لایهٔ ۷ بنویسید (مثلاً فقط{' '}
        <Ltr className="font-mono">GET /api</Ltr>)، یا به انتخابگرهای پیشرفته‌تر
        مثل دامنهٔ DNS یا identityهای خاص نیاز داشته باشید،{' '}
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
            <td>قواعد لایهٔ ۷ (HTTP، Kafka)</td>
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

      <h2>۲. مدل «همه‌چیز رد، مگر آنچه مجاز است»</h2>
      <p>
        مهم‌ترین نکته دربارهٔ سیاست شبکه این است که وقتی یک سیاست یک Pod را انتخاب
        می‌کند، پیش‌فرض آن Pod به «رد» تغییر می‌کند. یعنی اگر سیاستی بگویید «فقط
        <Ltr>web</Ltr> اجازه دارد»، بقیهٔ منابع به‌طور خودکار رد می‌شوند. این
        برخلاف تصور رایج است که فکر می‌کنند سیاست فقط چیزی را مجاز می‌کند.
      </p>
      <Callout variant="info" title="انتخاب‌شدن، نه نوشتن قاعده">
        تا وقتی هیچ سیاستی یک Pod را انتخاب نکند، همهٔ ترافیک آن مجاز است. به
        محض اینکه یک سیاست آن Pod را انتخاب کند، همه‌چیز رد می‌شود مگر قواعدی که
        صریحاً اجازه داده‌اند.
      </Callout>

      <h2>۳. مسیر سیاست تا datapath</h2>
      <p>
        در توضیح تعاملی زیر یک سیاست مشخص را دنبال می‌کنیم: فقط{' '}
        <Ltr>app=web</Ltr> اجازه دارد به <Ltr>app=shop-api</Ltr> روی پورت{' '}
        <Ltr className="font-mono">8080</Ltr> وصل شود. ببینید سیاست چطور به map
        تبدیل می‌شود و یک منبع غیرمجاز کجا رد می‌شود.
      </p>

      <NetworkPolicyExplainer />

      <h2>۴. سیاست L3/L4 در عمل</h2>
      <p>
        این سیاست فقط اجازهٔ ورود از <Ltr>app=web</Ltr> روی پورت{' '}
        <Ltr className="font-mono">8080</Ltr> را می‌دهد. توجه کنید که{' '}
        <Ltr>endpointSelector</Ltr> تعیین می‌کند سیاست روی کدام Podها اعمال شود.
      </p>
      <CodeBlock code={l3l4Policy} language="yaml" filename="shop-api-ingress.yaml" />

      <h2>۵. سیاست L7: درک HTTP</h2>
      <p>
        همین سیاست را می‌توان دقیق‌تر کرد: فقط متد <Ltr>GET</Ltr> روی مسیر{' '}
        <Ltr className="font-mono">/api</Ltr> مجاز باشد. اینجا eBPF بسته را به{' '}
        <Ltr>Envoy</Ltr> می‌فرستد تا درخواست HTTP را بخواند. بقیهٔ متدها یا
        مسیرها رد می‌شوند، حتی اگر از منبع مجاز آمده باشند.
      </p>
      <CodeBlock code={l7Policy} language="yaml" filename="shop-api-l7.yaml" />
      <Callout variant="warning" title="هزینهٔ L7">
        سیاست L7 مسیر بسته را از Envoy عبور می‌دهد و منابع بیشتری مصرف می‌کند.
        اگر فقط به محدودسازی آدرس و پورت نیاز دارید، در لایهٔ L3/L4 بمانید.
      </Callout>

      <h2>۶. سیاست خروج</h2>
      <p>
        سیاست فقط برای ورود نیست. می‌توانید مشخص کنید یک Pod اجازهٔ اتصال به چه
        مقاصدی را دارد. این کار برای محدود کردن دسترسی Pod به اینترنت یا سرویس‌های
        حساس بسیار مهم است. مثلاً می‌توانید خروج را فقط به یک namespace مشخص یا
        یک دامنهٔ DNS محدود کنید.
      </p>

      <h2>۷. اعمال و بررسی</h2>
      <CodeBlock code={applyCommands} language="bash" filename="apply-policy.sh" />

      <DeepDive title="جزئیات: DNS، Kafka و ترتیب اولویت سیاست‌ها">
        <DeepDiveSection title="محدودسازی بر اساس دامنه">
          <p>
            با <Ltr>toFQDNs</Ltr> می‌توانید خروج را به نام دامنه محدود کنید، نه
            IP. Cilium نام را resolve می‌کند و IPهای متناظر را در map می‌نویسد.
            این کار برای دسترسی کنترل‌شده به سرویس‌های خارجی مفید است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="سیاست لایهٔ ۷ برای Kafka">
          <p>
            Cilium می‌تواند پروتکل Kafka را هم در لایهٔ ۷ درک کند و اجازه دهد فقط
            روی topicهای مشخص تولید یا مصرف شود. این نوع سیاست از Envoy با
            فیلتر مخصوص Kafka استفاده می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="وقتی چند سیاست هم‌زمان اعمال می‌شوند">
          <p>
            سیاست‌ها جمع می‌شوند: اگر هر سیاستی اجازه دهد، ترافیک مجاز است. اما
            قواعد L7 و L3/L4 با هم ترکیب می‌شوند و می‌توانند نتیجهٔ غیرمنتظره
            بسازند. هنگام عیب‌یابی، همهٔ سیاست‌هایی را که یک Pod را انتخاب می‌کنند
            بررسی کنید، نه فقط یکی.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="فراموش کردن اثر پیش‌فرض رد">
        وقتی یک سیاست Pod را انتخاب می‌کند، بقیهٔ ترافیک رد می‌شود. اگر فقط سیاست
        ورود بنویسید و سیاست خروج را فراموش کنید، ممکن است Pod نتواند به سرویس‌های
        لازم وصل شود.
      </Callout>
      <Callout variant="warning" title="انتخاب‌گر اشتباه">
        اگر <Ltr>endpointSelector</Ltr> با labelهای Pod هم‌خوان نباشد، سیاست روی
        هیچ Podی اعمال نمی‌شود و همه‌چیز باز می‌ماند. همیشه با{' '}
        <Ltr>cilium endpoint list</Ltr> تأیید کنید.
      </Callout>
      <Callout variant="danger" title="استفاده از IP به‌جای label">
        IP Pod عوض می‌شود. سیاستی که به IP تکیه کند بعد از ری‌استارت می‌شکند.
        همیشه از label و identity استفاده کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>NetworkPolicy استاندارد برای L3/L4 کافی است؛ CiliumNetworkPolicy برای L7 و بیشتر.</li>
        <li>انتخاب یک Pod یعنی پیش‌فرض آن به «رد» تغییر می‌کند.</li>
        <li>سیاست به identity و map تبدیل می‌شود و در هسته اجرا می‌شود.</li>
        <li>سیاست L7 از Envoy استفاده می‌کند و هزینهٔ بیشتری دارد.</li>
        <li>سیاست خروج را جدی بگیرید؛ ورود فقط نیمی از داستان است.</li>
      </ul>
      <p>
        حالا می‌دانیم چطور ترافیک را محدود کنیم. اما سیاست فقط می‌گوید چه کسی با
        چه کسی صحبت کند؛ اگر کسی ترافیک را روی شبکه شنود کند چه؟ در درس بعد
        رمزنگاری ترافیک با WireGuard و IPsec را بررسی می‌کنیم.
      </p>
    </>
  )
}
