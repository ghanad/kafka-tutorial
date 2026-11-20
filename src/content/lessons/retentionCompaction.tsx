import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { Ltr } from '../../components/ui/Ltr'
import { RetentionSimulator } from '../../components/simulators/RetentionSimulator'
import { CompactionSimulator } from '../../components/simulators/CompactionSimulator'

const retentionConfig = `# نگه‌داشتن داده به مدت ۷ روز (۶۰۴۸۰۰۰۰۰ میلی‌ثانیه)
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --alter --entity-type topics --entity-name orders \\
  --add-config retention.ms=604800000

# حذف بر اساس حجم: حداکثر ۵ گیگابایت برای هر پارتیشن
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --alter --entity-type topics --entity-name orders \\
  --add-config retention.bytes=5368709120

# مشاهده تنظیمات فعلی تاپیک
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --describe --entity-type topics --entity-name orders`

const compactionConfig = `# فعال‌کردن Log Compaction برای تاپیک وضعیت سفارش‌ها
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --alter --entity-type topics --entity-name order-state \\
  --add-config cleanup.policy=compact

# تنظیم فاصله پاک‌سازی و مدت نگه‌داشتن Tombstone
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --alter --entity-type topics --entity-name order-state \\
  --add-config min.cleanable.dirty.ratio=0.3,delete.retention.ms=86400000`

const createCompactedTopic = `# ساخت تاپیک با Compaction و سگمنت‌های کوچک‌تر
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic order-state \\
  --partitions 6 --replication-factor 3 \\
  --config cleanup.policy=compact \\
  --config segment.bytes=104857600`

const compactDeleteConfig = `# فعال‌کردن هم‌زمان Compaction و Retention
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --alter --entity-type topics --entity-name order-state \\
  --add-config 'cleanup.policy=[compact,delete]'`

export function RetentionCompactionContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        کافکا داده را برای همیشه نگه نمی‌دارد؛ در غیر این صورت دیسک هر خوشه‌ای پس
        از چند ماه پر می‌شود. اما «حذف داده» در کافکا یک تصمیم ساده نیست: برخی
        تاپیک‌ها باید تاریخچه کامل رویدادها را نگه دارند، برخی فقط آخرین وضعیت هر
        موجودیت را می‌خواهند و برخی ترکیبی از هر دو. کافکا برای این نیازها دو
        سازوکار متفاوت دارد: <strong>Retention</strong> و{' '}
        <strong>Log Compaction</strong>. در این درس یاد می‌گیریم هر کدام چه زمانی
        مناسب‌اند و چه دام‌هایی دارند. مبنای رفتار توصیف‌شده، Kafka 4.1 است.
      </p>

      <h2>۱. چرخه عمر داده در یک پارتیشن</h2>
      <p>
        هر رکورد از لحظه نوشته شدن تا حذف شدن، سه مرحله را طی می‌کند: در سگمنت
        فعال نوشته می‌شود، با پر شدن یا پیر شدن سگمنت به یک سگمنت بسته تبدیل
        می‌شود، و در نهایت یکی از سیاست‌های پاک‌سازی روی آن اعمال می‌شود. تاپیک
        با تنظیم <Ltr>cleanup.policy</Ltr> مشخص می‌کند کدام سیاست اعمال شود:
      </p>
      <ul>
        <li>
          <Ltr className="font-mono">cleanup.policy=delete</Ltr> → سیاست پیش‌فرض؛
          حذف بر اساس زمان یا حجم (<Ltr>Retention</Ltr>).
        </li>
        <li>
          <Ltr className="font-mono">cleanup.policy=compact</Ltr> → نگه‌داشتن آخرین
          مقدار هر کلید (<Ltr>Log Compaction</Ltr>).
        </li>
      </ul>

      <h2>۲. Retention: حذف بر اساس زمان یا حجم</h2>
      <p>
        در سیاست <Ltr>delete</Ltr>، کافکا سگمنت‌های قدیمی را حذف می‌کند. دو معیار
        وجود دارد و هر کدام برقرار شود، سگمنت‌های واجد شرایط حذف می‌شوند:
      </p>
      <ul>
        <li>
          <strong>زمان:</strong> <Ltr>retention.ms</Ltr> (پیش‌فرض ۶۰۴۸۰۰۰۰۰
          میلی‌ثانیه، یعنی ۷ روز). سگمنت‌هایی که جدیدترین رکوردشان از این مدت
          قدیمی‌تر باشد حذف می‌شوند.
        </li>
        <li>
          <strong>حجم:</strong> <Ltr>retention.bytes</Ltr> (پیش‌فرض ‎-۱ یعنی
          بی‌نهایت). این سقف برای هر پارتیشن است، نه کل تاپیک. اگر حجم پارتیشن از
          این مقدار بیشتر شود، قدیمی‌ترین سگمنت‌ها حذف می‌شوند تا به سقف برگردیم.
        </li>
      </ul>
      <p>
        کافکا هر چند وقت یک‌بار (به‌طور پیش‌فرض هر ۵ دقیقه با{' '}
        <Ltr>log.retention.check.interval.ms</Ltr>) وضعیت را بررسی می‌کند؛ پس حذف
        فوری و لحظه‌ای نیست. این config فقط سطح بروکر است و معادل تاپیکی ندارد.
      </p>

      <h3>حذف در سطح سگمنت، نه رکورد</h3>
      <p>
        مهم‌ترین نکته Retention این است که کافکا رکوردها را تک‌تک حذف نمی‌کند؛ فقط
        سگمنت‌هایی را حذف می‌کند که <strong>همه رکوردهایشان</strong> واجد شرط حذف
        باشند. حتی اگر بعضی رکوردهای یک سگمنت منقضی شده باشند، تا وقتی یک رکورد
        زنده در آن سگمنت باشد، کل سگمنت می‌ماند. سگمنت فعال هم معمولاً حذف
        نمی‌شود، چون سگمنت آخر است و رکوردهای تازه در آن نوشته می‌شوند. اما این
        قانون مطلق نیست: اگر همه رکوردهای سگمنت فعال از retention قدیمی‌تر شوند و{' '}
        <Ltr>high watermark</Ltr> به انتهای لاگ برسد، کافکا می‌تواند یک سگمنت خالی
        جدید بسازد و سگمنت قبلی را حذف کند.
      </p>
      <p>
        نتیجه این است که حجم واقعی داده همیشه کمی بیشتر از حد انتظار است و نقطه
        شروع لاگ (<Ltr>log start offset</Ltr>) پله‌پله جلو می‌رود، نه پیوسته. برای
        همین است که بزرگ‌کردن <Ltr>segment.bytes</Ltr> (سطح تاپیک) یا{' '}
        <Ltr>log.segment.bytes</Ltr> (سطح بروکر) تا نزدیک سقف ۲ گیبیبایتی، حذف را
        درشت‌تر و دیرتر می‌کند. این config از نوع <Ltr>int</Ltr> است و مستندات
        فقط حداقل ۱ MiB را ذکر می‌کند؛ بنابراین عملاً بزرگ‌ترین مقدار قابل تنظیم
        2,147,483,647 بایت (حدود ۲ GiB) است.
      </p>

      <h3>یک مثال عددی</h3>
      <p>
        فرض کنید تاپیک <Ltr className="font-mono">orders</Ltr> ۶ پارتیشن و ضریب
        تکرار ۳ دارد، <Ltr>retention.ms</Ltr> روی ۷ روز است،{' '}
        <Ltr>retention.bytes</Ltr> روی ‎-۱ (بی‌نهایت) و{' '}
        <Ltr>segment.bytes</Ltr> روی پیش‌فرض ۱ GiB است. اگر حجم تولید{' '}
        <strong>هر پارتیشن</strong> روزی ۱۰۰ مگابایت باشد، هر پارتیشن در ۷ روز
        حدود ۷۰۰ مگابایت (۱۰۰ × ۷) داده دارد. با سه replica، هر پارتیشن روی دیسک
        حدود ۲٫۱ گیگابایت فضا می‌گیرد و برای ۶ پارتیشن در مجموع حدود ۱۲٫۶
        گیگابایت لازم است. اگر همان ۱۰۰ مگابایت در روز برای <strong>کل تاپیک</strong>{' '}
        باشد، سهم هر پارتیشن حدود ۱۶٫۷ مگابایت در روز و کل دیسک حدود ۲٫۱ گیگابایت
        می‌شود. این عددها حجم داده در پنجره retention را نشان می‌دهند؛ دیسک واقعی
        می‌تواند بیشتر باشد، چون سگمنت فعال تا پر شدن یا چرخش حذف نمی‌شود.
      </p>
      <p>
        حالا اگر <Ltr>retention.bytes</Ltr> را روی ۵۰۰ مگابایت (برای هر پارتیشن)
        بگذارید، با <Ltr>segment.bytes</Ltr> پیش‌فرض ۱ GiB هیچ سگمنت بسته‌ای وجود
        ندارد؛ سگمنت فعال ۷۰۰ مگابایتی هنوز بسته نشده و در این مثال حتی یک سگمنت
        کامل هم پر نمی‌شود، پس حذف حجمی عملاً اتفاق نمی‌افتد. برای اینکه سیاست حجمی زودتر از زمانی عمل کند،
        باید <Ltr>segment.bytes</Ltr> را کوچک‌تر از <Ltr>retention.bytes</Ltr>{' '}
        انتخاب کنید؛ مثلاً با <Ltr>segment.bytes=104857600</Ltr> (۱۰۰ MiB) و{' '}
        <Ltr>retention.bytes=524288000</Ltr> (۵۰۰ MiB)، پس از عبور از سقف،
        قدیمی‌ترین سگمنت‌های ۱۰۰ مگابایتی حذف می‌شوند. در این حالت سقف اسمی کل
        دیسک حدود ۹ گیگابایت (۵۰۰ مگابایت × ۶ پارتیشن × ۳ replica) است، به‌علاوه
        اثر گرد‌شدن در سطح سگمنت.
      </p>

      <h2>۳. تنظیم Retention در عمل</h2>
      <CodeBlock
        code={retentionConfig}
        language="bash"
        filename="configure-retention.sh"
      />
      <p>
        تنظیمات در سطح تاپیک، تنظیمات پیش‌فرض بروکر را بازنویسی می‌کنند. در این
        درس <Ltr>retention.ms</Ltr>، <Ltr>retention.bytes</Ltr>،{' '}
        <Ltr>segment.bytes</Ltr>، <Ltr>cleanup.policy</Ltr>،{' '}
        <Ltr>delete.retention.ms</Ltr>، <Ltr>min.cleanable.dirty.ratio</Ltr> و{' '}
        <Ltr>file.delete.delay.ms</Ltr> سطح تاپیک‌اند؛ معادل بروکرشان به ترتیب{' '}
        <Ltr>log.retention.ms</Ltr>، <Ltr>log.retention.bytes</Ltr>،{' '}
        <Ltr>log.segment.bytes</Ltr>، <Ltr>log.cleanup.policy</Ltr>،{' '}
        <Ltr>log.cleaner.delete.retention.ms</Ltr>،{' '}
        <Ltr>log.cleaner.min.cleanable.ratio</Ltr> و{' '}
        <Ltr>log.segment.delete.delay.ms</Ltr> است. <Ltr>segment.ms</Ltr> هم
        سطح تاپیک دارد و معادل بروکرش <Ltr>log.roll.ms</Ltr> است.
      </p>
      <p>
        دستور <Ltr>--describe</Ltr> فقط overrideهای داینامیک تاپیک را نشان
        می‌دهد؛ اگر یک config در خروجی نباشد، مقدار پیش‌فرض بروکر اعمال می‌شود.
        برای دیدن همه مقادیر، شامل پیش‌فرض‌ها، در نسخه‌های جدید از{' '}
        <Ltr>--all</Ltr> استفاده کنید (این گزینه از Kafka 2.5 اضافه شده است).
      </p>

      <h2>۴. Log Compaction: نگه‌داشتن آخرین وضعیت هر کلید</h2>
      <p>
        بعضی جریان‌های داده «تاریخچه رویداد» نیستند؛ «وضعیت فعلی» هستند. مثلاً
        تاپیکی که وضعیت نهایی هر سفارش را نگه می‌دارد: برای سیستم پایین‌دستی فقط
        مهم است که سفارش <Ltr className="font-mono">order-1</Ltr> الان در وضعیت{' '}
        <Ltr>SHIPPED</Ltr> است؛ نه اینکه سه بار <Ltr>PAID</Ltr> شده است. در{' '}
        <Ltr>Log Compaction</Ltr>، کافکا برای هر کلید فقط آخرین رکورد را نگه
        می‌دارد و رکوردهای قدیمی‌تر همان کلید را حذف می‌کند.
      </p>
      <p>
        این کار یک لاگ رویداد را به چیزی شبیه یک جدول کلید-مقدار تبدیل می‌کند.
        به همین دلیل <Ltr>Kafka Streams</Ltr> برای هر <Ltr>State Store</Ltr> یک{' '}
        <Ltr>changelog topic</Ltr> نگه می‌دارد که به‌طور پیش‌فرض compacted است؛{' '}
        <Ltr>KTable</Ltr> هم به‌صورت یک changelog stream مدل می‌شود و state
        store مادی‌سازی‌شده‌اش از همان changelog compacted استفاده می‌کند. برای
        window storeها ترکیب <Ltr>compact,delete</Ltr> استفاده می‌شود تا پنجره‌های
        منقضی هم پاک شوند.
      </p>
      <p>
        <Ltr>Compaction</Ltr> را با <Ltr>compression</Ltr> (config{' '}
        <Ltr>compression.type</Ltr>) اشتباه نگیرید: Compaction رکوردهای قدیمی را
        از لاگ حذف می‌کند، ولی compression فقط بایت‌های هر batch را فشرده می‌کند و
        رکوردی را حذف نمی‌کند.
      </p>

      <h3>چند قانون مهم Compaction</h3>
      <ul>
        <li>
          در تاپیک compact هر رکورد باید کلید داشته باشد. broker رکورد بدون کلید
          را با خطای <Ltr>INVALID_RECORD</Ltr> رد می‌کند؛ در سمت producer معمولاً{' '}
          <Ltr>InvalidRecordException</Ltr> با پیام «Compacted topic cannot
          accept message without key...» دیده می‌شود. پس چنین رکوردی اصلاً در لاگ
          نوشته نمی‌شود.
        </li>
        <li>
          فقط سگمنت‌های بسته Compaction می‌شوند؛ سگمنت فعال دست‌نخورده می‌ماند تا
          نوشتن جدید مختل نشود. سگمنت‌هایی که داخل <Ltr>min.compaction.lag.ms</Ltr>{' '}
          هستند هم فعلاً کنار گذاشته می‌شوند.
        </li>
        <li>
          آفست رکوردهای باقی‌مانده تغییر نمی‌کند. جای رکوردهای حذف‌شده خالی می‌ماند
          و شماره‌ها بازنویسی نمی‌شوند.
        </li>
        <li>
          برای حذف یک کلید از جدول، رکوردی با همان کلید و مقدار{' '}
          <Ltr>null</Ltr> می‌فرستید که به آن <Ltr>Tombstone</Ltr> می‌گویند.
        </li>
        <li>
          <Ltr>delete.retention.ms</Ltr> (پیش‌فرض ۲۴ ساعت) تعیین می‌کند Tombstone
          چه مدت بماند تا مصرف‌کننده‌های دیرتر هم متوجه حذف شوند.
        </li>
        <li>
          پاک‌سازی وقتی اجرا می‌شود که نسبت حجم بخش dirty به حجم کل لاگِ قابل
          پاک‌سازی (بخش clean + بخش dirty) از{' '}
          <Ltr>min.cleanable.dirty.ratio</Ltr> (پیش‌فرض ۰٫۵) بیشتر شود. سگمنت
          فعال و سگمنت‌های داخل <Ltr>min.compaction.lag.ms</Ltr> در این نسبت حساب
          نمی‌شوند.
        </li>
      </ul>
      <CodeBlock
        code={compactionConfig}
        language="bash"
        filename="configure-compaction.sh"
      />
      <CodeBlock
        code={createCompactedTopic}
        language="bash"
        filename="create-compacted-topic.sh"
      />

      <h2>۵. شبیه‌ساز Retention: چرا همه رکوردهای منقضی حذف نمی‌شوند؟</h2>
      <p>
        در شبیه‌ساز زیر با دکمه «گام بعد» جلو بروید. هر گام یک رویداد واقعی با تاریخ
        و ساعت است: یا رکوردی می‌رسد، یا سگمنتی بسته می‌شود، یا{' '}
        <Ltr>Log Cleaner</Ltr> سر می‌زند. هیچ‌کدام از این کارها به‌خاطر «قدیمی
        بودن یک رکورد» انجام نمی‌شود؛ همه‌چیز حول محور سگمنت می‌چرخد.
      </p>

      <RetentionSimulator />

      <p>
        مهم‌ترین نکته در گام هشتم دیده می‌شود: رکوردهای آفست ۰ و ۱ حدود ۱۲ روز قدمت
        دارند ولی هنوز روی دیسک هستند. دلیلش این است که کافکا برای هر رکورد جدا
        تصمیم نمی‌گیرد؛ کل سگمنت بسته را بر اساس <strong>جدیدترین</strong> رکوردش
        می‌سنجد. تا وقتی جدیدترین رکورد یک سگمنت از <Ltr>retention.ms</Ltr>{' '}
        قدیمی‌تر نشود، هیچ فایلی از آن سگمنت حذف نمی‌شود.
      </p>

      <p>
        ترتیب دقیق حذف این است: در همان لحظه‌ای که سگمنت واجد شرایط تشخیص داده
        می‌شود، از فهرست سگمنت‌های لاگ خارج می‌شود و{' '}
        <Ltr>log-start-offset</Ltr> به base offset سگمنت بعدی می‌رسد؛ از همان
        لحظه خواندن offsetهای قبلی <Ltr>OffsetOutOfRange</Ltr> می‌دهد. فایل‌های
        سگمنت به <Ltr>.deleted</Ltr> تغییر نام می‌دهند و فقط پس از{' '}
        <Ltr>file.delete.delay.ms</Ltr> (پیش‌فرض ۶۰ ثانیه) فیزیکی از دیسک پاک
        می‌شوند. <Ltr>.deleted</Ltr> مکانیزم undo نیست؛ این تأخیر فقط فرصت
        می‌دهد خواندن‌های در جریان بدون خطا تمام شوند.
      </p>

      <h2>۶. شبیه‌ساز Compaction: آخرین مقدار هر کلید</h2>
      <p>
        در شبیه‌ساز زیر با دکمه «گام بعد» جلو بروید. برخلاف شبیه‌ساز Retention که
        محورش زمان بود، اینجا محور کار <strong>کلید</strong> است: هر بار که{' '}
        <Ltr>Log Cleaner</Ltr> سر می‌زند، آخرین مقدار هر کلید را نگه می‌دارد و
        مقدارهای قدیمی‌تر را کنار می‌گذارد. رکوردها در طول مثال در سه سگمنت
        (base offsetهای ۰، ۵ و ۹) قرار می‌گیرند و سگمنت آخر فعال است. سه نکته را
        در گام‌ها دنبال کنید: آفست رکوردهای باقی‌مانده تغییر نمی‌کند، سگمنت فعال
        Compaction نمی‌شود (پس ممکن است چند نسخه از یک کلید در آن بماند)، و Tombstone
        تا پایان <Ltr>delete.retention.ms</Ltr> در لاگ می‌ماند تا مصرف‌کننده
        عقب‌مانده بفهمد آن کلید حذف شده است.
      </p>

      <CompactionSimulator />

      <h2>۷. Retention در برابر Compaction</h2>
      <table>
        <thead>
          <tr>
            <th>ویژگی</th>
            <th>Retention (delete)</th>
            <th>Compaction</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>هدف اصلی</td>
            <td>آزادکردن فضای داده‌های قدیمی</td>
            <td>نگه‌داشتن آخرین وضعیت هر کلید</td>
          </tr>
          <tr>
            <td>معیار حذف</td>
            <td>زمان یا حجم</td>
            <td>وجود رکورد جدیدتر برای همان کلید</td>
          </tr>
          <tr>
            <td>حذف تاریخچه</td>
            <td>بله، کل بازه زمانی حذف می‌شود</td>
            <td>نه، آخرین مقدار هر کلید می‌ماند</td>
          </tr>
          <tr>
            <td>نیاز به کلید</td>
            <td>خیر</td>
            <td>بله</td>
          </tr>
          <tr>
            <td>تغییر آفست‌ها</td>
            <td>آفست‌های باقی‌مانده ثابت‌اند</td>
            <td>آفست‌ها ثابت می‌مانند؛ جای خالی می‌ماند</td>
          </tr>
          <tr>
            <td>مثال مناسب</td>
            <td>لاگ رخدادها، متریک‌ها، رویدادهای تراکنشی</td>
            <td>وضعیت سفارش، پیکربندی، جدول تغییرات CDC</td>
          </tr>
        </tbody>
      </table>

      <h3>ترکیب هر دو سیاست</h3>
      <p>
        کافکا اجازه می‌دهد هر دو سیاست را همزمان فعال کنید (مقدار{' '}
        <Ltr>compact,delete</Ltr> برای <Ltr>cleanup.policy</Ltr>). در این حالت
        سگمنت‌های قدیمی بر اساس <Ltr>retention.ms</Ltr> و{' '}
        <Ltr>retention.bytes</Ltr> حذف می‌شوند و سگمنت‌های باقی‌مانده compact
        می‌شوند. نکته مهم: حتی آخرین مقدار یک کلید هم اگر در سگمنتی باشد که از
        retention قدیمی‌تر شده، حذف می‌شود؛ پس این ترکیب برای کلیدهایی که باید
        همیشه بمانند مناسب نیست.
      </p>
      <CodeBlock
        code={compactDeleteConfig}
        language="bash"
        filename="configure-compact-delete.sh"
      />
      <p>
        در <Ltr>kafka-configs.sh</Ltr> مقدار list را داخل براکت بگذارید: کاما
        جداکننده دو config است، ولی براکت مشخص می‌کند که <Ltr>compact</Ltr> و{' '}
        <Ltr>delete</Ltr> اعضای یک مقدار list هستند.
      </p>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="انتظار حذف لحظه‌ای">
        Retention یک فرایند دوره‌ای است و حذف در سطح سگمنت انجام می‌شود. اگر
        رکوردی را برای تست گذاشتید و بعد از چند ثانیه هنوز آن را می‌بینید،
        احتمالاً هنوز زمان بررسی بعدی نرسیده یا آن رکورد در سگمنتی است که رکورد
        زنده دیگری دارد.
      </Callout>
      <Callout variant="warning" title="retention.bytes با سگمنت‌های بزرگ">
        <Ltr>retention.bytes</Ltr> سقف هر پارتیشن است، ولی حذف فقط سگمنت کامل
        انجام می‌شود. اگر <Ltr>retention.bytes</Ltr> کمتر از{' '}
        <Ltr>segment.bytes</Ltr> باشد، معمولاً هیچ سگمنتی حذف نمی‌شود تا حجم لاگ
        از سقف به اندازه یک سگمنت رد شود. <Ltr>segment.bytes</Ltr> را کوچک‌تر از{' '}
        <Ltr>retention.bytes</Ltr> انتخاب کنید.
      </Callout>
      <Callout variant="danger" title="Compaction روی تاپیک بدون کلید">
        در تاپیک compact، رکورد بدون کلید اصلاً پذیرفته نمی‌شود. broker آن را با
        خطای <Ltr>INVALID_RECORD</Ltr> (در سمت producer معمولاً{' '}
        <Ltr>InvalidRecordException</Ltr>) و پیام «Compacted topic cannot accept
        message without key...» رد می‌کند. پس اگر producer کلید نفرستد، produce
        fail می‌شود؛ نه اینکه رکوردها بدون Compaction انباشته شوند.
      </Callout>
      <Callout variant="warning" title="Compaction جایگزین تاریخچه نیست">
        Compaction فقط آخرین مقدار هر کلید را نگه می‌دارد و تاریخچه رویدادها را
        از بین می‌برد. اگر برای حسابرسی، بازپخش رویدادها یا تحلیل روند به همه
        نسخه‌ها نیاز دارید، هرگز آن را روی تاپیک اصلی فعال نکنید.
      </Callout>
      <Callout variant="danger" title="حذف کلید بدون Tombstone">
        برای حذف یک کلید از تاپیک compact باید رکوردی با همان کلید و{' '}
        <Ltr>value=null</Ltr> بفرستید (Tombstone). صرفاً نفرستادن مقدار جدید یا
        پاک‌نکردن کلید، آن کلید را از جدول حذف نمی‌کند.
      </Callout>
      <Callout variant="warning" title="Timestamp و Retention">
        Retention بر اساس بزرگ‌ترین timestamp رکوردهای هر سگمنت سنجیده می‌شود.
        اگر producer با <Ltr>CreateTime</Ltr> timestamp قدیمی (مثلاً هنگام replay)
        بفرستد، سگمنت ممکن است فوراً واجد حذف شود؛ timestamp آینده هم می‌تواند باعث شود
        سگمنت طولانی‌تر بماند. با{' '}
        <Ltr>message.timestamp.type=LogAppendTime</Ltr>، broker زمان append را
        جای timestamp producer می‌گذارد و این ریسک کمتر می‌شود. مقدار پیش‌فرض{' '}
        <Ltr>CreateTime</Ltr> است.
      </Callout>
      <Callout variant="warning" title="تکراری‌های موقت در Compaction">
        Compaction فوری نیست و سگمنت فعال را هم Compaction نمی‌کند. پس ممکن است در هر
        لحظه برای یک کلید چند رکورد ببینید (در بخش dirty یا سگمنت فعال).
        مصرف‌کننده باید تکراری‌های موقت را تحمل کند و آخرین مقدار را نگه دارد.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>Retention بر اساس زمان یا حجم، قدیمی‌ترین سگمنت‌ها را حذف می‌کند.</li>
        <li>
          حذف در سطح سگمنت است؛ سگمنت فعال معمولاً حذف نمی‌شود، مگر همه
          رکوردهایش از retention قدیمی‌تر باشند.
        </li>
        <li>
          Compaction برای هر کلید فقط آخرین مقدار را نگه می‌دارد، ولی تکراری‌های
          موقت در سگمنت فعال ممکن است بمانند.
        </li>
        <li>Tombstone و delete.retention.ms برای حذف کامل کلید ضروری‌اند.</li>
        <li>انتخاب سیاست به ماهیت داده بستگی دارد: تاریخچه یا وضعیت جاری.</li>
      </ul>
      <p>
        در درس بعدی از داده‌ها به سراغ «مغز خوشه» می‌رویم: بروکرها، کنترلر و
        معماری <Ltr>KRaft</Ltr>. می‌بینیم چه کسی تصمیم می‌گیرد هر پارتیشن کجا
        زندگی کند و چرا حذف <Ltr>ZooKeeper</Ltr> یکی از بزرگ‌ترین تغییرات تاریخ
        کافکا بود.
      </p>
    </>
  )
}
