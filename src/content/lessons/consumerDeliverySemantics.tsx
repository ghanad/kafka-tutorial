import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { DeliverySemanticsExplainer } from '../../components/simulators/DeliverySemanticsExplainer'

const commitBefore = `// at-most-once: اول commit، بعد پردازش
while (running) {
    ConsumerRecords<String, String> records =
        consumer.poll(Duration.ofMillis(500));

    // آفست‌ها همین‌جا جلو می‌روند
    consumer.commitSync();

    // اگر اینجا crash کنیم، رکوردهای این دسته دیگر برنمی‌گردند
    records.forEach(this::process);
}`

const commitAfter = `// at-least-once: اول پردازش، بعد commit
while (running) {
    ConsumerRecords<String, String> records =
        consumer.poll(Duration.ofMillis(500));

    records.forEach(this::process);

    // crash قبل از این خط یعنی پردازش دوبارهٔ همان دسته
    consumer.commitSync();
}`

const exactlyOnce = `producer.initTransactions();

while (running) {
    ConsumerRecords<String, String> records =
        consumer.poll(Duration.ofMillis(500));

    producer.beginTransaction();
    try {
        for (ConsumerRecord<String, String> record : records) {
            producer.send(new ProducerRecord<>(
                "results", record.key(), transform(record.value())));
        }

        // آفست ورودی و خروجی در یک تراکنش
        producer.sendOffsetsToTransaction(
            currentOffsets(records), consumer.groupMetadata());

        producer.commitTransaction();
    } catch (Exception e) {
        producer.abortTransaction();
    }
}`

const eosConfig = `# producer.properties
transactional.id=orders-eos-1
enable.idempotence=true
acks=all
transaction.timeout.ms=60000

# consumer.properties
isolation.level=read_committed
enable.auto.commit=false`

const dedupSql = `-- پردازش idempotent با کلید طبیعی
INSERT INTO processed_orders (order_id, payload)
VALUES (:order_id, :payload)
ON CONFLICT (order_id) DO NOTHING;`

export function ConsumerDeliverySemanticsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس آفست دیدیم که <Ltr>position</Ltr> فقط یک عدد در حافظهٔ مصرف‌کننده
        است و تا وقتی <Ltr>commit</Ltr> نشود، کافکا از آن خبر ندارد. همین یک
        جزئیات، سرنوشت داده را تعیین می‌کند: اگر پروسه بین پردازش و commit از کار
        بیفتد، ممکن است رکوردی دوباره تحویل شود؛ اگر commit جلوتر از پردازش باشد،
        ممکن است رکوردی برای همیشه گم شود. در این درس سه semantic تحویل را کنار
        هم می‌گذاریم، می‌بینیم هر کدام از چه ترتیبی بیرون می‌آید و{' '}
        <Ltr>exactly-once</Ltr> واقعاً چه چیزی را تضمین می‌کند.
      </p>

      <h2>۱. تحویل یعنی چه؟ سه ضمانت متفاوت</h2>
      <p>
        «تحویل» در کافکا به این معنا نیست که پیام روی شبکه رفت؛ یعنی{' '}
        <strong>پردازش</strong> شما با رکورد چه کرد. سه سؤال را جدا کنید:
      </p>
      <ul>
        <li>آیا ممکن است رکوردی هرگز پردازش نشود؟</li>
        <li>آیا ممکن است یک رکورد بیش از یک‌بار پردازش شود؟</li>
        <li>آیا اثر پردازش می‌تواند نیمه‌کاره بماند؟</li>
      </ul>
      <p>پاسخ این سه سؤال، سه semantic اصلی را می‌سازد:</p>
      <table>
        <thead>
          <tr>
            <th>Semantic</th>
            <th>گم شدن</th>
            <th>تکرار</th>
            <th>هزینه</th>
            <th>نمونهٔ کاربرد</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>at-most-once</Ltr>
            </td>
            <td>ممکن است</td>
            <td>هرگز</td>
            <td>کم</td>
            <td>لاگ، متریک و داده‌ای که از دست رفتنش بحرانی نیست</td>
          </tr>
          <tr>
            <td>
              <Ltr>at-least-once</Ltr>
            </td>
            <td>هرگز</td>
            <td>ممکن است</td>
            <td>متوسط</td>
            <td>سفارش، پرداخت و بیشتر جریان‌های کسب‌وکار</td>
          </tr>
          <tr>
            <td>
              <Ltr>exactly-once</Ltr>
            </td>
            <td>هرگز</td>
            <td>هرگز</td>
            <td>بالا</td>
            <td>حسابداری، شمارش موجودی و جریان Kafka به Kafka</td>
          </tr>
        </tbody>
      </table>
      <p>
        هیچ‌کدام «بهتر» مطلق نیستند. <Ltr>at-most-once</Ltr> ارزان و ساده است
        ولی داده را فدا می‌کند؛ <Ltr>exactly-once</Ltr> گران است و دامنهٔ
        تضمینش محدود. انتخاب درست به این بستگی دارد که تکرار یا گم شدن، کدام
        برای کسب‌وکار پرهزینه‌تر است.
      </p>

      <h2>۲. تصمیم واقعی: ترتیب پردازش و commit</h2>
      <p>
        semantic را کافکا انتخاب نمی‌کند؛ <strong>شما</strong> با ترتیب دو کار
        انتخابش می‌کنید: پردازش رکورد و commit آفست. دو ترتیب ساده، دو semantic
        اول را می‌سازد:
      </p>
      <CodeBlock
        code={commitBefore}
        language="java"
        filename="AtMostOnceConsumer.java"
      />
      <p>
        در این حالت آفست قبل از پردازش جلو می‌رود. اگر پروسه وسط دسته بمیرد،
        کافکا فکر می‌کند همه‌چیز تحویل شده و رکوردهای نیمه‌کاره دوباره نمی‌آیند.
        نتیجه <Ltr>at-most-once</Ltr> است: حداکثر یک‌بار.
      </p>
      <CodeBlock
        code={commitAfter}
        language="java"
        filename="AtLeastOnceConsumer.java"
      />
      <p>
        اینجا برعکس است: تا پردازش تمام نشود، آفست commit نمی‌شود. اگر پروسه
        بمیرد، پس از restart از آخرین committed offset می‌خواند و دستهٔ نیمه‌کاره
        دوباره می‌آید. نتیجه <Ltr>at-least-once</Ltr> است: حداقل یک‌بار، شاید
        بیشتر.
      </p>
      <Callout variant="info" title="commit یعنی «پردازش شد»، نه «دریافت شد»">
        <p>
          committed offset یک وعده است: «همهٔ رکوردهای قبل از این عدد را پردازش
          کردم و دیگر لازم نیست بفرستی.» اگر این وعده را قبل از انجام کار بدهید،
          کافکا راهی برای فهمیدن اشتباه شما ندارد.
        </p>
      </Callout>

      <h2>۳. یک crash را در سه حالت ببینید</h2>
      <p>
        در توضیح تعاملی زیر یک پارتیشن با سه رکورد <Ltr>1040</Ltr> تا{' '}
        <Ltr>1042</Ltr> داریم و مصرف‌کننده در میانهٔ کار از کار می‌افتد. با
        زبانه‌های بالای نمودار بین سه semantic جابه‌جا شوید و ببینید کدام رکورد
        گم می‌شود، کدام تکراری می‌شود و در حالت تراکنشی چه چیزی اتمیک می‌ماند.
      </p>

      <DeliverySemanticsExplainer />

      <p>
        به گام آخر <Ltr>at-most-once</Ltr> برگردید: رکورد <Ltr>1042</Ltr> نه
        پردازش شده و نه دوباره می‌آید، چون committed offset از آن عبور کرده بود.
        در <Ltr>at-least-once</Ltr> هیچ رکوردی گم نمی‌شود، اما{' '}
        <Ltr>1040</Ltr> و <Ltr>1041</Ltr> دو بار اثر می‌گذارند. در{' '}
        <Ltr>exactly-once</Ltr> دقت کنید که abort تراکنش هم خروجی معلق را دور
        می‌ریزد و هم آفست را عقب نگه می‌دارد؛ همین دو با هم، تکرار را حذف می‌کند.
      </p>

      <h2>۴. at-least-once: انتخاب پیش‌فرض عملی</h2>
      <p>
        بیشتر سیستم‌های واقعی <Ltr>at-least-once</Ltr> را انتخاب می‌کنند و تکرار
        را در سمت مصرف‌کننده بی‌اثر می‌کنند. دلیلش ساده است: گم کردن سفارش یا
        پرداخت غیرقابل قبول است، ولی پردازش دوبارهٔ یک سفارش را می‌توان با{' '}
        <strong>idempotency</strong> خنثی کرد.
      </p>
      <ul>
        <li>
          <strong>کلید طبیعی و upsert:</strong> نتیجه را با شناسهٔ کسب‌وکار
          بنویسید تا نوشتن دوباره همان ردیف را به‌روز کند، نه اینکه ردیف تازه
          بسازد.
        </li>
        <li>
          <strong>جدول پردازش‌شده‌ها:</strong> شناسهٔ پیام را در همان تراکنش
          دیتابیس ثبت کنید؛ اگر قبلاً ثبت شده بود، کار را رد کنید.
        </li>
        <li>
          <strong>Outbox:</strong> اثر کسب‌وکار و پیام خروجی را در یک تراکنش
          دیتابیس بنویسید و بعداً پیام را منتشر کنید.
        </li>
      </ul>
      <CodeBlock
        code={dedupSql}
        language="sql"
        filename="idempotent-write.sql"
      />
      <p>
        نکتهٔ مهم این است که dedup باید <em>همان تراکنش</em> اثر جانبی باشد. اگر
        اول اثر را بنویسید و بعد شناسه را ثبت کنید، crash بین این دو دقیقاً همان
        تکرار ناخواسته را می‌سازد.
      </p>

      <h2>۵. exactly-once در کافکا چه معنایی دارد؟</h2>
      <p>
        <Ltr>exactly-once</Ltr> واقعی وقتی ممکن است که خروجی هم در کافکا باشد و
        بتوان نوشتن خروجی و commit آفست را در یک تراکنش گذاشت. الگوی استاندارد
        «<Ltr>read-process-write</Ltr>» چنین است:
      </p>
      <CodeBlock
        code={exactlyOnce}
        language="java"
        filename="ExactlyOncePipeline.java"
      />
      <p>
        سه جزء با هم کار می‌کنند: Producer با <Ltr>transactional.id</Ltr>،
        ارسال آفست ورودی با <Ltr>sendOffsetsToTransaction</Ltr> و مصرف‌کنندهٔ
        پایین‌دستی با <Ltr>isolation.level=read_committed</Ltr>. اگر هر کدام را
        جا بیندازید، تضمین کامل نمی‌شود.
      </p>
      <CodeBlock
        code={eosConfig}
        language="properties"
        filename="eos.properties"
      />
      <Callout variant="warning" title="exactly-once جادوی همه‌جا نیست">
        <p>
          تراکنش کافکا فقط نوشتن در تاپیک‌های کافکا و commit آفست را اتمیک
          می‌کند. اگر اثر جانبی شما یک درخواست HTTP، یک ردیف در دیتابیس بیرونی
          یا ارسال ایمیل است، کافکا نمی‌تواند آن را با آفست هم‌تراکنش کند. برای
          آن مسیرها همچنان به idempotency، Outbox یا هماهنگی دو مرحله‌ای نیاز
          دارید.
        </p>
      </Callout>

      <h2>۶. اشتباه‌های رایج</h2>
      <Callout variant="danger" title="enable.auto.commit را جدی نگرفتن">
        <p>
          پیش‌فرض <Ltr>enable.auto.commit=true</Ltr> است و commit در فاصلهٔ
          زمانی مشخص، معمولاً هنگام <Ltr>poll</Ltr> بعدی، انجام می‌شود. یعنی
          ممکن است آفست دستهٔ قبلی قبل از پایان پردازش آن commit شود؛ اگر پروسه
          بمیرد، بخشی از دسته گم می‌شود. برای کنترل واقعی، auto-commit را خاموش
          کنید و بعد از پردازش commit بزنید.
        </p>
      </Callout>
      <Callout variant="danger" title="commit در thread دیگر">
        <p>
          اگر پردازش را به thread دیگری بسپارید و در thread اصلی{' '}
          <Ltr>poll</Ltr> و commit کنید، آفست ممکن است قبل از پایان کار واقعی
          جلو برود. این همان <Ltr>at-most-once</Ltr> ناخواسته است. آفست را فقط
          وقتی commit کنید که پردازش همان دسته تمام شده باشد.
        </p>
      </Callout>
      <Callout variant="warning" title="انتظار exactly-once از یک consumer تنها">
        <p>
          هیچ تنظیمی روی Consumer به‌تنهایی <Ltr>exactly-once</Ltr> نمی‌سازد.
          بدون خروجی تراکنشی، تنها کاری که می‌توانید بکنید انتخاب بین گم شدن و
          تکرار است. <Ltr>exactly-once</Ltr> یک قرارداد سرتاسری است، نه یک پرچم.
        </p>
      </Callout>
      <Callout variant="info" title="تکرار همیشه بد نیست">
        <p>
          اگر مصرف‌کننده‌تان idempotent باشد، <Ltr>at-least-once</Ltr> ساده‌ترین
          و مقاوم‌ترین انتخاب است. به‌جای پیچیدگی تراکنش، همان نتیجهٔ کسب‌وکار را
          با نوشتن قابل تکرار به دست می‌آورید.
        </p>
      </Callout>

      <DeepDive title="درون exactly-once کافکا">
        <DeepDiveSection title="چرا commit آفست باید داخل تراکنش باشد؟">
          <p>
            اگر خروجی را در تراکنش بنویسید ولی آفست را جدا commit کنید، بین این
            دو یک پنجرهٔ خطا باقی می‌ماند: ممکن است خروجی commit شود و آفست نشود
            (پردازش دوباره) یا آفست commit شود و خروجی نشود (دادهٔ گم‌شده).{' '}
            <Ltr>sendOffsetsToTransaction</Ltr> آفست را به همان تراکنش اضافه
            می‌کند تا هر دو با یک تصمیم ثبت یا رد شوند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="read_committed و LSO">
          <p>
            مصرف‌کنندهٔ <Ltr>read_committed</Ltr> فقط رکوردهای تراکنش‌های
            commit‌شده را می‌بیند و رکوردهای تراکنش باز یا abort‌شده را رد
            می‌کند. برای این کار تا <Ltr>Last Stable Offset</Ltr> یا{' '}
            <Ltr>LSO</Ltr> می‌خواند؛ یعنی جایی که همهٔ تراکنش‌های قبل از آن
            تعیین تکلیف شده‌اند. به همین دلیل یک تراکنش طولانی می‌تواند خواندن
            را عقب نگه دارد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="نقش PID و epoch">
          <p>
            Producer تراکنشی همچنان idempotent است: هر Producer یک{' '}
            <Ltr>PID</Ltr> و هر تلاش یک <Ltr>epoch</Ltr> دارد. بروکر با همین دو
            مقدار نوشتن‌های تکراری و Producerهای قدیمی را تشخیص می‌دهد. وقتی{' '}
            <Ltr>transactional.id</Ltr> ثابت باشد، پس از restart همان هویت
            بازیابی می‌شود و تراکنش‌های نیمه‌کاره قابل پاک‌سازی‌اند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="اگر تراکنش timeout شود چه می‌شود؟">
          <p>
            اگر تراکنش تا <Ltr>transaction.timeout.ms</Ltr> بسته نشود، بروکر آن
            را abort می‌کند. Producer بعدی با همان <Ltr>transactional.id</Ltr>{' '}
            می‌تواند ادامه دهد، ولی خروجی‌های معلق قبلی هرگز برای خواننده‌های{' '}
            <Ltr>read_committed</Ltr> ظاهر نمی‌شوند. این رفتار همان چیزی است که
            در گام abort توضیح تعاملی دیدید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          semantic تحویل از ترتیب پردازش و commit بیرون می‌آید، نه از یک تنظیم
          جداگانه.
        </li>
        <li>
          commit قبل از پردازش <Ltr>at-most-once</Ltr> می‌سازد: بدون تکرار، با
          احتمال گم شدن.
        </li>
        <li>
          پردازش قبل از commit <Ltr>at-least-once</Ltr> می‌سازد: بدون گم شدن، با
          احتمال تکرار.
        </li>
        <li>
          <Ltr>exactly-once</Ltr> یعنی خروجی کافکایی و آفست در یک تراکنش؛ برای
          سیستم‌های بیرونی همچنان به idempotency نیاز دارید.
        </li>
        <li>
          در عمل، <Ltr>at-least-once</Ltr> به‌همراه پردازش idempotent معمولاً
          ساده‌ترین انتخاب درست است.
        </li>
      </ul>
      <p>
        حالا می‌دانیم هر semantic چه تضمینی می‌دهد. قدم بعدی این است که ببینیم
        مصرف‌کننده چقدر از تولیدکننده عقب است: <Ltr>Consumer Lag</Ltr> چگونه
        اندازه‌گیری می‌شود و چه زمانی به یک هشدار جدی تبدیل می‌شود.
      </p>
    </>
  )
}
