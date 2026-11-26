import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { AcksExplainer } from '../../components/simulators/AcksExplainer'

const acksConfig = `# producer.properties — انتخاب سطح تأیید
bootstrap.servers=localhost:9092
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=org.apache.kafka.common.serialization.StringSerializer

# 0    = هیچ تأییدی نمی‌خواهیم
# 1    = فقط تأیید لیدر
# all  = تأیید همه اعضای ISR (معادل -1)
acks=all`

const acksZero = `Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ProducerConfig.ACKS_CONFIG, "0");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
    StringSerializer.class.getName());
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
    StringSerializer.class.getName());

producer.send(record, (metadata, exception) -> {
    // با acks=0، offset همیشه -1 است
    // و خطاهای سمت بروکر هیچ‌وقت به این callback نمی‌رسند
    log.info("offset={}", metadata.offset());
});`

const acksAll = `# producer.properties — مسیر داده‌های مهم
acks=all
enable.idempotence=true
delivery.timeout.ms=120000`

const topicConfig = `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic payments \\
  --partitions 6 --replication-factor 3 \\
  --config min.insync.replicas=2`

const brokerConfig = `# server.properties — پیش‌فرض کل خوشه
min.insync.replicas=2
unclean.leader.election.enable=false`

const javaAll = `Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120_000);`

const errorHandling = `try {
    RecordMetadata metadata = producer.send(record).get();
    log.info("written: partition={} offset={}",
        metadata.partition(), metadata.offset());
} catch (ExecutionException e) {
    if (e.getCause() instanceof NotEnoughReplicasException) {
        // ISR کمتر از min.insync.replicas است؛ نوشتن عمداً رد شده
    }
    throw e;
}`

export function ProducerAcksContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در دو درس قبل دیدیم رکورد کجا ساخته می‌شود و به کدام پارتیشن می‌رود. اما
        سؤال اصلی هر کسی که دادهٔ مهمی می‌فرستد این است: وقتی <Ltr>send()</Ltr>{' '}
        برمی‌گردد، آیا داده واقعاً جایی امن است؟ پاسخ این سؤال به یک تنظیم
        برمی‌گردد: <Ltr>acks</Ltr>. در این درس می‌بینیم{' '}
        <Ltr>acks=0</Ltr>، <Ltr>acks=1</Ltr> و <Ltr>acks=all</Ltr> هر کدام
        Producer را منتظر چه چیزی نگه می‌دارند، چه چیزی را قربانی می‌کنند، و چرا{' '}
        <Ltr>acks=all</Ltr> بدون <Ltr>min.insync.replicas</Ltr> هم دوام کامل
        نمی‌دهد.
      </p>

      <h2>۱. acks چیست و چه چیزی را کنترل می‌کند؟</h2>
      <p>
        <Ltr>acks</Ltr> تعیین می‌کند Producer قبل از اینکه درخواست نوشتن را
        کامل‌شده بداند، منتظر تأیید چه کسانی بماند. این تنظیم سمت{' '}
        <strong>Producer</strong> است، نه سمت بروکر؛ یعنی تصمیم با کدی است که
        می‌فرستد، نه با تنظیمات خوشه. سه مقدار مجاز داریم:
      </p>
      <ul>
        <li>
          <Ltr>acks=0</Ltr>: Producer هیچ تأییدی نمی‌خواهد و بلافاصله برمی‌گردد.
        </li>
        <li>
          <Ltr>acks=1</Ltr>: فقط تأیید لیدر را می‌خواهد.
        </li>
        <li>
          <Ltr>acks=all</Ltr>: تأیید همهٔ اعضای <Ltr>ISR</Ltr> را می‌خواهد.{' '}
          <Ltr>acks=-1</Ltr> دقیقاً معادل <Ltr>all</Ltr> است.
        </li>
      </ul>
      <p>
        مسیر نوشتن را به یاد بیاورید: Producer رکورد را به لیدر می‌فرستد، لیدر آن
        را در انتهای لاگ خودش می‌نویسد و یک <Ltr>offset</Ltr> می‌دهد، بعد
        فالوورها با <Ltr>Fetch</Ltr> همان رکورد را می‌گیرند. <Ltr>acks</Ltr>{' '}
        می‌گوید Producer تا کدام نقطه از این مسیر صبر کند. هر چه بیشتر صبر کند،
        دوام بیشتر و تأخیر بیشتری می‌خرد.
      </p>
      <CodeBlock
        code={acksConfig}
        language="properties"
        filename="producer.properties"
      />
      <Callout variant="info" title="پیش‌فرض نسخه‌های جدید all است">
        <p>
          از <Ltr>Kafka 3.0</Ltr> به بعد پیش‌فرض <Ltr>acks</Ltr> مقدار{' '}
          <Ltr>all</Ltr> است (پیش از آن <Ltr>1</Ltr> بود). با این حال آن را
          صریح در کانفیگ بنویسید؛ کدها و فایل‌های تنظیمات قدیمی زیادی هنوز{' '}
          <Ltr>acks=1</Ltr> را با خود حمل می‌کنند و بعد از مهاجرت هم همان رفتار
          قبلی را ادامه می‌دهند.
        </p>
      </Callout>
      <p>
        نکتهٔ مهم این است که <Ltr>acks</Ltr> و <Ltr>min.insync.replicas</Ltr> دو
        تنظیم جدا هستند که فقط با هم معنا پیدا می‌کنند. اولی می‌گوید Producer
        چند تأیید می‌خواهد؛ دومی می‌گوید بروکر با چه حداقلی از نسخه‌های همگام
        حاضر است نوشتن را بپذیرد. در بخش ۵ می‌بینیم چرا یکی بدون دیگری کافی
        نیست.
      </p>

      <h2>۲. سه سطح در یک نگاه</h2>
      <table>
        <thead>
          <tr>
            <th>مقدار</th>
            <th>منتظر چه کسی می‌ماند</th>
            <th>
              <Ltr>offset</Ltr> در متادیتا
            </th>
            <th>ریسک اصلی</th>
            <th>نمونهٔ کاربرد</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>0</Ltr>
            </td>
            <td>هیچ‌کس</td>
            <td>
              همیشه <Ltr>-1</Ltr>
            </td>
            <td>گم شدن بی‌صدا، حتی بدون هیچ خطایی</td>
            <td>متریک، لاگ حجیم، داده‌ای که ارزش دوام ندارد</td>
          </tr>
          <tr>
            <td>
              <Ltr>1</Ltr>
            </td>
            <td>فقط لیدر</td>
            <td>
              <Ltr>offset</Ltr> واقعی
            </td>
            <td>مرگ لیدر قبل از رسیدن رکورد به فالوورها</td>
            <td>دادهٔ کم‌اهمیت، سازگاری با کد قدیمی</td>
          </tr>
          <tr>
            <td>
              <Ltr>all</Ltr> یا <Ltr>-1</Ltr>
            </td>
            <td>همهٔ اعضای <Ltr>ISR</Ltr></td>
            <td>
              <Ltr>offset</Ltr> واقعی
            </td>
            <td>
              فقط وقتی همهٔ <Ltr>ISR</Ltr> از بین بروند یا{' '}
              <Ltr>min.insync.replicas=1</Ltr> باشد
            </td>
            <td>رویداد کسب‌وکار، پرداخت، هر داده‌ای که حذفش هزینه دارد</td>
          </tr>
        </tbody>
      </table>
      <p>
        یک برداشت غلط رایج این است که <Ltr>acks=all</Ltr> یعنی «همهٔ
        Replicaها». نه؛ یعنی همهٔ اعضای <Ltr>ISR</Ltr>، یعنی نسخه‌هایی که همین
        حالا همگام‌اند. اگر یک فالوور عقب افتاده از <Ltr>ISR</Ltr> خارج شده
        باشد، تأیید Producer را معطل نمی‌کند. همین موضوع هم فرصت است (تأخیر
        کمتر) و هم خطر (آن نسخه دیگر پشتیبان محسوب نمی‌شود).
      </p>

      <h2>۳. acks=0: ارسال و فراموش</h2>
      <p>
        با <Ltr>acks=0</Ltr> رکورد فقط در بافر سوکت Producer قرار می‌گیرد و
        «فرستاده‌شده» حساب می‌شود. <Ltr>Future</Ltr> تقریباً بلافاصله کامل
        می‌شود و <Ltr>RecordMetadata</Ltr> هیچ <Ltr>offset</Ltr> واقعی ندارد؛
        مقدار آن همیشه <Ltr>-1</Ltr> است. مهم‌تر اینکه <Ltr>retries</Ltr> هم
        عملاً بی‌اثر می‌شود، چون Producer پاسخی نمی‌گیرد که با آن بفهمد ارسال
        شکست خورده است.
      </p>
      <CodeBlock
        code={acksZero}
        language="java"
        filename="FireAndForget.java"
      />
      <p>
        این حالت برای داده‌ای است که از دست رفتنش مسئله نیست: شمارندهٔ متریک،
        لاگ تشخیصی، یا جریانی که چند ثانیه بعد با دادهٔ تازه جایگزین می‌شود.
        مزیتش سادگی و کمترین تأخیر است؛ عیبش این است که خطاهای سمت بروکر —
        از کار افتادن لیدر، پر بودن دیسک، رد شدن به خاطر مجوز — هیچ‌وقت به
        برنامه نمی‌رسند. فقط خطاهای محلی مثل سریالایز یا نبود متادیتا ممکن است
        دیده شوند.
      </p>
      <Callout variant="danger" title="offset=-1 را جدی بگیرید">
        <p>
          اگر در لاگ‌ها <Ltr>offset=-1</Ltr> می‌بینید، یعنی Producer اصلاً
          نمی‌داند رکورد کجا نشسته و آیا نشسته است یا نه. این عدد را با{' '}
          <Ltr>offset=0</Ltr> یا «اولین رکورد» اشتباه نگیرید. برای ردیابی،
          شناسهٔ یکتا در خود رکورد بگذارید، نه در متادیتای ارسال.
        </p>
      </Callout>

      <h2>۴. acks=1: تأیید لیدر، نه دوام</h2>
      <p>
        با <Ltr>acks=1</Ltr> لیدر رکورد را در لاگ محلی خودش می‌نویسد و همان
        لحظه تأیید می‌دهد؛ بدون اینکه منتظر <Ltr>Fetch</Ltr> شدن فالوورها بماند.
        این یعنی یک پنجرهٔ زمانی وجود دارد که رکورد فقط روی یک نسخه است. اگر
        لیدر در همان پنجره از کار بیفتد، رکورد از بین می‌رود.
      </p>
      <p>
        نکتهٔ ظریف این است که حتی انتخاب لیدر «تمیز» هم این پنجره را کامل حذف
        نمی‌کند. اعضای <Ltr>ISR</Ltr> همگام محسوب می‌شوند، اما همگام یعنی
        عقب‌ماندگی کمتر از <Ltr>replica.lag.time.max.ms</Ltr> (پیش‌فرض ۳۰
        ثانیه)، نه یعنی «هیچ رکوردی عقب نیست». پس یک فالوور می‌تواند عضو{' '}
        <Ltr>ISR</Ltr> باشد، لیدر شود، و چند رکورد آخر را نداشته باشد. با{' '}
        <Ltr>acks=1</Ltr> این رکوردها از دست می‌روند، در حالی که Producer فکر
        می‌کند موفق بوده است.
      </p>
      <Callout variant="warning" title="acks=1 برای دادهٔ مهم کافی نیست">
        <p>
          <Ltr>acks=1</Ltr> فقط می‌گوید «لیدر رکورد را دید». نمی‌گوید «رکورد
          روی نسخهٔ دیگری هم هست» و نمی‌گوید «بعد از مرگ لیدر هم می‌ماند». اگر
          از دست رفتن حتی یک رکورد قابل قبول نیست، این سطح کافی نیست؛ حتی اگر
          تا امروز هیچ مشکلی پیش نیامده باشد.
        </p>
      </Callout>

      <h2>۵. acks=all: تأیید همهٔ اعضای ISR</h2>
      <p>
        با <Ltr>acks=all</Ltr> لیدر تا وقتی همهٔ اعضای <Ltr>ISR</Ltr> رکورد را
        ننوشته‌اند تأیید نمی‌دهد. این قوی‌ترین تضمینی است که Kafka برای نوشتن
        می‌دهد: تا زمانی که حداقل یک نسخهٔ همگام زنده بماند، رکورد تأییدشده از
        بین نمی‌رود. اما یک شرط پنهان دارد: <Ltr>ISR</Ltr> ممکن است کوچک شود.
        اگر <Ltr>ISR</Ltr> فقط لیدر باشد، <Ltr>acks=all</Ltr> هم عملاً همان{' '}
        <Ltr>acks=1</Ltr> می‌شود.
      </p>
      <p>
        اینجاست که <Ltr>min.insync.replicas</Ltr> وارد می‌شود. این تنظیم سمت
        بروکر یا Topic است و می‌گوید نوشتن با <Ltr>acks=all</Ltr> فقط وقتی
        پذیرفته شود که اندازهٔ <Ltr>ISR</Ltr> از آن کمتر نباشد. اگر کمتر باشد،
        لیدر درخواست را با خطای <Ltr>NOT_ENOUGH_REPLICAS</Ltr> رد می‌کند و
        هیچ رکوردی نوشته نمی‌شود. این رد شدن عمدی است: بهتر است نوشتن متوقف
        شود تا داده‌ای بدون پشتیبان تأیید شود.
      </p>
      <CodeBlock
        code={topicConfig}
        language="bash"
        filename="create-topic.sh"
      />
      <CodeBlock
        code={brokerConfig}
        language="properties"
        filename="server.properties"
      />
      <p>
        سمت Producer هم همین سطح را صریح تنظیم کنید و به مهلت تحویل فکر کنید:
      </p>
      <CodeBlock
        code={acksAll}
        language="properties"
        filename="producer.properties"
      />
      <p>
        ترکیب <Ltr>RF</Ltr>، <Ltr>min.insync.replicas</Ltr> و <Ltr>acks</Ltr>{' '}
        تعیین می‌کند چند بروکر می‌تواند از کار بیفتد بدون اینکه دادهٔ تأییدشده
        از بین برود یا نوشتن متوقف شود:
      </p>
      <table>
        <thead>
          <tr>
            <th>
              <Ltr>RF</Ltr>
            </th>
            <th>
              <Ltr>min.insync.replicas</Ltr>
            </th>
            <th>تحمل خرابی</th>
            <th>نتیجه</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>۳</td>
            <td>۲</td>
            <td>یک بروکر</td>
            <td>ترکیب توصیه‌شده برای دادهٔ مهم؛ نوشتن با دو نسخه ادامه دارد</td>
          </tr>
          <tr>
            <td>۳</td>
            <td>۱</td>
            <td>دو بروکر</td>
            <td>
              با <Ltr>acks=all</Ltr> هم اگر <Ltr>ISR</Ltr> به یک نسخه برسد،
              دادهٔ تأییدشده تک‌نسخه‌ای می‌شود
            </td>
          </tr>
          <tr>
            <td>۲</td>
            <td>۲</td>
            <td>هیچ</td>
            <td>با مرگ یک بروکر، نوشتن کاملاً متوقف می‌شود</td>
          </tr>
          <tr>
            <td>۲</td>
            <td>۱</td>
            <td>یک بروکر</td>
            <td>دوام ضعیف؛ همان ریسک تک‌نسخه‌ای</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="danger" title="acks=all با min.insync.replicas=1">
        <p>
          این ترکیب در ظاهر امن است و در عمل می‌تواند دادهٔ تأییدشده را از دست
          بدهد. کافی است دو فالوور از <Ltr>ISR</Ltr> خارج شوند؛ لیدر با{' '}
          <Ltr>|ISR|=1</Ltr> نوشتن را می‌پذیرد، تأیید می‌دهد و اگر همان لیدر
          بمیرد رکورد از بین می‌رود. برای دادهٔ مهم،{' '}
          <Ltr>min.insync.replicas=2</Ltr> را با <Ltr>RF=3</Ltr> ترکیب کنید.
        </p>
      </Callout>
      <p>
        هزینهٔ <Ltr>acks=all</Ltr> یک رفت‌وبرگشت اضافه تا کندترین عضو{' '}
        <Ltr>ISR</Ltr> است. در مسیرهای بچ‌شده این هزینه بین ده‌ها رکورد تقسیم
        می‌شود و معمولاً چند میلی‌ثانیه است؛ اما در مسیر تک‌رکوردی می‌تواند
        تأخیر محسوسی اضافه کند. اگر کندترین فالوور در <Ltr>ISR</Ltr> بماند،
        تأخیر <Ltr>p99</Ltr> هم بالا می‌رود؛ به همین دلیل پایش{' '}
        <Ltr>ISR</Ltr> و <Ltr>UnderReplicatedPartitions</Ltr> فقط برای دوام
        نیست، برای کارایی هم هست.
      </p>

      <h2>۶. یک لیدر، سه سرنوشت</h2>
      <p>
        در توضیح تعاملی زیر سه Producer با سه تنظیم <Ltr>acks</Ltr> مختلف به یک
        پارتیشن می‌فرستند. تاپیک <Ltr>orders</Ltr> سه نسخه دارد و{' '}
        <Ltr>min.insync.replicas=2</Ltr> است. لیدر هر سه رکورد را می‌نویسد و
        بعد، قبل از اینکه فالوورها آن‌ها را بگیرند، از کار می‌افتد. هر گام یک
        اتفاق مشخص است و رنگ‌ها فقط یک معنا دارند: آبی برای رکورد تازه، سبز
        برای commitشده، زرد برای در انتظار و قرمز برای از دست رفته.
      </p>

      <AcksExplainer />

      <p>
        به گام ۳ نگاه کنید: هر سه رکورد روی لیدر نوشته شده‌اند، اما فقط
        Producer B تأیید گرفته و Producer C هنوز منتظر است. در گام ۵ همان
        رکوردها از بین می‌روند؛ Producer A و B فکر می‌کنند موفق بوده‌اند، در
        حالی که مصرف‌کننده هیچ‌وقت آن‌ها را نمی‌بیند. از گام ۶ به بعد فقط
        Producer C است که می‌تواند با خیال راحت دوباره بفرستد، چون هیچ تأییدی
        نگرفته بود. گام ۸ همان لحظهٔ کلیدی است: با نوشته شدن رکورد روی هر دو
        عضو <Ltr>ISR</Ltr>، <Ltr>HW</Ltr> جلو می‌رود و رکورد هم برای
        مصرف‌کننده قابل خواندن می‌شود و هم در گام ۹ از مرگ لیدر جان سالم به در
        می‌برد.
      </p>

      <h2>۷. کدام acks برای کدام داده؟</h2>
      <p>
        انتخاب <Ltr>acks</Ltr> در واقع انتخاب بین تأخیر و دوام است، اما نه به
        شکل یک طیف پیوسته: سه نقطهٔ مشخص داریم و هر کدام برای دستهٔ متفاوتی از
        داده مناسب است.
      </p>
      <table>
        <thead>
          <tr>
            <th>نوع داده</th>
            <th>
              <Ltr>acks</Ltr>
            </th>
            <th>
              <Ltr>min.insync.replicas</Ltr>
            </th>
            <th>نکته</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>متریک، لاگ تشخیصی، دادهٔ نمونه‌گیری‌شده</td>
            <td>
              <Ltr>0</Ltr> یا <Ltr>1</Ltr>
            </td>
            <td>۱</td>
            <td>گم شدن چند رکورد قابل قبول است؛ تأخیر مهم‌تر است</td>
          </tr>
          <tr>
            <td>رویداد کسب‌وکار (سفارش، رزرو، تغییر وضعیت)</td>
            <td>
              <Ltr>all</Ltr>
            </td>
            <td>۲</td>
            <td>
              با <Ltr>enable.idempotence=true</Ltr> تا retry رکورد تکراری نسازد
            </td>
          </tr>
          <tr>
            <td>پرداخت، حسابداری، رویدادهای مالی</td>
            <td>
              <Ltr>all</Ltr>
            </td>
            <td>۲</td>
            <td>
              علاوه بر دوام، به <Ltr>Transaction</Ltr> و پایش دقیق{' '}
              <Ltr>ISR</Ltr> نیاز دارید
            </td>
          </tr>
          <tr>
            <td>بازپخش داده، ابزار ادمینی، اسکریپت مهاجرت</td>
            <td>
              <Ltr>1</Ltr>
            </td>
            <td>۱</td>
            <td>حجم کم است و می‌توانید در صورت خطا دوباره اجرا کنید</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={javaAll} language="java" filename="DurableProducer.java" />
      <p>
        برای دادهٔ مهم، <Ltr>acks=all</Ltr> را تنها نگذارید. دو تنظیم دیگر را
        کنارش ببینید: <Ltr>enable.idempotence=true</Ltr> تا retry رکورد تکراری
        نسازد، و <Ltr>delivery.timeout.ms</Ltr> تا وقتی <Ltr>ISR</Ltr> کوچک
        است، Producer بی‌نهایت منتظر نماند. اگر <Ltr>ISR</Ltr> به زیر{' '}
        <Ltr>min.insync.replicas</Ltr> برسد، نوشتن با{' '}
        <Ltr>NOT_ENOUGH_REPLICAS</Ltr> رد می‌شود و Producer تا پایان مهلت
        دوباره تلاش می‌کند. این رفتار درست است، اما باید در کد مدیریت شود:
      </p>
      <CodeBlock
        code={errorHandling}
        language="java"
        filename="HandleNotEnoughReplicas.java"
      />
      <Callout variant="tip" title="دوام یک تنظیم نیست، یک ترکیب است">
        <p>
          <Ltr>acks=all</Ltr> + <Ltr>min.insync.replicas=2</Ltr> +{' '}
          <Ltr>RF=3</Ltr> + <Ltr>unclean.leader.election.enable=false</Ltr>.
          اگر یکی از این‌ها را بردارید، بقیه هم ضعیف می‌شوند. برای مثال با{' '}
          <Ltr>unclean.leader.election.enable=true</Ltr> ممکن است نسخه‌ای خارج
          از <Ltr>ISR</Ltr> لیدر شود و رکوردهای تأییدشده را از بین ببرد.
        </p>
      </Callout>

      <DeepDive title="درون تأیید: acks، HW و ISR">
        <DeepDiveSection title="ack از دید Producer، HW از دید Consumer">
          <p>
            این دو عدد را با هم اشتباه نگیرید. <Ltr>ack</Ltr> چیزی است که
            Producer در پاسخ درخواستش می‌گیرد و به تنظیم <Ltr>acks</Ltr> بستگی
            دارد. <Ltr>HW</Ltr> مرز دادهٔ قابل خواندن برای مصرف‌کننده است و
            کمترین <Ltr>LEO</Ltr> بین اعضای <Ltr>ISR</Ltr>. با{' '}
            <Ltr>acks=1</Ltr> ممکن است Producer تأیید بگیرد ولی <Ltr>HW</Ltr>{' '}
            جلو نرود؛ در این حالت رکورد نوشته شده اما مصرف‌کننده آن را نمی‌بیند.
            با <Ltr>acks=all</Ltr> تأیید و جلو رفتن <Ltr>HW</Ltr> تقریباً هم‌زمان
            می‌شوند، چون هر دو منتظر نوشته شدن روی همهٔ اعضای <Ltr>ISR</Ltr>{' '}
            هستند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="NOT_ENOUGH_REPLICAS و NotEnoughReplicasAfterAppend">
          <p>
            دو خطای نزدیک به هم وجود دارد. <Ltr>NotEnoughReplicasException</Ltr>{' '}
            وقتی رخ می‌دهد که لیدر در همان لحظهٔ دریافت درخواست می‌بیند{' '}
            <Ltr>|ISR|</Ltr> کمتر از <Ltr>min.insync.replicas</Ltr> است؛ در این
            حالت رکورد اصلاً نوشته نمی‌شود.{' '}
            <Ltr>NotEnoughReplicasAfterAppendException</Ltr> وقتی رخ می‌دهد که
            رکورد نوشته شده اما قبل از رسیدن به تعداد کافی نسخه، اندازهٔ{' '}
            <Ltr>ISR</Ltr> پایین آمده است. در هر دو حالت Producer به‌طور خودکار
            retry می‌کند و اگر وضعیت اصلاح نشود، در نهایت خطا را به callback یا{' '}
            <Ltr>Future</Ltr> می‌رساند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="retries و delivery.timeout.ms">
          <p>
            <Ltr>acks=all</Ltr> بدون مهلت، می‌تواند Producer را در حالت انتظار
            نگه دارد. سقف کل زمان از <Ltr>send</Ltr> تا موفقیت یا شکست نهایی را{' '}
            <Ltr>delivery.timeout.ms</Ltr> (پیش‌فرض ۱۲۰ ثانیه) تعیین می‌کند.{' '}
            <Ltr>request.timeout.ms</Ltr> (پیش‌فرض ۳۰ ثانیه) مهلت هر تلاش است و{' '}
            <Ltr>retry.backoff.ms</Ltr> فاصلهٔ بین تلاش‌ها. اگر{' '}
            <Ltr>delivery.timeout.ms</Ltr> تمام شود و تأییدی نیامده باشد،
            وضعیت «نامشخص» است: ممکن است رکورد نوشته شده باشد یا نه. اینجاست که{' '}
            <Ltr>idempotence</Ltr> جلوی رکورد تکراری را می‌گیرد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="unclean.leader.election.enable">
          <p>
            وقتی هیچ عضو <Ltr>ISR</Ltr> زنده نماند، Kafka می‌تواند با{' '}
            <Ltr>unclean.leader.election.enable=true</Ltr> یک نسخهٔ خارج از{' '}
            <Ltr>ISR</Ltr> را لیدر کند. این کار دسترس‌پذیری را برمی‌گرداند، اما
            رکوردهایی که آن نسخه ندارد برای همیشه از بین می‌روند؛ حتی اگر با{' '}
            <Ltr>acks=all</Ltr> تأیید شده باشند. پیش‌فرض امروز{' '}
            <Ltr>false</Ltr> است و برای دادهٔ مهم همین مقدار را نگه دارید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="هزینهٔ واقعی acks=all">
          <p>
            با <Ltr>acks=all</Ltr> هر درخواست تا کندترین عضو <Ltr>ISR</Ltr>{' '}
            منتظر می‌ماند. اگر بچ‌ها بزرگ باشند، این هزینه بین چند صد رکورد
            تقسیم می‌شود و تفاوت آن با <Ltr>acks=1</Ltr> در توان عملیاتی معمولاً
            کم است. مشکل وقتی شروع می‌شود که یک فالوور کند همچنان در{' '}
            <Ltr>ISR</Ltr> بماند؛ در این حالت <Ltr>p99</Ltr> بالا می‌رود و
            <Ltr>ISR</Ltr> کوچک نمی‌شود تا وقتی از{' '}
            <Ltr>replica.lag.time.max.ms</Ltr> عبور کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="min.insync.replicas کجا تنظیم می‌شود؟">
          <p>
            این تنظیم هم در <Ltr>server.properties</Ltr> به‌عنوان پیش‌فرض
            بروکر وجود دارد و هم می‌تواند برای هر Topic جداگانه تنظیم شود.
            مقدار Topic بر مقدار بروکر اولویت دارد. برای دیدن مقدار فعلی از{' '}
            <Ltr>kafka-configs.sh --describe</Ltr> استفاده کنید. یادتان باشد که
            این تنظیم فقط با <Ltr>acks=all</Ltr> اثر دارد؛ با{' '}
            <Ltr>acks=1</Ltr> یا <Ltr>acks=0</Ltr> هیچ محدودیتی برای پذیرش
            نوشتن اعمال نمی‌کند.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>۸. اشتباه‌های رایج</h2>
      <Callout variant="danger" title="acks=all بدون min.insync.replicas">
        <p>
          رایج‌ترین اشتباه. <Ltr>acks=all</Ltr> را می‌گذارید و خیال‌تان راحت
          می‌شود، در حالی که <Ltr>min.insync.replicas</Ltr> روی پیش‌فرض ۱ است.
          با کوچک شدن <Ltr>ISR</Ltr>، همان <Ltr>acks=all</Ltr> به یک نسخه بسنده
          می‌کند. این دو تنظیم را همیشه با هم ببینید.
        </p>
      </Callout>
      <Callout variant="danger" title="RF=2 با min.insync.replicas=2">
        <p>
          در این ترکیب با مرگ یک بروکر، <Ltr>|ISR|=1</Ltr> می‌شود و نوشتن با{' '}
          <Ltr>NOT_ENOUGH_REPLICAS</Ltr> متوقف می‌شود. اگر دسترس‌پذیری هم مهم
          است، <Ltr>RF=3</Ltr> با <Ltr>min.insync.replicas=2</Ltr> انتخاب درست
          است.
        </p>
      </Callout>
      <Callout variant="warning" title="acks=1 به‌عنوان «تقریباً مطمئن»">
        <p>
          «فقط یک بروکر ممکن است بمیرد و آن هم به‌ندرت» دلیل کافی نیست.{' '}
          <Ltr>acks=1</Ltr> پنجره‌ای دارد که در آن رکورد فقط روی لیدر است و
          همان پنجره دقیقاً هنگام خرابی، بازترین حالت خودش را دارد.
        </p>
      </Callout>
      <Callout variant="warning" title="تفسیر offset=-1 به‌عنوان خطا">
        <p>
          <Ltr>offset=-1</Ltr> با <Ltr>acks=0</Ltr> طبیعی است و خطا نیست؛ یعنی
          بروکر هیچ عددی برنگردانده. اما با <Ltr>acks=1</Ltr> یا{' '}
          <Ltr>all</Ltr> چنین مقداری نشانهٔ غیرعادی است و باید ارسال را ناموفق
          بدانید.
        </p>
      </Callout>
      <Callout variant="danger" title="acks=0 برای دادهٔ کسب‌وکار">
        <p>
          با <Ltr>acks=0</Ltr> نه خطای بروکر را می‌بینید، نه <Ltr>offset</Ltr>{' '}
          واقعی دارید، نه retry کار می‌کند. اگر داده ارزش ردیابی دارد، این سطح
          مناسب نیست؛ حتی برای رویدادهای کم‌اهمیت‌تر هم <Ltr>acks=1</Ltr> بهتر
          است.
        </p>
      </Callout>
      <Callout variant="warning" title="تغییر acks بدون توجه به idempotence">
        <p>
          از <Ltr>Kafka 3.0</Ltr> به بعد <Ltr>enable.idempotence</Ltr> پیش‌فرض
          فعال است و به <Ltr>acks=all</Ltr> نیاز دارد. اگر <Ltr>acks</Ltr> را
          صریحاً <Ltr>0</Ltr> یا <Ltr>1</Ltr> بگذارید و idempotence را هم
          صریحاً true کرده باشید، Producer با <Ltr>ConfigException</Ltr> بالا
          نمی‌آید؛ و اگر idempotence را صریح تنظیم نکرده باشید، خودکار خاموش
          می‌شود. این را در درس <Ltr>Retry و Idempotence</Ltr> باز می‌کنیم.
        </p>
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          <Ltr>acks</Ltr> تعیین می‌کند Producer قبل از موفقیت منتظر تأیید چه
          کسانی بماند: هیچ‌کس (<Ltr>0</Ltr>)، فقط لیدر (<Ltr>1</Ltr>) یا همهٔ
          اعضای <Ltr>ISR</Ltr> (<Ltr>all</Ltr>).
        </li>
        <li>
          <Ltr>acks=0</Ltr> سریع‌ترین و کم‌دوام‌ترین است؛ <Ltr>offset=-1</Ltr>{' '}
          و بدون retry.
        </li>
        <li>
          <Ltr>acks=1</Ltr> فقط نوشتن لیدر را تأیید می‌کند؛ مرگ لیدر قبل از
          تکرار، رکورد را از بین می‌برد.
        </li>
        <li>
          <Ltr>acks=all</Ltr> قوی‌ترین تضمین است، به شرط اینکه{' '}
          <Ltr>min.insync.replicas</Ltr> هم درست تنظیم شده باشد.
        </li>
        <li>
          دوام واقعی از ترکیب <Ltr>RF=3</Ltr>، <Ltr>acks=all</Ltr>،{' '}
          <Ltr>min.insync.replicas=2</Ltr> و{' '}
          <Ltr>unclean.leader.election.enable=false</Ltr> می‌آید.
        </li>
        <li>
          <Ltr>ISR</Ltr> را پایش کنید؛ دوام و تأخیر هر دو به اندازه و سلامت آن
          وابسته‌اند.
        </li>
      </ul>
      <p>
        حالا می‌دانیم Producer با چه سطحی از تأیید منتظر بروکر می‌ماند و چرا
        «تأیید شد» با «دوام آورد» یکی نیست. قدم بعدی این است که ببینیم
        Producer چطور با <Ltr>batch.size</Ltr>، <Ltr>linger.ms</Ltr> و
        فشرده‌سازی، تعداد درخواست‌ها را کم می‌کند و هزینهٔ همین تأییدها را بین
        چند رکورد تقسیم می‌کند.
      </p>
    </>
  )
}
