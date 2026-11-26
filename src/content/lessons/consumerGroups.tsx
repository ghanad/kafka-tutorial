import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { RebalanceExplainer } from '../../components/simulators/RebalanceExplainer'

const consumerGroupConfig = `# consumer.properties — تنظیمات مؤثر بر عضویت در گروه
bootstrap.servers=localhost:9092
group.id=billing

# استراتژی تخصیص پارتیشن
# برای کاهش توقف، نسخهٔ cooperative را صریحاً انتخاب کنید
partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor

# سه زمان‌بند عضویت
heartbeat.interval.ms=3000
session.timeout.ms=45000
max.poll.interval.ms=300000

# هویت پایدار برای جلوگیری از rebalance در ری‌استارت سریع
group.instance.id=consumer-billing-1`

const subscribeExample = `Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "billing");
props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
props.put(
    "partition.assignment.strategy",
    "org.apache.kafka.clients.consumer.CooperativeStickyAssignor"
);

try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
    // اشتراک در تاپیک؛ تخصیص پارتیشن‌ها خودکار انجام می‌شود
    consumer.subscribe(List.of("orders"));

    while (running) {
        ConsumerRecords<String, String> records =
            consumer.poll(Duration.ofMillis(500));
        records.forEach(this::process);
        if (!records.isEmpty()) {
            consumer.commitSync();
        }
    }
}`

const describeGroup = `# اعضا و پارتیشن‌های تخصیص‌یافته به هر کدام
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --describe --group billing --members --verbose

# GROUP    CONSUMER-ID   HOST        CLIENT-ID   #PARTITIONS
# billing  consumer-1    /10.0.0.11  consumer-1  2
# billing  consumer-2    /10.0.0.12  consumer-2  2

# وضعیت گروه و lag هر پارتیشن
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --describe --group billing`

const scaleExample = `# ۴ پارتیشن و ۳ مصرف‌کننده در یک گروه
# C1 -> P0, P1
# C2 -> P2
# C3 -> P3

# یک گروه دیگر همان تاپیک را مستقل و کامل می‌خواند
kafka-console-consumer.sh --bootstrap-server localhost:9092 \\
  --topic orders --group analytics --from-beginning`

export function ConsumerGroupsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل دیدیم یک مصرف‌کننده چطور با <Ltr>poll</Ltr> داده را می‌کشد.
        اما در عمل یک مصرف‌کننده کافی نیست: برای بالا بردن توان پردازش باید چند
        مصرف‌کننده هم‌زمان کار کنند، بدون اینکه یک رکورد دو بار پردازش شود. راه‌حل
        کافکا <strong>Consumer Group</strong> است. در این درس می‌بینیم گروه چطور
        پارتیشن‌ها را بین اعضا تقسیم می‌کند، وقتی عضوی اضافه یا حذف می‌شود چه
        اتفاقی می‌افتد و چرا <Ltr>Rebalance</Ltr> هم نجات‌بخش است و هم دردسر.
      </p>

      <h2>۱. Consumer Group چیست و چه مشکلی را حل می‌کند؟</h2>
      <p>
        یک <strong>Consumer Group</strong> مجموعه‌ای از مصرف‌کننده‌هاست که با یک{' '}
        <Ltr>group.id</Ltr> مشترک شناخته می‌شوند. اعضای یک گروه کار خواندن یک یا
        چند تاپیک را بین خود تقسیم می‌کنند. دو خاصیت مهم دارد:
      </p>
      <ul>
        <li>
          <strong>مقیاس‌پذیری:</strong> به‌جای یک مصرف‌کنندهٔ تنها، چند مصرف‌کننده
          هم‌زمان پارتیشن‌های مختلف را می‌خوانند و توان پردازش بالا می‌رود.
        </li>
        <li>
          <strong>تحمل خطا:</strong> اگر یکی از اعضا از کار بیفتد، پارتیشن‌هایش
          به بقیهٔ اعضا داده می‌شود و کار متوقف نمی‌ماند.
        </li>
      </ul>
      <p>
        نکتهٔ کلیدی این است که تقسیم کار در سطح <strong>پارتیشن</strong> انجام
        می‌شود، نه در سطح رکورد. کافکا ترتیب رکوردها را فقط داخل یک پارتیشن
        تضمین می‌کند؛ پس اگر دو مصرف‌کننده هم‌زمان یک پارتیشن را بخوانند، نه
        ترتیب قابل حفظ است و نه می‌توان بدون هماهنگی سنگین از پردازش تکراری
        جلوگیری کرد. به همین دلیل هر پارتیشن در هر لحظه فقط به یک عضو از گروه
        تعلق دارد.
      </p>
      <Callout variant="info" title="گروه‌های مختلف، جریان‌های مستقل">
        <p>
          اگر دو گروه با <Ltr>group.id</Ltr> متفاوت روی یک تاپیک مشترک شوند،
          هر گروه کل داده را جداگانه می‌خواند. مثلاً گروه <Ltr>billing</Ltr>{' '}
          صورتحساب می‌سازد و گروه <Ltr>analytics</Ltr> همان رخدادها را برای
          گزارش تحلیل می‌کند؛ هر دو مستقل‌اند و روی هم اثر نمی‌گذارند. تقسیم کار
          فقط <em>درون</em> یک گروه معنا دارد.
        </p>
      </Callout>

      <h2>۲. قانون طلایی: هر پارتیشن، یک مصرف‌کننده در هر گروه</h2>
      <p>
        رابطهٔ تعداد پارتیشن و تعداد مصرف‌کننده، سقف موازی‌سازی را تعیین می‌کند.
        فرض کنید تاپیک <Ltr>orders</Ltr> چهار پارتیشن دارد:
      </p>
      <ul>
        <li>
          با <strong>یک</strong> مصرف‌کننده، هر چهار پارتیشن به او می‌رسد و کل
          بار روی یک پروسه است.
        </li>
        <li>
          با <strong>دو</strong> مصرف‌کننده، هر کدام دو پارتیشن می‌گیرد و کار
          نصف می‌شود.
        </li>
        <li>
          با <strong>چهار</strong> مصرف‌کننده، هر کدام یک پارتیشن می‌گیرد؛ این
          حداکثر موازی‌سازی مفید است.
        </li>
        <li>
          با <strong>پنج</strong> مصرف‌کننده، یکی از آن‌ها هیچ پارتیشنی نمی‌گیرد
          و بی‌کار می‌ماند.
        </li>
      </ul>
      <p>
        پس اگر مصرف‌کنندهٔ بی‌کار می‌بینید، احتمالاً تعداد پارتیشن‌ها کم است یا
        عضوها بیش از حد لازم‌اند. برای افزایش موازی‌سازی باید تعداد پارتیشن‌ها را
        بالا ببرید، نه فقط تعداد مصرف‌کننده‌ها را. افزایش پارتیشن هم خودش یک
        تغییر متادیتاست و می‌تواند rebalance راه بیندازد.
      </p>
      <CodeBlock
        code={scaleExample}
        language="bash"
        filename="scale-example.sh"
      />

      <h2>۳. یک rebalance را گام‌به‌گام ببینید</h2>
      <p>
        <strong>Rebalance</strong> فرایندی است که در آن گروه دوباره تصمیم می‌گیرد
        کدام پارتیشن به کدام عضو برسد. در توضیح تعاملی زیر یک تاپیک با چهار
        پارتیشن و گروه <Ltr>billing</Ltr> را دنبال می‌کنیم: اول یک عضو تنها همه
        چیز را می‌گیرد، بعد عضو دوم می‌پیوندد، سپس عضو سوم اضافه می‌شود و در
        نهایت یکی از اعضا از کار می‌افتد. دقت کنید که در هر rebalance برای مدتی
        هیچ پارتیشنی مصرف نمی‌شود.
      </p>

      <RebalanceExplainer />

      <p>
        به گام ۲ برگردید: به‌محض پیوستن <Ltr>C2</Ltr>، تخصیص قبلی باطل می‌شود و
        تا محاسبهٔ جدید هیچ رکوردی مصرف نمی‌شود. این همان هزینهٔ اصلی rebalance
        است. در گام ۷ هم ببینید که پس از مرگ <Ltr>C2</Ltr>، پارتیشن‌هایش فوراً
        آزاد نمی‌شوند؛ Coordinator تا پایان{' '}
        <Ltr>session.timeout.ms</Ltr> صبر می‌کند و در این فاصله آن پارتیشن‌ها
        بی‌مصرف می‌مانند.
      </p>

      <h2>۴. Group Coordinator، Leader و استراتژی تخصیص</h2>
      <p>
        rebalance کار خودبه‌خودی نیست؛ سه نقش در آن دخیل‌اند:
      </p>
      <ul>
        <li>
          <strong>Group Coordinator:</strong> یکی از بروکرها که مسئول گروه است
          (بر اساس پارتیشن <Ltr>__consumer_offsets</Ltr> متناظر با{' '}
          <Ltr>group.id</Ltr>). عضویت، heartbeat و commit آفست‌ها را مدیریت
          می‌کند.
        </li>
        <li>
          <strong>Group Leader:</strong> یکی از خود مصرف‌کننده‌ها که Coordinator
          انتخابش می‌کند. Leader فهرست اعضا و پارتیشن‌ها را می‌گیرد و تخصیص را
          محاسبه می‌کند.
        </li>
        <li>
          <strong>استراتژی تخصیص:</strong> الگوریتمی که Leader برای تقسیم
          پارتیشن‌ها به کار می‌برد؛ مثلاً <Ltr>Range</Ltr>،{' '}
          <Ltr>RoundRobin</Ltr>، <Ltr>Sticky</Ltr> یا{' '}
          <Ltr>CooperativeSticky</Ltr>.
        </li>
      </ul>
      <p>
        جریان کار در دو مرحله خلاصه می‌شود: اعضا با <Ltr>JoinGroup</Ltr> وارد
        می‌شوند و Coordinator یکی را Leader می‌کند؛ سپس Leader تخصیص را حساب
        می‌کند و نتیجه با <Ltr>SyncGroup</Ltr> به همه اعلام می‌شود. محاسبه در
        سمت کلاینت انجام می‌شود، نه روی بروکر؛ به همین دلیل هر کلاینت می‌تواند
        استراتژی دلخواه خود را داشته باشد.
      </p>
      <CodeBlock
        code={subscribeExample}
        language="java"
        filename="SubscribeGroup.java"
      />
      <p>
        با <Ltr>subscribe</Ltr> خودتان پارتیشن انتخاب نمی‌کنید؛ فقط تاپیک را
        اعلام می‌کنید و اجازه می‌دهید گروه تخصیص را مدیریت کند. اگر خودتان{' '}
        <Ltr>assign</Ltr> کنید، مصرف‌کننده عضو گروه نمی‌شود و rebalance و commit
        گروهی را از دست می‌دهید.
      </p>

      <h2>۵. Eager در برابر Cooperative</h2>
      <p>
        نحوهٔ پس‌گرفتن پارتیشن‌ها دو سبک دارد و انتخاب آن مستقیماً روی توقف مصرف
        اثر می‌گذارد:
      </p>
      <table>
        <thead>
          <tr>
            <th>ویژگی</th>
            <th>Eager (مثل Range و Sticky)</th>
            <th>Cooperative (CooperativeSticky)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>رفتار در شروع rebalance</td>
            <td>همهٔ اعضا همهٔ پارتیشن‌ها را رها می‌کنند.</td>
            <td>فقط پارتیشن‌هایی که باید جابه‌جا شوند رها می‌شوند.</td>
          </tr>
          <tr>
            <td>توقف مصرف</td>
            <td>کل گروه برای مدت rebalance متوقف می‌شود.</td>
            <td>بیشتر اعضا به کار خود ادامه می‌دهند.</td>
          </tr>
          <tr>
            <td>تعداد دور</td>
            <td>معمولاً یک دور کافی است.</td>
            <td>ممکن است چند دور کوچک لازم باشد.</td>
          </tr>
          <tr>
            <td>مناسب برای</td>
            <td>گروه‌های کوچک و پایدار.</td>
            <td>گروه‌های بزرگ با تغییرات مکرر اعضا.</td>
          </tr>
        </tbody>
      </table>
      <p>
        استراتژی پیش‌فرض تاریخی <Ltr>Range</Ltr> است. برای گروه‌های بزرگ که
        مرتب عضو اضافه یا کم می‌کنند، <Ltr>CooperativeSticky</Ltr> را صریحاً
        تنظیم کنید تا هر تغییر کوچک، کل گروه را متوقف نکند.
      </p>
      <Callout variant="warning" title="همهٔ اعضا باید یک استراتژی داشته باشند">
        <p>
          اگر اعضای یک گروه استراتژی‌های ناسازگار داشته باشند، ممکن است در
          انتخاب پروتکل به توافق نرسند و گروه نتواند rebalance را کامل کند.
          استراتژی را برای همهٔ مصرف‌کننده‌های یک گروه یکسان نگه دارید.
        </p>
      </Callout>

      <h2>۶. چه چیزهایی rebalance را راه می‌اندازند؟</h2>
      <ul>
        <li>
          <strong>ورود عضو جدید:</strong> یک مصرف‌کننده با همان{' '}
          <Ltr>group.id</Ltr> شروع می‌کند و <Ltr>JoinGroup</Ltr> می‌فرستد.
        </li>
        <li>
          <strong>خروج تمیز عضو:</strong> مصرف‌کننده <Ltr>close()</Ltr> می‌زند و
          از گروه خارج می‌شود.
        </li>
        <li>
          <strong>مرگ یا قطع ارتباط عضو:</strong> heartbeat قطع می‌شود و پس از{' '}
          <Ltr>session.timeout.ms</Ltr> عضو حذف می‌شود.
        </li>
        <li>
          <strong>تغییر اشتراک:</strong> الگوی <Ltr>subscribe</Ltr> عوض شود یا
          تاپیک‌های منطبق با آن تغییر کنند.
        </li>
        <li>
          <strong>تغییر متادیتای تاپیک:</strong> مثلاً تعداد پارتیشن‌های یک تاپیک
          افزایش یابد.
        </li>
      </ul>
      <p>
        در همهٔ این حالت‌ها گروه باید دوباره تصمیم بگیرد. نکتهٔ مهم این است که
        rebalance فقط وقتی لازم است که <em>تخصیص</em> عوض شود؛ اگر عضوی که از کار
        افتاده پارتیشنی نداشته باشد، باز هم گروه یک دور rebalance می‌زند، چون
        ترکیب اعضا تغییر کرده است.
      </p>

      <h2>۷. هزینهٔ rebalance و تنظیمات مهم</h2>
      <p>
        هر rebalance سه هزینه دارد: توقف موقت مصرف، commit شدن آفست‌ها در یک
        لحظهٔ نامناسب، و احتمال پردازش دوبارهٔ رکوردها. اگر commit بعد از پردازش
        انجام شده باشد، دستهٔ نیمه‌کاره پس از تخصیص مجدد دوباره خوانده می‌شود؛
        یعنی تحویل <Ltr>at-least-once</Ltr>. سه تنظیم اصلی این هزینه را کنترل
        می‌کنند:
      </p>
      <ul>
        <li>
          <Ltr>session.timeout.ms</Ltr> (پیش‌فرض ۴۵ ثانیه): چقدر بدون heartbeat
          صبر کنیم تا عضو مرده فرض شود. کوتاه‌تر یعنی تشخیص سریع‌تر، ولی حساس‌تر
          به نوسان شبکه.
        </li>
        <li>
          <Ltr>heartbeat.interval.ms</Ltr> (پیش‌فرض ۳ ثانیه): فاصلهٔ ارسال
          heartbeat؛ معمولاً یک‌سوم <Ltr>session.timeout.ms</Ltr>.
        </li>
        <li>
          <Ltr>max.poll.interval.ms</Ltr> (پیش‌فرض ۵ دقیقه): اگر بین دو{' '}
          <Ltr>poll</Ltr> بیشتر از این طول بکشد، عضو از گروه حذف می‌شود، حتی اگر
          heartbeat برسد.
        </li>
      </ul>
      <CodeBlock
        code={consumerGroupConfig}
        language="properties"
        filename="consumer.properties"
      />
      <p>
        برای دیدن اینکه در هر لحظه کدام عضو چه پارتیشن‌هایی دارد و lag چقدر است،
        از <Ltr>kafka-consumer-groups.sh</Ltr> استفاده کنید:
      </p>
      <CodeBlock
        code={describeGroup}
        language="bash"
        filename="describe-group.sh"
      />

      <DeepDive title="درون پروتکل گروه و استراتژی‌های تخصیص">
        <DeepDiveSection title="JoinGroup و SyncGroup دقیقاً چه می‌کنند؟">
          <p>
            در <Ltr>JoinGroup</Ltr> هر عضو فهرست تاپیک‌های مشترک و استراتژی‌های
            پشتیبانی‌شده‌اش را می‌فرستد. Coordinator اعضا را جمع می‌کند، یکی را
            Leader انتخاب می‌کند و پاسخ را برمی‌گرداند. Leader با دیدن فهرست کامل
            اعضا تخصیص را حساب می‌کند و در <Ltr>SyncGroup</Ltr> می‌فرستد؛
            Coordinator همان نتیجه را به بقیه اعلام می‌کند. اگر عضوی در میانه
            ناپدید شود، دور فعلی لغو و دور تازه‌ای شروع می‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Range در برابر RoundRobin">
          <p>
            <Ltr>Range</Ltr> برای هر تاپیک، پارتیشن‌ها را به بازه‌های پشت‌سرهم
            تقسیم می‌کند؛ با ۴ پارتیشن و ۲ مصرف‌کننده نتیجه ۲ و ۲ است. اگر چند
            تاپیک با تعداد پارتیشن نامساوی داشته باشید، Range می‌تواند بار را
            نابرابر کند. <Ltr>RoundRobin</Ltr> همهٔ پارتیشن‌های همهٔ تاپیک‌ها را
            در یک صف می‌چیند و یکی‌یکی بین اعضا پخش می‌کند؛ توزیع یکنواخت‌تر است
            ولی با هر تغییر، جابه‌جایی بیشتری ایجاد می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Sticky و CooperativeSticky">
          <p>
            <Ltr>Sticky</Ltr> سعی می‌کند تخصیص قبلی را تا حد ممکن نگه دارد و فقط
            تفاوت‌ها را جابه‌جا کند؛ این کار تعداد پارتیشن‌های منتقل‌شده و هزینهٔ
            rebalance را کم می‌کند. <Ltr>CooperativeSticky</Ltr> همان تعادل
            چسبنده را با پروتکل افزایشی ترکیب می‌کند: در دور اول فقط پارتیشن‌هایی
            که باید منتقل شوند پس گرفته می‌شوند، بقیه در همان لحظه مصرف می‌شوند و
            دور دوم تخصیص نهایی را می‌بندد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Static Membership با group.instance.id">
          <p>
            اگر مصرف‌کننده سریع ری‌استارت شود (مثلاً در Kubernetes)، نسخهٔ جدید
            ممکن است قبل از پایان <Ltr>session.timeout.ms</Ltr> برگردد. با تنظیم{' '}
            <Ltr>group.instance.id</Ltr>، Coordinator هویت ثابت را می‌شناسد و
            عضویت قبلی را حفظ می‌کند؛ در نتیجه rebalance غیرضروری رخ نمی‌دهد.
            این تنظیم برای کاهش «طوفان rebalance» در خوشه‌های بزرگ بسیار مؤثر
            است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="group.initial.rebalance.delay.ms">
          <p>
            بروکر به‌طور پیش‌فرض چند ثانیه (۳ ثانیه) شروع اولین rebalance یک گروه
            تازه را عقب می‌اندازد تا اعضایی که هم‌زمان بالا می‌آیند در یک دور جمع
            شوند. اگر این مقدار صفر باشد، هر عضو جداگانه یک rebalance می‌سازد و
            راه‌اندازی گروه کند و پرنوسان می‌شود.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>۸. اشتباه‌های رایج</h2>
      <Callout variant="danger" title="انتظار موازی‌سازی بیشتر از تعداد پارتیشن">
        <p>
          اگر تاپیک ۴ پارتیشن داشته باشد، حتی ۱۰ مصرف‌کننده هم فقط ۴ پارتیشن را
          هم‌زمان می‌خوانند و ۶ مصرف‌کننده بی‌کار می‌مانند. تعداد پارتیشن‌ها سقف
          واقعی موازی‌سازی است؛ آن را از ابتدا با حجم آیندهٔ کار انتخاب کنید.
        </p>
      </Callout>
      <Callout variant="danger" title="پردازش سنگین و عبور از max.poll.interval.ms">
        <p>
          اگر پردازش یک دسته طولانی شود و <Ltr>poll</Ltr> بعدی دیر بیاید، عضو از
          گروه حذف می‌شود و rebalance تکرار می‌شود؛ در بدترین حالت گروه در یک
          حلقهٔ بی‌پایان rebalance می‌ماند. حجم دسته را با{' '}
          <Ltr>max.poll.records</Ltr> کم کنید یا پردازش را به thread دیگری
          بسپارید.
        </p>
      </Callout>
      <Callout variant="warning" title="استفاده از assign به‌جای subscribe">
        <p>
          با <Ltr>assign</Ltr> پارتیشن‌ها را دستی می‌چینید و مصرف‌کننده عضو گروه
          نمی‌شود. در نتیجه rebalance خودکار، تحمل خطا و commit گروهی را از دست
          می‌دهید. مگر در موارد خاص، از <Ltr>subscribe</Ltr> استفاده کنید.
        </p>
      </Callout>
      <Callout variant="warning" title="یک گروه برای کارهای نامرتبط">
        <p>
          اگر دو سرویس با مسئولیت‌های متفاوت را در یک <Ltr>group.id</Ltr> بگذارید،
          هر کدام بخشی از داده را می‌گیرد و هیچ‌کدام کل جریان را نمی‌بیند. برای
          هر مصرف‌کنندهٔ مستقل، یک گروه جدا بسازید.
        </p>
      </Callout>
      <Callout variant="info" title="rebalance همیشه بد نیست">
        <p>
          rebalance مکانیزمی است که مقیاس‌پذیری و تحمل خطا را ممکن می‌کند. هدف
          حذف آن نیست؛ هدف کم کردن تعداد و هزینه‌اش است: استراتژی cooperative،
          هویت پایدار و پردازش سریع هر دسته.
        </p>
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          مصرف‌کننده‌های هم‌<Ltr>group.id</Ltr> کار خواندن را تقسیم می‌کنند؛
          گروه‌های مختلف هر کدام کل جریان را جدا می‌خوانند.
        </li>
        <li>
          هر پارتیشن در هر لحظه فقط به یک عضو یک گروه می‌رسد؛ تعداد پارتیشن‌ها
          سقف موازی‌سازی است.
        </li>
        <li>
          Group Coordinator عضویت را مدیریت می‌کند و Leader تخصیص را با استراتژی
          انتخابی حساب می‌کند.
        </li>
        <li>
          ورود، خروج، مرگ عضو یا تغییر متادیتا یک rebalance می‌سازد که برای مدتی
          مصرف را متوقف می‌کند.
        </li>
        <li>
          <Ltr>CooperativeSticky</Ltr> و <Ltr>group.instance.id</Ltr> هزینهٔ
          rebalance را کم می‌کنند؛ پردازش سریع هر دسته از حلقهٔ rebalance جلوگیری
          می‌کند.
        </li>
      </ul>
      <p>
        حالا می‌دانیم گروه چطور کار را تقسیم می‌کند. قدم بعدی این است که ببینیم
        پیشرفت هر گروه کجا ذخیره می‌شود: تفاوت <Ltr>position</Ltr> و committed
        offset و نقش <Ltr>__consumer_offsets</Ltr>.
      </p>
    </>
  )
}
