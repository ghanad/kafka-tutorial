import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const groupDiagnosis = `# وضعیت گروه و تعداد اعضا
kafka-consumer-groups.sh --bootstrap-server broker-1:9092 \\
  --describe --group billing --state

# تخصیص پارتیشن‌ها و lag هر عضو
kafka-consumer-groups.sh --bootstrap-server broker-1:9092 \\
  --describe --group billing --members --verbose

# فهرست همه گروه‌ها و وضعیت آن‌ها
kafka-consumer-groups.sh --bootstrap-server broker-1:9092 --list`

const consumerConfig = `# consumer.properties — شروع محافظه‌کارانه
session.timeout.ms=45000
heartbeat.interval.ms=3000
max.poll.interval.ms=300000
max.poll.records=200
group.instance.id=consumer-billing-1`

const diskCommands = `# حجم هر پارتیشن روی هر بروکر
kafka-log-dirs.sh --bootstrap-server broker-1:9092 \\
  --describe --topic-list orders

# کاهش مدت نگه‌داری یک تاپیک (با احتیاط)
kafka-configs.sh --bootstrap-server broker-1:9092 \\
  --entity-type topics --entity-name orders \\
  --alter --add-config retention.ms=259200000

# حذف رکوردهای قبل از آفست مشخص
kafka-delete-records.sh --bootstrap-server broker-1:9092 \\
  --offset-json-file delete-orders.json`

const deleteRecordsJson = `{
  "version": 1,
  "partitions": [
    { "topic": "orders", "partition": 0, "offset": 1000 },
    { "topic": "orders", "partition": 1, "offset": 800 }
  ]
}`

const replicationCommands = `# پارتیشن‌هایی که ISR ناقص دارند
kafka-topics.sh --bootstrap-server broker-1:9092 \\
  --describe --under-replicated-partitions

# پارتیشن‌های بدون لیدر
kafka-topics.sh --bootstrap-server broker-1:9092 \\
  --describe --unavailable-partitions

# وضعیت کورم KRaft
kafka-metadata-quorum.sh --bootstrap-server broker-1:9092 describe --status`

export function TroubleshootingContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در عملیات واقعی، بیشتر وقت تیم صرف عیب‌یابی می‌شود، نه نصب. مشکل معمولاً
        با یک نشانه شروع می‌شود: lag بالا، rebalance تکراری، دیسک پر یا پارتیشن
        آفلاین. کار درست این است که از نشانه به متریک، از متریک به لاگ و از لاگ
        به علت برسیم؛ نه اینکه اولین تنظیمی که به ذهنمان می‌رسد را عوض کنیم.
      </p>

      <Callout variant="info" title="قبل از تغییر، وضعیت را ثبت کنید">
        قبل از هر اقدام، خروجی وضعیت فعلی را ذخیره کنید: lag، <Ltr>ISR</Ltr>،
        فضای دیسک و تنظیمات تاپیک. بعد از تغییر می‌توانید مقایسه کنید و بفهمید
        مشکل حل شد یا فقط جابه‌جا شد.
      </Callout>

      <h2>۱. روش پنج مرحله‌ای عیب‌یابی</h2>
      <table>
        <thead>
          <tr>
            <th>مرحله</th>
            <th>سؤال</th>
            <th>ابزار</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>نشانه</td>
            <td>کاربر چه چیزی را از دست داده یا کند حس می‌کند؟</td>
            <td>هشدار، داشبورد، گزارش تیم</td>
          </tr>
          <tr>
            <td>دامنه</td>
            <td>همه خوشه، یک بروکر، یک تاپیک یا یک گروه؟</td>
            <td>متریک‌های تفکیک‌شده</td>
          </tr>
          <tr>
            <td>شاهد</td>
            <td>چه متریک و لاگی با نشانه هم‌زمان است؟</td>
            <td><Ltr>JMX</Ltr>، لاگ بروکر، لاگ مصرف‌کننده</td>
          </tr>
          <tr>
            <td>علت</td>
            <td>کدام منبع یا تنظیم این شاهد را توضیح می‌دهد؟</td>
            <td>تحلیل، آزمون کنترل‌شده</td>
          </tr>
          <tr>
            <td>اقدام و تأیید</td>
            <td>آیا بعد از تغییر، نشانه واقعاً برطرف شد؟</td>
            <td>همان متریک‌ها و لاگ‌ها</td>
          </tr>
        </tbody>
      </table>

      <h2>۲. Rebalance مداوم</h2>
      <p>
        اگر لاگ مصرف‌کننده پر از پیام‌های <Ltr>Preparing to rebalance</Ltr> و{' '}
        <Ltr>Member has left the group</Ltr> باشد و lag پله‌ای بالا و پایین
        برود، گروه در چرخه rebalance گیر کرده است. هر rebalance پردازش را متوقف
        می‌کند، پس این وضعیت می‌تواند ساعت‌ها طول بکشد.
      </p>
      <table>
        <thead>
          <tr>
            <th>علت احتمالی</th>
            <th>نشانه</th>
            <th>راه‌حل</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>پردازش طولانی‌تر از <Ltr>max.poll.interval.ms</Ltr></td>
            <td>عضو بعد از هر دسته از گروه بیرون می‌افتد</td>
            <td>کاهش <Ltr>max.poll.records</Ltr> یا افزایش بازه</td>
          </tr>
          <tr>
            <td><Ltr>session.timeout.ms</Ltr> خیلی کوتاه</td>
            <td>قطع کوتاه شبکه عضو را بیرون می‌اندازد</td>
            <td>تنظیم ۴۵ ثانیه و <Ltr>heartbeat</Ltr> ۳ ثانیه</td>
          </tr>
          <tr>
            <td>مکث طولانی <Ltr>GC</Ltr></td>
            <td><Ltr>heartbeat</Ltr> دیر می‌رسد</td>
            <td>اصلاح <Ltr>heap</Ltr> و <Ltr>GC</Ltr>، نه فقط تایم‌اوت</td>
          </tr>
          <tr>
            <td>استقرار مکرر یا خاموشی برنامه</td>
            <td><Ltr>rebalance</Ltr> هم‌زمان با <Ltr>deploy</Ltr></td>
            <td>استقرار تدریجی و <Ltr>static membership</Ltr></td>
          </tr>
          <tr>
            <td>شبکه ناپایدار</td>
            <td>قطع و وصل مکرر اتصال‌ها</td>
            <td>رفع مشکل شبکه؛ تایم‌اوت فقط پوشش است</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={groupDiagnosis} language="bash" filename="diagnose-group.sh" />
      <CodeBlock code={consumerConfig} language="properties" filename="consumer.properties" />
      <Callout variant="warning" title="افزایش تایم‌اوت درمان نیست">
        اگر پردازش هر دسته ۱۰ دقیقه طول می‌کشد، بزرگ کردن{' '}
        <Ltr>max.poll.interval.ms</Ltr> فقط علامت را پنهان می‌کند. اول ببینید
        چرا پردازش کند است؛ سپس تایم‌اوت را با واقعیت هماهنگ کنید.
      </Callout>

      <h2>۳. Lag بالا</h2>
      <p>
        اول مشخص کنید lag در حال رشد است یا ثابت. اگر ثابت است، احتمالاً
        مصرف‌کننده با نرخ ورود همگام است و فقط عقب‌ماندگی تاریخی دارد. اگر رشد
        می‌کند، ظرفیت مصرف از تولید کمتر است. این جدول علت‌های رایج را جدا
        می‌کند:
      </p>
      <table>
        <thead>
          <tr>
            <th>الگو</th>
            <th>علت احتمالی</th>
            <th>بررسی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>lag روی همه پارتیشن‌ها</td>
            <td>کمبود مصرف‌کننده یا کندی مشترک</td>
            <td>تعداد عضو، <Ltr>CPU</Ltr> و وابستگی‌های بیرونی</td>
          </tr>
          <tr>
            <td>lag روی یک پارتیشن</td>
            <td>کلید داغ یا پیام سمی</td>
            <td>توزیع کلید و زمان پردازش همان پارتیشن</td>
          </tr>
          <tr>
            <td>lag پله‌ای</td>
            <td>rebalance یا قطعی موقت</td>
            <td>لاگ گروه و زمان deploy</td>
          </tr>
          <tr>
            <td>lag بعد از افزایش تولید</td>
            <td>ظرفیت مصرف‌کننده ثابت مانده</td>
            <td>نرخ ورود و خروج را کنار هم ببینید</td>
          </tr>
        </tbody>
      </table>
      <p>
        مثال مشخص: گروه <Ltr>billing</Ltr> روی ۱۲ پارتیشن با ۳ مصرف‌کننده
        کار می‌کند. کلید <Ltr>customer-42</Ltr> حدود ۷۰٪ سفارش‌ها را می‌سازد و
        همه به یک پارتیشن می‌روند. lag فقط روی پارتیشن ۳ رشد می‌کند. افزودن
        مصرف‌کننده کمکی نمی‌کند، چون یک پارتیشن فقط به یک مصرف‌کننده در گروه
        تخصیص می‌یابد. راه‌حل، تغییر طراحی کلید (مثلاً{' '}
        <Ltr>customer-42:order-id</Ltr>) یا جدا کردن جریان پرترافیک است؛ با
        پذیرش اینکه ترتیب سفارش‌های یک مشتری دیگر تضمین نشود.
      </p>
      <Callout variant="danger" title="بازنشانی آفست به‌عنوان اولین راه‌حل">
        بازنشانی آفست lag را صفر می‌کند اما داده را دوباره پردازش یا دور
        می‌ریزد. قبل از آن باید بدانید مصرف‌کننده چقدر عقب است، پردازش
        <Ltr>idempotent</Ltr> است یا نه و آیا بازپخش مجاز است. بازنشانی، درمان علت نیست.
      </Callout>

      <h2>۴. دیسک پر شده</h2>
      <p>
        پر شدن دیسک معمولاً یک شبه اتفاق نمی‌افتد؛ یا نگه‌داری بیش از حد است، یا
        یک تاپیک پرترافیک اضافه شده، یا <Ltr>compaction</Ltr> کار نمی‌کند. اول ببینید کدام
        تاپیک و کدام پارتیشن فضا را می‌خورد:
      </p>
      <CodeBlock code={diskCommands} language="bash" filename="disk-triage.sh" />
      <CodeBlock code={deleteRecordsJson} language="json" filename="delete-orders.json" />
      <Callout variant="danger" title="فایل سگمنت را دستی پاک نکنید">
        حذف دستی فایل‌های <Ltr>.log</Ltr> و <Ltr>.index</Ltr> می‌تواند لاگ را
        ناسازگار کند و باعث کپی‌برداری کامل یا خرابی پارتیشن شود. از{' '}
        <Ltr>retention</Ltr>، <Ltr>delete-records</Ltr> یا{' '}
        <Ltr>reassignment</Ltr> استفاده کنید.
      </Callout>
      <p>
        اگر دیسک نزدیک ۹۰٪ است، گزینه‌های اضطراری به ترتیب ریسک عبارت‌اند:
        افزودن دیسک یا بروکر، کاهش <Ltr>retention.bytes</Ltr> یا{' '}
        <Ltr>retention.ms</Ltr> برای تاپیک‌های کم‌ارزش، حذف رکوردهای قدیمی با{' '}
        <Ltr>delete-records</Ltr> و در نهایت جابه‌جایی پارتیشن‌ها. هر کدام را
        با پایش انجام دهید و اثرش را روی مصرف‌کننده‌ها بسنجید.
      </p>

      <h2>۵. پارتیشن Under-Replicated یا Offline</h2>
      <p>
        <Ltr>UnderReplicatedPartitions</Ltr> یعنی یک نسخه از <Ltr>ISR</Ltr> عقب
        است. اگر لیدر هم از دست برود و نسخه همگام دیگری نباشد، پارتیشن آفلاین
        می‌شود. علت‌های رایج: بروکر خاموش، شبکه کند، دیسک کند، مکث طولانی{' '}
        <Ltr>GC</Ltr> یا ناهماهنگی کورم در <Ltr>KRaft</Ltr>.
      </p>
      <CodeBlock code={replicationCommands} language="bash" filename="replication-triage.sh" />
      <p>
        اگر بروکر برنگشت، نسخه‌هایش را با <Ltr>reassignment</Ltr> به بروکرهای
        زنده منتقل کنید. اگر بروکر برگشت، قبل از دادن بار به آن صبر کنید تا{' '}
        <Ltr>ISR</Ltr> کامل شود. در <Ltr>KRaft</Ltr>، از دست رفتن اکثریت کورم
        کنترلر یعنی توقف تصمیم‌های متادیتا؛ این وضعیت را با{' '}
        <Ltr>kafka-metadata-quorum.sh</Ltr> ببینید.
      </p>

      <h2>۶. خطاهای رایج کلاینت</h2>
      <table>
        <thead>
          <tr>
            <th>خطا</th>
            <th>معنی</th>
            <th>اقدام</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>NOT_ENOUGH_REPLICAS</Ltr></td>
            <td>تعداد اعضای <Ltr>ISR</Ltr> از <Ltr>min.insync.replicas</Ltr> کمتر است</td>
            <td>برگشت بروکرها و کامل شدن <Ltr>ISR</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>REQUEST_TIMED_OUT</Ltr></td>
            <td>پاسخ در زمان مقرر نرسید</td>
            <td>شبکه، بار بروکر و تنظیمات <Ltr>retry</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>RecordTooLargeException</Ltr></td>
            <td>رکورد از سقف مجاز بزرگ‌تر است</td>
            <td>افزایش سقف یا تقسیم رکورد</td>
          </tr>
          <tr>
            <td><Ltr>OffsetOutOfRangeException</Ltr></td>
            <td>آفست ذخیره‌شده بیرون از بازه موجود است</td>
            <td>سیاست بازنشانی آفست و بررسی نگه‌داری</td>
          </tr>
          <tr>
            <td><Ltr>UNKNOWN_TOPIC_OR_PARTITION</Ltr></td>
            <td>تاپیک هنوز در متادیتا نیست یا حذف شده</td>
            <td>بررسی نام، ساخت تاپیک و انتظار انتشار متادیتا</td>
          </tr>
          <tr>
            <td><Ltr>AUTHORIZATION_FAILED</Ltr></td>
            <td>مجوز <Ltr>ACL</Ltr> برای منبع وجود ندارد</td>
            <td>افزودن مجوز تاپیک یا گروه</td>
          </tr>
          <tr>
            <td><Ltr>GROUP_AUTHORIZATION_FAILED</Ltr></td>
            <td>مجوز گروه مصرف‌کننده داده نشده است</td>
            <td>افزودن <Ltr>Read</Ltr> روی گروه</td>
          </tr>
          <tr>
            <td><Ltr>INVALID_REPLICATION_FACTOR</Ltr></td>
            <td><Ltr>RF</Ltr> از تعداد بروکرها بیشتر است</td>
            <td>کاهش <Ltr>RF</Ltr> یا افزودن بروکر</td>
          </tr>
          <tr>
            <td><Ltr>PRODUCER_FENCED</Ltr></td>
            <td>تولیدکننده تراکنشی قدیمی کنار گذاشته شده است</td>
            <td>بررسی تراکنش و نمونه‌های هم‌زمان</td>
          </tr>
        </tbody>
      </table>

      <h2>۷. Runbook و پایش</h2>
      <p>
        برای هر نشانه پرتکرار یک <Ltr>Runbook</Ltr> کوتاه بنویسید: چه متریکی را
        ببینیم، چه دستوری اجرا کنیم، چه کاری ممنوع است و چه زمانی به تیم بعدی
        <Ltr>escalate</Ltr> کنیم. بعد از هر حادثه، <Ltr>postmortem</Ltr> کوتاه بنویسید و
        هشدار یا پایش لازم را اضافه کنید.
      </p>
      <ol>
        <li>نشانه را با زمان شروع و دامنه ثبت کنید.</li>
        <li>وضعیت خوشه، گروه و دیسک را قبل از تغییر ذخیره کنید.</li>
        <li>یک تغییر در هر زمان انجام دهید و اثرش را بسنجید.</li>
        <li>بعد از رفع، روند را چند ساعت پایش کنید.</li>
        <li>علت ریشه‌ای را مستند کنید، نه فقط اقدام موقت.</li>
      </ol>

      <DeepDive title="جزئیات لاگ‌ها، تِرِد و کورم">
        <DeepDiveSection title="کدام لاگ را بخوانیم">
          <p>
            لاگ اصلی بروکر <Ltr>server.log</Ltr> است. در <Ltr>KRaft</Ltr>،{' '}
            <Ltr>controller.log</Ltr> تصمیم‌های کنترلر و{' '}
            <Ltr>state-change.log</Ltr> تغییر وضعیت پارتیشن‌ها را نشان می‌دهد.
            برای مصرف‌کننده، لاگ برنامه معمولاً بهترین منبع است: زمان شروع و
            پایان پردازش هر دسته و خطای وابستگی‌ها.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="مکث GC و تِرِد‌دامپ">
          <p>
            اگر <Ltr>heartbeat</Ltr> دیر می‌رسد اما شبکه سالم است، احتمالاً <Ltr>GC</Ltr>{' '}
            طولانی یا اشباع <Ltr>CPU</Ltr> است. لاگ <Ltr>GC</Ltr> را با{' '}
            <Ltr>-Xlog:gc*</Ltr> روشن کنید و در لحظه مشکل با{' '}
            <Ltr>jstack</Ltr> یک تِرِد‌دامپ بگیرید. اگر نخ‌های پردازش درخواست
            در انتظار دیسک‌اند، مشکل از دیسک است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="سگمنت خراب و dump-log">
          <p>
            اگر بروکر بعد از خرابی دیسک بالا نمی‌آید، <Ltr>kafka-dump-log.sh</Ltr>{' '}
            می‌تواند سگمنت را بررسی کند. حذف سگمنت خراب آخرین راه است و باید
            با هماهنگی انجام شود، چون ممکن است داده تأییدشده از دست برود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="کورم KRaft و کنترلر">
          <p>
            در <Ltr>KRaft</Ltr>، سلامت کنترلر به اکثریت کورم وابسته است. اگر یک
            کنترلر از سه کنترلر از دست برود، خوشه می‌تواند همچنان داده سرو کند
            اما تغییر متادیتا متوقف می‌شود. وضعیت را با{' '}
            <Ltr>kafka-metadata-quorum.sh describe --status</Ltr> ببینید و قبل
            از هر تغییر، اکثریت را حفظ کنید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="ری‌استارت همه بروکرها">
        ری‌استارت هم‌زمان خوشه، همه پارتیشن‌ها را آفلاین و همه گروه‌ها را
        rebalance می‌کند. همیشه یکی‌یکی و با پایش <Ltr>ISR</Ltr> جلو بروید.
      </Callout>
      <Callout variant="warning" title="تغییر چند تنظیم هم‌زمان">
        اگر هم‌زمان تایم‌اوت، اندازه دسته و تعداد مصرف‌کننده را عوض کنید،
        نمی‌فهمید کدام مؤثر بود. هر بار یک تغییر بدهید.
      </Callout>
      <Callout variant="warning" title="نادیده گرفتن یک پارتیشن">
        lag کل می‌تواند کوچک به نظر برسد اما یک پارتیشن ساعت‌ها عقب باشد.
        همیشه lag را در سطح پارتیشن ببینید.
      </Callout>
      <Callout variant="danger" title="پاک کردن لاگ برای آزاد کردن فضا">
        حذف دستی فایل‌های لاگ می‌تواند داده را ناسازگار کند. از تنظیمات
        نگه‌داری و ابزارهای رسمی استفاده کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>از نشانه به دامنه، شاهد، علت و تأیید حرکت کنید.</li>
        <li>rebalance مداوم معمولاً از پردازش کند یا تایم‌اوت ناهماهنگ می‌آید.</li>
        <li>lag را در سطح پارتیشن و همراه روند ببینید.</li>
        <li>دیسک پر را با نگه‌داری و ابزار رسمی حل کنید، نه حذف دستی.</li>
        <li><Ltr>UnderReplicatedPartitions</Ltr> و <Ltr>OfflinePartitionsCount</Ltr> را جدی بگیرید.</li>
        <li>برای هر نشانه <Ltr>Runbook</Ltr> و مالک مشخص داشته باشید.</li>
      </ul>
      <p>
        در درس آخر این فصل، دو عملیات پرریسک باقی‌مانده را می‌بینیم: ارتقای
        خوشه بدون قطعی و تکرار داده بین دیتاسنترها با <Ltr>MirrorMaker 2</Ltr>.
      </p>
    </>
  )
}
