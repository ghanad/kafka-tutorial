import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { ProducerSendExplainer } from '../../components/simulators/ProducerSendExplainer'

const producerConfig = `# producer.properties — حداقل تنظیمات لازم
bootstrap.servers=localhost:9092
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=org.apache.kafka.common.serialization.StringSerializer

# در درس acks معنی دقیق این خط را میبینیم
acks=all
linger.ms=5`

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
        فصل دوم به اینجا رسید که داده کجا ذخیره می‌شود. از این فصل، از سمت دیگر
        خط شروع می‌کنیم: کدی که رکورد را می‌سازد و می‌فرستد. اولین سؤال عملی هر
        کسی که با <Ltr>KafkaProducer</Ltr> کار می‌کند این است: «اگر{' '}
        <Ltr>send()</Ltr> ناهمگام است، چرا بعضی‌ها پشتش <Ltr>get()</Ltr>{' '}
        می‌گذارند؟» در این درس مسیر یک رکورد را از فراخوانی <Ltr>send</Ltr> تا
        رسیدن به لیدر پارتیشن دنبال می‌کنیم، می‌بینیم همگام و ناهمگام در واقع دو
        رفتار متفاوت نیستند بلکه دو نحوهٔ انتظار برای یک <Ltr>Future</Ltr> هستند،
        و یاد می‌گیریم خطا را کجا بگیریم تا داده بی‌صدا گم نشود.
      </p>

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
      <CodeBlock code={asyncSend} language="java" filename="AsyncSend.java" />
      <p>
        در نمونهٔ بالا، <Ltr>try-with-resources</Ltr> در پایان{' '}
        <Ltr>close()</Ltr> را صدا می‌زند و <Ltr>close()</Ltr> بافر را خالی
        می‌کند. اگر پرودیوسر را بدون <Ltr>flush()</Ltr> یا <Ltr>close()</Ltr>{' '}
        رها کنید، رکوردهایی که هنوز در بافرند هرگز ارسال نمی‌شوند.
      </p>
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
      <p>
        <Ltr>RecordMetadata</Ltr> چیزی است که در پایان مسیر به دست می‌آید:
        نام تاپیک، شمارهٔ پارتیشن، <Ltr>offset</Ltr>، زمان رکورد و اندازهٔ
        سریالایزشدهٔ کلید و مقدار. اگر <Ltr>acks=0</Ltr> باشد، پرودیوسر منتظر
        تأیید نمی‌ماند؛ در این حالت <Ltr>offset</Ltr> برابر <Ltr>-1</Ltr> است،
        چون بروکر هیچ عددی برنگردانده است.
      </p>

      <h2>۲. ناهمگام: نتیجه را با Callback بگیرید</h2>
      <p>
        در حالت ناهمگام، برنامه بعد از <Ltr>send()</Ltr> به کارش ادامه می‌دهد و
        نتیجه را با یک <Ltr>Callback</Ltr> می‌گیرد. در مسیر عادی، این callback
        یک بار صدا زده می‌شود: یا با متادیتا و <Ltr>exception = null</Ltr>، یا
        با متادیتای ناقص و یک استثنا. همین‌جا محل اصلی اشتباه است: اگر callback
        را ندهید و <Ltr>Future</Ltr> را هم بررسی نکنید، خطای ارسال هیچ‌جا دیده
        نمی‌شود.
      </p>
      <CodeBlock
        code={asyncCallback}
        language="java"
        filename="AsyncWithCallback.java"
      />
      <p>
        callback به‌طور معمول روی همان I/O thread پرودیوسر اجرا می‌شود، نه روی
        thread شما. این یعنی هر کار سنگین یا مسدودکننده داخل callback، ارسال
        رکوردهای دیگر را متوقف می‌کند. اگر لازم است پردازش سنگینی انجام دهید،
        داده را به یک <Ltr>Executor</Ltr> یا صف دیگری بسپارید و callback را سریع
        تمام کنید. همچنین داخل callback روی <Ltr>Future</Ltr> دیگری{' '}
        <Ltr>get()</Ltr> نزنید؛ ممکن است همان threadی را بلوکه کنید که باید آن
        <Ltr>Future</Ltr> را کامل کند.
      </p>
      <p>
        مزیت اصلی ناهمگام فقط سرعت نیست؛ امکان <strong>بچ‌شدن</strong> است.
        وقتی چند رکورد پشت سر هم در بافر می‌نشینند، <Ltr>Sender</Ltr> آن‌ها را
        در یک درخواست جمع می‌کند و هزینهٔ شبکه و تأیید بین چند رکورد تقسیم
        می‌شود. به همین دلیل مسیر پرترافیک تقریباً همیشه ناهمگام است.
      </p>
      <Callout variant="warning" title="ترتیب در برابر Retry">
        <p>
          رکوردهایی که از یک thread و برای یک پارتیشن فرستاده می‌شوند، در حالت
          عادی به همان ترتیب می‌نشینند. اما اگر یک بچ شکست بخورد و دوباره
          فرستاده شود، در حالی که بچ‌های بعدی هم در راه‌اند، ترتیب می‌تواند به
          هم بریزد. از <Ltr>Kafka 3.0</Ltr> به بعد{' '}
          <Ltr>enable.idempotence=true</Ltr> پیش‌فرض است و ترتیب را حتی در
          حضور retry حفظ می‌کند. در درس <Ltr>Retry و Idempotence</Ltr> این
          مکانیزم را باز می‌کنیم.
        </p>
      </Callout>

      <h2>۳. همگام: انتظار با get</h2>
      <p>
        برای اینکه ارسال از دید برنامه همگام شود، کافی است بلافاصله روی{' '}
        <Ltr>Future</Ltr>، <Ltr>get()</Ltr> را صدا بزنید. این فراخوانی thread
        فعلی را تا کامل شدن <Ltr>Future</Ltr> نگه می‌دارد و بعد متادیتا را
        برمی‌گرداند یا استثنا پرتاب می‌کند. هیچ API جداگانه‌ای برای ارسال همگام
        وجود ندارد؛ همین یک خط، همان ارسال ناهمگام را همگام نشان می‌دهد.
      </p>
      <CodeBlock code={syncSend} language="java" filename="SyncSend.java" />
      <p>
        دو نکته در این نمونه مهم است. اول، همیشه برای <Ltr>get()</Ltr> مهلت
        بگذارید؛ انتظار بی‌نهایت یعنی اگر بروکر یا شبکه مشکل داشته باشد، thread
        برنامه برای همیشه قفل می‌شود. دوم، <Ltr>TimeoutException</Ltr> به معنی
        «نوشته نشد» نیست. ممکن است درخواست بعد از پایان مهلت به بروکر برسد و
        رکورد نوشته شود؛ پس تلاش دوبارهٔ کورکورانه می‌تواند رکورد تکراری بسازد.
        این وضعیت «نامشخص» است و باید با <Ltr>idempotence</Ltr> یا یک کلید
        یکتا مدیریت شود.
      </p>
      <p>
        هزینهٔ همگام‌سازی هم ساده است: هر thread در هر لحظه فقط یک رکورد در
        پرواز دارد. اگر رفت‌وبرگشت شبکه ۵ میلی‌ثانیه باشد، هر thread حداکثر
        حدود ۲۰۰ رکورد در ثانیه می‌فرستد. با ده thread به حدود ۲٬۰۰۰ رکورد در
        ثانیه می‌رسید، در حالی که همان ده thread در حالت ناهمگام با بچ‌های ۱۰۰
        تایی می‌توانند به ده‌ها هزار رکورد در ثانیه برسند. این عددها ساده‌شده‌اند
        ولی نسبت را خوب نشان می‌دهند.
      </p>
      <p>
        پس همگام کجا به کار می‌آید؟ جایی که حجم کم است و می‌خواهید قبل از قدم
        بعد مطمئن شوید رکورد نوشته شده است: یک اسکریپت مهاجرت، یک ابزار
        ادمینی، ارسال یک فرمان کنترلی، یا زمانی که سادگی کد مهم‌تر از توان
        عملیاتی است. در چنین مواردی <Ltr>send().get()</Ltr> با مهلت مشخص، کد
        خواناتری می‌دهد.
      </p>
      <CodeBlock
        code={flushAndClose}
        language="java"
        filename="FlushAndClose.java"
      />
      <p>
        اگر چند رکورد را ناهمگام فرستادید و فقط در پایان کار به تأیید همهٔ آن‌ها
        نیاز دارید، به‌جای <Ltr>get()</Ltr> روی هر کدام، یک بار{' '}
        <Ltr>flush()</Ltr> صدا بزنید. <Ltr>flush()</Ltr> تا کامل شدن همهٔ
        رکوردهای بافر بلوکه می‌شود و خطاها را از طریق callback همان رکوردها
        گزارش می‌کند.
      </p>

      <h2>۴. مقایسهٔ مستقیم Sync و Async</h2>
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

      <DeepDive title="درون Producer: بافر، Batch و Sender">
        <DeepDiveSection title="buffer.memory و max.block.ms">
          <p>
            بافر پرودیوسر به‌طور پیش‌فرض ۳۲ مگابایت است. وقتی این فضا پر شود،{' '}
            <Ltr>send()</Ltr> تا آزاد شدن جا یا پایان{' '}
            <Ltr>max.block.ms</Ltr> منتظر می‌ماند. اگر مصرف‌کنندهٔ پایین‌دستی
            کند باشد و بروکر تأییدها را دیر بدهد، بافر پر می‌شود و فشار به
            thread برنامه برمی‌گردد. دیدن <Ltr>bufferpool</Ltr> و زمان صرف‌شده
            در <Ltr>send</Ltr> یکی از اولین کارهای عیب‌یابی پرودیوسر است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="batch.size و linger.ms">
          <p>
            <Ltr>batch.size</Ltr> (پیش‌فرض ۱۶ کیلوبایت) سقف اندازهٔ هر بچ است و{' '}
            <Ltr>linger.ms</Ltr> تعیین می‌کند <Ltr>Sender</Ltr> چقدر صبر کند تا
            بچ پر شود. در <Ltr>Kafka 3.x</Ltr> پیش‌فرض <Ltr>linger.ms</Ltr>{' '}
            صفر است؛ یعنی بچ فقط اگر همان لحظه رکورد دیگری در صف باشد ساخته
            می‌شود. از <Ltr>Kafka 4.0</Ltr> این پیش‌فرض به ۵ میلی‌ثانیه تغییر
            کرده است. افزایش{' '}
            <Ltr>linger.ms</Ltr> توان عملیاتی را بالا و تأخیر را کمی بیشتر
            می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چند درخواست در پرواز و ترتیب">
          <p>
            <Ltr>max.in.flight.requests.per.connection</Ltr> (پیش‌فرض ۵) تعداد
            درخواست‌های تأییدنشده‌ای است که همزمان در شبکه هستند. مقدار بیشتر
            یعنی توان عملیاتی بیشتر، اما بدون <Ltr>idempotence</Ltr> می‌تواند
            ترتیب را در صورت retry به هم بزند. با{' '}
            <Ltr>enable.idempotence=true</Ltr> کافکا شمارهٔ ترتیب هر بچ را
            نگه می‌دارد و بروکر بچ‌های تکراری یا خارج از ترتیب را کنار می‌گذارد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا callback روی I/O thread اجرا می‌شود؟">
          <p>
            <Ltr>Sender</Ltr> یک thread واحد است که هم شبکه را مدیریت می‌کند و
            هم پاسخ بروکر را پردازش می‌کند. callback در همان مسیر و بعد از
            پردازش پاسخ اجرا می‌شود تا نیازی به کپی و همگام‌سازی اضافه نباشد.
            به همین دلیل هر تأخیر در callback، مستقیماً تأخیر ارسال رکوردهای
            بعدی است. برای کارهای سنگین، فقط داده را از callback بیرون ببرید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="مهلت‌های مهم">
          <p>
            <Ltr>request.timeout.ms</Ltr> (پیش‌فرض ۳۰ ثانیه) مهلت انتظار برای
            پاسخ یک درخواست است، <Ltr>retry.backoff.ms</Ltr> فاصلهٔ بین
            تلاش‌ها، و <Ltr>delivery.timeout.ms</Ltr> (پیش‌فرض ۱۲۰ ثانیه)
            سقف کل زمان از <Ltr>send</Ltr> تا موفقیت یا شکست نهایی. وقتی{' '}
            <Ltr>delivery.timeout.ms</Ltr> تمام شود، دیگر retry ادامه پیدا
            نمی‌کند و خطا به callback می‌رسد.
          </p>
        </DeepDiveSection>
      </DeepDive>

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

      <h2>۶. خطا، Retry و مهلت‌ها</h2>
      <p>
        در حالت ناهمگام، خطاها در callback ظاهر می‌شوند؛ در حالت همگام،{' '}
        <Ltr>get()</Ltr> آن‌ها را به شکل <Ltr>ExecutionException</Ltr> پرتاب
        می‌کند. در هر دو حالت، پرودیوسر خودش خطاهای موقتی را retry می‌کند:
        قطع ارتباط، <Ltr>NotLeaderForPartition</Ltr>،{' '}
        <Ltr>NotEnoughReplicas</Ltr> و مشابه آن. خطاهای دائمی مثل{' '}
        <Ltr>RecordTooLargeException</Ltr>، <Ltr>SerializationException</Ltr>{' '}
        یا <Ltr>TopicAuthorizationException</Ltr> بلافاصله به شما می‌رسند و
        retry بی‌فایده است.
      </p>
      <p>
        سقف تلاش‌ها را <Ltr>delivery.timeout.ms</Ltr> تعیین می‌کند، نه فقط{' '}
        <Ltr>retries</Ltr>. اگر <Ltr>retries</Ltr> را زیاد کنید ولی{' '}
        <Ltr>delivery.timeout.ms</Ltr> کوتاه باشد، باز هم زودتر از موعد خطا
        می‌گیرید. برای مسیرهای حساس، این سه تنظیم را با هم ببینید:{' '}
        <Ltr>delivery.timeout.ms</Ltr>، <Ltr>request.timeout.ms</Ltr> و{' '}
        <Ltr>retry.backoff.ms</Ltr>.
      </p>
      <Callout variant="danger" title="retry بدون idempotence یعنی تکرار">
        <p>
          اگر تأیید یک بچ گم شود، پرودیوسر نمی‌داند بروکر آن را نوشته یا نه و
          دوباره می‌فرستد. بدون <Ltr>idempotence</Ltr> این کار می‌تواند رکورد
          تکراری بسازد. از <Ltr>Kafka 3.0</Ltr> به بعد{' '}
          <Ltr>enable.idempotence</Ltr>{' '}
          پیش‌فرض فعال است و همین مشکل را برای ارسال‌های معمولی حل می‌کند؛ اما
          اگر آن را آگاهانه خاموش کرده‌اید، باید خودتان برای تکرار فکر کنید.
        </p>
      </Callout>

      <h2>۷. اشتباه‌های رایج</h2>
      <Callout variant="danger" title="send بدون callback و بدون بررسی Future">
        <p>
          رایج‌ترین شکل گم شدن داده. <Ltr>send()</Ltr> بدون callback خطا را
          جایی نشان نمی‌دهد؛ نه لاگی، نه استثنایی. یا callback بدهید، یا{' '}
          <Ltr>Future</Ltr> را بررسی کنید، یا حداقل در پایان{' '}
          <Ltr>flush()</Ltr> بزنید و خطاها را جمع کنید.
        </p>
      </Callout>
      <Callout variant="warning" title="get روی هر رکورد در مسیر پرترافیک">
        <p>
          <Ltr>send().get()</Ltr> در یک حلقه، توان عملیاتی را به یک رکورد در هر
          رفت‌وبرگشت کاهش می‌دهد و مزیت بچ را از بین می‌برد. اگر به تأیید
          نهایی نیاز دارید، رکوردها را ناهمگام بفرستید و در پایان یک بار{' '}
          <Ltr>flush()</Ltr> بزنید.
        </p>
      </Callout>
      <Callout variant="danger" title="کار سنگین داخل callback">
        <p>
          callback روی I/O thread اجرا می‌شود. یک درخواست HTTP کند، یک کوئری
          دیتابیس یا یک <Ltr>Thread.sleep</Ltr> داخل callback، ارسال همهٔ
          رکوردهای بعدی را متوقف می‌کند. داده را به یک executor بسپارید و
          callback را فوراً تمام کنید.
        </p>
      </Callout>
      <Callout variant="warning" title="تفسیر TimeoutException به «نوشته نشد»">
        <p>
          وقتی <Ltr>get(2, SECONDS)</Ltr> مهلت تمام می‌کند، درخواست ممکن است
          هنوز در شبکه باشد یا بروکر آن را نوشته باشد. فرض «نوشته نشد» و ارسال
          دوبارهٔ کورکورانه، منبع رکورد تکراری است. وضعیت را نامشخص بدانید و با
          کلید یکتا یا <Ltr>idempotence</Ltr> آن را مدیریت کنید.
        </p>
      </Callout>
      <Callout variant="warning" title="بستن پرودیوسر بدون flush">
        <p>
          رکوردهایی که در بافر مانده‌اند تا ارسال نشوند از بین می‌روند.{' '}
          <Ltr>close()</Ltr> به‌طور پیش‌فرض بافر را خالی می‌کند، اما اگر
          برنامه را با <Ltr>System.exit</Ltr> یا کشتن process تمام کنید، این
          فرصت را از دست می‌دهید. در پایان کار همیشه <Ltr>flush()</Ltr> و بعد{' '}
          <Ltr>close()</Ltr> را صدا بزنید.
        </p>
      </Callout>
      <Callout variant="info" title="send همیشه فوری نیست">
        <p>
          اگر متادیتای تاپیک هنوز نیامده باشد یا بافر پر باشد،{' '}
          <Ltr>send()</Ltr> تا <Ltr>max.block.ms</Ltr> بلوکه می‌شود. این را با
          «ارسال همگام» اشتباه نگیرید؛ این انتظار برای آماده شدن شرایط ارسال
          است، نه برای تأیید بروکر.
        </p>
      </Callout>

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
          ناهمگام با callback خطا را می‌گیرد و اجازهٔ بچ‌شدن می‌دهد؛ همگام
          سادگی می‌دهد و توان عملیاتی را کم می‌کند.
        </li>
        <li>
          callback روی I/O thread اجرا می‌شود؛ داخلش کار سنگین یا{' '}
          <Ltr>get()</Ltr> نکنید.
        </li>
        <li>
          مهلت <Ltr>get()</Ltr> به معنی «نوشته نشد» نیست؛ وضعیت نامشخص را با
          idempotence یا کلید یکتا مدیریت کنید.
        </li>
        <li>
          پایان کار همیشه با <Ltr>flush()</Ltr> و <Ltr>close()</Ltr> همراه
          باشد تا بافر خالی شود.
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
