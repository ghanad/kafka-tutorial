import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const installCilium = `# افزودن مخزن Helm و به‌روزرسانی آن
helm repo add cilium https://helm.cilium.io/
helm repo update

# نصب Cilium با پیکربندی نمونه
helm install cilium cilium/cilium --namespace kube-system \\
  --set cluster.name=shop \\
  --set ipam.mode=kubernetes \\
  --set routingMode=tunnel \\
  --set kubeProxyReplacement=true \\
  --set k8sServiceHost=10.0.0.10 \\
  --set k8sServicePort=6443 \\
  --set hubble.enabled=true \\
  --set hubble.relay.enabled=true \\
  --set hubble.ui.enabled=true`

const rke2Config = `# /etc/rancher/rke2/config.yaml
# CNI پیش‌فرض RKE2 را خاموش کنید تا Cilium جای آن را بگیرد
cni: none

# کنترلر سیاست شبکهٔ داخلی RKE2 را هم خاموش کنید
disable-network-policy: true

# اگر می‌خواهید kube-proxy را هم Cilium بردارد
disable-kube-proxy: true`

const verifyInstall = `# منتظر آماده شدن همهٔ اجزا بمانید
cilium status --wait

# پادهای Agent روی هر نود و Operator
kubectl -n kube-system get pods -l k8s-app=cilium -o wide
kubectl -n kube-system get deployment cilium-operator

# CRDهای Cilium باید نصب شده باشند
kubectl get crd | grep cilium

# آزمون اتصال سرتاسری؛ چند دقیقه طول می‌کشد
cilium connectivity test`

const upgradeCilium = `# تغییر تنظیمات یا ارتقای نسخه
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --reuse-values \\
  --set hubble.ui.enabled=true

# بررسی نتیجه
cilium status --wait
cilium connectivity test`

export function KubernetesCiliumInstallContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل فهمیدیم Cilium چرا از eBPF استفاده می‌کند. حالا وقت عمل است:
        نصب Cilium روی یک کلاستر واقعی. نصب درست چند تصمیم مهم دارد؛ انتخاب
        <Ltr>CNI</Ltr>، حالت IPAM، حالت مسیریابی و این‌که kube-proxy بماند یا
        حذف شود. در این درس یک نصب نمونه را کامل می‌کنیم و بعد سلامت آن را بررسی
        می‌کنیم.
      </p>

      <h2>پیش‌نیازها</h2>
      <p>
        Cilium یک <Ltr>CNI</Ltr> است؛ یعنی مسئول دادن IP به پادها و مسیریابی
        بین آن‌هاست. بنابراین کلاستر نباید هم‌زمان یک CNI دیگر فعال داشته باشد.
        قبل از نصب این موارد را بررسی کنید:
      </p>
      <table>
        <thead>
          <tr>
            <th>پیش‌نیاز</th>
            <th>چرا مهم است؟</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>نبود CNI فعال دیگر</td>
            <td>دو CNI هم‌زمان مسیر بسته و IP را قاطی می‌کنند</td>
          </tr>
          <tr>
            <td>کرنل به‌روز</td>
            <td>بخشی از قابلیت‌ها به hookها و نسخهٔ کرنل وابسته‌اند</td>
          </tr>
          <tr>
            <td>دسترسی به apiserver</td>
            <td>Agent باید سرویس‌ها، endpointها و سیاست‌ها را ببیند</td>
          </tr>
          <tr>
            <td>عدم هم‌پوشانی CIDR</td>
            <td>بازهٔ پادها نباید با شبکهٔ نودها یا شبکهٔ داخلی تداخل کند</td>
          </tr>
          <tr>
            <td>Helm 3 و kubectl</td>
            <td>نصب و بررسی با این ابزارها انجام می‌شود</td>
          </tr>
        </tbody>
      </table>

      <h2>نصب با Helm</h2>
      <p>
        رایج‌ترین روش نصب، استفاده از chart رسمی Cilium است. در نمونهٔ زیر یک
        کلاستر با نام <Ltr>shop</Ltr> داریم، IPAM را به کوبرنتیز می‌سپاریم،
        مسیریابی تونلی را انتخاب می‌کنیم و Hubble را هم فعال می‌کنیم:
      </p>
      <CodeBlock code={installCilium} language="bash" filename="install-cilium.sh" />
      <p>
        مقدار <Ltr>k8sServiceHost</Ltr> باید آدرس apiserver باشد، نه آدرس یک
        پاد. اگر این مقدار اشتباه باشد، Agent نمی‌تواند به کلاستر وصل شود و نصب
        نیمه‌کاره می‌ماند. در کلاسترهای مدیریت‌شده معمولاً آدرس عمومی یا آدرس
        داخلی سرویس Kubernetes را می‌دهید.
      </p>

      <h2>نصب روی RKE2</h2>
      <p>
        RKE2 به‌صورت پیش‌فرض CNI و kube-proxy خودش را دارد. برای استفاده از
        Cilium باید آن‌ها را قبل از بالا آمدن کلاستر خاموش کنید. نمونهٔ تنظیمات
        سرور RKE2:
      </p>
      <CodeBlock code={rke2Config} language="yaml" filename="rke2-config.yaml" />
      <p>
        بعد از تغییر تنظیمات و ری‌استارت سرویس RKE2، Cilium را با{' '}
        <Ltr>kubeProxyReplacement=true</Ltr> نصب کنید و{' '}
        <Ltr>k8sServiceHost</Ltr> را روی آدرس apiserver همان کلاستر بگذارید. اگر
        این ترتیب را رعایت نکنید، ممکن است کلاستر بدون شبکه بالا بیاید.
      </p>
      <Callout variant="warning" title="قبل از نصب، CNI قبلی را بردارید">
        اگر کلاستر از قبل با Calico، Flannel یا Canal بالا آمده است، ابتدا آن را
        به‌صورت کنترل‌شده حذف کنید. نصب Cilium روی CNI فعال، معمولاً به خطاهای
        عجیب در مسیر بسته و IP منجر می‌شود.
      </Callout>

      <h2>انتخاب حالت شبکه</h2>
      <p>
        چند مقدار در نصب، رفتار بعدی کلاستر را تعیین می‌کنند. این‌ها را آگاهانه
        انتخاب کنید، نه با کپی‌کردن از یک آموزش دیگر:
      </p>
      <table>
        <thead>
          <tr>
            <th>تنظیم</th>
            <th>گزینه‌های رایج</th>
            <th>معنی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>ipam.mode</Ltr>
            </td>
            <td>
              <Ltr>kubernetes</Ltr> یا <Ltr>cluster-pool</Ltr>
            </td>
            <td>IP پادها از CIDR کلاستر گرفته شود یا از استخر Cilium</td>
          </tr>
          <tr>
            <td>
              <Ltr>routingMode</Ltr>
            </td>
            <td>
              <Ltr>tunnel</Ltr> یا <Ltr>native</Ltr>
            </td>
            <td>بین نودها کپسوله‌سازی شود یا مسیریابی مستقیم انجام شود</td>
          </tr>
          <tr>
            <td>
              <Ltr>kubeProxyReplacement</Ltr>
            </td>
            <td>
              <Ltr>true</Ltr> یا <Ltr>false</Ltr>
            </td>
            <td>تعادل بار سرویس‌ها به Cilium سپرده شود یا نه</td>
          </tr>
          <tr>
            <td>
              <Ltr>hubble.enabled</Ltr>
            </td>
            <td>
              <Ltr>true</Ltr> یا <Ltr>false</Ltr>
            </td>
            <td>مشاهده‌پذیری جریان‌های شبکه فعال شود یا نه</td>
          </tr>
        </tbody>
      </table>
      <p>
        <Ltr>tunnel</Ltr> ساده‌تر است و به شبکهٔ زیرساخت وابستگی کمتری دارد؛{' '}
        <Ltr>native</Ltr> کارایی بهتری می‌دهد اما باید شبکهٔ زیرساخت مسیرهای
        پادها را بشناسد. برای شروع، تونل انتخاب امن‌تری است.
      </p>

      <h2>بررسی نصب</h2>
      <p>
        نصب با موفقیت Helm به معنی آماده بودن شبکه نیست. باید مطمئن شوید Agent
        روی همهٔ نودها بالا آمده، CRDها نصب شده‌اند و اتصال سرتاسری کار می‌کند:
      </p>
      <CodeBlock code={verifyInstall} language="bash" filename="verify-cilium.sh" />
      <p>
        اگر <Ltr>cilium status</Ltr> همهٔ اجزا را سالم نشان می‌دهد اما یک سرویس
        خاص کار نمی‌کند، مشکل احتمالاً در سیاست شبکه یا DNS است، نه در نصب. در
        درس‌های Hubble و NetworkPolicy همین مسیر را ادامه می‌دهیم.
      </p>

      <h2>ارتقا و تغییر تنظیمات</h2>
      <p>
        بعد از نصب، تغییر تنظیمات هم با Helm انجام می‌شود. از{' '}
        <Ltr>--reuse-values</Ltr> استفاده کنید تا مقادیر قبلی از دست نروند و بعد
        دوباره وضعیت را بررسی کنید:
      </p>
      <CodeBlock code={upgradeCilium} language="bash" filename="upgrade-cilium.sh" />

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="نصب روی CNI فعال">
        اگر CNI قبلی هنوز فعال است، پادها ممکن است IP بگیرند اما مسیر بسته درست
        نباشد. قبل از نصب، وضعیت CNI و پادهای شبکه را بررسی و CNI قبلی را حذف
        کنید.
      </Callout>
      <Callout variant="danger" title="آدرس اشتباه apiserver">
        <Ltr>k8sServiceHost</Ltr> باید از دید Agent قابل دسترسی باشد. استفاده از
        <Ltr>localhost</Ltr> یا آدرس یک پاد، رایج‌ترین دلیل نصب نیمه‌کاره است.
      </Callout>
      <Callout variant="warning" title="حذف زودهنگام kube-proxy">
        اگر <Ltr>kubeProxyReplacement=true</Ltr> را تنظیم کرده‌اید، اول منتظر
        سالم شدن Cilium بمانید و بعد kube-proxy را حذف کنید. ترتیب برعکس، سرویس‌ها
        را از کار می‌اندازد.
      </Callout>
      <Callout variant="warning" title="هم‌پوشانی CIDR">
        بازهٔ پادها را با شبکهٔ دفتر، VPN یا شبکهٔ نودها هم‌پوشان انتخاب نکنید.
        این اشتباه بعداً به شکل خطاهای مسیریابی عجیب ظاهر می‌شود.
      </Callout>

      <DeepDive title="جزئیات: chart، CRDها و ترتیب استقرار">
        <DeepDiveSection title="chart چه چیزهایی نصب می‌کند؟">
          <p>
            یک <Ltr>DaemonSet</Ltr> برای Agent روی هر نود، یک{' '}
            <Ltr>Deployment</Ltr> برای Operator، <Ltr>ConfigMap</Ltr> تنظیمات،
            حساب‌های سرویس و RBAC، و مجموعه‌ای از CRDها مثل{' '}
            <Ltr>CiliumNetworkPolicy</Ltr> و <Ltr>CiliumEndpoint</Ltr>.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا CRDها مهم‌اند؟">
          <p>
            CRDها به کوبرنتیز یاد می‌دهند که منابع Cilium را بشناسد. اگر CRD نصب
            نشده باشد، <Ltr>kubectl apply</Ltr> روی یک سیاست Cilium خطا می‌دهد،
            حتی اگر Agent سالم باشد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="اولویت مقادیر">
          <p>
            مقادیر <Ltr>--set</Ltr> روی فایل <Ltr>values.yaml</Ltr> و مقادیر
            پیش‌فرض chart اولویت دارند. برای محیط واقعی، فایل مقادیر نسخه‌دار
            بهتر از زنجیرهٔ طولانی <Ltr>--set</Ltr> است؛ چون قابل بازبینی و
            تکرارپذیر است.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>Cilium باید روی کلاستری بدون CNI فعال دیگر نصب شود.</li>
        <li>Helm سریع‌ترین راه نصب و تغییر تنظیمات است.</li>
        <li>حالت IPAM، مسیریابی و kube-proxy را آگاهانه انتخاب کنید.</li>
        <li>سلامت را با <Ltr>cilium status</Ltr> و connectivity test بسنجید.</li>
        <li>در RKE2، CNI و kube-proxy پیش‌فرض را قبل از نصب خاموش کنید.</li>
      </ul>
      <p>
        حالا Cilium نصب شده است. در درس بعد سراغ یکی از مهم‌ترین تصمیم‌های نصب
        می‌رویم: جایگزینی کامل kube-proxy و این‌که سرویس‌ها چطور در datapath
        پیاده می‌شوند.
      </p>
    </>
  )
}
