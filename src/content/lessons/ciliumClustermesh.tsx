import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { ClustermeshExplainer } from '../../components/simulators/ClustermeshExplainer'

const connectClusters = `# در کلاستر اول: فعال کردن clustermesh
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --set clustermesh.useAPIServer=true \\
  --set clustermesh.apiserver.service.type=LoadBalancer

# گرفتن آدرس clustermesh-apiserver کلاستر دوم
kubectl -n kube-system get svc clustermesh-apiserver

# اتصال دو کلاستر با cilium CLI
cilium clustermesh connect \\
  --context cluster-west \\
  --destination-context cluster-east

# بررسی وضعیت
cilium clustermesh status`

const globalService = `apiVersion: v1
kind: Service
metadata:
  name: shop-api
  namespace: shop
  annotations:
    service.cilium.io/global: "true"
spec:
  selector:
    app: shop-api
  ports:
    - port: 80
      targetPort: 8080`

const sharedPolicy = `apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: shop-api-global
  namespace: shop
spec:
  endpointSelector:
    matchLabels:
      app: shop-api
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: web
            io.cilium.k8s.policy.cluster: west`

export function CiliumClustermeshContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا همه‌چیز در یک کلاستر بود. اما سازمان‌ها معمولاً چند کلاستر دارند:
        برای جداسازی محیط‌ها، تحمل خطا یا توزیع جغرافیایی. <Ltr>ClusterMesh</Ltr>{' '}
        این کلاسترهای مستقل را به هم وصل می‌کند تا سرویس‌ها و سیاست‌ها را مشترک
        ببینند، بدون اینکه یک کلاستر واحد و شکننده بسازید. این درس نشان می‌دهد
        ClusterMesh چطور کار می‌کند و چه چیزی را به اشتراک می‌گذارد.
      </p>

      <h2>۱. ClusterMesh چه چیزی را به اشتراک می‌گذارد؟</h2>
      <p>
        نکتهٔ کلیدی این است که ClusterMesh یک کلاستر بزرگ نمی‌سازد. هر کلاستر
        datapath و کنترل‌پلین خودش را دارد. چیزی که به اشتراک گذاشته می‌شود
        <strong>کشف سرویس و identity</strong> است. یعنی یک Pod در کلاستر غربی
        می‌تواند سرویس کلاستر شرقی را ببیند و سیاست‌ها بر اساس identity مشترک
        اعمال شوند.
      </p>
      <table>
        <thead>
          <tr>
            <th>موضوع</th>
            <th>وضعیت در ClusterMesh</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>datapath هر کلاستر</td>
            <td>مستقل</td>
          </tr>
          <tr>
            <td>کشف سرویس</td>
            <td>مشترک</td>
          </tr>
          <tr>
            <td>identity</td>
            <td>مشترک</td>
          </tr>
          <tr>
            <td>سیاست شبکه</td>
            <td>می‌تواند بین کلاسترها اعمال شود</td>
          </tr>
          <tr>
            <td>مشاهده‌پذیری</td>
            <td>Hubble می‌تواند نمای ترکیبی بدهد</td>
          </tr>
        </tbody>
      </table>

      <h2>۲. مسیر اتصال دو کلاستر</h2>
      <p>
        در توضیح تعاملی زیر دو کلاستر <Ltr>west</Ltr> و <Ltr>east</Ltr> را به هم
        وصل می‌کنیم و یک سرویس را جهانی می‌کنیم. به گام ۵ دقت کنید؛ همان‌جا معلوم
        می‌شود چرا سیاست‌ها بین کلاسترها یکسان کار می‌کنند.
      </p>

      <ClustermeshExplainer />

      <h2>۳. پیش‌نیازها</h2>
      <ul>
        <li>CIDR پادها و سرویس‌های کلاسترها نباید همپوشانی داشته باشند.</li>
        <li>هر کلاستر باید یک <Ltr>cluster name</Ltr> و <Ltr>cluster ID</Ltr> یکتا داشته باشد.</li>
        <li>شبکه باید امکان ارتباط بین <Ltr>clustermesh-apiserver</Ltr>ها را بدهد.</li>
        <li>گواهی‌ها و کلیدها باید به‌درستی بین کلاسترها توزیع شوند.</li>
      </ul>
      <Callout variant="danger" title="همپوشانی CIDR">
        اگر دو کلاستر بازهٔ IP یکسان داشته باشند، ClusterMesh به‌درستی کار نمی‌کند
        و بسته‌ها به مقصد اشتباه می‌روند. این مهم‌ترین پیش‌نیاز است.
      </Callout>

      <h2>۴. اتصال کلاسترها</h2>
      <CodeBlock code={connectClusters} language="bash" filename="connect-clusters.sh" />

      <h2>۵. سرویس جهانی</h2>
      <p>
        با annotation <Ltr>service.cilium.io/global</Ltr> یک سرویس در همهٔ
        کلاسترها قابل کشف می‌شود. ترافیک می‌تواند به endpointهای محلی یا کلاستر
        دیگر برسد، بسته به سیاست و تنظیمات.
      </p>
      <CodeBlock code={globalService} language="yaml" filename="global-service.yaml" />

      <h2>۶. سیاست بین کلاسترها</h2>
      <p>
        چون identityها مشترک‌اند، می‌توانید سیاستی بنویسید که به Podی در کلاستر
        دیگر اجازه دهد. در انتخاب‌گر می‌توانید کلاستر را هم مشخص کنید.
      </p>
      <CodeBlock code={sharedPolicy} language="yaml" filename="global-policy.yaml" />
      <Callout variant="info" title="پیشوند کلاستر در identity">
        Cilium برای جلوگیری از تداخل، کلاستر را در identity لحاظ می‌کند. به همین
        دلیل می‌توانید سیاستی بنویسید که فقط از کلاستر خاصی اجازه بدهد.
      </Callout>

      <h2>۷. تحمل خطا و مسیریابی</h2>
      <p>
        اگر یک کلاستر از دسترس خارج شود، سرویس‌های جهانی می‌توانند به endpointهای
        کلاستر دیگر بروند. این کار تحمل خطا را بالا می‌برد، اما به latency شبکه
        بین کلاسترها وابسته است. برای سرویس‌های حساس به تأخیر، ترجیح محلی را در
        نظر بگیرید.
      </p>

      <DeepDive title="جزئیات: clustermesh-apiserver، گواهی‌ها و Hubble ترکیبی">
        <DeepDiveSection title="clustermesh-apiserver چیست؟">
          <p>
            این جزء یک نمای محدود از apiserver هر کلاستر را در اختیار کلاسترهای
            دیگر می‌گذارد: سرویس‌ها، endpointها و identityها. این کار با TLS و
            گواهی‌های متقابل انجام می‌شود تا فقط کلاسترهای مجاز وصل شوند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="گواهی‌ها و امنیت">
          <p>
            اتصال بین کلاسترها باید احراز هویت شود. Cilium از گواهی‌های سمت سرور
            و کلاینت استفاده می‌کند. مدیریت درست این گواهی‌ها بخش مهمی از راه‌اندازی
            امن ClusterMesh است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Hubble در چند کلاستر">
          <p>
            هر کلاستر Hubble خودش را دارد. برای نمای ترکیبی، می‌توانید Relayها را
            به هم وصل کنید یا داده‌ها را در یک سیستم مرکزی جمع کنید. این کار برای
            عیب‌یابی مسیرهای بین‌کلاستری ضروری است.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="همپوشانی CIDR">
        رایج‌ترین دلیل شکست ClusterMesh، همپوشانی بازه‌های IP است. قبل از اتصال،
        نقشهٔ آدرس‌ها را بررسی کنید.
      </Callout>
      <Callout variant="warning" title="انتظار یک کلاستر واحد">
        ClusterMesh کلاسترها را جدا نگه می‌دارد. اگر به یک کنترل‌پلین واحد نیاز
        دارید، این ابزار مناسب آن نیست.
      </Callout>
      <Callout variant="danger" title="نادیده گرفتن latency بین کلاسترها">
        سرویس جهانی ممکن است ترافیک را به کلاستر دور بفرستد. برای سرویس‌های
        حساس به تأخیر، مسیریابی محلی را ترجیح دهید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>ClusterMesh کلاسترهای مستقل را برای کشف سرویس و identity به هم وصل می‌کند.</li>
        <li>datapath هر کلاستر مستقل می‌ماند.</li>
        <li>CIDRها نباید همپوشانی داشته باشند.</li>
        <li>سرویس جهانی با annotation فعال می‌شود.</li>
        <li>سیاست‌ها می‌توانند بین کلاسترها اعمال شوند.</li>
      </ul>
      <p>
        حالا کلاسترهای ما به هم وصل‌اند. در فصل آخر به عملیات می‌رویم: عیب‌یابی و
        تیونینگ کارایی در محیط واقعی.
      </p>
    </>
  )
}
