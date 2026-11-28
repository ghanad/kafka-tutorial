import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const installGateway = `# فعال کردن Gateway API در Cilium
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --set gatewayAPI.enabled=true

# بررسی CRDها
kubectl get crd | grep gateway.networking.k8s.io

# بررسی کلاس Gateway
kubectl get gatewayclass cilium`

const gatewayYaml = `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shop-gateway
  namespace: shop
spec:
  gatewayClassName: cilium
  listeners:
    - name: http
      port: 80
      protocol: HTTP
      allowedRoutes:
        namespaces:
          from: Same`

const httpRouteYaml = `apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop-api-route
  namespace: shop
spec:
  parentRefs:
    - name: shop-gateway
  hostnames:
    - shop.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: shop-api
          port: 80`

const ingressYaml = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop-api-ingress
  namespace: shop
spec:
  ingressClassName: cilium
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: shop-api
                port:
                  number: 80`

export function CiliumGatewayApiContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        سرویس <Ltr>LoadBalancer</Ltr> یک IP می‌دهد، اما برای برنامه‌های HTTP به
        چیزی بیشتر نیاز داریم: مسیریابی بر اساس مسیر و دامنه، TLS و قواعد لایهٔ
        ۷. Cilium هم <Ltr>Ingress</Ltr> سنتی را پشتیبانی می‌کند و هم{' '}
        <Ltr>Gateway API</Ltr> جدیدتر را. این درس تفاوت این دو مدل را روشن می‌کند
        و نمونه‌های پیکربندی می‌دهد.
      </p>

      <h2>۱. Ingress در برابر Gateway API</h2>
      <p>
        <Ltr>Ingress</Ltr> یک منبع قدیمی و ساده است که در آن همه‌چیز در یک شیء
        جمع شده: دامنه، مسیر و backend. <Ltr>Gateway API</Ltr> این مسئولیت‌ها را
        بین چند منبع تقسیم می‌کند: <Ltr>GatewayClass</Ltr> (پیاده‌سازی)،{' '}
        <Ltr>Gateway</Ltr> (شنونده و پورت) و <Ltr>HTTPRoute</Ltr> (قواعد
        مسیریابی). این تقسیم، مدیریت چندتیمی را ساده‌تر می‌کند.
      </p>
      <table>
        <thead>
          <tr>
            <th>معیار</th>
            <th>Ingress</th>
            <th>Gateway API</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>مدل</td>
            <td>یک شیء برای همه</td>
            <td>چند شیء با نقش‌های جدا</td>
          </tr>
          <tr>
            <td>مسیریابی پیشرفته</td>
            <td>محدود و وابسته به annotation</td>
            <td>بومی و استاندارد</td>
          </tr>
          <tr>
            <td>چندتیمی</td>
            <td>دشوار</td>
            <td>مناسب؛ مالکیت جدا</td>
          </tr>
          <tr>
            <td>آینده</td>
            <td>پایدار اما محدود</td>
            <td>مسیر پیشنهادی Kubernetes</td>
          </tr>
        </tbody>
      </table>

      <h2>۲. فعال‌سازی</h2>
      <p>
        Gateway API در Cilium باید صریحاً فعال شود و CRDهای آن نصب باشند. بعد از
        فعال‌سازی، یک <Ltr>GatewayClass</Ltr> با نام <Ltr>cilium</Ltr> در دسترس
        است.
      </p>
      <CodeBlock code={installGateway} language="bash" filename="enable-gateway.sh" />

      <h2>۳. ساخت Gateway و Route</h2>
      <p>
        ابتدا یک <Ltr>Gateway</Ltr> می‌سازیم که روی پورت ۸۰ گوش می‌دهد. سپس یک{' '}
        <Ltr>HTTPRoute</Ltr> مسیر <Ltr className="font-mono">/api</Ltr> را به
        سرویس <Ltr>shop-api</Ltr> وصل می‌کند.
      </p>
      <CodeBlock code={gatewayYaml} language="yaml" filename="gateway.yaml" />
      <CodeBlock code={httpRouteYaml} language="yaml" filename="httproute.yaml" />
      <Callout variant="info" title="Gateway و LoadBalancer">
        Gateway خودش یک سرویس LoadBalancer می‌سازد تا ترافیک بیرونی را بگیرد. پس
        همان مباحث BGP و LB IPAM درس قبل اینجا هم مطرح‌اند.
      </Callout>

      <h2>۴. Ingress سنتی</h2>
      <p>
        اگر با Ingress راحت‌ترید، Cilium آن را هم پشتیبانی می‌کند. فقط{' '}
        <Ltr>ingressClassName: cilium</Ltr> را تنظیم کنید. برای پروژه‌های جدید،
        Gateway API را در نظر بگیرید.
      </p>
      <CodeBlock code={ingressYaml} language="yaml" filename="ingress.yaml" />

      <h2>۵. TLS و مسیریابی پیشرفته</h2>
      <p>
        در Gateway API می‌توانید TLS را روی listener تنظیم کنید و در Route قواعد
        پیشرفته‌تری مثل تطبیق هدر، بازنویسی مسیر و تقسیم ترافیک بین چند backend
        بنویسید. این قابلیت‌ها بدون annotationهای پراکنده در دسترس‌اند.
      </p>

      <DeepDive title="جزئیات: Envoy، TLS و مهاجرت از Ingress">
        <DeepDiveSection title="Gateway API چطور پیاده می‌شود؟">
          <p>
            Cilium Gateway API را با Envoy پیاده می‌کند. برای هر Gateway یک
            deployment از Envoy ساخته می‌شود که ترافیک HTTP را پردازش می‌کند.
            datapath eBPF ترافیک را به آن هدایت می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="TLS کجا پایان می‌یابد؟">
          <p>
            معمولاً TLS در Gateway پایان می‌یابد و ترافیک رمزگشایی‌شده به سرویس
            می‌رود. اگر به رمزنگاری سرتاسری نیاز دارید، باید از mTLS یا TLS مجدد
            به backend استفاده کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="مهاجرت تدریجی">
          <p>
            می‌توانید Ingressهای موجود را نگه دارید و مسیرهای جدید را با Gateway
            API بسازید. هر دو می‌توانند کنار هم کار کنند، اما بهتر است در نهایت
            یک مدل را انتخاب کنید تا پیکربندی پراکنده نشود.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="فراموش کردن CRDها">
        بدون نصب CRDهای Gateway API، منابع شما پذیرفته نمی‌شوند. قبل از ساخت
        Gateway، وجود CRDها را بررسی کنید.
      </Callout>
      <Callout variant="warning" title="انتخاب کلاس اشتباه">
        اگر <Ltr>gatewayClassName</Ltr> یا <Ltr>ingressClassName</Ltr> اشتباه
        باشد، هیچ کنترلری آن را نمی‌گیرد و ترافیک مسیریابی نمی‌شود.
      </Callout>
      <Callout variant="danger" title="نادیده گرفتن سیاست شبکه">
        Gateway ترافیک را می‌گیرد، اما سیاست شبکه هنوز اعمال می‌شود. اگر
        namespace مقصد اجازهٔ ورود از Gateway را نداشته باشد، درخواست رد می‌شود.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>Gateway API مسئولیت‌ها را بین Class، Gateway و Route تقسیم می‌کند.</li>
        <li>Cilium هر دو مدل Ingress و Gateway API را پشتیبانی می‌کند.</li>
        <li>Gateway خودش سرویس LoadBalancer می‌سازد.</li>
        <li>مسیریابی پیشرفته بدون annotation در Gateway API بومی است.</li>
        <li>سیاست شبکه همچنان روی ترافیک Gateway اعمال می‌شود.</li>
      </ul>
      <p>
        حالا ترافیک HTTP را مدیریت می‌کنیم. در درس بعد می‌بینیم Cilium چطور بدون
        sidecar یک Service Mesh سبک می‌سازد.
      </p>
    </>
  )
}
