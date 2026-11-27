import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { TopicDesignExplainer } from '../../components/simulators/TopicDesignExplainer'

const namingExample = `prod.orders.order.created
prod.orders.payment.captured
prod.inventory.stock.reserved
prod.billing.invoice.issued.v2`

const createTopic = `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic prod.orders.order.created \\
  --partitions 12 \\
  --replication-factor 3 \\
  --config min.insync.replicas=2 \\
  --config retention.ms=604800000 \\
  --config cleanup.policy=delete`

const compactedTopic = `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic prod.customers.profile \\
  --partitions 12 \\
  --replication-factor 3 \\
  --config cleanup.policy=compact \\
  --config min.cleanable.dirty.ratio=0.3 \\
  --config segment.ms=3600000`

const partitionMath = `# assume 120,000 msg/s total and 20,000 msg/s per partition
throughput_partitions = 120000 / 20000 = 6

# assume 8 consumers in the group, one partition each
consumer_partitions = 8

# add headroom for growth and replay
chosen_partitions = max(6, 8) * 2 = 16`

export function TopicDesignContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        سه تصمیم کوچک در ابتدای هر پروژه، سال‌ها بعد به دردسر تبدیل می‌شوند:
        نام تاپیک، تعداد پارتیشن و انتخاب <Ltr>Key</Ltr>. این سه تصمیم تقریباً
        برگشت‌ناپذیرند یا تغییرشان گران است، پس ارزش دارند چند دقیقه با عدد و
        مثال بررسی شوند. در این درس یک چارچوب عملی برای گرفتن همین سه تصمیم
        می‌سازیم.
      </p>

      <Callout variant="info" title="تاپیک یک قرارداد است، نه فقط یک نام">
        وقتی یک تاپیک می‌سازید، مصرف‌کننده‌ها، ابزارها، داشبوردها و اسکریپت‌ها
        به آن وابسته می‌شوند. نام و ساختار تاپیک را مثل یک <Ltr>API</Ltr> عمومی
        ببینید: تغییرش نیازمند نسخه‌بندی و هماهنگی است.
      </Callout>

      <h2>۱. نام‌گذاری تاپیک</h2>
      <p>
        یک قرارداد رایج، نام‌گذاری سلسله‌مراتبی با نقطه است:{' '}
        <Ltr>env.domain.entity.event</Ltr>. این ساختار هم مرتب‌سازی الفبایی را
        ممکن می‌کند، هم اجازه می‌دهد با یک الگو روی چند تاپیک مجوز یا کانکتور
        تعریف کنید.
      </p>
      <CodeBlock language="text" filename="topic names" code={namingExample} />
      <table>
        <thead>
          <tr>
            <th>نام ضعیف</th>
            <th>مشکل</th>
            <th>نام بهتر</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>orders</Ltr></td>
            <td>معلوم نیست رویداد است یا موجودیت، محیط کدام است</td>
            <td><Ltr>prod.orders.order.created</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>order-events-all</Ltr></td>
            <td>چند نوع رویداد در یک تاپیک قاطی شده‌اند</td>
            <td>یک تاپیک برای هر نوع رویداد</td>
          </tr>
          <tr>
            <td><Ltr>test-topic</Ltr></td>
            <td>بدون دامنه و بدون مالک</td>
            <td><Ltr>staging.billing.invoice.issued</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>orders_v2_final</Ltr></td>
            <td>نسخه‌گذاری مبهم و بدون قرارداد سازگاری</td>
            <td><Ltr>prod.orders.order.created.v2</Ltr></td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip" title="یک نوع رویداد در هر تاپیک">
        ترکیب چند نوع رویداد در یک تاپیک، مصرف‌کننده را مجبور می‌کند همه را
        بخواند و فیلتر کند و طرح‌واره (<Ltr>Schema</Ltr>) را پیچیده می‌کند.
        تاپیک جدا برای هر نوع رویداد، مجوزدهی، نگهداری و پایش را ساده‌تر می‌کند.
      </Callout>

      <h2>۲. تعداد پارتیشن: با عدد تصمیم بگیرید</h2>
      <p>
        تعداد پارتیشن سقف موازی‌سازی مصرف‌کننده و سقف توان نوشتن را تعیین می‌کند.
        یک برآورد ساده کافی است: بیشینه دو عدد «توان موردنیاز تقسیم بر توان هر
        پارتیشن» و «تعداد مصرف‌کننده‌های هم‌زمان» را بگیرید و برای رشد، سربار
        اضافه کنید.
      </p>
      <CodeBlock language="text" filename="partition estimate" code={partitionMath} />
      <p>
        در این مثال، شش پارتیشن از نظر توان کافی است، اما هشت مصرف‌کننده
        می‌خواهیم؛ پس حداقل هشت پارتیشن لازم داریم. با دو برابر کردن برای رشد،
        به شانزده می‌رسیم. توجه کنید که هر پارتیشن در هر لحظه فقط به یک
        مصرف‌کننده از هر گروه می‌رسد؛ پارتیشن بیشتر از مصرف‌کننده، فقط مصرف‌کننده
        بیکار می‌سازد.
      </p>
      <table>
        <thead>
          <tr>
            <th>عامل</th>
            <th>اثر پارتیشن بیشتر</th>
            <th>اثر پارتیشن کمتر</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>موازی‌سازی مصرف‌کننده</td>
            <td>بیشتر</td>
            <td>محدود</td>
          </tr>
          <tr>
            <td>زمان <Ltr>Rebalance</Ltr></td>
            <td>بیشتر</td>
            <td>کمتر</td>
          </tr>
          <tr>
            <td>تعداد فایل و <Ltr>File Handle</Ltr></td>
            <td>بیشتر</td>
            <td>کمتر</td>
          </tr>
          <tr>
            <td>تأخیر انتها به انتها</td>
            <td>کمی بیشتر</td>
            <td>کمتر</td>
          </tr>
          <tr>
            <td>هزینه <Ltr>Reassignment</Ltr></td>
            <td>بیشتر</td>
            <td>کمتر</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="warning" title="تعداد پارتیشن را فقط می‌توان افزایش داد">
        کاهش تعداد پارتیشن بدون حذف و بازسازی تاپیک ممکن نیست و افزایش آن هم
        ترتیب <Ltr>Key</Ltr>های موجود را می‌شکند؛ چون <Ltr>hash(key)</Ltr> روی
        تعداد جدید محاسبه می‌شود. اگر تردید دارید، کمی بیشتر انتخاب کنید، نه
        کمتر.
      </Callout>

      <h2>۳. انتخاب Key: ترتیب در برابر تعادل</h2>
      <p>
        <Ltr>Key</Ltr> تعیین می‌کند هر رکورد به کدام پارتیشن برود. اگر{' '}
        <Ltr>Key</Ltr> بدهید، کافکا از <Ltr>hash(key) % partitions</Ltr>{' '}
        استفاده می‌کند و همه رکوردهای یک <Ltr>Key</Ltr> همیشه در یک پارتیشن
        می‌نشینند؛ پس ترتیبشان حفظ می‌شود. اگر <Ltr>Key</Ltr> ندهید، توزیع
        چرخشی یا چسبنده انجام می‌شود و ترتیب بین رکوردها تضمینی ندارد.
      </p>
      <p>
        مشکل وقتی شروع می‌شود که یک <Ltr>Key</Ltr> پرمعامله، بخش بزرگی از بار را
        بسازد. در توضیح تعاملی زیر، شش رکورد را با دو انتخاب متفاوت{' '}
        <Ltr>Key</Ltr> می‌بینیم: یکی ترتیب مشتری را حفظ می‌کند اما یک پارتیشن را
        داغ می‌کند، دیگری توزیع را متعادل می‌کند اما ترتیب مشتری را می‌شکند.
      </p>
      <TopicDesignExplainer />
      <table>
        <thead>
          <tr>
            <th>انتخاب Key</th>
            <th>ترتیب</th>
            <th>تعادل بار</th>
            <th>مناسب برای</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>customerId</Ltr></td>
            <td>در سطح مشتری</td>
            <td>وابسته به توزیع مشتریان</td>
            <td>رویدادهای یک مشتری باید به ترتیب پردازش شوند</td>
          </tr>
          <tr>
            <td><Ltr>orderId</Ltr></td>
            <td>در سطح سفارش</td>
            <td>معمولاً خوب</td>
            <td>هر سفارش مستقل است</td>
          </tr>
          <tr>
            <td><Ltr>tenantId</Ltr></td>
            <td>در سطح مستأجر</td>
            <td>ریسک مستأجر بزرگ</td>
            <td>چند مستأجری با ترتیب درون هر مستأجر</td>
          </tr>
          <tr>
            <td>بدون <Ltr>Key</Ltr></td>
            <td>ندارد</td>
            <td>خوب</td>
            <td>رویدادهای مستقل مثل لاگ و متریک</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="danger" title="کلید با کاردینالیتی پایین">
        اگر <Ltr>Key</Ltr> فقط چند مقدار داشته باشد (مثلاً کشور یا نوع رویداد)،
        بیشتر رکوردها روی چند پارتیشن می‌نشینند و بقیه خالی می‌مانند. برای
        ترتیب، کلید را دقیق انتخاب کنید؛ برای تعادل، کاردینالیتی بالا لازم است.
      </Callout>

      <h2>۴. Retention و Cleanup Policy برای هر نوع تاپیک</h2>
      <p>
        هر تاپیک یک نقش دارد و نقشش سیاست نگهداری را تعیین می‌کند. تاپیک
        رویدادهای کسب‌وکار معمولاً با <Ltr>delete</Ltr> بر اساس زمان یا اندازه
        نگه داشته می‌شود؛ تاپیک وضعیت (مثل پروفایل مشتری یا <Ltr>changelog</Ltr>{' '}
        کافکا استریمز) با <Ltr>compact</Ltr> فقط آخرین مقدار هر کلید را نگه
        می‌دارد.
      </p>
      <CodeBlock language="bash" filename="event topic" code={createTopic} />
      <CodeBlock language="bash" filename="compacted topic" code={compactedTopic} />
      <table>
        <thead>
          <tr>
            <th>نوع تاپیک</th>
            <th>Cleanup</th>
            <th>دلیل</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>رویداد کسب‌وکار</td>
            <td><Ltr>delete</Ltr> با <Ltr>retention.ms</Ltr></td>
            <td>تاریخچه محدود برای بازپخش و بازیابی</td>
          </tr>
          <tr>
            <td>وضعیت فعلی موجودیت</td>
            <td><Ltr>compact</Ltr></td>
            <td>فقط آخرین مقدار هر کلید لازم است</td>
          </tr>
          <tr>
            <td>لاگ و متریک</td>
            <td><Ltr>delete</Ltr> با زمان کوتاه</td>
            <td>حجم زیاد و ارزش تاریخی کم</td>
          </tr>
          <tr>
            <td><Ltr>changelog</Ltr> استریمز</td>
            <td><Ltr>compact</Ltr></td>
            <td>بازسازی state store از آخرین مقادیر</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="warning" title="Compaction حذف فوری نیست">
        <Ltr>compact</Ltr> به معنی پاک‌شدن فوری نسخه‌های قدیمی نیست؛ پاک‌سازی در
        پس‌زمینه و بر اساس نسبت کثیفی و اندازه segment انجام می‌شود. برای حذف
        قطعی یک کلید باید یک رکورد <Ltr>tombstone</Ltr> با مقدار <Ltr>null</Ltr>{' '}
        بنویسید.
      </Callout>

      <h2>۵. Schema و قرارداد سازگاری</h2>
      <p>
        تاپیک بدون قرارداد طرح‌واره، به یک دام شکننده تبدیل می‌شود: تولیدکننده
        فیلدی را حذف می‌کند و مصرف‌کننده در نیمه شب می‌شکند. با{' '}
        <Ltr>Schema Registry</Ltr> و حالت سازگاری <Ltr>backward</Ltr>،
        مصرف‌کننده‌های قدیمی می‌توانند داده جدید را بخوانند. تغییرات ناسازگار را
        در تاپیک نسخه‌دار جدید منتشر کنید.
      </p>
      <Callout variant="tip" title="نام تاپیک را نسخه‌دار کنید، نه فیلد را">
        برای تغییرات ناسازگار، تاپیک جدید مثل <Ltr>...created.v2</Ltr> بسازید و
        هر دو را مدتی موازی اجرا کنید. این کار مهاجرت تدریجی مصرف‌کننده‌ها را
        ممکن می‌کند و امکان بازگشت را حفظ می‌کند.
      </Callout>

      <DeepDive title="زیر کاپوت: محاسبه دقیق‌تر ظرفیت و Key">
        <DeepDiveSection title="توان هر پارتیشن را چطور اندازه بگیریم؟">
          <p>
            عدد «۲۰٬۰۰۰ پیام در ثانیه» فقط با اندازه پیام و سطح دوام معنا دارد.
            برای برآورد واقعی، از بنچمارک خودتان با اندازه واقعی رکورد،{' '}
            <Ltr>acks</Ltr> موردنظر و فشرده‌سازی استفاده کنید. سپس پهنای باند
            دیسک و شبکه را هم بسنجید؛ گاهی گلوگاه شبکه است، نه پردازش.
          </p>
          <p>
            فرمول ساده‌تر برای پهنای باند:{' '}
            <Ltr>throughput = messages_per_sec × avg_record_bytes</Ltr>. اگر
            نتیجه به سقف دیسک یا شبکه نزدیک است، پارتیشن بیشتر به‌تنهایی کمک
            نمی‌کند و باید بروکر یا دیسک اضافه کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Hot Key را چطور تشخیص دهیم؟">
          <p>
            متریک <Ltr>bytes-in-per-topic</Ltr> و{' '}
            <Ltr>messages-in-per-topic</Ltr> در سطح پارتیشن را ببینید. اگر یک
            پارتیشن چند برابر بقیه بار دارد، احتمالاً یک <Ltr>Key</Ltr> داغ
            دارید. لاگ مصرف‌کننده هم می‌تواند تأخیر نامتقارن پارتیشن‌ها را نشان
            دهد.
          </p>
          <p>
            راه‌حل‌ها: کلید ترکیبی مثل <Ltr>customerId + shard</Ltr>، جدا کردن
            مشتری‌های بزرگ به تاپیک اختصاصی، یا شکستن موجودیت بزرگ به چند کلید.
            هر کدام ترتیب را تغییر می‌دهد، پس با نیاز کسب‌وکار بسنجید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="افزودن پارتیشن و اثر آن بر Key">
          <p>
            وقتی تعداد پارتیشن از <Ltr>N</Ltr> به <Ltr>M</Ltr> می‌رود،{' '}
            <Ltr>hash(key) % N</Ltr> به <Ltr>hash(key) % M</Ltr> تغییر می‌کند.
            نتیجه این است که بعضی کلیدها به پارتیشن دیگری می‌روند و ترتیب
            رویدادهای قبلی و جدیدشان ممکن است به هم بریزد. اگر ترتیب کلید مهم
            است، افزایش پارتیشن را در زمان کم‌بار و با توقف کوتاه مصرف‌کننده
            انجام دهید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>۶. چک‌لیست طراحی</h2>
      <ul>
        <li>نام تاپیک شامل محیط، دامنه، موجودیت و نوع رویداد است.</li>
        <li>هر تاپیک فقط یک نوع رویداد دارد و مالک مشخصی دارد.</li>
        <li>تعداد پارتیشن از توان موردنیاز و تعداد مصرف‌کننده محاسبه شده است.</li>
        <li><Ltr>Key</Ltr> بر اساس نیاز ترتیب انتخاب شده و کاردینالیتی کافی دارد.</li>
        <li><Ltr>cleanup.policy</Ltr> با نقش تاپیک هم‌خوان است.</li>
        <li>طرح‌واره و حالت سازگاری مشخص است و تغییرات ناسازگار نسخه‌دار می‌شوند.</li>
        <li><Ltr>min.insync.replicas</Ltr> و <Ltr>replication.factor</Ltr> با سطح دوام هم‌خوان‌اند.</li>
      </ul>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="یک تاپیک برای همه رویدادها">
        تاپیک <Ltr>events</Ltr> که همه نوع رویداد در آن می‌رود، مجوزدهی،
        نگهداری و طرح‌واره را قربانی می‌کند. مصرف‌کننده‌ها مجبور می‌شوند همه را
        بخوانند و فیلتر کنند و پیدا کردن مالک داده سخت می‌شود.
      </Callout>
      <Callout variant="danger" title="انتخاب تعداد پارتیشن بر اساس حدس">
        یک یا سه پارتیشن برای شروع راحت است، اما اگر ترافیک رشد کند و ترتیب
        <Ltr>Key</Ltr> هم مهم باشد، افزایش پارتیشن دردناک می‌شود. برآورد اولیه
        را با عدد انجام دهید.
      </Callout>
      <Callout variant="warning" title="Compaction را جای Retention گذاشتن">
        <Ltr>compact</Ltr> برای وضعیت است، نه برای تاریخچه رویداد. اگر
        مصرف‌کننده‌ای به همه رویدادها نیاز دارد، تاپیک فشرده‌شده فقط آخرین مقدار
        را به او می‌دهد.
      </Callout>
      <Callout variant="info" title="تاپیک را مثل API مستند کنید">
        برای هر تاپیک، مالک، طرح‌واره، سیاست نگهداری و سطح دوام را در یک سند
        کوتاه بنویسید. این سند از بحث‌های تکراری در تیم جلوگیری می‌کند.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>نام تاپیک یک قرارداد است؛ ساختار <Ltr>env.domain.entity.event</Ltr> را رعایت کنید.</li>
        <li>تعداد پارتیشن را از توان و موازی‌سازی محاسبه کنید و برای رشد سربار بگذارید.</li>
        <li><Ltr>Key</Ltr> ترتیب را می‌سازد و می‌تواند تعادل را بشکند؛ با کاردینالیتی بالا انتخابش کنید.</li>
        <li><Ltr>delete</Ltr> برای رویداد و <Ltr>compact</Ltr> برای وضعیت؛ هر کدام جای خودش را دارد.</li>
        <li>طرح‌واره و نسخه‌بندی را از روز اول جدی بگیرید.</li>
      </ul>
      <p>
        با این تصمیم‌ها، پایه جریان داده محکم می‌شود. در درس بعدی کافکا را با
        گزینه‌های دیگر پیام‌رسانی مقایسه می‌کنیم تا بدانید کجا این طراحی
        کم‌هزینه‌ترین انتخاب است و کجا ابزار دیگری مناسب‌تر است.
      </p>
    </>
  )
}
