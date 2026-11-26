import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { BatchingCompressionExplainer } from '../../components/simulators/BatchingCompressionExplainer'

const producerConfig = `# producer.properties — بچ و فشرده‌سازی
bootstrap.servers=localhost:9092
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=org.apache.kafka.common.serialization.StringSerializer

# سقف حجم بچ برای هر پارتیشن (بایت، فشرده‌نشده)
batch.size=32768

# حداکثر انتظار برای پر شدن بچ (میلی‌ثانیه)
linger.ms=10

# none | gzip | snappy | lz4 | zstd
compression.type=lz4

# کل حافظهٔ بافر Producer
buffer.memory=67108864`

const javaConfig = `Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
    StringSerializer.class.getName());
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
    StringSerializer.class.getName());

// بچ: حداکثر ۳۲ کیلوبایت یا ۱۰ میلی‌ثانیه انتظار
props.put(ProducerConfig.BATCH_SIZE_CONFIG, 32 * 1024);
props.put(ProducerConfig.LINGER_MS_CONFIG, 10);

// فشرده‌سازی کل بچ پیش از ارسال
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");

// بافر کل Producer: ۶۴ مگابایت
props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 64L * 1024 * 1024);`

const topicCompression = `# پیش‌فرض: بروکر همان کدک Producer را نگه می‌دارد
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --alter --entity-type topics --entity-name orders \\
  --add-config compression.type=producer

# اگر مجبورید بروکر بازفشرده‌سازی کند (هزینهٔ CPU دارد):
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --alter --entity-type topics --entity-name orders \\
  --add-config compression.type=zstd`

const brokerConfig = `# server.properties — پیش‌فرض کل خوشه
compression.type=producer`

export function ProducerBatchingContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل دیدیم Producer با <Ltr>acks</Ltr> چه چیزی را قربانی می‌کند تا
        داده دوام بیاورد. اما یک سؤال دیگر هم هست: چرا هر رکورد را جداگانه
        بفرستیم؟ هر درخواست شبکه هزینهٔ خودش را دارد — هدر، رفت‌وبرگشت، نوشتن
        روی بروکر و تأیید — و اگر این هزینه بین چند رکورد تقسیم شود، توان
        عملیاتی چند برابر می‌شود. Kafka این کار را با <Ltr>Batching</Ltr> انجام
        می‌دهد و روی همان بچ، <Ltr>Compression</Ltr> را هم اعمال می‌کند. در این
        درس می‌بینیم <Ltr>batch.size</Ltr> و <Ltr>linger.ms</Ltr> چطور بچ را
        می‌سازند، <Ltr>compression.type</Ltr> چه چیزی را کم می‌کند، و چرا این
        سه تنظیم بدون هم می‌توانند نتیجهٔ عکس بدهند.
      </p>

      <h2>۱. چرا بچ؟ هزینهٔ هر درخواست</h2>
      <p>
        فرض کنید هر رکورد ۱ کیلوبایت است و برنامه‌تان ۱۰٬۰۰۰ رکورد در ثانیه
        تولید می‌کند؛ یعنی ۱۰ مگابایت در ثانیه. اگر هر رکورد یک درخواست جدا
        باشد، Producer باید ۱۰٬۰۰۰ درخواست در ثانیه بسازد، ۱۰٬۰۰۰ بار منتظر
        پاسخ بماند و بروکر ۱۰٬۰۰۰ بار مسیر نوشتن و تأیید را طی کند. با بچ‌های
        ۱۶ کیلوبایتی، همان ۱۰ مگابایت در حدود ۶۴۰ درخواست در ثانیه جا می‌شود:
        پانزده برابر درخواست کمتر برای همان داده.
      </p>
      <p>
        سود بچ فقط کاهش تعداد درخواست نیست. هر درخواست یک هدر پروتکل، یک
        رفت‌وبرگشت شبکه، یک نوبت نوشتن روی دیسک و یک تأیید دارد. وقتی صد رکورد
        در یک بچ می‌نشینند، همهٔ این هزینه‌ها بین صد رکورد تقسیم می‌شود. به همین
        دلیل بچ بزرگ‌تر معمولاً توان عملیاتی بالاتری می‌دهد؛ تا جایی که گلوگاه
        از تعداد درخواست به پهنای باند شبکه یا سرعت دیسک منتقل شود.
      </p>
      <p>
        نکتهٔ مهم این است که بچ‌ها <strong>برای هر پارتیشن</strong> ساخته
        می‌شوند، نه برای هر Topic. <Ltr>RecordAccumulator</Ltr> برای هر پارتیشن
        یک صف و یک بچ جدا دارد. پس اگر Topic شما ۱۲ پارتیشن داشته باشد، Producer
        می‌تواند هم‌زمان تا ۱۲ بچ باز داشته باشد و هر کدام جداگانه پر و ارسال
        شود. این موضوع در درس <Ltr>Partitioner</Ltr> هم مهم بود: رکوردهای یک
        کلید همیشه در یک بچ و یک پارتیشن می‌مانند.
      </p>
      <Callout variant="info" title="بچ، ترتیب را به هم نمی‌زند">
        <p>
          رکوردهایی که در یک بچ قرار می‌گیرند به همان ترتیبی که وارد شده‌اند
          نوشته می‌شوند و <Ltr>offset</Ltr> می‌گیرند. بچ فقط واحد ارسال است، نه
          واحد ترتیب‌دهی. ترتیب در سطح پارتیشن همچنان حفظ می‌شود؛ به شرطی که
          تنظیمات Retry و <Ltr>max.in.flight</Ltr> درست باشند.
        </p>
      </Callout>

      <h2>۲. batch.size و linger.ms: دو ترمز</h2>
      <p>
        بچ با دو شرط بسته می‌شود: یا حجمش به <Ltr>batch.size</Ltr> می‌رسد، یا
        زمان انتظار <Ltr>linger.ms</Ltr> تمام می‌شود. هر کدام زودتر برسد،
        <Ltr>Sender</Ltr> بچ را برمی‌دارد و برای ارسال آماده می‌کند.
      </p>
      <ul>
        <li>
          <Ltr>batch.size</Ltr> (پیش‌فرض ۱۶ کیلوبایت) سقف حجم بچ برای هر
          پارتیشن است. این عدد بر اساس بایت‌های <strong>فشرده‌نشده</strong>{' '}
          حساب می‌شود؛ چون رکوردها تا لحظهٔ ارسال فشرده نمی‌شوند.
        </li>
        <li>
          <Ltr>linger.ms</Ltr> (پیش‌فرض ۰ در <Ltr>Kafka 3.x</Ltr> و ۵
          میلی‌ثانیه از <Ltr>Kafka 4.0</Ltr>) حداکثر زمانی است که اولین رکورد
          بچ منتظر می‌ماند تا رکوردهای بیشتری برسند.
        </li>
      </ul>
      <p>
        <Ltr>batch.size</Ltr> یک سقف است، نه یک هدف. اگر ترافیک کم باشد، بچ
        هرگز به این حجم نمی‌رسد و این <Ltr>linger.ms</Ltr> است که تصمیم
        می‌گیرد. برعکس، در ترافیک بالا بچ قبل از پایان <Ltr>linger.ms</Ltr> پر
        می‌شود و رکوردها بدون معطلی اضافه ارسال می‌شوند. همچنین اگر یک رکورد
        بزرگ‌تر از <Ltr>batch.size</Ltr> باشد، به‌تنهایی و در بچ یک‌رکوردی
        فرستاده می‌شود؛ Kafka رکورد را برای رعایت سقف تکه نمی‌کند.
      </p>
      <CodeBlock
        code={producerConfig}
        language="properties"
        filename="producer.properties"
      />
      <table>
        <thead>
          <tr>
            <th>تنظیم</th>
            <th>پیش‌فرض</th>
            <th>واحد</th>
            <th>اثر</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>batch.size</Ltr>
            </td>
            <td>
              <Ltr>16384</Ltr>
            </td>
            <td>بایت</td>
            <td>سقف حجم بچ هر پارتیشن؛ پر شدن آن ارسال را فوری می‌کند</td>
          </tr>
          <tr>
            <td>
              <Ltr>linger.ms</Ltr>
            </td>
            <td>
              <Ltr>0</Ltr> (در <Ltr>Kafka 4.0</Ltr>: <Ltr>5</Ltr>)
            </td>
            <td>میلی‌ثانیه</td>
            <td>سقف انتظار برای پر شدن بچ؛ مستقیماً به تأخیر اضافه می‌شود</td>
          </tr>
          <tr>
            <td>
              <Ltr>buffer.memory</Ltr>
            </td>
            <td>
              <Ltr>33554432</Ltr>
            </td>
            <td>بایت</td>
            <td>کل حافظهٔ بافر Producer بین همهٔ پارتیشن‌ها</td>
          </tr>
          <tr>
            <td>
              <Ltr>max.block.ms</Ltr>
            </td>
            <td>
              <Ltr>60000</Ltr>
            </td>
            <td>میلی‌ثانیه</td>
            <td>
              وقتی بافر پر است، <Ltr>send()</Ltr> تا این مدت بلوکه می‌ماند
            </td>
          </tr>
          <tr>
            <td>
              <Ltr>compression.type</Ltr>
            </td>
            <td>
              <Ltr>none</Ltr>
            </td>
            <td>—</td>
            <td>کدک فشرده‌سازی کل بچ پیش از ارسال</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip" title="پیش‌فرض linger.ms را کورکورانه عوض نکنید">
        <p>
          در <Ltr>Kafka 3.x</Ltr> پیش‌فرض صفر است؛ یعنی بچ فقط اگر همان لحظه
          رکورد دیگری در صف باشد ساخته می‌شود. در ترافیک بالا همین پیش‌فرض هم
          بچ‌های خوبی می‌سازد، چون در فاصلهٔ ارسال یک بچ، رکوردهای بعدی می‌رسند.
          در ترافیک کم، افزایش <Ltr>linger.ms</Ltr> تنها راه ساختن بچ است؛ اما
          همان افزایش، تأخیر هر رکورد را هم بالا می‌برد.
        </p>
      </Callout>

      <h2>۳. اثر بر تأخیر و توان عملیاتی</h2>
      <p>
        تأخیر هر رکورد تقریباً از این اجزا ساخته می‌شود: زمان انتظار در بچ (
        <Ltr>linger</Ltr>)، زمان صف در بافر، رفت‌وبرگشت شبکه و زمان تأیید بروکر.
        بچ فقط جزء اول و دوم را کمی بزرگ می‌کند، اما جزء سوم و چهارم را بین چند
        رکورد تقسیم می‌کند. به همین دلیل افزایش <Ltr>linger.ms</Ltr> تا یک
        نقطه، توان عملیاتی را زیاد و تأخیر را کم‌محسوس می‌کند؛ بعد از آن نقطه،
        تأخیر بالا می‌رود بدون سود عملیاتی.
      </p>
      <p>
        یک مثال عددی: فرض کنید روی یک پارتیشن ۲۰۰ رکورد در ثانیه می‌رسد؛ یعنی
        به‌طور میانگین هر ۵ میلی‌ثانیه یک رکورد. با{' '}
        <Ltr>linger.ms=5</Ltr> تقریباً همیشه یک رکورد در بچ است و بچ سودی
        نمی‌دهد. برای رسیدن به بچ ۵۰ رکوردی باید حدود ۲۵۰ میلی‌ثانیه صبر کنید
        که برای بیشتر کاربردها غیرقابل قبول است. نتیجه: در مسیرهای کم‌ترافیک،
        بچ معجزه نمی‌کند؛ باید یا تعداد پارتیشن‌ها و Producerها را زیاد کرد یا
        تأخیر بیشتری پذیرفت.
      </p>
      <table>
        <thead>
          <tr>
            <th>
              <Ltr>linger.ms</Ltr>
            </th>
            <th>رفتار</th>
            <th>تأخیر</th>
            <th>مناسب برای</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>0</Ltr>
            </td>
            <td>بچ فقط با ترافیک لحظه‌ای ساخته می‌شود</td>
            <td>کمترین</td>
            <td>API تعاملی، ابزارهای کنترلی، مسیرهای حساس به تأخیر</td>
          </tr>
          <tr>
            <td>
              <Ltr>5</Ltr>
            </td>
            <td>تعادل خوب؛ پیش‌فرض جدید <Ltr>Kafka 4.0</Ltr></td>
            <td>کم</td>
            <td>بیشتر سرویس‌های تولیدی</td>
          </tr>
          <tr>
            <td>
              <Ltr>20</Ltr> تا <Ltr>50</Ltr>
            </td>
            <td>بچ‌های بزرگ‌تر در ترافیک متوسط</td>
            <td>متوسط</td>
            <td>خطوط لولهٔ داده، لاگ، متریک</td>
          </tr>
          <tr>
            <td>
              <Ltr>100</Ltr> به بالا
            </td>
            <td>بچ‌های بزرگ و فشرده‌سازی بهتر</td>
            <td>بالا</td>
            <td>ETL، آرشیو، بارهای دسته‌ای</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="warning" title="linger.ms روی p99 اثر می‌گذارد">
        <p>
          اولین رکورد هر بچ تا پایان <Ltr>linger.ms</Ltr> منتظر می‌ماند. اگر
          ترافیک ناهموار باشد، همان رکوردهای اول در صدک‌های بالا ظاهر می‌شوند.
          به <Ltr>p50</Ltr> نگاه نکنید و <Ltr>p99</Ltr> را هم اندازه بگیرید؛
          گاهی افزایش <Ltr>linger.ms</Ltr> میانگین را کمی بهتر و دم توزیع را
          بدتر می‌کند.
        </p>
      </Callout>

      <h2>۴. compression.type: کمتر بفرست، بیشتر نگه دار</h2>
      <p>
        فشرده‌سازی در Kafka روی <strong>کل بچ</strong> انجام می‌شود، نه روی هر
        رکورد. Producer بچ را با کدک انتخاب‌شده فشرده می‌کند، بروکر همان بایت‌های
        فشرده را در لاگ می‌نویسد و مصرف‌کننده هنگام خواندن آن را باز می‌کند.
        نتیجه این است که هم شبکه کمتر درگیر می‌شود، هم دیسک کمتر پر می‌شود، به
        قیمت کمی CPU روی Producer و مصرف‌کننده.
      </p>
      <p>
        <Ltr>compression.type</Ltr> پنج مقدار دارد: <Ltr>none</Ltr>،{' '}
        <Ltr>gzip</Ltr>، <Ltr>snappy</Ltr>، <Ltr>lz4</Ltr> و{' '}
        <Ltr>zstd</Ltr>. پیش‌فرض Producer مقدار <Ltr>none</Ltr> است؛ یعنی تا
        وقتی خودتان انتخاب نکنید، هیچ فشرده‌سازی‌ای انجام نمی‌شود.
      </p>
      <table>
        <thead>
          <tr>
            <th>کدک</th>
            <th>نسبت فشرده‌سازی</th>
            <th>هزینهٔ CPU</th>
            <th>تأخیر</th>
            <th>مناسب برای</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>none</Ltr>
            </td>
            <td>بدون فشرده‌سازی</td>
            <td>هیچ</td>
            <td>کمترین</td>
            <td>payloadهایی که خودشان فشرده‌اند یا بچ‌های کوچک</td>
          </tr>
          <tr>
            <td>
              <Ltr>gzip</Ltr>
            </td>
            <td>بالا</td>
            <td>بالا</td>
            <td>بیشترین</td>
            <td>آرشیو، پهنای باند محدود، سازگاری با ابزارهای قدیمی</td>
          </tr>
          <tr>
            <td>
              <Ltr>snappy</Ltr>
            </td>
            <td>متوسط</td>
            <td>کم</td>
            <td>کم</td>
            <td>سازگاری با مصرف‌کننده‌های قدیمی یا ضعیف</td>
          </tr>
          <tr>
            <td>
              <Ltr>lz4</Ltr>
            </td>
            <td>متوسط تا خوب</td>
            <td>بسیار کم</td>
            <td>کم</td>
            <td>انتخاب پیشنهادی برای بیشتر مسیرهای تولیدی</td>
          </tr>
          <tr>
            <td>
              <Ltr>zstd</Ltr>
            </td>
            <td>بالا</td>
            <td>متوسط</td>
            <td>کم تا متوسط</td>
            <td>دیسک محدود، انتقال بین دیتاسنتر، حجم بالا</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock
        code={topicCompression}
        language="bash"
        filename="topic-compression.sh"
      />
      <CodeBlock
        code={brokerConfig}
        language="properties"
        filename="server.properties"
      />
      <p>
        تنظیم <Ltr>compression.type</Ltr> در سطح Topic یا بروکر سه حالت دارد:
        مقدار <Ltr>producer</Ltr> یعنی همان کدکی که Producer فرستاده حفظ شود
        (پیش‌فرض)، <Ltr>uncompressed</Ltr> یعنی بروکر بچ را باز کند و بدون
        فشرده‌سازی ذخیره کند، و نام یک کدک یعنی بروکر بچ را با آن کدک بازفشرده
        کند. حالت سوم CPU بروکر را مصرف می‌کند و فقط وقتی لازم است که
        مصرف‌کننده‌ها با کدک Producer سازگار نباشند.
      </p>
      <Callout variant="warning" title="فشرده‌سازی با بچ کوچک ضرر هم دارد">
        <p>
          فشرده‌سازی یک بچ یک‌رکوردی معمولاً چیزی کم نمی‌کند و ممکن است به خاطر
          هدر و سربار کدک، حتی چند بایت اضافه کند. اگر{' '}
          <Ltr>linger.ms=0</Ltr> است و بچ‌ها کوچک‌اند، فشرده‌سازی فقط CPU مصرف
          می‌کند. فشرده‌سازی وقتی سود می‌دهد که بچ بزرگ باشد؛ به همین دلیل{' '}
          <Ltr>compression.type</Ltr> و <Ltr>linger.ms</Ltr> را باید با هم
          تنظیم کرد.
        </p>
      </Callout>

      <h2>۵. بچ و فشرده‌سازی با هم</h2>
      <p>
        بچ و فشرده‌سازی یک اثر مرکب دارند. فرض کنید هر رکورد ۱ کیلوبایت JSON
        است و بچ‌ها ۶۴ کیلوبایتی ساخته می‌شوند؛ یعنی حدود ۶۴ رکورد در هر بچ.
        با <Ltr>lz4</Ltr> و نسبت حدود سه به یک، هر بچ از ۶۴ کیلوبایت به حدود
        ۲۱ کیلوبایت می‌رسد. اگر همان ۱۰٬۰۰۰ رکورد در ثانیه را داشته باشیم،
        شبکه از ۱۰ مگابایت در ثانیه به حدود ۳٫۳ مگابایت در ثانیه کاهش پیدا
        می‌کند.
      </p>
      <p>
        اثر روی دیسک هم قابل توجه است: یک روز داده با ۱۰ مگابایت در ثانیه حدود
        ۸۶۴ گیگابایت خام است؛ با همان نسبت سه به یک، حدود ۲۸۸ گیگابایت روی دیسک
        می‌نشیند. Kafka بچ فشرده را همان‌طور در Segmentهای لاگ ذخیره می‌کند و
        برای ذخیره‌سازی آن را باز نمی‌کند. پس نه تعداد رکوردها عوض می‌شود، نه{' '}
        <Ltr>offset</Ltr>ها؛ فقط تعداد بایت‌ها کمتر می‌شود.
      </p>
      <p>
        نسبت فشرده‌سازی به دو چیز بستگی دارد: هرچه بچ بزرگ‌تر باشد، هدر و
        دیکشنری بین رکوردهای بیشتری تقسیم می‌شود؛ و هرچه رکوردها شبیه‌تر باشند
        (همان schema، همان نام فیلدها، مقادیر تکراری)، فشرده‌سازی بهتر جواب
        می‌دهد. به همین دلیل JSON با کلیدهای تکراری خیلی خوب فشرده می‌شود، اما
        تصویر یا فایل از قبل فشرده تقریباً فشرده نمی‌شود.
      </p>
      <Callout variant="tip" title="متریک‌های درست را ببینید">
        <p>
          برای قضاوت دربارهٔ بچ و فشرده‌سازی به{' '}
          <Ltr>batch-size-avg</Ltr>، <Ltr>records-per-request-avg</Ltr>،{' '}
          <Ltr>compression-rate-avg</Ltr>، <Ltr>request-latency-avg</Ltr> و{' '}
          <Ltr>buffer-available-bytes</Ltr> نگاه کنید. اگر{' '}
          <Ltr>records-per-request-avg</Ltr> نزدیک یک است، بچ‌ها عملاً ساخته
          نمی‌شوند و تغییر کدک فشرده‌سازی کمکی نمی‌کند.
        </p>
      </Callout>

      <h2>۶. یک بچ، یک سفر</h2>
      <p>
        در توضیح تعاملی زیر سه رکورد ۳۰۰ بایتی به پارتیشن <Ltr>0</Ltr> می‌رسند.
        تنظیمات این صحنه <Ltr>batch.size=16384</Ltr>، <Ltr>linger.ms=5</Ltr> و{' '}
        <Ltr>compression.type=lz4</Ltr> است. می‌بینید که بچ با پایان{' '}
        <Ltr>linger</Ltr> بسته می‌شود، فشرده می‌شود، با یک درخواست به بروکر
        می‌رود، با یک تأیید برمی‌گردد و در سمت مصرف‌کننده باز می‌شود. رنگ‌ها یک
        معنا دارند: آبی برای مرحلهٔ فعال، سبز برای نتیجهٔ نهایی و زرد برای
        زمان‌سنج <Ltr>linger</Ltr>.
      </p>

      <BatchingCompressionExplainer />

      <p>
        به گام ۳ نگاه کنید: بچ فقط ۹۰۰ بایت از <Ltr>16384</Ltr> بایت است، اما ساعت{' '}
        <Ltr>linger</Ltr> تمام شده و بچ بسته می‌شود. گام ۴ همان جایی است که
        ۹۰۰ بایت به ۳۲۰ بایت می‌رسد. در گام ۶ یک درخواست برای سه رکورد می‌رود و
        در گام ۷ بروکر به هر رکورد <Ltr>offset</Ltr> جداگانه می‌دهد؛ فشرده‌سازی
        واحد ذخیره را کوچک کرده، اما شمارش رکوردها را عوض نکرده است. گام ۸ نشان
        می‌دهد که یک تأیید، هر سه <Ltr>Future</Ltr> را کامل می‌کند.
      </p>

      <h2>۷. تنظیمات پیشنهادی بر اساس سناریو</h2>
      <p>
        هیچ ترکیب واحدی برای همهٔ کاربردها وجود ندارد. جدول زیر نقطهٔ شروع است،
        نه قانون قطعی؛ هر عدد را با بار واقعی خودتان اندازه بگیرید.
      </p>
      <table>
        <thead>
          <tr>
            <th>سناریو</th>
            <th>
              <Ltr>linger.ms</Ltr>
            </th>
            <th>
              <Ltr>batch.size</Ltr>
            </th>
            <th>
              <Ltr>compression.type</Ltr>
            </th>
            <th>نکته</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>API تعاملی و تأخیر حساس</td>
            <td>
              <Ltr>0</Ltr> تا <Ltr>2</Ltr>
            </td>
            <td>
              <Ltr>16384</Ltr>
            </td>
            <td>
              <Ltr>lz4</Ltr> اگر payload بزرگ است
            </td>
            <td>
              <Ltr>p99</Ltr> را جدی بگیرید؛ بچ بزرگ را قربانی تأخیر نکنید
            </td>
          </tr>
          <tr>
            <td>سرویس پرترافیک تولیدی</td>
            <td>
              <Ltr>5</Ltr> تا <Ltr>20</Ltr>
            </td>
            <td>
              <Ltr>32768</Ltr> تا <Ltr>65536</Ltr>
            </td>
            <td>
              <Ltr>lz4</Ltr>
            </td>
            <td>نقطهٔ تعادل بین تأخیر و توان عملیاتی</td>
          </tr>
          <tr>
            <td>لاگ و متریک حجیم</td>
            <td>
              <Ltr>20</Ltr> تا <Ltr>100</Ltr>
            </td>
            <td>
              <Ltr>65536</Ltr> تا <Ltr>131072</Ltr>
            </td>
            <td>
              <Ltr>lz4</Ltr> یا <Ltr>zstd</Ltr>
            </td>
            <td>تأخیر مهم نیست؛ حجم و هزینهٔ دیسک مهم است</td>
          </tr>
          <tr>
            <td>انتقال بین دیتاسنترها</td>
            <td>
              <Ltr>20</Ltr> تا <Ltr>50</Ltr>
            </td>
            <td>
              <Ltr>65536</Ltr>
            </td>
            <td>
              <Ltr>zstd</Ltr>
            </td>
            <td>نسبت فشرده‌سازی مهم‌تر از CPU است</td>
          </tr>
          <tr>
            <td>ETL و بار دسته‌ای</td>
            <td>
              <Ltr>100</Ltr> به بالا
            </td>
            <td>
              <Ltr>131072</Ltr> به بالا
            </td>
            <td>
              <Ltr>zstd</Ltr>
            </td>
            <td>بچ‌های بزرگ و نسبت فشرده‌سازی بالا</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={javaConfig} language="java" filename="BatchedProducer.java" />
      <Callout variant="info" title="buffer.memory را فراموش نکنید">
        <p>
          <Ltr>batch.size</Ltr> برای هر پارتیشن است، اما حافظه از یک استخر
          مشترک <Ltr>buffer.memory</Ltr> (پیش‌فرض ۳۲ مگابایت) می‌آید. اگر بچ‌ها
          را بزرگ کنید و تعداد پارتیشن‌ها هم زیاد باشد، بافر زودتر پر می‌شود و{' '}
          <Ltr>send()</Ltr> تا آزاد شدن جا بلوکه می‌ماند. در این حالت{' '}
          <Ltr>buffer-exhausted-rate</Ltr> بالا می‌رود و تأخیر برنامه از تنظیم
          بچ هم بیشتر می‌شود.
        </p>
      </Callout>

      <h2>۸. اشتباه‌های رایج</h2>
      <Callout variant="danger" title="batch.size بزرگ با linger.ms صفر">
        <p>
          بزرگ‌ترین بچ ممکن را می‌خواهید، پس <Ltr>batch.size</Ltr> را به ۱
          مگابایت می‌برید و <Ltr>linger.ms</Ltr> را صفر می‌گذارید. در ترافیک کم،
          بچ هیچ‌وقت پر نمی‌شود و عملاً هر رکورد جدا می‌رود. عدد{' '}
          <Ltr>batch.size</Ltr> بدون <Ltr>linger.ms</Ltr> کافی، فقط حافظه
          می‌گیرد.
        </p>
      </Callout>
      <Callout variant="danger" title="فشرده‌سازی با بچ‌های کوچک">
        <p>
          <Ltr>compression.type=lz4</Ltr> را روشن می‌کنید اما بچ‌ها یک‌رکوردی
          می‌مانند. نتیجه: CPU بیشتر، نسبت فشرده‌سازی نزدیک یک و گاهی بایت‌های
          بیشتر. اول بچ را بزرگ کنید، بعد فشرده‌سازی را انتظار داشته باشید.
        </p>
      </Callout>
      <Callout variant="warning" title="افزایش linger.ms بدون اندازه‌گیری p99">
        <p>
          «<Ltr>linger.ms</Ltr> را ۵۰ می‌کنیم تا سریع‌تر شود» یک تصمیم نیمه‌کاره
          است. توان عملیاتی بالا می‌رود، اما اولین رکورد هر بچ تا ۵۰ میلی‌ثانیه
          منتظر می‌ماند. اگر مسیر تعاملی است، این تأخیر را در{' '}
          <Ltr>p99</Ltr> می‌بینید.
        </p>
      </Callout>
      <Callout variant="warning" title="انتظار کاهش تعداد رکوردها با فشرده‌سازی">
        <p>
          فشرده‌سازی فقط بایت‌ها را کم می‌کند. تعداد رکوردها، تعداد{' '}
          <Ltr>offset</Ltr>ها و منطق مصرف‌کننده هیچ تغییری نمی‌کند. اگر
          می‌خواهید تعداد پیام‌ها کم شود، به <Ltr>Log Compaction</Ltr> یا
          طراحی دوبارهٔ Topic فکر کنید، نه به فشرده‌سازی.
        </p>
      </Callout>
      <Callout variant="warning" title="بازفشرده‌سازی سمت بروکر بدون دلیل">
        <p>
          <Ltr>compression.type</Ltr> را روی Topic برابر یک کدک خاص می‌گذارید،
          در حالی که Producer کدک دیگری می‌فرستد. بروکر مجبور می‌شود هر بچ را باز
          و دوباره فشرده کند. این کار CPU بروکر را می‌گیرد و در بار بالا به
          تأخیر همهٔ درخواست‌ها اضافه می‌کند. تا وقتی دلیل مشخصی ندارید، مقدار{' '}
          <Ltr>producer</Ltr> را نگه دارید.
        </p>
      </Callout>
      <Callout variant="danger" title="انتظار فشرده‌سازی از payload فشرده">
        <p>
          اگر محتوای رکوردها از قبل فشرده است (تصویر، فایل ZIP، Avro با کدک
          فشرده)، فشرده‌سازی دوباره تقریباً هیچ سودی ندارد و فقط CPU می‌خورد.
          کدک را بر اساس نوع payload انتخاب کنید، نه بر اساس عادت.
        </p>
      </Callout>

      <DeepDive title="درون بچ: بایت‌ها، کدک و تنظیمات دقیق">
        <DeepDiveSection title="ساختار RecordBatch">
          <p>
            هر بچ در Kafka یک ساختار <Ltr>RecordBatch</Ltr> دارد: یک هدر با{' '}
            <Ltr>baseOffset</Ltr>، طول بچ، <Ltr>magic</Ltr>،{' '}
            <Ltr>CRC</Ltr>، <Ltr>attributes</Ltr> (که کدک فشرده‌سازی هم داخل
            همان ذخیره می‌شود)، <Ltr>lastOffsetDelta</Ltr>،{' '}
            <Ltr>baseTimestamp</Ltr>، <Ltr>maxTimestamp</Ltr>، شناسهٔ Producer و
            شمارهٔ ترتیب، و در انتها رکوردها. وقتی فشرده‌سازی فعال است، بخش
            رکوردها فشرده می‌شود و <Ltr>CRC</Ltr> روی همان بایت‌های فشرده
            محاسبه می‌شود. به همین دلیل بروکر می‌تواند بدون باز کردن بچ، صحت آن
            را بررسی کند و آن را در Segment بنویسد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="batch.size فشرده‌نشده، max.message.bytes فشرده">
          <p>
            <Ltr>batch.size</Ltr> روی بایت‌های فشرده‌نشده در بافر اعمال می‌شود،
            چون فشرده‌سازی تا لحظهٔ ارسال انجام نمی‌شود. اما{' '}
            <Ltr>max.message.bytes</Ltr> (پیش‌فرض حدود ۱ مگابایت) سقف اندازهٔ
            بچ پس از فشرده‌سازی است. یعنی ممکن است بچی از{' '}
            <Ltr>batch.size</Ltr> عبور نکند اما بعد از فشرده‌سازی هم زیر سقف
            بروکر باشد؛ یا برعکس، بچی بزرگ‌تر از سقف ساخته شود و بروکر آن را رد
            کند. اگر پیام‌های بزرگ دارید، هر دو عدد را با هم ببینید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="linger.ms=0 دقیقاً چه می‌کند؟">
          <p>
            با <Ltr>linger.ms=0</Ltr>، <Ltr>Sender</Ltr> بچ را در اولین فرصت
            برمی‌دارد؛ اما این به معنای «یک رکورد در هر درخواست» نیست. وقتی
            رکوردی می‌رسد و <Ltr>Sender</Ltr> مشغول ارسال بچ قبلی است، رکورد در
            بافر می‌ماند و رکوردهای بعدی هم به همان بچ اضافه می‌شوند. در ترافیک
            بالا این رفتار خودبه‌خود بچ می‌سازد؛ در ترافیک کم، بچ‌ها کوچک
            می‌مانند. این تفاوت را با متریک <Ltr>records-per-request-avg</Ltr>{' '}
            ببینید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="سطوح فشرده‌سازی">
          <p>
            برای هر کدک می‌توان سطح فشرده‌سازی را جدا تنظیم کرد:{' '}
            <Ltr>compression.gzip.level</Ltr>، <Ltr>compression.lz4.level</Ltr>{' '}
            و <Ltr>compression.zstd.level</Ltr>. سطح بالاتر یعنی نسبت بهتر و
            CPU بیشتر. برای بیشتر مسیرها سطح پیش‌فرض کافی است؛ سطح را فقط وقتی
            بالا ببرید که پهنای باند یا دیسک واقعاً گلوگاه باشد. سطح پایین‌تر
            برای مسیرهای حساس به تأخیر منطقی‌تر است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="فشرده‌سازی و ترتیب">
          <p>
            فشرده‌سازی و بچ، ترتیب درون پارتیشن را عوض نمی‌کنند. اما بچ بزرگ‌تر
            یعنی پنجرهٔ بزرگ‌تری از رکوردها در پرواز است؛ اگر{' '}
            <Ltr>max.in.flight.requests.per.connection</Ltr> بزرگ باشد و Retry
            رخ دهد، بدون <Ltr>idempotence</Ltr> ممکن است ترتیب به هم بخورد. در
            درس بعدی می‌بینیم <Ltr>enable.idempotence</Ltr> چطور این مشکل را حل
            می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا مصرف‌کننده هم CPU می‌دهد؟">
          <p>
            مصرف‌کننده بچ فشرده را از بروکر می‌گیرد و قبل از تحویل رکوردها به
            برنامه، آن را باز می‌کند. این کار در thread شبکهٔ مصرف‌کننده انجام
            می‌شود. اگر کدک سنگین باشد (مثلاً <Ltr>gzip</Ltr> با سطح بالا)،
            ممکن است گلوگاه از بروکر به مصرف‌کننده منتقل شود. برای همین{' '}
            <Ltr>lz4</Ltr> و <Ltr>zstd</Ltr> در مسیرهای پرترافیک محبوب‌ترند:
            باز کردنشان سریع است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="اندازه‌گیری در عمل">
          <p>
            سه متریک Producer برای این درس کافی است:{' '}
            <Ltr>batch-size-avg</Ltr> (میانگین بایت هر بچ)،{' '}
            <Ltr>records-per-request-avg</Ltr> (چند رکورد در هر درخواست) و{' '}
            <Ltr>compression-rate-avg</Ltr> (نسبت بایت فشرده به خام). کنارشان{' '}
            <Ltr>request-latency-avg</Ltr> و{' '}
            <Ltr>buffer-available-bytes</Ltr> را ببینید تا مطمئن شوید بچ بزرگ،
            تأخیر یا فشار حافظه را از حد خارج نکرده است.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          بچ هزینهٔ هر درخواست را بین چند رکورد تقسیم می‌کند و بچ‌ها برای هر
          پارتیشن جدا ساخته می‌شوند.
        </li>
        <li>
          <Ltr>batch.size</Ltr> سقف حجم و <Ltr>linger.ms</Ltr> سقف زمان انتظار
          است؛ هر کدام زودتر برسد بچ بسته می‌شود.
        </li>
        <li>
          بچ بزرگ‌تر توان عملیاتی را بالا و تأخیر اولین رکورد را بیشتر می‌کند؛
          تعادل را با <Ltr>p99</Ltr> و بار واقعی پیدا کنید.
        </li>
        <li>
          فشرده‌سازی روی کل بچ انجام می‌شود و هم شبکه و هم دیسک را کم می‌کند؛
          هزینه‌اش CPU Producer و مصرف‌کننده است.
        </li>
        <li>
          فشرده‌سازی بدون بچ بزرگ تقریباً بی‌فایده است؛ این دو تنظیم را با هم
          ببینید.
        </li>
        <li>
          فشرده‌سازی تعداد رکوردها و <Ltr>offset</Ltr>ها را تغییر نمی‌دهد؛ فقط
          بایت‌ها را کم می‌کند.
        </li>
      </ul>
      <p>
        حالا می‌دانیم Producer چطور با بچ و فشرده‌سازی، هزینهٔ شبکه و دیسک را کم
        می‌کند. قدم بعدی این است که ببینیم وقتی ارسال شکست می‌خورد، Retry چه
        بلایی سر ترتیب و تکرار رکوردها می‌آورد و <Ltr>Idempotent Producer</Ltr>{' '}
        چطور دقیقاً یک‌بار نوشتن را تضمین می‌کند.
      </p>
    </>
  )
}
