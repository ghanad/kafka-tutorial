import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { LeaderElectionExplainer } from '../../components/simulators/LeaderElectionExplainer'

const uncleanConfig = `# server.properties (سطح بروکر)
unclean.leader.election.enable=false`

const rebalanceConfig = `# server.properties (سطح بروکر)
auto.leader.rebalance.enable=true
leader.imbalance.check.interval.seconds=300
leader.imbalance.per.broker.percentage=10`

const manualElection = `# برگرداندن رهبری به Preferred Leader
kafka-leader-election.sh --bootstrap-server localhost:9092 \\
  --election-type preferred \\
  --topic orders \\
  --partition 0`

const electionOutput = `# نمونه خروجی describe
Partition: 0  Leader: 2  Replicas: 1,2,3  Isr: 2,3,1

# پس از Preferred Leader Election
Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3`

export function LeaderElectionContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل دیدیم وقتی <Ltr>ISR</Ltr> کوچک می‌شود چه اتفاقی می‌افتد. حالا
        به لحظه سخت‌تر می‌رویم: لیدر از دست می‌رود. چه کسی تصمیم می‌گیرد لیدر
        جدید کیست، چرا گاهی پارتیشن آفلاین می‌شود و{' '}
        <Ltr>Unclean Leader Election</Ltr> چرا هم نجات‌دهنده است و هم خطرناک.
      </p>

      <h2>۱. چه کسی لیدر جدید را انتخاب می‌کند؟</h2>
      <p>
        در کافکای مدرن، <strong>کنترلر</strong> مسئول متادیتای خوشه است. در حالت{' '}
        <Ltr>KRaft</Ltr>، کنترلرها یک quorum تشکیل می‌دهند و یکی از آن‌ها کنترلر
        فعال است. وقتی کنترلر متوجه می‌شود بروکر لیدر از کار افتاده، برای هر
        پارتیشن یک لیدر جدید انتخاب می‌کند و متادیتای جدید را به بروکرها و
        کلاینت‌ها می‌رساند.
      </p>
      <p>
        در معماری قدیمی <Ltr>ZooKeeper</Ltr> هم کنترلر یکی از بروکرها بود، اما
        وضعیت خوشه در <Ltr>ZooKeeper</Ltr> نگه‌داری می‌شد. در <Ltr>KRaft</Ltr>{' '}
        خود کافکا این نقش را بر عهده دارد و <Ltr>ZooKeeper</Ltr> حذف شده است.
        نتیجه برای شما یکی است: یک کنترلر فعال تصمیم می‌گیرد.
      </p>
      <Callout variant="info" title="کنترلر هم می‌تواند از کار بیفتد">
        در <Ltr>KRaft</Ltr> اگر کنترلر فعال بمیرد، quorum کنترلر یک کنترلر فعال
        جدید انتخاب می‌کند. این انتخاب با انتخاب لیدر پارتیشن فرق دارد؛ اول
        کنترلر جایگزین می‌شود، بعد کنترلر جدید کار توزیع لیدرها را ادامه می‌دهد.
      </Callout>

      <h2>۲. الگوریتم انتخاب لیدر</h2>
      <p>
        برای هر پارتیشن، کافکا فهرست <Ltr>AR</Ltr> (<Ltr>Assigned Replicas</Ltr>)
        را دارد: همه نسخه‌ها به ترتیبی که تخصیص داده شده‌اند. کنترلر این فهرست را
        از اول می‌گردد و اولین نسخه‌ای را که هم زنده باشد و هم عضو{' '}
        <Ltr>ISR</Ltr> باشد لیدر می‌کند. نسخه‌های خارج از <Ltr>ISR</Ltr> واجد
        شرط نیستند، حتی اگر زنده باشند.
      </p>
      <p>
        اگر هیچ نسخه‌ای در <Ltr>ISR</Ltr> نمانده باشد، پارتیشن لیدر ندارد و
        آفلاین می‌شود؛ مگر اینکه <Ltr>Unclean Leader Election</Ltr> فعال باشد.
        توضیح تعاملی زیر همین مسیر را گام‌به‌گام جلو می‌برد، از مرگ لیدر تا
        برگشت آن و مقایسه با حالت unclean.
      </p>

      <LeaderElectionExplainer />

      <p>
        در گام‌های ۲ تا ۴ دیدید رکوردهای <Ltr>offset 12..13</Ltr> که فقط روی لیدر
        قدیمی بودند، commit نشده‌اند و در محاسبه لیدر جدید نمی‌آیند. در گام ۵ هم
        دیدید بروکر برگشته با <Ltr>Leader Epoch</Ltr> نقطه واگرایی را پیدا می‌کند
        و لاگ را کوتاه می‌کند. این همان دلیلی است که <Ltr>HW</Ltr> مرز داده
        قابل خواندن است.
      </p>

      <h2>۳. Preferred Leader و تعادل بار</h2>
      <p>
        اولین نسخه در <Ltr>AR</Ltr>، <strong>Preferred Leader</strong> آن پارتیشن
        است. کافکا هنگام ساخت تاپیک لیدرها را پخش می‌کند تا بار بین بروکرها
        متعادل باشد. بعد از یک failover، ممکن است لیدری به بروکر دیگری منتقل شود
        و آن بروکر بار بیشتری بگیرد. برگرداندن رهبری به Preferred Leader این
        تعادل را برمی‌گرداند، اما به داده کاری ندارد و اختیاری است.
      </p>
      <CodeBlock code={rebalanceConfig} language="properties" filename="server.properties" />
      <CodeBlock code={manualElection} language="bash" filename="preferred-leader-election.sh" />
      <p>
        کافکا فقط وقتی خودش رهبری را برمی‌گرداند که عدم‌تعادل از آستانه{' '}
        <Ltr>leader.imbalance.per.broker.percentage</Ltr> بیشتر شود. برای کنترل
        کامل، خودکارسازی را خاموش کنید و در پنجره نگه‌داری دستی اجرا کنید.
      </p>
      <CodeBlock code={electionOutput} language="text" filename="describe-output.txt" />

      <h2>۴. Unclean Leader Election</h2>
      <p>
        وقتی <Ltr>ISR</Ltr> خالی است، دو انتخاب دارید:
      </p>
      <ul>
        <li>
          <strong>صبر کنید:</strong> پارتیشن آفلاین می‌ماند تا یک نسخه برگردد.
          داده commitشده حفظ می‌شود اما سرویس در دسترس نیست.
        </li>
        <li>
          <strong>Unclean Election را فعال کنید:</strong> یک نسخه عقب‌مانده لیدر
          می‌شود. سرویس برمی‌گردد اما رکوردهایی که فقط روی نسخه‌های مرده بودند از
          بین می‌روند و <Ltr>HW</Ltr> عقب می‌رود.
        </li>
      </ul>
      <CodeBlock code={uncleanConfig} language="properties" filename="server.properties" />
      <p>
        مقدار پیش‌فرض در کافکای مدرن <Ltr>false</Ltr> است. این انتخاب آگاهانه
        است: کافکا ترجیح می‌دهد در دسترس نباشد تا داده ناسازگار تحویل دهد. اگر
        آن را <Ltr>true</Ltr> می‌کنید، باید بدانید مصرف‌کننده‌ها ممکن است رکوردی
        را که قبلاً دیده‌اند دیگر نبینند.
      </p>
      <Callout variant="danger" title="Unclean Election با داده مالی">
        برای پرداخت، سفارش و هر داده‌ای که برگشت‌ناپذیر است،{' '}
        <Ltr>unclean.leader.election.enable=false</Ltr> را نگه دارید. دسترس‌پذیری
        را با <Ltr>RF=3</Ltr> و چیدمان درست rack بسازید، نه با قربانی کردن
        سازگاری.
      </Callout>

      <h2>۵. زمان‌های مهم در مسیر failover</h2>
      <table>
        <thead>
          <tr>
            <th>تنظیم</th>
            <th>پیش‌فرض</th>
            <th>اثر</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>replica.lag.time.max.ms</Ltr></td>
            <td><Ltr>30000</Ltr></td>
            <td>مهلت خروج فالوور از <Ltr>ISR</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>broker.session.timeout.ms</Ltr></td>
            <td><Ltr>9000</Ltr></td>
            <td>مهلت تشخیص قطع ارتباط بروکر</td>
          </tr>
          <tr>
            <td><Ltr>controller.quorum.fetch.timeout.ms</Ltr></td>
            <td><Ltr>2000</Ltr></td>
            <td>مهلت ارتباط کنترلرها در <Ltr>KRaft</Ltr></td>
          </tr>
          <tr>
            <td><Ltr>request.timeout.ms</Ltr></td>
            <td><Ltr>30000</Ltr></td>
            <td>مهلت کلاینت برای پاسخ درخواست</td>
          </tr>
        </tbody>
      </table>
      <p>
        زمان تشخیص خرابی و زمان انتخاب لیدر جدید، پنجره‌ای است که کلاینت خطا
        می‌گیرد و retry می‌کند. کوتاه کردن بی‌دلیل این زمان‌ها می‌تواند باعث
        failoverهای کاذب شود؛ بلند کردنشان هم پنجره خطا را طولانی می‌کند.
      </p>

      <DeepDive title="جزئیات Leader Epoch و failover کنترلر">
        <DeepDiveSection title="Leader Epoch چیست؟">
          <p>
            هر بار که لیدر یک پارتیشن عوض می‌شود، یک شماره دوره جدید ثبت می‌شود.
            این شماره به فالوورها و مصرف‌کننده‌ها کمک می‌کند بفهمند کدام رکوردها
            متعلق به کدام لیدرند و کوتاه‌سازی لاگ را دقیق انجام دهند. بدون آن،
            مقایسه ساده آفست‌ها می‌تواند رکوردهای درست را حذف کند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="failover کنترلر در KRaft">
          <p>
            کنترلرها در <Ltr>KRaft</Ltr> یک quorum با اکثریت دارند. اگر کنترلر
            فعال از کار بیفتد، یکی از کنترلرهای دیگر با رأی اکثریت فعال می‌شود و
            کار توزیع لیدرها را ادامه می‌دهد. برای تحمل خرابی یک کنترلر، حداقل
            سه کنترلر لازم است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="تفاوت با ZooKeeper">
          <p>
            در معماری قدیمی، کنترلر یک بروکر بود که از <Ltr>ZooKeeper</Ltr> برای
            انتخاب خودش و نگه‌داری متادیتا استفاده می‌کرد. در <Ltr>KRaft</Ltr> این
            وابستگی حذف شده و متادیتا در یک log داخلی تکرار می‌شود. نتیجه عملی
            یکی است: یک کنترلر فعال، اما مسیر failover سریع‌تر و ساده‌تر است.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="warning" title="انتظار برگشت خودکار Preferred Leader">
        بعد از برگشت بروکر، لیدری خودبه‌خود برنمی‌گردد. اگر تعادل بار مهم است،
        <Ltr> auto.leader.rebalance.enable</Ltr> را بررسی کنید یا دستی election
        اجرا کنید.
      </Callout>
      <Callout variant="danger" title="فعال کردن unclean برای همه تاپیک‌ها">
        فعال کردن سراسری <Ltr>unclean.leader.election.enable=true</Ltr> ممکن است
        داده تاپیک‌های حساس را قربانی کند. اگر واقعاً برای تاپیک خاصی لازم است،
        آن را محدود و مستند کنید.
      </Callout>
      <Callout variant="warning" title="دستکاری دستی election در بحران">
        اجرای دستی election وقتی <Ltr>ISR</Ltr> ناقص است می‌تواند همان اثر
        unclean را داشته باشد. قبل از هر اقدام، وضعیت <Ltr>ISR</Ltr> و{' '}
        <Ltr>HW</Ltr> را ببینید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>کنترلر فعال، لیدر جدید را از بین نسخه‌های <Ltr>ISR</Ltr> انتخاب می‌کند.</li>
        <li>ترتیب انتخاب بر اساس <Ltr>AR</Ltr> است؛ اولین نسخه زنده در <Ltr>ISR</Ltr>.</li>
        <li><Ltr>Preferred Leader</Ltr> برای تعادل بار است، نه برای دوام داده.</li>
        <li><Ltr>Unclean Election</Ltr> دسترس‌پذیری می‌دهد اما داده commitشده را می‌تواند ببرد.</li>
        <li>مقدار پیش‌فرض <Ltr>unclean.leader.election.enable=false</Ltr> را جدی بگیرید.</li>
      </ul>
      <p>
        در درس بعدی این قطعات را کنار هم می‌گذاریم: یک بروکر می‌میرد، لیدر عوض
        می‌شود، کلاینت retry می‌کند و بروکر برمی‌گردد. مسیر کامل خرابی و بازیابی
        را مرحله‌به‌مرحله دنبال می‌کنیم.
      </p>
    </>
  )
}
