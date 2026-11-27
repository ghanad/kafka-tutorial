import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const uiCompose = `services:
  kafka-ui:
    image: provectuslabs/kafka-ui:v0.7.2
    container_name: kafka-ui
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local-three-node
      # از نام سرویس داخلی داکر استفاده کنید، نه localhost
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka-1:9092,kafka-2:9092,kafka-3:9092
      # فقط خواندن: ساخت تاپیک، تولید پیام و حذف غیرفعال می‌شود
      KAFKA_CLUSTERS_0_READONLY: "true"
    depends_on:
      - kafka-1
      - kafka-2
      - kafka-3`

const akhqCompose = `services:
  akhq:
    image: tchiotludo/akhq:0.25.1
    container_name: akhq
    ports:
      - "8081:8080"
    environment:
      AKHQ_CONFIGURATION: |
        akhq:
          connections:
            local:
              properties:
                bootstrap.servers: "kafka-1:9092,kafka-2:9092,kafka-3:9092"
    depends_on:
      - kafka-1
      - kafka-2
      - kafka-3`

const authExample = `# نمونه تنظیمات امنیتی در Kafka UI
KAFKA_CLUSTERS_0_PROPERTIES_SECURITY_PROTOCOL: SASL_SSL
KAFKA_CLUSTERS_0_PROPERTIES_SASL_MECHANISM: SCRAM-SHA-512
KAFKA_CLUSTERS_0_PROPERTIES_SASL_JAAS_CONFIG: >-
  org.apache.kafka.common.security.scram.ScramLoginModule required
  username="ui-reader" password="secret";
KAFKA_CLUSTERS_0_PROPERTIES_SSL_TRUSTSTORE_LOCATION: /etc/kafka/truststore.jks
KAFKA_CLUSTERS_0_PROPERTIES_SSL_TRUSTSTORE_PASSWORD: changeit`

const cliCompare = `# همان کار با CLI: دیدن lag یک گروه
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --describe --group billing

# همان کار با CLI: دیدن چند پیام آخر یک تاپیک
kafka-console-consumer.sh --bootstrap-server localhost:9092 \\
  --topic orders --group ui-debug --max-messages 20`

export function KafkaUiToolsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا همه کارها را در ترمینال انجام دادیم. اما گاهی دیدن یک تاپیک،
        چند پیام آخر و lag یک گروه در یک صفحه گرافیکی بسیار سریع‌تر از حفظ کردن
        فلگ‌هاست. ابزارهایی مثل <Ltr>Kafka UI</Ltr>، <Ltr>AKHQ</Ltr> و{' '}
        <Ltr>Kafdrop</Ltr> همین را ممکن می‌کنند. در این درس می‌بینیم این ابزارها
        چه کاری را خوب انجام می‌دهند، کجا خطرناک می‌شوند و چطور یک نمونه امن و
        فقط‌خواندنی راه بیندازیم.
      </p>

      <Callout variant="info" title="رابط گرافیکی، منبع حقیقت نیست">
        هر چیزی که در UI می‌بینید، از <Ltr>AdminClient</Ltr> و مصرف‌کننده‌های
        کافکا می‌آید. اگر UI کند است یا lag را متفاوت نشان می‌دهد، حقیقت همان
        چیزی است که خود کافکا و ابزارهای خط فرمان می‌گویند. برای هشدار و
        خودکارسازی، UI جای مانیتورینگ واقعی را نمی‌گیرد.
      </Callout>

      <h2>۱. این ابزارها چه کاری انجام می‌دهند؟</h2>
      <p>
        بیشتر رابط‌های گرافیکی کافکا یک مجموعه قابلیت مشترک دارند:
      </p>
      <ul>
        <li>
          <strong>مرور تاپیک‌ها:</strong> فهرست تاپیک‌ها، تعداد پارتیشن، replicaها
          و تنظیمات.
        </li>
        <li>
          <strong>دیدن پیام‌ها:</strong> خواندن چند پیام از یک پارتیشن، جست‌وجو
          بر اساس کلید یا آفست.
        </li>
        <li>
          <strong>گروه‌های مصرف‌کننده:</strong> اعضا، پارتیشن‌های تخصیص‌یافته و
          lag هر پارتیشن.
        </li>
        <li>
          <strong>تولید پیام آزمایشی:</strong> فرستادن یک رکورد برای آزمون سریع.
        </li>
        <li>
          <strong>مدیریت:</strong> ساخت و حذف تاپیک، تغییر تنظیمات و بازنشانی
          آفست؛ دقیقاً همان کارهایی که باید با احتیاط انجام شوند.
        </li>
        <li>
          <strong>اکوسیستم:</strong> دیدن <Ltr>Schema Registry</Ltr>،{' '}
          <Ltr>Kafka Connect</Ltr> و گاهی <Ltr>ACL</Ltr>ها.
        </li>
      </ul>

      <h2>۲. کدام ابزار را انتخاب کنیم؟</h2>
      <table>
        <thead>
          <tr>
            <th>ابزار</th>
            <th>نقطه قوت</th>
            <th>نکته</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>Kafka UI</Ltr> (Provectus)
            </td>
            <td>رابط تمیز، پشتیبانی از چند خوشه، Schema Registry و Connect</td>
            <td>حالت فقط‌خواندنی و احراز هویت دارد؛ برای تیم‌های کوچک مناسب است.</td>
          </tr>
          <tr>
            <td>
              <Ltr>AKHQ</Ltr>
            </td>
            <td>جست‌وجوی قدرتمند پیام، پشتیبانی از چند خوشه و کنترل دسترسی</td>
            <td>تنظیماتش با فایل YAML است؛ برای محیط‌های چندتیمی خوب است.</td>
          </tr>
          <tr>
            <td>
              <Ltr>Kafdrop</Ltr>
            </td>
            <td>سبک و ساده برای مرور سریع تاپیک و پیام</td>
            <td>قابلیت مدیریتی کمتری دارد؛ برای تولید محدودتر است.</td>
          </tr>
          <tr>
            <td>
              <Ltr>Redpanda Console</Ltr>
            </td>
            <td>رابط مدرن و پشتیبانی خوب از کافکا</td>
            <td>محصول حول Redpanda ساخته شده، اما با کافکا هم کار می‌کند.</td>
          </tr>
          <tr>
            <td>
              <Ltr>Conduktor</Ltr>
            </td>
            <td>ابزار سازمانی با کنترل دسترسی و گردش کار تیمی</td>
            <td>محصول تجاری است؛ برای تیم‌های بزرگ و محیط‌های حساس.</td>
          </tr>
          <tr>
            <td>
              <Ltr>Offset Explorer</Ltr>
            </td>
            <td>کلاینت دسکتاپ برای کار انفرادی</td>
            <td>روی سیستم شما اجرا می‌شود؛ برای محیط مشترک مناسب نیست.</td>
          </tr>
        </tbody>
      </table>
      <p>
        انتخاب ابزار به اندازه تیم، نیاز به کنترل دسترسی و میزان حساسیت محیط
        بستگی دارد. برای یک آزمایشگاه محلی، هر کدام از گزینه‌های سبک کافی است.
        برای محیط عملیاتی، اولویت با ابزاری است که احراز هویت، مجوز و حالت
        فقط‌خواندنی دارد.
      </p>

      <h2>۳. یک نمونه امن با Docker Compose</h2>
      <p>
        فرض کنید خوشه سه‌گانه درس قبل را دارید. یک سرویس <Ltr>Kafka UI</Ltr>{' '}
        اضافه کنید که از listener داخلی استفاده کند و در حالت فقط‌خواندنی باشد.
        در این حالت می‌توانید همه‌چیز را ببینید، اما ساخت تاپیک، تولید پیام و
        حذف غیرفعال است:
      </p>
      <CodeBlock code={uiCompose} language="yaml" filename="docker-compose.ui.yml" />
      <p>
        بعد از اجرا، آدرس <Ltr className="font-mono">http://localhost:8080</Ltr>{' '}
        را باز کنید. اگر <Ltr>KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS</Ltr> را{' '}
        <Ltr>localhost:9092</Ltr> بگذارید، UI داخل کانتینر به خودش وصل می‌شود و
        خطا می‌گیرد؛ همیشه آدرس listener داخلی را بدهید.
      </p>
      <p>
        <Ltr>AKHQ</Ltr> هم گزینه خوبی است. نمونه ساده آن با فایل YAML داخلی:
      </p>
      <CodeBlock code={akhqCompose} language="yaml" filename="docker-compose.akhq.yml" />

      <h2>۴. امنیت: UI را یک در پشتی نکنید</h2>
      <p>
        یک UI که بدون احراز هویت روی شبکه باز است، یعنی هر کسی می‌تواند تاپیک
        حذف کند، آفست گروه‌ها را بازنشانی کند یا پیام جعلی بفرستد. حتی در محیط
        توسعه هم بهتر است از حالت فقط‌خواندنی شروع کنید. برای محیط عملیاتی:
      </p>
      <ul>
        <li>
          <strong>احراز هویت:</strong> ورود با <Ltr>OIDC</Ltr> یا{' '}
          <Ltr>LDAP</Ltr>، نه دسترسی آزاد.
        </li>
        <li>
          <strong>مجوز:</strong> کاربر پایش فقط حق خواندن داشته باشد؛ تولید و
          حذف برای تعداد کمی از افراد باز شود.
        </li>
        <li>
          <strong>اتصال امن:</strong> UI با <Ltr>SASL_SSL</Ltr> به کافکا وصل شود
          و گواهی معتبر داشته باشد.
        </li>
        <li>
          <strong>شبکه:</strong> UI را پشت VPN یا شبکه داخلی نگه دارید؛ هرگز
          پورت آن را مستقیم به اینترنت باز نکنید.
        </li>
        <li>
          <strong>حساب کم‌اختیار:</strong> کاربر کافکای UI را فقط به تاپیک‌های
          لازم محدود کنید.
        </li>
        <li>
          <strong>لاگ و حسابرسی:</strong> بدانید چه کسی چه تغییری داده است؛
          ابزارهای سازمانی این را بهتر پوشش می‌دهند.
        </li>
      </ul>
      <CodeBlock code={authExample} language="properties" filename="kafka-ui-auth.env" />
      <Callout variant="danger" title="UI با دسترسی admin در محیط تولید">
        دادن حساب <Ltr>superuser</Ltr> به UI یعنی یک باگ یا یک کلیک اشتباه
        می‌تواند کل خوشه را تغییر دهد. حساب UI را جدا و کم‌اختیار بسازید و
        عملیات حساس را از مسیر کنترل‌شده انجام دهید.
      </Callout>

      <h2>۵. کجا UI کمک می‌کند و کجا نه؟</h2>
      <table>
        <thead>
          <tr>
            <th>کار</th>
            <th>UI</th>
            <th>CLI یا خودکارسازی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>دیدن سریع تنظیمات یک تاپیک</td>
            <td>عالی</td>
            <td>خوب، اما نیاز به حفظ فلگ دارد</td>
          </tr>
          <tr>
            <td>بررسی lag یک گروه</td>
            <td>بسیار خوب، با نمودار</td>
            <td>دقیق و قابل اسکریپت</td>
          </tr>
          <tr>
            <td>ساخت منظم تاپیک در چند محیط</td>
            <td>مناسب نیست</td>
            <td>IaC یا اسکریپت</td>
          </tr>
          <tr>
            <td>حذف یا تغییر تنظیم در تولید</td>
            <td>خطرناک</td>
            <td>با بررسی و تأیید</td>
          </tr>
          <tr>
            <td>هشدار و مانیتورینگ مداوم</td>
            <td>جایگزین نیست</td>
            <td>Prometheus، JMX و هشدار</td>
          </tr>
          <tr>
            <td>آموزش و نمایش به تیم</td>
            <td>عالی</td>
            <td>کمتر خوانا</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={cliCompare} language="bash" filename="cli-compare.sh" />

      <h2>۶. محدودیت‌های دیدن پیام در UI</h2>
      <p>
        وقتی در UI روی یک تاپیک کلیک می‌کنید و پیام‌ها را می‌بینید، در واقع یک
        مصرف‌کننده موقت ساخته می‌شود که از یک آفست شروع می‌کند و چند پیام
        می‌خواند. این کار سه محدودیت دارد:
      </p>
      <ul>
        <li>
          <strong>همه پیام‌ها را نمی‌بینید:</strong> UI برای جلوگیری از فشار،
          معمولاً صفحه‌بندی می‌کند یا فقط بخشی از پارتیشن را می‌خواند.
        </li>
        <li>
          <strong>دسریالایز کردن ممکن است شکست بخورد:</strong> اگر پیام‌ها{' '}
          <Ltr>Avro</Ltr> یا <Ltr>Protobuf</Ltr> باشند و schema در دسترس UI
          نباشد، پیام به‌صورت بایت یا متن نامفهوم دیده می‌شود.
        </li>
        <li>
          <strong>خواندن می‌تواند گران باشد:</strong> مرور یک تاپیک با میلیون‌ها
          پیام، ترافیک و حافظه مصرف می‌کند. برای بررسی دقیق، از آفست و فیلتر
          استفاده کنید.
        </li>
      </ul>

      <DeepDive title="جزئیات فنی: UI چطور پیام و lag را می‌بیند؟">
        <DeepDiveSection title="مصرف‌کننده موقت">
          <p>
            بیشتر UIها برای دیدن پیام، یک <Ltr>KafkaConsumer</Ltr> با{' '}
            <Ltr>group.id</Ltr> تصادفی می‌سازند، به پارتیشن مورد نظر{' '}
            <Ltr>seek</Ltr> می‌کنند و چند رکورد می‌خوانند. چون گروه تصادفی است،
            این خواندن روی آفست گروه‌های واقعی شما اثر ندارد. اما اگر UI را طوری
            تنظیم کنید که با گروه واقعی بخواند، می‌تواند پیشرفت مصرف‌کننده اصلی
            را تغییر دهد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="lag از کجا می‌آید؟">
          <p>
            UI برای هر پارتیشن، آفست ثبت‌شده گروه را از{' '}
            <Ltr>__consumer_offsets</Ltr> می‌خواند و آن را با{' '}
            <Ltr>log end offset</Ltr> مقایسه می‌کند. اختلاف این دو همان lag است.
            اگر UI عددی متفاوت از CLI نشان می‌دهد، احتمالاً یکی از آن‌ها از
            snapshot قدیمی‌تری استفاده می‌کند یا پارتیشن‌های بدون مصرف‌کننده را
            متفاوت حساب می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا UI برای عملیات انبوه مناسب نیست؟">
          <p>
            عملیات UI معمولاً یکی‌یکی و با کلیک انجام می‌شود. برای ساخت صد تاپیک،
            تغییر تنظیمات چند محیط یا بازنشانی آفست ده‌ها گروه، اسکریپت یا ابزار
            IaC قابل تکرار و قابل بازبینی است. UI برای تصمیم‌های اکتشافی خوب است،
            نه برای تغییرات تکرارشدنی.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="باز گذاشتن UI بدون احراز هویت">
        یک UI باز روی شبکه، در عمل یک پنل مدیریت کافکا برای همه است. حتی در
        محیط تست، دسترسی را محدود کنید و از حالت فقط‌خواندنی شروع کنید.
      </Callout>
      <Callout variant="danger" title="حذف تاپیک از UI در محیط تولید">
        کلیک حذف در UI همان دستور حذف را اجرا می‌کند، بدون فرصت بازبینی طرح و
        وابستگی‌ها. عملیات حساس را با CLI یا ابزار خودکار و بعد از بررسی انجام
        دهید.
      </Callout>
      <Callout variant="warning" title="استفاده از localhost در تنظیمات UI">
        اگر UI داخل داکر است و <Ltr>bootstrap.servers</Ltr> را{' '}
        <Ltr>localhost:9092</Ltr> می‌دهید، به خود کانتینر وصل می‌شود. از نام
        سرویس یا آدرس listener داخلی استفاده کنید.
      </Callout>
      <Callout variant="warning" title="اعتماد به lag نمایشی برای هشدار">
        UI برای نگاه انسانی است. برای هشدار خودکار، متریک را از JMX یا{' '}
        <Ltr>kafka-consumer-groups.sh</Ltr> بگیرید و در سیستم مانیتورینگ ثبت
        کنید. وابستگی هشدارها به UI یعنی یک نقطه شکست اضافه.
      </Callout>
      <Callout variant="info" title="image با تگ latest">
        نسخه UI را pin کنید. تغییر ناگهانی نسخه می‌تواند تنظیمات یا رفتار
        دسترسی را عوض کند و در بدترین حالت UI را از کار بیندازد.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          UI برای کاوش، آموزش و بررسی سریع عالی است؛ منبع حقیقت و ابزار
          خودکارسازی نیست.
        </li>
        <li>
          <Ltr>Kafka UI</Ltr>، <Ltr>AKHQ</Ltr> و <Ltr>Kafdrop</Ltr> گزینه‌های
          رایج و سبک هستند.
        </li>
        <li>
          حالت فقط‌خواندنی، احراز هویت، شبکه محدود و حساب کم‌اختیار حداقل‌های
          امنیتی‌اند.
        </li>
        <li>
          برای عملیات حساس و تکرارشدنی از CLI، IaC یا ابزار خودکار استفاده کنید.
        </li>
        <li>
          دیدن پیام در UI همیشه کامل نیست؛ صفحه‌بندی، دسریالایز و فشار خواندن را
          در نظر بگیرید.
        </li>
      </ul>
      <p>
        با این درس، فصل «Kafka در عمل» کامل می‌شود: از ابزارهای خط فرمان و خوشه
        سه‌گانه تا مدیریت تاپیک، reassignment و رابط‌های گرافیکی. حالا ابزار
        کافی برای اداره یک خوشه واقعی دارید؛ در فصل‌های بعد سراغ اکوسیستم، امنیت
        و الگوهای معماری می‌رویم.
      </p>
    </>
  )
}
