import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { ProducerSendExplainer } from '../../components/simulators/ProducerSendExplainer'

const producerConfig = `# producer.properties — حداقل تنظیمات لازم
bootstrap.servers=localhost:9092
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=org.apache.kafka.common.serialization.StringSerializer

# در درس acks معنی دقیق این خط را می‌بینیم
acks=all
linger.ms=5`

const perfTest = `# ارسال ۱۰۰٬۰۰۰ رکورد ۱ کیلوبایتی برای سنجش توان و تأخیر
kafka-producer-perf-test.sh \\
  --topic orders \\
  --num-records 100000 \\
  --record-size 1024 \\
  --throughput -1 \\
  --producer-props bootstrap.servers=localhost:9092 acks=all linger.ms=5 batch.size=65536`

const asyncSend = `Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
    ProducerRecord<String, String> record =
        new ProducerRecord<>("orders", "order-1042", "{\\"status\\":\\"paid\\"}");

    // send فقط رکورد را تحویل بافر می‌دهد و یک Future برمی‌گرداند
    Future<RecordMetadata> future = producer.send(record);

    // برنامه بدون منتظر ماندن به کار خودش ادامه می‌دهد
    System.out.println("record buffered; continuing...");
}`

const asyncCallback = `producer.send(record, (metadata, exception) -> {
    if (exception != null) {
        log.error("ارسال رکورد شکست خورد", exception);
        return;
    }

    log.info("نوشته شد: partition={} offset={}",
        metadata.partition(), metadata.offset());
});

// این خط تقریباً بلافاصله اجرا می‌شود؛ callback بعداً صدا زده می‌شود
System.out.println("درخواست ثبت شد");`

const syncSend = `try {
    RecordMetadata metadata =
        producer.send(record).get(2, TimeUnit.SECONDS);

    log.info("نوشته شد: partition={} offset={}",
        metadata.partition(), metadata.offset());
} catch (TimeoutException e) {
    // وضعیت نامشخص است: ممکن است رکورد بعداً نوشته شود
    log.warn("مهلت انتظار برای تأیید تمام شد", e);
} catch (ExecutionException e) {
    log.error("ارسال شکست خورد", e.getCause());
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();
}`

const flushAndClose = `producer.send(record);

// تا کامل شدن همه رکوردهای بافر (و رسیدن تأییدشان) صبر می‌کند
producer.flush();

// close هم به‌طور پیش‌فرض بافر را خالی می‌کند
producer.close();`

export function ProducerBasicsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا دیدیم داده کجا ذخیره می‌شود. اما در تولید، بیشتر شکایت‌های
        «کافکا کند است» یا «پیام گم شد» از سمت <Ltr>Producer</Ltr> شروع می‌شود:
        بافر پر شده، تأخیر بالا رفته، یا یک <Ltr>retry</Ltr> بی‌صدا پیام تکراری
        ساخته است. در این درس مسیر یک رکورد را از <Ltr>send</Ltr> تا لیدر
        پارتیشن دنبال می‌کنیم، تفاوت رفتار همگام و ناهمگام را از دید اپراتور
        روشن می‌کنیم، و یاد می‌گیریم با کدام متریک و کدام ابزار خط فرمان این
        رفتار را ببینیم.
      </p>

      <Callout variant="tip" title="چرا اپراتور باید رفتار Producer را بشناسد">
        <p>
          <Ltr>Producer</Ltr> یک کتابخانهٔ سمت کلاینت است؛ خیلی از متریک‌های
          مهمش روی خود اپلیکیشن است، نه روی بروکر. اگر تیم اپ فقط بگوید «کافکا
          کند است»، بدون دانستن <Ltr>buffer.memory</Ltr>، <Ltr>linger.ms</Ltr>،{' '}
          <Ltr>acks</Ltr> و <Ltr>delivery.timeout.ms</Ltr> نمی‌توانید تشخیص
          بدهید مشکل از خوشه است یا از کلاینت.
        </p>
      </Callout>

      <h2>۱. مسیر یک رکورد از send تا Broker</h2>
      <p>
        پرودیوسر با یک شیء <Ltr>ProducerRecord</Ltr> کار می‌کند: نام تاپیک،
        کلید، مقدار، هدرها و زمان رکورد. وقتی <Ltr>send(record)</Ltr> را صدا
        می‌زنید، کافکا این مراحل را پشت سر می‌گذارد:
      </p>
      <ol>
        <li>
          <strong>سریالایز:</strong> کلید و مقدار با{' '}
          <Ltr>key.serializer</Ltr> و <Ltr>value.serializer</Ltr> به بایت تبدیل
          می‌شوند.
        </li>
        <li>
          <strong>انتخاب پارتیشن:</strong> اگر پارتیشن را صریح نداده باشید،{' '}
          <Ltr>Partitioner</Ltr> با کلید تصمیم می‌گیرد؛ کلید{' '}
          <Ltr>order-1042</Ltr> همیشه به یک پارتیشن ثابت می‌رود. جزئیاتش در درس
          بعدی است.
        </li>
        <li>
          <strong>بافر:</strong> رکورد به صف پارتیشن در{' '}
          <Ltr>RecordAccumulator</Ltr> اضافه می‌شود. این صف در حافظهٔ خود
          پرودیوسر است، نه روی بروکر.
        </li>
        <li>
          <strong>بچ و ارسال:</strong> یک thread داخلی به نام <Ltr>Sender</Ltr>{' '}
          بچ‌های آماده را برمی‌دارد و با <Ltr>ProduceRequest</Ltr> به لیدر
          پارتیشن می‌فرستد.
        </li>
        <li>
          <strong>نوشتن و تأیید:</strong> لیدر رکورد را در انتهای لاگ می‌نویسد،
          یک <Ltr>offset</Ltr> می‌گیرد و بر اساس <Ltr>acks</Ltr> تأیید
          برمی‌گرداند.
        </li>
        <li>
          <strong>تکمیل:</strong> <Ltr>Future</Ltr> با یک{' '}
          <Ltr>RecordMetadata</Ltr> کامل می‌شود یا با خطا شکست می‌خورد.
        </li>
      </ol>
      <p>
        نکتهٔ کلیدی این است که <Ltr>send()</Ltr> این مسیر را تا انتها طی نمی‌کند.
        خروجی آن یک <Ltr>Future&lt;RecordMetadata&gt;</Ltr> است که همان لحظه
        برمی‌گردد؛ بقیهٔ مسیر روی thread دیگری ادامه پیدا می‌کند. پس{' '}
        <strong>همهٔ ارسال‌ها در کافکا ناهمگام‌اند</strong> و «ارسال همگام» یعنی
        همان thread برنامه روی <Ltr>Future</Ltr> منتظر بماند.
      </p>

      <CodeBlock
        code={producerConfig}
        language="properties"
        filename="producer.properties"
      />
      <p>
        این فایل نقطهٔ شروع گفت‌وگو با تیم اپ است. خطوط <Ltr>acks</Ltr> و{' '}
        <Ltr>linger.ms</Ltr> بیشترین اثر را روی دوام و تأخیر دارند؛ بقیهٔ
        تنظیم‌های مؤثر را در درس‌های <Ltr>acks</Ltr>، <Ltr>Batching</Ltr> و{' '}
        <Ltr>Idempotence</Ltr> باز می‌کنیم.
      </p>

      <h2>۲. «همگام» و «ناهمگام» دو تنظیم نیستند، دو رفتارند</h2>
      <p>
        در حالت ناهمگام، برنامه بعد از <Ltr>send()</Ltr> به کارش ادامه می‌دهد و
        نتیجه را با یک <Ltr>Callback</Ltr> می‌گیرد. در حالت همگام، برنامه
        بلافاصله روی <Ltr>Future</Ltr>، <Ltr>get()</Ltr> را صدا می‌زند و تا
        رسیدن تأیید یا خطا منتظر می‌ماند. هیچ API جداگانه‌ای برای ارسال همگام
        وجود ندارد؛ همین انتظار، همان ارسال ناهمگام را برای thread فعلی همگام
        نشان می‌دهد.
      </p>
      <p>
        مزیت اصلی ناهمگام فقط سرعت نیست؛ امکان <strong>بچ‌شدن</strong> است.
        وقتی چند رکورد پشت سر هم در بافر می‌نشینند، <Ltr>Sender</Ltr> آن‌ها را
        در یک درخواست جمع می‌کند و هزینهٔ شبکه و تأیید بین چند رکورد تقسیم
        می‌شود. به همین دلیل مسیر پرترافیک تقریباً همیشه ناهمگام است.
      </p>
      <table>
        <thead>
          <tr>
            <th>ویژگی</th>
            <th>ناهمگام (Async)</th>
            <th>همگام (Sync)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>برگشت کنترل</td>
            <td>بلافاصله بعد از قرار گرفتن در بافر</td>
            <td>بعد از رسیدن تأیید یا خطا</td>
          </tr>
          <tr>
            <td>گرفتن خطا</td>
            <td>در callback</td>
            <td>با استثنای <Ltr>get()</Ltr></td>
          </tr>
          <tr>
            <td>توان عملیاتی</td>
            <td>بالا، به لطف بچ و چند درخواست در پرواز</td>
            <td>حدود یک رکورد در هر رفت‌وبرگشت برای هر thread</td>
          </tr>
          <tr>
            <td>ترتیب</td>
            <td>با <Ltr>idempotence</Ltr> حفظ می‌شود</td>
            <td>ساده و قابل پیش‌بینی</td>
          </tr>
          <tr>
            <td>مناسب برای</td>
            <td>مسیر پرترافیک، pipeline، سرویس‌های تولیدی</td>
            <td>حجم کم، ابزارها، گام‌های کنترلی</td>
          </tr>
          <tr>
            <td>ریسک اصلی</td>
            <td>نادیده گرفتن callback و گم شدن خطا</td>
            <td>کندی و مهلت‌های نامشخص</td>
          </tr>
        </tbody>
      </table>

      <h2>۳. عدسی SRE: از کجا بفهمیم Producer مشکل دارد</h2>
      <p>
        متریک‌های پرودیوسر روی خود کلاینت منتشر می‌شوند. این‌ها را در داشبورد
        داشته باشید تا بتوانید «کندی کافکا» را به یک جزء مشخص نسبت بدهید:
      </p>
      <ul>
        <li>
          <Ltr>record-send-rate</Ltr> و <Ltr>record-error-rate</Ltr>: نرخ
          واقعی ارسال و نرخ خطا.
        </li>
        <li>
          <Ltr>record-retry-rate</Ltr>: اگر بالا رفت، شبکه یا بروکر ناپایدار است
          و خطر تکرار پیام جدی می‌شود.
        </li>
        <li>
          <Ltr>request-latency-avg</Ltr> و <Ltr>request-latency-max</Ltr>:
          تأخیر رفت‌وبرگشت به بروکر؛ نه تأخیر کل مسیر برنامه.
        </li>
        <li>
          <Ltr>buffer-available-bytes</Ltr> و{' '}
          <Ltr>buffer-exhausted-rate</Ltr>: فضای آزاد بافر و تعداد دفعاتی که
          بافر پر شده است.
        </li>
        <li>
          <Ltr>record-queue-time-avg</Ltr>: مدت ماندن رکورد در بافر پیش از
          ارسال؛ اگر بالا رفت، <Ltr>linger.ms</Ltr> یا کندی بروکر را ببینید.
        </li>
        <li>
          <Ltr>waiting-threads</Ltr>: تعداد threadهایی که روی{' '}
          <Ltr>send()</Ltr> بلوکه شده‌اند؛ نشانهٔ فشار برگشتی به اپلیکیشن.
        </li>
      </ul>
      <p>
        سه حالت خرابی را از هم جدا کنید. اول، <strong>پر شدن بافر</strong>: وقتی
        مصرف‌کنندهٔ پایین‌دستی یا بروکر کند است، بافر پر می‌شود و{' '}
        <Ltr>send()</Ltr> تا <Ltr>max.block.ms</Ltr> بلوکه می‌شود؛ نتیجه،
        کندی خود اپلیکیشن است نه خوشه. دوم، <strong>تأخیر بالا با بافر خالی</strong>:
        مشکل از شبکه یا بروکر است. سوم، <strong>نرخ retry بالا</strong>: حتی اگر
        ارسال در نهایت موفق شود، احتمال رکورد تکراری و ترتیب به‌هم‌ریخته وجود
        دارد.
      </p>
      <Callout variant="warning" title="Timeout یعنی «نامشخص»، نه «نوشته نشد»">
        <p>
          وقتی مهلت انتظار تمام می‌شود، درخواست ممکن است هنوز در شبکه باشد یا
          بروکر آن را نوشته باشد. فرض «نوشته نشد» و ارسال دوبارهٔ کورکورانه،
          منبع رکورد تکراری است. این وضعیت را نامشخص بدانید و با{' '}
          <Ltr>idempotence</Ltr> یا یک کلید یکتا مدیریت کنید.
        </p>
      </Callout>
      <Callout variant="info" title="send همیشه فوری برنمی‌گردد">
        <p>
          <Ltr>send()</Ltr> در دو حالت می‌تواند قبل از برگشت بلوکه شود: وقتی
          متادیتای تاپیک هنوز دریافت نشده است، و وقتی حافظهٔ بافر (
          <Ltr>buffer.memory</Ltr>) پر شده است. هر دو انتظار حداکثر تا{' '}
          <Ltr>max.block.ms</Ltr> (پیش‌فرض ۶۰ ثانیه) طول می‌کشد و بعد با{' '}
          <Ltr>TimeoutException</Ltr> شکست می‌خورد. پس «ناهمگام» به معنی «بدون
          هیچ انتظاری» نیست؛ فقط انتظار برای تأیید بروکر نیست.
        </p>
      </Callout>

      <h2>۴. دیدن رفتار Producer با ابزارهای خط فرمان</h2>
      <p>
        برای یک بررسی سریع، به‌جای نوشتن کد از ابزارهای خود کافکا استفاده کنید.
        <Ltr>kafka-console-producer.sh</Ltr> برای تست دستی یک تاپیک کافی است، و
        <Ltr>kafka-producer-perf-test.sh</Ltr> توان و تأخیر را با تنظیمات دلخواه
        می‌سنجد:
      </p>
      <CodeBlock
        code={perfTest}
        language="bash"
        filename="producer-perf-test.sh"
      />
      <p>
        خروجی این ابزار چند عدد کلیدی می‌دهد: رکورد در ثانیه، مگابایت در ثانیه،
        میانگین و بیشینهٔ تأخیر، و صدک‌های ۹۵ و ۹۹. همین اعداد را با تنظیمات
        پیش‌فرض و تنظیمات پیشنهادی مقایسه کنید تا اثر <Ltr>linger.ms</Ltr> و{' '}
        <Ltr>batch.size</Ltr> را روی <Ltr>p99</Ltr> ببینید. این ابزار به بروکر
        دست نمی‌زند و فقط یک کلاینت معمولی است؛ بنابراین برای تست ظرفیت هم
        مناسب است.
      </p>

      <h2>۵. یک رکورد، دو رفتار</h2>
      <p>
        در توضیح تعاملی زیر همان رکورد را یک بار ناهمگام و یک بار همگام
        می‌فرستیم. چهار بازیگر را می‌بینید: thread برنامه، بافر، I/O thread و
        بروکر. در نیمهٔ اول، نوار thread برنامه کوتاه است و بعد از تحویل رکورد
        به بافر آزاد می‌شود؛ در نیمهٔ دوم همان نوار تا رسیدن تأیید کشیده می‌شود.
        به گام ۶ و گام ۱۱ دقت کنید: در هر دو، متادیتا یکی است، اما زمان آزاد
        بودن برنامه کاملاً متفاوت است.
      </p>

      <ProducerSendExplainer />

      <h2>۶. اشتباه‌های رایج عملیاتی</h2>
      <Callout variant="danger" title="acks پایین بدون درک دوام">
        <p>
          <Ltr>acks=0</Ltr> هیچ تأییدی نمی‌گیرد و <Ltr>acks=1</Ltr> فقط تأیید
          لیدر را می‌گیرد. اگر این‌ها را بدون توجه به{' '}
          <Ltr>min.insync.replicas</Ltr> انتخاب کنید، ممکن است در از کار افتادن
          لیدر داده از دست برود. انتخاب درست را در درس <Ltr>acks</Ltr> ببینید.
        </p>
      </Callout>
      <Callout variant="warning" title="افزایش linger.ms بدون سنجش p99">
        <p>
          <Ltr>linger.ms</Ltr> بالا بچ را بزرگ‌تر و توان را بیشتر می‌کند، اما
          تأخیر انتها‌به‌انتها را هم بالا می‌برد. قبل و بعد از تغییر،{' '}
          <Ltr>p99</Ltr> را با <Ltr>kafka-producer-perf-test.sh</Ltr> بسنجید.
        </p>
      </Callout>
      <Callout variant="danger" title="buffer.memory کوچک برای بار بالا">
        <p>
          بافر پیش‌فرض ۳۲ مگابایت است. در بار بالا و با کندی موقت بروکر، بافر پر
          می‌شود و threadهای اپلیکیشن روی <Ltr>send()</Ltr> بلوکه می‌شوند.
          <Ltr>waiting-threads</Ltr> و <Ltr>buffer-exhausted-rate</Ltr> را
          ببینید.
        </p>
      </Callout>
      <Callout variant="danger" title="retry بدون idempotence">
        <p>
          اگر تأیید یک بچ گم شود، پرودیوسر دوباره می‌فرستد و بدون{' '}
          <Ltr>idempotence</Ltr> ممکن است رکورد تکراری بسازد. از{' '}
          <Ltr>Kafka 3.0</Ltr> به بعد این تنظیم پیش‌فرض فعال است؛ اگر آگاهانه
          خاموشش کرده‌اید، باید خودتان برای تکرار فکر کنید.
        </p>
      </Callout>
      <Callout variant="warning" title="پایش فقط بروکر و نه کلاینت">
        <p>
          متریک‌های <Ltr>buffer-available-bytes</Ltr>،{' '}
          <Ltr>record-queue-time-avg</Ltr> و <Ltr>record-retry-rate</Ltr> روی
          کلاینت هستند. بدون این‌ها، «کندی کافکا» همیشه به گردن خوشه می‌افتد.
        </p>
      </Callout>

      <DeepDive title="برای توسعه‌دهندهٔ اپلیکیشن: کد ارسال، Callback و Flush">
        <p>
          این بخش برای کسی است که خود کد <Ltr>Producer</Ltr> را می‌نویسد. برای
          مسیر عملیاتی دوره لازم نیست و می‌توانید از آن رد شوید.
        </p>
        <DeepDiveSection title="ارسال ناهمگام و Callback">
          <p>
            در حالت ناهمگام، برنامه بعد از <Ltr>send()</Ltr> به کارش ادامه
            می‌دهد و نتیجه را با یک <Ltr>Callback</Ltr> می‌گیرد. اگر callback
            را ندهید و <Ltr>Future</Ltr> را هم بررسی نکنید، خطای ارسال هیچ‌جا
            دیده نمی‌شود.
          </p>
          <CodeBlock code={asyncSend} language="java" filename="AsyncSend.java" />
          <CodeBlock
            code={asyncCallback}
            language="java"
            filename="AsyncWithCallback.java"
          />
          <p>
            callback به‌طور معمول روی همان I/O thread پرودیوسر اجرا می‌شود، نه
            روی thread شما. هر کار سنگین یا مسدودکننده داخل callback، ارسال
            رکوردهای دیگر را متوقف می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="ارسال همگام با get">
          <p>
            برای همگام‌سازی، بلافاصله روی <Ltr>Future</Ltr>، <Ltr>get()</Ltr> را
            صدا بزنید. همیشه مهلت بگذارید؛ انتظار بی‌نهایت یعنی اگر بروکر یا
            شبکه مشکل داشته باشد، thread برنامه برای همیشه قفل می‌شود.
          </p>
          <CodeBlock code={syncSend} language="java" filename="SyncSend.java" />
        </DeepDiveSection>
        <DeepDiveSection title="Flush و Close">
          <p>
            اگر چند رکورد را ناهمگام فرستادید و فقط در پایان کار به تأیید همه
            نیاز دارید، یک بار <Ltr>flush()</Ltr> صدا بزنید. <Ltr>close()</Ltr>{' '}
            هم به‌طور پیش‌فرض بافر را خالی می‌کند؛ اما اگر process را با{' '}
            <Ltr>System.exit</Ltr> یا کشتن ناگهانی تمام کنید، این فرصت از دست
            می‌رود.
          </p>
          <CodeBlock
            code={flushAndClose}
            language="java"
            filename="FlushAndClose.java"
          />
        </DeepDiveSection>
        <DeepDiveSection title="درون Producer: بافر، Batch و Sender">
          <p>
            بافر پرودیوسر به‌طور پیش‌فرض ۳۲ مگابایت است. وقتی این فضا پر شود،{' '}
            <Ltr>send()</Ltr> تا آزاد شدن جا یا پایان{' '}
            <Ltr>max.block.ms</Ltr> منتظر می‌ماند. <Ltr>batch.size</Ltr>{' '}
            (پیش‌فرض ۱۶ کیلوبایت) سقف اندازهٔ هر بچ است و <Ltr>linger.ms</Ltr>{' '}
            تعیین می‌کند <Ltr>Sender</Ltr> چقدر صبر کند تا بچ پر شود.
          </p>
          <p>
            <Ltr>max.in.flight.requests.per.connection</Ltr> (پیش‌فرض ۵) تعداد
            درخواست‌های تأییدنشده‌ای است که همزمان در شبکه هستند. مقدار بیشتر
            یعنی توان بیشتر، اما بدون <Ltr>idempotence</Ltr> می‌تواند ترتیب را
            در صورت retry به هم بزند. <Ltr>delivery.timeout.ms</Ltr> (پیش‌فرض
            ۱۲۰ ثانیه) سقف کل زمان از <Ltr>send</Ltr> تا موفقیت یا شکست نهایی
            است.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          <Ltr>send()</Ltr> رکورد را سریالایز و پارتیشن‌بندی می‌کند، در بافر
          می‌گذارد و یک <Ltr>Future</Ltr> برمی‌گرداند.
        </li>
        <li>
          ارسال همگام وجود ندارد؛ <Ltr>get()</Ltr> همان ارسال ناهمگام را برای
          thread فعلی همگام می‌کند.
        </li>
        <li>
          پر شدن بافر، تأخیر بالا و نرخ retry بالا سه حالت خرابی جدا هستند و هر
          کدام متریک خودشان را دارند.
        </li>
        <li>
          مهلت <Ltr>get()</Ltr> به معنی «نوشته نشد» نیست؛ وضعیت نامشخص را با
          idempotence یا کلید یکتا مدیریت کنید.
        </li>
        <li>
          برای سنجش واقعی از <Ltr>kafka-producer-perf-test.sh</Ltr> استفاده
          کنید و اثر تنظیمات را روی <Ltr>p99</Ltr> ببینید.
        </li>
      </ul>
      <p>
        حالا می‌دانیم رکورد چطور از کد به بافر و از بافر به بروکر می‌رسد. قدم
        بعدی این است که ببینیم وقتی کلید داریم یا نداریم، <Ltr>Partitioner</Ltr>{' '}
        چطور پارتیشن را انتخاب می‌کند و این انتخاب چه اثری بر ترتیب و توزیع
        بار دارد.
      </p>
    </>
  )
}
