import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { ConsumerPollExplainer } from '../../components/simulators/ConsumerPollExplainer'

const pollLoop = `Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "billing");
props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
props.put("enable.auto.commit", "false");
props.put("max.poll.records", "500");

try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
    consumer.subscribe(List.of("orders"));

    while (!Thread.currentThread().isInterrupted()) {
        // تا ۵۰۰ میلی‌ثانیه منتظر می‌ماند؛ ممکن است لیست خالی برگردد
        ConsumerRecords<String, String> records =
            consumer.poll(Duration.ofMillis(500));

        for (ConsumerRecord<String, String> record : records) {
            process(record);
        }

        if (!records.isEmpty()) {
            // بعد از پردازش موفق، پیشرفت را ذخیره می‌کنیم
            consumer.commitSync();
        }
    }
}`

const consumerConfig = `# consumer.properties — تنظیمات مؤثر بر حلقه poll
bootstrap.servers=localhost:9092
group.id=billing

# سقف رکوردهای هر بار poll
max.poll.records=500

# حداقل داده برای پاسخ Broker و حداکثر انتظار آن (long polling)
fetch.min.bytes=1
fetch.max.wait.ms=500

# سقف بایت هر پارتیشن و کل پاسخ Fetch
max.partition.fetch.bytes=1048576
fetch.max.bytes=52428800

# سه زمان‌بند مهم
heartbeat.interval.ms=3000
session.timeout.ms=45000
max.poll.interval.ms=300000`

const describeGroup = `# وضعیت گروه و فاصله‌اش با انتهای لاگ
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --describe --group billing

# GROUP    TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# billing  orders  0          1047            1047            0`

const wakeupExample = `Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    // poll را از انتظار بیرون می‌آورد تا حلقه بتواند تمیز بسته شود
    consumer.wakeup();
}));

try {
    while (running) {
        ConsumerRecords<String, String> records =
            consumer.poll(Duration.ofMillis(500));
        records.forEach(this::process);
    }
} catch (WakeupException ignored) {
    // فقط برای خروج از حلقه است
} finally {
    consumer.close();
}`

export function ConsumerPollLoopContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        فصل قبل از سمت تولیدکننده بود. حالا به سمت دیگر خط می‌رسیم: کسی که داده
        را می‌خواند. برای اپراتور، این درس مهم است چون بیشتر lag، rebalanceهای
        پیاپی و مصرف تکراری از رفتار همین حلقه می‌آید. می‌بینیم مدل{' '}
        <strong>Pull</strong> چه مزیتی دارد، یک دور کامل <Ltr>poll</Ltr> از
        درخواست تا پردازش چه مراحلی دارد، و سه زمان‌بند <Ltr>heartbeat</Ltr>،{' '}
        <Ltr>session.timeout.ms</Ltr> و <Ltr>max.poll.interval.ms</Ltr> چطور
        تعیین می‌کنند مصرف‌کننده زنده بماند یا از گروه بیرون بیفتد.
      </p>

      <Callout variant="tip" title="چرا اپراتور باید حلقهٔ poll را بشناسد">
        <p>
          خیلی از هشدارهای <Ltr>Consumer Lag</Ltr> و rebalanceهای بی‌پایان،
          ریشه در پردازش کند یا تنظیم نامناسب همین حلقه دارند، نه در خوشه. اگر
          بدانید <Ltr>max.poll.records</Ltr>، <Ltr>max.poll.interval.ms</Ltr> و{' '}
          <Ltr>session.timeout.ms</Ltr> چه می‌کنند، می‌توانید بین «خوشه کند
          است» و «اپلیکیشن کند است» تفکیک کنید.
        </p>
      </Callout>

      <h2>۱. چرا Pull و نه Push؟</h2>
      <p>
        در مدل <strong>Push</strong>، بروکر به‌محض رسیدن پیام آن را به
        مصرف‌کننده می‌فرستد. مشکل اینجاست که بروکر باید سرعت هر مصرف‌کننده را
        بداند و برای هرکدام بافر نگه دارد. اگر مصرف‌کننده کند باشد، یا پیام‌ها
        روی هم انبار می‌شوند و حافظه پر می‌شود، یا باید دور ریخته شوند. با چند
        مصرف‌کننده با سرعت‌های متفاوت، این کار به یک مسئلهٔ پیچیدهٔ مدیریت جریان
        تبدیل می‌شود.
      </p>
      <p>
        کافکا مدل <strong>Pull</strong> را انتخاب کرده است: مصرف‌کننده هر وقت
        آماده بود، خودش داده را می‌کشد. سه فایدهٔ مستقیم دارد:
      </p>
      <ul>
        <li>
          <strong>کنترل سرعت دست مصرف‌کننده است:</strong> اگر پردازش کند باشد،
          داده در لاگ منتظر می‌ماند و گم نمی‌شود؛ فقط{' '}
          <Ltr>lag</Ltr> بالا می‌رود.
        </li>
        <li>
          <strong>دسته‌بندی طبیعی است:</strong> مصرف‌کننده می‌تواند چند رکورد را
          با هم بگیرد و هزینهٔ شبکه را بین آن‌ها تقسیم کند.
        </li>
        <li>
          <strong>بازپخش و عقب‌رفتن ممکن است:</strong> چون لاگ پایدار است،
          مصرف‌کننده می‌تواند <Ltr>position</Ltr> را عقب ببرد و دوباره بخواند؛
          چیزی که در Push ساده نیست.
        </li>
      </ul>
      <p>
        هزینهٔ Pull این است که وقتی داده‌ای نیست، مصرف‌کننده نباید در یک حلقهٔ
        تنگ مدام بپرسد؛ وگرنه شبکه و CPU را می‌سوزاند. کافکا این را با{' '}
        <strong>long polling</strong> حل کرده است: اگر دادهٔ کافی نباشد، بروکر
        درخواست را باز نگه می‌دارد تا <Ltr>fetch.max.wait.ms</Ltr> (پیش‌فرض
        ۵۰۰ میلی‌ثانیه) یا رسیدن <Ltr>fetch.min.bytes</Ltr>. پس{' '}
        <Ltr>poll</Ltr> خالی هم یک پاسخ طبیعی است، نه خطا.
      </p>

      <Callout variant="info" title="Pull و poll یکی نیستند">
        <p>
          <strong>Pull</strong> مدل معماری کافکاست: مصرف‌کننده خودش داده را از
          بروکر می‌کشد و بروکر پیام را به‌زور push نمی‌کند. اما <Ltr>poll</Ltr>{' '}
          نام متدی در کلاینت <Ltr>KafkaConsumer</Ltr> است که همین مدل را در کد
          اجرا می‌کند. هر بار <Ltr>poll</Ltr> فقط یک درخواست شبکه نیست؛ همان
          حلقه‌ای است که عضویت در گروه، دریافت پارتیشن، ارسال{' '}
          <Ltr>FetchRequest</Ltr>، برگرداندن رکوردها از بافر، و heartbeat و
          commit را مدیریت می‌کند.
        </p>
      </Callout>

      <h2>۲. حلقهٔ poll از دید اپراتور</h2>
      <p>
        مصرف‌کننده در کافکا یک شیء <Ltr>KafkaConsumer</Ltr> است که با یک حلقه
        کار می‌کند. هر بار <Ltr>poll</Ltr> صدا زده می‌شود، این کارها انجام
        می‌شود:
      </p>
      <ol>
        <li>
          اگر تخصیص پارتیشن هنوز انجام نشده، مصرف‌کننده به گروه می‌پیوندد و
          پارتیشن‌هایش را می‌گیرد.
        </li>
        <li>
          برای هر پارتیشن تخصیص‌یافته، یک <Ltr>FetchRequest</Ltr> با{' '}
          <Ltr>position</Ltr> فعلی به لیدر آن پارتیشن می‌فرستد.
        </li>
        <li>
          تا رسیدن داده یا پایان مهلت <Ltr>poll</Ltr> منتظر می‌ماند. اگر چیزی
          نرسد، لیست خالی برمی‌گرداند.
        </li>
        <li>
          رکوردهای رسیده را در یک <Ltr>ConsumerRecords</Ltr> برمی‌گرداند و{' '}
          <Ltr>position</Ltr> را در حافظه جلو می‌برد.
        </li>
        <li>
          اگر commit خودکار فعال باشد، پیشرفت را در پس‌زمینه ذخیره می‌کند.
        </li>
      </ol>
      <CodeBlock
        code={consumerConfig}
        language="properties"
        filename="consumer.properties"
      />
      <p>
        دو نکته در این حلقه مهم است. اول، <Ltr>KafkaConsumer</Ltr> thread-safe
        نیست؛ یک مصرف‌کننده را فقط از یک thread صدا بزنید. دوم،{' '}
        <Ltr>position</Ltr> با <strong>committed offset</strong> یکی نیست.{' '}
        <Ltr>position</Ltr> «آفست بعدی برای خواندن» در حافظهٔ همین پروسه است،
        ولی committed offset چیزی است که در کافکا ذخیره شده و بعد از ری‌استارت
        از آن ادامه می‌دهید. تفاوت دقیقشان در درس <Ltr>Offset و Commit</Ltr>
        آمده است.
      </p>
      <p>
        مقدار <Ltr>max.poll.records</Ltr> (پیش‌فرض ۵۰۰) سقف تعداد رکوردهایی است
        که هر <Ltr>poll</Ltr> برمی‌گرداند. این عدد را با{' '}
        <Ltr>max.partition.fetch.bytes</Ltr> اشتباه نگیرید؛ آن یکی سقف بایت هر
        پارتیشن در هر درخواست Fetch است. مصرف‌کننده ممکن است در یک درخواست بیش
        از <Ltr>max.poll.records</Ltr> رکورد دریافت کند و در حافظه نگه دارد، اما
        در هر <Ltr>poll</Ltr> فقط تا همان سقف به شما می‌دهد.
      </p>
      <Callout variant="info" title="poll خالی یعنی «فعلاً چیزی نیست»">
        <p>
          اگر <Ltr>poll</Ltr> یک لیست خالی برگرداند، هیچ مشکلی نیست. این یعنی
          تا پایان مهلت داده‌ای نرسیده است. حلقه را نشکنید و بلافاصله دوباره{' '}
          <Ltr>poll</Ltr> بزنید؛ همین چرخه است که heartbeat و commit خودکار را
          هم زنده نگه می‌دارد.
        </p>
      </Callout>

      <h2>۳. یک دور کامل poll را گام‌به‌گام ببینید</h2>
      <p>
        در توضیح تعاملی زیر یک مصرف‌کننده در گروه <Ltr>billing</Ltr> و روی
        پارتیشن ۰ تاپیک <Ltr>orders</Ltr> را دنبال می‌کنیم. می‌بینید{' '}
        <Ltr>position</Ltr> چطور جلو می‌رود، چرا یک <Ltr>poll</Ltr> خالی
        برمی‌گردد و وقتی Producer دادهٔ تازه می‌نویسد، مصرف‌کننده تا{' '}
        <Ltr>poll</Ltr> بعدی از آن بی‌خبر می‌ماند. در نیمهٔ دوم، heartbeat و
        مهلت <Ltr>max.poll.interval.ms</Ltr> وارد ماجرا می‌شوند.
      </p>

      <ConsumerPollExplainer />

      <p>
        به گام ۵ برگردید: وقتی لاگ خالی است، Broker درخواست را تا{' '}
        <Ltr>fetch.max.wait.ms</Ltr> نگه می‌دارد و بعد پاسخ خالی می‌دهد. همین
        رفتار است که حلقهٔ <Ltr>poll</Ltr> را از یک busy loop بی‌فایده جدا
        می‌کند. در گام‌های ۹ تا ۱۱ هم دقت کنید که heartbeat همچنان می‌رسد، اما
        چون <Ltr>poll</Ltr> بعدی دیر می‌آید، Coordinator مصرف‌کننده را از گروه
        حذف می‌کند.
      </p>

      <h2>۴. heartbeat، session.timeout و max.poll.interval</h2>
      <p>
        زنده‌بودن مصرف‌کننده با دو مکانیزم جدا سنجیده می‌شود و اشتباه رایج این
        است که آن‌ها را یکی بدانیم:
      </p>
      <ul>
        <li>
          <strong>heartbeat:</strong> یک thread جداگانه داخل مصرف‌کننده هر{' '}
          <Ltr>heartbeat.interval.ms</Ltr> (پیش‌فرض ۳ ثانیه) به Group
          Coordinator پیام می‌فرستد. اگر تا <Ltr>session.timeout.ms</Ltr>{' '}
          (پیش‌فرض ۴۵ ثانیه) هیچ heartbeat نرسد، مصرف‌کننده مرده فرض می‌شود و
          از گروه بیرون می‌رود.
        </li>
        <li>
          <strong>پیشرفت حلقهٔ poll:</strong> اگر بین دو <Ltr>poll</Ltr> بیشتر
          از <Ltr>max.poll.interval.ms</Ltr> (پیش‌فرض ۵ دقیقه) فاصله بیفتد،
          Coordinator مصرف‌کننده را از گروه حذف می‌کند، حتی اگر heartbeatها
          مرتب رسیده باشند. منطقش ساده است: heartbeat ثابت می‌کند پروسه زنده
          است، ولی ثابت نمی‌کند داده را پردازش می‌کند.
        </li>
      </ul>
      <p>
        پس دو سناریوی متفاوت داریم. اگر thread اصلی قفل شود، JVM در حالت{' '}
        <Ltr>stop-the-world</Ltr> بماند یا شبکه قطع شود، heartbeat نمی‌رسد و{' '}
        <Ltr>session.timeout.ms</Ltr> فعال می‌شود. اگر پردازش یک دسته طولانی
        شود ولی پروسه سالم باشد، heartbeat می‌رسد اما <Ltr>poll</Ltr> بعدی دیر
        می‌آید و <Ltr>max.poll.interval.ms</Ltr> فعال می‌شود.
      </p>
      <p>
        نتیجهٔ هر دو حالت یکی است: <Ltr>Rebalance</Ltr>. پارتیشن‌ها بین
        مصرف‌کننده‌های باقی‌مانده پخش می‌شوند و مصرف‌کنندهٔ برگشته از آخرین
        offset commitشده ادامه می‌دهد. اگر commit بعد از پردازش انجام شده باشد،
        دستهٔ نیمه‌کاره دوباره پردازش می‌شود؛ یعنی احتمال پردازش تکراری وجود
        دارد. این رفتار <Ltr>at-least-once</Ltr> است و در درس{' '}
        <Ltr>Semanticهای تحویل</Ltr> کامل می‌شود.
      </p>
      <Callout variant="warning" title="heartbeat جای پردازش را نمی‌گیرد">
        <p>
          زیاد کردن <Ltr>heartbeat.interval.ms</Ltr> یا{' '}
          <Ltr>session.timeout.ms</Ltr> مشکل پردازش کند را حل نمی‌کند. اگر
          پردازش از <Ltr>max.poll.interval.ms</Ltr> بیشتر طول می‌کشد، یا باید
          حجم هر دسته را کم کنید، یا کار سنگین را به thread دیگری بسپارید، یا
          آگاهانه این مهلت را بالا ببرید.
        </p>
      </Callout>

      <h2>۵. عدسی SRE: lag، rebalance و commit</h2>
      <p>
        سلامت مصرف‌کننده را با سه دسته متریک بسنجید: پیشرفت، تأخیر و پایداری
        گروه.
      </p>
      <ul>
        <li>
          <Ltr>records-lag-max</Ltr> و <Ltr>records-lag</Ltr>: فاصلهٔ
          مصرف‌کننده با انتهای لاگ؛ روند صعودی پایدار یعنی مصرف‌کننده از بار
          عقب است.
        </li>
        <li>
          <Ltr>records-consumed-rate</Ltr>: نرخ واقعی مصرف؛ آن را با نرخ تولید
          مقایسه کنید.
        </li>
        <li>
          <Ltr>commit-latency-avg</Ltr> و <Ltr>commit-latency-max</Ltr>: کندی
          commit معمولاً یعنی فشار روی <Ltr>__consumer_offsets</Ltr> یا شبکه.
        </li>
        <li>
          <Ltr>last-poll-seconds-ago</Ltr>: اگر نزدیک{' '}
          <Ltr>max.poll.interval.ms</Ltr> شود، rebalance در راه است.
        </li>
        <li>
          <Ltr>rebalance-rate-per-hour</Ltr> و{' '}
          <Ltr>rebalance-latency-avg</Ltr>: نرخ و هزینهٔ rebalance؛ نرخ بالا
          یعنی عضویت گروه ناپایدار است.
        </li>
        <li>
          <Ltr>assigned-partitions</Ltr>: اگر مدام صفر و مثبت می‌شود، گروه در
          حال flapping است.
        </li>
      </ul>
      <p>
        برای یک بررسی سریع بدون داشبورد، وضعیت گروه را مستقیم از خط فرمان
        ببینید:
      </p>
      <CodeBlock
        code={describeGroup}
        language="bash"
        filename="describe-group.sh"
      />
      <p>
        در خروجی، <Ltr>CURRENT-OFFSET</Ltr> آخرین offset commitشده و{' '}
        <Ltr>LOG-END-OFFSET</Ltr> انتهای لاگ است. تفاوت این دو همان{' '}
        <Ltr>LAG</Ltr> است؛ اگر <Ltr>position</Ltr> مصرف‌کننده جلو برود ولی
        commit نشود، این دو عدد از هم فاصله می‌گیرند. اگر ستون{' '}
        <Ltr>CONSUMER-ID</Ltr> خالی باشد، یعنی هیچ مصرف‌کننده‌ای در آن لحظه
        عضو گروه نیست.
      </p>
      <p>
        سه حالت خرابی را از هم جدا کنید. اول، <strong>lag صعودی با CPU سالم</strong>:
        احتمالاً پردازش یا I/O پایین‌دستی کند است. دوم،{' '}
        <strong>rebalance پیاپی</strong>: پردازش از{' '}
        <Ltr>max.poll.interval.ms</Ltr> عبور می‌کند یا <Ltr>session.timeout.ms</Ltr>{' '}
        برای محیط شبکه‌ای شما کوتاه است. سوم، <strong>مصرف تکراری</strong>:
        commit بعد از پردازش انجام نمی‌شود یا پروسه بین پردازش و commit می‌میرد.
      </p>
      <Callout variant="tip" title="در Kubernetes از static membership استفاده کنید">
        <p>
          با تنظیم <Ltr>group.instance.id</Ltr>، یک مصرف‌کننده پس از ری‌استارت
          سریع همان هویت قبلی را می‌گیرد و تا <Ltr>session.timeout.ms</Ltr>{' '}
          rebalance غیرضروری رخ نمی‌دهد. این کار برای podهایی که مرتب جابه‌جا
          می‌شوند، تعداد rebalanceها را به‌طور محسوسی کم می‌کند.
        </p>
      </Callout>

      <h2>۶. تنظیمات Fetch و poll در عمل</h2>
      <p>
        بیشتر تنظیمات این درس دو هدف متضاد دارند: <strong>تأخیر کم</strong> در
        برابر <strong>توان عملیاتی بالا</strong>. جدول زیر نقطهٔ شروع خوبی است:
      </p>
      <table>
        <thead>
          <tr>
            <th>تنظیم</th>
            <th>پیش‌فرض</th>
            <th>اثر</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>fetch.min.bytes</Ltr></td>
            <td><Ltr>1</Ltr></td>
            <td>حداقل داده‌ای که Broker قبل از پاسخ جمع می‌کند؛ بیشتر یعنی توان عملیاتی بیشتر و تأخیر بیشتر.</td>
          </tr>
          <tr>
            <td><Ltr>fetch.max.wait.ms</Ltr></td>
            <td><Ltr>500</Ltr></td>
            <td>حداکثر انتظار Broker وقتی <Ltr>fetch.min.bytes</Ltr> پر نشده است.</td>
          </tr>
          <tr>
            <td><Ltr>max.partition.fetch.bytes</Ltr></td>
            <td><Ltr>1048576</Ltr></td>
            <td>سقف بایت هر پارتیشن در هر درخواست Fetch.</td>
          </tr>
          <tr>
            <td><Ltr>fetch.max.bytes</Ltr></td>
            <td><Ltr>52428800</Ltr></td>
            <td>سقف کل پاسخ Fetch؛ اگر رکورد اول از این بزرگ‌تر باشد، باز هم برگردانده می‌شود.</td>
          </tr>
          <tr>
            <td><Ltr>max.poll.records</Ltr></td>
            <td><Ltr>500</Ltr></td>
            <td>سقف رکوردهای هر <Ltr>poll</Ltr>؛ کم کردنش پردازش هر دسته را کوتاه می‌کند.</td>
          </tr>
          <tr>
            <td><Ltr>max.poll.interval.ms</Ltr></td>
            <td><Ltr>300000</Ltr></td>
            <td>سقف فاصلهٔ دو <Ltr>poll</Ltr>؛ عبور از آن یعنی حذف از گروه.</td>
          </tr>
          <tr>
            <td><Ltr>heartbeat.interval.ms</Ltr></td>
            <td><Ltr>3000</Ltr></td>
            <td>فاصلهٔ ارسال heartbeat؛ معمولاً یک‌سوم <Ltr>session.timeout.ms</Ltr>.</td>
          </tr>
          <tr>
            <td><Ltr>session.timeout.ms</Ltr></td>
            <td><Ltr>45000</Ltr></td>
            <td>مدتی که Coordinator بدون heartbeat منتظر می‌ماند.</td>
          </tr>
        </tbody>
      </table>
      <p>
        برای مسیرهای حساس به تأخیر، <Ltr>fetch.min.bytes</Ltr> و{' '}
        <Ltr>fetch.max.wait.ms</Ltr> را کوچک نگه دارید تا رکورد تازه سریع برسد.
        برای مسیرهای پرحجم، مقدار <Ltr>fetch.min.bytes</Ltr> را بالا ببرید تا
        Broker بچ بزرگ‌تری بسازد و تعداد رفت‌وبرگشت‌ها کم شود. در هر دو حالت،{' '}
        <Ltr>max.poll.records</Ltr> را طوری انتخاب کنید که پردازش یک دسته با
        حاشیهٔ امن زیر <Ltr>max.poll.interval.ms</Ltr> تمام شود.
      </p>

      <h2>۷. اشتباه‌های رایج عملیاتی</h2>
      <Callout variant="danger" title="پردازش سنگین داخل حلقهٔ poll">
        <p>
          اگر پردازش هر دسته بیشتر از <Ltr>max.poll.interval.ms</Ltr> طول بکشد،
          مصرف‌کننده از گروه حذف می‌شود و حلقهٔ rebalance تکرار می‌شود. حجم دسته
          را با <Ltr>max.poll.records</Ltr> کم کنید یا پردازش را به یک صف و
          thread جدا بسپارید. فقط مراقب باشید که commit بعد از پردازش واقعی انجام
          شود، نه بعد از تحویل به صف.
        </p>
      </Callout>
      <Callout variant="danger" title="session.timeout.ms کوتاه در شبکهٔ پرتأخیر">
        <p>
          اگر <Ltr>session.timeout.ms</Ltr> از تأخیر شبکه کمتر باشد، heartbeat
          دیر می‌رسد و گروه مدام rebalance می‌کند. این را با پردازش کند اشتباه
          نگیرید؛ در این حالت <Ltr>last-poll-seconds-ago</Ltr> سالم است ولی
          <Ltr>rebalance-rate-per-hour</Ltr> بالاست.
        </p>
      </Callout>
      <Callout variant="danger" title="یک KafkaConsumer در چند thread">
        <p>
          <Ltr>KafkaConsumer</Ltr> thread-safe نیست. برای موازی‌سازی، چند
          مصرف‌کننده در یک گروه بسازید، نه چند thread روی یک مصرف‌کننده.
        </p>
      </Callout>
      <Callout variant="warning" title="حلقهٔ تنگ با poll(0)">
        <p>
          <Ltr>poll(Duration.ZERO)</Ltr> فوراً برمی‌گردد. اگر در یک{' '}
          <Ltr>while</Ltr> بدون هیچ وقفه‌ای صدا زده شود، CPU و شبکه را می‌سوزاند
          و به بروکر فشار می‌آورد. از یک مهلت معقول مثل ۵۰۰ میلی‌ثانیه استفاده
          کنید.
        </p>
      </Callout>
      <Callout variant="info" title="commit خودکار را باور نکنید">
        <p>
          با <Ltr>enable.auto.commit=true</Ltr>، commit در فاصله‌های{' '}
          <Ltr>auto.commit.interval.ms</Ltr> و معمولاً قبل از پردازش کامل دسته
          انجام می‌شود. اگر پروسه بعد از commit و قبل از پردازش بمیرد، رکوردها
          از دست می‌روند. برای داده‌های مهم، commit دستی بعد از پردازش را انتخاب
          کنید.
        </p>
      </Callout>

      <DeepDive title="برای توسعه‌دهندهٔ اپلیکیشن: حلقهٔ poll و خروج تمیز">
        <p>
          این بخش برای کسی است که خود کد <Ltr>Consumer</Ltr> را می‌نویسد. برای
          مسیر عملیاتی دوره لازم نیست و می‌توانید از آن رد شوید.
        </p>
        <DeepDiveSection title="حلقهٔ poll در کد">
          <p>
            در کد، حلقه تا زمانی که thread قطع نشده ادامه دارد؛ هر{' '}
            <Ltr>poll</Ltr> ممکن است لیست خالی برگرداند و commit فقط بعد از
            پردازش موفق انجام می‌شود.
          </p>
          <CodeBlock code={pollLoop} language="java" filename="PollLoop.java" />
        </DeepDiveSection>
        <DeepDiveSection title="خروج تمیز با wakeup">
          <p>
            <Ltr>poll</Ltr> می‌تواند تا پایان مهلتش بلوکه بماند. برای خاموشی
            سریع، از یک thread دیگر <Ltr>wakeup()</Ltr> را صدا بزنید؛{' '}
            <Ltr>poll</Ltr> با <Ltr>WakeupException</Ltr> برمی‌گردد و می‌توانید
            حلقه را ببندید و <Ltr>close()</Ltr> بزنید. <Ltr>close()</Ltr> قبل از
            خروج، آخرین offsetها را commit می‌کند و عضویت را تمیز پایان می‌دهد.
          </p>
          <CodeBlock
            code={wakeupExample}
            language="java"
            filename="WakeupAndClose.java"
          />
        </DeepDiveSection>
        <DeepDiveSection title="long polling دقیقاً چطور کار می‌کند؟">
          <p>
            Broker درخواست Fetch را فوراً رد نمی‌کند. اگر دادهٔ موجود کمتر از{' '}
            <Ltr>fetch.min.bytes</Ltr> باشد، درخواست را در صف نگه می‌دارد و تا
            رسیدن دادهٔ کافی یا پایان <Ltr>fetch.max.wait.ms</Ltr> صبر می‌کند.
            این انتظار روی thread درخواست‌های شبکه انجام نمی‌شود؛ کافکا از{' '}
            <Ltr>purgatory</Ltr> استفاده می‌کند تا درخواست‌های معلق بدون اشغال
            thread منتظر بمانند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="max.poll.records در برابر بایت‌های Fetch">
          <p>
            مصرف‌کننده در هر درخواست ممکن است بیش از <Ltr>max.poll.records</Ltr>{' '}
            رکورد دریافت کند و آن‌ها را در حافظه نگه دارد. <Ltr>poll</Ltr> بعدی
            می‌تواند بدون رفت‌وبرگشت شبکه، از همان بافر بخواند. پس{' '}
            <Ltr>max.poll.records</Ltr> فقط اندازهٔ دستهٔ تحویلی به برنامه را
            کنترل می‌کند، نه اندازهٔ درخواست شبکه.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Fetch Session و درخواست‌های افزایشی">
          <p>
            از <Ltr>Kafka 1.1</Ltr> و با <Ltr>KIP-227</Ltr>، مصرف‌کننده و بروکر
            یک <Ltr>FetchSession</Ltr> نگه می‌دارند تا در درخواست‌های بعدی فقط
            تغییرات پارتیشن‌ها رد و بدل شود. این کار در خوشه‌های بزرگ با صدها
            پارتیشن، حجم متادیتای هر درخواست Fetch را به‌شدت کم می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="heartbeat thread و static membership">
          <p>
            heartbeat در thread جداگانه‌ای به نام <Ltr>HeartbeatThread</Ltr>{' '}
            اجرا می‌شود تا حتی وقتی thread اصلی مشغول پردازش است، عضویت زنده
            بماند. با تنظیم <Ltr>group.instance.id</Ltr> می‌توانید{' '}
            <Ltr>static membership</Ltr> فعال کنید: اگر مصرف‌کننده سریع ری‌استارت
            شود، قبل از <Ltr>session.timeout.ms</Ltr> دوباره همان هویت را
            می‌گیرد و rebalance غیرضروری رخ نمی‌دهد.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          کافکا Pull است: مصرف‌کننده با <Ltr>poll</Ltr> داده را می‌کشد و سرعتش
          را خودش تعیین می‌کند.
        </li>
        <li>
          <Ltr>poll</Ltr> خالی طبیعی است؛ long polling با{' '}
          <Ltr>fetch.min.bytes</Ltr> و <Ltr>fetch.max.wait.ms</Ltr> از busy loop
          جلوگیری می‌کند.
        </li>
        <li>
          heartbeat زنده‌بودن پروسه را نشان می‌دهد و{' '}
          <Ltr>max.poll.interval.ms</Ltr> پیشرفت حلقه را؛ هر دو به rebalance
          می‌رسند.
        </li>
        <li>
          lag صعودی، rebalance پیاپی و مصرف تکراری سه حالت خرابی جدا هستند و هر
          کدام متریک و علت خودشان را دارند.
        </li>
        <li>
          برای بررسی سریع از <Ltr>kafka-consumer-groups.sh --describe</Ltr> و
          برای پایداری در Kubernetes از <Ltr>group.instance.id</Ltr> استفاده
          کنید.
        </li>
      </ul>
      <p>
        حالا می‌دانیم مصرف‌کننده چطور داده را می‌کشد. قدم بعدی این است که ببینیم
        چند مصرف‌کننده چطور یک تاپیک را بین خود تقسیم می‌کنند، وقتی عضوی اضافه یا
        حذف می‌شود چه اتفاقی می‌افتد و چرا rebalance هم لازم است و هم دردسر.
      </p>
    </>
  )
}
