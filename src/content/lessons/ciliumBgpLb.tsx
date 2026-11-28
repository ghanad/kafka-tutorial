import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const bgpConfig = `apiVersion: cilium.io/v2alpha1
kind: CiliumBGPClusterConfig
metadata:
  name: rack-bgp
spec:
  nodeSelector:
    matchLabels:
      kubernetes.io/os: linux
  bgpInstances:
    - name: rack
      localASN: 64512
      peers:
        - name: tor-switch
          peerASN: 64500
          peerAddress: 192.168.10.1
          peerConfigRef:
            name: tor-peer`

const lbIpam = `apiVersion: cilium.io/v2alpha1
kind: CiliumLoadBalancerIPPool
metadata:
  name: public-pool
spec:
  blocks:
    - cidr: 192.168.50.0/24
---
apiVersion: v1
kind: Service
metadata:
  name: shop-api
  namespace: shop
  annotations:
    io.cilium/lb-ipam-ips: 192.168.50.10
spec:
  type: LoadBalancer
  selector:
    app: shop-api
  ports:
    - port: 80
      targetPort: 8080`

const l2Config = `# اعلام لایه ۲ برای یک سرویس LoadBalancer
apiVersion: cilium.io/v2alpha1
kind: CiliumL2AnnouncementPolicy
metadata:
  name: default-l2
spec:
  interfaces:
    - ^eth[0-9]+
  externalIPs: true
  loadBalancerIPs: true

# بررسی وضعیت اعلام و سرویس‌ها
cilium bgp peers
cilium service list
kubectl get svc -n shop`

export function CiliumBgpLbContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا همه‌چیز داخل کلاستر بود. اما کاربران بیرونی چطور به سرویس‌های شما
        می‌رسند؟ در یک کلاستر ساده، سرویس <Ltr>LoadBalancer</Ltr> منتظر یک
        کنترلر ابری می‌ماند تا IP بگیرد. Cilium می‌تواند خودش این نقش را بردارد:
        با <Ltr>LB IPAM</Ltr> آدرس بدهد، با <Ltr>BGP</Ltr> مسیر اعلام کند یا با
        اعلام لایهٔ ۲ دسترسی فراهم کند. این درس این سه ابزار را کنار هم می‌گذارد.
      </p>

      <h2>۱. سه مسئلهٔ جدا</h2>
      <p>
        دسترسی از بیرون سه سؤال دارد که نباید با هم اشتباه شوند:
      </p>
      <table>
        <thead>
          <tr>
            <th>سؤال</th>
            <th>ابزار</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>سرویس چه IPای بگیرد؟</td>
            <td>LB IPAM</td>
          </tr>
          <tr>
            <td>شبکه چطور بفهمد این IP کجاست؟</td>
            <td>BGP یا L2 announcement</td>
          </tr>
          <tr>
            <td>ترافیک چطور به Pod برسد؟</td>
            <td>datapath Cilium</td>
          </tr>
        </tbody>
      </table>
      <p>
        خیلی از مشکلات «سرویس بیرون در دسترس نیست» از اشتباه گرفتن این سه لایه
        می‌آید. ممکن است IP تخصیص یافته باشد اما مسیری برای آن اعلام نشده باشد.
      </p>

      <h2>۲. LB IPAM: تخصیص IP به سرویس</h2>
      <p>
        <Ltr>CiliumLoadBalancerIPPool</Ltr> یک بازهٔ آدرس تعریف می‌کند. سرویس‌های{' '}
        <Ltr>LoadBalancer</Ltr> از این بازه IP می‌گیرند. می‌توانید IP مشخصی با
        annotation درخواست کنید یا اجازه دهید Cilium خودش انتخاب کند.
      </p>
      <CodeBlock code={lbIpam} language="yaml" filename="lb-ipam.yaml" />
      <Callout variant="info" title="IP باید در شبکهٔ شما قابل مسیریابی باشد">
        تخصیص IP فقط نیمی از کار است. آن IP باید از بیرون قابل دسترسی باشد؛ یا با
        BGP اعلام شود، یا در همان subnet با L2 announcement.
      </Callout>

      <h2>۳. BGP: اعلام مسیر</h2>
      <p>
        BGP پروتکل مسیریابی بین شبکه‌هاست. با BGP، نودهای Cilium مسیر بازه‌های
        Pod و IPهای سرویس را به روترهای شبکه اعلام می‌کنند. نتیجه این است که
        ترافیک بیرونی مستقیماً به نود درست می‌رسد، بدون NAT یا گلوگاه مرکزی.
      </p>
      <CodeBlock code={bgpConfig} language="yaml" filename="bgp-cluster.yaml" />
      <ul>
        <li>
          <strong>ASN محلی:</strong> شناسهٔ کلاستر شما در BGP.
        </li>
        <li>
          <strong>peer:</strong> روتر یا سوئیچی که مسیرها را می‌گیرد.
        </li>
        <li>
          <strong>اعلام:</strong> بازه‌های Pod و IPهای LoadBalancer.
        </li>
      </ul>

      <h2>۴. اعلام لایهٔ ۲</h2>
      <p>
        اگر شبکهٔ شما BGP ندارد، می‌توانید IP سرویس را در همان subnet با ARP/NDP
        اعلام کنید. <Ltr>CiliumL2AnnouncementPolicy</Ltr> تعیین می‌کند کدام
        interfaceها و کدام IPها اعلام شوند. این روش ساده است اما مقیاس‌پذیری BGP
        را ندارد و به همان broadcast domain وابسته است.
      </p>
      <CodeBlock code={l2Config} language="yaml" filename="l2-announce.yaml" />
      <table>
        <thead>
          <tr>
            <th>معیار</th>
            <th>BGP</th>
            <th>L2 announcement</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>نیاز شبکه</td>
            <td>روتر با BGP</td>
            <td>همان subnet و L2</td>
          </tr>
          <tr>
            <td>مقیاس</td>
            <td>بالا</td>
            <td>محدود به broadcast domain</td>
          </tr>
          <tr>
            <td>تحمل خطا</td>
            <td>مسیرهای چندگانه</td>
            <td>وابسته به ARP/NDP</td>
          </tr>
          <tr>
            <td>پیچیدگی</td>
            <td>بیشتر</td>
            <td>کمتر</td>
          </tr>
        </tbody>
      </table>

      <h2>۵. حالت‌های BGP</h2>
      <p>
        Cilium دو حالت اصلی دارد: <Ltr>BGP Control Plane</Ltr> که در خود Cilium
        پیاده شده و از CRDها استفاده می‌کند، و <Ltr>BGPv1</Ltr> که با کانفیگ
        قدیمی‌تر کار می‌کند. برای نصب‌های جدید، حالت CRD-based را انتخاب کنید.
      </p>

      <DeepDive title="جزئیات: مسیرهای Pod، هم‌نشینی و انتخاب مسیر">
        <DeepDiveSection title="اعلام بازهٔ Pod یا IP سرویس؟">
          <p>
            بسته به طراحی، می‌توانید بازهٔ Pod را اعلام کنید تا ترافیک مستقیم به
            Pod برسد، یا فقط IP سرویس را اعلام کنید تا Cilium تعادل بار را انجام
            دهد. حالت دوم معمولاً ساده‌تر و امن‌تر است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="هم‌نشینی با شبکهٔ موجود">
          <p>
            BGP باید با سیاست‌های مسیریابی شبکهٔ شما هماهنگ باشد. اگر مسیرهای
            اشتباه اعلام شوند، ممکن است ترافیک به جای دیگری برود. همیشه در محیط
            آزمایشی مسیرها را با <Ltr>cilium bgp routes</Ltr> بررسی کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="ECMP و تعادل بار">
          <p>
            وقتی چند نود همان مسیر را اعلام می‌کنند، روتر می‌تواند با ECMP ترافیک
            را بین آن‌ها تقسیم کند. این کار ظرفیت ورودی را بالا می‌برد، اما به
            پیکربندی درست روتر نیاز دارد.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="تخصیص IP بدون اعلام مسیر">
        اگر IP بدهید اما مسیری اعلام نکنید، سرویس از بیرون در دسترس نیست. همیشه
        هر دو مرحله را بررسی کنید.
      </Callout>
      <Callout variant="warning" title="همپوشانی بازهٔ LB با شبکهٔ داخلی">
        بازهٔ LoadBalancer نباید با شبکهٔ داخلی یا بازهٔ Podها همپوشانی داشته
        باشد. این اشتباه باعث مسیریابی اشتباه و عیب‌یابی سخت می‌شود.
      </Callout>
      <Callout variant="danger" title="انتخاب L2 برای مقیاس بزرگ">
        اعلام لایهٔ ۲ برای کلاسترهای کوچک خوب است، اما برای مقیاس بزرگ و چند
        rack، BGP انتخاب درست‌تری است.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>دسترسی از بیرون سه لایه دارد: IP، اعلام مسیر و datapath.</li>
        <li>LB IPAM به سرویس‌های LoadBalancer آدرس می‌دهد.</li>
        <li>BGP مسیرها را به شبکه اعلام می‌کند و مقیاس‌پذیر است.</li>
        <li>L2 announcement ساده‌تر است اما محدود به broadcast domain.</li>
        <li>همیشه تخصیص و اعلام را جدا بررسی کنید.</li>
      </ul>
      <p>
        حالا سرویس‌ها از بیرون در دسترس‌اند. در درس بعد می‌بینیم چطور ترافیک HTTP
        را با Gateway API و Ingress مدیریت کنیم.
      </p>
    </>
  )
}
