import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { ConsumerLagExplainer } from '../../components/simulators/ConsumerLagExplainer'

const describeLag = `kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --describe --group billing

# GROUP    TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID
# billing  orders  0          1200            1250            50   consumer-1
# billing  orders  1          1080            1080            0    consumer-1
# billing  orders  2          1120            1420            300  consumer-2`

const listGroups = `# گروه‌های موجود و وضعیت کلی آن‌ها
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# فقط lag، بدون جزئیات هر پارتیشن
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --describe --group billing --state`

const jmxMetrics = `# متریک‌های JMX سمت مصرف‌کننده
kafka.consumer:type=consumer-fetch-manager-metrics,client-id=consumer-1
  records-lag-max        # بیشترین lag بین پارتیشن‌های همین مصرف‌کننده
  records-lag            # lag هر پارتیشن
  records-consumed-rate  # نرخ پردازش رکورد در ثانیه
  fetch-rate             # نرخ درخواست fetch

# متریک سمت بروکر برای دیدن lag گروه‌ها از بیرون
kafka.server:type=GroupMetadataManager,group=billing
  # برای پایش دقیق‌تر از Kafka Exporter یا Burrow استفاده کنید`

const prometheusQuery = `# با kafka_exporter: مجموع lag هر گروه به تفکیک تاپیک
sum by (topic) (kafka_consumergroup_lag{consumergroup="billing"})

# هشدار وقتی lag برای ۱۰ دقیقه بالای ۱۰٬۰۰۰ ماند
- alert: ConsumerLagHigh
  expr: sum(kafka_consumergroup_lag{consumergroup="billing"}) > 10000
  for: 10m`

const consumerTuning = `# consumer.properties — کنترل سرعت و حجم هر دسته
bootstrap.servers=localhost:9092
group.id=billing

# تعداد رکورد هر poll؛ کوچک‌تر یعنی دسته‌های کوتاه‌تر و commit سریع‌تر
max.poll.records=500

# حداکثر زمان پردازش بین دو poll؛ اگر رد شود عضو از گروه حذف می‌شود
max.poll.interval.ms=300000

# کمتر کردن رفت‌وبرگشت شبکه هنگام خواندن دسته‌های کوچک
fetch.min.bytes=1048576
fetch.max.wait.ms=500`

const scaleConsumers = `# ۴ پارتیشن و ۲ مصرف‌کننده: هر کدام ۲ پارتیشن
# ۴ پارتیشن و ۴ مصرف‌کننده: هر کدام ۱ پارتیشن، حداکثر موازی‌سازی

# افزایش پارتیشن‌ها فقط از تعداد فعلی به بالا ممکن است
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --alter --topic orders --partitions 8`

export function ConsumerLagContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس‌های قبل دیدیم مصرف‌کننده چطور آفست را commit می‌کند و چه تضمینی
        برای تحویل دارد. اما یک سؤال عملی همیشه باقی می‌ماند: مصرف‌کننده چقدر از
        تولیدکننده عقب است؟ پاسخ این سؤال عددی است به نام{' '}
        <strong>Consumer Lag</strong>. در این درس می‌بینیم lag دقیقاً چطور حساب
        می‌شود، کجا آن را ببینیم، چه چیزی آن را بالا می‌برد و با چه تصمیم‌هایی
        می‌توان آن را پایین آورد.
      </p>

      <h2>۱. Lag دقیقاً چیست؟</h2>
      <p>
        برای هر پارتیشن، کافکا دو عدد را می‌داند: <Ltr>LOG-END-OFFSET</Ltr> یا{' '}
        <Ltr>LEO</Ltr> که آفست بعدی برای نوشتن است، و committed offset گروه که
        آفست بعدی برای خواندن است. lag همان فاصلهٔ این دو است:
      </p>
      <pre dir="ltr" className="font-mono">
        lag(partition) = LEO − committed offset
      </pre>
      <p>
        lag کل گروه هم مجموع lag همهٔ پارتیشن‌هایی است که گروه می‌خواند. اگر
        پارتیشنی lag صفر داشته باشد، مصرف‌کننده به انتهای فعلی آن پارتیشن رسیده
        است. این به معنی «داده‌ای وجود ندارد» نیست؛ فقط یعنی چیزی برای خواندن
        باقی نمانده است.
      </p>
      <table>
        <thead>
          <tr>
            <th>پارتیشن</th>
            <th>LEO</th>
            <th>committed</th>
            <th>lag</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td>
            <td>1250</td>
            <td>1200</td>
            <td>50</td>
          </tr>
          <tr>
            <td>1</td>
            <td>1080</td>
            <td>1080</td>
            <td>0</td>
          </tr>
          <tr>
            <td>2</td>
            <td>1420</td>
            <td>1120</td>
            <td>300</td>
          </tr>
          <tr>
            <td>مجموع</td>
            <td>—</td>
            <td>—</td>
            <td>350</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="info" title="lag صفر یعنی «هم‌اکنون به‌روز»، نه «همیشه سالم»">
        <p>
          یک گروه می‌تواند lag صفر داشته باشد و در همان لحظه کند باشد؛ فقط کافی
          است نرخ تولید هم پایین باشد. برای قضاوت درست، lag را همراه با{' '}
          <Ltr>records-consumed-rate</Ltr> و نرخ تولید ببینید. lag پایدار و رو
          به رشد، نشانهٔ واقعی مشکل است.
        </p>
      </Callout>

      <h2>۲. یک چرخهٔ عقب افتادن و جبران را ببینید</h2>
      <p>
        در توضیح تعاملی زیر یک تاپیک با سه پارتیشن داریم. تولیدکننده رکورد
        می‌نویسد، مصرف‌کننده بخشی را پردازش می‌کند، بعد یکی از مصرف‌کننده‌ها کند
        می‌شود و lag بالا می‌رود. دقت کنید که lag هر پارتیشن جدا حساب می‌شود و
        عددی که در داشبورد می‌بینید معمولاً جمع همین‌هاست.
      </p>

      <ConsumerLagExplainer />

      <p>
        به گام ۳ برگردید: وقتی ۲۰۰ رکورد به <Ltr>P0</Ltr> و ۱۰۰ رکورد به{' '}
        <Ltr>P1</Ltr> اضافه شد، lag گروه <Ltr>300</Ltr> شد، هرچند هیچ خطایی رخ
        نداده بود؛ فقط تولیدکننده سریع‌تر از مصرف‌کننده بود. در گام ۶ ببینید که
        کند شدن یک مصرف‌کننده فقط lag پارتیشن خودش را بالا می‌برد. در گام ۷ هم
        rebalance پارتیشن را به مصرف‌کنندهٔ سالم می‌سپارد، ولی آفست‌ها را جابه‌جا
        نمی‌کند؛ پس کار از همان‌جا ادامه پیدا می‌کند.
      </p>

      <h2>۳. Lag را با چه ابزاری ببینیم؟</h2>
      <p>
        ساده‌ترین راه، خط فرمان است. <Ltr>kafka-consumer-groups.sh</Ltr> برای هر
        پارتیشن committed offset، انتهای لاگ و lag را نشان می‌دهد:
      </p>
      <CodeBlock code={describeLag} language="bash" filename="describe-lag.sh" />
      <p>
        اگر فقط فهرست گروه‌ها یا وضعیت کلی را می‌خواهید، از <Ltr>--list</Ltr> و{' '}
        <Ltr>--state</Ltr> استفاده کنید. برای پایش پیوسته، متریک‌های JMX سمت
        مصرف‌کننده دقیق‌ترند و نیازی به اجرای دستی دستور ندارند:
      </p>
      <CodeBlock code={listGroups} language="bash" filename="list-groups.sh" />
      <CodeBlock code={jmxMetrics} language="bash" filename="jmx-metrics.txt" />
      <p>
        در محیط عملیاتی معمولاً یک exporter این متریک‌ها را به Prometheus می‌فرستد
        و داشبورد و هشدار روی همان ساخته می‌شود:
      </p>
      <CodeBlock
        code={prometheusQuery}
        language="yaml"
        filename="lag-alert.yaml"
      />
      <Callout variant="warning" title="lag را با آفست اشتباه نگیرید">
        <p>
          <Ltr>CURRENT-OFFSET</Ltr> یک عدد مطلق است و بین گروه‌ها یا پس از
          بازنشانی آفست معنای متفاوتی دارد. فقط <Ltr>LAG</Ltr> است که می‌گوید
          «چقدر کار باقی مانده». دو گروه با آفست‌های کاملاً متفاوت می‌توانند هر
          دو lag صفر داشته باشند.
        </p>
      </Callout>

      <h2>۴. lag پیام در برابر lag زمان</h2>
      <p>
        عددی که تا اینجا دیدیم lag بر حسب <strong>تعداد رکورد</strong> است. اما
        برای کسب‌وکار معمولاً مهم‌تر است بداند داده چقدر <strong>قدیمی</strong>{' '}
        است. اگر هر رکورد کوچک باشد، ۱۰٬۰۰۰ رکورد lag ممکن است فقط چند ثانیه
        تأخیر باشد؛ اگر هر رکورد سنگین و پردازشش کند باشد، ۱۰۰ رکورد هم می‌تواند
        ساعت‌ها تأخیر بسازد.
      </p>
      <p>
        lag زمان را می‌توان تقریب زد: timestamp رکوردی که در committed offset
        قرار دارد را با ساعت الان مقایسه کنید. این عدد را خودِ{' '}
        <Ltr>kafka-consumer-groups.sh</Ltr> نمی‌دهد؛ ابزارهایی مثل Burrow یا
        داشبوردهای سفارشی آن را از timestamp رکوردها حساب می‌کنند. برای تعیین
        آستانهٔ هشدار، هم lag تعداد و هم lag زمان را در نظر بگیرید.
      </p>

      <h2>۵. چه چیزی lag را بالا می‌برد؟</h2>
      <ul>
        <li>
          <strong>انفجار تولید:</strong> یک بازهٔ پرترافیک یا backfill بزرگ،
          نرخ تولید را موقتاً از نرخ مصرف جلو می‌زند.
        </li>
        <li>
          <strong>پردازش کند:</strong> فراخوانی دیتابیس، سرویس HTTP یا محاسبهٔ
          سنگین برای هر رکورد. این شایع‌ترین دلیل lag پایدار است.
        </li>
        <li>
          <strong>Rebalanceهای مکرر:</strong> هر rebalance برای مدتی مصرف را
          متوقف می‌کند و در همان حال تولید ادامه دارد.
        </li>
        <li>
          <strong>توزیع نامتعادل پارتیشن‌ها:</strong> یک پارتیشن داغ یا یک
          مصرف‌کنندهٔ کند، lag کل گروه را بالا می‌برد.
        </li>
        <li>
          <strong>مصرف‌کنندهٔ کمتر از پارتیشن:</strong> اگر تعداد مصرف‌کننده‌ها
          از پارتیشن‌ها بیشتر شود، عضوهای اضافه بی‌کار می‌مانند و ظرفیت مصرف
          بالا نمی‌رود.
        </li>
        <li>
          <strong>پیام سمی:</strong> رکوردی که پردازشش همیشه خطا می‌دهد، دسته را
          پشت سر خود نگه می‌دارد و lag را پیوسته بالا می‌برد.
        </li>
      </ul>

      <h2>۶. چطور lag را پایین بیاوریم؟</h2>
      <p>
        اول علت را پیدا کنید، بعد راه‌حل را انتخاب کنید. اگر نرخ تولید طبیعی است
        و مصرف‌کننده کند است، افزودن مصرف‌کننده تا سقف تعداد پارتیشن‌ها کمک
        می‌کند. اگر سقف پارتیشن‌ها مانع است، تعداد پارتیشن را افزایش دهید؛ ولی
        توجه کنید که این کار ترتیب کلیدها را در پارتیشن‌های جدید تغییر می‌دهد و
        یک تغییر متادیتاست.
      </p>
      <CodeBlock
        code={scaleConsumers}
        language="bash"
        filename="scale-consumers.sh"
      />
      <p>
        اگر موازی‌سازی کافی است ولی هر دسته بیش از حد طول می‌کشد، اندازهٔ دسته و
        زمان پردازش را تنظیم کنید. دستهٔ کوچک‌تر یعنی commit سریع‌تر و lag
        کوتاه‌تر، به بهای رفت‌وبرگشت بیشتر:
      </p>
      <CodeBlock
        code={consumerTuning}
        language="properties"
        filename="consumer.properties"
      />
      <p>
        سه راه دیگر هم ارزش دارد: پردازش را داخل هر مصرف‌کننده موازی کنید (با
        حفظ ترتیب در سطح کلید)، عملیات سنگین را به یک مرحلهٔ بعدی بسپارید، و
        رکوردهای خراب را بعد از چند تلاش به یک <Ltr>Dead Letter Topic</Ltr>{" "}
        بفرستید تا بقیهٔ پارتیشن جلو برود.
      </p>
      <Callout variant="tip" title="قبل از scale، نرخ را اندازه بگیرید">
        <p>
          اگر مصرف‌کننده با ۲ عضو به سقف نرخ تولید نرسیده، اضافه کردن عضو سوم فقط
          وقتی کمک می‌کند که گلوگاه CPU یا I/O هر عضو باشد. اگر گلوگاه دیتابیس
          مشترک باشد، مصرف‌کنندهٔ بیشتر فقط فشار را زیاد می‌کند.
        </p>
      </Callout>

      <h2>۷. اشتباه‌های رایج</h2>
      <Callout variant="danger" title="هشدار روی lag مطلق بدون در نظر گرفتن نرخ">
        <p>
          یک آستانهٔ ثابت مثل «lag بالای ۱۰٬۰۰۰ خطرناک است» برای همهٔ تاپیک‌ها
          درست نیست. تاپیکی با ۱۰۰ هزار رکورد در دقیقه و تاپیکی با ۱۰۰ رکورد در
          روز، معنای کاملاً متفاوتی از lag دارند. آستانه را بر اساس نرخ تولید و
          زمان تحمل کسب‌وکار تعیین کنید.
        </p>
      </Callout>
      <Callout variant="danger" title="افزودن مصرف‌کننده بدون توجه به پارتیشن">
        <p>
          با ۴ پارتیشن، مصرف‌کنندهٔ پنجم هیچ پارتیشنی نمی‌گیرد. قبل از scale،
          تعداد پارتیشن‌ها و توزیع lag بین آن‌ها را ببینید؛ اگر یک پارتیشن داغ
          است، مشکل توزیع کلید است نه تعداد مصرف‌کننده.
        </p>
      </Callout>
      <Callout variant="warning" title="commit دیرهنگام را با lag اشتباه نگیرید">
        <p>
          اگر مصرف‌کننده رکوردها را پردازش کرده ولی هنوز commit نکرده باشد،{' '}
          <Ltr>LAG</Ltr> بالای صفر می‌ماند. این lag واقعیِ «کار باقی‌مانده»
          نیست، بلکه تأخیر در اعلام پیشرفت است. برای همین lag را همراه با نرخ
          مصرف و زمان پردازش ببینید.
        </p>
      </Callout>
      <Callout variant="info" title="lag موقت بخشی از طراحی است">
        <p>
          هیچ سیستمی همیشه lag صفر ندارد. هدف این است که lag در بازهٔ قابل تحمل
          بماند و بعد از هر جهش دوباره پایین بیاید. lag پایدار و صعودی، سیگنال
          واقعی برای اقدام است.
        </p>
      </Callout>

      <DeepDive title="درون محاسبه و پایش lag">
        <DeepDiveSection title="LEO، High Watermark و read_committed">
          <p>
            <Ltr>LEO</Ltr> انتهای لاگ روی Leader است و شامل رکوردهایی می‌شود که
            هنوز به همهٔ replicaها نرسیده‌اند. مصرف‌کنندهٔ عادی فقط تا{' '}
            <Ltr>High Watermark</Ltr> می‌خواند؛ یعنی جایی که همهٔ replicaهای
            in-sync آن را دارند. مصرف‌کنندهٔ <Ltr>read_committed</Ltr> حتی کمی
            عقب‌تر می‌ماند، چون تا <Ltr>LSO</Ltr> صبر می‌کند تا تراکنش‌های باز
            تعیین تکلیف شوند. به همین دلیل lag محاسبه‌شده با LEO ممکن است از
            lag واقعیِ قابل خواندن کمی بزرگ‌تر باشد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا lag گروه همیشه جمع ساده نیست؟">
          <p>
            lag هر پارتیشن مستقل است، ولی جمع آن‌ها وقتی معنا دارد که همهٔ
            پارتیشن‌ها را یک گروه بخواند. اگر بخشی از پارتیشن‌ها به مصرف‌کنندهٔ
            دیگری سپرده شده یا گروه فقط زیرمجموعه‌ای از تاپیک‌ها را می‌خواند،
            جمع کل می‌تواند گمراه‌کننده باشد. برای تحلیل دقیق، همیشه lag را به
            تفکیک تاپیک و پارتیشن ببینید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="تخمین lag زمان از timestamp">
          <p>
            برای محاسبهٔ تقریبی تأخیر، timestamp رکوردی که در committed offset
            قرار دارد را بردارید و از زمان فعلی کم کنید. اگر رکوردها timestamp
            تولید نداشته باشند، کافکا زمان append را می‌گذارد. این عدد وقتی
            معنادار است که timestamp تولید و مصرف در یک منطقهٔ زمانی و با
            هماهنگی ساعت باشند. Burrow و برخی exporterها همین محاسبه را انجام
            می‌دهند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="lag منفی؟">
          <p>
            lag منفی معمولاً یعنی committed offset از LEO جلوتر است؛ مثلاً بعد از
            بازنشانی دستی آفست یا حذف و بازسازی پارتیشن. کافکا این وضعیت را
            خطا نمی‌داند ولی داده‌ای برای خواندن نیست. اگر lag منفی دیدید، اول
            تاریخچهٔ reset offset و سلامت پارتیشن را بررسی کنید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          lag هر پارتیشن برابر <Ltr>LEO − committed offset</Ltr> است و lag گروه
          مجموع همین مقادیر.
        </li>
        <li>
          lag صفر یعنی مصرف‌کننده به انتهای فعلی رسیده؛ سلامت سیستم را باید با
          نرخ مصرف و روند lag سنجید.
        </li>
        <li>
          <Ltr>kafka-consumer-groups.sh</Ltr> برای بررسی سریع و متریک‌های JMX
          برای پایش پیوسته مناسب‌اند.
        </li>
        <li>
          lag پایدار از کندی پردازش، rebalance مکرر، توزیع نامتعادل یا کمبود
          ظرفیت می‌آید.
        </li>
        <li>
          راه‌حل‌ها به ترتیب: پیدا کردن گلوگاه، تنظیم دسته و پردازش، افزودن
          مصرف‌کننده تا سقف پارتیشن، و در نهایت افزایش پارتیشن.
        </li>
      </ul>
      <p>
        حالا می‌دانیم lag چطور اندازه‌گیری می‌شود و چه زمانی هشدار جدی است. قدم
        بعدی این است که ببینیم گروه دقیقاً با چه الگوریتمی پارتیشن‌ها را بین
        اعضا تقسیم می‌کند و انتخاب استراتژی چه اثری بر توقف و جابه‌جایی دارد.
      </p>
    </>
  )
}
