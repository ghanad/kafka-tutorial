import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { ConsumerOffsetsExplainer } from '../../components/simulators/ConsumerOffsetsExplainer'

const manualCommit = `Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "billing");
props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

// پیشرفت را خودمان مدیریت می‌کنیم
props.put("enable.auto.commit", "false");

try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
    consumer.subscribe(List.of("orders"));

    while (running) {
        ConsumerRecords<String, String> records =
            consumer.poll(Duration.ofMillis(500));

        for (ConsumerRecord<String, String> record : records) {
            process(record);
        }

        if (!records.isEmpty()) {
            // فقط بعد از پردازش موفق دسته، پیشرفت را ذخیره می‌کنیم
            consumer.commitSync();
        }
    }
}`

const explicitOffsetCommit = `// فقط تا جایی که واقعاً پردازش شده commit می‌کنیم
Map<TopicPartition, OffsetAndMetadata> done = new HashMap<>();

for (ConsumerRecord<String, String> record : records) {
    process(record);
    done.put(
        new TopicPartition(record.topic(), record.partition()),
        new OffsetAndMetadata(record.offset() + 1) // offset بعدی
    );
}

consumer.commitSync(done);`

const asyncCommit = `// commit سبک و غیرمسدودکننده
consumer.commitAsync((offsets, exception) -> {
    if (exception != null) {
        // commitAsync خودش retry نمی‌کند؛ خطا را لاگ کنید
        log.warn("commit failed for {}", offsets, exception);
    }
});

// قبل از خروج، آخرین وضعیت را قطعی ذخیره کنید
consumer.commitSync();`

const consumerConfig = `# consumer.properties — کنترل commit
bootstrap.servers=localhost:9092
group.id=billing

# commit را دستی انجام می‌دهیم
enable.auto.commit=false

# فقط اگر enable.auto.commit=true باشد معنا دارد
auto.commit.interval.ms=5000

# بازهٔ نگه‌داری offset گروه‌ها در __consumer_offsets (پیش‌فرض ۷ روز)
offsets.retention.minutes=10080`

const describeGroup = `# آخرین offset commitشده و فاصله تا انتهای لاگ
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --describe --group billing

# TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# orders  0          1044            1047            3`

export function ConsumerOffsetsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل دیدیم چند مصرف‌کننده چطور پارتیشن‌ها را بین خود تقسیم می‌کنند.
        اما یک سؤال مهم باقی می‌ماند: وقتی گروه دوباره rebalance می‌شود یا پروسه
        ری‌استارت می‌شود، از کجا ادامه می‌دهد؟ پاسخ در دو مفهوم نزدیک ولی متفاوت
        است: <strong>position</strong> که فقط در حافظه است و{' '}
        <strong>committed offset</strong> که در کافکا ذخیره می‌شود. در این درس
        می‌بینیم commit یعنی چه، تفاوت commit خودکار و دستی چیست و کافکا این
        پیشرفت را در تاپیک داخلی <Ltr>__consumer_offsets</Ltr> چطور نگه می‌دارد.
      </p>

      <h2>۱. position و committed offset: دو عدد شبیه هم، دو معنی متفاوت</h2>
      <p>
        هر مصرف‌کننده برای هر پارتیشن دو عدد را در ذهن دارد. اولی{' '}
        <strong>position</strong> است: آفست رکورد بعدی که باید خوانده شود. این
        عدد در حافظهٔ خود پروسهٔ مصرف‌کننده است و به‌محض برگشتن رکوردها از{' '}
        <Ltr>poll</Ltr> جلو می‌رود. دومی <strong>committed offset</strong> است:
        آفستی که گروه رسماً اعلام کرده «پیشرفت من تا اینجاست». این عدد در کافکا
        ذخیره می‌شود و بعد از ری‌استارت یا rebalance از همان‌جا ادامه می‌دهید.
      </p>
      <table>
        <thead>
          <tr>
            <th>ویژگی</th>
            <th>position</th>
            <th>committed offset</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>کجا نگه‌داری می‌شود</td>
            <td>حافظهٔ پروسهٔ مصرف‌کننده</td>
            <td>در تاپیک <Ltr>__consumer_offsets</Ltr> روی بروکرها</td>
          </tr>
          <tr>
            <td>چه زمانی جلو می‌رود</td>
            <td>به‌محض برگشتن رکوردها از <Ltr>poll</Ltr></td>
            <td>فقط وقتی <Ltr>commit</Ltr> صدا زده شود</td>
          </tr>
          <tr>
            <td>بعد از ری‌استارت</td>
            <td>از بین می‌رود</td>
            <td>باقی می‌ماند و نقطهٔ شروع است</td>
          </tr>
          <tr>
            <td>معنی عدد</td>
            <td>رکورد بعدی برای خواندن</td>
            <td>رکورد بعدی برای خواندن، از دید گروه</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="info" title="offset ذخیره‌شده «آخرین رکورد» نیست">
        <p>
          اگر آخرین رکورد پردازش‌شده <Ltr>1043</Ltr> باشد، offsetی که commit
          می‌کنید <Ltr>1044</Ltr> است، نه <Ltr>1043</Ltr>. کافکا آفست را به‌عنوان
          «نقطهٔ شروع دفعهٔ بعد» تفسیر می‌کند؛ اگر <Ltr>1043</Ltr> را commit
          کنید، همان رکورد دوباره خوانده می‌شود.
        </p>
      </Callout>

      <h2>۲. commit یعنی چه و چرا لازم است؟</h2>
      <p>
        <strong>commit</strong> همان لحظه‌ای است که مصرف‌کننده پیشرفتش را به
        کافکا می‌گوید. بدون commit، کافکا هیچ راهی ندارد بداند گروه تا کجا
        رسیده است. اگر پروسه بمیرد، مصرف‌کنندهٔ جدید از آخرین offset ذخیره‌شده
        شروع می‌کند؛ اگر هیچ offsetی ذخیره نشده باشد، بسته به{' '}
        <Ltr>auto.offset.reset</Ltr> یا از ابتدای لاگ می‌خواند یا از انتهای آن.
      </p>
      <p>
        نکتهٔ کلیدی این است که commit فقط یک اعلان است، نه بخشی از پردازش. بین
        «خواندن رکورد» و «commit کردن آن» یک پنجرهٔ زمانی وجود دارد. اگر پروسه
        داخل این پنجره بمیرد، رکورد دوباره خوانده می‌شود. اگر commit را قبل از
        پردازش انجام دهید و بعد پروسه بمیرد، رکورد از دست می‌رود. همین انتخاب
        ساده، پایهٔ تفاوت <Ltr>at-least-once</Ltr> و <Ltr>at-most-once</Ltr>{" "}
        است که در درس بعدی کامل می‌شود.
      </p>

      <h2>۳. یک چرخهٔ position و commit را گام‌به‌گام ببینید</h2>
      <p>
        در توضیح تعاملی زیر یک مصرف‌کننده در گروه <Ltr>billing</Ltr> روی پارتیشن
        ۰ تاپیک <Ltr>orders</Ltr> را دنبال می‌کنیم. می‌بینید <Ltr>position</Ltr>{" "}
        چطور با هر <Ltr>poll</Ltr> جلو می‌رود، committed offset چطور فقط با{' '}
        <Ltr>commit</Ltr> عوض می‌شود، یک کرش چه چیزی را از بین می‌برد و چرا
        رکوردها دوباره خوانده می‌شوند. نیمهٔ دوم به commit خودکار و انواع commit
        دستی می‌پردازد.
      </p>

      <ConsumerOffsetsExplainer />

      <p>
        به گام ۲ برگردید: بعد از <Ltr>poll</Ltr>، <Ltr>position</Ltr> به{' '}
        <Ltr>1044</Ltr> رسیده ولی committed offset هنوز <Ltr>1040</Ltr> است.
        همین فاصله دقیقاً همان چیزی است که در گام ۵ با کرش از بین می‌رود. در گام
        ۶ ببینید که مصرف‌کنندهٔ جدید <Ltr>position</Ltr> را از committed offset
        می‌سازد، نه از آخرین رکوردی که در حافظه دیده بود.
      </p>

      <h2>۴. __consumer_offsets چیست؟</h2>
      <p>
        کافکا offset هر گروه را در یک تاپیک داخلی به نام{' '}
        <Ltr>__consumer_offsets</Ltr> ذخیره می‌کند. این تاپیک به‌طور پیش‌فرض ۵۰
        پارتیشن دارد و با <strong>log compaction</strong> نگه‌داری می‌شود؛ یعنی
        برای هر کلید فقط آخرین مقدار می‌ماند. کلید هر رکورد ترکیبی از{' '}
        <Ltr>group.id</Ltr>، نام تاپیک و شمارهٔ پارتیشن است و مقدار آن آخرین
        offset commitشده به‌همراه متادیتاست.
      </p>
      <p>
        این تاپیک را خود کافکا مدیریت می‌کند و مستقیماً برای مصرف شما ساخته نشده
        است. Group Coordinator هر گروه، بر اساس هش <Ltr>group.id</Ltr>، یکی از
        پارتیشن‌های این تاپیک را برای آن گروه انتخاب می‌کند و همان بروکر مسئول
        ذخیره و خواندن offsetهای آن گروه می‌شود. به همین دلیل وقتی می‌خواهید
        ببینید یک گروه تا کجا رسیده، به‌جای خواندن دستی این تاپیک از{' '}
        <Ltr>kafka-consumer-groups.sh</Ltr> استفاده کنید.
      </p>
      <CodeBlock
        code={describeGroup}
        language="bash"
        filename="describe-group.sh"
      />
      <p>
        در خروجی، <Ltr>CURRENT-OFFSET</Ltr> همان committed offset است و{' '}
        <Ltr>LOG-END-OFFSET</Ltr> انتهای فعلی لاگ. تفاوت این دو همان{' '}
        <Ltr>LAG</Ltr> است. اگر مصرف‌کننده رکوردها را خوانده ولی هنوز commit
        نکرده باشد، <Ltr>LAG</Ltr> بزرگ‌تر از صفر می‌ماند، حتی اگر پردازش تمام
        شده باشد.
      </p>
      <Callout variant="warning" title="به __consumer_offsets دست نزنید">
        <p>
          نوشتن یا حذف دستی رکوردهای این تاپیک می‌تواند وضعیت گروه‌ها را خراب
          کند. برای بازنشانی offset از{' '}
          <Ltr>kafka-consumer-groups.sh --reset-offsets</Ltr> استفاده کنید تا
          تغییر به‌صورت کنترل‌شده و با هماهنگی Coordinator انجام شود.
        </p>
      </Callout>

      <h2>۵. commit خودکار در برابر دستی</h2>
      <p>
        کافکا دو سبک commit دارد. در حالت <strong>خودکار</strong>، با{' '}
        <Ltr>enable.auto.commit=true</Ltr> (پیش‌فرض)، کلاینت هر{' '}
        <Ltr>auto.commit.interval.ms</Ltr> (پیش‌فرض ۵ ثانیه) خودش commit
        می‌کند. این commit معمولاً در ابتدای <Ltr>poll</Ltr> بعدی انجام می‌شود و
        offsetهایی را ذخیره می‌کند که در دور قبلی برگشته‌اند؛ یعنی ممکن است قبل
        از اینکه پردازش دستهٔ قبلی تمام شود، پیشرفت ذخیره شود.
      </p>
      <p>
        در حالت <strong>دستی</strong>، <Ltr>enable.auto.commit=false</Ltr>{" "}
        می‌گذارید و خودتان بعد از پردازش موفق، <Ltr>commitSync</Ltr> یا{' '}
        <Ltr>commitAsync</Ltr> را صدا می‌زنید. کنترل کامل دارید، ولی مسئولیت
        مدیریت خطا و زمان‌بندی هم با شماست.
      </p>
      <CodeBlock
        code={manualCommit}
        language="java"
        filename="ManualCommit.java"
      />
      <table>
        <thead>
          <tr>
            <th>روش</th>
            <th>مسدودکننده؟</th>
            <th>retry خودکار</th>
            <th>مناسب برای</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>خودکار (<Ltr>enable.auto.commit</Ltr>)</td>
            <td>در پس‌زمینه</td>
            <td>بله، تا حدی</td>
            <td>کارهای کم‌اهمیت که از دست رفتن چند رکورد مهم نیست</td>
          </tr>
          <tr>
            <td><Ltr>commitSync()</Ltr></td>
            <td>بله</td>
            <td>بله، تا وقتی خطای قابل‌تکرار نباشد</td>
            <td>دادهٔ مهم و commit نهایی</td>
          </tr>
          <tr>
            <td><Ltr>commitAsync()</Ltr></td>
            <td>خیر</td>
            <td>خیر</td>
            <td>commit دوره‌ای با throughput بالا</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock
        code={asyncCommit}
        language="java"
        filename="AsyncCommit.java"
      />
      <p>
        اگر یک دسته را بخشی‌بخشی پردازش می‌کنید، می‌توانید offset دقیق را commit
        کنید. این کار از پردازش دوبارهٔ رکوردهایی که هنوز نرسیده‌اید جلوگیری
        می‌کند و در pipelineهای طولانی مفید است.
      </p>
      <CodeBlock
        code={explicitOffsetCommit}
        language="java"
        filename="ExplicitOffsetCommit.java"
      />
      <CodeBlock
        code={consumerConfig}
        language="properties"
        filename="consumer.properties"
      />

      <DeepDive title="درون __consumer_offsets و انواع commit">
        <DeepDiveSection title="کلید و مقدار هر رکورد چیست؟">
          <p>
            کلید شامل نسخه، <Ltr>group.id</Ltr>، نام تاپیک و شمارهٔ پارتیشن است
            و مقدار شامل offset، متادیتای اختیاری، timestamp و شناسهٔ تولیدکننده
            است. چون تاپیک compacted است، commitهای قدیمی برای همان کلید حذف
            می‌شوند و فقط آخرین مقدار می‌ماند. به همین دلیل حجم این تاپیک با
            تعداد گروه‌ها و پارتیشن‌ها رشد می‌کند، نه با تعداد commitها.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا ۵۰ پارتیشن؟">
          <p>
            تعداد پارتیشن‌های <Ltr>__consumer_offsets</Ltr> سقف تعداد گروه‌هایی
            را که می‌توانند هم‌زمان روی بروکرهای مختلف پخش شوند تعیین می‌کند. با
            تعداد زیاد گروه، ۵۰ پارتیشن معمولاً کافی است. این عدد را با{' '}
            <Ltr>offsets.topic.num.partitions</Ltr> فقط قبل از اولین استفاده
            می‌توان تغییر داد؛ بعد از ساخته‌شدن، افزایشش نیاز به بازتوزیع دارد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="offsets.retention.minutes">
          <p>
            اگر گروهی مدت طولانی فعال نباشد، کافکا offsetهایش را پاک می‌کند. با
            پیش‌فرض ۷ روز، گروهی که یک هفته هیچ مصرف‌کننده‌ای نداشته باشد
            offsetهایش را از دست می‌دهد و بعد از بازگشت بسته به{' '}
            <Ltr>auto.offset.reset</Ltr> از ابتدا یا انتها شروع می‌کند. برای
            گروه‌هایی که فصلی یا کم‌کار هستند این مقدار را آگاهانه تنظیم کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="commitSync در برابر commitAsync در خطا">
          <p>
            <Ltr>commitSync</Ltr> تا دریافت پاسخ یا پایان مهلت منتظر می‌ماند و
            خطاهای قابل‌تکرار را خودش retry می‌کند. <Ltr>commitAsync</Ltr> فقط
            یک درخواست می‌فرستد و نتیجه را در callback می‌دهد؛ اگر commit قدیمی
            شکست بخورد ولی commit جدیدتر موفق شود، retry کردن قدیمی می‌تواند
            offset را عقب ببرد. به همین دلیل <Ltr>commitAsync</Ltr> را برای
            commitهای میانی و <Ltr>commitSync</Ltr> را برای commit نهایی به کار
            ببرید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="commit در حین rebalance">
          <p>
            هنگام rebalance، پارتیشن‌ها ممکن است بین اعضا جابه‌جا شوند. اگر قبل
            از رها کردن پارتیشن، offset پردازش‌شده commit نشود، عضو بعدی از
            offset قدیمی‌تر شروع می‌کند و رکوردها دوباره پردازش می‌شوند. در
            <Ltr>ConsumerRebalanceListener</Ltr> می‌توانید در{' '}
            <Ltr>onPartitionsRevoked</Ltr> قبل از رها کردن، commit نهایی را انجام
            دهید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>۶. اشتباه‌های رایج</h2>
      <Callout variant="danger" title="commit قبل از پردازش">
        <p>
          اگر بلافاصله بعد از <Ltr>poll</Ltr> و قبل از پردازش commit کنید، هر
          کرش بین commit و پایان پردازش باعث از دست رفتن رکوردها می‌شود. commit
          را بعد از پردازش موفق انجام دهید.
        </p>
      </Callout>
      <Callout variant="danger" title="اشتباه گرفتن position با committed offset">
        <p>
          <Ltr>position</Ltr> فقط در حافظه است. اگر بعد از خواندن رکوردها و
          قبل از commit پروسه ری‌استارت شود، از committed offset قبلی ادامه
          می‌دهید، نه از <Ltr>position</Ltr>. این منبع اصلی پردازش تکراری در
          حالت <Ltr>at-least-once</Ltr> است.
        </p>
      </Callout>
      <Callout variant="warning" title="انتظار عدم‌تکرار با commit دستی">
        <p>
          commit دستی پردازش تکراری را حذف نمی‌کند؛ فقط پنجرهٔ آن را کنترل
          می‌کند. برای حذف کامل تکرار باید پردازش idempotent باشد یا از
          تراکنش‌های کافکا استفاده کنید. این موضوع در درس‌های Semanticهای تحویل
          و Transactionها ادامه پیدا می‌کند.
        </p>
      </Callout>
      <Callout variant="warning" title="commit کردن کل دسته بدون توجه به خطا">
        <p>
          اگر وسط پردازش یک دسته خطا رخ دهد و باز هم کل دسته را commit کنید،
          رکوردهای پردازش‌نشده برای همیشه رد می‌شوند. یا کل دسته را دوباره
          پردازش کنید، یا با offset مشخص فقط تا آخرین رکورد موفق commit کنید.
        </p>
      </Callout>
      <Callout variant="info" title="auto.offset.reset جای commit را نمی‌گیرد">
        <p>
          <Ltr>auto.offset.reset</Ltr> فقط وقتی به کار می‌آید که هیچ offset
          معتبری برای گروه وجود نداشته باشد. تا وقتی committed offset موجود است،
          این تنظیم نادیده گرفته می‌شود؛ پس انتظار نداشته باشید با تغییر آن،
          رفتار یک گروه فعال را عوض کنید.
        </p>
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          <Ltr>position</Ltr> آفست بعدی برای خواندن در حافظه است و با هر{' '}
          <Ltr>poll</Ltr> جلو می‌رود.
        </li>
        <li>
          committed offset همان عددی است که در{' '}
          <Ltr>__consumer_offsets</Ltr> ذخیره می‌شود و نقطهٔ شروع بعد از
          ری‌استارت است.
        </li>
        <li>
          offset ذخیره‌شده «رکورد بعدی» است، نه آخرین رکورد خوانده‌شده.
        </li>
        <li>
          commit خودکار ساده است ولی می‌تواند رکورد را از دست بدهد؛ برای دادهٔ
          مهم commit دستی بعد از پردازش را انتخاب کنید.
        </li>
        <li>
          <Ltr>commitSync</Ltr> مطمئن‌تر است و <Ltr>commitAsync</Ltr> سریع‌تر؛
          برای commit نهایی از نسخهٔ همگام استفاده کنید.
        </li>
      </ul>
      <p>
        حالا می‌دانیم پیشرفت گروه کجا و چطور ذخیره می‌شود. قدم بعدی این است که
        ببینیم این انتخاب‌ها چطور به سه تضمین تحویل{' '}
        <Ltr>at-most-once</Ltr>، <Ltr>at-least-once</Ltr> و{' '}
        <Ltr>exactly-once</Ltr> منتهی می‌شوند.
      </p>
    </>
  )
}
