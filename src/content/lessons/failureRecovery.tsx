import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { FailureRecoveryExplainer } from '../../components/simulators/FailureRecoveryExplainer'

const checkReplication = `# پارتیشن‌هایی که ISR آن‌ها ناقص است
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --under-replicated-partitions

# پارتیشن‌های بدون لیدر
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --unavailable-partitions

# وضعیت کامل یک تاپیک
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --topic orders`

const reassign = `# فایل reassignment برای جابه‌جایی نسخه‌ها به بروکرهای زنده
cat > reassign.json <<'EOF'
{
  "version": 1,
  "partitions": [
    { "topic": "orders", "partition": 0, "replicas": [2, 3, 4] }
  ]
}
EOF

kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\
  --execute --reassignment-json-file reassign.json

# پایش پیشرفت
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\
  --verify --reassignment-json-file reassign.json`

export function FailureRecoveryContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا اجزای اطمینان‌پذیری را جدا جدا دیدیم: <Ltr>RF</Ltr>،{' '}
        <Ltr>ISR</Ltr>، <Ltr>HW</Ltr>، <Ltr>min.insync.replicas</Ltr> و انتخاب
        لیدر. حالا این قطعات را کنار هم می‌گذاریم و یک خرابی واقعی را از اول تا
        آخر دنبال می‌کنیم: بروکر می‌میرد، لیدر عوض می‌شود، کلاینت retry می‌کند،
        بروکر برمی‌گردد و خوشه خودش را بازیابی می‌کند.
      </p>

      <h2>۱. سه نوع خرابی، سه مسیر بازیابی</h2>
      <p>
        همه خرابی‌ها یکسان نیستند. قبل از هر اقدام، مشخص کنید با کدام نوع روبه‌رو
        هستید:
      </p>
      <table>
        <thead>
          <tr>
            <th>نوع خرابی</th>
            <th>نمونه</th>
            <th>داده از دست می‌رود؟</th>
            <th>بازیابی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>گذرا</td>
            <td>قطع شبکه چند ثانیه‌ای، کندی موقت دیسک</td>
            <td>خیر</td>
            <td>خودکار با <Ltr>Fetch</Ltr> و برگشت به <Ltr>ISR</Ltr></td>
          </tr>
          <tr>
            <td>موقت</td>
            <td>ری‌استارت بروکر، خاموشی برنامه‌ریزی‌شده</td>
            <td>خیر</td>
            <td>failover لیدر و بازگشت بروکر به <Ltr>ISR</Ltr></td>
          </tr>
          <tr>
            <td>دائمی</td>
            <td>خرابی دیسک، از دست رفتن کامل بروکر</td>
            <td>در صورت <Ltr>RF</Ltr> کافی: خیر</td>
            <td>بروکر جایگزین و کپی‌برداری کامل</td>
          </tr>
        </tbody>
      </table>
      <p>
        تفاوت اصلی در «محل داده» است. تا وقتی حداقل یک نسخه از هر پارتیشن زنده
        است، کافکا می‌تواند نسخه‌های عقب‌مانده را از آن دوباره بسازد. اگر همه
        نسخه‌ها از بین بروند، هیچ بازیابی خودکاری وجود ندارد.
      </p>

      <h2>۲. مسیر بازیابی یک خرابی گذرا</h2>
      <p>
        توضیح تعاملی زیر یک سناریوی کامل را جلو می‌برد: اول یک قطع شبکه کوتاه که
        بروکر را از <Ltr>ISR</Ltr> بیرون می‌اندازد، بعد یک خرابی دیسک که لیدر را
        عوض می‌کند و در نهایت بروکر جایگزین که از صفر کپی می‌گیرد.
      </p>

      <FailureRecoveryExplainer />

      <p>
        در گام‌های ۲ تا ۵ دیدید خرابی گذرا خودش درمان شد: بروکر ۳ از{' '}
        <Ltr>ISR</Ltr> خارج شد، نوشتن ادامه یافت و بعد از برگشت شبکه دوباره عضو{' '}
        <Ltr>ISR</Ltr> شد. در گام‌های ۶ تا ۹ همان مسیر برای خرابی دیسک طولانی‌تر
        شد، چون بروکر جایگزین باید کل لاگ را از لیدر بگیرد.
      </p>

      <h2>۳. خرابی دیسک و بروکر جایگزین</h2>
      <p>
        وقتی دیسک یک بروکر از بین می‌رود، لاگ محلی آن هم از بین می‌رود. اگر همان
        بروکر با دیسک خالی بالا بیاید، کافکا آن را یک فالوور تازه می‌بیند: از
        آفست صفر شروع می‌کند و تا رسیدن به <Ltr>LEO</Ltr> لیدر کپی می‌گیرد. این
        کپی‌برداری کامل می‌تواند ساعت‌ها طول بکشد و در این مدت پارتیشن{' '}
        <Ltr>Under-Replicated</Ltr> است.
      </p>
      <p>
        اگر بروکر برنگردد، باید نسخه‌ها را به بروکرهای زنده منتقل کنید. این کار
        با <Ltr>kafka-reassign-partitions.sh</Ltr> انجام می‌شود و باید با{' '}
        <Ltr>--verify</Ltr> تا پایان پایش شود.
      </p>
      <CodeBlock code={reassign} language="bash" filename="reassign-partition.sh" />
      <Callout variant="warning" title="حذف بروکر قبل از reassignment">
        اگر بروکر مرده را از خوشه حذف کنید بدون اینکه نسخه‌هایش را جابه‌جا کنید،
        ممکن است <Ltr>RF</Ltr> مؤثر بعضی پارتیشن‌ها کم شود. اول reassignment، بعد
        حذف.
      </Callout>

      <h2>۴. قطع شبکه و خطر split brain</h2>
      <p>
        در برخی سیستم‌ها قطع شبکه بین دو نیمه خوشه باعث می‌شود هر نیمه فکر کند
        دیگری مرده است و هر دو بنویسند. کافکا این وضعیت را با دو ابزار کنترل
        می‌کند: کنترلر واحد برای تصمیم‌های متادیتا و <Ltr>ISR</Ltr> برای پذیرش
        نوشتن.
      </p>
      <p>
        اگر بروکر لیدر از دید کنترلر قطع شود، کنترلر لیدر جدید انتخاب می‌کند.
        لیدر قدیمی وقتی برمی‌گردد، دیگر لیدر نیست و باید لاگ خود را با لیدر جدید
        هماهنگ کند. چون <Ltr>unclean.leader.election.enable=false</Ltr> است،
        نسخه‌ای که از <Ltr>ISR</Ltr> بیرون افتاده نمی‌تواند بدون همگام شدن لیدر
        شود.
      </p>
      <Callout variant="danger" title="شبکه ناپایدار را نادیده نگیرید">
        قطع‌های کوتاه مکرر باعث خروج و ورود پی‌درپی فالوورها به <Ltr>ISR</Ltr>{' '}
        می‌شود، <Ltr>HW</Ltr> را عقب نگه می‌دارد و در بدترین حالت نوشتن را متوقف
        می‌کند. ریشه را در شبکه و ظرفیت بروکرها پیدا کنید، نه در تنظیمات کافکا.
      </Callout>

      <h2>۵. چک‌لیست بازیابی</h2>
      <ol>
        <li>
          وضعیت را ببینید: <Ltr>UnderReplicatedPartitions</Ltr>،{' '}
          <Ltr>OfflinePartitionsCount</Ltr> و <Ltr>UnderMinIsrPartitionCount</Ltr>.
        </li>
        <li>
          مشخص کنید خرابی گذرا، موقت یا دائمی است. برای خرابی دائمی، بروکر
          جایگزین آماده کنید.
        </li>
        <li>
          اگر پارتیشن آفلاین است، ببینید چرا <Ltr>ISR</Ltr> خالی شده و آیا
          برگرداندن یک نسخه ممکن است.
        </li>
        <li>
          بروکر برگشته را زیر بار نگذارید تا <Ltr>ISR</Ltr> کامل شود؛{' '}
          <Ltr>Under-Replicated</Ltr> را تا صفر شدن پایش کنید.
        </li>
        <li>
          بعد از بازیابی، تعادل لیدرها و ظرفیت دیسک را بررسی کنید و در صورت نیاز
          reassignment یا preferred leader election اجرا کنید.
        </li>
      </ol>
      <CodeBlock code={checkReplication} language="bash" filename="check-recovery.sh" />

      <DeepDive title="جزئیات کپی‌برداری و کوتاه‌سازی در بازیابی">
        <DeepDiveSection title="کپی‌برداری کامل یا افزایشی؟">
          <p>
            فالووری که فقط چند رکورد عقب است، از <Ltr>LEO</Ltr> محلی خود ادامه
            می‌دهد. فالووری که لاگش خالی است، از ابتدا کپی می‌گیرد. در هر دو
            حالت، لیدر داده را در دسته‌های محدود به{' '}
            <Ltr>replica.fetch.max.bytes</Ltr> می‌فرستد و فالوور پیشرفت خود را
            ذخیره می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="کوتاه‌سازی با Leader Epoch">
          <p>
            اگر فالوور برگشته رکوردهایی داشته باشد که با لیدر جدید فرق دارند،
            کافکا با <Ltr>Leader Epoch</Ltr> نقطه واگرایی را پیدا می‌کند و لاگ را
            تا آن نقطه کوتاه می‌کند. این کار جلوی نگه‌داشتن داده commitنشده و
            ناسازگار را می‌گیرد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="جایگزینی بروکر و rack">
          <p>
            بروکر جایگزین را در همان rack بروکر مرده قرار دهید تا چیدمان آگاه از
            rack به هم نریزد. اگر بروکر را در rack دیگری بگذارید، ممکن است دو
            نسخه از یک پارتیشن در یک rack بیفتند و تحمل خرابی کم شود.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="پاک کردن لاگ برای سریع‌تر شدن بازیابی">
        پاک کردن لاگ یک فالوور برای «شروع تازه» باعث کپی‌برداری کامل و فشار
        بیشتر روی شبکه و لیدر می‌شود. فقط وقتی لاگ خراب است این کار را بکنید و
        از قبل ظرفیت را بررسی کنید.
      </Callout>
      <Callout variant="warning" title="افزودن بروکر بدون reassignment">
        بروکر جدید به‌تنهایی هیچ نسخه‌ای دریافت نمی‌کند. تا وقتی reassignment
        اجرا نکنید، بار بین بروکرها متعادل نمی‌شود.
      </Callout>
      <Callout variant="warning" title="نادیده گرفتن Under-Replicated طولانی">
        اگر <Ltr>UnderReplicatedPartitions</Ltr> ساعت‌ها بالای صفر بماند، یعنی
        یک نسخه همگام نمی‌شود. این وضعیت را به‌عنوان خرابی فعال ببینید، نه یک
        هشدار بی‌اهمیت.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>خرابی گذرا با <Ltr>ISR</Ltr> و <Ltr>Fetch</Ltr> خودکار درمان می‌شود.</li>
        <li>خرابی دیسک به بروکر جایگزین و کپی‌برداری کامل نیاز دارد.</li>
        <li>پارتیشن تا وقتی یک نسخه از <Ltr>ISR</Ltr> زنده است در دسترس می‌ماند.</li>
        <li>پایش <Ltr>UnderReplicatedPartitions</Ltr> بخشی از بازیابی است، نه کار اضافه.</li>
        <li>بعد از بازیابی، تعادل لیدر و ظرفیت دیسک را بررسی کنید.</li>
      </ul>
      <p>
        در درس آخر این فصل، همه این انتخاب‌ها را در قالب یک طراحی دوام کنار هم
        می‌گذاریم: چه ترکیبی از <Ltr>RF</Ltr>، <Ltr>acks</Ltr>،{' '}
        <Ltr>min.insync.replicas</Ltr> و rack awareness برای هر نوع داده مناسب
        است.
      </p>
    </>
  )
}
