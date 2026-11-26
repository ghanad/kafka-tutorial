import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { RackAwarenessExplainer } from '../../components/simulators/RackAwarenessExplainer'

const brokerRack = `# server.properties روی هر بروکر
broker.id=1
broker.rack=rack-a

# بروکر دوم
broker.id=2
broker.rack=rack-b

# بروکر سوم
broker.id=3
broker.rack=rack-c`

const createTopic = `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic orders \\
  --partitions 3 \\
  --replication-factor 3 \\
  --config min.insync.replicas=2`

const describeTopic = `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --topic orders

Topic: orders  PartitionCount: 3  ReplicationFactor: 3
  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
  Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1
  Partition: 2  Leader: 3  Replicas: 3,1,2  Isr: 3,1,2`

const describeUnderReplicated = `# فهرست پارتیشن‌هایی که ISR آن‌ها از Replicas کمتر است
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --under-replicated-partitions

# پارتیشن‌های بدون لیدر
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --unavailable-partitions`

const consumerRack = `# consumer.properties
client.rack=rack-b`

export function ReplicationIsrContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس <strong>Leader و Follower</strong> دیدیم هر پارتیشن یک لیدر و چند
        فالوور دارد. حالا از زاویه اطمینان‌پذیری به همان تصویر نگاه می‌کنیم: چند
        نسخه واقعاً شما را از خرابی نجات می‌دهد، <Ltr>ISR</Ltr> با چه معیاری
        کوچک و بزرگ می‌شود، <Ltr>High Watermark</Ltr> چرا مرز داده commitشده است
        و چطور بفهمیم یک پارتیشن دیگر به اندازه کافی محافظت نمی‌شود.
      </p>

      <h2>۱. ضریب تکرار و چیدمان آگاه از rack</h2>
      <p>
        <strong>ضریب تکرار</strong> (<Ltr>Replication Factor</Ltr> یا{' '}
        <Ltr>RF</Ltr>) تعداد نسخه‌های هر پارتیشن است. اگر <Ltr>RF=3</Ltr> باشد،
        هر رکورد روی سه بروکر متفاوت نوشته می‌شود. کافکا دو نسخه از یک پارتیشن
        را هرگز روی یک بروکر نمی‌گذارد، پس <Ltr>RF</Ltr> از تعداد بروکرها بیشتر
        نمی‌شود.
      </p>
      <p>
        اما «سه بروکر متفاوت» کافی نیست. اگر هر سه بروکر در یک دیتاسنتر یا یک
        rack باشند، قطع برق یا خرابی شبکه آن rack هر سه نسخه را هم‌زمان از دست
        می‌دهد. برای همین کافکا <strong>چیدمان آگاه از rack</strong> را با
        تنظیم <Ltr>broker.rack</Ltr> پشتیبانی می‌کند: تا حد امکان هر نسخه را در
        یک rack جدا می‌گذارد.
      </p>
      <CodeBlock code={brokerRack} language="properties" filename="server.properties" />
      <p>
        با <Ltr>RF=3</Ltr> روی سه rack، خرابی یک rack یعنی از دست رفتن یک نسخه و
        باقی ماندن دو نسخه. با <Ltr>RF=4</Ltr> روی همان سه rack، باز هم فقط یک
        rack تحمل می‌شود، چون طبق اصل لانه کبوتری دو نسخه در یک rack مشترک
        می‌افتند. برای تحمل دو rack با سه rack فیزیکی به <Ltr>RF=5</Ltr> نیاز
        دارید.
      </p>
      <CodeBlock code={createTopic} language="bash" filename="create-orders-topic.sh" />
      <p>
        برای ساخت تاپیک با <Ltr>RF=3</Ltr> خوشه باید حداقل سه بروکر داشته باشد؛
        در غیر این صورت دستور با خطا رد می‌شود.
      </p>

      <RackAwarenessExplainer />

      <p>
        در گام ۵ دیدید افزودن بروکر چهارم به <Ltr>rack-a</Ltr> تحمل خرابی را
        بیشتر نکرد؛ چیدمان آگاه از rack بر اساس تعداد rack تصمیم می‌گیرد، نه
        تعداد بروکر. در گام ۶ هم دیدید اگر <Ltr>broker.rack</Ltr> اشتباه تنظیم
        شود، کافکا چیدمان را بهینه می‌پندارد و همه نسخه‌ها را در یک rack
        می‌گذارد.
      </p>

      <h2>۲. ISR: نسخه‌هایی که هنوز همگام‌اند</h2>
      <p>
        <strong>ISR</strong> (<Ltr>In-Sync Replicas</Ltr>) فهرست نسخه‌هایی است که
        عقب‌ماندگی‌شان از لیدر در حد مجاز است. خود لیدر هم عضو <Ltr>ISR</Ltr> است.
        معیار عضویت زمان است: هر فالووری که در بازه{' '}
        <Ltr>replica.lag.time.max.ms</Ltr> (پیش‌فرض ۳۰ ثانیه) به انتهای لاگ لیدر
        نرسد، از <Ltr>ISR</Ltr> خارج می‌شود و وقتی دوباره همگام شد برمی‌گردد.
      </p>
      <p>
        این فهرست ثابت نیست؛ در طول روز کوچک و بزرگ می‌شود. یک بروکر کند، یک
        دیسک شلوغ یا یک قطع شبکه کوتاه می‌تواند یک فالوور را موقتاً بیرون
        بیندازد. مهم این است که <Ltr>ISR</Ltr> فقط یک عدد تزئینی نیست؛ سه چیز
        به آن گره خورده است:
      </p>
      <ul>
        <li>
          <strong>جانشینی لیدر:</strong> فقط نسخه‌ای می‌تواند لیدر جدید شود که
          عضو <Ltr>ISR</Ltr> باشد.
        </li>
        <li>
          <strong>تأیید نوشتن با <Ltr>acks=all</Ltr>:</strong> پرودیوسر وقتی
          تأیید می‌گیرد که رکورد روی همه اعضای <Ltr>ISR</Ltr> نوشته شده باشد.
        </li>
        <li>
          <strong>پذیرش نوشتن:</strong> اگر اندازه <Ltr>ISR</Ltr> از{' '}
          <Ltr>min.insync.replicas</Ltr> کمتر شود، لیدر درخواست‌های{' '}
          <Ltr>acks=all</Ltr> را رد می‌کند.
        </li>
      </ul>
      <p>
        برای دیدن اینکه <Ltr>ISR</Ltr> چطور در طول زمان تغییر می‌کند و هر بار چه
        اثری روی نوشتن دارد، توضیح تعاملی درس <strong>Leader و Follower</strong>{' '}
        را گام‌به‌گام جلو ببرید. در این درس فرض می‌کنیم <Ltr>ISR</Ltr> را می‌شناسید
        و سراغ عددهایی می‌رویم که در عمل باید پایش کنید.
      </p>

      <h2>۳. LEO و High Watermark: مرز داده commitشده</h2>
      <p>
        دو عدد، وضعیت هر نسخه را خلاصه می‌کنند:
      </p>
      <ul>
        <li>
          <strong><Ltr>LEO</Ltr></strong> (<Ltr>Log End Offset</Ltr>): آفست
          بعدیِ نوشتن در آن نسخه. نسخه‌ای که تا <Ltr>offset 9</Ltr> را دارد،{' '}
          <Ltr>LEO = 10</Ltr> دارد.
        </li>
        <li>
          <strong><Ltr>High Watermark</Ltr></strong> (<Ltr>HW</Ltr>): کمترین{' '}
          <Ltr>LEO</Ltr> بین اعضای <Ltr>ISR</Ltr>.
        </li>
      </ul>
      <p>
        مصرف‌کننده فقط آفست‌های کوچک‌تر از <Ltr>HW</Ltr> را می‌بیند. مثال: اگر
        لیدر <Ltr>LEO = 11</Ltr> داشته باشد و دو فالوور به ترتیب <Ltr>9</Ltr> و{' '}
        <Ltr>7</Ltr> عقب باشند، <Ltr>HW = min(11, 9, 7) = 7</Ltr> می‌شود و
        مصرف‌کننده <Ltr>offset 0..6</Ltr> را می‌بیند.
      </p>
      <p>
        چرا این محدودیت؟ چون اگر رکوردی فقط روی لیدر باشد و لیدر بمیرد، ممکن است
        از بین برود. کافکا فقط چیزی را به مصرف‌کننده نشان می‌دهد که حداقل روی همه
        نسخه‌های <Ltr>ISR</Ltr> نوشته شده باشد تا بعد از تغییر لیدر هم وجود
        داشته باشد.
      </p>
      <table>
        <thead>
          <tr>
            <th>اصطلاح</th>
            <th>تعریف</th>
            <th>چه چیزی را تعیین می‌کند</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>RF</Ltr></td>
            <td>تعداد نسخه‌های هر پارتیشن</td>
            <td>حداکثر خرابی سخت‌افزاری قابل تحمل</td>
          </tr>
          <tr>
            <td><Ltr>ISR</Ltr></td>
            <td>نسخه‌های همگام در بازه زمانی مجاز</td>
            <td>امکان جانشینی لیدر و پذیرش نوشتن</td>
          </tr>
          <tr>
            <td><Ltr>LEO</Ltr></td>
            <td>آفست بعدی نوشتن در هر نسخه</td>
            <td>اندازه‌گیری عقب‌ماندگی</td>
          </tr>
          <tr>
            <td><Ltr>HW</Ltr></td>
            <td>کمترین LEO بین ISR</td>
            <td>مرز داده قابل خواندن و commitشده</td>
          </tr>
        </tbody>
      </table>

      <h2>۴. پارتیشن‌های Under-Replicated و Offline</h2>
      <p>
        دو وضعیت را جدا کنید. پارتیشن <strong>Under-Replicated</strong> است اگر
        اندازه <Ltr>ISR</Ltr> از <Ltr>RF</Ltr> کمتر باشد؛ یعنی هنوز کار می‌کند
        اما حاشیه امنیتش کم شده است. پارتیشن <strong>Offline</strong> است اگر
        هیچ نسخه‌ای در <Ltr>ISR</Ltr> نمانده باشد و لیدر نداشته باشد.
      </p>
      <CodeBlock
        code={describeUnderReplicated}
        language="bash"
        filename="check-replication.sh"
      />
      <p>
        در پایش، سه متریک را با هم ببینید: <Ltr>UnderReplicatedPartitions</Ltr>،{' '}
        <Ltr>OfflinePartitionsCount</Ltr> و <Ltr>UnderMinIsrPartitionCount</Ltr>.
        اولی می‌گوید حاشیه امنیت کم شده، دومی می‌گوید داده در دسترس نیست و سومی
        می‌گوید نوشتن در آستانه توقف است. هشدار روی همه سه، از اولین کارهای
        عملیاتی هر خوشه است.
      </p>
      <CodeBlock
        code={describeTopic}
        language="bash"
        filename="describe-orders-topic.sh"
      />
      <p>
        در خروجی <Ltr>--describe</Ltr>، ستون <Ltr>Replicas</Ltr> همه نسخه‌ها و
        ستون <Ltr>Isr</Ltr> نسخه‌های همگام را نشان می‌دهد. اگر این دو فهرست
        متفاوت باشند، پارتیشن <Ltr>Under-Replicated</Ltr> است.
      </p>
      <Callout variant="warning" title="Under-Replicated را نادیده نگیرید">
        یک پارتیشن <Ltr>Under-Replicated</Ltr> هنوز کار می‌کند، اما اگر همان
        لحظه یک بروکر دیگر هم از دست برود، ممکن است آفلاین شود. این وضعیت را
        «هشدار زودهنگام» ببینید، نه یک عدد عادی.
      </Callout>

      <h2>۵. خواندن از فالوور (Follower Fetching)</h2>
      <p>
        به‌طور پیش‌فرض مصرف‌کننده‌ها از لیدر می‌خوانند. از <Ltr>Kafka 2.4</Ltr> با{' '}
        <Ltr>KIP-392</Ltr> می‌توانید <Ltr>client.rack</Ltr> را در مصرف‌کننده
        تنظیم کنید تا از نزدیک‌ترین فالوور هم‌سطح بخواند. این کار ترافیک
        بین‌دیتاسنتری را کم می‌کند و تأخیر خواندن را پایین می‌آورد.
      </p>
      <CodeBlock code={consumerRack} language="properties" filename="consumer.properties" />
      <p>
        اما این کار ظرفیت خواندن پارتیشن را زیاد نمی‌کند: هنوز هم همه خواندن‌ها
        به همان لیدر یا یک فالوور نزدیک محدود است. اگر ظرفیت خواندن کم دارید،
        راه‌حل معمول افزودن پارتیشن و مصرف‌کننده است، نه خواندن از همه فالوورها.
      </p>

      <DeepDive title="جزئیات کپی‌برداری فالوور و کوتاه‌سازی لاگ">
        <DeepDiveSection title="فالوور چطور داده می‌گیرد؟">
          <p>
            فالوور مثل یک مصرف‌کننده معمولی از لیدر <Ltr>Fetch</Ltr> می‌کند، با
            این تفاوت که آفست درخواستی خودش را از <Ltr>LEO</Ltr> محلی می‌سازد.
            اندازه هر درخواست با <Ltr>replica.fetch.max.bytes</Ltr> و فاصله
            درخواست‌ها با <Ltr>replica.fetch.wait.max.ms</Ltr> کنترل می‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="چرا لاگ کوتاه می‌شود؟">
          <p>
            اگر فالووری بعد از تغییر لیدر رکوردهایی داشته باشد که روی لیدر جدید
            نیستند، آن رکوردها commitنشده‌اند. فالوور لاگ خود را تا{' '}
            <Ltr>HW</Ltr> کوتاه می‌کند و بعد از لیدر جدید کپی می‌گیرد. این
            کوتاه‌سازی همان چیزی است که مصرف‌کننده را از دیدن داده‌ای که بعداً
            ناپدید می‌شود محافظت می‌کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Leader Epoch چه نقشی دارد؟">
          <p>
            کافکا برای هر دوره لیدری یک <Ltr>Leader Epoch</Ltr> نگه می‌دارد. این
            شماره به فالوور و مصرف‌کننده کمک می‌کند بفهمد کدام رکوردها مربوط به
            کدام لیدرند و کوتاه‌سازی را دقیق انجام دهد، بدون اینکه به آفست تنها
            تکیه کند.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="RF=1 در محیط تولید">
        با <Ltr>RF=1</Ltr> هر پارتیشن فقط یک نسخه دارد. مرگ آن بروکر یعنی از دست
        رفتن داده و آفلاین شدن پارتیشن تا بازگشت آن. برای داده واقعی حداقل{' '}
        <Ltr>RF=2</Ltr> و ترجیحاً <Ltr>RF=3</Ltr> انتخاب کنید.
      </Callout>
      <Callout variant="warning" title="تنظیم نکردن broker.rack">
        اگر <Ltr>broker.rack</Ltr> خالی بماند، کافکا نمی‌داند بروکرها در کدام
        rack هستند و چیدمان آگاه از rack انجام نمی‌شود. در دیتاسنترهای چند-rack
        این تنظیم را جدی بگیرید.
      </Callout>
      <Callout variant="warning" title="انتظار خواندن از همه فالوورها">
        فالوورها در درجه اول برای دوام و جانشینی‌اند، نه افزایش ظرفیت خواندن.
        حتی با <Ltr>Follower Fetching</Ltr> هر پارتیشن همچنان یک لیدر دارد و
        ترتیب نوشتن روی آن متمرکز است.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li><Ltr>RF</Ltr> تعداد نسخه‌ها و چیدمان آگاه از rack تحمل خرابی را می‌سازد.</li>
        <li><Ltr>ISR</Ltr> نسخه‌های همگام است و با زمان سنجیده می‌شود، نه با تعداد پیام.</li>
        <li><Ltr>HW</Ltr> کمترین <Ltr>LEO</Ltr> بین <Ltr>ISR</Ltr> و مرز داده قابل خواندن است.</li>
        <li>پارتیشن <Ltr>Under-Replicated</Ltr> کار می‌کند اما حاشیه امنیت ندارد.</li>
        <li>پارتیشن <Ltr>Offline</Ltr> لیدر ندارد و تا بازگشت یک نسخه از <Ltr>ISR</Ltr> در دسترس نیست.</li>
      </ul>
      <p>
        در درس بعدی سراغ عددی می‌رویم که تعیین می‌کند با کوچک شدن <Ltr>ISR</Ltr>{' '}
        نوشتن ادامه پیدا کند یا متوقف شود: <Ltr>min.insync.replicas</Ltr> و
        ترکیبش با <Ltr>acks=all</Ltr>.
      </p>
    </>
  )
}
