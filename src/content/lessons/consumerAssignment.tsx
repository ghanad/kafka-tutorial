import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { AssignmentStrategyExplainer } from '../../components/simulators/AssignmentStrategyExplainer'

const strategyConfig = `# consumer.properties — انتخاب استراتژی تخصیص
bootstrap.servers=localhost:9092
group.id=billing

# برای گروه‌های بزرگ و پرتغییر، cooperative را صریحاً انتخاب کنید
partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor`

const strategyList = `# فهرست استراتژی‌ها به ترتیب اولویت
# Leader اولین استراتژی مشترک بین همهٔ اعضا را انتخاب می‌کند
partition.assignment.strategy=\\
  org.apache.kafka.clients.consumer.CooperativeStickyAssignor,\\
  org.apache.kafka.clients.consumer.RangeAssignor`

const migrationConfig = `# مرحلهٔ ۱: هر دو استراتژی را اعلام کنید و همهٔ اعضا را rolling restart کنید
partition.assignment.strategy=CooperativeStickyAssignor,RangeAssignor

# مرحلهٔ ۲: بعد از اینکه همهٔ اعضا cooperative را پشتیبانی کردند
partition.assignment.strategy=CooperativeStickyAssignor`

const describeAssignment = `# ببینید هر عضو چه پارتیشن‌هایی گرفته است
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
  --describe --group billing --members --verbose

# GROUP    CONSUMER-ID   HOST        CLIENT-ID   #PARTITIONS
# billing  consumer-1    /10.0.0.11  consumer-1  2
# billing  consumer-2    /10.0.0.12  consumer-2  2
# billing  consumer-3    /10.0.0.13  consumer-3  2`

export function ConsumerAssignmentContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس Consumer Group دیدیم هر پارتیشن در هر لحظه فقط به یک عضو یک گروه
        می‌رسد و Leader گروه تخصیص را حساب می‌کند. اما «چطور» تقسیم شود، خودش یک
        انتخاب است. چهار استراتژی اصلی داریم: <Ltr>Range</Ltr>،{' '}
        <Ltr>RoundRobin</Ltr>، <Ltr>Sticky</Ltr> و{' '}
        <Ltr>CooperativeSticky</Ltr>. در این درس می‌بینیم هر کدام پارتیشن‌ها را
        چطور پخش می‌کنند، کدام بار را نامتعادل می‌کنند و کدام توقف rebalance را
        کوتاه می‌کنند.
      </p>

      <h2>۱. تخصیص کجا و توسط چه کسی محاسبه می‌شود؟</h2>
      <p>
        محاسبهٔ تخصیص روی بروکر انجام نمی‌شود. Coordinator فقط اعضا را جمع می‌کند
        و یکی را Leader می‌کند؛ بعد Leader با فهرست اعضا و پارتیشن‌ها، الگوریتم
        انتخابی را اجرا می‌کند و نتیجه را با <Ltr>SyncGroup</Ltr> به همه اعلام
        می‌کند. همین طراحی باعث می‌شود هر گروه بتواند استراتژی خودش را داشته
        باشد.
      </p>
      <p>
        دو خانوادهٔ کلی وجود دارد. استراتژی‌های <strong>eager</strong> (مثل{' '}
        <Ltr>Range</Ltr>، <Ltr>RoundRobin</Ltr> و <Ltr>Sticky</Ltr>) قبل از
        محاسبهٔ تخصیص جدید، همهٔ پارتیشن‌ها را از همهٔ اعضا پس می‌گیرند؛ یعنی کل
        گروه برای مدتی متوقف می‌شود. استراتژی <strong>cooperative</strong> فقط
        پارتیشن‌هایی را پس می‌گیرد که باید جابه‌جا شوند و بقیه در همان لحظه مصرف
        می‌شوند.
      </p>
      <Callout variant="info" title="ترتیب فهرست، اولویت است">
        <p>
          مقدار <Ltr>partition.assignment.strategy</Ltr> می‌تواند یک فهرست باشد.
          Leader اولین استراتژی‌ای را انتخاب می‌کند که <em>همهٔ</em> اعضا آن را
          پشتیبانی کنند. در کلاینت‌های جدید فهرست پیش‌فرض شامل{' '}
          <Ltr>Range</Ltr> و <Ltr>CooperativeSticky</Ltr> است و چون{' '}
          <Ltr>Range</Ltr> اول می‌آید، رفتار پیش‌فرض همچنان eager است.
        </p>
      </Callout>

      <h2>۲. چهار استراتژی را کنار هم ببینید</h2>
      <p>
        در توضیح تعاملی زیر دو تاپیک داریم: <Ltr>orders</Ltr> با ۴ پارتیشن و{' '}
        <Ltr>payments</Ltr> با ۲ پارتیشن. با زبانه‌های بالای نمودار بین
        استراتژی‌ها جابه‌جا شوید. رنگ‌ها فقط معنی دارند: آبی تخصیص تازه، نارنجی
        پارتیشن جابه‌جاشده، قرمز پارتیشن پس‌گرفته‌شده و خاکستری تخصیص بدون تغییر.
      </p>

      <AssignmentStrategyExplainer />

      <p>
        در زبانهٔ <Ltr>Range</Ltr> به گام آخر نگاه کنید: <Ltr>C3</Ltr> با وجود
        اینکه عضو سالمی است، صفر پارتیشن دارد. در <Ltr>RoundRobin</Ltr> توزیع
        یکنواخت است ولی هیچ تخصیصی حفظ نمی‌شود. در <Ltr>Sticky</Ltr> فقط دو
        پارتیشن جابه‌جا می‌شوند، اما همهٔ اعضا در شروع rebalance پارتیشن‌ها را
        رها می‌کنند. در <Ltr>CooperativeSticky</Ltr> دقت کنید که{' '}
        <Ltr>C2</Ltr> و <Ltr>C3</Ltr> فقط یک پارتیشن را پس می‌دهند و بقیهٔ کارشان
        ادامه دارد.
      </p>

      <h2>۳. Range: تقسیم هر تاپیک به بازه‌های پشت‌سرهم</h2>
      <p>
        <Ltr>Range</Ltr> برای هر تاپیک جداگانه پارتیشن‌ها را مرتب می‌کند و بین
        مصرف‌کننده‌های مرتب‌شده به بازه‌های پشت‌سرهم تقسیم می‌کند. اگر{' '}
        <Ltr>P</Ltr> پارتیشن و <Ltr>C</Ltr> مصرف‌کننده باشد، سهم پایه{' '}
        <Ltr>P / C</Ltr> است و باقی‌مانده به مصرف‌کننده‌های اول اضافه می‌شود.
      </p>
      <table>
        <thead>
          <tr>
            <th>تاپیک</th>
            <th>پارتیشن‌ها</th>
            <th>مصرف‌کننده‌ها</th>
            <th>نتیجه</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>orders</Ltr>
            </td>
            <td>4</td>
            <td>3</td>
            <td>
              <Ltr>C1: 0,1</Ltr> / <Ltr>C2: 2,3</Ltr> / <Ltr>C3: —</Ltr>
            </td>
          </tr>
          <tr>
            <td>
              <Ltr>payments</Ltr>
            </td>
            <td>2</td>
            <td>3</td>
            <td>
              <Ltr>C1: 0</Ltr> / <Ltr>C2: 1</Ltr> / <Ltr>C3: —</Ltr>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        مشکل وقتی آشکار می‌شود که چند تاپیک با تعداد پارتیشن نامساوی داشته باشید.
        هر تاپیک به‌تنهایی منصفانه تقسیم می‌شود، ولی همان مصرف‌کننده‌های اول در
        همهٔ تاپیک‌ها سهم بیشتری می‌گیرند. نتیجه: <Ltr>C1</Ltr> سه پارتیشن،{' '}
        <Ltr>C2</Ltr> سه پارتیشن و <Ltr>C3</Ltr> صفر. <Ltr>Range</Ltr> ساده و
        قابل پیش‌بینی است، ولی برای چند تاپیک نامتقارن انتخاب خوبی نیست.
      </p>

      <h2>۴. RoundRobin: یک صف مشترک برای همهٔ پارتیشن‌ها</h2>
      <p>
        <Ltr>RoundRobin</Ltr> پارتیشن‌های همهٔ تاپیک‌های مشترک را در یک صف
        مرتب می‌چیند و یکی‌یکی بین مصرف‌کننده‌ها می‌گرداند. با ۶ پارتیشن و ۳
        مصرف‌کننده، هر کدام دقیقاً ۲ پارتیشن می‌گیرد و بی‌کاری جبران می‌شود.
      </p>
      <p>
        هزینه‌اش این است که تخصیص «چسبنده» نیست: با ورود یا خروج یک عضو، ترتیب
        چرخه عوض می‌شود و بخش بزرگی از پارتیشن‌ها صاحب جدید پیدا می‌کنند. این
        جابه‌جایی یعنی توقف بیشتر و احتمال پردازش دوبارهٔ بیشتر. برای گروه‌های
        پایدار با ترکیب اعضای ثابت، <Ltr>RoundRobin</Ltr> ساده و منصفانه است.
      </p>

      <h2>۵. Sticky: کمترین جابه‌جایی ممکن</h2>
      <p>
        <Ltr>Sticky</Ltr> دو هدف را هم‌زمان دنبال می‌کند: توزیع متعادل و حفظ
        تخصیص قبلی. وقتی عضوی اضافه یا حذف می‌شود، تلاش می‌کند همهٔ پارتیشن‌هایی
        را که می‌توانند سر جایشان بمانند نگه دارد و فقط حداقل پارتیشن لازم را
        جابه‌جا کند. در مثال ما با خروج <Ltr>C3</Ltr> فقط دو پارتیشن از شش
        پارتیشن جابه‌جا شدند.
      </p>
      <p>
        نکتهٔ مهم این است که <Ltr>Sticky</Ltr> هنوز یک استراتژی <strong>eager</strong>{' '}
        است. یعنی قبل از محاسبهٔ تخصیص جدید، همهٔ اعضا همهٔ پارتیشن‌ها را رها
        می‌کنند. پس «کمترین جابه‌جایی» به معنی «کمترین توقف» نیست؛ فقط تعداد
        پارتیشن‌هایی که صاحبشان عوض می‌شود کم است.
      </p>

      <h2>۶. CooperativeSticky: چسبنده و افزایشی</h2>
      <p>
        <Ltr>CooperativeSticky</Ltr> همان منطق چسبنده را با پروتکل افزایشی
        ترکیب می‌کند. در دور اول فقط پارتیشن‌هایی که باید از یک عضو گرفته شوند
        پس گرفته می‌شوند؛ بقیهٔ پارتیشن‌ها بدون وقفه مصرف می‌شوند. در دور دوم
        تخصیص نهایی بسته می‌شود. نتیجه این است که فقط صاحبان پارتیشن‌های متحرک
        برای لحظه‌ای متوقف می‌شوند، نه کل گروه.
      </p>
      <p>
        به همین دلیل برای گروه‌های بزرگ، محیط‌های Kubernetes و سرویس‌هایی که
        مرتب scale می‌شوند، <Ltr>CooperativeSticky</Ltr> انتخاب پیشنهادی است.
        تنها هزینه‌اش این است که rebalance ممکن است به بیش از یک دور کوچک نیاز
        داشته باشد.
      </p>

      <h2>۷. انتخاب و تنظیم درست</h2>
      <p>
        استراتژی را با <Ltr>partition.assignment.strategy</Ltr> تنظیم می‌کنید.
        برای گروه‌های پرتغییر، cooperative را صریحاً بنویسید تا به پیش‌فرض
        وابسته نباشید:
      </p>
      <CodeBlock
        code={strategyConfig}
        language="properties"
        filename="consumer.properties"
      />
      <p>
        اگر می‌خواهید چند استراتژی پشتیبانی شود، فهرست را با کاما جدا کنید.
        ترتیب مهم است: Leader اولین گزینهٔ مشترک را انتخاب می‌کند.
      </p>
      <CodeBlock
        code={strategyList}
        language="properties"
        filename="strategy-list.properties"
      />
      <Callout variant="warning" title="همهٔ اعضا باید یک استراتژی مشترک داشته باشند">
        <p>
          اگر یک مصرف‌کننده فقط <Ltr>Range</Ltr> را پشتیبانی کند و بقیه فقط{' '}
          <Ltr>CooperativeSticky</Ltr>، هیچ گزینهٔ مشترکی وجود ندارد و گروه
          نمی‌تواند rebalance را کامل کند. در rolling upgrade، ابتدا هر دو
          استراتژی را اعلام کنید و بعد از رسیدن همه به نسخهٔ جدید، فهرست را به
          cooperative محدود کنید.
        </p>
      </Callout>
      <CodeBlock
        code={migrationConfig}
        language="properties"
        filename="migrate-cooperative.properties"
      />
      <p>
        برای دیدن نتیجهٔ تخصیص در محیط واقعی، از <Ltr>--members --verbose</Ltr>{' '}
        استفاده کنید:
      </p>
      <CodeBlock
        code={describeAssignment}
        language="bash"
        filename="describe-members.sh"
      />

      <h2>۸. اشتباه‌های رایج</h2>
      <Callout variant="danger" title="انتظار توزیع منصفانه از Range با چند تاپیک">
        <p>
          <Ltr>Range</Ltr> هر تاپیک را جدا تقسیم می‌کند و بی‌کاری بین تاپیک‌ها
          را جبران نمی‌کند. اگر چند تاپیک با تعداد پارتیشن نامساوی دارید و
          مصرف‌کننده‌های اول بار بیشتری می‌گیرند، مشکل از الگوریتم است نه از
          کافکا. <Ltr>RoundRobin</Ltr> یا <Ltr>Sticky</Ltr> را امتحان کنید.
        </p>
      </Callout>
      <Callout variant="danger" title="انتخاب Sticky و انتظار توقف کوتاه">
        <p>
          <Ltr>Sticky</Ltr> جابه‌جایی را کم می‌کند ولی همچنان eager است و کل گروه
          را برای شروع rebalance متوقف می‌کند. اگر هدف کاهش توقف است،{' '}
          <Ltr>CooperativeSticky</Ltr> را انتخاب کنید، نه <Ltr>Sticky</Ltr>.
        </p>
      </Callout>
      <Callout variant="warning" title="ترتیب فهرست استراتژی‌ها را نادیده گرفتن">
        <p>
          نوشتن <Ltr>RangeAssignor,CooperativeStickyAssignor</Ltr> یعنی{' '}
          <Ltr>Range</Ltr> اولویت دارد و cooperative فقط وقتی انتخاب می‌شود که
          Range در دسترس نباشد. اگر cooperative می‌خواهید، آن را اول فهرست
          بگذارید یا فقط همان را بنویسید.
        </p>
      </Callout>
      <Callout variant="info" title="استراتژی جایگزین تنظیم ظرفیت نیست">
        <p>
          هیچ استراتژی‌ای نمی‌تواند از ۴ پارتیشن، ۸ واحد موازی‌سازی بسازد.
          استراتژی فقط نحوهٔ تقسیم را بهتر می‌کند؛ سقف موازی‌سازی همچنان تعداد
          پارتیشن‌هاست.
        </p>
      </Callout>

      <DeepDive title="درون الگوریتم‌ها و پروتکل تخصیص">
        <DeepDiveSection title="الگوریتم دقیق Range">
          <p>
            برای هر تاپیک، پارتیشن‌ها و مصرف‌کننده‌ها مرتب می‌شوند. سهم پایه{' '}
            <Ltr>P div C</Ltr> و باقی‌مانده <Ltr>P mod C</Ltr> است. مصرف‌کننده
            اول <Ltr>base + 1</Ltr> پارتیشن، مصرف‌کنندهٔ دوم هم{' '}
            <Ltr>base + 1</Ltr> و بقیه <Ltr>base</Ltr> پارتیشن می‌گیرند تا
            باقی‌مانده تمام شود. اگر <Ltr>C &gt; P</Ltr> باشد، مصرف‌کننده‌های
            آخر هیچ پارتیشنی نمی‌گیرند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="الگوریتم دقیق RoundRobin">
          <p>
            همهٔ پارتیشن‌های همهٔ تاپیک‌های مشترک به ترتیب تاپیک و سپس شمارهٔ
            پارتیشن در یک لیست قرار می‌گیرند. سپس به‌صورت چرخه‌ای بین
            مصرف‌کننده‌های مرتب‌شده پخش می‌شوند. اگر تعداد پارتیشن‌ها مضرب تعداد
            مصرف‌کننده‌ها نباشد، اختلاف بین اعضا حداکثر یک پارتیشن است.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Sticky چطور «چسبندگی» را می‌سنجد؟">
          <p>
            <Ltr>Sticky</Ltr> تخصیص قبلی هر عضو را به‌عنوان ورودی می‌گیرد و
            تلاش می‌کند با کمترین جابه‌جایی به توزیع متعادل برسد. اگر چند
            تخصیص متعادل ممکن باشد، گزینه‌ای را انتخاب می‌کند که پارتیشن‌های
            بیشتری سر جایشان بمانند. این الگوریتم هم مثل بقیه در سمت Leader
            اجرا می‌شود و نتیجه‌اش با <Ltr>SyncGroup</Ltr> به اعضا می‌رسد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="پروتکل cooperative در دو دور">
          <p>
            در دور اول، اعضا فهرست پارتیشن‌هایی را که باید پس بدهند اعلام می‌کنند
            و Leader تخصیص را بدون آن‌ها حساب می‌کند. اعضا پارتیشن‌های پس‌داده‌شده
            را متوقف می‌کنند ولی بقیه را ادامه می‌دهند. در دور دوم، پارتیشن‌های
            آزاد به صاحبان جدید می‌رسند. اگر عضوی در میانه ناپدید شود، دور جاری
            لغو و دور تازه‌ای شروع می‌شود؛ به همین دلیل ممکن است چند دور کوچک
            ببینید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="مذاکرهٔ استراتژی بین اعضا">
          <p>
            هر عضو در <Ltr>JoinGroup</Ltr> فهرست استراتژی‌های پشتیبانی‌شده‌اش را
            می‌فرستد. Leader اولین استراتژی در فهرست خودش را انتخاب می‌کند که همهٔ
            اعضا هم آن را پشتیبانی کنند. اگر هیچ اشتراکی نباشد، گروه نمی‌تواند
            دور را کامل کند. به همین دلیل هنگام ارتقا، فهرست مشترک را در همهٔ
            اعضا نگه دارید تا زمانی که همه به نسخهٔ جدید برسند.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="Static Membership و اثر آن بر تخصیص">
          <p>
            با <Ltr>group.instance.id</Ltr>، Coordinator هویت عضو را در
            ری‌استارت‌های کوتاه حفظ می‌کند و عضویت قبلی را دور نمی‌اندازد. نتیجه
            این است که تخصیص چسبنده حتی از دست نمی‌رود و rebalance غیرضروری رخ
            نمی‌دهد. این تنظیم مخصوصاً با <Ltr>CooperativeSticky</Ltr> در
            محیط‌های containerized بسیار مؤثر است.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          تخصیص در سمت Leader گروه محاسبه می‌شود؛ Coordinator فقط عضویت را
          مدیریت می‌کند.
        </li>
        <li>
          <Ltr>Range</Ltr> هر تاپیک را جدا تقسیم می‌کند و با چند تاپیک نامساوی
          می‌تواند ناعادلانه شود.
        </li>
        <li>
          <Ltr>RoundRobin</Ltr> توزیع یکنواخت می‌دهد ولی تخصیص قبلی را حفظ
          نمی‌کند.
        </li>
        <li>
          <Ltr>Sticky</Ltr> جابه‌جایی را کم می‌کند، اما همچنان eager است و کل
          گروه را متوقف می‌کند.
        </li>
        <li>
          <Ltr>CooperativeSticky</Ltr> کمترین توقف را می‌دهد و انتخاب پیشنهادی
          برای گروه‌های بزرگ و پرتغییر است.
        </li>
      </ul>
      <p>
        حالا هم lag را می‌شناسیم و هم می‌دانیم گروه چطور پارتیشن‌ها را تقسیم
        می‌کند. با این دو، می‌توانیم رفتار مصرف‌کننده را در محیط واقعی اندازه
        بگیریم و تنظیم کنیم.
      </p>
    </>
  )
}
