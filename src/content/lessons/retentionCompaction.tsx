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

const createCompactedTopic = `# ساخت تاپیک فشرده‌شونده با سگمنت‌های کوچک‌تر
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic order-state \\
  --partitions 6 --replication-factor 3 \\
  --config cleanup.policy=compact \\
  --config segment.bytes=104857600`

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
        مناسب‌اند و چه دام‌هایی دارند.
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
        وجود دارد و هر کدام زودتر برقرار شود، حذف انجام می‌شود:
      </p>
      <ul>
        <li>
          <strong>زمان:</strong> <Ltr>retention.ms</Ltr> (پیش‌فرض ۶۰۴۸۰۰۰۰۰
          میلی‌ثانیه، یعنی ۷ روز). نسخه‌های قدیمی‌تر از این مدت حذف می‌شوند.
        </li>
        <li>
          <strong>حجم:</strong> <Ltr>retention.bytes</Ltr> (پیش‌فرض ‎-۱ یعنی
          بی‌نهایت). اگر حجم پارتیشن از این مقدار بیشتر شود، قدیمی‌ترین سگمنت‌ها
          حذف می‌شوند تا به سقف برگردیم.
        </li>
      </ul>
      <p>
        کافکا هر چند وقت یک‌بار (به‌طور پیش‌فرض هر ۵ دقیقه با{' '}
        <Ltr>log.retention.check.interval.ms</Ltr>) وضعیت را بررسی می‌کند؛ پس حذف
        فوری و لحظه‌ای نیست.
      </p>

      <h3>حذف در سطح سگمنت، نه رکورد</h3>
      <p>
        مهم‌ترین نکته Retention این است که کافکا رکوردها را تک‌تک حذف نمی‌کند؛ فقط
        سگمنت‌هایی را حذف می‌کند که <strong>همه رکوردهایشان</strong> واجد شرط حذف
        باشند. حتی اگر بعضی رکوردهای یک سگمنت منقضی شده باشند، تا وقتی یک رکورد
        زنده در آن سگمنت باشد، کل سگمنت می‌ماند. همچنین{' '}
        <strong>سگمنت فعال هیچ‌وقت حذف نمی‌شود</strong>؛ چون ممکن است در حال
        نوشتن باشد.
      </p>
      <p>
        نتیجه این است که حجم واقعی داده همیشه کمی بیشتر از حد انتظار است و نقطه
        شروع لاگ (<Ltr>log start offset</Ltr>) پله‌پله جلو می‌رود، نه پیوسته. برای
        همین است که تنظیم <Ltr>log.segment.bytes</Ltr> روی چند گیگابایت، حذف را
        درشت‌تر و دیرتر می‌کند.
      </p>

      <h3>یک مثال عددی</h3>
      <p>
        فرض کنید تاپیک <Ltr className="font-mono">orders</Ltr> روزی ۱۰۰ مگابایت
        داده تولید می‌کند، <Ltr>retention.ms</Ltr> روی ۷ روز است و ضریب تکرار ۳.
        حجم نگهداری‌شده برای هر پارتیشن حدود ۷۰۰ مگابایت (۱۰۰ × ۷) و برای هر سه
        نسخه حدود ۲٫۱ گیگابایت است. اگر ۶ پارتیشن داشته باشیم، در مجموع حدود ۱۲٫۶
        گیگابایت دیسک برای این تاپیک لازم است. اگر <Ltr>retention.bytes</Ltr> را
        روی ۵۰۰ مگابایت بگذارید، حذف بر اساس حجم زودتر از زمان فعال می‌شود.
      </p>

      <h2>۳. تنظیم Retention در عمل</h2>
      <CodeBlock
        code={retentionConfig}
        language="bash"
        filename="configure-retention.sh"
      />
      <p>
        تنظیمات در سطح تاپیک، تنظیمات پیش‌فرض بروکر را بازنویسی می‌کنند. برای
        دیدن مقدار فعلی می‌توانید از <Ltr>--describe</Ltr> استفاده کنید؛ اگر
        مقداری نمایش داده شود یعنی override شده و اگر خالی باشد، مقدار پیش‌فرض
        بروکر اعمال می‌شود.
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
        به همین دلیل <Ltr>Kafka Streams</Ltr> از تاپیک‌های compacted برای{' '}
        <Ltr>State Store</Ltr> و <Ltr>KTable</Ltr> استفاده می‌کند.
      </p>

      <h3>چند قانون مهم Compaction</h3>
      <ul>
        <li>
          فقط تاپیک‌هایی که کلید دارند فشرده می‌شوند. رکورد بدون کلید{' '}
          (<Ltr>null</Ltr>) قابل فشرده‌سازی نیست.
        </li>
        <li>
          فقط سگمنت‌های بسته فشرده می‌شوند؛ سگمنت فعال دست‌نخورده می‌ماند تا
          نوشتن جدید مختل نشود.
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
          پاک‌سازی وقتی اجرا می‌شود که نسبت داده‌های کثیف به کل سگمنت از{' '}
          <Ltr>min.cleanable.dirty.ratio</Ltr> (پیش‌فرض ۰٫۵) بیشتر شود.
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
        مهم‌ترین نکته در گام هشتم دیده می‌شود: رکوردهای آفست ۰ و ۱ حدود ۱۱ روز قدمت
        دارند ولی هنوز روی دیسک هستند. دلیلش این است که کافکا برای هر رکورد جدا
        تصمیم نمی‌گیرد؛ کل سگمنت بسته را بر اساس <strong>جدیدترین</strong> رکوردش
        می‌سنجد. تا وقتی جدیدترین رکورد یک سگمنت از <Ltr>retention.ms</Ltr>{' '}
        قدیمی‌تر نشود، هیچ فایلی از آن سگمنت حذف نمی‌شود.
      </p>

      <p>
        حذف هم دو مرحله دارد: اول فایل‌ها با پسوند <Ltr>.deleted</Ltr> علامت
        می‌خورند، و بعد از <Ltr>file.delete.delay.ms</Ltr> واقعاً از دیسک پاک
        می‌شوند. در این فاصله هنوز می‌شود آن‌ها را برگرداند.
      </p>

      <h2>۶. شبیه‌ساز Compaction: آخرین مقدار هر کلید</h2>
      <p>
        در شبیه‌ساز زیر Compaction را روشن کنید و ببینید کدام رکوردها حذف می‌شوند.
        سپس <Ltr>delete.retention.ms</Ltr> را رد کنید تا ببینید Tombstoneها هم
        پاک می‌شوند و آن کلید کاملاً از جدول حذف می‌شود.
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
            <td>قدیمی بودن مقدار برای یک کلید</td>
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
        آخرین مقدار هر کلید نگه داشته می‌شود، ولی داده‌هایی که از پنجره زمانی
        گذشته باشند هم حذف می‌شوند. این ترکیب برای جدول‌های وضعیتی که نباید برای
        همیشه زنده بمانند مفید است. مقداردهی این ترکیب در{' '}
        <Ltr>kafka-configs.sh</Ltr> به دلیل جداکننده کاما کمی دقت می‌خواهد؛ اگر
        با ابزار خط فرمان به مشکل خوردید، از فایل تنظیمات تاپیک یا ابزار مدیریت
        خوشه استفاده کنید.
      </p>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="انتظار حذف لحظه‌ای">
        Retention یک فرایند دوره‌ای است و حذف در سطح سگمنت انجام می‌شود. اگر
        رکوردی را برای تست گذاشتید و بعد از چند ثانیه هنوز آن را می‌بینید،
        احتمالاً هنوز زمان بررسی بعدی نرسیده یا آن رکورد در سگمنتی است که رکورد
        زنده دیگری دارد.
      </Callout>
      <Callout variant="warning" title="retention.bytes با سگمنت‌های بزرگ">
        اگر <Ltr>retention.bytes</Ltr> را کمتر از حجم یک سگمنت بگذارید، کافکا
        عملاً یک سگمنت کامل را نگه می‌دارد و امکان حذف ریزتر ندارد. اندازه سگمنت
        را با سیاست حجم هماهنگ کنید.
      </Callout>
      <Callout variant="danger" title="Compaction روی تاپیک بدون کلید">
        رکوردهای بدون کلید هرگز فشرده نمی‌شوند و در لاگ انباشته می‌شوند. اگر
        تاپیکی را compact کردید اما کلید نمی‌گذارید، نه حافظه آزاد می‌شود و نه
        وضعیت نهایی به‌روز می‌ماند.
      </Callout>
      <Callout variant="warning" title="Compaction جایگزین تاریخچه نیست">
        Compaction فقط آخرین مقدار هر کلید را نگه می‌دارد و تاریخچه رویدادها را
        از بین می‌برد. اگر برای حسابرسی، بازپخش رویدادها یا تحلیل روند به همه
        نسخه‌ها نیاز دارید، هرگز آن را روی تاپیک اصلی فعال نکنید.
      </Callout>
      <Callout variant="danger" title="حذف کلید بدون Tombstone">
        اگر فقط آخرین مقدار یک کلید را در تاپیک compacted بگذارید و کلید را
        «فراموش» کنید، آن کلید برای همیشه در جدول می‌ماند. برای حذف واقعی باید
        رکوردی با مقدار <Ltr>null</Ltr> بفرستید و منتظر انقضای{' '}
        <Ltr>delete.retention.ms</Ltr> بمانید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>Retention بر اساس زمان یا حجم، قدیمی‌ترین سگمنت‌ها را حذف می‌کند.</li>
        <li>حذف در سطح سگمنت است؛ سگمنت فعال هرگز حذف نمی‌شود.</li>
        <li>Compaction برای هر کلید فقط آخرین مقدار را نگه می‌دارد.</li>
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
