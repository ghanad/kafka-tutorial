import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { StreamsTopologyExplainer } from '../../components/simulators/StreamsTopologyExplainer'

const streamProps = `Properties props = new Properties();
props.put(StreamsConfig.APPLICATION_ID_CONFIG, "paid-counter");
props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka-1:9092");
props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, SpecificAvroSerde.class);
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);
props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 4);`

const topologyCode = `StreamsBuilder builder = new StreamsBuilder();

// هر رکورد یک رویداد مستقل است؛ KStream تاریخچه را نگه نمی‌دارد
KStream<String, Order> orders = builder.stream(
    "orders",
    Consumed.with(Serdes.String(), orderSerde)
);

// فیلتر، گروه‌بندی بر اساس Key و شمارش در یک state store
KTable<String, Long> paidCounts = orders
    .filter((key, order) -> "paid".equals(order.getStatus()))
    .groupByKey()
    .count(Materialized.as("paid-counts-store"));

// نتیجه دوباره به یک تاپیک معمولی نوشته می‌شود
paidCounts.toStream().to(
    "paid-counts",
    Produced.with(Serdes.String(), Serdes.Long())
);

KafkaStreams streams = new KafkaStreams(builder.build(), props);
streams.start();`

const windowExample = `// پنجره ثابت ۵ دقیقه‌ای روی تعداد سفارش هر مشتری
orders
    .groupByKey()
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
    .count(Materialized.as("orders-per-5m"))
    .toStream()
    .map((windowedKey, count) ->
        KeyValue.pair(windowedKey.key(), count))
    .to("orders-per-5m", Produced.with(Serdes.String(), Serdes.Long()));`

export function KafkaStreamsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا کافکا را به‌عنوان یک لاگ رویداد دیدیم: producer می‌نویسد،
        consumer می‌خواند و Connect داده را جابه‌جا می‌کند. اما بسیاری از
        نیازهای واقعی به خواندن ساده ختم نمی‌شوند؛ باید فیلتر کنیم، بشماریم،
        دو جریان را join کنیم یا وضعیت هر مشتری را نگه داریم.{' '}
        <Ltr>Kafka Streams</Ltr> یک کتابخانه Java است که همین کار را بدون
        خوشه جداگانه انجام می‌دهد: برنامه شما اجرا می‌شود، از کافکا می‌خواند و
        نتیجه را دوباره در کافکا می‌نویسد. در این درس مدل ذهنی{' '}
        <Ltr>KStream</Ltr> و <Ltr>KTable</Ltr>، state store و پنجره‌بندی را
        می‌بینیم.
      </p>

      <Callout variant="info" title="Streams یک کتابخانه است، نه یک سرویس">
        برای Kafka Streams خوشه‌ای جدا نصب نمی‌کنید. همان برنامه Java یا Kotlin
        شماست که در کانتینر یا روی سرور اجرا می‌شود. کافکا فقط تاپیک‌های ورودی،
        خروجی و تاپیک‌های داخلی state را می‌بیند. همین موضوع، هزینه عملیاتی را
        از Flink و Spark پایین‌تر می‌آورد.
      </Callout>

      <h2>۱. Streams چه چیزی به کافکا اضافه می‌کند؟</h2>
      <p>
        یک consumer معمولی می‌تواند همین منطق را هم پیاده کند، اما باید خودتان
        مدیریت کنید: تقسیم پارتیشن بین نمونه‌ها، ذخیره وضعیت، بازیابی پس از
        خطا، commit هماهنگ با خروجی و تغییر تعداد نمونه‌ها. Streams این‌ها را
        به کتابخانه می‌سپارد:
      </p>
      <ul>
        <li>
          <strong>مدل پردازش:</strong> <Ltr>KStream</Ltr> برای جریان رویداد و
          <Ltr>KTable</Ltr> برای آخرین وضعیت هر Key.
        </li>
        <li>
          <strong>State store:</strong> وضعیت محلی روی دیسک، معمولاً با{' '}
          <Ltr>RocksDB</Ltr>، برای شمارش، تجمیع و join.
        </li>
        <li>
          <strong>تحمل خطا:</strong> هر تغییر state در یک تاپیک{' '}
          <Ltr>changelog</Ltr> ثبت می‌شود تا بعد از restart بازسازی شود.
        </li>
        <li>
          <strong>مقیاس‌پذیری:</strong> هر نمونه برنامه چند پارتیشن را می‌گیرد
          و با اضافه شدن نمونه، taskها جابه‌جا می‌شوند.
        </li>
        <li>
          <strong>پنجره و join:</strong> تجمیع روی بازه زمانی و اتصال دو جریان
          با کلید مشترک.
        </li>
      </ul>

      <h2>۲. KStream و KTable: دو نگاه به یک داده</h2>
      <p>
        مهم‌ترین تصمیم در Streams این است که هر تاپیک را چگونه ببینید:
      </p>
      <table>
        <thead>
          <tr>
            <th>ویژگی</th>
            <th><Ltr>KStream</Ltr></th>
            <th><Ltr>KTable</Ltr></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>معنی</td>
            <td>توالی فقط‌افزودنی رویدادها</td>
            <td>آخرین مقدار برای هر Key</td>
          </tr>
          <tr>
            <td>رکورد تکراری با یک Key</td>
            <td>همه دیده می‌شوند</td>
            <td>فقط آخرین مقدار معتبر است</td>
          </tr>
          <tr>
            <td>تاریخچه</td>
            <td>کامل</td>
            <td>فقط وضعیت فعلی</td>
          </tr>
          <tr>
            <td>مثال</td>
            <td>رویدادهای سفارش، کلیک، پرداخت</td>
            <td>موجودی حساب، وضعیت سفارش، پروفایل مشتری</td>
          </tr>
          <tr>
            <td>عملیات رایج</td>
            <td><Ltr>filter</Ltr>، <Ltr>map</Ltr>، <Ltr>join</Ltr></td>
            <td><Ltr>count</Ltr>، <Ltr>reduce</Ltr>، <Ltr>aggregate</Ltr></td>
          </tr>
        </tbody>
      </table>
      <p>
        یک تاپیک می‌تواند هم به‌عنوان <Ltr>KStream</Ltr> خوانده شود و هم به‌عنوان
        <Ltr>KTable</Ltr>؛ این انتخاب در کد شماست، نه در کافکا. اگر هر رکورد
        برایتان یک اتفاق مهم است، <Ltr>KStream</Ltr> بگیرید. اگر فقط آخرین
        وضعیت هر موجودیت مهم است، <Ltr>KTable</Ltr> طبیعی‌تر است.
      </p>

      <h2>۳. یک topology ساده</h2>
      <p>
        نمونه زیر سفارش‌های پرداخت‌شده را می‌شمارد و نتیجه را در تاپیک{' '}
        <Ltr>paid-counts</Ltr> می‌نویسد. توجه کنید که هیچ consumer یا producer
        دستی ساخته نمی‌شود؛ topology همه را می‌سازد:
      </p>
      <CodeBlock code={topologyCode} language="java" filename="PaidCounter.java" />
      <p>
        تنظیمات اتصال و تضمین پردازش هم چند خط است:
      </p>
      <CodeBlock code={streamProps} language="java" filename="streams.properties.java" />
      <p>
        <Ltr>APPLICATION_ID</Ltr> هم نام گروه مصرف‌کننده است و هم پیشوند
        تاپیک‌های داخلی. اگر دو برنامه با یک <Ltr>APPLICATION_ID</Ltr> اجرا
        شوند، Streams آن‌ها را نمونه‌های یک برنامه می‌داند و کار را بینشان
        تقسیم می‌کند؛ اگر دو برنامه مستقل باشند، شناسه‌ها باید متفاوت باشند.
      </p>

      <h2>۴. یک رکورد چطور پردازش می‌شود؟</h2>
      <p>
        در توضیح تعاملی زیر، چهار رکورد از تاپیک <Ltr>orders</Ltr> را دنبال
        می‌کنیم. ببینید کدام رکورد از فیلتر رد می‌شود، شمارنده کجا نگه داشته
        می‌شود و هر به‌روزرسانی چطور به یک رکورد جدید در تاپیک خروجی تبدیل
        می‌شود.
      </p>
      <StreamsTopologyExplainer />
      <p>
        در گام پنجم، رکورد <Ltr>unpaid</Ltr> نه در state store اثری می‌گذارد و
        نه در خروجی. در گام ششم، شمارنده از مقدار قبلی در state store خوانده
        می‌شود؛ Streams برای این کار به تاپیک ورودی برنمی‌گردد. در گام دهم،
        بازسازی state از <Ltr>changelog</Ltr> نشان می‌دهد چرا وضعیت محلی با
        از کار افتادن برنامه از بین نمی‌رود.
      </p>

      <h2>۵. State store و تحمل خطا</h2>
      <p>
        وقتی می‌گویید <Ltr>count()</Ltr>، Streams یک state store محلی می‌سازد.
        هر تغییر در این store در یک تاپیک داخلی به نام{' '}
        <Ltr>changelog</Ltr> هم نوشته می‌شود. اگر نمونه برنامه از کار بیفتد،
        نمونه جدید state را از همان changelog بازسازی می‌کند و از آفستی که
        commit شده ادامه می‌دهد.
      </p>
      <ul>
        <li>
          <strong>State محلی:</strong> روی دیسک همان نمونه، معمولاً با{' '}
          <Ltr>RocksDB</Ltr>؛ خواندن از آن بسیار سریع است.
        </li>
        <li>
          <strong>Changelog:</strong> نسخه بادوام همان state در کافکا؛ با
          <Ltr>cleanup.policy=compact</Ltr> نگه داشته می‌شود.
        </li>
        <li>
          <strong>Standby replica:</strong> یک نمونه دیگر state را گرم نگه
          می‌دارد تا در rebalance، بازیابی فوری باشد.
        </li>
      </ul>
      <Callout variant="warning" title="state store را با دیتابیس اشتباه نگیرید">
        state store برای پردازش داخلی Streams است، نه یک دیتابیس مشترک که
        سرویس‌های دیگر به آن وصل شوند. برای خواندن وضعیت از بیرون، نتیجه را در
        یک تاپیک بنویسید یا از <Ltr>interactive queries</Ltr> استفاده کنید.
      </Callout>

      <h2>۶. پنجره‌ها و join</h2>
      <p>
        بسیاری از سؤال‌ها بازه زمانی دارند: «تعداد سفارش در پنج دقیقه گذشته
        چقدر بود؟» Streams چهار نوع پنجره اصلی دارد:
      </p>
      <table>
        <thead>
          <tr>
            <th>نوع پنجره</th>
            <th>رفتار</th>
            <th>کاربرد</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>Tumbling</Ltr></td>
            <td>بازه‌های ثابت و بدون هم‌پوشانی</td>
            <td>گزارش ساعتی یا روزانه</td>
          </tr>
          <tr>
            <td><Ltr>Hopping</Ltr></td>
            <td>بازه‌های هم‌پوشان با گام مشخص</td>
            <td>میانگین متحرک</td>
          </tr>
          <tr>
            <td><Ltr>Sliding</Ltr></td>
            <td>پنجره حول هر رویداد</td>
            <td>تحلیل نزدیک‌ترین رویدادها</td>
          </tr>
          <tr>
            <td><Ltr>Session</Ltr></td>
            <td>بر اساس فاصله بین رویدادها</td>
            <td>نشست کاربر و رفتار پیوسته</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={windowExample} language="java" filename="WindowedCount.java" />
      <p>
        join هم در Streams طبیعی است: <Ltr>stream-table join</Ltr> برای غنی‌سازی
        هر رویداد با آخرین وضعیت یک موجودیت، <Ltr>stream-stream join</Ltr> برای
        تطبیق دو رویداد در یک بازه زمانی، و <Ltr>table-table join</Ltr> برای
        ترکیب دو وضعیت. شرط اصلی این است که هر دو طرف بر اساس همان Key
        پارتیشن شده باشند؛ در غیر این صورت Streams یک تاپیک{' '}
        <Ltr>repartition</Ltr> داخلی می‌سازد.
      </p>

      <h2>۷. Streams یا Flink یا ksqlDB؟</h2>
      <table>
        <thead>
          <tr>
            <th>معیار</th>
            <th><Ltr>Kafka Streams</Ltr></th>
            <th><Ltr>Flink</Ltr></th>
            <th><Ltr>ksqlDB</Ltr></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>مدل اجرا</td>
            <td>کتابخانه داخل برنامه شما</td>
            <td>خوشه پردازش جدا</td>
            <td>سرور SQL روی کافکا</td>
          </tr>
          <tr>
            <td>زبان</td>
            <td>Java و Kotlin</td>
            <td>Java، Python، SQL</td>
            <td>SQL</td>
          </tr>
          <tr>
            <td>هزینه عملیاتی</td>
            <td>کم؛ فقط برنامه شما</td>
            <td>زیاد؛ خوشه و resource manager</td>
            <td>متوسط؛ یک سرویس اضافه</td>
          </tr>
          <tr>
            <td>پنجره و state</td>
            <td>خوب برای اکثر نیازها</td>
            <td>بسیار قدرتمند و بالغ</td>
            <td>مناسب پرسش‌های SQLی</td>
          </tr>
          <tr>
            <td>مناسب برای</td>
            <td>میکروسرویس‌ها و جریان‌های درون‌برنامه</td>
            <td>پردازش سنگین، چند منبع و batch</td>
            <td>تیم داده و تحلیل سریع</td>
          </tr>
        </tbody>
      </table>
      <p>
        اگر برنامه‌تان Java است و می‌خواهید منطق کسب‌وکار را کنار همان سرویس
        نگه دارید، Streams ساده‌ترین انتخاب است. اگر به پردازش چند منبع،
        backfill سنگین یا batch و stream یکپارچه نیاز دارید، Flink ابزار
        مناسب‌تری است. اگر تیم شما SQL می‌داند و می‌خواهد سریع جریان بسازد،
        ksqlDB را بررسی کنید.
      </p>

      <DeepDive title="زیر کاپوت: task، thread، rebalance و exactly-once">
        <DeepDiveSection title="task و thread">
          <p>
            Streams هر پارتیشن ورودی را به یک <Ltr>task</Ltr> نسبت می‌دهد.
            taskها بین threadهای یک نمونه و بین نمونه‌های مختلف پخش می‌شوند.
            حداکثر موازی‌سازی شما برابر تعداد پارتیشن‌های تاپیک ورودی است؛
            نمونه اضافه‌تر بدون پارتیشن اضافه بی‌کار می‌ماند. به همین دلیل
            تعداد پارتیشن را از ابتدا با رشد آینده هماهنگ انتخاب کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="rebalance و warm-up">
          <p>
            وقتی نمونه جدیدی اضافه می‌شود، taskها بین نمونه‌ها جابه‌جا می‌شوند.
            نمونه جدید باید state مربوط به task تازه‌اش را از changelog بازسازی
            کند؛ این مرحله می‌تواند چند دقیقه طول بکشد. با{' '}
            <Ltr>num.standby.replicas</Ltr> می‌توانید یک نسخه گرم از state را
            روی نمونه دیگر نگه دارید تا جابه‌جایی سریع‌تر باشد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="exactly-once در Streams">
          <p>
            با <Ltr>processing.guarantee=exactly_once_v2</Ltr>، خواندن از
            تاپیک ورودی، تغییر state و نوشتن در تاپیک خروجی در یک تراکنش کافکا
            انجام می‌شود. نتیجه این است که خروجی یا کامل دیده می‌شود یا اصلاً
            دیده نمی‌شود. این تضمین فقط داخل مرز کافکا معتبر است؛ اگر برنامه
            شما به یک دیتابیس بیرونی هم می‌نویسد، آن نوشتن جداگانه است و باید
            خودتان idempotent یا تراکنشی کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="تاپیک‌های داخلی را پاک نکنید">
          <p>
            Streams برای هر topology چند تاپیک داخلی می‌سازد:{' '}
            <Ltr>changelog</Ltr> برای state، <Ltr>repartition</Ltr> برای
            تغییر کلید و تاپیک‌های مربوط به commit تراکنش. این‌ها با{' '}
            <Ltr>APPLICATION_ID</Ltr> شما پیشوند می‌گیرند. پاک کردن یا تغییر
            دستی آن‌ها می‌تواند وضعیت برنامه را ناسازگار کند.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="تغییر APPLICATION_ID در محیط تولید">
        با تغییر شناسه، Streams یک برنامه کاملاً جدید می‌بیند: state از صفر
        شروع می‌شود و تاپیک‌های داخلی جدید ساخته می‌شوند. شناسه را ثابت نگه
        دارید و برای نسخه جدید فقط کد را تغییر دهید.
      </Callout>
      <Callout variant="warning" title="انتظار موازی‌سازی بیشتر از تعداد پارتیشن">
        اگر تاپیک ورودی سه پارتیشن دارد، ده نمونه برنامه هم فقط سه task فعال
        دارند. تعداد پارتیشن را با ظرفیت پردازش هماهنگ کنید.
      </Callout>
      <Callout variant="warning" title="نگه‌داشتن state بی‌نهایت">
        شمارش بدون پنجره برای هر Key تا ابد رشد می‌کند. برای موجودیت‌های
        بی‌شمار، پنجره یا سیاست انقضا برای state تعریف کنید.
      </Callout>
      <Callout variant="info" title="Streams جای ذخیره‌سازی دائمی نیست">
        state store برای پردازش است، نه منبع حقیقت. اگر داده باید سال‌ها بماند،
        آن را در تاپیکی با retention مناسب یا در دیتابیس مقصد نگه دارید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          Kafka Streams یک کتابخانه است که داخل برنامه شما اجرا می‌شود و خوشه
          جداگانه نمی‌خواهد.
        </li>
        <li>
          <Ltr>KStream</Ltr> توالی رویدادها و <Ltr>KTable</Ltr> آخرین وضعیت هر
          Key است؛ یک تاپیک می‌تواند هر دو نگاه را داشته باشد.
        </li>
        <li>
          state store محلی با changelog بادوام می‌شود و بعد از restart از همان
          جا بازسازی می‌شود.
        </li>
        <li>
          پنجره‌ها و joinها روی Key پارتیشن‌شده کار می‌کنند؛ کلید اشتباه یعنی
          repartition و هزینه اضافه.
        </li>
        <li>
          <Ltr>exactly_once_v2</Ltr> تضمین را داخل مرز کافکا می‌دهد، نه برای
          نوشتن در سیستم‌های بیرونی.
        </li>
      </ul>
      <p>
        با این درس، فصل اکوسیستم کامل می‌شود: Connect داده را جابه‌جا می‌کند،
        Schema Registry قرارداد داده را نگه می‌دارد و Streams داده را درون
        برنامه پردازش می‌کند. در فصل بعد سراغ امنیت، پایش و عملیات می‌رویم؛
        جایی که همین اجزا باید در محیط واقعی، قابل اعتماد و قابل مشاهده باشند.
      </p>
    </>
  )
}
