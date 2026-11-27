import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const preflightCommands = `# قبل از شروع: هیچ پارتیشن under-replicated نباشد
kafka-topics.sh --bootstrap-server broker-1:9092 \\
  --describe --under-replicated-partitions

# وضعیت کورم KRaft
kafka-metadata-quorum.sh --bootstrap-server broker-1:9092 describe --status

# نسخه API بروکرها و کلاینت‌ها
kafka-broker-api-versions.sh --bootstrap-server broker-1:9092`

const protocolConfig = `# server.properties — تا وقتی همه بروکرها ارتقا نیافته‌اند
inter.broker.protocol.version=3.9

# بعد از ارتقای همه بروکرها، مقدار را به نسخه جدید برسانید
# و یک دور دیگر rolling restart انجام دهید
# inter.broker.protocol.version=4.0`

const mm2Config = `# mm2.properties
clusters=primary,backup
primary.bootstrap.servers=primary-1:9092,primary-2:9092
backup.bootstrap.servers=backup-1:9092,backup-2:9092

primary->backup.enabled=true
primary->backup.topics=orders,payments
primary->backup.groups=billing,shipping

replication.factor=3
sync.topic.configs.enabled=true
sync.topic.acls.enabled=true
sync.group.offsets.enabled=true
sync.group.offsets.interval.seconds=10
refresh.topics.interval.seconds=30
emit.checkpoints.enabled=true
emit.heartbeats.enabled=true`

const mm2Topics = `# تاپیک‌های داخلی MirrorMaker 2 روی خوشه مقصد
heartbeats
checkpoints.internal
mm2-configs.primary.internal
mm2-offsets.primary.internal
mm2-status.primary.internal

# تاپیک‌های کپی‌شده با پیشوند نام خوشه مبدأ
primary.orders
primary.payments`

const mm2Status = `# وضعیت کانکتورهای MirrorMaker 2
curl -s http://connect-1:8083/connectors?expand=status

# لاگ تکرار و تأخیر را در داشبورد کانکت ببینید
# replication-lag برای هر تاپیک و پارتیشن`

export function UpgradesMirrorMakerContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        ارتقای خوشه و بازیابی فاجعه دو کار پرریسک عملیاتی‌اند. هر دو می‌توانند
        یک خوشه سالم را به یک حادثه تبدیل کنند اگر بدون ترتیب و بدون پایش انجام
        شوند. در این درس اول یک ارتقای غلتان امن را مرور می‌کنیم و بعد می‌بینیم
        <Ltr>MirrorMaker 2</Ltr> چطور داده را بین دو دیتاسنتر تکرار می‌کند و
        محدودیت‌هایش چیست.
      </p>

      <Callout variant="info" title="ارتقا یک عملیات، نه یک دستور">
        ارتقای کافکا شامل بروکرها، کنترلرها، کلاینت‌ها، <Ltr>Connect</Ltr>،{' '}
        <Ltr>Streams</Ltr>، <Ltr>Schema Registry</Ltr> و گاهی ابزارهای پایش
        است. اگر فقط بروکر را ارتقا دهید و کلاینت قدیمی بماند، ممکن است همه‌چیز
        کار کند؛ اما اگر پروتکل را زود بالا ببرید، کلاینت قدیمی قطع می‌شود.
      </Callout>

      <h2>۱. قبل از ارتقا چه چیزی را بسنجیم</h2>
      <table>
        <thead>
          <tr>
            <th>مؤلفه</th>
            <th>بررسی</th>
            <th>ریسک نادیده گرفتن</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>بروکر و کنترلر</td>
            <td>نسخه فعلی، مسیر ارتقا و سازگاری پروتکل</td>
            <td>قطع ارتباط بین بروکرها یا از دست رفتن کورم</td>
          </tr>
          <tr>
            <td>کلاینت‌ها</td>
            <td>نسخه کتابخانه و پشتیبانی از پروتکل جدید</td>
            <td>خطای سریال‌سازی یا قطع اتصال</td>
          </tr>
          <tr>
            <td><Ltr>Connect</Ltr> و <Ltr>Streams</Ltr></td>
            <td>نسخه پلاگین‌ها و سازگاری با بروکر</td>
            <td>توقف <Ltr>pipeline</Ltr> یا <Ltr>state store</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>Schema Registry</Ltr></td>
            <td>سازگاری <Ltr>schema</Ltr> و نسخه کلاینت</td>
            <td>خطای <Ltr>deserialize</Ltr> در مصرف‌کننده‌ها</td>
          </tr>
          <tr>
            <td>پایش و هشدار</td>
            <td>داشبورد و <Ltr>Runbook</Ltr> ارتقا</td>
            <td>نمی‌فهمید مشکل از ارتقا است یا بار</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={preflightCommands} language="bash" filename="preflight.sh" />

      <h2>۲. Rolling Upgrade بروکرها</h2>
      <p>
        اصل کار ساده است: در هر لحظه فقط یک بروکر در دسترس نباشد و قبل از رفتن
        به بعدی، خوشه به حالت سالم برگردد. در <Ltr>KRaft</Ltr> اول کورم کنترلر
        را ارتقا دهید، بعد بروکرها را یکی‌یکی.
      </p>
      <ol>
        <li>از تنظیمات، <Ltr>ACL</Ltr>ها و متادیتا نسخه پشتیبان بگیرید.</li>
        <li>یک کنترلر را خاموش، ارتقا و دوباره روشن کنید؛ کورم را بررسی کنید.</li>
        <li>همین کار را برای بقیه کنترلرها تکرار کنید.</li>
        <li>یک بروکر را خاموش، ارتقا و روشن کنید.</li>
        <li>صبر کنید <Ltr>UnderReplicatedPartitions</Ltr> به صفر برسد.</li>
        <li>بروکر بعدی را ارتقا دهید و همین چرخه را تکرار کنید.</li>
        <li>بعد از همه بروکرها، نسخه پروتکل را بالا ببرید و یک دور دیگر <Ltr>restart</Ltr> کنید.</li>
      </ol>
      <CodeBlock code={protocolConfig} language="properties" filename="server.properties" />
      <Callout variant="warning" title="نسخه پروتکل را زود بالا نبرید">
        <Ltr>inter.broker.protocol.version</Ltr> باید تا وقتی همه بروکرها ارتقا
        نیافته‌اند روی نسخه قدیمی بماند. بالا بردن زودهنگام، بروکرهای ارتقا
        نیافته را از خوشه بیرون می‌اندازد. در کافکای ۴،{' '}
        <Ltr>log.message.format.version</Ltr> حذف شده است.
      </Callout>
      <Callout variant="danger" title="ارتقای هم‌زمان همه بروکرها">
        ارتقای هم‌زمان، همه پارتیشن‌ها را آفلاین و همه گروه‌ها را <Ltr>rebalance</Ltr>
        می‌کند. حتی اگر داده از دست نرود، سرویس برای مدت طولانی قطع می‌شود.
      </Callout>

      <h2>۳. کلاینت‌ها و اکوسیستم</h2>
      <p>
        بعد از بروکرها نوبت کلاینت‌هاست. کتابخانه‌های قدیمی معمولاً با پروتکل
        جدید کار می‌کنند، اما رفتار <Ltr>retry</Ltr>، تراکنش و متادیتا ممکن است تغییر کند.
        کلاینت‌ها را در محیط <Ltr>staging</Ltr> با نسخه جدید بروکر آزمون کنید و بعد به
        تولید ببرید. <Ltr>Connect</Ltr> را هم به‌صورت <Ltr>incremental</Ltr> و با پایش
        کانکتورها ارتقا دهید.
      </p>
      <p>
        اگر از <Ltr>ZooKeeper</Ltr> به <Ltr>KRaft</Ltr> مهاجرت می‌کنید، این یک
        ارتقای معمولی نیست. باید از نسخه <Ltr>bridge</Ltr> استفاده کنید، متادیتا را مهاجرت
        دهید و بعد <Ltr>ZooKeeper</Ltr> را بازنشسته کنید. این مسیر را در محیط
        تست کامل تمرین کنید.
      </p>

      <h2>۴. MirrorMaker 2 چیست؟</h2>
      <p>
        <Ltr>MirrorMaker 2</Ltr> روی <Ltr>Kafka Connect</Ltr> اجرا می‌شود و
        داده را از یک خوشه به خوشه دیگر کپی می‌کند. برخلاف نسخه قدیمی، تنظیمات
        تاپیک، <Ltr>ACL</Ltr> و آفست گروه‌ها را هم تا حدی همگام می‌کند. چهار
        جزء اصلی دارد:
      </p>
      <table>
        <thead>
          <tr>
            <th>جزء</th>
            <th>وظیفه</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>MirrorSourceConnector</Ltr></td>
            <td>خواندن از مبدأ و نوشتن در مقصد با نام‌گذاری جدید</td>
          </tr>
          <tr>
            <td><Ltr>MirrorSinkConnector</Ltr></td>
            <td>نوشتن داخلی که <Ltr>Source</Ltr> از آن استفاده می‌کند</td>
          </tr>
          <tr>
            <td><Ltr>MirrorCheckpointConnector</Ltr></td>
            <td>همگام‌سازی آفست گروه‌های مصرف‌کننده</td>
          </tr>
          <tr>
            <td><Ltr>MirrorHeartbeatConnector</Ltr></td>
            <td>تولید <Ltr>heartbeat</Ltr> برای سنجش سلامت و تأخیر تکرار</td>
          </tr>
        </tbody>
      </table>
      <p>
        به‌طور پیش‌فرض، تاپیک <Ltr>orders</Ltr> در خوشه مبدأ با نام{' '}
        <Ltr>primary.orders</Ltr> در مقصد ساخته می‌شود. این پیشوند جلوی تداخل
        نام‌ها را می‌گیرد و در سناریوی دوطرفه از حلقه جلوگیری می‌کند. تاپیک‌های
        داخلی <Ltr>MM2</Ltr> هم در خوشه مقصد ساخته می‌شوند.
      </p>
      <CodeBlock code={mm2Config} language="properties" filename="mm2.properties" />
      <CodeBlock code={mm2Topics} language="bash" filename="mm2-topics.txt" />
      <Callout variant="warning" title="همگام‌سازی ACL و آفست پیش‌فرض نیست">
        <Ltr>sync.group.offsets.enabled</Ltr> به‌طور پیش‌فرض خاموش است. اگر
        می‌خواهید مصرف‌کننده‌ها بعد از <Ltr>failover</Ltr> از همان نقطه ادامه دهند، آن را
        روشن کنید. برای <Ltr>ACL</Ltr> هم <Ltr>sync.topic.acls.enabled</Ltr> را
        بررسی کنید؛ در غیر این صورت مقصد بدون مجوز می‌ماند.
      </Callout>

      <h2>۵. سناریوی فعال-غیرفعال</h2>
      <p>
        رایج‌ترین سناریو این است: خوشه اصلی فعال است، خوشه پشتیبان فقط داده را
        تکرار می‌کند و در زمان خرابی جای اصلی را می‌گیرد.
      </p>
      <ol>
        <li>
          <Ltr>MM2</Ltr> تاپیک‌ها، تنظیمات و <Ltr>ACL</Ltr>ها را به مقصد کپی
          می‌کند.
        </li>
        <li>
          <Ltr>CheckpointConnector</Ltr> آفست گروه‌ها را با تأخیر کوتاه همگام
          می‌کند.
        </li>
        <li>در زمان حادثه، تولیدکننده‌ها را به خوشه اصلی متوقف کنید.</li>
        <li>صبر کنید تأخیر تکرار به صفر یا حداقل برسد.</li>
        <li>کلاینت‌ها را به <Ltr>bootstrap</Ltr> خوشه پشتیبان ببرید.</li>
        <li>مصرف‌کننده‌ها با همان <Ltr>group id</Ltr> و آفست همگام ادامه می‌دهند.</li>
        <li>وقتی خوشه اصلی برگشت، جهت تکرار را برعکس یا از نو بسازید.</li>
      </ol>
      <CodeBlock code={mm2Status} language="bash" filename="mm2-status.sh" />
      <Callout variant="danger" title="MM2 همگام نیست">
        تکرار بین خوشه‌ای غیرهمگام است و همیشه <Ltr>RPO</Ltr> بزرگ‌تر از صفر
        دارد. اگر تولیدکننده تا لحظه آخر به خوشه اصلی بنویسد و همان لحظه خرابی
        رخ دهد، آن رکوردها در پشتیبان نیستند. برای داده حیاتی، ابتدا نوشتن را
        متوقف کنید و بعد <Ltr>failover</Ltr> کنید.
      </Callout>

      <h2>۶. چک‌لیست ارتقا و بازیابی فاجعه</h2>
      <ol>
        <li>مسیر ارتقا و سازگاری نسخه‌ها را از مستندات رسمی تأیید کنید.</li>
        <li>در <Ltr>staging</Ltr> با داده و بار شبیه تولید تمرین کنید.</li>
        <li>پشتیبان تنظیمات، <Ltr>ACL</Ltr> و متادیتا داشته باشید.</li>
        <li>کنترلرها و بروکرها را یکی‌یکی و با پایش <Ltr>ISR</Ltr> ارتقا دهید.</li>
        <li>نسخه پروتکل را فقط بعد از همه بروکرها بالا ببرید.</li>
        <li>کلاینت‌ها و اکوسیستم را بعد از بروکرها ارتقا دهید.</li>
        <li>تأخیر تکرار <Ltr>MM2</Ltr>، همگام‌سازی آفست و <Ltr>ACL</Ltr> را پایش کنید.</li>
        <li><Ltr>failover</Ltr> را واقعاً تمرین کنید؛ طرحی که تست نشده، طرح نیست.</li>
      </ol>

      <DeepDive title="جزئیات مهاجرت KRaft و MirrorMaker 2">
        <DeepDiveSection title="مسیر ZooKeeper به KRaft">
          <p>
            مهاجرت با یک نسخه <Ltr>bridge</Ltr> شروع می‌شود که هر دو حالت را می‌فهمد. بعد
            کورم کنترلر را راه می‌اندازید، متادیتا را مهاجرت می‌دهید و در پایان
            <Ltr>ZooKeeper</Ltr> را بازنشسته می‌کنید. در هر مرحله باید اکثریت
            کنترلرها سالم باشند. بازگشت از KRaft به ZooKeeper پشتیبانی نمی‌شود،
            پس پشتیبان و تمرین قبلی حیاتی است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="کورم ثابت و پویا">
          <p>
            در کورم ثابت، فهرست کنترلرها در تنظیمات نوشته می‌شود. در کورم پویا،
            کنترلرها می‌توانند اضافه یا حذف شوند و تغییر از طریق متادیتا منتشر
            می‌شود. برای خوشه‌های بزرگ، کورم پویا انعطاف بیشتری می‌دهد اما باید
            با <Ltr>kafka-metadata-quorum.sh</Ltr> پایش شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="ترجمه آفست در MM2">
          <p>
            آفست یک رکورد در خوشه مقصد با مبدأ یکی نیست، چون ترتیب و تعداد
            رکوردها متفاوت است. <Ltr>MirrorCheckpointConnector</Ltr> نگاشت آفست
            را در <Ltr>checkpoints.internal</Ltr> ذخیره می‌کند و با{' '}
            <Ltr>sync.group.offsets.enabled=true</Ltr> آفست گروه را در مقصد
            می‌نویسد. کلاینت می‌تواند با{' '}
            <Ltr>RemoteClusterUtils.translateOffsets</Ltr> نگاشت را بخواند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="تکرار دوطرفه و حلقه">
          <p>
            در <Ltr>active-active</Ltr>، هر خوشه هم مبدأ و هم مقصد است. پیشوند نام خوشه
            جلوی کپی شدن یک رکورد به‌صورت بی‌پایان را می‌گیرد، اما همچنان باید
            <Ltr>topics.exclude</Ltr> و تاپیک‌های داخلی را درست تنظیم کنید. برای
            جلوگیری از بازخورد، هر جهت فقط تاپیک‌های محلی خودش را تکرار کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="پایش تأخیر تکرار">
          <p>
            <Ltr>MirrorHeartbeatConnector</Ltr> در هر بازه یک رکورد <Ltr>heartbeat</Ltr>
            می‌فرستد و تأخیر تکرار را قابل اندازه‌گیری می‌کند. علاوه بر آن،
            <Ltr>lag</Ltr> کانکتورها و وضعیت <Ltr>tasks</Ltr> را در{' '}
            <Ltr>Kafka Connect</Ltr> ببینید. تأخیر در حال رشد یعنی مقصد عقب
            افتاده و <Ltr>failover</Ltr> در آن لحظه داده بیشتری از دست می‌دهد.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="ارتقای همه‌چیز با هم">
        بروکر، کلاینت، <Ltr>Connect</Ltr> و <Ltr>Schema Registry</Ltr> را
        هم‌زمان ارتقا ندهید. اگر مشکلی پیش بیاید، نمی‌دانید از کدام مؤلفه است.
        ترتیب و فاصله زمانی بین مراحل را حفظ کنید.
      </Callout>
      <Callout variant="danger" title="بالا بردن زودهنگام پروتکل">
        <Ltr>inter.broker.protocol.version</Ltr> قبل از ارتقای همه بروکرها یعنی
        بروکر قدیمی نمی‌تواند با بقیه حرف بزند. بعد از آخرین بروکر و با یک دور
        <Ltr>restart</Ltr> دیگر این کار را انجام دهید.
      </Callout>
      <Callout variant="warning" title="MM2 بدون همگام‌سازی ACL و آفست">
        اگر <Ltr>sync.topic.acls.enabled</Ltr> و{' '}
        <Ltr>sync.group.offsets.enabled</Ltr> را بررسی نکنید، بعد از <Ltr>failover</Ltr>
        مصرف‌کننده‌ها یا مجوز ندارند یا از ابتدا شروع می‌کنند. این دو تنظیم را
        بخشی از طرح <Ltr>DR</Ltr> ببینید.
      </Callout>
      <Callout variant="warning" title="انتظار exactly-once از MM2">
        <Ltr>MirrorMaker 2</Ltr> تراکنش‌های تولیدکننده را به‌صورت <Ltr>end-to-end</Ltr>
        منتقل نمی‌کند. برای جریان‌های تراکنشی، طرح جداگانه و آزمون دقیق لازم
        است. تکرار، جایگزین <Ltr>semantic</Ltr>های تراکنشی نیست.
      </Callout>
      <Callout variant="warning" title="طرح بازیابی فاجعه تست‌نشده">
        اگر <Ltr>failover</Ltr> را تمرین نکرده‌اید، در لحظه حادثه با تنظیمات، آفست و
        مجوزهای ناشناخته روبه‌رو می‌شوید. حداقل هر چند ماه یک تمرین کنترل‌شده
        انجام دهید.
      </Callout>

      <h2>جمع‌بندی فصل</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>ارتقا را یکی‌یکی، با پایش <Ltr>ISR</Ltr> و کورم انجام دهید.</li>
        <li>نسخه پروتکل را فقط بعد از همه بروکرها بالا ببرید.</li>
        <li>کلاینت‌ها و اکوسیستم را جدا و بعد از بروکرها ارتقا دهید.</li>
        <li><Ltr>MM2</Ltr> تاپیک‌ها، تنظیمات، <Ltr>ACL</Ltr> و آفست را با تأخیر کپی می‌کند.</li>
        <li>تکرار بین خوشه‌ای همگام نیست و <Ltr>RPO</Ltr> بزرگ‌تر از صفر دارد.</li>
        <li>طرح ارتقا و DR فقط با تمرین واقعی قابل اعتماد است.</li>
      </ul>
      <p>
        با این درس، فصل «امنیت، پایش و عملیات» کامل می‌شود. حالا می‌دانید خوشه
        را امن کنید، سلامت و ظرفیتش را بسنجید، مشکلات رایج را عیب‌یابی کنید و
        بدون قطعی ارتقا دهید. در فصل بعد به الگوهای معماری و جمع‌بندی دوره
        می‌رسیم.
      </p>
    </>
  )
}
