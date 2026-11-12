import { Accordion } from '../../components/ui/Accordion'
import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { Ltr } from '../../components/ui/Ltr'
import { Tabs } from '../../components/ui/Tabs'

const cliExample = `# ایجاد یک Topic با سه Partition و ضریب تکرار دو
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic orders \\
  --partitions 3 --replication-factor 2`

const jsonExample = `{
  "eventId": "8f14e45f",
  "type": "order.created",
  "key": "customer-1042",
  "value": {
    "orderId": 90231,
    "total": 2450000
  }
}`

export function SampleLessonContent() {
  return (
    <div className="lesson-prose">
      <p>
        این صفحه یک درس نمونه است و هدف اصلی آن بررسی مسیریابی، فهرست درس‌ها،
        ذخیره‌سازی پیشرفت و اجزای پایه رابط کاربری است. محتوای واقعی دوره در
        گام‌های بعدی اضافه می‌شود.
      </p>

      <Callout variant="info" title="این درس آزمایشی است">
        با زدن دکمه «تکمیل درس» پیشرفت شما در حافظه مرورگر ذخیره می‌شود. بعد از
        بستن و باز کردن دوباره سایت، وضعیت تکمیل و تم انتخابی باقی می‌مانند.
      </Callout>

      <h2>Kafka در یک نگاه</h2>
      <p>
        <Ltr>Apache Kafka</Ltr> یک پلتفرم توزیع‌شده برای جریان رویداد است. در
        ساده‌ترین حالت، تولیدکننده‌ها (<Ltr>Producer</Ltr>) پیام‌ها را در
        Topicها می‌نویسند و مصرف‌کننده‌ها (<Ltr>Consumer</Ltr>) آن‌ها را
        می‌خوانند. هر Topic به چند <Ltr>Partition</Ltr> تقسیم می‌شود تا
        مقیاس‌پذیری و ترتیب پیام‌ها قابل مدیریت باشد.
      </p>

      <h3>یک دستور واقعی</h3>
      <p>
        برای ساخت یک Topic روی یک خوشه محلی می‌توان از ابزار خط فرمان استفاده
        کرد. شکل زیر یک نمونه از دستور <Ltr>kafka-topics.sh</Ltr> را نشان
        می‌دهد:
      </p>
      <CodeBlock code={cliExample} language="bash" filename="create-topic.sh" />

      <h3>ساختار یک رویداد</h3>
      <p>
        هر رکورد معمولاً یک <Ltr>Key</Ltr>، یک <Ltr>Value</Ltr>، یک{' '}
        <Ltr>Timestamp</Ltr> و تعدادی <Ltr>Header</Ltr> دارد. نمونه زیر یک
        رویداد سفارش را به شکل <Ltr>JSON</Ltr> نشان می‌دهد:
      </p>
      <CodeBlock code={jsonExample} language="json" filename="order-created.json" />

      <Tabs
        ariaLabel="نمونه کد زبان‌های مختلف"
        items={[
          {
            id: 'bash',
            label: 'Bash',
            content: (
              <CodeBlock
                code={`kafka-console-consumer.sh --bootstrap-server localhost:9092 \\
  --topic orders --from-beginning`}
                language="bash"
              />
            ),
          },
          {
            id: 'java',
            label: 'Java',
            content: (
              <CodeBlock
                code={`Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", StringSerializer.class.getName());
props.put("value.serializer", StringSerializer.class.getName());`}
                language="clike"
              />
            ),
          },
        ]}
      />

      <h2>مفاهیمی که در ادامه می‌آموزیم</h2>
      <Accordion
        items={[
          {
            id: 'partition',
            title: 'Partition چیست؟',
            content: (
              <p>
                هر Partition یک ترتیب مستقل از رکوردها دارد. ترتیب فقط درون یک
                Partition تضمین می‌شود، نه بین Partitionهای یک Topic.
              </p>
            ),
          },
          {
            id: 'offset',
            title: 'Offset چه نقشی دارد؟',
            content: (
              <p>
                <Ltr>Offset</Ltr> شماره ترتیبی هر رکورد در یک Partition است و
                مصرف‌کننده با ذخیره آن مشخص می‌کند تا کجا پیام‌ها را خوانده است.
              </p>
            ),
          },
        ]}
      />

      <Callout variant="tip" title="برای شروع">
        از منوی کنار صفحه می‌توانید بین فصل‌ها جابه‌جا شوید. فصل‌هایی که هنوز
        درس ندارند با برچسب «به‌زودی» مشخص شده‌اند.
      </Callout>
    </div>
  )
}
