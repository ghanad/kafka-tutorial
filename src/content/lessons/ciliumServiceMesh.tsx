import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const enableMesh = `# فعال کردن قابلیت‌های mesh در Cilium
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --set envoy.enabled=true \\
  --set authentication.enabled=true

# بررسی وضعیت
cilium status | grep -i envoy
kubectl -n kube-system get pods -l k8s-app=cilium-envoy`

const mtlsPolicy = `apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: shop-api-mtls
  namespace: shop
spec:
  endpointSelector:
    matchLabels:
      app: shop-api
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: web
      authentication:
        mode: required`

const l7Example = `apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: shop-api-http
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
                path: /api
              - method: POST
                path: /api/orders`

export function CiliumServiceMeshContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        Service Mesh معمولاً یعنی یک پروکسی کنار هر Pod (sidecar) که ترافیک را
        می‌گیرد و قابلیت‌هایی مثل mTLS، مسیریابی پیشرفته و مشاهده‌پذیری می‌دهد.
        اما sidecarها منابع مصرف می‌کنند و مدیریتشان پیچیده است. Cilium با eBPF و
        Envoy یک mesh سبک‌تر می‌سازد که برای بخش بزرگی از ترافیک به sidecar نیاز
        ندارد. این درس نشان می‌دهد این مدل چطور کار می‌کند و محدودیت‌هایش چیست.
      </p>

      <h2>۱. mesh سنتی با sidecar</h2>
      <p>
        در مدل sidecar، هر Pod یک پروکسی کنار خودش دارد. همهٔ ترافیک ورودی و
        خروجی از این پروکسی عبور می‌کند. این کار کنترل زیادی می‌دهد اما هزینه
        دارد: هر Pod یک کانتینر اضافه، مصرف حافظه و CPU بیشتر، و یک گام اضافه در
        مسیر بسته.
      </p>
      <table>
        <thead>
          <tr>
            <th>معیار</th>
            <th>Sidecar mesh</th>
            <th>Cilium mesh</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>پروکسی هر Pod</td>
            <td>بله</td>
            <td>خیر (برای L3/L4)</td>
          </tr>
          <tr>
            <td>مصرف منابع</td>
            <td>بالا</td>
            <td>کمتر</td>
          </tr>
          <tr>
            <td>تغییر مسیر بسته</td>
            <td>همیشه</td>
            <td>فقط برای L7</td>
          </tr>
          <tr>
            <td>پیچیدگی عملیاتی</td>
            <td>بیشتر</td>
            <td>کمتر</td>
          </tr>
          <tr>
            <td>کنترل L7 کامل</td>
            <td>بسیار زیاد</td>
            <td>محدودتر</td>
          </tr>
        </tbody>
      </table>

      <h2>۲. Cilium چطور بدون sidecar کار می‌کند؟</h2>
      <p>
        برای سیاست‌های L3/L4، eBPF در هسته همه‌چیز را انجام می‌دهد: identity،
        سیاست و تعادل بار. هیچ پروکسی‌ای در مسیر نیست. برای قابلیت‌های لایهٔ ۷،
        Cilium از یک <Ltr>Envoy</Ltr> مشترک روی هر نود استفاده می‌کند، نه یک
        sidecar برای هر Pod. این Envoy فقط وقتی وارد مسیر می‌شود که واقعاً به
        بررسی L7 نیاز باشد.
      </p>
      <ul>
        <li>
          <strong>L3/L4:</strong> eBPF در هسته، بدون پروکسی.
        </li>
        <li>
          <strong>L7:</strong> Envoy مشترک روی نود.
        </li>
        <li>
          <strong>mTLS:</strong> احراز هویت بین workloadها با identity.
        </li>
      </ul>

      <h2>۳. سیاست L7 بدون sidecar</h2>
      <p>
        همان سیاست HTTP که در درس سیاست شبکه دیدیم، اینجا هم برقرار است. تفاوت
        این است که Envoy مشترک است و برای هر Pod جداگانه اجرا نمی‌شود.
      </p>
      <CodeBlock code={l7Example} language="yaml" filename="l7-policy.yaml" />

      <h2>۴. mTLS و احراز هویت</h2>
      <p>
        Cilium می‌تواند ترافیک بین workloadها را با mTLS احراز هویت کند. این کار
        بر اساس identity انجام می‌شود، نه صرفاً IP. با یک سیاست می‌توانید بگویید
        ارتباط فقط در صورت احراز هویت موفق مجاز است.
      </p>
      <CodeBlock code={mtlsPolicy} language="yaml" filename="mtls-policy.yaml" />
      <Callout variant="info" title="mTLS و رمزنگاری شبکه">
        mTLS هویت دو طرف را تأیید می‌کند و ترافیک را رمز می‌کند. این با رمزنگاری
        بین نودها (WireGuard/IPsec) متفاوت است؛ می‌توانید هر دو را با هم داشته
        باشید.
      </Callout>

      <h2>۵. فعال‌سازی</h2>
      <CodeBlock code={enableMesh} language="bash" filename="enable-mesh.sh" />

      <h2>۶. محدودیت‌ها</h2>
      <p>
        Cilium mesh برای بسیاری از سناریوها کافی است، اما به اندازهٔ یک mesh
        sidecar کامل انعطاف ندارد. اگر به کنترل بسیار دقیق لایهٔ ۷، ترافیک
        پیچیدهٔ بین سرویس‌ها یا قابلیت‌های خاص یک mesh بالغ نیاز دارید، ممکن است
        Cilium به‌تنهایی کافی نباشد.
      </p>
      <Callout variant="warning" title="انتخاب بر اساس نیاز">
        mesh را بر اساس نیاز واقعی انتخاب کنید، نه مد. اگر بیشتر به سیاست L3/L4،
        مشاهده‌پذیری و mTLS نیاز دارید، Cilium سبک‌تر و ساده‌تر است.
      </Callout>

      <DeepDive title="جزئیات: Envoy مشترک، پروتکل‌ها و مقایسه با Istio">
        <DeepDiveSection title="Envoy مشترک چه تفاوتی دارد؟">
          <p>
            در مدل sidecar، هر Pod یک Envoy دارد و ایزوله است. در Cilium، یک Envoy
            روی نود برای همهٔ Podهای همان نود سرویس می‌دهد. این کار منابع را کم
            می‌کند اما یعنی Envoy یک نقطهٔ مشترک روی نود است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="پروتکل‌های پشتیبانی‌شده">
          <p>
            Cilium در لایهٔ ۷ از HTTP، gRPC، Kafka و DNS پشتیبانی می‌کند. برای
            پروتکل‌های دیگر، معمولاً به سیاست L3/L4 محدود می‌شوید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Cilium در برابر Istio">
          <p>
            Istio یک mesh کامل با کنترل L7 بسیار غنی است. Cilium سبک‌تر است و
            datapath را در هسته دارد. در برخی معماری‌ها این دو را با هم استفاده
            می‌کنند: Cilium برای شبکه و امنیت پایه، Istio برای کنترل L7 پیشرفته.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="انتظار کنترل L7 کامل">
        Cilium mesh همهٔ قابلیت‌های یک mesh بالغ را ندارد. اگر به مسیریابی پیچیدهٔ
        ترافیک یا سیاست‌های L7 بسیار دقیق نیاز دارید، محدودیت‌ها را از قبل بررسی
        کنید.
      </Callout>
      <Callout variant="warning" title="فعال کردن Envoy بی‌دلیل">
        اگر فقط سیاست L3/L4 دارید، Envoy لازم نیست. فعال کردن آن بدون نیاز، منابع
        مصرف می‌کند و مسیر را پیچیده‌تر می‌کند.
      </Callout>
      <Callout variant="danger" title="اشتباه گرفتن mTLS با رمزنگاری شبکه">
        این دو لایهٔ متفاوت‌اند. mTLS هویت workload را تأیید می‌کند؛ رمزنگاری
        شبکه مسیر بین نودها را می‌پوشاند. هر دو را جداگانه بررسی کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>Cilium mesh برای L3/L4 به sidecar نیاز ندارد.</li>
        <li>برای L7 از یک Envoy مشترک روی هر نود استفاده می‌کند.</li>
        <li>mTLS هویت workloadها را بر اساس identity تأیید می‌کند.</li>
        <li>سبک‌تر از mesh sidecar است اما انعطاف کمتری دارد.</li>
        <li>انتخاب را بر اساس نیاز واقعی انجام دهید.</li>
      </ul>
      <p>
        حالا یک mesh سبک داریم. در درس بعد قدم بزرگ‌تر را برمی‌داریم: اتصال چند
        کلاستر مستقل با ClusterMesh.
      </p>
    </>
  )
}
