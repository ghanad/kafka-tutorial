import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const topicCommands = `# فهرست تاپیک‌ها
kafka-topics.sh --bootstrap-server localhost:9092 --list

# ساخت تاپیک با ۶ پارتیشن، ضریب تکثیر ۳ و یک تنظیم اختصاصی
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic orders \\
  --partitions 6 --replication-factor 3 \\
  --config retention.ms=604800000

# توصیف یک تاپیک
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --topic orders`

const describeOutput = `Topic: orders  TopicId: 4mF7g8_gT3aZ_891kL0pqw  PartitionCount: 6  ReplicationFactor: 3  Configs: retention.ms=604800000
  Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
  Topic: orders  Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1
  Topic: orders  Partition: 2  Leader: 3  Replicas: 3,1,2  Isr: 3,1,2
  Topic: orders  Partition: 3  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
  Topic: orders  Partition: 4  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1
  Topic: orders  Partition: 5  Leader: 3  Replicas: 3,1,2  Isr: 3,1,2`

const producerCommands = `# نوشتن تعاملی با کلید؛ کلید و مقدار با : جدا می‌شوند
kafka-console-producer.sh --bootstrap-server localhost:9092 \\
  --topic orders \\
  --property parse.key=true \\
  --property key.separator=:

# نمونه ورودی در پرامپت
# order-1001:{"status":"created","total":450000}
# order-1002:{"status":"created","total":180000}

# نوشتن از فایل، خط به خط
kafka-console-producer.sh --bootstrap-server localhost:9092 \\
  --topic orders < events.jsonl

# همان تولیدکننده، اما با acks=all برای آزمون دوام
kafka-console-producer.sh --bootstrap-server localhost:9092 \\
  --topic orders \\
  --producer-property acks=all`

const consumerCommands = `# خواندن از ابتدای تاپیک، همراه با کلید و آفست
kafka-console-consumer.sh --bootstrap-server localhost:9092 \\
  --topic orders --from-beginning \\
  --property print.key=true \\
  --property print.offset=true \\
  --property key.separator=" | "

# خواندن ۲۰ پیام و خروج خودکار
kafka-console-consumer.sh --bootstrap-server localhost:9092 \\
  --topic orders --group orders-debug \\
  --from-beginning --max-messages 20

# نمونه خروجی
# 0 | order-1001 | {"status":"created","total":450000}
# 1 | order-1002 | {"status":"created","total":180000}`

const groupCommands = `# فهرست گروه‌های مصرف‌کننده
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# وضعیت گروه، آفست فعلی، آفست انتهای لاگ و lag هر پارتیشن
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --describe --group billing

# نمونه خروجی
# GROUP     TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID
# billing   orders  0          1520            1520            0    consumer-1
# billing   orders  1          984             1002            18   consumer-2`

const resetCommands = `# اول با dry-run ببینید چه اتفاقی می‌افتد
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --group billing --topic orders \\
  --reset-offsets --to-earliest --dry-run

# بعد از بررسی، همان دستور را با execute اجرا کنید
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --group billing --topic orders \\
  --reset-offsets --to-earliest --execute

# چند حالت مفید دیگر
# --to-latest
# --to-datetime 2026-01-01T00:00:00.000
# --shift-by -1000
# --to-offset 5000`

const configCommands = `# دیدن همه تنظیمات مؤثر یک تاپیک
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --entity-type topics --entity-name orders --describe --all

# تغییر تنظیم در سطح تاپیک
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --entity-type topics --entity-name orders \\
  --alter --add-config retention.ms=86400000

# حذف override تا مقدار بروکر دوباره اعمال شود
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --entity-type topics --entity-name orders \\
  --alter --delete-config retention.ms`

const offsetCommands = `# اولین و آخرین آفست هر پارتیشن
kafka-get-offsets.sh --bootstrap-server localhost:9092 \\
  --topic orders --time -2

kafka-get-offsets.sh --bootstrap-server localhost:9092 \\
  --topic orders --time -1

# نمونه خروجی
# orders:0:0
# orders:1:120
# orders:2:340

# حجم پوشه‌های هر پارتیشن روی دیسک
kafka-log-dirs.sh --bootstrap-server localhost:9092 \\
  --describe --topic-list orders`

const deleteRecords = `# فایل JSON: همه رکوردهای قبل از آفست مشخص را حذف کن
cat > delete-orders.json <<'EOF'
{"version":1,"partitions":[
  {"topic":"orders","partition":0,"offset":1000},
  {"topic":"orders","partition":1,"offset":800}
]}
EOF

kafka-delete-records.sh --bootstrap-server localhost:9092 \\
  --offset-json-file delete-orders.json`

const commandConfig = `# client.properties — اتصال امن به خوشه
security.protocol=SASL_SSL
sasl.mechanism=SCRAM-SHA-512
sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \\
  username="ops" password="secret";
ssl.truststore.location=/etc/kafka/client.truststore.jks
ssl.truststore.password=changeit`

const secureCommand = `# هر ابزار خط فرمانی که به خوشه امن وصل می‌شود
kafka-topics.sh --bootstrap-server broker-1:9093 \\
  --command-config client.properties --list`

export function CliToolsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا کافکا را از دور دیدیم: معماری، تولید، مصرف و دوام. حالا وقت آن
        است که دست به ترمینال ببریم. ابزارهای خط فرمان کافکا سریع‌ترین راه برای
        دیدن وضعیت واقعی خوشه‌اند: ساخت تاپیک، خواندن چند پیام، بررسی{' '}
        <Ltr>lag</Ltr> یک گروه و تغییر یک تنظیم. در این درس مهم‌ترین ابزارها را با
        خروجی واقعی مرور می‌کنیم و یاد می‌گیریم کدام دستور امن است و کدام یکی
        برگشت‌پذیر نیست.
      </p>

      <Callout variant="info" title="این ابزارها برای عیب‌یابی‌اند، نه برای تولید">
        <Ltr>kafka-console-producer.sh</Ltr> و <Ltr>kafka-console-consumer.sh</Ltr>{' '}
        برای آزمون سریع ساخته شده‌اند. آن‌ها سرعت، دسته‌بندی، مدیریت خطا و
        مانیتورینگ یک تولیدکننده واقعی را ندارند. در محیط عملیاتی از کلاینت
        برنامه‌نویسی یا ابزار مدیریتی استفاده کنید.
      </Callout>

      <h2>۱. پیش‌نیاز مشترک: آدرس خوشه</h2>
      <p>
        تقریباً همه ابزارهای امروزی یک فلگ مشترک دارند:{' '}
        <Ltr className="font-mono">--bootstrap-server</Ltr>. این آدرس فقط برای
        پیدا کردن خوشه است؛ کافکا بعد از اتصال، فهرست کامل بروکرها را برمی‌گرداند
        و بقیه درخواست‌ها را به بروکر مناسب می‌فرستد. پس لازم نیست همه بروکرها را
        در این فلگ بنویسید، اما نوشتن دو آدرس برای تحمل خطا در زمان راه‌اندازی
        منطقی است.
      </p>
      <p>
        در کافکای قدیمی از <Ltr className="font-mono">--zookeeper</Ltr> استفاده
        می‌شد. آن مسیر از نسخه ۳ منسوخ و در کافکا ۴ حذف شده است. اگر در آموزشی
        قدیمی این فلگ را دیدید، آن را با <Ltr className="font-mono">--bootstrap-server</Ltr>{' '}
        جایگزین کنید.
      </p>

      <h2>۲. kafka-topics.sh: ساخت و توصیف تاپیک</h2>
      <p>
        پرکاربردترین ابزار همین‌جاست. با یک دستور می‌توانید تاپیک بسازید، فهرست
        بگیرید یا جزئیات یک تاپیک را ببینید:
      </p>
      <CodeBlock code={topicCommands} language="bash" filename="topics.sh" />
      <p>
        خروجی <Ltr>--describe</Ltr> پر از اطلاعات مفید است. هر خط یک پارتیشن را
        نشان می‌دهد:
      </p>
      <CodeBlock code={describeOutput} language="text" filename="describe-output.txt" />
      <table>
        <thead>
          <tr>
            <th>فیلد</th>
            <th>معنی</th>
            <th>چه زمانی مهم می‌شود؟</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>Leader</Ltr>
            </td>
            <td>بروکری که خواندن و نوشتن این پارتیشن را انجام می‌دهد.</td>
            <td>اگر خالی یا منفی باشد، پارتیشن رهبر ندارد.</td>
          </tr>
          <tr>
            <td>
              <Ltr>Replicas</Ltr>
            </td>
            <td>همه بروکرهایی که نسخه‌ای از این پارتیشن را نگه می‌دارند.</td>
            <td>اولین عضو، رهبر ترجیحی است.</td>
          </tr>
          <tr>
            <td>
              <Ltr>Isr</Ltr>
            </td>
            <td>نسخه‌هایی که از رهبر عقب نیستند.</td>
            <td>
              اگر <Ltr>Isr</Ltr> کمتر از <Ltr>Replicas</Ltr> باشد، یک replica
              عقب افتاده است.
            </td>
          </tr>
          <tr>
            <td>
              <Ltr>Configs</Ltr>
            </td>
            <td>تنظیماتی که در سطح همین تاپیک override شده‌اند.</td>
            <td>برای دیدن مقدار مؤثر، از <Ltr>kafka-configs.sh --all</Ltr> استفاده کنید.</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip" title="یک نگاه سریع به سلامت خوشه">
        <Ltr className="font-mono">
          kafka-topics.sh --bootstrap-server localhost:9092 --describe
          --under-replicated-partitions
        </Ltr>{' '}
        فقط پارتیشن‌هایی را نشان می‌دهد که <Ltr>ISR</Ltr> آن‌ها کوچک‌تر از مجموعه
        replicaهاست. این یکی از سریع‌ترین راه‌های دیدن مشکل در خوشه است.
      </Callout>

      <h2>۳. kafka-console-producer.sh: نوشتن پیام آزمایشی</h2>
      <p>
        این ابزار هر خطی که در ترمینال می‌نویسید را به یک رکورد تبدیل می‌کند. با
        <Ltr className="font-mono">parse.key=true</Ltr> می‌توانید کلید هم بفرستید.
        برای آزمون دوام، <Ltr className="font-mono">acks=all</Ltr> را به تولیدکننده
        بدهید:
      </p>
      <CodeBlock code={producerCommands} language="bash" filename="producer.sh" />
      <p>
        اگر کلید نفرستید، تولیدکننده رکورد را بدون کلید می‌فرستد و پارتیشن با
        round-robin یا sticky انتخاب می‌شود. اگر کلید بفرستید، همه رکوردهای هم‌کلید
        به یک پارتیشن می‌روند؛ همان چیزی که برای حفظ ترتیب رویدادهای یک سفارش لازم
        است.
      </p>

      <h2>۴. kafka-console-consumer.sh: خواندن و دیدن آفست</h2>
      <p>
        مصرف‌کننده کنسولی برای دیدن سریع داده عالی است. با{' '}
        <Ltr className="font-mono">--property print.offset=true</Ltr> آفست هر رکورد
        را هم می‌بینید:
      </p>
      <CodeBlock code={consumerCommands} language="bash" filename="consumer.sh" />
      <p>
        بدون <Ltr className="font-mono">--group</Ltr>، هر اجرا یک گروه موقت می‌سازد
        و پیشرفت شما ذخیره نمی‌شود؛ یعنی اجرای بعدی دوباره از ابتدا یا انتها شروع
        می‌کند. اگر می‌خواهید آفست‌ها ثبت شوند و در <Ltr>kafka-consumer-groups.sh</Ltr>{' '}
        دیده شوند، حتماً یک <Ltr className="font-mono">--group</Ltr> مشخص بدهید.
      </p>

      <h2>۵. kafka-consumer-groups.sh: مهم‌ترین ابزار عملیات</h2>
      <p>
        اگر فقط یک ابزار برای پایش مصرف انتخاب کنید، همین است. ستون{' '}
        <Ltr>LAG</Ltr> فاصله بین آخرین آفست ثبت‌شده و انتهای لاگ را نشان می‌دهد:
      </p>
      <CodeBlock code={groupCommands} language="bash" filename="consumer-groups.sh" />
      <p>
        بازنشانی آفست یکی از خطرناک‌ترین کارهای روزمره است. همیشه اول با{' '}
        <Ltr className="font-mono">--dry-run</Ltr> ببینید چه آفست‌هایی انتخاب
        می‌شوند. گروه باید مصرف‌کننده فعال نداشته باشد، وگرنه کافکا اجازه بازنشانی
        نمی‌دهد:
      </p>
      <CodeBlock code={resetCommands} language="bash" filename="reset-offsets.sh" />
      <Callout variant="danger" title="بازنشانی آفست، حذف داده نیست">
        <Ltr>--reset-offsets</Ltr> فقط نقطه شروع گروه را عوض می‌کند. داده‌ها سر
        جایشان هستند. اگر هدف حذف داده است، باید از retention یا{' '}
        <Ltr>kafka-delete-records.sh</Ltr> استفاده کنید؛ آن هم برگشت‌پذیر نیست.
      </Callout>

      <h2>۶. kafka-configs.sh: تغییر تنظیم بدون بازسازی تاپیک</h2>
      <p>
        بسیاری از تنظیمات تاپیک را می‌توان در حال اجرا تغییر داد. مثلاً{' '}
        <Ltr>retention.ms</Ltr> را کوتاه‌تر کنید تا داده قدیمی‌تر زودتر پاک شود:
      </p>
      <CodeBlock code={configCommands} language="bash" filename="configs.sh" />
      <p>
        <Ltr className="font-mono">--describe --all</Ltr> مقدار مؤثر را نشان می‌دهد،
        حتی اگر آن مقدار از تنظیمات بروکر آمده باشد و در تاپیک override نشده باشد.
        برای دیدن فقط overrideها، <Ltr className="font-mono">--describe</Ltr> بدون{' '}
        <Ltr className="font-mono">--all</Ltr> کافی است.
      </p>

      <h2>۷. ابزارهای آفست، دیسک و حذف رکورد</h2>
      <p>
        سه ابزار کوچک اما پرکاربرد باقی می‌ماند: دیدن اولین و آخرین آفست هر
        پارتیشن، دیدن حجم پوشه‌ها روی دیسک، و حذف رکوردهای قبل از یک آفست.
      </p>
      <CodeBlock code={offsetCommands} language="bash" filename="offsets-and-disk.sh" />
      <p>
        <Ltr className="font-mono">--time -2</Ltr> اولین آفست در دسترس و{' '}
        <Ltr className="font-mono">--time -1</Ltr> آخرین آفست (log end offset) را
        برمی‌گرداند. تفاوت این دو، تعداد رکوردهای موجود در هر پارتیشن است.
      </p>
      <CodeBlock code={deleteRecords} language="bash" filename="delete-records.sh" />
      <Callout variant="warning" title="delete-records فقط قبل از آفست را پاک می‌کند">
        این ابزار رکوردهای یک بازه را «حذف» نمی‌کند؛ فقط همه رکوردهای قبل از آفست
        داده‌شده را کنار می‌گذارد. برای حذف یک رکورد وسط لاگ باید از compaction یا
        بازنویسی تاپیک استفاده کنید. عملیات هم برگشت‌پذیر نیست.
      </Callout>

      <h2>۸. اتصال امن با command-config</h2>
      <p>
        در خوشه‌ای که <Ltr>TLS</Ltr> یا <Ltr>SASL</Ltr> دارد، ابزارهای خط فرمان
        بدون تنظیمات امنیتی وصل نمی‌شوند. یک فایل <Ltr>client.properties</Ltr>{' '}
        بسازید و با <Ltr className="font-mono">--command-config</Ltr> به دستور
        بدهید:
      </p>
      <CodeBlock code={commandConfig} language="properties" filename="client.properties" />
      <CodeBlock code={secureCommand} language="bash" filename="secure-list.sh" />
      <p>
        همین فایل را می‌توانید به <Ltr>kafka-consumer-groups.sh</Ltr>،{' '}
        <Ltr>kafka-configs.sh</Ltr> و بقیه ابزارها هم بدهید. برای تولیدکننده و
        مصرف‌کننده کنسولی، فلگ <Ltr className="font-mono">--consumer.config</Ltr> یا{' '}
        <Ltr className="font-mono">--producer.config</Ltr> نام دارد.
      </p>

      <DeepDive title="جزئیات عملیاتی: خروجی، خطا و اسکریپت‌نویسی">
        <DeepDiveSection title="خروجی ابزارها برای انسان است، نه برای ماشین">
          <p>
            بسیاری از ابزارهای خط فرمان کافکا خروجی جدول‌بندی‌شده با فاصله یا تب
            می‌دهند و قالب آن بین نسخه‌ها تغییر می‌کند. اگر می‌خواهید در اسکریپت
            تصمیم بگیرید، به‌جای تجزیه خروجی متنی از{' '}
            <Ltr>AdminClient</Ltr> در جاوا یا یک کلاینت برنامه‌نویسی استفاده کنید.
            برای کارهای ساده، <Ltr>--list</Ltr> و{' '}
            <Ltr>kafka-get-offsets.sh</Ltr> خروجی ساده‌تری دارند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="کد خروج و timeout">
          <p>
            بیشتر ابزارها در موفقیت کد ۰ و در خطا کد غیرصفر برمی‌گردانند، اما
            پیام خطا روی <Ltr>stderr</Ltr> می‌آید. در اسکریپت، هم کد خروج را
            بررسی کنید و هم خروجی خطا را نگه دارید. برای عملیات شبکه‌ای،{' '}
            <Ltr className="font-mono">--timeout-ms</Ltr> را در ابزارهایی که
            پشتیبانی می‌کنند تنظیم کنید تا اسکریپت برای همیشه منتظر نماند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا یک bootstrap کافی است؟">
          <p>
            آدرس <Ltr>bootstrap</Ltr> فقط نقطه ورود است. پاسخ اولین درخواست
            متادیتا، فهرست بروکرها و رهبر هر پارتیشن را برمی‌گرداند. ابزار بعد از
            آن مستقیماً با بروکر رهبر صحبت می‌کند. اگر آدرس bootstrap درست باشد
            اما <Ltr>advertised.listeners</Ltr> بروکرها آدرس داخلی نامعتبر بدهد،
            اتصال اول موفق می‌شود و درخواست بعدی شکست می‌خورد؛ خطای رایجی که در
            درس بعدی مفصل می‌بینیم.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="استفاده از --zookeeper در آموزش‌های قدیمی">
        در کافکای ۴ دیگر خبری از <Ltr>--zookeeper</Ltr> نیست. همه دستورها باید{' '}
        <Ltr>--bootstrap-server</Ltr> بگیرند. اگر دستور قدیمی را کپی کنید، ابزار
        با خطای ناشناخته بودن فلگ متوقف می‌شود.
      </Callout>
      <Callout variant="danger" title="بازنشانی آفست روی گروه فعال">
        اگر گروه مصرف‌کننده در حال اجرا باشد، بازنشانی آفست رد می‌شود یا بعد از
        rebalance نتیجه‌اش از بین می‌رود. اول مصرف‌کننده‌ها را متوقف کنید، بعد
        بازنشانی کنید و در پایان دوباره راه بیندازید.
      </Callout>
      <Callout variant="warning" title="انتظار ذخیره پیشرفت از مصرف‌کننده بدون group">
        مصرف‌کننده کنسولی بدون <Ltr className="font-mono">--group</Ltr> برای دیدن
        داده است، نه برای شبیه‌سازی یک سرویس. اگر می‌خواهید رفتار واقعی مصرف‌کننده
        را ببینید، گروه مشخص بدهید و بعد با{' '}
        <Ltr>kafka-consumer-groups.sh --describe</Ltr> آفست‌ها را بررسی کنید.
      </Callout>
      <Callout variant="warning" title="حذف رکورد به‌جای تنظیم retention">
        <Ltr>kafka-delete-records.sh</Ltr> برای اصلاح دستی و فوری است. برای
        نگهداری روزمره، سیاست <Ltr>retention</Ltr> را تنظیم کنید تا کافکا خودش
        سگمنت‌های قدیمی را پاک کند. حذف دستی، ایندکس‌ها و آفست‌ها را جابه‌جا می‌کند
        و می‌تواند مصرف‌کننده‌ها را غافلگیر کند.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          همه ابزارهای مدرن با <Ltr>--bootstrap-server</Ltr> کار می‌کنند؛{' '}
          <Ltr>--zookeeper</Ltr> حذف شده است.
        </li>
        <li>
          <Ltr>kafka-topics.sh --describe</Ltr> رهبر، replicaها و{' '}
          <Ltr>ISR</Ltr> هر پارتیشن را نشان می‌دهد.
        </li>
        <li>
          مصرف‌کننده کنسولی برای آزمون است؛ برای دیدن پیشرفت واقعی،{' '}
          <Ltr>--group</Ltr> بدهید.
        </li>
        <li>
          <Ltr>kafka-consumer-groups.sh</Ltr> ابزار اصلی دیدن{' '}
          <Ltr>lag</Ltr> و بازنشانی آفست است؛ اول <Ltr>--dry-run</Ltr>.
        </li>
        <li>
          <Ltr>kafka-configs.sh</Ltr> تنظیمات تاپیک را بدون بازسازی تغییر می‌دهد.
        </li>
        <li>
          <Ltr>kafka-delete-records.sh</Ltr> برگشت‌پذیر نیست و جایگزین{' '}
          <Ltr>retention</Ltr> نیست.
        </li>
      </ul>
      <p>
        حالا که با تک‌تک ابزارها آشنا شدیم، در درس بعد یک خوشه سه‌گانه واقعی با{' '}
        <Ltr>Docker Compose</Ltr> می‌سازیم تا همین دستورها را روی محیطی با سه
        بروکر و سه کنترلر اجرا کنیم.
      </p>
    </>
  )
}
