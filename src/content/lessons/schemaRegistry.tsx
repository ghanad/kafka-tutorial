import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const avroV1 = `{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "shop.orders",
  "fields": [
    { "name": "orderId", "type": "string" },
    { "name": "total", "type": "long" },
    { "name": "currency", "type": "string", "default": "IRR" }
  ]
}`

const avroV2 = `{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "shop.orders",
  "fields": [
    { "name": "orderId", "type": "string" },
    { "name": "total", "type": "long" },
    { "name": "currency", "type": "string", "default": "IRR" },
    { "name": "couponCode", "type": ["null", "string"], "default": null }
  ]
}`

const producerConfig = `# producer با Avro و Schema Registry
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=io.confluent.kafka.serializers.KafkaAvroSerializer
schema.registry.url=http://schema-registry:8081
auto.register.schemas=true

# consumer متناظر
value.deserializer=io.confluent.kafka.serializers.KafkaAvroDeserializer
specific.avro.reader=true`

const registryCommands = `# ثبت یا تغییر حالت سازگاری برای یک subject
curl -X PUT -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  --data '{"compatibility": "FULL_TRANSITIVE"}' \\
  http://localhost:8081/config/orders-value

# آزمون سازگاری نسخه جدید قبل از انتشار
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  --data @order-created-v2.json \\
  http://localhost:8081/compatibility/subjects/orders-value/versions/latest

# دیدن همه نسخه‌های یک subject
curl http://localhost:8081/subjects/orders-value/versions`

const wireFormat = `# قالب سیم (wire format) هر پیام Avro
[ magic byte = 0 ][ schema id = 4 bytes big-endian ][ Avro binary payload ]

# مثال: schema id = 7
00 00 00 00 07  ...  # بقیه بایت‌ها داده فشرده Avro است`

export function SchemaRegistryContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        کافکا پیام را فقط به‌صورت بایت‌های نامفهوم جابه‌جا می‌کند. قرارداد
        معنای این بایت‌ها بین producer و consumer است. تا وقتی یک تیم کوچک
        هستید، این قرارداد در ذهن همه است؛ اما با اضافه شدن تیم دوم، تغییر نام
        یک فیلد کافی است تا consumer از کار بیفتد. <Ltr>Schema Registry</Ltr>{' '}
        این قرارداد را به یک سرویس مرکزی و قابل بررسی تبدیل می‌کند. در این درس
        می‌بینیم چطور کار می‌کند، سه فرمت رایجش چه تفاوتی دارند و حالت‌های
        سازگاری در عمل چه معنایی می‌دهند.
      </p>

      <Callout variant="info" title="Schema Registry بخشی از خود کافکا نیست">
        این سرویس جدا از brokerها اجرا می‌شود و فقط schemaها را نگه می‌دارد.
        کافکا هیچ‌وقت محتوای پیام را اعتبارسنجی نمی‌کند؛ این producer و consumer
        هستند که با کمک registry آن را می‌فهمند. اگر registry از کار بیفتد،
        خواندن و نوشتن پیام‌های موجود معمولاً ادامه دارد، اما ثبت schema جدید
        ممکن نیست.
      </Callout>

      <h2>۱. مشکل واقعی: قرارداد نانوشته</h2>
      <p>
        فرض کنید producer فیلد <Ltr>total</Ltr> را از عدد صحیح به رشته تغییر
        می‌دهد. هیچ خطایی در کافکا رخ نمی‌دهد؛ پیام‌ها با موفقیت نوشته می‌شوند.
        اما consumer که انتظار عدد دارد، در زمان خواندن خطا می‌دهد یا بدتر،
        مقدار را اشتباه تفسیر می‌کند. مشکل نه در کافکاست و نه در شبکه؛ مشکل این
        است که هیچ‌کس قرارداد را قبل از انتشار بررسی نکرده.
      </p>
      <p>
        سه راه برای حل این مسئله وجود دارد:
      </p>
      <ul>
        <li>
          <strong>مستندات:</strong> ارزان، اما هیچ‌کس آن را در زمان build
          بررسی نمی‌کند.
        </li>
        <li>
          <strong>اعتبارسنجی در کد هر تیم:</strong> کار می‌کند، اما با هر
          consumer جدید تکرار می‌شود.
        </li>
        <li>
          <strong>Schema Registry:</strong> یک نقطه مرکزی که schema را نگه
          می‌دارد، شناسه می‌دهد و تغییر ناسازگار را رد می‌کند.
        </li>
      </ul>

      <h2>۲. Schema Registry چطور کار می‌کند؟</h2>
      <p>
        جریان کار در چهار گام ساده خلاصه می‌شود:
      </p>
      <ol>
        <li>
          producer قبل از فرستادن پیام، schema را به registry می‌دهد.
        </li>
        <li>
          registry بررسی می‌کند آیا این schema با نسخه‌های قبلی همان subject
          سازگار است یا نه.
        </li>
        <li>
          اگر سازگار باشد، یک شناسه عددی (<Ltr>schema id</Ltr>) برمی‌گرداند.
        </li>
        <li>
          producer فقط شناسه را کنار داده می‌گذارد؛ نه کل schema را. consumer
          با همان شناسه، schema را از registry می‌گیرد و داده را می‌خواند.
        </li>
      </ol>
      <p>
        همین تصمیم باعث می‌شود هر پیام به‌جای تکرار متن schema، فقط ۵ بایت
        اضافه داشته باشد:
      </p>
      <CodeBlock code={wireFormat} language="text" filename="wire-format.txt" />
      <p>
        بایت اول همیشه صفر است (magic byte) و چهار بایت بعدی شناسه schema را
        نگه می‌دارند. بقیه پیام، داده واقعی با فرمت فشرده است. به همین دلیل
        consumer باید بداند payload را با کدام deserializer بخواند؛ این اطلاعات
        در خود پیام نیست.
      </p>
      <Callout variant="tip" title="subject چیست؟">
        registry schemaها را زیر یک نام منطقی به نام <Ltr>subject</Ltr> نگه
        می‌دارد. رایج‌ترین قرارداد این است که برای هر تاپیک یک subject برای
        value و یکی برای key بسازید؛ مثلاً <Ltr>orders-value</Ltr> و{' '}
        <Ltr>orders-key</Ltr>. نسخه‌های یک subject کنار هم می‌مانند و سازگاری
        بین آن‌ها سنجیده می‌شود.
      </Callout>

      <h2>۳. سه فرمت رایج</h2>
      <table>
        <thead>
          <tr>
            <th>فرمت</th>
            <th>نقطه قوت</th>
            <th>نکته</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>Avro</Ltr></td>
            <td>فشرده، بالغ و پرکاربرد در اکوسیستم کافکا</td>
            <td>schema جدا از داده است و برای تکامل تدریجی بسیار مناسب است.</td>
          </tr>
          <tr>
            <td><Ltr>Protobuf</Ltr></td>
            <td>کارایی بالا، پشتیبانی چندزبانه و شماره‌گذاری فیلدها</td>
            <td>فیلدها با شماره شناسایی می‌شوند؛ شماره را هرگز تغییر ندهید.</td>
          </tr>
          <tr>
            <td><Ltr>JSON Schema</Ltr></td>
            <td>خوانا برای انسان و سازگار با ابزارهای موجود</td>
            <td>حجم بیشتر و اعتبارسنجی عددی محدودتر از دو گزینه دیگر.</td>
          </tr>
        </tbody>
      </table>
      <p>
        انتخاب فرمت بیشتر به زبان و ابزارهای تیم بستگی دارد، نه به یک برنده
        مطلق. اگر از قبل <Ltr>Avro</Ltr> دارید، تغییر آن معمولاً هزینه‌ای ندارد
        که ارزشش را داشته باشد. اگر تیم <Ltr>gRPC</Ltr> و{' '}
        <Ltr>Protobuf</Ltr> استفاده می‌کند، همان انتخاب طبیعی است.
      </p>

      <h2>۴. حالت‌های سازگاری</h2>
      <p>
        سازگاری یعنی «نسخه جدید schema، داده نوشته‌شده با نسخه قدیمی را می‌فهمد
        یا برعکس؟» چهار حالت اصلی وجود دارد:
      </p>
      <table>
        <thead>
          <tr>
            <th>حالت</th>
            <th>معنی</th>
            <th>مثال سازگار</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>BACKWARD</Ltr></td>
            <td>consumer جدید می‌تواند داده قدیمی را بخواند</td>
            <td>افزودن فیلد اختیاری با مقدار پیش‌فرض</td>
          </tr>
          <tr>
            <td><Ltr>FORWARD</Ltr></td>
            <td>consumer قدیمی می‌تواند داده جدید را بخواند</td>
            <td>افزودن فیلد بدون پیش‌فرض، اگر consumer قدیمی آن را نادیده بگیرد</td>
          </tr>
          <tr>
            <td><Ltr>FULL</Ltr></td>
            <td>هر دو جهت با آخرین نسخه سازگار است</td>
            <td>افزودن فیلد اختیاری با پیش‌فرض</td>
          </tr>
          <tr>
            <td><Ltr>FULL_TRANSITIVE</Ltr></td>
            <td>با همه نسخه‌های قبلی، نه فقط آخرین نسخه، سازگار است</td>
            <td>تغییرات کوچک و افزایشی در طول زمان</td>
          </tr>
        </tbody>
      </table>
      <p>
        حالت پیش‌فرض معمولاً <Ltr>BACKWARD</Ltr> است، چون رایج‌ترین سناریو این
        است که consumerها دیرتر از producerها ارتقا پیدا می‌کنند. اگر چند
        consumer با نسخه‌های مختلف دارید، <Ltr>FULL</Ltr> امن‌تر است. اگر
        نمی‌دانید کدام را انتخاب کنید، <Ltr>FULL_TRANSITIVE</Ltr> سخت‌گیرترین
        گزینه معقول است.
      </p>

      <h2>۵. تکامل schema در عمل</h2>
      <p>
        نسخه اول یک رویداد سفارش را ببینید:
      </p>
      <CodeBlock code={avroV1} language="json" filename="order-created-v1.avsc" />
      <p>
        حالا می‌خواهیم کد تخفیف را اضافه کنیم. اگر فیلد را با مقدار پیش‌فرض{' '}
        <Ltr>null</Ltr> و نوع اختیاری اضافه کنیم، هم consumer جدید داده قدیمی
        را می‌خواند و هم consumer قدیمی داده جدید را نادیده می‌گیرد:
      </p>
      <CodeBlock code={avroV2} language="json" filename="order-created-v2.avsc" />
      <p>
        اما اگر فیلد <Ltr>currency</Ltr> را حذف کنید یا نوع{' '}
        <Ltr>total</Ltr> را از <Ltr>long</Ltr> به <Ltr>string</Ltr> تغییر
        دهید، registry تغییر را رد می‌کند. این رد شدن یک ویژگی است، نه مانع:
        جلوی خرابی consumerها را در زمان انتشار می‌گیرد.
      </p>
      <p>
        تنظیمات و آزمون سازگاری را می‌توانید قبل از انتشار اجرا کنید:
      </p>
      <CodeBlock code={registryCommands} language="bash" filename="schema-registry.sh" />
      <p>
        و در سمت برنامه، فقط deserializer را به registry وصل می‌کنید:
      </p>
      <CodeBlock code={producerConfig} language="properties" filename="producer.properties" />
      <Callout variant="warning" title="auto.register.schemas را در تولید با احتیاط بگذارید">
        اگر این گزینه روشن باشد، هر producer می‌تواند schema جدید ثبت کند.
        برای تیم‌های کوچک راحت است، اما در محیط عملیاتی بهتر است ثبت schema
        بخشی از خط لوله انتشار باشد و producer فقط schema موجود را استفاده کند.
      </Callout>

      <h2>۶. نکات عملی</h2>
      <ul>
        <li>
          <strong>نام‌گذاری subject:</strong> پیش‌فرض{' '}
          <Ltr>TopicNameStrategy</Ltr> است؛ یعنی یک subject برای value هر
          تاپیک. اگر یک تاپیک چند نوع رویداد دارد،{' '}
          <Ltr>RecordNameStrategy</Ltr> منطقی‌تر است.
        </li>
        <li>
          <strong>schema برای key:</strong> کلید هم می‌تواند schema داشته باشد.
          اگر کلید را با <Ltr>Avro</Ltr> سریال می‌کنید، subject جدا برایش بسازید.
        </li>
        <li>
          <strong>حذف نسخه:</strong> حذف schema در محیط تولید تقریباً همیشه
          ایده بدی است؛ پیام‌های قدیمی دیگر قابل خواندن نیستند.
        </li>
        <li>
          <strong>پشتیبان‌گیری:</strong> registry یک سرویس حالت‌دار است. از
          دیتابیس پشتیبان آن و از تاپیک <Ltr>_schemas</Ltr> نسخه پشتیبان
          بگیرید.
        </li>
      </ul>

      <DeepDive title="زیر کاپوت: شناسه schema، references و Protobuf">
        <DeepDiveSection title="شناسه schema سراسری است">
          <p>
            شناسه‌ای که registry برمی‌گرداند در کل registry یکتاست، نه فقط در
            یک subject. اگر دو subject دقیقاً یک schema داشته باشند، ممکن است
            همان شناسه را بگیرند. به همین دلیل consumer می‌تواند فقط با دیدن
            چهار بایت شناسه، schema را پیدا کند، بدون اینکه بداند پیام از کدام
            تاپیک آمده است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="references برای schemaهای ترکیبی">
          <p>
            در <Ltr>Avro</Ltr> و <Ltr>Protobuf</Ltr> می‌توانید schema را به
            چند فایل تقسیم کنید. registry مفهوم <Ltr>reference</Ltr> دارد:
            یک schema می‌تواند به schema دیگری با نام و نسخه مشخص ارجاع دهد.
            هنگام ثبت، همه referenceها باید از قبل موجود باشند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Protobuf: شماره فیلد، نه نام فیلد">
          <p>
            در <Ltr>Protobuf</Ltr> داده با شماره فیلد سریال می‌شود. تغییر نام
            فیلد بی‌خطر است، اما تغییر شماره یا استفاده مجدد از شماره یک فیلد
            حذف‌شده، داده را خراب می‌کند. فیلد حذف‌شده را با{' '}
            <Ltr>reserved</Ltr> علامت بزنید تا کسی دوباره از آن شماره استفاده
            نکند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="اگر registry در دسترس نباشد چه می‌شود؟">
          <p>
            producer و consumer schema را cache می‌کنند. اگر registry چند
            دقیقه از دسترس خارج شود، پیام‌های با schema شناخته‌شده معمولاً
            ادامه پیدا می‌کنند. اما ثبت schema جدید یا خواندن پیامی با شناسه
            ناشناخته شکست می‌خورد. برای همین registry را با چند نمونه و
            پایش در دسترس بودن اجرا کنید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="تغییر نوع فیلد موجود">
        تغییر <Ltr>long</Ltr> به <Ltr>string</Ltr> یا جابه‌جا کردن معنی یک
        فیلد، حتی اگر registry اجازه دهد، برای consumerهای قدیمی فاجعه است.
        فیلد جدید بسازید و فیلد قدیمی را در یک دوره انتقال نگه دارید.
      </Callout>
      <Callout variant="warning" title="حذف فیلد بدون پیش‌فرض">
        حذف فیلدی که consumer قدیمی انتظارش را دارد، پیام‌های جدید را برای او
        ناخوانا می‌کند. اگر مجبور به حذف هستید، اول consumerها را ارتقا دهید و
        بعد producer را تغییر دهید.
      </Callout>
      <Callout variant="warning" title="یک subject برای همه رویدادها">
        اگر ده نوع رویداد مختلف را زیر یک subject بریزید، هر تغییر در یکی از
        آن‌ها سازگاری بقیه را هم تحت تأثیر قرار می‌دهد. برای هر نوع رویداد
        subject جدا تعریف کنید.
      </Callout>
      <Callout variant="info" title="Schema Registry جای اعتبارسنجی کسب‌وکار نیست">
        registry فقط ساختار داده را بررسی می‌کند، نه معنی آن. اینکه{' '}
        <Ltr>total</Ltr> نباید منفی باشد یا <Ltr>orderId</Ltr> باید یکتا باشد،
        همچنان مسئولیت برنامه شماست.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          Schema Registry قرارداد داده را مرکزی می‌کند و تغییر ناسازگار را قبل
          از انتشار رد می‌کند.
        </li>
        <li>
          هر پیام فقط یک شناسه ۵ بایتی به schema اضافه می‌کند، نه کل schema را.
        </li>
        <li>
          <Ltr>Avro</Ltr>، <Ltr>Protobuf</Ltr> و <Ltr>JSON Schema</Ltr> هر سه
          پشتیبانی می‌شوند؛ انتخاب به تیم و ابزارها بستگی دارد.
        </li>
        <li>
          حالت <Ltr>BACKWARD</Ltr> پیش‌فرض معقولی است؛ برای چند consumer با
          نسخه‌های مختلف <Ltr>FULL</Ltr> یا <Ltr>FULL_TRANSITIVE</Ltr> امن‌تر
          است.
        </li>
        <li>
          افزودن فیلد اختیاری با پیش‌فرض امن است؛ تغییر نوع یا حذف فیلد
          نیازمند برنامه مهاجرت است.
        </li>
      </ul>
      <p>
        حالا که داده در کافکا شکل مشخصی دارد، در درس بعدی سراغ{' '}
        <Ltr>Kafka Streams</Ltr> می‌رویم تا همین رویدادها را درون برنامه
        بخوانیم، فیلتر و تجمیع کنیم و بدون خوشه جداگانه، نتیجه را دوباره به
        کافکا برگردانیم.
      </p>
    </>
  )
}
