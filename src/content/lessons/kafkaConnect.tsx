import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { ConnectPipelineExplainer } from '../../components/simulators/ConnectPipelineExplainer'

const workerConfig = `# connect-distributed.properties
bootstrap.servers=kafka-1:9092,kafka-2:9092,kafka-3:9092
group.id=connect-cluster

# Converterها تعیین می‌کنند داده با چه قالبی در کافکا ذخیره شود
key.converter=org.apache.kafka.connect.storage.StringConverter
value.converter=io.confluent.connect.avro.AvroConverter
value.converter.schema.registry.url=http://schema-registry:8081

# سه تاپیک داخلی که وضعیت Connect را نگه می‌دارند
offset.storage.topic=connect-offsets
config.storage.topic=connect-configs
status.storage.topic=connect-status
offset.storage.replication.factor=3
config.storage.replication.factor=3
status.storage.replication.factor=3`

const connectorJson = `{
  "name": "pg-orders-source",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "tasks.max": "1",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "secret",
    "database.dbname": "shop",
    "topic.prefix": "pg",
    "table.include.list": "public.orders",
    "plugin.name": "pgoutput",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "false"
  }
}`

const restCommands = `# ثبت connector با REST API
curl -X POST -H "Content-Type: application/json" \\
  --data @pg-orders-source.json \\
  http://localhost:8083/connectors

# دیدن وضعیت و خطاهای یک connector
curl http://localhost:8083/connectors/pg-orders-source/status

# فهرست connectorها و taskها
curl http://localhost:8083/connectors
curl http://localhost:8083/connectors/pg-orders-source/tasks`

const smtConfig = `{
  "transforms": "route,addSource",
  "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
  "transforms.route.regex": "pg\\\\.public\\\\.(.*)",
  "transforms.route.replacement": "cdc.$1",
  "transforms.addSource.type": "org.apache.kafka.connect.transforms.InsertField$Value",
  "transforms.addSource.static.field": "sourceSystem",
  "transforms.addSource.static.value": "orders-db"
}`

const sinkConfig = `{
  "name": "search-orders-sink",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "tasks.max": "2",
    "topics": "pg.public.orders",
    "connection.url": "http://opensearch:9200",
    "key.ignore": "false",
    "schema.ignore": "true",
    "behavior.on.null.values": "delete",
    "errors.tolerance": "all",
    "errors.deadletterqueue.topic.name": "dlq-search-orders"
  }
}`

export function KafkaConnectContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا برای هر انتقال داده یک برنامه نوشتیم: یک consumer که از کافکا
        می‌خواند و در دیتابیس می‌نویسد، یا یک producer که از دیتابیس می‌خواند و
        در کافکا می‌نویسد. اگر ده سیستم داشته باشید، ده برنامه کوچک و ده بار
        مدیریت خطا لازم است. <Ltr>Kafka Connect</Ltr> دقیقاً همین کار تکراری را
        به یک سرویس استاندارد تبدیل می‌کند: کانکتورهای آماده، مدیریت آفست،
        retry و پایش، بدون نوشتن کد. در این درس می‌بینیم Connect چه کاری انجام
        می‌دهد، از چه اجزایی ساخته شده و یک جریان <Ltr>CDC</Ltr> واقعی را
        گام‌به‌گام دنبال می‌کنیم.
      </p>

      <Callout variant="info" title="Connect جای Kafka Streams نیست">
        Connect داده را <strong>جابه‌جا</strong> می‌کند؛ Streams داده را{' '}
        <strong>پردازش</strong> می‌کند. اگر فقط می‌خواهید جدول دیتابیس را به
        کافکا یا یک ایندکس جست‌وجو منتقل کنید، Connect کافی است. اگر می‌خواهید
        فیلتر، تجمیع، join یا پنجره‌بندی انجام دهید، به Streams یا Flink نیاز
        دارید.
      </Callout>

      <h2>۱. Connect دقیقاً چه کاری انجام می‌دهد؟</h2>
      <p>
        Connect یک فرایند جدا (<Ltr>Worker</Ltr>) است که کانکتورها را اجرا
        می‌کند. هر کانکتور یک جهت دارد:
      </p>
      <ul>
        <li>
          <strong><Ltr>Source Connector</Ltr>:</strong> از یک سیستم بیرونی
          می‌خواند و در کافکا می‌نویسد. مثال: جدول <Ltr>PostgreSQL</Ltr>، فایل
          روی دیسک، <Ltr>REST API</Ltr> یا <Ltr>MongoDB</Ltr>.
        </li>
        <li>
          <strong><Ltr>Sink Connector</Ltr>:</strong> از کافکا می‌خواند و در یک
          سیستم بیرونی می‌نویسد. مثال: <Ltr>Elasticsearch</Ltr>،{' '}
          <Ltr>S3</Ltr>، انبار داده یا یک دیتابیس دیگر.
        </li>
      </ul>
      <p>
        نکته مهم این است که Connect خودش یک consumer و producer معمولی است. آنچه
        اضافه می‌کند، لایه مدیریت است: ذخیره آفست، راه‌اندازی مجدد پس از خطا،
        تقسیم کار بین taskها، اعتبارسنجی تنظیمات و یک <Ltr>REST API</Ltr> برای
        کنترل از راه دور.
      </p>

      <h2>۲. اجزای یک Worker</h2>
      <p>
        برای فهم Connect کافی است پنج مفهوم را از هم جدا کنید:
      </p>
      <ul>
        <li>
          <strong><Ltr>Connector</Ltr>:</strong> تعریف «چه چیزی به کجا برود».
          یک فایل JSON از تنظیمات است، نه کد.
        </li>
        <li>
          <strong><Ltr>Task</Ltr>:</strong> واحد واقعی کار. کانکتور یک یا چند
          task می‌سازد و هر task بخشی از داده را جابه‌جا می‌کند. برای source،
          تعداد taskها معمولاً به تعداد جدول‌ها یا پارتیشن‌های منبع بستگی دارد.
        </li>
        <li>
          <strong><Ltr>Converter</Ltr>:</strong> تعیین می‌کند داده روی کافکا با
          چه قالبی سریال شود: <Ltr>JSON</Ltr>، <Ltr>Avro</Ltr>،{' '}
          <Ltr>Protobuf</Ltr> یا متن ساده.
        </li>
        <li>
          <strong><Ltr>SMT</Ltr>:</strong> تبدیل ساده و بی‌حالت روی هر رکورد؛
          مثل تغییر نام تاپیک، حذف یک فیلد یا باز کردن پاکت CDC.
        </li>
        <li>
          <strong>تاپیک‌های داخلی:</strong> سه تاپیک{' '}
          <Ltr>connect-offsets</Ltr>، <Ltr>connect-configs</Ltr> و{' '}
          <Ltr>connect-status</Ltr> که وضعیت خوشه Connect را نگه می‌دارند.
        </li>
      </ul>
      <Callout variant="tip" title="تاپیک‌های داخلی را دستی نسازید">
        Connect در حالت distributed این سه تاپیک را خودش می‌سازد. اگر از قبل
        ساخته باشید، حداقل ضریب تکرار و تعداد پارتیشن را درست بگذارید؛ در غیر
        این صورت با تغییر تعداد worker یا از کار افتادن broker، وضعیت Connect از
        دست می‌رود.
      </Callout>

      <h2>۳. یک نمونه واقعی: CDC با Debezium</h2>
      <p>
        <Ltr>CDC</Ltr> یا <Ltr>Change Data Capture</Ltr> یعنی خواندن تغییرات
        دیتابیس از لاگ تراکنش آن، نه با کوئری دوره‌ای. <Ltr>Debezium</Ltr> این
        کار را برای <Ltr>PostgreSQL</Ltr> با مکانیزم{' '}
        <Ltr>logical replication</Ltr> انجام می‌دهد. مزیتش این است که هر
        <Ltr>INSERT</Ltr>، <Ltr>UPDATE</Ltr> و <Ltr>DELETE</Ltr> را با ترتیب
        واقعی می‌بیند و بار اضافه‌ای روی جدول اصلی نمی‌گذارد.
      </p>
      <p>
        اول فایل تنظیمات worker را می‌سازیم. این فایل می‌گوید Connect به کدام
        خوشه وصل شود و وضعیتش را کجا ذخیره کند:
      </p>
      <CodeBlock code={workerConfig} language="properties" filename="connect-distributed.properties" />
      <p>
        بعد کانکتور را با یک فایل JSON ثبت می‌کنیم. این فایل هیچ کد Java ندارد؛
        فقط نام کلاس کانکتور و تنظیمات اتصال است:
      </p>
      <CodeBlock code={connectorJson} language="json" filename="pg-orders-source.json" />
      <p>
        با یک درخواست <Ltr>POST</Ltr> کانکتور روی خوشه ثبت می‌شود و از همان لحظه
        کار می‌کند:
      </p>
      <CodeBlock code={restCommands} language="bash" filename="register-connector.sh" />
      <p>
        Debezium برای هر جدول یک تاپیک می‌سازد؛ در این مثال تاپیک{' '}
        <Ltr>pg.public.orders</Ltr>. نام تاپیک از <Ltr>topic.prefix</Ltr> و نام
        schema و جدول ساخته می‌شود. هر رکورد به‌طور پیش‌فرض یک پاکت دارد که
        <Ltr>before</Ltr>، <Ltr>after</Ltr>، <Ltr>op</Ltr> و متادیتای تغییر را
        در خود دارد.
      </p>

      <h2>۴. مسیر یک تغییر، گام‌به‌گام</h2>
      <p>
        در توضیح تعاملی زیر، سه ردیف جدول <Ltr>orders</Ltr> را به یک تاپیک
        کافکا و سپس به یک ایندکس جست‌وجو می‌فرستیم. دقت کنید که SMT کجاست،
        آفست تاپیک با آفست connector یکی نیست و sink چطور پیشرفت خودش را نگه
        می‌دارد.
      </p>
      <ConnectPipelineExplainer />
      <p>
        در گام ششم، رکورد <Ltr>UPDATE</Ltr> هم <Ltr>before</Ltr> و هم{' '}
        <Ltr>after</Ltr> دارد. اگر SMT را برندارید، مصرف‌کننده باید خودش پاکت را
        باز کند. در گام نهم، sink از آفست <Ltr>2</Ltr> می‌خواند؛ این آفست در
        گروه مصرف‌کننده خود sink ذخیره می‌شود، نه در آفست source connector.
      </p>

      <h2>۵. Standalone یا Distributed</h2>
      <p>
        Connect دو حالت اجرا دارد. انتخاب اشتباه، اولین دام رایج در محیط عملیاتی
        است:
      </p>
      <table>
        <thead>
          <tr>
            <th>ویژگی</th>
            <th><Ltr>Standalone</Ltr></th>
            <th><Ltr>Distributed</Ltr></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ذخیره آفست و تنظیمات</td>
            <td>فایل محلی روی همان ماشین</td>
            <td>تاپیک‌های داخلی کافکا</td>
          </tr>
          <tr>
            <td>تعداد worker</td>
            <td>یکی</td>
            <td>چند worker در یک گروه</td>
          </tr>
          <tr>
            <td>تحمل خطا</td>
            <td>ندارد؛ با مرگ فرایند کار می‌ایستد</td>
            <td>taskها بین workerها جابه‌جا می‌شوند</td>
          </tr>
          <tr>
            <td>تغییر تنظیمات</td>
            <td>ویرایش فایل و راه‌اندازی مجدد</td>
            <td>از طریق <Ltr>REST API</Ltr> و بدون قطعی</td>
          </tr>
          <tr>
            <td>کاربرد</td>
            <td>آزمایش، توسعه، jobهای یک‌بارمصرف</td>
            <td>تولید و هر چیزی که باید بادوام باشد</td>
          </tr>
        </tbody>
      </table>
      <p>
        برای تولید تقریباً همیشه <Ltr>Distributed</Ltr> را انتخاب کنید. حتی اگر
        امروز یک worker کافی است، ذخیره وضعیت در کافکا و امکان اضافه‌کردن worker
        دوم بدون تغییر معماری، ارزشش را دارد.
      </p>

      <h2>۶. Converter و SMT: تفاوت را جدی بگیرید</h2>
      <p>
        <strong><Ltr>Converter</Ltr></strong> مسئول قالب داده روی کافکاست و روی
        کل رکورد اثر می‌گذارد. <strong><Ltr>SMT</Ltr></strong> یک تبدیل سبک و
        بی‌حالت روی هر رکورد است. SMT نمی‌تواند حالت نگه دارد، به رکوردهای قبلی
        نگاه کند یا تجمیع انجام دهد. نمونه‌های رایج:
      </p>
      <CodeBlock code={smtConfig} language="json" filename="smt-example.json" />
      <p>
        در کد بالا، <Ltr>RegexRouter</Ltr> نام تاپیک را تغییر می‌دهد و{' '}
        <Ltr>InsertField</Ltr> یک فیلد ثابت اضافه می‌کند. هر دو برای هر رکورد
        مستقل اجرا می‌شوند. اگر منطق شما به مقدار قبلی یک Key نیاز دارد، جای SMT
        نیست؛ باید از <Ltr>Kafka Streams</Ltr> استفاده کنید.
      </p>
      <Callout variant="warning" title="Converter ناهماهنگ، داده را ناخوانا می‌کند">
        اگر producer با <Ltr>Avro</Ltr> می‌نویسد و consumer را با{' '}
        <Ltr>JsonConverter</Ltr> می‌خوانید، داده خراب نمی‌شود اما قابل تفسیر
        نیست. قالب را در کل خط لوله یکسان نگه دارید و برای تغییر آن، مهاجرت
        برنامه‌ریزی‌شده داشته باشید.
      </Callout>

      <h2>۷. خطا، تکرار و تحویل</h2>
      <p>
        Connect به‌طور پیش‌فرض وقتی یک رکورد را نتواند پردازش کند، متوقف می‌شود
        تا داده گم نشود. این رفتار امن است، اما یک رکورد خراب می‌تواند کل
        کانکتور را بخواباند. دو تنظیم مهم برای کنترل این وضعیت وجود دارد:
      </p>
      <ul>
        <li>
          <strong><Ltr>errors.tolerance</Ltr>:</strong> با مقدار{' '}
          <Ltr>all</Ltr>، رکورد خطادار رد می‌شود و کار ادامه پیدا می‌کند.
        </li>
        <li>
          <strong><Ltr>errors.deadletterqueue.topic.name</Ltr>:</strong> رکورد
          خطادار به یک <Ltr>DLQ</Ltr> می‌رود تا بعداً بررسی شود.
        </li>
      </ul>
      <CodeBlock code={sinkConfig} language="json" filename="search-orders-sink.json" />
      <p>
        در این نمونه، <Ltr>behavior.on.null.values</Ltr> باعث می‌شود رکورد{' '}
        <Ltr>tombstone</Ltr> به حذف سند در ایندکس تبدیل شود. این همان چیزی است
        که یک <Ltr>DELETE</Ltr> در دیتابیس منبع را به مقصد منتقل می‌کند.
      </p>
      <Callout variant="danger" title="errors.tolerance=all بدون DLQ یعنی گم‌شدن بی‌صدا">
        اگر خطاها را نادیده بگیرید و DLQ نداشته باشید، رکوردهای شکست‌خورده برای
        همیشه از بین می‌روند. همیشه یا DLQ بسازید یا خطا را متوقف‌کننده نگه
        دارید تا کسی ببیند.
      </Callout>

      <DeepDive title="زیر کاپوت: آفست، rebalance و تحویل دقیقاً یک‌بار">
        <DeepDiveSection title="آفست هر connector کجا ذخیره می‌شود؟">
          <p>
            Source connector موقعیت خودش را در سیستم منبع نگه می‌دارد؛ مثلاً
            <Ltr>LSN</Ltr> در <Ltr>PostgreSQL</Ltr> یا موقعیت binlog در{' '}
            <Ltr>MySQL</Ltr>. همین موقعیت در تاپیک{' '}
            <Ltr>connect-offsets</Ltr> هم ذخیره می‌شود تا بعد از راه‌اندازی
            مجدد از همان‌جا ادامه دهد. Sink connector مثل هر consumer دیگری
            آفست کافکا را در گروه مصرف‌کننده خودش commit می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا taskها جابه‌جا می‌شوند؟">
          <p>
            workerها با یک <Ltr>group.id</Ltr> مشترک به هم می‌چسبند. وقتی worker
            جدیدی اضافه یا حذف می‌شود، یک rebalance رخ می‌دهد و taskها بین
            workerهای زنده تقسیم می‌شوند. این شبیه consumer group است، با این
            تفاوت که واحد جابه‌جایی task است نه پارتیشن. برای همین تعداد taskها
            سقف موازی‌سازی شماست؛ اگر <Ltr>tasks.max=1</Ltr> باشد، ده worker هم
            کمکی نمی‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Exactly-once در Connect">
          <p>
            بعضی source connectorها با پشتیبانی از تراکنش کافکا می‌توانند
            <Ltr>exactly-once</Ltr> بنویسند؛ یعنی آفست منبع و رکورد کافکا در یک
            تراکنش ثبت می‌شوند. برای sink، تحویل دقیقاً یک‌بار به خود سیستم مقصد
            بستگی دارد: اگر مقصد idempotent باشد (مثل نوشتن با شناسه ثابت در
            <Ltr>Elasticsearch</Ltr> یا <Ltr>UPSERT</Ltr> در دیتابیس)، تکرار
            بی‌خطر است. Connect به‌تنهایی نمی‌تواند مقصدی را که idempotent نیست
            دقیقاً یک‌بار کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Snapshot تدریجی و بار روی دیتابیس">
          <p>
            اگر جدول بزرگ باشد، snapshot اولیه می‌تواند ساعت‌ها طول بکشد و
            دیتابیس را تحت فشار بگذارد. Debezium حالت{' '}
            <Ltr>incremental snapshot</Ltr> دارد که جدول را در چند تکه و با
            کنترل اندازه دسته می‌خواند و در همان حال تغییرات زنده را هم دنبال
            می‌کند. برای جدول‌های بزرگ، این حالت را به snapshot یک‌باره ترجیح
            دهید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="نوشتن کد برای کاری که کانکتور آماده دارد">
        برای انتقال جدول به <Ltr>Elasticsearch</Ltr> یا <Ltr>S3</Ltr> لازم نیست
        یک consumer اختصاصی بنویسید. کانکتور آماده، مدیریت آفست و retry را
        مجانی می‌دهد و کد کمتری برای نگهداری باقی می‌گذارد.
      </Callout>
      <Callout variant="warning" title="انتظار پردازش از SMT">
        SMT برای تغییر نام، حذف فیلد و باز کردن پاکت است. اگر به تجمیع، join یا
        نگاه به رکوردهای قبلی نیاز دارید، SMT جای درستی نیست.
      </Callout>
      <Callout variant="warning" title="standalone در تولید">
        ذخیره آفست در فایل محلی یعنی با جابه‌جایی کانتینر یا مرگ ماشین، پیشرفت
        از دست می‌رود. در تولید از distributed و تاپیک‌های داخلی با ضریب تکرار
        حداقل سه استفاده کنید.
      </Callout>
      <Callout variant="info" title="تعداد task را از ابتدا درست انتخاب کنید">
        افزایش بعدی <Ltr>tasks.max</Ltr> یک rebalance ایجاد می‌کند و ممکن است
        کانکتور را لحظه‌ای متوقف کند. اگر انتظار رشد دارید، از ابتدا چند task
        بگذارید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          Connect داده را بین کافکا و سیستم‌های بیرونی جابه‌جا می‌کند؛ source
          می‌نویسد و sink می‌خواند.
        </li>
        <li>
          Connector تعریف است، task واحد کار، converter قالب داده و SMT تبدیل
          سبک هر رکورد.
        </li>
        <li>
          برای تولید از حالت distributed استفاده کنید تا آفست و تنظیمات در
          تاپیک‌های داخلی کافکا بماند.
        </li>
        <li>
          <Ltr>Debezium</Ltr> تغییرات دیتابیس را با CDC به کافکا می‌آورد و
          پاکت <Ltr>before/after</Ltr> را تحویل می‌دهد.
        </li>
        <li>
          خطا را بی‌صدا نادیده نگیرید؛ یا متوقف شوید یا DLQ داشته باشید.
        </li>
      </ul>
      <p>
        در درس بعدی سراغ <Ltr>Schema Registry</Ltr> می‌رویم؛ همان چیزی که
        تعیین می‌کند داده‌ای که Connect و producerها می‌نویسند، برای
        مصرف‌کننده‌های بعدی هنوز قابل خواندن باشد یا نه.
      </p>
    </>
  )
}
