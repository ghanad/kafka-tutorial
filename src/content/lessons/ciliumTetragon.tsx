import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const observeCommand = `# نصب و بررسی Tetragon
helm install tetragon cilium/tetragon --namespace kube-system
kubectl -n kube-system get ds tetragon

# مشاهدهٔ رویدادهای فرایند در کل کلاستر
kubectl -n kube-system exec ds/tetragon -- \\
  tetra getevents -o compact

# فقط رویدادهای یک namespace
kubectl -n kube-system exec ds/tetragon -- \\
  tetra getevents -o compact --namespace shop`

const tracingPolicy = `apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: block-shell
spec:
  kprobes:
    - call: sys_execve
      syscall: true
      args:
        - index: 0
          type: string
      selectors:
        - matchArgs:
            - index: 0
              operator: Postfix
              values:
                - /bin/sh
                - /bin/bash
          matchActions:
            - action: Sigkill`

const filePolicy = `apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: watch-etc
spec:
  kprobes:
    - call: security_file_open
      args:
        - index: 0
          type: string
      selectors:
        - matchArgs:
            - index: 0
              operator: Prefix
              values:
                - /etc/`

export function CiliumTetragonContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا Cilium را از بیرون نگاه کردیم: بسته‌ها، سرویس‌ها و رمزنگاری. اما
        بخش بزرگی از حملات داخل خود نود رخ می‌دهد: یک فرایند مخرب اجرا می‌شود،
        فایلی خوانده می‌شود یا کدی در حافظه تزریق می‌شود. <Ltr>Tetragon</Ltr> با
        همان پایهٔ eBPF رفتار فرایندها را در زمان اجرا مشاهده و در صورت نیاز مسدود
        می‌کند. این درس نشان می‌دهد چطور کار می‌کند و چه چیزی را می‌توانید از آن
        انتظار داشته باشید.
      </p>

      <h2>۱. Tetragon چه تفاوتی با سیاست شبکه دارد؟</h2>
      <p>
        سیاست شبکه دربارهٔ <strong>ارتباط</strong> است: چه کسی با چه کسی حرف
        بزند. Tetragon دربارهٔ <strong>رفتار</strong> است: چه فرایندی اجرا شود،
        چه فایلی باز شود، چه اتصالی برقرار شود. این دو لایه مکمل‌اند. یک Pod
        ممکن است سیاست شبکهٔ درستی داشته باشد اما فرایند مخربی داخلش اجرا شود.
      </p>
      <table>
        <thead>
          <tr>
            <th>لایه</th>
            <th>ابزار</th>
            <th>سؤال اصلی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>شبکه</td>
            <td>Cilium Network Policy</td>
            <td>چه کسی با چه کسی صحبت کند؟</td>
          </tr>
          <tr>
            <td>Runtime</td>
            <td>Tetragon</td>
            <td>چه فرایندی چه کاری انجام دهد؟</td>
          </tr>
          <tr>
            <td>مشاهده‌پذیری</td>
            <td>Hubble</td>
            <td>چه اتفاقی افتاد؟</td>
          </tr>
        </tbody>
      </table>

      <h2>۲. Tetragon چطور کار می‌کند؟</h2>
      <p>
        Tetragon برنامه‌های eBPF را روی رویدادهای کرنل وصل می‌کند: فراخوانی
        syscallها، اجرای فرایند، باز شدن فایل و اتصال شبکه. هر رویداد به‌صورت
        ساخت‌یافته گزارش می‌شود و می‌تواند با یک <Ltr>TracingPolicy</Ltr> فیلتر
        یا مسدود شود.
      </p>
      <ul>
        <li>
          <strong>مشاهده:</strong> ببینید چه فرایندهایی اجرا می‌شوند و چه فایل‌هایی
          باز می‌شوند.
        </li>
        <li>
          <strong>سیاست:</strong> با <Ltr>TracingPolicy</Ltr> قواعد بنویسید.
        </li>
        <li>
          <strong>اجرا:</strong> با اکشن <Ltr>Sigkill</Ltr> فرایند خاطی را همان
          لحظه متوقف کنید.
        </li>
      </ul>

      <h2>۳. مشاهدهٔ رویدادها</h2>
      <p>
        قبل از نوشتن سیاست، باید بدانید رفتار عادی سیستم چیست. با{' '}
        <Ltr>tetra getevents</Ltr> جریان رویدادها را ببینید و الگوهای مشکوک را
        پیدا کنید. این مرحله برای جلوگیری از سیاست‌های بیش‌ازحد سخت ضروری است.
      </p>
      <CodeBlock code={observeCommand} language="bash" filename="observe.sh" />

      <h2>۴. یک سیاست ساده: جلوگیری از shell</h2>
      <p>
        یکی از رایج‌ترین سیاست‌ها، جلوگیری از اجرای shell در کانتینرهای عملیاتی
        است. اگر کسی بخواهد وارد Pod شود و <Ltr>/bin/sh</Ltr> اجرا کند، Tetragon
        همان لحظه آن را متوقف می‌کند.
      </p>
      <CodeBlock code={tracingPolicy} language="yaml" filename="block-shell.yaml" />
      <Callout variant="warning" title="سیاست خیلی سخت، سیستم را می‌شکند">
        اگر بدون بررسی رفتار عادی، اجرای shell را مسدود کنید، ممکن است اسکریپت‌های
        راه‌اندازی یا health check خودتان هم متوقف شوند. ابتدا در حالت مشاهده
        امتحان کنید.
      </Callout>

      <h2>۵. مشاهدهٔ دسترسی به فایل‌های حساس</h2>
      <p>
        می‌توانید دسترسی به مسیرهای حساس مثل <Ltr className="font-mono">/etc</Ltr>{' '}
        را زیر نظر بگیرید. این سیاست فقط گزارش می‌دهد و چیزی را مسدود نمی‌کند؛
        برای شروع، مشاهده امن‌تر از مسدود کردن است.
      </p>
      <CodeBlock code={filePolicy} language="yaml" filename="watch-etc.yaml" />

      <h2>۶. Tetragon و Hubble</h2>
      <p>
        Tetragon رویدادهای runtime را تولید می‌کند و Hubble رویدادهای شبکه را. با
        هم، تصویری کامل می‌سازند: یک فرایند مشکوک اجرا شد (Tetragon) و سپس تلاش
        کرد به یک آدرس خارجی وصل شود (Hubble). این همبستگی برای تحلیل حادثه
        بسیار ارزشمند است.
      </p>

      <DeepDive title="جزئیات: kprobe، enforcement و محدودیت‌های امنیتی">
        <DeepDiveSection title="kprobe و tracepoint">
          <p>
            <Ltr>kprobe</Ltr> به یک تابع کرنل وصل می‌شود و <Ltr>tracepoint</Ltr>{' '}
            به یک رویداد از پیش تعریف‌شده. kprobe انعطاف بیشتری دارد اما به نسخهٔ
            کرنل حساس‌تر است. Tetragon از هر دو استفاده می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Sigkill چطور کار می‌کند؟">
          <p>
            وقتی شرط یک selector برقرار شود، Tetragon می‌تواند سیگنال{' '}
            <Ltr>SIGKILL</Ltr> بفرستد و فرایند را همان لحظه متوقف کند. این کار
            قبل از اینکه فرایند کار مخربش را کامل کند انجام می‌شود، چون بررسی در
            همان نقطهٔ فراخوانی syscall است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Tetragon جایگزین EDR نیست">
          <p>
            Tetragon مشاهده و کنترل رفتار در سطح کرنل می‌دهد، اما یک پلتفرم کامل
            EDR با تحلیل، همبستگی و پاسخ خودکار نیست. آن را به‌عنوان یک لایهٔ
            قدرتمند در کنار بقیهٔ ابزارهای امنیتی ببینید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="فعال کردن enforcement بدون مشاهده">
        اگر بدون دانستن رفتار عادی سیستم سیاست مسدودکننده بنویسید، ممکن است
        سرویس‌های خودتان را از کار بیندازید. اول مشاهده، بعد مسدودسازی.
      </Callout>
      <Callout variant="warning" title="انتظار پوشش کامل">
        Tetragon روی نقاطی که به آن‌ها وصل شده می‌بیند. اگر رویدادی در آن نقاط
        نباشد، دیده نمی‌شود. برای پوشش کامل، نقاط اتصال را با دقت انتخاب کنید.
      </Callout>
      <Callout variant="danger" title="نادیده گرفتن سرباری">
        هر رویداد eBPF هزینهٔ کمی دارد، اما حجم زیاد رویدادها می‌تواند سربار
        ایجاد کند. فیلترها را دقیق بنویسید و فقط رویدادهای لازم را جمع کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>Tetragon رفتار فرایندها را در زمان اجرا با eBPF مشاهده می‌کند.</li>
        <li>TracingPolicy قواعد مشاهده و مسدودسازی را تعریف می‌کند.</li>
        <li>اکشن Sigkill فرایند خاطی را همان لحظه متوقف می‌کند.</li>
        <li>ابتدا مشاهده کنید، سپس مسدودسازی را فعال کنید.</li>
        <li>Tetragon و Hubble با هم تصویر کامل امنیت می‌سازند.</li>
      </ul>
      <p>
        حالا هم شبکه، هم ترافیک و هم رفتار فرایندها را زیر کنترل داریم. در فصل
        بعد به مشاهده‌پذیری می‌پردازیم و Hubble را عمیق‌تر بررسی می‌کنیم.
      </p>
    </>
  )
}
