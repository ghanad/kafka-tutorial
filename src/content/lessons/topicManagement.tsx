import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const createTopic = `# ساخت تاپیک با ۱۲ پارتیشن، سه replica و چند تنظیم اختصاصی
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic orders.events \\
  --partitions 12 --replication-factor 3 \\
  --config retention.ms=604800000 \\
  --config min.insync.replicas=2 \\
  --if-not-exists

# اگر تاپیک از قبل وجود داشته باشد، --if-not-exists خطا نمی‌دهد`

const describeCommands = `# توصیف یک تاپیک
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --topic orders.events

# فقط پارتیشن‌هایی که ISR آن‌ها کوچک‌تر از replicaهاست
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --under-replicated-partitions

# فقط پارتیشن‌هایی که رهبر ندارند
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --unavailable-partitions

# فقط تاپیک‌هایی که تنظیم اختصاصی دارند
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --topics-with-overrides

# فهرست تاپیک‌های کاربر، بدون تاپیک‌های داخلی
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --list --exclude-internal`

const describeOutput = `Topic: orders.events  TopicId: 7Q2m9xLpT1aV_3sK8nR0wA  PartitionCount: 12  ReplicationFactor: 3  Configs: min.insync.replicas=2,retention.ms=604800000
  Topic: orders.events  Partition: 0   Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
  Topic: orders.events  Partition: 1   Leader: 2  Replicas: 2,3,1  Isr: 2,3,1
  Topic: orders.events  Partition: 2   Leader: 3  Replicas: 3,1,2  Isr: 3,1,2
  Topic: orders.events  Partition: 3   Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
  Topic: orders.events  Partition: 4   Leader: 2  Replicas: 2,3,1  Isr: 2,3,1
  Topic: orders.events  Partition: 5   Leader: 3  Replicas: 3,1,2  Isr: 3,1,2`

const increasePartitions = `# افزایش تعداد پارتیشن از ۱۲ به ۲۴
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --alter --topic orders.events --partitions 24

# کاهش تعداد پارتیشن ممکن نیست؛ این دستور خطا می‌دهد
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --alter --topic orders.events --partitions 6

# Topic currently has 24 partitions, which is higher than the requested 6.`

const configCommands = `# دیدن همه تنظیمات مؤثر، نه فقط overrideها
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --entity-type topics --entity-name orders.events --describe --all

# کوتاه کردن retention به ۳۰ روز
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --entity-type topics --entity-name orders.events \\
  --alter --add-config retention.ms=2592000000

# تغییر سیاست پاک‌سازی به compaction همراه با حذف قدیمی‌ها
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --entity-type topics --entity-name orders.events \\
  --alter --add-config cleanup.policy=compact,delete

# حذف override تا مقدار بروکر دوباره اعمال شود
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --entity-type topics --entity-name orders.events \\
  --alter --delete-config retention.ms`

const deleteTopic = `# حذف تاپیک؛ اگر وجود نداشته باشد خطا نمی‌دهد
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --delete --topic orders.events --if-exists

# تأیید حذف؛ ممکن است چند ثانیه طول بکشد
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --list | grep orders.events`

const copyTopic = `# اگر واقعاً به پارتیشن کمتر نیاز دارید، تاپیک تازه بسازید
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic orders.events.small \\
  --partitions 6 --replication-factor 3

# سپس داده را با یک ابزار جریان (Kafka Streams، Connect یا کد خودتان)
# از تاپیک قدیمی به تاپیک جدید منتقل کنید و بعد از تأیید، قدیمی را حذف کنید.`

const internalTopics = `# تاپیک‌های داخلی را با --exclude-internal نبینید
kafka-topics.sh --bootstrap-server localhost:9092 --list

# __consumer_offsets   آفست گروه‌های مصرف‌کننده
# __transaction_state  وضعیت تراکنش‌ها`

export function TopicManagementContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        ساخت تاپیک ساده است؛ مدیریت آن در طول زمان سخت است. تعداد پارتیشن را
        زیاد می‌کنید، retention را کوتاه می‌کنید، یک تنظیم را عوض می‌کنید یا
        تاپیکی را حذف می‌کنید. هر کدام از این کارها اثر مستقیم روی ترتیب داده،
        مصرف‌کننده‌ها و ظرفیت خوشه دارد. این درس دستورهای مدیریت تاپیک را با
        پیامدهای واقعی‌شان مرور می‌کند.
      </p>

      <h2>۱. ساخت تاپیک: پارامترها و نام‌گذاری</h2>
      <p>
        حداقل سه تصمیم در لحظه ساخت گرفته می‌شود: تعداد پارتیشن، ضریب تکثیر و
        تنظیمات اختصاصی. بقیه تنظیمات از بروکر به ارث می‌رسند:
      </p>
      <CodeBlock code={createTopic} language="bash" filename="create-topic.sh" />
      <p>
        نام تاپیک فقط می‌تواند شامل حروف لاتین، رقم، نقطه، خط تیره و زیرخط باشد و
        حداکثر ۲۴۹ کاراکتر طول داشته باشد. از ترکیب نقطه و زیرخط در یک نام پرهیز
        کنید؛ چون نام‌های <Ltr>orders.events</Ltr> و <Ltr>orders_events</Ltr> در
        متریک‌های <Ltr>JMX</Ltr> به یک نام تبدیل می‌شوند و تشخیصشان سخت می‌شود.
      </p>
      <Callout variant="tip" title="نام تاپیک را مثل یک قرارداد ببینید">
        نام خوب، دامنه و نوع رویداد را نشان می‌دهد: <Ltr>orders.events</Ltr>،{' '}
        <Ltr>payments.transactions</Ltr> یا <Ltr>inventory.snapshots</Ltr>. از
        نام‌های مبهم مثل <Ltr>test</Ltr> یا <Ltr>data</Ltr> در محیط مشترک پرهیز
        کنید. نام تاپیک بعد از ساخت قابل تغییر نیست.
      </Callout>

      <h2>۲. توصیف تاپیک و خواندن خروجی</h2>
      <p>
        دستور <Ltr>--describe</Ltr> چند حالت تخصصی دارد که برای پایش سریع خیلی
        مفیدند:
      </p>
      <CodeBlock code={describeCommands} language="bash" filename="describe.sh" />
      <p>
        خروجی معمولی برای هر پارتیشن یک خط دارد. فیلدهای <Ltr>Leader</Ltr>،{' '}
        <Ltr>Replicas</Ltr> و <Ltr>Isr</Ltr> را در درس CLI دیدیم؛ اینجا فقط دو
        نکته اضافه می‌شود:
      </p>
      <CodeBlock code={describeOutput} language="text" filename="describe-output.txt" />
      <ul>
        <li>
          <strong>
            <Ltr>TopicId</Ltr>:
          </strong>{' '}
          شناسه‌ای است که کافکا هنگام ساخت تولید می‌کند و برخلاف نام، پایدار
          می‌ماند. ابزارهای پایش از همین شناسه برای تشخیص تاپیک استفاده می‌کنند.
        </li>
        <li>
          <strong>
            <Ltr>Configs</Ltr>:
          </strong>{' '}
          فقط تنظیماتی را نشان می‌دهد که در سطح تاپیک override شده‌اند. برای دیدن
          مقدار مؤثر همه تنظیمات، از <Ltr>kafka-configs.sh --all</Ltr> استفاده
          کنید.
        </li>
      </ul>

      <h2>۳. افزایش تعداد پارتیشن: فقط یک جهت</h2>
      <p>
        تعداد پارتیشن را می‌توان افزایش داد، اما هرگز کاهش نداد. کافکا آفست‌ها و
        ایندکس‌ها را بر اساس پارتیشن نگه می‌دارد؛ ادغام دو پارتیشن یعنی بازنویسی
        کل تاریخچه و شکستن ترتیب. به همین دلیل کاهش پارتیشن فقط با ساخت تاپیک
        جدید و انتقال داده ممکن است:
      </p>
      <CodeBlock code={increasePartitions} language="bash" filename="alter-partitions.sh" />
      <Callout variant="danger" title="افزایش پارتیشن، ترتیب کلیدهای قدیمی را می‌شکند">
        تولیدکننده پیش‌فرض کافکا پارتیشن را با{' '}
        <Ltr>murmur2(key) % number_of_partitions</Ltr> انتخاب می‌کند. وقتی تعداد
        پارتیشن از ۱۲ به ۲۴ برسد، همان کلید ممکن است به پارتیشن دیگری برود. از آن
        لحظه به بعد، رکوردهای جدید یک کلید ممکن است در پارتیشنی جدا از رکوردهای
        قدیمی بنشیند و ترتیب کلی آن کلید از دست برود. اگر ترتیب برایتان حیاتی است،
        افزایش پارتیشن را در یک پنجره توقف یا با نسخه‌بندی رویداد انجام دهید.
      </Callout>
      <p>
        انتخاب تعداد پارتیشن یک معامله است. پارتیشن بیشتر یعنی موازی‌سازی بیشتر،
        اما فایل‌هندل بیشتر، rebalance طولانی‌تر، متادیتای بیشتر و بازیابی
        کندتر. جدول زیر خلاصه این معامله است:
      </p>
      <table>
        <thead>
          <tr>
            <th>پارتیشن بیشتر</th>
            <th>پارتیشن کمتر</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>موازی‌سازی بیشتر بین مصرف‌کننده‌ها</td>
            <td>مدیریت ساده‌تر و سربار کمتر</td>
          </tr>
          <tr>
            <td>توان عبور بالاتر روی چند بروکر</td>
            <td>rebalance سریع‌تر و بازیابی کوتاه‌تر</td>
          </tr>
          <tr>
            <td>فایل و ایندکس بیشتر روی دیسک</td>
            <td>فایل‌هندل و حافظه کمتر</td>
          </tr>
          <tr>
            <td>متادیتای بیشتر برای کنترلر</td>
            <td>زمان راه‌اندازی و بازیابی کمتر</td>
          </tr>
          <tr>
            <td>احتمال پارتیشن‌های نامتعادل بیشتر</td>
            <td>توزیع ساده‌تر بین بروکرها</td>
          </tr>
        </tbody>
      </table>

      <h2>۴. ضریب تکثیر: از ساخت تا تغییر</h2>
      <p>
        ضریب تکثیر را در لحظه ساخت تعیین می‌کنید. اگر بعداً بخواهید آن را بالا
        ببرید، باید از reassignment استفاده کنید؛ همان ابزاری که در درس بعدی
        می‌بینیم. دو محدودیت مهم:
      </p>
      <ul>
        <li>
          ضریب تکثیر نمی‌تواند از تعداد بروکرهای زنده بیشتر باشد. روی خوشه
          سه‌بروکری، <Ltr>--replication-factor 4</Ltr> خطا می‌دهد.
        </li>
        <li>
          افزایش ضریب تکثیر، داده را کپی می‌کند و پهنای باند و دیسک مصرف می‌کند.
          در ساعت اوج، این کار را با throttle انجام دهید.
        </li>
      </ul>
      <p>
        برای بیشتر بارهای تولیدی، <Ltr>replication.factor=3</Ltr> و{' '}
        <Ltr>min.insync.replicas=2</Ltr> نقطه شروع منطقی است: یک بروکر می‌تواند
        از دست برود و نوشتن با <Ltr>acks=all</Ltr> ادامه پیدا کند.
      </p>

      <h2>۵. تنظیمات مهم تاپیک</h2>
      <p>
        تنظیمات تاپیک روی تنظیمات بروکر اولویت دارند. مهم‌ترین‌ها این‌ها هستند:
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
            <td>
              <Ltr>retention.ms</Ltr>
            </td>
            <td>
              <Ltr>604800000</Ltr> (۷ روز)
            </td>
            <td>عمر رکوردها؛ کوچک‌تر یعنی حذف زودتر و دیسک کمتر.</td>
          </tr>
          <tr>
            <td>
              <Ltr>retention.bytes</Ltr>
            </td>
            <td>
              <Ltr>-1</Ltr> (بی‌نهایت)
            </td>
            <td>سقف حجم هر پارتیشن؛ با رسیدن به سقف، سگمنت قدیمی حذف می‌شود.</td>
          </tr>
          <tr>
            <td>
              <Ltr>cleanup.policy</Ltr>
            </td>
            <td>
              <Ltr>delete</Ltr>
            </td>
            <td>
              <Ltr>delete</Ltr>، <Ltr>compact</Ltr> یا ترکیب{' '}
              <Ltr>compact,delete</Ltr>.
            </td>
          </tr>
          <tr>
            <td>
              <Ltr>min.insync.replicas</Ltr>
            </td>
            <td>
              <Ltr>1</Ltr> در بروکر
            </td>
            <td>حداقل نسخه همگام برای موفقیت <Ltr>acks=all</Ltr>.</td>
          </tr>
          <tr>
            <td>
              <Ltr>max.message.bytes</Ltr>
            </td>
            <td>
              <Ltr>1048588</Ltr>
            </td>
            <td>حداکثر حجم یک batch؛ باید با تنظیم تولیدکننده هم‌خوان باشد.</td>
          </tr>
          <tr>
            <td>
              <Ltr>segment.bytes</Ltr>
            </td>
            <td>
              <Ltr>1073741824</Ltr>
            </td>
            <td>اندازه هر سگمنت؛ روی دانه‌بندی حذف و compaction اثر دارد.</td>
          </tr>
          <tr>
            <td>
              <Ltr>compression.type</Ltr>
            </td>
            <td>
              <Ltr>producer</Ltr>
            </td>
            <td>فشرده‌سازی ذخیره‌سازی؛ معمولاً همان فشرده‌سازی تولیدکننده.</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={configCommands} language="bash" filename="topic-configs.sh" />
      <Callout variant="warning" title="min.insync.replicas=3 روی خوشه سه‌بروکری">
        این تنظیم امنیت بیشتری می‌دهد، اما با خاموش شدن یک بروکر، نوشتن با{' '}
        <Ltr>acks=all</Ltr> متوقف می‌شود. اگر در دسترس بودن برایتان مهم‌تر از
        تحمل از دست رفتن دو نسخه است، ۲ انتخاب متعادل‌تری است.
      </Callout>

      <h2>۶. حذف تاپیک: برگشت‌پذیر نیست</h2>
      <p>
        حذف تاپیک یک عملیات مدیریتی است، نه یک تنظیم. کافکا ابتدا تاپیک را از
        متادیتا خارج می‌کند و بعد فایل‌ها را به‌صورت غیرهمزمان پاک می‌کند. یعنی
        بعد از دستور، ممکن است چند ثانیه تا چند دقیقه طول بکشد تا داده واقعاً از
        دیسک برود:
      </p>
      <CodeBlock code={deleteTopic} language="bash" filename="delete-topic.sh" />
      <Callout variant="danger" title="قبل از حذف، مصرف‌کننده‌ها را متوقف کنید">
        اگر گروه مصرف‌کننده‌ای در حال خواندن تاپیک باشد، حذف تاپیک باعث خطا و
        rebalanceهای پیاپی می‌شود. اول تولیدکننده‌ها را متوقف کنید، بعد مصرف‌کننده
        را، و در پایان تاپیک را حذف کنید. برای داده‌های مهم، قبل از حذف یک نسخه
        پشتیبان یا تاپیک آرشیو بسازید.
      </Callout>
      <p>
        در خوشه‌های جدید <Ltr>delete.topic.enable</Ltr> به‌صورت پیش‌فرض فعال است.
        اگر روی خوشه‌ای این تنظیم خاموش باشد، دستور حذف فقط تاپیک را «علامت‌دار»
        می‌کند و داده پاک نمی‌شود. همیشه بعد از حذف با <Ltr>--list</Ltr> تأیید
        کنید.
      </p>

      <h2>۷. اگر واقعاً پارتیشن کمتر می‌خواهید</h2>
      <p>
        تنها راه امن، ساخت تاپیک جدید با تعداد پارتیشن کمتر و انتقال داده است.
        این کار را در یک پنجره نگهداری انجام دهید و تا پایان انتقال، هر دو تاپیک
        را زنده نگه دارید:
      </p>
      <CodeBlock code={copyTopic} language="bash" filename="copy-topic.sh" />

      <h2>۸. تاپیک‌های داخلی را دست نزنید</h2>
      <p>
        کافکا برای کارهای خودش تاپیک‌هایی می‌سازد که با{' '}
        <Ltr>__</Ltr> شروع می‌شوند. مهم‌ترین‌ها{' '}
        <Ltr>__consumer_offsets</Ltr> برای آفست گروه‌ها و{' '}
        <Ltr>__transaction_state</Ltr> برای تراکنش‌ها هستند. این تاپیک‌ها را حذف
        نکنید، تنظیماتشان را دستی عوض نکنید و در فهرست‌های روزمره با{' '}
        <Ltr>--exclude-internal</Ltr> کنار بگذارید:
      </p>
      <CodeBlock code={internalTopics} language="bash" filename="internal-topics.sh" />

      <DeepDive title="جزئیات طراحی: عدد پارتیشن را چطور حساب کنیم؟">
        <DeepDiveSection title="از توان عبور هدف شروع کنید">
          <p>
            فرض کنید باید ۱۰۰ مگابایت بر ثانیه بنویسید و هر پارتیشن روی یک بروکر
            به‌طور محافظه‌کارانه ۱۰ مگابایت بر ثانیه می‌دهد. با ضریب تکثیر ۳، هر
            بایت سه بار نوشته می‌شود؛ پس بار واقعی دیسک سه برابر است. اگر سه
            بروکر دارید، ۱۰۰ مگابایت ورودی یعنی حدود ۳۰۰ مگابایت نوشتن روی دیسک
            که بین سه بروکر پخش می‌شود. تعداد پارتیشن باید هم موازی‌سازی مصرف را
            پوشش دهد و هم از تعداد بروکرها خیلی بیشتر نباشد تا توزیع متعادل بماند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="سقف مصرف‌کننده‌ها">
          <p>
            در یک گروه مصرف‌کننده، هر پارتیشن فقط به یک مصرف‌کننده می‌رسد. اگر ۶
            پارتیشن داشته باشید، مصرف‌کننده هفتم بیکار می‌ماند. پس تعداد پارتیشن
            سقف موازی‌سازی گروه است. برای بارهایی که ممکن است چند برابر شوند،
            کمی حاشیه بگذارید؛ اما حاشیه زیاد یعنی سربار دائمی.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا کاهش پارتیشن این‌قدر سخت است؟">
          <p>
            هر پارتیشن یک لاگ مستقل با آفست‌های مستقل است. اگر دو پارتیشن را در
            یکی ادغام کنید، آفست‌ها تکراری می‌شوند، ترتیب بین دو جریان به هم
            می‌ریزد و مصرف‌کننده‌هایی که آفست ذخیره کرده‌اند نمی‌دانند از کجا
            ادامه دهند. کافکا برای جلوگیری از این ناسازگاری، کاهش را اصلاً مجاز
            نمی‌داند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="حذف غیرهمزمان چه معنایی دارد؟">
          <p>
            حذف تاپیک در متادیتا فوری است، اما پاک کردن فایل‌ها به بروکرها سپرده
            می‌شود. اگر بروکری در آن لحظه در دسترس نباشد، فایل‌ها تا وقتی برگردد
            باقی می‌مانند. به همین دلیل بعد از حذف، ممکن است فضای دیسک فوراً آزاد
            نشود. برای تأیید نهایی، وضعیت دیسک را با{' '}
            <Ltr>kafka-log-dirs.sh</Ltr> بررسی کنید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="کاهش تعداد پارتیشن با alter">
        این کار ممکن نیست و خطا می‌دهد. اگر تعداد پارتیشن را اشتباه انتخاب
        کردید، تنها راه ساخت تاپیک جدید و انتقال داده است. برای جلوگیری از این
        وضعیت، تعداد پارتیشن را بر اساس سقف مصرف‌کننده‌های آینده انتخاب کنید.
      </Callout>
      <Callout variant="danger" title="حذف تاپیک بدون بررسی وابستگی‌ها">
        قبل از حذف، ببینید چه گروه‌هایی این تاپیک را می‌خوانند، چه سرویس‌هایی
        می‌نویسند و آیا در <Ltr>Kafka Connect</Ltr> یا <Ltr>Streams</Ltr> به آن
        ارجاع شده است. حذف تاپیک می‌تواند یک خط تولید را متوقف کند.
      </Callout>
      <Callout variant="warning" title="retention خیلی کوتاه روی تاپیک رویداد">
        اگر <Ltr>retention.ms</Ltr> را روی چند ساعت بگذارید، مصرف‌کننده‌ای که یک
        روز قطع بوده نمی‌تواند عقب‌ماندگی را جبران کند. برای تاپیک‌های رویداد،
        retention را بر اساس حداکثر زمان قطعی قابل قبول انتخاب کنید.
      </Callout>
      <Callout variant="warning" title="compact روی تاپیکی که کلید ندارد">
        <Ltr>cleanup.policy=compact</Ltr> فقط وقتی معنا دارد که رکوردها کلید
        داشته باشند. روی تاپیک بدون کلید، compaction عملاً کاری نمی‌کند و فقط
        انتظار اشتباهی ایجاد می‌کند.
      </Callout>
      <Callout variant="info" title="تغییر تنظیمات بدون بازسازی تاپیک">
        بیشتر تنظیمات تاپیک در حال اجرا قابل تغییرند، اما بعضی تغییرات مثل{' '}
        <Ltr>cleanup.policy</Ltr> فقط روی سگمنت‌های جدید اثر می‌گذارند. انتظار
        نداشته باشید تغییر تنظیم، بلافاصله کل تاریخچه را بازنویسی کند.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>تعداد پارتیشن فقط افزایش می‌یابد و کاهش آن نیازمند تاپیک جدید است.</li>
        <li>
          افزایش پارتیشن می‌تواند ترتیب کلیدهای قدیمی را بشکند؛ با احتیاط انجام
          دهید.
        </li>
        <li>
          <Ltr>replication.factor=3</Ltr> و <Ltr>min.insync.replicas=2</Ltr>{' '}
          نقطه شروع متعادلی است.
        </li>
        <li>
          تنظیمات تاپیک بر تنظیمات بروکر اولویت دارند؛ برای دیدن مقدار مؤثر{' '}
          <Ltr>--all</Ltr> بدهید.
        </li>
        <li>حذف تاپیک غیرهمزمان و برگشت‌پذیر نیست؛ اول وابستگی‌ها را بررسی کنید.</li>
        <li>
          تاپیک‌های <Ltr>__consumer_offsets</Ltr> و{' '}
          <Ltr>__transaction_state</Ltr> را دست نزنید.
        </li>
      </ul>
      <p>
        حالا می‌دانیم چطور تاپیک را بسازیم، تغییر دهیم و حذف کنیم. در درس بعد
        می‌بینیم چطور پارتیشن‌ها را بین بروکرها جابه‌جا کنیم؛ همان کاری که برای
        اضافه کردن بروکر جدید یا بازتوزیع بار لازم است.
      </p>
    </>
  )
}
