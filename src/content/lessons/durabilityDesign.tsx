import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { HwDurabilityExplainer } from '../../components/simulators/HwDurabilityExplainer'

const producerConfig = `# producer.properties
acks=all
enable.idempotence=true
max.in.flight.requests.per.connection=5
delivery.timeout.ms=120000
retries=2147483647`

const topicConfig = `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic payments \\
  --partitions 12 \\
  --replication-factor 3 \\
  --config min.insync.replicas=2 \\
  --config unclean.leader.election.enable=false \\
  --config retention.ms=604800000`

const brokerConfig = `# server.properties
broker.rack=rack-b
default.replication.factor=3
min.insync.replicas=2
unclean.leader.election.enable=false`

const mirrorMaker = `# mm2.properties
clusters=primary,backup
primary.bootstrap.servers=primary-kafka:9092
backup.bootstrap.servers=backup-kafka:9092

primary->backup.enabled=true
primary->backup.topics=payments,orders
replication.factor=3`

export function DurabilityDesignContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در چهار درس قبل اجزای اطمینان‌پذیری را جداگانه دیدیم. حالا وقت تصمیم‌گیری
        است: برای هر نوع داده، چه ترکیبی از <Ltr>RF</Ltr>، <Ltr>acks</Ltr>،{' '}
        <Ltr>min.insync.replicas</Ltr>، چیدمان rack و پایش را انتخاب کنیم؟ هدف
        این درس یک دستور جادویی نیست؛ یک چارچوب تصمیم است که می‌توانید روی
        تاپیک‌های واقعی اعمال کنید.
      </p>

      <h2>۱. اول مشخص کنید چه چیزی را نمی‌توانید از دست بدهید</h2>
      <p>
        «دوام بالا» بدون تعریف، فقط هزینه است. سه سؤال را برای هر جریان داده
        بپرسید:
      </p>
      <ul>
        <li>اگر آخرین چند ثانیه داده از دست برود، چه اتفاقی می‌افتد؟</li>
        <li>اگر نوشتن چند دقیقه متوقف شود، کسب‌وکار چه ضرری می‌کند؟</li>
        <li>اگر یک دیتاسنتر کامل از دست برود، سرویس باید زنده بماند؟</li>
      </ul>
      <table>
        <thead>
          <tr>
            <th>نوع داده</th>
            <th>از دست رفتن داده</th>
            <th>توقف نوشتن</th>
            <th>هدف طراحی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>لاگ، متریک، تله‌متری</td>
            <td>قابل قبول</td>
            <td>قابل قبول</td>
            <td>ارزان و پرتوان</td>
          </tr>
          <tr>
            <td>رویداد کسب‌وکار (سفارش، سبد خرید)</td>
            <td>غیرقابل قبول</td>
            <td>کوتاه قابل قبول</td>
            <td>دوام بالا با دسترس‌پذیری خوب</td>
          </tr>
          <tr>
            <td>پرداخت، دفتر کل مالی</td>
            <td>غیرقابل قبول</td>
            <td>با تأیید تیم مالی</td>
            <td>حداکثر دوام، حتی به قیمت توقف</td>
          </tr>
        </tbody>
      </table>

      <h2>۲. ستون‌های دوام</h2>
      <p>
        چهار تنظیم اصلی با هم کار می‌کنند. هیچ‌کدام به‌تنهایی کافی نیست:
      </p>
      <table>
        <thead>
          <tr>
            <th>تنظیم</th>
            <th>چه چیزی را می‌سازد</th>
            <th>هزینه</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>RF=3</Ltr></td>
            <td>تحمل خرابی یک بروکر بدون از دست رفتن داده</td>
            <td>سه برابر فضای دیسک و ترافیک کپی</td>
          </tr>
          <tr>
            <td><Ltr>acks=all</Ltr></td>
            <td>تأیید فقط بعد از نوشتن روی همه اعضای <Ltr>ISR</Ltr></td>
            <td>تأخیر بیشتر نوشتن</td>
          </tr>
          <tr>
            <td><Ltr>min.insync.replicas=2</Ltr></td>
            <td>حداقل دو کپی برای هر رکورد تأییدشده</td>
            <td>توقف نوشتن وقتی دو بروکر از دست بروند</td>
          </tr>
          <tr>
            <td><Ltr>enable.idempotence=true</Ltr></td>
            <td>جلوگیری از تکرار رکورد در اثر retry</td>
            <td>سربار کوچک و محدودیت در تنظیمات</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={producerConfig} language="properties" filename="producer.properties" />
      <CodeBlock code={topicConfig} language="bash" filename="create-durable-topic.sh" />
      <p>
        این ترکیب برای بیشتر جریان‌های کسب‌وکار نقطه شروع خوبی است: با خرابی یک
        بروکر نه نوشتن متوقف می‌شود و نه داده تأییدشده از بین می‌رود.
      </p>

      <h2>۳. چیدمان rack: دوام واقعی به فیزیک وابسته است</h2>
      <p>
        سه بروکر در یک rack، در برابر خرابی نرم‌افزاری مقاوم‌اند اما در برابر
        خرابی rack نه. <Ltr>RF=3</Ltr> روی سه rack یعنی تحمل یک rack؛{' '}
        <Ltr>RF=4</Ltr> روی همان سه rack هم فقط یک rack را تحمل می‌کند. برای تحمل
        دو rack با سه rack فیزیکی به <Ltr>RF=5</Ltr> نیاز دارید.
      </p>
      <CodeBlock code={brokerConfig} language="properties" filename="server.properties" />
      <p>
        اگر خوشه چند دیتاسنتری است، rack را با دانه‌بندی درست تعریف کنید (مثلاً
        دیتاسنتر + rack) تا کافکا نسخه‌ها را واقعاً پخش کند. تنظیم اشتباه{' '}
        <Ltr>broker.rack</Ltr> بدتر از تنظیم نکردن آن است، چون کافکا فکر می‌کند
        چیدمان بهینه است.
      </p>

      <h2>۴. پایش: دوام بدون هشدار فقط یک آرزوست</h2>
      <p>
        تنظیمات درست هم اگر پایش نشوند، بعد از چند ماه از کنترل خارج می‌شوند.
        این متریک‌ها را با آستانه روشن هشدار بدهید:
      </p>
      <table>
        <thead>
          <tr>
            <th>متریک</th>
            <th>معنی</th>
            <th>آستانه پیشنهادی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>UnderReplicatedPartitions</Ltr></td>
            <td>پارتیشن‌هایی که <Ltr>ISR</Ltr> ناقص دارند</td>
            <td>بیش از ۵ دقیقه بزرگ‌تر از صفر</td>
          </tr>
          <tr>
            <td><Ltr>OfflinePartitionsCount</Ltr></td>
            <td>پارتیشن‌های بدون لیدر</td>
            <td>هر مقدار بزرگ‌تر از صفر، فوری</td>
          </tr>
          <tr>
            <td><Ltr>UnderMinIsrPartitionCount</Ltr></td>
            <td>پارتیشن‌هایی که نوشتن در آن‌ها متوقف است</td>
            <td>هر مقدار بزرگ‌تر از صفر، فوری</td>
          </tr>
          <tr>
            <td><Ltr>ActiveControllerCount</Ltr></td>
            <td>تعداد کنترلر فعال در خوشه</td>
            <td>دقیقاً یک کنترلر</td>
          </tr>
          <tr>
            <td><Ltr>RequestHandlerAvgIdlePercent</Ltr></td>
            <td>ظرفیت آزاد پردازش درخواست بروکر</td>
            <td>کمتر از ۳۰٪ پایدار</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip" title="هشدار را به اقدام وصل کنید">
        برای هر هشدار یک runbook کوتاه بنویسید: چه چیزی را ببینیم، چه کاری
        نکنیم و چه زمانی escalate کنیم. هشدار بدون اقدام، فقط نویز است.
      </Callout>

      <h2>۵. بکاپ و بازیابی فاجعه</h2>
      <p>
        تکرار درون خوشه شما را از خرابی بروکر و rack محافظت می‌کند، نه از حذف
        اشتباه تاپیک، خرابی منطقه کامل یا فساد داده. برای این موارد به یک لایه
        جداگانه نیاز دارید:
      </p>
      <ul>
        <li>
          <strong>تکرار بین خوشه‌ای:</strong> <Ltr>MirrorMaker 2</Ltr> تاپیک‌های
          انتخاب‌شده را به خوشه پشتیبان می‌فرستد.
        </li>
        <li>
          <strong>نگه‌داری طولانی:</strong> <Ltr>Tiered Storage</Ltr> داده قدیمی
          را به object storage منتقل می‌کند و پنجره بازپخش را طولانی‌تر می‌کند.
        </li>
        <li>
          <strong>تمرین بازیابی:</strong> بازگردانی از پشتیبان را روی محیط تست
          تمرین کنید؛ بکاپی که تست نشده، بکاپ نیست.
        </li>
      </ul>
      <CodeBlock code={mirrorMaker} language="properties" filename="mm2.properties" />
      <Callout variant="warning" title="MirrorMaker جایگزین RF نیست">
        تکرار به خوشه دوم، تأخیر دارد و در حالت عادی همگام لحظه‌ای نیست. برای
        دوام درون خوشه همچنان به <Ltr>RF</Ltr> و <Ltr>acks</Ltr> درست نیاز
        دارید.
      </Callout>

      <h2>۶. چرا <Ltr>min.insync.replicas=1</Ltr> خطرناک است؟</h2>
      <p>
        توضیح تعاملی زیر همان لحظه‌ای را نشان می‌دهد که <Ltr>ISR</Ltr> به یک عضو
        می‌رسد و <Ltr>min.insync.replicas=1</Ltr> اجازه می‌دهد نوشتن ادامه پیدا
        کند. در گام‌های آخر، همان سناریو با مقدار ۲ تکرار می‌شود تا تفاوت را
        کنار هم ببینید.
      </p>

      <HwDurabilityExplainer />

      <h2>۷. چک‌لیست طراحی</h2>
      <ol>
        <li>
          <Ltr>RF</Ltr> را حداقل ۳ بگذارید و آن را با تعداد rack هماهنگ کنید.
        </li>
        <li>
          <Ltr>acks=all</Ltr> و <Ltr>enable.idempotence=true</Ltr> را پیش‌فرض
          پرودیوسر کنید.
        </li>
        <li>
          <Ltr>min.insync.replicas</Ltr> را برای داده کسب‌وکار ۲ و برای داده
          فوق‌حساس ۳ بگذارید.
        </li>
        <li>
          <Ltr>unclean.leader.election.enable=false</Ltr> را نگه دارید.
        </li>
        <li>
          <Ltr>broker.rack</Ltr> را در همه بروکرها درست تنظیم کنید.
        </li>
        <li>
          روی <Ltr>UnderReplicatedPartitions</Ltr>،{' '}
          <Ltr>OfflinePartitionsCount</Ltr> و <Ltr>UnderMinIsrPartitionCount</Ltr>{' '}
          هشدار بگذارید.
        </li>
        <li>
          برای بازیابی فاجعه، تکرار بین خوشه‌ای و تمرین بازگردانی داشته باشید.
        </li>
      </ol>

      <DeepDive title="جزئیات انتخاب تنظیمات برای بار واقعی">
        <DeepDiveSection title="هزینه RF و min.insync">
          <p>
            هر واحد <Ltr>RF</Ltr> یک نسخه کامل از داده و ترافیک کپی اضافه می‌کند.
            <Ltr>min.insync.replicas</Ltr> فضای اضافه نمی‌گیرد، اما مستقیماً
            دسترس‌پذیری نوشتن را کم می‌کند. قبل از بالا بردن آن، ظرفیت دیسک و
            سرعت همگام شدن فالوورها را بسنجید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="تأخیر در برابر دوام">
          <p>
            <Ltr>acks=all</Ltr> تأخیر نوشتن را بیشتر می‌کند، چون منتظر کندترین
            عضو <Ltr>ISR</Ltr> می‌ماند. اگر تأخیر بحرانی است، به‌جای کم کردن
            دوام، شبکه و دیسک فالوورها را بهبود دهید و اندازه دسته‌ها را تنظیم
            کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="تغییر تنظیمات روی تاپیک موجود">
          <p>
            تغییر <Ltr>min.insync.replicas</Ltr> و <Ltr>unclean.leader.election</Ltr>{' '}
            بدون restart اعمال می‌شود، اما تغییر <Ltr>RF</Ltr> به reassignment
            نیاز دارد. هر تغییر را با پایش قبل و بعد همراه کنید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="کپی کردن تنظیمات از یک وبلاگ">
        ترکیب <Ltr>RF</Ltr>، <Ltr>acks</Ltr> و <Ltr>min.insync</Ltr> باید با
        تعداد بروکر، rack و تحمل خرابی کسب‌وکار شما هماهنگ باشد. عددی که برای یک
        خوشه پنج‌بروکری درست است، در خوشه سه‌بروکری می‌تواند نوشتن را متوقف کند.
      </Callout>
      <Callout variant="warning" title="دوام بدون تمرین بازیابی">
        داشتن <Ltr>RF=3</Ltr> و <Ltr>acks=all</Ltr> کافی نیست. اگر تیم نداند
        بعد از خرابی دیسک چه کند، همان تنظیمات هم سرویس را نجات نمی‌دهد.
      </Callout>
      <Callout variant="warning" title="نادیده گرفتن هزینه عملیاتی">
        هر سطح دوام، هزینه دیسک، شبکه و پیچیدگی عملیات دارد. برای داده کم‌ارزش
        هم <Ltr>RF=3</Ltr> و <Ltr>min.insync=2</Ltr> بگذارید فقط اگر بودجه‌اش
        را دارید.
      </Callout>

      <h2>جمع‌بندی فصل</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>دوام یک تنظیم نیست؛ ترکیب <Ltr>RF</Ltr>، <Ltr>acks</Ltr>، <Ltr>min.insync</Ltr> و rack است.</li>
        <li>برای داده کسب‌وکار: <Ltr>RF=3</Ltr>، <Ltr>acks=all</Ltr>، <Ltr>min.insync=2</Ltr>، idempotence.</li>
        <li>برای داده فوق‌حساس: <Ltr>min.insync=3</Ltr> با پذیرش توقف نوشتن.</li>
        <li>چیدمان rack و <Ltr>unclean.leader.election=false</Ltr> را جدی بگیرید.</li>
        <li>پایش، هشدار و تمرین بازیابی بخشی از طراحی‌اند.</li>
      </ul>
      <p>
        با این درس، فصل اطمینان‌پذیری کامل می‌شود. حالا می‌دانید داده کجا نگه‌داری
        می‌شود، چطور تکرار می‌شود، با خرابی چه می‌کند و چه تنظیماتی آن را از دست
        رفتن محافظت می‌کند. در فصل بعد به ابزارهای عملی و خوشه واقعی می‌رویم.
      </p>
    </>
  )
}
