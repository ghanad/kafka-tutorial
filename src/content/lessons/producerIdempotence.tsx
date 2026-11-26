import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { RetryIdempotenceExplainer } from '../../components/simulators/RetryIdempotenceExplainer'

const retryConfig = `# producer.properties — سیاست Retry
bootstrap.servers=localhost:9092
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=org.apache.kafka.common.serialization.StringSerializer

# سقف تعداد تلاش‌ها؛ پیش‌فرض عملاً بی‌نهایت است
retries=2147483647

# فاصلهٔ انتظار بین دو تلاش (میلی‌ثانیه)
retry.backoff.ms=100

# مهلت هر درخواست (میلی‌ثانیه)
request.timeout.ms=30000

# سقف کل زمان از send تا موفقیت یا شکست نهایی
delivery.timeout.ms=120000`

const idempotentConfig = `# producer.properties — نوشتن idempotent
bootstrap.servers=localhost:9092
acks=all
enable.idempotence=true

# با idempotence این سه مقدار باید سازگار باشند
max.in.flight.requests.per.connection=5
retries=2147483647
delivery.timeout.ms=120000`

const javaIdempotent = `Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

// با idempotence، حداکثر ۵ درخواست در پرواز مجاز است
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120_000);

KafkaProducer<String, String> producer = new KafkaProducer<>(props);
producer.send(new ProducerRecord<>("orders", "order-1042", payload));`

const javaTransactional = `props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "orders-app-1");
producer.initTransactions();

try {
    producer.beginTransaction();

    // خروجی و آفست ورودی در یک تراکنش
    producer.send(new ProducerRecord<>("orders", "order-1042", payload));
    producer.sendOffsetsToTransaction(offsets, consumerGroupMetadata);

    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
    throw e;
}`

const consumerConfig = `# consumer.properties — فقط دادهٔ commit‌شده را ببین
isolation.level=read_committed`

const transactionConfig = `# producer.properties — تراکنش
transactional.id=orders-app-1
transaction.timeout.ms=60000
enable.idempotence=true
acks=all`

export function ProducerIdempotenceContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل دیدیم Producer چطور با بچ و فشرده‌سازی هزینهٔ ارسال را کم
        می‌کند. اما هنوز یک سؤال باز مانده: وقتی ارسال شکست می‌خورد چه اتفاقی
        می‌افتد؟ Producer به‌طور خودکار دوباره تلاش می‌کند و همین تلاش دوباره
        می‌تواند رکوردی را بسازد که قبلاً نوشته شده بود. در این درس می‌بینیم
        چرا <Ltr>Retry</Ltr> به‌تنهایی می‌تواند داده را تکراری کند، چطور{' '}
        <Ltr>Idempotent Producer</Ltr> با <Ltr>PID</Ltr> و{' '}
        <Ltr>Sequence Number</Ltr> جلوی این تکرار را می‌گیرد، و چرا{' '}
        <Ltr>Exactly-Once</Ltr> واقعی به چیزی بیشتر از یک تنظیم نیاز دارد.
      </p>

      <h2>۱. وقتی ارسال شکست می‌خورد: خطاهای موقتی و دائمی</h2>
      <p>
        هر خطای Producer یکسان نیست. بعضی خطاها موقتی‌اند و با تلاش دوباره حل
        می‌شوند: قطع لحظه‌ای شبکه، تایم‌اوت درخواست، جابه‌جایی لیدر پارتیشن، یا
        کم بودن موقت اعضای <Ltr>ISR</Ltr>. بعضی خطاها دائمی‌اند و تلاش دوباره
        فقط وقت تلف می‌کند: خطای سریالایز، بزرگ بودن رکورد، نداشتن مجوز نوشتن
        روی تاپیک، یا نامعتبر بودن رکورد.
      </p>
      <table>
        <thead>
          <tr>
            <th>نوع خطا</th>
            <th>نمونه</th>
            <th>Retry کمک می‌کند؟</th>
            <th>چه کاری درست است</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>موقتی (Retriable)</td>
            <td>
              <Ltr>TimeoutException</Ltr>، <Ltr>NetworkException</Ltr>،{' '}
              <Ltr>NotLeaderForPartitionException</Ltr>،{' '}
              <Ltr>NotEnoughReplicasException</Ltr>
            </td>
            <td>بله</td>
            <td>بگذارید Producer خودش دوباره تلاش کند</td>
          </tr>
          <tr>
            <td>دائمی (Non-retriable)</td>
            <td>
              <Ltr>SerializationException</Ltr>،{' '}
              <Ltr>RecordTooLargeException</Ltr>،{' '}
              <Ltr>TopicAuthorizationException</Ltr>
            </td>
            <td>خیر</td>
            <td>خطا را به callback بدهید و رکورد را اصلاح یا دور بیندازید</td>
          </tr>
          <tr>
            <td>نامشخص</td>
            <td>
              <Ltr>TimeoutException</Ltr> بعد از ارسال درخواست
            </td>
            <td>ممکن است</td>
            <td>
              فرض نکنید «نوشته نشد»؛ همین‌جاست که تکرار متولد می‌شود
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Producer به‌طور پیش‌فرض خطاهای موقتی را خودش دوباره امتحان می‌کند. سقف
        تلاش‌ها را <Ltr>retries</Ltr> و سقف کل زمان را{' '}
        <Ltr>delivery.timeout.ms</Ltr> تعیین می‌کند. از <Ltr>Kafka 2.1</Ltr> به
        بعد پیش‌فرض <Ltr>retries</Ltr> عملاً بی‌نهایت است؛ یعنی Producer تا وقتی
        مهلت کل تمام نشده، تلاش را ادامه می‌دهد. این رفتار برای دوام خوب است،
        اما دقیقاً همان چیزی است که مشکل تکرار را می‌سازد.
      </p>
      <CodeBlock
        code={retryConfig}
        language="properties"
        filename="producer.properties"
      />
      <Callout variant="info" title="سه مهلت را با هم ببینید">
        <p>
          <Ltr>request.timeout.ms</Ltr> مهلت هر تلاش است،{' '}
          <Ltr>retry.backoff.ms</Ltr> فاصلهٔ بین تلاش‌ها و{' '}
          <Ltr>delivery.timeout.ms</Ltr> سقف کل مسیر. اگر{' '}
          <Ltr>delivery.timeout.ms</Ltr> کوچک‌تر از مجموع{' '}
          <Ltr>linger.ms</Ltr> و <Ltr>request.timeout.ms</Ltr> باشد، Producer
          حتی بالا نمی‌آید و <Ltr>ConfigException</Ltr> می‌دهد.
        </p>
      </Callout>

      <h2>۲. مشکل واقعی: ack گم می‌شود، نه رکورد</h2>
      <p>
        رایج‌ترین سناریوی تکرار این است: Producer یک بچ را می‌فرستد، بروکر آن را
        در لاگ می‌نویسد و <Ltr>offset</Ltr> می‌دهد، اما پاسخ بروکر در راه
        برمی‌گردد گم می‌شود. از دید Producer هیچ تأییدی نرسیده؛ پس نمی‌داند
        رکورد نوشته شده یا نه. تنها کاری که می‌تواند بکند، فرستادن دوبارهٔ همان
        بچ است. اگر بروکر دوباره آن را بنویسد، داده تکراری شده است.
      </p>
      <p>
        این وضعیت را «نامشخص» می‌نامیم، چون از سمت Producer واقعاً معلوم نیست.
        حتی <Ltr>TimeoutException</Ltr> هم به معنای «نوشته نشد» نیست؛ فقط یعنی
        «تا این لحظه پاسخی ندیدم». اگر کد شما تایم‌اوت را شکست قطعی تفسیر کند و
        خودش دوباره بفرستد، دقیقاً همان تکرار را می‌سازد که Producer سعی داشت از
        آن دوری کند.
      </p>
      <p>
        برای اینکه بزرگی مشکل را ببینید، یک محاسبهٔ ساده: فرض کنید روزی ۱۰
        میلیون رکورد می‌فرستید و بچ‌های ۱۰۰ رکوردی دارید؛ یعنی ۱۰۰٬۰۰۰ بچ در
        روز. اگر فقط ۰٫۰۱ درصد از تأییدها گم شود، ۱۰ بچ دوباره فرستاده می‌شوند و
        حدود ۱٬۰۰۰ رکورد تکراری در روز ساخته می‌شود. این عدد کوچک به نظر
        می‌رسد، اما در جدولی که باید یکتا باشد یا در محاسبهٔ موجودی، همان ۱٬۰۰۰
        رکورد کافی است تا گزارش‌ها غلط شوند.
      </p>
      <Callout variant="warning" title="at-least-once پیش‌فرض است">
        <p>
          تا وقتی جلوی تکرار را نگیرید، Producer در بهترین حالت{' '}
          <Ltr>at-least-once</Ltr> کار می‌کند: داده گم نمی‌شود، اما ممکن است
          تکراری برسد. اگر <Ltr>retries=0</Ltr> بگذارید به{' '}
          <Ltr>at-most-once</Ltr> می‌رسید: تکرار ندارید، اما ممکن است داده گم
          شود. هر دو حالت یک قربانی دارند و هیچ‌کدام دقیقاً یک‌بار نیستند.
        </p>
      </Callout>

      <h2>۳. Retry و ترتیب: چرا max.in.flight مهم است</h2>
      <p>
        تکرار تنها مشکل نیست. وقتی بیش از یک درخواست هم‌زمان در پرواز است، Retry
        می‌تواند ترتیب را هم به هم بزند. تصور کنید بچ ۱ و بچ ۲ پشت سر هم
        فرستاده می‌شوند. بچ ۱ تایم‌اوت می‌خورد اما در واقع روی بروکر نوشته شده؛
        بچ ۲ موفق می‌شود و بعد Producer بچ ۱ را دوباره می‌فرستد. حالا در لاگ،
        رکوردهای بچ ۱ بعد از رکوردهای بچ ۲ نشسته‌اند و ترتیب اولیه از بین رفته
        است.
      </p>
      <p>
        دو راه برای حل این مشکل وجود دارد. راه اول ساده و گران است:{' '}
        <Ltr>max.in.flight.requests.per.connection=1</Ltr>؛ یعنی Producer همیشه
        فقط یک درخواست در پرواز داشته باشد. ترتیب حفظ می‌شود، اما توان عملیاتی
        به‌شدت پایین می‌آید، چون هر بچ باید منتظر تأیید بچ قبلی بماند. راه دوم
        همان چیزی است که از <Ltr>Kafka 0.11</Ltr> به بعد اضافه شد:{' '}
        <Ltr>Idempotent Producer</Ltr> که هم تکرار را حذف می‌کند و هم ترتیب را
        با حداکثر پنج درخواست در پرواز حفظ می‌کند.
      </p>
      <table>
        <thead>
          <tr>
            <th>تنظیم</th>
            <th>تکرار</th>
            <th>ترتیب</th>
            <th>توان عملیاتی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>retries=0</Ltr>
            </td>
            <td>ندارد</td>
            <td>حفظ می‌شود</td>
            <td>بالا، اما احتمال گم شدن داده</td>
          </tr>
          <tr>
            <td>
              <Ltr>retries&gt;0</Ltr> و{' '}
              <Ltr>max.in.flight&gt;1</Ltr>
            </td>
            <td>دارد</td>
            <td>ممکن است به هم بخورد</td>
            <td>بالا</td>
          </tr>
          <tr>
            <td>
              <Ltr>retries&gt;0</Ltr> و{' '}
              <Ltr>max.in.flight=1</Ltr>
            </td>
            <td>دارد</td>
            <td>حفظ می‌شود</td>
            <td>پایین</td>
          </tr>
          <tr>
            <td>
              <Ltr>enable.idempotence=true</Ltr>
            </td>
            <td>ندارد</td>
            <td>حفظ می‌شود</td>
            <td>بالا (تا ۵ درخواست در پرواز)</td>
          </tr>
        </tbody>
      </table>

      <h2>۴. Idempotent Producer: PID، Epoch و Sequence Number</h2>
      <p>
        ایدهٔ idempotence ساده است: هر بچ باید یک شناسه داشته باشد تا بروکر بتواند
        بفهمد این همان بچ قبلی است یا بچ جدیدی است. Producer هنگام اتصال یک{' '}
        <Ltr>Producer ID</Ltr> یا <Ltr>PID</Ltr> از بروکر می‌گیرد. بعد برای هر
        پارتیشن یک شمارندهٔ <Ltr>Sequence Number</Ltr> نگه می‌دارد که با هر بچ
        یکی زیاد می‌شود. هر بچ همراه با <Ltr>PID</Ltr>، <Ltr>Epoch</Ltr> و
        شمارهٔ ترتیبش فرستاده می‌شود.
      </p>
      <p>
        بروکر برای هر زوج (Producer، پارتیشن) حافظه‌ای نگه می‌دارد که آخرین
        بچ‌های پذیرفته‌شده را به خاطر می‌سپارد. وقتی بچی می‌رسد سه حالت پیش
        می‌آید:
      </p>
      <ul>
        <li>
          شمارهٔ ترتیب دقیقاً بعدی است: بچ جدید است، نوشته می‌شود و شمارنده جلو
          می‌رود.
        </li>
        <li>
          شمارهٔ ترتیب قبلاً دیده شده و در حافظه هست: بچ تکراری است؛ نوشته
          نمی‌شود و همان <Ltr>offset</Ltr> قبلی به Producer برگردانده می‌شود.
        </li>
        <li>
          شمارهٔ ترتیب از شمارهٔ بعدی جلوتر یا خیلی عقب‌تر است: ترتیب شکسته شده؛
          بروکر خطای <Ltr>OutOfOrderSequenceException</Ltr> می‌دهد.
        </li>
      </ul>
      <p>
        همین مکانیزم هم تکرار را حذف می‌کند و هم ترتیب را حفظ می‌کند، چون بچ
        بعدی تا وقتی بچ قبلی تأیید نشده، شمارهٔ بعدی را نمی‌گیرد. به همین دلیل
        با idempotence می‌توانید تا پنج درخواست هم‌زمان در پرواز داشته باشید
        بدون اینکه Retry ترتیب را به هم بزند.
      </p>
      <CodeBlock
        code={idempotentConfig}
        language="properties"
        filename="producer.properties"
      />
      <Callout variant="info" title="از Kafka 3.0 به بعد پیش‌فرض فعال است">
        <p>
          <Ltr>enable.idempotence</Ltr> از <Ltr>Kafka 3.0</Ltr> به بعد به‌طور
          پیش‌فرض <Ltr>true</Ltr> است. با این حال آن را صریح بنویسید؛ کدها و
          فایل‌های تنظیمات قدیمی زیادند که <Ltr>acks=1</Ltr> یا{' '}
          <Ltr>max.in.flight</Ltr> بزرگ را با خود حمل می‌کنند و در سکوت
          idempotence را خاموش می‌کنند.
        </p>
      </Callout>

      <h2>۵. شرط‌ها و هزینهٔ idempotence</h2>
      <p>
        Idempotence یک تنظیم مستقل نیست؛ سه تنظیم دیگر باید با آن سازگار باشند.
        اول، <Ltr>acks</Ltr> باید <Ltr>all</Ltr> باشد؛ با <Ltr>acks=0</Ltr> یا{' '}
        <Ltr>1</Ltr> اصلاً تأییدی وجود ندارد که تکرار را تشخیص دهد. دوم،{' '}
        <Ltr>retries</Ltr> باید بزرگ‌تر از صفر باشد. سوم،{' '}
        <Ltr>max.in.flight.requests.per.connection</Ltr> باید حداکثر{' '}
        <Ltr>5</Ltr> باشد.
      </p>
      <p>
        اگر خودتان <Ltr>enable.idempotence=true</Ltr> را صریح تنظیم کرده باشید و
        یکی از این شرط‌ها را نقض کنید، Producer با <Ltr>ConfigException</Ltr>{' '}
        بالا نمی‌آید؛ این خوب است، چون خطا را همان اول می‌بینید. اما اگر
        idempotence را صریح تنظیم نکرده باشید و مثلاً{' '}
        <Ltr>acks=1</Ltr> بگذارید، Kafka بی‌صدا آن را خاموش می‌کند و شما
        فکر می‌کنید محافظت فعال است.
      </p>
      <p>
        هزینهٔ idempotence کم است: چند بایت اضافه در هر بچ برای{' '}
        <Ltr>PID</Ltr> و شمارهٔ ترتیب، و کمی حافظه روی بروکر برای نگه‌داشتن
        وضعیت Producerها. در عوض، سربار محسوسی روی توان عملیاتی ندارد و
        نیازی به تنظیم جداگانه روی بروکر نیست.
      </p>
      <Callout variant="danger" title="idempotence فقط در یک نشست کار می‌کند">
        <p>
          اگر Producer کرش کند و دوباره بالا بیاید، <Ltr>PID</Ltr> جدید می‌گیرد
          و شمارندهٔ ترتیب از صفر شروع می‌شود. بروکر هم بچ‌های Producer قبلی را
          به‌عنوان یک Producer دیگر می‌شناسد. پس اگر برنامه بعد از کرش همان
          رکوردها را دوباره بفرستد، idempotence جلوی تکرار را نمی‌گیرد. این
          محدودیت مهم‌ترین نکتهٔ این درس است و در بخش بعد می‌بینیم تراکنش‌ها چه
          چیزی به آن اضافه می‌کنند.
        </p>
      </Callout>

      <h2>۶. Exactly-Once: سه لایه، نه یک تنظیم</h2>
      <p>
        عبارت <Ltr>Exactly-Once</Ltr> در Kafka سه لایه دارد و هر لایه یک مشکل
        متفاوت را حل می‌کند. اگر فقط یکی را داشته باشید، به exactly-once
        سرتاسری نرسیده‌اید.
      </p>
      <ul>
        <li>
          <strong>لایهٔ نوشتن:</strong> Idempotent Producer تضمین می‌کند هر بچ
          دقیقاً یک‌بار در هر پارتیشن نوشته شود، در محدودهٔ یک نشست Producer.
        </li>
        <li>
          <strong>لایهٔ اتمیک بودن:</strong> تراکنش‌ها تضمین می‌کنند چند نوشتن
          روی چند پارتیشن، به‌همراه آفست ورودی، یک‌جا commit یا یک‌جا abort
          شوند. مصرف‌کننده با <Ltr>read_committed</Ltr> فقط نتیجهٔ تراکنش‌های
          commit‌شده را می‌بیند.
        </li>
        <li>
          <strong>لایهٔ مقصد:</strong> اگر خروجی به سیستم بیرونی می‌رود (دیتابیس،
          API، ایمیل)، Kafka نمی‌تواند آن را دقیقاً یک‌بار انجام دهد. آن‌جا به
          نوشتن idempotent یا dedupe در مقصد نیاز دارید.
        </li>
      </ul>
      <p>
        الگوی اصلی برای رسیدن به exactly-once در Kafka،{' '}
        <Ltr>consume-transform-produce</Ltr> است: یک Consumer می‌خواند، پردازش
        می‌کند، نتیجه را به تاپیک دیگری می‌نویسد و آفست ورودی را در همان تراکنش
        commit می‌کند. اگر در میانهٔ کار کرش کند، تراکنش abort می‌شود؛ بعد از
        restart از آخرین آفست commit‌شده ادامه می‌دهد، پس ورودیِ commit‌شده
        دوباره پردازش نمی‌شود و خروجی تکراری ساخته نمی‌شود.
      </p>
      <CodeBlock
        code={transactionConfig}
        language="properties"
        filename="producer.properties"
      />
      <CodeBlock
        code={javaTransactional}
        language="java"
        filename="TransactionalProducer.java"
      />
      <CodeBlock
        code={consumerConfig}
        language="properties"
        filename="consumer.properties"
      />
      <Callout variant="warning" title="read_committed را فراموش نکنید">
        <p>
          تراکنش بدون <Ltr>isolation.level=read_committed</Ltr> در سمت مصرف‌کننده
          بی‌فایده است. پیش‌فرض <Ltr>read_uncommitted</Ltr> است؛ یعنی
          مصرف‌کننده رکوردهای تراکنش‌های باز و abort‌شده را هم می‌بیند. اگر
          خروجی تراکنشی را می‌نویسید، مصرف‌کنندهٔ بعدی هم باید{' '}
          <Ltr>read_committed</Ltr> باشد.
        </p>
      </Callout>
      <p>
        در <Ltr>Kafka Streams</Ltr> این ترکیب با تنظیم{' '}
        <Ltr>processing.guarantee=exactly_once_v2</Ltr> به‌صورت آماده وجود دارد.
        برای پردازش سادهٔ Producer-only، فقط idempotence کافی است؛ برای
        read-process-write، تراکنش لازم است. جزئیات تراکنش‌ها موضوع درس بعدی
        است؛ اینجا فقط باید بدانید که idempotence پایان راه نیست.
      </p>

      <h2>۷. یک ack گم‌شده، دو سرنوشت</h2>
      <p>
        در توضیح تعاملی زیر همان سناریوی بخش ۲ را گام‌به‌گام می‌بینید: بچ A
        نوشته می‌شود، تأییدش گم می‌شود و Producer دوباره تلاش می‌کند. یک پنل
        مقایسهٔ «بدون idempotence» با خط‌چین و رنگ قرمز نشان می‌دهد چه تکراری
        ساخته می‌شد، و لاگ اصلی همان تلاش را با idempotence بی‌خطر می‌کند.
        سپس Producer کرش می‌کند و می‌بینید چرا idempotence به‌تنهایی برای نشست
        بعدی کافی نیست.
      </p>

      <RetryIdempotenceExplainer />

      <p>
        به گام ۳ نگاه کنید: بروکر بچ را نوشته و در Producer State ثبت کرده، اما
        ack گم شده است. در گام ۵ همان بچ با همان <Ltr>seq=0</Ltr> دوباره
        می‌رسد؛ بروکر تکراری بودنش را می‌فهمد و چیزی نمی‌نویسد. گام ۸ نقطهٔ
        ضعف را نشان می‌دهد: بعد از restart، <Ltr>PID</Ltr> عوض شده و همان
        رکوردها با <Ltr>offset</Ltr>های <Ltr>1046</Ltr> و <Ltr>1047</Ltr>{' '}
        دوباره نوشته می‌شوند. گام ۹ توضیح می‌دهد تراکنش چطور این شکاف را پر
        می‌کند.
      </p>

      <h2>۸. تنظیمات پیشنهادی و کد</h2>
      <p>
        برای بیشتر مسیرهای تولیدی، ترکیب پیشنهادی ساده است:{' '}
        <Ltr>acks=all</Ltr>، <Ltr>enable.idempotence=true</Ltr>،{' '}
        <Ltr>max.in.flight=5</Ltr> و <Ltr>delivery.timeout.ms</Ltr> متناسب با
        تحمل تأخیر برنامه. اگر به exactly-once در مسیر read-process-write
        نیاز دارید، <Ltr>transactional.id</Ltr> ثابت و{' '}
        <Ltr>isolation.level=read_committed</Ltr> هم اضافه می‌شوند.
      </p>
      <CodeBlock
        code={javaIdempotent}
        language="java"
        filename="IdempotentProducer.java"
      />
      <table>
        <thead>
          <tr>
            <th>تنظیم</th>
            <th>پیش‌فرض</th>
            <th>نقش</th>
            <th>نکته</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>enable.idempotence</Ltr>
            </td>
            <td>
              <Ltr>true</Ltr> (از <Ltr>3.0</Ltr>)
            </td>
            <td>حذف نوشتن تکراری در یک نشست</td>
            <td>به <Ltr>acks=all</Ltr> و <Ltr>retries&gt;0</Ltr> نیاز دارد</td>
          </tr>
          <tr>
            <td>
              <Ltr>acks</Ltr>
            </td>
            <td>
              <Ltr>all</Ltr>
            </td>
            <td>سطح تأیید نوشتن</td>
            <td>با <Ltr>0</Ltr> یا <Ltr>1</Ltr> idempotence خاموش می‌شود</td>
          </tr>
          <tr>
            <td>
              <Ltr>max.in.flight.requests.per.connection</Ltr>
            </td>
            <td>
              <Ltr>5</Ltr>
            </td>
            <td>تعداد درخواست هم‌زمان</td>
            <td>با idempotence بیشتر از <Ltr>5</Ltr> مجاز نیست</td>
          </tr>
          <tr>
            <td>
              <Ltr>retries</Ltr>
            </td>
            <td>
              <Ltr>2147483647</Ltr>
            </td>
            <td>سقف تلاش‌ها</td>
            <td>عملاً بی‌نهایت؛ سقف واقعی مهلت است</td>
          </tr>
          <tr>
            <td>
              <Ltr>delivery.timeout.ms</Ltr>
            </td>
            <td>
              <Ltr>120000</Ltr>
            </td>
            <td>سقف کل زمان ارسال</td>
            <td>باید از <Ltr>linger.ms + request.timeout.ms</Ltr> بزرگ‌تر باشد</td>
          </tr>
          <tr>
            <td>
              <Ltr>transactional.id</Ltr>
            </td>
            <td>—</td>
            <td>شناسهٔ پایدار برای تراکنش</td>
            <td>باید بین restartها ثابت بماند</td>
          </tr>
          <tr>
            <td>
              <Ltr>isolation.level</Ltr>
            </td>
            <td>
              <Ltr>read_uncommitted</Ltr>
            </td>
            <td>دید مصرف‌کننده به تراکنش‌ها</td>
            <td>برای دیدن فقط دادهٔ commit‌شده <Ltr>read_committed</Ltr></td>
          </tr>
        </tbody>
      </table>

      <h2>۹. اشتباه‌های رایج</h2>
      <Callout variant="danger" title="تفسیر Timeout به «نوشته نشد»">
        <p>
          اگر <Ltr>Future.get()</Ltr> تایم‌اوت بدهد، درخواست ممکن است هنوز در
          شبکه باشد یا بروکر آن را نوشته باشد. فرض «نوشته نشد» و ارسال دوباره
          در کد برنامه، همان تکرار را می‌سازد که idempotence سعی داشت از آن
          جلوگیری کند. وضعیت را نامشخص بدانید و اجازه دهید Producer خودش تصمیم
          بگیرد.
        </p>
      </Callout>
      <Callout variant="danger" title="انتظار exactly-once از idempotence تنها">
        <p>
          <Ltr>enable.idempotence=true</Ltr> فقط نوشتن تکراری در یک نشست
          Producer و یک پارتیشن را حذف می‌کند. بعد از restart، یا وقتی چند
          Producer جدا دارید، یا وقتی خروجی به سیستم بیرونی می‌رود، این تنظیم
          کافی نیست. برای مسیر read-process-write به تراکنش و برای مقصد بیرونی
          به idempotent sink نیاز دارید.
        </p>
      </Callout>
      <Callout variant="warning" title="idempotence خاموش‌شده در سکوت">
        <p>
          <Ltr>acks=1</Ltr> یا <Ltr>max.in.flight=10</Ltr> را با هم می‌گذارید و
          چون <Ltr>enable.idempotence</Ltr> را صریح true نکرده‌اید، Kafka آن را
          بی‌صدا خاموش می‌کند. همیشه این تنظیم را صریح بنویسید تا اگر شرطی نقض
          شد، همان اول <Ltr>ConfigException</Ltr> بگیرید.
        </p>
      </Callout>
      <Callout variant="warning" title="transactional.id تکراری بین نمونه‌ها">
        <p>
          اگر دو نمونهٔ هم‌زمان برنامه با یک <Ltr>transactional.id</Ltr> بالا
          بیایند، Kafka نمونهٔ قدیمی را fence می‌کند و تراکنش‌هایش را abort
          می‌کند. این رفتار برای جلوگیری از نوشتن هم‌زمان درست است، اما اگر
          شناسه را اشتباه بین replicaها تکرار کنید، یکی از نمونه‌ها مدام از کار
          می‌افتد. برای هر نمونهٔ فعال یک شناسهٔ پایدار و یکتا بدهید.
        </p>
      </Callout>
      <Callout variant="warning" title="مصرف‌کنندهٔ read_uncommitted روی خروجی تراکنشی">
        <p>
          تراکنش را درست پیاده می‌کنید اما مصرف‌کننده پیش‌فرض می‌ماند. نتیجه:
          رکوردهای تراکنش‌های abort‌شده هم دیده می‌شوند و ظاهراً داده‌های عجیب و
          تکراری ظاهر می‌شود. برای مسیر تراکنشی، <Ltr>read_committed</Ltr> جزء
          قرارداد است، نه یک بهبود اختیاری.
        </p>
      </Callout>
      <Callout variant="danger" title="انتظار حذف تکرار تجاری از Kafka">
        <p>
          اگر برنامه به‌دلیل باگ منطقی یک رویداد را دو بار تولید کند، هیچ تنظیمی
          در Kafka آن را حذف نمی‌کند؛ چون دو رکورد متفاوت با{' '}
          <Ltr>offset</Ltr>های متفاوت‌اند. برای این حالت به کلید یکتای تجاری و
          dedupe در مصرف‌کننده یا مقصد نیاز دارید.
        </p>
      </Callout>

      <DeepDive title="درون idempotence و تراکنش: PID، Epoch، LSO و Fencing">
        <DeepDiveSection title="PID و Epoch دقیقاً چه هستند؟">
          <p>
            Producer هنگام شروع، با درخواست <Ltr>InitProducerId</Ltr> از بروکر
            یک <Ltr>PID</Ltr> عددی می‌گیرد. برای Producerهای تراکنشی،{' '}
            <Ltr>transactional.id</Ltr> به یک <Ltr>PID</Ltr> پایدار نگاشت
            می‌شود و هر بار که Producer با همان شناسه initialize کند،{' '}
            <Ltr>Epoch</Ltr> یکی بالا می‌رود. Epoch برای fencing است: هر نوشتن
            با epoch قدیمی‌تر رد می‌شود، پس نمونهٔ قدیمی نمی‌تواند بعد از
            نمونهٔ جدید چیزی بنویسد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="بروکر چه چیزی را به خاطر می‌سپارد؟">
          <p>
            برای هر زوج (PID، پارتیشن)، بروکر وضعیت آخرین بچ‌ها را در{' '}
            <Ltr>ProducerStateManager</Ltr> نگه می‌دارد؛ از جمله آخرین
            شمارهٔ ترتیب و اطلاعات چند بچ اخیر (به‌طور پیش‌فرض ۵ بچ). وقتی بچی
            با شمارهٔ تکراری می‌رسد، بروکر به‌جای نوشتن، همان نتیجهٔ قبلی را
            برمی‌گرداند. اگر شماره از حد انتظار جلو بزند،{' '}
            <Ltr>OutOfOrderSequenceException</Ltr> می‌دهد. این حافظه ابدی نیست؛
            Producerی که مدت‌ها ساکت بماند ممکن است وضعیتش پاک شود، به همین دلیل
            پنجرهٔ Retry با <Ltr>delivery.timeout.ms</Ltr> محدود است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="تراکنش در سطح پروتکل">
          <p>
            Producer تراکنشی با <Ltr>initTransactions</Ltr> شروع می‌کند، با{' '}
            <Ltr>beginTransaction</Ltr> یک تراکنش باز می‌کند، رکوردها را
            می‌فرستد و در پایان یا <Ltr>commitTransaction</Ltr> می‌زند یا{' '}
            <Ltr>abortTransaction</Ltr>. بروکر در لاگ هر پارتیشن{' '}
            <Ltr>Transaction Marker</Ltr> می‌نویسد. مصرف‌کنندهٔ{' '}
            <Ltr>read_committed</Ltr> فقط رکوردهای قبل از marker commit را
            می‌بیند و رکوردهای تراکنش abort‌شده را نادیده می‌گیرد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="LSO چیست و چرا مصرف‌کننده را متوقف می‌کند؟">
          <p>
            <Ltr>Last Stable Offset</Ltr> یا <Ltr>LSO</Ltr> مرز دادهٔ پایدار
            برای مصرف‌کنندهٔ <Ltr>read_committed</Ltr> است: اولین رکورد یک
            تراکنش باز، LSO را نگه می‌دارد. یعنی اگر یک تراکنش طولانی باز بماند،
            مصرف‌کننده‌های <Ltr>read_committed</Ltr> نمی‌توانند از آن جلوتر
            بروند. به همین دلیل <Ltr>transaction.timeout.ms</Ltr> و پایش
            تراکنش‌های گیرکرده مهم است؛ یک تراکنش فراموش‌شده می‌تواند کل مصرف
            یک پارتیشن را متوقف کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا idempotence توان عملیاتی را کم نمی‌کند؟">
          <p>
            Idempotence فقط چند فیلد به هدر بچ اضافه می‌کند و بروکر یک مقایسهٔ
            عددی ساده انجام می‌دهد. سربار اصلی، حافظهٔ وضعیت Producerهاست که با
            تعداد Producerهای فعال و تعداد پارتیشن‌ها زیاد می‌شود. در مقابل،
            جایگزین قدیمی یعنی <Ltr>max.in.flight=1</Ltr> توان عملیاتی را
            به‌شدت کم می‌کرد. به همین دلیل idempotence از <Ltr>Kafka 3.0</Ltr>{' '}
            به بعد پیش‌فرض شده است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="exactly-once و سیستم‌های بیرونی">
          <p>
            اگر خروجی تراکنشی به دیتابیس می‌رود، دو راه دارید: یا مقصد را
            idempotent کنید (مثلاً <Ltr>UPSERT</Ltr> بر اساس کلید یکتا)، یا از
            الگوی <Ltr>Outbox</Ltr> استفاده کنید که نوشتن در دیتابیس و ثبت
            رویداد را در یک تراکنش دیتابیسی انجام می‌دهد. Kafka به‌تنهایی
            نمی‌تواند یک <Ltr>POST</Ltr> HTTP را دقیقاً یک‌بار اجرا کند؛
            «exactly-once» در عمل یعنی «اثر یک‌بار»، نه «فراخوانی یک‌بار».
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          Retry برای خطاهای موقتی لازم است، اما وقتی ack گم شود Producer نمی‌داند
          رکورد نوشته شده یا نه؛ ارسال دوباره می‌تواند داده را تکراری کند.
        </li>
        <li>
          با <Ltr>max.in.flight&gt;1</Ltr> و Retry، ترتیب هم می‌تواند به هم
          بخورد؛ <Ltr>max.in.flight=1</Ltr> ترتیب را حفظ می‌کند اما توان
          عملیاتی را می‌کشد.
        </li>
        <li>
          <Ltr>enable.idempotence=true</Ltr> با <Ltr>PID</Ltr>،{' '}
          <Ltr>Epoch</Ltr> و <Ltr>Sequence Number</Ltr> نوشتن تکراری را در یک
          نشست و یک پارتیشن حذف می‌کند و ترتیب را با تا پنج درخواست در پرواز
          حفظ می‌کند.
        </li>
        <li>
          idempotence به <Ltr>acks=all</Ltr>، <Ltr>retries&gt;0</Ltr> و{' '}
          <Ltr>max.in.flight&lt;=5</Ltr> نیاز دارد؛ در غیر این صورت یا خطا
          می‌گیرید یا بی‌صدا خاموش می‌شود.
        </li>
        <li>
          بعد از restart، <Ltr>PID</Ltr> عوض می‌شود و idempotence تنها کافی نیست؛
          برای مسیر read-process-write به تراکنش، <Ltr>transactional.id</Ltr> و{' '}
          <Ltr>read_committed</Ltr> نیاز دارید.
        </li>
        <li>
          exactly-once سرتاسری شامل نوشتن idempotent، تراکنش اتمیک و مقصد
          idempotent است؛ Kafka فقط بخشی از این زنجیره را تضمین می‌کند.
        </li>
      </ul>
      <p>
        حالا می‌دانیم چطور جلوی تکرار و به‌هم‌ریختن ترتیب را بگیریم و چرا
        idempotence به‌تنهایی برای exactly-once کافی نیست. قدم بعدی این است که
        تراکنش‌ها را باز کنیم: چطور چند پارتیشن و آفست مصرف‌کننده در یک واحد
        اتمیک commit می‌شوند، <Ltr>transactional.id</Ltr> چطور نمونه‌های قدیمی
        را fence می‌کند و <Ltr>read_committed</Ltr> دقیقاً چه چیزی را پنهان
        می‌کند.
      </p>
    </>
  )
}
