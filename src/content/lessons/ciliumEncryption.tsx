import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const wireguardConfig = `# فعال کردن رمزنگاری WireGuard
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --set encryption.enabled=true \\
  --set encryption.type=wireguard

# بررسی وضعیت رمزنگاری روی نودها
cilium status | grep -i encryption
cilium encrypt status`

const ipsecConfig = `# فعال کردن IPsec
helm upgrade cilium cilium/cilium --namespace kube-system \\
  --set encryption.enabled=true \\
  --set encryption.type=ipsec

# کلیدها و وضعیت tunnel
cilium encrypt status
ip xfrm state
ip xfrm policy`

const rotationCommands = `# چرخش کلیدها در IPsec
cilium encrypt key rotate
cilium encrypt status

# بررسی بسته‌های رمزنگاری‌شده در Hubble
hubble observe --namespace shop

# اگر رمزنگاری کار نکند، این را بررسی کنید
cilium status --verbose | grep -i -A3 encryption`

export function CiliumEncryptionContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        سیاست شبکه تعیین می‌کند چه کسی با چه کسی صحبت کند، اما بسته‌ها در مسیر
        شبکه هنوز قابل خواندن‌اند. اگر کسی به شبکهٔ زیرساخت دسترسی داشته باشد،
        می‌تواند ترافیک بین نودها را ببیند. Cilium می‌تواند ترافیک بین نودها را
        شفاف و بدون تغییر برنامه رمزنگاری کند. این درس <Ltr>WireGuard</Ltr> و{' '}
        <Ltr>IPsec</Ltr> را مقایسه می‌کند و نکات عملیاتی هر کدام را نشان می‌دهد.
      </p>

      <h2>۱. رمزنگاری شفاف یعنی چه؟</h2>
      <p>
        «شفاف» یعنی برنامه‌ها و Podها هیچ تغییری نمی‌بینند. آن‌ها همان اتصال
        معمولی TCP را برقرار می‌کنند؛ Cilium در datapath بسته را قبل از خروج از
        نود رمز می‌کند و در نود مقصد رمزگشایی می‌کند. نه گواهی در برنامه لازم است
        و نه تغییر کد.
      </p>
      <p>
        این رمزنگاری بین <strong>نودها</strong> انجام می‌شود، نه بین Podها به‌طور
        مستقیم. یعنی ترافیک داخل یک نود رمز نمی‌شود (چون از شبکه خارج نمی‌شود)،
        اما هر بسته‌ای که از یک نود به نود دیگر می‌رود رمز می‌شود.
      </p>
      <Callout variant="info" title="رمزنگاری جای احراز هویت برنامه نیست">
        رمزنگاری ترافیک بین نودها، استراق سمع روی شبکه را سخت می‌کند. اما اگر
        برنامه‌تان به احراز هویت کاربر یا TLS سرتاسری نیاز دارد، هنوز باید همان
        را پیاده کنید. این دو مکمل‌اند، نه جایگزین.
      </Callout>

      <h2>۲. WireGuard در برابر IPsec</h2>
      <table>
        <thead>
          <tr>
            <th>معیار</th>
            <th>WireGuard</th>
            <th>IPsec</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>پیچیدگی</td>
            <td>کم؛ در کرنل و ساده</td>
            <td>بیشتر؛ تنظیمات و SAهای متعدد</td>
          </tr>
          <tr>
            <td>کارایی</td>
            <td>بالا با سرباری کم</td>
            <td>خوب، اما تنظیم آن حساس‌تر است</td>
          </tr>
          <tr>
            <td>چرخش کلید</td>
            <td>خودکار و درونی</td>
            <td>نیاز به مدیریت و چرخش صریح</td>
          </tr>
          <tr>
            <td>پشتیبانی از حالت‌ها</td>
            <td>محدودتر</td>
            <td>انعطاف بیشتر برای سناریوهای خاص</td>
          </tr>
          <tr>
            <td>پیشنهاد پیش‌فرض</td>
            <td>نقطهٔ شروع ساده و امن</td>
            <td>وقتی به قابلیت‌های خاص IPsec نیاز دارید</td>
          </tr>
        </tbody>
      </table>
      <p>
        برای بیشتر کلاسترها، <Ltr>WireGuard</Ltr> انتخاب ساده‌تری است: راه‌اندازی
        کم‌دردسر، کارایی خوب و چرخش کلید خودکار. IPsec را وقتی انتخاب کنید که به
        یکپارچگی با زیرساخت موجود یا قابلیت‌های خاص آن نیاز دارید.
      </p>

      <h2>۳. WireGuard چطور کار می‌کند؟</h2>
      <p>
        WireGuard یک تونل نقطه‌به‌نقطه بین نودها می‌سازد. هر نود یک کلید عمومی
        دارد و نودها کلیدهای هم را می‌شناسند. وقتی بسته‌ای بین دو نود می‌رود،
        داخل این تونل رمز می‌شود. Cilium این تونل‌ها را به‌طور خودکار بین نودهای
        کلاستر برقرار می‌کند.
      </p>
      <ul>
        <li>کلیدها به‌طور خودکار تولید و توزیع می‌شوند.</li>
        <li>چرخش کلید بدون دخالت شما انجام می‌شود.</li>
        <li>ترافیک بین نودها رمز می‌شود؛ ترافیک محلی نود نه.</li>
      </ul>

      <h2>۴. IPsec چطور کار می‌کند؟</h2>
      <p>
        IPsec از <Ltr>Security Association</Ltr>ها و کلیدهای متقارن استفاده
        می‌کند. Cilium این SAها را بین نودها مدیریت می‌کند. برخلاف WireGuard،
        چرخش کلید در IPsec نیاز به توجه بیشتری دارد و باید دوره‌ای انجام شود.
      </p>
      <Callout variant="warning" title="چرخش کلید را فراموش نکنید">
        در IPsec، کلیدهای قدیمی باید دوره‌ای چرخانده شوند. اگر این کار را نکنید،
        امنیت رمزنگاری با گذشت زمان ضعیف می‌شود.
      </Callout>

      <h2>۵. پیکربندی</h2>
      <p>
        فعال کردن رمزنگاری در Helm ساده است، اما باید قبل از تغییر، از سازگاری
        کرنل و شبکه مطمئن شوید. در محیط عملیاتی، این تغییر را در یک بازهٔ
        نگهداری انجام دهید.
      </p>
      <CodeBlock code={wireguardConfig} language="bash" filename="wireguard.sh" />
      <CodeBlock code={ipsecConfig} language="bash" filename="ipsec.sh" />

      <h2>۶. تأثیر بر کارایی و MTU</h2>
      <p>
        رمزنگاری هدر و پردازش اضافه می‌کند. مهم‌ترین نکتهٔ عملی، <Ltr>MTU</Ltr>{' '}
        است: بستهٔ رمزنگاری‌شده بزرگ‌تر از بستهٔ اصلی است، پس MTU مؤثر کاهش
        می‌یابد. اگر این را تنظیم نکنید، بسته‌های بزرگ ممکن است drop شوند و
        اتصال‌های TLS یا دانلودهای بزرگ به‌طور مرموزی شکست بخورند.
      </p>
      <table>
        <thead>
          <tr>
            <th>حالت</th>
            <th>سرباری تقریبی</th>
            <th>نکته</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>بدون رمزنگاری</td>
            <td>پایه</td>
            <td>MTU معمول شبکه</td>
          </tr>
          <tr>
            <td>WireGuard</td>
            <td>حدود ۶۰ بایت</td>
            <td>MTU را کم کنید</td>
          </tr>
          <tr>
            <td>IPsec</td>
            <td>بسته به حالت، متغیر</td>
            <td>حالت transport و tunnel فرق دارند</td>
          </tr>
        </tbody>
      </table>

      <h2>۷. چرخش و بررسی</h2>
      <CodeBlock code={rotationCommands} language="bash" filename="rotate-keys.sh" />

      <DeepDive title="جزئیات: WireGuard و overlay، رمزنگاری در ClusterMesh و محدودیت‌ها">
        <DeepDiveSection title="آیا با overlay هم کار می‌کند؟">
          <p>
            بله. رمزنگاری و کپسوله‌سازی دو لایهٔ جدا هستند. در overlay، بستهٔ
            کپسوله‌شده می‌تواند رمز هم بشود. ترتیب لایه‌ها بر کارایی اثر دارد،
            اما از دید برنامه تفاوتی نیست.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="رمزنگاری در ClusterMesh">
          <p>
            ترافیک بین کلاسترها هم می‌تواند رمز شود، اما به تنظیمات اضافی نیاز
            دارد. مطمئن شوید کلیدها و سیاست‌ها در هر دو کلاستر هماهنگ‌اند و
            مسیرهای بین‌کلاستری رمزنگاری را پشتیبانی می‌کنند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چه چیزی رمز نمی‌شود؟">
          <p>
            ترافیک داخل یک نود، ترافیک به خارج از کلاستر (مگر اینکه خروجی را هم
            پیکربندی کنید) و ترافیک برخی حالت‌های خاص ممکن است رمز نشود. برای
            اطمینان، وضعیت را با <Ltr>cilium encrypt status</Ltr> و Hubble بررسی
            کنید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="تنظیم نکردن MTU">
        بزرگ‌ترین مشکل عملی رمزنگاری، MTU است. اگر بسته‌های بزرگ drop شوند،
        اتصال‌های TLS و دانلودهای بزرگ شکست می‌خورند. MTU را با سرباری رمزنگاری
        هماهنگ کنید.
      </Callout>
      <Callout variant="warning" title="انتظار رمزنگاری end-to-end">
        رمزنگاری بین نودها انجام می‌شود، نه بین دو Pod در یک نود. اگر به رمزنگاری
        سرتاسری نیاز دارید، باید TLS در برنامه یا mesh را هم در نظر بگیرید.
      </Callout>
      <Callout variant="danger" title="فعال کردن بدون بررسی سازگاری کرنل">
        WireGuard به پشتیبانی کرنل نیاز دارد. قبل از فعال کردن در محیط عملیاتی،
        سازگاری نسخهٔ کرنل و توزیع را بررسی کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>رمزنگاری Cilium شفاف است و برنامه‌ها تغییری نمی‌بینند.</li>
        <li>ترافیک بین نودها رمز می‌شود، نه ترافیک داخل یک نود.</li>
        <li>WireGuard ساده‌تر و پیشنهاد پیش‌فرض است؛ IPsec انعطاف بیشتری دارد.</li>
        <li>MTU و سرباری را جدی بگیرید.</li>
        <li>رمزنگاری جای احراز هویت برنامه را نمی‌گیرد.</li>
      </ul>
      <p>
        حالا ترافیک روی شبکه رمز می‌شود. اما چه چیزی داخل خود نودها می‌گذرد؟ در
        درس بعد با <Ltr>Tetragon</Ltr> می‌بینیم چطور رفتار فرایندها را در زمان
        اجرا مشاهده و محدود کنیم.
      </p>
    </>
  )
}
