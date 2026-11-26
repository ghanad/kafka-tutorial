import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'
import { FailureBudgetExplainer } from '../../components/simulators/FailureBudgetExplainer'

const topicConfig = `kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic payments \\
  --partitions 6 \\
  --replication-factor 3 \\
  --config min.insync.replicas=2`

const brokerDefault = `# server.properties
min.insync.replicas=2
default.replication.factor=3`

const producerConfig = `# producer.properties
acks=all
enable.idempotence=true
retries=2147483647
delivery.timeout.ms=120000`

const changeConfig = `# تغییر تنظیم روی یک تاپیک موجود
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --alter --entity-type topics --entity-name payments \\
  --add-config min.insync.replicas=2

# مشاهده مقدار فعلی
kafka-configs.sh --bootstrap-server localhost:9092 \\
  --describe --entity-type topics --entity-name payments`

export function MinInsyncReplicasContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس قبل دیدیم <Ltr>ISR</Ltr> می‌تواند کوچک شود. سؤال عملی این است:
        وقتی <Ltr>ISR</Ltr> کوچک شد، نوشتن را ادامه بدهیم یا متوقف کنیم؟{' '}
        <Ltr>min.insync.replicas</Ltr> دقیقاً همین تصمیم را می‌گیرد. در این درس
        می‌بینیم این تنظیم چطور با <Ltr>acks=all</Ltr> ترکیب می‌شود، چه تعداد
        خرابی را تحمل می‌کند و چرا مقدار اشتباه آن می‌تواند داده تأییدشده را از
        بین ببرد.
      </p>

      <h2>۱. min.insync.replicas چیست؟</h2>
      <p>
        <Ltr>min.insync.replicas</Ltr> حداقل اندازه <Ltr>ISR</Ltr> برای پذیرش
        نوشتن است. اگر این تنظیم روی تاپیک <Ltr>2</Ltr> باشد و لیدر ببیند{' '}
        <Ltr>|ISR| = 1</Ltr> است، درخواست <Ltr>acks=all</Ltr> را با خطای{' '}
        <Ltr>NOT_ENOUGH_REPLICAS</Ltr> رد می‌کند. یعنی ترجیح می‌دهد نوشتن متوقف
        شود تا رکوردی را تأیید کند که فقط یک کپی دارد.
      </p>
      <CodeBlock code={topicConfig} language="bash" filename="create-payments-topic.sh" />
      <p>
        می‌توانید آن را به‌صورت پیش‌فرض در سطح بروکر هم تنظیم کنید تا تاپیک‌های
        جدید آن را به ارث ببرند. اما مقدار سطح تاپیک همیشه اولویت دارد.
      </p>
      <CodeBlock code={brokerDefault} language="properties" filename="server.properties" />
      <p>
        این تنظیم فقط وقتی معنا دارد که پرودیوسر با <Ltr>acks=all</Ltr> بنویسد.
        با <Ltr>acks=1</Ltr> یا <Ltr>acks=0</Ltr>، لیدر حتی نگاه نمی‌کند{' '}
        <Ltr>ISR</Ltr> چقدر است.
      </p>

      <h2>۲. فرمول بودجه خرابی</h2>
      <p>
        با <Ltr>acks=all</Ltr> و <Ltr>RF=3</Ltr>، تعداد خرابی‌هایی که نوشتن را
        متوقف نمی‌کند برابر است با:
      </p>
      <p className="rounded-xl bg-slate-100 px-4 py-3 text-center font-mono text-sm font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-100">
        failures tolerated while writing = RF - min.insync.replicas
      </p>
      <table>
        <thead>
          <tr>
            <th>تنظیم</th>
            <th>خرابی تا توقف نوشتن</th>
            <th>کپی داده commitشده</th>
            <th>کاربرد</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>RF=3, min.insync=1</Ltr></td>
            <td>۲ بروکر</td>
            <td>۱ (شکننده)</td>
            <td>لاگ و داده کم‌ارزش</td>
          </tr>
          <tr>
            <td><Ltr>RF=3, min.insync=2</Ltr></td>
            <td>۱ بروکر</td>
            <td>۲</td>
            <td>پیش‌فرض امن برای بیشتر سیستم‌ها</td>
          </tr>
          <tr>
            <td><Ltr>RF=3, min.insync=3</Ltr></td>
            <td>۰ بروکر</td>
            <td>۳</td>
            <td>داده فوق‌حساس با پذیرش توقف نوشتن</td>
          </tr>
        </tbody>
      </table>
      <p>
        ستون دوم و سوم دو چیز متفاوت‌اند: بودجه خرابی برای <em>نوشتن</em> و
        تعداد کپی <em>داده تأییدشده</em>. با <Ltr>min.insync=1</Ltr> نوشتن تا
        دو خرابی ادامه دارد، اما رکوردهای تأییدشده می‌توانند فقط یک کپی داشته
        باشند.
      </p>

      <FailureBudgetExplainer />

      <p>
        در گام ۳ نوشتن متوقف شد اما داده از دست نرفت؛ این همان رفتار عمدی
        کافکاست. در گام‌های ۶ تا ۸ دیدید با <Ltr>min.insync=1</Ltr> نوشتن ادامه
        پیدا می‌کند و همین ادامه دادن، در نهایت به از دست رفتن رکوردهای{' '}
        <Ltr>offset 10..12</Ltr> می‌رسد.
      </p>

      <h2>۳. چرا فقط با acks=all اعمال می‌شود؟</h2>
      <p>
        <Ltr>min.insync.replicas</Ltr> یک قول درباره تعداد کپی‌هاست. با{' '}
        <Ltr>acks=1</Ltr> پرودیوسر فقط تأیید لیدر را می‌گیرد؛ لیدر نمی‌تواند
        قول بدهد رکورد روی فالوورها هم هست. پس اعمال این محدودیت با{' '}
        <Ltr>acks=1</Ltr> بی‌معناست و کافکا هم آن را اعمال نمی‌کند.
      </p>
      <table>
        <thead>
          <tr>
            <th><Ltr>acks</Ltr></th>
            <th>منتظر چه کسی می‌ماند؟</th>
            <th><Ltr>min.insync</Ltr> اعمال می‌شود؟</th>
            <th>ریسک</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>0</Ltr></td>
            <td>هیچ‌کس</td>
            <td>خیر</td>
            <td>گم شدن بی‌صدا</td>
          </tr>
          <tr>
            <td><Ltr>1</Ltr></td>
            <td>فقط لیدر</td>
            <td>خیر</td>
            <td>مرگ لیدر آخرین رکوردها را می‌برد</td>
          </tr>
          <tr>
            <td><Ltr>all</Ltr></td>
            <td>همه اعضای <Ltr>ISR</Ltr></td>
            <td>بله</td>
            <td>توقف نوشتن وقتی <Ltr>ISR</Ltr> کوچک است</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock code={producerConfig} language="properties" filename="producer.properties" />
      <p>
        ترکیب <Ltr>acks=all</Ltr> با <Ltr>enable.idempotence=true</Ltr> توصیه
        می‌شود: idempotence از تکرار رکورد در اثر retry جلوگیری می‌کند و{' '}
        <Ltr>acks=all</Ltr> دوام را تضمین می‌کند.
      </p>

      <h2>۴. خطاهای NOT_ENOUGH_REPLICAS</h2>
      <p>
        وقتی <Ltr>|ISR|</Ltr> از حد مجاز کمتر شود، دو خطای نزدیک به هم ممکن است
        ببینید:
      </p>
      <ul>
        <li>
          <Ltr>NOT_ENOUGH_REPLICAS</Ltr>: لیدر پیش از نوشتن درخواست را رد
          می‌کند.
        </li>
        <li>
          <Ltr>NOT_ENOUGH_REPLICAS_AFTER_APPEND</Ltr>: رکورد روی لیدر نوشته شد
          اما <Ltr>ISR</Ltr> در میانه راه کوچک شد و تأیید کامل نشد.
        </li>
      </ul>
      <p>
        هر دو خطا موقتی‌اند و پرودیوسر با retry دوباره تلاش می‌کند. اگر{' '}
        <Ltr>retries</Ltr> و <Ltr>delivery.timeout.ms</Ltr> کافی باشند، نوشتن
        بعد از برگشت یک فالوور خودبه‌خود ادامه پیدا می‌کند.
      </p>
      <Callout variant="info" title="خطا یعنی داده از دست رفت؟">
        نه. <Ltr>NOT_ENOUGH_REPLICAS</Ltr> یعنی نوشتن <em>پذیرفته نشد</em>؛ داده
        قبلی دست‌نخورده است. این خطا نشانه محافظت است، نه خرابی.
      </Callout>

      <h2>۵. انتخاب مقدار درست</h2>
      <p>
        مقدار پیش‌فرض کافکا <Ltr>1</Ltr> است، اما برای داده کسب‌وکار این مقدار
        کافی نیست. یک قاعده ساده:
      </p>
      <ul>
        <li>
          <strong>داده معمولی کسب‌وکار:</strong> <Ltr>RF=3</Ltr>،{' '}
          <Ltr>min.insync=2</Ltr>، <Ltr>acks=all</Ltr>.
        </li>
        <li>
          <strong>داده فوق‌حساس:</strong> <Ltr>RF=3</Ltr>،{' '}
          <Ltr>min.insync=3</Ltr>؛ تحمل صفر خرابی برای نوشتن، اما هیچ تأییدی
          بدون سه کپی صادر نمی‌شود.
        </li>
        <li>
          <strong>لاگ و متریک:</strong> <Ltr>RF=1</Ltr> یا{' '}
          <Ltr>min.insync=1</Ltr> قابل قبول است، چون از دست رفتن بخشی از داده
          بحرانی نیست.
        </li>
      </ul>
      <CodeBlock code={changeConfig} language="bash" filename="change-min-insync.sh" />
      <Callout variant="warning" title="min.insync بزرگ‌تر از RF">
        اگر <Ltr>min.insync.replicas</Ltr> از <Ltr>RF</Ltr> بزرگ‌تر باشد، هیچ
        نوشتنی پذیرفته نمی‌شود؛ چون <Ltr>|ISR|</Ltr> هرگز به آن عدد نمی‌رسد.
        این تنظیم را همیشه کمتر یا مساوی <Ltr>RF</Ltr> نگه دارید.
      </Callout>

      <DeepDive title="جزئیات تنظیم min.insync.replicas در خوشه">
        <DeepDiveSection title="سطح تاپیک یا سطح بروکر؟">
          <p>
            مقدار سطح تاپیک بر مقدار سطح بروکر اولویت دارد. اگر روی تاپیک تنظیم
            نشده باشد، مقدار <Ltr>min.insync.replicas</Ltr> بروکر استفاده می‌شود.
            برای یکسان‌سازی، مقدار امن را در سطح بروکر بگذارید و فقط برای
            تاپیک‌های خاص آن را بازنویسی کنید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="تغییر تنظیم روی تاپیک زنده">
          <p>
            تغییر <Ltr>min.insync.replicas</Ltr> نیازی به restart ندارد و بلافاصله
            روی درخواست‌های بعدی اعمال می‌شود. اگر مقدار را بالا ببرید و{' '}
            <Ltr>|ISR|</Ltr> فعلی کمتر باشد، نوشتن تا همگام شدن فالوورها متوقف
            می‌شود؛ این را قبل از تغییر در نظر بگیرید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="ارتباط با acks=all و idempotence">
          <p>
            <Ltr>acks=all</Ltr> معادل <Ltr>acks=-1</Ltr> است. وقتی{' '}
            <Ltr>enable.idempotence=true</Ltr> باشد، کافکا به‌طور پیش‌فرض{' '}
            <Ltr>acks=all</Ltr> را الزام می‌کند. پس این سه تنظیم معمولاً با هم
            دیده می‌شوند: idempotence برای جلوگیری از تکرار،{' '}
            <Ltr>acks=all</Ltr> برای دوام و <Ltr>min.insync.replicas</Ltr> برای
            حداقل تعداد کپی.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="min.insync=1 با acks=all">
        این ترکیب احساس امنیت کاذب می‌دهد. نوشتن با <Ltr>acks=all</Ltr> فقط
        منتظر اعضای فعلی <Ltr>ISR</Ltr> می‌ماند؛ اگر <Ltr>ISR</Ltr> فقط لیدر
        باشد، تأیید با یک کپی صادر می‌شود. با مرگ لیدر آن داده از بین می‌رود.
      </Callout>
      <Callout variant="warning" title="افزایش min.insync بدون ظرفیت کافی">
        <Ltr>min.insync=3</Ltr> روی <Ltr>RF=3</Ltr> یعنی هر خرابی یک بروکر
        نوشتن را متوقف می‌کند. این انتخاب برای داده فوق‌حساس درست است، اما باید
        تیم عملیات آماده هشدار و بازیابی سریع باشد.
      </Callout>
      <Callout variant="warning" title="انتظار اعمال با acks=1">
        اگر پرودیوسر با <Ltr>acks=1</Ltr> می‌نویسد، تنظیم{' '}
        <Ltr>min.insync.replicas</Ltr> هیچ اثری ندارد. دوام واقعی به{' '}
        <Ltr>acks=all</Ltr> نیاز دارد.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li><Ltr>min.insync.replicas</Ltr> حداقل اندازه <Ltr>ISR</Ltr> برای پذیرش نوشتن است.</li>
        <li>با <Ltr>acks=all</Ltr>، بودجه خرابی نوشتن برابر <Ltr>RF - min.insync</Ltr> است.</li>
        <li>مقدار ۲ برای <Ltr>RF=3</Ltr> تعادل خوبی بین دوام و دسترس‌پذیری می‌دهد.</li>
        <li>مقدار ۱ نوشتن را پایدار نگه می‌دارد اما داده تأییدشده را شکننده می‌کند.</li>
        <li>این تنظیم فقط با <Ltr>acks=all</Ltr> اعمال می‌شود.</li>
      </ul>
      <p>
        حالا می‌دانیم با کوچک شدن <Ltr>ISR</Ltr> چه اتفاقی می‌افتد. در درس بعدی
        سراغ لحظه‌ای می‌رویم که لیدر از دست می‌رود: چه کسی لیدر جدید را انتخاب
        می‌کند و <Ltr>Unclean Leader Election</Ltr> چه بهایی دارد.
      </p>
    </>
  )
}
