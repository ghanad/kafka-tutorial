import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { PartitionReassignmentExplainer } from '../../components/simulators/PartitionReassignmentExplainer'

const topicsToMove = `{
  "version": 1,
  "topics": [
    { "topic": "orders" }
  ]
}`

const generatePlan = `# طرح جابه‌جایی همه پارتیشن‌های تاپیک orders روی بروکرهای ۱ تا ۴
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\
  --topics-to-move-json-file topics-to-move.json \\
  --broker-list "1,2,3,4" \\
  --generate`

const generateOutput = `Current partition replica assignment
{"version":1,"partitions":[
  {"topic":"orders","partition":0,"replicas":[1,2,3],"log_dirs":["any","any","any"]},
  {"topic":"orders","partition":1,"replicas":[2,3,1],"log_dirs":["any","any","any"]}
]}

Proposed partition reassignment configuration
{"version":1,"partitions":[
  {"topic":"orders","partition":0,"replicas":[2,3,4],"log_dirs":["any","any","any"]},
  {"topic":"orders","partition":1,"replicas":[3,4,1],"log_dirs":["any","any","any"]}
]}`

const manualPlan = `{
  "version": 1,
  "partitions": [
    {
      "topic": "orders",
      "partition": 0,
      "replicas": [2, 3, 4],
      "log_dirs": ["any", "any", "any"]
    },
    {
      "topic": "orders",
      "partition": 1,
      "replicas": [3, 4, 1],
      "log_dirs": ["any", "any", "any"]
    }
  ]
}`

const executePlan = `# اجرا با throttle پنجاه مگابایت بر ثانیه برای هر بروکر
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\
  --reassignment-json-file reassignment.json \\
  --execute --throttle 50000000

# بررسی پیشرفت؛ این دستور را تا رسیدن همه به Completed تکرار کنید
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\
  --reassignment-json-file reassignment.json \\
  --verify`

const verifyOutput = `Status of partition reassignment:
Reassignment of partition orders-0 is completed.
Reassignment of partition orders-1 is completed.

Clearing broker-level throttles on brokers 1,2,3,4
Clearing topic-level throttles on topic orders`

const preferredElection = `# انتخابات رهبر ترجیحی برای همه پارتیشن‌ها
kafka-leader-election.sh --bootstrap-server localhost:9092 \\
  --election-type preferred --all-topic-partitions

# یا فقط برای یک پارتیشن مشخص
kafka-leader-election.sh --bootstrap-server localhost:9092 \\
  --election-type preferred --topic orders --partition 0`

const monitorCommands = `# پارتیشن‌هایی که ISR آن‌ها کوچک شده است
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --under-replicated-partitions

# حجم دیسک هر پارتیشن روی هر بروکر
kafka-log-dirs.sh --bootstrap-server localhost:9092 \\
  --describe --topic-list orders

# lag گروه‌های مصرف‌کننده در طول جابه‌جایی
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --describe --group billing`

const rollbackPlan = `# اگر طرح را باید برگردانید، همان طرح قبلی را دوباره اجرا کنید
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\
  --reassignment-json-file original-assignment.json \\
  --execute --throttle 50000000

# باز هم با verify تا پایان دنبال کنید
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\
  --reassignment-json-file original-assignment.json \\
  --verify`

const throttleConfig = `# throttle دستی در سطح بروکر (اختیاری)
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --entity-type brokers --entity-default \\
  --alter --add-config \\
  leader.replication.throttled.rate=50000000,\\
follower.replication.throttled.rate=50000000

# بعد از پایان کار، throttle دستی را پاک کنید
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --entity-type brokers --entity-default \\
  --alter --delete-config \\
  leader.replication.throttled.rate,\\
follower.replication.throttled.rate`

export function PartitionReassignmentContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        فرض کنید خوشه سه‌بروکری دارید و یک بروکر جدید اضافه کرده‌اید. داده‌های
        قدیمی خودبه‌خود به بروکر جدید نمی‌روند؛ پارتیشن‌ها همان‌جا می‌مانند که
        ساخته شده‌اند. برای توزیع دوباره داده، برای خارج کردن یک بروکر از سرویس
        یا برای بالا بردن ضریب تکثیر، به <strong>reassignment</strong> نیاز
        دارید. این درس نشان می‌دهد چطور طرح بسازید، با throttle اجرا کنید، پیشرفت
        را تأیید کنید و اگر لازم شد برگردید.
      </p>

      <h2>۱. reassignment دقیقاً چه چیزی را عوض می‌کند؟</h2>
      <p>
        هر پارتیشن یک لیست مرتب از replicaها دارد. عضو اول، رهبر ترجیحی است.
        reassignment همین لیست را عوض می‌کند: عضو جدید اضافه می‌شود، داده کپی
        می‌شود، و عضو قدیمی در پایان حذف می‌شود. سه کاربرد اصلی دارد:
      </p>
      <ul>
        <li>
          <strong>توزیع بار روی بروکر جدید:</strong> بعد از اضافه کردن بروکر،
          پارتیشن‌ها را به آن منتقل می‌کنید.
        </li>
        <li>
          <strong>خارج کردن بروکر:</strong> همه replicaها را از بروکر در حال
          خروج به بروکرهای دیگر منتقل می‌کنید.
        </li>
        <li>
          <strong>تغییر ضریب تکثیر:</strong> با اضافه یا حذف عضو، تعداد نسخه‌ها
          را کم یا زیاد می‌کنید.
        </li>
      </ul>
      <p>
        reassignment رهبر را «انتخاب» نمی‌کند؛ فقط مجموعه replicaها را عوض
        می‌کند. اگر رهبر فعلی در مجموعه جدید نباشد، کافکا ناچار می‌شود رهبر
        جدیدی از مجموعه جدید انتخاب کند. برای برگرداندن رهبری به عضو اول، از
        preferred leader election استفاده می‌کنیم.
      </p>

      <h2>۲. ساخت طرح با generate</h2>
      <p>
        ساده‌ترین راه، سپردن ساخت طرح به خود ابزار است. یک فایل کوچک بسازید که
        بگوید کدام تاپیک‌ها جابه‌جا شوند، و فهرست بروکرهای مقصد را بدهید:
      </p>
      <CodeBlock code={topicsToMove} language="json" filename="topics-to-move.json" />
      <CodeBlock code={generatePlan} language="bash" filename="generate-plan.sh" />
      <p>
        ابزار دو بلوک برمی‌گرداند: وضعیت فعلی و طرح پیشنهادی. بلوک اول را به‌عنوان
        نسخه پشتیبان نگه دارید؛ اگر خواستید برگردید، همان را دوباره اجرا می‌کنید.
        بلوک دوم را در فایلی مثل <Ltr>reassignment.json</Ltr> ذخیره کنید:
      </p>
      <CodeBlock code={generateOutput} language="json" filename="generate-output.json" />
      <Callout variant="warning" title="طرح generate را کورکورانه اجرا نکنید">
        الگوریتم generate توزیع متعادل پیشنهاد می‌دهد، اما از rack، ظرفیت دیسک،
        affinity سرویس‌ها و محدودیت‌های عملیاتی شما خبر ندارد. طرح را بخوانید و
        در صورت نیاز دستی اصلاح کنید. مخصوصاً اگر بروکر جدید هنوز دیسک کافی
        ندارد، اجرای طرح می‌تواند آن را پر کند.
      </Callout>

      <h2>۳. طرح دستی: کنترل کامل روی replicaها</h2>
      <p>
        اگر می‌خواهید خودتان تصمیم بگیرید کدام پارتیشن کجا برود، فایل طرح را
        دستی بنویسید. هر عضو <Ltr>log_dirs</Ltr> هم دارد؛ مقدار{' '}
        <Ltr>any</Ltr> یعنی کافکا خودش پوشه مناسب را انتخاب کند:
      </p>
      <CodeBlock code={manualPlan} language="json" filename="reassignment.json" />
      <p>
        ترتیب اعضای <Ltr>replicas</Ltr> مهم است: عضو اول رهبر ترجیحی است. اگر
        بروکر جدید را اول بگذارید، بعد از انتخابات، رهبری به آن منتقل می‌شود.
        برای بروکر تازه معمولاً بهتر است ابتدا follower باشد تا با بار رهبری
        هم‌زمان درگیر نشود.
      </p>

      <h2>۴. اجرا با throttle و تأیید پایان</h2>
      <p>
        بدون throttle، کپی داده می‌تواند پهنای باند شبکه و دیسک را اشباع کند،
        ISR را کوچک کند و lag مصرف‌کننده‌ها را بالا ببرد. مقدار{' '}
        <Ltr>--throttle</Ltr> بر حسب بایت بر ثانیه و برای هر بروکر است. پنجاه
        میلیون یعنی حدود ۵۰ مگابایت بر ثانیه:
      </p>
      <CodeBlock code={executePlan} language="bash" filename="execute.sh" />
      <p>
        اجرا غیرهمزمان است؛ دستور برمی‌گردد ولی کپی ادامه دارد. با{' '}
        <Ltr>--verify</Ltr> پیشرفت را ببینید. تا وقتی همه پارتیشن‌ها{' '}
        <Ltr>Completed</Ltr> نشده‌اند، کار تمام نیست:
      </p>
      <CodeBlock code={verifyOutput} language="text" filename="verify-output.txt" />
      <Callout variant="info" title="throttle خودکار پاک می‌شود">
        وقتی همه پارتیشن‌ها کامل شدند، ابزار throttleهایی را که خودش روی بروکرها
        و تاپیک گذاشته بود پاک می‌کند. اگر throttle را دستی تنظیم کرده‌اید،
        پاک کردنش با شماست.
      </Callout>

      <h2>۵. برگرداندن رهبری با preferred leader election</h2>
      <p>
        بعد از reassignment ممکن است رهبر یک پارتیشن روی عضو دوم یا سوم باشد.
        اگر <Ltr>auto.leader.rebalance.enable</Ltr> فعال باشد، کافکا دوره‌ای این
        وضعیت را اصلاح می‌کند؛ اما در محیط عملیاتی معمولاً ترجیح می‌دهیم این کار
        کنترل‌شده و در زمان مناسب انجام شود:
      </p>
      <CodeBlock code={preferredElection} language="bash" filename="preferred-election.sh" />
      <p>
        این دستور فقط رهبری را بین replicaهای موجود جابه‌جا می‌کند؛ داده‌ای کپی
        نمی‌شود. اگر رهبر فعلی همان عضو اول باشد، هیچ تغییری رخ نمی‌دهد.
      </p>

      <h2>۶. در طول جابه‌جایی چه چیزی را زیر نظر بگیریم؟</h2>
      <p>
        reassignment یک عملیات سنگین روی شبکه و دیسک است. سه سیگنال اصلی را
        مرتب ببینید: پارتیشن‌های under-replicated، فضای دیسک بروکر مقصد و lag
        مصرف‌کننده‌ها:
      </p>
      <CodeBlock code={monitorCommands} language="bash" filename="monitor.sh" />
      <ul>
        <li>
          اگر تعداد پارتیشن‌های under-replicated بالا رفت، throttle را کم کنید
          یا جابه‌جایی را متوقف کنید.
        </li>
        <li>
          اگر دیسک بروکر مقصد به سقف نزدیک شد، طرح را کوچک‌تر کنید یا بروکر
          دیگری اضافه کنید.
        </li>
        <li>
          اگر lag مصرف‌کننده‌ها بالا رفت، ممکن است شبکه اشباع شده باشد؛ سرعت کپی
          را پایین بیاورید.
        </li>
      </ul>

      <h2>۷. لغو و بازگشت</h2>
      <p>
        برای لغو، طرح قبلی را دوباره اجرا کنید. این کار داده‌ها را به replicaهای
        قبلی برمی‌گرداند و خودش یک reassignment جدید است؛ پس باز هم throttle
        لازم دارد:
      </p>
      <CodeBlock code={rollbackPlan} language="bash" filename="rollback.sh" />
      <Callout variant="danger" title="برای لغو، بروکر را خاموش نکنید">
        خاموش کردن بروکر وسط reassignment، کپی را متوقف می‌کند و می‌تواند ISR را
        کوچک کند. اگر باید متوقف کنید، اول طرح را به وضعیت قبلی برگردانید یا
        منتظر پایان کپی بمانید.
      </Callout>

      <h2>۸. قدم‌به‌قدم: یک پارتیشن به بروکر تازه</h2>
      <p>
        توضیح تعاملی زیر همان مسیر را روی یک پارتیشن نشان می‌دهد: اضافه شدن
        بروکر چهارم، ساخت طرح، کپی با throttle، ورود replica جدید به ISR، حذف
        replica قدیمی و در پایان تأیید وضعیت. به گام‌هایی که ISR تغییر می‌کند
        دقت کنید؛ همان‌جا است که می‌فهمید چرا نباید کپی را بی‌محدود رها کرد.
      </p>

      <PartitionReassignmentExplainer />

      <DeepDive title="جزئیات داخلی: کافکا چطور reassignment را انجام می‌دهد؟">
        <DeepDiveSection title="از فایل طرح تا متادیتای خوشه">
          <p>
            ابزار reassignment فایل JSON را به کنترلر می‌فرستد. کنترلر برای هر
            پارتیشن، مجموعه replicaهای جدید را در متادیتا ثبت می‌کند و به
            بروکرهای درگیر پیام <Ltr>LeaderAndIsr</Ltr> می‌فرستد. بروکرهایی که
            باید replica جدید بسازند، از رهبر داده را fetch می‌کنند. تا وقتی
            replica جدید به آخرین آفست نرسیده، در ISR نیست.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="adding و removing replica">
          <p>
            در طول reassignment، پارتیشن هم‌زمان replicaهای «در حال افزودن» و
            «در حال حذف» دارد. کافکا صبر می‌کند replica جدید کاملاً همگام شود،
            بعد replica قدیمی را حذف می‌کند. به همین دلیل در میانه کار، تعداد
            replicaهای فیزیکی می‌تواند از ضریب تکثیر بیشتر باشد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="throttle در دو لایه">
          <p>
            ابزار هم نرخ رهبر (<Ltr>leader.replication.throttled.rate</Ltr>) و
            هم نرخ follower (<Ltr>follower.replication.throttled.rate</Ltr>) را
            تنظیم می‌کند و replicaهای درگیر را در{' '}
            <Ltr>leader.replication.throttled.replicas</Ltr> و{' '}
            <Ltr>follower.replication.throttled.replicas</Ltr> علامت می‌زند.
            throttle فقط روی همین کپی اثر دارد، نه روی ترافیک عادی تولید و مصرف.
          </p>
          <CodeBlock code={throttleConfig} language="bash" filename="throttle.sh" />
        </DeepDiveSection>
        <DeepDiveSection title="چرا reassignment رهبر را جابه‌جا نمی‌کند؟">
          <p>
            reassignment مجموعه replicaها را عوض می‌کند. اگر رهبر فعلی در مجموعه
            جدید بماند، رهبر می‌ماند. اگر حذف شود، کافکا از مجموعه جدید رهبر
            انتخاب می‌کند. برای رسیدن به رهبر ترجیحی (عضو اول)، بعد از پایان
            reassignment یک preferred leader election اجرا کنید. این دو عملیات
            را با هم اشتباه نگیرید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>۹. چک‌لیست امن</h2>
      <ol>
        <li>طرح فعلی را ذخیره کنید تا امکان بازگشت داشته باشید.</li>
        <li>ظرفیت دیسک و پهنای باند بروکرهای مقصد را بررسی کنید.</li>
        <li>throttle منطقی بگذارید؛ برای شروع محافظه‌کار باشید.</li>
        <li>در ساعت اوج و هنگام پردازش سنگین reassignment نکنید.</li>
        <li>
          <Ltr>under-replicated partitions</Ltr> و lag را مرتب ببینید.
        </li>
        <li>تا Completed شدن همه پارتیشن‌ها، کار را تمام‌شده ندانید.</li>
        <li>بعد از پایان، preferred leader election را بررسی کنید.</li>
      </ol>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="اجرای reassignment بدون throttle">
        کپی داده می‌تواند کل پهنای باند بین بروکرها را بگیرد، ISR را کوچک کند و
        نوشتن با <Ltr>acks=all</Ltr> را متوقف کند. همیشه با throttle شروع کنید و
        اگر فشار کم بود، بعداً بالا ببرید.
      </Callout>
      <Callout variant="danger" title="جابه‌جایی همه پارتیشن‌ها هم‌زمان">
        طرح generate ممکن است همه پارتیشن‌ها را در یک مرحله جابه‌جا کند. برای
        خوشه‌های بزرگ، طرح را به چند دسته تقسیم کنید تا فشار و ریسک کنترل‌شده
        باشد.
      </Callout>
      <Callout variant="warning" title="فراموش کردن verify">
        دستور execute فقط کار را شروع می‌کند. اگر verify نکنید، ممکن است یک
        پارتیشن نیمه‌کاره مانده باشد و شما فکر کنید همه‌چیز تمام شده است. تا
        دیدن <Ltr>Completed</Ltr> برای همه پارتیشن‌ها صبر کنید.
      </Callout>
      <Callout variant="warning" title="کاهش ناخواسته ضریب تکثیر">
        اگر در طرح دستی، یک replica را از لیست جا بیندازید، ضریب تکثیر آن پارتیشن
        کم می‌شود. قبل از execute، تعداد اعضای هر <Ltr>replicas</Ltr> را با
        ضریب تکثیر مورد انتظار مقایسه کنید.
      </Callout>
      <Callout variant="info" title="انتخابات رهبر ترجیحی را با reassignment اشتباه نگیرید">
        reassignment داده را جابه‌جا می‌کند و می‌تواند سنگین باشد؛ preferred
        leader election فقط رهبری را بین replicaهای موجود عوض می‌کند و سبک است.
        برای توزیع رهبری، اول گزینه دوم را امتحان کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          reassignment مجموعه replicaهای هر پارتیشن را عوض می‌کند؛ داده را کپی
          می‌کند و سنگین است.
        </li>
        <li>
          با <Ltr>--generate</Ltr> طرح بسازید، آن را بخوانید و در صورت نیاز دستی
          اصلاح کنید.
        </li>
        <li>
          با <Ltr>--execute --throttle</Ltr> اجرا کنید و با{' '}
          <Ltr>--verify</Ltr> تا پایان دنبال کنید.
        </li>
        <li>
          <Ltr>preferred leader election</Ltr> رهبری را به عضو اول برمی‌گرداند،
          نه داده را جابه‌جا می‌کند.
        </li>
        <li>
          در طول کار، ISR، دیسک و lag را زیر نظر بگیرید و در ساعت اوج کار نکنید.
        </li>
        <li>طرح قبلی را نگه دارید تا در صورت نیاز برگردید.</li>
      </ul>
      <p>
        با reassignment، خوشه شما قابل رشد و قابل نگهداری می‌شود. در درس آخر این
        فصل سراغ ابزارهای گرافیکی می‌رویم: کجا کمک می‌کنند، کجا خطرناک‌اند و چطور
        بدون تبدیل شدن به یک نقطه آسیب‌پذیر از آن‌ها استفاده کنیم.
      </p>
    </>
  )
}
