import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { OutboxPatternExplainer } from '../../components/simulators/OutboxPatternExplainer'

const outboxSql = `BEGIN;

INSERT INTO orders (id, customer_id, status, total)
VALUES ('order-1042', 'customer-101', 'created', 240000);

INSERT INTO outbox (id, aggregate_id, event_type, payload)
VALUES (
  gen_random_uuid(),
  'order-1042',
  'OrderCreated',
  '{"orderId":"order-1042","customerId":"customer-101","total":240000}'
);

COMMIT;`

const relayPseudo = `// poll unpublished rows every few hundred ms
List<OutboxRow> rows = outboxRepo.findUnpublished(100);

for (OutboxRow row : rows) {
  producer.send(new ProducerRecord<>(row.topic(), row.key(), row.payload()));
  outboxRepo.markPublished(row.id());
}`

const retryTopics = `orders.events        # main topic
orders.retry.1m      # retry after 1 minute
orders.retry.5m      # retry after 5 minutes
orders.retry.30m     # retry after 30 minutes
orders.dlq           # messages that exhausted all retries`

export function ArchitecturePatternsContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا ابزارها را شناختیم: چگونه بنویسیم، چگونه بخوانیم، چگونه دوام را
        حفظ کنیم. اما در پروژه واقعی، پرسش اصلی این است که این قطعات را چگونه
        کنار هم بچینیم تا سیستم قابل‌اعتماد و قابل‌تغییر بماند. این درس پنج الگوی
        پرکاربرد را مرور می‌کند: <Ltr>Event Sourcing</Ltr>، <Ltr>CQRS</Ltr>،{' '}
        <Ltr>Outbox</Ltr>، <Ltr>Saga</Ltr> و تاپیک‌های <Ltr>Retry</Ltr> و{' '}
        <Ltr>DLQ</Ltr>. هیچ‌کدام کتابخانه نیستند؛ الگوهای طراحی‌اند و کافکا فقط
        بستر اجرایشان را فراهم می‌کند.
      </p>

      <Callout variant="info" title="الگو را با مسئله انتخاب کنید، نه با مد روز">
        هر پنج الگو در یک سیستم لازم نیستند. <Ltr>Event Sourcing</Ltr> برای
        دامنه‌هایی است که تاریخچه رویدادها ارزش کسب‌وکاری دارد؛ <Ltr>Outbox</Ltr>{' '}
        فقط وقتی لازم است که هم‌زمان در دیتابیس و کافکا می‌نویسید. اگر مسئله‌ای
        ندارید که الگو حلش کند، اضافه‌کردنش فقط پیچیدگی می‌آورد.
      </Callout>

      <h2>۱. Event Sourcing: رویدادها منبع حقیقت‌اند</h2>
      <p>
        در مدل معمول، وضعیت فعلی را نگه می‌داریم: یک ردیف سفارش با وضعیت{' '}
        <Ltr>paid</Ltr>. در <Ltr>Event Sourcing</Ltr> وضعیت را ذخیره نمی‌کنیم؛
        فقط رویدادهایی را ذخیره می‌کنیم که به آن وضعیت رسیده‌اند. وضعیت فعلی،
        حاصل بازپخش (<Ltr>replay</Ltr>) همین رویدادهاست. کافکا با لاگ
        فقط‌افزودنی و <Ltr>Offset</Ltr>، بستر طبیعی این کار است.
      </p>
      <CodeBlock
        language="text"
        filename="event stream · order-1042"
        code={`offset 0  OrderCreated     order-1042  total=240000
offset 1  InventoryReserved order-1042  sku=SKU-77
offset 2  PaymentCaptured  order-1042  amount=240000
offset 3  OrderShipped     order-1042  tracking=TRK-991`}
      />
      <p>
        برای ساختن وضعیت فعلی، از ابتدا یا از یک <Ltr>snapshot</Ltr> ذخیره‌شده
        رویدادها را اعمال می‌کنیم. مزیت بزرگ این است که «چرا» به این وضعیت
        رسیدیم همیشه در دسترس است؛ می‌توانید گزارش‌های جدید بسازید، باگ گذشته را
        بازسازی کنید یا یک سرویس تازه را از تاریخچه پر کنید.
      </p>
      <table>
        <thead>
          <tr>
            <th>پرسش</th>
            <th>مدل وضعیت‌محور</th>
            <th><Ltr>Event Sourcing</Ltr></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>چه چیزی ذخیره می‌شود؟</td>
            <td>آخرین وضعیت هر موجودیت</td>
            <td>همه رویدادهای تغییر</td>
          </tr>
          <tr>
            <td>تاریخچه</td>
            <td>معمولاً از دست می‌رود</td>
            <td>کامل و قابل بازپخش</td>
          </tr>
          <tr>
            <td>تغییر شکل داده</td>
            <td>مهاجرت جدول</td>
            <td>نسخه‌بندی رویداد و ساخت تصویر جدید</td>
          </tr>
          <tr>
            <td>پیچیدگی</td>
            <td>کمتر</td>
            <td>بیشتر؛ نیاز به snapshot و نسخه‌بندی</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="warning" title="Event Sourcing برای هر دامنه‌ای مناسب نیست">
        اگر داده‌ای باید حذف شود (مثلاً درخواست پاک‌کردن اطلاعات کاربر)، در
        لاگ فقط‌افزودنی باید با رویداد جبرانی یا رمزنگاری فیلد کار کنید. همچنین
        تغییر ساختار رویدادهای قدیمی بدون نسخه‌بندی، بازپخش را می‌شکند. اگر فقط
        به تاریخچه نیاز دارید، شاید یک جدول audit ساده کافی باشد.
      </Callout>

      <h2>۲. CQRS: نوشتن و خواندن را جدا کنید</h2>
      <p>
        <Ltr>CQRS</Ltr> مخفف <Ltr>Command Query Responsibility Segregation</Ltr>{' '}
        است: مدل نوشتن و مدل خواندن جدا می‌شوند. سمت نوشتن رویداد را در کافکا
        منتشر می‌کند و سمت خواندن با مصرف همان رویدادها، نمای بهینه‌شده خودش را
        می‌سازد. این نما می‌تواند یک جدول <Ltr>PostgreSQL</Ltr>، یک ایندکس{' '}
        <Ltr>Elasticsearch</Ltr> یا حتی یک کش باشد.
      </p>
      <p>
        نتیجه، سازگاری نهایی (<Ltr>eventual consistency</Ltr>) است: ممکن است چند
        میلی‌ثانیه تا چند ثانیه طول بکشد تا نما به‌روز شود. در عوض هر سمت
        می‌تواند مستقل مقیاس بگیرد و کوئری‌های سنگین، مسیر نوشتن را کند نمی‌کنند.
      </p>
      <table>
        <thead>
          <tr>
            <th>جنبه</th>
            <th>مدل نوشتن</th>
            <th>مدل خواندن</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>هدف</td>
            <td>اعتبارسنجی و ثبت تغییر</td>
            <td>پاسخ سریع به پرسش‌ها</td>
          </tr>
          <tr>
            <td>ساختار</td>
            <td>نرمال‌شده و دقیق</td>
            <td>غیرنرمال و متناسب با صفحه</td>
          </tr>
          <tr>
            <td>مقیاس</td>
            <td>عمودی یا پارتیشن‌بندی‌شده</td>
            <td>افقی، چند نسخه و کش</td>
          </tr>
          <tr>
            <td>سازگاری</td>
            <td>قوی</td>
            <td>نهایی</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip" title="CQRS لازمه Event Sourcing نیست">
        می‌توانید <Ltr>CQRS</Ltr> را با یک دیتابیس معمولی هم پیاده کنید و
        می‌توانید <Ltr>Event Sourcing</Ltr> داشته باشید بدون جدا کردن مدل خواندن.
        این دو اغلب با هم می‌آیند، اما دو تصمیم مستقل‌اند.
      </Callout>

      <h2>۳. Outbox: پایان نوشتن دوگانه</h2>
      <p>
        رایج‌ترین باگ در سیستم‌های رویدادمحور «نوشتن دوگانه» است. سرویس سفارش
        هم‌زمان در دیتابیس می‌نویسد و رویداد را به کافکا می‌فرستد. اگر دیتابیس
        موفق و ارسال ناموفق باشد، رویداد گم می‌شود؛ اگر ارسال موفق و{' '}
        <Ltr>COMMIT</Ltr> ناموفق باشد، رویدادی منتشر می‌شود که هیچ سفارشی پشتش
        نیست. هیچ‌کدام از این دو حالت قابل قبول نیست.
      </p>
      <p>
        راه‌حل <Ltr>Outbox</Ltr> است: رویداد را در همان تراکنش دیتابیس، در یک
        جدول <Ltr>outbox</Ltr> بنویسید. سپس یک فرایند جدا ردیف‌های منتشرنشده را
        می‌خواند و به کافکا می‌فرستد. حالا یا هر دو نوشته پایدار می‌شوند یا هیچ‌کدام.
      </p>
      <CodeBlock language="sql" filename="transactional outbox" code={outboxSql} />
      <p>
        در توضیح تعاملی زیر، همین مسیر را گام‌به‌گام می‌بینیم: از باز شدن
        تراکنش و نوشتن دو ردیف، تا <Ltr>COMMIT</Ltr>، انتشار توسط relay و
        به‌روزرسانی مدل خواندنی.
      </p>
      <OutboxPatternExplainer />
      <CodeBlock language="java" filename="relay · poller" code={relayPseudo} />
      <p>
        دو پیاده‌سازی رایج برای relay وجود دارد. یکی <Ltr>poller</Ltr> است که
        خودتان می‌نویسید؛ ساده است اما یک تأخیر کوچک و بار اضافه روی دیتابیس
        دارد. دیگری <Ltr>CDC</Ltr> با <Ltr>Debezium</Ltr> است که تغییرات{' '}
        <Ltr>WAL</Ltr> دیتابیس را می‌خواند و بدون کوئری دوره‌ای رویداد را منتشر
        می‌کند.
      </p>
      <Callout variant="warning" title="Outbox تحویل at-least-once می‌دهد">
        اگر relay بعد از ارسال و قبل از علامت‌گذاری ردیف از کار بیفتد، همان
        رویداد دوباره فرستاده می‌شود. پس مصرف‌کننده باید <Ltr>idempotent</Ltr>{' '}
        باشد؛ مثلاً با <Ltr>upsert</Ltr> بر اساس شناسه رویداد.
      </Callout>

      <h2>۴. Saga: تراکنش توزیع‌شده بدون قفل طولانی</h2>
      <p>
        وقتی یک عملیات کسب‌وکار چند سرویس را درگیر می‌کند (سفارش، موجودی، پرداخت،
        ارسال)، نمی‌توانیم یک تراکنش دیتابیسی روی همه آن‌ها داشته باشیم.{' '}
        <Ltr>Saga</Ltr> این عملیات را به مجموعه‌ای از گام‌های محلی می‌شکند که
        هر کدام رویدادی منتشر می‌کند و در صورت شکست، با یک عمل جبرانی{' '}
        (<Ltr>compensating action</Ltr>) اثر گام‌های قبلی را برمی‌گرداند.
      </p>
      <table>
        <thead>
          <tr>
            <th>گام</th>
            <th>رویداد منتشرشده</th>
            <th>اقدام بعدی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ثبت سفارش</td>
            <td><Ltr>OrderCreated</Ltr></td>
            <td>رزرو موجودی</td>
          </tr>
          <tr>
            <td>رزرو موجودی</td>
            <td><Ltr>InventoryReserved</Ltr></td>
            <td>برداشت وجه</td>
          </tr>
          <tr>
            <td>برداشت وجه</td>
            <td><Ltr>PaymentCaptured</Ltr></td>
            <td>تایید سفارش</td>
          </tr>
          <tr>
            <td>شکست پرداخت</td>
            <td><Ltr>PaymentFailed</Ltr></td>
            <td>آزادسازی موجودی (جبران)</td>
          </tr>
          <tr>
            <td>شکست موجودی</td>
            <td><Ltr>InventoryFailed</Ltr></td>
            <td>لغو سفارش (جبران)</td>
          </tr>
        </tbody>
      </table>
      <p>
        دو سبک پیاده‌سازی دارد. در <strong>رقص</strong> (<Ltr>choreography</Ltr>)
        هر سرویس به رویداد سرویس قبلی گوش می‌دهد و تصمیم می‌گیرد؛ کد ساده‌تر است
        اما جریان کلی در چند سرویس پخش می‌شود. در <strong>ارکستراسیون</strong>{' '}
        (<Ltr>orchestration</Ltr>) یک هماهنگ‌کننده مراحل را صدا می‌زند؛ جریان
        یک‌جا دیده می‌شود اما یک نقطه مرکزی و حالت اضافه به وجود می‌آید.
      </p>
      <table>
        <thead>
          <tr>
            <th>معیار</th>
            <th>رقص (Choreography)</th>
            <th>ارکستراسیون (Orchestration)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>دید کلی جریان</td>
            <td>پخش‌شده بین سرویس‌ها</td>
            <td>یک‌جا در هماهنگ‌کننده</td>
          </tr>
          <tr>
            <td>وابستگی</td>
            <td>سرویس‌ها فقط رویداد می‌شناسند</td>
            <td>هماهنگ‌کننده همه سرویس‌ها را می‌شناسد</td>
          </tr>
          <tr>
            <td>مناسب برای</td>
            <td>جریان‌های کوتاه و ساده</td>
            <td>جریان‌های بلند و پرشرط</td>
          </tr>
          <tr>
            <td>نقطه شکست</td>
            <td>پیدا کردن گام گیرکرده سخت‌تر</td>
            <td>هماهنگ‌کننده باید پایدار و پایش‌شده باشد</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="danger" title="Saga جایگزین تراکنش اتمیک نیست">
        <Ltr>Saga</Ltr> سازگاری نهایی می‌دهد، نه اتمیک کامل. بین گام‌ها حالت
        میانی وجود دارد و کاربر ممکن است چند لحظه سفارش «در حال پردازش» ببیند.
        طراحی رابط کاربری و ماشین حالت باید همین را در نظر بگیرد.
      </Callout>

      <h2>۵. Retry Topic و Dead Letter Queue</h2>
      <p>
        وقتی پردازش یک پیام شکست می‌خورد، نباید حلقه بی‌پایان بسازیم و نباید
        پیام را دور بریزیم. الگوی رایج، استفاده از تاپیک‌های تلاش دوباره با
        تأخیر پله‌ای است و در نهایت یک <Ltr>DLQ</Ltr> برای پیام‌هایی که همه
        تلاش‌ها را رد کرده‌اند.
      </p>
      <CodeBlock language="text" filename="retry topology" code={retryTopics} />
      <p>
        مصرف‌کننده اصلی در صورت خطا، پیام را به <Ltr>orders.retry.1m</Ltr>{' '}
        می‌فرستد. مصرف‌کننده آن تاپیک منتظر می‌ماند و دوباره تلاش می‌کند؛ اگر
        باز هم شکست خورد، به مرحله بعد می‌رود. پیام‌های <Ltr>DLQ</Ltr> باید
        پایش شوند و یک مسیر بازپخش دستی داشته باشند، وگرنه به گورستان داده تبدیل
        می‌شوند.
      </p>
      <Callout variant="warning" title="ترتیب را در Retry Topic جدی بگیرید">
        اگر ترتیب پیام‌های یک <Ltr>Key</Ltr> مهم است، انتقال به تاپیک{' '}
        <Ltr>Retry</Ltr> می‌تواند آن را بشکند؛ چون پیام‌های بعدی ممکن است زودتر
        پردازش شوند. برای چنین کلیدهایی، توقف پارتیشن یا مسیر اختصاصی را در نظر
        بگیرید.
      </Callout>

      <DeepDive title="زیر کاپوت: جزئیاتی که در عمل به کار می‌آیند">
        <DeepDiveSection title="Snapshot در Event Sourcing">
          <p>
            بازپخش هزاران رویداد برای هر درخواست، گران است. راه‌حل، ذخیره دوره‌ای
            یک <Ltr>snapshot</Ltr> از وضعیت در یک تاپیک فشرده‌شده یا یک فروشگاه
            کلید-مقدار است. برای ساختن وضعیت، آخرین snapshot را می‌خوانید و فقط
            رویدادهای بعد از آن را اعمال می‌کنید.
          </p>
          <p>
            نسخه‌بندی رویدادها هم حیاتی است. اگر ساختار <Ltr>OrderCreated</Ltr>{' '}
            تغییر کند، رویدادهای قدیمی باید همچنان قابل خواندن باشند. یا فیلدهای
            جدید را اختیاری نگه دارید، یا از <Ltr>Schema Registry</Ltr> با حالت
            سازگاری مناسب استفاده کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Outbox با CDC در برابر Poller">
          <p>
            <Ltr>Debezium</Ltr> تغییرات جدول <Ltr>outbox</Ltr> را از{' '}
            <Ltr>WAL</Ltr> می‌خواند و به کافکا می‌فرستد؛ بدون کوئری دوره‌ای و با
            تأخیر بسیار کم. در عوض یک کانکتور و دسترسی به لاگ تراکنش دیتابیس
            لازم است. <Ltr>poller</Ltr> ساده‌تر است و به دیتابیس خاصی وابسته
            نیست، اما بار کوئری و تأخیر بیشتری دارد.
          </p>
          <p>
            در هر دو حالت، جدول <Ltr>outbox</Ltr> باید ایندکس روی وضعیت
            منتشرنشده داشته باشد و ردیف‌های قدیمی پس از مدتی پاک شوند؛ وگرنه خودش
            به یک مشکل ذخیره‌سازی تبدیل می‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Transactional Outbox با Kafka Transactions">
          <p>
            اگر فقط یک تاپیک مقصد دارید و از تراکنش‌های کافکا استفاده می‌کنید،
            می‌توانید نوشتن چند تاپیک را اتمیک کنید. اما تراکنش کافکا دیتابیس
            شما را پوشش نمی‌دهد؛ پس برای نوشتن هم‌زمان دیتابیس و کافکا همچنان{' '}
            <Ltr>Outbox</Ltr> لازم است. این دو مکمل‌اند، نه جایگزین.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>۶. کدام الگو برای کدام مسئله</h2>
      <table>
        <thead>
          <tr>
            <th>مسئله شما</th>
            <th>الگوی پیشنهادی</th>
            <th>هزینه اصلی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>باید بدانیم چرا داده به این وضعیت رسید</td>
            <td><Ltr>Event Sourcing</Ltr></td>
            <td>نسخه‌بندی رویداد و snapshot</td>
          </tr>
          <tr>
            <td>کوئری‌های خواندن، مسیر نوشتن را کند می‌کنند</td>
            <td><Ltr>CQRS</Ltr></td>
            <td>سازگاری نهایی و چند مدل داده</td>
          </tr>
          <tr>
            <td>هم‌زمان در دیتابیس و کافکا می‌نویسیم</td>
            <td><Ltr>Outbox</Ltr></td>
            <td>جدول اضافه و relay</td>
          </tr>
          <tr>
            <td>یک عملیات چند سرویس را درگیر می‌کند</td>
            <td><Ltr>Saga</Ltr></td>
            <td>عمل جبرانی و حالت میانی</td>
          </tr>
          <tr>
            <td>پردازش پیام می‌تواند شکست بخورد</td>
            <td><Ltr>Retry</Ltr> + <Ltr>DLQ</Ltr></td>
            <td>تاپیک‌های بیشتر و پایش دستی</td>
          </tr>
        </tbody>
      </table>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="نوشتن در دیتابیس و کافکا در دو خط جدا">
        اگر بدون <Ltr>Outbox</Ltr> یا تراکنش مشترک، اول دیتابیس و بعد کافکا را
        به‌روز کنید، دیر یا زود ناسازگاری می‌بینید. این باگ در تست‌های عادی کم
        ظاهر می‌شود و در زمان قطعی شبکه بیرون می‌زند.
      </Callout>
      <Callout variant="danger" title="جبران Saga را فراموش کردن">
        اگر گام پرداخت شکست بخورد و موجودی آزاد نشود، موجودی برای همیشه قفل
        می‌ماند. هر گام <Ltr>Saga</Ltr> باید عمل جبرانی مشخص و تست‌شده داشته باشد.
      </Callout>
      <Callout variant="warning" title="DLQ بدون مالک و بدون پایش">
        <Ltr>DLQ</Ltr> بدون هشدار و بدون فرایند بازپخش، فقط پیام‌ها را از دید
        خارج می‌کند. برای هر <Ltr>DLQ</Ltr> مالک، آستانه هشدار و دستور بازپخش
        تعریف کنید.
      </Callout>
      <Callout variant="info" title="همه الگوها را با هم شروع نکنید">
        با یک جریان ساده شروع کنید، درد واقعی را اندازه بگیرید و بعد الگوی
        متناسب را اضافه کنید. معماری رویدادمحور خوب، معماری‌ای است که هر بخشش
        دلیل روشنی داشته باشد.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          <Ltr>Event Sourcing</Ltr> رویدادها را منبع حقیقت می‌کند و تاریخچه کامل
          می‌دهد، به بهای نسخه‌بندی و snapshot.
        </li>
        <li>
          <Ltr>CQRS</Ltr> مدل خواندن و نوشتن را جدا می‌کند و سازگاری نهایی را
          می‌پذیرد.
        </li>
        <li>
          <Ltr>Outbox</Ltr> مطمئن‌ترین راه حذف نوشتن دوگانه بین دیتابیس و کافکاست.
        </li>
        <li>
          <Ltr>Saga</Ltr> تراکنش توزیع‌شده را با گام‌های محلی و عمل جبرانی
          می‌سازد.
        </li>
        <li>
          <Ltr>Retry</Ltr> و <Ltr>DLQ</Ltr> شکست پردازش را کنترل‌شده و قابل
          پایش می‌کنند.
        </li>
      </ul>
      <p>
        حالا که الگوهای معماری را می‌شناسیم، نوبت تصمیم‌های پایه‌ای است که همه
        این الگوها رویشان سوار می‌شوند: نام تاپیک، تعداد پارتیشن و انتخاب{' '}
        <Ltr>Key</Ltr>. در درس بعدی همین‌ها را با عدد و مثال طراحی می‌کنیم.
      </p>
    </>
  )
}
