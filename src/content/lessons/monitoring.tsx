import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const lagCommand = `# lag هر پارتیشن برای یک گروه
kafka-consumer-groups.sh --bootstrap-server broker-1:9092 \\
  --describe --group billing

# وضعیت گروه و اعضای آن
kafka-consumer-groups.sh --bootstrap-server broker-1:9092 \\
  --describe --group billing --state

# تخصیص پارتیشن‌ها و lag هر عضو
kafka-consumer-groups.sh --bootstrap-server broker-1:9092 \\
  --describe --group billing --members --verbose`

const lagOutput = `GROUP     TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID
billing   orders  0          1520            1520            0    consumer-1
billing   orders  1          984             1002            18   consumer-2
billing   orders  2          2210            2680            470  consumer-3
billing   orders  3          1180            1180            0    consumer-1`

const alertRules = `groups:
  - name: kafka
    rules:
      - alert: KafkaOfflinePartitions
        expr: kafka_controller_kafkacontroller_offlinepartitionscount > 0
        for: 1m
        labels:
          severity: critical

      - alert: KafkaUnderReplicated
        expr: kafka_server_replicamanager_underreplicatedpartitions > 0
        for: 5m
        labels:
          severity: warning

      - alert: KafkaUnderMinIsr
        expr: kafka_server_replicamanager_undermininsrpartitioncount > 0
        for: 1m
        labels:
          severity: critical

      - alert: KafkaDiskFilling
        expr: |
          node_filesystem_avail_bytes{mountpoint="/data"}
            / node_filesystem_size_bytes{mountpoint="/data"} < 0.2
        for: 15m
        labels:
          severity: warning`

const jmxConfig = `# مقادیر را با محیط خودتان عوض کنید
KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote \\
  -Dcom.sun.management.jmxremote.port=9999 \\
  -Dcom.sun.management.jmxremote.rmi.port=9999 \\
  -Dcom.sun.management.jmxremote.authenticate=true \\
  -Dcom.sun.management.jmxremote.ssl=true \\
  -Dcom.sun.management.jmxremote.password.file=/etc/kafka/jmxremote.password \\
  -Dcom.sun.management.jmxremote.access.file=/etc/kafka/jmxremote.access"`

export function MonitoringContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        خوشه‌ای که همه بروکرهایش بالا هستند همیشه سالم نیست. ممکن است یک
        پارتیشن <Ltr>ISR</Ltr> ناقص داشته باشد، مصرف‌کننده‌ای ساعت‌ها عقب باشد یا
        دیسکی تا چند روز دیگر پر شود. پایش یعنی این وضعیت‌ها را قبل از تبدیل شدن
        به خرابی ببینیم. در این درس متریک‌های اصلی، نحوه تفسیر{' '}
        <Ltr>Consumer Lag</Ltr> و چند قانون هشدار عملی را مرور می‌کنیم.
      </p>

      <Callout variant="info" title="متریک، هشدار و لاگ سه چیز متفاوت‌اند">
        متریک برای دیدن روند و ظرفیت است، هشدار برای وقتی که باید کسی بیدار شود
        و لاگ برای پیدا کردن علت. اگر همه متریک‌ها را هشدار کنید، تیم به نویز
        عادت می‌کند. هشدار را فقط روی نشانه‌های مهم و با شرط زمانی بگذارید.
      </Callout>

      <h2>۱. سه سؤال پایش</h2>
      <p>
        هر داشبورد کافکا باید به این سه سؤال جواب بدهد. اگر جواب یکی نبود،
        داشبورد ناقص است:
      </p>
      <table>
        <thead>
          <tr>
            <th>سؤال</th>
            <th>معنی</th>
            <th>نمونه متریک</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>زنده است؟</td>
            <td>بروکرها و کنترلر در دسترس‌اند</td>
            <td><Ltr>ActiveControllerCount</Ltr>، وضعیت <Ltr>ISR</Ltr></td>
          </tr>
          <tr>
            <td>سالم است؟</td>
            <td>تکرار و تعادل درست است</td>
            <td><Ltr>UnderReplicatedPartitions</Ltr>، فضای دیسک</td>
          </tr>
          <tr>
            <td>به‌اندازه کافی سریع است؟</td>
            <td>مصرف‌کننده‌ها عقب نمی‌مانند</td>
            <td><Ltr>Consumer Lag</Ltr>، تأخیر درخواست‌ها</td>
          </tr>
        </tbody>
      </table>

      <h2>۲. متریک‌های حیاتی بروکر</h2>
      <p>
        کافکا متریک‌های زیادی از طریق <Ltr>JMX</Ltr> منتشر می‌کند، اما تعداد
        کمی از آن‌ها واقعاً برای هشدار لازم‌اند. این جدول حداقل مجموعه یک خوشه
        تولیدی است:
      </p>
      <table>
        <thead>
          <tr>
            <th>متریک</th>
            <th>معنی</th>
            <th>آستانه و اقدام</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>UnderReplicatedPartitions</Ltr></td>
            <td>پارتیشن‌هایی که تعداد اعضای <Ltr>ISR</Ltr> کمتر از <Ltr>RF</Ltr> است</td>
            <td>بیش از ۵ دقیقه بزرگ‌تر از صفر: بررسی بروکر و شبکه</td>
          </tr>
          <tr>
            <td><Ltr>OfflinePartitionsCount</Ltr></td>
            <td>پارتیشن‌های بدون لیدر</td>
            <td>هر مقدار بزرگ‌تر از صفر: هشدار فوری</td>
          </tr>
          <tr>
            <td><Ltr>ActiveControllerCount</Ltr></td>
            <td>تعداد کنترلر فعال در خوشه</td>
            <td>باید دقیقاً ۱ باشد؛ صفر یا ۲ یعنی مشکل</td>
          </tr>
          <tr>
            <td><Ltr>UnderMinIsrPartitionCount</Ltr></td>
            <td>پارتیشن‌هایی که نوشتن در آن‌ها متوقف شده است</td>
            <td>هر مقدار بزرگ‌تر از صفر: هشدار فوری</td>
          </tr>
          <tr>
            <td><Ltr>RequestHandlerAvgIdlePercent</Ltr></td>
            <td>ظرفیت آزاد پردازش درخواست بروکر</td>
            <td>کمتر از ۳۰٪ به‌صورت پایدار: کمبود CPU یا دیسک</td>
          </tr>
          <tr>
            <td><Ltr>BytesInPerSec</Ltr> و <Ltr>BytesOutPerSec</Ltr></td>
            <td>نرخ ورود و خروج داده</td>
            <td>انحراف شدید از خط پایه: بررسی بار یا حمله</td>
          </tr>
          <tr>
            <td><Ltr>FailedProduceRequestsPerSec</Ltr></td>
            <td>نرخ شکست نوشتن</td>
            <td>هر افزایش پایدار: بررسی <Ltr>ISR</Ltr> و مجوزها</td>
          </tr>
          <tr>
            <td>فضای دیسک</td>
            <td>درصد استفاده از پوشه داده</td>
            <td>۸۰٪ هشدار، ۹۰٪ بحرانی</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip" title="خط پایه بسازید">
        عدد «عادی» هر خوشه متفاوت است. یک هفته متریک را در بار عادی ثبت کنید
        تا بدانید <Ltr>BytesInPerSec</Ltr> و تأخیر درخواست‌ها در ساعت پیک چقدر
        است. هشدار بدون خط پایه، یا زیاد زنگ می‌زند یا دیر.
      </Callout>

      <h2>۳. Consumer Lag: عددی که همه می‌پرسند</h2>
      <p>
        <Ltr>Lag</Ltr> فاصله آفست مصرف‌کننده با انتهای لاگ است:{' '}
        <Ltr>lag = log-end-offset - committed-offset</Ltr>. اگر گروه روی چند
        پارتیشن کار می‌کند، هر پارتیشن <Ltr>Lag</Ltr> جدا دارد و جمع آن‌ها
        تصویر کلی می‌دهد. عدد بزرگ به‌تنهایی بد نیست؛ سؤال مهم این است که
        «ثابت است یا در حال رشد؟»
      </p>
      <CodeBlock code={lagCommand} language="bash" filename="consumer-lag.sh" />
      <CodeBlock code={lagOutput} language="bash" filename="lag-output.txt" />
      <table>
        <thead>
          <tr>
            <th>الگوی lag</th>
            <th>معنی</th>
            <th>اقدام</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>کوچک و ثابت</td>
            <td>مصرف‌کننده همگام است</td>
            <td>هیچ؛ فقط روند را ببینید</td>
          </tr>
          <tr>
            <td>صفر روی همه پارتیشن‌ها</td>
            <td>مصرف‌کننده عقب نیست یا تاپیک بی‌ترافیک است</td>
            <td>مطمئن شوید مصرف‌کننده واقعاً در حال کار است</td>
          </tr>
          <tr>
            <td>رشد پیوسته</td>
            <td>ظرفیت مصرف‌کننده از نرخ ورود کمتر است</td>
            <td>افزایش مصرف‌کننده، بهینه‌سازی پردازش یا تقسیم کار</td>
          </tr>
          <tr>
            <td>پله‌ای و برگشتی</td>
            <td><Ltr>rebalance</Ltr> یا خرابی موقت</td>
            <td>لاگ مصرف‌کننده و تنظیمات <Ltr>max.poll.interval.ms</Ltr></td>
          </tr>
          <tr>
            <td>فقط روی یک پارتیشن</td>
            <td>کلید داغ یا پیام سمی</td>
            <td>توزیع کلید و زمان پردازش همان پیام را بررسی کنید</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="warning" title="lag مطلق بدون نرخ ورود گمراه‌کننده است">
        اگر ۱۰۰ هزار پیام عقب هستید اما نرخ ورود و خروج برابر است، احتمالاً
        فقط یک جهش موقت بوده. اگر ۱۰۰۰ پیام عقب هستید و هر دقیقه بیشتر می‌شود،
        مشکل واقعی است. همیشه <Ltr>Lag</Ltr> را همراه نرخ مصرف و نرخ تولید
        ببینید.
      </Callout>

      <h2>۴. JVM، دیسک و شبکه</h2>
      <p>
        کافکا به حافظه زیادی برای <Ltr>Page Cache</Ltr> نیاز دارد و به تأخیر
        دیسک حساس است. این جدول نقطه شروع پایش منابع است:
      </p>
      <table>
        <thead>
          <tr>
            <th>منبع</th>
            <th>چه چیزی را ببینیم</th>
            <th>وضعیت نگران‌کننده</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>Heap</Ltr></td>
            <td>مصرف حافظه و <Ltr>GC</Ltr></td>
            <td>پرش‌های مکرر <Ltr>Full GC</Ltr> یا مکث بیش از یک ثانیه</td>
          </tr>
          <tr>
            <td><Ltr>Page Cache</Ltr></td>
            <td>حافظه آزاد سیستم</td>
            <td><Ltr>swap</Ltr> شدن یا حافظه آزاد نزدیک صفر با فشار دیسک</td>
          </tr>
          <tr>
            <td>دیسک</td>
            <td>فضای آزاد و زمان انتظار</td>
            <td>بیش از ۸۰٪ فضا یا <Ltr>iowait</Ltr> بالا</td>
          </tr>
          <tr>
            <td>شبکه</td>
            <td>پهنای باند مصرفی</td>
            <td>بیش از ۷۰٪ لینک به‌صورت پایدار</td>
          </tr>
          <tr>
            <td><Ltr>CPU</Ltr></td>
            <td>مصرف کل و <Ltr>iowait</Ltr></td>
            <td>بیش از ۷۰٪ پایدار یا اشباع هسته‌ها</td>
          </tr>
        </tbody>
      </table>

      <h2>۵. از متریک به هشدار</h2>
      <p>
        هشدار خوب سه ویژگی دارد: نشانه‌ای را می‌بیند که کاربر نهایی حس می‌کند،
        برای چند دقیقه پایدار است و اقدام مشخصی دارد. این نمونه قوانین{' '}
        <Ltr>Prometheus</Ltr> با <Ltr>JMX Exporter</Ltr> است:
      </p>
      <CodeBlock code={alertRules} language="yaml" filename="kafka-alerts.yml" />
      <p>
        برای هر هشدار یک <Ltr>Runbook</Ltr> کوتاه بنویسید: چه چیزی را ببینیم،
        چه کاری نکنیم و چه زمانی <Ltr>escalate</Ltr> کنیم. هشدار بدون اقدام
        فقط اعتماد تیم را از بین می‌برد.
      </p>
      <Callout variant="tip" title="هشدار روی نشانه، نه روی هر متریک">
        به‌جای هشدار روی هر نوسان <Ltr>BytesInPerSec</Ltr>، روی{' '}
        <Ltr>OfflinePartitionsCount</Ltr>، <Ltr>UnderMinIsrPartitionCount</Ltr>،
        دیسک در حال پر شدن و lag در حال رشد هشدار بدهید. بقیه متریک‌ها برای
        داشبورد و تحلیل کافی‌اند.
      </Callout>

      <h2>۶. چک‌لیست داشبورد</h2>
      <ol>
        <li>یک ردیف برای سلامت خوشه: کنترلر، پارتیشن آفلاین و <Ltr>ISR</Ltr>.</li>
        <li>یک ردیف برای ترافیک: ورود، خروج و تعداد پیام در ثانیه.</li>
        <li>یک ردیف برای تأخیر درخواست‌ها و نرخ خطا.</li>
        <li>یک ردیف برای lag هر گروه مصرف‌کننده مهم با روند زمانی.</li>
        <li>یک ردیف برای دیسک، <Ltr>iowait</Ltr>، <Ltr>GC</Ltr> و شبکه.</li>
        <li>یک لینک به <Ltr>Runbook</Ltr> و مالک هر هشدار.</li>
      </ol>

      <DeepDive title="جزئیات متریک‌ها و ابزارهای پایش">
        <DeepDiveSection title="Gauge، Meter و Histogram">
          <p>
            <Ltr>Gauge</Ltr> مقدار لحظه‌ای است مثل تعداد پارتیشن‌های{' '}
            <Ltr>under-replicated</Ltr>. <Ltr>Meter</Ltr> نرخ رویداد در زمان است مثل تعداد
            پیام در ثانیه. <Ltr>Histogram</Ltr> توزیع می‌دهد و برای تأخیر
            درخواست‌ها استفاده می‌شود. برای هشدار، <Ltr>Gauge</Ltr> و نرخ‌ها
            معمولاً کافی‌اند؛ برای تحلیل عملکرد به صدک‌ها نیاز دارید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="تأخیر درخواست را کجا بشکافیم">
          <p>
            کافکا برای هر درخواست چند بخش زمانی جدا منتشر می‌کند:{' '}
            <Ltr>RequestQueueTimeMs</Ltr>، <Ltr>LocalTimeMs</Ltr>،{' '}
            <Ltr>RemoteTimeMs</Ltr>، <Ltr>ResponseQueueTimeMs</Ltr> و{' '}
            <Ltr>TotalTimeMs</Ltr>. اگر <Ltr>RequestQueueTimeMs</Ltr> بالا باشد،
            بروکر اشباع است. اگر <Ltr>RemoteTimeMs</Ltr> بالا باشد، انتظار برای
            تکرار یا دیسک است. این تفکیک از حدس زدن بهتر است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Time Lag در برابر Offset Lag">
          <p>
            <Ltr>Offset Lag</Ltr> تعداد رکوردهای عقب‌مانده است و به نرخ ورود
            وابسته. <Ltr>Time Lag</Ltr> می‌گوید مصرف‌کننده چند ثانیه از
            تولیدکننده عقب است و برای هشدار کاربرمحور بهتر است. ابزارهایی مثل{' '}
            <Ltr>Burrow</Ltr> و <Ltr>kafka-lag-exporter</Ltr> این را از{' '}
            <Ltr>timestamp</Ltr> رکوردها محاسبه می‌کنند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="JMX را امن منتشر کنید">
          <p>
            پورت <Ltr>JMX</Ltr> دسترسی به داده‌های عملیاتی می‌دهد و نباید روی
            شبکه عمومی باز باشد. یا <Ltr>JMX Exporter</Ltr> را روی همان بروکر
            اجرا کنید و فقط پورت متریک را در شبکه داخلی بدهید، یا{' '}
            <Ltr>JMX</Ltr> را با احراز هویت و <Ltr>SSL</Ltr> تنظیم کنید.
          </p>
          <CodeBlock code={jmxConfig} language="bash" filename="jmx.env" />
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="هشدار روی lag مطلق">
        lag همیشه بالا و پایین می‌رود. هشدار روی عدد ثابت باعث هشدارهای کاذب
        می‌شود. روی روند رشد در بازه زمانی یا <Ltr>Time Lag</Ltr> هشدار بدهید.
      </Callout>
      <Callout variant="warning" title="پایش فقط بروکرها">
        بروکر سالم می‌تواند میزبان مصرف‌کننده‌ای باشد که ساعت‌ها عقب است. سلامت
        برنامه و lag گروه‌های مهم را جدا پایش کنید.
      </Callout>
      <Callout variant="warning" title="نادیده گرفتن روند دیسک">
        دیسک پر معمولاً هفته‌ها طول می‌کشد تا پر شود. اگر فقط آستانه ۹۰٪ را
        ببینید، فرصت برنامه‌ریزی را از دست می‌دهید. نرخ رشد روزانه را هم
        هشدار کنید.
      </Callout>
      <Callout variant="danger" title="JMX باز روی اینترنت">
        پورت <Ltr>JMX</Ltr> بدون احراز هویت، اطلاعات کامل خوشه را لو می‌دهد و
        در برخی تنظیمات امکان اجرای عملیات مدیریتی می‌دهد. آن را محدود کنید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>پایش باید به سلامت، ظرفیت و lag جواب بدهد.</li>
        <li><Ltr>OfflinePartitionsCount</Ltr> و <Ltr>UnderMinIsrPartitionCount</Ltr> هشدار فوری‌اند.</li>
        <li><Ltr>UnderReplicatedPartitions</Ltr> پایدار یعنی یک نسخه همگام نمی‌شود.</li>
        <li><Ltr>Lag</Ltr> را همراه روند و نرخ ورود تفسیر کنید، نه به‌تنهایی.</li>
        <li>خط پایه، شرط زمانی و <Ltr>Runbook</Ltr> کیفیت هشدار را می‌سازند.</li>
        <li>دیسک، <Ltr>GC</Ltr>، شبکه و <Ltr>JMX</Ltr> را هم پایش و محدود کنید.</li>
      </ul>
      <p>
        در درس بعدی از پایش به ظرفیت می‌رسیم: با چه فرمولی دیسک و پهنای باند را
        تخمین بزنیم، چند پارتیشن بسازیم و کدام تنظیمات واقعاً روی عملکرد اثر
        دارند.
      </p>
    </>
  )
}
