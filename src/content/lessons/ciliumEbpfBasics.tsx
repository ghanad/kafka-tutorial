import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { EbpfLifecycleExplainer } from '../../components/simulators/EbpfLifecycleExplainer'

const simpleProgram = `#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

/* نگاشت IP به identity؛ Agent این map را پر می‌کند */
struct {
  __uint(type, BPF_MAP_TYPE_HASH);
  __uint(max_entries, 1024);
  __type(key, __u32);
  __type(value, __u32);
} identity_by_ip SEC(".maps");

SEC("tc")
int check_identity(struct __sk_buff *skb) {
  __u32 src = skb->remote_ip4;
  __u32 *identity = bpf_map_lookup_elem(&identity_by_ip, &src);

  if (!identity)
    return TC_ACT_OK; /* منبع ناشناس؛ سیاست پیش‌فرض اعمال می‌شود */

  return TC_ACT_OK;   /* نمونهٔ ساده: اجازه بده */
}`

const buildAndLoad = `# کامپایل به بایت‌کد eBPF
clang -O2 -g -target bpf -c check_identity.c -o check_identity.o

# بارگذاری برنامه در هسته (نوع sched_cls یعنی tc)
sudo bpftool prog load check_identity.o \\
  /sys/fs/bpf/check_identity type sched_cls

# اتصال به hook ورودی یک veth
sudo tc filter add dev lxc1234 ingress bpf da \\
  obj check_identity.o sec tc

# بررسی برنامه و mapها
sudo bpftool prog show
sudo bpftool map dump name identity_by_ip`

export function CiliumEbpfBasicsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل دیدیم که Cilium بسته‌ها را داخل هسته پردازش می‌کند. اما چطور
        می‌شود منطق دلخواه خودمان را داخل هسته اجرا کنیم، بدون نوشتن ماژول کرنل و
        بدون ری‌استارت سیستم؟ پاسخ <Ltr>eBPF</Ltr> است. این درس پایه‌ای است که
        تمام درس‌های بعدی روی آن سوار می‌شوند؛ اگر اینجا را خوب بفهمید، رفتار
        Cilium دیگر جادو نیست.
      </p>

      <h2>۱. eBPF در یک جمله چیست؟</h2>
      <p>
        <Ltr>eBPF</Ltr> یک ماشین مجازی کوچک و ایمن داخل کرنل است که اجازه می‌دهد
        برنامه‌های کوچک را در نقاط مشخصی از مسیر پردازش (hookها) اجرا کنید. این
        برنامه‌ها با یک زبان شبیه C نوشته می‌شوند، به بایت‌کد کامپایل می‌شوند،
        توسط کرنل بررسی می‌شوند و سپس روی همان رویداد اجرا می‌شوند.
      </p>
      <p>
        تفاوت مهم با ماژول کرنل این است که eBPF نمی‌تواند هر کاری بکند. کرنل قبل
        از اجرا مطمئن می‌شود برنامه به حافظهٔ غیرمجاز دست نمی‌زند و همیشه پایان
        می‌یابد. همین محدودیت است که آن را قابل‌اعتماد می‌کند.
      </p>

      <h2>۲. چرا eBPF سریع است؟</h2>
      <p>
        سرعت eBPF از یک ترفند واحد نمی‌آید؛ از چند تصمیم طراحی کنار هم می‌آید:
      </p>
      <ul>
        <li>
          <strong>اجرا در هسته:</strong> بسته بدون رفت‌وبرگشت به فضای کاربر
          پردازش می‌شود؛ خبری از <Ltr>context switch</Ltr> نیست.
        </li>
        <li>
          <strong>JIT:</strong> بایت‌کد به کد ماشین بومی ترجمه می‌شود، پس مثل یک
          مفسر کند نیست.
        </li>
        <li>
          <strong>lookup در map:</strong> تصمیم‌ها با جست‌وجوی مستقیم در حافظهٔ
          مشترک گرفته می‌شوند، نه با پیمایش خطی زنجیره‌ای از قاعده‌ها.
        </li>
        <li>
          <strong>نقطهٔ درست:</strong> برنامه دقیقاً روی hookی اجرا می‌شود که بسته
          از آن می‌گذرد؛ نه در انتهای یک مسیر طولانی.
        </li>
      </ul>
      <table>
        <thead>
          <tr>
            <th>معیار</th>
            <th>iptables سنتی</th>
            <th>eBPF در Cilium</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>نحوهٔ تصمیم</td>
            <td>پیمایش زنجیره‌ای قاعده‌ها؛ با رشد قواعد کندتر می‌شود</td>
            <td>lookup در map؛ تقریباً مستقل از تعداد قاعده‌ها</td>
          </tr>
          <tr>
            <td>محل اجرا</td>
            <td>در هسته، اما با ساختار ثابت netfilter</td>
            <td>در هسته، روی hook انتخابی و با منطق دلخواه</td>
          </tr>
          <tr>
            <td>سرویس‌ها</td>
            <td>نیاز به kube-proxy و زنجیرهٔ جداگانه</td>
            <td>جایگزینی مستقیم kube-proxy در datapath</td>
          </tr>
          <tr>
            <td>مشاهده‌پذیری</td>
            <td>محدود و پراکنده</td>
            <td>رویداد مستقیم از همان نقطهٔ تصمیم (Hubble)</td>
          </tr>
        </tbody>
      </table>

      <h2>۳. چرخهٔ عمر یک برنامه eBPF</h2>
      <p>
        در توضیح تعاملی زیر دو فاز را می‌بینید. فاز اول نشان می‌دهد یک برنامه از
        کد C تا اتصال به hook چه مسیری را طی می‌کند. فاز دوم همان برنامه را روی یک
        بستهٔ واقعی اجرا می‌کند. به گام ۴ دقت کنید؛ همان‌جا <Ltr>Verifier</Ltr>{' '}
        تصمیم می‌گیرد برنامه اصلاً اجازهٔ اجرا دارد یا نه.
      </p>

      <EbpfLifecycleExplainer />

      <h2>۴. hookها: برنامه کجا اجرا می‌شود؟</h2>
      <p>
        یک برنامهٔ eBPF به‌تنهایی کاری نمی‌کند تا به یک hook متصل شود. Cilium از
        چند نوع hook استفاده می‌کند و هر کدام برای کاری مناسب است:
      </p>
      <table>
        <thead>
          <tr>
            <th>نوع hook</th>
            <th>کجا اجرا می‌شود</th>
            <th>کاربرد در Cilium</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>XDP</Ltr>
            </td>
            <td>درایور کارت شبکه، قبل از ساخت بستهٔ کرنلی</td>
            <td>رد یا هدایت سریع بسته‌های ورودی</td>
          </tr>
          <tr>
            <td>
              <Ltr>tc</Ltr>
            </td>
            <td>روی veth و interfaceها، در ورود و خروج</td>
            <td>مسیریابی، سیاست و redirect بین Podها</td>
          </tr>
          <tr>
            <td>
              <Ltr>socket</Ltr>
            </td>
            <td>روی سوکت‌های برنامه</td>
            <td>برخی قابلیت‌های اتصال و load balancing محلی</td>
          </tr>
          <tr>
            <td>
              <Ltr>kprobe / tracepoint</Ltr>
            </td>
            <td>روی توابع و رویدادهای کرنل</td>
            <td>مشاهده و امنیت runtime (مثلاً Tetragon)</td>
          </tr>
        </tbody>
      </table>
      <p>
        بیشتر مسیر بسته در Cilium روی <Ltr>tc</Ltr> انجام می‌شود؛ چون هر Pod یک
        veth دارد و می‌توان برنامه را دقیقاً روی ورود و خروج همان veth گذاشت.
      </p>

      <h2>۵. mapها: حافظهٔ مشترک هسته و Agent</h2>
      <p>
        برنامهٔ eBPF باید بداند چه کسی مجاز است، و این اطلاعات مرتب تغییر می‌کند.
        راه‌حل <Ltr>map</Ltr> است: یک ساختار دادهٔ ویژه در کرنل که هم برنامهٔ eBPF
        و هم Agent در فضای کاربر می‌توانند آن را بخوانند و بنویسند. Agent سیاست‌ها
        را در map می‌نویسد و برنامه در مسیر بسته فقط lookup می‌کند.
      </p>
      <ul>
        <li>
          <Ltr>hash</Ltr>: نگاشت کلید به مقدار، مثل IP به identity.
        </li>
        <li>
          <Ltr>LPM trie</Ltr>: تطبیق طولانی‌ترین پیشوند، مناسب CIDRها.
        </li>
        <li>
          <Ltr>array</Ltr>: دسترسی سریع با اندیس ثابت.
        </li>
        <li>
          <Ltr>ringbuf</Ltr>: ارسال رویداد از هسته به فضای کاربر؛ پایهٔ بخشی از
          مشاهده‌پذیری.
        </li>
      </ul>

      <h2>۶. Verifier: چرا برنامهٔ ناامن بارگذاری نمی‌شود</h2>
      <p>
        <Ltr>Verifier</Ltr> قبل از اجرا، برنامه را تحلیل می‌کند و چند چیز را
        تضمین می‌کند: دسترسی به حافظه فقط در محدودهٔ مجاز، حلقه‌های محدود و
        پایان‌پذیر، و استفادهٔ درست از mapها. اگر برنامه‌ای این قواعد را رعایت
        نکند، همان لحظهٔ بارگذاری رد می‌شود؛ نه در زمان اجرا و نه با کرش کرنل.
      </p>
      <Callout variant="info" title="خطای Verifier یک باگ است، نه بدشانسی">
        اگر برنامه‌ای با خطای verifier رد شود، معمولاً یعنی دسترسی به حافظه یا
        حلقه‌ای خارج از حد مجاز دارید. پیام خطا دقیقاً می‌گوید کجا. آن را جدی
        بگیرید؛ دور زدن verifier راه‌حل نیست.
      </Callout>

      <h2>۷. یک برنامهٔ ساده</h2>
      <p>
        این نمونهٔ کوچک نشان می‌دهد ساختار یک برنامهٔ <Ltr>tc</Ltr> چطور است: یک
        map تعریف می‌شود و برنامه با <Ltr>bpf_map_lookup_elem</Ltr> در آن جست‌وجو
        می‌کند. این دقیقاً همان الگویی است که Cilium در مقیاس بزرگ استفاده می‌کند.
      </p>
      <CodeBlock code={simpleProgram} language="c" filename="check_identity.c" />
      <CodeBlock code={buildAndLoad} language="bash" filename="build-load.sh" />

      <DeepDive title="جزئیات: چرا eBPF جایگزین iptables شد و مرزهایش چیست؟">
        <DeepDiveSection title="مشکل مقیاس iptables">
          <p>
            در iptables هر قاعده یک ردیف در زنجیره است و بسته باید زنجیره را طی
            کند. با هزاران سرویس و Pod، طول زنجیره‌ها زیاد می‌شود و به‌روزرسانی
            آن‌ها هم گران است. eBPF به‌جای پیمایش زنجیره، در یک map جست‌وجو می‌کند
            و به‌روزرسانی map هم مستقل از طول مسیر است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="حلقه‌های محدود">
          <p>
            نسخه‌های قدیمی eBPF حلقه نداشتند. از کرنل ۵٫۳ به بعد حلقه‌های محدود
            مجاز شدند، به شرطی که verifier بتواند ثابت کند حداکثر تعداد تکرار
            معلوم است. این محدودیت برای تضمین پایان‌پذیری است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="CO-RE و قابل‌حمل بودن">
          <p>
            ساختارهای داخلی کرنل بین نسخه‌ها تغییر می‌کنند. <Ltr>CO-RE</Ltr>{' '}
            (Compile Once – Run Everywhere) با استفاده از اطلاعات نوع، برنامه را
            طوری می‌سازد که روی نسخه‌های مختلف کرنل بدون کامپایل مجدد کار کند.
            Cilium به همین مکانیزم تکیه می‌کند تا روی توزیع‌های گوناگون اجرا شود.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="eBPF یک زبان برنامه‌نویسی عمومی نیست">
        eBPF برای اجرای کوتاه و محدود روی رویداد طراحی شده است. نمی‌توانید هر
        کتابخانه‌ای را لینک کنید یا هر کاری بکنید. منطق سنگین باید در فضای کاربر
        بماند و فقط تصمیم سریع در هسته گرفته شود.
      </Callout>
      <Callout variant="warning" title="دسترسی به همهٔ توابع کرنل آزاد نیست">
        فقط توابعی که به‌عنوان helper شناخته شده‌اند در دسترس‌اند. اگر تابعی در
        فهرست helperها نیست، از داخل eBPF صدایش بزنید؛ باید با hook دیگری یا
        kprobe سراغش بروید.
      </Callout>
      <Callout variant="danger" title="نادیده گرفتن خطای verifier">
        خطای verifier نشانهٔ مشکل واقعی در دسترسی به حافظه یا منطق برنامه است.
        تلاش برای دور زدن آن با ترفند، در بهترین حالت برنامه را رد می‌کند و در
        بدترین حالت رفتار غیرقابل‌پیش‌بینی می‌سازد.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>eBPF یک ماشین مجازی ایمن داخل کرنل برای اجرای منطق روی رویدادهاست.</li>
        <li>برنامه با clang کامپایل، با verifier بررسی و با JIT اجرا می‌شود.</li>
        <li>hook تعیین می‌کند برنامه کجا اجرا شود؛ Cilium بیشتر از tc استفاده می‌کند.</li>
        <li>mapها حافظهٔ مشترک هسته و Agent برای endpoint و سیاست‌اند.</li>
        <li>سرعت از اجرا در هسته، JIT و lookup در map می‌آید.</li>
      </ul>
      <p>
        حالا هم نقشهٔ اجزای Cilium را داریم و هم پایهٔ eBPF را. در فصل بعد به سراغ
        مسیر واقعی یک بسته می‌رویم: از veth یک Pod تا تحویل به Pod دیگر، و این‌که
        identity و سیاست دقیقاً کجای این مسیر اعمال می‌شوند.
      </p>
    </>
  )
}
