import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { IpamRoutingExplainer } from '../../components/simulators/IpamRoutingExplainer'

const ipamConfig = `# حالت IPAM و بازهٔ هر نود
kubectl -n kube-system get configmap cilium-config \\
  -o jsonpath='{.data.ipam}{"\n"}'

# نودها و PodCIDR اختصاص‌یافته (در حالت kubernetes)
kubectl get nodes -o custom-columns=\\
NAME:.metadata.name,PODCIDR:.spec.podCIDR

# استخرها و مصرف آن‌ها
cilium ipam show
cilium ipam status`

const routingConfig = `# حالت routing و کپسوله‌برداری
kubectl -n kube-system get configmap cilium-config \\
  -o jsonpath='{.data.routing-mode}{"\n"}'

# در Helm، معمولاً این‌ها را تنظیم می‌کنید
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --set routingMode=native \\
  --set autoDirectNodeRoutes=true \\
  --set ipv4NativeRoutingCIDR=10.0.0.0/8

# برای overlay
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --set routingMode=tunnel \\
  --set tunnelProtocol=vxlan`

export function CiliumIpamRoutingContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل دیدیم که datapath بسته را به مقصد می‌رساند. اما قبل از هر
        بسته‌ای، هر Pod باید یک آدرس یکتا بگیرد و نودها باید بدانند آن آدرس کجاست.
        این درس دو انتخاب بنیادی را بررسی می‌کند: <Ltr>IPAM</Ltr> که IP را تخصیص
        می‌دهد، و حالت <Ltr>routing</Ltr> که تعیین می‌کند بسته بین نودها چطور
        حرکت کند.
      </p>

      <h2>۱. چرا IPAM مهم است؟</h2>
      <p>
        در Kubernetes، هر Pod باید یک IP داشته باشد که در کل کلاستر یکتا باشد.
        اگر دو نود به‌طور مستقل از یک شبکهٔ مشترک IP بدهند، احتمال تکراری شدن
        آدرس‌ها زیاد است. راه‌حل این است که هر نود یک بازهٔ اختصاصی داشته باشد و
        فقط از همان بازه IP بدهد. این کار <Ltr>IPAM</Ltr> است.
      </p>

      <h2>۲. حالت‌های IPAM</h2>
      <table>
        <thead>
          <tr>
            <th>حالت</th>
            <th>بازه از کجا می‌آید</th>
            <th>چه زمانی مناسب است</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>cluster-pool</Ltr>
            </td>
            <td>یک CIDR بزرگ که Operator بین نودها تقسیم می‌کند</td>
            <td>حالت پیش‌فرض و ساده برای بیشتر کلاسترها</td>
          </tr>
          <tr>
            <td>
              <Ltr>kubernetes</Ltr>
            </td>
            <td>
              از <Ltr>PodCIDR</Ltr> که خود Kubernetes به هر نود می‌دهد
            </td>
            <td>وقتی با تخصیص CIDR کوبرنتیز هماهنگ هستید</td>
          </tr>
          <tr>
            <td>
              <Ltr>multi-pool</Ltr>
            </td>
            <td>چند استخر با قواعد انتخاب بر اساس namespace یا label</td>
            <td>جداسازی بازه‌ها برای تیم‌ها یا محیط‌ها</td>
          </tr>
          <tr>
            <td>
              <Ltr>eni / azure / gke</Ltr>
            </td>
            <td>از API ابر برای گرفتن آدرس واقعی شبکه</td>
            <td>یکپارچگی با شبکهٔ بومی ابر</td>
          </tr>
        </tbody>
      </table>
      <p>
        در بیشتر کلاسترهای داخلی، <Ltr>cluster-pool</Ltr> نقطهٔ شروع خوبی است.
        فقط باید مطمئن شوید CIDR انتخابی با شبکهٔ زیرساخت، شبکهٔ سرویس‌ها و
        شبکه‌های خارجی همپوشانی ندارد.
      </p>

      <h2>۳. یک Pod چطور IP می‌گیرد و بسته‌اش مسیریابی می‌شود؟</h2>
      <p>
        در توضیح تعاملی زیر یک Pod روی <Ltr>node-1</Ltr> ساخته می‌شود، از استخر
        محلی IP می‌گیرد و سپس بسته‌ای به Podی روی <Ltr>node-2</Ltr> می‌فرستد. به
        گام‌های ۲ و ۶ دقت کنید؛ یکی تخصیص بازه به نود را نشان می‌دهد و دیگری
        انتخاب مسیر بین‌نودی.
      </p>

      <IpamRoutingExplainer />

      <h2>۴. native routing در برابر overlay</h2>
      <p>
        وقتی مقصد روی نود دیگری است، دو راه برای رساندن بسته وجود دارد:
      </p>
      <table>
        <thead>
          <tr>
            <th>معیار</th>
            <th>Native routing</th>
            <th>Overlay (VXLAN/Geneve)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>آدرس روی سیم</td>
            <td>IP اصلی Pod</td>
            <td>IP نود + هدر تونل</td>
          </tr>
          <tr>
            <td>نیاز شبکهٔ زیرساخت</td>
            <td>باید مسیر بازه‌های Pod را بداند</td>
            <td>فقط باید IP نودها را بداند</td>
          </tr>
          <tr>
            <td>سرباری</td>
            <td>کمتر</td>
            <td>بیشتر (هدر کپسوله‌سازی)</td>
          </tr>
          <tr>
            <td>عیب‌یابی</td>
            <td>آدرس‌ها مستقیم و خوانا</td>
            <td>نیاز به دیدن داخل تونل</td>
          </tr>
          <tr>
            <td>مناسب برای</td>
            <td>شبکه‌های کنترل‌شده و BGP</td>
            <td>شبکه‌های ساده یا چندابری</td>
          </tr>
        </tbody>
      </table>
      <p>
        هیچ‌کدام مطلقاً بهتر نیست. اگر شبکهٔ زیرساخت شما می‌تواند مسیرهای Pod را
        حمل کند، native routing سرباری کمتری دارد. اگر نمی‌تواند یا نمی‌خواهید
        آن را تغییر دهید، overlay بدون دست‌زدن به شبکه کار می‌کند.
      </p>
      <Callout variant="info" title="autoDirectNodeRoutes">
        در حالت native، گزینهٔ <Ltr>autoDirectNodeRoutes</Ltr> مسیر مستقیم به
        بازهٔ هر نود را خودکار اضافه می‌کند. این کار مسیریابی را ساده می‌کند و
        معمولاً همراه با BGP یا شبکهٔ flat استفاده می‌شود.
      </Callout>

      <h2>۵. پیکربندی و بررسی</h2>
      <p>
        برای دیدن حالت فعلی و بررسی مصرف استخرها از این دستورها استفاده کنید:
      </p>
      <CodeBlock code={ipamConfig} language="bash" filename="ipam.sh" />
      <CodeBlock code={routingConfig} language="bash" filename="routing.sh" />

      <h2>۶. نکات انتخاب CIDR</h2>
      <ul>
        <li>
          CIDR پادها نباید با شبکهٔ سرویس‌ها، شبکهٔ نودها یا شبکهٔ داخلی شرکت
          همپوشانی داشته باشد.
        </li>
        <li>
          برای هر نود باید فضای کافی برای رشد Podها در نظر بگیرید؛ یک{' '}
          <Ltr>/24</Ltr> برای هر نود معمولاً سخاوتمندانه است.
        </li>
        <li>
          اگر بعداً ClusterMesh اضافه می‌کنید، CIDR کلاسترها باید از هم جدا باشند.
        </li>
      </ul>

      <DeepDive title="جزئیات: تقسیم CIDR، multi-pool و مهاجرت بین حالت‌ها">
        <DeepDiveSection title="Operator چطور بازه‌ها را تقسیم می‌کند؟">
          <p>
            در <Ltr>cluster-pool</Ltr>، Operator یک CIDR بزرگ را به بلوک‌های
            مساوی برای نودها تقسیم می‌کند. اندازهٔ هر بلوک با{' '}
            <Ltr>clusterPoolIPv4PodCIDRList</Ltr> و طول پیشوند مشخص می‌شود. Agent
            هر نود فقط از بلوک خودش IP می‌دهد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="multi-pool چه اضافه می‌کند؟">
          <p>
            گاهی می‌خواهید برخی Podها از بازهٔ خاصی IP بگیرند، مثلاً برای جداسازی
            ترافیک یا اتصال به شبکهٔ خارجی. <Ltr>multi-pool</Ltr> اجازه می‌دهد چند
            استخر تعریف کنید و با انتخابگر بر اساس namespace یا label تعیین کنید
            کدام Pod از کدام استخر استفاده کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="مهاجرت از overlay به native">
          <p>
            تغییر حالت routing بدون قطعی کامل کار سختی است. معمولاً ابتدا مسیرهای
            native را در شبکه آماده می‌کنید، سپس مرحله‌به‌مرحله Podها را بازسازی
            می‌کنید. تغییر یک‌بارهٔ تنظیمات روی کلاستر در حال کار می‌تواند باعث
            قطع ارتباط بین Podهای قدیمی و جدید شود.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="همپوشانی CIDR">
        اگر CIDR پادها با شبکهٔ داخلی یا شبکهٔ سرویس‌ها همپوشانی داشته باشد،
        بسته‌ها به مقصد اشتباه می‌روند و عیب‌یابی بسیار سخت می‌شود. قبل از نصب،
        نقشهٔ آدرس‌های شبکه را بررسی کنید.
      </Callout>
      <Callout variant="warning" title="انتخاب overlay بدون بررسی MTU">
        کپسوله‌سازی هدر اضافه می‌کند. اگر MTU را تنظیم نکنید، بسته‌های بزرگ ممکن
        است drop شوند و اتصال‌های TLS یا دانلودهای بزرگ به‌طور مرموزی شکست
        بخورند.
      </Callout>
      <Callout variant="danger" title="خالی شدن استخر IP">
        اگر بلوک هر نود کوچک باشد، با رشد Podها استخر تمام می‌شود و Pod جدید
        Pending می‌ماند. اندازهٔ بلوک را با رشد آینده انتخاب کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>IPAM به هر نود یک بازهٔ اختصاصی می‌دهد تا آدرس‌ها تکراری نشوند.</li>
        <li>cluster-pool ساده‌ترین حالت برای بیشتر کلاسترهاست.</li>
        <li>native routing سرباری کمتر دارد اما به مسیرهای شبکه نیاز دارد.</li>
        <li>overlay بدون تغییر شبکه کار می‌کند اما هدر و MTU را جدی بگیرید.</li>
        <li>سیاست امنیتی در هر دو حالت routing یکسان است.</li>
      </ul>
      <p>
        حالا Podها آدرس دارند و بسته‌ها بین نودها مسیریابی می‌شوند. در درس بعد
        می‌بینیم Cilium چطور نقش <Ltr>kube-proxy</Ltr> را هم برمی‌دارد و سرویس‌ها
        را بدون زنجیرهٔ iptables پیاده می‌کند.
      </p>
    </>
  )
}
