import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { TransactionExplainer } from '../../components/simulators/TransactionExplainer'

const producerConfig = `# producer.properties — Producer تراکنشی
bootstrap.servers=localhost:9092
transactional.id=ledger-app-1
transaction.timeout.ms=60000

# این‌ها با تراکنش اجباری می‌شوند
enable.idempotence=true
acks=all
max.in.flight.requests.per.connection=5`

const consumerConfig = `# consumer.properties — فقط دادهٔ commit‌شده
bootstrap.servers=localhost:9092
group.id=ledger-app

# آفست را خودمان داخل تراکنش commit می‌کنیم
enable.auto.commit=false

# بدون این خط، رکوردهای تراکنش‌های abort‌شده هم دیده می‌شوند
isolation.level=read_committed`

const javaTransactional = `Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "ledger-app-1");
props.put(ProducerConfig.TRANSACTION_TIMEOUT_MS_CONFIG, 60_000);
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");

KafkaProducer<String, String> producer = new KafkaProducer<>(props);
producer.initTransactions();

KafkaConsumer<String, String> consumer = new KafkaConsumer<>(consumerProps);
consumer.subscribe(List.of("payments"));

while (running) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(500));
    if (records.isEmpty()) continue;

    producer.beginTransaction();
    try {
        for (ConsumerRecord<String, String> record : records) {
            producer.send(new ProducerRecord<>(
                "ledger", record.key(), transform(record.value())));
        }

        // آفست ورودی و رکوردهای خروجی یک‌جا commit می‌شوند
        // currentOffsets: آفست بعدی هر پارتیشن از رکوردهای همین poll
        producer.sendOffsetsToTransaction(
            currentOffsets(records), consumer.groupMetadata());

        producer.commitTransaction();
    } catch (Exception e) {
        producer.abortTransaction();
        // بعد از abort، موقعیت مصرف‌کننده را به آفست commit‌شده برگردانید
        seekToCommittedOffsets(consumer);
    }
}

// بستن Producer تراکنشی، تراکنش باز را abort می‌کند
producer.close();`

const javaFencing = `// شناسهٔ هر نمونه باید پایدار و یکتا باشد (مثلاً نام Pod)
props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "ledger-app-" + podName);

// بعد از ری‌استارت همان نمونه، initTransactions با همان شناسه
// epoch را بالا می‌برد و نمونهٔ قبلی را fence می‌کند
producer.initTransactions();`

export function ProducerTransactionsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل دیدیم <Ltr>Idempotent Producer</Ltr> چگونه جلوی نوشتن تکراری
        را در یک نشست می‌گیرد. اما یک شکاف باقی ماند: وقتی برنامه بعد از{' '}
        <Ltr>restart</Ltr> همان رکوردها را دوباره بفرستد، <Ltr>PID</Ltr> عوض
        شده و <Ltr>idempotence</Ltr> کاری نمی‌تواند بکند. بدتر از آن، هیچ تنظیمی
        نمی‌توانست چند نوشتن روی چند پارتیشن را «همه یا هیچ» کند. در این درس
        می‌بینیم <Ltr>Transaction</Ltr>ها چطور این دو مشکل را حل می‌کنند:{' '}
        <Ltr>transactional.id</Ltr> چطور یک <Ltr>PID</Ltr> پایدار می‌سازد،{' '}
        <Ltr>commit</Ltr> و <Ltr>abort</Ltr> چطور روی چند پارتیشن اتمیک
        می‌شوند، <Ltr>sendOffsetsToTransaction</Ltr> چطور آفست ورودی را وارد
        تراکنش می‌کند و <Ltr>read_committed</Ltr> دقیقاً چه چیزی را پنهان
        می‌کند.
      </p>

      <h2>۱. شکافی که idempotence باقی می‌گذارد</h2>
      <p>
        <Ltr>Idempotent Producer</Ltr> تضمین می‌کند هر بچ دقیقاً یک‌بار در یک
        پارتیشن نوشته شود، اما این تضمین به یک نشست <Ltr>Producer</Ltr> و یک
        پارتیشن محدود است. سه شکاف باقی می‌ماند:
      </p>
      <ul>
        <li>
          <strong>ری‌استارت:</strong> بعد از کرش، <Ltr>PID</Ltr> جدید صادر
          می‌شود و شمارندهٔ <Ltr>sequence</Ltr> از صفر شروع می‌شود؛ ارسال دوبارهٔ
          همان رکوردها تکراری می‌سازد.
        </li>
        <li>
          <strong>چند پارتیشن:</strong> اگر یک عملیات منطقی باید دو رکورد در دو
          پارتیشن بنویسد، <Ltr>idempotence</Ltr> هیچ ارتباطی بین آن دو نمی‌بیند؛
          ممکن است یکی نوشته شود و دیگری نه.
        </li>
        <li>
          <strong>آفست ورودی:</strong> در مسیر <Ltr>read-process-write</Ltr>،
          نوشتن خروجی و commit آفست ورودی دو عمل جدا هستند. اگر بین آن دو کرش
          رخ دهد، ورودی دوباره پردازش می‌شود یا خروجی گم می‌شود.
        </li>
      </ul>
      <p>
        یک مثال ملموس: سرویس پرداخت یک رکورد از <Ltr>payments</Ltr> می‌خواند،
        موجودی را در <Ltr>ledger/p0</Ltr> کم می‌کند و رکورد حسابداری را در{' '}
        <Ltr>ledger/p1</Ltr> می‌نویسد. اگر بعد از نوشتن در <Ltr>p0</Ltr> و قبل
        از <Ltr>p1</Ltr> برنامه کرش کند، موجودی کم شده اما رکورد حسابداری ثبت
        نشده است. <Ltr>idempotence</Ltr> این ناسازگاری را نمی‌بیند، چون هر
        نوشتن را جدا ارزیابی می‌کند.
      </p>
      <Callout variant="info" title="تراکنش، لایهٔ بالاتر از idempotence است">
        <p>
          تراکنش <Ltr>idempotence</Ltr> را جایگزین نمی‌کند؛ آن را لازم دارد.
          وقتی <Ltr>transactional.id</Ltr> تنظیم می‌کنید، Kafka خودش{' '}
          <Ltr>enable.idempotence=true</Ltr> و <Ltr>acks=all</Ltr> را اجباری
          می‌کند. تراکنش، نوشتن‌های idempotent را در یک واحد اتمیک کنار هم
          می‌گذارد.
        </p>
      </Callout>

      <h2>۲. تراکنش چیست: سه فراخوانی، یک واحد</h2>
      <p>
        یک تراکنش <Ltr>Producer</Ltr> سه بخش دارد: شروع، کار، و پایان. شروع با{' '}
        <Ltr>beginTransaction()</Ltr> است. در میانه، هر تعداد{' '}
        <Ltr>send()</Ltr> و در صورت نیاز <Ltr>sendOffsetsToTransaction()</Ltr>{' '}
        انجام می‌شود. پایان یا <Ltr>commitTransaction()</Ltr> است یا{' '}
        <Ltr>abortTransaction()</Ltr>. تا وقتی تراکنش commit نشده، هیچ
        مصرف‌کنندهٔ <Ltr>read_committed</Ltr> رکوردهای آن را نمی‌بیند.
      </p>
      <p>
        تفاوت مهم با یک تراکنش دیتابیسی این است که Kafka یک{' '}
        <Ltr>Transaction Coordinator</Ltr> دارد: یک جزء درون خوشه که وضعیت
        تراکنش‌ها را در تاپیک داخلی <Ltr>__transaction_state</Ltr> نگه می‌دارد.
        هر <Ltr>transactional.id</Ltr> با هش به یکی از پارتیشن‌های این تاپیک
        نگاشت می‌شود و بروکری که لیدر آن پارتیشن است،{' '}
        <Ltr>Coordinator</Ltr> آن تراکنش‌ها می‌شود. به همین دلیل تراکنش به یک
        بروکر خاص گره نمی‌خورد و با جابه‌جایی لیدرها از بین نمی‌رود.
      </p>
      <table>
        <thead>
          <tr>
            <th>مرحله</th>
            <th>فراخوانی</th>
            <th>چه اتفاقی می‌افتد</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>آماده‌سازی</td>
            <td>
              <Ltr>initTransactions()</Ltr>
            </td>
            <td>
              دریافت <Ltr>PID</Ltr> پایدار و <Ltr>epoch</Ltr> از Coordinator
            </td>
          </tr>
          <tr>
            <td>شروع</td>
            <td>
              <Ltr>beginTransaction()</Ltr>
            </td>
            <td>باز شدن تراکنش در <Ltr>Coordinator</Ltr>؛ هنوز چیزی نوشته نشده</td>
          </tr>
          <tr>
            <td>کار</td>
            <td>
              <Ltr>send()</Ltr> و <Ltr>sendOffsetsToTransaction()</Ltr>
            </td>
            <td>رکوردها و آفست ورودی به تراکنش اضافه می‌شوند</td>
          </tr>
          <tr>
            <td>پایان موفق</td>
            <td>
              <Ltr>commitTransaction()</Ltr>
            </td>
            <td>
              نوشتن مارکر <Ltr>commit</Ltr> در همهٔ پارتیشن‌ها و commit آفست
            </td>
          </tr>
          <tr>
            <td>پایان ناموفق</td>
            <td>
              <Ltr>abortTransaction()</Ltr>
            </td>
            <td>
              نوشتن مارکر <Ltr>abort</Ltr>؛ رکوردها برای مصرف‌کنندهٔ{' '}
              <Ltr>read_committed</Ltr> برای همیشه نادیده گرفته می‌شوند
            </td>
          </tr>
        </tbody>
      </table>

      <h2>۳. transactional.id و initTransactions: PID پایدار و fencing</h2>
      <p>
        کلید ورود به دنیای تراکنش، <Ltr>transactional.id</Ltr> است. این شناسه
        برخلاف <Ltr>PID</Ltr> که Kafka صادر می‌کند، توسط شما انتخاب می‌شود و
        باید بین ری‌استارت‌ها ثابت بماند. وقتی <Ltr>initTransactions()</Ltr>{' '}
        صدا زده می‌شود، Coordinator این شناسه را به یک <Ltr>PID</Ltr> پایدار
        نگاشت می‌کند. اگر همان شناسه قبلاً استفاده شده باشد، همان{' '}
        <Ltr>PID</Ltr> برمی‌گردد اما <Ltr>epoch</Ltr> یکی بالا می‌رود.
      </p>
      <p>
        همین <Ltr>epoch</Ltr> مکانیزم <Ltr>fencing</Ltr> است. فرض کنید نمونهٔ
        قدیمی برنامه هنوز زنده است ولی شبکه‌اش قطع شده و از دید خوشه مرده به
        حساب می‌آید. نمونهٔ جدید با همان <Ltr>transactional.id</Ltr> بالا
        می‌آید و <Ltr>epoch</Ltr> را بالا می‌برد. از این لحظه هر نوشتن با{' '}
        <Ltr>epoch</Ltr> قدیمی رد می‌شود؛ پس دو نمونه نمی‌توانند هم‌زمان با یک
        هویت بنویسند. تراکنش باز نمونهٔ قدیمی هم توسط <Ltr>Coordinator</Ltr>{' '}
        <Ltr>abort</Ltr> می‌شود.
      </p>
      <CodeBlock
        code={javaFencing}
        language="java"
        filename="ProducerIdentity.java"
      />
      <Callout variant="warning" title="یک شناسه برای هر نمونهٔ فعال">
        <p>
          <Ltr>transactional.id</Ltr> مثل نام کاربری است، نه مثل نام برنامه. اگر
          دو نمونهٔ هم‌زمان با یک شناسه بالا بیایند، مدام یکدیگر را{' '}
          <Ltr>fence</Ltr> می‌کنند و هیچ‌کدام پایدار نمی‌ماند. برای هر نمونهٔ
          فعال یک شناسهٔ یکتا بسازید، مثلاً{' '}
          <Ltr>ledger-app-1</Ltr> و <Ltr>ledger-app-2</Ltr>، و آن را در
          تنظیمات یا نام Pod نگه دارید.
        </p>
      </Callout>

      <h2>۴. نوشتن اتمیک روی چند پارتیشن</h2>
      <p>
        وقتی یک تراکنش روی چند پارتیشن می‌نویسد، <Ltr>Coordinator</Ltr> در پایان روی هر
        پارتیشن یک رکورد کنترل به نام <Ltr>Transaction Marker</Ltr> می‌نویسد.
        مارکر <Ltr>commit</Ltr> می‌گوید «همهٔ رکوردهای این تراکنش تا اینجا
        معتبرند» و مارکر <Ltr>abort</Ltr> می‌گوید «همه را دور بریزید». این
        مارکرها هم مثل رکوردهای معمولی آفست می‌گیرند و در لاگ پارتیشن می‌نشینند،
        اما به برنامه تحویل داده نمی‌شوند.
      </p>
      <p>
        نکتهٔ کلیدی این است که تصمیم commit یا abort یک تصمیم واحد است که روی
        همهٔ پارتیشن‌های تراکنش اعمال می‌شود. اگر تراکنش روی{' '}
        <Ltr>ledger/p0</Ltr> و <Ltr>ledger/p1</Ltr> نوشته باشد، یا هر دو مارکر{' '}
        <Ltr>commit</Ltr> می‌گیرند یا هر دو مارکر <Ltr>abort</Ltr>. هیچ حالت
        میانی وجود ندارد که یکی commit و دیگری abort شود.
      </p>
      <p>
        یک محاسبهٔ ساده برای دیدن هزینه: فرض کنید روزی ۲۰۰٬۰۰۰ تراکنش دارید و
        هر تراکنش روی ۳ پارتیشن می‌نویسد. هر تراکنش ۳ مارکر کنترل تولید می‌کند،
        یعنی ۶۰۰٬۰۰۰ رکورد کنترل در روز. این عدد در برابر دادهٔ واقعی کوچک است،
        اما نشان می‌دهد چرا تراکنش را برای هر رکورد جداگانه نمی‌زنیم؛ تراکنش باید
        دسته‌ای از کارها را پوشش دهد، نه یک رکورد.
      </p>

      <h2>۵. sendOffsetsToTransaction: آفست ورودی بخشی از تراکنش</h2>
      <p>
        بخشی که تراکنش را برای <Ltr>exactly-once</Ltr> واقعی ضروری می‌کند،
        همراه کردن آفست ورودی است. در مسیر <Ltr>consume-transform-produce</Ltr>{' '}
        یک <Ltr>Consumer</Ltr> از تاپیک ورودی می‌خواند، نتیجه را به تاپیک خروجی
        می‌نویسد و باید آفست ورودی را هم جلو ببرد. اگر این دو عمل جدا باشند،
        بین آن‌ها یک پنجرهٔ خرابی وجود دارد. با{' '}
        <Ltr>sendOffsetsToTransaction()</Ltr> آفست ورودی به همان تراکنش اضافه
        می‌شود و در لحظهٔ <Ltr>commit</Ltr> با خروجی هم‌زمان نهایی می‌شود.
      </p>
      <p>
        از نظر پروتکل، Producer یک <Ltr>AddOffsetsToTxn</Ltr> به{' '}
        <Ltr>Transaction Coordinator</Ltr> می‌فرستد و سپس{' '}
        <Ltr>TxnOffsetCommit</Ltr> را به <Ltr>Group Coordinator</Ltr> گروه
        مصرف‌کننده می‌فرستد. آفست‌ها در <Ltr>__consumer_offsets</Ltr> و به‌صورت{' '}
        <Ltr>pending</Ltr> نگه داشته می‌شوند و در لحظهٔ <Ltr>commit</Ltr>{' '}
        تراکنش نهایی می‌شوند. به همین دلیل این آفست‌ها نه در تاپیک ورودی نوشته
        می‌شوند و نه در <Ltr>__transaction_state</Ltr>.
      </p>
      <p>
        دقت کنید که این کار <Ltr>commit</Ltr> خودکار مصرف‌کننده را جایگزین
        می‌کند. باید <Ltr>enable.auto.commit=false</Ltr> باشد و آفست فقط از
        طریق تراکنش جلو برود. اگر هم تراکنش بزنید و هم <Ltr>Consumer</Ltr>{' '}
        خودش آفست را commit کند، دو مسیر مستقل برای پیشرفت آفست ساخته‌اید و
        تضمین اتمیک از بین می‌رود.
      </p>
      <Callout variant="tip" title="چرا این کار پنجرهٔ خرابی را می‌بندد">
        <p>
          اگر بعد از <Ltr>send</Ltr> و قبل از <Ltr>commit</Ltr> برنامه کرش کند،
          تراکنش <Ltr>abort</Ltr> می‌شود: نه خروجی معتبر است و نه آفست ورودی
          جلو رفته. بعد از ری‌استارت، مصرف‌کننده از همان آفست commit‌شدهٔ قبلی
          دوباره می‌خواند و کار را از نو انجام می‌دهد. اگر <Ltr>commit</Ltr>{' '}
          موفق شود، هم خروجی و هم آفست با هم ثبت شده‌اند. در هیچ حالتی کار
          دوباره انجام نمی‌شود و در هیچ حالتی هم گم نمی‌شود.
        </p>
      </Callout>

      <h2>۶. read_committed، LSO و مارکرها</h2>
      <p>
        تراکنش بدون تنظیم سمت مصرف‌کننده بی‌فایده است. پیش‌فرض{' '}
        <Ltr>isolation.level</Ltr> برابر <Ltr>read_uncommitted</Ltr> است؛ یعنی
        مصرف‌کننده رکوردهای تراکنش‌های باز و حتی abort‌شده را هم می‌بیند. برای
        دیدن فقط نتیجهٔ تراکنش‌های commit‌شده باید{' '}
        <Ltr>isolation.level=read_committed</Ltr> بگذارید.
      </p>
      <p>
        مفهوم کلیدی اینجا <Ltr>Last Stable Offset</Ltr> یا <Ltr>LSO</Ltr> است:
        مرزی که تا آن، همهٔ تراکنش‌ها تعیین تکلیف شده‌اند. وقتی یک تراکنش باز
        می‌شود و اولین رکوردش را می‌نویسد، <Ltr>LSO</Ltr> روی همان رکورد قفل
        می‌شود. مصرف‌کنندهٔ <Ltr>read_committed</Ltr> می‌تواند تا{' '}
        <Ltr>LSO</Ltr> بخواند، اما نه جلوتر. یعنی اگر یک تراکنش طولانی باز
        بماند، حتی دادهٔ commit‌شده‌ای که بعد از آن نوشته شده هم دیده نمی‌شود.
      </p>
      <Callout variant="danger" title="یک تراکنش فراموش‌شده می‌تواند مصرف را متوقف کند">
        <p>
          اگر برنامه تراکنش را باز کند و قبل از فرستادن <Ltr>EndTxn</Ltr> بمیرد
          یا <Ltr>EndTxn</Ltr> هرگز به <Ltr>Coordinator</Ltr> نرسد،{' '}
          <Ltr>LSO</Ltr> آن پارتیشن قفل می‌ماند و مصرف‌کننده‌های{' '}
          <Ltr>read_committed</Ltr> روی آن پارتیشن عملاً متوقف می‌شوند. (اگر{' '}
          <Ltr>EndTxn</Ltr> به Coordinator رسیده باشد، تراکنش commit شده و{' '}
          <Ltr>LSO</Ltr> آزاد است؛ گم شدن فقط پاسخ، تراکنش را باز نگه نمی‌دارد.)
          نجات معمولاً از دو راه است: <Ltr>transaction.timeout.ms</Ltr> که{' '}
          <Ltr>Coordinator</Ltr> بعد از آن تراکنش را <Ltr>abort</Ltr> می‌کند، یا
          بالا آمدن نمونهٔ جدید با همان <Ltr>transactional.id</Ltr> که تراکنش
          قدیمی را <Ltr>fence</Ltr> و <Ltr>abort</Ltr> می‌کند.
        </p>
      </Callout>
      <p>
        یک نکتهٔ عملی دیگر: با <Ltr>read_committed</Ltr>، مصرف‌کننده ممکن است
        کمی عقب‌تر بماند، چون تا باز شدن تراکنش‌های در جریان صبر می‌کند. این
        تأخیر معمولاً در حد میلی‌ثانیه تا چند ثانیه است، اما اگر تراکنش‌ها را
        طولانی نگه دارید، به Lag واقعی تبدیل می‌شود.
      </p>

      <h2>۷. توضیح تعاملی: یک تراکنش، دو پارتیشن، سه سرنوشت</h2>
      <p>
        در توضیح تعاملی زیر یک سناریوی کامل را گام‌به‌گام می‌بینید: تاپیک ورودی{' '}
        <Ltr>payments</Ltr> با یک پارتیشن و تاپیک خروجی <Ltr>ledger</Ltr> با دو
        پارتیشن. <Ltr>Producer</Ltr> تراکنشی از <Ltr>payments</Ltr> می‌خواند،
        در دو پارتیشن <Ltr>ledger</Ltr> می‌نویسد و آفست ورودی را هم در همان
        تراکنش commit می‌کند. در ادامه یک تراکنش <Ltr>abort</Ltr> می‌شود، یک
        تراکنش باز می‌ماند و <Ltr>LSO</Ltr> را قفل می‌کند، و در پایان{' '}
        <Ltr>fencing</Ltr> گره را باز می‌کند.
      </p>

      <TransactionExplainer />

      <p>
        به گام ۷ نگاه کنید: مارکرهای <Ltr>commit</Ltr> در آفست‌های{' '}
        <Ltr>121</Ltr> و <Ltr>89</Ltr> نوشته می‌شوند و آفست گروه هم‌زمان از{' '}
        <Ltr>42</Ltr> به <Ltr>43</Ltr> می‌رسد؛ هر سه تغییر یک واحدند. گام ۹
        نشان می‌دهد <Ltr>abort</Ltr> چطور رکوردهای <Ltr>122</Ltr> و{' '}
        <Ltr>90</Ltr> را برای همیشه از دید <Ltr>read_committed</Ltr> پنهان
        می‌کند، در حالی که <Ltr>read_uncommitted</Ltr> آن‌ها را می‌بیند. گام ۱۰
        خطر اصلی را نشان می‌دهد: تراکنش سوم <Ltr>LSO</Ltr> را روی{' '}
        <Ltr>124</Ltr> قفل می‌کند و رکورد <Ltr>125</Ltr> که تراکنش دیگری
        commit کرده، دیده نمی‌شود. گام ۱۱ با <Ltr>fencing</Ltr> همین قفل را باز
        می‌کند.
      </p>

      <h2>۸. تنظیمات و کد کامل</h2>
      <p>
        سمت <Ltr>Producer</Ltr> سه تنظیم اصلی وجود دارد:{' '}
        <Ltr>transactional.id</Ltr> که هویت پایدار تراکنش است،{' '}
        <Ltr>transaction.timeout.ms</Ltr> که سقف عمر تراکنش باز است و{' '}
        <Ltr>enable.idempotence=true</Ltr> که با تراکنش اجباری می‌شود. سمت{' '}
        <Ltr>Consumer</Ltr> دو تنظیم مهم داریم:{' '}
        <Ltr>isolation.level=read_committed</Ltr> و{' '}
        <Ltr>enable.auto.commit=false</Ltr>.
      </p>
      <CodeBlock
        code={producerConfig}
        language="properties"
        filename="producer.properties"
      />
      <CodeBlock
        code={consumerConfig}
        language="properties"
        filename="consumer.properties"
      />
      <p>
        کد کامل مسیر <Ltr>read-process-write</Ltr> چنین است. نکتهٔ مهم در{' '}
        <Ltr>catch</Ltr> این است که بعد از <Ltr>abortTransaction()</Ltr> باید
        موقعیت مصرف‌کننده را به آفست commit‌شده برگردانید؛ وگرنه{' '}
        <Ltr>poll</Ltr> بعدی از جایی جلوتر ادامه می‌دهد و رکوردهای پردازش‌نشده
        را از دست می‌دهید.
      </p>
      <CodeBlock
        code={javaTransactional}
        language="java"
        filename="LedgerService.java"
      />
      <Callout variant="info" title="همیشه close کنید">
        <p>
          در پایان کار (مثلاً در <Ltr>finally</Ltr>) حتماً{' '}
          <Ltr>producer.close()</Ltr> را صدا بزنید.
          بستن Producer تراکنشی، تراکنش باز را <Ltr>abort</Ltr> می‌کند و وضعیت
          را به <Ltr>Coordinator</Ltr> برمی‌گرداند. اگر فرآیند بدون close بمیرد، تا
          <Ltr>transaction.timeout.ms</Ltr> طول می‌کشد تا Coordinator خودش
          تراکنش را جمع کند.
        </p>
      </Callout>

      <h2>۹. هزینه‌ها، محدودیت‌ها و تنظیم‌های مهم</h2>
      <p>
        تراکنش رایگان نیست. هر تراکنش یک رفت‌وبرگشت اضافه با <Ltr>Coordinator</Ltr> دارد،
        روی هر پارتیشن مارکر کنترل می‌نویسد و وضعیت آن در{' '}
        <Ltr>__transaction_state</Ltr> نگه داشته می‌شود. به همین دلیل تراکنش
        برای دسته‌های بزرگ‌تر کار منطقی مناسب است، نه برای هر رکورد.
      </p>
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
              <Ltr>transactional.id</Ltr>
            </td>
            <td>—</td>
            <td>هویت پایدار تراکنش</td>
            <td>بین ری‌استارت‌ها ثابت و برای هر نمونه یکتا</td>
          </tr>
          <tr>
            <td>
              <Ltr>transaction.timeout.ms</Ltr>
            </td>
            <td>
              <Ltr>60000</Ltr>
            </td>
            <td>سقف عمر تراکنش باز</td>
            <td>
              سقف بروکر: <Ltr>transaction.max.timeout.ms</Ltr> با پیش‌فرض{' '}
              <Ltr>900000</Ltr>
            </td>
          </tr>
          <tr>
            <td>
              <Ltr>enable.idempotence</Ltr>
            </td>
            <td>
              <Ltr>true</Ltr> (اجباری)
            </td>
            <td>حذف نوشتن تکراری</td>
            <td>با تراکنش نمی‌توانید خاموشش کنید</td>
          </tr>
          <tr>
            <td>
              <Ltr>acks</Ltr>
            </td>
            <td>
              <Ltr>all</Ltr> (اجباری)
            </td>
            <td>سطح تأیید نوشتن</td>
            <td>
              <Ltr>acks=1</Ltr> با تراکنش خطا می‌دهد
            </td>
          </tr>
          <tr>
            <td>
              <Ltr>max.in.flight.requests.per.connection</Ltr>
            </td>
            <td>
              <Ltr>5</Ltr>
            </td>
            <td>تعداد درخواست هم‌زمان</td>
            <td>بیشتر از <Ltr>5</Ltr> مجاز نیست</td>
          </tr>
          <tr>
            <td>
              <Ltr>isolation.level</Ltr>
            </td>
            <td>
              <Ltr>read_uncommitted</Ltr>
            </td>
            <td>دید مصرف‌کننده</td>
            <td>
              برای دیدن فقط دادهٔ commit‌شده، <Ltr>read_committed</Ltr> لازم است
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        محدودیت مهم دیگر این است که تراکنش فقط داخل Kafka اتمیک است. اگر
        خروجی به دیتابیس، API یا ایمیل می‌رود، Kafka نمی‌تواند آن را با نوشتن
        خودش هم‌زمان commit یا abort کند. برای این حالت‌ها به الگوی{' '}
        <Ltr>Outbox</Ltr> یا یک مقصد <Ltr>idempotent</Ltr> نیاز دارید؛ در بخش{' '}
        <Ltr>DeepDive</Ltr> بیشتر توضیح داده شده است.
      </p>
      <p>
        اگر از <Ltr>Kafka Streams</Ltr> استفاده می‌کنید، لازم نیست این‌ها را
        دستی بنویسید: با <Ltr>processing.guarantee=exactly_once_v2</Ltr> خود
        Streams تراکنش، آفست و state store را مدیریت می‌کند. برای مسیر{' '}
        <Ltr>read-process-write</Ltr> با کد خودتان، همان الگوی بخش قبل درست
        است.
      </p>

      <h2>۱۰. اشتباه‌های رایج</h2>
      <Callout variant="danger" title="فراموش کردن read_committed">
        <p>
          تراکنش را درست پیاده می‌کنید اما <Ltr>Consumer</Ltr> را پیش‌فرض
          می‌گذارید. نتیجه: رکوردهای تراکنش‌های <Ltr>abort</Ltr>شده هم دیده
          می‌شوند و به نظر می‌رسد داده‌های عجیب و متناقض ظاهر شده‌اند.{' '}
          <Ltr>read_committed</Ltr> جزء قرارداد مسیر تراکنشی است، نه یک بهبود
          اختیاری.
        </p>
      </Callout>
      <Callout variant="danger" title="transactional.id مشترک بین نمونه‌ها">
        <p>
          دو replica با یک <Ltr>transactional.id</Ltr> بالا می‌آورید. هر بار که
          یکی initialize می‌کند، دیگری <Ltr>fence</Ltr> می‌شود و تراکنش‌هایش{' '}
          <Ltr>abort</Ltr>. نتیجه، خطاهای مداوم و ری‌استارت بی‌پایان است. برای
          هر نمونهٔ فعال یک شناسهٔ یکتا بدهید.
        </p>
      </Callout>
      <Callout variant="warning" title="commit خودکار مصرف‌کننده در کنار تراکنش">
        <p>
          <Ltr>enable.auto.commit=true</Ltr> را فراموش می‌کنید و هم‌زمان{' '}
          <Ltr>sendOffsetsToTransaction</Ltr> می‌زنید. حالا دو مسیر مستقل برای
          جلو بردن آفست دارید؛ آفست ممکن است قبل از commit تراکنش جلو برود و
          پنجرهٔ خرابی باز شود. آفست ورودی فقط باید از داخل تراکنش commit شود.
        </p>
      </Callout>
      <Callout variant="warning" title="تراکنش‌های طولانی">
        <p>
          یک تراکنش را باز می‌کنید و مدت‌ها باز نگه می‌دارید. <Ltr>LSO</Ltr>{' '}
          قفل می‌ماند و مصرف‌کننده‌های <Ltr>read_committed</Ltr> عقب می‌افتند.
          تراکنش را کوتاه نگه دارید و <Ltr>transaction.timeout.ms</Ltr> را
          متناسب با بدترین زمان پردازش تنظیم کنید.
        </p>
      </Callout>
      <Callout variant="danger" title="انتظار اتمیک بودن با سیستم بیرونی">
        <p>
          تراکنش Kafka را با نوشتن در دیتابیس ترکیب می‌کنید و انتظار دارید هر
          دو با هم commit شوند. این کار بدون الگوی <Ltr>Outbox</Ltr> یا مقصد{' '}
          <Ltr>idempotent</Ltr> ممکن نیست. تراکنش Kafka فقط نوشتن‌های داخل
          Kafka و آفست ورودی را پوشش می‌دهد.
        </p>
      </Callout>
      <Callout variant="warning" title="فراموش کردن seek بعد از abort">
        <p>
          بعد از <Ltr>abortTransaction()</Ltr>، موقعیت محلی مصرف‌کننده همان‌جا
          مانده که <Ltr>poll</Ltr> برگردانده بود. اگر بدون{' '}
          <Ltr>seek</Ltr> به آفست commit‌شده ادامه دهید، رکوردهای پردازش‌نشده
          را از دست می‌دهید. بعد از abort، موقعیت را به آخرین آفست commit‌شده
          برگردانید.
        </p>
      </Callout>

      <DeepDive title="درون تراکنش: Coordinator، مارکرها، LSO و Fencing">
        <DeepDiveSection title="Transaction Coordinator کجاست؟">
          <p>
            تاپیک داخلی <Ltr>__transaction_state</Ltr> به‌طور پیش‌فرض ۵۰ پارتیشن
            دارد و هر <Ltr>transactional.id</Ltr> با هش به یکی از آن‌ها نگاشت
            می‌شود. بروکری که لیدر آن پارتیشن است، <Ltr>Coordinator</Ltr> آن تراکنش‌ها
            می‌شود. وضعیت تراکنش (شروع، پارتیشن‌های درگیر، آفست‌های در انتظار و
            نتیجه) در همین تاپیک ذخیره می‌شود، پس با جابه‌جایی لیدر از بین
            نمی‌رود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="مارکرها دقیقاً چه هستند؟">
          <p>
            مارکر یک رکورد کنترل (Control Batch) است که در لاگ پارتیشن نوشته
            می‌شود و آفست می‌گیرد، اما در <Ltr>poll</Ltr> به برنامه تحویل داده
            نمی‌شود. هر مارکر به <Ltr>PID</Ltr>، <Ltr>epoch</Ltr> و شناسهٔ
            تراکنش اشاره می‌کند. مصرف‌کنندهٔ <Ltr>read_committed</Ltr> هنگام
            پیمایش لاگ، رکوردهای بین دو مارکر را بر اساس نوع مارکر (commit یا
            abort) می‌پذیرد یا دور می‌ریزد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="LSO چطور محاسبه می‌شود؟">
          <p>
            <Ltr>LSO</Ltr> اولین آفستی است که هنوز تراکنش باز دارد. هر پارتیشن
            فهرستی از تراکنش‌های باز را نگه می‌دارد؛ <Ltr>LSO</Ltr> برابر
            کوچک‌ترین آفست شروع میان آن‌هاست و اگر تراکنش بازی نباشد، برابر{' '}
            <Ltr>HW</Ltr>. مصرف‌کنندهٔ <Ltr>read_committed</Ltr> فقط تا{' '}
            <Ltr>LSO</Ltr> داده برمی‌گرداند. به همین دلیل یک تراکنش باز، حتی
            دادهٔ commit‌شدهٔ بعد از خودش را هم پنهان می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="transaction.timeout.ms و تراکنش‌های یتیم">
          <p>
            اگر تراکنش تا <Ltr>transaction.timeout.ms</Ltr> تعیین تکلیف نشود،
            <Ltr>Coordinator</Ltr> آن را <Ltr>abort</Ltr> می‌کند و مارکرها را
            می‌نویسد. این سقف نمی‌تواند از <Ltr>transaction.max.timeout.ms</Ltr>{' '}
            بروکر (پیش‌فرض <Ltr>900000</Ltr> میلی‌ثانیه) بیشتر باشد. Producer
            بعد از این اتفاق با خطای تراکنش (مثلاً{' '}
            <Ltr>InvalidProducerEpochException</Ltr>) مواجه می‌شود؛ این خطا
            کشنده است و Producer دیگر قابل استفاده نیست: باید آن را بست و نمونهٔ
            جدیدی با همان <Ltr>transactional.id</Ltr> ساخت و{' '}
            <Ltr>initTransactions</Ltr> زد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="fencing در سطح پروتکل">
          <p>
            هر بار <Ltr>initTransactions</Ltr> با یک{' '}
            <Ltr>transactional.id</Ltr> موجود، Coordinator{' '}
            <Ltr>epoch</Ltr> را یکی بالا می‌برد و تراکنش باز قبلی را{' '}
            <Ltr>abort</Ltr> می‌کند. هر درخواست نوشتن یا <Ltr>EndTxn</Ltr> که
            با <Ltr>epoch</Ltr> قدیمی برسد، رد می‌شود. این همان مکانیزمی است
            که از «دو نویسندهٔ هم‌زمان با یک هویت» جلوگیری می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="exactly-once و مقصد بیرونی">
          <p>
            تراکنش Kafka هم‌زمانی نوشتن‌های Kafka و آفست ورودی را تضمین می‌کند،
            اما یک <Ltr>POST</Ltr> HTTP یا <Ltr>INSERT</Ltr> در دیتابیس را
            نمی‌تواند با آن برگرداند. دو راه رایج: مقصد را{' '}
            <Ltr>idempotent</Ltr> کنید (مثلاً <Ltr>UPSERT</Ltr> بر اساس کلید
            یکتا) یا از الگوی <Ltr>Outbox</Ltr> استفاده کنید که نوشتن در
            دیتابیس و ثبت رویداد را در یک تراکنش دیتابیسی انجام می‌دهد و بعد
            یک فرآیند جدا رویدادها را به Kafka می‌فرستد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="هزینهٔ واقعی تراکنش">
          <p>
            هر تراکنش یک <Ltr>EndTxn</Ltr> اضافه، یک یا چند مارکر کنترل و
            به‌روزرسانی وضعیت در <Ltr>__transaction_state</Ltr> دارد. توان
            عملیاتی کمتر از Producer غیرتراکنشی است و این کاهش به اندازهٔ
            تراکنش و تعداد پارتیشن‌ها بستگی دارد. برای دسته‌های بزرگ‌تر، سربار
            هر رکورد کمتر می‌شود؛ برای تراکنش تک‌رکوردی، سربار می‌تواند چند
            برابر شود.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          <Ltr>transactional.id</Ltr> یک هویت پایدار برای Producer می‌سازد؛
          با هر ری‌استارت <Ltr>epoch</Ltr> بالا می‌رود و نمونهٔ قدیمی{' '}
          <Ltr>fence</Ltr> می‌شود.
        </li>
        <li>
          <Ltr>beginTransaction</Ltr>، <Ltr>commitTransaction</Ltr> و{' '}
          <Ltr>abortTransaction</Ltr> نوشتن روی چند پارتیشن را به یک واحد
          اتمیک تبدیل می‌کنند.
        </li>
        <li>
          <Ltr>sendOffsetsToTransaction</Ltr> آفست ورودی را وارد تراکنش می‌کند
          و پنجرهٔ خرابی بین «پردازش» و «commit آفست» را می‌بندد.
        </li>
        <li>
          مصرف‌کننده باید <Ltr>isolation.level=read_committed</Ltr> و{' '}
          <Ltr>enable.auto.commit=false</Ltr> داشته باشد؛ وگرنه تراکنش بی‌اثر
          است.
        </li>
        <li>
          <Ltr>LSO</Ltr> مرز دید <Ltr>read_committed</Ltr> است؛ تراکنش باز و
          طولانی می‌تواند مصرف یک پارتیشن را متوقف کند.
        </li>
        <li>
          تراکنش فقط داخل Kafka اتمیک است؛ برای دیتابیس و API بیرونی به{' '}
          <Ltr>Outbox</Ltr> یا مقصد idempotent نیاز دارید.
        </li>
      </ul>
      <p>
        حالا تصویر کامل <Ltr>exactly-once</Ltr> در سمت تولید روشن است: نوشتن
        idempotent، تراکنش اتمیک روی چند پارتیشن و آفست ورودی، و مصرف‌کنندهٔ{' '}
        <Ltr>read_committed</Ltr>. در بخش بعد به سراغ سمت مصرف می‌رویم: حلقهٔ{' '}
        <Ltr>poll</Ltr>، گروه‌های مصرف‌کننده و اینکه آفست‌ها کجا ذخیره می‌شوند.
      </p>
    </>
  )
}
